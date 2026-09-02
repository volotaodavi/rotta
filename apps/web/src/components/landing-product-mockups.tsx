import {
  AlertTriangle,
  Bus,
  CheckCircle2,
  ClipboardList,
  MapPin,
  Navigation,
  Route as RouteIcon,
  Users,
} from "@rotta/icons";
import { Typography } from "@rotta/ui/web";

/**
 * Mockups de produto da seção "Conheça a interface" (pedido do usuário
 * 02/09/2026: "utilize mockups reais da aplicação... se não existirem
 * screenshots, crie os mockups utilizando HTML/CSS com aparência de
 * aplicativo real, seguindo a interface já estabelecida"). Não existe
 * nenhum screenshot exportado do app no repositório — construídos aqui
 * em CSS reproduzindo a estrutura REAL de cada tela (mesmos elementos
 * do Modo Operacional do Motorista, do acompanhamento do Responsável e
 * do painel da Empresa, já implementados em `apps/mobile`/`apps/web`),
 * nunca um dashboard genérico de banco de imagens. Dados de exemplo
 * (nomes/horários), nunca um cliente real.
 */

function PhoneFrame({ children }: { children: React.ReactNode }): JSX.Element {
  return (
    <div className="w-[260px] rounded-[36px] border-[6px] border-text bg-text p-1.5 shadow-2xl sm:w-[280px]">
      <div className="overflow-hidden rounded-[28px] bg-background">
        <div className="flex justify-center pb-1 pt-2.5">
          <div className="h-1 w-10 rounded-full bg-border" />
        </div>
        {children}
      </div>
    </div>
  );
}

/** Modo Operacional do Motorista — mapa, próxima parada, alunos embarcados, status da viagem. */
export function MotoristaMockup(): JSX.Element {
  return (
    <PhoneFrame>
      <div className="flex flex-col gap-3 px-3.5 pb-4">
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-success/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.06em] text-success">
            <span className="h-1.5 w-1.5 rounded-full bg-success" aria-hidden="true" />
            Em andamento
          </span>
          <Typography variant="caption" color="muted">
            Rota 12 · Manhã
          </Typography>
        </div>

        <div className="relative h-32 overflow-hidden rounded-2xl bg-primary-muted">
          <svg viewBox="0 0 240 128" className="h-full w-full" aria-hidden="true">
            <path
              d="M 16 108 C 60 96, 90 70, 120 58 S 190 30, 224 20"
              className="stroke-primary"
              strokeWidth={4}
              strokeLinecap="round"
              fill="none"
            />
            <circle cx={16} cy={108} r={5} className="fill-text/30" />
            <circle cx={120} cy={58} r={5} className="fill-text/30" />
            <circle cx={224} cy={20} r={6} className="fill-primary" />
          </svg>
          <div className="absolute right-2.5 top-2.5 flex h-7 w-7 items-center justify-center rounded-full bg-card text-primary shadow-md">
            <Navigation className="h-3.5 w-3.5" />
          </div>
        </div>

        <div className="flex items-center gap-2.5 rounded-xl border border-border bg-card px-3 py-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <MapPin className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <Typography variant="caption" color="muted">
              Próxima parada
            </Typography>
            <Typography variant="bodySmall" className="truncate font-semibold">
              Rua das Acácias, 420
            </Typography>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2 rounded-lg bg-success/10 px-2.5 py-2">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-success text-[9px] font-bold text-white">
              ML
            </span>
            <Typography variant="caption" className="flex-1 truncate font-medium">
              Maria Laura
            </Typography>
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-success" />
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-muted px-2.5 py-2">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-text-muted/30 text-[9px] font-bold text-text">
              PS
            </span>
            <Typography variant="caption" color="muted" className="flex-1 truncate font-medium">
              Pedro Souza
            </Typography>
            <Typography variant="caption" color="muted" className="shrink-0">
              Aguardando
            </Typography>
          </div>
        </div>

        <div className="mt-1 flex items-center justify-center rounded-full bg-primary py-3 text-[13px] font-semibold text-white">
          Deslize para finalizar
        </div>
      </div>
    </PhoneFrame>
  );
}

/** Acompanhamento do Responsável — mapa, localização do transporte, previsão de chegada, notificação. */
export function ResponsavelMockup(): JSX.Element {
  return (
    <PhoneFrame>
      <div className="flex flex-col gap-3 px-3.5 pb-4">
        <Typography variant="bodySmall" className="font-semibold">
          Transporte da Maria Laura
        </Typography>

        <div className="relative h-36 overflow-hidden rounded-2xl bg-primary-muted">
          <svg viewBox="0 0 240 144" className="h-full w-full" aria-hidden="true">
            <path
              d="M 20 20 C 70 40, 100 60, 140 78 S 200 110, 220 124"
              className="stroke-primary"
              strokeWidth={4}
              strokeDasharray="1 8"
              strokeLinecap="round"
              fill="none"
            />
            <circle cx={20} cy={20} r={5} className="fill-text/30" />
            <path
              d="M140 66c-6 0-11 5-11 11 0 8 11 18 11 18s11-10 11-18c0-6-5-11-11-11z"
              className="fill-primary"
            />
          </svg>
          <div className="absolute bottom-2.5 left-2.5 right-2.5 rounded-xl bg-card/95 px-3 py-2 shadow-md backdrop-blur">
            <Typography variant="caption" color="muted">
              Chegada prevista
            </Typography>
            <Typography variant="bodySmall" className="font-semibold">
              07:52
            </Typography>
          </div>
        </div>

        <div className="flex items-center gap-2.5 rounded-xl border border-border bg-card px-3 py-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-success/10 text-success">
            <CheckCircle2 className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <Typography variant="bodySmall" className="truncate font-semibold">
              Embarcou às 07:15
            </Typography>
            <Typography variant="caption" color="muted">
              Notificação automática
            </Typography>
          </div>
        </div>

        <div className="flex items-center gap-2.5 rounded-xl bg-muted px-3 py-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Bus className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <Typography variant="caption" color="muted">
              Motorista
            </Typography>
            <Typography variant="bodySmall" className="truncate font-semibold">
              Carlos Alberto
            </Typography>
          </div>
        </div>
      </div>
    </PhoneFrame>
  );
}

/** Painel da transportadora — organização da operação: rotas, viagens, motoristas, monitores, alunos. */
export function TransportadoraMockup(): JSX.Element {
  const linhas = [
    {
      rota: "Rota 12 · Manhã",
      motorista: "Carlos Alberto",
      status: "Em andamento",
      tone: "success" as const,
    },
    {
      rota: "Rota 04 · Manhã",
      motorista: "Fernanda Lima",
      status: "Concluída",
      tone: "muted" as const,
    },
    {
      rota: "Rota 08 · Tarde",
      motorista: "Sem motorista",
      status: "Pendente",
      tone: "warning" as const,
    },
  ];
  return (
    <div className="w-[340px] overflow-hidden rounded-2xl border border-border bg-card shadow-2xl sm:w-[420px]">
      <div className="flex items-center gap-1.5 border-b border-border bg-muted px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-border-strong" />
        <span className="h-2.5 w-2.5 rounded-full bg-border-strong" />
        <span className="h-2.5 w-2.5 rounded-full bg-border-strong" />
      </div>
      <div className="flex flex-col gap-4 p-5">
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Rotas ativas", value: "12", icon: RouteIcon },
            { label: "Motoristas", value: "9", icon: Users },
            { label: "Ocorrências", value: "1", icon: AlertTriangle },
          ].map((item) => (
            <div key={item.label} className="rounded-xl border border-border p-3">
              <item.icon className="h-4 w-4 text-primary" />
              <Typography variant="title" className="mt-2 block">
                {item.value}
              </Typography>
              <Typography variant="caption" color="muted">
                {item.label}
              </Typography>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-text-muted" />
            <Typography
              variant="caption"
              color="muted"
              className="font-semibold uppercase tracking-[0.05em]"
            >
              Viagens de hoje
            </Typography>
          </div>
          {linhas.map((linha) => (
            <div
              key={linha.rota}
              className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5"
            >
              <div className="min-w-0">
                <Typography variant="bodySmall" className="truncate font-semibold">
                  {linha.rota}
                </Typography>
                <Typography variant="caption" color="muted" className="truncate">
                  {linha.motorista}
                </Typography>
              </div>
              <span
                className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium ${
                  linha.tone === "success"
                    ? "bg-success/10 text-success"
                    : linha.tone === "warning"
                      ? "bg-warning/10 text-warning"
                      : "bg-muted text-text-muted"
                }`}
              >
                {linha.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
