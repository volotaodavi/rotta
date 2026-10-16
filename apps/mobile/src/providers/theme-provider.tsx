import { themes, type Theme, type ThemeName } from "@rotta/theme";
import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

import { PALETA_DO_CONCEITO } from "./paleta-do-conceito";

/**
 * Provider de tema do app mobile via Context API (Dossie 23, Secao 2.4 e
 * 5) — equivalente ao de `apps/web`, mas sem `document`/CSS vars (React
 * Native nao tem DOM): componentes de `@rotta/ui/native` consomem
 * `useTheme().theme` diretamente para resolver cor/tipografia/espacamento.
 *
 * Sempre claro (achado 15/09/2026, corrigindo relato do usuário com
 * prints mostrando Notificações/Viagens/Início do Responsável em preto
 * — "isso está errado", "cadê o design que mandei"): a versão anterior
 * seguia `Appearance.getColorScheme()` do sistema operacional e caía
 * pro escuro como fallback (decisão antiga do Dossiê 10, Secao 7.1,
 * de ANTES da referência visual real de 31 telas existir). Essa
 * referência (a mesma usada nas Frentes de redesign desta sessão) é
 * inteiramente clara — nenhuma das 31 telas tem variante escura — ou
 * seja, o produto real não tem um "tema escuro" pra seguir; ele só
 * existia no código como um artefato de uma decisão pré-referência.
 * `themes.dark` continua exportado em `@rotta/theme` (não deletado —
 * pode voltar a ser oferecido como preferência explícita do usuário no
 * futuro, ver `lightColors`/`darkColors` em `packages/theme`), mas
 * nenhuma tela hoje pode chegar nele: o SO nunca mais decide isso
 * sozinho.
 */
interface ThemeContextValue {
  theme: Theme;
  themeName: ThemeName;
  setThemeName: (name: ThemeName) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

/**
 * O tema que o app nativo realmente usa.
 *
 * A paleta amostrada do conceito entra por cima do tema claro, e só no
 * app: `lightColors` é compartilhado com o site e o painel, e eles não
 * têm conceito aprovado nem como eu olhar o resultado. Ver
 * `paleta-do-conceito.ts` para a procedência de cada valor.
 *
 * Exportado porque teste que afirma cor precisa afirmar contra ESTE
 * tema. Comparar com `lightTheme` de `@rotta/theme` dá verde no CI e
 * falso no celular, que é o pior tipo de teste.
 */
export function temaDoApp(nome: ThemeName): Theme {
  const base = themes[nome];
  return nome === "light" ? { ...base, colors: { ...base.colors, ...PALETA_DO_CONCEITO } } : base;
}

export function ThemeProvider({ children }: { children: ReactNode }): JSX.Element {
  const [themeName, setThemeName] = useState<ThemeName>("light");

  const value = useMemo<ThemeContextValue>(
    () => ({ theme: temaDoApp(themeName), themeName, setThemeName }),
    [themeName],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme deve ser usado dentro de um <ThemeProvider>.");
  }
  return context;
}
