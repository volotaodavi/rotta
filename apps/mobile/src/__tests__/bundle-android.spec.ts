import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

/**
 * O que o bundle do Android precisa que exista antes de existir.
 *
 * ## O defeito que isto tranca, e por que um teste é o lugar
 *
 * Em 18/10/2026 a primeira tela do app passou a importar
 * `@rotta/utils` (`empresa-frota-mapa-screen.tsx`, commit 95e547a).
 * Esse pacote é um dos dois do monorepo cujo `main` aponta para
 * `./dist/index.js` em vez do `.ts` fonte — e `dist/` é ignorado pelo
 * git, então ele não existe no diretório isolado que a EAS monta para
 * buildar. O hook `eas-build-post-install` compilava só
 * `@rotta/validators`, com o nome escrito à mão.
 *
 * Resultado: o build Android quebrou em 18/10 e **ninguém soube até
 * 02/11**, porque entre as duas datas ninguém gerou um binário. O erro
 * só aparece depois de dois minutos de CI, no resolvedor do Metro, com
 * uma mensagem sobre `main module field` que não diz "falta buildar um
 * pacote".
 *
 * Nada no `pnpm test` ou no `pnpm typecheck` pegava: o TypeScript lê o
 * `dist/index.d.ts` que existe na máquina de quem desenvolve, e o jest
 * resolve pelo `moduleNameMapper`. As duas ferramentas enxergam um
 * mundo onde `dist/` sempre está lá.
 *
 * Este teste enxerga o mundo da EAS: ele pergunta ao próprio script de
 * build quais pacotes ele cobre, e exige que todo pacote do monorepo
 * que o app importa E que depende de `dist/` esteja na lista.
 */

const RAIZ_DO_MONOREPO = resolve(__dirname, "../../../..");
const FONTE_DO_APP = resolve(__dirname, "..");
const SCRIPT = join(RAIZ_DO_MONOREPO, "scripts/build-pacotes-compilados.mjs");

/** O comando que a EAS roda depois do install, como está no manifesto. */
function comandoDoHook(): string {
  const manifesto = JSON.parse(readFileSync(join(FONTE_DO_APP, "..", "package.json"), "utf8")) as {
    scripts: Record<string, string>;
  };
  return manifesto.scripts["eas-build-post-install"] ?? "";
}

/**
 * Os pacotes que o hook da EAS realmente vai compilar.
 *
 * Sai do HOOK, não do script: se alguém trocar o script de volta por
 * uma lista de `--filter` escrita à mão, é essa lista que passa a
 * valer, e é ela que precisa ser conferida. Perguntar sempre ao script
 * faria este teste concordar consigo mesmo e passar justamente no
 * cenário que ele existe para pegar.
 */
function pacotesCobertosPeloHook(): string[] {
  const hook = comandoDoHook();

  if (hook.includes("build-pacotes-compilados.mjs")) {
    return execFileSync("node", [SCRIPT, "--listar"], { encoding: "utf8" })
      .split("\n")
      .map((linha) => linha.trim())
      .filter(Boolean);
  }

  return [...hook.matchAll(/--filter\s+(\S+)/g)].map((achado) => achado[1]!);
}

/** Pacotes `@rotta/*` cujo `main`/`types` aponta para dentro de `dist/`. */
function pacotesQueDependemDeDist(): Set<string> {
  const pasta = join(RAIZ_DO_MONOREPO, "packages");
  const dependem = new Set<string>();

  for (const nomeDaPasta of readdirSync(pasta)) {
    let manifesto: { name?: string; main?: string; types?: string };
    try {
      manifesto = JSON.parse(readFileSync(join(pasta, nomeDaPasta, "package.json"), "utf8"));
    } catch {
      continue;
    }
    const aponta = (valor?: string): boolean =>
      typeof valor === "string" && /(^|\/)dist\//.test(valor);
    if (manifesto.name && (aponta(manifesto.main) || aponta(manifesto.types))) {
      dependem.add(manifesto.name);
    }
  }

  return dependem;
}

/** Todo `@rotta/<pacote>` importado por qualquer arquivo de `src/`. */
function pacotesImportadosPeloApp(): Set<string> {
  const importados = new Set<string>();

  const varrer = (diretorio: string): void => {
    for (const entrada of readdirSync(diretorio, { withFileTypes: true })) {
      const caminho = join(diretorio, entrada.name);
      if (entrada.isDirectory()) {
        if (entrada.name === "node_modules" || entrada.name === "__tests__") continue;
        varrer(caminho);
        continue;
      }
      if (!/\.tsx?$/.test(entrada.name)) continue;

      const codigo = readFileSync(caminho, "utf8");
      // Casa `"@rotta/utils"` e `"@rotta/ui/web"` — o subcaminho é
      // descartado, porque quem precisa de build é o pacote.
      for (const achado of codigo.matchAll(/["'](@rotta\/[a-z-]+)(?:\/[^"']*)?["']/g)) {
        importados.add(achado[1]!);
      }
    }
  };

  varrer(FONTE_DO_APP);
  return importados;
}

describe("o hook de build da EAS cobre o que o app importa", () => {
  it("todo pacote que o app importa e que depende de dist/ é compilado antes do bundle", () => {
    const dependemDeDist = pacotesQueDependemDeDist();
    const cobertos = new Set(pacotesCobertosPeloHook());

    const descobertos = [...pacotesImportadosPeloApp()].filter((pacote) =>
      dependemDeDist.has(pacote),
    );

    // Se este array nasce vazio, o teste não está testando nada —
    // provavelmente a varredura de imports parou de achar arquivo.
    expect(descobertos.length).toBeGreaterThan(0);

    const faltando = descobertos.filter((pacote) => !cobertos.has(pacote));
    expect(faltando).toEqual([]);
  });

  it("o hook chama o script, nunca uma lista de nomes escrita à mão", () => {
    // A lista à mão foi a causa raiz: ela estava certa quando foi
    // escrita e envelheceu calada. Um `--filter @rotta/<nome>` de volta
    // aqui falha este teste.
    const hook = comandoDoHook();

    expect(hook).toContain("build-pacotes-compilados.mjs");
    expect(hook).not.toMatch(/--filter/);
  });
});
