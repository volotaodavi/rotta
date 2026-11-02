# Runbook de incidentes

Para os dois sócios. Sem jargão, sem pressupor que você estava olhando o
código ontem.

A regra que atravessa este documento: **primeiro descobrir se o problema
é nosso, da operadora de celular ou do aparelho no ônibus.** Quase todo
chamado de "sumiu o ônibus do mapa" é uma dessas três coisas, e elas se
distinguem em menos de dois minutos com os comandos abaixo.

---

## Os três comandos que resolvem metade dos chamados

Abra o terminal (ou o navegador, nos dois primeiros) e rode nesta ordem.

**1. A API está no ar?**

```
https://rotta-vt7i.onrender.com/v1/health
```

Abra no navegador. Se responder, está no ar. Se demorar **30 a 90
segundos** e depois responder, ela estava **dormindo** — é o plano
gratuito do Render, e é esperado (ver `README.md`, seção
"Infraestrutura em produção"). Se não responder nunca, pule para o
item 1 da tabela.

**2. O banco e o cache estão respondendo?**

```
https://rotta-vt7i.onrender.com/v1/health/ready
```

Devolve `database` e `cache`. `false` em qualquer um dos dois é
incidente de verdade — item 2 da tabela.

**3. As integrações estão de pé?**

```
https://rotta-vt7i.onrender.com/v1/health/integrations
```

Mostra, uma por uma, quais parceiros (pagamento, identidade,
notificação) estão respondendo. É o que diz se o problema é nosso ou
deles.

---

## O que é urgente de verdade

A ordem importa: ela é por **risco para a criança**, não por quantidade
de gente reclamando.

| Nível               | O que é                                                                                                      | Prazo                             |
| ------------------- | ------------------------------------------------------------------------------------------------------------ | --------------------------------- |
| **1. Para tudo**    | Família vendo dados de outra empresa; criança marcada no ônibus errado; app abrindo na conta de outra pessoa | Agora, de madrugada se for o caso |
| **2. Urgente**      | Nenhum ônibus aparece no mapa durante o turno; ninguém consegue entrar; viagem não abre na hora do embarque  | Dentro do turno                   |
| **3. Importante**   | Um ônibus específico sem sinal; aviso não chegou; mensalidade não baixou                                     | No mesmo dia                      |
| **4. Pode esperar** | Lentidão no primeiro acesso do dia; tela feia; texto errado                                                  | Na próxima semana                 |

Nível 1 tem um procedimento próprio, no fim deste documento.

---

## 1. "O site não abre" / "o app não entra"

**O que a pessoa diz:** fica girando, dá erro de conexão, demora
demais no login.

**O que conferir, em ordem:**

1. Abra `/v1/health` (comando 1). Demorou e respondeu? Era a API
   dormindo: o primeiro acesso do dia paga 30 a 90 segundos. Não há
   incidente.
2. Não respondeu em dois minutos? Entre no painel do Render e veja se o
   serviço está suspenso. **As 750 horas gratuitas são da conta
   inteira** — estourando, tudo para até o mês virar.
3. Respondeu, mas o painel continua sem abrir? O problema é da Vercel
   (o site), não da API. Veja o painel da Vercel.

**O que fazer:** se for a cota do Render, o conserto é pagar o plano de
**US$ 7/mês** no serviço da API — isso elimina a suspensão e o
cold start. Enquanto não for, o `keep-api-warm` reduz a chance, mas não
elimina.

---

## 2. Banco ou cache fora

**O que a pessoa diz:** erro em tudo, em todas as telas.

**O que conferir:** comando 2. `database: false` é o banco (Supabase);
`cache: false` é o Redis.

**O que fazer:**

- **Banco fora:** entre no painel do Supabase. Projeto gratuito
  **pausa sozinho** depois de uma semana sem uso — é só despausar, e
  volta. Se não for pausa, é incidente do fornecedor: a página de
  status deles diz.
- **Cache fora:** o aplicativo continua funcionando mais devagar. Não é
  nível 2, é nível 3.

---

## 3. "O ônibus sumiu do mapa"

O chamado mais comum. Comece perguntando **um ônibus ou todos**.

### Se for UM ônibus

A Rotta já avisa sozinha: quando um ônibus com rastreador e escala do
dia fica **duas horas** sem mandar posição, a transportadora recebe o
aviso "Ônibus X sem sinal do rastreador". Se o aviso chegou, o
diagnóstico já está feito — é o aparelho.

**O que conferir, no ônibus, nesta ordem** (é a ordem da probabilidade,
não a do trabalho):

1. **O fusível.** O aparelho é alimentado pela bateria do ônibus.
   Fusível queimado é a causa número um e a mais barata.
2. **O chip.** Sem crédito ou sem cobertura, o aparelho grava e não
   envia. Ele guarda o que não conseguiu entregar e despeja tudo junto
   quando a rede volta — se as posições chegarem atrasadas em bloco, era
   isso.
3. **A antena.** Solta ou cortada.
4. **O IMEI está credenciado?** Painel do Admin → Veículos →
   Credenciar rastreadores. Aparelho instalado e não credenciado manda
   posição e a Rotta descarta, com um aviso no log. Acontece.

### Se forem TODOS os ônibus

O problema não está nos aparelhos: está no meio do caminho.

1. **A VM do Traccar está de pé?** É ela que recebe o sinal dos
   rastreadores e repassa para a Rotta. Sem ela, nenhuma posição entra.
2. **A API está no ar?** Comando 1. Se a API ficou fora por muito
   tempo, o Traccar segura as posições e reentrega — até certo ponto.
   O limite está configurado em 2000 posições pendentes
   (`infra/rastreadores/instalar.sh`), o que cobre cerca de catorze
   minutos de uma frota de setenta ônibus. Mais que isso, o que passar
   do limite é descartado pelo próprio Traccar.

---

## 4. "A viagem não abriu" / "o ônibus está rodando e não aparece"

**A causa quase sempre é a mesma:** o ônibus ligou a ignição e **não
tem escala para hoje**. Sem escala, a Rotta não sabe qual rota ele está
fazendo nem quais crianças deveriam estar dentro — e não inventa.

**O que conferir:** painel do Despachante (`/despachante`). O ônibus
aparece lá como designado a alguma rota hoje?

**O que fazer:** designar no painel do Despachante. A viagem abre
sozinha na próxima posição que o aparelho mandar.

**Detalhe que ajuda:** quando isso acontece, a Rotta tenta adivinhar a
rota pelo trajeto e escreve no log algo como "pelo trajeto, parece a
rota X". Ela **sugere e nunca decide** — abrir a viagem na rota errada
trocaria a lista de crianças.

---

## 5. "O motorista está em viagem e a família não vê"

Diferente do item 3: aqui o rastreamento vem do **celular do
motorista**, não do aparelho.

**O que conferir, com o motorista ao telefone:**

1. **A permissão de localização está como "Sempre"?** Se estiver como
   "Enquanto usa o app", a posição para assim que ele bloqueia a tela.
   O aplicativo continua reportando com a tela aberta — por isso o
   sintoma costuma ser "some quando ele guarda o telefone".
2. **A economia de bateria do Android está matando o app?** Em
   Configurações → Bateria, o app precisa estar como "sem restrição".
   Xiaomi, Samsung e Motorola são os piores nisso.
3. **O telefone esteve sem sinal?** As posições não se perdem: ficam
   guardadas no aparelho e saem em bloco quando o sinal volta.

**O que NÃO é problema:** com um rastreador reportando no ônibus, a
Rotta **ignora de propósito** a posição do celular na mesma viagem. Os
dois GPS discordam por alguns metros e, intercalados, desenham um
ziguezague no mapa da família.

---

## 6. "Não chegou o aviso"

**O que conferir:** comando 3 — a integração de notificação está de pé?

**Depois:** a pessoa desligou as notificações do app no próprio
telefone? É a causa mais comum, e não há nada a fazer do nosso lado
além de pedir que ela religue.

**Se nenhuma das duas:** o aviso fica registrado na Central de
Notificações dentro do app mesmo quando o push falha. Se não estiver
nem lá, aí é defeito nosso — anote qual aviso, de qual viagem, e me
conte.

---

## 7. "A mensalidade não baixou"

**O que conferir:** comando 3 — a integração de pagamento está
respondendo?

**Depois:** o pagamento aparece como recebido no painel do fornecedor
(Asaas/Lytex) mas não na Rotta? Então o aviso de pagamento (webhook) não
chegou ou não foi processado. É recuperável: o fornecedor reenvia.

**O que NUNCA fazer:** dar baixa manual no banco. A baixa manual
conserta a tela e deixa o histórico financeiro divergente do
fornecedor — e aí a conferência do mês não fecha nunca mais.

---

## 8. Deploy quebrado

**Sintoma:** o site estava funcionando e parou logo depois de uma
publicação.

**O que fazer, nesta ordem:**

1. **Voltar primeiro, investigar depois.** Na Vercel, "Promote to
   Production" na publicação anterior. No Render, "Rollback" na versão
   anterior. Minutos fora do ar custam mais que a elegância de achar a
   causa antes.
2. Só então olhar o que o CI disse. Se o CI estava vermelho e a
   publicação saiu mesmo assim, a causa provavelmente está ali.

---

## Nível 1: dados de uma empresa aparecendo para outra

Este é o único caso que justifica acordar alguém de madrugada.

**O que caracteriza:** um gestor vê um ônibus, uma rota, um aluno ou uma
mensalidade que **não é da empresa dele**. Ou uma família vê a criança
de outra.

**O que fazer, nesta ordem:**

1. **Anote tudo antes de mexer:** quem viu, em qual tela, qual registro,
   o horário. Sem isso, não se reconstrói o que aconteceu.
2. **Tire o acesso:** suspenda a conta que viu o que não devia. É
   reversível; o vazamento não é.
3. **Me chame com essas informações.** O isolamento entre empresas é
   feito pelo banco (uma regra que separa cada empresa linha a linha),
   e existe um teste automático só para isso. Se ele falhou em
   produção, a causa precisa ser achada antes de qualquer conta
   voltar.
4. **LGPD:** dado pessoal de criança vazado tem prazo de comunicação.
   Não é decisão técnica — é jurídica, e começa com o registro do
   item 1.

---

## O que só você consegue fazer

Nenhuma destas eu resolvo de dentro do código:

- Pagar o plano do Render (US$ 7/mês) para acabar com a suspensão.
- Despausar o banco no Supabase.
- Entrar nos painéis dos fornecedores de pagamento.
- Ir até o ônibus, ou mandar alguém, para o fusível/chip/antena.
- Reiniciar a VM do Traccar.
- Qualquer coisa que exija senha, cartão ou assinatura.

A lista completa, com o que acontece se cada uma não for feita, está em
`docs/49-o-que-depende-de-voce.md`.

---

## Quando me acionar

Me mande, sempre que puder, estas quatro coisas:

1. **O que a pessoa disse**, com as palavras dela.
2. **Qual tela**, e se é no app ou no site.
3. **Que horas**, e se ainda está acontecendo.
4. **O que o comando 1 respondeu.**

Com isso eu começo pelo diagnóstico. Sem isso, começo perguntando.
