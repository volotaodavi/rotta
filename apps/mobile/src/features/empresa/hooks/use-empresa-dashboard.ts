import { useQuery } from "@tanstack/react-query";

import { studentsApi } from "@/lib/api-client";

/**
 * Total de alunos da empresa, pro resumo da Home (`EmpresaHomeScreen`)
 * — redesign 15/09/2026, print real da Rotta anexado pelo usuário
 * ("Home – Gestor": resumo com Veículos/Alunos/Motoristas). `pageSize:
 * 1` porque só o `total` da resposta paginada importa aqui, mesmo
 * truque já usado em `EmpresaHomeScreen` pra contagem de solicitações.
 */
export function useStudentsTotal() {
  return useQuery({
    queryKey: ["empresa", "students", "total"],
    queryFn: () => studentsApi.list({ pageSize: 1 }),
    select: (result) => result.total,
  });
}
