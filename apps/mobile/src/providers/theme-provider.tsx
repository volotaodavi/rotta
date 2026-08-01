import { themes, type Theme, type ThemeName } from "@rotta/theme";
import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

/**
 * Provider de tema do app mobile via Context API (Dossie 23, Secao 2.4 e
 * 5) — equivalente ao de `apps/web`, mas sem `document`/CSS vars (React
 * Native nao tem DOM): componentes de `@rotta/ui/native` consomem
 * `useTheme().theme` diretamente para resolver cor/tipografia/espacamento.
 *
 * Padrao de fabrica: dark (Dossie 10, Secao 7.1). Excecao de UX prevista
 * para o app do motorista sob luz solar direta (Dossie 10, Secao 7.2) —
 * a implementar quando o app tiver acesso a leitura de brilho ambiente.
 */
interface ThemeContextValue {
  theme: Theme;
  themeName: ThemeName;
  setThemeName: (name: ThemeName) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }): JSX.Element {
  const [themeName, setThemeName] = useState<ThemeName>("dark");

  const value = useMemo<ThemeContextValue>(
    () => ({ theme: themes[themeName], themeName, setThemeName }),
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
