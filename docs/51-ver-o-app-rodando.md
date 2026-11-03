# Ver o app rodando: Android aqui, iOS só no Mac

Para os dois sócios. O que é possível, o que não é, e quem faz o quê.

**Resumo de uma linha:** o **Android funciona de dentro da sessão na
nuvem** — o Claude instala o app num emulador, tira screenshot, clica e
digita. Isso está medido e provado na seção "Android", mais abaixo. O
**iOS não**, e nenhuma configuração muda isso.

---

## A limitação, primeiro

**A sessão do Claude Code na nuvem não consegue abrir o Simulador
iOS.** Não é configuração pendente nem ferramenta faltando: ela roda
num contêiner Ubuntu (`x86_64`, 4 núcleos, 15 GB), e o Simulador iOS é
parte do Xcode, que a Apple distribui **só para macOS**. Não existe
porte, não existe emulador de terceiros, não existe imagem de
contêiner — o simulador executa binários Darwin e usa frameworks do
próprio sistema.

Conferido nesta máquina em 03/11/2026: `xcodebuild`, `xcrun`, `simctl`,
`swift`, `pod` e `brew` todos ausentes, e nenhum deles instalável aqui.

Então a pergunta útil não é "como instalar" — é **onde a sessão roda**.

---

## O caminho que dá o que você pediu

Você pediu que o Claude altere o código, rode no simulador, veja a tela
e interaja com ela. Isso funciona, mas a sessão precisa estar **na sua
máquina**, não na nuvem. Duas formas:

**1. App do Claude Desktop.** Abra o projeto por lá. A sessão roda no
seu Mac, com acesso ao `xcrun`, ao `simctl` e ao Xcode.

**2. `claude remote-control`.** Num terminal, dentro da pasta do
projeto no seu Mac:

```
cd ~/caminho/para/rotta
claude remote-control
```

A pasta passa a aparecer na lista de pastas da sua conta, e uma sessão
na nuvem pode pedir para usá-la. A partir daí os comandos rodam no seu
Mac.

Em 03/11/2026 a lista de pastas desta conta estava **vazia** — nenhuma
máquina sua estava servindo pasta nenhuma. É por isso que esta sessão
não teve nem como pedir.

### O que passa a ser possível, com a sessão no Mac

| O que você pediu                    | Como se faz                                                                        |
| ----------------------------------- | ---------------------------------------------------------------------------------- |
| Rodar nova versão ao alterar código | Fast Refresh do Metro: salvar o arquivo já recarrega a tela                        |
| Ver screenshot da tela              | `xcrun simctl io booted screenshot tela.png`                                       |
| Clicar, digitar, navegar            | `xcrun simctl` para deep link e texto; toque por coordenada exige Maestro ou Detox |
| Ler log e achar erro                | `xcrun simctl spawn booted log stream --predicate 'process == "Rotta"'`            |
| Testar e procurar regressão         | `pnpm --filter @rotta/mobile test` (325 testes hoje)                               |

A linha de "clicar" é a única com ressalva honesta: `simctl` abre URL e
digita texto, mas **não** toca em coordenada. Para automação de toque
de verdade o projeto precisaria de [Maestro](https://maestro.mobile.dev)
ou Detox, que hoje não estão configurados — o `test:e2e` do app é um
`echo` com essa dívida escrita nele.

---

## Se você não tem Mac

Duas saídas, e as duas rodam o app de verdade:

**Expo Go num iPhone.** Sem Mac, sem conta paga:

```
pnpm --filter @rotta/mobile dev
```

Lê o QR code com a câmera do iPhone. O Fast Refresh funciona igual. O
que Expo Go **não** roda é código nativo que o app usa fora do que ele
já traz — na prática, rastreamento em segundo plano e notificação push
se comportam diferente.

**Build de simulador na nuvem.** O perfil `preview` do `eas.json` já
tem `ios: { simulator: true }`, então:

```
cd apps/mobile && npx eas-cli build --platform ios --profile preview
```

Compila num Mac da Expo e devolve um `.app` que roda em simulador de
qualquer Mac — inclusive o de outra pessoa. **Não** exige conta de
Apple Developer, porque não instala em aparelho físico.

---

## O script de preparo

`scripts/preparar-mac-ios.sh` existe para o seu Mac não depender de
alguém lembrar a ordem das coisas.

```
./scripts/preparar-mac-ios.sh              # só diagnostica, não muda nada
./scripts/preparar-mac-ios.sh --instalar   # instala o que FALTA
./scripts/preparar-mac-ios.sh --executar   # liga o simulador e roda o app
./scripts/preparar-mac-ios.sh --autoteste  # roda em qualquer sistema
```

O padrão é **diagnosticar**. Instalar e executar são explícitos de
propósito, e nada ali atualiza componente que já esteja instalado:
atualizar por conta própria é como se quebra um ambiente que estava
funcionando.

Três decisões dentro dele que vale saber:

- **A versão mínima de iOS é lida do projeto, não escrita no script.**
  Ele extrai de `node_modules/react-native/scripts/cocoapods/helpers.rb`,
  que com react-native 0.76.5 devolve **15.1**. Trocar de versão de RN
  muda o número sozinho.
- **O iPhone do simulador é o mais novo que o seu Mac tiver.** Fixar
  "iPhone 15" quebraria no Xcode seguinte, porque o nome do dispositivo
  muda a cada versão.
- **`--autoteste` roda em Linux.** As comparações de versão são onde um
  script assim erra calado: `"10.0" < "9.0"` em ordem alfabética não
  falha, só responde errado. Os seis casos são verificados antes de o
  script chegar ao Mac.

### O que só você consegue fazer

O script não baixa o Xcode, e não tem como: são ~10 GB atrás de uma
conta Apple, e a licença precisa de `sudo`.

1. Instalar o **Xcode** pela App Store (busque "Xcode") ou em
   https://developer.apple.com/xcode/ .
2. Abrir o Xcode uma vez e aceitar o contrato da primeira tela.
3. No terminal:
   ```
   sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
   sudo xcodebuild -license accept
   ```
   O passo 3 é o que conserta o erro mais comum num Mac que **tem**
   Xcode: `xcrun: error: unable to find utility simctl`, que acontece
   quando o `xcode-select` aponta para o CommandLineTools em vez do
   `Xcode.app`.
4. **Xcode > Settings > Components**: baixar um runtime de iOS.
5. Reservar **~50 GB** de disco. Xcode mais um runtime pedem ~40 GB.

Depois disso, `--instalar` cuida de Watchman, CocoaPods e das
dependências do monorepo, e `--executar` liga o simulador e compila.

---

## Por que o app não tem pasta `ios/`

Porque este projeto é **managed workflow** do Expo: a pasta nativa é
gerada, não versionada. `pnpm expo run:ios` faz o `prebuild`, o
`pod install` e o build, nessa ordem.

É o mesmo motivo de `android/` também não existir, e de o `.aab` da
Play sair de `eas build --local` na CI em vez de um Gradle local.

A configuração de iOS já está completa e **não precisa de conserto**:
as justificativas de uso de localização vêm do plugin `expo-location`
em `app.config.ts` (`locationWhenInUsePermission`,
`locationAlwaysAndWhenInUsePermission`,
`isIosBackgroundLocationEnabled`), que injeta as chaves de `Info.plist`
no prebuild. Sem esses textos o iOS **derruba** o app ao pedir
localização, então isto não é detalhe de loja: é a tela do motorista
funcionar.

---

## Android: funciona de dentro da sessão na nuvem

Esta é a parte boa, e é a resposta prática para quem não tem Mac.

O emulador do Android SDK roda em Linux. Sem `/dev/kvm` — e este
contêiner não tem, nem as flags `vmx`/`svm` da CPU — ele cai para a
emulação de software do próprio QEMU (TCG). **Lento, mas funciona.**

### Medido, não estimado

Tudo abaixo foi executado neste contêiner em 03/11/2026, 4 vCPU,
Xeon sem virtualização aninhada:

| Etapa                                     | Tempo     |
| ----------------------------------------- | --------- |
| Baixar SDK + imagem `android-34` (5,4 GB) | ~6 min    |
| Primeiro boot, 1 núcleo                   | **8m13s** |
| Boot seguinte, 4 núcleos                  | **3m47s** |
| `adb install` do APK de 126 MB            | **7m43s** |
| Abrir o app até a tela desenhar           | ~2 min    |
| Screenshot                                | ~2 s      |
| Toque ou digitação até a tela mudar       | 20-60 s   |

Os 4 núcleos mais que dobraram a velocidade do boot: o Android é bem
paralelo mesmo sob emulação de software.

### O que foi provado, tela a tela

Com o APK `preview` da Release `android-preview-run55`:

1. **Instala.** `adb install` concluiu com `Success`, e
   `pm list packages` confirma `br.com.rottabr`.
2. **Renderiza.** A tela de boas-vindas apareceu completa: logotipo,
   "Seja bem-vindo à Rotta.", a van, a linha pontilhada entre os dois
   pinos, "Começar agora" e "Entrar".
3. **Aceita clique.** Um toque em "Entrar" navegou para a tela de
   login.
4. **Aceita digitação.** `mae.e2e@rotta.test` entrou inteiro no campo
   de e-mail.
5. **Entrega log.** `logcat` responde normalmente.

De quebra, a tela de login mostrou **"Não foi possível falar com o
servidor. Verifique sua conexão e tente de novo."** — que é exatamente
a mensagem do conserto de 13/10/2026, funcionando num binário de
verdade, no lugar do antigo "Erro inesperado ao entrar". O emulador não
alcança a API de produção daqui, e o app tratou isso como devia.

### Os dois limites honestos

**O sistema Android engasga.** "Process system isn't responding"
aparece com frequência — é o **sistema**, não o app, e "Wait" dispensa.
O app em si desenha certo. Sob TCG o Android inteiro (Play Services,
teclado, busca) compete por CPU.

**Não serve para desenvolver interativamente.** Com 7 minutos para
instalar e 2 para abrir, o laço "mudei o código, vejo o resultado" não
fecha num ritmo útil. Serve para **conferir a tela** — que é
exatamente o que faltava.

### Como usar

```
./scripts/emulador-android.sh instalar          # baixa o SDK (~5,4 GB)
./scripts/emulador-android.sh iniciar           # sobe o emulador
./scripts/emulador-android.sh instalar-apk app.apk
./scripts/emulador-android.sh abrir
./scripts/emulador-android.sh tela captura.png
./scripts/emulador-android.sh tocar 540 2184
./scripts/emulador-android.sh texto "mae.e2e@rotta.test"
./scripts/emulador-android.sh log
./scripts/emulador-android.sh status
./scripts/emulador-android.sh parar
```

O SDK não entra no git (5,4 GB). O padrão é `~/.rotta-android/sdk`;
aponte `ANDROID_HOME` para outro lugar se quiser reaproveitar entre
sessões. Numa sessão nova da nuvem, `instalar` roda de novo.

### Duas armadilhas que custaram tempo, e estão travadas no script

**O APK precisa de `lib/x86_64`.** Sem isso o emulador recusa com
`INSTALL_FAILED_NO_MATCHING_ABIS`, e a mensagem não diz que falta a
ABI. Os builds `preview` do `eas.json` trazem as quatro
(`arm64-v8a`, `armeabi-v7a`, `x86`, `x86_64`), então passam. O script
confere antes de gastar sete minutos.

**O teclado desloca o layout inteiro.** Uma coordenada lida num
screenshot de antes do teclado passa a cair noutro elemento — ou no
nada, e aí o toque não faz nada e parece que o comando falhou. Foi
exatamente o que aconteceu aqui, e me levou a um diagnóstico errado:
atribuí ao caractere `@` uma digitação que parou no meio, e escrevi um
"conserto" que escapava `@` e outros metacaracteres. Estava errado —
`input text 'abc@def'` escreve `abc@def` inteiro, conferido. O escape
só teria inserido contrabarra literal no campo.

O que **de fato** precisa de tradução é só o espaço, e precisa mesmo,
porque o `adb` junta os argumentos e o shell do Android os separa de
novo:

```
input text 'um dois'        -> digitou "um"
input text '-tres%squatro'  -> digitou "-tres quattro"
```

Regra prática: tire um screenshot **novo** depois de qualquer coisa que
abra o teclado, e leia a coordenada dele.

---

## O que NÃO funciona daqui, e já foi testado

**Túnel do Expo** (`expo start --tunnel`, para o Metro daqui chegar ao
seu celular). Falha com `ngrok tunnel took too long to connect`: o
egresso deste contêiner é HTTPS por proxy, e o ngrok precisa de uma
conexão TCP própria. Então não dá para você abrir o Expo Go no celular
e ver o código que o Claude acabou de mudar aqui.

Para esse laço, o Metro precisa rodar numa máquina sua
(`pnpm --filter @rotta/mobile dev` no seu computador, celular na mesma
rede).
