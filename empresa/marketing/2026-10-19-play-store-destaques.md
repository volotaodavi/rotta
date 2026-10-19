# Destaques da ficha da Play Store

**Pedido do fundador em 19/10/2026.** CMO.

A primeira versão deste documento entregava só a metade de fora: a
moldura do aparelho, a chamada e o banner, com uma área listrada vazia
esperando um print. O fundador olhou e disse que estava genérico, e que
"se vc fez o app, vc terá os designs para o app".

Ele estava certo, e a correção não foi cosmética. **As nove peças estão
prontas, com as telas montadas.** Cada tela dentro da moldura é
reconstruída a partir do próprio código do app: a paleta amostrada do
conceito, a geometria exata de cada componente de `@rotta/ui/native`, a
fonte Plus Jakarta Sans lida do `node_modules`, os ícones Lucide lidos do
mesmo pacote que `@rotta/icons/native` reexporta, o basemap do
OpenStreetMap que o app mostra hoje e a rota traçada pelo mesmo OSRM que
a API usa. Nada foi desenhado "parecido".

Tudo sai de `scripts/play-store-assets.py`, e os PNGs estão em
`play-store/`.

---

## 1. O que a pesquisa diz, e o que aproveitamos

Pesquisa de 19/10/2026 em publicações de ASO (AppFollow, AppAgent,
yellowHEAD, ASOMobile, The App Launchpad). **São blogs de fornecedor, não
documentação oficial**, e divergem entre si em alguns números. O que é
consenso entre elas e entrou no nosso desenho:

| Regra                                     | O que diz                                       | Como aplicamos                                                                      |
| ----------------------------------------- | ----------------------------------------------- | ----------------------------------------------------------------------------------- |
| Os primeiros quadros carregam a conversão | aparecem sem ninguém tocar em nada              | os quadros 1, 2 e 3 fecham sentido juntos: onde está, quando chega, o que aconteceu |
| Chamada curta                             | as fontes vão de 4 a 7 palavras; usamos a menor | nenhuma chamada passa de 5 palavras                                                 |
| Fonte grande                              | cerca de 60pt ou mais num canvas de 1080        | usamos 86px de peso 800                                                             |
| Teste da miniatura                        | tem que dar para ler encolhido                  | conferido em 1/3 do tamanho                                                         |
| Um recado por quadro                      | nada de empilhar funcionalidade                 | um benefício por quadro, sem exceção                                                |
| Benefício, não funcionalidade             | "veja a van" em vez de "rastreamento GPS"       | toda chamada é escrita do lado de quem usa                                          |
| Consistência no conjunto                  | mesma fonte, mesma paleta, mesma moldura        | alternamos fundo escuro e claro, com a mesma moldura                                |
| Experimento de ficha                      | o Play Console testa variações com tráfego real | o quadro 1 é o primeiro a testar                                                    |

---

## 2. Os oito quadros

|   # | Chamada                          | Apoio                                              | Tela montada no quadro                     | Fundo  |
| --: | -------------------------------- | -------------------------------------------------- | ------------------------------------------ | ------ |
|   1 | **Veja a van ao vivo**           | Mapa em tempo real, do portão até a escola         | Responsável, `AcompanharViagemScreen`      | escuro |
|   2 | **Chega às 07:12**               | Previsão calculada pelo trânsito, não pelo relógio | Responsável, cartão Acompanhamento         | claro  |
|   3 | **Embarcou. Desembarcou.**       | Você recebe no mesmo instante                      | Responsável, `HistoricoEventosCard`        | escuro |
|   4 | **A mensalidade pelo app**       | Pix, comprovante e histórico no mesmo lugar        | Responsável, `PagamentosScreen`            | claro  |
|   5 | **O motorista só dirige**        | Lista do dia, rota traçada e um toque por aluno    | Motorista, `ModoOperacional` em tela cheia | escuro |
|   6 | **Checklist antes de sair**      | Fica salvo, viagem por viagem                      | Motorista, `ChecklistScreen`               | claro  |
|   7 | **A frota inteira na tela**      | Onde cada van está, agora                          | Empresa, `EmpresaFrotaMapaScreen`          | escuro |
|   8 | **Feito para quem leva criança** | Transporte escolar, do cadastro ao pagamento       | nenhuma, é o fecho de marca                | marca  |

### Por que esta ordem

Quem procura transporte escolar na loja é **a família**, não a
transportadora. Por isso os quatro primeiros quadros são todos do
Responsável, e os do Motorista e da Empresa vêm depois: eles existem para
a transportadora que chega pela indicação da escola, não para quem está
navegando.

O quadro 2 usa um horário, e não "previsão de chegada". Número lido na
miniatura vale mais que substantivo abstrato.

O quadro 4 entra agora porque a tela existe de verdade desde a 1.4.0. Se
a cobrança não estiver ligada no dia da publicação, **este quadro sai**,
e o 8 sobe. Mostrar tela que não funciona é o caminho mais rápido para
avaliação de uma estrela.

---

## 3. Como as telas foram montadas

Nenhum pixel foi escolhido no olho. A tabela abaixo diz de onde veio
cada coisa, e qualquer uma delas pode ser conferida abrindo o arquivo.

| O que             | De onde vem                                                                         |
| ----------------- | ----------------------------------------------------------------------------------- |
| Cores             | `apps/mobile/src/providers/paleta-do-conceito.ts` sobre `packages/theme`            |
| Medidas           | `packages/ui/src/native` (AppHeader, StatusPill, SummaryCards, InfoTile, Timeline…) |
| Espaçamento, raio | `theme.spacing` (4/8/12/16/24) e `theme.radius` (6/10/16/24)                        |
| Fonte             | Plus Jakarta Sans, lida do `node_modules`, uma família por peso                     |
| Ícones            | Lucide, lidos do mesmo pacote que `@rotta/icons/native` reexporta                   |
| Barra de abas     | `apps/mobile/src/navigation/estilo-da-navegacao.tsx` (altura 64, selo 42x32)        |
| Mapa              | tiles do OpenStreetMap, que é o que o app mostra sem chave da CARTO                 |
| Rota              | OSRM, o mesmo motor que a API usa em `GeoEngineService`                             |
| Logotipo          | `brand/`, nunca redesenhado                                                         |

A tela é montada em pontos lógicos (390 de largura, como um celular
comum reporta) e só depois ampliada para o quadro de 1080. É isso que
faz `padding: 16` no HTML significar os mesmos 16 do `theme.spacing[4]`
do app, e não um número escolhido para ficar bonito.

### O que isso não substitui

Estas peças são **reconstrução fiel, não captura de aparelho**. Elas
mostram o app como ele é desenhado, não como ele se comporta num
aparelho real com fonte do sistema ampliada, tela de outra proporção ou
Android antigo. Antes de publicar, vale instalar a 1.4.0 e conferir que
as telas batem; se divergirem, quem está errado é a peça.

### Dados das telas

Nomes inventados, endereços de via pública de Maricá/RJ (o foro da
empresa). **Nenhum dado de criança real, em nenhum quadro** — print de
loja com nome de criança é exposição de menor, e isso não muda porque a
tela é bonita.

---

## 3.1. O que a reconstrução encontrou no app

Montar a tela com os valores reais expõe o que um desenho "parecido"
esconde. Duas coisas apareceram, e as duas estão nos quadros **como o
app faz hoje**, sem maquiagem:

| Onde                            | O que acontece                                                                                                                             | Medida                                                                |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------- |
| Pagamentos, formas de pagamento | Com três blocos por linha, o rótulo não cabe: sai "QR Co…" e "Chave …"                                                                     | sobra 56 pt para um texto de 57,3 pt ("QR Code") e 60,9 ("Chave Pix") |
| Empresa, mapa da frota          | O turno aparece cru, do banco: "(MANHA)", sem acento. O app já tem `TURNO_LABEL` em `driver/screens/inicio-screen.tsx`, mas a tela não usa | —                                                                     |

As duas são decisão de produto, não de marketing, e por isso não foram
tocadas aqui. Se forem corrigidas, os quadros 4 e 7 precisam ser gerados
de novo (`python3 scripts/play-store-assets.py play-store`) e a peça
publicada tem que sair de um build que já tenha a correção.

---

## 4. Texto da ficha

**Título (30 caracteres):**

> Rotta: transporte escolar

**Descrição curta (80 caracteres):**

> Acompanhe a van do seu filho ao vivo, com aviso de embarque e desembarque.

**Primeiro parágrafo da descrição longa:**

> A Rotta mostra onde a van está, avisa quando ela chega e registra cada
> embarque e desembarque. A família acompanha pelo mapa, o motorista
> opera a rota pelo app e a transportadora enxerga a frota inteira.

Nada de "taxa zero", nada de citar o provedor de pagamento, nada de
"garantimos o seu recebimento". As proibições de 14/10 valem também na
loja.

---

## 5. O que medir depois de publicar

O Play Console tem experimento de ficha com tráfego real, sem custo. A
ordem de teste, do que mais muda conversão para o que menos:

1. Quadro 1: "Veja a van ao vivo" contra "Chega às 07:12".
2. Fundo escuro contra claro no quadro 1.
3. Descrição curta: benefício contra categoria.

Um teste por vez, e só com volume suficiente para o resultado significar
alguma coisa. Hoje não temos esse volume, então isto é para depois da
primeira tração, não para a semana que vem.

---

_19/10/2026. CMO. Peças geradas por `scripts/play-store-assets.py`,
com as telas reconstruídas a partir do design system do próprio
repositório. Logotipo e cores de `brand/`. Mapa do OpenStreetMap e rota
do OSRM. Regras de ASO por pesquisa pública de 19/10/2026, declarada
como não oficial. Nomes e endereços das telas são de teste._
