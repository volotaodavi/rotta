# Reels de lançamento da Rotta

**Pedido do fundador em 20/10/2026.** CMO.

Um Reels para a grade do Instagram (`@rottabr.com.br`) dizendo que a
Rotta já já é lançada, com o que ela oferece a cada público e como se
cadastrar, fechando no slogan. A peça sai de `scripts/reels-rotta.py` e
usa as telas reais do aplicativo, as mesmas reconstruídas para a ficha
da Play Store.

---

## 1. O slogan, e de onde ele saiu

Não existe um arquivo declarando "o slogan da Rotta". O que existe é
uma linha na landing page, logo abaixo da chamada principal, em
`apps/web/src/app/(marketing)/page.tsx`:

> **Tecnologia para conectar. Segurança para tranquilizar.**

É ela que fecha o vídeo. Duas outras linhas da mesma página entram como
apoio, porque já são texto aprovado da marca:

| Linha                                      | Onde vive hoje                    |
| ------------------------------------------ | --------------------------------- |
| "Uma nova rota para o transporte escolar." | chamada principal da landing page |
| "Tudo começa com uma rota."                | título da seção de fluxo          |

Se o fundador quiser outro slogan, ele troca em um lugar só
(`SLOGAN` no script) e a peça sai de novo.

---

## 2. Ganchos: o que a pesquisa sustenta, e o que não

Pesquisa de 20/10/2026, autorizada pelo fundador. **São blogs de
agência e de ferramenta, não documentação da Meta.** Eles divergem entre
si e vários vendem pacotes de ganchos, o que enviesa a recomendação.
Nenhum número abaixo é tratado como fato.

| O que dizem                                            | Consenso? | Como usamos                                           |
| ------------------------------------------------------ | --------- | ----------------------------------------------------- |
| O gancho vive nos primeiros 1 a 3 segundos             | sim       | a pergunta aparece no primeiro quadro, sem introdução |
| Retenção pesa mais que curtida no ranqueamento         | sim       | o vídeo tem 33s, não 60: menos tempo para abandonar   |
| Entrar direto na ação, sem vinheta de marca            | sim       | a marca só aparece no fim                             |
| Pergunta provocativa ativa curiosidade e identificação | sim       | "Cadê a van?"                                         |
| Percentuais por tipo de gancho (72% a 84% de retenção) | **não**   | ignorado: agregado de criadores, sem metodologia      |
| Queda de 22% na taxa de swipe entre 2024 e 2026        | **não**   | atribuído a um comunicado da Meta que não encontramos |

### Os quatro ganchos que entraram, e por quê

1. **Pergunta na língua de quem assiste.** "Cadê a van?" é a frase que o
   responsável já diz, não a que a gente inventou. Quem viveu a espera
   no portão reconhece em menos de um segundo.
2. **Tensão e alívio, nessa ordem.** A pergunta abre uma lacuna; a tela
   do mapa fecha. É o mesmo movimento em três segundos.
3. **Prova em vez de adjetivo.** Nenhuma tela do vídeo é ilustração: é o
   aplicativo. O horário "07:12" aparece porque a tela calcula, não
   porque fica bonito.
4. **Pertencimento por nome.** Cada público ouve o próprio nome na tela
   ("Para quem leva", "Para quem acompanha"). Quem não é daquele bloco
   espera o seu em vez de sair.

### O que ficou de fora de propósito

Contagem regressiva, "últimas vagas", "só hoje" e contador de pessoas.
Escassez inventada numa categoria que lida com criança é o tipo de
recurso que ganha o primeiro vídeo e queima a marca no terceiro.

---

## 3. O roteiro, quadro a quadro

33 segundos, 9:16, 1080x1920, 30 fps. Sem locução: o Reels é assistido
sem som na grade, e legenda queimada não depende de o espectador tocar
no alto-falante.

|       Tempo | Cena                | O que aparece                                         | O que está escrito                                                            |
| ----------: | ------------------- | ----------------------------------------------------- | ----------------------------------------------------------------------------- |
|   0,0 a 3,0 | Gancho              | fundo azul-marinho, sem marca                         | **Cadê a van?**                                                               |
|   3,0 a 8,0 | A resposta          | tela de acompanhamento, van andando no mapa de Maricá | **Agora dá para ver.** / Transporte escolar acompanhado do embarque à entrega |
|  8,0 a 13,5 | Para quem acompanha | linha do tempo de embarque e desembarque              | **Embarcou. Desembarcou.** / Localização da viagem · Notificações · Histórico |
| 13,5 a 19,0 | Para quem leva      | modo operacional e carteira                           | **Rota, alunos e o caixa no mesmo app.** / MEI e autônomo também              |
| 19,0 a 23,5 | Motorista e monitor | modo operacional, lista do dia                        | **Mais clareza em cada viagem.** / Rota e mapa à mão · Lista de alunos        |
| 23,5 a 28,5 | Como entrar         | três passos                                           | **Começar leva um minuto.** / 1º mês grátis, sem cartão de crédito            |
| 28,5 a 33,0 | Marca               | símbolo da Rotta                                      | **Tecnologia para conectar.** / **Segurança para tranquilizar.**              |

A linha da rota atravessa o rodapé do vídeo inteiro e avança com o
tempo, igual à das peças da Play Store: é a mesma ideia, a Rotta é rota,
e dá ao espectador uma barra de progresso que diz quanto falta. Saber
quanto falta é o que segura quem já pensou em deslizar.

### Os textos dos blocos são da própria landing page

| Bloco                        | Origem                                                         |
| ---------------------------- | -------------------------------------------------------------- |
| "Localização da viagem" etc. | `PUBLICOS[para-responsaveis].recursos`                         |
| "Gestão de rotas e viagens"  | `PUBLICOS[para-transportadores].recursos`                      |
| "Rota e mapa sempre à mão"   | `PUBLICOS[para-motoristas].recursos`                           |
| "1º mês grátis, sem cartão"  | hero da landing page, lastreado em `TRIAL_DURATION_MONTHS = 1` |

Nenhuma frase foi inventada para o vídeo.

---

## 4. Conferência contra as quatro proibições de 14/10

| Proibição                       | O vídeo cumpre?                                                                         |
| ------------------------------- | --------------------------------------------------------------------------------------- |
| "Taxa zero"                     | **sim.** Nenhuma taxa é citada                                                          |
| O número do take rate na peça   | **sim.** Nenhum percentual aparece                                                      |
| O nome do provedor de pagamento | **sim.** Não aparece                                                                    |
| "Garantimos o seu recebimento"  | **sim.** A carteira aparece mostrando saldo e movimentação, sem promessa de recebimento |

Mais três regras da casa, conferidas: nenhum travessão em texto visível,
nenhum dado de criança real (os nomes são de teste, os endereços são de
via pública de Maricá) e nenhuma tela que o aplicativo não tenha.

---

## 5. O que o vídeo NÃO pode dizer até a publicação

A ficha da Play Store ainda não está no ar. Então:

- **não** diz "baixe agora" nem mostra botão de loja;
- diz "chega à Play Store" e manda para `rottabr.com.br`, onde o
  cadastro já funciona hoje;
- o bloco de cobrança da família **não** aparece, porque a tela existe
  mas a cobrança não está ligada. Prometer pagamento no app antes de
  ligar é o caminho mais curto para o primeiro comentário ruim.

Quando a ficha subir, trocar a última linha do roteiro e gerar de novo.

---

## 6. Legenda e primeiros comentários

**Legenda:**

> Cadê a van? Agora dá para ver.
>
> A Rotta conecta responsáveis, motoristas, monitores e transportadores
> numa plataforma só, com o transporte visível no mapa do embarque à
> entrega.
>
> Para quem leva: rotas, alunos, frota e documentos organizados.
> Para quem acompanha: localização da viagem e aviso a cada embarque e
> desembarque.
>
> Cadastro aberto em rottabr.com.br. 1º mês grátis, sem cartão de
> crédito.
>
> Tecnologia para conectar. Segurança para tranquilizar.

**Primeiro comentário fixado** (o link clicável, porque a legenda não
tem link): `rottabr.com.br`

Sem enxurrada de hashtag. Três bastam, e específicas:
`#transporteescolar #vanescolar #maricá`

---

## 7. Como gerar de novo

```
python3 scripts/reels-rotta.py
```

Sai em `marketing/reels/rotta-lancamento.mp4`, 1080x1920, H.264, 30 fps.
As telas vêm das mesmas funções que desenham as peças da Play Store, em
`scripts/play-store-assets.py`, então mudar o aplicativo e gerar de novo
mantém o vídeo fiel sem ninguém redesenhar nada.

---

_20/10/2026. CMO. Slogan e textos de público vindos da landing page.
Ganchos por pesquisa pública de 20/10/2026, declarada como não oficial.
Oferta do primeiro mês lastreada em `TRIAL_DURATION_MONTHS`. Números de
retenção de blogs de agência descartados por falta de metodologia._
