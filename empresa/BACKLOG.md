# Backlog da companhia

A fila de trabalho da diretoria. Qualquer diretor pode editar: tirar o
que concluiu, acrescentar o que descobriu, e o CEO marca `[prioridade]`
uma vez por semana.

Formato de um item: `- [ ] (CARGO) o que é, e por que importa.`
Item com `[prioridade]` é o que o CEO escolheu para a semana.

## Pendente

### Produto e código (CTO)

- [ ] (CTO) **Travessão nas mensagens da API.** A descrição da fatura
      que o cliente vê no boleto do Asaas ainda sai como
      "Rotta — Mensalidade da Plataforma — ...". A limpeza de 01/10/2026
      cobriu app, web e pacotes de copy, e deixou o backend de fora.
      É texto que chega ao cliente pago, no documento mais formal que
      ele recebe.
- [ ] (CTO) **`apps/admin` e `packages/ui` não têm teste nenhum.** O
      script `test` dos dois é um `echo`. Os dois bugs achados em
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
- [ ] (CTO) **Escopo de turno.** Pendência antiga, nunca detalhada.
      Primeiro passo é escrever o que significa, não codar.
- [ ] (CTO) **Tela de escala do motorista.** Pendência antiga.

### Dinheiro (CFO)

- [ ] (CFO) **Quantificar os pré-cadastros pagos sem conta.** Quem
      pagou a assinatura no site e nunca completou o cadastro agora
      aparece no Admin, em "Contas de usuários". Falta saber quantos
      são, quanto dinheiro é, e qual o caminho para cada um: completar
      o cadastro ou devolver.
- [ ] (CFO) **O que a Rotta não consegue medir hoje.** Lista do que
      falta para ter receita, inadimplência e custo por transportadora
      em número, e o que precisa ser implementado para cada um.

### Mercado (CMO)

- [ ] (CMO) **A promessa da página inicial.** Quem chega é
      transportadora, família ou escola, e precisa achar o próprio
      caminho e entender em dez segundos por que usar.
- [ ] (CMO) **Onde o cadastro morre.** O produto registra pré-cadastro
      pago sem conta e conta criada sem cadastro terminado. Entender se
      a causa é texto, campo ou passo faltando.

### Companhia (CEO)

- [ ] (CEO) **Organizar a primeira semana** e marcar a prioridade de
      cada cargo.
- [ ] (CEO) **O que falta para vender de verdade.** Escrever, com base
      no que existe no repositório, o que ainda impede a Rotta de
      receber uma transportadora grande sem o fundador ao lado.

## Só o fundador pode fazer

Nenhum diretor mexe nestes. Ficam aqui para não serem esquecidos.

- [ ] Apagar os artefatos do teste de ponta a ponta do Asaas:
      `sub_lmkg4xgsk73mm5r5`, `pay_ctautpbacftilrys`,
      `pay_r81jl0164jbd2jfu`, `cus_000204220029`.
- [ ] Confirmar o webhook do Asaas apontando para
      `https://rotta-vt7i.onrender.com/v1/webhooks/asaas`.
- [ ] Publicar a versão 1.3.0 na Play Store (o `.aab` da build #48 já
      está gerado e é o que leva a saída do motorista autônomo).

## Concluído

Itens concluídos saem desta lista e viram registro em `DECISOES.md`.
