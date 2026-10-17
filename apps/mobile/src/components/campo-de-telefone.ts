import { formatarTelefone, somenteDigitosDeTelefone } from "@rotta/ui/shared/telefone";

import type { TextInputProps } from "react-native";

/**
 * As props que transformam qualquer campo de texto do app num campo de
 * telefone — máscara na tela, dígitos puros no estado.
 *
 * ## Por que é um punhado de props e não um componente
 *
 * Porque o app tem dois campos de texto com casca própria
 * (`AuthTextField`, no fluxo de entrada, e `VehicleTextField`, no
 * resto), e telefone aparece nos dois. Um terceiro componente de campo
 * só pra telefone significaria uma terceira casca pra manter em
 * paralelo com as outras duas. Estas props se espalham sobre o campo
 * que a tela já usa, e a casca continua sendo uma só por contexto.
 *
 * ## Por que existe
 *
 * O celular é LOGIN na Rotta, e também é a chave pela qual a família se
 * encontra no pré-cadastro feito pela transportadora. Enquanto os
 * campos eram livres, uma tela gravava `(21) 99709-9557` e a outra
 * procurava `21997099557`: a conta existia e não abria, e a família
 * informava o número certo e ouvia que não havia pré-cadastro nenhum.
 * Os campos da web passaram a usar `PhoneInput` por este motivo; estas
 * props são o mesmo conserto no aplicativo, com a mesma máscara
 * (`@rotta/ui/shared/telefone`), pra que as duas plataformas nunca
 * divirjam de formato.
 *
 * ```tsx
 * const [celular, setCelular] = useState("");
 * <AuthTextField label="Seu celular" {...propsDeTelefone(celular, setCelular)} />
 * ```
 *
 * `celular` guarda sempre só dígitos (`"21997099557"`) — é isso que vai
 * pra API, sem nenhuma conversão na tela.
 */
export function propsDeTelefone(
  digitos: string,
  aoMudar: (digitos: string) => void,
): Pick<
  TextInputProps,
  | "value"
  | "onChangeText"
  | "keyboardType"
  | "maxLength"
  | "placeholder"
  | "autoComplete"
  | "textContentType"
> {
  return {
    value: formatarTelefone(digitos),
    onChangeText: (texto) => aoMudar(somenteDigitosDeTelefone(texto)),
    keyboardType: "number-pad",
    /* "(11) 98765-4321" — a máscara cheia. Sem este limite, o teclado
       aceita digitar depois dos 11 dígitos e nada acontece na tela, o
       que parece campo travado. */
    maxLength: 15,
    placeholder: "(11) 98765-4321",
    autoComplete: "tel",
    textContentType: "telephoneNumber",
  };
}
