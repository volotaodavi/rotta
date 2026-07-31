import { Injectable, type OnModuleDestroy, type OnModuleInit } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

/**
 * Cliente Prisma unico da aplicacao (Dossie 12, Secao 6) — nenhum modulo
 * de negocio instancia o Prisma diretamente; todos injetam este service
 * atraves da interface de repositorio propria do modulo (Repository
 * Pattern, Dossie 12 Secao 6.1).
 *
 * `setTenantContext` implementa a defesa em profundidade do isolamento
 * multi-tenant (Dossie 8, Secao 15.2 e Dossie 12, Secao 6.3): alem da
 * RLS nativa do PostgreSQL (aplicada a cada tabela via policy, definida
 * nas migrations quando o schema real existir), a aplicacao tambem seta
 * explicitamente o `tenant_id` como variavel de sessao do Postgres no
 * inicio de cada requisicao (via `TenantGuard`) — nenhuma query de
 * aplicacao precisa (nem deve) confiar apenas em si mesma para filtrar
 * por tenant.
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
   * Define `app.tenant_id` na sessao de banco corrente, consumido pelas
   * RLS policies (`current_setting('app.tenant_id')`, Dossie 8 Secao 15.2).
   * Chamado pelo `TenantGuard` no inicio de toda requisicao autenticada.
   *
   * Usa `set_config` (nao `SET` cru) especificamente para poder passar
   * `tenantId` como parametro vinculado da query — `SET` nao aceita
   * bind parameters no protocolo do Postgres, e nunca interpolamos valor
   * de usuario diretamente em uma string SQL (Dossie 12, Secao 7.1).
   */
  async setTenantContext(tenantId: string): Promise<void> {
    await this.$executeRaw`SELECT set_config('app.tenant_id', ${tenantId}, false)`;
  }
}
