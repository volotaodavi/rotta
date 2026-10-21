# O mapa legal da Rotta: toda norma que nos alcança, e onde ela entra no produto

**Pedido do fundador em 21/10/2026:** "todas as leis necessárias para a Rotta,
literalmente todas", e em quais partes elas encaixam e podem ser mostradas ao
público.

Cada norma abaixo foi **localizada e conferida** no acervo `ctresb/leis` em
21/10/2026, com o cabeçalho lido: título, ementa, se está revogada e a fonte
oficial. Nada aqui é citado de memória. O caminho serve para reabrir o texto a
qualquer momento (ver a skill `leis`).

> **O que este documento não é.** Não é parecer jurídico. Ele diz o que a norma
> escreve e onde o produto toca nela. "Podemos fazer X?" em caso concreto é
> trabalho de advogado, e três frentes nossas pedem isso com urgência:
> transporte de criança, guarda de dado de menor e movimentação de dinheiro de
> terceiro.

---

## Resumo: o que achei de concreto no código

Antes do mapa, os três achados que valem ação, todos verificados no código hoje:

| Achado                                                                                                                                                                                                                                                                                                                                                                | Onde                                            | Gravidade |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- | --------- |
| **Adicionar aluno a uma rota não confere a lotação do veículo.** Atribuir veículo a uma rota cheia é recusado (`routes.service.ts:283`), mas o caminho inverso (`addStudent`) valida contrato, duplicidade e conflito de horário — e não a capacidade. O art. 137 do CTB proíbe conduzir escolares acima da capacidade do fabricante, e a Rotta sabe os dois números. | `apps/api/src/modules/routes/routes.service.ts` | **Alta**  |
| **Não existe tipo de documento para a autorização de escolar.** `VehicleDocumentType` tem `CRLV`, `LICENCIAMENTO`, `SEGURO`, `LAUDO`, `VISTORIA`, `FOTO`, `OUTRO`. Falta a autorização do art. 136 _caput_, que é emitida pelo DETRAN e que o art. 137 manda afixar dentro do veículo. Hoje ela cai em `OUTRO`, sem vencimento próprio.                               | `schema.prisma`, enum `VehicleDocumentType`     | Média     |
| **Os equipamentos do art. 136 não são conferidos em lugar nenhum.** Faixa amarela com dístico ESCOLAR, registrador de velocidade, lanternas e cintos em número igual à lotação são condição de circulação, e o cadastro de veículo não tem onde registrar que existem.                                                                                                | `Vehicle`                                       | Média     |

O lado do motorista está melhor do que eu esperava: `DriverDocumentType` já tem
`CNH`, `EAR`, `CURSO_TRANSPORTE_ESCOLAR` e `ANTECEDENTES_CRIMINAIS`, e o
comentário do schema já cita o art. 138 do CTB.

---

## Segmento 1. Transporte escolar: o veículo e o condutor

**A norma central de todo o negócio.**

| Norma                                                             | Caminho no acervo                                      |
| ----------------------------------------------------------------- | ------------------------------------------------------ |
| Lei 9.503/1997, Código de Trânsito Brasileiro                     | `federal/leis-ordinarias/1997/lei-9503-1997-09-23.md`  |
| Lei 14.599/2023 (altera o CTB; posterga o toxicológico periódico) | `federal/leis-ordinarias/2023/lei-14599-2023-06-19.md` |
| Lei 12.587/2012, Mobilidade Urbana                                | `federal/leis-ordinarias/2012/lei-12587-2012-01-03.md` |

### O capítulo XIII do CTB, na íntegra do que exige

**Art. 136 — o veículo só circula com autorização do DETRAN, exigindo-se:**

1. registro como veículo de passageiros;
2. **inspeção semestral** dos equipamentos obrigatórios e de segurança;
3. faixa amarela horizontal de 40 cm à meia altura, nas laterais e traseira, com
   o dístico **ESCOLAR** em preto (cores invertidas se a carroçaria for amarela);
4. **registrador instantâneo inalterável de velocidade e tempo**;
5. lanternas de luz branca/fosca/amarela nas extremidades superiores dianteiras,
   e vermelhas na traseira;
6. **cintos de segurança em número igual à lotação**;
7. outros requisitos que o CONTRAN estabelecer.

**Art. 137** — a autorização fica afixada por dentro, em local visível, com a
lotação inscrita, e **é vedado conduzir escolares acima da capacidade do
fabricante**.

**Art. 138 — o condutor precisa:**

1. ter mais de 21 anos;
2. ser habilitado na **categoria D**;
3. (vetado);
4. **não ter cometido mais de uma infração gravíssima nos últimos 12 meses**
   (redação da Lei 14.071/2020);
5. ser aprovado em **curso especializado** nos termos do CONTRAN.

**Art. 139** — nada disso exclui a competência do **município** de impor as
exigências dos regulamentos dele.

Outros artigos que nos alcançam: art. 145 (habilitação D/E para transporte de
escolares), art. 200 (ultrapassar pela direita veículo de escolares parado) e
art. 231, XX (conduzir sem portar a autorização do art. 136).

### Onde encaixa no produto

| Exigência                                        | Onde está hoje                                                              | O que falta                                                                     |
| ------------------------------------------------ | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Autorização do DETRAN (136 _caput_, 137, 231 XX) | cai em `VehicleDocumentType.OUTRO`                                          | tipo próprio, com vencimento e número                                           |
| Inspeção semestral (136 II)                      | `VehicleDocumentType.VISTORIA` com vencimento, e `VENCIMENTO_*` na agenda   | alerta específico de "semestral", que é prazo mais curto que o de licenciamento |
| Equipamentos (136 III a VII)                     | nada                                                                        | checklist no cadastro do veículo, com data da conferência                       |
| Lotação (137)                                    | `capacidadePassageiros`, validado só ao atribuir veículo                    | **validar também em `addStudent`**                                              |
| Idade, CNH D, curso (138)                        | `DriverDocumentType.CNH` com `categoria`, `EAR`, `CURSO_TRANSPORTE_ESCOLAR` | conferir que a categoria é D ou E, e a idade                                    |
| Infrações gravíssimas (138 IV)                   | nada                                                                        | não há fonte: depende de consulta ao DETRAN, que a Rotta não tem                |
| Regra municipal (139)                            | nada                                                                        | é por município, e o acervo cobre 13 do RJ                                      |

---

## Segmento 2. Criança e adolescente

| Norma                                                             | Caminho no acervo                                      |
| ----------------------------------------------------------------- | ------------------------------------------------------ |
| Constituição Federal, art. 227 (prioridade absoluta)              | `constituicao.md`                                      |
| Lei 8.069/1990, ECA                                               | `federal/leis-ordinarias/1990/lei-8069-1990-07-13.md`  |
| Lei 13.431/2017, escuta protegida de criança vítima ou testemunha | `federal/leis-ordinarias/2017/lei-13431-2017-04-04.md` |

**Onde encaixa.** O transportador fica com a criança sob guarda durante a
viagem, e o ECA é o que dá peso a isso. No produto, toca em três lugares que já
existem: a entrega só ao responsável autorizado (embarque e desembarque), o
registro de ocorrência, e o chat Responsável↔Motorista.

A **Lei 13.431/2017** é a que ninguém espera e que mais exige cuidado: ela cria o
sistema de garantia de direitos da criança vítima ou testemunha de violência, com
regras sobre **como** o relato é colhido para não revitimizar. Se o fluxo de
ocorrência da Rotta vier a receber relato de violência contra aluno, a forma de
registrar, quem vê e para onde encaminha deixam de ser decisão de produto.

---

## Segmento 3. Educação e o direito ao transporte

| Norma                                                                        | Caminho no acervo                                      |
| ---------------------------------------------------------------------------- | ------------------------------------------------------ |
| CF, art. 208, VII (dever do Estado: transporte para o aluno da rede pública) | `constituicao.md`                                      |
| Lei 9.394/1996, LDB (art. 4º, VIII)                                          | `federal/leis-ordinarias/1996/lei-9394-1996-12-20.md`  |
| Lei 10.880/2004, PNATE                                                       | `federal/leis-ordinarias/2004/lei-10880-2004-06-09.md` |
| Lei 13.005/2014, Plano Nacional de Educação                                  | `federal/leis-ordinarias/2014/lei-13005-2014-06-25.md` |

**Onde encaixa.** Não no produto de hoje, e sim no mercado de amanhã: é a base do
transporte escolar **público**, pago pelo município com dinheiro do PNATE. É o que
transforma "prefeitura" em cliente, e por isso puxa o segmento 11.

---

## Segmento 4. Acessibilidade

| Norma                                               | Caminho no acervo                                      |
| --------------------------------------------------- | ------------------------------------------------------ |
| Lei 13.146/2015, Estatuto da Pessoa com Deficiência | `federal/leis-ordinarias/2015/lei-13146-2015-07-06.md` |

**Onde encaixa.** Em dois lugares distintos, e o segundo é esquecido com
frequência:

1. **No transporte**: aluno com deficiência tem direito a transporte acessível, e
   isso muda requisito de veículo e de treinamento.
2. **No aplicativo**: a lei alcança acessibilidade digital. A auditoria de
   acessibilidade que já rodou nas telas refeitas (tarefa 18) não é capricho de
   design — tem norma atrás.

---

## Segmento 5. Dados pessoais

| Norma                                    | Caminho no acervo                                      |
| ---------------------------------------- | ------------------------------------------------------ |
| Lei 13.709/2018, LGPD                    | `federal/leis-ordinarias/2018/lei-13709-2018-08-14.md` |
| Lei 12.965/2014, Marco Civil da Internet | `federal/leis-ordinarias/2014/lei-12965-2014-04-23.md` |

**O artigo que define o produto é o art. 14 da LGPD**, lido na íntegra hoje:

> **Art. 14.** O tratamento de dados pessoais de crianças e de adolescentes
> deverá ser realizado em seu melhor interesse [...]
> **§ 1º** O tratamento de dados pessoais de crianças deverá ser realizado com o
> **consentimento específico e em destaque dado por pelo menos um dos pais ou
> pelo responsável legal**.

A Rotta trata, de criança: nome, escola, endereço de embarque, foto, **e posição
geográfica ao vivo**. Isso é o núcleo duro da lei.

**Onde encaixa.** No `ConsentRecord` e nos `ConsentType` que já existem, na
política de privacidade, e no fluxo de exclusão de conta (`account-deletion`, que
já é um módulo). O Marco Civil entra na guarda de registro de acesso e na
responsabilidade da plataforma.

**O que conferir com advogado:** se o consentimento que a Rotta coleta hoje é
"específico e em destaque" para o dado da criança, e não um aceite genérico de
termos.

---

## Segmento 6. Consumidor

| Norma               | Caminho no acervo                                     |
| ------------------- | ----------------------------------------------------- |
| Lei 8.078/1990, CDC | `federal/leis-ordinarias/1990/lei-8078-1990-09-11.md` |

**Onde encaixa.** A família é consumidora do serviço de transporte. E a Rotta,
como plataforma que aproxima as duas pontas e processa o pagamento, tem exposição
própria — a jurisprudência sobre plataforma digital não a trata como mera
espectadora. Toca em: o contrato que o produto gera, a informação clara de preço
e reajuste, o cancelamento, e a cobrança (o CDC tem regra sobre cobrança
vexatória).

---

## Segmento 7. Contrato e responsabilidade civil

| Norma                         | Caminho no acervo                                      |
| ----------------------------- | ------------------------------------------------------ |
| Lei 10.406/2002, Código Civil | `federal/leis-ordinarias/2002/lei-10406-2002-01-10.md` |

**Onde encaixa.** No `Contract` e no `TermoCienciaPdfService`. O Código Civil tem
capítulo próprio de **contrato de transporte**, com responsabilidade objetiva do
transportador pelo passageiro — e é por isso que o termo de ciência da Rotta é
rotulado "Termo de Ciência" e não "Contrato": são coisas juridicamente
diferentes, e o código já faz essa distinção de propósito.

---

## Segmento 8. Dinheiro: pagamento, split e custódia

| Norma                                                       | Caminho no acervo                                      |
| ----------------------------------------------------------- | ------------------------------------------------------ |
| Lei 12.865/2013 (define arranjo e instituição de pagamento) | `federal/leis-ordinarias/2013/lei-12865-2013-10-09.md` |

**Cuidado com esta.** A ementa dela fala de subvenção a produtores de cana-de-açúcar
— é lei omnibus. Mas é nela que está a definição de **arranjo de pagamento**
(art. 6º, I) e de **instituidor de arranjo** (art. 6º, II), que é o vocabulário
que o Banco Central usa para decidir quem precisa de autorização.

**Onde encaixa, e por que importa agora.** A Rotta hoje opera no modelo em que a
cobrança é emitida pela conta da própria Rotta e o dinheiro da família cai nela
antes de ir para a transportadora (o Rotta Pay). Isso é guardar dinheiro de
terceiro. Foi exatamente o motivo de a arquitetura de subconta com split ter sido
escolhida: com split, o valor vai direto para a conta da transportadora e a Rotta
não custodia nada.

A pergunta para o advogado, com o texto da lei na mão: **em qual dos dois modelos
a Rotta é apenas usuária de um arranjo de pagamento de terceiro (o Asaas), e em
qual ela começa a se parecer com instituidora.** O §3º do mesmo artigo traz uma
exclusão para instrumento destinado a adquirir bens e serviços ofertados pela
própria empresa, que vale ler no caso concreto.

---

## Segmento 9. Trabalho: motorista e monitor

| Norma                                                          | Caminho no acervo                                      |
| -------------------------------------------------------------- | ------------------------------------------------------ |
| Decreto-Lei 5.452/1943, CLT                                    | `federal/decretos-lei/1943/del-5452-1943-05-01.md`     |
| Lei 13.103/2015, profissão de motorista                        | `federal/leis-ordinarias/2015/lei-13103-2015-03-02.md` |
| Lei 12.619/2012 (antecessora, largamente alterada pela 13.103) | `federal/leis-ordinarias/2012/lei-12619-2012-04-30.md` |
| Lei 14.599/2023 (toxicológico periódico)                       | `federal/leis-ordinarias/2023/lei-14599-2023-06-19.md` |

**Onde encaixa.** Jornada, intervalo e descanso do motorista têm regra própria, e a
Rotta **registra início e fim de viagem com hora** — ou seja, gera prova de
jornada sem querer. Isso é oportunidade (relatório para a transportadora) e risco
(o dado existe e pode ser requisitado).

O exame toxicológico vale conferir caso a caso: a Lei 14.599/2023 postergou a
exigência periódica, então a resposta de hoje não é a de 2023.

---

## Segmento 10. Tributário e societário

| Norma                               | Caminho no acervo                                        |
| ----------------------------------- | -------------------------------------------------------- |
| LC 123/2006, Simples Nacional e MEI | `federal/leis-complementares/2006/lcp-123-2006-12-14.md` |
| LC 116/2003, ISS                    | `federal/leis-complementares/2003/lcp-116-2003-07-31.md` |

**Onde encaixa.** O `CompanyType` da Rotta já tem `AUTONOMO`, `MEI`, `LTDA`, `SA`,
`COOPERATIVA`, `SOCIEDADE_SIMPLES` — e o enquadramento muda o que a
transportadora pode faturar e emitir. O ISS é **municipal**, com a lista de
serviços da LC 116: transporte municipal de passageiros está nela, e a alíquota
varia por cidade. Isso entra no dia em que a Rotta emitir nota pela
transportadora.

---

## Segmento 11. Vender para prefeitura

| Norma                                                    | Caminho no acervo                                      |
| -------------------------------------------------------- | ------------------------------------------------------ |
| Lei 14.133/2021, Licitações e Contratos                  | `federal/leis-ordinarias/2021/lei-14133-2021-04-01.md` |
| Lei 12.846/2013, Anticorrupção                           | `federal/leis-ordinarias/2013/lei-12846-2013-08-01.md` |
| ~~Lei 8.666/1993~~ — **o acervo marca `revogada: true`** | `federal/leis-ordinarias/1993/lei-8666-1993-06-21.md`  |

**Onde encaixa.** O site da Rotta já tem fluxo de contato para governo
("Secretário de Educação" no formulário). No instante em que isso virar contrato,
a 14.133 passa a reger a contratação e a 12.846 passa a responsabilizar a Rotta
**objetivamente** por ato de quem agir em nome dela perante a administração.

A 8.666 aparece aqui só como aviso: ela é a lei que todo mundo ainda cita de
cabeça, e está revogada. Foi a conferência de `revogada` que pegou isso — é o
motivo de a skill exigir esse campo.

---

## Segmento 12. Propriedade intelectual

| Norma                             | Caminho no acervo                                     |
| --------------------------------- | ----------------------------------------------------- |
| Lei 9.610/1998, direitos autorais | `federal/leis-ordinarias/1998/lei-9610-1998-02-19.md` |

Periférico, mas é a base da licença do software e do uso de conteúdo de terceiro
(fonte, ícone, imagem) no produto.

---

## O que falta no acervo, e não se resolve lendo

Duas lacunas medidas em 21/10/2026, e as duas pesam justo onde o transporte
escolar é regulado de verdade:

1. **CONTRAN: 6 arquivos** em `reguladores/contran/`. As resoluções de transporte
   escolar (requisitos do art. 136 VII, conteúdo do curso especializado do art.
   138 V) não estão lá. Fonte: portal do CONTRAN/Senatran.
2. **Municipais do RJ: 13 municípios**, e nenhum deles é Niterói, Rio, São
   Gonçalo ou Maricá. Pelo art. 139, é na lei municipal que vivem a autorização,
   a vistoria e o cadastro. Fonte: diário oficial ou site da prefeitura.

---

## O que dá para mostrar ao público, e como não criar passivo

O pedido era "em quais partes podem se encaixar e mostrar para o público". Há
coisa boa aqui, e há uma armadilha.

### A armadilha, primeiro

**Nunca exibir um selo que afirme "esta transportadora está em conformidade".**
A Rotta não inspeciona van, não consulta o prontuário do motorista no DETRAN e
não fiscaliza nada. Um selo desses transfere para a Rotta uma garantia que ela
não tem meio de dar — e, no dia de um acidente, é a primeira coisa que a família
vai apontar.

O que dá para afirmar com segurança é **documental e datado**:

> "CNH categoria D, válida até 03/2028. Curso de transporte escolar, válido até
> 08/2027. Vistoria semestral, válida até 12/2026. Documentos enviados pela
> transportadora e conferidos pela Rotta em 14/10/2026."

Isso é verdade verificável, diz quem conferiu o quê e quando, e não promete
conformidade — promete documento em dia, que é o que de fato se sabe.

### Para a família, no app

| O que mostrar                                                   | Base                                |
| --------------------------------------------------------------- | ----------------------------------- |
| Vencimento da vistoria do veículo e da autorização de escolar   | CTB 136 II, 136 _caput_             |
| Categoria da CNH do motorista e validade do curso especializado | CTB 138 II e V                      |
| Antecedentes criminais entregues (sim/não, com data)            | exigência comum de edital municipal |
| Lotação autorizada da van e quantos alunos na rota              | CTB 137                             |
| Aviso de que a posição ao vivo só aparece em viagem em curso    | LGPD, minimização                   |

As quatro primeiras linhas são exatamente o que uma mãe pergunta e não tem como
checar hoje. **É a melhor peça de confiança que a Rotta pode mostrar, e já está
quase toda no banco.**

### Para a transportadora, no painel

Um painel de pendências que fale a língua da lei: "faixa amarela com dístico
ESCOLAR não registrada (CTB art. 136, III)", "vistoria vence em 18 dias (art. 136,
II)", "esta rota tem 23 alunos e a van autoriza 20 (art. 137)". Isso vira
retenção: a transportadora fica porque a Rotta evita que ela tome multa.

### No site, página pública

Uma página "Como a Rotta trata a lei" citando as normas deste mapa com link para
a fonte oficial, mais a política de privacidade explicitando o art. 14 da LGPD e
o consentimento do responsável. Para venda a prefeitura isso deixa de ser
marketing e passa a ser requisito de habilitação.

### Ordem que eu recomendo

1. **Fechar a lotação em `addStudent`** (art. 137). É defeito, é pequeno, e é o
   único item desta lista que hoje deixa a plataforma ajudar a descumprir a lei.
2. **Tipo de documento para a autorização de escolar**, com vencimento.
3. **Checklist dos equipamentos do art. 136** no cadastro do veículo.
4. **Mostrar à família** os vencimentos que já existem no banco, com a redação
   documental acima.
5. **Painel de pendências com citação do artigo** para a transportadora.
6. **Página pública** e revisão da política de privacidade.

Os itens 1 a 3 são meus e não dependem de ninguém. O 4 e o 5 dependem de você
decidir o quanto expor. O 6 pede advogado antes de publicar.

---

_21/10/2026. CTO. Normas localizadas e cabeçalhos conferidos no acervo
`ctresb/leis` (commit `15eb09b`) em 21/10/2026. Achados de código verificados em
`routes.service.ts`, `schema.prisma` e `vehicles.service.ts` na mesma data._
