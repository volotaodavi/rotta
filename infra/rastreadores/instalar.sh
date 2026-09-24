#!/usr/bin/env bash
#
# Sobe o Traccar numa VM Ubuntu e o aponta para a API da Rotta.
#
#   ./instalar.sh https://api.exemplo.com/v1 "O_SEGREDO"
#
# O segredo tem de ser o MESMO valor de TRACKER_INGEST_SECRET na API —
# é com ele que o Traccar se identifica ao encaminhar cada posição.
#
# Idempotente: rodar de novo só reescreve a configuração e reinicia.

set -euo pipefail

API_URL="${1:-}"
SEGREDO="${2:-}"

if [[ -z "$API_URL" || -z "$SEGREDO" ]]; then
  echo "uso: $0 <url-da-api> <segredo>" >&2
  echo "exemplo: $0 https://api.exemplo.com/v1 \$(openssl rand -hex 32)" >&2
  exit 1
fi

# A URL precisa ser HTTPS: o segredo viaja num cabeçalho, sem assinatura
# (o Traccar não assina o que encaminha). Em HTTP ele iria em claro.
if [[ "$API_URL" != https://* ]]; then
  echo "ERRO: a URL precisa ser https:// — o segredo viaja no cabeçalho." >&2
  exit 1
fi

TRACCAR_DIR=/opt/traccar
CONF="$TRACCAR_DIR/conf/traccar.xml"

if [[ ! -d "$TRACCAR_DIR" ]]; then
  echo ">> Instalando o Traccar..."
  sudo apt-get update -qq
  sudo apt-get install -y -qq unzip wget openjdk-17-jre-headless

  TMP="$(mktemp -d)"
  wget -q -O "$TMP/traccar.zip" \
    https://github.com/traccar/traccar/releases/latest/download/traccar-linux-64-latest.zip
  unzip -q "$TMP/traccar.zip" -d "$TMP"
  sudo "$TMP/traccar.run"
  rm -rf "$TMP"
else
  echo ">> Traccar já instalado — só reconfigurando."
fi

echo ">> Apontando o encaminhamento para $API_URL/trackers/posicoes"

# `forward.header` é o único mecanismo de autenticação que o Traccar
# oferece ao encaminhar: um cabeçalho fixo. Daí o segredo compartilhado
# em vez de assinatura HMAC.
sudo tee "$CONF" >/dev/null <<XML
<?xml version='1.0' encoding='UTF-8'?>
<!DOCTYPE properties SYSTEM 'http://java.sun.com/dtd/properties.dtd'>
<properties>
  <entry key='config.default'>./conf/default.xml</entry>

  <!-- Encaminhamento para a Rotta -->
  <entry key='forward.enable'>true</entry>
  <entry key='forward.type'>json</entry>
  <entry key='forward.url'>${API_URL}/trackers/posicoes</entry>
  <entry key='forward.header'>X-Rotta-Tracker-Token: ${SEGREDO}</entry>

  <!-- Reentrega quando a API estiver fora do ar. A API responde 200
       mesmo quando descarta a posição, justamente para que isto aqui
       nunca vire fila infinita de retentativas impossíveis. -->
  <entry key='forward.retry.enable'>true</entry>
  <entry key='forward.retry.delay'>5000</entry>
  <entry key='forward.retry.count'>10</entry>

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

Pronto.

Portas que precisam estar abertas (VCN da Oracle + iptables):
  5027  Teltonika (FMC920)
  5023  GT06 (J16 e similares)

Configure cada rastreador por SMS para apontar ao IP desta VM.
Depois credencie os IMEIs em: Admin -> Veiculos -> Credenciar rastreadores.

Log do que chega:  sudo tail -f /opt/traccar/logs/tracker-server.log
FIM
