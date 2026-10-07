# Anúncios: o que o dado de hoje sustenta

Fonte: `GET /v1/marketing/funil` de 07/10/2026 (gerado às 11:14Z) e
`GET /v1/marketing/campanhas?periodo=last_30d`. Nada abaixo é estimado.

## O que mudou desde 05/10

Nada. Os números são idênticos aos de `2026-10-05-funil.md`: 3
checkouts iniciados, 3 abandonados, 0 pagos; 6 transportadoras em
teste, 1 pagando; `pagosVindosDeAnuncio` 0; `comprasNaoEnviadas` 0. Em
dois dias nenhum checkout novo foi aberto, então a mudança de texto de
`/planos/assinar` ainda não tem como ser medida: falta tráfego, não
falta análise. Não há o que comparar.

Campanhas no Meta: HTTP 502, mensagem exata: "Leitura de campanha
desligada: falta META_ADS_ACCESS_TOKEN (com ads_read) ou
META_AD_ACCOUNT_ID." Sem gasto, clique ou custo por resultado, qualquer
número de campanha seria invenção.

## O que isso diz sobre anúncio

1. **Não dá para otimizar por compra.** Há 0 compras medidas, e a API
   de Conversões tem token só de leitura, então ainda não escreve. O
   Meta só vê o Pixel no navegador, depois do aceite de cookies. Com
   zero vendas, nenhum algoritmo aprende quem paga.
2. **A campanha só pode otimizar para um passo anterior à compra**, e
   o único medido é checkout aberto (`InitiateCheckout`). Mas há 3 desses
   no total, muito abaixo do que o Meta precisa para aprender. Gastar
   verba agora compra tráfego, não aprendizado.
3. **Quem entra pelo teste grátis não aparece na atribuição.** A
   transportadora que paga hoje entrou por trial, e o funil só
   atribui o checkout de `/planos/assinar`. Anúncio que leva a
   `/criar-conta` não tem como provar venda hoje.

## O que eu faria, em ordem, quando houver verba

1. Primeiro destravar a medição: token com escrita da API de
   Conversões e as duas variáveis de leitura de campanha (pedido ao
   fundador no backlog). Sem isso, qualquer teste de anúncio termina
   sem resposta.
2. Teste pequeno, um público (dono de transportadora escolar), um
   destino (`/planos`, que mostra o mês grátis e o preço), uma
   campanha. Meta de aprendizado: reunir os primeiros checkouts e
   cadastros concluídos (`Lead`), não vender.
3. Pausar a campanha se, depois de gastar o teto definido pelo CFO,
   `pagosVindosDeAnuncio` e cadastros concluídos de anúncio continuarem
   em 0. O teto depende do número que pedi ao CFO.

Criativo e público de verdade só dá para decidir com leitura de
campanha. Sem ela, qualquer recomendação aqui seria opinião.
