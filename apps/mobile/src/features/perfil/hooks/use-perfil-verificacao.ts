import { useAuth } from "@rotta/auth/native";

import { useMyIdentityVerification } from "@/features/driver/hooks/use-identity-verification";
import { useMyCompany } from "@/features/empresa/hooks/use-empresa-company";
import { useStudentsList } from "@/features/marketplace/hooks/use-students";
import { useMyVehicle, useVehicleDocuments } from "@/features/vehicles/hooks/use-vehicles";

/**
 * Um critério do selo "Perfil verificado". `ok === false` SEMPRE vem
 * com `pendencia` preenchida — o pedido do usuário (15/09/2026) é que,
 * sem o selo, a tela diga o que falta, nunca só esconda o selo.
 */
export interface RequisitoVerificacao {
  id: string;
  label: string;
  ok: boolean;
  /** O que exatamente falta, em linguagem de usuário. Só é mostrado quando `ok` é false. */
  pendencia: string;
}

export interface PerfilVerificacao {
  isLoading: boolean;
  /** Todos os requisitos cumpridos — é isto que liga o check azul. */
  verificado: boolean;
  requisitos: RequisitoVerificacao[];
}

function estaPreenchido(valor: string | null | undefined): boolean {
  return Boolean(valor && valor.trim().length > 0);
}

function venceu(iso: string | null): boolean {
  if (!iso) return false;
  return new Date(iso).getTime() < Date.now();
}

function montar(isLoading: boolean, requisitos: RequisitoVerificacao[]): PerfilVerificacao {
  return {
    isLoading,
    verificado: !isLoading && requisitos.length > 0 && requisitos.every((r) => r.ok),
    requisitos,
  };
}

/**
 * Selo do Responsável.
 *
 * NÃO inclui verificação de identidade de propósito: o backend só
 * aceita o fluxo Didit para Empresa/Gestor/Motorista/Monitor
 * (`SELF_VERIFICATION_ROLES` em `identity-verification.controller.ts`)
 * — chamar `/identity-verification/me` como Responsável toma 403. Um
 * requisito que ninguém consegue cumprir deixaria o selo impossível
 * para este papel, então aqui "verificado" é o que de fato habilita as
 * funcionalidades do app pro Responsável: contato pra receber avisos e
 * os dois endereços do aluno (ida e volta) localizados no mapa.
 */
export function useVerificacaoResponsavel(): PerfilVerificacao {
  const { user } = useAuth();
  const { data: alunos, isLoading } = useStudentsList();

  const items = alunos?.items ?? [];
  const semEnderecoCompleto = items.filter(
    (aluno) =>
      !estaPreenchido(aluno.embarqueLogradouro) ||
      !estaPreenchido(aluno.embarqueNumero) ||
      !estaPreenchido(aluno.desembarqueLogradouro) ||
      !estaPreenchido(aluno.desembarqueNumero),
  );
  const semCoordenada = items.filter(
    (aluno) =>
      aluno.embarqueLatitude === null ||
      aluno.embarqueLongitude === null ||
      aluno.desembarqueLatitude === null ||
      aluno.desembarqueLongitude === null,
  );

  return montar(isLoading, [
    {
      id: "contato",
      label: "Dados de contato",
      ok:
        estaPreenchido(user?.nome) && estaPreenchido(user?.email) && estaPreenchido(user?.telefone),
      pendencia: estaPreenchido(user?.telefone)
        ? "Complete nome e e-mail da conta."
        : "Falta o telefone da conta — é por ele que a transportadora fala com você.",
    },
    {
      id: "alunos",
      label: "Aluno cadastrado",
      ok: items.length > 0,
      pendencia: "Cadastre pelo menos um aluno para usar o transporte.",
    },
    {
      id: "enderecos",
      label: "Endereços de ida e volta",
      ok: items.length > 0 && semEnderecoCompleto.length === 0,
      pendencia:
        items.length === 0
          ? "Cadastre um aluno com endereço de embarque e de desembarque."
          : `Falta completar o endereço de ${semEnderecoCompleto.map((a) => a.nome).join(", ")}.`,
    },
    {
      id: "mapa",
      label: "Endereços localizados no mapa",
      ok: items.length > 0 && semCoordenada.length === 0,
      pendencia:
        items.length === 0
          ? "Cadastre um aluno para que os endereços apareçam no mapa."
          : `Não localizamos no mapa o endereço de ${semCoordenada.map((a) => a.nome).join(", ")}. Confira o CEP e o número.`,
    },
  ]);
}

/**
 * Selo do Motorista/Monitor (e do dono autônomo/MEI em Modo Ação, que
 * usa este mesmo Perfil) — critério escolhido pelo usuário:
 * "Identidade + documentos válidos".
 *
 * "Documentos válidos" são os documentos do VEÍCULO (CRLV, seguro,
 * laudo…), que é o que existe no produto — e são avaliados pelos dois
 * lados que já existem no banco: o vencimento informado no upload e a
 * análise da Rotta AI (legibilidade, qualidade e suspeita de
 * adulteração).
 */
export function useVerificacaoMotorista(): PerfilVerificacao {
  const { data: identidade, isLoading: carregandoIdentidade } = useMyIdentityVerification();
  const { data: veiculo, isLoading: carregandoVeiculo } = useMyVehicle();
  const { data: documentos, isLoading: carregandoDocumentos } = useVehicleDocuments(veiculo?.id);

  const lista = documentos ?? [];
  const vencidos = lista.filter((documento) => venceu(documento.vencimentoEm));
  const reprovados = lista.filter(
    (documento) =>
      documento.rottaAiStatus === "REPROVADO" ||
      documento.rottaAiSuspeitaAdulteracao === true ||
      documento.rottaAiLegivel === false ||
      documento.rottaAiQualidadeOk === false,
  );

  return montar(carregandoIdentidade || carregandoVeiculo || carregandoDocumentos, [
    {
      id: "identidade",
      label: "Identidade verificada",
      ok: identidade?.status === "APROVADA",
      pendencia:
        identidade?.status === "REPROVADA"
          ? (identidade.motivo ??
            "Sua verificação de identidade foi recusada. Refaça em Verificar identidade.")
          : identidade?.status === "EM_ANALISE" || identidade?.status === "EM_ANDAMENTO"
            ? "Sua verificação de identidade ainda está em análise."
            : "Conclua a verificação de identidade em Verificar identidade.",
    },
    {
      id: "veiculo",
      label: "Veículo vinculado",
      ok: Boolean(veiculo),
      pendencia: "Nenhum veículo vinculado a você — a transportadora faz esse vínculo.",
    },
    {
      id: "documentos-em-dia",
      label: "Documentos do veículo em dia",
      ok: Boolean(veiculo) && lista.length > 0 && vencidos.length === 0,
      pendencia:
        lista.length === 0
          ? "Nenhum documento do veículo enviado ainda."
          : `Documento vencido: ${vencidos.map((documento) => documento.nomeOriginal).join(", ")}.`,
    },
    {
      id: "documentos-validados",
      label: "Documentos validados pela Rotta AI",
      ok: lista.length > 0 && reprovados.length === 0,
      pendencia:
        lista.length === 0
          ? "Sem documento enviado, não há o que validar."
          : `A Rotta AI apontou problema em: ${reprovados.map((documento) => documento.nomeOriginal).join(", ")}.`,
    },
  ]);
}

/**
 * Selo da Empresa/Gestor — "identidade + assinatura em dia", com os
 * dados cadastrais da empresa no meio (é o que a Rotta usa pra emitir
 * cobrança e pra o Responsável encontrar a transportadora).
 */
export function useVerificacaoEmpresa(): PerfilVerificacao {
  const { user } = useAuth();
  const { data: identidade, isLoading: carregandoIdentidade } = useMyIdentityVerification();
  const { data: empresa, isLoading: carregandoEmpresa } = useMyCompany(user?.companyId);

  const assinaturaEmDia =
    empresa?.status === "ATIVO" || (empresa?.status === "TRIAL" && !venceu(empresa.trialExpiraEm));

  return montar(carregandoIdentidade || carregandoEmpresa, [
    {
      id: "identidade",
      label: "Identidade verificada",
      ok: identidade?.status === "APROVADA",
      pendencia:
        identidade?.status === "REPROVADA"
          ? (identidade.motivo ?? "Sua verificação de identidade foi recusada.")
          : identidade?.status === "EM_ANALISE" || identidade?.status === "EM_ANDAMENTO"
            ? "Sua verificação de identidade ainda está em análise."
            : "Conclua a verificação de identidade da conta.",
    },
    {
      id: "empresa",
      label: "Dados da transportadora",
      ok: Boolean(empresa && estaPreenchido(empresa.cpfCnpj) && estaPreenchido(empresa.endereco)),
      pendencia: "Complete CNPJ e endereço da transportadora no Painel Web.",
    },
    {
      id: "assinatura",
      label: "Assinatura em dia",
      ok: Boolean(assinaturaEmDia),
      pendencia:
        empresa?.status === "TRIAL"
          ? "Seu período de teste terminou. Ative a assinatura para continuar."
          : "Regularize a assinatura da Rotta em Assinatura.",
    },
  ]);
}
