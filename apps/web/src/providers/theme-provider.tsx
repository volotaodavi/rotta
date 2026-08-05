"use client";

import { themes, type Theme, type ThemeName } from "@rotta/theme";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

const STORAGE_KEY = "rotta-theme";

/** Lê a preferência já aplicada pelo script inline de `layout.tsx` (roda antes da hidratação). Só chamada no cliente, depois do primeiro render (ver nota abaixo sobre por quê). */
function readCurrentTheme(): ThemeName {
  const attr = document.documentElement.getAttribute("data-theme");
  return attr === "light" ? "light" : "dark";
}

/**
 * Provider de tema via Context API (Dossie 23, Secao 2.4 — injecao de
 * dependencia de baixa frequencia de mudanca) e Secao 5 (tema como
 * codigo). Aplica `data-theme` na raiz do documento, que o
 * `globals.css` usa para resolver as variaveis CSS corretas.
 *
 * Preferência resolvida em ordem: (1) escolha explícita já salva em
 * `localStorage` (usuário trocou o tema manualmente antes); (2)
 * `prefers-color-scheme` do sistema operacional/navegador; (3) escuro
 * (padrão de fábrica, Dossiê 10 Secao 7.1). Quem resolve isso de fato é
 * o script inline em `app/layout.tsx`, que roda ANTES da hidratação —
 * evita o "flash" de tema errado.
 *
 * `useState<ThemeName>("dark")` (nunca `readCurrentTheme()` direto) é
 * proposital: o HTML gerado pelo servidor sempre assume "dark" (não
 * tem acesso à preferência do navegador), então o primeiro render do
 * React no cliente PRECISA assumir o mesmo valor — senão a hidratação
 * detecta uma divergência entre o que o servidor mandou e o que o
 * cliente calculou (React error #418) para qualquer componente que
 * renderize algo diferente por tema (ex. o ícone sol/lua do
 * `ThemeToggle`). A sincronização com o valor real (já pintado pelo
 * script inline) só acontece DEPOIS do primeiro render, em `useEffect`
 * — uma atualização de estado normal, não uma divergência de
 * hidratação.
 */
interface ThemeContextValue {
  theme: Theme;
  themeName: ThemeName;
  setThemeName: (name: ThemeName) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }): JSX.Element {
  const [themeName, setThemeNameState] = useState<ThemeName>("dark");
  const isFirstEffectRef = useRef(true);

  useEffect(() => {
    if (isFirstEffectRef.current) {
      isFirstEffectRef.current = false;
      // Só sincroniza o estado do React com o que o script inline já
      // aplicou — nunca escreve no DOM aqui (já está correto).
      setThemeNameState(readCurrentTheme());
      return;
    }
    document.documentElement.setAttribute("data-theme", themeName);
  }, [themeName]);

  // Sistema muda em tempo real (ex. o SO troca de claro para escuro à
  // noite) — só reage enquanto o usuário não tiver feito uma escolha
  // explícita nesta sessão/dispositivo.
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    if (localStorage.getItem(STORAGE_KEY)) return;

    const media = window.matchMedia("(prefers-color-scheme: light)");
    const listener = (event: MediaQueryListEvent): void => {
      setThemeNameState(event.matches ? "light" : "dark");
    };
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, []);

  function setThemeName(name: ThemeName): void {
    setThemeNameState(name);
    try {
      localStorage.setItem(STORAGE_KEY, name);
    } catch {
      // Storage indisponível (modo privado/quota) — a preferência só não persiste entre sessões, nunca quebra a troca de tema.
    }
  }

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
