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
config.resolver.disableHierarchicalLookup = true;
// Necessario para resolver o campo "exports" do package.json (ex.
// `@rotta/auth/native`/`@rotta/auth/web`) — sem isso o Metro nunca
// encontra os subpaths declarados, mesmo com o symlink do pnpm correto.
config.resolver.unstable_enablePackageExports = true;

module.exports = config;
