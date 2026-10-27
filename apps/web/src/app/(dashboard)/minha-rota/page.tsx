"use client";

import { useAuth } from "@rotta/auth/web";
import { Card, PanelGreeting, Spinner, Typography } from "@rotta/ui/web";
import { useEffect, useMemo, useState } from "react";

import { useMinhasRotas } from "@/features/driver/hooks/use-driver-routes";
import { MeuMapa } from "@/features/minha-rota/components/meu-mapa";
import { RotaOperacional } from "@/features/minha-rota/components/rota-operacional";
import { TURNO_LABEL } from "@/features/minha-rota/labels";
import { useMyLocation } from "@/hooks/use-my-location";

/**
 * "Minha Rota" — home operacional do Modo Ação (Frente G, pedido do
 * usuário em produção). Porta do "Início" real do app mobile
 * (`apps/mobile/src/features/driver/screens/inicio-screen.tsx`) para o
 * Painel Web — existe porque Motorista/Monitor autônomo/MEI É o próprio
 * `role: "empresa"` (dono = motorista, ver `CompanyType.AUTONOMO`/`MEI`)
 * e por isso é o único perfil que precisa rodar a viagem de dentro do
 * mesmo painel que já usa pra gestão. Motorista/Monitor FUNCIONÁRIO de
 * uma empresa maior também usa esta mesma página desde a Frente H — o
 * backend já escopava por `motoristaPadraoId`/`monitorPadraoId`
 * independente de quem é dono, só faltava apontar a navegação pra ele.
 *
 * Mesma UX do mobile: sem rota atribuída = mensagem honesta; múltiplas
 * rotas = escolher; uma rota = já cai na operação. GPS só liga enquanto
 * a viagem está `EM_ANDAMENTO` (`useTripGpsReporting`), e só o
 * Motorista (nunca o Monitor) inicia/pausa/finaliza.
 *
 * O MAPA (Frente I, pedido do usuário em produção — "deve aparecer
 * mesmo sem estar em uma rota, baseada na localização do próprio
 * telefone, pelo menos para visualização... vale tanto para autônomo,
 * MEI, motorista e monitor") aparece em TODO estado desta tela: sem
 * rota atribuída, escolhendo entre várias rotas, e como respaldo
 * dentro da operação enquanto as paradas ainda não carregaram — usando
 * a posição do telefone (`useMyLocation`) sempre que não há paradas de
 * rota pra mostrar em vez disso.
 *
 * Redesenho (Frente 302/303 — 3 imagens de referência anexadas pelo
 * usuário, Responsável/Motorista/Monitor, pedido explícito "quero o
 * mesmo design, idêntico... com usabilidades, funcionando"): o mapa
 * passou de tela cheia com cartões flutuando por cima (Frente P4) para
 * um CARTÃO compacto no topo de uma página que rola normalmente — igual
 * às 3 referências, nenhuma delas mostra o mapa ocupando a tela toda.
 * O botão deslizante estilo Uber (`SlideToAction`, Frente P3) tinha
 * saído desta tela quando as 3 referências chegaram (mostravam sempre
 * um botão comum) — voltou depois que o usuário reafirmou o pedido
 * explicitamente ("com o botão deslizante para iniciar a viagem e
 * finalizar também"): hoje só cobre iniciar/encerrar a viagem
 * (ações irreversíveis em produção); pausar/retomar continuam botão
 * comum, por serem reversíveis.
 * "Registrar ocorrência" (tela do Monitor) virou uma página cheia
 * própria (`/ocorrencia`) em vez de abrir um `Modal` por cima — mesma
 * ideia da referência, que mostra "Ocorrência" como tela dedicada.
 */
export default function MinhaRotaPage(): JSX.Element {
  const { user } = useAuth();

  const { data: rotasResult, isLoading } = useMinhasRotas();
  const rotas = useMemo(() => rotasResult?.items ?? [], [rotasResult]);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedRouteId && rotas.length === 1 && rotas[0]) setSelectedRouteId(rotas[0].id);
  }, [rotas, selectedRouteId]);

  // Só liga fora da operação (nenhuma rota escolhida ainda) — dentro
  // de `RotaOperacional` existe uma segunda chamada própria, ligada só
  // quando faltam paradas pra mostrar. As duas nunca ficam ativas ao
  // mesmo tempo (são componentes diferentes, montados um de cada vez).
  const rotaAtiva = selectedRouteId ? rotas.find((r) => r.id === selectedRouteId) : null;
  const minhaLocalizacao = useMyLocation(!isLoading && !rotaAtiva);

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size="lg" />
      </div>
    );
  }

  if (rotas.length === 0) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
        <PanelGreeting nome={user?.nome ?? ""} />
        <div>
          <Typography variant="title">Nenhuma rota atribuída</Typography>
          <Typography variant="bodySmall" color="muted">
            {/*
              Antes esta frase mandava "cadastrar uma rota em 'Rotas' na
              Visão completa" — não existe (nem nunca existiu) nenhuma
              página de gestão de Rotas no Painel Web, só a operação em
              "Minha Rota" (esta tela). Corrigido pra não apontar pra um
              lugar que não existe — quem cadastra uma rota é sempre o
              suporte Rotta.
            */}
            Você ainda não está vinculado a nenhuma rota. Fale com o suporte Rotta ou com sua
            transportadora para vincular uma rota a você.
          </Typography>
        </div>
        <Card variant="driver" className="overflow-hidden">
          <div className="h-52 w-full">
            <MeuMapa location={minhaLocalizacao.location} status={minhaLocalizacao.status} fill />
          </div>
        </Card>
      </div>
    );
  }

  if (!rotaAtiva) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
        <PanelGreeting nome={user?.nome ?? ""} />
        <Typography variant="title">Suas rotas</Typography>
        {rotas.map((rota) => (
          <Card
            key={rota.id}
            variant="driver"
            interactive
            onClick={() => setSelectedRouteId(rota.id)}
          >
            <Card.Body className="flex items-center justify-between">
              <Typography variant="subtitle">{rota.nome}</Typography>
              <Typography variant="bodySmall" color="muted">
                {TURNO_LABEL[rota.turno] ?? rota.turno}
              </Typography>
            </Card.Body>
          </Card>
        ))}
        <Card variant="driver" className="overflow-hidden">
          <div className="h-52 w-full">
            <MeuMapa location={minhaLocalizacao.location} status={minhaLocalizacao.status} fill />
          </div>
        </Card>
      </div>
    );
  }

  return (
    <RotaOperacional
      rota={rotaAtiva}
      showTrocarRota={rotas.length > 1}
      onTrocarRota={() => setSelectedRouteId(null)}
    />
  );
}
