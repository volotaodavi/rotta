import { Injectable, type OnModuleDestroy, type OnModuleInit } from "@nestjs/common";
import { Prisma, PrismaClient } from "@prisma/client";

import { tenantContextStorage, type TenantContext } from "./tenant-context";

/**
 * Cliente Prisma unico da aplicacao (Dossie 12, Secao 6) — nenhum modulo
 * de negocio instancia o Prisma diretamente; todos injetam este service
 * atraves da interface de repositorio propria do modulo (Repository
 * Pattern, Dossie 12 Secao 6.1).
 *
 * ## Nota de implementacao critica: `withTenant` (defesa em profundidade do
 * isolamento multi-tenant, Dossie 8 Secao 15.2)
 *
 * A primeira versao deste service setava `app.tenant_id` com um
 * `$executeRaw` avulso (chamado uma vez pelo `TenantGuard`) e confiava que
 * as queries seguintes, no mesmo `await` chain, veriam o mesmo valor.
 * **Isso foi verificado como incorreto e removido**: o Prisma Client mantem
 * um *pool* de conexoes, e nao ha garantia de que duas chamadas sequenciais
 * (`set_config` e, depois, `company.findMany()`) peguem a MESMA conexao
 * fisica do pool sob concorrencia — um teste de carga simples
 * (5 requisicoes simuladas concorrentes, cada uma setando seu proprio
 * tenant e consultando em seguida) reproduziu vazamento de dados entre
 * tenants em 4 de 5 casos.
 *
 * A correcao: `withTenant` agrupa o `set_config` (com `is_local = true`,
 * escopo de transacao, nunca de sessao/conexao) e a operacao real em um
 * **unico** `$transaction([...])` — a API de transacao em lote do Prisma
 * garante que todos os itens do array rodam sequencialmente na mesma
 * conexao reservada, then a devolve ao pool já com a variavel de sessao
 * revertida (`is_local`). Nenhum repositorio deste modulo (ou de qualquer
 * modulo futuro) executa uma query em tabela com RLS fora de
 * `withTenant`.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }

  /**
   * Executa `operation` (uma `Prisma.PrismaPromise` NAO aguardada antes de
   * chamar este metodo, ex. `this.prisma.company.findMany({...})` sem
   * `await`) dentro do contexto de tenant da requisicao corrente,
   * resolvido do `AsyncLocalStorage` populado pelo `TenantGuard`.
   *
   * Fora de uma requisicao HTTP (ex. um script/seed) o contexto e
   * ausente — trata-se como `{ tenantId: null, bypass: false }`, o que
   * bloqueia (nunca libera por omissao) qualquer leitura/escrita em
   * tabela com RLS, forcando todo caminho de codigo a passar
   * explicitamente por um contexto de tenant ou bypass conhecido.
   */
  async withTenant<T>(operation: Prisma.PrismaPromise<T>): Promise<T> {
    const context: TenantContext = tenantContextStorage.getStore() ?? {
      tenantId: null,
      bypass: false,
    };

    const [, , result] = await this.$transaction([
      this.$executeRaw`SELECT set_config('app.tenant_id', ${context.tenantId ?? ""}, true)`,
      this.$executeRaw`SELECT set_config('app.bypass_rls', ${context.bypass ? "on" : "off"}, true)`,
      operation,
    ]);

    return result;
  }

  /**
   * Variante de leitura/escrita única (não transacional) de
   * `runInBypassTransaction` — para o mesmo caso de uso legítimo
   * ("o próprio usuário consultando seu próprio recurso, através de
   * tenants diferentes"), quando uma única operação basta e não há
   * necessidade de atomicidade multi-tabela. Uso hoje: `AuthService`
   * resolvendo, no login, todos os `Membership` ativos do usuário
   * autenticado ANTES de qualquer tenant ser conhecido — a RLS de
   * `memberships` é por `companyId`, mas aqui a pergunta legítima é
   * "em quais empresas EU (usuário já autenticado por senha) tenho
   * vínculo", não uma consulta cross-tenant arbitrária de terceiros.
   */
  async withBypass<T>(operation: Prisma.PrismaPromise<T>): Promise<T> {
    const [, , result] = await this.$transaction([
      this.$executeRaw`SELECT set_config('app.tenant_id', '', true)`,
      this.$executeRaw`SELECT set_config('app.bypass_rls', 'on', true)`,
      operation,
    ]);

    return result;
  }

  /**
   * Para operações de negócio que precisam ser atômicas através de
   * **múltiplos** repositórios (ex. Dossiê 16 — criar `Company` +
   * `User` administrador + `Membership` como uma única unidade: se
   * qualquer uma falhar, nenhuma persiste). Abre uma transação
   * interativa do Prisma, seta o contexto de tenant uma única vez
   * dentro dela (`is_local = true` continua seguro — a transação inteira
   * roda em uma única conexão) e repassa o client transacional (`tx`)
   * para `fn`; cada repositório chamado dentro de `fn` deve usar esse
   * `tx` diretamente (nunca `this.prisma`/`withTenant` aninhado, o que
   * abriria uma segunda transação por cima da primeira).
   */
  async runInTenantTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    const context: TenantContext = tenantContextStorage.getStore() ?? {
      tenantId: null,
      bypass: false,
    };

    return this.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.tenant_id', ${context.tenantId ?? ""}, true)`;
      await tx.$executeRaw`SELECT set_config('app.bypass_rls', ${context.bypass ? "on" : "off"}, true)`;
      return fn(tx);
    });
  }

  /**
   * Bypass explícito de RLS fora do fluxo normal (Guard→Interceptor
   * resolvendo `tenantId` do JWT), reservado a rotas `@Public()` que
   * legitimamente precisam ler/escrever uma tabela com tenant isolation
   * antes de qualquer tenant/usuário estar autenticado — hoje, apenas o
   * resgate de convite (`AUTH-01-A1`/Dossiê 15): o candidato ainda não
   * tem sessão, mas precisa que o servidor resolva `Invite.companyId` a
   * partir de um código único e crie o `Membership` correspondente.
   *
   * Isto é seguro pelo mesmo motivo que o bypass do Admin Rotta é seguro
   * (`TenantGuard`): a etapa anterior a esta chamada sempre resolveu e
   * validou explicitamente QUAL `companyId` é permitido (nunca lido de
   * parâmetro não verificado do cliente) — o bypass aqui não é "qualquer
   * tenant pode ver os dados de qualquer outro", é "o código, um valor
   * não-adivinhável de posse do candidato, já provou a que tenant esta
   * operação pertence". Nenhum outro caminho de código deste service usa
   * este método — usar aqui fora do fluxo de convites é um bug de
   * segurança, não uma conveniência.
   */
  async runInBypassTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return this.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.tenant_id', '', true)`;
      await tx.$executeRaw`SELECT set_config('app.bypass_rls', 'on', true)`;
      return fn(tx);
    });
  }

  /**
   * Executa `fn` dentro de um `TenantContext` explícito no
   * `AsyncLocalStorage`, para código que chama um service de OUTRO
   * módulo que já sabe abrir sua própria transação via
   * `runInTenantTransaction` (ex. `AuthService.register` chamando
   * `CompaniesService.create` diretamente, fora de qualquer requisição
   * autenticada — Dossiê 15 `AUTH-01`, cadastro self-service: não existe
   * JWT/tenant ainda para o `TenantGuard` resolver, mas a operação é
   * exatamente a mesma "criar Company+User+Membership" que o Admin Rotta
   * já executa autenticado). Mesmo mecanismo comprovado do
   * `TenantContextInterceptor` (`AsyncLocalStorage.run` com a
   * subscrição/chamada real acontecendo dentro do callback síncrono).
   */
  runWithTenantContext<T>(context: TenantContext, fn: () => Promise<T>): Promise<T> {
    return tenantContextStorage.run(context, fn);
  }
}
