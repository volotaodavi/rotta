import { useRef, useState } from "react";
import {
  AccessibilityInfo,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";


import {
  OnboardingIllustration,
  type OnboardingIllustrationVariant,
} from "../components/onboarding-illustration";
import { ProgressDots } from "../components/progress-dots";

import type { AuthStackParamList } from "@/navigation/types";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { AuthButton } from "@/features/auth/components";
import { setHasSeenOnboarding } from "@/lib/onboarding-store";
import { useTheme } from "@/providers/theme-provider";

type Props = NativeStackScreenProps<AuthStackParamList, "Onboarding">;

interface Slide {
  variant: OnboardingIllustrationVariant;
  title: string;
  description: string;
}

const SLIDES: Slide[] = [
  {
    variant: "rota",
    title: "Seu transporte, mais conectado.",
    description: "Tenha as informações da sua viagem organizadas em um só lugar.",
  },
  {
    variant: "seguranca",
    title: "Mais segurança em cada viagem.",
    description:
      "Responsáveis acompanham o transporte e motoristas e monitores têm tudo o que precisam durante a rota.",
  },
  {
    variant: "conecta",
    title: "Rotta. Conecta. Protege. Tranquiliza.",
    description: "Uma nova forma de organizar e acompanhar o transporte escolar.",
  },
];

const { width: SCREEN_WIDTH } = Dimensions.get("window");

/**
 * Onboarding de 3 telas (Seção 2), mostrado uma única vez (Fluxo Inicial,
 * Seção "PERSISTIR"). Swipe horizontal via `ScrollView` com
 * `pagingEnabled` (nenhuma lib de gesto nova — mesmo princípio já usado
 * no resto do app de evitar dependências de gesto quando o componente
 * nativo já resolve) + botões "Continuar"/"Pular", ambos levam ao mesmo
 * lugar (`SelecionarPerfil`) depois de marcar o flag como visto.
 */
export function OnboardingScreen({ navigation }: Props): JSX.Element {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const isLastSlide = activeIndex === SLIDES.length - 1;
  const slide = SLIDES[activeIndex]!;

  function handleScrollEnd(event: NativeSyntheticEvent<NativeScrollEvent>): void {
    const nextIndex = Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setActiveIndex(Math.min(Math.max(nextIndex, 0), SLIDES.length - 1));
  }

  async function goToRoleSelection(): Promise<void> {
    await setHasSeenOnboarding();
    navigation.replace("SelecionarPerfil");
  }

  async function handleContinue(): Promise<void> {
    if (isLastSlide) {
      await goToRoleSelection();
      return;
    }
    const reduceMotion = await AccessibilityInfo.isReduceMotionEnabled().catch(() => false);
    const nextIndex = activeIndex + 1;
    scrollRef.current?.scrollTo({ x: nextIndex * SCREEN_WIDTH, animated: !reduceMotion });
    setActiveIndex(nextIndex);
  }

  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.progressRow, { paddingTop: insets.top + theme.spacing[4] }]}>
        <ProgressDots total={SLIDES.length} activeIndex={activeIndex} />
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScrollEnd}
        style={styles.flex}
      >
        {SLIDES.map((item) => (
          <View key={item.variant} style={[styles.slide, { width: SCREEN_WIDTH }]}>
            <View style={styles.illustration}>
              <OnboardingIllustration variant={item.variant} />
            </View>
          </View>
        ))}
      </ScrollView>

      <View
        style={[
          styles.footer,
          { paddingBottom: insets.bottom + theme.spacing[6], gap: theme.spacing[3] },
        ]}
      >
        <Text
          style={[
            styles.title,
            { color: theme.colors.text, fontSize: theme.typography.headlineMobile.fontSize },
          ]}
        >
          {slide.title}
        </Text>
        <Text style={[styles.description, { color: theme.colors.textMuted }]}>
          {slide.description}
        </Text>

        <View style={styles.actions}>
          <AuthButton
            label={isLastSlide ? "Começar" : "Continuar"}
            onPress={() => void handleContinue()}
          />
          {!isLastSlide ? (
            <AuthButton label="Pular" variant="ghost" onPress={() => void goToRoleSelection()} />
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  actions: { gap: 4, marginTop: 8 },
  description: { fontSize: 15, lineHeight: 22 },
  flex: { flex: 1 },
  footer: { paddingHorizontal: 28 },
  illustration: { alignItems: "center", flex: 1, justifyContent: "center" },
  progressRow: { alignItems: "center" },
  slide: { alignItems: "center", justifyContent: "center" },
  title: { fontWeight: "700", lineHeight: 34 },
});
