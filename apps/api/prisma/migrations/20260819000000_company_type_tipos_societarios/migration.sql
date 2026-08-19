-- Frente AN — tipos societários pedidos pelo usuário no cadastro de
-- empresa (LTDA/S-A/Cooperativa/Sociedade Simples/Outro no lugar de
-- SLU/EIRELI, que não fazem sentido pro público-alvo da Rotta —
-- transportadoras escolares). Renomeia (nunca DROP/ADD) pra preservar
-- qualquer empresa que já use esses valores hoje — mesmo padrão da
-- Frente AL (`PARTICULAR` → `EXECUTIVO` em `VehicleCategory`).
ALTER TYPE "CompanyType" RENAME VALUE 'SLU' TO 'SA';
ALTER TYPE "CompanyType" RENAME VALUE 'EIRELI' TO 'COOPERATIVA';

-- `ALTER TYPE ... ADD VALUE` não pode rodar na mesma transação que uma
-- instrução que USE o valor novo (limitação do Postgres) — esta
-- migration só adiciona o valor, sem nenhum DEFAULT/CHECK que
-- referencie 'SOCIEDADE_SIMPLES' (mesma nota já documentada em
-- `20260810200000_trip_pause_resume/migration.sql`).
ALTER TYPE "CompanyType" ADD VALUE 'SOCIEDADE_SIMPLES';
