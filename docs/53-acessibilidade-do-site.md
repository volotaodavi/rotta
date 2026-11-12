# Especificação Funcional Oficial da Rotta — Acessibilidade do site público

**Código**: `A11Y-01` a `A11Y-11`
**Norma**: WCAG 2.2, níveis A e AA
**Escopo**: as 18 páginas públicas de www.rottabr.com.br
**Fora de escopo**: `apps/mobile` e as áreas logadas (`(dashboard)`), que
têm revisão própria.

---

## Por que isto existe

A Rotta vai apresentar a plataforma a prefeituras — Maricá e Niterói na
frente. Acessibilidade é exigência comum em contratação pública, e a
página feita justamente para esse público, `/governo`, é uma das que
reprovam.

Esse é o motivo comercial. O motivo real é mais simples: em 390px de
largura, com o banner de cookies aberto, a caixa "Li e aceito os Termos"
da tela de cadastro fica **100% coberta**. Quem navega por teclado chega
nela e não a vê. Não é uma métrica que reprova — é uma pessoa que não
consegue criar conta.

## Como foi medido

Revisão de 10/11/2026: 18 páginas, desktop (1366×900) e celular
(390×844), agent-browser 0.42 + axe-core 4.12.1 com as tags
`wcag2a,wcag2aa,wcag21a,wcag21aa,wcag22aa` e `best-practice`, mais
teclado e foco à mão.

A varredura virou script: `scripts/a11y-check.sh`.

### O instrumento precisou ser consertado antes de medir

Duas varreduras seguidas, no mesmo código, deram 17 e 15 violações
(12/11/2026). A causa é o `next dev`, que compila cada rota no primeiro
acesso: a auditoria às vezes rodava antes de a página hidratar, e um
elemento que ainda não existe não viola regra nenhuma.

Isso importa mais do que parece. O critério de pronto deste trabalho é
"0 violações" — e uma medida que às vezes diz 0 por acidente é pior que
nenhuma medida, porque dá para acreditar nela. O script passou a abrir
todas as páginas uma vez antes de medir qualquer uma (aquecimento), e a
separar o `open` do `a11y` com uma espera.

Com a página de fato renderizada, a linha de base **subiu**: 31
violações de norma em 14 das 36 combinações página/tamanho. As medidas
de 10 e 17 eram otimistas por acidente.

### Dois tamanhos não é zelo, é necessidade

Quatro páginas (`/entrar`, `/selecionar-perfil`, `/criar-conta/motorista`
e `/criar-conta/profissional`) só reprovam em `link-in-text-block` a
390px: no desktop o link fica num bloco próprio, no celular ele embrulha
dentro de um parágrafo e vira "link distinguível só pela cor". E o
`target-size` do botão "Mostrar senha" **só** aparece a 390px.

Uma varredura que esqueça um dos dois tamanhos devolve um número menor
e mente.

---

## Falhas de norma

### A11Y-01 — Banner de cookies esconde o campo com foco no celular

**Critério**: WCAG 2.4.11 Focus Not Obscured (Minimum), nível AA.

**Evidência**: 390×844, `/criar-conta/pessoal`, avançando com Tab. O
campo Senha fica 66% coberto; a caixa "Li e aceito os Termos" e o link
dos Termos, 100%.

**O que já existe e não basta**: o banner já reserva espaço no fim do
documento (`document.body.style.paddingBottom`, medido com
`ResizeObserver` — correção de 03/11/2026, quando o botão "Criar
empresa" ficava inalcançável). Isso resolve o ÚLTIMO elemento da
página. Não resolve um campo no meio dela: quando o foco chega lá, o
navegador rola o campo para a área visível, e a área visível inclui os
200px que o banner cobre.

**Decisão**: enquanto o banner estiver aberto, gravar a altura real dele
numa variável CSS no `<html>` e usá-la como `scroll-padding-bottom`. É o
mecanismo que o próprio navegador consulta ao rolar algo para o foco —
não precisa interceptar evento nenhum.

Mais duas: não mostrar o convite "Instale o app" enquanto o banner
estiver visível (dois elementos fixos empilhados no rodapé de uma tela
de 844px), e encurtar o texto do banner no celular.

**Arquivos**: `components/cookie-consent-banner.tsx`,
`providers/install-app-prompt.tsx`.

### A11Y-02 — Contraste insuficiente em `/governo`

**Critério**: WCAG 1.4.3 Contrast (Minimum), nível AA — mínimo 4,5:1
para texto abaixo de 18,66px negrito ou 24px. Os selos têm 12px.

**Evidência**:

| elemento                                                         | medida | mínimo |
| ---------------------------------------------------------------- | ------ | ------ |
| `Badge variant="info"` sobre o herói escuro (#06718B em #031628) | 3,26:1 | 4,5:1  |
| `Badge variant="neutral"` (#5B6472 em #DBDDE0)                   | 4,40:1 | 4,5:1  |

**O que a revisão não tinha visto**: o `Badge` neutro reprova em muito
mais lugar que aquele ponto do `/governo`. Calculando as quatro
superfícies do tema claro e as quatro do escuro, o pior caso é
**3,98:1** — e baixar a opacidade do fundo não resolve com folga (a 10%
ainda dá 4,61:1, e o escuro fica em 4,97:1). O defeito é a combinação
"cinza de legenda sobre cinza", não a dosagem dela.

O teste `contraste-wcag.spec.ts` não pegava isso porque cobre as quatro
cores semânticas usando a PRÓPRIA cor como texto (`bg-success/15
text-success`). O neutro é o único que mistura dois tokens diferentes —
`bg-secondary/20` com `text-text-muted` — e por isso escapava.

**Decisão, neutro**: texto passa de `text-text-muted` para `text-text`.
Token que já existe, nenhuma cor nova. Passa com folga nos oito fundos.
**É uma mudança visível em todo o produto**: a etiqueta neutra fica mais
escura em toda tela que a usa. Está declarado aqui para ninguém ser
pego de surpresa.

**Decisão, fundo escuro**: `Badge` ganha `surface="dark"`, implementado
como `data-theme="dark"` no próprio elemento. As variáveis de cor
passam a resolver pela paleta escura, que o design system já tem, e
`bg-info/15 text-info` vai de 3,26:1 para **8,74:1**. Nenhum token novo,
nenhuma cor inventada: é declarar que a etiqueta está sobre superfície
escura, o que é literalmente verdade.

**Arquivos**: `packages/ui/src/web/atoms/Badge/Badge.tsx`,
`app/governo/page.tsx` (linhas 161 e 218).

### A11Y-03 — Links dentro de texto distinguíveis só pela cor

**Critério**: WCAG 1.4.1 Use of Color, nível A.

**Evidência**: `className="text-primary hover:underline"` — sem
sublinhado em repouso, e o contraste do azul contra o texto em volta é
de 1,09:1. Para quem não distingue a cor, não há link ali.

**Decisão**: componente `TextLink` em `@rotta/ui`, com sublinhado sempre
visível (`underline underline-offset-2`) e foco visível. Usado nos seis
pontos do site público:

| arquivo                                             | o quê                       |
| --------------------------------------------------- | --------------------------- |
| `app/(marketing)/contato/page.tsx:39`               | link para `/suporte`        |
| `app/(marketing)/suporte/page.tsx:48`               | `mailto:` do suporte        |
| `app/(marketing)/blog/page.tsx:36`                  | link para `/faq`            |
| `components/cookie-consent-banner.tsx:113`          | Política de Cookies         |
| `components/legal/legal-document-shell.tsx:72 e 91` | índice e links do documento |
| `app/(auth)/criar-conta/pessoal/page.tsx:197`       | "Use seu código aqui"       |

**Oito ocorrências ficam de fora, de propósito**: as de `(dashboard)` —
mesmo defeito, mesma classe, mas área logada, que tem revisão própria.
Ficam listadas aqui para a próxima revisão não precisar redescobrir:
`alunos/[id]/endereco-do-dia`, `alunos/[id]`, `alunos/novo`,
`ocorrencia` (duas) e as duas de `(auth)/convite`.

### A11Y-04 — Botão "Mostrar senha" com 18×18px

**Critério**: WCAG 2.5.8 Target Size (Minimum), nível AA — mínimo 24×24
CSS px. O axe confirma: `target-size` em `/entrar` a 390×844.

**Decisão**: área clicável de no mínimo 44×44 no celular, aumentando o
padding do botão sem aumentar o ícone (o ícone continua 18px). Mantém o
`aria-label`, que já alterna entre "Mostrar senha" e "Ocultar senha", e
ganha `aria-pressed` — o rótulo diz o que o botão FAZ, o `aria-pressed`
diz em que estado ele ESTÁ, e leitor de tela precisa dos dois.

**Arquivos**: `app/(auth)/entrar/page.tsx`,
`app/(auth)/redefinir-senha/page.tsx`.

### A11Y-05 — Cadastro sem preenchimento automático

**Critério**: WCAG 1.3.5 Identify Input Purpose, nível AA.

**Decisão**: `autoComplete="name"`, `"email"` e `"new-password"` nos
campos correspondentes. O telefone já usa `"tel-national"` e fica como
está.

**Arquivos**: `criar-conta/pessoal` (linhas 133 a 165), e conferir
`criar-conta/empresa`, `criar-conta/motorista`,
`criar-conta/profissional` e `convite`.

---

## Boas práticas

Recomendações do axe, não norma. Entram porque o pedido as listou e
porque são baratas — mas ficam separadas: misturar as duas faz uma falha
de norma passar despercebida no meio de dez sugestões. Por isso
`scripts/a11y-check.sh` deixa `best-practice` fora das tags por padrão.

### A11Y-06 — `/governo` sem `<main>`

27 blocos fora de qualquer região. A página fica fora de
`(marketing)/layout.tsx` e não ganhou `<main>` próprio. Envolver o
conteúdo abaixo do cabeçalho.

### A11Y-07 — Telas de login e cadastro sem `<main>` e sem H1

As 7 telas de `(auth)`. A `<div>` externa de `(auth)/layout.tsx:37` vira
`<main>`, e o título de cada tela sai como `h1` via `as="h1"` no
`Typography` — sem mudar o visual, porque `variant` e `as` são
independentes nesse componente.

### A11Y-08 — Marcadores do mapa sem nome

`packages/maps/src/web/index.tsx`, linhas 570-571. Cada marcador já
recebe `marker.titulo` (vai para o popup); falta aplicá-lo como
`aria-label` no elemento. No mapa demonstrativo da home, que é
ilustrativo, marcar o mapa como decorativo (`aria-hidden`, fora da ordem
do Tab) e manter um texto alternativo curto ao lado. Sem quebrar o uso
no painel nem no `apps/mobile`.

### A11Y-09 — Números como títulos na home

"12", "9" e "1" (Rotas ativas, Motoristas, Ocorrências) saem como `h2`
porque `Typography variant="title"` tem `h2` como elemento padrão. Um
leitor de tela que lista os títulos da página ouve "12", "9", "1".
Viram `<dl>`/`<dt>`/`<dd>`.

**Arquivo**: `components/landing-product-mockups.tsx:216-218`.

### A11Y-10 — Ordem de títulos e menus sem nome

Em `/planos`, `/faq`, `/suporte` e `/legal` os títulos pulam de H1 para
H3. E há três `<nav>` sem nome na mesma página, o que faz o leitor de
tela anunciar "navegação" três vezes sem distinguir: `aria-label="Menu
principal"` no de `(marketing)/layout.tsx:187`, e rótulo próprio nos
outros dois.

### A11Y-11 — Texto alternativo repetido no logo

No cabeçalho de `/legal`, `RouteMark` tem `alt="Rotta"` e logo ao lado
está escrito "Rotta". Quem usa leitor de tela ouve duas vezes. Como ali
o logo é decorativo (o nome está escrito), `alt=""`.

Cuidado: `RouteMark` é usado em outros lugares onde o nome NÃO está
escrito ao lado, e ali o `alt` precisa continuar. A correção é no ponto
de uso, não no componente.

---

## Anotado, não corrigido

**Atribuição do mapa (OpenStreetMap/MapLibre)**: o axe não conseguiu
medir o contraste do texto de atribuição — vem marcado como
`incomplete`, não como violação. Fica para verificar à mão numa próxima
revisão. Não foi tocado aqui porque não há medida que diga o que
corrigir.

## Critérios de aceite

- `pnpm turbo run lint typecheck test --filter=@rotta/web --filter=@rotta/ui --filter=@rotta/maps` passa.
- `./scripts/a11y-check.sh` devolve 0 violações nas 18 páginas × 2 tamanhos.
- Com `TAGS=best-practice`, os itens A11Y-06 a A11Y-11 não aparecem mais.
- Teste manual a 390×844, banner aberto, em `/criar-conta/pessoal`:
  avançar com Tab por todos os campos e confirmar, por
  `getBoundingClientRect` contra os elementos `position: fixed`, que
  nenhum campo com foco fica coberto.
