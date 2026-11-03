# Rodar o app no Simulador iOS

Para os dois sócios. O que é possível, o que não é, e quem faz o quê.

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
