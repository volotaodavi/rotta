/**
 * Reexporta de `features/students/hooks/use-students.ts` (Frente 2 —
 * "Meus Alunos" completo do Responsável) — este arquivo existia antes
 * com esses mesmos hooks (usados no seletor de "Solicitar Transporte"
 * e no card de ausência de `transporte-inicio-screen.tsx`); movido pra
 * `features/students` (fonte única, junto do CRUD completo) sem quebrar
 * nenhum import existente.
 */
export * from "@/features/students/hooks/use-students";
