import { ForbiddenException } from "@nestjs/common";
import AdmZip from "adm-zip";

import { SeteService } from "../sete.service";

import type { DadosDaExportacao, SeteRepository } from "../repositories/sete.repository";
import type { AuthenticatedUser } from "@/common/decorators/current-user.decorator";
import type { AuditLogService } from "@/modules/audit/audit-log.service";
import type { CompanyTagsService } from "@/modules/companies/company-tags.service";

import { Role } from "@/shared/enums";

/**
 * A exportação para o SETE.
 *
 * ## O que estes testes guardam
 *
 * O pacote carrega nome, data de nascimento, endereço e telefone de
 * criança. Os três testes que importam aqui não são sobre formato: são
 * sobre QUEM consegue gerar o pacote, de QUAL empresa, e o que NÃO
 * pode estar dentro dele.
 */

const EMPRESA_A = "11111111-1111-1111-1111-111111111111";
const EMPRESA_B = "22222222-2222-2222-2222-222222222222";

function ator(role: Role, tenantId: string | null): AuthenticatedUser {
  return { sub: "user-1", role, tenantId, vinculoId: "v1", bypass: false } as AuthenticatedUser;
}

function dadosVazios(parcial: Partial<DadosDaExportacao> = {}): DadosDaExportacao {
  return {
    rotas: [],
    veiculos: [],
    motoristas: [],
    monitores: [],
    alunos: [],
    ligacoes: {
      rotaPossuiVeiculo: [],
      rotaDirigidaPorMotorista: [],
      rotaAtendidaPorMonitor: [],
      rotaPassaPorEscola: [],
      rotaAtendeAluno: [],
    },
    escolasSemInep: [],
    ...parcial,
  };
}

function alunoDeExemplo(nome: string) {
  return {
    id: `aluno-${nome}`,
    nome,
    dataNascimento: new Date("2016-04-12"),
    sexo: "FEMININO" as const,
    turno: "MANHA" as const,
    tiposDaEscola: ["FUNDAMENTAL" as const],
    embarqueLogradouro: "Rua Pedro Alves",
    embarqueNumero: "45",
    embarqueBairro: "Itaipuaçu",
    embarqueCep: "24901000",
    embarqueLatitude: -22.9655,
    embarqueLongitude: -42.9712,
    nomeDoResponsavel: "Mãe Responsável",
    telefoneDoResponsavel: "21999990003",
    rotaTemAcessoRural: false,
  };
}

describe("SeteService", () => {
  let repository: jest.Mocked<SeteRepository>;
  let companyTagsService: jest.Mocked<CompanyTagsService>;
  let auditLogService: jest.Mocked<AuditLogService>;
  let service: SeteService;

  beforeEach(() => {
    repository = {
      carregarDadosDaExportacao: jest.fn().mockResolvedValue(dadosVazios()),
      municipioDeAtuacao: jest.fn().mockResolvedValue(null),
    };
    companyTagsService = { assertTag: jest.fn().mockResolvedValue(undefined) } as never;
    auditLogService = { record: jest.fn().mockResolvedValue(undefined) } as never;

    service = new SeteService(repository, companyTagsService, auditLogService);
  });

  describe("de qual empresa é a exportação", () => {
    it("Empresa usa o próprio tenant e IGNORA o companyId da URL", async () => {
      // Este é o teste de vazamento. Se o serviço algum dia ler o
      // parâmetro para a Empresa, qualquer gestor baixa o pacote de
      // qualquer transportadora trocando o UUID na barra de endereço —
      // com nome e endereço das crianças de outra cidade dentro.
      await service.montarPacote(ator(Role.EMPRESA, EMPRESA_A), "3302700", EMPRESA_B);

      expect(repository.carregarDadosDaExportacao).toHaveBeenCalledWith(EMPRESA_A);
      expect(repository.carregarDadosDaExportacao).not.toHaveBeenCalledWith(EMPRESA_B);
    });

    it("Gestor idem", async () => {
      await service.montarPacote(ator(Role.GESTOR, EMPRESA_A), "3302700", EMPRESA_B);

      expect(repository.carregarDadosDaExportacao).toHaveBeenCalledWith(EMPRESA_A);
    });

    it("Admin Rotta precisa dizer de qual empresa — não exporta no escuro", async () => {
      await expect(
        service.montarPacote(ator(Role.ADMIN_ROTTA, null), "3302700"),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it("Admin Rotta com companyId exporta daquela empresa", async () => {
      await service.montarPacote(ator(Role.ADMIN_ROTTA, null), "3302700", EMPRESA_B);

      expect(repository.carregarDadosDaExportacao).toHaveBeenCalledWith(EMPRESA_B);
    });

    it("conta sem tenant nenhum não exporta", async () => {
      await expect(
        service.montarPacote(ator(Role.EMPRESA, null), "3302700"),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe("só transportadora LICITADA", () => {
    it("pede a tag antes de ler qualquer dado", async () => {
      await service.montarPacote(ator(Role.EMPRESA, EMPRESA_A), "3302700");

      expect(companyTagsService.assertTag).toHaveBeenCalledWith(
        EMPRESA_A,
        "LICITADA",
        expect.stringContaining("SETE"),
      );
    });

    it("sem a tag, nada é lido do banco", async () => {
      // A ordem importa: a recusa tem de vir ANTES da leitura. Recusar
      // depois já teria carregado nome e endereço de criança na memória
      // de um processo que não podia vê-los.
      companyTagsService.assertTag.mockRejectedValue(new ForbiddenException("sem tag"));

      await expect(
        service.montarPacote(ator(Role.EMPRESA, EMPRESA_A), "3302700"),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(repository.carregarDadosDaExportacao).not.toHaveBeenCalled();
    });
  });

  describe("auditoria", () => {
    it("grava contagem, e nenhum nome", async () => {
      repository.carregarDadosDaExportacao.mockResolvedValue(
        dadosVazios({ alunos: [alunoDeExemplo("Sofia Almeida")] }),
      );

      await service.montarPacote(ator(Role.EMPRESA, EMPRESA_A), "3302700");

      const registro = auditLogService.record.mock.calls[0]![0];
      expect(registro.dadosDepois).toMatchObject({ alunos: 1, codigoIbge: "3302700" });
      expect(JSON.stringify(registro)).not.toContain("Sofia");
    });

    it("falha de auditoria não derruba a exportação", async () => {
      // O que a transportadora precisa entregar à prefeitura não pode
      // depender de o log ter gravado.
      auditLogService.record.mockRejectedValue(new Error("banco fora"));

      await expect(
        service.montarPacote(ator(Role.EMPRESA, EMPRESA_A), "3302700"),
      ).resolves.toBeDefined();
    });
  });

  describe("o zip", () => {
    beforeEach(() => {
      repository.carregarDadosDaExportacao.mockResolvedValue(
        dadosVazios({ alunos: [alunoDeExemplo("Sofia Almeida")] }),
      );
    });

    it("json: um arquivo por entidade, mais o LEIA-ME", async () => {
      const { buffer } = await service.exportarZip(ator(Role.EMPRESA, EMPRESA_A), {
        formato: "json",
        codigoIbge: "3302700",
      });

      const nomes = new AdmZip(buffer)
        .getEntries()
        .map((e) => e.entryName)
        .sort();

      expect(nomes).toEqual([
        "LEIA-ME.txt",
        "alunos.json",
        "ligacoes.json",
        "monitores.json",
        "motoristas.json",
        "rotas.json",
        "veiculos.json",
      ]);
    });

    it("csv: a planilha de alunos com os cabeçalhos que o SETE valida", async () => {
      const { buffer } = await service.exportarZip(ator(Role.EMPRESA, EMPRESA_A), {
        formato: "csv",
        codigoIbge: "3302700",
      });

      const csv = new AdmZip(buffer).getEntry("alunos.csv")!.getData().toString("utf-8");
      const cabecalho = csv.split("\n")[0]!;

      // Os nomes vêm de `ImportacaoModel::validarAlunos`. Um nome
      // diferente faz o SETE recusar a linha dizendo que o campo "está
      // ausente", que é uma mensagem que não aponta para o cabeçalho.
      for (const obrigatorio of ["nome", "data_nascimento", "sexo", "cor", "turno", "nivel"]) {
        expect(cabecalho.split(";")).toContain(obrigatorio);
      }
    });

    it("o nome do arquivo carrega município e data", async () => {
      const { filename } = await service.exportarZip(ator(Role.EMPRESA, EMPRESA_A), {
        formato: "json",
        codigoIbge: "3302700",
      });

      expect(filename).toMatch(/^rotta-sete-3302700-\d{4}-\d{2}-\d{2}\.zip$/);
    });

    it("NENHUM campo sensível no zip inteiro", async () => {
      // A varredura é sobre os bytes de todos os arquivos, não sobre uma
      // lista de chaves: cobre o LEIA-ME, o CSV e os JSONs de uma vez.
      repository.carregarDadosDaExportacao.mockResolvedValue(
        dadosVazios({
          alunos: [
            {
              ...alunoDeExemplo("Sofia Almeida"),
              // Campos que NÃO existem no contrato, empurrados na
              // entrada: se algum `...spread` os copiar, aparecem aqui.
              ...({ necessidadesEspeciais: "cadeirante", medicamentos: "ritalina" } as never),
            },
          ],
        }),
      );

      const { buffer } = await service.exportarZip(ator(Role.EMPRESA, EMPRESA_A), {
        formato: "json",
        codigoIbge: "3302700",
      });

      const tudo = new AdmZip(buffer)
        .getEntries()
        .map((e) => e.getData().toString("utf-8"))
        .join("\n");

      for (const proibido of ["cadeirante", "ritalina", "def_caminhar", "def_mental"]) {
        expect(tudo).not.toContain(proibido);
      }
    });

    it("o LEIA-ME explica o que não foi exportado, e por quê", async () => {
      const { buffer } = await service.exportarZip(ator(Role.EMPRESA, EMPRESA_A), {
        formato: "json",
        codigoIbge: "3302700",
      });

      const leiaMe = new AdmZip(buffer).getEntry("LEIA-ME.txt")!.getData().toString("utf-8");

      expect(leiaMe).toContain("Cor/raça");
      expect(leiaMe).toContain("LGPD");
      expect(leiaMe).toContain("CECATE");
    });
  });

  describe("sugestão do código IBGE", () => {
    it("sugere o código quando conhece o município", async () => {
      repository.municipioDeAtuacao.mockResolvedValue({ cidade: "Maricá", estado: "RJ" });

      await expect(service.sugerirMunicipio(ator(Role.EMPRESA, EMPRESA_A))).resolves.toEqual({
        cidade: "Maricá",
        estado: "RJ",
        codigoIbge: "3302700",
      });
    });

    it("município desconhecido devolve o nome sem o código, nunca um chute", async () => {
      // Sete dígitos inventados ninguém confere, e o pacote iria para o
      // município errado.
      repository.municipioDeAtuacao.mockResolvedValue({ cidade: "Itaboraí", estado: "RJ" });

      await expect(service.sugerirMunicipio(ator(Role.EMPRESA, EMPRESA_A))).resolves.toEqual({
        cidade: "Itaboraí",
        estado: "RJ",
        codigoIbge: null,
      });
    });

    it("sem área de atuação, devolve tudo nulo", async () => {
      await expect(service.sugerirMunicipio(ator(Role.EMPRESA, EMPRESA_A))).resolves.toEqual({
        cidade: null,
        estado: null,
        codigoIbge: null,
      });
    });
  });

  describe("pendências", () => {
    it("veículo sem Renavam, sem origem e de tipo inexistente no SETE vira três itens", async () => {
      repository.carregarDadosDaExportacao.mockResolvedValue(
        dadosVazios({
          veiculos: [
            {
              id: "v1",
              placa: "RTA1E23",
              marca: null,
              modelo: "Civic",
              ano: 2020,
              renavam: null,
              capacidadePassageiros: 4,
              tipo: "SEDAN",
              origemFrota: null,
              quilometragemAtual: 1,
              status: "DISPONIVEL",
            },
          ],
        }),
      );

      const tipos = (await service.listarPendencias(ator(Role.EMPRESA, EMPRESA_A))).map(
        (p) => p.tipo,
      );

      expect(tipos).toContain("VEICULO_SEM_RENAVAM");
      expect(tipos).toContain("VEICULO_SEM_ORIGEM");
      expect(tipos).toContain("VEICULO_TIPO_SEM_EQUIVALENTE");
    });

    it("nenhuma pendência menciona cor ou deficiência", async () => {
      // RN-SETE-10: o que a Rotta decidiu não exportar é decisão, não
      // lacuna. Listá-lo como pendência convidaria alguém a "resolver"
      // coletando dado sensível de criança.
      repository.carregarDadosDaExportacao.mockResolvedValue(
        dadosVazios({ alunos: [alunoDeExemplo("Sofia Almeida")] }),
      );

      const texto = JSON.stringify(await service.listarPendencias(ator(Role.EMPRESA, EMPRESA_A)));

      expect(texto.toLowerCase()).not.toContain("cor");
      expect(texto.toLowerCase()).not.toContain("defici");
    });
  });
});
