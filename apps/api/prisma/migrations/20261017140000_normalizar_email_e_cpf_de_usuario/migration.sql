-- Normaliza os outros dois identificadores de login: e-mail e CPF.
--
-- POR QUE ISTO EXISTE
--
-- 20261017090000 cuidou do telefone. E-mail e CPF tinham exatamente o
-- mesmo buraco, e sao os outros dois identificadores com que a pessoa
-- entra na Rotta (UsersService.findByIdentifier).
--
--   users.email
--     A maioria dos caminhos de cadastro ja fazia trim + minusculas no
--     servico, mas nao todos: a criacao de conta de Admin Rotta gravava
--     exatamente o que foi digitado. E o login procurava exatamente o
--     que foi digitado tambem, entao bastava a pessoa digitar com a
--     primeira maiuscula (o padrao do teclado de celular) para nao
--     entrar com a senha certa.
--
--   users.cpf
--     @IsCpf validava por digito verificador e NAO normalizava, entao
--     "123.456.789-00" era gravado com mascara. O login reduz o que foi
--     digitado a digitos e procura "12345678900", que nao e a mesma
--     string.
--
-- POR QUE NAO QUEBRA
--
-- As duas colunas tem indice unico, entao o UPDATE pula qualquer linha
-- cuja forma normalizada ja pertenca a OUTRA conta. Sem isso, duas
-- contas gravadas com o mesmo e-mail em grafias diferentes violariam o
-- indice e derrubariam o deploy inteiro. Deixar essas linhas como estao,
-- sabendo quais sao, e melhor do que travar a subida da API.
--
-- Quem ficou de fora aparece nas consultas comentadas no fim deste
-- arquivo. Ficam comentadas de proposito: migracao nao deve imprimir
-- dado de usuario no log de deploy.

-- users.email: trim + minusculas.

UPDATE users AS u
SET email = lower(btrim(u.email))
WHERE u.email <> lower(btrim(u.email))
  AND lower(btrim(u.email)) <> ''
  AND NOT EXISTS (
    SELECT 1 FROM users AS outro
    WHERE outro.email = lower(btrim(u.email))
      AND outro.id <> u.id
  );

-- users.cpf: so os digitos. A coluna e anulavel (o cadastro de
-- Responsavel nao coleta CPF desde 14/09/2026).

UPDATE users AS u
SET cpf = regexp_replace(u.cpf, '\D', '', 'g')
WHERE u.cpf IS NOT NULL
  AND u.cpf <> regexp_replace(u.cpf, '\D', '', 'g')
  AND regexp_replace(u.cpf, '\D', '', 'g') <> ''
  AND NOT EXISTS (
    SELECT 1 FROM users AS outro
    WHERE outro.cpf = regexp_replace(u.cpf, '\D', '', 'g')
      AND outro.id <> u.id
  );

-- Mesmo tratamento no CPF/CNPJ da empresa. Nao e login, mas e a chave
-- pela qual a Rotta e o Asaas reconhecem a mesma transportadora:
-- gravado "12.345.678/0001-90" num cadastro e "12345678000190" no
-- outro, viram duas empresas.

UPDATE companies AS c
SET "cpfCnpj" = regexp_replace(c."cpfCnpj", '\D', '', 'g')
WHERE c."cpfCnpj" <> regexp_replace(c."cpfCnpj", '\D', '', 'g')
  AND regexp_replace(c."cpfCnpj", '\D', '', 'g') <> ''
  AND NOT EXISTS (
    SELECT 1 FROM companies AS outra
    WHERE outra."cpfCnpj" = regexp_replace(c."cpfCnpj", '\D', '', 'g')
      AND outra.id <> c.id
  );

-- Para conferir depois do deploy, rodando a mao, quem sobrou com
-- formato sujo (colisao em formatos diferentes):
--
--   SELECT id, email FROM users WHERE email <> lower(btrim(email));
--   SELECT id, cpf FROM users
--     WHERE cpf IS NOT NULL AND cpf <> regexp_replace(cpf, '\D', '', 'g');
--   SELECT id, "cpfCnpj" FROM companies
--     WHERE "cpfCnpj" <> regexp_replace("cpfCnpj", '\D', '', 'g');
