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
 * API. Porta 1:1 de `apps/web/src/hooks/use-cep-lookup.ts` (mesma
 * implementação também em `apps/admin`), que existia nos dois painéis e
 * nunca tinha chegado ao app nativo — quem cadastrava aluno pelo
 * celular digitava logradouro, bairro, cidade e UF na mão, quatro vezes
 * (endereço de embarque e de desembarque).
 *
 * Isto é o "pelo CEP o sistema já sabe onde é" do fluxo de cadastro. É
 * uma etapa DIFERENTE da geocodificação: aqui o CEP vira texto de
 * endereço; depois `useGeocodeAddress` (`POST /geo/geocode`, Rotta Geo
 * Engine/Nominatim no servidor) transforma esse endereço em
 * latitude/longitude, que é o que coloca a parada no mapa.
 *
 * Nunca bloqueia o cadastro: CEP inexistente ou ViaCEP fora do ar
 * simplesmente não preenche — os campos seguem editáveis à mão.
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
      // Rede indisponível ou ViaCEP fora do ar — cadastro continua
      // possível, só sem o preenchimento automático.
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { isLoading, notFound, lookup };
}
