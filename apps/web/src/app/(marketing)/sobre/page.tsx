import { Typography } from "@rotta/ui/web";
import Link from "next/link";

import type { Metadata } from "next";

import { COMPANY_CNPJ, COMPANY_LEGAL_NAME } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Sobre a Rotta",
  description: "O que é a Rotta e qual é o papel da plataforma no transporte escolar.",
  alternates: { canonical: "/sobre" },
};

/**
 * "Sobre a Rotta" (Dossiê 45 — rodapé global exige este link, prompt
 * §2). Conteúdo derivado do que já era real em `/legal/termos` §1/§10
 * ("Papel da Rotta") — sem inventar história/fundação/equipe que a
 * empresa ainda não divulgou.
 */
export default function SobrePage(): JSX.Element {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-6 py-16">
      <Typography variant="headline" as="h1">
        Sobre a Rotta
      </Typography>

      <div className="flex flex-col gap-3">
        <Typography variant="body" color="muted">
          A Rotta é operada pela <strong className="text-text">{COMPANY_LEGAL_NAME}</strong>,
          inscrita no CNPJ sob o nº <strong className="text-text">{COMPANY_CNPJ}</strong>.
        </Typography>
        <Typography variant="body" color="muted">
          A Rotta é uma plataforma tecnológica destinada ao ecossistema de transporte escolar e
          transporte infantil/executivo: ela conecta famílias a transportadores (empresas, MEIs e
          motoristas autônomos) e fornece a essas transportadoras as ferramentas de gestão da
          própria operação: veículos, motoristas, rotas, alunos e cobrança.
        </Typography>
        <Typography variant="body" color="muted">
          A plataforma fornece tecnologia para conexão, gestão, contratação, comunicação,
          localização, contratos, pagamentos e organização operacional. A existência de um usuário
          ou prestador na plataforma não significa, isoladamente, garantia de qualidade, segurança,
          regularidade ou cumprimento de todas as obrigações legais. Os processos de verificação
          disponíveis estão descritos na{" "}
          <Link href="/legal/marketplace" className="text-primary underline">
            Política de Contratação e Marketplace
          </Link>
          .
        </Typography>
      </div>

      <div className="flex flex-col gap-1 border-t border-border pt-6">
        <Typography variant="bodySmall" color="muted">
          Quer entender melhor como a Rotta trata dados, segurança e as regras da comunidade? Visite
          a{" "}
          <Link href="/legal" className="text-primary underline">
            Documentação Rotta
          </Link>
          .
        </Typography>
      </div>
    </div>
  );
}
