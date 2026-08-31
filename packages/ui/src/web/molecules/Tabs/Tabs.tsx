import { cn } from "../../utils/cn";

/**
 * Tabs — adicionado junto com a tela de detalhe do Veículo (Documentos/
 * Manutenções/Lembretes/Vínculos/Checklist/Ocorrências em uma única
 * página, Dossiê 24 §2 — evita navegação profunda para sub-recursos que
 * pertencem ao mesmo veículo).
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
   * Classe de cor da aba ativa (borda + texto) — opcional, padrão
   * `border-primary text-primary`. Usada pelas telas exclusivas de
   * Motorista/Monitor (`atividades/page.tsx`) pra usar `driverPrimary`/
   * `monitorAccent` em vez do azul compartilhado, sem duplicar este
   * componente — todo outro consumidor continua com o padrão de sempre.
   */
  activeClassName?: string;
}

export function Tabs({ tabs, activeId, onChange, activeClassName }: TabsProps) {
  return (
    <div role="tablist" className="flex gap-1 border-b border-border">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={tab.id === activeId}
          onClick={() => onChange(tab.id)}
          className={cn(
            "border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors",
            tab.id === activeId
              ? (activeClassName ?? "border-primary text-primary")
              : "border-transparent text-text-muted hover:text-text",
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
