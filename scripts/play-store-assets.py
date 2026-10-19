#!/usr/bin/env python3
"""Gera as pecas graficas da ficha da Play Store.

Uso:
    python3 scripts/play-store-assets.py [pasta-de-saida]

O QUE ELE GERA

    feature-graphic.png      1024x500   o banner do topo da ficha
    frame-1.png .. frame-8.png  1080x1920   os quadros de screenshot

POR QUE EXISTE

A Play Store exige imagem do aplicativo de verdade, e o print tem que
sair de um aparelho. O que este script faz e a OUTRA metade: a moldura,
o fundo, a chamada e a marca em volta do print, que e onde a conversao
acontece. Cada quadro tem uma area reservada, com a proporcao de tela de
celular, onde o print real entra depois.

As regras de layout vieram da pesquisa de ASO de 19/10/2026, registrada
em `empresa/marketing/2026-10-19-play-store-destaques.md`: chamada de no
maximo cinco palavras, fonte grande o bastante para ler no tamanho de
miniatura, um recado por quadro, e os tres primeiros quadros fechando
sentido juntos, porque sao os que aparecem sem ninguem tocar em nada.

Cores e logotipo saem de `brand/`, nunca redesenhados.
"""

from __future__ import annotations

import base64
import subprocess
import sys
from pathlib import Path

CHROMIUM = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome"
MARCA = Path("apps/web/public/brand/rotta-wordmark-light.png")  # para fundo escuro
SIMBOLO = Path("brand/rotta-marca-1024.png")

AZUL = "#0139E1"
AZUL_CLARO = "#1769FF"
PONTO = "#0E98FD"
TINTA = "#0F2748"

# Cada quadro: (chamada, apoio, tela que o print deve mostrar, tom)
# A ordem e a ordem da ficha, e os tres primeiros foram escolhidos para
# serem lidos juntos: onde esta, quando chega, o que aconteceu.
QUADROS = [
    ("Veja a van ao vivo", "Mapa em tempo real, do portão até a escola",
     "Responsável: acompanhamento com o mapa e a van na rua", "escuro"),
    ("Chega às 07:12", "Previsão calculada pelo trânsito, não pelo relógio",
     "Responsável: cartão de chegada prevista", "claro"),
    ("Embarcou. Desembarcou.", "Você recebe no mesmo instante",
     "Responsável: linha do tempo de embarque e desembarque", "escuro"),
    ("A mensalidade pelo app", "Pix, comprovante e histórico no mesmo lugar",
     "Responsável: tela de Pagamentos com faturas", "claro"),
    ("O motorista só dirige", "Lista do dia, rota traçada e um toque por aluno",
     "Motorista: modo operacional com a próxima parada", "escuro"),
    ("Checklist antes de sair", "Fica salvo, viagem por viagem",
     "Motorista: checklist do veículo", "claro"),
    ("A frota inteira na tela", "Onde cada van está, agora",
     "Empresa: mapa da frota", "escuro"),
    ("Feito para quem leva criança", "Transporte escolar, do cadastro ao pagamento",
     "", "marca"),
]

CSS_BASE = """
*{{margin:0;padding:0;box-sizing:border-box}}
@font-face{{font-family:"Sans";src:local("DejaVu Sans")}}
body{{font-family:"DejaVu Sans",Arial,sans-serif;-webkit-font-smoothing:antialiased}}
"""


def b64(caminho: Path) -> str:
    return base64.b64encode(caminho.read_bytes()).decode()


def frame_html(n: int, chamada: str, apoio: str, tela: str, tom: str) -> str:
    escuro = tom in ("escuro", "marca")
    fundo = (
        f"linear-gradient(160deg,{AZUL} 0%,#0126A8 55%,#01208C 100%)"
        if escuro
        else "linear-gradient(160deg,#F2F6FF 0%,#E3ECFF 100%)"
    )
    cor_texto = "#FFFFFF" if escuro else TINTA
    cor_apoio = "rgba(255,255,255,.82)" if escuro else "#4A5C77"

    if tom == "marca":
        corpo = f"""
        <div class="marca-centro">
          <img class="simbolo" src="data:image/png;base64,{b64(SIMBOLO)}">
          <p class="chamada">{chamada}</p>
          <p class="apoio">{apoio}</p>
        </div>"""
    else:
        corpo = f"""
        <p class="chamada">{chamada}</p>
        <p class="apoio">{apoio}</p>
        <div class="aparelho">
          <div class="tela">
            <span class="reservado">{tela}</span>
          </div>
        </div>"""

    return f"""<!doctype html><html><head><meta charset="utf-8"><style>
{CSS_BASE.format()}
body{{width:1080px;height:1920px;background:{fundo};color:{cor_texto};
  display:flex;flex-direction:column;align-items:center;padding:96px 72px 0;overflow:hidden}}
.chamada{{font-size:86px;font-weight:800;line-height:1.02;letter-spacing:-2.5px;
  text-align:center;text-wrap:balance;max-width:940px}}
.apoio{{font-size:38px;font-weight:400;line-height:1.3;text-align:center;
  color:{cor_apoio};margin-top:28px;max-width:860px}}
/* A moldura e so a borda do aparelho: o print real entra dentro dela. */
.aparelho{{margin-top:76px;width:760px;height:1392px;border-radius:56px;
  background:#0B1220;padding:14px;box-shadow:0 48px 120px rgba(0,0,0,.42)}}
.tela{{width:100%;height:100%;border-radius:44px;background:
  repeating-linear-gradient(45deg,#17233A,#17233A 24px,#1C2A45 24px,#1C2A45 48px);
  display:flex;align-items:center;justify-content:center;padding:64px}}
.reservado{{color:rgba(255,255,255,.58);font-size:30px;line-height:1.45;text-align:center}}
.marca-centro{{flex:1;display:flex;flex-direction:column;align-items:center;
  justify-content:center;gap:12px;padding-bottom:160px}}
.simbolo{{width:280px;height:280px;border-radius:64px;margin-bottom:56px}}
.selo{{position:absolute;top:0;left:0;width:1080px;height:14px;background:{PONTO}}}
</style></head><body><div class="selo"></div>{corpo}</body></html>"""


def feature_html() -> str:
    return f"""<!doctype html><html><head><meta charset="utf-8"><style>
{CSS_BASE.format()}
body{{width:1024px;height:500px;background:linear-gradient(115deg,{AZUL} 0%,#0126A8 70%,#01208C 100%);
  display:flex;align-items:center;gap:52px;padding:0 72px;overflow:hidden;position:relative}}
/* O ponto da marca vira o elemento grafico do banner, em vez de uma
   forma qualquer: e o unico detalhe do simbolo que da para ampliar sem
   descaracterizar a logo. */
.bolha{{position:absolute;right:-120px;top:-180px;width:620px;height:620px;
  border-radius:50%;background:{AZUL_CLARO};opacity:.26}}
.bolha2{{position:absolute;right:120px;bottom:-240px;width:380px;height:380px;
  border-radius:50%;background:{PONTO};opacity:.22}}
img{{width:188px;height:188px;border-radius:44px;position:relative;z-index:2}}
.texto{{position:relative;z-index:2}}
h1{{color:#fff;font-size:62px;font-weight:800;letter-spacing:-2px;line-height:1.04}}
p{{color:rgba(255,255,255,.86);font-size:29px;margin-top:16px;line-height:1.3}}
</style></head><body>
<div class="bolha"></div><div class="bolha2"></div>
<img src="data:image/png;base64,{b64(SIMBOLO)}">
<div class="texto">
  <h1>Transporte escolar<br>que a família acompanha</h1>
  <p>Mapa ao vivo, avisos de embarque e mensalidade no app</p>
</div>
</body></html>"""


def render(html: str, destino: Path, largura: int, altura: int) -> None:
    temporario = destino.with_suffix(".html")
    temporario.write_text(html, encoding="utf-8")
    subprocess.run(
        [CHROMIUM, "--headless", "--disable-gpu", "--no-sandbox",
         f"--window-size={largura},{altura}",
         "--hide-scrollbars", "--force-device-scale-factor=1",
         f"--screenshot={destino}", temporario.as_uri()],
        check=True, capture_output=True,
    )
    temporario.unlink()


def main() -> int:
    saida = Path(sys.argv[1] if len(sys.argv) > 1 else "play-store")
    saida.mkdir(parents=True, exist_ok=True)

    render(feature_html(), saida / "feature-graphic.png", 1024, 500)
    print("feature-graphic.png  1024x500")

    for n, (chamada, apoio, tela, tom) in enumerate(QUADROS, start=1):
        arquivo = saida / f"frame-{n}.png"
        render(frame_html(n, chamada, apoio, tela, tom), arquivo, 1080, 1920)
        print(f"frame-{n}.png  1080x1920  {chamada}")

    print(f"\n{len(QUADROS) + 1} pecas em {saida}/")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
