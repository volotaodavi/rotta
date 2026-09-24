"use client";

import {
  Badge,
  Button,
  Card,
  EmptyState,
  FormField,
  Input,
  Select,
  Spinner,
  Table,
  Typography,
} from "@rotta/ui/web";
import { useState } from "react";

import type {
  CompanyServiceArea,
  CredenciamentoDeMunicipio,
  SchoolAdministrativeDependency,
} from "@rotta/api-client";

import {
  useCreateServiceArea,
  useCredenciarMunicipio,
  useRemoveServiceArea,
  useServiceAreas,
} from "@/features/companies/hooks/use-service-areas";

/**
 * Onde esta transportadora pode atuar (fluxo de transporte público,
 * 22-24/09/2026).
 *
 * ## As duas coisas que a tela faz, e por que estão juntas
 *
 * **Credenciar o município** é o gesto principal: escolhe a cidade e a
 * transportadora entra em TODAS as escolas dela que já estão no
 * catálogo — "não deverá inventar ou faltar". O mesmo clique registra a
 * área de atuação, porque credenciar sem delimitar deixaria a empresa
 * livre para entrar em qualquer escola do país amanhã.
 *
 * **A lista de áreas** abaixo é a cerca resultante, e fica editável
 * para os casos que o município inteiro não cobre: a transportadora que
 * atende duas cidades, ou que atende três escolas específicas fora da
 * sua.
 *
 * ## O aviso que a tela precisa dar
 *
 * Lista vazia NÃO é "sem acesso" — é "sem cerca", e a empresa pode se
 * credenciar em qualquer escola. É o comportamento do fluxo privado, e
 * está escrito na tela porque o contrário seria a suposição natural de
 * quem olha.
 */
export function CompanyServiceAreasTab({
  companyId,
  cidade,
  estado,
}: {
  companyId: string;
  cidade: string;
  estado: string;
}): JSX.Element {
  const { data: areas, isLoading } = useServiceAreas(companyId);
  const credenciar = useCredenciarMunicipio(companyId);
  const criarArea = useCreateServiceArea(companyId);
  const removerArea = useRemoveServiceArea(companyId);

  // Pré-preenchido com a cidade da própria transportadora: é o caso
  // esmagadoramente comum, e digitar de novo o que o sistema já sabe é
  // convite a erro de digitação.
  const [cidadeAlvo, setCidadeAlvo] = useState(cidade);
  const [estadoAlvo, setEstadoAlvo] = useState(estado);
  const [rede, setRede] = useState<"TODAS" | "PUBLICA" | "PRIVADA">("TODAS");
  const [resultado, setResultado] = useState<CredenciamentoDeMunicipio | null>(null);

  const dependencias = REDES[rede];

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <Card.Header title="Credenciar município inteiro" />
        <Card.Body className="flex flex-col gap-4">
          <Typography variant="bodySmall" color="muted">
            Vincula esta transportadora a todas as escolas do município que já estão no catálogo, e
            registra a área de atuação. Nenhuma escola é criada aqui — se faltar alguma, importe a
            planilha em Escolas e rode de novo.
          </Typography>

          <div className="grid gap-3 sm:grid-cols-4">
            <FormField label="Município" isRequired>
              <Input value={cidadeAlvo} onChange={(e) => setCidadeAlvo(e.target.value)} />
            </FormField>
            <FormField label="UF" isRequired>
              <Input
                value={estadoAlvo}
                maxLength={2}
                onChange={(e) => setEstadoAlvo(e.target.value.toUpperCase())}
              />
            </FormField>
            <FormField label="Rede">
              <Select value={rede} onChange={(e) => setRede(e.target.value as typeof rede)}>
                <option value="TODAS">Todas as redes</option>
                <option value="PUBLICA">Só pública</option>
                <option value="PRIVADA">Só privada</option>
              </Select>
            </FormField>
            <div className="flex items-end">
              <Button
                variant="primary"
                disabled={!cidadeAlvo || estadoAlvo.length !== 2 || credenciar.isPending}
                onClick={() => {
                  setResultado(null);
                  credenciar.mutate(
                    { cidade: cidadeAlvo.trim(), estado: estadoAlvo, dependencias },
                    { onSuccess: setResultado },
                  );
                }}
              >
                {credenciar.isPending ? "Credenciando…" : "Credenciar"}
              </Button>
            </div>
          </div>

          {resultado && <ResultadoDoCredenciamento resultado={resultado} />}
        </Card.Body>
      </Card>

      <Card>
        <Card.Header title="Onde esta transportadora pode atuar" />
        <Card.Body className="flex flex-col gap-4">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Spinner />
            </div>
          ) : (areas?.length ?? 0) === 0 ? (
            <EmptyState
              title="Sem cerca definida"
              description="Atenção: sem nenhuma área, esta transportadora pode se credenciar em QUALQUER escola do catálogo. É o comportamento do fluxo privado — para o transporte público, credencie o município acima."
            />
          ) : (
            <Table<CompanyServiceArea>
              columns={[
                {
                  key: "onde",
                  header: "Onde",
                  render: (area) => area.schoolNome ?? `${area.cidade}/${area.estado}`,
                },
                {
                  key: "tipo",
                  header: "Tipo",
                  render: (area) => (
                    <Badge variant={area.schoolId ? "neutral" : "info"}>
                      {area.schoolId ? "Escola específica" : "Município inteiro"}
                    </Badge>
                  ),
                },
                {
                  key: "redes",
                  header: "Redes",
                  render: (area) =>
                    area.dependencias.length === 0 ? "Todas" : area.dependencias.join(", "),
                },
                {
                  key: "acao",
                  header: "",
                  render: (area) => (
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={removerArea.isPending}
                      onClick={() => removerArea.mutate(area.id)}
                    >
                      Remover
                    </Button>
                  ),
                },
              ]}
              rows={areas ?? []}
              keyExtractor={(area) => area.id}
            />
          )}

          <AdicionarAreaAvulsa
            onAdicionar={(input) => criarArea.mutate(input)}
            isPending={criarArea.isPending}
          />
        </Card.Body>
      </Card>
    </div>
  );
}

/**
 * Os três números lado a lado, e não um "pronto!".
 *
 * É a comparação de `encontradas` com o que o Admin sabe que subiu na
 * planilha que diz se deu certo. Município com 62 escolas mostrando 58
 * significa que faltou importação — e é melhor descobrir agora do que
 * quando uma criança não aparecer em nenhuma rota.
 */
function ResultadoDoCredenciamento({
  resultado,
}: {
  resultado: CredenciamentoDeMunicipio;
}): JSX.Element {
  return (
    <div className="flex flex-col gap-2 rounded-md bg-secondary/10 px-4 py-3">
      <Typography variant="body">
        <strong>{resultado.encontradas}</strong> escola(s) encontrada(s) no catálogo deste
        município.
      </Typography>
      <Typography variant="bodySmall" color="muted">
        {resultado.credenciadas} credenciada(s) agora
        {resultado.jaCredenciadas > 0 ? `, ${resultado.jaCredenciadas} já estava(m)` : ""}.
      </Typography>
      {resultado.encontradas === 0 && (
        <Typography variant="bodySmall" color="danger">
          Nenhuma escola deste município está no catálogo. Importe a planilha em Escolas antes de
          credenciar.
        </Typography>
      )}
    </div>
  );
}

/** Para os casos que o município inteiro não cobre: uma escola avulsa, em outra cidade. */
function AdicionarAreaAvulsa({
  onAdicionar,
  isPending,
}: {
  onAdicionar: (input: { cidade: string; estado: string }) => void;
  isPending: boolean;
}): JSX.Element {
  const [cidade, setCidade] = useState("");
  const [estado, setEstado] = useState("");

  return (
    <div className="flex flex-col gap-3 border-t border-border pt-4">
      <Typography variant="bodySmall" color="muted">
        Adicionar outro município à cerca, sem credenciar as escolas agora.
      </Typography>
      <div className="flex flex-wrap items-end gap-3">
        <FormField label="Município">
          <Input value={cidade} onChange={(e) => setCidade(e.target.value)} />
        </FormField>
        <FormField label="UF">
          <Input
            value={estado}
            maxLength={2}
            onChange={(e) => setEstado(e.target.value.toUpperCase())}
          />
        </FormField>
        <Button
          variant="secondary"
          disabled={!cidade || estado.length !== 2 || isPending}
          onClick={() => {
            onAdicionar({ cidade: cidade.trim(), estado });
            setCidade("");
            setEstado("");
          }}
        >
          Adicionar
        </Button>
      </div>
    </div>
  );
}

/**
 * "Pública" e "privada" na linguagem de quem opera, traduzidas para a
 * classificação do INEP. Filantrópica e comunitária entram em privada
 * porque é como a secretaria de educação as trata na prática — não são
 * rede pública.
 */
const REDES: Record<"TODAS" | "PUBLICA" | "PRIVADA", SchoolAdministrativeDependency[]> = {
  TODAS: [],
  PUBLICA: ["FEDERAL", "ESTADUAL", "MUNICIPAL"],
  PRIVADA: ["PRIVADA", "FILANTROPICA", "COMUNITARIA"],
};
