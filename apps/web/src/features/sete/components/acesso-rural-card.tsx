"use client";

import { ApiError } from "@rotta/api-client";
import { useAuth } from "@rotta/auth/web";
import { Button, Card, Checkbox, Typography } from "@rotta/ui/web";
import { useState } from "react";

import type { AcessoRural, Route as RotaDaRotta } from "@rotta/api-client";

import { useMyCompanyTags } from "@/features/company/hooks/use-company";
import { useUpdateRoute } from "@/features/routes/hooks/use-routes";

/**
 * "Condições de acesso (zona rural)" na tela da rota (SETE-03).
 *
 * ## Por que são cinco caixas, e não um campo de texto
 *
 * O SETE não pede uma descrição do trajeto: pede cinco respostas sim/não,
 * uma por obstáculo. Um campo livre obrigaria alguém a traduzir "estrada
 * ruim, tem uma ponte de madeira" para essas cinco respostas na hora de
 * exportar — e quem traduz não é quem conhece a estrada.
 *
 * ## O rótulo explica o obstáculo
 *
 * "Colchete" é palavra de quem anda em estrada de terra, não de quem usa
 * o painel. Cada caixa traz uma linha dizendo o que é, porque marcar a
 * caixa errada aqui vira informação errada no cadastro federal.
 */
const OBSTACULOS: { campo: keyof AcessoRural; titulo: string; explicacao: string }[] = [
  {
    campo: "acessoPorteira",
    titulo: "Porteira",
    explicacao: "O trajeto tem porteira que precisa ser aberta e fechada.",
  },
  {
    campo: "acessoMataBurro",
    titulo: "Mata-burro",
    explicacao: "Vala atravessada com barras de madeira ou ferro no lugar de porteira.",
  },
  {
    campo: "acessoColchete",
    titulo: "Colchete",
    explicacao: "Passagem lateral estreita na cerca, que obriga a reduzir quase à parada.",
  },
  {
    campo: "acessoAtoleiro",
    titulo: "Atoleiro",
    explicacao: "Tem trecho que atola em dia de chuva.",
  },
  {
    campo: "acessoPonteRustica",
    titulo: "Ponte rústica",
    explicacao: "Ponte de madeira ou sem estrutura de concreto.",
  },
];

/**
 * Só aparece para empresa `LICITADA`: numa transportadora só privada o
 * campo não tem destino — ninguém exporta ao SETE, e seriam cinco caixas
 * a mais em toda rota, para sempre. O recorte mora aqui, e não na tela
 * da rota, para a próxima tela que montar este cartão não precisar
 * lembrar da condição.
 */
export function AcessoRuralCard({ route }: { route: RotaDaRotta }): JSX.Element | null {
  const { user } = useAuth();
  const { temTag } = useMyCompanyTags(user?.companyId ?? "");
  const updateRoute = useUpdateRoute(route.id);
  const [erro, setErro] = useState<string | null>(null);

  // O estado começa do que está gravado e só muda por clique. Sem
  // `useEffect` de sincronia: um refetch no meio da edição não pode
  // desmarcar a caixa que a pessoa acabou de marcar.
  const [marcado, setMarcado] = useState<AcessoRural>({
    acessoPorteira: route.acessoPorteira,
    acessoMataBurro: route.acessoMataBurro,
    acessoColchete: route.acessoColchete,
    acessoAtoleiro: route.acessoAtoleiro,
    acessoPonteRustica: route.acessoPonteRustica,
  });

  const alterado = OBSTACULOS.some(({ campo }) => marcado[campo] !== route[campo]);

  // Depois de todo hook, nunca antes.
  if (!temTag("LICITADA")) return null;

  async function handleSalvar(): Promise<void> {
    setErro(null);
    try {
      await updateRoute.mutateAsync(marcado);
    } catch (error) {
      setErro(error instanceof ApiError ? error.message : "Não foi possível salvar agora.");
    }
  }

  return (
    <Card>
      <Card.Header title="Condições de acesso (zona rural)" />
      <Card.Body className="flex flex-col gap-4">
        <Typography variant="bodySmall" color="muted">
          O que esta rota enfrenta no caminho. Vai no arquivo que a prefeitura entrega ao governo
          federal (SETE), e ajuda a justificar o custo da rota. Deixe tudo desmarcado se a rota é
          toda asfaltada.
        </Typography>

        <fieldset className="flex flex-col gap-3">
          <legend className="sr-only">Obstáculos do trajeto</legend>
          {OBSTACULOS.map(({ campo, titulo, explicacao }) => (
            <label
              key={campo}
              // `htmlFor` explícito, e não só o aninhamento: o rótulo
              // tem duas linhas (nome e explicação), e o leitor de tela
              // precisa anunciar as duas como o nome da caixa — é a
              // explicação que evita marcar o obstáculo errado.
              htmlFor={`acesso-${campo}`}
              className="flex cursor-pointer items-start gap-3 rounded-md p-2 hover:bg-surface-muted"
            >
              <Checkbox
                id={`acesso-${campo}`}
                className="mt-0.5"
                checked={marcado[campo]}
                onChange={(event) =>
                  setMarcado((atual) => ({ ...atual, [campo]: event.target.checked }))
                }
              />
              <span className="flex flex-col">
                <Typography variant="bodySmall">{titulo}</Typography>
                <Typography variant="caption" color="muted">
                  {explicacao}
                </Typography>
              </span>
            </label>
          ))}
        </fieldset>
      </Card.Body>
      <Card.Footer>
        {erro ? (
          <Typography variant="bodySmall" color="danger" className="mr-auto">
            {erro}
          </Typography>
        ) : null}
        <Button
          variant="primary"
          disabled={!alterado}
          isLoading={updateRoute.isPending}
          onClick={() => void handleSalvar()}
        >
          Salvar condições
        </Button>
      </Card.Footer>
    </Card>
  );
}
