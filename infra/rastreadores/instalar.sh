#!/usr/bin/env bash
#
# Sobe o Traccar numa VM Ubuntu e o aponta para a API da Rotta.
#
#   ./instalar.sh https://api.exemplo.com/v1 "O_SEGREDO" [--gt06]
#
# O segredo tem de ser o MESMO valor de TRACKER_INGEST_SECRET na API:
# é com ele que o Traccar se identifica ao encaminhar cada posição.
#
# --gt06 também abre a 5023, para frota mista. Sem a flag, só a 5027
# (Teltonika) é aberta: porta aberta sem aparelho atrás é superfície de
# ataque de graça.
#
# Idempotente: rodar de novo só reescreve a configuração e reinicia.

set -euo pipefail

# ---------------------------------------------------------------------
# A versão é FIXA, e isso é o conserto de um defeito real.
#
# O script baixava de
#   .../releases/latest/download/traccar-linux-64-latest.zip
# e esse endereço responde 404: o Traccar publica o asset COM a versão
# no nome (traccar-linux-64-6.16.0.zip), então não existe arquivo
# chamado "latest". O `wget -q` falhava, o `unzip` reclamava de um zip
# que não existia, e quem rodava ficava sem receptor nenhum.
#
# Fixar a versão também é a escolha certa por si: um receptor que muda
# de versão sozinho a cada execução é um receptor que muda de
# comportamento sem ninguém pedir, no meio da operação.
#
# Para atualizar: troque o número, confira o novo hash e rode de novo.
# ---------------------------------------------------------------------
TRACCAR_VERSION="${TRACCAR_VERSION:-6.16.0}"
TRACCAR_URL="https://github.com/traccar/traccar/releases/download/v${TRACCAR_VERSION}/traccar-linux-64-${TRACCAR_VERSION}.zip"

API_URL="${1:-}"
SEGREDO="${2:-}"
ABRIR_GT06=0
for arg in "${@:3}"; do
  [[ "$arg" == "--gt06" ]] && ABRIR_GT06=1
done

if [[ -z "$API_URL" || -z "$SEGREDO" ]]; then
  echo "uso: $0 <url-da-api> <segredo> [--gt06]" >&2
  echo "exemplo: $0 https://api.exemplo.com/v1 \$(openssl rand -hex 32)" >&2
  exit 1
fi

# A URL precisa ser HTTPS: o segredo viaja num cabeçalho, sem assinatura
# (o Traccar não assina o que encaminha). Em HTTP ele iria em claro.
if [[ "$API_URL" != https://* ]]; then
  echo "ERRO: a URL precisa ser https://, porque o segredo viaja no cabecalho." >&2
  exit 1
fi

TRACCAR_DIR=/opt/traccar
CONF="$TRACCAR_DIR/conf/traccar.xml"

if [[ ! -d "$TRACCAR_DIR" ]]; then
  echo ">> Instalando o Traccar $TRACCAR_VERSION..."
  sudo apt-get update -qq
  sudo apt-get install -y -qq unzip wget openjdk-17-jre-headless

  TMP="$(mktemp -d)"
  trap 'rm -rf "$TMP"' EXIT

  # Confere ANTES de baixar. Sem isto, uma versão inexistente vira um
  # arquivo de 9 bytes com "Not Found" dentro, e o erro só aparece no
  # unzip, dizendo outra coisa.
  CODIGO="$(curl -sSL -o /dev/null -w '%{http_code}' "$TRACCAR_URL")"
  if [[ "$CODIGO" != "200" ]]; then
    echo "ERRO: o download do Traccar respondeu HTTP $CODIGO." >&2
    echo "  URL: $TRACCAR_URL" >&2
    echo "  Confira a versão em https://github.com/traccar/traccar/releases" >&2
    echo "  e rode de novo com: TRACCAR_VERSION=<versao> $0 ..." >&2
    exit 1
  fi

  echo ">> Baixando $TRACCAR_URL"
  curl -sSL -o "$TMP/traccar.zip" "$TRACCAR_URL"
  unzip -q "$TMP/traccar.zip" -d "$TMP"
  sudo "$TMP/traccar.run"
else
  echo ">> Traccar ja instalado, so reconfigurando."
fi

# ---------------------------------------------------------------------
# Firewall. São DOIS, e esquecer o segundo faz o rastreador parecer
# defeituoso: ele conecta, não recebe resposta, e o log fica vazio.
# ---------------------------------------------------------------------
abrir_porta() {
  local porta="$1"
  if command -v ufw >/dev/null 2>&1 && sudo ufw status 2>/dev/null | grep -qi '^Status: active'; then
    echo ">> ufw: liberando ${porta}/tcp"
    sudo ufw allow "${porta}/tcp" >/dev/null
  else
    # Imagem da Oracle: sem ufw, com iptables já populado e uma regra
    # REJECT no fim da cadeia. Inserir no topo do INPUT é o que a
    # própria documentação da Oracle manda fazer.
    echo ">> iptables: liberando ${porta}/tcp"
    sudo iptables -I INPUT 1 -m state --state NEW -p tcp --dport "$porta" -j ACCEPT
    if command -v netfilter-persistent >/dev/null 2>&1; then
      sudo netfilter-persistent save >/dev/null
    else
      echo "   AVISO: netfilter-persistent não encontrado. A regra some no próximo boot." >&2
      echo "   Instale com: sudo apt-get install -y iptables-persistent" >&2
    fi
  fi
}

abrir_porta 5027
if [[ "$ABRIR_GT06" == "1" ]]; then
  abrir_porta 5023
fi

echo ">> Apontando o encaminhamento para $API_URL/trackers/posicoes"

# `forward.header` é o único mecanismo de autenticação que o Traccar
# oferece ao encaminhar: um cabeçalho fixo. Daí o segredo compartilhado
# em vez de assinatura HMAC.
#
# NÃO existe `forward.enable`. A chave foi removida do Traccar: quem
# liga o encaminhamento é a presença de `forward.url`, e o formato é
# `forward.type`. A lista de chaves válidas está em `config/Keys.java`
# do projeto, e uma chave inventada é ignorada em silêncio, o que faz
# parecer que está configurado quando não está.
#
# `database.registerUnknown` é o que faz a corrente inteira existir, e
# sem ela nada do resto adianta. Por padrão o Traccar RECUSA aparelho
# que ele não conhece: em `session/ConnectionManager.java`, quando o
# `uniqueId` não está no banco dele e a chave está desligada, o código
# cai no `else`, escreve `Unknown device - <IMEI> (<ip>)` no log e
# devolve `null`. Sem sessão de aparelho, o decodificador nunca produz
# uma `Position`, e o encaminhamento nunca acontece. O rastreador
# conecta, o log acusa, e a Rotta não recebe nada.
sudo tee "$CONF" >/dev/null <<XML
<?xml version='1.0' encoding='UTF-8'?>
<!DOCTYPE properties SYSTEM 'http://java.sun.com/dtd/properties.dtd'>
<properties>
  <entry key='config.default'>./conf/default.xml</entry>

  <!-- Encaminhamento para a Rotta -->
  <entry key='forward.type'>json</entry>
  <entry key='forward.url'>${API_URL}/trackers/posicoes</entry>
  <entry key='forward.header'>X-Rotta-Tracker-Token: ${SEGREDO}</entry>

  <!-- Reentrega quando a API estiver fora do ar. A API responde 200
       mesmo quando descarta a posição, justamente para que isto aqui
       nunca vire fila infinita de retentativas impossíveis. -->
  <entry key='forward.retry.enable'>true</entry>
  <entry key='forward.retry.delay'>5000</entry>
  <entry key='forward.retry.count'>10</entry>

  <!-- QUANTAS posicoes podem estar esperando entrega ao mesmo tempo.

       Este numero e o que decide se a API dormindo custa posicao, e o
       padrao do Traccar (100) e pequeno demais para uma frota. A conta
       esta em handler/PositionForwardingHandler.java: a retentativa so
       e agendada se deliveryPending.get() menor ou igual a
       forward.retry.limit. Acima disso a posicao e DESCARTADA na hora,
       sem retentativa nenhuma.

       Setenta onibus reportando a cada 30 segundos sao 2,3 posicoes
       por segundo. Um cold start de 90 segundos da API no plano
       gratuito do Render acumula cerca de 210 posicoes esperando: com
       o limite de 100, umas 110 delas sumiriam, e o trajeto da familia
       ficaria com um buraco de quase um minuto justamente quando o
       servidor acordou.

       2000 cobre cerca de quatorze minutos de silencio dessa frota, o
       que e mais que a janela de 15 minutos de suspensao do Render
       combinada com o ping de cinco minutos do GitHub Actions. O custo
       e memoria na VM do Traccar: posicao e um objeto pequeno, e dois
       mil deles nao chegam a alguns megabytes. -->
  <entry key='forward.retry.limit'>2000</entry>

  <!-- Aceita aparelho que o Traccar ainda não conhece, cadastrando-o
       sozinho no banco local dele. Sem isto, o Traccar responde
       "Unknown device" e NENHUMA posição é encaminhada: é o que fazia
       o rastreador conectar e a Rotta não receber nada.

       Ligar isto NAO afrouxa a seguranca. Quem decide de qual onibus e
       cada posicao continua sendo a API da Rotta, que descarta todo
       IMEI nao credenciado em Admin, Veiculos, Credenciar
       rastreadores. O cadastro aqui e so o que permite o Traccar
       decodificar o pacote; a autorizacao e la. Some-se a isso o
       cabecalho de forward.header, que ja impede qualquer um de postar
       na API.

       O filtro padrao de quais ids sao aceitos vem de
       database.registerUnknown.regex, que por padrao casa com um IMEI
       de 15 digitos. Aparelho com identificador fora disso continuaria
       recusado em silencio. -->
  <entry key='database.registerUnknown'>true</entry>

  <!-- O Traccar guarda o próprio histórico em H2. A verdade da operação
       é o banco da Rotta; isto aqui é só buffer local, por isso o
       expurgo curto. -->
  <entry key='database.driver'>org.h2.Driver</entry>
  <entry key='database.url'>jdbc:h2:./data/database</entry>
  <entry key='database.user'>sa</entry>
  <entry key='database.password'></entry>
  <entry key='server.statistics'>false</entry>
</properties>
XML

sudo chmod 600 "$CONF"   # contém o segredo

sudo systemctl enable traccar
sudo systemctl restart traccar
sleep 3
sudo systemctl --no-pager status traccar | head -5

cat <<FIM

Pronto. Traccar $TRACCAR_VERSION encaminhando para $API_URL/trackers/posicoes

Portas liberadas NESTA máquina:
  5027  Teltonika (FMC130, FMC920)$([[ "$ABRIR_GT06" == "1" ]] && echo "
  5023  GT06 (J16 e similares)")

FALTA O SEGUNDO FIREWALL, se esta VM for da Oracle Cloud:
  Console -> Networking -> VCN -> Security List -> Add Ingress Rule
  TCP, porta 5027, origem 0.0.0.0/0
Sem essa regra o aparelho conecta e nada chega. Na Hostinger e na
maioria dos provedores com ufw, o passo acima já basta.

Configure cada rastreador para apontar ao IP desta VM (ver o README).
Depois credencie os IMEIs em: Admin -> Veiculos -> Credenciar rastreadores.

Log do que chega:  sudo tail -f /opt/traccar/logs/tracker-server.log
FIM
