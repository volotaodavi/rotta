#!/usr/bin/env python3
"""Monta o Reels de lancamento da Rotta, com as telas reais do aplicativo.

Uso:
    python3 scripts/reels-rotta.py [saida.mp4]

O QUE SAI

    1080x1920, 9:16, 30 fps, H.264 + AAC-less (sem audio), ~33 segundos.
    E o formato que o Instagram pede para a grade de Reels.

POR QUE ELE NAO USA GERADOR DE VIDEO

Porque a peca e sobre um produto que existe. Video gerado por modelo
entregaria uma van bonita que nao e a nossa e uma tela de aplicativo
que nao e a nossa. Aqui cada tela e a mesma reconstrucao que alimenta a
ficha da Play Store, montada a partir de `packages/ui`, `packages/theme`
e `apps/mobile` — ver `scripts/play-store-assets.py`, que este arquivo
importa em vez de copiar.

COMO ELE E MONTADO

Duas ferramentas, cada uma no que faz melhor:

1. **Chromium** desenha as pecas estaticas uma unica vez: as telas do
   aplicativo e o fundo. Sao poucas imagens, em alta resolucao.
2. **Pillow** compoe os ~990 quadros, movendo e esmaecendo essas pecas.

A alternativa — pedir um screenshot ao Chromium por quadro — levaria
horas e daria o mesmo resultado. Assim o video inteiro sai em menos de
dois minutos, e e deterministico: mesma entrada, mesmo arquivo.

O ROTEIRO, OS GANCHOS E A CONFERENCIA contra as quatro proibicoes de
comunicacao de 14/10 estao em
`empresa/marketing/2026-10-20-reels-de-lancamento.md`. Nenhuma frase
deste arquivo foi inventada para o video: todas vem da landing page.
"""

from __future__ import annotations

import importlib.util
import math
import subprocess
import sys
from pathlib import Path

LARGURA, ALTURA = 1080, 1920
FPS = 30

# A tela do aplicativo e desenhada em pontos logicos e ampliada depois,
# igual as pecas da loja. 2,8x deixa margem para o video aproximar sem
# perder nitidez.
TELA_L = 390
ESCALA_DA_TELA = 2.8

AZUL_MARCA = "#0139E1"
PONTO = "#0E98FD"
APOIO = "#A9C6F5"
BRANCO = "#FFFFFF"

# A linha da rota atravessa o rodape do video inteiro e avanca com o
# tempo. E o mesmo recurso das pecas da Play Store, e aqui ele ganha uma
# segunda funcao: dizer quanto falta. Saber quanto falta e o que segura
# quem ja pensou em deslizar.
RODAPE_Y = 1792

SLOGAN = ("Tecnologia para conectar.", "Segurança para tranquilizar.")


def _pecas_da_loja():
    """Importa `play-store-assets.py`, que tem o traco na frente do nome."""
    caminho = Path(__file__).with_name("play-store-assets.py")
    spec = importlib.util.spec_from_file_location("pecas_da_loja", caminho)
    modulo = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(modulo)
    return modulo


# ---------------------------------------------------------------------------
# Tipografia
# ---------------------------------------------------------------------------

PESOS = {400: "400Regular", 600: "600SemiBold", 700: "700Bold", 800: "800ExtraBold"}
_FONTES: dict[tuple[int, int], object] = {}


def fonte(tamanho: int, peso: int = 800):
    from PIL import ImageFont

    chave = (tamanho, peso)
    if chave not in _FONTES:
        base = sorted(
            Path("node_modules/.pnpm").glob(
                "@expo-google-fonts+plus-jakarta-sans@*/node_modules/"
                "@expo-google-fonts/plus-jakarta-sans"
            )
        )[0]
        pasta = PESOS[peso]
        _FONTES[chave] = ImageFont.truetype(
            str(base / pasta / f"PlusJakartaSans_{pasta}.ttf"), tamanho
        )
    return _FONTES[chave]


def camada_de_texto(
    linhas: list[tuple[str, int, int, str]],
    largura: int,
    espaco_entre: int = 18,
):
    """Desenha um bloco de texto centrado e devolve a camada com alfa.

    Cada linha e (texto, tamanho, peso, cor). A camada e desenhada UMA
    vez por cena e depois so deslocada e esmaecida quadro a quadro, que
    e o que deixa a montagem rapida o bastante para rodar em Pillow.
    """
    from PIL import Image, ImageDraw

    medidor = ImageDraw.Draw(Image.new("RGBA", (1, 1)))

    # Encolhe ate caber, em vez de confiar que cabe. A primeira versao
    # confiava, e "Segurança para tranquilizar." saiu com o S cortado na
    # borda esquerda — justamente o slogan, justamente o ultimo quadro.
    ajustadas = []
    for texto, tamanho, peso, cor in linhas:
        while tamanho > 20 and medidor.textlength(texto, font=fonte(tamanho, peso)) > largura:
            tamanho -= 2
        ajustadas.append((texto, tamanho, peso, cor))
    linhas = ajustadas

    alturas = []
    for texto, tamanho, peso, _cor in linhas:
        caixa = medidor.textbbox((0, 0), texto, font=fonte(tamanho, peso))
        alturas.append(caixa[3] - caixa[1] + int(tamanho * 0.34))

    altura = sum(alturas) + espaco_entre * (len(linhas) - 1)
    camada = Image.new("RGBA", (largura, max(altura, 1)), (0, 0, 0, 0))
    pincel = ImageDraw.Draw(camada)

    y = 0
    for (texto, tamanho, peso, cor), alt in zip(linhas, alturas):
        f = fonte(tamanho, peso)
        caixa = pincel.textbbox((0, 0), texto, font=f)
        x = (largura - (caixa[2] - caixa[0])) // 2 - caixa[0]
        pincel.text((x, y - caixa[1] + int(tamanho * 0.17)), texto, font=f, fill=cor)
        y += alt + espaco_entre

    return camada


def quebrar(texto: str, tamanho: int, peso: int, limite: int) -> list[str]:
    """Quebra o texto em linhas que cabem em `limite` pixels."""
    from PIL import Image, ImageDraw

    medidor = ImageDraw.Draw(Image.new("RGBA", (1, 1)))
    f = fonte(tamanho, peso)
    linhas, atual = [], ""
    for palavra in texto.split():
        tentativa = f"{atual} {palavra}".strip()
        if medidor.textlength(tentativa, font=f) <= limite or not atual:
            atual = tentativa
        else:
            linhas.append(atual)
            atual = palavra
    if atual:
        linhas.append(atual)
    return linhas


# ---------------------------------------------------------------------------
# Movimento
# ---------------------------------------------------------------------------


def suave(t: float) -> float:
    """Desaceleracao exponencial, a partir de algo que ja esta visivel.

    Entrada e saida em 0..1. Nao e linear de proposito: movimento linear
    em peca de marca denuncia animacao feita por script.
    """
    t = max(0.0, min(1.0, t))
    return 1 - math.pow(2, -10 * t) if t < 1 else 1.0


def entrada(t: float, inicio: float, duracao: float = 0.55) -> float:
    return suave((t - inicio) / duracao)


def saida(t: float, fim: float, duracao: float = 0.35) -> float:
    """1 enquanto esta no ar, caindo para 0 nos ultimos instantes."""
    if t >= fim:
        return 0.0
    return min(1.0, (fim - t) / duracao)


# ---------------------------------------------------------------------------
# As cenas
#
# (inicio, fim, chave da tela, recorte vertical da tela, titulo, apoios)
#
# O recorte diz que parte da tela o video mostra: 0,0 e o topo. Telas de
# aplicativo sao altas e o quadro e 9:16, entao mostrar tudo encolheria
# a letra a ponto de ninguem ler no celular.
# ---------------------------------------------------------------------------

CENAS = [
    {
        "inicio": 0.0, "fim": 3.0, "tela": None,
        "titulo": ["Cadê a van?"], "tamanho": 132,
        "apoios": [],
    },
    {
        "inicio": 3.0, "fim": 8.0, "tela": "rastreio", "recorte": 0.0,
        "titulo": ["Agora dá para ver."], "tamanho": 86,
        "apoios": ["Transporte escolar acompanhado", "do embarque à entrega"],
    },
    {
        "inicio": 8.0, "fim": 13.5, "tela": "viagens", "recorte": 0.10,
        "titulo": ["Embarcou.", "Desembarcou."], "tamanho": 84,
        "apoios": ["Localização da viagem", "Aviso a cada embarque", "Histórico de viagens"],
    },
    {
        "inicio": 13.5, "fim": 19.0, "tela": "carteira", "recorte": 0.0,
        "titulo": ["Rota, alunos e o caixa", "no mesmo app."], "tamanho": 74,
        "apoios": ["Para transportadora, MEI e autônomo", "Frota e documentos em dia"],
    },
    {
        "inicio": 19.0, "fim": 23.5, "tela": "operacional", "recorte": 0.0,
        "titulo": ["Mais clareza", "em cada viagem."], "tamanho": 78,
        "apoios": ["Motorista e monitor", "Rota e lista de alunos sempre à mão"],
    },
    {
        "inicio": 23.5, "fim": 28.5, "tela": None,
        "titulo": ["Começar leva", "um minuto."], "tamanho": 90,
        "apoios": ["1. Crie a conta em rottabr.com.br", "2. Escolha o seu perfil",
                   "3. 1º mês grátis, sem cartão de crédito"],
    },
    {
        "inicio": 28.5, "fim": 33.0, "tela": None, "marca": True,
        "titulo": list(SLOGAN), "tamanho": 72,
        "apoios": ["O app chega à Play Store"],
    },
]

DURACAO = CENAS[-1]["fim"]


# ---------------------------------------------------------------------------
# Pecas desenhadas pelo Chromium, uma vez cada
# ---------------------------------------------------------------------------


def desenhar_telas(loja, pasta: Path) -> dict:
    """Renderiza as telas do aplicativo, limpas, em alta resolucao."""
    from PIL import Image

    loja.TELA_A = 820
    loja.COM_CROMO = True
    loja.FATOR = 1

    quais = {
        "rastreio": loja.tela_rastreio,
        "viagens": loja.tela_viagens,
        "carteira": loja.tela_carteira,
        "operacional": loja.tela_modo_operacional,
    }

    largura = round(TELA_L * ESCALA_DA_TELA)
    altura = round(loja.TELA_A * ESCALA_DA_TELA)
    placas = {}

    for nome, monta in quais.items():
        destino = pasta / f"tela-{nome}.png"
        html = f"""<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><style>
*{{margin:0;padding:0;box-sizing:border-box}}
{loja.css_das_fontes()}
{loja.css_da_tela()}
html,body{{background:#FFFFFF;width:{largura}px;height:{altura}px;overflow:hidden}}
.escala{{transform:scale({ESCALA_DA_TELA});transform-origin:top left}}
</style></head><body><div class="escala">{monta()}</div></body></html>"""
        loja.render(html, destino, largura, altura)
        placas[nome] = Image.open(destino).convert("RGB")
        print(f"  tela {nome}: {placas[nome].size[0]}x{placas[nome].size[1]}")

    return placas


def desenhar_fundo(loja, pasta: Path):
    """O fundo azul-marinho da marca, com o brilho no alto a esquerda."""
    from PIL import Image

    destino = pasta / "fundo.png"
    loja.FATOR = 1
    html = f"""<!doctype html><html><head><meta charset="utf-8"><style>
*{{margin:0;padding:0}}
html,body{{width:{LARGURA}px;height:{ALTURA}px;overflow:hidden;
  background:radial-gradient(130% 80% at 18% 0%,#0B2E78 0%,#071B45 46%,#040E26 100%)}}
</style></head><body></body></html>"""
    loja.render(html, destino, LARGURA, ALTURA)
    return Image.open(destino).convert("RGB")


def desenhar_simbolo(loja, pasta: Path):
    """O simbolo da marca com o canto arredondado que o sistema aplica."""
    from PIL import Image

    destino = pasta / "simbolo.png"
    lado = 460
    loja.FATOR = 1
    html = f"""<!doctype html><html><head><meta charset="utf-8"><style>
*{{margin:0;padding:0}}
html,body{{width:{lado}px;height:{lado}px;overflow:hidden;background:#040E26}}
img{{width:{lado}px;height:{lado}px;border-radius:104px}}
</style></head><body>
<img src="data:image/png;base64,{loja.b64(loja.SIMBOLO)}"></body></html>"""
    loja.render(html, destino, lado, lado)
    return Image.open(destino).convert("RGB")


# ---------------------------------------------------------------------------
# Montagem
# ---------------------------------------------------------------------------


def preparar_camadas(cenas: list[dict]) -> None:
    """Desenha o texto de cada cena uma vez, antes do primeiro quadro."""
    for cena in cenas:
        linhas = [(linha, cena["tamanho"], 800, BRANCO) for linha in cena["titulo"]]
        cena["_titulo"] = camada_de_texto(linhas, LARGURA - 96, espaco_entre=6)

        if cena["apoios"]:
            apoios = []
            for apoio in cena["apoios"]:
                for pedaco in quebrar(apoio, 38, 400, LARGURA - 200):
                    apoios.append((pedaco, 38, 400, APOIO))
            cena["_apoio"] = camada_de_texto(apoios, LARGURA - 96, espaco_entre=14)
        else:
            cena["_apoio"] = None


def recortar_tela(placa, fracao: float, altura_alvo: int):
    """Recorta a faixa da tela que o quadro vai mostrar."""
    largura = placa.size[0]
    topo = int((placa.size[1] - altura_alvo) * fracao)
    topo = max(0, min(topo, placa.size[1] - altura_alvo))
    return placa.crop((0, topo, largura, topo + altura_alvo))


def montar_quadro(indice: int, fundo, placas, simbolo, cenas):
    """Compoe um quadro do video."""
    from PIL import Image

    t = indice / FPS
    quadro = fundo.copy()

    cena = next((c for c in cenas if c["inicio"] <= t < c["fim"]), cenas[-1])
    local = t - cena["inicio"]
    vivo = min(entrada(t, cena["inicio"]), saida(t, cena["fim"]))

    # --- a tela do aplicativo -------------------------------------------
    if cena.get("tela"):
        placa = placas[cena["tela"]]
        altura_visivel = 1190
        # Deslize vertical lento durante a cena: mostra mais da tela sem
        # cortar nada, e da movimento sem pedir atencao.
        avanco = cena.get("recorte", 0.0) + 0.16 * (local / (cena["fim"] - cena["inicio"]))
        faixa = recortar_tela(placa, avanco, altura_visivel)

        alvo_l = 884
        faixa = faixa.resize((alvo_l, round(altura_visivel * alvo_l / placa.size[0])))

        cartao = Image.new("RGBA", faixa.size, (0, 0, 0, 0))
        cartao.paste(faixa, (0, 0))
        arredondar(cartao, 46)

        y = 742 + int((1 - vivo) * 70)
        sombra = Image.new("RGBA", quadro.size, (0, 0, 0, 0))
        sombra.alpha_composite(
            aplicar_alfa(cartao, vivo), ((LARGURA - alvo_l) // 2, y)
        )
        quadro = Image.alpha_composite(quadro.convert("RGBA"), sombra).convert("RGB")

    # --- o simbolo, so na cena de marca ---------------------------------
    if cena.get("marca"):
        lado = simbolo.size[0]
        marca = Image.new("RGBA", simbolo.size, (0, 0, 0, 0))
        marca.paste(simbolo, (0, 0))
        arredondar(marca, 104)
        y = 470 + int((1 - vivo) * 40)
        camada = Image.new("RGBA", quadro.size, (0, 0, 0, 0))
        camada.alpha_composite(aplicar_alfa(marca, vivo), ((LARGURA - lado) // 2, y))
        quadro = Image.alpha_composite(quadro.convert("RGBA"), camada).convert("RGB")

    # --- titulo e apoio --------------------------------------------------
    topo_do_texto = 1060 if cena.get("marca") else 300
    if cena.get("tela") is None and not cena.get("marca"):
        topo_do_texto = 640

    camada = Image.new("RGBA", quadro.size, (0, 0, 0, 0))
    titulo = cena["_titulo"]
    deslocamento = int((1 - vivo) * 44)
    camada.alpha_composite(
        aplicar_alfa(titulo, vivo), (48, topo_do_texto + deslocamento)
    )

    if cena["_apoio"] is not None:
        # O apoio entra um pouco depois do titulo: primeiro a frase que
        # para o dedo, depois o detalhe.
        vivo_apoio = min(entrada(t, cena["inicio"] + 0.25), saida(t, cena["fim"]))
        y = topo_do_texto + titulo.size[1] + 34 + int((1 - vivo_apoio) * 36)
        camada.alpha_composite(aplicar_alfa(cena["_apoio"], vivo_apoio), (48, y))

    quadro = Image.alpha_composite(quadro.convert("RGBA"), camada).convert("RGB")

    desenhar_rodape(quadro, t)
    return quadro


def aplicar_alfa(camada, fator: float):
    """Multiplica o alfa da camada, para esmaecer sem recriar a imagem."""
    if fator >= 0.999:
        return camada
    copia = camada.copy()
    alfa = copia.getchannel("A").point(lambda v: int(v * max(0.0, fator)))
    copia.putalpha(alfa)
    return copia


def arredondar(camada, raio: int) -> None:
    """Aplica canto arredondado no alfa da camada, no lugar."""
    from PIL import Image, ImageDraw

    mascara = Image.new("L", camada.size, 0)
    ImageDraw.Draw(mascara).rounded_rectangle(
        (0, 0, camada.size[0] - 1, camada.size[1] - 1), raio, fill=255
    )
    camada.putalpha(mascara)


def desenhar_rodape(quadro, t: float) -> None:
    """A linha da rota: atravessa o video e avanca com o tempo."""
    from PIL import ImageDraw

    pincel = ImageDraw.Draw(quadro)
    pincel.line([(0, RODAPE_Y), (LARGURA, RODAPE_Y)], fill="#1B3566", width=5)

    x = int(LARGURA * min(1.0, t / DURACAO))
    pincel.line([(0, RODAPE_Y), (x, RODAPE_Y)], fill=APOIO, width=5)

    no = 17
    pincel.rounded_rectangle(
        (x - no, RODAPE_Y - no, x + no, RODAPE_Y + no), 9, fill=PONTO
    )


def codificar(quadros, destino: Path) -> None:
    """Entrega os quadros ao ffmpeg, em H.264, pelo pipe."""
    import imageio_ffmpeg

    ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
    destino.parent.mkdir(parents=True, exist_ok=True)

    processo = subprocess.Popen(
        [
            ffmpeg, "-y", "-loglevel", "error",
            "-f", "rawvideo", "-pix_fmt", "rgb24",
            "-s", f"{LARGURA}x{ALTURA}", "-r", str(FPS), "-i", "-",
            # yuv420p e perfil alto: e o que o Instagram aceita sem
            # reconverter. faststart poe o indice no comeco, para o video
            # comecar a tocar antes de baixar inteiro.
            "-c:v", "libx264", "-preset", "slow", "-crf", "18",
            "-pix_fmt", "yuv420p", "-profile:v", "high", "-level", "4.0",
            "-movflags", "+faststart",
            str(destino),
        ],
        stdin=subprocess.PIPE,
    )
    for quadro in quadros:
        processo.stdin.write(quadro.tobytes())
    processo.stdin.close()
    if processo.wait() != 0:
        raise SystemExit("ffmpeg falhou ao codificar o video")


def main() -> int:
    destino = Path(
        sys.argv[1] if len(sys.argv) > 1 else "marketing/reels/rotta-lancamento.mp4"
    ).resolve()
    temporario = destino.parent / "_pecas"
    temporario.mkdir(parents=True, exist_ok=True)

    loja = _pecas_da_loja()

    print("Desenhando as pecas estaticas no Chromium")
    placas = desenhar_telas(loja, temporario)
    fundo = desenhar_fundo(loja, temporario)
    simbolo = desenhar_simbolo(loja, temporario)

    print("Preparando as camadas de texto")
    preparar_camadas(CENAS)

    total = int(DURACAO * FPS)
    print(f"Compondo {total} quadros ({DURACAO:.0f}s a {FPS} fps)")

    def gerador():
        for indice in range(total):
            if indice % 150 == 0:
                print(f"  quadro {indice}/{total}")
            yield montar_quadro(indice, fundo, placas, simbolo, CENAS)

    codificar(gerador(), destino)
    tamanho = destino.stat().st_size / 1_000_000
    print(f"\n{destino}  {LARGURA}x{ALTURA}  {DURACAO:.0f}s  {tamanho:.1f} MB")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
