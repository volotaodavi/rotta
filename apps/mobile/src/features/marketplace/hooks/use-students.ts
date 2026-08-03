import { useQuery } from "@tanstack/react-query";

import { studentsApi } from "@/lib/api-client";

/** Alunos do próprio Responsável (para o seletor da tela "Solicitar Transporte"). */
export function useStudentsList() {
  return useQuery({
    queryKey: ["students"],
    queryFn: () => studentsApi.list({ pageSize: 50 }),
  });
}
