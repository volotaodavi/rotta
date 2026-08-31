import { Circle, Defs, LinearGradient, Path, Rect, Stop, Svg } from "react-native-svg";

import { useTheme } from "@/providers/theme-provider";

export type OnboardingIllustrationVariant = "rota" | "seguranca" | "conecta";

/**
 * Ilustrações minimalistas do onboarding (Seção 2) — vetor próprio
 * (`react-native-svg`, já dependência do app — nenhuma lib nova), sem
 * emoji/ícone solto, sem imagem externa: mapa/rota estilizados na
 * mesma linguagem visual do Design System (raio de curva suave, azul
 * da marca como destaque, superfícies neutras). Cada variante ilustra
 * o texto da própria tela, nunca decoração genérica.
 */
export function OnboardingIllustration({
  variant,
}: {
  variant: OnboardingIllustrationVariant;
}): JSX.Element {
  const { theme } = useTheme();
  const primary = theme.colors.primary;
  const surface = theme.colors.surfaceElevated;
  const muted = theme.colors.border;
  const success = theme.colors.success;

  if (variant === "rota") {
    return (
      <Svg width={220} height={220} viewBox="0 0 220 220">
        <Circle cx={110} cy={110} r={100} fill={surface} />
        {/* Rota traçada, mesma curva suave usada no mapa real (RottaMap). */}
        <Path
          d="M40 150 C 70 150, 70 90, 110 90 S 150 40, 180 40"
          stroke={muted}
          strokeWidth={6}
          strokeLinecap="round"
          fill="none"
        />
        <Path
          d="M40 150 C 70 150, 70 90, 110 90"
          stroke={primary}
          strokeWidth={6}
          strokeLinecap="round"
          fill="none"
        />
        {/* Ponto de partida. */}
        <Circle cx={40} cy={150} r={7} fill={muted} />
        {/* Veículo em movimento (mesmo marcador do mapa ao vivo). */}
        <Circle cx={110} cy={90} r={11} fill={primary} />
        <Circle cx={110} cy={90} r={18} fill={primary} opacity={0.18} />
        {/* Destino. */}
        <Circle cx={180} cy={40} r={7} fill={muted} />
      </Svg>
    );
  }

  if (variant === "seguranca") {
    return (
      <Svg width={220} height={220} viewBox="0 0 220 220">
        <Circle cx={110} cy={110} r={100} fill={surface} />
        {/* Pino de localização do aluno. */}
        <Path
          d="M110 60 C 90 60, 76 74, 76 94 C 76 118, 110 150, 110 150 C 110 150, 144 118, 144 94 C 144 74, 130 60, 110 60 Z"
          fill={primary}
        />
        <Circle cx={110} cy={94} r={13} fill={surface} />
        {/* Conexão entre responsável e veículo — dois nós ligados. */}
        <Path d="M56 168 L164 168" stroke={muted} strokeWidth={4} strokeLinecap="round" />
        <Circle cx={56} cy={168} r={10} fill={success} />
        <Circle cx={164} cy={168} r={10} fill={primary} />
      </Svg>
    );
  }

  return (
    <Svg width={220} height={220} viewBox="0 0 220 220">
      <Defs>
        <LinearGradient id="rottaMarkGradient" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={primary} stopOpacity={1} />
          <Stop offset="1" stopColor={primary} stopOpacity={0.55} />
        </LinearGradient>
      </Defs>
      <Circle cx={110} cy={110} r={100} fill={surface} />
      {/* Três nós conectados — Responsável / Motorista / Monitor girando
          em torno da mesma viagem (Seção 2, tela 3: "conecta"). */}
      <Path
        d="M110 60 L156 138 L64 138 Z"
        stroke={muted}
        strokeWidth={4}
        fill="none"
        strokeLinejoin="round"
      />
      <Circle cx={110} cy={60} r={12} fill="url(#rottaMarkGradient)" />
      <Circle cx={156} cy={138} r={12} fill={primary} opacity={0.75} />
      <Circle cx={64} cy={138} r={12} fill={primary} opacity={0.5} />
      <Rect x={98} y={158} width={24} height={24} rx={8} fill={success} opacity={0.9} />
    </Svg>
  );
}
