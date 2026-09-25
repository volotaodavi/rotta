"use client";

import { SERVICE_NATURE_DESCRICAO, SERVICE_NATURE_LABEL } from "@rotta/api-client";
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
import { useMemo, useState } from "react";

import type {
  CompanyServiceArea,
  CredenciamentoDeMunicipio,
  Municipio,
  SchoolAdministrativeDependency,
  ServiceNature,
} from "@rotta/api-client";

import { useDefinirNaturezaServico } from "@/features/companies/hooks/use-companies";
import {
  useCreateServiceArea,
  useCredenciarMunicipio,
  useRemoveServiceArea,
  useServiceAreas,
} from "@/features/companies/hooks/use-service-areas";
import { useMunicipios } from "@/features/schools/hooks/use-schools";

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
  naturezaServico,
}: {
  companyId: string;
  cidade: string;
  estado: string;
  naturezaServico: ServiceNature;
}): JSX.Element {
  const { data: areas, isLoading } = useServiceAreas(companyId);
  const credenciar = useCredenciarMunicipio(companyId);
  const criarArea = useCreateServiceArea(companyId);
  const removerArea = useRemoveServiceArea(companyId);

  // A UF começa na da própria transportadora: é o caso esmagadoramente
  // comum, e é ela que carrega a lista de municípios.
  const [estadoAlvo, setEstadoAlvo] = useState(estado);
  const [municipioAlvo, setMunicipioAlvo] = useState<Municipio | null>(null);
  const [rede, setRede] = useState<"TODAS" | "PUBLICA" | "PRIVADA">("TODAS");
  const [resultado, setResultado] = useState<CredenciamentoDeMunicipio | null>(null);

  const dependencias = REDES[rede];

  return (
    <div className="flex flex-col gap-6">
      <NaturezaDoServicoCard companyId={companyId} atual={naturezaServico} />

      <Card>
        <Card.Header title="Credenciar município inteiro" />
        <Card.Body className="flex flex-col gap-4">
          <Typography variant="bodySmall" color="muted">
            Vincula esta transportadora a todas as escolas do município que já estão no catálogo, e
            registra a área de atuação. Nenhuma escola é criada aqui — se faltar alguma, importe a
            planilha em Escolas e rode de novo.
          </Typography>

          <div className="grid gap-3 sm:grid-cols-4">
            <FormField label="UF" isRequired>
              <Input
                value={estadoAlvo}
                maxLength={2}
                onChange={(e) => {
                  setEstadoAlvo(e.target.value.toUpperCase());
                  // Município de outra UF não faz sentido — limpar
                  // evita credenciar "Maricá" tendo trocado para SP.
                  setMunicipioAlvo(null);
                  setResultado(null);
                }}
              />
            </FormField>

            <div className="sm:col-span-2">
              <SeletorDeMunicipio
                estado={estadoAlvo}
                cidadeSugerida={cidade}
                selecionado={municipioAlvo}
                onSelecionar={(municipio) => {
                  setMunicipioAlvo(municipio);
                  setResultado(null);
                }}
              />
            </div>

            <FormField label="Rede">
              <Select value={rede} onChange={(e) => setRede(e.target.value as typeof rede)}>
                <option value="TODAS">Todas as redes</option>
                <option value="PUBLICA">Só pública</option>
                <option value="PRIVADA">Só privada</option>
              </Select>
            </FormField>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="primary"
              disabled={!municipioAlvo || credenciar.isPending}
              onClick={() => {
                if (!municipioAlvo) return;
                setResultado(null);
                credenciar.mutate(
                  {
                    cidade: municipioAlvo.cidade,
                    estado: municipioAlvo.estado,
                    dependencias,
                  },
                  { onSuccess: setResultado },
                );
              }}
            >
              {credenciar.isPending ? "Credenciando…" : "Credenciar"}
            </Button>
            {municipioAlvo && !credenciar.isPending && (
              <Typography variant="bodySmall" color="muted">
                {municipioAlvo.escolas} escola(s) ativa(s) em {municipioAlvo.cidade}/
                {municipioAlvo.estado}
                {rede === "TODAS" ? "" : " — o filtro de rede pode reduzir esse número"}.
              </Typography>
            )}
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
 * Quem PAGA pelo transporte desta transportadora — a separação entre as
 * duas verticais (25/09/2026: "faça a distinção, por favor. Não quero
 * mistura").
 *
 * ## Por que fica junto da área de atuação, e não nos dados da empresa
 *
 * São perguntas diferentes — a área diz ONDE ela atua, esta diz QUEM
 * custeia — mas quem responde as duas é a mesma pessoa no mesmo
 * momento: o Admin da Rotta montando o contrato de um município. Separar
 * em duas telas faria a segunda ser esquecida, e uma empresa licitada
 * sem a marcação volta a cobrar mensalidade dos pais.
 *
 * ## Por que a confirmação
 *
 * Trocar para licitado desliga a cobrança de toda a base de
 * responsáveis daquela empresa. Trocar de volta a religa. Nenhuma das
 * duas direções é algo para acontecer por um clique errado num select.
 */
function NaturezaDoServicoCard({
  companyId,
  atual,
}: {
  companyId: string;
  atual: ServiceNature;
}): JSX.Element {
  const definir = useDefinirNaturezaServico(companyId);
  const [escolhida, setEscolhida] = useState<ServiceNature>(atual);

  const mudou = escolhida !== atual;
  const publica = atual === "PUBLICO_LICITADO";

  return (
    <Card>
      <Card.Header title="Natureza do serviço" />
      <Card.Body className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={publica ? "info" : "neutral"}>{SERVICE_NATURE_LABEL[atual]}</Badge>
        </div>

        <Typography variant="bodySmall" color="muted">
          {SERVICE_NATURE_DESCRICAO[atual]}
        </Typography>

        <div className="flex flex-wrap items-end gap-3">
          <FormField label="Mudar para">
            <Select
              value={escolhida}
              onChange={(e) => setEscolhida(e.target.value as ServiceNature)}
            >
              <option value="PRIVADO">{SERVICE_NATURE_LABEL.PRIVADO}</option>
              <option value="PUBLICO_LICITADO">{SERVICE_NATURE_LABEL.PUBLICO_LICITADO}</option>
            </Select>
          </FormField>
          <Button
            variant="primary"
            disabled={!mudou || definir.isPending}
            onClick={() => {
              const indo = SERVICE_NATURE_LABEL[escolhida];
              const aviso =
                escolhida === "PUBLICO_LICITADO"
                  ? "Mudar para público licitado DESLIGA a cobrança: esta transportadora deixa de poder gerar contrato com mensalidade, e os responsáveis dela passam a receber um documento dizendo que não há cobrança nenhuma. Os contratos já assinados não mudam.\n\nConfirmar?"
                  : "Mudar para particular RELIGA a cobrança: esta transportadora volta a poder negociar mensalidade com os responsáveis.\n\nConfirmar?";
              if (!window.confirm(`${indo}\n\n${aviso}`)) return;
              definir.mutate(escolhida);
            }}
          >
            {definir.isPending ? "Salvando…" : "Salvar"}
          </Button>
        </div>

        {mudou && (
          <Typography variant="bodySmall" color="muted">
            {SERVICE_NATURE_DESCRICAO[escolhida]}
          </Typography>
        )}
      </Card.Body>
    </Card>
  );
}

/**
 * Escolher o município, nunca digitá-lo.
 *
 * ## O bug que este componente apaga
 *
 * Antes, o Admin digitava a cidade num campo livre. Digitar "Marica"
 * sem acento, "Maríca" com o acento na letra errada, ou simplesmente
 * uma cidade cuja planilha ainda não subiu, devolvia a mesma coisa:
 * **0 escolas encontradas**. E "0 escolas" é indistinguível de "a
 * planilha não tinha essa escola" — o Admin iria procurar o erro no
 * lugar errado.
 *
 * Tirando a lista do próprio catálogo, o município que aparece aqui é,
 * por construção, um município que TEM escola. Não dá para escolher um
 * que devolva zero.
 *
 * ## Por que tem um campo de filtro em cima de uma lista
 *
 * Minas Gerais tem 853 municípios. Um `select` com 853 opções funciona,
 * mas achar "Sete Lagoas" rolando é pior do que digitar três letras. O
 * filtro é só isso: um atalho para a mesma lista fechada — ele estreita
 * as opções e nunca cria uma.
 */
function SeletorDeMunicipio({
  estado,
  cidadeSugerida,
  selecionado,
  onSelecionar,
}: {
  estado: string;
  /** A cidade da própria transportadora — o palpite mais provável. */
  cidadeSugerida: string;
  selecionado: Municipio | null;
  onSelecionar: (municipio: Municipio | null) => void;
}): JSX.Element {
  const { data: municipios, isLoading, isError } = useMunicipios(estado);
  const [filtro, setFiltro] = useState("");

  const visiveis = useMemo(() => {
    const todos = municipios ?? [];
    const busca = semAcento(filtro);
    if (!busca) return todos;
    return todos.filter((municipio) => semAcento(municipio.cidade).includes(busca));
  }, [municipios, filtro]);

  return (
    <FormField label="Município" isRequired>
      <div className="flex flex-col gap-2">
        <Input
          value={filtro}
          placeholder={
            isLoading
              ? "Carregando municípios…"
              : `Filtrar entre ${(municipios ?? []).length} município(s)`
          }
          disabled={isLoading || isError}
          onChange={(e) => setFiltro(e.target.value)}
        />
        <Select
          value={selecionado?.cidadeNormalizada ?? ""}
          disabled={isLoading || isError}
          onChange={(e) =>
            onSelecionar(visiveis.find((m) => m.cidadeNormalizada === e.target.value) ?? null)
          }
        >
          <option value="">
            {/* A cidade da própria transportadora entra no texto como
                dica, não como valor pré-selecionado: credenciar um
                município inteiro é irreversível com um clique, e não
                deve acontecer por o Admin não ter mexido no campo. */}
            {cidadeSugerida ? `Selecione (provavelmente ${cidadeSugerida})` : "Selecione"}
          </option>
          {visiveis.map((municipio) => (
            <option key={municipio.cidadeNormalizada} value={municipio.cidadeNormalizada}>
              {municipio.cidade} — {municipio.escolas} escola(s)
            </option>
          ))}
        </Select>

        {isError && (
          <Typography variant="bodySmall" color="danger">
            Não foi possível carregar os municípios desta UF.
          </Typography>
        )}
        {!isLoading && !isError && (municipios ?? []).length === 0 && estado.length === 2 && (
          <Typography variant="bodySmall" color="danger">
            Nenhuma escola de {estado} está no catálogo. Importe a planilha em Escolas antes de
            credenciar.
          </Typography>
        )}
      </div>
    </FormField>
  );
}

/**
 * O mesmo tratamento que o banco dá ao nome do município — para que
 * digitar "marica" no filtro ache "Maricá". Só de exibição: o valor que
 * vai para a API é sempre a `cidade` que veio do catálogo.
 */
function semAcento(valor: string): string {
  return valor.normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();
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
