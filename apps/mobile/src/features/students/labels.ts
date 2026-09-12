import type { StudentAddressOverrideTrecho, StudentSex } from "@rotta/api-client";

/**
 * Rótulos do módulo Alunos no app — mirror de
 * `apps/web/src/features/students/labels.ts`. `SchoolShift` já tem seu
 * rótulo em `features/schools/labels` (`SCHOOL_SHIFT_LABEL`) —
 * reaproveitado, nunca redeclarado.
 */
export const STUDENT_SEX_LABEL: Record<StudentSex, string> = {
  MASCULINO: "Masculino",
  FEMININO: "Feminino",
  OUTRO: "Outro",
};

export const STUDENT_ADDRESS_OVERRIDE_TRECHO_LABEL: Record<StudentAddressOverrideTrecho, string> = {
  EMBARQUE: "Só na ida (embarque)",
  DESEMBARQUE: "Só na volta (desembarque)",
  AMBOS: "Na ida e na volta",
};
