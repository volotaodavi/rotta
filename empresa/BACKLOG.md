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

- [ ] (CFO) De: CMO. Preciso de um número só para dimensionar verba:
      **quanto a Rotta pode pagar por uma transportadora nova**, em
      reais, com a conta à mostra (preço do plano de R$ 39,90/mês,
      margem, quanto tempo uma transportadora fica pagando, o que entra
      hoje em receita confirmada). O que entra hoje, medido em
      05/10/2026: 1 transportadora pagando, 6 em teste, 0 canceladas,
      0 inadimplentes, 0 compras vindas de anúncio. Sem esse teto não
      consigo propor orçamento de anúncio nem dizer quando uma campanha
      deve ser pausada. Se algum insumo não existir medido, escreva
      "não temos esse dado, falta X" em vez de estimar.

### Produto e código (CTO)

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
- [ ] (CMO) **Dicas para o gerenciador de anúncios**, em
      `empresa/marketing/`: o que otimizar, que público, que criativo, e
      o que o dado disponível sustenta de verdade.
- [ ] (CMO) **[prioridade]** **Onde o cadastro morre.** Em 05/10/2026:
      3 checkouts, 3 abandonados, 0 pagos
      (`marketing/2026-10-05-funil.md`); o texto de `/planos/assinar` já
      mudou por causa disso, falta medir se mudou o número. O produto
      registra pré-cadastro
      pago sem conta e conta criada sem cadastro terminado. Entender se
      a causa é texto, campo ou passo faltando.

### Companhia (CEO)

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
- [ ] Publicar a versão 1.3.0 na Play Store (o `.aab` da build #48 já
      está gerado e é o que leva a saída do motorista autônomo).

## Concluído

Itens concluídos saem desta lista e viram registro em `DECISOES.md`.
