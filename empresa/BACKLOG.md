# Backlog da companhia

A fila de trabalho da diretoria. Qualquer diretor pode editar: tirar o
que concluiu, acrescentar o que descobriu, e o CEO marca `[prioridade]`
uma vez por semana.

Formato de um item: `- [ ] (CARGO) o que é, e por que importa.`
Item com `[prioridade]` é o que o CEO escolheu para a semana.

## Pendente

### Pedidos entre diretores

Um diretor que precisa de outro escreve aqui, no formato
`- [ ] (CARGO) de: SEU-CARGO — o que precisa e por quê`. O diretor
endereçado trata como item da própria área no turno seguinte. Começa
vazio: o primeiro recado sai do CFO para o CMO, na sexta.

- [ ] (CTO) De: CFO. Antes de qualquer split: `Contract.valorMensalidadeCentavos`
      está 0 nos 5 contratos existentes, e nenhum foi assinado pelas duas
      partes. Sem valor no contrato não existe split possível. Esse é o
      pré-requisito real, e é de produto, não de finanças.
- [ ] (CTO) De: CFO. `docs.lytex.com.br` e `api.lytex.com.br` continuam
      inalcançáveis deste ambiente (conferido 14/10/2026, HTTP 000). É o
      mesmo impedimento registrado em agosto no
      `rotta-pay-provider.service.ts`. Ou se libera a rede, ou o fundador
      cola a documentação no repositório. Sem isso a integração de split
      não sai do lugar.
- [ ] (CMO) De: CFO. Não publicar nada sobre pagamento dividido até a
      primeira transação liquidar em produção. Material pronto em
      `empresa/marketing/2026-10-14-split-payment-material.md`.
- [ ] (CFO) De: CMO. Preciso de um número só para dimensionar verba:
      **quanto a Rotta pode pagar por uma transportadora nova**, em
      reais, com a conta à mostra (preço do plano de R$ 39,90/mês,
      margem, quanto tempo uma transportadora fica pagando, o que entra
      hoje em receita confirmada). O que entra hoje, medido em
      05 e 07/10/2026: 1 transportadora pagando, 6 em teste, 0 canceladas,
      0 inadimplentes, 0 compras vindas de anúncio. Sem esse teto não
      consigo propor orçamento de anúncio nem dizer quando uma campanha
      deve ser pausada. Se algum insumo não existir medido, escreva
      "não temos esse dado, falta X" em vez de estimar.

### Produto e código (CTO)

- [ ] (CTO) **A tela de operação no Admin, depois de uma semana de uso.**
      `GET /v1/plataforma/operacao` já existe e devolve os números da
      seção 1 de `empresa/dados/FORMULAS.md`, com `resumo` em uma frase.
      Falta a tela. A ordem é de propósito: o material que originou isso
      (Tilli, "A configuração dos 6 painéis") diz para montar um painel,
      usar por uma semana e só então promover, e esta casa tem histórico
      de construir seis de uma vez e não abrir nenhum. Promover só o que
      sobreviver ao uso. Quando montar, consumir pelo `@rotta/api-client`
      e não repetir conta nenhuma no cliente: número que não vem do
      endpoint não entra na tela.

- [ ] (CTO) **Escopo PCI DSS do cartão recorrente, e a alternativa.**
      Leia `financeiro/2026-10-15-split-asaas-respostas-e-decisoes.md`.
      O Asaas confirmou em 15/10/2026 que não existe SDK mobile nem
      tokenização pelo front: o token é gerado pelo nosso backend, com a
      chave da subconta que vai cobrar. Isso faz o número do cartão
      transitar pelo nosso servidor e coloca a Rotta em escopo PCI.
      Escrever o que o escopo exige de verdade, e comparar com a
      alternativa de checkout hospedado em webview, que tira o cartão do
      nosso servidor e custa abrir exceção à jornada nativa. Não
      implementar nada: a decisão é do fundador, e este item é o
      material para ele decidir.
- [ ] (CTO) **Guarda da chave de API de subconta de terceiro.** A
      arquitetura com custódia exige que a Rotta crie cobrança e
      tokenize cartão com a chave de cada subconta, ou seja, guarde no
      nosso banco autoridade de cobrança sobre conta de outra pessoa.
      Escrever o padrão mínimo antes de qualquer linha de código:
      cifrada em repouso, nunca em log, nunca no cliente, rotação, e
      registro auditável de cada uso. Precedente que justifica o rigor:
      em outubro de 2026 uma chave privada de service account passou
      por conversa e segue comprometida.
- [ ] (CTO) **Janela de 2 dias na recusa de cartão.** A retentativa do
      Asaas dura até 2 dias depois do vencimento, e cada recusa dispara
      `PAYMENT_CREDIT_CARD_CAPTURE_REFUSED`. A tela de atualizar cartão
      e a notificação ao responsável precisam existir ANTES da primeira
      cobrança no cartão. Como o sandbox aprova tudo e não permite
      testar recusa, o plano de teste é disparar o payload do webhook
      contra o nosso endpoint e, depois, uma cobrança real de valor
      baixo antes de liberar para cliente.
- [ ] (CTO) Deduplicação geral do webhook da Asaas pelo `id` do evento.
      A documentação de boas práticas dela manda persistir o id de cada
      entrega e impedir que uma reentrega repita a regra de negócio.
      Hoje o `AsaasWebhookEnvelope` nem captura o `id`, e a proteção
      existe caso a caso: status é idempotente, a compra no Meta tem
      `metaPurchaseEm`, e a notificação de pagamento ganhou guard em
      14/10/2026. Isso cobre os handlers de hoje e não cobre o próximo.
      Fazer direito exige capturar o `id` e uma tabela com índice único,
      ou seja, migração: por isso ficou registrado em vez de improvisado.

- [ ] (CTO) **`packages/ui` não tem teste nenhum** (o `apps/admin` ganhou
      o primeiro em da467bd, o da escala). O script `test` do `packages/ui` é
      um `echo`. Os dois bugs achados em
      02/10/2026 (foco perdido a cada letra, filtro que nunca casava)
      estavam exatamente ali. Começar pelo que já deu problema, não por
      cobertura geral.
- [ ] (CTO) **Vitest não consegue renderizar componente com ícone.**
      `@rotta/icons` é carregado por resolução do Node, com a cópia
      React 18 do pacote, e o `react-dom` 19 da web recusa com "A React
      Element from an older version of React was rendered". Isso
      impediu de testar o `Modal.Header` de verdade em 02/10/2026 e vai
      impedir qualquer teste de componente com ícone.
- [ ] (CTO) **Salto de cor na abertura do app.** A splash nativa é
      `#0B0F14` e a tela que o JavaScript desenha é azul: a pessoa vê
      a cor trocar na abertura.
- [ ] (CTO) **Campo identificado só por placeholder.** O CPF do
      responsável no modal "Novo aluno" do Admin foi corrigido em
      02/10/2026, mas o mesmo padrão existe em outros lugares (o bloco
      "Cadastrar nova escola" no mesmo modal, entre outros). Placeholder
      desaparece na primeira letra digitada e deixa o campo anônimo.
- [ ] (CTO) **[prioridade]** **Os agentes de IA do produto, sem dono até agora.**
      Geocoding, Validation, Map Intelligence, Education Sync, Rotta AI,
      Communication Engine e o Audit Engine passaram a ser do CTO em
      05/10/2026. Em 06/10/2026: Geo, Rotta AI e Didit já têm teste e o
      Audit Engine ganhou os dele. Falta o Communication Engine:
      `infra/whatsapp` e `infra/sms` sem nenhum teste, e conferir se um
      envio que falha some calado.
- [ ] (CTO) **Escopo de turno.** Pendência antiga, nunca detalhada.
      Primeiro passo é escrever o que significa, não codar.
- [ ] (CTO) **Tela de escala do motorista.** Pendência antiga.

### Dinheiro (CFO)

- [ ] (CFO) **Precificar a alavanca de custódia do split.** Leia
      `financeiro/2026-10-15-split-asaas-respostas-e-decisoes.md`. O
      prazo de custódia (`daysToExpire`) protege de chargeback e atrasa
      a receita da Rotta na mesma medida, porque o split também fica
      retido. Escrever qual prazo a Rotta aguenta no caixa, e a partir
      de qual prazo a proteção deixa de compensar. Falta o valor da
      tarifa recorrente por subconta com custódia: sem ele, diga o que
      falta em vez de estimar.
- [ ] (CFO) **O take rate líquido, depois do MDR.** O cartão recorrente
      é o meio principal por decisão do fundador em 14/10/2026, e o MDR
      é a maior linha de custo sobre a taxa de intermediação. Escrever a
      conta do take rate líquido por meio de pagamento, com as taxas
      reais da conta (a tabela veio de `GET /v3/myAccount/fees` em
      14/10/2026), e dizer qual piso em `fixedValue` sustenta transação
      de ticket baixo.
- [ ] (CFO) **[prioridade]** **Quantificar os pré-cadastros pagos sem conta.** Quem
      pagou a assinatura no site e nunca completou o cadastro agora
      aparece no Admin, em "Contas de usuários". Falta saber quantos
      são, quanto dinheiro é, e qual o caminho para cada um: completar
      o cadastro ou devolver.
- [ ] (CFO) **Dizer ao CMO quanto vale uma transportadora nova.** O teto
      que a Rotta pode pagar para conquistar um cliente, com a conta à
      mostra (preço, margem, tempo de permanência). É o que dimensiona
      qualquer anúncio, e sem isso o CMO chuta.
- [ ] (CFO) **O que a Rotta não consegue medir hoje.** Lista do que
      falta para ter receita, inadimplência e custo por transportadora
      em número, e o que precisa ser implementado para cada um.

### Mercado (CMO)

- [ ] (CMO) **A promessa da página inicial.** Quem chega é
      transportadora, família ou escola, e precisa achar o próprio
      caminho e entender em dez segundos por que usar.
- [ ] (CMO) **Completar a instrumentação.** Quatro eventos já disparam
      (página vista, checkout aberto, assinatura paga com valor, conta
      de responsável criada). Faltam: cadastro de transportadora
      concluído, app baixado (clique na Play Store) e contato de escola
      enviado. Mesmo padrão: momento real do produto, sem dado pessoal.
- [ ] (CMO) **Dicas para o gerenciador de anúncios.** Primeira versão em `marketing/2026-10-07-anuncios-o-que-o-dado-sustenta.md`; criativo e público só depois da leitura de campanha (502 por falta das variáveis do Meta).
- [ ] (CMO) **[prioridade]** **Onde o cadastro morre.** Em 05/10/2026:
      3 checkouts, 3 abandonados, 0 pagos
      (`marketing/2026-10-05-funil.md`); o texto de `/planos/assinar` já
      mudou por causa disso, em 07/10/2026 os números seguem idênticos (nenhum checkout novo), falta tráfego para medir. O produto
      registra pré-cadastro
      pago sem conta e conta criada sem cadastro terminado. Entender se
      a causa é texto, campo ou passo faltando.

### Companhia (CEO)

- [ ] (CEO) **A sequência da frente de split, por escrito.** Leia
      `financeiro/2026-10-15-split-asaas-respostas-e-decisoes.md` e
      responda uma coisa só: esta frente abre agora ou depois, e contra
      qual número. O que está medido em 14/10/2026: 8 transportadoras,
      7 em TRIAL e 1 ativa; 24 usuários, 2 novos em 30 dias; 8 alunos;
      10 viagens em toda a história, a última em 28/08/2026; R$ 39,90
      de receita mensal. Com zero viagem não existe mensalidade de
      transporte para dividir, e portanto não existe take rate. Diga o
      gatilho numérico que justifica abrir, e o que a companhia faz até
      lá. Recomendação contrária é bem-vinda: a ordem de 14/10/2026 em
      `FUNDADOR.md` manda discordar antes de executar.
- [ ] (CEO) **Quem a família vê no extrato.** Na arquitetura com
      custódia, quem emite a cobrança é a subconta da transportadora, e
      o Asaas não confirmou quem aparece como recebedor. Isso é decisão
      de marca e de confiança, não de código: nome desconhecido em
      extrato de mãe pagando transporte de filho é causa de contestação
      e de ligação para a transportadora. Escrever qual nome a Rotta
      quer ali e o que fazer se não for possível escolher.
- [ ] (CEO) **[prioridade]** **O que falta para vender de verdade.** Escrever, com base
      no que existe no repositório, o que ainda impede a Rotta de
      receber uma transportadora grande sem o fundador ao lado.

## Só o fundador pode fazer

Nenhum diretor mexe nestes. Ficam aqui para não serem esquecidos.

- [ ] **Colocar `DIRETORIA_READ_SECRET` no ambiente da sessão do CMO.**
      Em 05/10/2026 a sessão do CMO acordou sem a variável
      (`DIRETORIA_READ_SECRET: AUSENTE`, `RENDER_API_KEY: AUSENTE`) e
      `GET /v1/marketing/funil` respondeu 401. `ACESSOS.md` marca a
      chave como ligada, mas ela não chegou a esta sessão. Menu do
      ambiente na barra de título da sessão, "Edit", mesmo valor que
      está no Render. Até isso, nenhuma análise de funil é possível.

- [ ] **Perguntar a um contador se a atividade da Rotta permite MEI.** O
      plano de a diretoria pagar a Guia DAS-MEI do CNPJ
      54.623.584/0001-80 depende disso, e a resposta não é obviamente
      sim: o enquadramento exige ocupação na lista permitida, e
      plataforma e desenvolvimento de software em geral não estão nela.
      Somam-se o teto de faturamento anual e a pergunta de 14/10/2026
      sobre MEI intermediando pagamento de terceiros, que é o que o
      split faria. Enquanto não houver resposta escrita, o CFO trata o
      DAS-MEI como hipótese.
- [ ] **Definir os tetos e os destinos do mandato do CFO.** Preencher
      `empresa/financeiro/DESTINOS.md`: valor máximo por movimentação,
      valor máximo por mês, e a primeira linha de destino. Só o fundador
      edita esse arquivo. Enquanto estiver sem número, o teto é zero e
      nenhuma movimentação é permitida, mesmo com todas as outras travas
      cumpridas.
- [ ] **Dar o número do gatilho de realidade.** O mandato financeiro só
      abre quando o produto estiver funcionando e a recorrência for
      comprovada. A proposta escrita em `FUNDADOR.md` é três meses
      consecutivos de receita recorrente e viagem registrada em pelo
      menos oito das últimas doze semanas. Aprovar, mudar o número, ou
      dizer qual é o seu.
- [ ] **Mandar o e-mail ao comercial do Asaas** (`contato@asaas.com.br`
      ou 0800 009 0037) com as sete perguntas da seção 7 de
      `empresa/financeiro/2026-10-15-split-asaas-respostas-e-decisoes.md`.
      O time de Integrações respondeu tudo o que era técnico em
      15/10/2026 e remeteu ao comercial exatamente o que decide se a
      frente é segura: responsabilidade em chargeback sem saldo na
      subconta, o que elimina a exposição da conta pai, valor da tarifa
      de custódia por subconta, quem aparece no extrato da família,
      franquia de Pix, homologação do white label e existência de
      checkout hospedado. Nenhum diretor pode falar com gente de fora.
- [ ] **Decidir a exceção de webview para captura de cartão.** Jornada
      nativa integral contra escopo PCI DSS. É a decisão de maior
      consequência da frente de split e é só sua.
- [ ] **Autorizar, ou não, a guarda de chave de API de subconta de
      terceiro** no banco da Rotta, e sob quais controles. Sem essa
      autorização escrita, o CTO não começa a implementação.
- [ ] **Apagar no Google Cloud a chave privada do service account do
      Firebase** (key ID `40901697ff97d53e28aa3642ea30c3f9a822c80c`),
      comprometida por ter passado em conversa. Deixou de ser higiene e
      passou a ser pré-requisito: a arquitetura de split coloca cartão
      e chave de terceiro no mesmo servidor.
- [ ] Apagar os artefatos do teste de ponta a ponta do Asaas:
      `sub_lmkg4xgsk73mm5r5`, `pay_ctautpbacftilrys`,
      `pay_r81jl0164jbd2jfu`, `cus_000204220029`.
- [ ] Confirmar o webhook do Asaas apontando para
      `https://rotta-vt7i.onrender.com/v1/webhooks/asaas`.
- [ ] **Decidir se a diretoria pode ver os erros de produção.** Hoje
      nenhum diretor enxerga `ClientErrorReport` (a tela "Erros do
      cliente" do Admin), porque isso é banco de produção. Sem isso, o
      CTO só sabe de um erro quando ele chega pelo backlog ou por você.
      Dar essa visão significa guardar um token só de leitura nos
      segredos do ambiente. Risco e benefício são seus para pesar.
- [ ] **Colar o Pixel do Meta na Vercel.** O passo a passo está em
      `empresa/marketing/COMO-LIGAR-O-PIXEL.md`: é uma variável de
      ambiente (`NEXT_PUBLIC_META_PIXEL_ID`) e um redeploy. O site já
      dispara os eventos; falta só o número.
- [ ] **Criar o `DIRETORIA_READ_SECRET`**, para o plantão do CTO
      enxergar os erros reais. Invente um segredo longo e coloque o
      MESMO valor em dois lugares: no serviço da API no Render, e no
      ambiente onde os turnos da diretoria rodam. Sem ele, o plantão
      acorda cego e diz isso no relatório.
- [ ] **Colocar `META_ADS_ACCESS_TOKEN` (com `ads_read`) e `META_AD_ACCOUNT_ID` no serviço da API no Render.** Em 05/10/2026 `/v1/marketing/campanhas` respondeu 502: "Leitura de campanha desligada: falta META_ADS_ACCESS_TOKEN (com ads_read) ou META_AD_ACCOUNT_ID." Sem isso o CMO não vê gasto nem resultado de campanha.
- [ ] **Decidir sobre a Marketing API do Meta**, se quiser que o CMO
      mexa em campanha sozinho. Exige um token de Usuário do Sistema com
      `ads_management`, guardado como segredo do ambiente. O caminho
      está no fim de `empresa/marketing/COMO-LIGAR-O-PIXEL.md`.
- [ ] **Publicar a versão 1.3.0 na Play Store usando o `.aab` da build
      #53**, não o da #48. Corrigido em 15/10/2026: este item dizia #48,
      e publicar aquele binário colocaria na loja um app com o crash da
      Central de Notificações dentro. A #48 (02/10, `d7c52a1`) é só o
      bump de versão que permite levar a saída do autônomo. O que
      consertou as notificações é a #51 (08/10), a instrumentação de
      crash é a #52 (13/10) e o login é a #53 (13/10, `28f35b8`), que é
      a última bem-sucedida e contém as três. O `versionName` continua
      1.3.0 desde o bump, e o `versionCode` vem da CI, que pergunta à
      Play Console o maior já enviado e soma 1, então a #53 é aceita por
      cima da #48. A #54 é a mesma árvore da #53 e foi cancelada: era um
      APK, e o fundador pediu só `.aab`.

## Concluído

Itens concluídos saem desta lista e viram registro em `DECISOES.md`.
