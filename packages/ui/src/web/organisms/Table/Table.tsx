import { cn } from "../../utils/cn";

import type { ReactNode } from "react";

/**
 * Table — data-driven, adicionado junto com as telas de listagem do
 * módulo Veículos (primeiro módulo a precisar de uma tabela real no
 * Painel Web). Diferente de `Card` (Compound, regiões independentes),
 * aqui as linhas são homogêneas — uma coluna declarativa por campo
 * evita repetir `<tr><td>` em cada tela de listagem futura.
 */
export interface TableColumn<T> {
  key: string;
  header: ReactNode;
  render: (row: T) => ReactNode;
  className?: string;
}

export interface TableProps<T> {
  columns: TableColumn<T>[];
  rows: T[];
  keyExtractor: (row: T) => string;
  onRowClick?: (row: T) => void;
  emptyMessage?: ReactNode;
  className?: string;
}

export function Table<T>({
  columns,
  rows,
  keyExtractor,
  onRowClick,
  emptyMessage = "Nenhum registro encontrado.",
  className,
}: TableProps<T>) {
  return (
    <div className={cn("overflow-x-auto rounded-lg border border-border", className)}>
      <table className="w-full border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-border bg-surface">
            {columns.map((column) => (
              <th
                key={column.key}
                className={cn("px-4 py-3 font-semibold text-text-muted", column.className)}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-8 text-center text-text-muted">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr
                key={keyExtractor(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cn(
                  "border-b border-border last:border-0",
                  onRowClick && "cursor-pointer transition-colors hover:bg-surface",
                )}
              >
                {columns.map((column) => (
                  <td key={column.key} className={cn("px-4 py-3 text-text", column.className)}>
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
