import { Users } from "@rotta/icons/native";
import { EmptyState, FilterTabs, PersonRow } from "@rotta/ui/native";
import { useMemo, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { useAlunosDasMinhasRotas } from "../hooks/use-driver-routes";

import { VehicleCard, VehicleScreen } from "@/features/vehicles/components";
import { useTheme } from "@/providers/theme-provider";

/**
 * "Meus Alunos" do Motorista/Monitor (Frente 4 — pedido do usuário
 * 11/09/2026: "Monitor: alunos + perfil + escolas") — lista, só
 * leitura, de todos os alunos de todas as rotas atribuídas à pessoa
 * (`useAlunosDasMinhasRotas`), não só os da viagem ativa. Cadastro/
 * edição de aluno não é papel do Motorista/Monitor — quem faz isso é o
 * Responsável (`features/students`) ou a Empresa/Gestor
 * (`features/empresa`, pré-cadastro).
 *
 * ## O que mudou em 16/10/2026
 *
 * A tela 20 do conceito que o fundador aprovou mostra a lista de alunos
 * com avatar, nome em negrito, uma linha de apoio e o horário à
 * direita, com filtros em pílula no topo. Aqui era um cartão por aluno
 * com cinco linhas de texto cinza empilhadas, todas do mesmo tamanho:
 * escola, rota, horário, bairro e responsável. Cinco linhas iguais não
 * têm hierarquia, e o motorista procura um nome, não um parágrafo.
 *
 * **O filtro é por rota**, e não por estado de embarque como no
 * conceito: esta tela é a lista de todas as rotas da pessoa, e não a
 * viagem em andamento (essa é o Modo Operacional, que tem a sua
 * própria lista com embarcado/aguardando). Filtrar por um estado que
 * esta tela não conhece seria desenhar um controle que não controla
 * nada.
 */
export function DriverAlunosScreen(): JSX.Element {
  const { theme } = useTheme();
  const { data: alunos, isLoading } = useAlunosDasMinhasRotas();
  const [rota, setRota] = useState("todas");

  const rotas = useMemo(() => {
    const contagem = new Map<string, number>();
    for (const aluno of alunos) {
      contagem.set(aluno.routeNome, (contagem.get(aluno.routeNome) ?? 0) + 1);
    }
    return [...contagem.entries()];
  }, [alunos]);

  const visiveis = rota === "todas" ? alunos : alunos.filter((a) => a.routeNome === rota);

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }

  if (alunos.length === 0) {
    return (
      <VehicleScreen>
        <EmptyState
          title="Nenhum aluno nas suas rotas"
          description="Os alunos aparecem aqui assim que a transportadora vincular você a uma rota."
          icon={<Users size={28} color={theme.colors.primary} />}
          theme={theme}
        />
      </VehicleScreen>
    );
  }

  return (
    <VehicleScreen>
      {/* Uma rota só não é escolha: a faixa de filtro some. */}
      {rotas.length > 1 ? (
        <FilterTabs
          options={[
            { key: "todas", label: "Todos", count: alunos.length },
            ...rotas.map(([nome, quantidade]) => ({
              key: nome,
              label: nome,
              count: quantidade,
            })),
          ]}
          value={rota}
          onChange={setRota}
          theme={theme}
        />
      ) : null}

      <VehicleCard>
        {visiveis.map((aluno, indice) => (
          <View
            key={aluno.id}
            style={
              indice === 0
                ? null
                : {
                    borderTopColor: theme.colors.hairline,
                    borderTopWidth: StyleSheet.hairlineWidth,
                  }
            }
          >
            <PersonRow
              nome={aluno.studentNome ?? "Aluno"}
              /*
                Escola e rota numa linha só: são a mesma pergunta ("de
                onde ele é"), e o motorista lê isso de relance, com o
                celular no suporte.
              */
              subtitulo={[aluno.schoolNome, aluno.routeNome, aluno.bairro]
                .filter(Boolean)
                .join(" · ")}
              horario={aluno.horarioPrevisto ?? undefined}
              theme={theme}
            />
          </View>
        ))}
      </VehicleCard>
    </VehicleScreen>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: "center", flex: 1, justifyContent: "center" },
});
