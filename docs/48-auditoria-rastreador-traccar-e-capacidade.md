# 48. Auditoria: rastreador, Traccar e capacidade

**26/10/2026. CTO.** Qual aparelho comprar, o que é o Traccar, como integrar
gastando o mínimo, e se a plataforma aguenta. O caso de prova é Maricá.

Toda fonte está citada. Onde não encontrei o número, está escrito que não
encontrei, e não há estimativa no lugar.

---

## 1. Resposta curta

**Rastreador:** 4G Cat-M1 ou NB-IoT, com entrada de ignição pós-chave. **Não
compre 2G**, por um motivo que não é opinião: a Anatel vedou a homologação de
aparelho exclusivamente 2G ou 3G desde 06/04/2025.

**Traccar:** software livre, Apache 2.0, roda no seu servidor. É o tradutor que
transforma o binário do rastreador em JSON e encaminha para a Rotta. O código da
Rotta já espera exatamente isso.

**Custo mínimo real:** o Traccar é gratuito. O que não é: o aparelho, o chip e
um host que não durma. **Hoje a API da Rotta está no plano gratuito do Render e
dorme**, e isso sozinho impede qualquer rastreador de funcionar.

**Capacidade:** a frota não é o problema. Achei um teto concreto e ele é bem
mais baixo do que parece: **69 veículos**, e não vem do servidor nem do banco,
vem da varredura de retenção. Detalhe na seção 5.

---

## 2. Qual rastreador faz sentido

### 2.1 O que o código exige, e é curto

Lendo o `TrackersService`, o aparelho precisa de três coisas e nada mais:

1. **Entrada de ignição ligada de verdade**, no pós-chave. É `attributes.ignition`
   que abre e fecha a viagem. Sem ela, o rastreador vira um ponto no mapa e
   perde metade do valor.
2. **Protocolo que o Traccar fale.** Ele cobre mais de 2.000 modelos, então na
   prática isso não restringe nada.
3. **`fixTime` no pacote.** Qualquer aparelho sério manda. É o que faz um
   aparelho que guardou posições offline não desenhar o trajeto inteiro no
   instante da reconexão.

Tudo o mais (acelerômetro, leitor de combustível, botão de pânico) é supérfluo
para a Rotta hoje.

### 2.2 A armadilha de comprar em 2026

O FMB920 da Teltonika é o modelo que todo mundo indica e o mais barato de achar.
**Ele é 2G.** E a regra vigente, citada no Ato Anatel 14430/2024, é que a
homologação está vedada para aparelhos exclusivamente 2G ou 3G desde
**06/04/2025**.

Sobre o desligamento em si, a leitura honesta é esta: **não existe cronograma
oficial da Anatel.** O ano de 2028 aparece na imprensa como expectativa de
mercado e como horizonte de rearranjo de faixas, não como prazo publicado. A
Canaltech registra que a Anatel ainda não se comprometeu com prazo nem com
janela.

Mesmo sem data, a conclusão prática não muda: comprar 2G hoje é comprar um
aparelho que não pode mais ser homologado e cuja rede tem fim anunciado sem
data. **NB-IoT e LTE-M (Cat-M1) são variantes de LTE** e atendem à exigência.

### 2.3 O que comprar

| Critério    | O que procurar                                        |
| ----------- | ----------------------------------------------------- |
| Rede        | 4G Cat-M1 ou NB-IoT, com fallback 2G se existir       |
| Ignição     | Entrada dedicada, ligada no pós-chave                 |
| Alimentação | 12V/24V direto da bateria, com bateria interna        |
| Homologação | Certificado Anatel conferido no sistema oficial       |
| Protocolo   | Suportado pelo Traccar (Teltonika, Queclink, Suntech) |

Na família Teltonika, isso leva às linhas **FMC** e **FMM**, que são as de LTE,
e não ao FMB920.

### 2.4 Preço, com a ressalva que ele merece

Os valores abaixo são **anúncio de varejo, não cotação**, e o próprio resultado
de busca mostra dispersão grande para o mesmo modelo:

- FMB920 (2G, o que **não** recomendo) aparece no Mercado Livre entre **R$ 199 e
  R$ 440**, com kit de 30 unidades anunciado a R$ 3.000 e um anúncio de
  instalação a R$ 1.080.
- O estudo da Links Field citado pela imprensa estima **R$ 295 por dispositivo**
  como custo médio de substituição na migração do 2G. É estimativa de uma MVNO
  de IoT, não dado oficial, mas serve como ordem de grandeza para um aparelho
  4G.

**Chip M2M:** os avulsos aparecem a partir de **R$ 4,90 a R$ 7,90 por mês**
conforme operadora única ou multioperadora. Pacotes com plataforma e app
embutidos vão de R$ 12 a R$ 47,90, e esses **não servem**: a plataforma é a
Rotta, pagar por outra é pagar duas vezes.

**Sobre homologação, um aviso que vale a compra inteira:** a afirmação de que o
aparelho é homologado vem do vendedor. Confira o número do certificado no
sistema da Anatel e veja se bate com a etiqueta do produto.

---

## 3. O que é o Traccar

Software livre de rastreamento, **licença Apache 2.0**, feito para rodar no seu
próprio servidor. Suporta mais de 2.000 modelos de aparelho.

### Por que ele existe no desenho da Rotta

O rastreador fala **binário sobre TCP cru**. Escrever o decodificador do
Teltonika (Codec 8, 8E, 16) e do GT06 à mão significa acertar variantes de
protocolo, ACKs e keepalives no escuro, e descobrir os erros no dia da
instalação com os ônibus na rua. O Traccar faz isso há anos, de graça.

O papel dele aqui é estreito de propósito:

```
Rastreador --TCP binario--> Traccar --HTTPS/JSON--> POST /trackers/posicoes
```

**Ele é tradutor e encaminhador, não plataforma.** Quem sabe o que é uma rota,
uma viagem, um aluno e um responsável é a Rotta. O Traccar não precisa saber de
nada disso, e não deve.

### A decisão de custo que isso abre

O Traccar pode rodar em **modo encaminhador, sem banco de dados próprio**. No
fórum do projeto, uma resposta estima que nessa configuração 4 GB de RAM
atendem cerca de 1.500 aparelhos, porque **o banco é o gargalo usual e ele
deixa de existir**.

Para a Rotta isso é exatamente o caso: o histórico de posição mora em
`trip_positions`, no nosso Postgres. O Traccar não precisa guardar nada.

**Dimensionamento, com a ressalva devida:** não existe página oficial de
requisitos no traccar.org. O que há são respostas de fórum, informais e antigas,
que apontam 1 a 2 GB para algumas dezenas de aparelhos e 2 a 4 GB para centenas.
Para 25 a 60 ônibus, **1 vCPU e 2 GB sobram**.

---

## 4. Como integrar gastando o mínimo

### 4.1 O que é de graça, e é a maior parte

| Item                                | Custo    |
| ----------------------------------- | -------- |
| Traccar (licença)                   | R$ 0     |
| Decodificação de protocolo          | R$ 0     |
| Toda a integração do lado da Rotta  | já feita |
| Credenciamento de IMEI (tela Admin) | já feita |

### 4.2 O que não tem como ser de graça

**a. Um host para o Traccar que não durma e tenha porta TCP aberta.** Esta é a
parte que não aceita gambiarra: o aparelho abre conexão TCP numa porta
específica, então plataformas serverless e de função estão fora por construção.
Precisa ser uma máquina. Em modo encaminhador, 1 vCPU e 2 GB.

**b. O chip de cada aparelho.** A partir de cerca de R$ 5 por mês, por ônibus.

**c. O aparelho.** Compra única por ônibus.

**d. E o item que hoje bloqueia tudo: a API da Rotta não pode dormir.**

### 4.3 O bloqueio que nenhuma economia resolve

Está escrito no próprio código, em três lugares diferentes: **"a API dorme no
plano gratuito do Render e leva perto de 90 segundos para acordar."**

Para o app isso é um incômodo de partida fria. **Para o rastreador é fatal**, e
de um jeito que não aparece em teste:

- O Traccar encaminha a posição, a API está dormindo, a requisição demora 90
  segundos ou falha.
- O Traccar reentrega. Quando a API acorda, chega um lote de posições atrasadas,
  todas de uma vez.
- O `fixTime` salva a geometria do trajeto, que é desenhado no lugar certo.
  **Mas a família viu o ônibus parado por um minuto e meio**, e a ignição que
  abriria a viagem chegou tarde.

**Não existe configuração de rastreador que compense um servidor que dorme.**
Sair do plano gratuito do Render não é otimização, é pré-requisito da frente
inteira.

---

## 5. A auditoria de capacidade: o caso Maricá

### 5.1 Os números reais de Maricá

| Dado                                   | Valor                          | Fonte                              |
| -------------------------------------- | ------------------------------ | ---------------------------------- |
| Alunos na rede pública                 | **29.440**                     | Censo Escolar 2025, INEP, via QEdu |
| Escolas                                | **90**                         | mesma fonte                        |
| Professores                            | 1.929                          | mesma fonte                        |
| Contrato de transporte escolar vigente | **R$ 34,7 milhões, 12 meses**  | Maricá Info, mai/2026              |
| Operador                               | T.L & M.M Transporte e Turismo | mesma fonte                        |
| Frota escolar                          | 22 ônibus e 3 Kombis           | reportagem de **2018**             |

**Não encontrei quantos alunos o transporte escolar de Maricá atende hoje, nem o
tamanho atual da frota.** O dado de frota que existe é de oito anos atrás. O
caminho para obter o número é o contrato 98/2026 no Diário Oficial ou a
Secretaria de Educação. **Não vou estimar penetração de transporte sobre os
29.440 alunos**, porque esse chute mudaria toda a conta seguinte.

**Um achado comercial que vale mais que o número que falta:** o transporte
escolar de Maricá é **um contrato terceirizado grande, com um operador só**. Não
são trinta vans concorrendo. Para a Rotta, a porta de entrada em Maricá é essa
empresa, ou a prefeitura como fiscal do contrato, e não um esforço de vendas
pulverizado.

### 5.2 Quanto pesa um rastreador

Posições por dia e por veículo, pela janela de ignição ligada:

| Intervalo | 4h de ignição | 6h de ignição |
| --------- | ------------- | ------------- |
| 30 s      | 480           | **720**       |
| 60 s      | 240           | 360           |

Uso o pior caso (**30 s, 6 h, 720 por dia**) em tudo abaixo.

O peso de uma linha de `trip_positions`, somando colunas e os três índices, dá
cerca de **212 bytes**. É estimativa minha a partir do schema, não medição no
banco.

| Veículos | Posições/mês | Retidas em 90 dias | Disco    | Pico de requisições |
| -------- | ------------ | ------------------ | -------- | ------------------- |
| 25       | 396.000      | 1.188.000          | 0,23 GB  | 0,8/s               |
| 60       | 950.400      | 2.851.200          | 0,56 GB  | 2,0/s               |
| 150      | 2.376.000    | 7.128.000          | 1,41 GB  | 5,0/s               |
| 500      | 7.920.000    | 23.760.000         | 4,69 GB  | 16,7/s              |
| 1.500    | 23.760.000   | 71.280.000         | 14,07 GB | 50,0/s              |

**O pico de requisições não é problema em nenhuma linha.** Dois pedidos por
segundo é ruído. Mil e quinhentos ônibus dariam 50 por segundo, que um NestJS
atende sem suar.

### 5.3 O teto que ninguém esperava

A limpeza de `trip_positions` roda **uma vez por dia, às 4h**, e apaga no máximo
**5.000 linhas por lote, 10 lotes por execução**. São **50.000 linhas por dia**,
e esse número está fixo no código.

A conta de equilíbrio é direta:

```
50.000 linhas/dia ÷ 720 linhas/dia por veículo = 69 veículos
```

**Acima de 69 ônibus a 30 segundos, a varredura nunca mais alcança o acúmulo.**
A tabela cresce para sempre, devagar, e o efeito só aparece meses depois, como
consulta de mapa ficando lenta. É o tipo de problema que não dá sintoma no dia
em que nasce.

A 60 segundos o teto dobra, para **138 veículos**. A 60 segundos com 4 horas de
ignição, vai a **208**.

**Esse é o verdadeiro limite da plataforma hoje, e não o servidor.** Vale notar
que ele foi calculado numa auditoria anterior para o GPS do aplicativo, com 10
motoristas em mente. Com rastreador em frota, o mesmo número vira teto duro.

### 5.4 Maricá aguenta?

Pelo único dado de frota que existe, de 2018: **22 ônibus e 3 Kombis, ou seja,
25 veículos**.

| Pergunta                               | Resposta                                                  |
| -------------------------------------- | --------------------------------------------------------- |
| 25 rastreadores cabem na varredura?    | **Sim**, com folga de quase 3 vezes                       |
| 25 rastreadores cabem no disco?        | **Sim**, 0,23 GB retidos                                  |
| O pico de requisições preocupa?        | **Não**, 0,8 por segundo                                  |
| Os 29.440 alunos quebram alguma coisa? | **Não** pelo lado de posição: responsável lê, não escreve |
| Funciona no plano gratuito do Render?  | **Não.** O servidor dorme, e aí nada funciona             |

**Mesmo que a frota tenha triplicado desde 2018**, indo a 75 veículos, ela já
passaria do teto de 69 a 30 segundos. A 60 segundos, continua dentro.

**Então a resposta é: aguenta, com duas condições.** Sair do plano gratuito do
Render, e configurar o intervalo em 60 segundos em vez de 30. A segunda é de
graça e é só um campo no aparelho.

Sobre os usuários: **responsável não escreve posição, ele lê.** O volume de
escrita não cresce com aluno, cresce com ônibus. Vinte e nove mil alunos lendo o
mapa é carga de leitura, que escala com cache e réplica, e é um problema
qualitativamente mais fácil do que este.

---

## 6. Um defeito que a auditoria achou de passagem

O aplicativo do motorista reporta GPS **a cada 15 segundos**, com filtro de 25
metros. O rastreador reporta no intervalo dele. **Nenhum dos dois sabe da
existência do outro.**

Num ônibus com aparelho instalado e motorista com o app aberto, **as duas
fontes gravam na mesma viagem**. A 15 e a 30 segundos, são 6 posições por minuto
onde deveriam ser 2. O trajeto fica com pontos duplicados levemente fora de
posição, a família vê o ônibus tremendo no mapa, e o teto da seção 5.3 cai para
um terço.

Quando houver rastreador credenciado no veículo, **o app deveria parar de
reportar e virar só a tela de operação**, que é a função dele que o GPS não
cobre: chamada, embarque, desembarque, ocorrência. GPS não sabe quem subiu.

---

## 7. O que eu faria, em ordem

1. **Sair do plano gratuito do Render.** Pré-requisito, não melhoria. Sem isso
   nada do resto funciona.
2. **Comprar um aparelho 4G Cat-M1, um só**, e um chip M2M. Instalar em um
   ônibus. Conferir o certificado Anatel antes de pagar.
3. **Subir o Traccar em modo encaminhador**, 1 vCPU e 2 GB, sem banco próprio.
4. **Configurar o envio em 60 segundos**, não 30. Dobra o teto de graça e
   nenhuma família percebe a diferença no mapa.
5. **Fechar os dois defeitos antes do segundo aparelho**: a varredura de viagem
   sem sinal (documento 47) e a contagem dupla da seção 6 acima.
6. **Tornar configurável o `LOTE_DE_EXCLUSAO`**, ou rodar a varredura mais de
   uma vez por dia. É uma linha, e é o que tira o teto de 69 do caminho antes de
   ele incomodar.
7. **Buscar o contrato 98/2026 de Maricá** no Diário Oficial, para trocar o dado
   de frota de 2018 pelo número de hoje.

---

## 8. O que depende de você

1. **O host do Traccar e o plano do Render.** É compra, e é o bloqueio inteiro.
2. **O aparelho de teste.** Um só resolve a prova de conceito.
3. **O contrato de Maricá**, se quiser o número real de frota e de alunos
   transportados. É documento público, e eu posso ler e resumir se você trouxer
   o PDF ou o link.

---

_26/10/2026. CTO. Conferido no código: `TrackersService`, `TrackersConfig`,
`data-retention.constants.ts` (`RETENCAO_POSICOES_DIAS`, `LOTE_DE_EXCLUSAO`,
`LOTES_POR_EXECUCAO`), `data-retention-scheduler.service.ts` (cron diário às 4h),
`model TripPosition`, `use-trip-gps-reporting.ts` (15 s, 25 m) e as três menções
ao plano gratuito do Render em `trips.service.ts`, `users.service.ts` e
`legal-documents.catalog.ts`._

## Fontes

- [QEdu, dados educacionais de Maricá (Censo Escolar 2025, INEP)](https://qedu.org.br/municipio/3302700-marica)
- [Maricá Info, contrato de R$ 34,7 milhões para transporte escolar](https://maricainfo.com/2026/05/11/marica-fecha-contrato-de-r-347-milhoes-para-transporte-escolar.html)
- [Maricá Já, frota escolar em 2018](https://maricaja.com.br/2018/10/15/novos-onibus-para-alunos-das-escolas-de-marica/)
- [Prefeitura de Maricá, vistoria dos transportes escolares](https://www.marica.rj.gov.br/noticia/marica-inicia-vistoria-dos-transportes-escolares-na-proxima-segunda-feira-15-07/)
- [Wikipedia, Traccar (licença Apache 2.0, modelos suportados)](https://en.wikipedia.org/wiki/Traccar)
- [Fórum Traccar, requisitos em modo encaminhador](https://www.traccar.org/forums/topic/requirements-for-forwarder-mode/)
- [Fórum Traccar, requisitos de sistema e escalabilidade](https://www.traccar.org/forums/topic/system-requirements-for-traccar-and-scaleability/)
- [YesCert, Ato Anatel 14430/2024 e a vedação de homologação só-2G/3G](https://yescert.com.br/blog/anatel/ato-anatel-14430-2024-4g-minimo-certificacao-celulares-eta/)
- [Canaltech, Brasil não deve desligar 2G e 3G antes de 2028](https://canaltech.com.br/telecom/brasil-nao-deve-desligar-2g-e-3g-antes-de-2028-entenda-o-processo/)
- [Revista Cobertura, estudo Links Field sobre substituição de rastreadores](https://www.revistacobertura.com.br/noticias/tecnologia-servicos/desligamento-das-redes-2g-e-3g-no-brasil-determinacao-da-anatel-exige-substituicao-de-rastreadores-e-pode-custar-r-347-bilhoes-ao-mercado-de-seguros/)
- [Mercado Livre, anúncios do Teltonika FMB920](https://lista.mercadolivre.com.br/rastreador-veicular-teltonika)
- [GpsRS, preços de chip M2M](https://painel.gpsrs.com.br/store/chip-m2m)
