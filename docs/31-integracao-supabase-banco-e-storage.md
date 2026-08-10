# Dossiê 31 — Integração completa com a Supabase (Banco de Dados + Storage)

> Origem: o usuário reportou que o painel da Supabase mostrava "nenhuma
> atividade" e pediu um diagnóstico do que falta para integrar a
> Supabase ao site, seguido da decisão explícita de consolidar **banco
> de dados + armazenamento de arquivos** na Supabase, "da melhor forma
> possível, sem dar erros".

## 1. Diagnóstico — por que a Supabase mostrava zero atividade

Auditoria do código (não de suposição):

- **Banco de dados**: hoje é Postgres na **Neon** (tarefa de deploy
  "Deploy apps/api + Postgres + Redis — Render + Neon + Upstash"), não a
  Supabase. A Supabase nunca foi usada para dados.
- **Armazenamento**: a ÚNICA coisa que já usava Supabase é
  `SupabaseStorageService` (`apps/api/src/infra/storage/`) — upload de
  logo/foto de empresa, documentos de motorista (CNH/EAR/Cursos),
  documentos de veículo, foto de aluno. Nenhum frontend fala com a
  Supabase diretamente; tudo passa pelo backend.
- **A causa raiz do "zero atividade"**: `SUPABASE_URL`/
  `SUPABASE_SERVICE_ROLE_KEY` são **opcionais no boot** (a aplicação
  sempre subiu normalmente sem elas) e só geram erro **dentro de um
  upload real** — não há nenhum registro (CI, `docker-compose.yml`,
  documentação de deploy) confirmando que essas variáveis foram de fato
  configuradas no ambiente de produção do Render. Ou seja: com alta
  probabilidade, todo upload de arquivo em produção estava falhando
  silenciosamente com `503 Service Unavailable`, e nada nunca chegou a
  bater na Supabase — daí "nenhuma atividade" no painel deles.

## 2. Decisão

Consolidar **banco de dados PostgreSQL + Storage** na mesma Supabase —
superando a divergência que existia entre os Dossiês 08/09 (que
recomendavam Neon/self-managed para o banco e cogitavam AWS S3 para
Storage) e o que estava de fato implementado (só Storage na Supabase,
banco na Neon). A Supabase é, por baixo, o mesmo Postgres — RLS,
PostGIS, particionamento, tudo que a Dossiê 8 exige do banco continua
disponível; a mudança é só de **hospedagem**, não de arquitetura de
dados (nenhuma tabela, RLS, índice, ou regra de negócio muda).

## 3. O que já foi resolvido no código nesta entrega

O código já estava pronto para apontar para _qualquer_ Postgres via
`DATABASE_URL` — a única lacuna real era um detalhe técnico específico
de como a Supabase expõe conexões, mais uma melhoria de observabilidade:

### 3.1 `directUrl` no datasource do Prisma (o gap técnico real)

A Supabase expõe **duas** strings de conexão por projeto:

- **Connection pooling** (PgBouncer, porta `6543`, modo _transaction_) —
  para o tráfego normal da aplicação, suporta muitas conexões
  simultâneas com pouco overhead.
- **Direct connection** (porta `5432`, sem pooler) — exigida pelo
  **Prisma Migrate** (`migrate deploy`/`migrate dev`), porque o
  PgBouncer em modo _transaction_ não suporta os _prepared statements_
  que as migrações do Prisma emitem.

Sem declarar as duas, `prisma migrate deploy` falharia contra a conexão
pooled da Supabase — exatamente o tipo de erro que o pedido "sem dar
erros" está pedindo para evitar. Corrigido: `schema.prisma` agora declara

```prisma
datasource db {
  provider   = "postgresql"
  url        = env("DATABASE_URL")   // pool — runtime normal da app
  directUrl  = env("DIRECT_URL")     // direta — só o Prisma Migrate usa
  extensions = [postgis]
}
```

`DATABASE_URL` continua sendo a única variável que a aplicação em
execução lê (`PrismaService`) — `DIRECT_URL` é usada só pelo CLI do
Prisma. Em todo ambiente sem pooler (dev local, `docker-compose.yml`,
CI), as duas apontam para o mesmo valor — mudança sem efeito ali,
validado (`prisma validate`/`generate` seguem passando, suíte completa
da API 51/51 suítes · 484/484 testes).

### 3.2 Aviso explícito no boot quando o Storage não está configurado

`SupabaseStorageService` agora implementa `OnModuleInit` e loga um
**aviso claro no log de deploy** se `SUPABASE_URL`/
`SUPABASE_SERVICE_ROLE_KEY` estiverem ausentes — em vez de só falhar
silenciosamente dentro do primeiro upload que alguém tentar (exatamente
o mecanismo que escondeu o problema original). Não muda o comportamento
de erro em si (continua `503` claro no upload) — só torna a lacuna
visível imediatamente, sem esperar um usuário tropeçar nela.

### 3.3 `.env.example`, `docker-compose.yml`, CI (`.github/workflows/ci.yml`)

`DIRECT_URL` documentado/propagado em todos os lugares que já
declaravam `DATABASE_URL`, para nenhum ambiente (dev local, Docker,
CI) quebrar com a mudança do datasource.

## 4. O que só pode ser feito pelo painel da Supabase e do Render (fora do alcance deste código)

Esta sessão não tem acesso às suas contas Supabase/Render — os passos
abaixo precisam ser executados por quem tem acesso a esses painéis. São
o "de verdade falta fazer" para a integração passar a existir na
prática:

### 4.1 Banco de dados — migrar Neon → Supabase Postgres

1. **Confirmar/criar o projeto Supabase** e copiar as duas strings de
   conexão (Project Settings → Database → Connection string):
   - _Connection pooling_ (porta `6543`, `?pgbouncer=true`) → vira
     `DATABASE_URL`.
   - _Direct connection_ (porta `5432`) → vira `DIRECT_URL`.
2. **Habilitar a extensão PostGIS** no projeto Supabase (Database →
   Extensions → `postgis` → Enable) — o schema já declara
   `extensions = [postgis]`, mas em alguns planos a extensão precisa
   ser habilitada manualmente antes da primeira migração.
3. **Decidir sobre dados existentes**:
   - Se **não há dado real de produção ainda** (cadastros de teste
     apenas) — pule para o passo 4 direto, sem dump/restore.
   - Se **há dado real** (empresas/usuários cadastrados de verdade) —
     faça `pg_dump` do Neon e `pg_restore` no Supabase **antes** de
     trocar `DATABASE_URL` em produção, com uma janela de manutenção
     (a API respondendo, mas apontando para o Neon, até o restore
     terminar e ser validado). Esse é o passo de maior risco — não
     prossiga sem confirmar qual dos dois cenários se aplica.
4. **Rodar as migrações no banco novo**: com `DIRECT_URL` apontando
   para a Supabase, `pnpm --filter=@rotta/api prisma:migrate:deploy`
   (mesmo comando que a CI já roda) aplica as 20 migrações existentes —
   RLS, índices, PostGIS, tudo — do zero, na ordem certa.
5. **Trocar `DATABASE_URL`/`DIRECT_URL` no Render** (serviço da
   `apps/api`) para os valores da Supabase, e redeployar.
6. **Smoke-test pós-corte**: login, uma leitura simples (ex. listar
   empresas), uma escrita (ex. abrir um chamado de suporte) — confirma
   que RLS/multi-tenant continuam funcionando exatamente como antes
   (é o mesmo motor Postgres, mas vale confirmar).
7. **Não desligue o projeto Neon imediatamente** — mantenha por alguns
   dias como rede de segurança até confirmar estabilidade na Supabase.

### 4.2 Storage — terminar de conectar o que já existe no código

1. Confirmar `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` (Project
   Settings → API) — se o banco também está na Supabase (passo 4.1), é
   o **mesmo projeto**, mesmas credenciais.
2. **Criar o bucket** chamado exatamente `rotta-documents` (ou outro
   nome, setando `SUPABASE_STORAGE_BUCKET` igual) em Storage → New
   bucket, marcado como **público para leitura** — o código usa
   `getPublicUrl()` (URL pública direta), não URL assinada.
3. Configurar as 3 variáveis no Render (mesmo serviço do passo 4.1.5).
4. Redeployar e testar um upload real (ex. logo de empresa) — a partir
   daí, a atividade aparece no painel da Supabase.

## 5. Ordem recomendada de execução

Fazer os dois passos do bloco 4 **na mesma janela de manutenção**, banco
primeiro (4.1), Storage depois (4.2) — assim o serviço só reinicia uma
vez, com todas as variáveis novas de uma vez, em vez de dois deploys
separados que dobram a janela de risco.

## 6. Pontos críticos

1. **O passo de maior risco é a migração de dados reais (4.1.3)** — se
   houver dúvida sobre se existe dado de produção real hoje, confirme
   antes de prosseguir; um `pg_dump`/`pg_restore` malfeito é o único
   jeito de isso "dar erro" de verdade.
2. **`SUPABASE_SERVICE_ROLE_KEY` tem privilégio total** (ignora RLS por
   padrão) — é exatamente o que `SupabaseStorageService` precisa para
   escrever em qualquer prefixo do bucket, mas nunca deve vazar para o
   frontend (nunca foi, nem vai ser — só o backend a conhece).
3. **Bucket público**: qualquer um com a URL de um arquivo consegue
   baixá-lo (sem exigir login) — mesmo modelo de exposição que
   documentos hoje já têm (URLs previsíveis por `path`, ex.
   `companies/{id}/logo.png`); se no futuro isso for um problema de
   compliance (documentos de CNH, por exemplo), a evolução natural é
   trocar `getPublicUrl` por `createSignedUrl` (URL com expiração) —
   não implementado nesta fase por não ter sido pedido.

## 7. Testes

- `SupabaseStorageService`: 3 testes novos (aviso no boot quando
  desconfigurado, silêncio quando configurado, erro claro no upload
  sem credenciais).
- Suite completa da API: **52 suítes / 487 testes, 100% passando**
  (51→52 suítes, 484→487 testes) — nenhuma mudança de comportamento
  para quem já está rodando contra Neon (só passa a exigir `DIRECT_URL`
  resolvível, já propagado em todo ambiente do repositório).
