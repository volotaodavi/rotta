import {
  Bell,
  ChevronDown,
  ChevronRight,
  Copy,
  CreditCard,
  FileText,
  KeyRound,
  QrCode,
  Receipt,
  Repeat,
  User,
  Wallet,
} from "@rotta/icons/native";
import {
  AppHeader,
  EmptyState,
  FilterTabs,
  InfoTile,
  PersonRow,
  SectionHeader,
  SummaryCards,
} from "@rotta/ui/native";
import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";

import {
  FATURA_EM_ABERTO,
  ROTULO_DA_FATURA,
  TOM_DA_FATURA,
  type Fatura,
  type PagamentosDoResponsavel,
} from "../pagamentos-tipos";

import { RottaLogo } from "@/components/rotta-logo";
/* `StatusPill` vem da casca do app, e não do pacote: é ela que injeta o
   tema pelo `useTheme()`, e é dela que as outras 75 chamadas do app já
   usam. */
import { Texto } from "@/components/texto";
import { StatusPill, VehicleButton, VehicleCard } from "@/features/vehicles/components";
import { useTheme } from "@/providers/theme-provider";

/**
 * Pagamentos do responsável — a tela 13 do conceito, e o telefone da
 * direita do conceito financeiro.
 *
 * ## O que mudou em 16/10/2026, segunda passada
 *
 * A primeira versão desta tela foi feita de memória, porque as imagens
 * do conceito tinham saído do contexto da conversa numa compactação. O
 * fundador viu o resultado e disse, com razão, que estava "com cara de
 * IA". Com as imagens recuperadas, esta é a tela montada como ele
 * desenha, item por item:
 *
 * - cabeçalho com a marca, o perfil em uso, o sino e o avatar;
 * - o nome do aluno num seletor, e não escondido num subtítulo: uma
 *   família com dois filhos precisa saber de quem é a fatura antes de
 *   olhar o valor;
 * - os quatro grupos de fatura como cartões tingidos pelo próprio
 *   estado (verde, creme, rosa, cinza), com o rótulo em cima e o
 *   número embaixo;
 * - as formas de pagamento como blocos de duas linhas ("Pix / copia e
 *   cola"), e não como ícones redondos sem explicação;
 * - Extrato e Comprovantes em cinza, porque consultar é apoio e pagar
 *   é a tarefa;
 * - as faturas como linhas soltas sobre o fundo, com competência,
 *   etiqueta de estado, valor e vencimento.
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
 * o primeiro meio, e o cartão entra desabilitado com o motivo à mostra,
 * em vez de sumir.
 */
export interface PagamentosScreenProps {
  /** Ausente enquanto a cobrança da família não existir no produto. */
  dados?: PagamentosDoResponsavel;
  onPagar?: () => void;
  onEscolherMeio?: (chave: string) => void;
  onTrocarAluno?: () => void;
  avisos?: number;
  onAbrirAvisos?: () => void;
  onAbrirPerfil?: () => void;
  iniciais?: string;
}

interface Meio {
  chave: string;
  rotulo: string;
  descricao?: string;
  motivoIndisponivel?: string;
  variante?: "principal" | "apoio";
}

/** Três por linha, depois dois, depois dois: a ordem do conceito. */
const MEIOS: Meio[][] = [
  [
    { chave: "pix-copia-cola", rotulo: "Pix", descricao: "copia e cola" },
    { chave: "pix-qr", rotulo: "QR Code" },
    { chave: "pix-chave", rotulo: "Chave Pix" },
  ],
  [
    { chave: "pix-recorrente", rotulo: "Pix recorrente" },
    {
      chave: "cartao-recorrente",
      rotulo: "Cartão recorrente",
      descricao: "débito e crédito",
      motivoIndisponivel: "em avaliação",
    },
  ],
  [
    {
      chave: "extrato",
      rotulo: "Extrato",
      descricao: "ver movimentações",
      variante: "apoio",
    },
    {
      chave: "comprovantes",
      rotulo: "Comprovantes",
      descricao: "baixar e compartilhar",
      variante: "apoio",
    },
  ],
];

const ICONE_DO_MEIO: Record<string, typeof QrCode> = {
  "pix-copia-cola": Copy,
  "pix-qr": QrCode,
  "pix-chave": KeyRound,
  "pix-recorrente": Repeat,
  "cartao-recorrente": CreditCard,
  extrato: FileText,
  comprovantes: Receipt,
};

export function PagamentosScreen({
  dados,
  onPagar,
  onEscolherMeio,
  onTrocarAluno,
  avisos,
  onAbrirAvisos,
  onAbrirPerfil,
  iniciais,
}: PagamentosScreenProps): JSX.Element {
  const { theme } = useTheme();
  const [aba, setAba] = useState<"faturas" | "pagas">("faturas");

  const cabecalho = (
    <AppHeader
      titulo="Rotta"
      perfilAtivo="Responsável"
      iniciais={iniciais}
      avisos={avisos}
      onAbrirAvisos={onAbrirAvisos}
      onAbrirPerfil={onAbrirPerfil}
      iconeMarca={<RottaLogo size={32} />}
      iconeSino={<Bell size={20} color={theme.colors.primary} />}
      iconeTrocarPerfil={<ChevronDown size={14} color={theme.colors.textMuted} />}
      theme={theme}
    />
  );

  if (!dados) {
    return (
      <View style={[styles.tela, { backgroundColor: theme.colors.background }]}>
        {cabecalho}
        <View style={styles.vazioTotal}>
          <EmptyState
            title="Pagamento pelo app ainda não disponível"
            description="A mensalidade do transporte continua sendo combinada direto com a transportadora."
            icon={<Wallet size={28} color={theme.colors.primary} />}
            theme={theme}
          />
        </View>
      </View>
    );
  }

  const emAberto = dados.faturas.filter((f) => FATURA_EM_ABERTO.includes(f.status));
  const pagas = dados.faturas.filter((f) => f.status === "PAGA");
  const visiveis = aba === "faturas" ? emAberto : pagas;

  return (
    <View style={[styles.tela, { backgroundColor: theme.colors.background }]}>
      {cabecalho}

      <ScrollView
        contentContainerStyle={[styles.corpo, { padding: theme.spacing[4] }]}
        showsVerticalScrollIndicator={false}
      >
        <Texto style={[styles.titulo, { color: theme.colors.text }]}>Pagamentos</Texto>

        {/*
          O aluno fica num seletor, e não num subtítulo: numa família
          com dois filhos, saber de quem é a fatura vem antes do valor.
        */}
        <VehicleCard style={styles.seletor}>
          <PersonRow
            nome={dados.alunoNome}
            subtitulo="Aluno(a)"
            onPress={onTrocarAluno}
            acessorio={<ChevronDown size={18} color={theme.colors.textMuted} />}
            theme={theme}
          />
        </VehicleCard>

        <View>
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
        </View>

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

        <View>
          <SectionHeader title="Formas de pagamento" theme={theme} />
          <View style={styles.meios}>
            {MEIOS.map((linha, indiceDaLinha) => (
              <View key={indiceDaLinha} style={styles.linhaDeMeios}>
                {linha.map((meio) => {
                  const Icone = ICONE_DO_MEIO[meio.chave] ?? Wallet;
                  const apoio = meio.variante === "apoio";
                  return (
                    <View key={meio.chave} style={styles.celulaDeMeio}>
                      <InfoTile
                        titulo={meio.rotulo}
                        subtitulo={meio.descricao}
                        icon={
                          <Icone
                            size={20}
                            color={apoio ? theme.colors.textMuted : theme.colors.primary}
                          />
                        }
                        onPress={() => onEscolherMeio?.(meio.chave)}
                        motivoIndisponivel={meio.motivoIndisponivel}
                        variante={meio.variante}
                        theme={theme}
                      />
                    </View>
                  );
                })}
              </View>
            ))}
          </View>
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
              icon={<Receipt size={28} color={theme.colors.primary} />}
              theme={theme}
            />
          ) : (
            <View>
              {visiveis.map((fatura, indice) => (
                <LinhaDeFatura key={fatura.id} fatura={fatura} primeira={indice === 0} />
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

/**
 * A linha de fatura do conceito: competência à esquerda, etiqueta de
 * estado ao lado, valor e vencimento à direita. Sem cartão em volta —
 * quatro faturas em quatro caixas separadas perdem a coluna de valores,
 * que é o que a pessoa está conferindo.
 */
function LinhaDeFatura({ fatura, primeira }: { fatura: Fatura; primeira: boolean }): JSX.Element {
  const { theme } = useTheme();

  return (
    <View
      style={[
        styles.linha,
        primeira
          ? null
          : { borderTopColor: theme.colors.hairline, borderTopWidth: StyleSheet.hairlineWidth },
      ]}
    >
      <Texto style={[styles.competencia, { color: theme.colors.text }]}>{fatura.competencia}</Texto>
      <View style={styles.linhaMeio}>
        <StatusPill label={ROTULO_DA_FATURA[fatura.status]} tone={TOM_DA_FATURA[fatura.status]} />
      </View>
      <View style={styles.linhaDireita}>
        <Texto style={[styles.valor, { color: theme.colors.text }]}>{fatura.valorFormatado}</Texto>
        <Texto style={[styles.vencimento, { color: theme.colors.textMuted }]}>
          {fatura.vencimentoFormatado}
        </Texto>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  celulaDeMeio: { flex: 1, minWidth: 0 },
  competencia: { fontSize: 13, fontWeight: "600", width: 76 },
  corpo: { gap: 16, paddingBottom: 32 },
  linha: { alignItems: "center", flexDirection: "row", gap: 10, paddingVertical: 12 },
  linhaDeMeios: { flexDirection: "row", gap: 8 },
  linhaDireita: { alignItems: "flex-end" },
  linhaMeio: { flex: 1, minWidth: 0 },
  meios: { gap: 8 },
  secaoFaturas: { gap: 12 },
  seletor: { paddingVertical: 4 },
  tela: { flex: 1 },
  titulo: { fontSize: 22, fontWeight: "700", letterSpacing: -0.4 },
  valor: { fontSize: 14, fontVariant: ["tabular-nums"], fontWeight: "700" },
  vazioTotal: { flex: 1, justifyContent: "center", padding: 16 },
  vencimento: { fontSize: 11, fontVariant: ["tabular-nums"], marginTop: 2 },
});
