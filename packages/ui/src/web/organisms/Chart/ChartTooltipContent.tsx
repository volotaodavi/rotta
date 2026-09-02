export interface ChartTooltipPayloadItem {
  name?: string;
  value?: number | string;
  color?: string;
}

export interface ChartTooltipContentProps {
  active?: boolean;
  payload?: ChartTooltipPayloadItem[];
  label?: string;
  valueFormatter?: (value: number) => string;
}

/**
 * Substitui o tooltip padrão do `recharts` (caixa branca sem estilo,
 * quebra em tema escuro) por um seguindo os mesmos tokens do resto do
 * design system — mesma base visual de `Card` (borda + `bg-card` +
 * `shadow-dropdown`).
 */
export function ChartTooltipContent({
  active,
  payload,
  label,
  valueFormatter,
}: ChartTooltipContentProps) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="rounded-md border border-border bg-card px-3 py-2 shadow-dropdown">
      {label ? <p className="mb-1 text-xs font-semibold text-text">{label}</p> : null}
      <div className="flex flex-col gap-1">
        {payload.map((entry, index) => (
          <div key={`${entry.name}-${index}`} className="flex items-center gap-1.5 text-xs">
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-text-muted">{entry.name}:</span>
            <span className="font-semibold text-text">
              {typeof entry.value === "number" && valueFormatter
                ? valueFormatter(entry.value)
                : entry.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
