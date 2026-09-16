-- Avisos que faltavam por cargo (pedido do usuário 15/09/2026: "lista o
-- que faria sentido notificar cada cargo e implementa").
--
-- Só ACRESCENTA valores ao enum — nenhuma linha existente muda, nenhum
-- valor antigo é renomeado ou removido, então é seguro rodar com o app
-- antigo ainda no ar (ele simplesmente nunca gera esses valores).
ALTER TYPE "NotificationEventType" ADD VALUE 'NOVA_SOLICITACAO_TRANSPORTE';
ALTER TYPE "NotificationEventType" ADD VALUE 'ALUNO_NAO_VAI_HOJE';
ALTER TYPE "NotificationEventType" ADD VALUE 'ENDERECO_DO_DIA_ALTERADO';
ALTER TYPE "NotificationEventType" ADD VALUE 'ESCALA_ALTERADA';
