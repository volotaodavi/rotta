# Destaques da ficha da Play Store

**Pedido do fundador em 19/10/2026.** CMO.

A ficha precisa de imagem do aplicativo **de verdade**, e o print só sai
de um aparelho rodando o APK. Este documento entrega a outra metade, que
é onde a conversão acontece: a ordem dos quadros, a chamada de cada um,
a moldura e o banner. As peças são geradas por
`scripts/play-store-assets.py`, com o logotipo e as cores de `brand/`.

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

|   # | Chamada                          | Apoio                                              | Print que precisa ser tirado                          | Fundo  |
| --: | -------------------------------- | -------------------------------------------------- | ----------------------------------------------------- | ------ |
|   1 | **Veja a van ao vivo**           | Mapa em tempo real, do portão até a escola         | Responsável, acompanhamento com o mapa e a van na rua | escuro |
|   2 | **Chega às 07:12**               | Previsão calculada pelo trânsito, não pelo relógio | Responsável, cartão de chegada prevista               | claro  |
|   3 | **Embarcou. Desembarcou.**       | Você recebe no mesmo instante                      | Responsável, linha do tempo do dia                    | escuro |
|   4 | **A mensalidade pelo app**       | Pix, comprovante e histórico no mesmo lugar        | Responsável, tela de Pagamentos                       | claro  |
|   5 | **O motorista só dirige**        | Lista do dia, rota traçada e um toque por aluno    | Motorista, modo operacional                           | escuro |
|   6 | **Checklist antes de sair**      | Fica salvo, viagem por viagem                      | Motorista, checklist do veículo                       | claro  |
|   7 | **A frota inteira na tela**      | Onde cada van está, agora                          | Empresa, mapa da frota                                | escuro |
|   8 | **Feito para quem leva criança** | Transporte escolar, do cadastro ao pagamento       | nenhum, é o fecho de marca                            | marca  |

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

## 3. O que ainda depende de print real

| Peça                             | Situação                                                  |
| -------------------------------- | --------------------------------------------------------- |
| `feature-graphic.png` (1024x500) | **pronta.** Não leva print                                |
| `frame-8.png`                    | **pronto.** Fecho de marca, não leva print                |
| `frame-1` a `frame-7`            | moldura, fundo e chamada prontos. **Falta colar o print** |

### Como tirar os prints

1. Instalar o APK da 1.4.0 (`android-preview-run55`) num aparelho ou
   emulador com tela de proporção 9:16.
2. Entrar com uma conta de cada papel e chegar na tela da coluna "print"
   da tabela acima.
3. Capturar em 1080x1920. **Sem dado real de família**: usar conta de
   teste, nome fictício e endereço de teste. Print de loja com nome de
   criança real é exposição de menor.
4. Colar dentro da área reservada de cada quadro. O HTML intermediário
   fica ao lado do PNG quando o script roda com a pasta de saída aberta.

### O que não pode aparecer no print

Nome e foto de criança real, endereço residencial legível, telefone, CPF,
placa real de veículo, e qualquer valor de mensalidade que não seja de
teste.

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

_19/10/2026. CMO. Peças geradas por `scripts/play-store-assets.py`.
Logotipo e cores de `brand/`. Regras de ASO por pesquisa pública de
19/10/2026, declarada como não oficial._
