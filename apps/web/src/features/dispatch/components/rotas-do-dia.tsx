"use client";

import { Badge, Card, EmptyState, Typography } from "@rotta/ui/web";

import type { RotaDoDia } from "@rotta/api-client";

import {
  SITUACAO_DA_ROTA_LABEL,
  SITUACAO_DA_ROTA_VARIANT,
  janelaDeHorario,
} from "@/features/dispatch/labels";

/**
 * As rotas do dia.
 *
 * A lista parte das ROTAS ATIVAS, não das viagens, e esse é o ponto
 * dela: a rota que não saiu é justamente a que precisa de alguém, e ela
 * não apareceria numa lista de viagens porque viagem nenhuma existe.
 *
 * A ordem também não é alfabética: o que precisa de atenção sobe. Uma
 * lista em ordem de nome obriga o despachante a varrer tudo para achar
 * o problema, e ele está lendo isso com o telefone no ouvido.
 */
export function RotasDoDia({ rotas }: { rotas: RotaDoDia[] }): JSX.Element {
  const ordenadas = [...rotas].sort(
    (a, b) => PRIORIDADE[a.situacao] - PRIORIDADE[b.situacao] || a.nome.localeCompare(b.nome),
  );

  return (
    <Card className="flex h-full flex-col">
      <Card.Body className="flex flex-1 flex-col gap-3 p-0">
        <div className="px-5 pt-5">
          <Typography variant="subtitle">Rotas do dia</Typography>
          <Typography variant="caption" color="muted">
            O que precisa de alguém fica no topo.
          </Typography>
        </div>

        {ordenadas.length === 0 ? (
          <div className="p-5">
            <EmptyState
              title="Nenhuma rota ativa"
              description="Rotas pausadas e arquivadas não entram no painel do dia. Ative a rota em Rotas para ela aparecer aqui."
            />
          </div>
        ) : (
          <ul className="flex-1 overflow-y-auto border-t border-border">
            {ordenadas.map((rota) => (
              <li
                key={rota.rotaId}
                className="flex flex-col gap-1.5 border-b border-border px-5 py-3.5 last:border-b-0"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold text-text">{rota.nome}</span>
                  <Badge variant={SITUACAO_DA_ROTA_VARIANT[rota.situacao]}>
                    {SITUACAO_DA_ROTA_LABEL[rota.situacao]}
                  </Badge>
                </div>

                <span className="text-sm text-text-muted">
                  {janelaDeHorario(rota.horarioPrevistoInicio, rota.horarioPrevistoFim)} ·{" "}
                  {rota.alunos} {rota.alunos === 1 ? "aluno" : "alunos"}
                </span>

                <span className="text-sm text-text-muted">
                  {rota.veiculoIdentificacao ?? "Sem ônibus definido"}
                  {rota.motoristaNome ? ` · ${rota.motoristaNome}` : ""}
                </span>

                {/*
                  O atraso vem escrito em minutos, e não como "atrasada"
                  sozinho: a diferença entre 11 e 50 minutos decide se
                  ele liga para o motorista ou manda outro carro.
                */}
                {rota.minutosDeAtraso !== null ? (
                  <span className="text-sm font-medium text-danger">
                    {rota.minutosDeAtraso} min depois do horário previsto e nenhuma viagem foi
                    aberta.
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Card.Body>
    </Card>
  );
}

/**
 * Em que ordem as rotas aparecem.
 *
 * Atrasada primeiro porque é a única que exige ação agora. Concluída
 * por último porque já acabou: ocupa espaço de leitura e não pede nada.
 */
const PRIORIDADE: Record<RotaDoDia["situacao"], number> = {
  ATRASADA: 0,
  PAUSADA: 1,
  EM_ANDAMENTO: 2,
  NAO_INICIADA: 3,
  CANCELADA: 4,
  CONCLUIDA: 5,
};
