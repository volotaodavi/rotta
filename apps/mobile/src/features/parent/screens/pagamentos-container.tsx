import * as Clipboard from "expo-clipboard";
import { useState } from "react";
import { ActivityIndicator, Modal, StyleSheet, View } from "react-native";

import { useAbrirPagamentoPix, usePagamentosDoAluno } from "../hooks/use-family-billing";

import { FATURA_EM_ABERTO, type FaturaStatus } from "../pagamentos-tipos";

import { PagamentosScreen } from "./pagamentos-screen";
import type { PagamentosDoResponsavel as DadosDaTela } from "../pagamentos-tipos";

import type { PagamentosDoResponsavel as PagamentosDaApi } from "@rotta/api-client";

import { Texto } from "@/components/texto";
import { useStudentsList } from "@/features/marketplace/hooks/use-students";
import { VehicleButton, VehicleCard } from "@/features/vehicles/components";
import { useTheme } from "@/providers/theme-provider";

/**
 * Converte a resposta da API no formato que a tela desenha.
 *
 * A tela recebe valor já formatado de propósito (ver
 * `pagamentos-tipos.ts`): moeda depende de locale e o dado nasce em
 * centavos. Quem formata é um lugar só — aqui o texto vem pronto do
 * backend, e a tela não refaz conta nenhuma.
 */
function paraDadosDaTela(resposta: PagamentosDaApi): DadosDaTela {
  return {
    alunoNome: resposta.alunoNome,
    resumo: resposta.resumo.map((grupo) => ({
      status: grupo.status as FaturaStatus,
      quantidade: grupo.quantidade,
      totalFormatado: grupo.totalFormatado,
    })),
    faturas: resposta.faturas.map((fatura) => ({
      id: fatura.id,
      competencia: fatura.competenciaRotulo,
      valorFormatado: fatura.valorFormatado,
      status: fatura.status as FaturaStatus,
      /* A data vem como `AAAA-MM-DD` e é um DIA, não um instante: montar
         `new Date("2026-04-05")` e formatar no fuso local jogaria o
         vencimento para o dia 4 em qualquer fuso a oeste de Greenwich. */
      vencimentoFormatado: fatura.vencimento.split("-").reverse().join("/"),
    })),
    totalEmAbertoFormatado: resposta.totalEmAbertoFormatado,
  };
}

/**
 * A tela de Pagamentos do Responsável, ligada na API.
 *
 * `PagamentosScreen` continua sendo só desenho (recebe `dados` por
 * prop, sem saber de onde vêm) — o que é o que permite o teste dela
 * montar os cinco estados sem rede. Este container é quem busca, escolhe
 * o aluno e abre o Pix.
 *
 * O aluno é o primeiro da lista quando há um só, que é o caso da grande
 * maioria das famílias. Com mais de um, o seletor da tela troca — e a
 * fatura mostrada é sempre a daquele aluno, nunca uma soma dos dois (uma
 * família com dois filhos precisa saber de quem é a cobrança antes de
 * olhar o valor).
 */
export function PagamentosContainer(): JSX.Element {
  const { theme } = useTheme();
  const { data: listaDeAlunos } = useStudentsList();
  const alunos = listaDeAlunos?.items;
  const [indiceDoAluno, setIndiceDoAluno] = useState(0);

  const aluno = alunos?.[indiceDoAluno];
  const { data: pagamentos, isLoading } = usePagamentosDoAluno(aluno?.id);
  const abrirPix = useAbrirPagamentoPix(aluno?.id);

  const [erro, setErro] = useState<string | null>(null);
  const [pixAberto, setPixAberto] = useState(false);
  const [copiado, setCopiado] = useState(false);

  function trocarAluno(): void {
    if (!alunos || alunos.length < 2) return;
    setIndiceDoAluno((atual) => (atual + 1) % alunos.length);
  }

  function pagar(): void {
    const proxima = pagamentos?.faturas.find((fatura) =>
      FATURA_EM_ABERTO.includes(fatura.status as FaturaStatus),
    );
    if (!proxima) return;

    setErro(null);
    setCopiado(false);
    abrirPix.mutate(proxima.id, {
      onSuccess: () => setPixAberto(true),
      onError: (falha) =>
        setErro(
          falha instanceof Error
            ? falha.message
            : "Não foi possível gerar o Pix agora. Tente de novo em instantes.",
        ),
    });
  }

  async function copiarPix(): Promise<void> {
    const payload = abrirPix.data?.pixPayload;
    if (!payload) return;
    await Clipboard.setStringAsync(payload);
    setCopiado(true);
  }

  if (isLoading && !pagamentos) {
    return (
      <View style={[styles.carregando, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <>
      <PagamentosScreen
        /* Sem resposta, ou com a cobrança pelo app ainda desligada nesta
           implantação, a tela mostra o estado honesto que ela já tem em
           vez de uma fatura inventada. */
        dados={pagamentos ? paraDadosDaTela(pagamentos) : undefined}
        onPagar={pagamentos?.pagamentoNoAppDisponivel ? pagar : undefined}
        onTrocarAluno={alunos && alunos.length > 1 ? trocarAluno : undefined}
        iniciais={aluno?.nome?.slice(0, 2).toUpperCase()}
      />

      <Modal visible={pixAberto} animationType="slide" onRequestClose={() => setPixAberto(false)}>
        <View style={[styles.modal, { backgroundColor: theme.colors.background }]}>
          <VehicleCard>
            <Texto style={[styles.titulo, { color: theme.colors.text }]}>
              Pix de {abrirPix.data?.valorFormatado ?? ""}
            </Texto>
            <Texto style={{ color: theme.colors.textMuted, fontSize: 13 }}>
              Copie o código e pague no app do seu banco. A fatura é baixada automaticamente quando
              o pagamento cair.
            </Texto>
            {abrirPix.data?.pixPayload ? (
              <Texto numberOfLines={3} style={[styles.payload, { color: theme.colors.textMuted }]}>
                {abrirPix.data.pixPayload}
              </Texto>
            ) : null}
            <VehicleButton
              label={copiado ? "Código copiado" : "Copiar código Pix"}
              onPress={() => void copiarPix()}
            />
            <VehicleButton label="Fechar" variant="secondary" onPress={() => setPixAberto(false)} />
          </VehicleCard>
        </View>
      </Modal>

      {erro ? (
        <View style={styles.erro}>
          <VehicleCard>
            <Texto style={{ color: theme.colors.danger, fontSize: 13 }}>{erro}</Texto>
          </VehicleCard>
        </View>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  carregando: { alignItems: "center", flex: 1, justifyContent: "center" },
  erro: { bottom: 16, left: 16, position: "absolute", right: 16 },
  modal: { flex: 1, justifyContent: "center", padding: 16 },
  payload: { fontSize: 11 },
  titulo: { fontSize: 18, fontWeight: "700" },
});
