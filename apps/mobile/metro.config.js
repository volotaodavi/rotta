const { getDefaultConfig } = require("expo/metro-config");
const path = require("node:path");

/**
 * Metro precisa saber resolver pacotes do workspace (Dossie 22) —
 * observa a raiz do monorepo e prioriza o `node_modules` raiz do pnpm.
 */
const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];
// pnpm usa symlinks — necessario para o Metro resolver pacotes do workspace corretamente.
config.resolver.unstable_enableSymlinks = true;
// BUG corrigido aqui: `disableHierarchicalLookup: true` (valor anterior)
// e a receita oficial da Expo para monorepos Yarn/npm classicos, onde o
// hoisting deixa TODO pacote (inclusive dependencias transitivas, ex.
// `expo-asset`, `@react-navigation/core`) disponivel nos dois
// `nodeModulesPaths` acima. Este monorepo usa pnpm em modo estrito
// (nao-hoisted) — dependencias transitivas vivem so dentro de
// `node_modules/.pnpm/<pacote>/node_modules/`, nunca nas duas raizes
// listadas. Com o lookup hierarquico desligado, o Metro nunca sobe ate
// la e falha o bundle inteiro na primeira dependencia transitiva nao
// declarada diretamente aqui — confirmado tentando buildar o app
// (`expo-asset`, depois `expo-constants`, depois
// `@react-navigation/core`, cada um um novo bundle quebrado). Manter o
// lookup hierarquico ligado deixa o Metro subir pelos symlinks reais do
// pnpm (graças ao `unstable_enableSymlinks` acima) e encontrar cada
// pacote no lugar certo — sem isso, o app nunca builda para device real
// nem Expo Go.
config.resolver.disableHierarchicalLookup = false;
// Necessario para resolver o campo "exports" do package.json (ex.
// `@rotta/auth/native`/`@rotta/auth/web`) — sem isso o Metro nunca
// encontra os subpaths declarados, mesmo com o symlink do pnpm correto.
config.resolver.unstable_enablePackageExports = true;

module.exports = config;
