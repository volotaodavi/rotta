"use client";

import { Badge, Card, EmptyState, Typography, buttonVariants } from "@rotta/ui/web";
import Link from "next/link";

import type { LinhaDaEscalaDoDia } from "@rotta/api-client";

import { SITUACAO_DA_ROTA_LABEL, SITUACAO_DA_ROTA_VARIANT } from "@/features/dispatch/labels";

/**
 * A escala do dia, como ela foi publicada.
 *
 * É LEITURA. Quem monta a escala continua em `/despachante/escala`, e
 * o botão daqui leva para lá. Editar escala no meio de um painel que
 * recarrega sozinho a cada quinze segundos é um jeito conhecido de
 * perder o que se estava digitando.
 *
 * Monitor sem nome vem escrito como ausência explícita, e não como
 * campo em branco: no transporte escolar a falta de monitor é uma
 * decisão de operação, não um detalhe de cadastro.
 */
export function EscalaDoDiaResumida({ escala }: { escala: LinhaDaEscalaDoDia[] }): JSX.Element {
  return (
    <Card className="flex h-full flex-col">
      <Card.Body className="flex flex-1 flex-col gap-3 p-0">
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-5">
          <div>
            <Typography variant="subtitle">Escala de hoje</Typography>
            <Typography variant="caption" color="muted">
              Quem está em cada rota, segundo o que foi publicado.
            </Typography>
          </div>
          <Link
            href="/despachante/escala"
            className={buttonVariants({ variant: "secondary", size: "sm" })}
          >
            Montar escala
          </Link>
        </div>

        {escala.length === 0 ? (
          <div className="p-5">
            <EmptyState
              title="Nenhuma escala publicada para hoje"
              description="Sem escala, cada rota sai com o ônibus e o motorista padrão dela. A escala existe para o dia que foge do padrão."
            />
          </div>
        ) : (
          <div className="flex-1 overflow-x-auto border-t border-border">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface-elevated">
                <tr className="text-xs uppercase tracking-wide text-text-muted">
                  <th scope="col" className="px-5 py-2.5 font-semibold">
                    Rota
                  </th>
                  <th scope="col" className="px-5 py-2.5 font-semibold">
                    Ônibus
                  </th>
                  <th scope="col" className="px-5 py-2.5 font-semibold">
                    Motorista
                  </th>
                  <th scope="col" className="px-5 py-2.5 font-semibold">
                    Monitor
                  </th>
                  <th scope="col" className="px-5 py-2.5 font-semibold">
                    Situação
                  </th>
                </tr>
              </thead>
              <tbody>
                {escala.map((linha) => (
                  <tr key={linha.rotaId} className="border-t border-border">
                    <td className="px-5 py-3 font-medium text-text">{linha.rotaNome}</td>
                    <td className="px-5 py-3 text-text-muted">{linha.veiculoIdentificacao}</td>
                    <td className="px-5 py-3 text-text-muted">{linha.motoristaNome}</td>
                    <td className="px-5 py-3 text-text-muted">
                      {linha.monitorNome ?? <span className="text-warning">Nenhum designado</span>}
                    </td>
                    <td className="px-5 py-3">
                      <Badge variant={SITUACAO_DA_ROTA_VARIANT[linha.situacao]}>
                        {SITUACAO_DA_ROTA_LABEL[linha.situacao]}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card.Body>
    </Card>
  );
}
