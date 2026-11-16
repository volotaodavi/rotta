# Plano — acessibilidade do site público (WCAG 2.2 AA)

Origem: revisão de 10/11/2026 em www.rottabr.com.br — 18 páginas, 1366×900
e 390×844, agent-browser + axe-core 4.12.1, mais teclado e foco à mão.
Onze achados: cinco falhas de norma, seis de boa prática.

Especificação: `docs/53-acessibilidade-do-site.md`.

## Por que a ordem é esta

Primeiro o que é **componente compartilhado** (`@rotta/ui`, `@rotta/maps`),
depois o que é **página**. Invertido, cada página seria corrigida duas
vezes: uma à mão e outra quando o componente mudasse.

E dentro disso, primeiro o que tem **como testar por cálculo ou por
render** (contraste, `autoComplete`, landmark), porque esse teste é o
que impede o problema de voltar. O que só se verifica com navegador
(foco coberto) vem por último, junto da varredura final.

## Linha de base, medida antes de qualquer mudança

`./scripts/a11y-check.sh`

| tags                                       | violações                      | combinações afetadas (de 36) |
| ------------------------------------------ | ------------------------------ | ---------------------------- |
| `wcag2a,wcag2aa,wcag21a,wcag21aa,wcag22aa` | 31                             | 14                           |
| `best-practice`                            | a medir com o script corrigido | —                            |

**As primeiras medidas foram otimistas por acidente.** Antes de o script
ganhar aquecimento e espera, duas rodadas seguidas no mesmo código
deram 10, depois 17, depois 15. Com a página de fato renderizada, são 31. Ver `docs/53`, seção "O instrumento precisou ser consertado antes
de medir" — nenhum desses números menores vale para comparação.

Das cinco falhas de norma, o axe pega três sozinho: `color-contrast` no
`/governo` (item 2), `link-in-text-block` em sete combinações (item 3) e
`target-size` em `/entrar` a 390px (item 4 — só no celular). As outras
duas ele não pega: foco coberto por elemento fixo (item 1) e
`autocomplete` ausente (item 5) só aparecem com teclado e régua. É por
isso que a varredura automática não substitui o teste manual, e o
critério de pronto cobra os dois.

## Ordem de execução

| #   | Commit      | Escopo                                                          | Como se prova                                              |
| --- | ----------- | --------------------------------------------------------------- | ---------------------------------------------------------- |
| 1   | `fix(ui)`   | `Badge`: neutro e superfície escura (item 2)                    | cálculo em `contraste-wcag.spec.ts`                        |
| 2   | `feat(ui)`  | `TextLink` com sublinhado sempre visível (item 3)               | teste de render                                            |
| 3   | `fix(web)`  | usar `TextLink` nos 6 pontos do site público (item 3)           | axe: `link-in-text-block` zera                             |
| 4   | `fix(web)`  | `autoComplete` nos 5 cadastros (item 5)                         | teste de render                                            |
| 5   | `fix(web)`  | alvo de toque do "Mostrar senha" + `aria-pressed` (item 4)      | teste de render + medida no navegador                      |
| 6   | `fix(web)`  | `<main>` e H1 nas 7 telas de auth e no `/governo` (itens 6 e 7) | axe: `landmark-one-main`, `region`, `page-has-heading-one` |
| 7   | `fix(web)`  | ordem de títulos e `aria-label` dos `<nav>` (item 10)           | axe: `heading-order`, `landmark-unique`                    |
| 8   | `fix(web)`  | indicadores da home deixam de ser título (item 9)               | contagem de títulos no navegador                           |
| 9   | `fix(web)`  | `alt=""` no logo ao lado do nome (item 11)                      | axe: `image-redundant-alt`                                 |
| 10  | `fix(maps)` | rótulo nos marcadores + mapa decorativo na home (item 8)        | axe + navegação por Tab                                    |
| 11  | `fix(web)`  | `scroll-padding-bottom` do banner + convite de app (item 1)     | medida de `getBoundingClientRect` com Tab                  |

O item 1 fica por último de propósito: é o único que mexe em rolagem da
página inteira, e quero os outros dez já estáveis para saber que uma
regressão veio dele.

## O que NÃO entra

- `apps/mobile` e áreas logadas — revisão própria, dito no pedido.
- Atribuição do mapa (OpenStreetMap/MapLibre): o axe não conseguiu medir
  o contraste. Fica anotado em `docs/53` como item a verificar, sem
  mexer.
- Os 8 links cor-só que estão em `(dashboard)` — mesma classe, mesmo
  defeito, mas área logada. Ficam listados em `docs/53` para a revisão
  seguinte não precisar redescobrir.

## Risco conhecido

O item 2 muda `Badge`, que é usado no produto inteiro, não só no site
público. A mudança de `text-text-muted` para `text-text` no neutro
deixa a etiqueta mais escura em toda tela que a usa. É o que conserta,
e é visível: está declarado em `docs/53` para ninguém ser pego de
surpresa.
