-- Normaliza as tres colunas de telefone que ficaram de fora de
-- 20261017090000_normalizar_telefone_de_usuario.
--
-- POR QUE ISTO EXISTE
--
-- Aquela migracao cuidou das duas colunas que travam o login e o
-- pre-cadastro do aluno. Faltaram tres, todas gravadas por servicos que
-- usavam um `onlyDigits` local: ele tira a mascara e DEIXA o "+55"
-- (numero colado do WhatsApp) e o "0" de tronco dentro.
--
--   companies.telefone / companies.whatsapp
--     Telefone de contato da transportadora. Nao e login, mas e o
--     numero que a Rotta usa pra falar com a empresa, e o que aparece
--     no Marketplace pra familia.
--
--   company_join_pre_registrations.celular
--     Esta e a pior das tres: e CHAVE DE PAREAMENTO. O gestor
--     pre-cadastra o celular de quem vai contratar; quando a pessoa
--     informa o codigo da empresa, o sistema compara o celular dela com
--     este campo e libera o vinculo na hora. Gravado com "+55" de um
--     lado e sem do outro, a comparacao nunca da certo: o convite
--     existe, a pessoa pede vinculo, e o pedido cai na fila manual como
--     se nao houvesse convite nenhum.
--
-- POR QUE NAO QUEBRA
--
-- Nenhuma das tres colunas tem indice unico, entao nao existe colisao a
-- tratar aqui (diferente de users.telefone). O UPDATE so troca linha
-- cujo valor normalizado e diferente do atual e nao fica vazio.

-- companies.telefone (NOT NULL no schema)

WITH sem_pais AS (
  SELECT
    id,
    CASE
      WHEN length(regexp_replace(telefone, '\D', '', 'g')) IN (12, 13)
       AND left(regexp_replace(telefone, '\D', '', 'g'), 2) = '55'
      THEN substr(regexp_replace(telefone, '\D', '', 'g'), 3)
      ELSE regexp_replace(telefone, '\D', '', 'g')
    END AS digitos
  FROM companies
),
normalizado AS (
  SELECT
    id,
    CASE
      WHEN length(digitos) IN (11, 12) AND left(digitos, 1) = '0'
      THEN substr(digitos, 2)
      ELSE digitos
    END AS telefone_limpo
  FROM sem_pais
)
UPDATE companies AS c
SET telefone = n.telefone_limpo
FROM normalizado AS n
WHERE c.id = n.id
  AND c.telefone <> n.telefone_limpo
  AND n.telefone_limpo <> '';

-- companies.whatsapp (anulavel)

WITH sem_pais AS (
  SELECT
    id,
    CASE
      WHEN length(regexp_replace(whatsapp, '\D', '', 'g')) IN (12, 13)
       AND left(regexp_replace(whatsapp, '\D', '', 'g'), 2) = '55'
      THEN substr(regexp_replace(whatsapp, '\D', '', 'g'), 3)
      ELSE regexp_replace(whatsapp, '\D', '', 'g')
    END AS digitos
  FROM companies
  WHERE whatsapp IS NOT NULL
),
normalizado AS (
  SELECT
    id,
    CASE
      WHEN length(digitos) IN (11, 12) AND left(digitos, 1) = '0'
      THEN substr(digitos, 2)
      ELSE digitos
    END AS whatsapp_limpo
  FROM sem_pais
)
UPDATE companies AS c
SET whatsapp = n.whatsapp_limpo
FROM normalizado AS n
WHERE c.id = n.id
  AND c.whatsapp <> n.whatsapp_limpo
  AND n.whatsapp_limpo <> '';

-- company_join_pre_registrations.celular (anulavel, chave de pareamento)

WITH sem_pais AS (
  SELECT
    id,
    CASE
      WHEN length(regexp_replace(celular, '\D', '', 'g')) IN (12, 13)
       AND left(regexp_replace(celular, '\D', '', 'g'), 2) = '55'
      THEN substr(regexp_replace(celular, '\D', '', 'g'), 3)
      ELSE regexp_replace(celular, '\D', '', 'g')
    END AS digitos
  FROM company_join_pre_registrations
  WHERE celular IS NOT NULL
),
normalizado AS (
  SELECT
    id,
    CASE
      WHEN length(digitos) IN (11, 12) AND left(digitos, 1) = '0'
      THEN substr(digitos, 2)
      ELSE digitos
    END AS celular_limpo
  FROM sem_pais
)
UPDATE company_join_pre_registrations AS p
SET celular = n.celular_limpo
FROM normalizado AS n
WHERE p.id = n.id
  AND p.celular <> n.celular_limpo
  AND n.celular_limpo <> '';
