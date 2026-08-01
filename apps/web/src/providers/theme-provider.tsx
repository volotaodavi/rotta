"use client";

import { themes, type Theme, type ThemeName } from "@rotta/theme";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

/**
 * Provider de tema via Context API (Dossie 23, Secao 2.4 — injecao de
 * dependencia de baixa frequencia de mudanca) e Secao 5 (tema como
 * codigo). Aplica `data-theme` na raiz do documento, que o
 * `globals.css` usa para resolver as variaveis CSS corretas.
 *
 * Persistencia da preferencia por conta de usuario (nao por dispositivo,
 * `CFG-02` do Dossie 20) sera implementada junto com o modulo de
 * Configuracoes — por ora, o padrao e sempre `dark` (Dossie 10, Secao 7.1)
 * e a preferencia vive apenas em memoria da sessao.
 */
interface ThemeContextValue {
  theme: Theme;
  themeName: ThemeName;
  setThemeName: (name: ThemeName) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }): JSX.Element {
  const [themeName, setThemeName] = useState<ThemeName>("dark");

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", themeName);
  }, [themeName]);

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
