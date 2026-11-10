"use client";

import { ApiError } from "@rotta/api-client";
import { useAuth } from "@rotta/auth/web";
import { CircleCheck, FileDown, Landmark, TriangleAlert } from "@rotta/icons";
import { Badge, Button, Card, FormField, Input, Select, Spinner, Typography } from "@rotta/ui/web";
import Link from "next/link";
import { useEffect, useState } from "react";

import type { SetePendencia } from "@rotta/shared-contracts";
import type { Route } from "next";

import { useMyCompanyTags } from "@/features/company/hooks/use-company";
import { useSetePendencias, useSeteMunicipio } from "@/features/sete/hooks/use-sete";
import { seteApi } from "@/lib/api-client";

/**
 * Cartão "SETE / FNDE" no painel da empresa (SETE-05).
 *
 * ## O texto não usa a sigla sem explicar
 *
 * Quem abre esta tela é a dona da transportadora, não um servidor da
 * secretaria. "SETE" e "PNATE" não dizem nada para ela, e um cartão que
 * só mostra siglas é um cartão que ninguém clica. Por isso a primeira
 * frase diz o que o arquivo serve para fazer, e a sigla vem depois.
 *
 * ## As pendências levam para o conserto, não só avisam
 *
 * Cada item tem o caminho da tela onde o dado que falta é digitado
 * (`caminhoDeCorrecao`, montado no backend). Uma lista que diz "a escola
 * X não tem INEP" e deixa a pessoa procurar a escola X no menu é uma
 * lista que ela lê uma vez e ignora.
 *
 * ## Exportar com pendência continua permitido
 *
 * O SETE aceita cadastro incompleto em vários campos, e segurar o
 * arquivo até a última pendência sumir impediria o envio parcial que a
 * prefeitura às vezes pede. O botão avisa quantas faltam, e exporta.
 *
 * ## O cartão decide sozinho se aparece
 *
 * A habilitação `LICITADA` é verificada aqui, e não na página que o
 * monta, por dois motivos: o teste do recorte não precisa montar o
 * painel inteiro, e a próxima tela que quiser este cartão não pode
 * esquecer de repetir a condição. `temTag` erra para o lado de mostrar
 * enquanto a empresa não carregou — um cartão que pisca a cada
 * navegação é pior que um cartão que o backend recusa (403), e é o
 * backend que barra de verdade (RN-SETE-01).
 */
export function SeteCard(): JSX.Element | null {
  const { user } = useAuth();
  const { temTag } = useMyCompanyTags(user?.companyId ?? "");
  const licitada = temTag("LICITADA");

  const { data: municipio, isLoading: carregandoMunicipio } = useSeteMunicipio(licitada);
  const { data: pendencias, isLoading: carregandoPendencias } = useSetePendencias(licitada);

  const [codigoIbge, setCodigoIbge] = useState("");
  const [formato, setFormato] = useState<"json" | "csv">("json");
  const [baixando, setBaixando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // Preenche uma vez, quando a sugestão chega, e nunca depois: se a
  // pessoa corrigiu o código à mão, um refetch não pode desfazer a
  // correção dela.
  const [preenchido, setPreenchido] = useState(false);
  useEffect(() => {
    if (!preenchido && municipio?.codigoIbge) {
      setCodigoIbge(municipio.codigoIbge);
      setPreenchido(true);
    }
  }, [municipio, preenchido]);

  const codigoValido = /^\d{7}$/.test(codigoIbge);

  async function handleExportar(): Promise<void> {
    setErro(null);
    setBaixando(true);
    try {
      const blob = await seteApi.exportar({ codigoIbge, formato });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `sete-${codigoIbge}.zip`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      setErro(
        error instanceof ApiError ? error.message : "Não foi possível gerar o arquivo agora.",
      );
    } finally {
      setBaixando(false);
    }
  }

  const total = pendencias?.length ?? 0;

  // Depois de TODO hook: um `return` antes deles mudaria a ordem dos
  // hooks entre renderizações e o React quebra.
  if (!licitada) return null;

  return (
    <Card>
      <Card.Header
        title="SETE / FNDE"
        action={
          total > 0 ? (
            <Badge variant="warning">
              {total} {total === 1 ? "pendência" : "pendências"}
            </Badge>
          ) : carregandoPendencias ? undefined : (
            <Badge variant="success">Cadastro completo</Badge>
          )
        }
      />
      <Card.Body className="flex flex-col gap-5">
        <div className="flex gap-3">
          <Landmark size={20} className="mt-0.5 shrink-0 text-primary" aria-hidden />
          <Typography variant="bodySmall" color="muted">
            Gera o arquivo com as rotas, os veículos, os motoristas, os monitores e os alunos do
            transporte escolar, no formato que o sistema do governo federal (SETE, do FNDE) espera
            receber. Quem envia é a prefeitura: baixe o arquivo e entregue a ela.
          </Typography>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_auto]">
          <FormField
            label="Código do município (IBGE)"
            isRequired
            helperText={
              carregandoMunicipio
                ? "Procurando o município da sua área de atuação…"
                : municipio?.codigoIbge
                  ? `Sugerido a partir da sua área de atuação: ${municipio.cidade}/${municipio.estado}.`
                  : municipio?.cidade
                    ? `Sua área de atuação é ${municipio.cidade}/${municipio.estado}, mas a Rotta não tem o código dessa cidade. Peça-o à secretaria.`
                    : "São 7 números. A secretaria de educação sabe qual é o do município."
            }
            errorText={
              codigoIbge.length > 0 && !codigoValido ? "O código tem 7 números." : undefined
            }
          >
            <Input
              value={codigoIbge}
              inputMode="numeric"
              maxLength={7}
              placeholder="3302700"
              hasError={codigoIbge.length > 0 && !codigoValido}
              onChange={(event) => setCodigoIbge(event.target.value.replace(/\D/g, ""))}
            />
          </FormField>

          <FormField label="Formato">
            <Select
              value={formato}
              onChange={(event) => setFormato(event.target.value as "json" | "csv")}
            >
              <option value="json">JSON (importação completa)</option>
              <option value="csv">CSV (só alunos)</option>
            </Select>
          </FormField>
        </div>

        {carregandoPendencias ? (
          <div className="flex justify-center py-4">
            <Spinner size="md" />
          </div>
        ) : total === 0 ? (
          <div className="flex items-center gap-2">
            <CircleCheck size={18} className="shrink-0 text-success" aria-hidden />
            <Typography variant="bodySmall">
              Nada pendente: todo cadastro que o SETE pede está preenchido.
            </Typography>
          </div>
        ) : (
          <ListaDePendencias pendencias={pendencias ?? []} />
        )}
      </Card.Body>
      <Card.Footer>
        {erro ? (
          <Typography variant="bodySmall" color="danger" className="mr-auto">
            {erro}
          </Typography>
        ) : total > 0 ? (
          <Typography variant="bodySmall" color="muted" className="mr-auto">
            Você pode baixar agora: o SETE aceita cadastro incompleto em vários campos.
          </Typography>
        ) : null}
        <Button
          variant="primary"
          iconLeft={<FileDown size={16} />}
          disabled={!codigoValido}
          isLoading={baixando}
          onClick={() => void handleExportar()}
        >
          Baixar arquivo
        </Button>
      </Card.Footer>
    </Card>
  );
}

/**
 * A lista é um `<ul>` de verdade, e não uma pilha de `<div>`: o leitor
 * de tela anuncia "lista de 7 itens" antes do primeiro, e quem navega
 * por teclado sabe quantos conserto tem pela frente antes de começar.
 */
function ListaDePendencias({ pendencias }: { pendencias: SetePendencia[] }): JSX.Element {
  return (
    <ul className="flex flex-col gap-2" aria-label="Pendências do cadastro para o SETE">
      {pendencias.map((pendencia, indice) => (
        <li
          key={`${pendencia.tipo}-${indice}`}
          className="flex items-start gap-3 rounded-md border border-border bg-surface-muted p-3"
        >
          <TriangleAlert size={16} className="mt-0.5 shrink-0 text-warning" aria-hidden />
          <Typography variant="bodySmall" className="flex-1">
            {pendencia.descricao}
          </Typography>
          <Link
            href={pendencia.caminhoDeCorrecao as Route}
            className="shrink-0 text-sm font-medium text-primary underline-offset-2 hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            Corrigir
          </Link>
        </li>
      ))}
    </ul>
  );
}
