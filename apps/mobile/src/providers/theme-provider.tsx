import { themes, type Theme, type ThemeName } from "@rotta/theme";
import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

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

export function ThemeProvider({ children }: { children: ReactNode }): JSX.Element {
  const [themeName, setThemeName] = useState<ThemeName>("light");

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
