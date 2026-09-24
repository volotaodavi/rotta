"use client";

import { lerPlanilhaColada } from "@rotta/api-client";
import {
  Button,
  Card,
  FormField,
  Select,
  Table,
  Textarea,
  Typography,
  useToast,
} from "@rotta/ui/web";
import { useMemo, useState } from "react";

import type { ImportacaoDeRastreadores, LinhaRecusada } from "@rotta/api-client";

import { useCompaniesList } from "@/features/companies/hooks/use-companies";
import { useImportarRastreadores } from "@/features/vehicles/hooks/use-vehicles";

/**
 * Primeira instalação de um lote de rastreadores (pedido do usuário
 * 24/09/2026: "comprei um lote de rastreador... como irei cadastrar
 * pela primeira vez?").
 *
 * ## Por que colar, e não subir arquivo
 *
 * A planilha do instalador chega por e-mail ou WhatsApp, em formato
 * imprevisível — xlsx, csv, às vezes uma foto transcrita à mão. O gesto
 * que sempre funciona é abrir, selecionar as duas colunas e colar.
 * Upload exigiria acertar formato e codificação antes de qualquer coisa
 * acontecer; colar funciona na primeira tentativa.
 *
 * ## Por que o resultado é parcial
 *
 * Uma linha com IMEI repetido não derruba as outras 39. A tela mostra o
 * que entrou e lista, linha a linha, o que ficou de fora e por quê — o
 * Admin corrige só aquelas e cola de novo. Reimportar linha já correta
 * é inofensivo.
 */
export default function ImportarRastreadoresPage(): JSX.Element {
  const toast = useToast();
  const { data: empresas } = useCompaniesList({ page: 1, pageSize: 100 });
  const [companyId, setCompanyId] = useState("");
  const [colado, setColado] = useState("");
  const [resultado, setResultado] = useState<ImportacaoDeRastreadores | null>(null);

  const importar = useImportarRastreadores();
  const itens = useMemo(() => lerPlanilhaColada(colado), [colado]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Typography variant="title">Credenciar rastreadores</Typography>
        <Typography variant="bodySmall" color="muted">
          Cole a planilha do instalador: uma linha por ônibus, com o número (ou a placa) e o IMEI.
          Isto é feito uma vez por aparelho — depois quem opera é o despachante.
        </Typography>
      </div>

      <Card>
        <Card.Body className="flex flex-col gap-4">
          <FormField label="Transportadora" isRequired>
            <Select value={companyId} onChange={(event) => setCompanyId(event.target.value)}>
              <option value="">Selecione a transportadora</option>
              {empresas?.items.map((empresa) => (
                <option key={empresa.id} value={empresa.id}>
                  {empresa.nomeFantasia}
                </option>
              ))}
            </Select>
          </FormField>

          <FormField
            label="Planilha"
            helperText="Duas colunas: ônibus e IMEI. Pode colar direto do Excel — cabeçalho e linhas em branco são ignorados."
          >
            <Textarea
              rows={10}
              value={colado}
              onChange={(event) => setColado(event.target.value)}
              placeholder={"412\t863719060123456\n118\t863719060999888"}
              className="font-mono text-sm"
            />
          </FormField>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <Typography variant="bodySmall" color="muted">
              {itens.length === 0
                ? "Nenhuma linha reconhecida ainda."
                : `${itens.length} ${itens.length === 1 ? "ônibus reconhecido" : "ônibus reconhecidos"} na planilha.`}
            </Typography>
            <Button
              variant="primary"
              disabled={!companyId || itens.length === 0 || importar.isPending}
              onClick={() => {
                setResultado(null);
                importar.mutate(
                  { companyId, itens },
                  {
                    onSuccess: (dados) => {
                      setResultado(dados);
                      if (dados.recusadas.length === 0) {
                        toast.success(
                          `${dados.credenciados} ${dados.credenciados === 1 ? "ônibus credenciado" : "ônibus credenciados"}.`,
                        );
                      }
                    },
                  },
                );
              }}
            >
              {importar.isPending ? "Credenciando…" : "Credenciar lote"}
            </Button>
          </div>
        </Card.Body>
      </Card>

      {resultado ? (
        <Card>
          <Card.Header title={`${resultado.credenciados} de ${resultado.total} credenciados`} />
          <Card.Body className="flex flex-col gap-3">
            {resultado.recusadas.length === 0 ? (
              <Typography variant="body">
                Todos os ônibus da planilha ficaram com rastreador credenciado.
              </Typography>
            ) : (
              <>
                <Typography variant="bodySmall" color="muted">
                  As linhas abaixo ficaram de fora. Corrija só elas e cole de novo — as que já
                  entraram não são afetadas.
                </Typography>
                <Table<LinhaRecusada>
                  columns={[
                    { key: "linha", header: "Linha", render: (item) => item.linha },
                    {
                      key: "identificador",
                      header: "Ônibus",
                      render: (item) => item.identificador,
                    },
                    { key: "motivo", header: "Motivo", render: (item) => item.motivo },
                  ]}
                  rows={resultado.recusadas}
                  keyExtractor={(item) => String(item.linha)}
                />
              </>
            )}
          </Card.Body>
        </Card>
      ) : null}
    </div>
  );
}
