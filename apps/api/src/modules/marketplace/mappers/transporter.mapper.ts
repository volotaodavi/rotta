import { computeVerified } from "../verification.util";

import type {
  TransporterCardResponseDto,
  TransporterDetailResponseDto,
} from "../dto/transporter-response.dto";
import type {
  PublicSchoolLink,
  PublicTeamMember,
  TransporterCandidate,
} from "../repositories/transporter.repository";
import type { Rating } from "@prisma/client";

function averageRating(ratings: Pick<Rating, "nota">[]): number | null {
  if (ratings.length === 0) return null;
  const sum = ratings.reduce((acc, r) => acc + r.nota, 0);
  return Math.round((sum / ratings.length) * 10) / 10;
}

export function toTransporterCardResponseDto(
  candidate: TransporterCandidate,
  distanciaKm: number,
): TransporterCardResponseDto {
  const { company } = candidate;
  return {
    id: company.id,
    nomeFantasia: company.nomeFantasia,
    logoUrl: company.logoUrl,
    tipo: company.tipo,
    verificado: computeVerified(company.status, candidate.veiculosAtivos),
    distanciaKm: Math.round(distanciaKm * 10) / 10,
    avaliacaoMedia: averageRating(candidate.ratings),
    totalAvaliacoes: candidate.ratings.length,
    veiculosAtivos: candidate.veiculosAtivos.length,
    tiposVeiculo: [...new Set(candidate.veiculosAtivos.map((v) => v.tipo))],
    categoriasVeiculo: [...new Set(candidate.veiculosAtivos.map((v) => v.categoria))],
    alunosTransportados: candidate.alunosTransportadosIds.length,
    mensalidadeAPartirDeCentavos:
      candidate.mensalidadesAtivasCentavos.length > 0
        ? Math.min(...candidate.mensalidadesAtivasCentavos)
        : null,
  };
}

export function toTransporterDetailResponseDto(
  candidate: TransporterCandidate,
  distanciaKm: number,
  recentRatings: (Rating & { responsavel: { nome: string } })[],
  escolasAtendidas: PublicSchoolLink[],
  equipe: PublicTeamMember[],
  tempoMedioRespostaHoras: number | null,
): TransporterDetailResponseDto {
  const { company } = candidate;
  return {
    ...toTransporterCardResponseDto(candidate, distanciaKm),
    razaoSocial: company.razaoSocial,
    cidade: company.cidade,
    estado: company.estado,
    telefone: company.telefone,
    whatsapp: company.whatsapp,
    fotoUrl: company.fotoUrl,
    avaliacoesRecentes: recentRatings.map((r) => ({
      nota: r.nota,
      comentario: r.comentario,
      responsavelNome: r.responsavel.nome,
      createdAt: r.createdAt,
    })),
    atuandoDesde: company.createdAt,
    escolasAtendidas,
    equipe,
    tempoMedioRespostaHoras,
  };
}
