-- Aviso de "rastreador sem sinal" (28/10/2026).
--
-- O ônibus tem aparelho credenciado e escala para hoje, mas parou de
-- mandar posição. Hoje isso só aparecia quando alguém notava o ônibus
-- sumido do mapa, o que normalmente é a família perguntando.

-- O novo tipo de evento de notificação. Vai para a EMPRESA, nunca para
-- a família: quem resolve aparelho mudo é quem tem a chave da garagem.
ALTER TYPE "NotificationEventType" ADD VALUE IF NOT EXISTS 'RASTREADOR_SEM_SINAL';

-- Quando o aviso saiu pela última vez para este ônibus.
--
-- Existe para o aviso sair no máximo UMA VEZ POR DIA por veículo. A
-- varredura roda a cada dez minutos: sem esta marca, um aparelho que
-- queimou na sexta renderia seis avisos por hora até alguém trocá-lo, e
-- aviso repetido é aviso que o gestor aprende a ignorar justamente
-- antes do dia em que ele importa.
ALTER TABLE "vehicles" ADD COLUMN IF NOT EXISTS "avisoSemSinalEnviadoEm" TIMESTAMP(3);
