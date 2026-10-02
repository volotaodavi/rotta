"use client";

import { useEffect, useState } from "react";

/**
 * Atrasa o valor de um campo de busca até a pessoa parar de digitar.
 *
 * Criado em 02/10/2026, junto do conserto do foco nos diálogos
 * (`packages/ui/.../Modal.tsx`), pelo mesmo relato: "a cada letra
 * colocada ele buga". Nas listas do Admin, o termo digitado ia direto
 * para a `queryKey` do TanStack Query, então cada tecla disparava uma
 * requisição e uma consulta nova ao Postgres. Buscar "transportadora"
 * eram 15 buscas, 14 delas jogadas fora antes de chegar na tela, cada
 * uma varrendo nome, e-mail, telefone e CPF com `contains` (sem
 * índice que sirva para busca no meio do texto).
 *
 * Duas consequências visíveis, as duas somando com o defeito do foco:
 * a lista piscava entre estados de carregamento a cada letra, e uma
 * rajada de digitação chegava perto do limite de requisições por 10
 * segundos do backend (`throttler.options.ts`), onde a resposta é 429
 * e a tela mostra erro em vez de resultado.
 *
 * Limpar o campo não espera: quem apaga a busca quer a lista inteira
 * de volta na hora, e isso não gera rajada nenhuma (é uma requisição
 * só).
 */
export function useBuscaAdiada(valor: string, atrasoMs = 400): string {
  const [adiado, setAdiado] = useState(valor);

  useEffect(() => {
    if (valor === "") {
      setAdiado("");
      return;
    }

    const temporizador = setTimeout(() => setAdiado(valor), atrasoMs);
    return () => clearTimeout(temporizador);
  }, [valor, atrasoMs]);

  return adiado;
}
