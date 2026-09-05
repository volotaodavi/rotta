"use client";

import { ApiError } from "@rotta/api-client";
import { useAuth } from "@rotta/auth/web";
import { Button, Card, FormField, Input, Select, Typography } from "@rotta/ui/web";
import { useEffect, useState, type FormEvent } from "react";

import { RouteDetailClient } from "../[id]/_components/route-detail-client";

import type { CreateRouteInput, RouteWeekday, SchoolShift } from "@rotta/api-client";

import { useCreateRoute } from "@/features/routes/hooks/use-routes";
import { ROUTE_WEEKDAY_LABEL } from "@/features/routes/labels";
import { SCHOOL_SHIFT_LABEL } from "@/features/schools/labels";
import { useMyTeam } from "@/features/team/hooks/use-team";
import { useVehiclesList } from "@/features/vehicles/hooks/use-vehicles";

const WEEKDAYS: RouteWeekday[] = [
  "SEGUNDA",
  "TERCA",
  "QUARTA",
  "QUINTA",
  "SEXTA",
  "SABADO",
  "DOMINGO",
];
const SHIFTS: SchoolShift[] = ["MANHA", "TARDE", "INTEGRAL", "NOITE", "PERSONALIZADO"];

const INITIAL_STATE: CreateRouteInput = {
  nome: "",
  turno: "MANHA",
  diasSemana: ["SEGUNDA", "TERCA", "QUARTA", "QUINTA", "SEXTA"],
};

/**
 * Passo 1 do assistente "Criar rota" (pedido do usuário, fluxo novo:
 * "Gerou uma rota -> adicionar alunos -> concluir rota"). Dados básicos
 * aqui; paradas e alunos ficam em `/rotas/[id]` (passos seguintes),
 * pra onde esta tela navega assim que a rota é criada.
 *
 * Motorista/monitor/veículo padrão são escolhidos entre os já
 * vinculados a esta empresa (`useMyTeam`/`useVehiclesList`) — nunca
 * digitados, nunca inventados. A rota nasce `PAUSADA` (default do
 * backend, propositalmente: sem parada nem aluno ainda não faz sentido
 * ela aparecer em "Minhas Rotas" pra ninguém), mas essa etapa é 100%
 * automática — o usuário nunca precisa de um clique manual separado
 * pra "ativar": basta adicionar ao menos uma parada e um aluno na
 * próxima etapa que o backend já vira `ATIVA` sozinho
 * (`RoutesService.addStudent`).
 *
 * Motorista/monitor autônomo/MEI (pedido do usuário: "no modo ação
 * também aparece essa opção"): quem cadastra uma empresa AUTONOMO/MEI
 * recebe `Membership.role = "empresa"`, nunca "motorista" (mesmo
 * princípio documentado em `useAppMode`: "dono que também dirige") —
 * por isso nunca aparece na lista de `useMyTeam()`
 * (`papel === "motorista"`). Backend
 * (`RoutesService.assertValidDefaultResources`) já aceita o próprio
 * dono AUTONOMO/MEI como `motoristaPadraoId`; aqui a tela reconhece
 * esse caso e nem pergunta — autopreenche o próprio usuário e some com
 * o campo de seleção.
 *
 * ACHADO REAL — bug de infraestrutura do próprio Next.js, não da nossa
 * conta/dado (o usuário confirmou: acontece em QUALQUER conta, não só
 * numa específica): tanto `window.location.href` (recarga completa)
 * quanto `router.push` (navegação client-side) pro `/rotas/[id]` de uma
 * rota RECÉM-CRIADA — ou seja, o PRIMEIRO acesso a esse segmento
 * dinâmico exato, nunca renderizado antes neste deploy — disparam,
 * intermitente mas repetidamente em produção (só na Vercel, nunca
 * localmente), um erro interno indeterminístico do motor de Server
 * Components/Suspense do App Router (investigação extensa, ver o
 * histórico em `rotas/[id]/_components/route-detail-client.tsx` e
 * `section-error-boundary.tsx` — múltiplas causas reais já corrigidas
 * uma a uma, nenhuma bastou sozinha porque a raiz vive dentro do
 * próprio Next, fora do nosso alcance de correção).
 *
 * Como criar rota é a funcionalidade central do produto, a solução aqui
 * é CONTORNAR o gatilho, não tentar consertar o motor interno do Next:
 * depois de criar a rota, em vez de NAVEGAR pro segmento dinâmico
 * `/rotas/[id]` (o que sempre dispara o bug pra um ID novo), esta MESMA
 * página passa a mostrar `RouteDetailClient` (paradas, alunos, Rotta
 * Route AI, concluir rota — o mesmo componente que `/rotas/[id]` usa)
 * embutido aqui, sem trocar de URL nem de segmento nenhum. Zero
 * navegação = zero chance de bater no gatilho exato do bug. O usuário
 * só visita `/rotas/[id]` de verdade depois, pela lista "Minhas Rotas"
 * — nesse ponto o segmento já foi renderizado ao menos uma vez neste
 * deploy (por outra pessoa/sessão) ou o próprio ID já não é mais
 * "recém-criado", o que historicamente nunca reproduziu o bug.
 */
export default function NovaRotaPage(): JSX.Element {
  const { user } = useAuth();
  const createRoute = useCreateRoute();
  const { data: team } = useMyTeam();
  const { data: vehicles } = useVehiclesList({ pageSize: 100 });
  const [form, setForm] = useState<CreateRouteInput>(INITIAL_STATE);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [createdRouteId, setCreatedRouteId] = useState<string | null>(null);

  const isAutonomoOuMei =
    user?.role === "empresa" && (user.companyType === "AUTONOMO" || user.companyType === "MEI");

  useEffect(() => {
    if (isAutonomoOuMei && user && !form.motoristaPadraoId) {
      setForm((current) => ({ ...current, motoristaPadraoId: user.id }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só preenche uma vez, na primeira renderização com `user` disponível.
  }, [isAutonomoOuMei, user]);

  const motoristas = team?.filter((member) => member.papel === "motorista") ?? [];
  const monitores = team?.filter((member) => member.papel === "monitor") ?? [];

  function updateField<K extends keyof CreateRouteInput>(key: K, value: CreateRouteInput[K]): void {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function toggleDia(dia: RouteWeekday): void {
    setForm((current) => ({
      ...current,
      diasSemana: current.diasSemana.includes(dia)
        ? current.diasSemana.filter((d) => d !== dia)
        : [...current.diasSemana, dia],
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setErrorMessage(null);
    if (form.diasSemana.length === 0) {
      setErrorMessage("Selecione ao menos um dia da semana.");
      return;
    }
    try {
      const route = await createRoute.mutateAsync(form);
      setCreatedRouteId(route.id);
    } catch (error) {
      setErrorMessage(
        error instanceof ApiError ? error.message : "Erro inesperado ao criar a rota.",
      );
    }
  }

  // Ver a nota grande acima: assim que a rota é criada, a tela troca
  // pro mesmo componente de `/rotas/[id]` embutido AQUI, sem navegar —
  // `max-w-3xl` (mesma largura de `RouteDetailClient`) em vez do
  // `max-w-2xl` do formulário.
  if (createdRouteId) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <Typography variant="title">Rota criada</Typography>
        <Typography variant="bodySmall" color="muted">
          Agora adicione ao menos uma parada e um aluno abaixo para a rota entrar em operação.
        </Typography>
        <RouteDetailClient routeId={createdRouteId} />
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <Typography variant="title">Nova rota</Typography>

      <form onSubmit={(event) => void handleSubmit(event)} className="flex flex-col gap-6">
        <Card>
          <Card.Header title="Dados da rota" />
          <Card.Body className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <FormField label="Nome" isRequired>
                <Input
                  required
                  placeholder="ex: Rota Manhã, Zona Norte"
                  value={form.nome}
                  onChange={(event) => updateField("nome", event.target.value)}
                />
              </FormField>
            </div>
            <FormField label="Turno" isRequired>
              <Select
                required
                value={form.turno}
                onChange={(event) => updateField("turno", event.target.value as SchoolShift)}
              >
                {SHIFTS.map((shift) => (
                  <option key={shift} value={shift}>
                    {SCHOOL_SHIFT_LABEL[shift]}
                  </option>
                ))}
              </Select>
            </FormField>
            <div className="sm:col-span-2">
              <span className="mb-2 block text-sm font-semibold text-text">
                Dias da semana <span className="text-danger">*</span>
              </span>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {WEEKDAYS.map((dia) => (
                  <label key={dia} className="flex items-center gap-2 text-sm text-text">
                    <input
                      type="checkbox"
                      checked={form.diasSemana.includes(dia)}
                      onChange={() => toggleDia(dia)}
                    />
                    {ROUTE_WEEKDAY_LABEL[dia]}
                  </label>
                ))}
              </div>
            </div>
          </Card.Body>
        </Card>

        <Card>
          <Card.Header title="Recursos padrão" />
          <Card.Body className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {isAutonomoOuMei ? (
              <FormField
                label="Motorista"
                helperText="Como motorista autônomo/MEI, você mesmo dirige esta rota."
              >
                <Typography variant="body">{user?.nome ?? "Você"}</Typography>
              </FormField>
            ) : (
              <FormField
                label="Motorista"
                helperText={
                  motoristas.length === 0
                    ? "Nenhum motorista vinculado à empresa ainda: convide um em Equipe."
                    : "Quem se credencia para dirigir esta rota."
                }
              >
                <Select
                  value={form.motoristaPadraoId ?? ""}
                  onChange={(event) =>
                    updateField("motoristaPadraoId", event.target.value || undefined)
                  }
                >
                  <option value="">Nenhum por enquanto</option>
                  {motoristas.map((member) => (
                    <option key={member.userId} value={member.userId}>
                      {member.nome}
                    </option>
                  ))}
                </Select>
              </FormField>
            )}
            <FormField label="Monitor">
              <Select
                value={form.monitorPadraoId ?? ""}
                onChange={(event) =>
                  updateField("monitorPadraoId", event.target.value || undefined)
                }
              >
                <option value="">Nenhum</option>
                {monitores.map((member) => (
                  <option key={member.userId} value={member.userId}>
                    {member.nome}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Veículo">
              <Select
                value={form.veiculoPadraoId ?? ""}
                onChange={(event) =>
                  updateField("veiculoPadraoId", event.target.value || undefined)
                }
              >
                <option value="">Nenhum por enquanto</option>
                {vehicles?.items.map((vehicle) => (
                  <option key={vehicle.id} value={vehicle.id}>
                    {vehicle.placa} ({vehicle.modelo})
                  </option>
                ))}
              </Select>
            </FormField>
          </Card.Body>
          <Card.Footer>
            {errorMessage ? (
              <Typography variant="bodySmall" color="danger" className="mr-auto">
                {errorMessage}
              </Typography>
            ) : null}
            <Button type="submit" variant="primary" isLoading={createRoute.isPending}>
              Criar rota
            </Button>
          </Card.Footer>
        </Card>
      </form>
    </div>
  );
}
