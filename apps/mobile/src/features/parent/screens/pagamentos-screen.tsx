import { Copy, CreditCard, KeyRound, QrCode, Receipt, Repeat, Wallet } from "@rotta/icons/native";
import { ActionGrid, EmptyState, FilterTabs, SectionHeader, SummaryCards } from "@rotta/ui/native";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import {
  FATURA_EM_ABERTO,
  ROTULO_DA_FATURA,
  TOM_DA_FATURA,
  type Fatura,
  type MeioDePagamento,
  type PagamentosDoResponsavel,
} from "../pagamentos-tipos";

/* `StatusPill` vem da casca do app, e não do pacote: é ela que injeta o
   tema pelo `useTheme()`, e é dela que as outras 75 chamadas do app já
   usam. Importar o do pacote aqui obrigaria esta tela a repassar tema à
   mão, divergindo do resto. */
import {
  StatusPill,
  VehicleButton,
  VehicleCard,
  VehicleScreen,
} from "@/features/vehicles/components";
import { useTheme } from "@/providers/theme-provider";

/**
 * Pagamentos do responsável — a tela 13 do conceito de 16/10/2026.
 *
 * ## O que esta tela é, e o que ela ainda não é
 *
 * É a única das 31 telas do conceito que não existia. Decisão do
 * fundador no mesmo dia: construir agora e, quando o Asaas responder,
 * "só integrar e colocar os botões para funcionar".
 *
 * Então ela está pronta de desenho e **propositalmente não está ligada
 * na navegação**. Aba de Pagamentos que não paga é pior que aba
 * nenhuma: 24 pessoas usam o app hoje, e um caminho que termina em
 * nada ensina a não confiar no resto.
 *
 * ## Nada é inventado
 *
 * Cobrança da família não existe no `schema.prisma`. Sem dados, a tela
 * **não desenha fatura de exemplo nem zera contador**: ela diz que o
 * pagamento pelo app ainda não está disponível. Encher de número falso
 * uma tela de dinheiro é a pior forma de mentira de produto, porque a
 * pessoa confere contra o próprio bolso.
 *
 * ## Por que o Pix vem antes do cartão
 *
 * O Asaas confirmou em 16/10/2026 que não há SDK mobile nem
 * tokenização pelo front: o cartão passaria pelo nosso servidor e
 * colocaria a Rotta em escopo PCI DSS. O Pix Automático dá a mesma
 * recorrência sem cartão, sem MDR e sem essa exposição. Por isso ele é
 * o primeiro atalho, e o cartão entra desabilitado com o motivo à
 * mostra, em vez de some.
 */
export interface PagamentosScreenProps {
  /** Ausente enquanto a cobrança da família não existir no produto. */
  dados?: PagamentosDoResponsavel;
  onPagar?: () => void;
  onEscolherMeio?: (chave: string) => void;
}

const MEIOS: MeioDePagamento[] = [
  { chave: "pix-recorrente", rotulo: "Pix recorrente" },
  { chave: "pix-copia-cola", rotulo: "Pix copia e cola" },
  { chave: "pix-qr", rotulo: "QR Code" },
  { chave: "pix-chave", rotulo: "Chave Pix" },
  {
    chave: "cartao-recorrente",
    rotulo: "Cartão",
    motivoIndisponivel: "em avaliação",
  },
  { chave: "comprovantes", rotulo: "Comprovantes" },
];

const ICONE_DO_MEIO: Record<string, typeof QrCode> = {
  "pix-recorrente": Repeat,
  "pix-copia-cola": Copy,
  "pix-qr": QrCode,
  "pix-chave": KeyRound,
  "cartao-recorrente": CreditCard,
  comprovantes: Receipt,
};

export function PagamentosScreen({
  dados,
  onPagar,
  onEscolherMeio,
}: PagamentosScreenProps): JSX.Element {
  const { theme } = useTheme();
  const [aba, setAba] = useState<"faturas" | "pagas">("faturas");

  if (!dados) {
    return (
      <VehicleScreen>
        <EmptyState
          title="Pagamento pelo app ainda não disponível"
          description="A mensalidade do transporte continua sendo combinada direto com a transportadora."
          icon={<Wallet size={28} color={theme.colors.textMuted} />}
          theme={theme}
        />
      </VehicleScreen>
    );
  }

  const emAberto = dados.faturas.filter((f) => FATURA_EM_ABERTO.includes(f.status));
  const pagas = dados.faturas.filter((f) => f.status === "PAGA");
  const visiveis = aba === "faturas" ? emAberto : pagas;

  return (
    <VehicleScreen>
      <View>
        <Text style={[styles.titulo, { color: theme.colors.text }]}>Pagamentos</Text>
        <Text style={{ color: theme.colors.textMuted, fontSize: 13 }}>{dados.alunoNome}</Text>
      </View>

      <VehicleCard>
        <SectionHeader title="Resumo de faturas" theme={theme} />
        <SummaryCards
          items={dados.resumo.map((grupo) => ({
            key: grupo.status,
            label: ROTULO_DA_FATURA[grupo.status],
            valor: grupo.quantidade,
            detalhe: grupo.totalFormatado ?? undefined,
            tone: TOM_DA_FATURA[grupo.status],
          }))}
          theme={theme}
        />

        {/*
          Sem nada em aberto, o botão sai da tela em vez de ficar
          desabilitado: "Pagar agora" apagado, com tudo em dia, é um
          susto sem motivo.
        */}
        {dados.totalEmAbertoFormatado ? (
          <VehicleButton
            label={`Pagar agora ${dados.totalEmAbertoFormatado}`}
            onPress={() => onPagar?.()}
          />
        ) : null}
      </VehicleCard>

      <View>
        <SectionHeader title="Formas de pagamento" theme={theme} />
        <ActionGrid
          items={MEIOS.map((meio) => {
            const Icone = ICONE_DO_MEIO[meio.chave] ?? Wallet;
            return {
              key: meio.chave,
              label: meio.rotulo,
              icon: <Icone size={20} color={theme.colors.primary} />,
              onPress: () => onEscolherMeio?.(meio.chave),
              motivoIndisponivel: meio.motivoIndisponivel,
            };
          })}
          theme={theme}
        />
      </View>

      <View style={styles.secaoFaturas}>
        <SectionHeader title="Faturas" theme={theme} />
        <FilterTabs
          options={[
            { key: "faturas", label: "Em aberto", count: emAberto.length },
            { key: "pagas", label: "Pagas", count: pagas.length },
          ]}
          value={aba}
          onChange={(chave) => setAba(chave as "faturas" | "pagas")}
          theme={theme}
        />

        {visiveis.length === 0 ? (
          <EmptyState
            title={aba === "faturas" ? "Nenhuma fatura em aberto" : "Nenhuma fatura paga ainda"}
            description={
              aba === "faturas" ? "Está tudo em dia por aqui." : "As pagas aparecem nesta aba."
            }
            theme={theme}
          />
        ) : (
          <VehicleCard>
            {visiveis.map((fatura, indice) => (
              <LinhaDeFatura key={fatura.id} fatura={fatura} primeira={indice === 0} />
            ))}
          </VehicleCard>
        )}
      </View>
    </VehicleScreen>
  );
}

function LinhaDeFatura({ fatura, primeira }: { fatura: Fatura; primeira: boolean }): JSX.Element {
  const { theme } = useTheme();

  return (
    <View
      style={[
        styles.linha,
        primeira
          ? null
          : { borderTopColor: theme.colors.border, borderTopWidth: StyleSheet.hairlineWidth },
      ]}
    >
      <View style={styles.linhaMeio}>
        <Text style={[styles.competencia, { color: theme.colors.text }]}>{fatura.competencia}</Text>
        <Text style={{ color: theme.colors.textMuted, fontSize: 12 }}>
          Vence em {fatura.vencimentoFormatado}
        </Text>
      </View>
      <View style={styles.linhaDireita}>
        <Text style={[styles.valor, { color: theme.colors.text }]}>{fatura.valorFormatado}</Text>
        <StatusPill label={ROTULO_DA_FATURA[fatura.status]} tone={TOM_DA_FATURA[fatura.status]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  competencia: { fontSize: 15, fontWeight: "600" },
  linha: { alignItems: "center", flexDirection: "row", gap: 12, paddingVertical: 12 },
  linhaDireita: { alignItems: "flex-end", gap: 4 },
  linhaMeio: { flex: 1, minWidth: 0 },
  secaoFaturas: { gap: 12 },
  titulo: { fontSize: 22, fontWeight: "700" },
  valor: { fontSize: 15, fontVariant: ["tabular-nums"], fontWeight: "700" },
});
