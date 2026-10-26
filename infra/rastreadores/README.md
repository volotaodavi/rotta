# Receptor de rastreadores

O que falta entre um ônibus com rastreador e o mapa do responsável.

```
Rastreador  --TCP binário-->  Traccar  --HTTPS/JSON-->  API da Rotta  -->  app
 (no ônibus)                  (esta VM)                  (Render)
```

## Quem faz o quê

A instalação física do aparelho no ônibus é **da empresa de transporte
contratada**, com instalador dela. A Rotta configura o aparelho, cuida
deste receptor e credencia o IMEI no sistema. Essa divisão não é
burocracia: mexer na fiação de um veículo de terceiro, em contrato
público, é responsabilidade de quem responde pelo veículo.

## Por que existe uma VM no meio

O rastreador fala **TCP cru**, em binário. O Render, onde a API roda, só
aceita HTTP. Não é limitação de configuração: ele não expõe porta TCP
para a internet, ponto. Então alguém precisa escutar essa porta, e essa
alguém é esta VM.

O Traccar faz a parte difícil: decodificar Teltonika (Codec 8/8E/16),
GT06 e mais de duzentos protocolos, tratar ACK e keepalive de cada um.
Escrever isso à mão significaria descobrir os erros com setenta ônibus
na rua.

## Custo

Zero, fora o chip. O Oracle Cloud tem um tier **permanentemente
gratuito** (não é trial de 12 meses) com IP público, e o Traccar é open
source, licença Apache 2.0.

## Instalação

### 1. A VM

Uma instância Ubuntu 22.04 ou superior, com IP público e porta TCP de
entrada. Referência de tamanho: **1 vCPU, 2 GB de RAM**, que é folga
confortável para setenta aparelhos em modo encaminhador.

Hospedagem que só abre 80 e 443 **não serve**. O aparelho conecta na 5027.

### 2. Subir o Traccar

```bash
./instalar.sh https://SUA-API.onrender.com/v1 "O_SEGREDO"
```

Frota mista com GT06 (J16 e similares)? Acrescente `--gt06` para abrir
também a 5023. Sem a flag, só a 5027 é aberta: porta aberta sem
aparelho atrás é superfície de ataque de graça.

O script fixa a versão do Traccar (`TRACCAR_VERSION`), confere o
download antes de baixar e libera a porta no firewall da máquina,
detectando `ufw` ou `iptables`.

O segredo é o mesmo valor de `TRACKER_INGEST_SECRET` na API. Gere um
forte e guarde **só** em variável de ambiente no Render e no
`traccar.xml` desta VM, nunca no repositório:

```bash
openssl rand -hex 32
```

### 3. O segundo firewall, se a VM for da Oracle

Este é o passo em que todo mundo trava, porque o aparelho conecta, nada
chega, e parece defeito do rastreador.

Console da Oracle: **Networking → VCN → Security List → Add Ingress
Rule**, TCP, porta `5027`, origem `0.0.0.0/0`.

Na Hostinger e na maioria dos provedores com `ufw`, o que o script fez
já basta.

### 4. Configurar o rastreador

Duas formas. A do cabo é a que se usa nos três primeiros aparelhos,
porque mostra na hora se funcionou.

#### a) Teltonika Configurator, pelo cabo USB (recomendado)

Numa máquina Windows:

1. Instalar o **.NET 8 Desktop Runtime x64** e o **driver USB da
   Teltonika**. Sem os dois o Configurator abre e não enxerga o
   aparelho.
2. Ligar o FMC130 pelo USB e abrir o Configurator.
3. Aba **GPRS**: `Domain` com o IP da VM, `Port` `5027`, protocolo
   `TCP`. No mesmo lugar entram o APN, o usuário e a senha do chip M2M.
4. Aba **System**: `Ignition Source` marcando **apenas DIN1**. Esta é a
   configuração que mais importa, e a mais fácil de errar: com
   `Power Voltage` ou `Movement` marcados junto, o aparelho considera
   "ignição ligada" quando o ônibus só está com a bateria boa ou
   balançando no pátio, e a Rotta abre viagem com o ônibus parado na
   garagem.
5. Aba **Data Acquisition**: enviar a cada **30 segundos em
   movimento**. É o intervalo para o qual a capacidade do sistema foi
   dimensionada.
6. Trocar a **senha padrão `5555`** do Bluetooth. Ela é igual em todo
   aparelho que sai de fábrica.

#### b) Por SMS, quando o aparelho já está no ônibus

Para o **FMC130**, o comando completo, com **dois espaços no início**
(a senha vazia do aparelho é o primeiro campo):

```
  setparam 2001:APN;2002:USUARIO;2003:SENHA;2004:IP_DA_VM;2005:5027;2006:0
```

O comando mais curto que circula por aí (`setparam 2004:IP;2005:PORTA`)
é do **FMC920** e só troca o servidor: ele não configura o APN, então
num chip novo o aparelho fica sem dados e não manda nada.

No **J16 / GT06** o comando é outro, confira no manual do modelo.

### 5. Instalação física

Pinagem do FMC130 (Teltonika Wiki, "FMC130 First Start"):

| Pino | Ligação                                                     |
| ---- | ----------------------------------------------------------- |
| 1    | VCC, 10 a 30 V, **positivo permanente**, com fusível de 3 A |
| 7    | GND                                                         |
| 5    | DIN1, no **pós-chave** (só energizado com a chave virada)   |

O pino 5 é o que a Rotta usa para abrir e fechar a viagem. Se o
instalador derivar da chave geral em vez do pós-chave, a viagem abre
quando o motorista liga o rádio.

Posição do aparelho: sob o painel plástico, colado próximo ao
para-brisa, com a **etiqueta virada para o céu**. É a face onde fica a
antena de GPS.

### 6. Teste de bancada, antes de ir ao ônibus

Com uma fonte de 12 V nos pinos 1 e 7, o aparelho já conecta. Confira
antes de sair da oficina:

```bash
sudo tail -f /opt/traccar/logs/tracker-server.log
```

Se o IMEI não aparecer aqui, nada adiante funciona, e é muito mais
barato descobrir isso na bancada que embaixo de um painel.

### 7. Credenciar os IMEIs

No painel Admin da Rotta: **Veículos → Credenciar rastreadores**. Cole a
planilha do instalador (ônibus + IMEI). Sem isso, a posição chega aqui e
é descartada com `IMEI não credenciado` no log, de propósito: gravar
posição de um aparelho que ninguém reconhece seria pior.

## Conferindo se funcionou

### O aparelho conectou?

```bash
sudo tail -f /opt/traccar/logs/tracker-server.log
```

### A API recebeu?

Este é o corpo **real** que o Traccar envia com `forward.type=json`: a
posição vem dentro de `position`, o aparelho ao lado em `device`, e os
atributos do Teltonika vêm todos (`sat`, `power`, `io239`, dezenas
deles). A API ignora o que não usa.

```bash
curl -X POST https://SUA-API.onrender.com/v1/trackers/posicoes \
  -H 'Content-Type: application/json' \
  -H 'X-Rotta-Tracker-Token: O_SEGREDO' \
  -d '{
    "position": {
      "id": 48219, "deviceId": 7, "protocol": "teltonika",
      "serverTime": "2026-10-26T09:00:12.000+00:00",
      "deviceTime": "2026-10-26T09:00:08.000+00:00",
      "fixTime":    "2026-10-26T09:00:08.000+00:00",
      "outdated": false, "valid": true,
      "latitude": -22.9194, "longitude": -42.8186,
      "altitude": 14.2, "speed": 17.3, "course": 211, "accuracy": 0,
      "attributes": {
        "priority": 0, "sat": 11, "event": 0,
        "ignition": true, "motion": true,
        "io239": 1, "power": 12.735, "distance": 134.55
      }
    },
    "device": {
      "id": 7, "name": "01.0867", "uniqueId": "356938035643809",
      "status": "online", "model": "FMC130"
    }
  }'
```

> Até 26/10/2026 este corpo era recusado com `400`, porque a API
> esperava `latitude`/`longitude` no topo. Eram 400 em 100% das posições
> de aparelho real; só o `curl` achatado de exemplo passava. O formato
> achatado continua aceito, para não quebrar quem já usa o comando
> antigo de diagnóstico.

A resposta diz o que aconteceu com a posição, inclusive quando ela foi
descartada e por quê. Sempre `200`: o Traccar reentrega o que falha
para sempre, então um `4xx` viraria fila infinita de retentativas
impossíveis, atrasando as posições dos ônibus corretos.

## O que a Rotta faz com o que chega

| Evento                                            | O que acontece                                                                        |
| ------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Ignição **ligou**, sem viagem aberta              | Abre a viagem do dia na rota deste ônibus e avisa os responsáveis                     |
| Ignição ligou **sem escala** para hoje            | Tenta deduzir a rota pelo trajeto e **sugere**; nunca abre por dedução                |
| Posição durante a viagem                          | Grava na **mesma tabela** que o GPS do celular usa, o app do pai não sabe a diferença |
| Ignição **desligou**                              | Encerra a viagem                                                                      |
| Sinal sumiu por mais de `TRACKER_TIMEOUT_MINUTOS` | Encerra a viagem na varredura, para o pai não ver o ônibus parado a noite inteira     |
| Ônibus sem rota designada hoje                    | Posição entra só no mapa da frota, sem abrir viagem                                   |
| IMEI desconhecido                                 | Descartado, com aviso no log                                                          |
