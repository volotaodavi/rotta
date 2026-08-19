import { Injectable } from "@nestjs/common";
import PDFDocument from "pdfkit";

import type { Company, Contract, School, Student, User } from "@prisma/client";

/**
 * Gera o PDF do "termo de ciência" (pedido do usuário: "gera um termo de
 * ciência, como se fosse um contrato, porém... escrito pela Rotta") —
 * documento distinto de `toPdfBuffer` (`common/utils/tabular-export.util.ts`),
 * que serve pra EXPORTAR listas tabulares (Veículos/Escolas), nunca pra
 * um documento de prosa com identidade das partes. Por isso importa
 * `pdfkit` diretamente aqui, sem violar "nunca duplicar código de
 * exportação" — é um tipo de documento diferente, não uma tabela.
 *
 * Nasce do `Contract` `origem: TERMO_CIENCIA_AUTOMATICO` (ver nota do
 * model Prisma) — nunca chamado para um contrato `NEGOCIADO` (esses já
 * seguem pela Authentique, `ContractsController` não expõe esta rota
 * pra eles).
 */
@Injectable()
export class TermoCienciaPdfService {
  /** Rótulo do tipo societário — mesmo texto de `COMPANY_TYPE_LABEL` (`packages/api-client`), duplicado de propósito: a API nunca importa `api-client` (dependência na direção errada). */
  private static readonly TIPO_LABEL: Record<Company["tipo"], string> = {
    AUTONOMO: "Motorista Autônomo",
    MEI: "MEI",
    LTDA: "LTDA",
    SA: "S/A",
    COOPERATIVA: "Cooperativa",
    SOCIEDADE_SIMPLES: "Sociedade Simples",
    OUTRO: "Outro",
  };

  gerar(input: {
    contract: Contract;
    company: Company;
    responsavel: User;
    student: Student;
    school: School;
  }): Promise<Buffer> {
    const { contract, company, responsavel, student, school } = input;

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 56, size: "A4" });
      const chunks: Buffer[] = [];
      doc.on("data", (chunk: Buffer) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      doc.fontSize(9).fillColor("#6B7280").text("ROTTA — plataforma de transporte escolar", {
        align: "center",
      });
      doc.moveDown(0.5);
      doc
        .fontSize(16)
        .fillColor("#111827")
        .text("TERMO DE CIÊNCIA DE CREDENCIAMENTO DE TRANSPORTE ESCOLAR", {
          align: "center",
        });
      doc.moveDown(1.2);

      doc
        .fontSize(10)
        .fillColor("#374151")
        .text(
          `Este termo confirma que o(a) responsável abaixo identificado(a) está ciente do ` +
            `credenciamento do(a) aluno(a) ao transportador identificado abaixo, feito pela ` +
            `plataforma Rotta através do código de credenciamento fornecido pela ` +
            `transportadora. Documento gerado automaticamente em ` +
            `${contract.createdAt.toLocaleDateString("pt-BR")}, referente à solicitação de ` +
            `transporte nº ${contract.transportRequestId}.`,
          { align: "justify" },
        );
      doc.moveDown(1.2);

      this.secao(doc, "Transportadora");
      this.campo(doc, "Razão social", company.razaoSocial);
      this.campo(doc, "Nome fantasia", company.nomeFantasia);
      this.campo(doc, "CPF/CNPJ", company.cpfCnpj);
      this.campo(doc, "Tipo", TermoCienciaPdfService.TIPO_LABEL[company.tipo]);
      doc.moveDown(0.6);

      this.secao(doc, "Responsável");
      this.campo(doc, "Nome", responsavel.nome);
      this.campo(doc, "CPF", responsavel.cpf);
      doc.moveDown(0.6);

      this.secao(doc, "Aluno(a)");
      this.campo(doc, "Nome", student.nome);
      this.campo(doc, "Turno", student.turno);
      doc.moveDown(0.6);

      this.secao(doc, "Escola");
      this.campo(doc, "Nome", school.nomeFantasia ?? school.nomeOficial);
      doc.moveDown(1.2);

      doc
        .fontSize(9)
        .fillColor("#6B7280")
        .text(
          "As condições comerciais completas do transporte (mensalidade, regras de " +
            "prestação do serviço e demais termos) ainda serão definidas pela transportadora " +
            "e formalizadas separadamente. Este documento comprova apenas o credenciamento " +
            "inicial, não substitui o contrato de prestação de serviço.",
          { align: "justify" },
        );
      doc.moveDown(0.8);
      doc.fontSize(8).fillColor("#9CA3AF").text(`Identificador do termo: ${contract.id}`);

      doc.end();
    });
  }

  private secao(doc: PDFKit.PDFDocument, titulo: string): void {
    doc.fontSize(11).fillColor("#111827").text(titulo, { underline: true });
    doc.moveDown(0.3);
  }

  private campo(doc: PDFKit.PDFDocument, rotulo: string, valor: string): void {
    doc.fontSize(10).fillColor("#374151").text(`${rotulo}: ${valor}`);
  }
}
