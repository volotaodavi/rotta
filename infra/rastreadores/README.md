# Receptor de rastreadores

O que falta entre um ônibus com rastreador e o mapa do responsável.

```
Rastreador  --TCP binário-->  Traccar  --HTTPS/JSON-->  API da Rotta  -->  app
 (no ônibus)                  (esta VM)                  (Render)
```

## Por que existe uma VM no meio

O rastreador fala **TCP cru**, em binário. O Render — onde a API roda —
só aceita HTTP. Não é limitação de configuração: ele não expõe porta TCP
para a internet, ponto. Então alguém precisa escutar essa porta, e essa
alguém é esta VM.

O Traccar faz a parte difícil: decodificar Teltonika (Codec 8/8E/16),
GT06 e mais 200 protocolos, tratar ACK e keepalive de cada um. Escrever
isso à mão significaria descobrir os erros com 100 ônibus na rua.

## Custo

Zero, fora o chip. O Oracle Cloud tem um tier **permanentemente
gratuito** (não é trial de 12 meses) com IP público, e o Traccar é open
source.

## Instalação

### 1. A VM

No Oracle Cloud, crie uma instância **Always Free** (Ampere/ARM, Ubuntu
22.04 ou superior) e anote o IP público.

### 2. Abrir a porta — nos DOIS lugares

Este é o passo em que todo mundo trava. São dois firewalls, e esquecer o
segundo faz o rastreador parecer defeituoso.

**a) Na rede virtual da Oracle** (console web): VCN → Security List →
Add Ingress Rule → TCP, porta `5027`, origem `0.0.0.0/0`.

**b) Dentro da máquina:**

```bash
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 5027 -j ACCEPT
sudo netfilter-persistent save
```

> `5027` é a porta do protocolo **Teltonika** no Traccar. Para o J16 e
> outros GT06, a porta é `5023`. Abra as duas se a frota for mista.

### 3. Subir o Traccar

```bash
./instalar.sh https://SUA-API.onrender.com/v1 "O_SEGREDO"
```

O segredo é o mesmo valor de `TRACKER_INGEST_SECRET` na API. Gere um
forte e guarde só em variável de ambiente:

```bash
openssl rand -hex 32
```

### 4. Apontar os rastreadores para cá

Por SMS, para cada aparelho (comando do **Teltonika FMC920**):

```
  setparam 2004:IP_DA_VM;2005:5027
```

No **J16 / GT06** o comando é outro — confira no manual do modelo.

### 5. Credenciar os IMEIs

No painel Admin da Rotta: **Veículos → Credenciar rastreadores**. Cole a
planilha do instalador (ônibus + IMEI). Sem isso, a posição chega aqui e
é descartada com `IMEI não credenciado` no log — de propósito, porque
gravar posição de um aparelho que ninguém reconhece seria pior.

## Conferindo se funcionou

```bash
# O aparelho conectou?
sudo tail -f /opt/traccar/logs/tracker-server.log

# A API recebeu?
curl -X POST https://SUA-API.onrender.com/v1/trackers/posicoes \
  -H 'Content-Type: application/json' \
  -H 'X-Rotta-Tracker-Token: O_SEGREDO' \
  -d '{"device":{"uniqueId":"863719060123456"},
       "latitude":-22.9194,"longitude":-42.8186,
       "valid":true,"fixTime":"2026-09-24T11:00:00Z",
       "attributes":{"ignition":true}}'
```

A resposta diz o que aconteceu com a posição — inclusive quando ela foi
descartada, e por quê. Sempre `200`: o Traccar reentrega o que falha
para sempre, então um `4xx` viraria fila infinita de retentativas
impossíveis, atrasando as posições dos ônibus corretos.

## O que a Rotta faz com o que chega

| Evento                               | O que acontece                                                                         |
| ------------------------------------ | -------------------------------------------------------------------------------------- |
| Ignição **ligou**, sem viagem aberta | Abre a viagem do dia na rota deste ônibus e avisa os responsáveis                      |
| Posição durante a viagem             | Grava na **mesma tabela** que o GPS do celular usa — o app do pai não sabe a diferença |
| Ignição **desligou**                 | Encerra a viagem                                                                       |
| Ônibus sem rota designada hoje       | Posição entra só no mapa da frota, sem abrir viagem                                    |
| IMEI desconhecido                    | Descartado, com aviso no log                                                           |
