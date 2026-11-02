#!/usr/bin/env node
/**
 * Compila os pacotes do monorepo que o Metro NÃO resolve sozinho.
 *
 * ## Por que isto existe, e por que descobrir sozinho em vez de listar
 *
 * Quase todo pacote daqui aponta o `main` para o `.ts` fonte, e o
 * Metro (via Babel) o resolve sem build nenhum. Dois não: `@rotta/
 * validators` e `@rotta/utils` apontam para `./dist/index.js`. Como
 * `dist/` é ignorado pelo git, ele não existe no diretório isolado que
 * a EAS monta para buildar — e o bundle do Android falha na resolução
 * do módulo, não na compilação do app.
 *
 * O hook `eas-build-post-install` de `apps/mobile` chamava
 * `pnpm --filter @rotta/validators build`, com o nome escrito à mão e
 * um comentário afirmando que `validators` era "o único pacote do
 * monorepo" nessa condição. Era verdade quando foi escrito. Em
 * 18/10/2026 a primeira tela do app passou a importar `@rotta/utils`
 * (commit 95e547a), e a afirmação virou mentira silenciosa: o build
 * Android quebrou naquele dia e ninguém soube até 02/11, porque entre
 * as duas datas ninguém gerou um binário.
 *
 * Então este script não tem lista. Ele LÊ o manifesto de cada pacote
 * em `packages` e compila todo aquele cujo `main` ou `types` aponte
 * para dentro de `dist/`. O terceiro pacote que entrar nessa condição
 * não precisa que alguém se lembre deste arquivo.
 *
 * Roda com `node` puro, sem dependência nenhuma: ele é executado
 * dentro do diretório isolado da EAS, antes de qualquer ferramenta do
 * repositório estar garantidamente disponível.
 */

import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PASTA_DE_PACOTES = join(RAIZ, "packages");

/** Um `main`/`types` que aponta para o build, não para o fonte. */
function apontaParaDist(valor) {
  return typeof valor === "string" && /(^|\/)dist\//.test(valor);
}

/**
 * Os pacotes que precisam de build, em ordem alfabética.
 *
 * Exportado para o teste poder comparar esta lista com o que o
 * `package.json` de cada pacote declara — é o teste que torna o
 * descobrimento confiável, não a leitura do código.
 */
export function pacotesQuePrecisamDeBuild() {
  const encontrados = [];

  for (const pasta of readdirSync(PASTA_DE_PACOTES)) {
    const caminho = join(PASTA_DE_PACOTES, pasta, "package.json");
    let manifesto;
    try {
      manifesto = JSON.parse(readFileSync(caminho, "utf8"));
    } catch {
      // Pasta sem `package.json` não é pacote. Nunca é erro.
      continue;
    }

    if (!apontaParaDist(manifesto.main) && !apontaParaDist(manifesto.types)) continue;

    // Um pacote que aponta para `dist/` e não tem como gerá-lo é um
    // defeito do próprio pacote, e falha aqui com o nome dele — nunca
    // vinte minutos depois, no resolvedor do Metro.
    if (!manifesto.scripts?.build) {
      throw new Error(
        `${manifesto.name} aponta para dist/ e não tem script "build". ` +
          `Ou aponte o main para o fonte (./src/index.ts), ou adicione o build.`,
      );
    }

    encontrados.push(manifesto.name);
  }

  return encontrados.sort();
}

function main() {
  const pacotes = pacotesQuePrecisamDeBuild();

  // `--listar` não compila nada: só imprime os nomes, um por linha.
  // É como o teste pergunta ao SCRIPT quem ele cobre, em vez de
  // reimplementar a descoberta e concordar consigo mesmo.
  if (process.argv.includes("--listar")) {
    console.log(pacotes.join("\n"));
    return;
  }

  if (pacotes.length === 0) {
    console.log("Nenhum pacote aponta para dist/. Nada a compilar.");
    return;
  }

  console.log(`Compilando ${pacotes.length} pacote(s): ${pacotes.join(", ")}`);

  // Um `--filter` por pacote, numa chamada só: o pnpm respeita a
  // ordem de dependência entre eles, o que chamadas separadas não
  // garantiriam se um dia um desses pacotes depender do outro.
  const argumentos = pacotes.flatMap((nome) => ["--filter", nome]);
  execFileSync("pnpm", [...argumentos, "build"], { cwd: RAIZ, stdio: "inherit" });
}

// Só executa quando chamado direto, nunca quando importado pelo teste.
if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  main();
}
