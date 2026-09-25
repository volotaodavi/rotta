import { ForbiddenException } from "@nestjs/common";
import { ServiceTag } from "@prisma/client";

import { CompanyTagsService } from "../company-tags.service";

import type { PrismaService } from "@/infra/database/prisma.service";

/**
 * Tags de habilitação (25/09/2026: "empresa licitada deverá ter uma
 * tag... toda e qualquer empresa pode ter as duas tags, aí fica com
 * todas as funcionalidades existentes").
 *
 * O que estes testes guardam é a natureza ACUMULATIVA. A tentação de
 * modelar isto como "qual é a vertente desta empresa?" — um valor só —
 * é grande e está errada: ela obrigaria a cadastrar duas vezes a
 * transportadora que atende a prefeitura de manhã e famílias à tarde,
 * com duas frotas e duas equipes para o mesmo carro.
 */
function criarServico(tags: ServiceTag[] | null) {
  const findUnique = jest.fn().mockResolvedValue(tags === null ? null : { tags });
  const prisma = {
    withBypass: jest.fn((op: unknown) => op),
    company: { findUnique },
  } as unknown as PrismaService;
  return { service: new CompanyTagsService(prisma), findUnique };
}

describe("tags de habilitação são acumulativas", () => {
  it("empresa com as DUAS tags tem acesso às duas", async () => {
    // É o caso que um campo de valor único tornaria impossível, e é o
    // caso que o usuário descreveu como normal.
    const { service } = criarServico([ServiceTag.LICITADA, ServiceTag.PRIVADA]);

    await expect(service.temTag("c1", ServiceTag.LICITADA)).resolves.toBe(true);
    await expect(service.temTag("c1", ServiceTag.PRIVADA)).resolves.toBe(true);
    await expect(service.assertTag("c1", ServiceTag.LICITADA, "x")).resolves.toBeUndefined();
    await expect(service.assertTag("c1", ServiceTag.PRIVADA, "y")).resolves.toBeUndefined();
  });

  it("empresa só PRIVADA não enxerga o que é de licitada", async () => {
    const { service } = criarServico([ServiceTag.PRIVADA]);

    await expect(service.temTag("c1", ServiceTag.PRIVADA)).resolves.toBe(true);
    await expect(service.temTag("c1", ServiceTag.LICITADA)).resolves.toBe(false);
    await expect(
      service.assertTag("c1", ServiceTag.LICITADA, "Credenciar município"),
    ).rejects.toThrow(ForbiddenException);
  });

  it("empresa só LICITADA não enxerga o que é de particular", async () => {
    const { service } = criarServico([ServiceTag.LICITADA]);

    await expect(service.temTag("c1", ServiceTag.LICITADA)).resolves.toBe(true);
    await expect(service.temTag("c1", ServiceTag.PRIVADA)).resolves.toBe(false);
  });
});

describe("o bloqueio explica o que fazer", () => {
  it("a mensagem nomeia a ação e a habilitação que falta", async () => {
    // Um "Forbidden" seco faria o gestor abrir chamado achando que é
    // bug. Ele precisa entender que falta uma habilitação e que o
    // Admin da Rotta pode acrescentá-la.
    const { service } = criarServico([ServiceTag.PRIVADA]);

    await expect(
      service.assertTag("c1", ServiceTag.LICITADA, "Credenciar município inteiro"),
    ).rejects.toThrow(/Credenciar município inteiro.*Licitada.*Admin da Rotta/s);
  });
});

describe("os padrões seguros", () => {
  it("empresa inexistente não tem tag nenhuma — na dúvida, não libera", async () => {
    // Quem chama está prestes a decidir se LIBERA algo. Diante de uma
    // empresa que não existe, o padrão seguro é negar.
    const { service } = criarServico(null);

    await expect(service.tags("fantasma")).resolves.toEqual([]);
    await expect(service.temTag("fantasma", ServiceTag.PRIVADA)).resolves.toBe(false);
    await expect(service.assertTag("fantasma", ServiceTag.PRIVADA, "x")).rejects.toThrow(
      ForbiddenException,
    );
  });

  it("lê pelo companyId pedido, nunca pelo tenant ambiente", async () => {
    // `companies` tem RLS pela própria id, e este serviço roda de
    // dentro de listeners sem tenant nenhum. O `where` explícito é o
    // que garante que o bypass não alarga nada.
    const { service, findUnique } = criarServico([ServiceTag.PRIVADA]);

    await service.tags("company-9");

    expect(findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "company-9" } }),
    );
  });
});
