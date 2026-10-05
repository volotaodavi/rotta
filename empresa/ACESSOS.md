# Acessos: o que a diretoria de agentes pode tocar

Pedido do fundador em 05/10/2026: "quero deixar você no comando de
tudo".

Este arquivo é a resposta honesta a esse pedido, porque ele tem uma
mecânica que vale estar escrita: **não existe acesso total.** O que
existe é uma lista de chaves, cada uma abrindo uma porta. Quando se diz
que alguém "deixou o Claude resolver tudo", o que foi feito foi
exatamente isto, com mais linhas marcadas.

Enquanto uma linha estiver vazia, o agente responsável por ela trava e
tem que pedir para o fundador. Cada chave ligada tira uma pergunta da
mesa dele para sempre.

## Onde cada chave mora

| Lugar                             | Para quê                              | Como chegar                                           |
| --------------------------------- | ------------------------------------- | ----------------------------------------------------- |
| **Ambiente do Claude**            | o que os turnos agendados usam direto | menu do ambiente na barra de título da sessão, "Edit" |
| **Render** (serviço `rotta-vt7i`) | o que a API lê em execução            | serviço, aba "Environment"                            |
| **Vercel** (projeto do site)      | o que o site lê no navegador          | projeto, Settings, Environment Variables              |
| **GitHub, segredos de Actions**   | o que os workflows usam               | repositório, Settings, Secrets and variables, Actions |

Regra que não muda: **nenhum valor secreto passa pelo chat.** O que
atravessa a conversa fica no histórico, e histórico não é cofre. Valor
público (ID de Pixel, ID de conta de anúncio, código de verificação de
domínio) pode vir pelo chat e ser commitado, e a diferença está dita em
cada linha abaixo.

## O que destrava o quê

### Operação (o CTO, e o que trava deploy)

| Chave                   | Onde                        | Status     | O que passa a ser possível sem o fundador                                                                                                                                                                                                                                                     |
| ----------------------- | --------------------------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DIRETORIA_READ_SECRET` | Render + ambiente do Claude | **ligado** | Ver os erros que acontecem na mão do usuário, sem conta de admin.                                                                                                                                                                                                                             |
| `RENDER_API_KEY`        | ambiente do Claude          | vazio      | Ler o log de um deploy que falhou, ver a configuração do serviço, disparar deploy. **É a que falta hoje**: sem ela, todo diagnóstico de deploy vira pedido de print. Account Settings, API Keys, Create API Key. Grátis em qualquer plano.                                                    |
| `PRODUCAO_DATABASE_URL` | segredo do GitHub           | vazio      | Rodar a manutenção do banco pela aba Actions (`banco-manutencao.yml`): ver o estado das migrações, destravar uma falha, migrar. Sem isso, uma migração quebrada trava todo deploy e só um shell pago resolve. A string está em Render, serviço de Postgres, "Connect", External Database URL. |

### Campanha (o CMO, e o dinheiro de anúncio)

| Chave                                        | Onde      | Status     | O que passa a ser possível sem o fundador                                                                                                                                                                                                      |
| -------------------------------------------- | --------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Pixel `2122632155047063`                     | no código | **ligado** | Medir cadastro, checkout e compra no navegador. Não é segredo.                                                                                                                                                                                 |
| `META_CAPI_ACCESS_TOKEN`                     | Render    | vazio      | Mandar a assinatura paga de volta ao Meta no momento em que a Asaas confirma. Hoje a maioria das confirmações de Pix se perde, porque o navegador já fechou. Events Manager, conjunto de dados, Configurações, API de Conversões, Gerar token. |
| `FACEBOOK_DOMAIN_VERIFICATION`               | Vercel    | vazio      | Liberar a priorização de eventos do domínio. **Não é segredo**: pode vir pelo chat.                                                                                                                                                            |
| Token da API de Marketing (`ads_read`)       | Render    | vazio      | O CMO **ler** custo por cadastro, custo por assinatura e qual criativo puxa, e escrever a recomendação com número em vez de palpite.                                                                                                           |
| Token da API de Marketing (`ads_management`) | Render    | vazio      | O CMO **pausar anúncio e remanejar verba** sozinho. Recomendação: só depois de duas ou três semanas com conversão medida. Sem histórico, automação de verba é chute caro.                                                                      |
| ID da conta de anúncio (`act_...`)           | no código | vazio      | Saber em qual conta ler. **Não é segredo.**                                                                                                                                                                                                    |

### O que a chave do Render destrava (comprovado em 05/10/2026)

No dia em que ela foi ligada, o deploy estava travado havia horas em
P3009 e três tentativas de conserto pelo repositório tinham falhado,
porque faltava um fato que só o painel do Render tinha: **o serviço é
runtime Node, não Docker.** O `Dockerfile` do repositório é ignorado, e
a migração roda no Start Command configurado no painel.

Com a chave, isso virou: ler a configuração do serviço, descobrir o
runtime, ler as variáveis, achar o banco (Neon, não Supabase nem Render
Postgres), destravar a migração pelo endpoint HTTP do Neon, corrigir o
Start Command e disparar o deploy. Tudo sem o fundador clicar em nada.

Fica registrado porque é o argumento concreto a favor de ligar as
outras: o que trava um turno quase nunca é capacidade, é falta de um
fato que está atrás de uma chave.

### O que exige uma pessoa, e sempre vai exigir

Não é limitação de ferramenta, é de responsabilidade: estes atos têm uma
pessoa física respondendo por eles.

- Publicar na Play Store com a identidade do fundador.
- Mexer na conta bancária, e qualquer saque ou estorno na Asaas.
- Verificação de negócio no Meta (documento da empresa).
- Aceitar termo de serviço em nome da Rotta.

### O que nunca é aceito, mesmo com o fundador autorizando

Senha de conta e código de 2FA. Não é formalidade. Senha no chat vira
histórico permanente, e ela carrega a conta inteira, não a tarefa. Toda
chave desta página dá mais poder prático que uma senha para o trabalho
que precisa ser feito, e cada uma é revogável em um clique sem trocar
mais nada.

## O limite que nenhuma chave resolve

Um agente trabalha em turno: o container nasce, faz o trabalho e morre.
Não existe um Claude ligado o tempo todo olhando a plataforma. O que
existe é a escala em `CALENDARIO.md`, e o plantão de erro que acorda o
CTO fora do turno quando algo quebra na mão de um usuário.

As chaves acima decidem o que cada turno consegue fazer **sozinho**
quando acorda. É esse o sentido real de "deixar no comando".
