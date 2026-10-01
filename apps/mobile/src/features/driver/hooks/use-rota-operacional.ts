import { useAuth } from "@rotta/auth/native";
import { type DistanceCoordenada } from "@rotta/maps/distance";
import { type RottaMapMarker } from "@rotta/maps/native";
import { activateKeepAwakeAsync, deactivateKeepAwake } from "expo-keep-awake";
import { useEffect, useMemo, useState } from "react";

import { podeAlternarModoAcao } from "./use-app-mode";
import { useRouteStops, useRouteStudents, useRouteStudentsDetalhado } from "./use-driver-routes";
import {
  useFinishTrip,
  usePauseTrip,
  useResumeTrip,
  useStartTrip,
  useTodayTrip,
  useTripProximasEtas,
  useTripStudentEvents,
} from "./use-driver-trip";
import { useMyLocation } from "./use-my-location";
import { useTripGpsReporting } from "./use-trip-gps-reporting";

import type { NextEta, Route, RouteStop, TripSentido } from "@rotta/api-client";

import { confirmarEncerramento } from "@/features/driver/encerramento/confirmar-encerramento";
import { useGpsTrack } from "@/features/gps/hooks/use-gps";
import { ordenarParadasPorSentido } from "@/features/routes/stop-direction";
import { useMyVehicle } from "@/features/vehicles/hooks/use-vehicles";
import { useTheme } from "@/providers/theme-provider";

/**
 * Toda a lógica da tela operacional do Motorista/Monitor — quem é o
 * usuário, qual viagem é a de hoje, GPS, paradas na ordem do sentido,
 * números do resumo e as quatro mutações (iniciar/pausar/retomar/
 * encerrar).
 *
 * Extraído de `RotaOperacional` em `inicio-screen.tsx` (auditoria
 * 26/09/2026, item 4): aquele componente tinha ~700 linhas, das quais
 * ~270 eram só isto — 13 hooks, 10 derivações e dois efeitos, tudo
 * misturado com a árvore de JSX que os consome. Separar não muda
 * comportamento nenhum: é a MESMA sequência de chamadas, na MESMA
 * ordem (o que importa, porque hooks têm ordem), só que num lugar onde
 * dá pra ler a regra sem rolar por cima de `<View>`.
 *
 * O que continua no componente, de propósito: `mapKey` e
 * `avisoSemVeiculoAberto` são estado de apresentação (recentralizar o
 * mapa, abrir um modal) e não têm regra de negócio pra testar.
 */
export function useRotaOperacional(rota: Route): RotaOperacional {
  const { theme } = useTheme();
  const { user } = useAuth();
  // Frente 6 — dono autônomo/MEI em "Modo Ação" (`role === "empresa"`,
  // nunca `role === "motorista"`) opera exatamente como um Motorista de
  // verdade nesta tela (inicia/pausa/finaliza viagem, reporta GPS) —
  // sem um "Monitor" correspondente, já que é o próprio dono dirigindo
  // sozinho. `podeAlternarModoAcao` já confere `companyType` AUTONOMO/
  // MEI, então nunca inclui LTDA/SA/Cooperativa/Sociedade Simples.
  const isMotorista = user?.role === "motorista" || podeAlternarModoAcao(user);
  const isMonitor = user?.role === "monitor";
  const isDono = user?.role === "empresa";
  // Cor de papel (Frente 304 — 3 imagens de referência anexadas pelo
  // usuário, pedido explícito "quero o mesmo design, idêntico"):
  // Motorista usa `driverPrimary` (azul da identidade nova do
  // Motorista, spec 31/08/2026); Monitor mantém o `monitorAccent`
  // (roxo, ver `packages/theme/src/tokens/colors.ts`) — cor exclusiva
  // já existente, não substituída pela nova identidade.
  const accentColor = isMotorista ? theme.colors.driverPrimary : theme.colors.monitorAccent;

  const { data: trip, isLoading: isLoadingTrip } = useTodayTrip(rota.id);
  const { data: stops } = useRouteStops(rota.id);
  const { data: routeStudents } = useRouteStudents(rota.id);
  const { data: studentEvents } = useTripStudentEvents(trip?.id);
  // Card "Próxima viagem" (pedido do usuário: "aparecerá as informações
  // — nome dos alunos, escolas, horário, bairros, responsáveis") — só
  // busca antes da viagem existir, mesma regra de outros hooks
  // condicionais nesta tela.
  const { data: routeStudentsDetalhado } = useRouteStudentsDetalhado(rota.id);

  /*
   * Placa do veículo no cartão "Próxima viagem" (telas 17/18 da
   * referência, que destacam "FRC-3B45 · Veículo" antes de iniciar).
   * `Route` só tem `veiculoPadraoId`, e este hook devolve o veículo da
   * pessoa logada numa consulta só — não é uma busca por id solta nem
   * uma por linha. Sem veículo (caso do Monitor), a linha some.
   */
  const { data: meuVeiculo } = useMyVehicle();

  /*
   * Resumo do cartão "Próxima viagem" (15/09/2026) — a referência mostra
   * escola, janela de horário e "N alunos · 1 monitor" ali. Nada disso
   * vem pronto: `Route` só tem nome/turno/ids, então o resumo é derivado
   * da MESMA lista de alunos que o cartão já carrega (`schoolNome` e
   * `horarioPrevisto` por aluno) — nenhuma consulta nova.
   *
   * Quando a rota atende mais de uma escola, diz quantas são em vez de
   * escolher uma e dar a impressão errada de que é a única.
   */
  const escolasDaRota = Array.from(
    new Set((routeStudentsDetalhado ?? []).map((a) => a.schoolNome).filter(Boolean)),
  ) as string[];
  const escolaResumo =
    escolasDaRota.length === 1
      ? (escolasDaRota[0] ?? null)
      : escolasDaRota.length > 1
        ? `${escolasDaRota.length} escolas`
        : null;

  const horariosDaRota = (routeStudentsDetalhado ?? [])
    .map((a) => a.horarioPrevisto)
    .filter((h): h is string => Boolean(h))
    .sort();
  const janelaHorario =
    horariosDaRota.length > 0
      ? horariosDaRota[0] === horariosDaRota[horariosDaRota.length - 1]
        ? (horariosDaRota[0] ?? null)
        : `${horariosDaRota[0]} - ${horariosDaRota[horariosDaRota.length - 1]}`
      : null;

  const startTrip = useStartTrip(rota.id);
  // Sentido da PRÓXIMA viagem (pedido do usuário 15/09/2026, "igual
  // placa de ônibus"). Sugere a volta quando a viagem anterior de hoje
  // já foi a ida e terminou — que é a sequência real do dia — mas
  // continua sendo só uma sugestão: o motorista pode trocar antes de
  // deslizar.
  const [sentidoEscolhido, setSentidoEscolhido] = useState<TripSentido | null>(null);
  const sentidoSugerido: TripSentido =
    trip && trip.sentido === "IDA" && (trip.status === "FINALIZADA" || trip.status === "CANCELADA")
      ? "VOLTA"
      : "IDA";
  const sentidoDaProximaViagem = sentidoEscolhido ?? sentidoSugerido;
  const pauseTrip = usePauseTrip(rota.id);
  const resumeTrip = useResumeTrip(rota.id);
  const finishTrip = useFinishTrip(rota.id);

  const isActive = trip?.status === "EM_ANDAMENTO";
  // Correção 31/08/2026 (pedido do usuário: "Monitor e Motorista
  // integrados? Ações integradas?") — só o Motorista reportava GPS,
  // apesar do backend (`TripsService.assertCanOperateTrip`) já liberar
  // o Monitor pra `ingestPosition` desde a Frente AA. Mesma paridade do
  // Painel Web (`minha-rota/page.tsx`).
  const podeReportarGps = isMotorista || isMonitor;
  const { status: gpsStatus, confirmarDivulgacao } = useTripGpsReporting(
    podeReportarGps && isActive && trip ? trip.id : null,
  );

  // Mantém a tela acesa durante a viagem (pedido do usuário: "manter a
  // tela do motorista ligada... tanto no app quanto na web") — paridade
  // com `useWakeLock` já usado no Painel Web (`minha-rota/page.tsx`),
  // mesmo escopo do reporte de GPS acima (Motorista OU Monitor), só
  // enquanto a viagem está `EM_ANDAMENTO`. `expo-keep-awake` já era uma
  // dependência instalada, mas nunca chamada em lugar nenhum — sem isso,
  // o celular apaga a tela sozinho e o app para de reportar GPS/mostrar
  // o checklist até alguém desbloquear de novo (mesmo problema que
  // motivou o hook web).
  useEffect(() => {
    if (!podeReportarGps || !isActive) return;
    const tag = "rotta-viagem-ativa";
    void activateKeepAwakeAsync(tag);
    return () => void deactivateKeepAwake(tag);
  }, [podeReportarGps, isActive]);

  // Ordem de PERCURSO, não a ordem cadastrada: numa viagem de volta as
  // mesmas paradas são percorridas ao contrário (ver
  // `ordenarParadasPorSentido`). Isso decide o traçado do mapa, a
  // numeração dos marcadores e a sequência dos cartões de parada —
  // tudo em que a ordem É o conteúdo. Sem viagem iniciada não há
  // sentido a respeitar, e cai na ordem cadastrada.
  const paradasOrdenadas = ordenarParadasPorSentido(stops ?? [], trip?.sentido);
  const markers: RottaMapMarker[] = paradasOrdenadas.map((parada, indice) => ({
    id: parada.id,
    titulo: `${indice + 1}. ${parada.endereco}`,
    latitude: parada.latitude,
    longitude: parada.longitude,
  }));

  // Respaldo (Frente M, mesma regra da Frente I no Painel Web): sem
  // paradas cadastradas ainda pra essa rota, mostra pelo menos onde o
  // telefone está — nunca deixa a tela sem mapa nenhum. Também alimenta
  // o marcador do veículo abaixo (auditoria 27/08/2026, pedido do
  // usuário: "o motorista e monitor deverão saber onde estão. Cadê o
  // 'veículo' no mapa dos motoristas e monitores?") — por isso agora
  // fica sempre ligado nesta tela, não só quando faltam paradas.
  const minhaLocalizacao = useMyLocation(true);

  // Marcador do próprio veículo em movimento (Frente 2, paridade com o
  // Painel Web — pedido do usuário: "todos deverão ter mapa, cada um na
  // sua função"; reforçado na auditoria 27/08/2026 — "motorista e
  // monitor deverão saber onde estão"). `GET /gps/trips/:tripId/track`
  // é o único endpoint de GPS que Motorista/Monitor podem chamar sobre
  // a própria viagem — mas essa trilha só existe DEPOIS que o backend
  // já recebeu pelo menos 1 relatório (viagem `EM_ANDAMENTO`), então o
  // próprio motorista/monitor ficava sem se ver no mapa antes disso (e
  // sempre, se a viagem ainda nem começou). O marcador agora prioriza a
  // posição do PRÓPRIO telefone (`minhaLocalizacao`, instantânea, watch
  // contínuo, nunca depende de a viagem estar rodando) — a trilha do
  // backend só entra como respaldo se a localização do telefone ainda
  // não estiver disponível (permissão sendo solicitada/negada).
  const gpsTrackTripId =
    trip && trip.status !== "FINALIZADA" && trip.status !== "CANCELADA" ? trip.id : undefined;
  const { data: gpsTrack } = useGpsTrack(gpsTrackTripId);
  const ultimaPosicao = gpsTrack && gpsTrack.length > 0 ? gpsTrack[gpsTrack.length - 1] : undefined;
  const veiculoPosicao = minhaLocalizacao.location
    ? {
        latitude: minhaLocalizacao.location.latitude,
        longitude: minhaLocalizacao.location.longitude,
      }
    : ultimaPosicao
      ? { latitude: ultimaPosicao.latitude, longitude: ultimaPosicao.longitude }
      : null;
  // Deps em primitivos (não o objeto `veiculoPosicao`, recriado a cada
  // render) — senão o `useMemo` recalcula sempre, mesmo sem mudança real.
  const veiculoLatitude = veiculoPosicao?.latitude;
  const veiculoLongitude = veiculoPosicao?.longitude;
  const veiculoMarker: RottaMapMarker | null = useMemo(() => {
    if (veiculoLatitude === undefined || veiculoLongitude === undefined) return null;
    return {
      id: "veiculo-em-movimento",
      titulo: "Seu veículo",
      latitude: veiculoLatitude,
      longitude: veiculoLongitude,
      emMovimento: true,
    };
  }, [veiculoLatitude, veiculoLongitude]);
  const mapMarkers: RottaMapMarker[] = veiculoMarker ? [...markers, veiculoMarker] : markers;

  // Posição do veículo, pro gate de proximidade (Frente 2, paridade com
  // o Painel Web — pedido do usuário: "ao chegar próximo — raio de até
  // 1km — poderá embarcar/desembarcar o aluno"). Sempre a trilha
  // VERIFICADA pelo backend (nunca a leitura crua do telefone de quem
  // está olhando a tela agora — pode ser o Monitor, num aparelho
  // diferente do que de fato reporta GPS pra viagem): é a posição do
  // VEÍCULO que importa aqui pro gate. `null` sem posição conhecida
  // ainda — `estaProximo` nunca bloqueia nesse caso.
  const driverPosition: DistanceCoordenada | null = ultimaPosicao
    ? { latitude: ultimaPosicao.latitude, longitude: ultimaPosicao.longitude }
    : null;
  const { data: proximasEtas } = useTripProximasEtas(isActive && trip ? trip.id : undefined);
  const proximaParada = proximasEtas?.[0];
  // Coordenada real da próxima parada (mesma lista que já vira marcador
  // no mapa acima) — alimenta o botão "Navegar" do cartão de ETA.
  const proximaParadaStop = proximaParada
    ? paradasOrdenadas.find((parada) => parada.id === proximaParada.routeStopId)
    : undefined;

  const gpsAvisoTexto =
    gpsStatus === "reporting"
      ? "Compartilhando sua localização com os responsáveis."
      : gpsStatus === "reporting-foreground-only"
        ? 'Compartilhando localização só com o app aberto. Permita "Sempre" nas configurações para continuar com o app em segundo plano.'
        : gpsStatus === "requesting"
          ? "Solicitando permissão de localização…"
          : gpsStatus === "denied"
            ? "Localização negada. Os responsáveis não verão o veículo no mapa até você permitir."
            : null;

  // Números reais do "Resumo da viagem" (paridade com o Painel Web) —
  // mesma regra que já decide o ícone de cada `AlunoParadaRow` abaixo.
  const alunosEmbarcados = (studentEvents ?? []).filter((e) => e.tipo === "EMBARCOU").length;
  const paradasRestantesCount = paradasOrdenadas.filter((parada) => {
    const alunosDaParada = (routeStudents ?? []).filter(
      (aluno) => aluno.paradaEmbarqueId === parada.id || aluno.paradaDesembarqueId === parada.id,
    );
    if (alunosDaParada.length === 0) return false;
    return alunosDaParada.some((aluno) => {
      const isEmbarque = aluno.paradaEmbarqueId === parada.id;
      const tipoEsperado = isEmbarque ? "EMBARCOU" : "DESEMBARCOU";
      const jaResolvido = (studentEvents ?? []).some(
        (e) => e.studentId === aluno.studentId && (e.tipo === tipoEsperado || e.tipo === "AUSENTE"),
      );
      return !jaResolvido;
    });
  }).length;

  const viagemEncerrada = Boolean(
    trip && (trip.status === "FINALIZADA" || trip.status === "CANCELADA"),
  );
  const totalAlunos = (routeStudents ?? []).length;

  /**
   * `EMB-01` — encerrar passa pelo checklist antes (ver
   * `encerramento/pendencias-de-encerramento.ts`). Prefere a lista
   * detalhada porque ela tem o nome do aluno: um aviso que diz "2
   * alunos pendentes" obriga o motorista a fechar o alerta e ir
   * procurar quem são, e ele está dirigindo.
   */
  const encerrarViagem = (tripId: string): void =>
    confirmarEncerramento({
      alunos: routeStudentsDetalhado ?? routeStudents ?? [],
      eventos: studentEvents ?? [],
      onEncerrar: () => finishTrip.mutate(tripId),
    });
  const progressoEmbarquePct = totalAlunos > 0 ? (alunosEmbarcados / totalAlunos) * 100 : 0;

  // Frente AP (paridade com o Painel Web, pedido do usuário: "quando a
  // pessoa for iniciar uma rota, deverá ter um veículo cadastrado —
  // caso o motorista não tenha, o pop-up deverá informar isso") —
  // mesma checagem proativa do lado web: sem `rota.veiculoPadraoId`, o
  // backend rejeitaria `POST /trips/start` de qualquer forma
  // (`"Informe veiculoId..."`, hoje visível via o `Alert` global de
  // erro), mas essa mensagem é pensada pra quem chama a API, não pra
  // quem dirige.
  const semVeiculoPadrao = !isLoadingTrip && !trip && isMotorista && !rota.veiculoPadraoId;

  return {
    accentColor,
    alunosEmbarcados,
    confirmarDivulgacao,
    driverPosition,
    encerrarViagem,
    escolaResumo,
    finishTrip,
    gpsAvisoTexto,
    gpsStatus,
    isActive,
    isDono,
    isLoadingTrip,
    isMotorista,
    janelaHorario,
    mapMarkers,
    markers,
    meuVeiculo,
    minhaLocalizacao,
    paradasOrdenadas,
    paradasRestantesCount,
    pauseTrip,
    progressoEmbarquePct,
    proximaParada,
    proximaParadaStop,
    proximasEtas,
    resumeTrip,
    routeStudents,
    routeStudentsDetalhado,
    semVeiculoPadrao,
    sentidoDaProximaViagem,
    setSentidoEscolhido,
    startTrip,
    studentEvents,
    totalAlunos,
    trip,
    viagemEncerrada,
  };
}

/**
 * O contrato do hook, escrito à mão em vez de `ReturnType<...>`: quem
 * mexe na tela precisa ver o que tem disponível sem abrir o hook, e um
 * tipo inferido não mostra nada no editor.
 */
export type RotaOperacional = {
  accentColor: string;
  alunosEmbarcados: number;
  confirmarDivulgacao: () => void;
  driverPosition: DistanceCoordenada | null;
  encerrarViagem: (tripId: string) => void;
  escolaResumo: string | null;
  finishTrip: ReturnType<typeof useFinishTrip>;
  gpsAvisoTexto: string | null;
  gpsStatus: ReturnType<typeof useTripGpsReporting>["status"];
  isActive: boolean;
  isDono: boolean;
  isLoadingTrip: boolean;
  isMotorista: boolean;
  janelaHorario: string | null;
  mapMarkers: RottaMapMarker[];
  markers: RottaMapMarker[];
  meuVeiculo: ReturnType<typeof useMyVehicle>["data"];
  minhaLocalizacao: ReturnType<typeof useMyLocation>;
  paradasOrdenadas: RouteStop[];
  paradasRestantesCount: number;
  pauseTrip: ReturnType<typeof usePauseTrip>;
  progressoEmbarquePct: number;
  proximaParada: NextEta | undefined;
  proximaParadaStop: RouteStop | undefined;
  proximasEtas: NextEta[] | undefined;
  resumeTrip: ReturnType<typeof useResumeTrip>;
  routeStudents: ReturnType<typeof useRouteStudents>["data"];
  routeStudentsDetalhado: ReturnType<typeof useRouteStudentsDetalhado>["data"];
  semVeiculoPadrao: boolean;
  sentidoDaProximaViagem: TripSentido;
  setSentidoEscolhido: (sentido: TripSentido) => void;
  startTrip: ReturnType<typeof useStartTrip>;
  studentEvents: ReturnType<typeof useTripStudentEvents>["data"];
  totalAlunos: number;
  trip: ReturnType<typeof useTodayTrip>["data"];
  viagemEncerrada: boolean;
};
