#!/usr/bin/env python3
"""Gera as pecas graficas da ficha da Play Store, com as telas do app.

Uso:
    python3 scripts/play-store-assets.py [pasta-de-saida]

O QUE ELE GERA

    feature-graphic.png         1024x500    o banner do topo da ficha
    frame-1.png .. frame-8.png  1080x1920   os quadros da ficha

POR QUE ESTE ARQUIVO EXISTE, E POR QUE ELE MUDOU

A primeira versao desenhava a moldura do aparelho com uma area listrada
vazia dentro, esperando que alguem colasse um print tirado de um
celular. O fundador olhou e disse, com razao, que estava generico: "se
vc fez o app, vc tera os designs para o app".

Ele tem razao, e a correcao nao e cosmetica. Este repositorio tem o
design system inteiro: a paleta amostrada do conceito
(`apps/mobile/src/providers/paleta-do-conceito.ts`), a geometria de cada
componente (`packages/ui/src/native`), a fonte da marca (Plus Jakarta
Sans, em `node_modules`) e os icones (Lucide, o mesmo catalogo que
`@rotta/icons/native` reexporta). Desenhar "parecido" com isso, quando o
valor exato esta a um import de distancia, e o que faz uma peca parecer
feita por template.

Entao as telas aqui dentro nao sao ilustracao: cada medida, cor, peso de
fonte e raio vem do codigo que roda no aparelho, e o cabecalho da funcao
de cada tela diz de qual arquivo. Onde eu nao tinha o valor, eu fui ler.

NADA E DESENHADO A MAO

    fonte      node_modules/@expo-google-fonts/plus-jakarta-sans
    icones     node_modules/lucide-react/dist/esm/icons (mesmo catalogo
               que `lucide-react-native`, que `@rotta/icons/native`
               reexporta)
    cores      PALETA_DO_CONCEITO + lightColors de `packages/theme`
    logotipo   brand/ (ver brand/README.md: "nao desenhe outra")
    mapa       tile.openstreetmap.org, que e o basemap que o app
               realmente mostra hoje, porque EXPO_PUBLIC_CARTO_API_KEY
               nao esta configurada (ver packages/maps/src/native)
    rota       router.project-osrm.org, o mesmo OSRM que a API usa em
               `GeoEngineService` para tracar e otimizar rota

OS DADOS DAS TELAS SAO DE TESTE, E DE PROPOSITO

Print de loja com nome de crianca real e exposicao de menor. Os nomes
aqui sao inventados e os enderecos sao de via publica de Marica/RJ, que
e o foro da empresa (`apps/web/src/lib/site-config.ts`). Nenhum numero
desta peca e usado como dado de negocio em lugar nenhum.

REDE

A primeira execucao baixa ~40 tiles do OpenStreetMap e 2 rotas do OSRM,
e guarda em cache no diretorio temporario do sistema. A politica de uso
dos tiles do OSM (https://operations.osmfoundation.org/policies/tiles/)
pede User-Agent identificavel e proibe download em massa; as duas coisas
sao respeitadas aqui. As execucoes seguintes nao tocam a rede.
"""

from __future__ import annotations

import base64
import json
import math
import re
import subprocess
import sys
import tempfile
import urllib.request
from pathlib import Path

CHROMIUM = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome"
SIMBOLO = Path("brand/rotta-marca-1024.png")

USER_AGENT = "rotta-play-store-assets/2.0 (+https://rottabr.com.br; contato@rottabr.com.br)"
CACHE = Path(tempfile.gettempdir()) / "rotta-mapas"

# ---------------------------------------------------------------------------
# Cores
#
# `brand/README.md`: o azul do simbolo (#0139E1) e da marca e NAO e o azul
# da interface (#1769FF). Os dois convivem de proposito, e e por isso que
# o fundo dos quadros usa um e a tela dentro do aparelho usa o outro.
# ---------------------------------------------------------------------------

AZUL_MARCA = "#0139E1"
AZUL = "#1769FF"
PONTO = "#0E98FD"
TINTA = "#0F2748"

# apps/mobile/src/providers/paleta-do-conceito.ts, aplicada por cima de
# `lightColors` de packages/theme/src/tokens/colors.ts.
C = {
    "primary": "#1769FF",
    "primaryMuted": "#EDF4FF",
    "onPrimary": "#FFFFFF",
    "brandDeep": "#0A3B85",
    "brandBand": "#1180FE",
    "onBrandMuted": "#A9C6F5",
    "text": "#0F2748",
    "textMuted": "#8794A5",
    "placeholder": "#A3AEBE",
    "background": "#FFFFFF",
    "surface": "#F2F4F8",
    "surfaceElevated": "#FFFFFF",
    "card": "#FFFFFF",
    "border": "#E6ECF5",
    "hairline": "#F0F3F8",
    "muted": "#F2F4F8",
    "success": "#0FA36B",
    "successMuted": "#E8F9F1",
    "warning": "#D98C0E",
    "warningMuted": "#FFF4E4",
    "danger": "#E5484D",
    "dangerMuted": "#FFE6E6",
    "monitorAccent": "#7C3AED",
    "monitorAccentMuted": "#EFE9FE",
    "driverBackground": "#F6F8FB",
    "driverSuccess": "#18A957",
    "driverDanger": "#E53935",
}

# packages/theme/src/tokens/elevation.ts, nivel `soft`.
SOMBRA_CARTAO = "0 1px 2px 0 rgba(10,44,99,.04), 0 8px 24px -6px rgba(10,44,99,.08)"
# packages/theme/src/tokens/radius.ts
R = {"sm": 6, "md": 10, "lg": 16, "xl": 24, "full": 9999}

# O marcador de veiculo do mapa (packages/maps/src/native/index.tsx).
MAPA_AZUL = "#2563eb"
MAPA_ROTA = "#3b6ef6"

# ---------------------------------------------------------------------------
# Moldura e escala
#
# A tela e montada em pontos logicos (390 de largura, que e o que um
# celular comum reporta) e so depois ampliada. E o que deixa `padding:
# 16` no HTML significar os mesmos 16 do `theme.spacing[4]` do app, em
# vez de um 28 escolhido no olho.
# ---------------------------------------------------------------------------

QUADRO_L, QUADRO_A = 1080, 1920
TELA_L = 390

BARRA_DE_ABAS = 64  # apps/mobile/src/navigation/estilo-da-navegacao.tsx
BARRA_DE_STATUS = 28

# --- modelo "moldura": o aparelho inteiro dentro do quadro -----------------
MOLDURA_TELA_A = 800
MOLDURA_ESCALA = 694 / TELA_L  # 1.779...
JANELA_L, JANELA_A = 694, round(MOLDURA_TELA_A * MOLDURA_ESCALA)  # 694 x 1424
BISEL = 12
TOPO_A = QUADRO_A - (JANELA_A + BISEL * 2) - 40  # 432

# --- modelo "faixa": cartao sangrando, com a rota ligando os quadros -------
#
# O segundo modelo veio de uma referencia que o fundador mandou em
# 19/10/2026 (a ficha do app de motorista da Uber): manchete grande a
# esquerda, uma linha horizontal na MESMA altura em todos os quadros, e o
# cartao da tela sangrando pelo rodape. A linha e o truque: ela continua
# de um quadro para o outro, entao a ficha inteira vira uma peca so
# quando a pessoa desliza.
#
# O que nao foi copiado e a paleta. A Uber usa preto puro e no branco; a
# Rotta tem azul proprio, e um fundo preto com a nossa tipografia so
# pareceria a ficha da Uber com outro logotipo. O fundo aqui e o
# azul-marinho da tinta da marca, e o no da linha e o `#0E98FD` do ponto
# do simbolo — a linha e a ROTA, e cada quadro e uma parada dela.
FAIXA_MARGEM = 144
FAIXA_CARD_L = QUADRO_L - FAIXA_MARGEM * 2  # 792
FAIXA_ESCALA = FAIXA_CARD_L / TELA_L  # 2.0307...
FAIXA_CARD_TOPO = 620
FAIXA_TELA_A = round((QUADRO_A - FAIXA_CARD_TOPO) / FAIXA_ESCALA)  # 640
FAIXA_LINHA_Y = 548

# Estado do desenho, trocado por `main()` antes de montar cada modelo. As
# telas leem daqui em vez de receber mais dois parametros cada uma.
TELA_A = MOLDURA_TELA_A
COM_CROMO = True

# Fator de resolucao. 2 entrega 2160x3840, que e 4K UHD em retrato e o
# MAIOR tamanho que a Play Console aceita (o lado maior nao pode passar
# de 3840); 1 entrega 1080x1920, o tamanho que a propria Google
# recomenda. O desenho nao muda entre os dois: o layout continua em
# pixels de CSS e quem dobra e o `--force-device-scale-factor` do
# Chromium, entao letra, icone e sombra saem vetoriais nos dois. O que
# precisa acompanhar na mao e o mapa, que e imagem (ver `Mapa`).
#
# O padrao e 2, porque a peca entregue e a de maior qualidade que a loja
# aceita. O 1x continua a um argumento de distancia.
FATOR = 2


# ---------------------------------------------------------------------------
# Fonte e icones, lidos de node_modules
# ---------------------------------------------------------------------------

PESOS = {
    400: "400Regular",
    500: "500Medium",
    600: "600SemiBold",
    700: "700Bold",
    800: "800ExtraBold",
}


def _primeiro(padrao: str) -> Path:
    achados = sorted(Path("node_modules/.pnpm").glob(padrao))
    if not achados:
        raise SystemExit(f"nao achei {padrao} — rode `pnpm install` na raiz do monorepo")
    return achados[0]


def css_das_fontes() -> str:
    """Embute Plus Jakarta Sans, a fonte que o app carrega de verdade.

    `packages/theme/src/tokens/typography.ts` registra uma familia por
    peso (`fonteNativa`). No navegador isso vira uma familia so com
    cinco `font-weight`, que e o equivalente fiel: o peso vem do arquivo,
    nunca de engrossar o regular por software, que e o que denuncia
    render falso.
    """
    base = _primeiro("@expo-google-fonts+plus-jakarta-sans@*/node_modules/@expo-google-fonts/plus-jakarta-sans")
    partes = []
    for peso, pasta in PESOS.items():
        arquivo = base / pasta / f"PlusJakartaSans_{pasta}.ttf"
        dados = base64.b64encode(arquivo.read_bytes()).decode()
        partes.append(
            f'@font-face{{font-family:"Jakarta";font-style:normal;font-weight:{peso};'
            f'src:url(data:font/ttf;base64,{dados}) format("truetype")}}'
        )
    return "".join(partes)


_LUCIDE: dict[str, list] = {}


def _arquivo_do_icone(nome: str) -> Path:
    """Resolve o nome do icone para o arquivo que tem o desenho dele.

    Parte do catalogo tem nome antigo que hoje e so um apelido: `History`
    aponta para `rotate-ccw-clock`. Quem sabe disso e o barril do pacote,
    entao e ele que responde, em vez de uma tabela escrita aqui que
    envelhece na proxima atualizacao do Lucide.
    """
    base = _primeiro(
        "lucide-react-native@*/node_modules/lucide-react-native/dist/esm"
    )
    direto = base / "icons" / f"{nome}.mjs"
    if direto.exists():
        return direto

    pascal = "".join(parte.capitalize() for parte in nome.split("-"))
    barril = (base / "lucide-react-native.mjs").read_text(encoding="utf-8")
    achado = re.search(
        rf"as {pascal}[,}}].*?from '\./icons/([a-z0-9-]+)\.mjs'", barril
    )
    if not achado:
        raise SystemExit(f"icone '{nome}' nao existe no catalogo do Lucide")
    return base / "icons" / f"{achado.group(1)}.mjs"


def _no_do_icone(nome: str) -> list:
    """Le o desenho do icone do proprio pacote que o app usa.

    `@rotta/icons/native` reexporta `lucide-react-native`, e e dele que
    isto le. Assim o icone da peca e, tracado por tracado, o icone que
    aparece na tela do celular — nao um desenho parecido.
    """
    if nome in _LUCIDE:
        return _LUCIDE[nome]
    fonte = _arquivo_do_icone(nome).read_text(encoding="utf-8")
    resto = fonte.split("createLucideIcon(", 1)[1]
    resto = resto[resto.index("[") :]
    # Conta colchetes em vez de procurar um terminador fixo: alguns
    # icones vem numa linha so e outros quebrados em varias.
    profundidade, fim = 0, 0
    for posicao, caractere in enumerate(resto):
        if caractere == "[":
            profundidade += 1
        elif caractere == "]":
            profundidade -= 1
            if profundidade == 0:
                fim = posicao + 1
                break
    bruto = re.sub(r"([{,]\s*)([a-zA-Z][a-zA-Z0-9]*)\s*:", r'\1"\2":', resto[:fim])
    _LUCIDE[nome] = json.loads(bruto)
    return _LUCIDE[nome]


def icone(nome: str, tamanho: int = 20, cor: str = "currentColor", traco: float = 2) -> str:
    corpo = []
    for tag, atributos in _no_do_icone(nome):
        pares = " ".join(f'{k}="{v}"' for k, v in atributos.items() if k != "key")
        corpo.append(f"<{tag} {pares}/>")
    return (
        f'<svg class="ic" width="{tamanho}" height="{tamanho}" viewBox="0 0 24 24" fill="none" '
        f'stroke="{cor}" stroke-width="{traco}" stroke-linecap="round" stroke-linejoin="round">'
        + "".join(corpo)
        + "</svg>"
    )


def b64(caminho: Path) -> str:
    return base64.b64encode(caminho.read_bytes()).decode()


# ---------------------------------------------------------------------------
# Mapa
# ---------------------------------------------------------------------------


def _baixar(url: str, destino: Path) -> bytes:
    if destino.exists():
        return destino.read_bytes()
    pedido = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    dados = urllib.request.urlopen(pedido, timeout=30).read()
    destino.parent.mkdir(parents=True, exist_ok=True)
    destino.write_bytes(dados)
    return dados


class Mapa:
    """Um recorte real do basemap, com projecao de verdade.

    Existe para que o marcador do veiculo e a linha da rota caiam em cima
    da rua certa. A alternativa — colar uma imagem de mapa e posicionar
    o pino no olho — produz exatamente a peca que o fundador recusou: o
    pino no meio de um quarteirao, a rota cortando predio.

    Densidade 2: busca o tile um nivel de zoom acima e mostra pela
    metade, que e o equivalente ao @2x de um celular. Sem isso o nome de
    rua sai borrado quando o quadro e ampliado para 1080.
    """

    def __init__(self, lat: float, lon: float, zoom: int, largura: int, altura: int) -> None:
        # A tela ainda e ampliada pela escala do quadro (1,78x ou 2,03x) e
        # depois pelo fator de resolucao. Sem acompanhar os dois, o mapa
        # sairia borrado no meio de uma peca onde todo o resto e vetor.
        self.densidade = 2 * FATOR
        self.zoom = zoom + 1
        self.largura, self.altura = largura, altura
        px, py = self._mundo(lat, lon)
        self.origem_x = px - largura * self.densidade / 2
        self.origem_y = py - altura * self.densidade / 2

    def _mundo(self, lat: float, lon: float) -> tuple[float, float]:
        n = 256 * 2**self.zoom
        x = (lon + 180) / 360 * n
        rad = math.radians(lat)
        y = (1 - math.log(math.tan(rad) + 1 / math.cos(rad)) / math.pi) / 2 * n
        return x, y

    def ponto(self, lat: float, lon: float) -> tuple[float, float]:
        """Coordenada geografica para ponto logico dentro do recorte."""
        px, py = self._mundo(lat, lon)
        return (px - self.origem_x) / self.densidade, (py - self.origem_y) / self.densidade

    def png_base64(self) -> str:
        from PIL import Image

        largura_px = self.largura * self.densidade
        altura_px = self.altura * self.densidade
        tx0, ty0 = int(self.origem_x // 256), int(self.origem_y // 256)
        tx1 = int((self.origem_x + largura_px) // 256)
        ty1 = int((self.origem_y + altura_px) // 256)

        colagem = Image.new("RGB", ((tx1 - tx0 + 1) * 256, (ty1 - ty0 + 1) * 256), "#F2EFE9")
        for tx in range(tx0, tx1 + 1):
            for ty in range(ty0, ty1 + 1):
                arquivo = CACHE / f"{self.zoom}_{tx}_{ty}.png"
                dados = _baixar(
                    f"https://tile.openstreetmap.org/{self.zoom}/{tx}/{ty}.png", arquivo
                )
                if dados:
                    from io import BytesIO

                    tile = Image.open(BytesIO(dados)).convert("RGB")
                    colagem.paste(tile, ((tx - tx0) * 256, (ty - ty0) * 256))

        esq = int(self.origem_x - tx0 * 256)
        topo = int(self.origem_y - ty0 * 256)
        recorte = colagem.crop((esq, topo, esq + largura_px, topo + altura_px))

        from io import BytesIO

        buffer = BytesIO()
        recorte.save(buffer, format="PNG", optimize=True)
        return base64.b64encode(buffer.getvalue()).decode()


def rota_osrm(pontos: list[tuple[float, float]]) -> list[tuple[float, float]]:
    """Traca a rota pelo mesmo OSRM que a API usa em `GeoEngineService`.

    Devolve a lista de (lat, lon) da geometria. E o que faz a linha azul
    seguir a rua em vez de cortar reto entre dois pinos, que e a
    diferenca entre um mapa de produto e um mapa de apresentacao.
    """
    trecho = ";".join(f"{lon},{lat}" for lat, lon in pontos)
    chave = CACHE / ("rota_" + str(abs(hash(trecho))) + ".json")
    url = (
        f"https://router.project-osrm.org/route/v1/driving/{trecho}"
        "?overview=full&geometries=geojson"
    )
    dados = json.loads(_baixar(url, chave))
    return [(lat, lon) for lon, lat in dados["routes"][0]["geometry"]["coordinates"]]


def painel_de_mapa(
    mapa: Mapa,
    rota: list[tuple[float, float]],
    veiculo: tuple[float, float],
    paradas: list[tuple[float, float]] | None = None,
    extras: str = "",
) -> str:
    """O mapa com a rota e os marcadores, nos tamanhos de `@rotta/maps`.

    Marcador de veiculo: circulo de 28 com borda branca de 2 e corpo de
    van dentro, com anel de pulso — copia de `vehicleMarker`,
    `vehicleMarkerBody` e `vehiclePulseRing` de
    `packages/maps/src/native/index.tsx`. Parada: o `marker` simples, 16
    com borda de 2.
    """
    linha = " ".join(f"{x:.1f},{y:.1f}" for x, y in (mapa.ponto(a, o) for a, o in rota))
    vx, vy = mapa.ponto(*veiculo)

    pinos = []
    for lat, lon in paradas or []:
        px, py = mapa.ponto(lat, lon)
        pinos.append(
            f'<div class="pino" style="left:{px:.1f}px;top:{py:.1f}px"></div>'
        )

    return f"""
    <div class="mapa" style="background-image:url(data:image/png;base64,{mapa.png_base64()})">
      <svg class="tracado" width="{mapa.largura}" height="{mapa.altura}">
        <polyline points="{linha}" fill="none" stroke="#FFFFFF" stroke-width="9"
          stroke-linecap="round" stroke-linejoin="round" opacity=".85"/>
        <polyline points="{linha}" fill="none" stroke="{MAPA_ROTA}" stroke-width="5"
          stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      {"".join(pinos)}
      <div class="van" style="left:{vx:.1f}px;top:{vy:.1f}px">
        <div class="van-anel"></div>
        <div class="van-circulo"><div class="van-corpo"><i></i><i></i></div></div>
      </div>
      {extras}
    </div>"""


# ---------------------------------------------------------------------------
# Pecas de interface, uma funcao por componente de `@rotta/ui/native`
# ---------------------------------------------------------------------------


def barra_de_status(hora: str = "07:06", sobre_mapa: bool = False, claro: bool = False) -> str:
    """A barra do sistema.

    Nas telas de mapa cheio ela fica POR CIMA do mapa, porque e isso que
    acontece no aparelho: `fsRoot` e `trackRoot` ocupam a tela inteira e
    o respiro vem de `insets.top` aplicado ao conteudo, nao de uma faixa
    branca empurrando o mapa para baixo.
    """
    if not COM_CROMO:
        return ""
    # `claro` e o `<StatusBar style="light" />` da Carteira: sobre o azul
    # profundo do cabecalho, icone escuro simplesmente some.
    cor = C["onPrimary"] if claro else C["text"]
    classe = "statusbar sobreposta" if sobre_mapa else "statusbar"
    return f"""
    <div class="{classe}" style="color:{cor}">
      <span class="hora">{hora}</span>
      <span class="sinais">{icone("signal", 13, cor, 2.4)}{icone("wifi", 13, cor, 2.4)}
        {icone("battery-full", 15, cor, 2)}</span>
    </div>"""


def rodape_do_sistema() -> str:
    """A barra de gestos do Android, que todo print de celular tem."""
    return '<div class="gesto"><span></span></div>' if COM_CROMO else ""


def pill(rotulo: str, tom: str) -> str:
    """`packages/ui/src/native/atoms/StatusPill` no tamanho `sm`."""
    cores = {
        "success": (C["successMuted"], C["success"]),
        "warning": (C["warningMuted"], C["warning"]),
        "danger": (C["dangerMuted"], C["danger"]),
        "info": (C["primaryMuted"], C["primary"]),
        "neutral": (C["surface"], C["textMuted"]),
    }[tom]
    return (
        f'<span class="pill" style="background:{cores[0]};color:{cores[1]}">{rotulo}</span>'
    )


def cabecalho_do_app(perfil: str, iniciais: str, avisos: int = 0) -> str:
    """`packages/ui/src/native/molecules/AppHeader`."""
    bolinha = f'<span class="sino-bolinha">{avisos}</span>' if avisos else ""
    return f"""
    <div class="appheader">
      <div class="ah-esq">
        <img class="ah-marca" src="data:image/png;base64,{b64(SIMBOLO)}">
        <div>
          <div class="ah-titulo">Rotta</div>
          <div class="ah-perfil">{perfil}{icone("chevron-down", 14, C["textMuted"])}</div>
        </div>
      </div>
      <div class="ah-dir">
        <span class="ah-sino">{icone("bell", 20, C["primary"])}{bolinha}</span>
        <span class="ah-avatar">{iniciais}</span>
      </div>
    </div>"""


def cabecalho_de_pilha(titulo: str) -> str:
    """`opcoesDoCabecalhoDeAba` — titulo 17/700, sem sombra."""
    return f'<div class="navheader">{titulo}</div>'


def secao(titulo: str, acao: str = "") -> str:
    """`packages/ui/src/native/molecules/SectionHeader`."""
    direita = f'<span class="sec-acao">{acao}</span>' if acao else ""
    return f'<div class="sechead"><span class="sec-tit">{titulo}</span>{direita}</div>'


def abas_de_filtro(opcoes: list[tuple[str, int | None]], ativa: int) -> str:
    """`packages/ui/src/native/molecules/FilterTabs`."""
    partes = []
    for indice, (rotulo, contagem) in enumerate(opcoes):
        ligada = indice == ativa
        numero = ""
        if contagem is not None:
            numero = f'<span class="ft-num {"on" if ligada else ""}">{contagem}</span>'
        partes.append(
            f'<span class="ft {"on" if ligada else ""}">{rotulo}{numero}</span>'
        )
    return f'<div class="fttira">{"".join(partes)}</div>'


def cartoes_de_resumo(itens: list[tuple[str, str, str | None, str]]) -> str:
    """`packages/ui/src/native/molecules/SummaryCards`.

    Item: (rotulo, valor, detalhe, tom). Valor zero cai para o fundo
    neutro e a tinta normal, como `fundoDoCard`/`corDoValor` fazem.
    """
    tons = {
        "success": (C["successMuted"], C["success"]),
        "warning": (C["warningMuted"], C["warning"]),
        "danger": (C["dangerMuted"], C["danger"]),
        "info": (C["primaryMuted"], C["primary"]),
        "neutral": (C["surface"], C["textMuted"]),
    }
    partes = []
    for rotulo, valor, detalhe, tom in itens:
        fundo, cor = tons[tom]
        if valor in ("0", "-"):
            fundo, cor = C["surface"], C["text"]
        linha3 = f'<div class="sc-det">{detalhe}</div>' if detalhe else ""
        partes.append(
            f'<div class="sc" style="background:{fundo};color:{cor}">'
            f'<div class="sc-rot">{rotulo}</div><div class="sc-val">{valor}</div>{linha3}</div>'
        )
    return f'<div class="sctira">{"".join(partes)}</div>'


def bloco_de_meio(nome_do_icone: str, titulo: str, sub: str, apoio: bool, opaco: bool) -> str:
    """`packages/ui/src/native/molecules/InfoTile`."""
    cor = C["textMuted"] if apoio else C["primary"]
    classe = "tile apoio" if apoio else "tile"
    if opaco:
        classe += " opaco"
    linha2 = f'<div class="tile-sub">{sub}</div>' if sub else ""
    return (
        f'<div class="{classe}"><span class="tile-ic">{icone(nome_do_icone, 20, cor)}</span>'
        f'<div class="tile-tx"><div class="tile-tit">{titulo}</div>{linha2}</div></div>'
    )


def linha_do_tempo(passos: list[tuple[str, str, str]]) -> str:
    """`packages/ui/src/native/molecules/Timeline`.

    Passo: (rotulo, descricao, estado). Ponto de 14 com borda de 2 (3 no
    `current`), fio de 2, e o `pending` com o miolo vazado.
    """
    cores = {
        "done": C["success"],
        "current": C["primary"],
        "error": C["danger"],
        "pending": C["border"],
    }
    partes = []
    for indice, (rotulo, descricao, estado) in enumerate(passos):
        ultimo = indice == len(passos) - 1
        cor = cores[estado]
        fundo = "transparent" if estado == "pending" else cor
        borda = 3 if estado == "current" else 2
        fio = "" if ultimo else f'<div class="tl-fio" style="background:{cores["done"] if estado == "done" else C["border"]}"></div>'
        peso = 700 if estado == "current" else 600
        tinta = C["textMuted"] if estado == "pending" else C["text"]
        descricao_html = f'<div class="tl-desc">{descricao}</div>' if descricao else ""
        partes.append(
            f'<div class="tl-linha"><div class="tl-trilho">'
            f'<div class="tl-ponto" style="background:{fundo};border:{borda}px solid {cor}"></div>{fio}</div>'
            f'<div class="tl-corpo" style="padding-bottom:{0 if ultimo else 16}px">'
            f'<div class="tl-rot" style="font-weight:{peso};color:{tinta}">{rotulo}</div>'
            f"{descricao_html}</div></div>"
        )
    return f'<div class="tl">{"".join(partes)}</div>'


def botao(rotulo: str, nome_do_icone: str = "", variante: str = "primary") -> str:
    """`apps/mobile/src/features/vehicles/components/vehicle-button.tsx`."""
    if variante == "primary":
        estilo = f"background:{C['primary']};color:{C['onPrimary']};border:0"
        cor = C["onPrimary"]
    else:
        estilo = (
            f"background:{C['surfaceElevated']};color:{C['text']};border:1px solid {C['border']}"
        )
        cor = C["text"]
    svg = icone(nome_do_icone, 16, cor) if nome_do_icone else ""
    return f'<div class="btn" style="{estilo}">{svg}<span>{rotulo}</span></div>'


def interruptor(ligado: bool = True) -> str:
    """O `Switch` do Android com `trackColor.true = primary`."""
    classe = "sw on" if ligado else "sw"
    return f'<div class="{classe}"><span></span></div>'


def barra_de_abas(itens: list[tuple[str, str]], ativa: int, badge: dict[int, int] | None = None) -> str:
    """A barra de abas de `opcoesDaBarraDeAbas` + `SeloDeAba`.

    Altura 64, selo de 42x32 com raio `md`, rotulo de 11/600. A aba ativa
    pinta o selo de azul e o icone de branco; as outras ficam no cinza de
    apoio, que e o `tabBarInactiveTintColor`.
    """
    if not COM_CROMO:
        return ""
    badge = badge or {}
    partes = []
    for indice, (nome_do_icone, rotulo) in enumerate(itens):
        ligada = indice == ativa
        cor = C["onPrimary"] if ligada else C["textMuted"]
        fundo = C["primary"] if ligada else "transparent"
        marca = f'<span class="aba-badge">{badge[indice]}</span>' if indice in badge else ""
        partes.append(
            f'<div class="aba"><span class="aba-selo" style="background:{fundo}">'
            f'{icone(nome_do_icone, 22, cor)}{marca}</span>'
            f'<span class="aba-rot" style="color:{C["primary"] if ligada else C["textMuted"]}">{rotulo}</span></div>'
        )
    return f'<div class="abas">{"".join(partes)}</div>'


ABAS_RESPONSAVEL = [
    ("house", "Início"),
    ("history", "Viagens"),
    ("map", "Mapa"),
    ("bell", "Notificações"),
    ("user", "Perfil"),
]
ABAS_MOTORISTA = [
    ("house", "Início"),
    ("history", "Viagens"),
    ("bell", "Notificações"),
    ("user", "Perfil"),
]
ABAS_EMPRESA = [
    ("house", "Início"),
    ("bus", "Frota"),
    ("route", "Rotas"),
    ("bell", "Notificações"),
    ("user", "Perfil"),
]


# ---------------------------------------------------------------------------
# Dados de demonstracao
#
# Nomes inventados e enderecos de via publica de Marica/RJ. Nada aqui sai
# de banco, e nada aqui vira numero de negocio em lugar nenhum.
# ---------------------------------------------------------------------------

ALUNA = "Helena Martins"
MOTORISTA = "Carlos Andrade"
MONITORA = "Fernanda Lopes"
PLACA = "RTA7C32"
ROTA = "Rota da Manhã"
PARADA = "Rua Domício da Gama, 240"

# Marica/RJ: o trajeto sobe do bairro de Aracatiba ate a altura da
# Avenida Roberto Silveira, que e a via principal da cidade. Sao
# coordenadas de via publica, nao endereco de ninguem.
ORIGEM = (-22.9330, -42.8122)
DESTINO = (-22.9168, -42.8205)


def _mapa_da_viagem(largura: int, altura: int, zoom: int = 15):
    caminho = rota_osrm([ORIGEM, DESTINO])
    meio = caminho[int(len(caminho) * 0.46)]
    mapa = Mapa(meio[0], meio[1], zoom, largura, altura)
    return mapa, caminho, caminho[int(len(caminho) * 0.52)]


# ---------------------------------------------------------------------------
# As telas
# ---------------------------------------------------------------------------


def tela_rastreio() -> str:
    """Responsável, `AcompanharViagemScreen`.

    `apps/mobile/src/features/marketplace/screens/transporte-inicio-screen.tsx`,
    o bloco `trackRoot`: mapa em tela cheia, barra flutuante de 12 nas
    laterais com o botao de voltar de 38 e a pilula de titulo de raio 16,
    e a folha de baixo com raio 24 no topo, alca de 40x4 e os tres blocos
    (estado, veiculo, proxima parada).
    """
    # A folha de baixo pede ~290 pontos para os tres blocos; o mapa fica
    # com o resto. Derivado, e nao fixo, para a mesma tela servir aos dois
    # modelos de quadro.
    altura_do_mapa = TELA_A - 290 - (18 if COM_CROMO else 0)
    mapa, caminho, veiculo = _mapa_da_viagem(TELA_L, altura_do_mapa)
    recentrar = (
        f'<div class="recentrar">{icone("locate-fixed", 20, C["text"])}</div>'
    )
    topo = barra_de_status(sobre_mapa=True) + f"""
      <div class="track-topo">
        <div class="track-voltar">{icone("chevron-left", 20, C["text"])}</div>
        <div class="track-pilula">
          <div class="track-pil-tit">Viagem em andamento</div>
          <div class="track-pil-sub">{PLACA} · {ROTA}</div>
        </div>
      </div>"""
    painel = painel_de_mapa(
        mapa, caminho, veiculo, [DESTINO], extras=topo + recentrar
    )
    return f"""
    <div class="app" style="background:{C['background']}">
      <div class="area-mapa" style="height:{altura_do_mapa}px">{painel}</div>
      <div class="track-folha">
        <div class="track-alca"></div>
        <div class="track-estado">
          {pill("Em viagem agora", "success")}
          <span class="track-eta">{icone("clock", 14, C["success"])}Chegando às 07:12</span>
        </div>
        <div class="veiculo-linha">
          <span class="veiculo-ic">{icone("navigation", 20, C["primary"])}</span>
          <div class="veiculo-tx">
            <div class="vx-nome">Motorista: {MOTORISTA}</div>
            <div class="vx-sub">Monitor: {MONITORA}</div>
            <div class="vx-sub">Posição de agora mesmo</div>
          </div>
        </div>
        <div class="parada-cartao">
          <div class="parada-linha">
            {icone("map-pin", 16, C["primary"])}
            <div>
              <div class="parada-rot">Próxima parada</div>
              <div class="parada-end">{PARADA}</div>
            </div>
          </div>
          <div class="parada-colunas">
            <div><div class="parada-rot">ETA</div><div class="parada-val">07:12</div></div>
            <div><div class="parada-rot">Distância</div><div class="parada-val">1,4 km</div></div>
          </div>
        </div>
      </div>
      {rodape_do_sistema()}
    </div>"""


def tela_acompanhamento() -> str:
    """Responsável, aba Início com o cartao Acompanhamento.

    Mesmo arquivo, bloco `AcompanhamentoCard`: titulo da rota com a
    pilula ao lado, duas colunas separadas por fio de cabelo (motorista
    com selo de 36, veiculo com o icone de onibus), a linha do monitor, o
    destino e a chegada prevista, e o mapa embutido de 180 com raio 16.
    """
    mapa, caminho, veiculo = _mapa_da_viagem(TELA_L - 32, 180, zoom=14)
    return f"""
    <div class="app" style="background:{C['background']}">
      {barra_de_status()}
      {cabecalho_de_pilha("Meu Transporte")}
      <div class="corpo">
        <div class="cartao">
          <div class="cartao-secao">Acompanhamento</div>
          <div class="acomp-topo"><span class="acomp-rota">{ROTA}</span>{pill("Em deslocamento", "success")}</div>
          <div class="acomp-colunas">
            <div class="acomp-col">
              <span class="acomp-selo">{icone("user", 18, C["primary"])}</span>
              <div><div class="acomp-val">{MOTORISTA}</div><div class="acomp-rot">Motorista</div></div>
            </div>
            <div class="acomp-col">
              {icone("bus", 18, C["text"])}
              <div><div class="acomp-val">{PLACA}</div><div class="acomp-rot">Veículo</div></div>
            </div>
          </div>
          <div class="acomp-col">
            <span class="acomp-selo" style="background:{C['monitorAccentMuted']}">{icone("user", 18, C["monitorAccent"])}</span>
            <div><div class="acomp-val">{MONITORA}</div><div class="acomp-rot">Monitor</div></div>
          </div>
          <div class="acomp-destino">
            <div class="acomp-linha">Próximo destino: {PARADA}</div>
            <div class="acomp-linha">Chegada prevista: <b>07:12 (6 min)</b></div>
          </div>
          <div class="acomp-mapa">{painel_de_mapa(mapa, caminho, veiculo, [DESTINO])}</div>
          <div class="acomp-frescor">Posição de agora mesmo</div>
        </div>
        {botao("Acompanhar no mapa", "map-pin")}
        <div class="cartao">
          <div class="acomp-topo"><span class="acomp-rota">Contrato ativo</span>{pill("Ativo", "success")}</div>
          <div class="acomp-linha">Transportes Andrade</div>
        </div>
      </div>
      {barra_de_abas(ABAS_RESPONSAVEL, 1, {3: 2})}
      {rodape_do_sistema()}
    </div>"""


def tela_viagens() -> str:
    """Responsável, aba Viagens.

    Mesmo arquivo, `HistoricoEventosCard`: cabecalho de secao, as pilulas
    Hoje/Semana/Mes e a `Timeline` com um passo por evento, com o horario
    e o local embaixo do rotulo — o local so entra quando a API manda,
    nunca vira travessao.
    """
    passos = [
        ("Desembarcou", "07:41<br>Escola Caminho Novo", "current"),
        ("Embarcou", "07:14<br>Rua Domício da Gama, 240", "done"),
        ("Desembarcou", "Ontem, 17:52<br>Rua Domício da Gama, 240", "done"),
        ("Embarcou", "Ontem, 17:10<br>Escola Caminho Novo", "done"),
        ("Desembarcou", "Ontem, 07:39<br>Escola Caminho Novo", "done"),
        ("Embarcou", "Ontem, 07:13<br>Rua Domício da Gama, 240", "done"),
        ("Marcado como ausente", "22/09, 07:00 · Consulta médica", "error"),
    ]
    return f"""
    <div class="app" style="background:{C['background']}">
      {barra_de_status()}
      {cabecalho_de_pilha("Meu Transporte")}
      <div class="corpo">
        <div class="cartao">
          <div class="viagens-topo">
            {secao("Viagens")}
            {abas_de_filtro([("Hoje", None), ("Semana", None), ("Mês", None)], 0)}
          </div>
          {linha_do_tempo(passos)}
        </div>
      </div>
      {barra_de_abas(ABAS_RESPONSAVEL, 1, {3: 2})}
      {rodape_do_sistema()}
    </div>"""


def tela_pagamentos() -> str:
    """Responsável, aba Perfil, tela Pagamentos.

    `apps/mobile/src/features/parent/screens/pagamentos-screen.tsx`: o
    aluno num seletor (e nao escondido num subtitulo), os quatro cartoes
    de resumo tingidos pelo proprio estado, o botao com o total em aberto
    dentro do rotulo, e as formas de pagamento como blocos de duas linhas
    — tres, depois dois, depois dois, que e a ordem do conceito. O cartao
    recorrente entra opaco com o motivo a mostra, em vez de sumir.
    """
    meios = (
        f'<div class="meios-linha">{bloco_de_meio("copy", "Pix", "copia e cola", False, False)}'
        f'{bloco_de_meio("qr-code", "QR Code", "", False, False)}'
        f'{bloco_de_meio("key-round", "Chave Pix", "", False, False)}</div>'
        f'<div class="meios-linha">{bloco_de_meio("repeat", "Pix recorrente", "", False, False)}'
        f'{bloco_de_meio("credit-card", "Cartão recorrente", "débito e crédito", False, True)}</div>'
        f'<div class="meios-linha">{bloco_de_meio("file-text", "Extrato", "ver movimentações", True, False)}'
        f'{bloco_de_meio("receipt", "Comprovantes", "baixar e compartilhar", True, False)}</div>'
    )
    return f"""
    <div class="app" style="background:{C['background']}">
      {barra_de_status()}
      {cabecalho_do_app("Responsável", "HM", 2)}
      <div class="corpo">
        <div class="titulo-tela" style="font-size:22px">Pagamentos</div>
        <div class="cartao seletor">
          <div class="pessoa">
            <span class="pessoa-av">HM</span>
            <div class="pessoa-tx"><div class="pessoa-nome">{ALUNA}</div><div class="pessoa-sub">Aluno(a)</div></div>
            {icone("chevron-down", 18, C["textMuted"])}
          </div>
        </div>
        <div>
          {secao("Resumo de faturas")}
          {cartoes_de_resumo([
              ("Paga", "7", "R$ 2.240,00", "success"),
              ("A vencer", "1", "R$ 320,00", "warning"),
              ("Vencida", "0", None, "danger"),
              ("Cancelada", "0", None, "neutral"),
          ])}
        </div>
        {botao("Pagar agora R$ 320,00")}
        <div>
          {secao("Formas de pagamento")}
          <div class="meios">{meios}</div>
        </div>
        <div class="secao-faturas">
          {secao("Faturas")}
          {abas_de_filtro([("Em aberto", 1), ("Pagas", 7)], 0)}
          <div>
            <div class="fatura primeira"><span class="fat-comp">out/2026</span>
              <span class="fat-meio">{pill("A vencer", "warning")}</span>
              <span class="fat-dir"><b>R$ 320,00</b><i>vence 25/10</i></span></div>
            <div class="fatura"><span class="fat-comp">set/2026</span>
              <span class="fat-meio">{pill("Paga", "success")}</span>
              <span class="fat-dir"><b>R$ 320,00</b><i>pago 24/09</i></span></div>
          </div>
        </div>
      </div>
      {barra_de_abas(ABAS_RESPONSAVEL, 4, {3: 2})}
      {rodape_do_sistema()}
    </div>"""


def tela_modo_operacional() -> str:
    """Motorista, modo operacional.

    `apps/mobile/src/features/driver/components/modo-operacional.tsx`: a
    pilula de topo com o ponto de estado e o cronometro, a folha com a
    linha de embarcados em 15/700, o Pausar como botao de largura
    confortavel (e nao o circulo pequeno que competia com o gesto do
    mapa), a proxima parada e um aluno por linha, com o botao de
    Embarque/Desembarque em pilula.
    """
    altura_do_mapa = TELA_A - 360 - (BARRA_DE_ABAS + 18 if COM_CROMO else 0)
    mapa, caminho, veiculo = _mapa_da_viagem(TELA_L, altura_do_mapa, zoom=15)
    topo = barra_de_status(sobre_mapa=True) + f"""
      <div class="op-topo">
        <div class="op-pilula"><span class="op-ponto"></span><span class="op-nome">{ROTA}</span>
          <span class="op-timer">00:21</span></div>
        <div class="recentrar estatico">{icone("locate-fixed", 20, C["text"])}</div>
      </div>"""
    painel = painel_de_mapa(mapa, caminho, veiculo, [DESTINO], extras=topo)
    return f"""
    <div class="app" style="background:{C['driverBackground']}">
      <div class="area-mapa" style="height:{altura_do_mapa}px">{painel}</div>
      <div class="op-folha">
        <div class="op-alca"></div>
        <div class="op-embarcados">{icone("users", 18, C["primary"])}
          <span>6/9 alunos embarcados</span>{icone("chevron-right", 18, C["textMuted"])}</div>
        {botao("Pausar", "pause", "secondary")}
        <div class="op-alvo">
          <div class="op-alvo-rot">Próxima parada</div>
          <div class="op-alvo-end">4. {PARADA}</div>
          <div class="op-alvo-eta">07:12 · 1,4 km</div>
        </div>
        {botao("Navegar", "navigation")}
        <div class="op-aluno">
          <span class="op-aluno-nome">Embarque: {ALUNA}</span>
          <span class="op-aluno-acao">{icone("log-in", 16, C["onPrimary"])}Embarque</span>
          <span class="op-aluno-x">{icone("user-x", 20, C["driverDanger"])}</span>
        </div>
        <div class="op-aluno">
          <span class="op-aluno-nome">Embarque: Rafael Nogueira</span>
          <span class="op-aluno-acao">{icone("log-in", 16, C["onPrimary"])}Embarque</span>
          <span class="op-aluno-x">{icone("user-x", 20, C["driverDanger"])}</span>
        </div>
      </div>
      {barra_de_abas(ABAS_MOTORISTA, 0)}
      {rodape_do_sistema()}
    </div>"""


def tela_checklist() -> str:
    """Motorista, checklist do veículo.

    `apps/mobile/src/features/vehicles/screens/checklist-screen.tsx`: o
    cartao da viagem em andamento com a pilula de pendente, os cinco
    itens com `Switch`, o campo de observacoes e, embaixo, o checklist da
    viagem anterior, que fica a vista e nao pode ser editado.
    """
    itens = "".join(
        f'<div class="chk-linha"><span>{rotulo}</span>{interruptor(ligado)}</div>'
        for rotulo, ligado in [
            ("Pneus", True),
            ("Luzes", True),
            ("Combustível", True),
            ("Limpeza", False),
            ("Equipamentos obrigatórios", True),
        ]
    )
    return f"""
    <div class="app" style="background:{C['background']}">
      {barra_de_status()}
      {cabecalho_de_pilha("Checklist")}
      <div class="corpo">
        <div class="cartao">
          <div class="chk-topo"><span class="chk-tit">Ida de 20/10 · R-114</span>{pill("Checklist pendente", "warning")}</div>
          <div class="chk-sub">Viagem em andamento. O checklist registrado agora fica nesta viagem.</div>
        </div>
        <div class="cartao">
          <div class="chk-tit">Novo checklist</div>
          {itens}
          <div class="campo">
            <div class="campo-rot">Observações</div>
            <div class="campo-caixa">Lanternas traseiras para revisar na volta.</div>
          </div>
          {botao("Registrar checklist")}
        </div>
        <div>
          {secao("Viagem anterior")}
          <div class="cartao">
            <div class="chk-sub">Volta de 19/10 · R-113</div>
            <div class="chk-corpo">Tudo OK</div>
            <div class="chk-assin">{MOTORISTA} · 19/10/2026 17:58</div>
          </div>
        </div>
      </div>
      {barra_de_abas(ABAS_MOTORISTA, 3)}
      {rodape_do_sistema()}
    </div>"""


def tela_frota() -> str:
    """Empresa, mapa da frota.

    `apps/mobile/src/features/empresa/screens/empresa-frota-mapa-screen.tsx`:
    a contagem de veiculos em viagem em 14, o mapa de 420 com raio 16, e
    o cartao do veiculo selecionado com a placa, a pilula e a idade da
    ultima posicao, que vem em palavras e nao como hora crua.
    """
    mapa, _caminho, veiculo = _mapa_da_viagem(TELA_L - 32, 420, zoom=14)
    outros = []
    for desvio_lat, desvio_lon in [(0.004, -0.004), (-0.0055, 0.0045), (0.0075, 0.006)]:
        px, py = mapa.ponto(veiculo[0] + desvio_lat, veiculo[1] + desvio_lon)
        outros.append(
            f'<div class="van secundaria" style="left:{px:.1f}px;top:{py:.1f}px">'
            f'<div class="van-circulo"><div class="van-corpo"><i></i><i></i></div></div></div>'
        )
    painel = painel_de_mapa(mapa, [], veiculo, [], extras="".join(outros))
    return f"""
    <div class="app" style="background:{C['background']}">
      {barra_de_status()}
      {cabecalho_de_pilha("Frota")}
      <div class="corpo">
        <div class="frota-contagem">4 veículo(s) em viagem agora. Atualiza automaticamente a cada
          poucos segundos.</div>
        <div class="frota-mapa">{painel}</div>
        <div class="cartao">
          <div class="frota-linha"><span class="frota-placa">{PLACA}</span>{pill("Em viagem", "success")}</div>
          <div class="frota-sub">{ROTA} (MANHA), motorista {MOTORISTA}, monitor {MONITORA}</div>
          <div class="frota-frescor">Posição de agora mesmo</div>
        </div>
      </div>
      {barra_de_abas(ABAS_EMPRESA, 1)}
      {rodape_do_sistema()}
    </div>"""


def tela_carteira() -> str:
    """Transportadora, Carteira Rotta Pay.

    `apps/mobile/src/features/wallet/screens/carteira-screen.tsx`: o
    `AccountHeader` com o topo em `brandDeep`, a faixa de saldo em
    `brandBand` com o olho de esconder, a `ContentSheet` subindo 26
    pontos por cima do azul, a `ActionGrid` de quatro acoes, o cartao do
    pendente e as `MovementRow` de cada entrada e saida.

    ## Onde esta tela mora, e por que isso importa

    Ela e alcancada por Perfil > Veiculo > Rotta Pay, e **so** com
    `role === "empresa"`, que e o dono autonomo/MEI em Modo Acao
    (`VeiculoNavigator`). E por isso que a aba acesa e Perfil, e nao uma
    aba de financeiro: o app nao tem uma.

    ## Tres das quatro acoes aparecem apagadas, de proposito

    Transferir, Pagar e Cartao dependem de parceiro bancario e estao
    indisponiveis no app. A `ActionGrid` as desenha com opacidade 0,45 e
    e assim que elas entram aqui. Esconder as tres daria um quadro mais
    bonito e uma loja mentindo sobre o que o aplicativo faz.

    ## Nenhuma taxa aparece

    A movimentacao de tarifa existe no app (`DEBITO_TARIFA`), mas o
    percentual do RottaPay ainda e recomendacao do CFO, nao decisao do
    fundador. Numero de taxa numa ficha de loja vira promessa de preco,
    entao as linhas mostradas sao mensalidade e saque.
    """
    acoes = []
    for nome_do_icone, rotulo, indisponivel in [
        ("arrow-down-to-line", "Sacar", False),
        ("arrow-up-from-line", "Transferir", True),
        ("receipt", "Pagar", True),
        ("credit-card", "Cartão", True),
    ]:
        classe = "acao apagada" if indisponivel else "acao"
        acoes.append(
            f'<div class="{classe}"><span class="acao-bolha">'
            f'{icone(nome_do_icone, 22, C["primary"])}</span>'
            f'<span class="acao-rot">{rotulo}</span></div>'
        )

    movimentos = []
    for titulo, estado, valor, entrada, dia in [
        ("Mensalidade recebida", "Concluída", "R$ 320,00", True, "18/10/2026"),
        ("Mensalidade recebida", "Concluída", "R$ 320,00", True, "18/10/2026"),
        ("Mensalidade recebida", "Pendente", "R$ 320,00", True, "17/10/2026"),
        ("Saque", "Concluída", "R$ 2.500,00", False, "16/10/2026"),
    ]:
        cor = C["success"] if entrada else C["primary"]
        seta = "arrow-down-to-line" if entrada else "arrow-up-from-line"
        sinal = "+" if entrada else "-"
        movimentos.append(
            f'<div class="mov"><span class="mov-ic">{icone(seta, 18, cor)}</span>'
            f'<div class="mov-tx"><div class="mov-tit">{titulo}</div>'
            f'<div class="mov-sub">{estado}</div></div>'
            f'<div class="mov-dir"><div class="mov-val" style="color:{cor}">{sinal} {valor}</div>'
            f'<div class="mov-data">{dia}</div></div></div>'
        )

    return f"""
    <div class="app" style="background:{C['brandDeep']}">
      {barra_de_status(claro=True)}
      <div class="conta-topo">
        <div class="conta-barra">
          <div class="conta-esq">
            {icone("chevron-left", 24, C["onPrimary"])}
            <img class="conta-marca" src="data:image/png;base64,{b64(SIMBOLO)}">
            <div>
              <div class="conta-tit">Rotta</div>
              <div class="conta-perfil">Transportadora{icone("chevron-down", 14, C["onBrandMuted"])}</div>
            </div>
          </div>
          <div class="conta-dir">
            {icone("bell", 20, C["onPrimary"])}
            <span class="conta-avatar">CA</span>
          </div>
        </div>
        <div class="conta-faixa">
          <div class="conta-faixa-rot">Saldo disponível{icone("eye", 16, C["onPrimary"])}</div>
          <div class="conta-saldo">R$ 4.280,00</div>
        </div>
      </div>
      <div class="folha">
        <div class="acoes">{"".join(acoes)}</div>
        <div class="cartao">
          <div class="pend-rot">A receber (pendente)</div>
          <div class="pend-val">R$ 9.600,00</div>
          <div class="pend-ajuda">Mensalidades de contratos ativados ficam aqui até a confirmação
            de recebimento pela Rotta.</div>
        </div>
        <div>
          {secao("Movimentações")}
          <div class="cartao">{"".join(movimentos)}</div>
        </div>
      </div>
      {barra_de_abas(ABAS_MOTORISTA, 3)}
      {rodape_do_sistema()}
    </div>"""


# ---------------------------------------------------------------------------
# Os quadros
# ---------------------------------------------------------------------------

# (chamada, apoio, tom, funcao que monta a tela)
#
# A ordem e a da ficha, e os tres primeiros foram escolhidos para serem
# lidos juntos — onde esta, quando chega, o que aconteceu — porque sao os
# que aparecem sem ninguem tocar em nada. Regras em
# `empresa/marketing/2026-10-19-play-store-destaques.md`.
QUADROS = [
    ("Veja a van ao vivo", "Mapa em tempo real, do portão até a escola", "escuro", tela_rastreio),
    ("Chega às 07:12", "Previsão calculada pelo trânsito, não pelo relógio", "claro", tela_acompanhamento),
    ("Embarcou. Desembarcou.", "Você recebe no mesmo instante", "escuro", tela_viagens),
    ("A mensalidade pelo app", "Pix, comprovante e histórico no mesmo lugar", "claro", tela_pagamentos),
    ("O motorista só dirige", "Lista do dia, rota traçada e um toque por aluno", "escuro", tela_modo_operacional),
    ("Checklist antes de sair", "Fica salvo, viagem por viagem", "claro", tela_checklist),
    ("A frota inteira na tela", "Onde cada van está, agora", "escuro", tela_frota),
    ("O caixa da transportadora", "Saldo, a receber e cada movimentação no app", "claro", tela_carteira),
]
# Eram nove, com um fecho de marca no fim. A Play Console aceita no
# maximo OITO capturas por tipo de aparelho, entao um tinha que sair, e
# o fecho de marca e o que menos converte: ele nao mostra o produto, e o
# banner (`feature-graphic`) ja faz esse papel no topo da ficha. O
# financeiro da transportadora entrou no lugar dele.


def css_da_tela() -> str:
    """Folha de estilo das telas, em pontos logicos.

    Cada numero aqui tem origem: `theme.spacing` (4/8/12/16/24),
    `theme.radius` (6/10/16/24/9999), os tamanhos de fonte do componente
    correspondente em `packages/ui/src/native`, e a altura de 64 da barra
    de abas de `estilo-da-navegacao.tsx`.
    """
    return f"""
.app{{width:{TELA_L}px;height:{TELA_A}px;display:flex;flex-direction:column;overflow:hidden;
  font-family:"Jakarta",sans-serif;color:{C['text']};line-height:1.3}}
.ic{{display:block;flex:none}}

/* barra de status */
.statusbar{{height:{BARRA_DE_STATUS}px;flex:none;display:flex;align-items:center;
  justify-content:space-between;padding:0 16px;font-size:12px;font-weight:600}}
.statusbar .sinais{{display:flex;align-items:center;gap:5px}}
.statusbar.sobreposta{{position:absolute;left:0;top:0;width:{TELA_L}px;z-index:3}}
/* A barra de gestos do Android. Fica no fim de toda tela porque fica no
   fim de todo aparelho — sem ela o print parece recortado. */
.gesto{{flex:none;height:18px;display:flex;align-items:center;justify-content:center;
  background:{C['card']}}}
.gesto span{{width:108px;height:4px;border-radius:9999px;background:#0F2748;opacity:.28}}

/* AppHeader */
.appheader{{flex:none;display:flex;align-items:center;justify-content:space-between;gap:12px;
  padding:12px 16px;background:{C['background']}}}
.ah-esq{{display:flex;align-items:center;gap:10px}}
.ah-marca{{width:32px;height:32px;border-radius:7px}}
.ah-titulo{{font-size:17px;font-weight:700}}
.ah-perfil{{display:flex;align-items:center;gap:4px;font-size:12px;color:{C['textMuted']}}}
.ah-dir{{display:flex;align-items:center;gap:12px}}
.ah-sino{{position:relative;display:block}}
.sino-bolinha{{position:absolute;right:-8px;top:-6px;min-width:18px;height:18px;padding:0 4px;
  border-radius:9999px;background:{C['danger']};color:#fff;font-size:10px;font-weight:700;
  display:flex;align-items:center;justify-content:center}}
.ah-avatar{{width:36px;height:36px;border-radius:9999px;background:{C['primaryMuted']};
  color:{C['primary']};font-size:13px;font-weight:700;display:flex;align-items:center;
  justify-content:center}}

/* cabecalho de pilha */
.navheader{{flex:none;padding:14px 16px;font-size:17px;font-weight:700;background:{C['background']}}}

/* VehicleScreen */
.corpo{{flex:1;display:flex;flex-direction:column;gap:16px;padding:16px;overflow:hidden}}
.titulo-tela{{font-size:20px;font-weight:700;letter-spacing:-.3px}}

/* VehicleCard */
.cartao{{background:{C['card']};border:1px solid {C['hairline']};border-radius:{R['lg']}px;
  padding:16px;display:flex;flex-direction:column;gap:8px;box-shadow:{SOMBRA_CARTAO}}}
.cartao-secao{{font-size:16px;font-weight:700}}

/* StatusPill */
.pill{{display:inline-flex;align-items:center;padding:3px 10px;border-radius:9999px;
  font-size:11px;font-weight:600;letter-spacing:.2px;white-space:nowrap}}

/* SectionHeader */
.sechead{{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px}}
.sec-tit{{font-size:16px;font-weight:700;letter-spacing:-.2px}}
.sec-acao{{font-size:13px;font-weight:600;color:{C['primary']}}}

/* FilterTabs */
.fttira{{display:flex;gap:8px;padding:0 2px}}
.ft{{display:inline-flex;align-items:center;gap:6px;min-height:38px;padding:0 16px;
  border-radius:9999px;border:1px solid {C['border']};background:{C['card']};
  color:{C['textMuted']};font-size:13px;font-weight:600}}
.ft.on{{background:{C['primary']};border-color:{C['primary']};color:{C['onPrimary']}}}
.ft-num{{min-width:20px;padding:1px 5px;border-radius:9999px;background:{C['surface']};
  color:{C['textMuted']};font-size:11px;font-weight:700;text-align:center}}
.ft-num.on{{background:{C['onPrimary']};color:{C['primary']}}}

/* SummaryCards */
.sctira{{display:flex;gap:8px}}
.sc{{flex:1;min-width:0;min-height:82px;border-radius:{R['md']}px;padding:12px}}
.sc-rot{{font-size:11px;font-weight:600}}
.sc-val{{font-size:22px;font-weight:700;margin-top:2px;font-variant-numeric:tabular-nums}}
.sc-det{{font-size:10px;margin-top:3px;font-variant-numeric:tabular-nums;white-space:nowrap}}

/* InfoTile */
.meios{{display:flex;flex-direction:column;gap:8px}}
.meios-linha{{display:flex;gap:8px}}
.tile{{flex:1;min-width:0;min-height:64px;display:flex;align-items:center;gap:10px;
  padding:12px;border-radius:{R['lg']}px;border:1px solid {C['border']};background:{C['card']}}}
.tile.apoio{{background:{C['surface']};border-color:transparent}}
.tile.opaco{{opacity:.45}}
.tile-ic{{width:24px;display:flex;justify-content:center}}
.tile-tx{{flex:1;min-width:0}}
.tile-tit{{font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}}
.tile-sub{{font-size:11px;color:{C['textMuted']};margin-top:1px;white-space:nowrap;
  overflow:hidden;text-overflow:ellipsis}}

/* Timeline */
.tl-linha{{display:flex}}
.tl-trilho{{width:14px;display:flex;flex-direction:column;align-items:center}}
.tl-ponto{{width:14px;height:14px;border-radius:7px;box-sizing:border-box;flex:none}}
.tl-fio{{flex:1;width:2px;margin-top:4px}}
.tl-corpo{{flex:1;padding-left:12px}}
.tl-rot{{font-size:14px}}
.tl-desc{{font-size:13px;color:{C['textMuted']};margin-top:2px}}

/* VehicleButton */
.btn{{flex:none;min-height:52px;display:flex;align-items:center;justify-content:center;gap:6px;
  padding:16px 24px;border-radius:{R['lg']}px;font-size:14px;font-weight:700;letter-spacing:.2px}}

/* Switch do Android */
.sw{{width:34px;height:14px;border-radius:7px;background:{C['border']};position:relative;flex:none}}
.sw span{{position:absolute;top:-3px;left:0;width:20px;height:20px;border-radius:10px;
  background:#FFF;box-shadow:0 1px 3px rgba(10,44,99,.3)}}
.sw.on{{background:rgba(23,105,255,.42)}}
.sw.on span{{left:14px;background:{C['primary']}}}

/* barra de abas */
.abas{{flex:none;height:{BARRA_DE_ABAS}px;display:flex;align-items:flex-start;
  padding:6px 0 8px;background:{C['card']};border-top:1px solid {C['hairline']}}}
.aba{{flex:1;display:flex;flex-direction:column;align-items:center}}
.aba-selo{{width:42px;height:32px;border-radius:{R['md']}px;display:flex;align-items:center;
  justify-content:center;position:relative}}
.aba-badge{{position:absolute;right:2px;top:0;min-width:16px;height:16px;padding:0 4px;
  border-radius:9999px;background:{C['danger']};color:#fff;font-size:10px;font-weight:700;
  display:flex;align-items:center;justify-content:center}}
.aba-rot{{font-size:11px;font-weight:600;margin-top:2px}}

/* mapa */
.area-mapa{{flex:none;position:relative;overflow:hidden}}
.mapa{{position:absolute;inset:0;background-size:cover;background-position:center;
  overflow:hidden}}
.tracado{{position:absolute;left:0;top:0;overflow:visible}}
.pino{{position:absolute;width:16px;height:16px;margin:-8px 0 0 -8px;border-radius:8px;
  background:{MAPA_AZUL};border:2px solid #fff;box-sizing:border-box}}
.van{{position:absolute;width:52px;height:52px;margin:-26px 0 0 -26px;display:flex;
  align-items:center;justify-content:center}}
.van-anel{{position:absolute;width:46px;height:46px;border-radius:23px;background:{MAPA_AZUL};
  opacity:.18}}
.van-circulo{{position:relative;width:28px;height:28px;border-radius:14px;background:{MAPA_AZUL};
  border:2px solid #fff;box-sizing:border-box;display:flex;align-items:center;justify-content:center;
  box-shadow:0 2px 6px rgba(10,44,99,.35)}}
.van-corpo{{width:14px;height:18px;border-radius:3px;background:#fff;display:flex;
  flex-direction:column;align-items:center;justify-content:space-evenly;padding:2px 0}}
.van-corpo i{{width:10px;height:4px;border-radius:1px;background:{MAPA_AZUL};display:block}}
.van.secundaria{{opacity:.92}}
.recentrar{{position:absolute;right:16px;bottom:16px;width:40px;height:40px;border-radius:9999px;
  background:{C['surfaceElevated']};display:flex;align-items:center;justify-content:center;
  box-shadow:{SOMBRA_CARTAO}}}
.recentrar.estatico{{position:static}}

/* tela de rastreio */
.track-topo{{position:absolute;left:12px;right:12px;top:{BARRA_DE_STATUS + 8}px;display:flex;
  gap:8px;z-index:2}}
.track-voltar{{width:38px;height:38px;border-radius:9999px;background:{C['surfaceElevated']};
  display:flex;align-items:center;justify-content:center;box-shadow:{SOMBRA_CARTAO};flex:none}}
.track-pilula{{max-width:220px;border-radius:{R['lg']}px;padding:8px 14px;
  background:{C['surfaceElevated']};box-shadow:{SOMBRA_CARTAO}}}
.track-pil-tit{{font-size:14px;font-weight:700}}
.track-pil-sub{{font-size:11px;color:{C['textMuted']}}}
.track-folha{{flex:1;background:{C['surfaceElevated']};border-radius:24px 24px 0 0;
  padding:10px 16px 20px;display:flex;flex-direction:column;gap:12px;
  box-shadow:0 -8px 28px -10px rgba(10,44,99,.18)}}
.track-alca{{width:40px;height:4px;border-radius:9999px;background:{C['border']};
  align-self:center;margin-bottom:12px;flex:none}}
.track-estado{{display:flex;align-items:center;justify-content:space-between;gap:8px}}
.track-eta{{display:flex;align-items:center;gap:4px;font-size:14px;font-weight:600;
  color:{C['success']}}}
.veiculo-linha{{display:flex;align-items:center;gap:12px;padding:12px;border-radius:{R['lg']}px;
  border:1px solid {C['border']}}}
.veiculo-ic{{width:44px;height:44px;border-radius:9999px;background:{C['primaryMuted']};
  display:flex;align-items:center;justify-content:center;flex:none}}
.vx-nome{{font-size:14px;font-weight:600}}
.vx-sub{{font-size:12px;color:{C['textMuted']}}}
.parada-cartao{{border:1px solid {C['border']};border-radius:12px;padding:12px;display:flex;
  flex-direction:column;gap:10px}}
.parada-linha{{display:flex;align-items:center;gap:8px}}
.parada-rot{{font-size:11px;color:{C['textMuted']}}}
.parada-end{{font-size:14px;font-weight:600}}
.parada-colunas{{display:flex;gap:12px}}
.parada-colunas>div{{flex:1}}
.parada-val{{font-size:16px;font-weight:700;font-variant-numeric:tabular-nums}}

/* cartao de acompanhamento */
.acomp-topo{{display:flex;align-items:center;gap:10px}}
.acomp-rota{{flex:1;font-size:16px;font-weight:700}}
.acomp-colunas{{display:flex;gap:12px;padding-top:12px;border-top:1px solid {C['hairline']}}}
.acomp-col{{flex:1;min-width:0;display:flex;align-items:center;gap:10px}}
.acomp-selo{{width:36px;height:36px;border-radius:9999px;background:{C['primaryMuted']};
  display:flex;align-items:center;justify-content:center;flex:none}}
.acomp-val{{font-size:14px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}}
.acomp-rot{{font-size:12px;color:{C['textMuted']};margin-top:1px}}
.acomp-destino{{padding-top:12px;border-top:1px solid {C['hairline']};display:flex;
  flex-direction:column;gap:3px}}
.acomp-linha{{font-size:13px;color:{C['textMuted']}}}
.acomp-linha b{{color:{C['text']};font-weight:700}}
.acomp-mapa{{height:180px;border-radius:{R['lg']}px;overflow:hidden;position:relative}}
.acomp-frescor{{font-size:12px;color:{C['textMuted']}}}

/* viagens */
.viagens-topo{{display:flex;flex-direction:column;gap:4px;margin-bottom:10px}}
.viagens-topo .sechead{{margin-bottom:0}}

/* pagamentos */
.seletor{{padding:4px 16px}}
.pessoa{{display:flex;align-items:center;gap:12px;padding:8px 0}}
.pessoa-av{{width:40px;height:40px;border-radius:9999px;background:{C['primaryMuted']};
  color:{C['primary']};font-size:14px;font-weight:700;display:flex;align-items:center;
  justify-content:center;flex:none}}
.pessoa-tx{{flex:1;min-width:0}}
.pessoa-nome{{font-size:15px;font-weight:600}}
.pessoa-sub{{font-size:13px;color:{C['textMuted']};margin-top:2px}}
.secao-faturas{{display:flex;flex-direction:column;gap:12px}}
.secao-faturas .sechead{{margin-bottom:0}}
.fatura{{display:flex;align-items:center;gap:10px;padding:12px 0;
  border-top:1px solid {C['hairline']}}}
.fatura.primeira{{border-top:0}}
.fat-comp{{width:76px;font-size:13px;font-weight:600}}
.fat-meio{{flex:1;min-width:0}}
.fat-dir{{display:flex;flex-direction:column;align-items:flex-end}}
.fat-dir b{{font-size:14px;font-weight:700;font-variant-numeric:tabular-nums}}
.fat-dir i{{font-size:11px;font-style:normal;color:{C['textMuted']};margin-top:2px;
  font-variant-numeric:tabular-nums}}

/* modo operacional */
.op-topo{{position:absolute;left:12px;right:12px;top:{BARRA_DE_STATUS + 8}px;display:flex;
  align-items:flex-start;justify-content:space-between;z-index:2}}
.op-pilula{{display:flex;align-items:center;gap:8px;padding:8px 14px;border-radius:9999px;
  background:{C['surfaceElevated']};box-shadow:{SOMBRA_CARTAO}}}
.op-ponto{{width:8px;height:8px;border-radius:9999px;background:{C['primary']}}}
.op-nome{{font-size:14px;font-weight:700;max-width:110px;white-space:nowrap;overflow:hidden;
  text-overflow:ellipsis}}
.op-timer{{font-size:13px;font-weight:700;color:{C['primary']};font-variant-numeric:tabular-nums}}
.op-folha{{flex:1;background:{C['surfaceElevated']};border-radius:24px 24px 0 0;
  padding:8px 16px 10px;display:flex;flex-direction:column;gap:10px;
  box-shadow:0 -8px 28px -10px rgba(10,44,99,.18)}}
.op-alca{{width:40px;height:4px;border-radius:9999px;background:{C['border']};align-self:center;
  margin-bottom:4px;flex:none}}
.op-embarcados{{display:flex;align-items:center;gap:10px;padding:4px 0}}
.op-embarcados span{{flex:1;font-size:15px;font-weight:700}}
.op-alvo{{padding-top:12px;border-top:1px solid {C['hairline']}}}
.op-alvo-rot{{font-size:11px;color:{C['textMuted']}}}
.op-alvo-end{{font-size:14px;font-weight:600}}
.op-alvo-eta{{font-size:12px;color:{C['textMuted']};font-variant-numeric:tabular-nums}}
.op-aluno{{display:flex;align-items:center;gap:16px;padding:6px 0}}
.op-aluno-nome{{flex:1;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}}
.op-aluno-acao{{display:flex;align-items:center;gap:6px;padding:8px 12px;border-radius:9999px;
  background:{C['primary']};color:{C['onPrimary']};font-size:14px;font-weight:600;flex:none}}

/* checklist */
.chk-topo{{display:flex;align-items:center;gap:8px}}
.chk-tit{{font-size:16px;font-weight:700;flex:1}}
.chk-sub{{font-size:13px;color:{C['textMuted']}}}
.chk-corpo{{font-size:14px}}
.chk-assin{{font-size:12px;color:{C['textMuted']}}}
.chk-linha{{display:flex;align-items:center;justify-content:space-between;font-size:14px}}
.campo{{display:flex;flex-direction:column;gap:6px}}
.campo-rot{{font-size:12px;font-weight:600;color:{C['textMuted']}}}
.campo-caixa{{border:1px solid {C['border']};border-radius:{R['lg']}px;padding:14px 16px;
  font-size:16px;background:{C['surfaceElevated']};min-height:72px}}

/* carteira (AccountHeader + ContentSheet + ActionGrid + MovementRow) */
.conta-topo{{flex:none;background:{C['brandDeep']};padding:8px 0 26px}}
.conta-barra{{min-height:44px;display:flex;align-items:center;justify-content:space-between;
  gap:12px;padding:0 16px}}
.conta-esq{{display:flex;align-items:center;gap:10px}}
.conta-marca{{width:32px;height:32px;border-radius:7px}}
.conta-tit{{font-size:17px;font-weight:700;color:{C['onPrimary']}}}
.conta-perfil{{display:flex;align-items:center;gap:4px;font-size:12px;color:{C['onBrandMuted']}}}
.conta-dir{{display:flex;align-items:center;gap:12px}}
.conta-avatar{{width:36px;height:36px;border-radius:9999px;background:{C['brandBand']};
  color:{C['onPrimary']};font-size:13px;font-weight:700;display:flex;align-items:center;
  justify-content:center}}
.conta-faixa{{margin:16px 16px 0;padding:16px;border-radius:{R['lg']}px;
  background:{C['brandBand']}}}
.conta-faixa-rot{{display:flex;align-items:center;gap:8px;font-size:13px;font-weight:600;
  color:{C['onPrimary']};opacity:.92}}
.conta-saldo{{font-size:28px;font-weight:700;letter-spacing:-.5px;margin-top:4px;
  color:{C['onPrimary']};font-variant-numeric:tabular-nums}}
/* A folha sobe 26 pontos por cima do azul, como `sobreposicaoDaFolha`. */
.folha{{flex:1;margin-top:-26px;padding:16px;display:flex;flex-direction:column;gap:16px;
  background:{C['background']};border-radius:{R['xl']}px {R['xl']}px 0 0;overflow:hidden}}
.acoes{{display:flex;gap:8px}}
.acao{{flex:1;display:flex;flex-direction:column;align-items:center}}
.acao.apagada{{opacity:.45}}
.acao-bolha{{width:54px;height:54px;border-radius:{R['lg']}px;background:{C['primaryMuted']};
  display:flex;align-items:center;justify-content:center}}
.acao-rot{{font-size:12px;font-weight:600;margin-top:8px;text-align:center}}
.pend-rot{{font-size:11px;font-weight:600;color:{C['textMuted']}}}
.pend-val{{font-size:20px;font-weight:700;font-variant-numeric:tabular-nums}}
.pend-ajuda{{font-size:11px;line-height:1.45;color:{C['textMuted']}}}
.mov{{display:flex;align-items:center;gap:12px}}
.mov-ic{{width:38px;height:38px;display:flex;align-items:center;justify-content:center;flex:none}}
.mov-tx{{flex:1;min-width:0}}
.mov-tit{{font-size:14px;font-weight:600}}
.mov-sub{{font-size:12px;color:{C['textMuted']};margin-top:2px}}
.mov-dir{{display:flex;flex-direction:column;align-items:flex-end}}
.mov-val{{font-size:14px;font-weight:700;font-variant-numeric:tabular-nums}}
.mov-data{{font-size:11px;color:{C['textMuted']};margin-top:2px;font-variant-numeric:tabular-nums}}

/* frota */
.frota-contagem{{font-size:14px;color:{C['textMuted']}}}
.frota-mapa{{height:420px;border-radius:{R['lg']}px;overflow:hidden;position:relative;flex:none}}
.frota-linha{{display:flex;align-items:center;justify-content:space-between}}
.frota-placa{{font-size:14px;font-weight:700}}
.frota-sub{{font-size:14px;color:{C['textMuted']}}}
.frota-frescor{{font-size:12px;color:{C['textMuted']}}}
"""


def quadro_html(chamada: str, apoio: str, tom: str, monta_tela) -> str:
    escuro = tom == "escuro"
    fundo = (
        f"linear-gradient(158deg,{AZUL_MARCA} 0%,#0127AC 52%,#011C7E 100%)"
        if escuro
        else "linear-gradient(158deg,#F4F7FF 0%,#E4ECFF 100%)"
    )
    cor_texto = "#FFFFFF" if escuro else TINTA
    cor_apoio = "rgba(255,255,255,.80)" if escuro else "#55678A"

    if tom == "marca":
        corpo = f"""
        <div class="marca-centro">
          <img class="simbolo" src="data:image/png;base64,{b64(SIMBOLO)}">
          <p class="chamada">{chamada}</p>
          <p class="apoio">{apoio}</p>
        </div>"""
    else:
        corpo = f"""
        <div class="topo">
          <p class="chamada">{chamada}</p>
          <p class="apoio">{apoio}</p>
        </div>
        <div class="aparelho"><div class="janela"><div class="escala">{monta_tela()}</div></div></div>"""

    return f"""<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><style>
*{{margin:0;padding:0;box-sizing:border-box}}
{css_das_fontes()}
{css_da_tela()}
body{{width:{QUADRO_L}px;height:{QUADRO_A}px;background:{fundo};color:{cor_texto};
  overflow:hidden;position:relative;font-family:"Jakarta",sans-serif;
  -webkit-font-smoothing:antialiased}}
.selo{{position:absolute;top:0;left:0;width:{QUADRO_L}px;height:12px;background:{PONTO}}}
.topo{{position:absolute;top:0;left:0;width:{QUADRO_L}px;height:{TOPO_A}px;display:flex;
  flex-direction:column;align-items:center;justify-content:center;padding:28px 80px 0}}
.chamada{{font-size:78px;font-weight:800;line-height:1.04;letter-spacing:-2.4px;text-align:center;
  text-wrap:balance;max-width:900px}}
.apoio{{font-size:35px;font-weight:400;line-height:1.32;text-align:center;color:{cor_apoio};
  margin-top:24px;max-width:820px;text-wrap:balance}}
/* A moldura e so o aparelho: o que esta dentro dela e a tela do app,
   montada com os tokens de `packages/theme` e os componentes de
   `packages/ui/src/native`, nao um print colado. */
.aparelho{{position:absolute;top:{TOPO_A}px;left:{(QUADRO_L - (JANELA_L + BISEL * 2)) // 2}px;
  width:{JANELA_L + BISEL * 2}px;height:{JANELA_A + BISEL * 2}px;border-radius:54px;
  background:#060B16;padding:{BISEL}px;box-shadow:0 44px 110px rgba(0,0,0,.44),
  inset 0 0 0 1px rgba(255,255,255,.10)}}
.janela{{width:{JANELA_L}px;height:{JANELA_A}px;border-radius:43px;overflow:hidden;
  background:#FFF;position:relative}}
.escala{{transform:scale({MOLDURA_ESCALA});transform-origin:top left}}
</style></head><body><div class="selo"></div>{corpo}</body></html>"""


def quadro_faixa_html(
    chamada: str, apoio: str, monta_tela, indice: int, total: int
) -> str:
    """O segundo modelo: manchete a esquerda, rota contínua, cartão sangrando.

    A linha fica na MESMA altura em todos os quadros e o nó anda da
    esquerda para a direita, um passo por quadro. Quem desliza a ficha vê
    uma rota sendo percorrida, e não oito imagens soltas: é o mesmo
    recurso da referência, com o sentido que ele tem aqui — a Rotta é
    rota, e cada quadro é uma parada.

    O cartão não tem moldura de aparelho e sangra pelo rodapé. Isso troca
    o enquadramento: em vez de mostrar o celular inteiro pequeno, mostra
    a tela grande e cortada, que é o que faz o texto do app continuar
    legível na miniatura da loja.
    """
    primeiro, ultimo = indice == 0, indice == total - 1
    # Primeiro e ultimo quadro nao tem linha antes/depois: a rota comeca
    # e termina neles.
    vao = QUADRO_L - FAIXA_MARGEM * 2
    no_x = FAIXA_MARGEM + round(vao * indice / (total - 1))
    linha_esq = (
        ""
        if primeiro
        else f'<div class="rota-linha" style="left:0;width:{no_x - 17}px"></div>'
    )
    linha_dir = (
        ""
        if ultimo
        else f'<div class="rota-linha" style="left:{no_x + 17}px;right:0"></div>'
    )

    corpo = f"""
        <div class="faixa-topo">
          <p class="faixa-chamada">{chamada}</p>
          <p class="faixa-apoio">{apoio}</p>
        </div>
        <div class="faixa-cartao"><div class="faixa-escala">{monta_tela()}</div></div>"""

    return f"""<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><style>
*{{margin:0;padding:0;box-sizing:border-box}}
{css_das_fontes()}
{css_da_tela()}
body{{width:{QUADRO_L}px;height:{QUADRO_A}px;overflow:hidden;position:relative;
  font-family:"Jakarta",sans-serif;color:#FFFFFF;-webkit-font-smoothing:antialiased;
  background:radial-gradient(130% 90% at 18% 0%,#0B2E78 0%,#071B45 46%,#040E26 100%)}}
/* A manchete e ancorada no TOPO, e nao centrada no espaco que sobra:
   com uma linha ou com duas ela comeca na mesma altura, e e isso que faz
   os oito quadros parecerem a mesma peca quando a pessoa desliza. */
.faixa-topo{{position:absolute;left:{FAIXA_MARGEM}px;top:0;width:{QUADRO_L - FAIXA_MARGEM * 2}px;
  height:{FAIXA_LINHA_Y - 40}px;display:flex;flex-direction:column;justify-content:flex-start;
  padding-top:196px}}
.faixa-chamada{{font-size:94px;font-weight:800;line-height:1.0;letter-spacing:-3.2px;
  text-wrap:balance}}
.faixa-apoio{{font-size:32px;font-weight:400;line-height:1.32;margin-top:32px;
  max-width:{QUADRO_L - FAIXA_MARGEM * 2}px;color:#A9C6F5}}
/* A rota: a linha fica na mesma altura em todo quadro, e so o no anda. */
.rota-linha{{position:absolute;top:{FAIXA_LINHA_Y - 2}px;height:4px;
  background:rgba(169,198,245,.45)}}
.rota-no{{position:absolute;top:{FAIXA_LINHA_Y - 15}px;width:30px;height:30px;border-radius:9px;
  background:{PONTO};box-shadow:0 8px 24px rgba(14,152,253,.55)}}
.faixa-cartao{{position:absolute;left:{FAIXA_MARGEM}px;top:{FAIXA_CARD_TOPO}px;
  width:{FAIXA_CARD_L}px;height:{QUADRO_A - FAIXA_CARD_TOPO}px;border-radius:40px 40px 0 0;
  overflow:hidden;background:#FFFFFF;box-shadow:0 30px 90px rgba(2,10,30,.6)}}
.faixa-escala{{transform:scale({FAIXA_ESCALA});transform-origin:top left}}
</style></head><body>
{linha_esq}{linha_dir}<div class="rota-no" style="left:{no_x - 15}px"></div>
{corpo}</body></html>"""


def feature_html() -> str:
    return f"""<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><style>
*{{margin:0;padding:0;box-sizing:border-box}}
{css_das_fontes()}
body{{width:1024px;height:500px;font-family:"Jakarta",sans-serif;-webkit-font-smoothing:antialiased;
  background:linear-gradient(115deg,{AZUL_MARCA} 0%,#0127AC 68%,#011C7E 100%);
  display:flex;align-items:center;gap:52px;padding:0 76px;overflow:hidden;position:relative}}
/* O ponto da marca vira o elemento grafico do banner, em vez de uma
   forma qualquer: e o unico detalhe do simbolo que da para ampliar sem
   descaracterizar a logo (brand/README.md). */
.bolha{{position:absolute;right:-130px;top:-190px;width:620px;height:620px;border-radius:50%;
  background:{AZUL};opacity:.26}}
.bolha2{{position:absolute;right:110px;bottom:-250px;width:390px;height:390px;border-radius:50%;
  background:{PONTO};opacity:.22}}
img{{width:190px;height:190px;border-radius:44px;position:relative;z-index:2;
  box-shadow:0 20px 50px rgba(0,0,0,.3)}}
.texto{{position:relative;z-index:2}}
h1{{color:#fff;font-size:54px;font-weight:800;letter-spacing:-2px;line-height:1.06}}
p{{color:rgba(255,255,255,.84);font-size:28px;font-weight:400;margin-top:18px;line-height:1.32}}
</style></head><body>
<div class="bolha"></div><div class="bolha2"></div>
<img src="data:image/png;base64,{b64(SIMBOLO)}">
<div class="texto">
  <h1>Transporte escolar<br>que a família acompanha</h1>
  <p>Mapa ao vivo, avisos de embarque e mensalidade no app</p>
</div>
</body></html>"""


def feature_faixa_html() -> str:
    """O banner do modelo faixa: mesma rota do carrossel atravessando ele.

    O banner fica acima das capturas na ficha, entao a linha sai dele e
    continua no primeiro quadro. E o mesmo recurso da referencia, um
    degrau acima: a rota comeca antes da primeira tela.
    """
    return f"""<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><style>
*{{margin:0;padding:0;box-sizing:border-box}}
{css_das_fontes()}
body{{width:1024px;height:500px;font-family:"Jakarta",sans-serif;-webkit-font-smoothing:antialiased;
  color:#FFFFFF;overflow:hidden;position:relative;display:flex;align-items:center;gap:48px;
  padding:0 72px;background:radial-gradient(130% 120% at 16% 0%,#0B2E78 0%,#071B45 48%,#040E26 100%)}}
.rota{{position:absolute;left:0;right:0;bottom:74px;height:4px;background:rgba(169,198,245,.4)}}
.no{{position:absolute;left:150px;bottom:61px;width:30px;height:30px;border-radius:9px;
  background:{PONTO};box-shadow:0 8px 24px rgba(14,152,253,.55)}}
img{{width:180px;height:180px;border-radius:42px;position:relative;z-index:2;
  box-shadow:0 22px 56px rgba(2,10,30,.6)}}
.texto{{position:relative;z-index:2;padding-bottom:52px}}
h1{{font-size:54px;font-weight:800;letter-spacing:-2px;line-height:1.06}}
p{{color:#A9C6F5;font-size:27px;font-weight:400;margin-top:16px;line-height:1.32;
  max-width:600px}}
</style></head><body>
<div class="rota"></div><div class="no"></div>
<img src="data:image/png;base64,{b64(SIMBOLO)}">
<div class="texto">
  <h1>Transporte escolar<br>que a família acompanha</h1>
  <p>Mapa ao vivo, avisos de embarque e mensalidade no app</p>
</div>
</body></html>"""


# O `--window-size` deste Chromium conta a moldura da janela, nao a area
# util: pedindo 1920 de altura, a pagina recebe 1833 e os 87 que faltam
# saem do fundo do canvas. Medido aqui, nao suposto — foi o que cortava
# a base do aparelho e deixava uma faixa branca no pe do quadro. Pede-se
# uma janela folgada e recorta-se depois, para nao depender do valor
# exato dessa moldura.
FOLGA_DA_JANELA = 200


def render(html: str, destino: Path, largura: int, altura: int) -> None:
    from PIL import Image

    temporario = destino.with_suffix(".html")
    temporario.write_text(html, encoding="utf-8")
    subprocess.run(
        [
            CHROMIUM, "--headless", "--disable-gpu", "--no-sandbox",
            f"--window-size={largura},{altura + FOLGA_DA_JANELA}",
            "--hide-scrollbars", f"--force-device-scale-factor={FATOR}",
            f"--screenshot={destino}", temporario.as_uri(),
        ],
        check=True,
        capture_output=True,
    )
    temporario.unlink()

    # Recorte e conversao SEMPRE, mesmo quando a medida ja bate: a Play
    # Console exige "JPEG ou PNG de 24 bits (sem alfa)", e o screenshot do
    # Chromium sai em RGBA. Deixar isso dependendo de um `if` e deixar a
    # recusa depender de sorte.
    with Image.open(destino) as bruto:
        bruto.convert("RGB").crop((0, 0, largura * FATOR, altura * FATOR)).save(
            destino, optimize=True
        )


def folha_de_contato(saida: Path) -> None:
    """Junta as nove pecas numa imagem so, para conferir o conjunto.

    Serve para duas coisas. A primeira e olhar a ficha como ela aparece
    na loja, em sequencia, e nao um quadro de cada vez: o que a pesquisa
    de ASO chama de consistencia so da para julgar com tudo lado a lado.
    A segunda e o teste da miniatura — se a chamada nao for legivel
    nestes 300 pontos de largura, ela nao e legivel na loja.

    Nao e peca de publicacao. Nenhum destes pixels sobe para o Play
    Console; o que sobe sao os PNGs em tamanho cheio.
    """
    from PIL import Image, ImageDraw, ImageFont

    base = _primeiro(
        "@expo-google-fonts+plus-jakarta-sans@*/node_modules/@expo-google-fonts/plus-jakarta-sans"
    )
    fonte = ImageFont.truetype(
        str(base / "600SemiBold" / "PlusJakartaSans_600SemiBold.ttf"), 18
    )

    largura_do_quadro, altura_do_quadro = 300, 533
    margem, altura_do_rotulo = 24, 34
    colunas, linhas = 4, 2

    largura = colunas * largura_do_quadro + (colunas + 1) * margem
    banner_l = largura - 2 * margem
    banner_a = round(banner_l * 500 / 1024)
    altura = (
        margem
        + linhas * (altura_do_quadro + altura_do_rotulo + margem)
        + banner_a
        + altura_do_rotulo
        + margem
    )

    folha = Image.new("RGB", (largura, altura), TINTA)
    pincel = ImageDraw.Draw(folha)

    for indice in range(len(QUADROS)):
        coluna, linha = indice % colunas, indice // colunas
        x = margem + coluna * (largura_do_quadro + margem)
        y = margem + linha * (altura_do_quadro + altura_do_rotulo + margem)
        with Image.open(saida / f"frame-{indice + 1}.png") as quadro:
            folha.paste(
                quadro.convert("RGB").resize((largura_do_quadro, altura_do_quadro)), (x, y)
            )
        pincel.text(
            (x, y + altura_do_quadro + 8), f"frame-{indice + 1}.png", font=fonte, fill="#A9C6F5"
        )

    y_do_banner = margem + linhas * (altura_do_quadro + altura_do_rotulo + margem)
    with Image.open(saida / "feature-graphic.png") as banner:
        folha.paste(banner.convert("RGB").resize((banner_l, banner_a)), (margem, y_do_banner))
    pincel.text(
        (margem, y_do_banner + banner_a + 8), "feature-graphic.png", font=fonte, fill="#A9C6F5"
    )

    folha.save(saida / "contato.png", optimize=True)


def gerar(modelo: str, saida: Path) -> None:
    """Monta um jogo completo de pecas num dos dois modelos de quadro."""
    global TELA_A, COM_CROMO

    # O modelo "moldura" mostra o aparelho inteiro, entao a tela leva a
    # barra de status, a barra de abas e a barra de gestos. O modelo
    # "faixa" mostra um recorte da tela, sem nada do sistema — e por isso
    # o conteudo do app sai maior, e legivel na miniatura.
    TELA_A = MOLDURA_TELA_A if modelo == "moldura" else FAIXA_TELA_A
    COM_CROMO = modelo == "moldura"

    saida.mkdir(parents=True, exist_ok=True)

    # O banner nao acompanha o fator de resolucao: a Play Console exige
    # 1024x500 EXATOS, e 2048x1000 e recusado. Quem apanhou isso foi a
    # conferencia do fim, na primeira vez que o 4K rodou.
    global FATOR
    fator_pedido, FATOR = FATOR, 1
    banner = feature_html() if modelo == "moldura" else feature_faixa_html()
    render(banner, saida / "feature-graphic.png", 1024, 500)
    FATOR = fator_pedido
    print(f"{saida.name}/feature-graphic.png  1024x500")

    for n, (chamada, apoio, tom, monta_tela) in enumerate(QUADROS, start=1):
        arquivo = saida / f"frame-{n}.png"
        if modelo == "moldura":
            html = quadro_html(chamada, apoio, tom, monta_tela)
        else:
            html = quadro_faixa_html(chamada, apoio, monta_tela, n - 1, len(QUADROS))
        render(html, arquivo, QUADRO_L, QUADRO_A)
        print(f"{saida.name}/frame-{n}.png  {QUADRO_L * FATOR}x{QUADRO_A * FATOR}  {chamada}")

    folha_de_contato(saida)
    print(f"{saida.name}/contato.png  conferencia do conjunto, nao sobe para a loja")


# Regras da ficha, da pagina de ajuda da Play Console (conferida em
# 19/10/2026): no maximo 8 capturas por tipo de aparelho, JPEG ou PNG de
# 24 bits sem alfa, menor lado >= 320 e maior <= 3840, e o maior lado nao
# pode passar do DOBRO do menor. Banner de 1024x500.
MAXIMO_DE_CAPTURAS = 8
LADO_MINIMO, LADO_MAXIMO = 320, 3840
TAMANHO_MAXIMO_MB = 8


def conferir(saida: Path) -> bool:
    """Confere as pecas contra as regras da Play Console antes de entregar.

    Existe para que a resposta a "vai dar erro no console?" seja uma
    verificacao, e nao uma promessa. Qualquer linha fora da regra sai
    marcada e o script termina com codigo de erro.
    """
    from PIL import Image

    print("\nConferencia das regras da Play Console")
    tudo_certo = True
    capturas = sorted(saida.glob("frame-*.png"))

    if len(capturas) > MAXIMO_DE_CAPTURAS:
        print(f"  FALHA  {len(capturas)} capturas, o maximo e {MAXIMO_DE_CAPTURAS}")
        tudo_certo = False

    for arquivo in capturas + [saida / "feature-graphic.png"]:
        with Image.open(arquivo) as imagem:
            largura, altura = imagem.size
            modo = imagem.mode
        megabytes = arquivo.stat().st_size / 1_000_000
        menor, maior = min(largura, altura), max(largura, altura)
        banner = arquivo.name == "feature-graphic.png"

        problemas = []
        if modo != "RGB":
            problemas.append(f"canal alfa ({modo})")
        if megabytes > TAMANHO_MAXIMO_MB:
            problemas.append(f"{megabytes:.1f} MB")
        if banner:
            if (largura, altura) != (1024, 500):
                problemas.append("o banner tem que ser 1024x500")
        else:
            if menor < LADO_MINIMO or maior > LADO_MAXIMO:
                problemas.append(f"lado fora de {LADO_MINIMO}..{LADO_MAXIMO}")
            if maior > menor * 2:
                problemas.append("o maior lado passa do dobro do menor")

        marca = "ok    " if not problemas else "FALHA "
        tudo_certo = tudo_certo and not problemas
        detalhe = "; ".join(problemas) or f"{largura}x{altura} {modo} {megabytes:.2f} MB"
        print(f"  {marca} {arquivo.parent.name}/{arquivo.name:<20} {detalhe}")

    return tudo_certo


def main() -> int:
    """Uso: play-store-assets.py [pasta] [moldura|faixa|ambos] [4k|1080|ambos]."""
    global FATOR

    raiz = Path(sys.argv[1] if len(sys.argv) > 1 else "play-store").resolve()
    escolhido = sys.argv[2] if len(sys.argv) > 2 else "ambos"
    resolucao = sys.argv[3] if len(sys.argv) > 3 else "4k"

    modelos = ["moldura", "faixa"] if escolhido == "ambos" else [escolhido]
    fatores = {"4k": [2], "1080": [1], "ambos": [2, 1]}[resolucao]

    tudo_certo = True
    for fator in fatores:
        FATOR = fator
        for modelo in modelos:
            # O 4K fica na pasta de nome limpo, porque e o que se sobe;
            # o 1080 ganha sufixo, para os dois conviverem sem ninguem
            # subir o errado sem perceber.
            pasta = raiz / (modelo if fator == 2 else f"{modelo}-1080")
            gerar(modelo, pasta)
            tudo_certo = conferir(pasta) and tudo_certo

    print(f"\n{len(modelos) * len(fatores)} jogo(s) de {len(QUADROS) + 1} pecas em {raiz}/")
    return 0 if tudo_certo else 1


if __name__ == "__main__":
    raise SystemExit(main())
