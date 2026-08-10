# Dossiê 43 — Identity & Access Engine: auditoria + MFA obrigatório para Admin Rotta

> Escopo: dois mega-prompts concatenados — "Identity & Access Engine"
> (autenticação/autorização/RBAC/organizações/MFA/sessões/auditoria de
> toda a plataforma) e "Integration & Intelligence Audit Engine"
> (auditar se a Rotta funciona ponta a ponta como um único ecossistema).
> Ambos abrem com a mesma instrução: **audite antes de mexer, preserve o
> que estiver correto, corrija só o que for lacuna real** — nunca recrie
> o que já existe.

## 1. Auditoria — o que já existe (preservado, não recriado)

Ao contrário do que os dois prompts pressupõem ("talvez a Rotta não
tenha nada disso"), uma auditoria real do código encontrou um módulo
Auth **já maduro**, com a arquitetura de segurança quase inteira
correta desde o desenho original (Dossiê 12, escrito antes de qualquer
linha de código). Confirmado, com evidência de código, item por item do
prompt:

| Item pedido pelo prompt                                                            | Estado real encontrado                                                                                                                                |
| ---------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| USER + PROFILE + ORGANIZATION + ROLE + PERMISSIONS, sem contas separadas por papel | `User` + `Membership` (user×company×role) + `Role` enum — exatamente esse modelo (`schema.prisma`, `role.enum.ts`)                                    |
| Multi-tenant, um usuário com papéis diferentes em empresas diferentes              | `Membership` único por `(userId, companyId, role)`; `login()` já lida com múltiplos vínculos ativos (seletor de perfil)                               |
| RBAC centralizado, nunca espalhado                                                 | `@Roles(...)` + `RolesGuard` — 22 controllers já usam, nenhuma checagem de papel inline fora disso                                                    |
| Autorização por organização, nunca confiar no `tenantId` do cliente                | `TenantGuard` resolve `tenantId` SÓ do JWT, nunca de URL/body; RLS do Postgres como rede de segurança final (`PrismaService.withTenant`)              |
| Autorização por recurso (Responsável A não acessa aluno B)                         | Padrão já usado em todo módulo com posse individual (`findByIdOrThrow` escopado por `actor` em Trips/Routes/Students/etc. — auditado no Dossiê 39/40) |
| Sessões com dispositivo/IP/user agent, "encerrar todas as sessões"                 | `Session` model completo + `GET /auth/sessions`, `DELETE /auth/sessions/:id`, `DELETE /auth/sessions/other`                                           |
| Recuperação de senha seguro, nunca enviar a senha atual                            | `POST /auth/forgot-password`/`reset-password`, token de uso único com hash, revoga todas as sessões ao final                                          |
| Senha com hash seguro, nunca reversível                                            | Argon2id (`PasswordHasherService`)                                                                                                                    |
| Proteção contra força bruta/tentativas excessivas                                  | `tentativasLoginFalhas`/`bloqueadoAte` (lockout de 15min após 5 tentativas) — RN já implementada                                                      |
| Rate limiting em login/cadastro/recuperação/APIs sensíveis                         | `@nestjs/throttler` já instalado e aplicado por rota (`login`: 10/min, `register`/`forgot-password`: 5/min)                                           |
| Não confiar só no frontend, toda autorização validada no backend                   | Confirmado em toda a auditoria dos módulos anteriores (Dossiês 39/40) — nenhum "botão escondido" como segurança                                       |
| Auditoria de ações administrativas                                                 | `AuditLog` model (polimórfico, append-only) + `AuditLogService`, já usado por Companies e outros módulos                                              |
| Convites de papel (equivalente a "impersonation" seguro de onboarding)             | `InvitesService` — código curto, expira, uso único, vínculo ao convidante                                                                             |

**Conclusão da auditoria**: a arquitetura de identidade não precisava
ser "criada" — precisava ser fechada em UM ponto concreto onde
realmente havia uma lacuna de segurança real, não decorativa.

## 2. A lacuna real encontrada

O próprio Dossiê 12 (§4.5), escrito na fundação do projeto, já
registrava a decisão consciente de adiar isto:

> "O schema de `Usuario` já reserva os campos (`totp_secret`
> criptografado, `totp_habilitado`) desde o MVP, mesmo que a ativação de
> 2FA por TOTP... só seja exposta na UI a partir de V2 para papéis
> administrativos... evita uma migração de schema disruptiva quando a
> funcionalidade for priorizada."

Isto significa que **Admin Rotta** — o único papel com acesso
cross-tenant real (`TenantGuard`: `bypass: true`), capaz de ver/alterar
dado de qualquer empresa da plataforma — faz login hoje com **só
e-mail/telefone/CPF + senha**. Nenhum segundo fator. Os dois prompts
desta entrega pedem exatamente isto, com as mesmas palavras do desenho
original: _"MFA especialmente obrigatório... para administrador
geral"_, _"não usar SUPER_ADMIN como desculpa para ignorar segurança"_.

Esta foi a lacuna escolhida para fechar por completo nesta entrega —
critério: mais concretamente escopável, mais alto risco de segurança
real, e já estava pré-desenhada (só faltava construir), evitando
espalhar esforço raso pelos ~90 itens dos dois prompts.

## 3. O que foi construído

### 3.1 Backend

- **Schema** (`User`): `totpSecretCriptografado`, `totpHabilitado`,
  `totpHabilitadoEm`, `totpCodigosRecuperacaoHashes[]` — exatamente os
  campos já previstos no Dossiê 12. Migração
  `20260810230000_user_totp_mfa`.
- **`SecretCipherService`** (novo, `infra/security`) — AES-256-GCM,
  chave de `MFA_ENCRYPTION_KEY` (32 bytes, base64). Diferente de
  `PasswordHasherService` (Argon2, irreversível): o segredo TOTP
  precisa ser **decifrado** a cada login para comparar o código, então é
  criptografia simétrica reversível, nunca hash.
- **`MfaService`** (novo, módulo Auth) — gera segredo, monta
  `otpauth://` URI + QR code (PNG data URL via `qrcode`), verifica
  código de 6 dígitos (`otplib`, RFC 6238, tolerância de 1 passo/30s),
  gera e valida 10 códigos de recuperação de uso único (hash Argon2,
  nunca reversível). **Fixado em `otplib@12`** (singleton clássico
  `authenticator`) em vez da v13 mais recente — a v13 reescreveu a lib
  sobre `@scure/*`/`@noble/*`, pacotes ESM-only que quebram o `require()`
  deste projeto (CJS) tanto em Jest quanto em runtime; v12 é madura,
  amplamente usada em produção, sem essa dependência.
- **`AuthService.login()`** — Admin Rotta NUNCA mais recebe tokens
  direto. Senha correta só abre caminho para:
  - `mfaSetupRequired` (conta sem TOTP ainda) → só um `mfaSetupToken` de
    5 minutos, sem `role`/`tenantId` (não autentica nenhuma rota, nem
    por engano — o `TenantGuard` global já rejeitaria por falta de
    tenant mesmo sem checagem extra).
  - `mfaRequired` (conta já protegida) → só um `mfaChallengeToken`.
- **4 endpoints novos**: `POST /auth/mfa/setup`, `POST /auth/mfa/enable`
  (confirma com o primeiro código real, ativa e emite os tokens de
  sessão + os 10 códigos de recuperação, mostrados só nesta resposta),
  `POST /auth/mfa/verify-login` (segundo fator do login — código do app
  OU código de recuperação, nunca os dois), `POST /auth/mfa/disable`
  (autenticado, exige o código TOTP atual — "ações críticas exigem
  confirmação adicional").
- **Auditoria** — `AuthService` passou a gravar `LOGIN_SUCCESS`,
  `LOGIN_FAILED` (senha incorreta/conta bloqueada), `MFA_ENABLED`,
  `MFA_DISABLED`, `MFA_LOGIN_FAILED` via `AuditLogService` (gap real: o
  módulo Auth nunca tinha gravado nenhum desses eventos antes, apesar do
  vocabulário já estar especificado no Dossiê 8 §16). Best-effort — uma
  falha ao gravar auditoria nunca derruba um login/MFA que já era
  válido.
- **`GET /auth/me`** ganhou `mfaEnabled: boolean`.

### 3.2 Frontend

- **`packages/api-client`**: tipos `MfaSetupRequiredResponse`/
  `MfaChallengeResponse`/`MfaSetupResponse`/`MfaEnableResponse` + type
  guards + `authApi.mfa.{setup,enable,verifyLogin,disable}`.
- **`packages/auth`** (web e native): `login()` agora reconhece os dois
  novos formatos de resposta e **não** tenta aplicar sessão neles (bug
  que teria acontecido sem este ajuste: gravar `undefined` como se fosse
  token válido). Novos métodos `mfaSetup`/`mfaEnable`/`mfaVerifyLogin`
  expostos por `useAuth()`.
- **`apps/admin` — `/entrar`**: fluxo completo de 4 telas —
  credenciais → configurar MFA (QR + código manual + confirmação) →
  mostrar os 10 códigos de recuperação uma única vez → (login seguinte)
  verificar código ou usar código de recuperação.
- **`apps/web`/`apps/mobile`**: guarda defensiva nos dois pontos de
  login — Admin Rotta não usa nenhum dos dois apps hoje, mas se algum
  dia acontecer, a tela mostra um erro claro em vez de tentar navegar
  como se tivesse autenticado sem tokens.

## 4. ⚠️ Passo obrigatório antes de produção

**`MFA_ENCRYPTION_KEY` precisa estar configurada no ambiente de
produção (Render) antes deste deploy chegar lá.** Sem ela,
`SecretCipherService` recusa cifrar/decifrar com um erro claro (nunca
falha o boot da aplicação, mesmo padrão "stub honesto" de
`LYTEX_*`/`DIDIT_API_KEY`) — mas como MFA agora é **obrigatório** para
Admin Rotta, isso significa que **nenhuma conta de Admin Rotta consegue
terminar o login** até a variável ser configurada (login para no passo
`mfaSetupRequired`, e `/auth/mfa/setup` falha). Gerar com:
`openssl rand -base64 32`. Documentado em `.env.example`.

## 5. Verificação

- `pnpm --filter @rotta/api run typecheck` — **passou** (0 erros).
- `pnpm --filter @rotta/api exec jest` — **526/526 testes passaram**
  (513 pré-existentes + 13 novos: `setupMfa`/`enableMfa`/
  `verifyMfaLogin`/`disableMfa`, cobrindo código válido, código
  inválido, código de recuperação válido/inválido/consumido, e os dois
  novos ramos de `login()` para Admin Rotta).
- `pnpm --filter @rotta/admin run typecheck` — **passou**.
- `pnpm --filter @rotta/web run typecheck` — **passou**.
- `pnpm --filter @rotta/mobile run typecheck` — **passou**.
- `pnpm --filter @rotta/api-client run typecheck` — **passou**.
- `pnpm --filter @rotta/auth run typecheck` — **passou**.
- `eslint --fix` em todos os arquivos tocados — 0 erros.

## 6. Deixado de fora (auditado, com motivo — não esquecido)

Ambos os prompts pedem uma superfície enorme (~90 seções somadas).
Fechar UM item com qualidade real, em vez de tocar raso em todos, é a
mesma disciplina usada em toda esta sessão (Dossiês 39/40/41/42). O que
fica registrado como lacuna real, não como "já resolvido":

- **Permissões granulares** (`students.read`, `payments.create`, etc.)
  — hoje a autorização é por `Role` (RBAC coarse-grained) + posse de
  recurso, não por permissão nomeada individual. Funciona e é seguro
  para o tamanho atual da plataforma; uma tabela `Permission`/
  `RolePermission` separada é o próximo passo natural quando surgir a
  necessidade real de conceder um subconjunto de ações dentro de um
  papel (ex. Gestor com acesso a tudo MENOS financeiro).
- **MFA para Gestor/Empresa** — o Dossiê 12 §4.5 sempre previu MFA para
  os três papéis administrativos (Gestor/Empresa/Admin Rotta), "V2".
  Esta entrega fechou o mais crítico (cross-tenant); a mesma
  infraestrutura (`MfaService`, schema, endpoints) já serve para
  estender aos outros dois sem nenhuma migração nova — só decidir a
  política de obrigatoriedade por papel.
- **`SUPPORT_AGENT`/impersonation seguro** — não existe hoje nenhuma
  distinção entre "Admin Rotta" e "equipe de suporte com acesso
  limitado"; toda conta administrativa é Admin Rotta pleno. Sem
  mecanismo de impersonation (nunca "login como usuário" simples,
  conforme o prompt pede).
- **Admin → Users/Roles/Permissions/Audit Logs (telas dedicadas)** —
  `AuditLog` é consultável hoje só por endpoint específico de cada
  módulo (ex. `GET /companies/:id/audit-logs`), não por um painel
  central de auditoria/usuários/papéis no `apps/admin`.
- **Consentimentos versionados** (termos/privacidade/marketing,
  guardando versão+timestamp+finalidade) — hoje só existe
  `consentimentoLgpdAceitoEm` (um timestamp único, sem versão).
- **Exclusão de conta com anonimização/retenção legal** — hoje `User`
  tem soft delete (`deletedAt`) mas nenhum fluxo de solicitação →
  análise de dependências → anonimização.
- **Deep link authorization explícita** (Communication Engine → Identity
  Engine antes de abrir uma tela) — cada módulo já valida posse
  individualmente nas próprias rotas (Trips/Contracts/Documents), mas
  não existe uma camada central nomeada "autorização de deep link".
- **Integration & Intelligence Audit Engine** (segunda metade do
  prompt: Health Dashboard, Business KPIs, Root Cause Analysis,
  reconciliação Rotta×Lytex/AbacatePay, Data Integrity Engine, matriz de
  funcionalidades) — não iniciado nesta entrega. É um programa de
  trabalho por si só (múltiplos dossiês), fora do escopo de "fechar uma
  lacuna concreta" desta rodada; registrado aqui para não ser esquecido
  quando priorizado.
