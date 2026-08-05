"use client";

import { Moon, Sun } from "@rotta/icons";

import { useTheme } from "@/providers/theme-provider";

/**
 * Alternador claro/escuro (briefing "ROTTA DIGITAL EXPERIENCE" — tema
 * segue o sistema por padrão, com opção explícita de escolher). Um
 * clique já persiste a escolha (`ThemeProvider.setThemeName`) — a
 * partir daí o site para de seguir o sistema operacional até o
 * usuário limpar os dados do site (comportamento padrão da maioria dos
 * produtos com essa opção, ex. GitHub/Vercel).
 */
export function ThemeToggle({ className }: { className?: string }): JSX.Element {
  const { themeName, setThemeName } = useTheme();
  const isDark = themeName === "dark";

  return (
    <button
      type="button"
      onClick={() => setThemeName(isDark ? "light" : "dark")}
      aria-label={isDark ? "Ativar tema claro" : "Ativar tema escuro"}
      title={isDark ? "Ativar tema claro" : "Ativar tema escuro"}
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-muted hover:text-text ${className ?? ""}`}
    >
      {isDark ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
    </button>
  );
}
