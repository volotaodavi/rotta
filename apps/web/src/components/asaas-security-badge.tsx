import { ShieldCheck } from "@rotta/icons";

/**
 * Selo "pagamento seguro processado pelo Asaas" (pedido do usuário,
 * 31/08/2026) — mostrado no card de plano (`/planos`) e no checkout
 * (`/assinatura`), os dois pontos onde a Rotta cobra a mensalidade da
 * plataforma via Asaas (Pix/Boleto/Cartão — `AsaasClientService`).
 * Logotipo real da Asaas (`public/brand/asaas-logo.svg`, baixado do
 * asset oficial do site deles — mesmo traçado, só recolorido de branco
 * pro azul da marca deles pra funcionar sobre fundo claro; nunca
 * redesenhado). `ShieldCheck` (Lucide, já o ícone padrão de segurança
 * usado no resto do produto) reforça o "seguro" sem inventar outro selo.
 */
export function AsaasSecurityBadge({ className }: { className?: string }): JSX.Element {
  return (
    <div
      className={`flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 ${className ?? ""}`}
    >
      <ShieldCheck size={16} className="shrink-0 text-success" />
      <span className="text-xs text-text-muted">
        Pagamento seguro processado por{" "}
        <img
          src="/brand/asaas-logo.svg"
          alt="Asaas"
          className="inline-block h-3 w-auto align-baseline"
        />
      </span>
    </div>
  );
}
