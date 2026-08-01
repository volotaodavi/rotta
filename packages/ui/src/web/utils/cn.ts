/** Junta classes condicionalmente — evita depender de `clsx`/`tailwind-merge` para um utilitário de uma linha. */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}
