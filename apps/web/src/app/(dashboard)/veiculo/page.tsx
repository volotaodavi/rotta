"use client";

import { useAuth } from "@rotta/auth/web";
import { Card, PanelGreeting, Spinner, Typography } from "@rotta/ui/web";

import { VehicleStatusBadge } from "@/features/vehicles/components/vehicle-status-badge";
import { useMyVehicle } from "@/features/vehicles/hooks/use-vehicles";
import { VEHICLE_TYPE_LABEL } from "@/features/vehicles/labels";

/**
 * "Meu Veículo" (Frente O) — porta de `apps/mobile/.../meu-veiculo-
 * screen.tsx` (tarefa #59) pro Painel Web: faltava desde sempre porque
 * o Painel Web nunca tinha uma navegação dedicada pro motorista/monitor
 * funcionário/autônomo/MEI além de "Minha Rota" — agora é uma das 4
 * abas da barra reduzida ((dashboard)/layout.tsx, pedido do usuário
 * com imagem de referência: "Home/Activities/Car/Profile").
 *
 * `useMyVehicle` (`GET /vehicles/me`) já existia pronto no backend —
 * só nunca tinha sido consumido por este app. Mostra só o resumo (foto,
 * placa, modelo, status, capacidade, km) — as sub-telas do mobile
 * (Fotos/Documentos/Histórico/Ocorrências/Checklist) não têm
 * equivalente aqui ainda; nenhum atalho fica apontando pra uma página
 * que não existe (mesmo princípio de "nunca fabricar link morto" já
 * usado nos atalhos do painel de Empresa, Frente L).
 */
export default function MeuVeiculoPage(): JSX.Element {
  const { user } = useAuth();
  const { data: vehicle, isLoading, isError } = useMyVehicle();

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <PanelGreeting nome={user?.nome ?? ""} />

      <div>
        <Typography variant="title">Meu veículo</Typography>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : isError ? (
        <Typography variant="bodySmall" color="danger">
          Não foi possível carregar seu veículo. Tente novamente mais tarde.
        </Typography>
      ) : !vehicle ? (
        <Typography variant="bodySmall" color="muted">
          Você ainda não está vinculado a nenhum veículo. Fale com sua transportadora.
        </Typography>
      ) : (
        <Card>
          {vehicle.fotoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- foto vem de URL externa (upload do usuário), sem domínio fixo pra configurar em `next/image`.
            <img
              src={vehicle.fotoUrl}
              alt={`${vehicle.modelo} — ${vehicle.placa}`}
              className="h-48 w-full rounded-t-lg object-cover"
            />
          ) : null}
          <Card.Body className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <Typography variant="subtitle">{vehicle.placa}</Typography>
              <VehicleStatusBadge status={vehicle.status} />
            </div>
            <Typography variant="bodySmall" color="muted">
              {vehicle.modelo} {vehicle.marca ? `— ${vehicle.marca}` : ""} ·{" "}
              {VEHICLE_TYPE_LABEL[vehicle.tipo]}
            </Typography>
            <Typography variant="bodySmall" color="muted">
              Capacidade: {vehicle.capacidadePassageiros} passageiros ·{" "}
              {vehicle.quilometragemAtual.toLocaleString("pt-BR")} km
            </Typography>
          </Card.Body>
        </Card>
      )}
    </div>
  );
}
