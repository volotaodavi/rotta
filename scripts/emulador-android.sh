#!/usr/bin/env bash
#
# Emulador Android headless, para o Claude ver e operar o app.
#
# ## O que isto resolve
#
# O Simulador iOS não roda em Linux, então a sessão na nuvem nunca vai
# abrir o app de iPhone (ver `docs/51-ambiente-ios-no-mac.md`). O
# Android, sim: o emulador do Android SDK roda em Linux, e sem
# `/dev/kvm` ele cai para emulação de software (TCG) do próprio QEMU.
#
# Isso FUNCIONA. Medido neste contêiner em 03/11/2026, 4 vCPU:
#
#   | etapa                            | tempo   |
#   | -------------------------------- | ------- |
#   | baixar SDK + imagem android-34   | ~6 min  |
#   | primeiro boot (`-cores 1`)       | 8m13s   |
#   | boot seguinte (`-cores 4`)       | 3m47s   |
#   | `adb install` do APK (126 MB)    | 7m43s   |
#   | abrir o app até a tela desenhar  | ~2 min  |
#   | screenshot                       | ~2 s    |
#   | toque/digitação até a tela mudar | 20-60 s |
#
# Então: serve para VER e CONFERIR a tela, e não serve para desenvolver
# interativamente. O sistema Android dá "Process system isn't
# responding" com frequência sob TCG — é o sistema, não o app, e
# "Wait" dispensa. O app em si renderiza certo.
#
# ## Uso
#
#   ./scripts/emulador-android.sh instalar          # baixa o SDK (~5.4 GB)
#   ./scripts/emulador-android.sh iniciar           # sobe o emulador
#   ./scripts/emulador-android.sh instalar-apk <arquivo.apk>
#   ./scripts/emulador-android.sh abrir             # abre o app
#   ./scripts/emulador-android.sh tela [arquivo.png]
#   ./scripts/emulador-android.sh tocar <x> <y>
#   ./scripts/emulador-android.sh texto "o que digitar"
#   ./scripts/emulador-android.sh log [n]
#   ./scripts/emulador-android.sh status
#   ./scripts/emulador-android.sh parar
#
# Coordenadas de toque são as da TELA REAL (1080x2400), não as do
# screenshot reduzido que você está olhando.

set -euo pipefail

PACOTE="br.com.rottabr"
AVD="rotta34"
IMAGEM="system-images;android-34;google_apis;x86_64"
SERIAL="emulator-5554"

# O SDK mora fora do repositório: são 5,4 GB e não entram no git. O
# padrão é a pasta de rascunho da sessão, que some quando ela acaba —
# aponte ANDROID_HOME para um lugar seu se quiser reaproveitar.
SDK="${ANDROID_HOME:-${ROTTA_ANDROID_SDK:-$HOME/.rotta-android/sdk}}"
ADB="$SDK/platform-tools/adb"
RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# URL das command line tools. Fixa de propósito: "latest" muda de
# número de build sem aviso, e um script que baixa versão diferente a
# cada execução não é reprodutível. Conferida em 03/11/2026.
CMDLINE_URL="https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip"

info() { printf '\033[1m%s\033[0m\n' "$1"; }
erro() { printf '\033[31m%s\033[0m\n' "$1" >&2; }

exigir_adb() {
  [ -x "$ADB" ] || { erro "SDK ausente em $SDK. Rode: $0 instalar"; exit 1; }
}

# Espera o Android terminar de subir. Sob TCG isto leva minutos, então
# o laço imprime progresso: um script mudo por quatro minutos parece
# travado, e alguém mata ele achando que falhou.
esperar_boot() {
  local limite="${1:-900}" inicio
  inicio=$(date +%s)
  while true; do
    local decorrido=$(( $(date +%s) - inicio ))
    [ "$decorrido" -gt "$limite" ] && { erro "não bootou em ${limite}s"; return 1; }
    if [ "$("$ADB" -s "$SERIAL" shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')" = "1" ]; then
      info "bootou em ${decorrido}s"
      return 0
    fi
    printf '\r  aguardando boot... %ss' "$decorrido"
    sleep 15
  done
}

comando_instalar() {
  info "Instalando o Android SDK em $SDK"
  mkdir -p "$SDK"
  local tmp
  tmp="$(mktemp -d)"
  curl -fsSL -o "$tmp/cmdline.zip" "$CMDLINE_URL"
  unzip -q -o "$tmp/cmdline.zip" -d "$tmp"
  mkdir -p "$SDK/cmdline-tools"
  rm -rf "$SDK/cmdline-tools/latest"
  mv "$tmp/cmdline-tools" "$SDK/cmdline-tools/latest"
  rm -rf "$tmp"

  export ANDROID_HOME="$SDK"
  local bin="$SDK/cmdline-tools/latest/bin"
  yes | "$bin/sdkmanager" --licenses >/dev/null 2>&1 || true
  "$bin/sdkmanager" --install "platform-tools" "emulator" "platforms;android-34" "$IMAGEM" >/dev/null
  echo no | "$bin/avdmanager" create avd -n "$AVD" -k "$IMAGEM" -d pixel_6 --force >/dev/null

  info "pronto: $(du -sh "$SDK" | cut -f1) em $SDK"
}

comando_iniciar() {
  exigir_adb
  if pgrep -f "qemu-system.*$AVD" >/dev/null 2>&1; then
    info "já está rodando"
    return 0
  fi

  # `-accel off` é o ponto: sem /dev/hvm o QEMU emula a CPU por
  # software. `-cores 4` mais que dobrou a velocidade do boot aqui
  # (8m13s -> 3m47s), porque o Android é bem paralelo mesmo sob TCG.
  # `-gpu swiftshader_indirect` é OpenGL por software, obrigatório sem
  # GPU. `-no-window` porque não há servidor gráfico.
  info "subindo o emulador (emulação de software, leva minutos)"
  ( cd "$SDK/emulator" && setsid nohup ./emulator -avd "$AVD" \
      -no-window -no-audio -no-boot-anim \
      -gpu swiftshader_indirect -accel off \
      -cores 4 -memory 3072 \
      > "$SDK/../emulador.log" 2>&1 < /dev/null & )
  sleep 20
  esperar_boot 1200
}

comando_instalar_apk() {
  exigir_adb
  local apk="${1:-}"
  [ -f "$apk" ] || { erro "uso: $0 instalar-apk <arquivo.apk>"; exit 64; }

  # O APK precisa ter x86_64, senão não instala no emulador. Os builds
  # `preview` do eas.json trazem as quatro ABIs, então passam — mas um
  # APK gerado só para arm falharia aqui com INSTALL_FAILED_NO_MATCHING_ABIS,
  # e a mensagem não diz "falta a ABI".
  if ! unzip -l "$apk" 2>/dev/null | grep -q "lib/x86_64/"; then
    erro "este APK não tem lib/x86_64 — não instala num emulador x86_64."
    exit 1
  fi

  info "instalando (leva minutos: o dexopt roda sob emulação)"
  "$ADB" -s "$SERIAL" install -r "$apk"
}

comando_abrir() {
  exigir_adb
  "$ADB" -s "$SERIAL" shell am start -n "$PACOTE/.MainActivity" >/dev/null
  info "app aberto. A primeira tela leva ~2 min para desenhar."
}

comando_tela() {
  exigir_adb
  local destino="${1:-$RAIZ/tela.png}"
  "$ADB" -s "$SERIAL" exec-out screencap -p > "$destino"
  info "$destino"
}

# Toque por coordenada da TELA REAL (1080x2400).
#
# A armadilha, e ela custou meia hora em 03/11/2026: quando o teclado
# sobe, o layout da tela inteira se desloca para cima. A coordenada
# lida num screenshot de antes do teclado passa a cair noutro
# elemento — ou no nada, e aí o toque não faz coisa nenhuma e parece
# que o comando falhou. Tire um screenshot NOVO depois de qualquer
# coisa que abra o teclado, e leia a coordenada dele.
comando_tocar() {
  exigir_adb
  [ $# -eq 2 ] || { erro "uso: $0 tocar <x> <y>  (coordenadas de 1080x2400)"; exit 64; }
  "$ADB" -s "$SERIAL" shell input tap "$1" "$2"
}

comando_texto() {
  exigir_adb
  local bruto="${1:-}"
  [ -n "$bruto" ] || { erro "uso: $0 texto \"o que digitar\""; exit 64; }

  # ESPAÇO é o único caractere que precisa de tradução, e precisa
  # mesmo: `adb` junta os argumentos e o shell do Android os separa de
  # novo, então um espaço cru corta a frase ali. Medido ao vivo em
  # 03/11/2026, num campo focado:
  #
  #   input text 'um dois'        -> digitou "um"
  #   input text '-tres%squatro'  -> digitou "-tres quattro"
  #
  # O resto passa cru. A primeira versão deste arquivo escapava `@` e
  # uma lista de metacaracteres, por eu ter atribuído ao `@` uma
  # digitação que parou no meio. Estava errado: `input text 'abc@def'`
  # escreve `abc@def` inteiro, conferido na mesma bateria. A causa real
  # da digitação truncada era o campo ter perdido o foco — o teclado
  # sobe e desloca o layout, então a coordenada de antes passa a cair
  # noutro lugar. Escapar `@` só inseriria contrabarra literal no campo.
  local pronto
  pronto="${bruto// /%s}"
  "$ADB" -s "$SERIAL" shell input text "$pronto"
}

comando_log() {
  exigir_adb
  "$ADB" -s "$SERIAL" logcat -d -t "${1:-200}" 2>/dev/null \
    | grep -iE "$PACOTE|ReactNative|ReactNativeJS|FATAL|AndroidRuntime" | tr -d '\r'
}

comando_status() {
  printf 'SDK:        %s\n' "$SDK"
  if [ -x "$ADB" ]; then
    printf 'emulador:   %s\n' "$("$ADB" devices | sed -n '2p' | tr -d '\r' || echo 'não listado')"
    printf 'boot:       %s\n' "$("$ADB" -s "$SERIAL" shell getprop sys.boot_completed 2>/dev/null | tr -d '\r' || echo '-')"
    printf 'app:        %s\n' "$("$ADB" -s "$SERIAL" shell pm list packages 2>/dev/null | grep -c "$PACOTE" | tr -d '\r') pacote(s)"
    printf 'em foco:    %s\n' "$("$ADB" -s "$SERIAL" shell dumpsys window 2>/dev/null | grep -oE 'mCurrentFocus=[^}]*' | head -1 | tr -d '\r' || echo '-')"
  else
    printf 'emulador:   SDK não instalado\n'
  fi
}

comando_parar() {
  exigir_adb
  "$ADB" -s "$SERIAL" emu kill 2>/dev/null || true
  info "parado"
}

case "${1:-}" in
  instalar) comando_instalar ;;
  iniciar) comando_iniciar ;;
  instalar-apk) shift; comando_instalar_apk "$@" ;;
  abrir) comando_abrir ;;
  tela) shift; comando_tela "$@" ;;
  tocar) shift; comando_tocar "$@" ;;
  texto) shift; comando_texto "$@" ;;
  log) shift; comando_log "$@" ;;
  status) comando_status ;;
  parar) comando_parar ;;
  *)
    sed -n '3,40p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'
    exit 64
    ;;
esac
