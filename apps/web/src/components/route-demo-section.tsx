"use client";

import { Bus, MapPin, Pause, Play, RotateCcw, School } from "@rotta/icons";
import { RottaMap, type RottaMapMarker } from "@rotta/maps/web";
import { Badge, Button, Card, Typography } from "@rotta/ui/web";
import { useEffect, useMemo, useRef, useState } from "react";

interface DemoStop {
  id: string;
  nome: string;
  latitude: number;
  longitude: number;
  tipo: "garagem" | "embarque" | "escola";
}

/**
 * Pontos de exemplo (Pinheiros, São Paulo — nenhuma relação com um
 * cliente real) formando um trajeto plausível: garagem → 2 embarques →
 * escola. Só ilustrativo (ver aviso na UI); nunca chama o backend.
 */
const DEMO_ROUTE: DemoStop[] = [
  {
    id: "garagem",
    nome: "Saída — Garagem Rotta",
    latitude: -23.5629,
    longitude: -46.6979,
    tipo: "garagem",
  },
  {
    id: "aluno-1",
    nome: "João — Rua Girassol, 210",
    latitude: -23.5615,
    longitude: -46.69,
    tipo: "embarque",
  },
  {
    id: "aluno-2",
    nome: "Maria — Av. Rebouças, 1450",
    latitude: -23.5661,
    longitude: -46.6822,
    tipo: "embarque",
  },
  {
    id: "escola",
    nome: "Escola Girassol",
    latitude: -23.5601,
    longitude: -46.675,
    tipo: "escola",
  },
];

const SEGMENT_MS = 4200;
const STOP_PAUSE_MS = 1600;

interface DemoEvent {
  id: string;
  texto: string;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function eventoParaStop(stop: DemoStop): string {
  if (stop.tipo === "escola") return `Chegada — desembarque na ${stop.nome}`;
  if (stop.tipo === "embarque") return `Embarque confirmado — ${stop.nome.split(" — ")[0]}`;
  return "Viagem iniciada";
}

/**
 * Demonstração interativa do "localizador"/mapa/GPS (briefing "MAPA" +
 * GPS-01/02/03/06) direto na Landing Page — para tirar a dúvida
 * genuína de "isso funciona de verdade?" antes mesmo de criar conta.
 * Anima um veículo de exemplo percorrendo uma rota fixa (dados 100%
 * ilustrativos, nunca chama a API) sobre o MESMO componente de mapa
 * (`@rotta/maps/web`, MapLibre/OpenStreetMap) usado pelo produto real
 * em `/veiculos/mapa` e no app do Responsável — a experiência aqui é
 * literalmente a mesma tecnologia, só com dados de exemplo em vez de
 * uma viagem real.
 */
export function RouteDemoSection(): JSX.Element {
  const [isPlaying, setIsPlaying] = useState(true);
  const [segmentIndex, setSegmentIndex] = useState(0);
  const [phase, setPhase] = useState<"moving" | "paused">("moving");
  const [segmentProgress, setSegmentProgress] = useState(0);
  const [events, setEvents] = useState<DemoEvent[]>([{ id: "start-0", texto: "Viagem iniciada" }]);

  const phaseStartRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    function tick(now: number): void {
      if (!isPlaying) {
        phaseStartRef.current = null;
        rafRef.current = requestAnimationFrame(tick);
        return;
      }
      if (phaseStartRef.current === null) phaseStartRef.current = now;
      const elapsed = now - phaseStartRef.current;

      if (phase === "moving") {
        const progress = Math.min(elapsed / SEGMENT_MS, 1);
        setSegmentProgress(progress);
        if (progress >= 1) {
          const chegou = DEMO_ROUTE[segmentIndex + 1]!;
          setEvents((prev) => [
            { id: `${chegou.id}-${prev.length}`, texto: eventoParaStop(chegou) },
            ...prev,
          ]);
          setPhase("paused");
          phaseStartRef.current = now;
        }
      } else {
        if (elapsed >= STOP_PAUSE_MS) {
          const proximo = segmentIndex + 1;
          if (proximo >= DEMO_ROUTE.length - 1) {
            // Fim da rota — reinicia como um novo dia de viagem.
            setSegmentIndex(0);
            setSegmentProgress(0);
            setEvents([{ id: `start-${Date.now()}`, texto: "Viagem iniciada" }]);
          } else {
            setSegmentIndex(proximo);
            setSegmentProgress(0);
          }
          setPhase("moving");
          phaseStartRef.current = now;
        }
      }

      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- o loop lê `phase`/`segmentIndex`/`isPlaying` via closure recriada a cada render, propositalmente (evita reimplementar com refs para um componente só ilustrativo).
  }, [isPlaying, phase, segmentIndex]);

  const de = DEMO_ROUTE[segmentIndex]!;
  const para = DEMO_ROUTE[segmentIndex + 1]!;
  const veiculoPos = {
    latitude: lerp(de.latitude, para.latitude, segmentProgress),
    longitude: lerp(de.longitude, para.longitude, segmentProgress),
  };

  const markers = useMemo<RottaMapMarker[]>(
    () => [
      ...DEMO_ROUTE.map((stop) => ({
        id: stop.id,
        titulo: stop.nome,
        latitude: stop.latitude,
        longitude: stop.longitude,
      })),
      { id: "veiculo-demo", titulo: "Van — exemplo", ...veiculoPos },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `veiculoPos` muda todo frame de propósito (é a posição animada).
    [veiculoPos.latitude, veiculoPos.longitude],
  );

  const routeLine = useMemo(
    () => DEMO_ROUTE.map((stop) => ({ latitude: stop.latitude, longitude: stop.longitude })),
    [],
  );

  function reiniciar(): void {
    setSegmentIndex(0);
    setSegmentProgress(0);
    setPhase("moving");
    phaseStartRef.current = null;
    setEvents([{ id: `start-${Date.now()}`, texto: "Viagem iniciada" }]);
    setIsPlaying(true);
  }

  return (
    <section className="w-full bg-surface px-6 py-24">
      <div className="mx-auto w-full max-w-6xl">
        <div className="mb-10 flex flex-col items-center gap-3 text-center">
          <Badge variant="info">Demonstração interativa</Badge>
          <Typography variant="headline" as="h2">
            Veja o localizador funcionando agora
          </Typography>
          <Typography variant="body" color="muted" className="max-w-2xl">
            Um exemplo simulado — mesmo mapa e mesma tecnologia do produto real (MapLibre/
            OpenStreetMap), com dados de exemplo em vez de uma viagem de verdade. Assim que sua
            empresa cadastra uma rota, isto é exatamente o que aparece com o veículo real em
            movimento.
          </Typography>
        </div>

        <Card>
          <Card.Body className="flex flex-col gap-4 lg:flex-row">
            <div className="relative h-[360px] w-full overflow-hidden rounded-xl lg:h-[420px] lg:flex-[1.4]">
              <RottaMap markers={markers} route={routeLine} initialZoom={13.5} />
              <div className="pointer-events-none absolute left-4 right-4 top-4 flex justify-between">
                <Badge variant="neutral">
                  <span className="flex items-center gap-1.5">
                    <Bus className="h-3.5 w-3.5" />
                    Exemplo — não é uma viagem real
                  </span>
                </Badge>
              </div>
              <div className="absolute bottom-4 left-4 right-4 rounded-xl border border-border bg-card/95 p-4 backdrop-blur">
                <div className="flex items-center gap-2">
                  {para.tipo === "escola" ? (
                    <School className="h-4 w-4 text-primary" />
                  ) : (
                    <MapPin className="h-4 w-4 text-primary" />
                  )}
                  <Typography variant="caption" color="muted">
                    {phase === "moving" ? "A caminho de" : "Parado em"}
                  </Typography>
                </div>
                <Typography variant="subtitle" className="mt-0.5">
                  {para.nome}
                </Typography>
              </div>
            </div>

            <div className="flex flex-1 flex-col gap-4">
              <div className="flex items-center justify-between">
                <Typography variant="subtitle">Linha do tempo da viagem</Typography>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={isPlaying ? "Pausar demonstração" : "Retomar demonstração"}
                    onClick={() => setIsPlaying((prev) => !prev)}
                  >
                    {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label="Reiniciar demonstração"
                    onClick={reiniciar}
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <ul className="flex max-h-[300px] flex-col gap-2 overflow-y-auto lg:max-h-[340px]">
                {events.map((event, index) => (
                  <li
                    key={event.id}
                    className="flex items-start gap-2 rounded-lg border border-border bg-background px-3 py-2"
                  >
                    <span
                      className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${
                        index === 0 ? "bg-primary" : "bg-border-strong"
                      }`}
                    />
                    <Typography variant="bodySmall" color={index === 0 ? undefined : "muted"}>
                      {event.texto}
                    </Typography>
                  </li>
                ))}
              </ul>

              <Typography variant="caption" color="muted" className="mt-auto">
                Cada evento acima é a mesma notificação que a família recebe de verdade no app —
                embarque, ausência e chegada — só que aqui simulada, sem enviar nada a ninguém.
              </Typography>
            </div>
          </Card.Body>
        </Card>
      </div>
    </section>
  );
}
