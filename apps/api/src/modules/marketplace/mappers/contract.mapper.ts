import type { ContractResponseDto } from "../dto/contract-response.dto";
import type { Contract } from "@prisma/client";

export function toContractResponseDto(contract: Contract): ContractResponseDto {
  return {
    id: contract.id,
    transportRequestId: contract.transportRequestId,
    studentId: contract.studentId,
    responsavelId: contract.responsavelId,
    companyId: contract.companyId,
    schoolId: contract.schoolId,
    vehicleId: contract.vehicleId,
    motoristaId: contract.motoristaId,
    monitorId: contract.monitorId,
    valorMensalidadeCentavos: contract.valorMensalidadeCentavos,
    planoDescricao: contract.planoDescricao,
    regras: contract.regras,
    vigenciaInicio: contract.vigenciaInicio,
    vigenciaFim: contract.vigenciaFim,
    status: contract.status,
    authentiqueDocumentId: contract.authentiqueDocumentId,
    assinadoResponsavelEm: contract.assinadoResponsavelEm,
    assinadoEmpresaEm: contract.assinadoEmpresaEm,
    ativadoEm: contract.ativadoEm,
    encerradoEm: contract.encerradoEm,
    createdAt: contract.createdAt,
    updatedAt: contract.updatedAt,
  };
}
