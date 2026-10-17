-- Normaliza o telefone ja gravado: so digitos, sem +55 e sem o "0" de tronco.
--
-- POR QUE ISTO EXISTE
--
-- O telefone e um dos tres identificadores de login (junto de e-mail e
-- CPF), e ate 17/10/2026 ele era gravado exatamente como a pessoa
-- digitou. Quem cadastrou um responsavel escrevendo "(21) 99709-9557"
-- gravou a mascara junto. O login reduz o que foi digitado a digitos e
-- procura "21997099557", que nao e a mesma string: a conta existia e
-- nao abria, sem nenhuma mensagem que explicasse.
--
-- O codigo passou a normalizar na entrada (IsBrazilianMobile /
-- IsBrazilianPhone), mas isso so vale para cadastro novo. As linhas que
-- ja estao no banco continuariam travadas, e sao justamente as das
-- primeiras familias que usaram o produto.
--
-- POR QUE NAO QUEBRA
--
-- O UPDATE ignora qualquer linha cuja forma normalizada ja pertenca a
-- OUTRA conta. Sem isso, duas contas gravadas com o mesmo numero em
-- formatos diferentes violariam o indice unico e derrubariam o deploy
-- inteiro. Preferir deixar essas duas linhas como estao, e resolver a
-- mao sabendo quais sao, e melhor do que travar a subida da API.
--
-- Quem ficou de fora aparece na consulta do fim deste arquivo, que esta
-- comentada de proposito: migracao nao deve imprimir dado de usuario no
-- log de deploy.

WITH sem_pais AS (
  SELECT
    id,
    CASE
      WHEN length(regexp_replace(telefone, '\D', '', 'g')) IN (12, 13)
       AND left(regexp_replace(telefone, '\D', '', 'g'), 2) = '55'
      THEN substr(regexp_replace(telefone, '\D', '', 'g'), 3)
      ELSE regexp_replace(telefone, '\D', '', 'g')
    END AS digitos
  FROM users
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
UPDATE users AS u
SET telefone = n.telefone_limpo
FROM normalizado AS n
WHERE u.id = n.id
  AND u.telefone <> n.telefone_limpo
  AND n.telefone_limpo <> ''
  AND NOT EXISTS (
    SELECT 1 FROM users AS outro
    WHERE outro.telefone = n.telefone_limpo
      AND outro.id <> u.id
  );

-- Para conferir depois do deploy, rodando a mao, quem sobrou com
-- formato sujo (colisao de numero duplicado em formatos diferentes):
--
--   SELECT id, telefone FROM users
--   WHERE telefone <> regexp_replace(telefone, '\D', '', 'g');

-- Mesmo tratamento no pre-cadastro feito pela transportadora.
--
-- Aqui o celular nao e login: e a CHAVE pela qual a familia se acha no
-- pre-cadastro quando entra no app. O servico normalizava so tirando a
-- mascara, entao "+55 21 99709-9557" ficava gravado com o codigo do
-- pais e nunca batia com o "21997099557" que a mae digita. Sem indice
-- unico nesta coluna, nao ha colisao a tratar.

WITH sem_pais AS (
  SELECT
    id,
    CASE
      WHEN length(regexp_replace("celularResponsavel", '\D', '', 'g')) IN (12, 13)
       AND left(regexp_replace("celularResponsavel", '\D', '', 'g'), 2) = '55'
      THEN substr(regexp_replace("celularResponsavel", '\D', '', 'g'), 3)
      ELSE regexp_replace("celularResponsavel", '\D', '', 'g')
    END AS digitos
  FROM student_pre_registrations
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
UPDATE student_pre_registrations AS p
SET "celularResponsavel" = n.celular_limpo
FROM normalizado AS n
WHERE p.id = n.id
  AND p."celularResponsavel" <> n.celular_limpo
  AND n.celular_limpo <> '';
