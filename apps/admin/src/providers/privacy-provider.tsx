"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

interface PrivacyContextValue {
  /** `true` = valores monetários sensíveis (MRR/ARR) aparecem mascarados. */
  hidden: boolean;
  toggle: () => void;
}

const PrivacyContext = createContext<PrivacyContextValue | null>(null);

/**
 * Alternador "ocultar valores" do cabeçalho do Admin Rotta (ícone de
 * olho — Frente Mercury, adaptação do banner de referência enviado
 * pelo usuário). Estado só em memória (nunca persistido — reabrir o
 * painel volta a mostrar os valores, mesma decisão de qualquer
 * alternador de privacidade de tela cheia): existe pra alguém
 * apresentando a tela em uma reunião/print poder ocultar o MRR/ARR sem
 * sair da página, não é uma preferência de longo prazo.
 */
export function PrivacyProvider({ children }: { children: ReactNode }): JSX.Element {
  const [hidden, setHidden] = useState(false);

  return (
    <PrivacyContext.Provider value={{ hidden, toggle: () => setHidden((current) => !current) }}>
      {children}
    </PrivacyContext.Provider>
  );
}

export function usePrivacy(): PrivacyContextValue {
  const context = useContext(PrivacyContext);
  if (!context) {
    throw new Error("usePrivacy precisa estar dentro de <PrivacyProvider>.");
  }
  return context;
}
