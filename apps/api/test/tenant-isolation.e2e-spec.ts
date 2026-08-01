import { randomUUID } from "node:crypto";

import { PrismaService } from "@/infra/database/prisma.service";
import { tenantContextStorage } from "@/infra/database/tenant-context";

/**
 * Teste de integração contra o Postgres real (nunca mockado) — prova a
 * propriedade mais crítica exigida pelo briefing do módulo de Empresas:
 * "nenhuma consulta pode retornar dados de outro tenant", inclusive sob
 * concorrência real.
 *
 * Reproduz, como teste permanente, o mesmo cenário que originalmente
 * expôs um vazamento de dados entre tenants durante o desenvolvimento
 * deste módulo (`withTenant` com `set_config` avulso fora de uma
 * transação — corrigido; ver a nota de implementação em
 * `prisma.service.ts`). Roda contra `DATABASE_URL` do ambiente atual
 * (dev local ou `rotta_test` em CI).
 */
describe("PrismaService.withTenant — isolamento multi-tenant sob concorrência (integration)", () => {
  let prisma: PrismaService;
  let planId: string;
  let companyAId: string;
  let companyBId: string;

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.onModuleInit();

    await tenantContextStorage.run({ tenantId: null, bypass: true }, async () => {
      const plan = await prisma.withTenant(
        prisma.plan.upsert({
          where: { code: "STARTER" },
          update: {},
          create: { code: "STARTER", name: "Starter", priceCents: 3990 },
        }),
      );
      planId = plan.id;

      const companyA = await prisma.withTenant(
        prisma.company.create({
          data: {
            razaoSocial: "A",
            nomeFantasia: "A",
            cpfCnpj: randomUUID().replace(/\D/g, "").slice(0, 14),
            tipo: "LTDA",
            email: "a@a.com",
            telefone: "11999999999",
            cep: "01000000",
            endereco: "Rua A",
            numero: "1",
            bairro: "Centro",
            cidade: "SP",
            estado: "SP",
            planId,
          },
        }),
      );
      companyAId = companyA.id;

      const companyB = await prisma.withTenant(
        prisma.company.create({
          data: {
            razaoSocial: "B",
            nomeFantasia: "B",
            cpfCnpj: randomUUID().replace(/\D/g, "").slice(0, 14),
            tipo: "LTDA",
            email: "b@b.com",
            telefone: "11888888888",
            cep: "02000000",
            endereco: "Rua B",
            numero: "2",
            bairro: "Centro",
            cidade: "SP",
            estado: "SP",
            planId,
          },
        }),
      );
      companyBId = companyB.id;
    });
  });

  afterAll(async () => {
    await tenantContextStorage.run({ tenantId: null, bypass: true }, () =>
      prisma.withTenant(
        prisma.company.deleteMany({ where: { id: { in: [companyAId, companyBId] } } }),
      ),
    );
    await prisma.onModuleDestroy();
  });

  it("nunca vê a linha de outro tenant, mesmo sob acesso concorrente ao mesmo pool de conexões", async () => {
    async function readAsTenant(tenantId: string) {
      return tenantContextStorage.run({ tenantId, bypass: false }, async () => {
        // Força uma volta ao event loop antes da query — o cenário
        // exato em que o bug original vazava dados (interleaving de
        // outra "requisição" entre o set_config e a query real).
        await new Promise((resolve) => setImmediate(resolve));
        return prisma.withTenant(prisma.company.findMany());
      });
    }

    const results = await Promise.all([
      readAsTenant(companyAId),
      readAsTenant(companyBId),
      readAsTenant(companyAId),
      readAsTenant(companyBId),
      readAsTenant(companyAId),
      readAsTenant(companyBId),
    ]);

    results.forEach((rows, index) => {
      const expectedTenantId = index % 2 === 0 ? companyAId : companyBId;
      expect(rows).toHaveLength(1);
      expect(rows[0].id).toBe(expectedTenantId);
    });
  });

  it("bypass_rls enxerga todos os tenants; contexto normal nunca enxerga nenhum sem tenantId", async () => {
    const allCompanies = await tenantContextStorage.run({ tenantId: null, bypass: true }, () =>
      prisma.withTenant(
        prisma.company.findMany({ where: { id: { in: [companyAId, companyBId] } } }),
      ),
    );
    expect(allCompanies).toHaveLength(2);

    const noContext = await prisma.withTenant(
      prisma.company.findMany({ where: { id: companyAId } }),
    );
    expect(noContext).toHaveLength(0);
  });

  it("uma escrita sem contexto de tenant válido é rejeitada pela RLS (WITH CHECK)", async () => {
    await expect(
      tenantContextStorage.run({ tenantId: randomUUID(), bypass: false }, () =>
        prisma.withTenant(
          prisma.company.create({
            data: {
              razaoSocial: "C",
              nomeFantasia: "C",
              cpfCnpj: randomUUID().replace(/\D/g, "").slice(0, 14),
              tipo: "LTDA",
              email: "c@c.com",
              telefone: "11977777777",
              cep: "03000000",
              endereco: "Rua C",
              numero: "3",
              bairro: "Centro",
              cidade: "SP",
              estado: "SP",
              planId,
            },
          }),
        ),
      ),
    ).rejects.toThrow();
  });
});
