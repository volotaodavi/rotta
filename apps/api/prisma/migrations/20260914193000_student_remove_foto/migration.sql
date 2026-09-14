-- Pedido do usuário 14/09/2026: "a gente NÃO pede foto de nenhum
-- aluno ou responsável" — confirmado antes de remover que nenhuma
-- tela (mobile ou web) nunca chamou `POST /students/:id/photo`;
-- era capacidade morta desde que existia. Remove as colunas em vez
-- de só deixar de usá-las (minimização de dados, LGPD art. 6º VI).
ALTER TABLE "students" DROP COLUMN "fotoUrl";
ALTER TABLE "students" DROP COLUMN "fotoPath";
