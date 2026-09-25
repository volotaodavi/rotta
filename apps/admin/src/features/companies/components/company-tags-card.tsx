"use client";

import { SERVICE_TAG_DESCRICAO, SERVICE_TAG_LABEL } from "@rotta/api-client";
import { Badge, Button, Card, Checkbox, Typography, useToast } from "@rotta/ui/web";
import { useState } from "react";

import type { ServiceTag } from "@rotta/api-client";

import { useDefinirTags } from "@/features/companies/hooks/use-companies";

const TODAS: ServiceTag[] = ["LICITADA", "PRIVADA"];

/**
 * Habilitações da transportadora — quais funcionalidades ela enxerga
 * (pedido do usuário 25/09/2026: "empresa licitada deverá ter uma tag,
 * para ter as funcionalidades que somente a empresa licitada deve ter...
 * toda e qualquer empresa pode ter as duas tags, aí fica com todas as
 * funcionalidades existentes").
 *
 * ## Caixinhas, não um seletor
 *
 * A forma do controle É a regra. Um `select` com "Licitada / Particular"
 * comunicaria que são excludentes, e obrigaria a inventar uma terceira
 * opção "Ambas" — que é o mesmo erro por outro caminho. Duas caixinhas
 * independentes dizem sozinhas o que o modelo permite: marcar as duas é
 * um caso normal, não uma exceção.
 *
 * ## Por que exige ao menos uma
 *
 * Empresa sem habilitação nenhuma não enxergaria funcionalidade alguma.
 * Para tirar uma empresa do ar existe o status (suspender), que é o
 * campo certo e tem aviso próprio ao cliente.
 */
export function CompanyTagsCard({
  companyId,
  atuais,
}: {
  companyId: string;
  atuais: ServiceTag[];
}): JSX.Element {
  const toast = useToast();
  const definir = useDefinirTags(companyId);
  const [selecionadas, setSelecionadas] = useState<ServiceTag[]>(atuais);

  const mudou =
    selecionadas.length !== atuais.length || selecionadas.some((tag) => !atuais.includes(tag));
  const vazia = selecionadas.length === 0;

  function alternar(tag: ServiceTag): void {
    setSelecionadas((anteriores) =>
      anteriores.includes(tag) ? anteriores.filter((atual) => atual !== tag) : [...anteriores, tag],
    );
  }

  return (
    <Card>
      <Card.Header title="Habilitações" />
      <Card.Body className="flex flex-col gap-4">
        <Typography variant="bodySmall" color="muted">
          O que esta transportadora enxerga na plataforma. São acumulativas — com as duas, ela tem
          acesso a todas as funcionalidades.
        </Typography>

        <div className="flex flex-wrap gap-2">
          {atuais.map((tag) => (
            <Badge key={tag} variant={tag === "LICITADA" ? "info" : "neutral"}>
              {SERVICE_TAG_LABEL[tag]}
            </Badge>
          ))}
        </div>

        <div className="flex flex-col gap-3">
          {TODAS.map((tag) => (
            <label key={tag} htmlFor={`tag-${tag}`} className="flex items-start gap-3">
              {/* `htmlFor`/`id` em vez de só aninhar o input: a descrição
                  longa ao lado também vira área de clique, e o leitor de
                  tela anuncia o rótulo junto da caixinha. */}
              <Checkbox
                id={`tag-${tag}`}
                checked={selecionadas.includes(tag)}
                onChange={() => alternar(tag)}
              />
              <span className="flex flex-col">
                <span className="font-medium text-text">{SERVICE_TAG_LABEL[tag]}</span>
                <span className="text-xs text-text-muted">{SERVICE_TAG_DESCRICAO[tag]}</span>
              </span>
            </label>
          ))}
        </div>

        {vazia && (
          <Typography variant="bodySmall" color="danger">
            Marque ao menos uma. Sem habilitação, a transportadora não enxerga nada — para tirá-la
            do ar, suspenda a empresa.
          </Typography>
        )}

        <div>
          <Button
            variant="primary"
            disabled={!mudou || vazia || definir.isPending}
            onClick={() =>
              definir.mutate(selecionadas, {
                onSuccess: (empresa) =>
                  toast.success(
                    `${empresa.nomeFantasia}: ${empresa.tags
                      .map((tag) => SERVICE_TAG_LABEL[tag])
                      .join(" + ")}.`,
                  ),
              })
            }
          >
            {definir.isPending ? "Salvando…" : "Salvar habilitações"}
          </Button>
        </div>
      </Card.Body>
    </Card>
  );
}
