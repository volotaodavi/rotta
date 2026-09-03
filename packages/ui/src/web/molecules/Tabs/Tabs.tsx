import { cn } from "../../utils/cn";

/**
 * Tabs — adicionado junto com a tela de detalhe do Veículo (Documentos/
 * Manutenções/Lembretes/Vínculos/Checklist/Ocorrências em uma única
 * página, Dossiê 24 §2 — evita navegação profunda para sub-recursos que
 * pertencem ao mesmo veículo). Redesenhado em segmentos "pílula" (pedido
 * do usuário 03/09/2026: "modernize as abas") — mesmo padrão visual que
 * as abas de status já usavam à mão na Central de Atendimento
 * (`Todos/Aberto/Andamento/Encerrado`), agora um componente único
 * reaproveitável em vez de reimplementado tela a tela.
 */
export interface TabItem {
  id: string;
  label: string;
}

export interface TabsProps {
  tabs: TabItem[];
  activeId: string;
  onChange: (id: string) => void;
  /**
   * Classe de cor/fundo da aba ativa — opcional, padrão `bg-primary
   * text-white`. Usada pelas telas exclusivas de Motorista/Monitor
   * (`atividades/page.tsx`) pra usar `driverPrimary`/`monitorAccent` em
   * vez do azul compartilhado, sem duplicar este componente — todo
   * outro consumidor continua com o padrão de sempre.
   */
  activeClassName?: string;
}

export function Tabs({ tabs, activeId, onChange, activeClassName }: TabsProps) {
  return (
    <div
      role="tablist"
      className="inline-flex w-fit items-center gap-1 rounded-full border border-border bg-muted/50 p-1"
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={tab.id === activeId}
          onClick={() => onChange(tab.id)}
          className={cn(
            "rounded-full px-4 py-1.5 text-sm font-semibold transition-colors",
            tab.id === activeId
              ? (activeClassName ?? "bg-primary text-white shadow-sm")
              : "text-text-muted hover:text-text",
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
