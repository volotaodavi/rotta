import { Injectable } from "@nestjs/common";
import { VehicleCategory, VehicleType } from "@prisma/client";

/** Resultado de uma classificação — sempre com `confianca` (0-100) e `motivo` legível, nunca um valor "mágico" sem explicação. */
export interface VehicleCategoryClassification {
  categoria: VehicleCategory;
  /** 0-100. Abaixo do limiar (`CONFIDENCE_THRESHOLD`) o chamador marca `categoriaRevisaoStatus = PENDENTE`. */
  confianca: number;
  motivo: string;
}

/** Confiança mínima pra não pedir revisão humana — abaixo disso, `categoriaRevisaoStatus` vira `PENDENTE` (ver `VehiclesService`). */
export const VEHICLE_CATEGORY_CONFIDENCE_THRESHOLD = 80;

/**
 * Agente de categorização automática de veículo (Frente AL — pedido do
 * usuário: "é muito chato ter que colocar se o carro é fretamento,
 * particular ou escolar... a IA faça a análise e coloque a categoria do
 * veículo automaticamente").
 *
 * Deliberadamente determinístico, sem nenhuma chamada externa (nem
 * provedor de placa, nem LLM) — mesma disciplina de nunca inventar dado
 * já usada em `VehiclePlateLookupService`/`DiditService`: em vez de
 * fingir uma "IA" que na real inventaria confiança do nada, este agente
 * usa o único par de dados real e confiável que a transportadora já
 * preenche no cadastro (nunca depende de terceiro, nunca falha por
 * provedor fora do ar): `tipo` (carroceria) e `capacidadePassageiros`.
 *
 * A regra em si tem base real, não é arbitrária: pelo CTB (Lei 9.503/97,
 * Art. 136), transporte escolar regulamentado só pode ser feito com
 * veículo de carroceria própria pra transporte coletivo (van, micro-
 * ônibus, ônibus) — carro de passeio comum nunca é elegível, mesmo que a
 * empresa quisesse. Isso torna a metade "carro pequeno = nunca escolar"
 * um caso de ALTA confiança de verdade, e a metade "van/ônibus = pode ser
 * escolar OU fretamento avulso" um caso genuinamente ambíguo — o
 * classificador reflete essa ambiguidade real na confiança, em vez de
 * fingir certeza que não existe.
 */
@Injectable()
export class VehicleCategoryClassifierService {
  classify(tipo: VehicleType, capacidadePassageiros: number): VehicleCategoryClassification {
    switch (tipo) {
      case VehicleType.AUTOMOVEL:
      case VehicleType.SEDAN:
      case VehicleType.SUV:
      case VehicleType.MINIVAN:
        return {
          categoria: VehicleCategory.EXECUTIVO,
          confianca: 92,
          motivo:
            `Veículo tipo ${tipo.toLowerCase()} (${capacidadePassageiros} lugares) — pelo CTB (Art. 136), ` +
            "transporte escolar regulamentado exige van/micro-ônibus/ônibus; carro de passeio nunca é elegível, " +
            "então a chance de ser Executivo é alta.",
        };

      case VehicleType.VAN:
      case VehicleType.MICRO_ONIBUS:
      case VehicleType.ONIBUS:
        return {
          categoria: VehicleCategory.ESCOLAR,
          confianca: 65,
          motivo:
            `Veículo tipo ${tipo.toLowerCase()} (${capacidadePassageiros} lugares) é elegível tanto pra ` +
            "transporte escolar quanto pra fretamento avulso — sugestão é Escolar (uso mais comum na Rotta), " +
            "mas a confiança fica abaixo do limiar porque tipo/capacidade sozinhos não distinguem os dois.",
        };

      case VehicleType.OUTRO:
      default:
        return {
          categoria: VehicleCategory.ESCOLAR,
          confianca: 30,
          motivo:
            'Tipo de veículo não identifica carroceria ("Outro") — confiança baixa, sempre revisar.',
        };
    }
  }
}
