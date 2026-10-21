---
name: leis
description: |
  Consulta o texto vigente da legislação brasileira no acervo ctresb/leis (Constituição, leis federais, estaduais, atos de reguladores, legislação municipal) para responder dúvida jurídica da Rotta e para conferir se uma regra do produto está de acordo com a norma. Use quando a pergunta envolver: transporte escolar e seus requisitos (CTB arts. 136 a 139 e 145), exigência de documento ou vistoria de veículo, habilitação de motorista e monitor, contrato com a família, dados de criança e LGPD, responsabilidade civil no transporte de menor, cobrança e inadimplência, ou qualquer citação de lei, artigo, decreto, resolução ou súmula. Também quando alguém disser "o que a lei diz", "é legal fazer X", "qual artigo", "isso é obrigatório". NÃO use para dúvida de implementação sem componente jurídico, nem para a documentação de fornecedor (Asaas, Expo, Render), que têm fonte própria.
---

# Legislação brasileira, para a Rotta

O acervo é o repositório público **`ctresb/leis`** (licença MIT): a legislação
brasileira convertida de fontes oficiais para Markdown, com cabeçalho
estruturado e link para a origem de cada texto.

**Nunca faça um clone normal.** Medido em 21/10/2026: um `git clone --depth 1`
passa de **4 GB**, porque o acervo carrega 323.849 normas e o histórico tem uma
por commit. Há dois jeitos certos, e nenhum baixa isso.

## Jeito 1: a URL crua, quando o caminho já é conhecido

Zero instalação, poucos KB. É o caminho para as normas da tabela abaixo, que já
estão mapeadas.

```
https://raw.githubusercontent.com/ctresb/leis/main/<caminho>
```

O CTB inteiro sai em 364 KB assim.

## Jeito 2: o índice local, para achar por número ou varrer por tema

Um clone **sem blobs** traz a árvore completa e nenhum conteúdo: **36 MB** para
o índice de **1.225.237 arquivos**. O conteúdo de cada norma é baixado sob
demanda, na hora em que é lido (medido: 0,6 s por lei).

Uma vez, na máquina:

```bash
git clone --filter=blob:none --no-checkout --depth 1 \
  https://github.com/ctresb/leis.git ~/leis
```

Depois, achar uma norma só pelo número, sem saber a data:

```bash
git -C ~/leis ls-tree -r --name-only HEAD | grep -E "federal/leis-ordinarias/.*lei-9503-"
```

E ler um artigo sem materializar arquivo nenhum:

```bash
git -C ~/leis show HEAD:federal/leis-ordinarias/1997/lei-9503-1997-09-23.md
```

Para atualizar o acervo depois: `git -C ~/leis fetch --depth 1 origin main &&
git -C ~/leis reset --soft FETCH_HEAD`.

**A API do GitHub (`api.github.com`) não serve este repositório em sessão do
Claude Code na nuvem** — responde 403 para repositório não anexado, e a página
HTML do `github.com/tree` também. Em sessão na nuvem use a URL crua ou o índice;
só na máquina do usuário a API funciona.

## Convenção de caminho

Igual em todas as esferas:

| Esfera                   | Caminho                                                                  |
| ------------------------ | ------------------------------------------------------------------------ |
| Constituição Federal     | `constituicao.md`                                                        |
| Lei federal ordinária    | `federal/leis-ordinarias/<ANO>/lei-<NUMERO>-<AAAA-MM-DD>.md`             |
| Lei complementar federal | `federal/leis-complementares/<ANO>/lcp-<NUMERO>-<DATA>.md`               |
| Decreto-lei federal      | `federal/decretos-lei/<ANO>/del-<NUMERO>-<DATA>.md`                      |
| Lei estadual             | `estaduais/<UF>/leis-ordinarias/<ANO>/...`                               |
| Constituição estadual    | `estaduais/<UF>/constituicao/...`                                        |
| Ato de regulador         | `reguladores/<orgao>/<tipo>/...` (ex. `reguladores/contran/resolucoes/`) |
| Lei municipal            | `municipais/<UF>/<municipio>/...`                                        |
| Jurisprudência           | `jurisprudencia/<tribunal>/...`                                          |
| Tratado                  | `tratados/...`                                                           |

**O prefixo do arquivo muda com o tipo da norma, e errar ele dá 404.** Conferido
em 21/10/2026:

| Tipo             | Prefixo | Exemplo                                                  |
| ---------------- | ------- | -------------------------------------------------------- |
| Lei ordinária    | `lei-`  | `federal/leis-ordinarias/1997/lei-9503-1997-09-23.md`    |
| Lei complementar | `lcp-`  | `federal/leis-complementares/2006/lcp-123-2006-12-14.md` |
| Decreto-lei      | `del-`  | `federal/decretos-lei/1943/del-5452-1943-05-01.md`       |

**Nunca adivinhe a data para montar o caminho.** Uma URL crua errada volta 404,
e um 404 não é "a norma não existe": é só o palpite errado. Sem a data, use o
índice do jeito 2.

## O levantamento completo já existe

**Antes de pesquisar norma do zero, leia
`empresa/juridico/2026-10-21-mapa-legal-da-rotta.md`.** Ele mapeia os doze
segmentos que alcançam a Rotta (transporte escolar, criança e adolescente,
educação, acessibilidade, dados, consumidor, contrato, pagamento, trabalho,
tributário, venda a prefeitura, propriedade intelectual) com o caminho de cada
norma já conferido, onde ela toca o produto, e o que pode ou não ser mostrado ao
público.

## O que já está mapeado para o transporte escolar

Conferido em 21/10/2026. Estes são os caminhos que respondem quase toda dúvida
do produto:

| Norma                     | Por que importa                                                                                                                                                             | Caminho                                                |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| Constituição Federal      | art. 208, VII (transporte escolar como dever do Estado); art. 227 (prioridade absoluta da criança)                                                                          | `constituicao.md`                                      |
| **Lei 9.503/1997, o CTB** | **o núcleo: arts. 136 a 139** (autorização do veículo, lotação, requisitos do condutor, competência municipal), art. 145 (habilitação D/E), art. 200 e art. 231 (infrações) | `federal/leis-ordinarias/1997/lei-9503-1997-09-23.md`  |
| Lei 8.069/1990, o ECA     | responsabilidade por criança e adolescente sob guarda de terceiro                                                                                                           | `federal/leis-ordinarias/1990/lei-8069-1990-07-13.md`  |
| Lei 9.394/1996, a LDB     | art. 4º, VIII: dever de transporte para o aluno da rede pública                                                                                                             | `federal/leis-ordinarias/1996/lei-9394-1996-12-20.md`  |
| Lei 13.709/2018, a LGPD   | **art. 14**: dado de criança e adolescente, consentimento de um dos pais                                                                                                    | `federal/leis-ordinarias/2018/lei-13709-2018-08-14.md` |
| Lei 10.880/2004           | PNATE, o programa federal de apoio ao transporte escolar                                                                                                                    | `federal/leis-ordinarias/2004/lei-10880-2004-06-09.md` |
| Lei 13.005/2014           | Plano Nacional de Educação, metas que citam transporte                                                                                                                      | `federal/leis-ordinarias/2014/lei-13005-2014-06-25.md` |

O **art. 139 do CTB** é a razão de a camada municipal importar tanto: ele diz
que a competência do município de impor exigências próprias ao transporte de
escolares não é excluída pelo CTB. Em outras palavras, a autorização, a vistoria
e o cadastro do veículo costumam estar em lei ou decreto **municipal**, não no
CTB.

## Duas lacunas do acervo, e o que fazer com elas

O próprio projeto mede o que falta em `PROGRESSO.md` e `COBERTURA.md`. Duas
lacunas afetam a Rotta diretamente, medidas em 21/10/2026:

1. **Atos do CONTRAN: 6 arquivos em `reguladores/contran/`.** O CONTRAN tem
   centenas de resoluções, e as de transporte escolar (vistoria, equipamento
   obrigatório, idade do veículo) provavelmente não estão lá.
2. **Municipais: 13 municípios do RJ.** A cidade onde a transportadora opera
   provavelmente não está no acervo.

Nos dois casos: **diga que não está no acervo e aponte a fonte oficial** (o
portal do CONTRAN/Senatran, o diário oficial ou o site da prefeitura). Não
preencha a lacuna de memória, e não trate ausência no acervo como ausência de
norma — é o contrário do que o acervo afirma sobre si mesmo.

## Como citar, sempre

Todo arquivo abre com um cabeçalho YAML:

```yaml
titulo: "Lei nº 9.503 de 23/09/1997"
ementa: "Institui o Código de Trânsito Brasileiro."
revogada: false
versao_texto: "compilada (texto vigente)"
fonte: "https://normas.leg.br/?urn=urn:lex:br:federal:lei:1997-09-23;9503"
baixado_em: 2026-10-13
```

Três regras que não são formalidade:

1. **Confira `revogada` e `versao_texto` antes de responder.** Citar artigo de
   norma revogada como se valesse é pior que não responder.
2. **Dê o link de `fonte`** junto com a resposta. Quem vai agir com base nela
   precisa poder conferir no original.
3. **O texto não substitui a publicação no Diário Oficial.** São conversões
   automáticas e OCR, e o próprio README avisa isso. Para decisão que gera
   obrigação ou risco (contrato, resposta a notificação, política pública),
   diga que a conferência na fonte oficial é necessária.

## O limite desta skill

Ela traz o texto da lei. **Ela não dá parecer jurídico.** A Rotta transporta
criança, guarda dado de menor e movimenta dinheiro de família: nas três frentes,
a interpretação de uma norma em caso concreto é trabalho de advogado, não de
leitura de arquivo. Responda o que a lei diz, mostre o artigo, e quando a
pergunta for "podemos fazer X?" separe o que o texto diz do que depende de
análise jurídica.
