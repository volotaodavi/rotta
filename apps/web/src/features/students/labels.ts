import type { StudentSex } from "@rotta/api-client";

/**
 * Rótulos do módulo Alunos (Painel Web — Responsável). `SchoolShift` já
 * tem seu rótulo em `@/features/schools/labels` (`SCHOOL_SHIFT_LABEL`)
 * — reaproveitado aqui, nunca redeclarado.
 */
export const STUDENT_SEX_LABEL: Record<StudentSex, string> = {
  MASCULINO: "Masculino",
  FEMININO: "Feminino",
  OUTRO: "Outro",
};
