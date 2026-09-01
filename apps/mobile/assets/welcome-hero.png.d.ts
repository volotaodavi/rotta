/**
 * Declaração de tipo pro import de `welcome-hero.png` (`entrada-screen.tsx`)
 * — `moduleResolution: "bundler"` + `allowArbitraryExtensions` (tsconfig
 * do app) exigem um arquivo `<nome>.<ext>.d.ts` ao lado do próprio
 * asset pra imports relativos com extensão não-JS/TS; um `declare
 * module "*.png"` coringa em `global.d.ts` NÃO resolve isso (testado —
 * só funciona pra especificadores não-relativos). O Metro bundler
 * resolve o import de verdade em runtime, isto é só o tipo pro
 * TypeScript.
 */
declare const value: number;
export default value;
