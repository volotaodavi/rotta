"use client";

import { AlertTriangle, LifeBuoy, MapPin, MessageCircle, Users } from "@rotta/icons";
import { Typography } from "@rotta/ui/web";
import Link from "next/link";

import type { RoleAccent } from "@/features/minha-rota/labels";
import type { Route as NextRoute } from "next";

import { DRIVER_SUPPORT_WHATSAPP_MESSAGE } from "@/features/minha-rota/labels";
import { useUnreadNotificationsCount } from "@/features/notifications/hooks/use-notifications";
import { useVehicleOccurrences } from "@/features/vehicles/hooks/use-vehicles";
import { buildWhatsAppUrl } from "@/lib/site-config";

/**
 * "Resumo da viagem" — 4 números reais durante a operação (modelo de
 * referência "Viagem ativa": Alunos Embarcados/Ocorrências/Paradas
 * restantes/Mensagens). Nenhum é inventado:
 * - Alunos embarcados: contagem real de `TripStudentEvent` tipo
 *   `EMBARCOU` desta viagem.
 * - Paradas restantes: paradas cujos alunos ainda não têm os eventos
 *   esperados nelas (embarque OU desembarque, conforme o papel da
 *   parada pra cada aluno).
 * - Ocorrências hoje: `VehicleOccurrence` do veículo desta viagem,
 *   registradas hoje (o modelo não amarra ocorrência a uma `Trip`
 *   específica — "hoje" é a aproximação honesta mais próxima).
 * - Mensagens: notificações não lidas do próprio motorista/monitor
 *   (`useUnreadNotificationsCount`, a mesma Central de Notificações,
 *   não existe uma feature de chat separada na Rotta hoje).
 */
export function TripStatsGrid({
  totalAlunos,
  alunosEmbarcados,
  paradasRestantes,
  veiculoId,
  accent,
}: {
  totalAlunos: number;
  alunosEmbarcados: number;
  paradasRestantes: number;
  veiculoId: string;
  accent: RoleAccent;
}): JSX.Element {
  const { data: occurrences } = useVehicleOccurrences(veiculoId, 1, 50);
  const { data: unreadCount } = useUnreadNotificationsCount();

  const hojeISO = new Date().toISOString().slice(0, 10);
  const ocorrenciasHoje =
    occurrences?.items.filter((item) => item.createdAt.slice(0, 10) === hojeISO).length ?? 0;

  const tiles: { label: string; valor: string; icon: JSX.Element; href: NextRoute }[] = [
    {
      label: "Alunos embarcados",
      valor: `${alunosEmbarcados}/${totalAlunos}`,
      icon: <Users size={18} className={accent.text} />,
      href: "/minha-rota",
    },
    {
      label: "Paradas restantes",
      valor: String(paradasRestantes),
      icon: <MapPin size={18} className={accent.text} />,
      href: "/minha-rota",
    },
    {
      label: "Ocorrências hoje",
      valor: String(ocorrenciasHoje),
      icon: <AlertTriangle size={18} className="text-warning" />,
      href: "/veiculo",
    },
    {
      label: "Mensagens",
      valor: String(unreadCount ?? 0),
      icon: <MessageCircle size={18} className={accent.text} />,
      href: "/notificacoes",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-2.5">
      {tiles.map((tile) => (
        <Link
          key={tile.label}
          href={tile.href}
          className={`flex flex-col gap-1 rounded-2xl border border-border bg-surface p-3 transition-colors hover:${accent.border}`}
        >
          <div className="flex items-center gap-1.5">
            {tile.icon}
            <Typography variant="caption" color="muted">
              {tile.label}
            </Typography>
          </div>
          <Typography variant="subtitle" className="leading-none">
            {tile.valor}
          </Typography>
        </Link>
      ))}
      <a
        href={buildWhatsAppUrl(DRIVER_SUPPORT_WHATSAPP_MESSAGE)}
        target="_blank"
        rel="noopener noreferrer"
        className={`col-span-2 flex items-center justify-center gap-2 rounded-2xl border border-border bg-surface p-3 ${accent.text} transition-colors hover:${accent.border}`}
      >
        <LifeBuoy size={18} />
        <Typography variant="bodySmall" className={`font-semibold ${accent.text}`}>
          Suporte: falar com a central
        </Typography>
      </a>
    </div>
  );
}
