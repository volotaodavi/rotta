import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/providers/theme-provider";

/**
 * Cabeçalho de saudação + relógio ao vivo — versão nativa de
 * `packages/ui/src/web/molecules/PanelGreeting` (Frente L), usado em
 * "Início" e "Perfil" do Motorista/Monitor pra dar a mesma harmonia
 * visual pedida pelo usuário entre Painel Web/Admin e o app nativo
 * (Android/iPhone). Ainda não existe `@rotta/ui/native` pra telas
 * cheias (mesma decisão de escopo já registrada em
 * `vehicle-screen.tsx`), por isso local aqui em vez de um pacote
 * compartilhado — mesmo padrão dos outros componentes de
 * `features/*\/components`.
 *
 * Relógio nasce `null` e só recebe a hora real após montar — evita
 * "piscar" um valor desatualizado no primeiro frame (sem risco de
 * mismatch de hidratação aqui, React Native não faz SSR, mas o mesmo
 * cuidado evita mostrar uma hora capturada no momento errado).
 */
export function PanelGreeting({ nome }: { nome: string }): JSX.Element {
  const { theme } = useTheme();
  const [agora, setAgora] = useState<Date | null>(null);

  useEffect(() => {
    setAgora(new Date());
    const intervalId = setInterval(() => setAgora(new Date()), 1000);
    return () => clearInterval(intervalId);
  }, []);

  function saudacaoPorHora(hora: number): string {
    if (hora < 12) return "Bom dia";
    if (hora < 18) return "Boa tarde";
    return "Boa noite";
  }

  return (
    <View style={styles.container}>
      <Text style={[styles.saudacao, { color: theme.colors.text }]}>
        {saudacaoPorHora(agora?.getHours() ?? 12)}, {nome}!
      </Text>
      {agora ? (
        <View style={styles.horaRow}>
          <Text style={[styles.hora, { color: theme.colors.text }]}>
            {agora.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
          </Text>
          <Text style={{ color: theme.colors.textMuted, fontSize: 12 }}>
            {agora.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 4 },
  hora: { fontSize: 15, fontWeight: "600" },
  horaRow: { alignItems: "baseline", flexDirection: "row", gap: 8 },
  saudacao: { fontSize: 18, fontWeight: "700" },
});
