# Dossiê 32 — Auditoria de Segurança de Dados Pessoais e Sigilosos

> Origem: pergunta direta do usuário — _"as informações pessoais e
> sigilosas (que requer segurança) está no Back end? Caso não esteja,
> veja a melhor forma para manter a segurança."_ Este dossiê é uma
> auditoria real (código lido, não suposição) de onde vive cada
> categoria de dado pessoal na Rotta e de cada mecanismo de proteção
> hoje em vigor, seguida da correção do único gap concreto encontrado.

## 1. Onde está o dado pessoal — e sim, está todo no backend

Levantamento completo do `schema.prisma`: nenhum dado pessoal ou
sigiloso é armazenado em nenhum frontend (web/admin/mobile) — todos os
campos abaixo vivem só no Postgres, atrás da API.

| Dado                                          | Modelo                                         | Observação                         |
| --------------------------------------------- | ---------------------------------------------- | ---------------------------------- |
| Senha                                         | `User.passwordHash`                            | Nunca em texto puro — ver §2.1     |
| CPF                                           | `User.cpf`, `StudentAuthorizedPerson.cpf`      | Único, indexado                    |
| CNPJ                                          | `Company.cpfCnpj`                              |                                    |
| Documento de identidade (CNH/EAR/Cursos)      | `DriverDocument`                               | Arquivo no Storage — ver §3        |
| Documento de veículo (CRLV etc.)              | `VehicleDocument`                              | Arquivo no Storage — ver §3        |
| Data de nascimento (aluno, menor de idade)    | `Student.dataNascimento`                       |                                    |
| Foto de aluno (menor de idade)                | `Student.fotoUrl`                              | Arquivo no Storage — ver §3        |
| Endereço de embarque/desembarque              | `Student.embarque*`/`desembarque*`             |                                    |
| Necessidades especiais/medicamentos do aluno  | `Student.necessidadesEspeciais`/`medicamentos` | Dado de saúde — categoria sensível |
| Localização em tempo real (motorista/veículo) | `Vehicle.ultimaLatitude/Longitude`             | Só durante viagem ativa            |
| Consentimento LGPD                            | `User.consentimentoLgpdAceitoEm`               | Ver §4                             |
| Token de sessão                               | `Session.refreshTokenHash`                     | Hash, não o token — ver §2.2       |

Nenhum desses campos é lido diretamente por SQL cru em lugar nenhum do
código auditado — tudo passa pelo Prisma (parametrizado, sem risco de
SQL injection) e pelo `TenantGuard`/RLS (isolamento por `companyId` —
Dossiê 12).

## 2. O que já está correto (verificado no código, não assumido)

### 2.1 Senha

`apps/api/src/infra/security/password-hasher.service.ts` usa
**Argon2id** (`argon2` package) — vencedor da Password Hashing
Competition, escolhido explicitamente no próprio comentário do serviço
por resistência superior a ataques com GPU/ASIC (bcrypt/scrypt foram
avaliados e descartados). Nunca há log, resposta de API, nem
`AuditLog.dadosDepois` contendo `passwordHash` ou senha em texto puro
(confirmado por grep em todo `src/modules/auth`).

### 2.2 Sessão / tokens

- **Access token**: JWT assinado com **RS256** (par de chaves
  assimétrico, `jwt.strategy.ts`), TTL curto (`JWT_ACCESS_TOKEN_TTL`,
  padrão 15 min), guardado **só em memória** no processo do frontend
  (`inMemoryAccessToken` em `packages/auth/src/web/token-store.ts` — a
  mesma classe de armazenamento no mobile, `native/token-store.ts`).
  Confirmado por grep: **nenhum uso de `localStorage`/`sessionStorage`
  para o access token em `apps/web`, `apps/admin` ou `packages/auth`**
  — some do navegador a cada reload, de propósito.
- **Refresh token**: gerado com `randomBytes(48)` (`auth.service.ts`),
  armazenado no banco só como **hash** (`Session.refreshTokenHash`,
  campo `@unique`) — o valor em texto puro nunca é persistido no
  servidor, só devolvido uma vez ao cliente no momento do
  login/registro/refresh. Cada `Session` também guarda IP, user agent e
  nome do dispositivo, com suporte a revogação individual (Dossiê 15).

### 2.3 Borda da API

- `helmet()` (cabeçalhos de segurança padrão) e validação de CORS por
  função (`isCorsOriginAllowed`, lista fechada de origens +
  `CORS_ORIGIN_REGEX` opcional para previews) em `main.ts`.
- `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true })`
  global — qualquer campo fora do DTO é rejeitado, não ignorado
  silenciosamente (mitiga mass assignment).
- `ThrottlerModule` (30 req/60s por padrão, mais apertado em rotas
  sensíveis via `@Throttle`) protegendo login, refresh, esqueci-senha —
  mitiga força bruta e enumeração de credenciais.
- Erro de RBAC/multi-tenant é sempre `NotFoundException` (nunca
  `ForbiddenException`) — não revela a quem não tem acesso que o
  recurso existe (Dossiê 12).

### 2.4 Auditoria

`AuditLogService`/`recordAudit` (padrão repetido em todo módulo que
manipula dado sensível) grava só **metadado da operação** (ex.
`{ userId, tipo: "CNH" }` no upload de documento de motorista) — nunca
o conteúdo do arquivo, nunca `passwordHash`, nunca o token de sessão em
texto puro. Confirmado por leitura de cada chamada `recordAudit` nos
módulos Drivers, Vehicles, Students, Companies.

### 2.5 LGPD — consentimento

`RegisterEmpresaDto.aceiteTermos` é validado com
`@Equals(true, { message: "..." })` — não é um campo opcional
registrado "se o usuário lembrar marcar"; o cadastro **falha** sem o
aceite explícito dos Termos/Política de Privacidade, e só então
`consentimentoLgpdAceitoEm` é gravado.

## 3. O gap real encontrado — Storage público servindo dado pessoal

**Este é o achado central desta auditoria.** `SupabaseStorageService`
(Dossiê 16/31) gravava **todo** upload — incluindo CNH/documento de
motorista, documento de veículo e **foto de aluno (criança/adolescente,
LGPD art. 14 — categoria com proteção reforçada)** — no mesmo bucket
Supabase configurado como **público para leitura**, servido por
`getPublicUrl()`.

O problema concreto: o caminho do arquivo é **previsível a partir só do
id da entidade**, sem nenhum componente aleatório —
`students/{id}/foto.png`, `companies/{id}/logo.png`,
`vehicles/{id}/foto.png`. Qualquer pessoa que descobrisse (ou
enumerasse) um `id` de aluno — visível, por exemplo, em qualquer
resposta de API que um Responsável ou Empresa já tem acesso legítimo —
conseguia montar a URL da foto daquela criança **sem autenticação
nenhuma**, só concatenando a URL base do bucket público. O mesmo valia
para a CNH de um motorista, uma vez que o `userId` vazasse por qualquer
canal.

Documentos de motorista/veículo usam um UUID aleatório no nome do
arquivo (`drivers/{userId}/documents/{uuid}.ext`), o que dificulta mais
a adivinhação — mas o bucket público ainda significa que, uma vez que
alguém tivesse a URL por qualquer meio (captura de tela, cache,
compartilhamento indevido), o acesso continuava válido para sempre, sem
possibilidade de revogação.

### 3.1 Correção aplicada

Separação em **dois buckets**, com o Storage de fato desconectado de
qualquer credencial de produção real hoje (achado do Dossiê 31 — "zero
atividade" na Supabase confirma que nenhum arquivo real está nesse
esquema ainda), o que torna esta mudança segura de aplicar agora sem
nenhuma migração de dado:

- **`rotta-public`** (`SUPABASE_STORAGE_PUBLIC_BUCKET`) — só logo/foto
  de empresa e foto de veículo (ativos de marca, sem dado pessoal de
  terceiro). Continua `getPublicUrl()`, sem mudança de comportamento.
- **`rotta-documents`** (`SUPABASE_STORAGE_BUCKET`, já existia) — agora
  **privado**: CNH/documento de motorista, documento de veículo, foto
  de aluno. Servido por **`createSignedUrl()`** (URL com token
  criptográfico, não derivável do id da entidade) via
  `SupabaseStorageService.uploadPrivate()` — método novo, mesmo padrão
  de erro explícito (`ServiceUnavailableException` se não configurado)
  do `upload()` já existente.

```typescript
// apps/api/src/infra/storage/supabase-storage.service.ts
async uploadPrivate(path: string, file: Buffer, contentType: string, expiresInSeconds = TEN_YEARS) {
  // ...upload ao bucket PRIVADO...
  const { data, error } = await client.storage.from(this.config.bucket).createSignedUrl(path, expiresInSeconds);
  // nunca getPublicUrl aqui
  return data.signedUrl;
}
```

Call sites atualizados: `DriversService.uploadDocument`,
`StudentsService.uploadPhoto`, `VehiclesService.uploadDocument`
(documento oficial do veículo). `CompaniesService.uploadImage` e
`VehiclesService.uploadPhoto` (foto do veículo, não de pessoa)
continuam em `upload()`/bucket público — não há dado pessoal de
terceiro ali.

**Limitação assumida, documentada, não escondida**: a URL assinada é
gerada **uma vez, no upload**, com validade longa (10 anos) — não a
cada leitura. Isso resolve o problema real de hoje (adivinhação/
enumeração por `id`), mas não o de uma URL vazada continuar válida por
muito tempo depois de vazada. A evolução correta — assinar sob demanda,
com validade curta, a cada leitura — exige tornar os _mappers_ de
resposta de Drivers/Students assíncronos (hoje são funções puras
`entity → DTO`); não implementado nesta auditoria por ser uma mudança
de forma mais ampla que o gap encontrado justifica agora. Ver §6.

### 3.2 Runbook (Dossiê 31) atualizado

Dossiê 31 §4.2/§6.3 (que orientava criar **um** bucket público) foi
corrigido para refletir os dois buckets — quem for provisionar o
projeto Supabase real deve seguir o Dossiê 31 já atualizado, não a
versão original.

## 4. Um segundo achado, avaliado e conscientemente não corrigido agora

`packages/auth/src/web/token-store.ts` guarda o **refresh token** em
`window.localStorage` no `apps/web`/`apps/admin` (o access token
continua só em memória — não é esse o achado). Isso é um risco real
(XSS: um script malicioso injetado na página conseguiria ler
`localStorage` e roubar o refresh token) e **já estava documentado no
próprio código** como uma decisão temporária:

> "O `refresh_token` persiste em `localStorage` nesta fase; a migração
> para cookie `httpOnly` (isolado até de JS malicioso) é o próximo
> incremento de segurança documentado, pendente do backend passar a
> responder via `Set-Cookie` em vez do corpo JSON."

Por que não corrigido nesta auditoria: migrar para cookie `httpOnly`
não é uma troca de uma linha — `apps/web`/`apps/admin` (Vercel) e
`apps/api` (Render) estão em **domínios diferentes** (cross-site), o
que exige `SameSite=None; Secure` no cookie. Vários navegadores (Safari
em particular, e o Chrome caminhando na mesma direção) **bloqueiam
cookie de terceiro por padrão** — migrar sem testar isso em ambiente
real de produção arrisca quebrar login silenciosamente para uma fatia
de usuários, exatamente o "dar erro" que o usuário pediu para evitar.
Além disso, o app mobile (Expo) não usa cookie — já guarda o refresh
token em `SecureStore` (armazenamento nativo criptografado, correto,
sem mudança necessária) — então a migração teria que ramificar
comportamento por plataforma no backend.

**Recomendação registrada para quando houver janela de teste
apropriada** (não implementada agora): `auth.controller.ts` passa a
setar o refresh token via `Set-Cookie` (`httpOnly`, `Secure`,
`SameSite=None`) além de devolvê-lo no corpo (mobile continua lendo do
corpo); `token-store.ts` do `web` para de gravar em `localStorage`, o
navegador passa a enviar o cookie automaticamente
(`credentials: "include"`, CORS já configurado com `credentials: true`
em `main.ts`) — testar explicitamente em Safari antes de ir a produção.

## 5. Dados de saúde e localização — verificação adicional

- `Student.necessidadesEspeciais`/`medicamentos` (dado de saúde, LGPD
  art. 11 — categoria sensível) segue a mesma proteção de qualquer
  outro campo de `Student`: RBAC por `responsavelId`/`companyId`/
  `motoristaOuMonitorId` (`findByIdOrThrow`, Dossiê 19), nunca exposto
  fora desse escopo.
- `Vehicle.ultimaLatitude/Longitude` só é gravado durante viagem ativa
  (Dossiê 14, GPS em tempo real) e não é dado de uma pessoa física
  isolada — é a posição do veículo, visível para quem já tem
  visibilidade legítima da rota (responsável do aluno embarcado,
  empresa, motorista).

## 6. Plano de evolução futura

| Gap                                                                                                           | Gatilho para priorizar                                                                                                | Esforço estimado                                                                       |
| ------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| URL assinada por leitura (curta validade) em vez de uma vez no upload                                         | Auditoria de compliance formal (ex. antes de uma certificação LGPD) exigir revogação de acesso a documento específico | Médio — mappers de Drivers/Students viram assíncronos                                  |
| Refresh token em cookie `httpOnly` em vez de `localStorage`                                                   | Antes de qualquer prova de XSS real ser encontrada, ou por exigência de auditoria de segurança externa                | Médio-alto — mudança cross-domain, exige teste manual em Safari/Chrome antes do deploy |
| Criptografia em repouso de CPF/CNPJ (hoje em texto puro no Postgres, protegido só por RLS/acesso à instância) | Se o Postgres deixar de ser um ambiente gerenciado confiável (não é o caso hoje — Neon/Supabase)                      | Alto — exige decisão de key management, reindexação                                    |

## 7. Testes

- `SupabaseStorageService`: 6 testes (3 já existentes de
  `onModuleInit`/`upload` desconfigurado + 3 novos —
  `upload` usa o bucket público, `uploadPrivate` usa o bucket privado e
  nunca chama `getPublicUrl`, `uploadPrivate` propaga erro claro se a
  assinatura falhar).
- `DriversService`, `StudentsService`, `VehiclesService`: mocks
  atualizados para `uploadPrivate` nos uploads de documento/foto de
  aluno — nenhuma asserção de comportamento mudou (o contrato do
  serviço com o resto do sistema é o mesmo, só a implementação interna
  do Storage mudou).
- Suite completa da API: **52 suítes / 491 testes, 100% passando**
  (487→491 — os 4 testes novos de `uploadPrivate`/bucket público).
- `pnpm turbo run typecheck --filter=@rotta/api`: sem erros.
