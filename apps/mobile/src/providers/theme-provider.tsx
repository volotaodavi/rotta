import { themes, type Theme, type ThemeName } from "@rotta/theme";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { Appearance } from "react-native";

/**
 * Provider de tema do app mobile via Context API (Dossie 23, Secao 2.4 e
 * 5) — equivalente ao de `apps/web`, mas sem `document`/CSS vars (React
 * Native nao tem DOM): componentes de `@rotta/ui/native` consomem
 * `useTheme().theme` diretamente para resolver cor/tipografia/espacamento.
 *
 * Segue o esquema de cores do sistema operacional (`Appearance`,
 * equivalente nativo do `prefers-color-scheme` do navegador — mesmo
 * princípio de `apps/web/src/providers/theme-provider.tsx`) por
 * padrão, com escuro como fallback (Dossiê 10, Secao 7.1) quando o SO
 * não informa preferência. Reage a mudanças em tempo real (usuário
 * troca o tema do celular com o app aberto). Persistência explícita
 * por conta de usuário (`CFG-02`, Dossiê 20) e uma tela de configuração
 * para sobrepor o SO ficam para quando o módulo de Configurações
 * existir — nenhuma tela hoje chama `setThemeName` diretamente.
 *
 * Exceção de UX prevista para o app do motorista sob luz solar direta
 * (Dossiê 10, Secao 7.2) — a implementar quando o app tiver acesso a
 * leitura de brilho ambiente.
 */
interface ThemeContextValue {
  theme: Theme;
  themeName: ThemeName;
  setThemeName: (name: ThemeName) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function resolveSystemTheme(): ThemeName {
  return Appearance.getColorScheme() === "light" ? "light" : "dark";
}

export function ThemeProvider({ children }: { children: ReactNode }): JSX.Element {
  const [themeName, setThemeName] = useState<ThemeName>(resolveSystemTheme);

  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      setThemeName(colorScheme === "light" ? "light" : "dark");
    });
    return () => subscription.remove();
  }, []);

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
