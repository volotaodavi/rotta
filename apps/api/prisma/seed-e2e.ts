import { PrismaClient } from "@prisma/client";
import * as argon2 from "argon2";

import { CURRENT_PRIVACY_VERSION, CURRENT_TERMS_VERSION } from "../src/modules/auth/legal-versions";
import { DEFAULT_PLAN } from "../src/modules/companies/companies.constants";
import { LEGAL_DOCUMENT_CATALOG } from "../src/modules/legal-documents/legal-documents.catalog";

/**
 * Semeadura dos testes de ponta a ponta.
 *
 * ## Isto NUNCA roda contra produção
 *
 * É a primeira coisa no arquivo porque é a única que não pode falhar:
 * a função abaixo APAGA dados, e um `DATABASE_URL` errado num terminal
 * distraído apagaria a operação de um cliente. A trava não é um aviso
 * no README — é uma recusa, antes de abrir conexão, contra o nome do
 * banco e contra o host.
 *
 * ## Por que um seed próprio, e não o `seed.ts`
 *
 * `seed.ts` semeia CATÁLOGO (planos, documentos legais) e nada mais, de
 * propósito: ele roda em banco de verdade. O que um teste de interface
 * precisa é o contrário — uma transportadora, um dono, um responsável,
 * um ônibus, todos com dados FIXOS e conhecidos, para o teste poder
 * digitar a senha e esperar uma tela específica.
 *
 * ## Dados fixos, não aleatórios
 *
 * Um teste de interface afirma coisas sobre o que está escrito na tela.
 * Com nome aleatório, a afirmação viraria "existe algum texto aqui", que
 * não é afirmação nenhuma. Os CPFs e CNPJ abaixo são números VÁLIDOS
 * pelo dígito verificador (o cadastro recusa inválido) e fictícios.
 */

/** Nome de banco que este seed aceita. Qualquer outro é recusado. */
const NOMES_PERMITIDOS = [/e2e/i, /test/i, /_ci\b/i];

/** Host que este seed aceita. Nada que pareça gerenciado/remoto passa. */
const HOSTS_PERMITIDOS = ["localhost", "127.0.0.1", "::1", "postgres", "db"];

function exigirBancoDeTeste(url: string | undefined): URL {
  if (!url) {
    throw new Error("DATABASE_URL não definida: o seed de E2E não adivinha banco.");
  }

  const alvo = new URL(url);
  const nome = alvo.pathname.replace(/^\//, "");

  if (!NOMES_PERMITIDOS.some((padrao) => padrao.test(nome))) {
    throw new Error(
      `Recusado: o banco "${nome}" não parece de teste. Este seed APAGA dados, e só aceita nome que contenha "e2e", "test" ou "_ci".`,
    );
  }

  if (!HOSTS_PERMITIDOS.includes(alvo.hostname)) {
    throw new Error(
      `Recusado: o host "${alvo.hostname}" não é local. Este seed APAGA dados, e nunca roda contra banco remoto.`,
    );
  }

  return alvo;
}

/**
 * As credenciais que os testes digitam. Exportadas para os testes
 * importarem daqui em vez de repetirem a senha em cada arquivo — senha
 * copiada em sete lugares é senha que fica errada em um deles.
 */
export const CONTAS = {
  empresa: {
    email: "dono.e2e@rotta.test",
    senha: "SenhaForte@123",
    nome: "Dona Empresa E2E",
    cpf: "52998224725",
  },
  responsavel: {
    email: "mae.e2e@rotta.test",
    senha: "SenhaForte@123",
    nome: "Mãe Responsável E2E",
  },
  /**
   * Conta da equipe Rotta, para os testes do painel administrativo.
   *
   * `isAdminRotta` não é setável por nenhuma rota pública — é o único
   * papel sem tenant, e contas assim nascem internamente. Por isso o
   * seed a cria direto, que é o mesmo caminho de
   * `prisma/create-admin.ts`.
   */
  admin: {
    email: "admin.e2e@rotta.test",
    senha: "SenhaForte@123",
    nome: "Admin Rotta E2E",
    cpf: "15350946056",
  },
} as const;

export const EMPRESA = {
  nomeFantasia: "Transportes Teste E2E",
  cnpj: "19131243097692",
  codigoInterno: "TRN-999001",
} as const;

export const VEICULO = {
  /**
   * Placa no padrão Mercosul de verdade (`LLLNLNN`). A primeira versão
   * deste seed usou "E2E1A23", que parecia esperto e é INVÁLIDA: a
   * segunda posição tem de ser letra. O banco aceitou (o seed escreve
   * direto), e o cadastro pela tela recusava com "Placa inválida" —
   * dado impossível no banco faz o teste afirmar coisa errada.
   */
  placa: "RTA1E23",
  numeroFrota: "E2E-01",
} as const;

const prisma = new PrismaClient();

/**
 * Apaga o que ESTE seed cria, e só.
 *
 * Em cascata pelas chaves estrangeiras: apagar a empresa leva
 * `Membership`, `Vehicle` e o resto do tenant. Os usuários são apagados
 * pelo e-mail `@rotta.test`, que é um domínio reservado para teste
 * (RFC 2606) e nunca existe em dado real.
 */
async function limpar(): Promise<void> {
  await prisma.company.deleteMany({ where: { cpfCnpj: EMPRESA.cnpj } });
  await prisma.user.deleteMany({ where: { email: { endsWith: "@rotta.test" } } });
}

/**
 * Registra o aceite dos termos e da privacidade na versão vigente.
 *
 * Sem isto, `GET /auth/me` devolve `pendingConsents` preenchido e a
 * interface pede o reaceite — um modal legítimo, que num teste de fluxo
 * só aparece para atrapalhar. As versões vêm de `legal-versions.ts`, a
 * mesma fonte que a aplicação compara: fixá-las aqui faria o seed
 * envelhecer em silêncio no dia em que os termos mudarem.
 */
async function registrarAceites(userId: string): Promise<void> {
  await prisma.consentRecord.createMany({
    data: [
      { userId, tipo: "TERMOS_DE_USO", versao: CURRENT_TERMS_VERSION },
      { userId, tipo: "POLITICA_PRIVACIDADE", versao: CURRENT_PRIVACY_VERSION },
    ],
  });
}

async function main(): Promise<void> {
  const alvo = exigirBancoDeTeste(process.env.DATABASE_URL);
  console.log(`[seed-e2e] banco de teste: ${alvo.hostname}${alvo.pathname}`);

  // Catálogo primeiro: sem o plano, criar empresa é impossível, e foi
  // exatamente esse o defeito que escapou para produção uma vez
  // ("cadastro de Empresa falha porque o plano STARTER nunca foi
  // inserido").
  const plano = await prisma.plan.upsert({
    where: { code: DEFAULT_PLAN.code },
    update: { name: DEFAULT_PLAN.name, priceCents: DEFAULT_PLAN.priceCents, isActive: true },
    create: { ...DEFAULT_PLAN, isActive: true },
  });

  for (const doc of LEGAL_DOCUMENT_CATALOG) {
    await prisma.legalDocument.upsert({
      where: { slug: doc.slug },
      update: { titulo: doc.titulo },
      create: doc,
    });
  }

  await limpar();

  const senhaEmpresa = await argon2.hash(CONTAS.empresa.senha, { type: argon2.argon2id });
  const senhaResponsavel = await argon2.hash(CONTAS.responsavel.senha, { type: argon2.argon2id });

  const empresa = await prisma.company.create({
    data: {
      codigoInterno: EMPRESA.codigoInterno,
      razaoSocial: "Transportes Teste E2E LTDA",
      nomeFantasia: EMPRESA.nomeFantasia,
      cpfCnpj: EMPRESA.cnpj,
      tipo: "LTDA",
      // As duas habilitações: o menu do painel esconde itens por tag
      // (Marketplace, Mensalidades), e um teste que não vê o item não
      // sabe dizer se a causa foi a tag ou um defeito.
      tags: ["PRIVADA", "LICITADA"],
      email: "contato@rotta.test",
      telefone: "21999990001",
      cep: "01310100",
      endereco: "Avenida Paulista",
      numero: "1000",
      bairro: "Bela Vista",
      cidade: "São Paulo",
      estado: "SP",
      // ATIVA, e não TRIAL: em TRIAL o painel mostra o aviso de
      // assinatura e, vencido o prazo, BLOQUEIA as telas. Um teste de
      // fluxo não pode depender da data de hoje.
      status: "ATIVO",
      planId: plano.id,
    },
  });

  const dona = await prisma.user.create({
    data: {
      nome: CONTAS.empresa.nome,
      email: CONTAS.empresa.email,
      telefone: "21999990002",
      cpf: CONTAS.empresa.cpf,
      passwordHash: senhaEmpresa,
      status: "ATIVO",
      // Identidade APROVADA: desde 16/10/2026 a API recusa iniciar
      // viagem de quem não passou pela verificação, e o painel inteiro
      // fica atrás de uma tela de bloqueio. Sem isto, nenhum teste
      // chega a lugar nenhum.
      identityVerificationStatus: "APROVADA",
      consentimentoLgpdAceitoEm: new Date(),
    },
  });

  await registrarAceites(dona.id);

  await prisma.membership.create({
    data: { userId: dona.id, companyId: empresa.id, role: "empresa", status: "ATIVO" },
  });

  const mae = await prisma.user.create({
    data: {
      nome: CONTAS.responsavel.nome,
      email: CONTAS.responsavel.email,
      telefone: "21999990003",
      passwordHash: senhaResponsavel,
      status: "ATIVO",
      isResponsavel: true,
      consentimentoLgpdAceitoEm: new Date(),
    },
  });
  await registrarAceites(mae.id);

  const admin = await prisma.user.create({
    data: {
      nome: CONTAS.admin.nome,
      email: CONTAS.admin.email,
      telefone: "21999990004",
      cpf: CONTAS.admin.cpf,
      passwordHash: await argon2.hash(CONTAS.admin.senha, { type: argon2.argon2id }),
      status: "ATIVO",
      isAdminRotta: true,
      // `GERAL`: o painel do Admin esconde áreas por sub-papel, e um
      // teste que não vê a tela não sabe dizer se a causa foi o
      // sub-papel ou um defeito.
      adminRottaPapel: "GERAL",
      identityVerificationStatus: "APROVADA",
      consentimentoLgpdAceitoEm: new Date(),
    },
  });
  await registrarAceites(admin.id);

  await prisma.vehicle.create({
    data: {
      companyId: empresa.id,
      placa: VEICULO.placa,
      numeroFrota: VEICULO.numeroFrota,
      modelo: "Sprinter 415",
      marca: "Mercedes-Benz",
      ano: 2022,
      // 16, e não um número redondo qualquer: `VehiclesService` valida
      // a capacidade contra a faixa do tipo (VAN aceita de 8 a 16), e um
      // seed que escreve direto no banco pode criar um veículo que a
      // própria API recusaria — dado impossível, que faz um teste
      // afirmar coisa errada.
      capacidadePassageiros: 16,
      tipo: "VAN",
    },
  });

  console.log(
    `[seed-e2e] pronto: empresa ${EMPRESA.nomeFantasia}, dona ${CONTAS.empresa.email}, responsável ${CONTAS.responsavel.email}, admin ${CONTAS.admin.email}`,
  );
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exitCode = 1;
  });
