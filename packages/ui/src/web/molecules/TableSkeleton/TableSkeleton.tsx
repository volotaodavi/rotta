import { Skeleton } from "../../atoms/Skeleton/Skeleton";
import { cn } from "../../utils/cn";

export interface TableSkeletonProps {
  rows?: number;
  columns?: number;
  className?: string;
}

/**
 * Estado de carregamento das telas de lista/tabela do Admin (pedido do
 * usuário 02/09/2026: "trazer mais modernidade") — substitui o
 * `Spinner` de página inteira que escondia a tela toda enquanto a
 * primeira página de resultados carregava. Mesma borda/cantos do
 * `Table` de verdade (`rounded-lg border border-border`), pra parecer
 * a própria tabela ainda carregando, não um estado à parte.
 */
export function TableSkeleton({ rows = 6, columns = 4, className }: TableSkeletonProps) {
  return (
    <div
      className={cn(
        "flex flex-col divide-y divide-border rounded-lg border border-border",
        className,
      )}
    >
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex items-center gap-4 px-4 py-3">
          {Array.from({ length: columns }).map((_, columnIndex) => (
            <Skeleton
              key={columnIndex}
              variant="text"
              height={14}
              className={columnIndex === 0 ? "w-1/4" : "flex-1"}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
