/**
 * `Texto` — todo texto do aplicativo, na letra da marca.
 *
 * Isto é um reexporte de propósito. A implementação mora em
 * `@rotta/ui/native` porque os componentes compartilhados também
 * precisam dela: enquanto o `Texto` vivia só aqui, `StatusPill` e
 * `SlideToAction` desenhavam na fonte do sistema dentro de telas em
 * Plus Jakarta Sans. Duas cópias do mesmo componente teriam o mesmo
 * destino, então existe uma.
 *
 * O caminho de importação de todas as telas (`@/components/texto`)
 * continua valendo, e é por isso que este arquivo não desapareceu.
 */
export { Texto } from "@rotta/ui/native";
