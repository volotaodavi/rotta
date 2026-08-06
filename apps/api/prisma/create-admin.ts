import { PrismaClient } from "@prisma/client";
import * as argon2 from "argon2";

/**
 * Provisiona (ou atualiza a senha de) uma conta Admin Rotta diretamente
 * no banco — a ÚNICA forma de criar esse papel (Dossiê 8, Seção 2:
 * "único papel sem tenantId, funcionário da Rotta, contas criadas
 * internamente pela equipe, nunca por self-service"; ver o comentário
 * em `isAdminRotta` no `schema.prisma`). Nenhuma rota HTTP pública cria
 * esse papel de propósito — este script existe exatamente para
 * preencher essa lacuna, rodado manualmente por quem já tem acesso a
 * `DATABASE_URL` do ambiente-alvo. Nenhuma credencial real vive neste
 * arquivo nem em nenhum outro do repositório — tudo vem de variáveis de
 * ambiente lidas em tempo de execução.
 *
 * Uso (a partir de `apps/api`, com `DATABASE_URL` já apontando pro
 * ambiente certo — local ou produção):
 *
 *   ADMIN_EMAIL="admin@exemplo.com" ADMIN_SENHA="SenhaForte123$" \
 *     pnpm exec ts-node --transpile-only prisma/create-admin.ts
 *
 * Idempotente: reexecutar com o mesmo ADMIN_EMAIL só atualiza nome/senha
 * da conta existente (upsert por email), nunca duplica.
 */
async function main(): Promise<void> {
  const email = process.env.ADMIN_EMAIL;
  const senha = process.env.ADMIN_SENHA;
  const nome = process.env.ADMIN_NOME ?? "Administrador Rotta";
  // telefone/cpf são @unique e obrigatórios no schema, mas Admin Rotta
  // não passa pelas validações de CPF/telefone real do cadastro
  // self-service (essa conta nunca nasce por lá) — sem valor explícito,
  // gera um placeholder derivado do horário só pra satisfazer a
  // constraint de unicidade, nunca um documento real.
  const telefone = process.env.ADMIN_TELEFONE ?? `0000${Date.now().toString().slice(-7)}`;
  const cpf = process.env.ADMIN_CPF ?? `000${Date.now().toString().slice(-8)}`;

  if (!email || !senha) {
    console.error(
      "Defina ADMIN_EMAIL e ADMIN_SENHA (variáveis de ambiente) antes de rodar este script.",
    );
    process.exit(1);
  }
  if (senha.length < 8) {
    console.error("ADMIN_SENHA precisa ter pelo menos 8 caracteres.");
    process.exit(1);
  }

  const prisma = new PrismaClient();
  try {
    const passwordHash = await argon2.hash(senha, { type: argon2.argon2id });

    const user = await prisma.user.upsert({
      where: { email },
      update: { passwordHash, isAdminRotta: true, status: "ATIVO", nome },
      create: {
        nome,
        email,
        telefone,
        cpf,
        passwordHash,
        isAdminRotta: true,
        status: "ATIVO",
      },
    });

    // eslint-disable-next-line no-console -- confirmação de sucesso do script CLI, nunca dado sensível.
    console.log(`Admin Rotta pronto: ${user.email} (id ${user.id}).`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
