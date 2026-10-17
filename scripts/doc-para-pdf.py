#!/usr/bin/env python3
"""Gera o PDF de um entregavel de cargo a partir do markdown dele.

Uso:
    python3 scripts/doc-para-pdf.py empresa/financeiro/arquivo.md [saida.pdf]

POR QUE ESTE ARQUIVO EXISTE

Os entregaveis dos cargos vivem em `empresa/` como markdown, que e o
formato certo para revisar e versionar. Quando o fundador pede o
documento em PDF, o PDF tem que sair DESSE markdown, nunca de um texto
paralelo escrito a mao: duas fontes de verdade para o mesmo documento e
como um numero diverge entre o que esta no repositorio e o que foi
mandado para fora.

Nao usa pandoc nem biblioteca de markdown de proposito: nenhuma das
duas esta instalada, e o subconjunto que os nossos documentos usam
(titulo, paragrafo, tabela, lista, citacao, negrito, codigo, regua) e
pequeno o bastante para ser convertido aqui, de forma deterministica.
O PDF em si sai do Chromium que ja vem na imagem.

A identidade visual e a da marca: azul `#0A3B85` (o mesmo
`brandDeep` de `packages/theme`), numero tabular em tabela de dinheiro
(coluna de valor que nao alinha e tabela que ninguem confere) e fonte
com serifa no corpo, porque o documento e para ler em pagina, nao em
tela.
"""

from __future__ import annotations

import html
import re
import subprocess
import sys
from pathlib import Path

AZUL = "#0A3B85"
CHROMIUM = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome"

CSS = f"""
@page {{
  size: A4;
  margin: 20mm 18mm 18mm 18mm;
  @bottom-center {{ content: counter(page); }}
}}
* {{ box-sizing: border-box; }}
body {{
  font-family: "DejaVu Serif", Georgia, serif;
  font-size: 10.2pt;
  line-height: 1.52;
  color: #15202b;
  margin: 0;
}}
.capa {{
  border-bottom: 3px solid {AZUL};
  padding-bottom: 14px;
  margin-bottom: 26px;
}}
.marca {{
  font-family: "DejaVu Sans", Arial, sans-serif;
  font-size: 19pt;
  font-weight: 700;
  letter-spacing: 3px;
  color: {AZUL};
  margin: 0;
}}
.capa .sub {{
  font-family: "DejaVu Sans", Arial, sans-serif;
  font-size: 8.2pt;
  letter-spacing: 1.1px;
  text-transform: uppercase;
  color: #5b6b7c;
  margin-top: 5px;
}}
h1 {{
  font-family: "DejaVu Sans", Arial, sans-serif;
  font-size: 17pt;
  line-height: 1.22;
  color: {AZUL};
  margin: 0 0 4px;
}}
h2 {{
  font-family: "DejaVu Sans", Arial, sans-serif;
  font-size: 12.4pt;
  color: {AZUL};
  margin: 26px 0 8px;
  padding-top: 10px;
  border-top: 1px solid #d8e0e8;
  page-break-after: avoid;
}}
h3 {{
  font-family: "DejaVu Sans", Arial, sans-serif;
  font-size: 10.6pt;
  color: #15202b;
  margin: 18px 0 6px;
  page-break-after: avoid;
}}
p {{ margin: 0 0 9px; }}
ul, ol {{ margin: 0 0 10px; padding-left: 20px; }}
li {{ margin-bottom: 4px; }}
strong {{ color: #0b1620; }}
code {{
  font-family: "DejaVu Sans Mono", monospace;
  font-size: 8.6pt;
  background: #eef2f6;
  padding: 1px 3px;
  border-radius: 2px;
}}
blockquote {{
  margin: 10px 0 12px;
  padding: 8px 14px;
  border-left: 3px solid {AZUL};
  background: #f4f7fa;
  font-style: italic;
}}
blockquote p {{ margin: 0; }}
hr {{ border: 0; border-top: 1px solid #d8e0e8; margin: 22px 0; }}
table {{
  width: 100%;
  border-collapse: collapse;
  font-family: "DejaVu Sans", Arial, sans-serif;
  font-size: 8.7pt;
  margin: 10px 0 14px;
  page-break-inside: avoid;
}}
th {{
  background: {AZUL};
  color: #fff;
  text-align: left;
  padding: 6px 8px;
  font-weight: 700;
}}
td {{
  padding: 5px 8px;
  border-bottom: 1px solid #dde4ec;
  vertical-align: top;
}}
tr:nth-child(even) td {{ background: #f7f9fc; }}
/* Dinheiro alinha pela virgula, ou a coluna nao da para conferir. */
td.num, th.num {{ text-align: right; font-variant-numeric: tabular-nums; }}
.rodape {{
  margin-top: 26px;
  padding-top: 10px;
  border-top: 1px solid #d8e0e8;
  font-family: "DejaVu Sans", Arial, sans-serif;
  font-size: 7.8pt;
  color: #5b6b7c;
}}
"""


def inline(texto: str) -> str:
    """Negrito, codigo e italico de uma linha ja escapada."""
    saida = html.escape(texto, quote=False)
    saida = re.sub(r"`([^`]+)`", r"<code>\1</code>", saida)
    saida = re.sub(r"\*\*([^*]+)\*\*", r"<strong>\1</strong>", saida)
    saida = re.sub(r"(?<![\w*])_([^_]+)_(?![\w*])", r"<em>\1</em>", saida)
    return saida


def celulas(linha: str) -> list[str]:
    bruta = linha.strip()
    if bruta.startswith("|"):
        bruta = bruta[1:]
    if bruta.endswith("|"):
        bruta = bruta[:-1]
    return [c.strip() for c in bruta.split("|")]


def converter(markdown: str) -> str:
    linhas = markdown.split("\n")
    saida: list[str] = []
    i = 0
    lista_aberta = False

    def fecha_lista() -> None:
        nonlocal lista_aberta
        if lista_aberta:
            saida.append("</ul>")
            lista_aberta = False

    while i < len(linhas):
        linha = linhas[i]
        cru = linha.rstrip()

        # Tabela: cabecalho, separador e corpo.
        if cru.startswith("|") and i + 1 < len(linhas) and re.match(r"^\s*\|[\s:|-]+\|\s*$", linhas[i + 1]):
            fecha_lista()
            cabecalho = celulas(cru)
            alinhamento = celulas(linhas[i + 1])
            # `---:` no separador marca coluna de numero.
            numericas = {n for n, a in enumerate(alinhamento) if a.endswith(":")}
            saida.append("<table><thead><tr>")
            for n, titulo in enumerate(cabecalho):
                classe = ' class="num"' if n in numericas else ""
                saida.append(f"<th{classe}>{inline(titulo)}</th>")
            saida.append("</tr></thead><tbody>")
            i += 2
            while i < len(linhas) and linhas[i].strip().startswith("|"):
                saida.append("<tr>")
                for n, valor in enumerate(celulas(linhas[i])):
                    classe = ' class="num"' if n in numericas else ""
                    saida.append(f"<td{classe}>{inline(valor)}</td>")
                saida.append("</tr>")
                i += 1
            saida.append("</tbody></table>")
            continue

        if not cru.strip():
            fecha_lista()
            i += 1
            continue

        if cru.startswith("### "):
            fecha_lista()
            saida.append(f"<h3>{inline(cru[4:])}</h3>")
        elif cru.startswith("## "):
            fecha_lista()
            saida.append(f"<h2>{inline(cru[3:])}</h2>")
        elif cru.startswith("# "):
            fecha_lista()
            saida.append(f"<h1>{inline(cru[2:])}</h1>")
        elif re.match(r"^---+$", cru.strip()):
            fecha_lista()
            saida.append("<hr>")
        elif cru.startswith("> "):
            fecha_lista()
            bloco = []
            while i < len(linhas) and linhas[i].startswith(">"):
                bloco.append(linhas[i].lstrip(">").strip())
                i += 1
            saida.append(f"<blockquote><p>{inline(' '.join(bloco))}</p></blockquote>")
            continue
        elif re.match(r"^[-*] ", cru.strip()) or re.match(r"^\d+\. ", cru.strip()):
            if not lista_aberta:
                saida.append("<ul>")
                lista_aberta = True
            texto = re.sub(r"^([-*]|\d+\.)\s+", "", cru.strip())
            # Continuacao indentada do mesmo item.
            while i + 1 < len(linhas) and linhas[i + 1].startswith("  ") and linhas[i + 1].strip() and not re.match(r"^\s*([-*]|\d+\.)\s", linhas[i + 1]):
                i += 1
                texto += " " + linhas[i].strip()
            saida.append(f"<li>{inline(texto)}</li>")
        else:
            fecha_lista()
            bloco = [cru.strip()]
            while (
                i + 1 < len(linhas)
                and linhas[i + 1].strip()
                and not linhas[i + 1].startswith(("#", ">", "|"))
                and not re.match(r"^\s*([-*]|\d+\.)\s", linhas[i + 1])
                and not re.match(r"^---+$", linhas[i + 1].strip())
            ):
                i += 1
                bloco.append(linhas[i].strip())
            saida.append(f"<p>{inline(' '.join(bloco))}</p>")
        i += 1

    fecha_lista()
    return "\n".join(saida)


def main() -> int:
    if len(sys.argv) < 2:
        print(__doc__)
        return 2

    origem = Path(sys.argv[1])
    destino = Path(sys.argv[2]) if len(sys.argv) > 2 else origem.with_suffix(".pdf")
    markdown = origem.read_text(encoding="utf-8")

    corpo = converter(markdown)
    pagina = f"""<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8">
<title>{html.escape(origem.stem)}</title>
<style>{CSS}</style></head>
<body>
<div class="capa">
  <p class="marca">ROTTA</p>
  <p class="sub">Documento interno &middot; {html.escape(origem.as_posix())}</p>
</div>
{corpo}
<p class="rodape">Rotta do Brasil Mobilidade Escolar &middot; documento interno, gerado de
{html.escape(origem.as_posix())} &middot; nao distribuir fora da companhia.</p>
</body></html>"""

    temporario = destino.with_suffix(".html")
    temporario.write_text(pagina, encoding="utf-8")

    subprocess.run(
        [
            CHROMIUM,
            "--headless",
            "--disable-gpu",
            "--no-sandbox",
            "--no-pdf-header-footer",
            f"--print-to-pdf={destino}",
            temporario.as_uri(),
        ],
        check=True,
        capture_output=True,
    )
    temporario.unlink()
    print(f"PDF gerado: {destino} ({destino.stat().st_size // 1024} KB)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
