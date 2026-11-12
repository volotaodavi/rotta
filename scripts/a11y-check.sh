#!/usr/bin/env bash
#
# Varredura de acessibilidade das páginas públicas do rottabr.com.br.
#
# ## Por que um script, e não uma linha de comando no PR
#
# A revisão de 10/11/2026 achou 11 problemas em 18 páginas. Nove deles
# só aparecem num tamanho de tela: o banner de cookies cobre o campo com
# foco a 390px e não a 1366px; o contraste do `Badge` sobre fundo escuro
# é o mesmo nos dois. Uma varredura que esqueça um dos dois tamanhos
# devolve "0 violações" e mente.
#
# Então o que é fácil de esquecer vira script: 18 páginas × 2 tamanhos,
# sempre os mesmos, sempre na mesma ordem.
#
# ## Como rodar
#
#   pnpm dev:web                      # em outro terminal, porta 3000
#   ./scripts/a11y-check.sh
#
#   BASE_URL=http://localhost:3100 ./scripts/a11y-check.sh
#   TAGS=best-practice ./scripts/a11y-check.sh
#
# Sai com 1 se houver qualquer violação — serve para CI.
#
# ## Pré-requisito
#
#   npm install -g agent-browser && agent-browser install
#
# `agent-browser a11y` embute o axe-core (4.12.1 na escrita deste
# arquivo) e roda a auditoria dentro da página, sem rede.

set -uo pipefail

BASE_URL="${BASE_URL:-http://localhost:3000}"

# As tags WCAG que a Rotta se obriga a cumprir: A e AA de 2.0, 2.1 e
# 2.2. `best-practice` fica DE FORA por padrão — é recomendação do axe,
# não norma, e misturar as duas faz uma falha de norma passar
# despercebida no meio de dez sugestões. Para ver as recomendações:
# `TAGS=best-practice ./scripts/a11y-check.sh`.
TAGS="${TAGS:-wcag2a,wcag2aa,wcag21a,wcag21aa,wcag22aa}"

# As 18 páginas públicas. Área logada e app mobile têm revisão própria.
PAGINAS=(
  /
  /governo
  /planos
  /faq
  /contato
  /suporte
  /sobre
  /entrar
  /selecionar-perfil
  /criar-conta
  /criar-conta/pessoal
  /criar-conta/empresa
  /criar-conta/motorista
  /criar-conta/profissional
  /baixar-app
  /legal
  /legal/privacidade
  /legal/marco-legal
)

# Desktop e celular. O segundo é onde moram as falhas de alvo de toque e
# de elemento fixo cobrindo o foco.
TAMANHOS=("1366 900" "390 844")

# Quanto esperar a pagina assentar depois de abrir. 1200ms cobriu o
# `next dev` deste contêiner; num build de producao da para baixar.
ASSENTAR_MS="${ASSENTAR_MS:-1200}"

# Menos texto visivel que isto e sinal de pagina que nao renderizou.
# A mais curta das 18 (`/baixar-app`) passa de 400 caracteres.
MINIMO_DE_TEXTO="${MINIMO_DE_TEXTO:-200}"

SAIDA="${SAIDA:-$(mktemp -d)}"
mkdir -p "$SAIDA"

if ! command -v agent-browser >/dev/null 2>&1; then
  echo "agent-browser não encontrado. Instale com:" >&2
  echo "  npm install -g agent-browser && agent-browser install" >&2
  exit 127
fi

# Espera até 90s, e não 10s: `next dev` compila a primeira página sob
# demanda, e num contêiner frio isso passa de meio minuto. Um guarda
# curto aborta a varredura inteira dizendo "nada respondendo" sobre um
# servidor que está de pé — foi o que aconteceu em 12/11/2026, e o
# diagnóstico errado custa mais que a espera.
espera=0
until curl -sf -o /dev/null --max-time 10 "$BASE_URL/"; do
  espera=$((espera + 5))
  if [ "$espera" -ge 90 ]; then
    echo "Nada respondendo em $BASE_URL após ${espera}s — suba o site com \`pnpm dev:web\`." >&2
    exit 1
  fi
  sleep 5
done

echo "axe-core via agent-browser · tags: $TAGS"
echo "base: $BASE_URL · relatórios em: $SAIDA"
echo

# Aquecimento: abre cada página uma vez antes de medir qualquer uma.
# No `next dev` a primeira visita de cada rota paga a compilação; sem
# isto, a primeira varredura do dia mede páginas meio prontas.
printf 'aquecendo %s páginas' "${#PAGINAS[@]}"
for pagina in "${PAGINAS[@]}"; do
  agent-browser open "$BASE_URL$pagina" >/dev/null 2>&1
  printf '.'
done
echo " pronto"
echo

total=0
paginas_com_falha=0

for tamanho in "${TAMANHOS[@]}"; do
  read -r largura altura <<<"$tamanho"
  agent-browser set viewport "$largura" "$altura" >/dev/null 2>&1

  echo "── ${largura}×${altura} ──────────────────────────────────"

  for pagina in "${PAGINAS[@]}"; do
    nome="$(echo "${largura}x${altura}${pagina}" | tr '/' '_')"
    arquivo="$SAIDA/$nome.json"

    # Abrir, esperar assentar, e SÓ ENTÃO auditar — em vez de
    # `a11y <url>`, que navega e mede na mesma tirada.
    #
    # Duas varreduras seguidas davam 17 e 15 violações no mesmo código
    # (12/11/2026). A causa é o `next dev`, que compila cada rota no
    # primeiro acesso: a auditoria às vezes rodava antes da página
    # hidratar, e um elemento que ainda não existe não viola regra
    # nenhuma. Uma medida instável que às vezes diz "0" é pior que
    # nenhuma medida, porque dá para acreditar nela.
    agent-browser open "$BASE_URL$pagina" >/dev/null 2>&1
    agent-browser wait "$ASSENTAR_MS" >/dev/null 2>&1
    # A pagina de fato renderizou? Uma tela presa no spinner nao viola
    # regra nenhuma, e o axe devolve "0" com toda a honestidade do
    # mundo sobre uma pagina que ninguem conseguiria usar.
    #
    # Aconteceu em 12/11/2026: a API estava fora do ar, as telas de
    # `(auth)` ficaram no "Carregando" para sempre, e a varredura deu
    # ok para sete paginas seguidas. Um "0 violacoes" assim e pior que
    # um numero alto, porque ele encerra a investigacao.
    render=$(agent-browser eval 'JSON.stringify({t:document.body.innerText.trim().length,c:document.querySelectorAll("[role=status][aria-label*=arregando]").length})' 2>/dev/null \
      | node -e '''let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{const o=JSON.parse(JSON.parse(s));process.stdout.write(o.t<"'"$MINIMO_DE_TEXTO"'"*1||o.c>0?"vazia":"ok")}catch{process.stdout.write("?")}})''')

    agent-browser a11y --json --tags "$TAGS" >"$arquivo" 2>/dev/null

    if [ "$render" = "vazia" ]; then
      printf '  %-28s NAO RENDERIZOU (spinner ou tela em branco)\n' "$pagina"
      paginas_com_falha=$((paginas_com_falha + 1))
      continue
    fi

    violacoes=$(node -e '
      const fs = require("node:fs");
      try {
        const r = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
        const v = r?.data?.violations ?? [];
        // nodeCount, e não o número de regras: uma regra violada em seis
        // elementos é seis coisas para consertar, não uma.
        process.stdout.write(String(v.reduce((s, x) => s + (x.nodeCount ?? x.nodes?.length ?? 0), 0)));
      } catch { process.stdout.write("erro"); }
    ' "$arquivo")

    if [ "$violacoes" = "erro" ]; then
      printf '  %-28s ?  (auditoria não devolveu JSON)\n' "$pagina"
      paginas_com_falha=$((paginas_com_falha + 1))
    elif [ "$violacoes" != "0" ]; then
      printf '  %-28s %s\n' "$pagina" "$violacoes"
      node -e '
        const fs = require("node:fs");
        const r = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
        for (const v of r.data.violations) {
          console.log(`      [${v.id}] ${v.help} (${v.nodeCount})`);
          for (const n of v.nodes.slice(0, 3)) console.log(`        ${JSON.stringify(n.target)}`);
        }
      ' "$arquivo"
      total=$((total + violacoes))
      paginas_com_falha=$((paginas_com_falha + 1))
    else
      printf '  %-28s ok\n' "$pagina"
    fi
  done
  echo
done

agent-browser close >/dev/null 2>&1 || true

echo "══════════════════════════════════════════════════════"
if [ "$total" -eq 0 ] && [ "$paginas_com_falha" -eq 0 ]; then
  echo "0 violações em ${#PAGINAS[@]} páginas × ${#TAMANHOS[@]} tamanhos."
  exit 0
fi

echo "$total violação(ões) em $paginas_com_falha página(s)."
echo "Relatórios completos: $SAIDA"
exit 1
