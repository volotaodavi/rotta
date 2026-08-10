# Dossiê 42 — PIN de acesso rápido animado (Motorista, mobile)

> Pedido do usuário: uma referência visual de um showcase de componentes
> de terceiro ("OTP Verification V3" — 4 caixinhas que preenchem e
> "orbitam" ao digitar, com sugestão de autopreenchimento por SMS) e o
> pedido "quando for colocar a senha de 4 dígitos (caso os motoristas
> queiram), na hora de validar deve ser animado". Antes de implementar,
> o usuário confirmou (via pergunta de esclarecimento) que o pedido é um
> **PIN de acesso rápido local** — não um novo método de login no
> backend, não um código enviado por SMS.

## 1. O que é (e o que NÃO é)

- **É**: depois que o Motorista já fez login normal (telefone/e-mail/CPF
  - senha) uma vez, pode ativar — opt-in, no Perfil — um PIN de 4
    dígitos para reabrir o app mais rápido (ex.: no meio da rota),
    igual a um app de banco.
- **NÃO é** um novo mecanismo de autenticação no backend. Não existe
  endpoint novo, não existe coluna nova no Prisma, o PIN nunca sai do
  aparelho nem em texto puro nem como hash. A sessão real continua
  sendo o `refresh_token` já existente (`@rotta/auth`, Dossiê 15) — o
  PIN só decide se a UI de uma sessão que já existe fica visível ou
  escondida atrás de uma tela de desbloqueio.
- **NÃO é** um código de verificação por SMS. A referência trazida pelo
  usuário era um componente de OTP com botão "Fill" (autopreenchimento
  da mensagem) — não existe SMS aqui, então não existe esse botão nem
  qualquer sugestão de autopreenchimento; seria enganoso simular algo
  que a Rotta não envia.

Essa distinção foi decidida com o usuário antes de qualquer código,
porque as outras duas leituras possíveis do pedido ("PIN substitui a
senha como login completo no backend") mudariam a arquitetura de
segurança (hash + rate-limit contra força bruta, já que 4 dígitos = só
10.000 combinações) — não era o que foi pedido.

## 2. O que foi construído

- **`apps/mobile/src/features/auth/pin-lock-store.ts`** (novo) —
  armazenamento 100% local (`expo-secure-store`, mesma proteção do
  `refresh_token`), chaveado por `userId`. Guarda hash SHA-256 + salt
  aleatório por usuário (`expo-crypto`, nova dependência — `~14.0.2`,
  mesma faixa de versão do `expo-secure-store` já usado, compatível com
  Expo SDK 52) — nunca o PIN em texto puro, mesmo já estando em
  armazenamento criptografado (Keychain/Keystore), para que um
  comprometimento do dispositivo não exponha um PIN que a pessoa pode
  reusar em outro lugar.
- **`apps/mobile/src/features/auth/components/pin-code-input.tsx`**
  (novo) — as 4 caixinhas animadas. Conceito trazido da referência
  (caixinhas que reagem a cada dígito) — nenhuma cor/forma/texto/ícone
  copiado. `Animated` da própria `react-native` (nenhuma lib nova) —
  pulso de escala a cada dígito preenchido, "tremor" (shake) quando o
  PIN está errado. Um `TextInput` real fica invisível por cima só para
  abrir o teclado numérico do sistema.
- **`apps/mobile/src/features/auth/hooks/use-pin-lock.ts`** (novo) —
  decide quando a trava aparece: sessão restaurada do zero no boot do
  app, e sempre que o app volta de background/inactive para active.
  Explicitamente NÃO trava logo após um login explícito na mesma
  execução (a pessoa acabou de digitar a senha inteira — pedir o PIN de
  novo na sequência seria redundante).
- **`apps/mobile/src/features/auth/components/pin-setup-card.tsx`**
  (novo) — cartão de ativação/desativação no Perfil, fluxo de dois
  passos (escolher → confirmar), igual a qualquer criação de PIN/senha.
- **`apps/mobile/src/features/auth/screens/pin-lock-screen.tsx`** (novo)
  — tela de desbloqueio, com saída de emergência "Sair e entrar com
  senha" para quem esqueceu o PIN (volta ao login normal).
- **`apps/mobile/src/navigation/RootNavigator.tsx`** — passa a checar
  `usePinLock` antes de montar o navigator do papel ativo; renderiza a
  tela de PIN fora do `NavigationContainer` (não navega para nada, é só
  um portão sobre uma sessão que já existe).
- **`apps/mobile/src/features/driver/screens/perfil-screen.tsx`** —
  `PinSetupCard` só aparece para `role === "motorista"` (pedido
  explícito "caso os motoristas queiram"; Monitor não ganha essa opção
  aqui).

## 3. Por que só Motorista, só mobile

- **Só Motorista**: pedido literal do usuário. `DriverPerfilScreen` é
  compartilhada com Monitor, mas o cartão de PIN é condicionado ao
  papel — Monitor não vê a opção.
- **Só mobile**: é o app do Motorista em campo (a tela de Entrar do
  `apps/web`/`apps/admin` já tem seu próprio tratamento — Dossiê 41,
  mascote animado — sem PIN, que não faz sentido em desktop/painel).

## 4. Verificação

- `pnpm --filter @rotta/mobile run typecheck` — **passou** (0 erros).
- `eslint --fix` nos arquivos novos/editados — **0 erros**, só avisos
  pré-existentes no projeto inteiro (`react-native/no-inline-styles`,
  `import/order`) — confirmado rodando o mesmo lint em
  `features/driver`/`features/vehicles` já existentes: mesmo padrão de
  avisos, não é uma regressão introduzida aqui.
- `apps/mobile` ainda não tem suíte de testes automatizados (gap
  pré-existente, documentado no Dossiê 23, Seção 10 — `pnpm test` é um
  placeholder) — não é algo introduzido por esta entrega.
- `git status --short` confirmado — só os arquivos desta entrega foram
  tocados.

## 5. Deixado de fora (com motivo)

- **Rate-limit/bloqueio por tentativas erradas** — não implementado de
  propósito: como o PIN nunca sai do aparelho e não é um mecanismo de
  autenticação remoto, não existe "força bruta pela rede" a mitigar; um
  atacante com o aparelho físico desbloqueado já teria a sessão aberta
  de qualquer forma. Se no futuro o PIN também trancar acesso a dados
  sensíveis offline, um limite de tentativas locais entra em pauta.
- **Biometria (Face ID/Touch ID/impressão digital)** — pedido do
  usuário foi especificamente por PIN de 4 dígitos animado; biometria
  usaria `expo-local-authentication` (não instalado), registrado como
  possível evolução, não construído aqui.
- **Monitor e demais papéis** — decisão de escopo (Seção 3), não uma
  limitação técnica: o mesmo `pin-lock-store`/`PinCodeInput` funcionam
  para qualquer `userId`, então estender é trivial se pedido depois.
