"use client";

import { CheckCircle2 } from "@rotta/icons";
import { Badge, Card, Typography } from "@rotta/ui/web";

import type { AlertaDoPainel } from "@rotta/api-client";

import {
  NIVEL_DO_ALERTA_BARRA,
  NIVEL_DO_ALERTA_LABEL,
  NIVEL_DO_ALERTA_VARIANT,
  horaDe,
} from "@/features/dispatch/labels";

/**
 * Alertas e ocorrências.
 *
 * Todo item aqui nasce de um fato gravado: sinal que parou de chegar,
 * horário previsto que passou sem viagem, viagem rodando sem monitor
 * designado, ocorrência que alguém registrou. Nenhum é previsão, e
 * nenhum é "provavelmente".
 *
 * O nível vem escrito por extenso ao lado da cor, nunca só pela cor:
 * quem enxerga pouca diferença entre vermelho e laranja continua
 * conseguindo despachar.
 */
export function AlertasDoPainel({ alertas }: { alertas: AlertaDoPainel[] }): JSX.Element {
  return (
    <Card className="flex h-full flex-col">
      <Card.Body className="flex flex-1 flex-col gap-3 p-0">
        <div className="flex items-center justify-between gap-3 px-5 pt-5">
          <Typography variant="subtitle">Alertas e ocorrências</Typography>
          {alertas.length > 0 ? (
            <Typography variant="caption" color="muted">
              {alertas.length}
            </Typography>
          ) : null}
        </div>

        {alertas.length === 0 ? (
          // O estado bom tem que ser visível, e não a ausência de
          // conteúdo: uma lista vazia parece tela que não carregou.
          <div className="flex items-start gap-3 border-t border-border px-5 py-4">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" aria-hidden="true" />
            <div className="flex flex-col">
              <span className="font-semibold text-text">Nada pendente agora</span>
              <span className="text-sm text-text-muted">
                Nenhum carro sem sinal, nenhuma rota atrasada e nenhuma ocorrência registrada hoje.
              </span>
            </div>
          </div>
        ) : (
          <ul className="flex-1 overflow-y-auto border-t border-border">
            {alertas.map((alerta) => (
              <li
                key={alerta.id}
                className="flex gap-3 border-b border-border px-5 py-3.5 last:border-b-0"
              >
                <span
                  aria-hidden="true"
                  className={`w-1 shrink-0 rounded-full ${NIVEL_DO_ALERTA_BARRA[alerta.nivel]}`}
                />
                <div className="flex min-w-0 flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-text">{alerta.titulo}</span>
                    <Badge variant={NIVEL_DO_ALERTA_VARIANT[alerta.nivel]}>
                      {NIVEL_DO_ALERTA_LABEL[alerta.nivel]}
                    </Badge>
                  </div>
                  <span className="text-sm text-text-muted">{alerta.descricao}</span>
                  <span className="text-xs text-text-muted">
                    {horaDe(alerta.em)}
                    {alerta.rotaNome ? ` · ${alerta.rotaNome}` : ""}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card.Body>
    </Card>
  );
}
