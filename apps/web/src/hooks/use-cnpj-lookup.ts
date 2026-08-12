import { ApiError, type CnpjPreview } from "@rotta/api-client";
import { useCallback, useState } from "react";


import { companiesApi } from "@/lib/api-client";

export type CnpjLookupStatus = "idle" | "loading" | "found" | "not-found" | "error";

/**
 * Confirmação de CNPJ na Receita Federal (Frente B — pedido do usuário:
 * "ao colocar o CNPJ, o Rotta deverá fazer uma busca na Receita
 * Federal, ver se está ativo e colocar no cadastro, não podendo
 * alterar os dados, apenas o nome fantasia"). Chama o backend
 * (`GET /companies/cnpj/:cnpj`, `useCnpjLookup` → `ReceitaFederalService`)
 * em vez da BrasilAPI direto do navegador — o que aparece aqui é só
 * PRÉVIA pro usuário ver/confirmar; quem realmente trava os dados é o
 * próprio backend, de novo, dentro de `POST /companies` (não dá pra
 * burlar mandando outros valores, mesmo que esta prévia seja pulada).
 *
 * Mesmo princípio de "nunca bloqueia o cadastro à toa" de
 * `useCepLookup`: só CNPJ com 14 dígitos dispara a busca, e qualquer
 * erro de rede vira `status: "error"` (o formulário decide se deixa
 * os campos editáveis manualmente nesse caso).
 */
export function useCnpjLookup(): {
  status: CnpjLookupStatus;
  data: CnpjPreview | null;
  lookup: (cnpj: string) => Promise<CnpjPreview | null>;
  reset: () => void;
} {
  const [status, setStatus] = useState<CnpjLookupStatus>("idle");
  const [data, setData] = useState<CnpjPreview | null>(null);

  const lookup = useCallback(async (cnpj: string): Promise<CnpjPreview | null> => {
    const digits = cnpj.replace(/\D/g, "");
    if (digits.length !== 14) {
      return null;
    }

    setStatus("loading");
    try {
      const preview = await companiesApi.lookupCnpj(digits);
      setData(preview);
      setStatus("found");
      return preview;
    } catch (error) {
      setData(null);
      if (error instanceof ApiError && error.status === 404) {
        setStatus("not-found");
      } else {
        setStatus("error");
      }
      return null;
    }
  }, []);

  const reset = useCallback(() => {
    setStatus("idle");
    setData(null);
  }, []);

  return { status, data, lookup, reset };
}
