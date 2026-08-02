import { Button } from "../../atoms/Button/Button";
import { Typography } from "../../atoms/Typography/Typography";

/** Pagination — adicionado junto com as telas de listagem do módulo Veículos. */
export interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ page, pageSize, total, onPageChange }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="flex items-center justify-between gap-4">
      <Typography variant="caption" color="muted">
        Página {page} de {totalPages} — {total} registro{total === 1 ? "" : "s"}
      </Typography>
      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          isDisabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          Anterior
        </Button>
        <Button
          variant="secondary"
          size="sm"
          isDisabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Próxima
        </Button>
      </div>
    </div>
  );
}
