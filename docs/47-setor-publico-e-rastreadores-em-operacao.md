# 47. Setor público e rastreadores em operação

**Revisão de 26/10/2026. CTO.** O que falta, o que dá para melhorar, e o que
precisa acontecer para o rastreador sair do código e entrar no ônibus.

Os dois assuntos vieram no mesmo pedido, e não é coincidência: **no setor
público o rastreador não é conveniência, é a prova de execução que o município
paga.** Sem ele a Rotta vende promessa; com ele vende relatório assinado por
máquina. Esta revisão trata os dois como uma coisa só.

Nada aqui é estimativa de mercado nem número que ninguém mediu. Onde há número,
ele veio do código ou do acervo legal, e está dito de onde.

---

## 1. Onde a Rotta está hoje, para o setor público

**O que existe:**

- A tag `LICITADA` em `Company`, com o rótulo "Licitada (contrato com
  município)".
- **Áreas de atuação** por transportadora (`company-service-areas`), exigindo a
  tag `LICITADA` para existir. É a delimitação geográfica de quem atende o quê.
- O **marco legal público**, com a Lei 14.133/2021, a Lei 10.880/2004 (PNATE) e
  os artigos 136 a 139 do CTB mapeados e citados em ABNT, já publicado em
  `/legal/marco-legal`.

**O que não existe, e é o buraco inteiro:**

Não há nenhuma entidade de **contrato com o poder público** na plataforma. Não
há prefeitura como ator, não há edital, não há vigência, não há aditivo, não há
medição, não há empenho. A tag `LICITADA` é hoje um rótulo informativo: ela
muda uma tela (áreas de atuação) e nada mais.

Dito sem rodeio: **a Rotta hoje atende a transportadora que ganhou uma
licitação, não atende a licitação.** São coisas diferentes, e a segunda é onde
está o dinheiro recorrente e previsível do setor público.

---

## 2. O que falta, em ordem de quem destrava venda

### 2.1 Os três defeitos de conformidade continuam abertos

Foram achados em 21/10/2026 ao cruzar o CTB com o código, e **nenhum foi
corrigido**. Os três são itens que aparecem em edital de transporte escolar, o
que os tira da categoria "melhoria" e põe na de "habilitação".

**a. A lotação não é verificada (CTB art. 137).** `RoutesService.addStudent`
checa contrato ativo, mesma empresa, vínculo duplicado e a RN-26 (duas rotas no
mesmo turno). **Não checa capacidade.** `Route.veiculoPadraoId` aponta para o
veículo e `Vehicle.capacidadePassageiros` existe e é obrigatório, então o dado
está todo lá: ninguém o compara. Hoje a plataforma aceita o vigésimo terceiro
aluno numa van de vinte lugares sem dizer nada.

É o único item desta revisão em que a Rotta **ajuda a descumprir a lei**, e é o
mais barato de fechar.

**b. Não há tipo de documento para a autorização de escolar (CTB art. 136,
caput).** `VehicleDocumentType` tem `CRLV`, `LICENCIAMENTO`, `SEGURO`, `LAUDO`,
`VISTORIA`, `FOTO` e `OUTRO`. A autorização específica para transporte escolar,
que é o documento que o fiscal pede primeiro, cai em `OUTRO` e por isso não tem
vencimento próprio nem alerta.

**c. Não há checklist dos equipamentos do art. 136.** São sete requisitos
objetivos (faixa amarela com dístico ESCOLAR, tacógrafo, cintos, registrador de
velocidade, entre outros). Nenhum deles tem campo no cadastro do veículo.

### 2.2 O que o edital pede e a Rotta não produz

Quem fiscaliza contrato de transporte escolar municipal pergunta sempre as
mesmas coisas, e a Rotta tem o dado bruto de quase todas sem ter o relatório:

| O que o município pede                           | A Rotta tem o dado? | Produz o relatório? |
| ------------------------------------------------ | ------------------- | ------------------- |
| Quantos alunos embarcaram, por rota, por dia     | Sim                 | Não                 |
| Quilometragem percorrida por rota no mês         | Posição bruta       | Não                 |
| Dias de operação efetiva contra dias previstos   | Sim                 | Não                 |
| Motorista e monitor que de fato fizeram a viagem | Sim                 | Não                 |
| Veículo que de fato rodou cada rota              | Sim                 | Não                 |
| Ocorrências do período                           | Sim                 | Não                 |
| Documentos do veículo e do motorista vigentes    | Sim                 | Parcial             |

**Isso é uma tela, não um módulo.** O dado está no banco; falta a consulta por
competência e a exportação. É o item de maior retorno desta revisão inteira: é
o que a transportadora anexa ao processo de pagamento todo mês, e é o que faz o
município aceitar que ela use a Rotta em vez da planilha.

### 2.3 Quem paga muda, e o produto ainda não sabe disso

No privado, a família paga a transportadora, e a Rotta acaba de montar esse
caminho inteiro na Lytex. **No licitado o município paga a transportadora**, por
medição mensal, contra nota fiscal e relatório. Não há mensalidade de família,
não há split, não há inadimplência de responsável.

Consequências concretas no código de hoje:

- `Contract.valorMensalidadeCentavos` não faz sentido numa rota licitada. Hoje
  ela nasceria em R$ 0,00, que é justamente o estado que bloqueia a cobrança
  automática. Por acidente, funciona; por desenho, não existe.
- A `ContractInvoice` é da família. A fatura do município é outra coisa: uma por
  **contrato público por competência**, não uma por aluno.
- O Rotta Pay e o split não têm papel nenhum nesse fluxo.

**A decisão de como a Rotta cobra pelo licitado é do fundador, e não está
tomada.** Pode ser assinatura por veículo monitorado, por rota, ou por aluno
transportado. O que dá para dizer tecnicamente: o modelo de split não se aplica,
porque não há pagamento da família para dividir.

---

## 3. Rastreadores: por que ainda não funcionam

### 3.1 O que já está pronto, e está bom

A cadeia está desenhada e o código do lado da Rotta está correto:

```
Rastreador --TCP/Teltonika--> Traccar --HTTPS/JSON--> TrackersService
  -> acha o ônibus pelo IMEI
  -> ignição ligou? abre a viagem do dia pela escala
  -> grava a posição onde o app do responsável JÁ lê
  -> ignição desligou? encerra a viagem
```

E os cuidados difíceis já estão lá: `fixTime` em vez de `serverTime` (aparelho
que despejou posições offline não desenha o trajeto inteiro no instante da
reconexão), posição sem fix é descartada em vez de virar mentira, a viagem é
aberta por `TripsService.start` inteiro para disparar as mesmas notificações do
app, e **toda resposta é 200** porque o Traccar reentrega o que falha para
sempre. O credenciamento do IMEI tem tela no Admin e a web mostra quem tem
rastreador.

Nada disso precisa ser refeito.

### 3.2 Os três buracos que impedem de funcionar

**a. Não existe Traccar em lugar nenhum.** O código espera posições de um
receptor que não está implantado: não há container, não há host, não há runbook,
não há uma linha em `docs/` sobre ele. `TRACKER_INGEST_SECRET` vazio deixa o
guard recusando tudo, que é o estado correto enquanto o receptor não existe, e é
o estado de hoje. **Este é o bloqueio inteiro**: sem o receptor, nenhum aparelho
fala com a Rotta.

**b. A rede de segurança prometida não existe. É defeito.**
`TrackersConfig.minutosSemSinalParaEncerrar` está configurado, documentado com
20 minutos e uma explicação boa do porquê, **e nunca é lido por nada**. Procurei
no `src` inteiro: a constante aparece só no próprio arquivo de config.

O que a documentação dela promete: "sem esta rede de segurança, a viagem ficaria
EM_ANDAMENTO para sempre e o pai veria o ônibus parado no mesmo ponto a noite
inteira." É exatamente o que vai acontecer no primeiro aparelho que perder sinal
ao entrar na garagem, e perder sinal na garagem é rotina, não exceção.

Falta um varredor agendado, no mesmo padrão dos outros do projeto
(`*-scheduler.service.ts` com a fila do QStash), que feche viagem sem posição
há mais de N minutos.

**c. Rastreador mudo não avisa ninguém.** `Vehicle.ultimaPosicaoEm` existe e é
atualizado a cada posição. Ninguém pergunta "faz quanto tempo?". Um aparelho que
queimou, ficou sem chip ou foi arrancado do ônibus simplesmente para de mandar,
e a única evidência é a ausência de um ônibus no mapa, que ninguém está olhando
às 6h40 da manhã.

No privado isso é um incômodo. **No licitado é inadimplemento contratual**: o
edital exige rastreamento, e o mês em que o aparelho ficou mudo é o mês que o
município glosa.

### 3.3 Como pôr um rastreador em operação, do zero

A ordem importa, e cada passo tem um dono claro:

1. **Escolher o aparelho e o chip.** O código já fala Teltonika e GT06 pelo
   Traccar. O aparelho precisa de entrada de ignição ligada de verdade (pós-chave),
   porque é a ignição que abre e fecha a viagem. Chip M2M com APN de dados.
   _Dono: fundador, é compra._
2. **Subir o Traccar.** Um host com IP e porta TCP abertos para o protocolo do
   aparelho, e saída HTTPS para a API da Rotta. Configurar `forward` para
   `POST /trackers/posicoes` com o cabeçalho do segredo.
   _Dono: CTO. Falta o host._
3. **Gerar `TRACKER_INGEST_SECRET`** e pôr nos dois lados, no Render e no
   Traccar. Nunca no repositório.
   _Dono: fundador põe o valor; eu nunca vejo._
4. **Configurar o aparelho**: APN do chip, IP e porta do Traccar, intervalo de
   envio. Com ignição ligada, um envio a cada 30 ou 60 segundos basta para o
   mapa da família e para o relatório de quilometragem.
   _Dono: instalador._
5. **Credenciar o IMEI** na tela que já existe, em Admin > Veículos > Rastreador.
   Enquanto não for credenciado, a posição chega, é recusada e fica um aviso no
   log dizendo exatamente qual IMEI falta.
6. **Conferir no mapa da frota** que o ônibus aparece manobrando na garagem,
   antes de contar com ele numa rota.

Entre os passos 2 e 6 não há código novo a escrever. O que falta de código é o
item (b) acima, o varredor, e ele precisa existir **antes** do primeiro aparelho
em produção, não depois.

---

## 4. O que melhorar no que já existe

**O rastreador abre a viagem, mas não sabe de presença.** Hoje o aparelho abre e
fecha a viagem pela ignição, e quem registra embarque e desembarque continua
sendo o monitor no app. Está certo assim: GPS não sabe quem subiu. Vale dizer
isso com todas as letras na tela do transportador, senão a expectativa vira "o
rastreador faz tudo" e a chamada deixa de ser feita.

**A posição do veículo e a posição da viagem são duas coisas, e a tela não
distingue.** `Vehicle.ultimaLatitude` é atualizada sempre, inclusive com o
ônibus fora de rota. `TripPosition` só existe em viagem. A família vê a segunda,
a transportadora vê a primeira, e isso está correto por minimização de dado da
LGPD. Falta apenas a tela da transportadora dizer "fora de viagem" quando for o
caso, em vez de mostrar um ponto sem contexto.

**O IMEI é único global, e a mensagem de erro não explica isso.** Um aparelho
que trocou de ônibus precisa ser descredenciado do primeiro antes de entrar no
segundo. A restrição está certa; a tela precisa dizer onde o IMEI já está.

---

## 5. Ordem que eu recomendo

Em ordem de dependência, não de tamanho:

1. **O varredor de viagem sem sinal.** É defeito, é pequeno, e é o único item
   que estraga a experiência da família no primeiro dia de rastreador real.
2. **A lotação em `addStudent`** (CTB art. 137). Defeito, pequeno, e o único em
   que a plataforma hoje ajuda a descumprir a lei.
3. **Tipo de documento para a autorização de escolar**, com vencimento e alerta.
4. **O alerta de rastreador mudo**, por veículo, com janela de horário escolar.
5. **O relatório de execução por competência** (seção 2.2). É o maior retorno
   comercial da lista, e depende de 1 e 4 para ser confiável: relatório montado
   sobre viagem que nunca fechou não serve para medição.
6. **Checklist dos equipamentos do art. 136** no cadastro do veículo.
7. **Contrato público como entidade**, com vigência, rotas vinculadas e medição
   mensal. É o maior dos itens, e só faz sentido depois do relatório existir.

Os itens 1 a 4 e o 6 são meus e não dependem de ninguém. O 5 depende de decidir
o formato que o município aceita, e isso se descobre com um edital real na mão.
O 7 depende de decisão comercial.

---

## 6. O que depende de você

1. **O host do Traccar e o aparelho.** É compra, e trava toda a frente de
   rastreador. Sem isso, os itens 1 e 4 da ordem acima ficam prontos e sem
   exercício real.
2. **Como a Rotta cobra no licitado.** Não se aplica split nem mensalidade de
   família. É decisão de preço, e decisão de preço é sua.
3. **Um edital real de transporte escolar**, de qualquer município. O relatório
   de execução da seção 2.2 vale o que o edital aceitar, e hoje eu estou
   desenhando a partir do que a lei exige, não do que o processo de pagamento
   pede. Um edital em mãos troca inferência por fato.

---

_26/10/2026. CTO. Conferido no código: `TrackersService`, `TrackersConfig`
(`minutosSemSinalParaEncerrar` sem leitor), `RoutesService.addStudent` (sem
checagem de capacidade), `VehicleDocumentType` (sem autorização escolar),
`ServiceTag.LICITADA` e `CompanyServiceAreasService`. Base legal em
`empresa/juridico/2026-10-21-mapa-legal-da-rotta.md`._
