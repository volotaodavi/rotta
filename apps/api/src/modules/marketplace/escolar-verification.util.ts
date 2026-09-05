import type { DriverDocument, Vehicle } from "@prisma/client";

import { computeSchoolTransportEligibility } from "@/modules/drivers/school-transport-eligibility.util";

type VehicleWithMotoristaDocuments = Vehicle & {
  ultimoMotorista: { documentosMotorista: DriverDocument[] } | null;
};

/**
 * `escolarVerificado` (Dossiê 45 — achado C1 da auditoria de
 * consistência Legal↔Produto): `/legal/motoristas` §5/§6 promete que "um
 * motorista só é apresentado como elegível para a modalidade de
 * transporte escolar quando todos os requisitos aplicáveis (CNH D/E,
 * EAR, curso, antecedentes)... estiverem verificados" — mas até esta
 * correção o Marketplace só olhava `Vehicle.categoria === "ESCOLAR"`
 * (auto-declarada pela empresa, `@default(ESCOLAR)` no schema), sem
 * cruzar com nada disso.
 *
 * `true` somente quando a empresa tem AO MENOS UM veículo ativo
 * declarado `ESCOLAR` cujo motorista atualmente vinculado
 * (`Vehicle.ultimoMotoristaId`) tem `computeSchoolTransportEligibility`
 * (mesmo motor puro do módulo Drivers — nunca duplicado aqui) igual a
 * `"ELIGIBLE"`. Uma empresa pode ter `categoriasVeiculo` incluindo
 * `"ESCOLAR"` (frota declarada) e ainda assim `escolarVerificado: false`
 * (nenhum motorista daquela frota passou pela checagem completa) — os
 * dois campos respondem perguntas diferentes e nenhum dos dois deve ser
 * lido como "seguro para o Responsável contratar sem mais checagem".
 */
export function computeEscolarVerificado(vehicles: VehicleWithMotoristaDocuments[]): boolean {
  return vehicles
    .filter((vehicle) => vehicle.categoria === "ESCOLAR")
    .some((vehicle) => {
      if (!vehicle.ultimoMotorista) return false;
      const resultado = computeSchoolTransportEligibility(
        vehicle.ultimoMotorista.documentosMotorista,
      );
      return resultado.status === "ELIGIBLE";
    });
}
