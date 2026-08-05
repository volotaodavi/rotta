# Rotta Pay — Arquitetura da Carteira e Pagamentos

> Módulo novo, fora da numeração original dos Dossiês 1–25. Nasce de um pedido direto do usuário (inspirado no design de uma plataforma de pagamentos de terceiro) para que a Rotta tenha uma carteira digital — a Rotta atuando como intermediária entre o pagamento do Responsável e o recebimento da Transportadora/Motorista, com uma provedora de pagamento parceira cuidando da movimentação real de dinheiro (PIX/transferência).

---

## 1. Contexto e o que já existia

O `Contract` (Dossiê 13, módulo Marketplace) já guarda `valorMensalidadeCentavos` — o valor combinado entre Responsável e Transportadora — mas **nunca existiu nenhuma cobrança ou movimentação de dinheiro real na plataforma**: o contrato é só o vínculo jurídico (assinatura via Authentique, stub) que ativa o transporte. Nenhum pagamento nunca foi de fato processado por nada dentro da Rotta.

O Rotta Pay é a primeira peça desse fluxo financeiro. Ele **não** cobra cartão nem processa PIX diretamente — isso é responsabilidade de uma provedora de pagamento parceira (a definir comercialmente), a mesma lógica de "stub honesto" já usada para a Authentique (assinatura) e a Rotta AI (validação de documentos): a interface e o fluxo de dados existem de verdade, prontos para plugar o parceiro real; até lá, o provedor está deliberadamente indisponível e o sistema fala isso, nunca finge.

## 2. Decisão de escopo (confirmada com o usuário)

- **Quem tem carteira**: Transportadoras (Empresa) **e** Motoristas (papel `MOTORISTA` de um `Membership`) — não Responsáveis nesta primeira versão.
- **Profundidade**: módulo completo (Prisma real, ledger real, saldo real), com o provedor de pagamento parceiro como stub honesto — não é só uma tela bonita com dado fake.

## 3. Modelo de dados

```
Wallet (1 por dono)
 ├─ ownerType: EMPRESA | MOTORISTA
 ├─ companyId?     (único — presente quando ownerType = EMPRESA)
 ├─ motoristaId?   (único — presente quando ownerType = MOTORISTA)
 ├─ saldoDisponivelCentavos   (dinheiro confirmado, sacável)
 ├─ saldoPendenteCentavos     (mensalidades a receber, ainda não confirmadas pelo provedor)
 └─ WalletTransaction[] / WithdrawalRequest[]

WalletTransaction (ledger append-only — nunca editado, só inserido)
 ├─ tipo: CREDITO_MENSALIDADE | CREDITO_AJUSTE | DEBITO_SAQUE | DEBITO_TARIFA | DEBITO_ESTORNO
 ├─ status: PENDENTE | CONCLUIDA | FALHOU
 ├─ valorCentavos (sempre positivo — o sinal vem do `tipo`)
 ├─ saldoDisponivelAposCentavos (snapshot pós-transação — auditável linha a linha)
 ├─ contractId?     (quando originada de uma mensalidade)
 ├─ withdrawalRequestId?  (quando originada de um saque)
 └─ criadaPorUserId?  (null = evento automático do sistema)

WithdrawalRequest
 ├─ valorCentavos, chavePix (dado bancário — PIX é o padrão brasileiro, mais simples que agência/conta)
 ├─ status: SOLICITADO | EM_PROCESSAMENTO | CONCLUIDO | REJEITADO
 ├─ solicitadoPorUserId
 └─ providerReferencia?  (id da transferência no parceiro real — sempre null hoje, stub)
```

**Por que `saldoDisponivel` e `saldoPendente` separados**: sem isso, "creditar a carteira quando o contrato é ativado" seria inventar dinheiro que nunca foi de fato recebido de ninguém — quebraria o princípio já seguido em todo o projeto de nunca fingir dado real. Em vez disso, a ativação do contrato gera uma `WalletTransaction` do tipo `CREDITO_MENSALIDADE` com status **`PENDENTE`** (mexe só no saldo pendente — "a receber"); ela só vira `CONCLUIDA` (e passa a compor o saldo disponível/sacável) quando alguém confirma o recebimento — hoje isso é feito manualmente pelo Admin Rotta (`PATCH /wallet/transacoes/:id/confirmar`), simulando a conciliação manual que qualquer fintech early-stage faz antes de ter um provedor real webhook-integrado. Quando o parceiro de pagamento for integrado de verdade, essa confirmação passa a ser automática (webhook do provedor), sem mudar o resto do modelo.

**Por que débito de saque é imediato (mesmo com status `PENDENTE`)**: para nunca permitir saque em dobro — o valor sai do `saldoDisponivel` no momento da solicitação, e só volta (via uma `WalletTransaction` de `DEBITO_ESTORNO` negativo/estorno, nunca editando a original) se o saque for rejeitado.

## 4. RottaPayProviderService — stub honesto

Interface (`RottaPayProviderService`) com um único método relevante hoje, `iniciarTransferenciaPix`, chamado no momento em que um saque é solicitado — **sempre** retorna `{ sucesso: false, motivo: "..." }` e loga no `Logger` do Nest, exatamente como `AuthentiqueService`/`RottaAiService`. A `WithdrawalRequest` fica `SOLICITADO` aguardando processamento manual/futuro parceiro; nenhuma tela finge que o dinheiro já saiu.

## 5. RBAC

- **Empresa/Gestor**: vê e opera só a carteira da própria empresa (`companyId` do JWT).
- **Motorista**: vê e opera só a própria carteira (`userId` do JWT, papel `MOTORISTA`).
- **Admin Rotta**: vê todas, confirma créditos pendentes e processa saques (`concluir`/`rejeitar`) — os únicos dois pontos de "verdade externa" antes de existir um parceiro real integrado.

## 6. Gatilho de crédito

Hook em `ContractsService.tryActivateAfterBothSigned` (Marketplace) — no exato momento em que o contrato é ativado (`ativadoEm` setado), chama `WalletService.registrarMensalidadePendente(contract)`, que:

1. Garante que a carteira da empresa existe (cria sob demanda, `getOrCreate`).
2. Insere `WalletTransaction(CREDITO_MENSALIDADE, PENDENTE, valorMensalidadeCentavos)`.

Best-effort, nunca bloqueia a ativação do contrato (mesmo padrão de `resolveNomeEmpresa`/eventos de comunicação já existentes ali).

## 7. Fora de escopo desta rodada (V2)

- Cobrança recorrente automática mensal do Responsável (motor de billing) — pré-requisito real para o provedor de pagamento existir de fato.
- Carteira para Responsável.
- Split automático Empresa → Motorista (hoje o motorista tem carteira própria, mas nada credita nela automaticamente — fica para quando houver uma regra de repasse definida com o parceiro).
- Emissão de cartão físico/virtual real (o card visual da tela é só uma referência de identidade da conta, não uma emissão real de meio de pagamento).
