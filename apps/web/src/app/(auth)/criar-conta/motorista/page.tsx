"use client";

import { Card, Typography } from "@rotta/ui/web";
import Link from "next/link";

/**
 * Bifurcação do cadastro de Motorista (pedido explícito do usuário:
 * "quando for cadastrar um motorista, pergunte se é motorista
 * autônomo/MEI ou se é motorista contratado por empresa"). São dois
 * cadastros DIFERENTES por baixo, nunca o mesmo formulário com um
 * campo a mais:
 *
 * - Autônomo/MEI: ele PRÓPRIO é a transportadora (`Company` com
 *   `tipo: AUTONOMO`, Dossiê 16) — mesmo cadastro de `/criar-conta/empresa`,
 *   sujeito à mesma mensalidade de R$ 39,90/mês que qualquer transportadora
 *   (Dossiê 26). `?tipo=AUTONOMO` pré-seleciona o campo "Tipo" lá.
 * - Contratado por uma empresa: ele é FUNCIONÁRIO de uma transportadora
 *   já cadastrada (`Membership`, Dossiê 15 `AUTH-01-A1`) — nunca cria
 *   uma empresa nova, entra com o código de convite que a
 *   transportadora gerou para ele, gratuito para o motorista.
 */
export default function CriarContaMotoristaPage(): JSX.Element {
  return (
    <div className="mx-auto flex w-full max-w-sm flex-col gap-6">
      <div className="flex flex-col gap-1 text-center">
        <Typography variant="title">Como você trabalha como motorista?</Typography>
        <Typography variant="bodySmall" color="muted">
          Isso muda como sua conta é criada — escolha a opção certa.
        </Typography>
      </div>

      <div className="flex flex-col gap-3">
        <Link href="/criar-conta/empresa?tipo=AUTONOMO">
          <Card interactive className="px-6 py-5">
            <Typography variant="subtitle">Sou autônomo ou MEI</Typography>
            <Typography variant="bodySmall" color="muted">
              Você é a própria transportadora — cadastra seu CPF/CNPJ e assina o plano da Rotta (R$
              39,90/mês) direto.
            </Typography>
          </Card>
        </Link>

        <Link href="/convite">
          <Card interactive className="px-6 py-5">
            <Typography variant="subtitle">Sou contratado por uma empresa</Typography>
            <Typography variant="bodySmall" color="muted">
              Você dirige para uma transportadora já cadastrada — use o código de convite que ela te
              enviou. Gratuito, ninguém paga nada aqui.
            </Typography>
          </Card>
        </Link>
      </div>
    </div>
  );
}
