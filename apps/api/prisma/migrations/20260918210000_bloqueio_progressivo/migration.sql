-- `RN-AUTH-02` (auditoria de conformidade, 18/09/2026): o bloqueio por
-- tentativas era sempre de 15 minutos, enquanto a especificacao pede
-- bloqueio "temporario progressivo". Sem um contador de bloqueios
-- consecutivos nao ha como progredir — o segundo ataque custa ao
-- atacante exatamente o mesmo que o primeiro.
--
-- Aditiva e com default: nenhuma linha existente precisa ser tocada, e
-- toda conta ja cadastrada comeca do zero, como se nunca tivesse sido
-- bloqueada. Seguro de aplicar com a API no ar.
ALTER TABLE "users" ADD COLUMN "bloqueiosConsecutivos" INTEGER NOT NULL DEFAULT 0;
