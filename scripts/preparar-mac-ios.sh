#!/usr/bin/env bash
#
# Prepara um Mac para rodar o app da Rotta no Simulador iOS.
#
# ## Por que este arquivo existe
#
# Porque o Simulador iOS é um produto fechado da Apple que só roda em
# macOS: não existe versão para Linux, não existe emulador, não existe
# imagem de container. A sessão do Claude Code na nuvem roda em Ubuntu,
# então ela não pode instalar nem abrir o simulador — e nenhuma
# quantidade de instalação muda isso.
#
# O que ela PODE fazer é isto: deixar o passo a passo pronto, numa
# forma que não dependa de ninguém lembrar a ordem.
#
# ## Como usar
#
#   ./scripts/preparar-mac-ios.sh              # só diagnostica, não muda nada
#   ./scripts/preparar-mac-ios.sh --instalar   # instala o que FALTA
#   ./scripts/preparar-mac-ios.sh --executar   # sobe o simulador e roda o app
#
# O padrão é diagnosticar. Instalar e executar são explícitos de
# propósito: um script que atualiza ferramenta por conta própria é
# exatamente como se quebra um ambiente que estava funcionando.
#
# Nada aqui ATUALIZA componente já instalado. Só instala o ausente.

set -euo pipefail

# ---------------------------------------------------------------------
# Funções puras, testáveis fora do Mac (ver --autoteste no fim)
# ---------------------------------------------------------------------

# Compara duas versões no formato X.Y.Z. Devolve 0 se $1 >= $2.
# `sort -V` ordena versão de verdade (10 depois de 9), que foi o motivo
# de não comparar string: "10.0" < "9.0" em ordem alfabética.
versao_maior_ou_igual() {
  [ "$1" = "$2" ] && return 0
  [ "$(printf '%s\n%s\n' "$1" "$2" | sort -V | head -1)" = "$2" ]
}

# A versão mínima de iOS que ESTE projeto exige, lida do React Native
# instalado — nunca um número decorado aqui dentro. O valor vive em
# `scripts/cocoapods/helpers.rb` do pacote `react-native`, e muda
# quando o projeto troca de versão de RN.
#
# Em 03/11/2026, com react-native 0.76.5, isso devolve 15.1.
minimo_de_ios_do_projeto() {
  local helpers="$1"
  [ -f "$helpers" ] || return 1
  grep -oE "return '[0-9]+\.[0-9]+'" "$helpers" | grep -oE "[0-9]+\.[0-9]+" | sort -V | head -1
}

# ---------------------------------------------------------------------
# Daqui para baixo, tudo depende de macOS
# ---------------------------------------------------------------------

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP="$RAIZ/apps/mobile"
HELPERS_RB="$APP/node_modules/react-native/scripts/cocoapods/helpers.rb"

ok() { printf '  \033[32mOK\033[0m    %s\n' "$1"; }
falta() { printf '  \033[33mFALTA\033[0m %s\n' "$1"; }
erro() { printf '  \033[31mERRO\033[0m  %s\n' "$1"; }
titulo() { printf '\n\033[1m%s\033[0m\n' "$1"; }

exigir_macos() {
  if [ "$(uname -s)" != "Darwin" ]; then
    cat >&2 <<'FIM'
Este script só roda em macOS.

O Simulador iOS faz parte do Xcode, que a Apple distribui apenas para
macOS. Não existe porte para Linux ou Windows, nem via container: o
simulador executa binários compilados para Darwin e usa frameworks do
próprio sistema.

O que existe para quem não tem Mac:
  - Expo Go num iPhone físico: `pnpm --filter @rotta/mobile dev` e ler o
    QR code. Roda o app de verdade, sem Mac, sem conta paga de Apple.
  - `eas build --platform ios` na nuvem da Expo, que compila num Mac
    deles. Exige conta de Apple Developer (US$ 99/ano) para build que
    instala em aparelho; para rodar no SIMULADOR de um Mac, não exige.
FIM
    exit 2
  fi
}

diagnosticar() {
  local pendencias=0

  titulo "Máquina"
  printf '  macOS %s · %s · %s núcleos\n' \
    "$(sw_vers -productVersion)" "$(uname -m)" "$(sysctl -n hw.ncpu)"
  printf '  Memória: %s GB\n' "$(($(sysctl -n hw.memsize) / 1073741824))"
  printf '  Disco livre: %s\n' "$(df -h / | awk 'NR==2 {print $4}')"
  # Xcode com um runtime de simulador ocupa da ordem de 40 GB. Avisar
  # antes é mais barato que um download de 10 GB que morre em 95%.
  local livre_gb
  livre_gb="$(df -g / | awk 'NR==2 {print $4}')"
  if [ "$livre_gb" -lt 50 ]; then
    falta "menos de 50 GB livres — Xcode + 1 runtime pedem ~40 GB"
    pendencias=$((pendencias + 1))
  fi

  titulo "Xcode e ferramentas de linha de comando"
  if ! command -v xcodebuild >/dev/null 2>&1; then
    falta "Xcode não instalado (ver 'O que depende de você', abaixo)"
    pendencias=$((pendencias + 1))
  else
    ok "Xcode $(xcodebuild -version | head -1 | awk '{print $2}')"
    # `xcode-select -p` apontando para CommandLineTools em vez do
    # Xcode.app é a causa número um de "xcrun: error: unable to find
    # utility simctl" num Mac que TEM Xcode instalado.
    local caminho
    caminho="$(xcode-select -p)"
    if [[ "$caminho" != *"Xcode.app"* ]]; then
      falta "xcode-select aponta para $caminho, não para o Xcode.app"
      pendencias=$((pendencias + 1))
    else
      ok "xcode-select: $caminho"
    fi
    if ! xcodebuild -license check >/dev/null 2>&1; then
      falta "licença do Xcode não aceita (precisa de sudo, ver abaixo)"
      pendencias=$((pendencias + 1))
    else
      ok "licença do Xcode aceita"
    fi
  fi

  titulo "SDK e runtime de iOS"
  local minimo
  if ! minimo="$(minimo_de_ios_do_projeto "$HELPERS_RB")"; then
    erro "não achei o react-native instalado — rode 'pnpm install' primeiro"
    return 1
  fi
  printf '  Este projeto exige iOS >= %s (lido do react-native instalado)\n' "$minimo"

  if command -v xcrun >/dev/null 2>&1; then
    local runtimes
    runtimes="$(xcrun simctl list runtimes 2>/dev/null | grep -oE 'iOS [0-9]+\.[0-9]+' | awk '{print $2}' | sort -V | tail -1 || true)"
    if [ -z "$runtimes" ]; then
      falta "nenhum runtime de iOS instalado (o Xcode baixa sob demanda)"
      pendencias=$((pendencias + 1))
    elif versao_maior_ou_igual "$runtimes" "$minimo"; then
      ok "runtime de iOS mais novo: $runtimes"
    else
      erro "runtime mais novo é $runtimes, abaixo do mínimo $minimo do projeto"
      pendencias=$((pendencias + 1))
    fi
  fi

  titulo "Cadeia JavaScript"
  local node_esperado
  node_esperado="$(tr -d 'v \n' < "$RAIZ/.nvmrc" 2>/dev/null || echo "")"
  if command -v node >/dev/null 2>&1; then
    local node_atual
    node_atual="$(node -v | tr -d 'v')"
    if [ -n "$node_esperado" ] && ! versao_maior_ou_igual "$node_atual" "${node_esperado%%.*}.0.0"; then
      falta "Node $node_atual, e o projeto pede $node_esperado (.nvmrc)"
      pendencias=$((pendencias + 1))
    else
      ok "Node $node_atual"
    fi
  else
    falta "Node não instalado"
    pendencias=$((pendencias + 1))
  fi

  for ferramenta in pnpm git; do
    if command -v "$ferramenta" >/dev/null 2>&1; then
      ok "$ferramenta $("$ferramenta" --version | head -1 | tr -d 'v')"
    else
      falta "$ferramenta não instalado"
      pendencias=$((pendencias + 1))
    fi
  done

  # Watchman não é obrigatório, mas sem ele o Metro observa arquivo pelo
  # fallback do Node e num monorepo deste tamanho isso derruba a
  # recarga automática — que é justamente o que se quer no simulador.
  if command -v watchman >/dev/null 2>&1; then
    ok "watchman $(watchman --version)"
  else
    falta "watchman ausente (recarga automática fica lenta sem ele)"
    pendencias=$((pendencias + 1))
  fi

  # CocoaPods: o `expo prebuild` do iOS roda `pod install`. O Xcode não
  # traz CocoaPods.
  if command -v pod >/dev/null 2>&1; then
    ok "CocoaPods $(pod --version)"
  else
    falta "CocoaPods ausente (o prebuild do iOS precisa dele)"
    pendencias=$((pendencias + 1))
  fi

  titulo "Resultado"
  if [ "$pendencias" -eq 0 ]; then
    ok "nada pendente — pode rodar com --executar"
  else
    printf '  %s pendência(s). Rode com --instalar para o que é automatizável.\n' "$pendencias"
    cat <<'FIM'

  O que depende de você, e o script não faz:
    1. Xcode: instalar pela App Store (busque "Xcode") ou em
       https://developer.apple.com/xcode/ . São ~10 GB de download.
    2. Abrir o Xcode uma vez e aceitar o contrato na primeira tela.
    3. No terminal, apontar as ferramentas para ele e aceitar a licença:
         sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
         sudo xcodebuild -license accept
    4. Xcode > Settings > Components: baixar um runtime de iOS.
FIM
  fi

  return 0
}

instalar_o_que_falta() {
  titulo "Instalando o que falta"

  if ! command -v brew >/dev/null 2>&1; then
    erro "Homebrew ausente. Instale com a linha oficial de https://brew.sh e rode de novo."
    return 1
  fi

  # `brew install` de pacote já presente não atualiza nada, mas ser
  # explícito aqui é o que garante a regra "nunca atualizar o que já
  # funciona" mesmo que o brew mude de comportamento.
  for formula in watchman cocoapods; do
    if command -v "${formula%%-*}" >/dev/null 2>&1 || brew list "$formula" >/dev/null 2>&1; then
      ok "$formula já presente, nada a fazer"
    else
      printf '  instalando %s...\n' "$formula"
      brew install "$formula"
    fi
  done

  printf '  dependências do monorepo...\n'
  (cd "$RAIZ" && pnpm install --frozen-lockfile)
  ok "pnpm install concluído"
}

executar_no_simulador() {
  titulo "Subindo o simulador"

  command -v xcrun >/dev/null 2>&1 || { erro "xcrun ausente — rode o diagnóstico"; return 1; }

  # Escolhe o iPhone mais novo que o Mac tem, em vez de fixar um
  # modelo: o nome do dispositivo muda a cada versão do Xcode, e
  # "iPhone 15" fixo aqui quebraria o script no Xcode seguinte.
  local dispositivo
  dispositivo="$(xcrun simctl list devices available \
    | grep -oE 'iPhone [^(]*' | sed 's/ *$//' | sort -V | tail -1)"

  if [ -z "$dispositivo" ]; then
    erro "nenhum iPhone disponível. Xcode > Settings > Components > baixe um runtime de iOS."
    return 1
  fi

  printf '  dispositivo: %s\n' "$dispositivo"
  xcrun simctl boot "$dispositivo" 2>/dev/null || ok "já estava ligado"
  open -a Simulator

  titulo "Compilando e instalando o app"
  # `expo run:ios` faz o prebuild (gera a pasta ios/), o pod install e
  # o build, nesta ordem. A pasta ios/ não existe no repositório de
  # propósito: este projeto é managed workflow, e a pasta é gerada.
  (cd "$APP" && pnpm expo run:ios --device "$dispositivo")
}

# ---------------------------------------------------------------------
# Autoteste: roda em qualquer sistema, inclusive Linux.
#
# Existe para as duas funções de comparação não irem para o Mac sem
# nunca terem sido executadas. Elas são onde um script como este erra
# em silêncio — "10.0" < "9.0" na comparação de string não falha, só
# dá a resposta errada.
# ---------------------------------------------------------------------
autoteste() {
  local falhas=0
  verificar() {
    if [ "$2" = "$3" ]; then
      printf '  ok   %s\n' "$1"
    else
      printf '  FALHOU %s: esperado %s, veio %s\n' "$1" "$3" "$2"
      falhas=$((falhas + 1))
    fi
  }

  local r
  versao_maior_ou_igual "18.0" "15.1" && r=sim || r=nao
  verificar "18.0 >= 15.1" "$r" "sim"
  versao_maior_ou_igual "15.1" "15.1" && r=sim || r=nao
  verificar "15.1 >= 15.1 (igual)" "$r" "sim"
  versao_maior_ou_igual "15.0" "15.1" && r=sim || r=nao
  verificar "15.0 >= 15.1" "$r" "nao"
  # O caso que a comparação de string erra: 10 vem depois de 9.
  versao_maior_ou_igual "10.0" "9.0" && r=sim || r=nao
  verificar "10.0 >= 9.0 (ordem numérica)" "$r" "sim"
  versao_maior_ou_igual "22.22.0" "22.0.0" && r=sim || r=nao
  verificar "22.22.0 >= 22.0.0" "$r" "sim"

  if [ -f "$HELPERS_RB" ]; then
    verificar "mínimo de iOS lido do react-native" \
      "$(minimo_de_ios_do_projeto "$HELPERS_RB")" "15.1"
  else
    printf '  pulado: react-native não instalado neste checkout\n'
  fi

  [ "$falhas" -eq 0 ] || return 1
  printf '\nAutoteste passou.\n'
}

case "${1:-}" in
  --autoteste) autoteste ;;
  --instalar) exigir_macos; diagnosticar || true; instalar_o_que_falta; diagnosticar ;;
  --executar) exigir_macos; executar_no_simulador ;;
  "" | --diagnosticar) exigir_macos; diagnosticar ;;
  *)
    printf 'Uso: %s [--diagnosticar|--instalar|--executar|--autoteste]\n' "$0" >&2
    exit 64
    ;;
esac
