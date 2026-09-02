import { useCallback, useState } from "react";

export interface CepAddress {
  endereco: string;
  bairro: string;
  cidade: string;
  estado: string;
}

interface ViaCepResponse {
  erro?: boolean;
  logradouro?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
}

/**
 * Preenchimento automático de endereço a partir do CEP — ViaCEP
 * (viacep.com.br), serviço público brasileiro gratuito e sem chave de
 * API. Mesma implementação de `apps/web/src/hooks/use-cep-lookup.ts`
 * (duplicada de propósito — os dois apps não compartilham um pacote de
 * hooks). Nunca bloqueia o cadastro: se o CEP não existir na base do
 * ViaCEP ou o serviço estiver fora do ar, os campos continuam editáveis
 * manualmente — só não são pré-preenchidos.
 */
export function useCepLookup(): {
  isLoading: boolean;
  notFound: boolean;
  lookup: (cep: string) => Promise<CepAddress | null>;
} {
  const [isLoading, setIsLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const lookup = useCallback(async (cep: string): Promise<CepAddress | null> => {
    const digits = cep.replace(/\D/g, "");
    if (digits.length !== 8) {
      return null;
    }

    setIsLoading(true);
    setNotFound(false);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      if (!response.ok) {
        return null;
      }
      const data = (await response.json()) as ViaCepResponse;
      if (data.erro) {
        setNotFound(true);
        return null;
      }
      return {
        endereco: data.logradouro ?? "",
        bairro: data.bairro ?? "",
        cidade: data.localidade ?? "",
        estado: data.uf ?? "",
      };
    } catch {
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { isLoading, notFound, lookup };
}
