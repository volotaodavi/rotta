import { darkColors, lightColors } from "@rotta/theme";

/**
 * Contraste das cores semânticas, conferido por cálculo.
 *
 * ## O defeito que isto trava
 *
 * O padrão da casa para etiqueta de estado é texto da cor cheia sobre
 * um fundo da MESMA cor a 10% ou 15% (`bg-success/15 text-success`, em
 * `Badge` e `StatTile`). Esse fundo levanta a luminância embaixo do
 * texto sem levantar a do texto, e é por isso que as cores 600 do
 * Tailwind, que passam sobre branco por pouco, reprovam no uso real:
 * o verde dava 2,96:1 e o laranja 2,86:1 sobre o próprio fundo a 10%,
 * contra o mínimo de 4,5:1. Em 11px, que é o tamanho dos selos, isso é
 * quase invisível numa tela sob sol, que é exatamente onde um monitor
 * lê o app.
 *
 * ## Por que calcular em vez de olhar
 *
 * Porque "parece legível" é a opinião de quem tem a tela boa, no
 * escritório. A fórmula de luminância relativa da WCAG 2.2 é a mesma
 * que o axe e o Lighthouse usam, e está implementada aqui em dez
 * linhas: a conta é curta e trazer uma dependência só para ela seria
 * pior.
 *
 * Qualquer um que escureça ou clareie um token semântico sem refazer a
 * conta quebra este teste, que é o ponto.
 */

/** Mínimo da WCAG 2.2 AA para texto normal (abaixo de 18,66px em negrito ou 24px). */
const MINIMO_AA = 4.5;

/** As opacidades de fundo que `Badge` e `StatTile` usam de verdade. */
const OPACIDADES_EM_USO = [0.1, 0.15];

function canal(valor: number): number {
  const normalizado = valor / 255;
  return normalizado <= 0.04045 ? normalizado / 12.92 : ((normalizado + 0.055) / 1.055) ** 2.4;
}

function luminancia(hex: string): number {
  const limpo = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((i) => Number.parseInt(limpo.slice(i, i + 2), 16));
  return 0.2126 * canal(r!) + 0.7152 * canal(g!) + 0.0722 * canal(b!);
}

function contraste(frente: string, fundo: string): number {
  const [maior, menor] = [luminancia(frente), luminancia(fundo)].sort((a, b) => b - a);
  return (maior! + 0.05) / (menor! + 0.05);
}

/** O que o navegador desenha quando uma cor é usada com opacidade sobre um fundo. */
function sobrepor(frente: string, fundo: string, opacidade: number): string {
  const f = frente.replace("#", "");
  const b = fundo.replace("#", "");
  const canais = [0, 2, 4].map((i) => {
    const fv = Number.parseInt(f.slice(i, i + 2), 16);
    const bv = Number.parseInt(b.slice(i, i + 2), 16);
    return Math.round(fv * opacidade + bv * (1 - opacidade));
  });
  return `#${canais.map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

const SEMANTICAS = ["success", "warning", "danger", "info"] as const;

describe("tema claro", () => {
  const fundos = {
    background: lightColors.background,
    surface: lightColors.surface,
    muted: lightColors.muted,
  };

  it.each(SEMANTICAS)("%s passa no AA sobre os fundos lisos", (nome) => {
    const cor = lightColors[nome];
    for (const fundo of Object.values(fundos)) {
      expect(contraste(cor, fundo)).toBeGreaterThanOrEqual(MINIMO_AA);
    }
  });

  it.each(SEMANTICAS)("%s passa no AA sobre o PRÓPRIO fundo a 10%% e 15%%", (nome) => {
    // Este é o caso que reprovava. `bg-success/15 text-success` é o
    // padrão de etiqueta de estado em toda a plataforma.
    const cor = lightColors[nome];
    for (const opacidade of OPACIDADES_EM_USO) {
      const fundo = sobrepor(cor, lightColors.background, opacidade);
      expect(contraste(cor, fundo)).toBeGreaterThanOrEqual(MINIMO_AA);
    }
  });

  it("o cinza de legenda passa no AA até no fundo de card mais claro", () => {
    // `muted` (#F1F2F4) é onde vivem as legendas de 11 e 12px, e era
    // onde o cinza antigo dava 4,32:1.
    for (const fundo of Object.values(fundos)) {
      expect(contraste(lightColors.textMuted, fundo)).toBeGreaterThanOrEqual(MINIMO_AA);
    }
  });

  it("o texto principal passa com folga", () => {
    expect(contraste(lightColors.text, lightColors.background)).toBeGreaterThanOrEqual(7);
  });
});

describe("tema escuro", () => {
  const fundos = {
    background: darkColors.background,
    surface: darkColors.surface,
    card: darkColors.card,
  };

  it.each(SEMANTICAS)("%s passa no AA sobre os fundos lisos", (nome) => {
    const cor = darkColors[nome];
    for (const fundo of Object.values(fundos)) {
      expect(contraste(cor, fundo)).toBeGreaterThanOrEqual(MINIMO_AA);
    }
  });

  it.each(SEMANTICAS)("%s passa no AA sobre o PRÓPRIO fundo a 10%% e 15%%", (nome) => {
    const cor = darkColors[nome];
    for (const fundo of Object.values(fundos)) {
      for (const opacidade of OPACIDADES_EM_USO) {
        expect(contraste(cor, sobrepor(cor, fundo, opacidade))).toBeGreaterThanOrEqual(MINIMO_AA);
      }
    }
  });

  it("o cinza de legenda passa no AA", () => {
    for (const fundo of Object.values(fundos)) {
      expect(contraste(darkColors.textMuted, fundo)).toBeGreaterThanOrEqual(MINIMO_AA);
    }
  });
});

/**
 * Texto branco DESENHADO EM CIMA da cor cheia (`bg-success text-white`
 * em `landing-product-mockups.tsx`, no contador do cabeçalho do Admin,
 * no mapa do aluno).
 *
 * ## Um defeito aberto, medido e deliberadamente não corrigido aqui
 *
 * No tema CLARO este caso passa, e passou a passar por tabela: escurecer
 * as cores semânticas para resolver as etiquetas também afastou o branco
 * do fundo.
 *
 * No tema ESCURO ele REPROVA, e por muito: branco sobre o verde
 * (#22C55E) dá 2,03:1, sobre o laranja (#F5A623) 2,03:1 e sobre o ciano
 * (#22D3EE) 1,81:1. É um defeito real, anterior a esta mudança, e não
 * foi corrigido junto por um motivo: esses três valores do escuro foram
 * escolhidos para leitura sob sol dentro de uma van (ver a nota de
 * `successMuted` em `colors.ts`), e trocá-los é uma decisão visual do
 * produto, não um ajuste de contraste. O conserto certo é texto ESCURO
 * sobre preenchimento claro, o que muda `onPrimary` por cor e não cabe
 * numa correção de tokens.
 *
 * Fica travado só o tema claro, e esta nota existe para que o caso do
 * escuro não desapareça por não ter teste.
 */
describe("texto sobre preenchimento cheio, tema claro", () => {
  it.each(SEMANTICAS)("onPrimary é legível sobre %s", (nome) => {
    expect(contraste(lightColors.onPrimary, lightColors[nome])).toBeGreaterThanOrEqual(3);
  });
});

/**
 * `Badge variant="neutral"` — o único que mistura DOIS tokens
 * diferentes (`bg-secondary/20` + `text-text-muted`), e por isso o
 * único que escapava dos testes acima.
 *
 * ## O buraco que isto fecha (A11Y-02, `docs/53`)
 *
 * Tudo que vem antes neste arquivo cobre as quatro cores semânticas
 * usando a PRÓPRIA cor como texto: `bg-success/15 text-success`. O
 * neutro não é assim — é cinza de legenda sobre cinza de fundo. A
 * revisão de acessibilidade de 10/11/2026 achou 4,39:1 num selo do
 * `/governo`; calculando os oito fundos reais, o pior caso é 3,98:1.
 *
 * Baixar a opacidade do fundo não resolve com folga: a 10% o claro
 * ainda dá 4,61:1. O defeito é a combinação, não a dosagem — por isso
 * o texto passou de `text-text-muted` para `text-text`.
 */
describe("Badge neutro (bg-secondary/20 + texto)", () => {
  const FUNDOS_CLARO = {
    background: lightColors.background,
    surface: lightColors.surface,
    muted: lightColors.muted,
    card: lightColors.card,
  };
  const FUNDOS_ESCURO = {
    background: darkColors.background,
    surface: darkColors.surface,
    card: darkColors.card,
    surfaceElevated: darkColors.surfaceElevated,
  };
  /** A opacidade que `Badge.tsx` usa de verdade no neutro. */
  const OPACIDADE_DO_NEUTRO = 0.2;

  it("o texto do neutro passa no AA sobre todo fundo do tema claro", () => {
    for (const [nome, fundo] of Object.entries(FUNDOS_CLARO)) {
      const pilha = sobrepor(lightColors.secondary, fundo, OPACIDADE_DO_NEUTRO);
      expect({ nome, razao: contraste(lightColors.text, pilha) }).toMatchObject({
        razao: expect.any(Number),
      });
      expect(contraste(lightColors.text, pilha)).toBeGreaterThanOrEqual(MINIMO_AA);
    }
  });

  it("o texto do neutro passa no AA sobre todo fundo do tema escuro", () => {
    for (const fundo of Object.values(FUNDOS_ESCURO)) {
      const pilha = sobrepor(darkColors.secondary, fundo, OPACIDADE_DO_NEUTRO);
      expect(contraste(darkColors.text, pilha)).toBeGreaterThanOrEqual(MINIMO_AA);
    }
  });

  it("o cinza de legenda NÃO serve aqui — é por isto que o texto mudou", () => {
    // Trava a razão de ser da correção. Se alguém devolver
    // `text-text-muted` ao neutro achando que é mais discreto, este
    // teste continua verde (ele afirma a reprovação), mas o de cima
    // quebra — e a mensagem dos dois juntos explica o porquê.
    const pior = Math.min(
      ...Object.values(FUNDOS_CLARO).map((fundo) =>
        contraste(
          lightColors.textMuted,
          sobrepor(lightColors.secondary, fundo, OPACIDADE_DO_NEUTRO),
        ),
      ),
    );
    expect(pior).toBeLessThan(MINIMO_AA);
  });
});

/**
 * `Badge surface="dark"` — selo sobre uma seção que é escura em
 * qualquer tema (o herói do `/governo`, `bg-slate-950`).
 *
 * ## Por que existe (A11Y-02, `docs/53`)
 *
 * `bg-info/15 text-info` resolve pelas variáveis do tema ATIVO. Num
 * visitante em tema claro, `--color-info` é o ciano escuro (#06718B),
 * e sobre quase-preto isso dá 3,26:1 — reprovado, medido pelo axe na
 * própria página.
 *
 * A correção não inventa cor: marca o selo com `data-theme="dark"`, e
 * as variáveis passam a resolver pela paleta ESCURA, que o design
 * system já tem para exatamente esta situação. O que este teste trava
 * é a conta, não a implementação.
 */
describe("Badge sobre superfície escura", () => {
  /** `bg-slate-950` do Tailwind — a cor real da seção, fixa em qualquer tema. */
  const SECAO_ESCURA = "#020617";
  const OPACIDADE_SEMANTICA = 0.15;

  it.each(SEMANTICAS)("%s da paleta escura passa no AA sobre a seção escura", (nome) => {
    const cor = darkColors[nome];
    const pilha = sobrepor(cor, SECAO_ESCURA, OPACIDADE_SEMANTICA);
    expect(contraste(cor, pilha)).toBeGreaterThanOrEqual(MINIMO_AA);
  });

  it("a paleta CLARA reprovaria ali — é o defeito que o axe achou", () => {
    const cor = lightColors.info;
    const pilha = sobrepor(cor, SECAO_ESCURA, OPACIDADE_SEMANTICA);
    expect(contraste(cor, pilha)).toBeLessThan(MINIMO_AA);
  });
});
