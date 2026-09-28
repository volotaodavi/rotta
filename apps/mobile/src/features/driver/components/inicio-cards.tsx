import {
  AlertTriangle,
  Bus,
  CircleEllipsis,
  Clock,
  LifeBuoy,
  MapPin,
  MessageCircle,
  Navigation,
  ShieldAlert,
  Timer,
  Users,
  UserX,
  X,
} from "@rotta/icons/native";
import { RottaMap } from "@rotta/maps/native";
import { buildNavigationUrl } from "@rotta/maps/navigation";
import { driverShadow } from "@rotta/theme";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { type MyLocation, type MyLocationStatus } from "../hooks/use-my-location";

import { inicioStyles } from "./inicio-styles";

import type { StatusPillTone } from "@/features/vehicles/components";
import type {
  NextEta,
  RouteStop,
  RouteStudentDetalhado,
  TripStudentEvent,
  VehicleOccurrenceSeverity,
} from "@rotta/api-client";

import { useUnreadNotificationsCount } from "@/features/notifications/hooks/use-notifications";
import { StatusPill, VehicleButton, VehicleCard } from "@/features/vehicles/components";
import {
  useCreateVehicleOccurrence,
  useVehicleOccurrences,
} from "@/features/vehicles/hooks/use-vehicles";
import { buildWhatsAppUrl } from "@/lib/whatsapp";
import { useTheme } from "@/providers/theme-provider";

/**
 * Os cartões da tela de Início do Motorista/Monitor — mapa, lista de
 * alunos antes da viagem, ETA da próxima parada, cronômetro, resumo de
 * números, chamada da viagem e o botão de registrar ocorrência.
 *
 * Saíram de `inicio-screen.tsx` na auditoria 26/09/2026 (item 4), sem
 * mudança de comportamento: o mesmo código, no mesmo formato, só que
 * num arquivo em que dá pra achar o cartão que se quer mexer.
 */

export function MeuMapa({
  location,
  status,
  fill = false,
  mapKey = 0,
}: {
  location: MyLocation | null;
  status: MyLocationStatus;
  /** `true` dentro do mapa em tela cheia de `RotaOperacional` — ocupa 100% do pai (`StyleSheet.absoluteFillObject`), sem cantos arredondados/altura fixa. */
  fill?: boolean;
  /** Troca pra remontar o mapa (Frente Q — botão "centralizar no meu GPS"). */
  mapKey?: number;
}): JSX.Element {
  const { theme } = useTheme();

  if (!location) {
    return (
      <View
        style={[
          fill ? styles.mapaVazioFill : styles.mapaVazio,
          { backgroundColor: theme.colors.card },
        ]}
      >
        {status === "requesting" || status === "idle" ? (
          <>
            <ActivityIndicator color={theme.colors.driverPrimary} />
            <Text style={{ color: theme.colors.textMuted, fontSize: 12 }}>
              Buscando sua localização…
            </Text>
          </>
        ) : status === "denied" ? (
          <Text style={{ color: theme.colors.textMuted, fontSize: 12, textAlign: "center" }}>
            Localização negada. Permita o acesso nas configurações do app para ver o mapa.
          </Text>
        ) : (
          <Text style={{ color: theme.colors.textMuted, fontSize: 12 }}>Mapa indisponível.</Text>
        )}
      </View>
    );
  }

  return (
    <View style={fill ? styles.absoluteFill : styles.mapa}>
      <RottaMap
        key={mapKey}
        markers={[
          {
            id: "minha-localizacao",
            titulo: "Você está aqui",
            latitude: location.latitude,
            longitude: location.longitude,
            // Mesmo ícone de veículo do mapa em operação (auditoria
            // 27/08/2026) — esta tela também é só de
            // motorista/monitor/autônomo/MEI, nunca de Responsável, então
            // "Você está aqui" É o veículo, não um pino genérico.
            emMovimento: true,
          },
        ]}
        initialCenter={location}
        initialZoom={14}
      />
    </View>
  );
}

/**
 * Cartão "próxima parada" (Frente M) — porta de `ProximaParadaEtaCard`
 * do Painel Web (Frente L): mesma ideia do cartão de ETA de uma imagem
 * de referência de app de mobilidade ("Track Rider"), com o motorista/
 * monitor vendo o PRÓPRIO progresso. Dado real (`NextEta`, tarefa #99)
 * — nunca uma estimativa inventada no app.
 *
 * "Navegar" (Frente S2, mesma decisão do Painel Web — pedido do
 * usuário: "acha melhor integrar o Google Maps para navegação e GPS,
 * enquanto o openstreet fica para os responsáveis") — `Linking.openURL`
 * pro deep-link universal do Apple Maps (iOS) ou Google Maps (Android),
 * com a coordenada real da próxima parada (`parada`, a mesma que já
 * vira marcador no `RottaMap`). Sem custo, sem SDK de navegação
 * embutido. Só aparece quando `parada` existe.
 */
/**
 * Uma linha por aluno no card "Próxima viagem" (pedido do usuário:
 * "aparecerá as informações — nome dos alunos, escolas, horário,
 * bairros, responsáveis"). Todo campo de `RouteStudentDetalhado` é
 * opcional (join que pode falhar isoladamente no backend) — nunca
 * mostra um traço genérico, só omite a informação que não veio.
 */
export function AlunoPreViagemRow({ aluno }: { aluno: RouteStudentDetalhado }): JSX.Element {
  const { theme } = useTheme();
  const subtitulo = [aluno.schoolNome, aluno.bairro].filter(Boolean).join(" · ");
  return (
    <View style={[styles.alunoPreViagemRow, { backgroundColor: theme.colors.surface }]}>
      <View style={{ flex: 1 }}>
        <View style={styles.alunoPreViagemHeaderRow}>
          <Text style={{ color: theme.colors.text, fontWeight: "600", fontSize: 14 }}>
            {aluno.studentNome ?? "Aluno"}
          </Text>
          {aluno.horarioPrevisto ? (
            <Text style={{ color: theme.colors.textMuted, fontSize: 11 }}>
              {aluno.horarioPrevisto}
            </Text>
          ) : null}
        </View>
        {subtitulo ? (
          <Text style={{ color: theme.colors.textMuted, fontSize: 12 }}>{subtitulo}</Text>
        ) : null}
        {aluno.responsavelNome ? (
          <Text style={{ color: theme.colors.textMuted, fontSize: 12 }}>
            Responsável: {aluno.responsavelNome}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

export function ProximaParadaEtaCard({
  eta,
  parada,
  accentColor,
}: {
  eta: NextEta;
  parada?: RouteStop;
  accentColor: string;
}): JSX.Element {
  const { theme } = useTheme();
  const horarioPrevisto = new Date(eta.etaPrevista).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const distancia =
    eta.distanciaMetros >= 1000
      ? `${(eta.distanciaMetros / 1000).toFixed(1)} km`
      : `${Math.round(eta.distanciaMetros)} m`;

  function handleNavegar(): void {
    if (!parada) return;
    const app = Platform.OS === "ios" ? "apple" : "google";
    const url = buildNavigationUrl({ latitude: parada.latitude, longitude: parada.longitude }, app);
    Linking.openURL(url).catch(() => {
      // Nenhum app de mapas instalado/URL recusada pelo SO — sem
      // fallback silencioso: o toque simplesmente não faz nada visível,
      // mesmo padrão "stub honesto" do resto da base (nunca finge êxito).
    });
  }

  return (
    <VehicleCard
      style={[
        styles.etaCard,
        inicioStyles.driverCard,
        { backgroundColor: theme.colors.surfaceElevated },
        driverShadow[theme.name].native,
      ]}
    >
      <Navigation size={20} color={accentColor} />
      <View style={{ flex: 1 }}>
        <Text style={{ color: theme.colors.textMuted, fontSize: 11 }}>Próxima parada</Text>
        <Text style={{ color: theme.colors.text, fontWeight: "600" }}>{eta.endereco}</Text>
      </View>
      <View style={{ alignItems: "flex-end", gap: 2 }}>
        <View style={styles.etaHorario}>
          <Clock size={12} color={accentColor} />
          <Text style={{ color: accentColor, fontWeight: "600", fontSize: 14 }}>
            {horarioPrevisto}
          </Text>
        </View>
        <Text style={{ color: theme.colors.textMuted, fontSize: 11 }}>{distancia}</Text>
      </View>
      {parada ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Navegar até a próxima parada"
          onPress={handleNavegar}
          style={[inicioStyles.navegarButton, { backgroundColor: theme.colors.primaryMuted }]}
        >
          <Navigation size={16} color={theme.colors.driverPrimary} />
        </Pressable>
      ) : null}
    </VehicleCard>
  );
}

/**
 * Cronômetro da viagem ativa (paridade com o Painel Web, Frente do
 * redesenho pedido pelo usuário — modelo de referência "Viagem ativa")
 * — porta exata de `TripElapsedTimer`: conta a partir de
 * `trip.iniciadaEm` (dado real do backend), pausa visualmente quando
 * a viagem está `PAUSADA`.
 */
export function TripElapsedTimer({
  iniciadaEm,
  isRunning,
  accentColor,
}: {
  iniciadaEm: string;
  isRunning: boolean;
  accentColor: string;
}): JSX.Element {
  const { theme } = useTheme();
  const [agora, setAgora] = useState(() => Date.now());

  useEffect(() => {
    if (!isRunning) return;
    const id = setInterval(() => setAgora(Date.now()), 1000);
    return () => clearInterval(id);
  }, [isRunning]);

  const decorridoMs = Math.max(0, agora - new Date(iniciadaEm).getTime());
  const totalSegundos = Math.floor(decorridoMs / 1000);
  const horas = Math.floor(totalSegundos / 3600);
  const minutos = Math.floor((totalSegundos % 3600) / 60);
  const segundos = totalSegundos % 60;
  const texto =
    horas > 0
      ? `${horas}:${String(minutos).padStart(2, "0")}:${String(segundos).padStart(2, "0")}`
      : `${minutos}:${String(segundos).padStart(2, "0")}`;

  return (
    <View style={styles.timerRow}>
      <Timer size={20} color={isRunning ? accentColor : theme.colors.textMuted} />
      <Text style={[styles.timerTexto, { color: theme.colors.text }]}>{texto}</Text>
      {!isRunning ? (
        <Text style={{ color: theme.colors.textMuted, fontSize: 12 }}>pausada</Text>
      ) : null}
    </View>
  );
}

/**
 * "Resumo da viagem" (paridade com o Painel Web) — 4 números reais:
 * Alunos embarcados (`TripStudentEvent` real), Paradas restantes
 * (calculado a partir dos eventos já registrados), Ocorrências hoje
 * (`VehicleOccurrence` do veículo, filtrado pro dia — mesma
 * aproximação honesta do web: não existe modelo de ocorrência por
 * viagem) e Mensagens (notificações não lidas reais). Sem navegação
 * cruzada de aba ainda (nenhum padrão estabelecido no app pra isso) —
 * tiles informativos, não tocáveis.
 */
export function TripStatsGrid({
  totalAlunos,
  alunosEmbarcados,
  paradasRestantes,
  veiculoId,
  accentColor,
}: {
  totalAlunos: number;
  alunosEmbarcados: number;
  paradasRestantes: number;
  veiculoId: string;
  accentColor: string;
}): JSX.Element {
  const { theme } = useTheme();
  const { data: occurrences } = useVehicleOccurrences(veiculoId);
  const { data: unreadCount } = useUnreadNotificationsCount();

  const hojeISO = new Date().toISOString().slice(0, 10);
  const ocorrenciasHoje =
    occurrences?.items.filter((item) => item.createdAt.slice(0, 10) === hojeISO).length ?? 0;

  const tiles = [
    { label: "Alunos embarcados", valor: `${alunosEmbarcados}/${totalAlunos}`, icon: Users },
    { label: "Paradas restantes", valor: String(paradasRestantes), icon: MapPin },
    { label: "Ocorrências hoje", valor: String(ocorrenciasHoje), icon: AlertTriangle },
    { label: "Mensagens", valor: String(unreadCount ?? 0), icon: MessageCircle },
  ];

  function handleSuporte(): void {
    Linking.openURL(buildWhatsAppUrl("Olá! Preciso de ajuda do suporte durante uma viagem.")).catch(
      () => {
        // Best-effort — mesmo padrão dos outros `Linking.openURL` desta tela
        // (navegação): sem app de WhatsApp instalado, não quebra a viagem.
      },
    );
  }

  return (
    <View style={styles.statsGrid}>
      {tiles.map((tile) => (
        <View
          key={tile.label}
          style={[
            styles.statsTile,
            { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
          ]}
        >
          <View style={styles.statsTileHeader}>
            <tile.icon size={16} color={accentColor} />
            <Text style={{ color: theme.colors.textMuted, fontSize: 11 }}>{tile.label}</Text>
          </View>
          <Text style={{ color: theme.colors.text, fontWeight: "700", fontSize: 16 }}>
            {tile.valor}
          </Text>
        </View>
      ))}
      {/* Paridade com o Painel Web (`TripStatsGrid` de `minha-rota/page.tsx`)
          e com o modelo de referência ("Suporte / Falar com a central",
          linha própria abaixo da grade 2x2) — faltava aqui no mobile. */}
      <Pressable
        onPress={handleSuporte}
        style={[
          styles.statsSuporteRow,
          { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
        ]}
      >
        <LifeBuoy size={18} color={accentColor} />
        <Text style={{ color: accentColor, fontWeight: "600", fontSize: 14 }}>
          Suporte: falar com a central
        </Text>
      </Pressable>
    </View>
  );
}

/**
 * "Alunos" da viagem (tela 20 da referência, "ALUNOS - MOTORISTA"):
 * abas Todos / Embarcados / Aguardando, com o status de cada aluno e o
 * horário do evento. Antes este cartão era só "Alunos a bordo" — listava
 * quem já tinha embarcado e escondia quem ainda faltava, que é
 * justamente a informação que o motorista precisa no meio da rota.
 *
 * Status vem de `TripStudentEvent` real, nunca inferido. Ausente é um
 * estado próprio (o responsável avisou), não "aguardando pra sempre".
 *
 * Usa a lista DETALHADA da rota (uma consulta com todos os nomes) em vez
 * de buscar aluno por aluno como a versão anterior fazia — eram N
 * requisições pra montar N linhas.
 */
export function AlunosDaViagemCard({
  alunos,
  eventos,
  accentColor,
}: {
  alunos: RouteStudentDetalhado[];
  eventos: TripStudentEvent[];
  accentColor: string;
}): JSX.Element | null {
  const { theme } = useTheme();
  const [aba, setAba] = useState<"todos" | "embarcados" | "aguardando">("todos");

  if (alunos.length === 0) return null;

  /**
   * `local` é o endereço da parada ONDE o evento aconteceu (pedido do
   * usuário 15/09/2026: "a linha de localização aparecerá para os
   * transportadores e para os responsáveis") — vem do backend junto do
   * evento, nunca deduzido do tipo: na volta o embarque é na escola.
   * `null` enquanto ainda não há evento, ou se a parada sumiu.
   */
  function statusDoAluno(studentId: string): {
    rotulo: string;
    tone: StatusPillTone;
    embarcado: boolean;
    pendente: boolean;
    local: string | null;
  } {
    const doAluno = eventos.filter((e) => e.studentId === studentId);
    const ausente = doAluno.find((e) => e.tipo === "AUSENTE");
    if (ausente) {
      return {
        rotulo: "Ausente",
        tone: "danger",
        embarcado: false,
        pendente: false,
        local: ausente.local ?? null,
      };
    }
    const desembarque = doAluno.find((e) => e.tipo === "DESEMBARCOU");
    if (desembarque) {
      return {
        rotulo: `Desembarcou · ${formatarHoraCurta(desembarque.processadoEm)}`,
        tone: "neutral",
        embarcado: false,
        pendente: false,
        local: desembarque.local ?? null,
      };
    }
    const embarque = doAluno.find((e) => e.tipo === "EMBARCOU");
    if (embarque) {
      return {
        rotulo: `Embarcado · ${formatarHoraCurta(embarque.processadoEm)}`,
        tone: "success",
        embarcado: true,
        pendente: false,
        local: embarque.local ?? null,
      };
    }
    return {
      rotulo: "Aguardando",
      tone: "warning",
      embarcado: false,
      pendente: true,
      local: null,
    };
  }

  const comStatus = alunos.map((aluno) => ({ aluno, status: statusDoAluno(aluno.studentId) }));
  const embarcados = comStatus.filter((i) => i.status.embarcado);
  const aguardando = comStatus.filter((i) => i.status.pendente);
  const visiveis =
    aba === "embarcados" ? embarcados : aba === "aguardando" ? aguardando : comStatus;

  const abas: { valor: typeof aba; rotulo: string; total: number }[] = [
    { valor: "todos", rotulo: "Todos", total: comStatus.length },
    { valor: "embarcados", rotulo: "Embarcados", total: embarcados.length },
    { valor: "aguardando", rotulo: "Aguardando", total: aguardando.length },
  ];

  return (
    <VehicleCard>
      <View style={inicioStyles.paradaHeader}>
        <Users size={16} color={accentColor} />
        <Text style={{ color: theme.colors.text, fontWeight: "600" }}>Alunos</Text>
      </View>

      <View style={styles.alunosAbasRow}>
        {abas.map((item) => {
          const ativa = aba === item.valor;
          return (
            <Pressable
              key={item.valor}
              onPress={() => setAba(item.valor)}
              accessibilityRole="button"
              accessibilityState={{ selected: ativa }}
              style={[
                styles.alunosAba,
                { backgroundColor: ativa ? accentColor : theme.colors.muted },
              ]}
            >
              <Text
                style={[
                  styles.alunosAbaLabel,
                  { color: ativa ? theme.colors.onPrimary : theme.colors.textMuted },
                ]}
              >
                {item.rotulo} {item.total}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {visiveis.length === 0 ? (
        <Text style={{ color: theme.colors.textMuted, fontSize: 14 }}>
          {aba === "embarcados" ? "Ninguém embarcou ainda." : "Ninguém aguardando embarque."}
        </Text>
      ) : (
        visiveis.map(({ aluno, status }) => (
          <View key={aluno.id} style={styles.alunoViagemRow}>
            <View style={styles.alunoViagemTexto}>
              <Text style={{ color: theme.colors.text }} numberOfLines={1}>
                {aluno.studentNome ?? "Aluno"}
              </Text>
              {aluno.bairro ? (
                <Text style={{ color: theme.colors.textMuted, fontSize: 12 }} numberOfLines={1}>
                  {aluno.bairro}
                </Text>
              ) : null}
              {/* Onde o evento aconteceu — só aparece depois que há um
                  evento com parada; sem isso a linha some, nunca vira "—". */}
              {status.local ? (
                <View style={styles.alunoViagemLocal}>
                  <MapPin size={11} color={theme.colors.textMuted} />
                  <Text
                    style={{ color: theme.colors.textMuted, flex: 1, fontSize: 11 }}
                    numberOfLines={1}
                  >
                    {status.local}
                  </Text>
                </View>
              ) : null}
            </View>
            <StatusPill label={status.rotulo} tone={status.tone} />
          </View>
        ))
      )}
    </VehicleCard>
  );
}

/** Hora curta (`07:05`) dos eventos de embarque/desembarque. */
function formatarHoraCurta(iso: string): string {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

/**
 * "Escolha o tipo" da tela 21 da referência ("OCORRÊNCIA - MOTORISTA").
 * A API de ocorrência não tem enum de tipo — aceita `titulo`,
 * `descricao` e `severidade` —, então cada opção preenche o título e já
 * sugere a severidade coerente, em vez de inventar um campo novo no
 * backend. "Outros" deixa o título livre, que era o comportamento
 * anterior da tela inteira.
 */
const TIPOS_OCORRENCIA: {
  titulo: string;
  severidade: VehicleOccurrenceSeverity;
  icon: typeof AlertTriangle;
}[] = [
  { titulo: "Atraso", severidade: "BAIXA", icon: Clock },
  { titulo: "Aluno ausente", severidade: "BAIXA", icon: UserX },
  { titulo: "Problema no veículo", severidade: "MEDIA", icon: Bus },
  { titulo: "Situação de segurança", severidade: "ALTA", icon: ShieldAlert },
  { titulo: "Outros", severidade: "BAIXA", icon: CircleEllipsis },
];

/**
 * "Registrar ocorrência" (3 imagens de referência anexadas pelo
 * usuário, tela do Monitor — pedido explícito "quero o mesmo design,
 * idêntico") — mesmo endpoint já usado em "Meu Veículo" (`POST
 * /vehicles/:id/occurrences`, já libera MOTORISTA/MONITOR no backend).
 *
 * Redesenho (Frente 304, paridade com o Painel Web — que trocou o
 * `Modal` por uma rota `/ocorrencia` própria): o `DriverNavigator` é um
 * Bottom Tab Navigator sem Stack aninhada em "Início", então criar uma
 * rota nova exigiria reestruturar a navegação inteira — em vez disso,
 * o MESMO `Modal` nativo do RN agora renderiza EM TELA CHEIA
 * (`transparent={false}`, cabeçalho fixo com botão de voltar), visual e
 * funcionalmente indistinguível de uma página própria pra quem usa o
 * app, sem o risco de mexer no navigator pra chegar lá.
 */
export function RegistrarOcorrenciaButton({
  veiculoId,
  accentColor,
}: {
  veiculoId: string;
  accentColor: string;
}): JSX.Element {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [isOpen, setIsOpen] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [tipoEscolhido, setTipoEscolhido] = useState<string | null>(null);
  const severidade =
    TIPOS_OCORRENCIA.find((t) => t.titulo === tipoEscolhido)?.severidade ?? "BAIXA";
  const createOccurrence = useCreateVehicleOccurrence(veiculoId);

  function fechar(): void {
    setIsOpen(false);
    setTitulo("");
    setDescricao("");
    setTipoEscolhido(null);
  }

  function escolherTipo(tipo: (typeof TIPOS_OCORRENCIA)[number]): void {
    setTipoEscolhido(tipo.titulo);
    // "Outros" continua com título livre — nos demais, o título É o tipo.
    setTitulo(tipo.titulo === "Outros" ? "" : tipo.titulo);
  }

  return (
    <>
      <VehicleButton
        label="Registrar ocorrência"
        variant="secondary"
        icon={<AlertTriangle size={16} color={accentColor} />}
        onPress={() => setIsOpen(true)}
      />

      <Modal visible={isOpen} animationType="slide" onRequestClose={fechar}>
        <View style={[styles.ocorrenciaScreen, { backgroundColor: theme.colors.background }]}>
          <View style={[styles.ocorrenciaHeader, { paddingTop: insets.top + theme.spacing[3] }]}>
            <Pressable accessibilityRole="button" accessibilityLabel="Voltar" onPress={fechar}>
              <X size={22} color={theme.colors.text} />
            </Pressable>
            <Text style={{ color: theme.colors.text, fontWeight: "700", fontSize: 20 }}>
              Ocorrência
            </Text>
          </View>

          <ScrollView contentContainerStyle={styles.ocorrenciaBody}>
            <Text style={{ color: theme.colors.textMuted, fontSize: 12 }}>Escolha o tipo</Text>
            {TIPOS_OCORRENCIA.map((tipo) => {
              const TipoIcone = tipo.icon;
              const ativo = tipoEscolhido === tipo.titulo;
              return (
                <Pressable
                  key={tipo.titulo}
                  onPress={() => escolherTipo(tipo)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: ativo }}
                  style={[
                    styles.tipoOcorrenciaRow,
                    {
                      borderColor: ativo ? accentColor : theme.colors.border,
                      backgroundColor: ativo ? theme.colors.muted : "transparent",
                    },
                  ]}
                >
                  <TipoIcone size={18} color={ativo ? accentColor : theme.colors.textMuted} />
                  <Text style={{ color: theme.colors.text, flex: 1 }}>{tipo.titulo}</Text>
                </Pressable>
              );
            })}

            {tipoEscolhido === "Outros" ? (
              <>
                <Text style={{ color: theme.colors.textMuted, fontSize: 12 }}>Título</Text>
                <TextInput
                  value={titulo}
                  onChangeText={setTitulo}
                  placeholder="Ex.: Pneu furado, aluno passou mal…"
                  style={[
                    styles.modalInput,
                    { color: theme.colors.text, borderColor: theme.colors.border },
                  ]}
                  placeholderTextColor={theme.colors.textMuted}
                />
              </>
            ) : null}

            <Text style={{ color: theme.colors.textMuted, fontSize: 12 }}>Descrição</Text>
            <TextInput
              value={descricao}
              onChangeText={setDescricao}
              multiline
              placeholder="Descreva o que aconteceu"
              style={[
                styles.modalInput,
                styles.modalTextArea,
                { color: theme.colors.text, borderColor: theme.colors.border },
              ]}
              placeholderTextColor={theme.colors.textMuted}
            />

            <VehicleButton
              label="Reportar ocorrência"
              variant="primary"
              isLoading={createOccurrence.isPending}
              onPress={() => {
                if (!titulo || !descricao) return;
                createOccurrence.mutate({ titulo, descricao, severidade }, { onSuccess: fechar });
              }}
            />
            <VehicleButton label="Cancelar" variant="secondary" onPress={fechar} />
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  absoluteFill: { ...StyleSheet.absoluteFillObject },
  alunoPreViagemHeaderRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    justifyContent: "space-between",
  },
  alunoPreViagemRow: {
    borderRadius: 12,
    flexDirection: "row",
    gap: 8,
    padding: 10,
  },
  alunoViagemLocal: { alignItems: "center", flexDirection: "row", gap: 4 },
  alunoViagemRow: { alignItems: "center", flexDirection: "row", gap: 8, paddingVertical: 6 },
  alunoViagemTexto: { flex: 1, gap: 2 },
  alunosAba: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  alunosAbaLabel: { fontSize: 12, fontWeight: "600" },
  alunosAbasRow: { flexDirection: "row", gap: 8 },
  etaCard: { alignItems: "center", flexDirection: "row", gap: 12 },
  etaHorario: { alignItems: "center", flexDirection: "row", gap: 4 },
  mapa: { borderRadius: 12, height: 180, overflow: "hidden" },
  mapaVazio: { alignItems: "center", gap: 8, height: 180, justifyContent: "center" },
  mapaVazioFill: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    gap: 8,
    justifyContent: "center",
    padding: 16,
  },
  modalInput: {
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
    padding: 10,
  },
  modalTextArea: { minHeight: 80, textAlignVertical: "top" },
  ocorrenciaBody: { gap: 4, padding: 16 },
  ocorrenciaHeader: {
    flexDirection: "row",
    gap: 12,
    paddingBottom: 12,
    paddingHorizontal: 16,
  },
  ocorrenciaScreen: { flex: 1 },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  statsSuporteRow: {
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1,
    flexBasis: "100%",
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    padding: 12,
  },
  statsTile: {
    borderRadius: 16,
    borderWidth: 1,
    flexBasis: "47%",
    flexGrow: 1,
    gap: 4,
    padding: 12,
  },
  statsTileHeader: { alignItems: "center", flexDirection: "row", gap: 6 },
  timerRow: { alignItems: "center", flexDirection: "row", gap: 8 },
  timerTexto: { fontSize: 26, fontVariant: ["tabular-nums"], fontWeight: "700" },
  tipoOcorrenciaRow: {
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
});
