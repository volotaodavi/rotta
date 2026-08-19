"use client";

import { ApiError } from "@rotta/api-client";
import { useAuth } from "@rotta/auth/web";
import {
  Check,
  FileText,
  GraduationCap,
  MapPin,
  Route as RouteIcon,
  Trash2,
  Users,
} from "@rotta/icons";
import {
  Badge,
  Button,
  Card,
  ErrorState,
  FormField,
  Input,
  Select,
  Spinner,
  Typography,
} from "@rotta/ui/web";
import { useParams } from "next/navigation";
import { useState } from "react";

import type {
  Contract,
  GeocodeResult,
  RouteOptimizationResult,
  RouteStop,
  RouteStudent,
  School,
  SchoolShift,
} from "@rotta/api-client";

import { useContractsList } from "@/features/marketplace/hooks/use-marketplace";
import {
  useAddRouteStop,
  useAddRouteStudent,
  useRemoveRouteStop,
  useRemoveRouteStudent,
  useRoute,
  useRouteStops,
  useRouteStudents,
  useSuggestRouteOptimization,
  useUpdateRoute,
} from "@/features/routes/hooks/use-routes";
import {
  ROUTE_STATUS_LABEL,
  ROUTE_STATUS_VARIANT,
  ROUTE_WEEKDAY_LABEL,
} from "@/features/routes/labels";
import { useSuggestSchools } from "@/features/schools/hooks/use-schools";
import { SCHOOL_SHIFT_LABEL } from "@/features/schools/labels";
import { useStudent } from "@/features/students/hooks/use-students";
import { useMyTeam } from "@/features/team/hooks/use-team";
import { useMyLocation } from "@/hooks/use-my-location";
import { geoApi, marketplaceApi } from "@/lib/api-client";

function formatarDistanciaKm(distanciaKm: number): string {
  return distanciaKm < 1 ? `${Math.round(distanciaKm * 1000)} m` : `${distanciaKm.toFixed(1)} km`;
}

/**
 * Detalhe de Rota — paradas + alunos. Fecha o loop que faltava: sem uma
 * `RouteStop` real, não há onde embarcar/desembarcar ninguém; sem um
 * `RouteStudent`, o aluno credenciado (`Contract` ATIVO) nunca aparece
 * na rota do motorista nem no mapa do responsável. O endereço da parada
 * é geocodificado pela mesma Rotta Geo AI (`POST /geo/geocode`,
 * Nominatim/OSM) usada em todo o resto da plataforma — nunca lat/long
 * digitado manualmente.
 */
export default function RotaDetalhePage(): JSX.Element {
  const params = useParams<{ id: string }>();
  const routeId = params.id;

  const {
    data: route,
    isLoading: isLoadingRoute,
    isError: isRouteError,
    refetch: refetchRoute,
    isFetching: isFetchingRoute,
  } = useRoute(routeId);
  const { data: stops, isLoading: isLoadingStops } = useRouteStops(routeId);
  const { data: routeStudents, isLoading: isLoadingStudents } = useRouteStudents(routeId);
  const { data: team } = useMyTeam();
  const { user } = useAuth();
  const updateRoute = useUpdateRoute(routeId);

  if (isLoadingRoute) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size="lg" />
      </div>
    );
  }

  /**
   * Achado real (pedido do usuário: "aparece que 'algo deu errado' ao
   * criar uma rota"): esta é a tela pra onde `/rotas/novo` navega logo
   * depois de criar a rota — sem isso, qualquer falha transitória nesse
   * primeiro fetch (ex.: cold start do Render, réplica de leitura ainda
   * sem ver a rota recém-criada) deixava a tela presa num spinner
   * infinito, sem erro visível nem botão de tentar de novo. Mesmo padrão
   * já corrigido nas outras telas de detalhe — este arquivo tinha ficado
   * de fora daquela auditoria.
   */
  if (isRouteError || !route) {
    return (
      <ErrorState
        message="Não foi possível carregar esta rota."
        onRetry={() => void refetchRoute()}
        isRetrying={isFetchingRoute}
      />
    );
  }

  // Motorista autônomo/MEI nunca aparece em `useMyTeam()` (é `role: "empresa"`,
  // não "motorista" — mesmo achado de `/rotas/novo`), mas pode muito bem ser
  // ele mesmo o `motoristaPadraoId` da própria rota — sem este fallback, a
  // rota mostrava "Nenhum motorista atribuído ainda" mesmo já tendo um.
  const motoristaNome =
    team?.find((m) => m.userId === route.motoristaPadraoId)?.nome ??
    (route.motoristaPadraoId === user?.id ? user?.nome : undefined);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Typography variant="title">{route.nome}</Typography>
          <Typography variant="bodySmall" color="muted">
            {SCHOOL_SHIFT_LABEL[route.turno]} ·{" "}
            {route.diasSemana.map((dia) => ROUTE_WEEKDAY_LABEL[dia].slice(0, 3)).join(", ")}
            {motoristaNome
              ? ` · Motorista: ${motoristaNome}`
              : " · Nenhum motorista atribuído ainda"}
          </Typography>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Badge variant={ROUTE_STATUS_VARIANT[route.status]}>
            {ROUTE_STATUS_LABEL[route.status]}
          </Badge>
          <Button
            variant="secondary"
            size="sm"
            isLoading={updateRoute.isPending}
            onClick={() =>
              updateRoute.mutate({ status: route.status === "ATIVA" ? "PAUSADA" : "ATIVA" })
            }
          >
            {route.status === "ATIVA" ? "Pausar rota" : "Ativar rota"}
          </Button>
        </div>
      </div>

      {route.status === "PAUSADA" ? (
        <Card>
          <Card.Body>
            <Typography variant="bodySmall" color="danger">
              Esta rota está pausada: ela não aparece em &quot;Minha Rota&quot; para o motorista nem
              para o monitor enquanto estiver assim. Clique em &quot;Ativar rota&quot; acima quando
              ela estiver pronta para operar.
            </Typography>
          </Card.Body>
        </Card>
      ) : null}

      {!route.motoristaPadraoId ? (
        <Card>
          <Card.Body>
            <Typography variant="bodySmall" color="danger">
              Esta rota ainda não tem motorista atribuído: edite a rota (Equipe → vincular) antes de
              esperar que ela apareça em &quot;Minha Rota&quot; para alguém.
            </Typography>
          </Card.Body>
        </Card>
      ) : null}

      <StopsSection routeId={routeId} stops={stops} isLoading={isLoadingStops} />
      <RouteOptimizationSection routeId={routeId} stops={stops ?? []} />
      <StudentsSection
        routeId={routeId}
        routeTurno={route.turno}
        stops={stops ?? []}
        routeStudents={routeStudents}
        isLoading={isLoadingStudents}
      />
    </div>
  );
}

/**
 * Duas formas de adicionar uma parada (pedido do usuário: "quando for
 * criar uma rota, deverá ser mediante a escola que foi importada, não
 * deverá colocar o endereço de fato") — "Escola" é o modo padrão (busca
 * tolerante a erro de digitação + sugestão por proximidade, mesmo
 * `useSuggestSchools` do cadastro de aluno); "Outro endereço" continua
 * disponível pra paradas que não são numa escola (ex. um ponto de
 * encontro do grupo).
 */
function StopsSection({
  routeId,
  stops,
  isLoading,
}: {
  routeId: string;
  stops: RouteStop[] | undefined;
  isLoading: boolean;
}): JSX.Element {
  const addStop = useAddRouteStop(routeId);
  const removeStop = useRemoveRouteStop(routeId);
  const [modo, setModo] = useState<"escola" | "endereco">("escola");
  const [horario, setHorario] = useState("07:00");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [schoolSearch, setSchoolSearch] = useState("");
  const minhaLocalizacao = useMyLocation(schoolSearch.trim().length >= 2);
  const { data: schoolResults } = useSuggestSchools({
    q: schoolSearch,
    latitude: minhaLocalizacao.location?.latitude,
    longitude: minhaLocalizacao.location?.longitude,
  });

  const [endereco, setEndereco] = useState("");
  const [geocoded, setGeocoded] = useState<GeocodeResult | null>(null);
  const [isGeocoding, setIsGeocoding] = useState(false);

  async function handleBuscarEndereco(): Promise<void> {
    setGeocoded(null);
    setErrorMessage(null);
    if (!endereco.trim()) return;
    setIsGeocoding(true);
    try {
      const result = await geoApi.geocodeAddress(endereco);
      setGeocoded(result);
    } catch (error) {
      setErrorMessage(
        error instanceof ApiError
          ? error.message
          : "Não foi possível localizar este endereço agora. Tente ser mais específico.",
      );
    } finally {
      setIsGeocoding(false);
    }
  }

  async function handleAdicionarEscola(school: School): Promise<void> {
    setErrorMessage(null);
    try {
      await addStop.mutateAsync({
        ordem: stops?.length ?? 0,
        schoolId: school.id,
        horarioPrevisto: horario,
      });
      setSchoolSearch("");
    } catch (error) {
      setErrorMessage(
        error instanceof ApiError ? error.message : "Não foi possível adicionar a parada agora.",
      );
    }
  }

  async function handleAdicionarEndereco(): Promise<void> {
    if (!geocoded) return;
    setErrorMessage(null);
    try {
      await addStop.mutateAsync({
        ordem: stops?.length ?? 0,
        endereco: geocoded.enderecoFormatado,
        latitude: geocoded.latitude,
        longitude: geocoded.longitude,
        horarioPrevisto: horario,
      });
      setEndereco("");
      setGeocoded(null);
    } catch (error) {
      setErrorMessage(
        error instanceof ApiError ? error.message : "Não foi possível adicionar a parada agora.",
      );
    }
  }

  return (
    <Card>
      <Card.Header title="Paradas" />
      <Card.Body className="flex flex-col gap-4">
        {isLoading ? (
          <Spinner size="sm" />
        ) : !stops || stops.length === 0 ? (
          <Typography variant="bodySmall" color="muted">
            Nenhuma parada ainda: adicione ao menos uma antes de vincular alunos.
          </Typography>
        ) : (
          <div className="flex flex-col divide-y divide-border">
            {stops.map((stop) => (
              <div key={stop.id} className="flex items-center justify-between gap-3 py-2">
                <div className="flex items-center gap-2">
                  {stop.schoolId ? (
                    <GraduationCap className="h-4 w-4 shrink-0 text-primary" />
                  ) : (
                    <MapPin className="h-4 w-4 shrink-0 text-primary" />
                  )}
                  <div>
                    <Typography variant="bodySmall">{stop.endereco}</Typography>
                    <Typography variant="caption" color="muted">
                      {stop.horarioPrevisto}
                    </Typography>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  iconLeft={<Trash2 className="h-4 w-4" />}
                  isLoading={removeStop.isPending && removeStop.variables === stop.id}
                  onClick={() => removeStop.mutate(stop.id)}
                >
                  Remover
                </Button>
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-col gap-3 rounded-2xl border border-border p-3">
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant={modo === "escola" ? "secondary" : "ghost"}
              onClick={() => setModo("escola")}
            >
              Escola
            </Button>
            <Button
              type="button"
              size="sm"
              variant={modo === "endereco" ? "secondary" : "ghost"}
              onClick={() => setModo("endereco")}
            >
              Outro endereço
            </Button>
          </div>

          {modo === "escola" ? (
            <FormField
              label="Escola"
              helperText="Busca pelo nome, no catálogo já importado: a Rotta Geo AI já sabe a localização."
            >
              <div className="flex flex-col gap-2">
                <Input
                  placeholder="Nome da escola"
                  value={schoolSearch}
                  onChange={(event) => setSchoolSearch(event.target.value)}
                />
                {schoolSearch && schoolResults && schoolResults.items.length > 0 && (
                  <div className="flex flex-col gap-1 rounded-md border border-border bg-card p-1">
                    {schoolResults.items.map((school) => (
                      <button
                        key={school.id}
                        type="button"
                        className="group flex items-center justify-between rounded px-3 py-2 text-left text-sm hover:bg-surface"
                        onClick={() => void handleAdicionarEscola(school)}
                      >
                        <span>
                          {school.nomeOficial}, {school.cidade}/{school.estado}
                          {school.distanciaKm !== null && school.distanciaKm !== undefined && (
                            <span className="text-text-muted">
                              {" "}
                              · {formatarDistanciaKm(school.distanciaKm)}
                            </span>
                          )}
                        </span>
                        <Check className="h-4 w-4 text-primary opacity-0 group-hover:opacity-100" />
                      </button>
                    ))}
                  </div>
                )}
                {schoolSearch &&
                schoolSearch.trim().length >= 2 &&
                schoolResults &&
                schoolResults.items.length === 0 ? (
                  <Typography variant="caption" color="muted">
                    Nenhuma escola encontrada com esse nome no catálogo ainda.
                  </Typography>
                ) : null}
              </div>
            </FormField>
          ) : (
            <FormField
              label="Endereço da parada"
              helperText="A Rotta Geo AI localiza a latitude/longitude sozinha, nunca digitada manualmente."
            >
              <Input
                placeholder="ex: Rua das Flores, 123, Bela Vista, São Paulo, SP"
                value={endereco}
                onChange={(event) => {
                  setEndereco(event.target.value);
                  setGeocoded(null);
                }}
                onBlur={() => void handleBuscarEndereco()}
              />
            </FormField>
          )}

          {modo === "endereco" && isGeocoding ? (
            <div className="flex items-center gap-2 text-text-muted">
              <Spinner size="sm" />
              <Typography variant="caption">Localizando endereço...</Typography>
            </div>
          ) : modo === "endereco" && geocoded ? (
            <div className="flex items-center gap-2 text-success">
              <Check className="h-4 w-4" />
              <Typography variant="caption">{geocoded.enderecoFormatado}</Typography>
            </div>
          ) : null}

          <FormField label="Horário previsto">
            <Input
              type="time"
              value={horario}
              onChange={(event) => setHorario(event.target.value)}
            />
          </FormField>
          {errorMessage ? (
            <Typography variant="caption" color="danger">
              {errorMessage}
            </Typography>
          ) : null}
          {modo === "endereco" ? (
            <Button
              type="button"
              variant="secondary"
              disabled={!geocoded}
              isLoading={addStop.isPending}
              onClick={() => void handleAdicionarEndereco()}
            >
              Adicionar parada
            </Button>
          ) : null}
        </div>
      </Card.Body>
    </Card>
  );
}

function formatarDuracao(segundos: number): string {
  const minutos = Math.round(segundos / 60);
  if (minutos < 60) return `${minutos} min`;
  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  return resto === 0 ? `${horas}h` : `${horas}h${resto}min`;
}

/**
 * "Rotta Route AI" — pedido do usuário: "as IAs de localização irão
 * traçar as rotas (por ordem de proximidade) no OPENSTREET, principalmente
 * na OPENSTREET do responsável". Motor real (OSRM via Rotta Geo Engine,
 * Frente D) já existia desde antes desta tela — só faltava um botão. Só
 * mostra a comparação lado a lado; quem decide se aplica a nova ordem é o
 * Gestor (ROT-08: "a sugestão nunca altera a rota automaticamente") — hoje
 * a aplicação em si ainda não está exposta, então o resultado é só
 * informativo.
 */
function RouteOptimizationSection({
  routeId,
  stops,
}: {
  routeId: string;
  stops: RouteStop[];
}): JSX.Element | null {
  const suggestOptimization = useSuggestRouteOptimization(routeId);
  const [resultado, setResultado] = useState<RouteOptimizationResult | null>(null);

  if (stops.length < 3) return null;

  const enderecoPorId = new Map(stops.map((stop) => [stop.id, stop.endereco]));

  async function handleOtimizar(): Promise<void> {
    setResultado(null);
    try {
      const result = await suggestOptimization.mutateAsync();
      setResultado(result);
    } catch {
      // erro já refletido em suggestOptimization.isError / .error abaixo
    }
  }

  return (
    <Card>
      <Card.Header title="Rotta Route AI" />
      <Card.Body className="flex flex-col gap-4">
        <Typography variant="bodySmall" color="muted">
          Sugestão de ordem por proximidade, calculada via OpenStreetMap.
        </Typography>
        <Button
          type="button"
          variant="secondary"
          iconLeft={<RouteIcon className="h-4 w-4" />}
          isLoading={suggestOptimization.isPending}
          onClick={() => void handleOtimizar()}
        >
          Otimizar rota
        </Button>

        {suggestOptimization.isError ? (
          <Typography variant="bodySmall" color="danger">
            {suggestOptimization.error instanceof ApiError
              ? suggestOptimization.error.message
              : "Não foi possível calcular a otimização agora. Tente novamente em instantes."}
          </Typography>
        ) : null}

        {resultado && resultado.jaOtimizada ? (
          <Typography variant="bodySmall" color="success">
            Esta rota já está na ordem mais eficiente encontrada.
          </Typography>
        ) : resultado ? (
          <div className="flex flex-col gap-3">
            <Typography variant="bodySmall">
              Economia estimada de{" "}
              <span className="font-semibold text-success">
                {formatarDuracao(resultado.economiaSegundos)}
              </span>{" "}
              seguindo a ordem sugerida ({formatarDuracao(resultado.duracaoAtualSegundos)} →{" "}
              {formatarDuracao(resultado.duracaoSugeridaSegundos)}).
            </Typography>
            <div className="flex flex-col gap-1 rounded-xl border border-border p-3">
              <Typography variant="caption" color="muted" className="font-semibold">
                Ordem sugerida
              </Typography>
              {resultado.ordemSugeridaIds.map((stopId, index) => (
                <Typography key={stopId} variant="bodySmall">
                  {index + 1}. {enderecoPorId.get(stopId) ?? "Parada"}
                </Typography>
              ))}
            </div>
            <Typography variant="caption" color="muted">
              Esta sugestão não altera a rota sozinha: se quiser aplicá-la, reordene as paradas
              acima manualmente.
            </Typography>
          </div>
        ) : null}
      </Card.Body>
    </Card>
  );
}

function StudentsSection({
  routeId,
  routeTurno,
  stops,
  routeStudents,
  isLoading,
}: {
  routeId: string;
  routeTurno: SchoolShift;
  stops: RouteStop[];
  routeStudents: RouteStudent[] | undefined;
  isLoading: boolean;
}): JSX.Element {
  const removeStudent = useRemoveRouteStudent(routeId);
  const { data: contracts } = useContractsList({ pageSize: 100 });

  const jaNaRota = new Set(routeStudents?.map((rs) => rs.contractId));
  const candidatos = (contracts?.items ?? []).filter(
    (contract) => contract.status === "ATIVO" && !jaNaRota.has(contract.id),
  );

  return (
    <Card>
      <Card.Header title="Alunos" />
      <Card.Body className="flex flex-col gap-4">
        {isLoading ? (
          <Spinner size="sm" />
        ) : !routeStudents || routeStudents.length === 0 ? (
          <Typography variant="bodySmall" color="muted">
            Nenhum aluno vinculado a esta rota ainda.
          </Typography>
        ) : (
          <div className="flex flex-col divide-y divide-border">
            {routeStudents.map((rs) => (
              <RouteStudentRow
                key={rs.id}
                routeStudentId={rs.id}
                studentId={rs.studentId}
                onRemove={() => removeStudent.mutate(rs.id)}
                isRemoving={removeStudent.isPending && removeStudent.variables === rs.id}
              />
            ))}
          </div>
        )}

        {stops.length === 0 ? (
          <Typography variant="caption" color="muted">
            Adicione ao menos uma parada acima para poder vincular alunos.
          </Typography>
        ) : candidatos.length === 0 ? (
          <div className="flex items-center gap-2 text-text-muted">
            <Users className="h-4 w-4" />
            <Typography variant="caption">
              Nenhum aluno credenciado disponível pra vincular agora.
            </Typography>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <Typography variant="bodySmall" className="font-semibold">
              Alunos credenciados disponíveis
            </Typography>
            {candidatos.map((contract) => (
              <AddStudentCandidateRow
                key={contract.id}
                routeId={routeId}
                routeTurno={routeTurno}
                contract={contract}
                stops={stops}
              />
            ))}
          </div>
        )}
      </Card.Body>
    </Card>
  );
}

function RouteStudentRow({
  studentId,
  onRemove,
  isRemoving,
}: {
  routeStudentId: string;
  studentId: string;
  onRemove: () => void;
  isRemoving: boolean;
}): JSX.Element {
  const { data: student } = useStudent(studentId);

  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <div className="flex items-center gap-2">
        <Typography variant="bodySmall">{student?.nome ?? "Carregando..."}</Typography>
        {student && <Badge variant="neutral">{SCHOOL_SHIFT_LABEL[student.turno]}</Badge>}
      </div>
      <Button
        variant="ghost"
        size="sm"
        iconLeft={<Trash2 className="h-4 w-4" />}
        isLoading={isRemoving}
        onClick={onRemove}
      >
        Remover
      </Button>
    </div>
  );
}

/**
 * Pedido do usuário: "após criar uma rota, deverá ter ali os alunos que
 * estão cadastrados no código da transportadora e credenciar a uma rota
 * (manhã, tarde e noite)." O turno da rota é fixo (definido em
 * `/rotas/novo`); o que faltava era o turno de CADA aluno candidato
 * ficar visível aqui, pra quem credencia ver de cara se o horário bate
 * — nunca escondido, pra não esconder por engano um candidato válido
 * (ex. aluno turno INTEGRAL serve pra qualquer rota).
 */
function AddStudentCandidateRow({
  routeId,
  routeTurno,
  contract,
  stops,
}: {
  routeId: string;
  routeTurno: SchoolShift;
  contract: Contract;
  stops: RouteStop[];
}): JSX.Element {
  const { data: student } = useStudent(contract.studentId);
  const turnoCompativel =
    !student ||
    student.turno === routeTurno ||
    student.turno === "INTEGRAL" ||
    routeTurno === "INTEGRAL" ||
    routeTurno === "PERSONALIZADO";
  const addStudent = useAddRouteStudent(routeId);
  const [paradaEmbarqueId, setParadaEmbarqueId] = useState("");
  const [paradaDesembarqueId, setParadaDesembarqueId] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isBaixandoTermo, setIsBaixandoTermo] = useState(false);

  /**
   * Só aparece pra contratos gerados automaticamente no credenciamento
   * pelo "código do transporte" (`origem: TERMO_CIENCIA_AUTOMATICO`,
   * ver nota do model Prisma) — um contrato `NEGOCIADO` de verdade segue
   * pela Authentique, sem PDF de termo de ciência. Blob autenticado
   * (mesmo padrão de `escolas/page.tsx.handleExport`), nunca um `<a
   * href>` cru — a rota exige o Bearer token do usuário logado.
   */
  async function handleBaixarTermo(): Promise<void> {
    setIsBaixandoTermo(true);
    try {
      const blob = await marketplaceApi.baixarTermoCienciaPdf(contract.id);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `termo-ciencia-${contract.id}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      setErrorMessage("Não foi possível baixar o termo de ciência agora.");
    } finally {
      setIsBaixandoTermo(false);
    }
  }

  async function handleAdd(): Promise<void> {
    setErrorMessage(null);
    if (!paradaEmbarqueId || !paradaDesembarqueId) {
      setErrorMessage("Escolha a parada de embarque e a de desembarque.");
      return;
    }
    try {
      await addStudent.mutateAsync({
        contractId: contract.id,
        paradaEmbarqueId,
        paradaDesembarqueId,
      });
    } catch (error) {
      setErrorMessage(
        error instanceof ApiError ? error.message : "Não foi possível vincular este aluno agora.",
      );
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <Typography variant="bodySmall" className="font-medium">
            {student?.nome ?? "Carregando..."}
          </Typography>
          {student && (
            <Badge variant={turnoCompativel ? "neutral" : "warning"}>
              {SCHOOL_SHIFT_LABEL[student.turno]}
            </Badge>
          )}
        </div>
        {student && !turnoCompativel && (
          <Typography variant="caption" color="danger">
            Turno diferente do turno desta rota ({SCHOOL_SHIFT_LABEL[routeTurno]}), confira antes de
            credenciar.
          </Typography>
        )}
        {contract.origem === "TERMO_CIENCIA_AUTOMATICO" ? (
          <button
            type="button"
            onClick={() => void handleBaixarTermo()}
            disabled={isBaixandoTermo}
            className="flex w-fit items-center gap-1 text-xs text-text-muted underline decoration-dotted hover:text-primary disabled:opacity-60"
          >
            <FileText className="h-3.5 w-3.5" />
            {isBaixandoTermo ? "Baixando termo..." : "Baixar termo de ciência"}
          </button>
        ) : null}
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Select
          value={paradaEmbarqueId}
          onChange={(event) => setParadaEmbarqueId(event.target.value)}
        >
          <option value="">Embarque em...</option>
          {stops.map((stop) => (
            <option key={stop.id} value={stop.id}>
              {stop.endereco} ({stop.horarioPrevisto})
            </option>
          ))}
        </Select>
        <Select
          value={paradaDesembarqueId}
          onChange={(event) => setParadaDesembarqueId(event.target.value)}
        >
          <option value="">Desembarque em...</option>
          {stops.map((stop) => (
            <option key={stop.id} value={stop.id}>
              {stop.endereco} ({stop.horarioPrevisto})
            </option>
          ))}
        </Select>
        <Button
          variant="secondary"
          size="sm"
          isLoading={addStudent.isPending}
          onClick={() => void handleAdd()}
        >
          Vincular
        </Button>
      </div>
      {errorMessage ? (
        <Typography variant="caption" color="danger">
          {errorMessage}
        </Typography>
      ) : null}
    </div>
  );
}
