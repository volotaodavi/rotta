/**
 * @rotta/icons/native — mesmos icones da marca de `./index.ts` (web),
 * para React Native (`apps/mobile`, Dossie 36 — Prompt 26). Fonte:
 * `lucide-react-native`, mesmo catalogo de nomes que `lucide-react`
 * (Star, Check, AlertTriangle etc.) — so muda o renderer por baixo
 * (`react-native-svg` em vez de `<svg>` do DOM). `apps/mobile` nunca
 * importa `lucide-react-native` diretamente, sempre por este barrel.
 *
 * Antes desta entrega, `apps/mobile` usava emoji simples (Dossie
 * 36 — Secao 2.2) porque nenhuma biblioteca de icone nativa existia no
 * monorepo. Continua valendo o mesmo aviso do Design System (Dossie 10,
 * Secao 4): nunca emoji para representar estado/tipo na UI.
 */

export * from "lucide-react-native";
