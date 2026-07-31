/**
 * Configuração raiz do Prettier — apenas re-exporta o preset compartilhado
 * de `packages/config/prettier`, para que toda a formatação do monorepo
 * (incluindo arquivos na raiz, como este) siga uma única fonte de verdade.
 * @type {import("prettier").Config}
 */
module.exports = require("./packages/config/prettier/index.js");
