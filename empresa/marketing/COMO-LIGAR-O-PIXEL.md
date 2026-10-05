# Onde e como colocar o Pixel do Meta

Escrito em 05/10/2026, a pedido do fundador: "preciso saber onde e como
colocar para ele mandar os dados certinhos para o gerenciador de anúncio
do Meta Ads".

O código já está no site. Falta só o número. Enquanto o número não
existir, nada carrega e nada quebra: o site fica exatamente como está
hoje.

## O que fazer, na ordem

**1. Pegar o número no Meta.** Gerenciador de Eventos (business.facebook.com),
Fontes de Dados, o seu Pixel. O identificador é um número de 15 ou 16
dígitos, no topo. Se ainda não existir Pixel, é ali mesmo que se cria um.

**2. Colar na Vercel.** Projeto do site (`rotta-web`), Settings,
Environment Variables. Nome da variável, exatamente assim:

```
NEXT_PUBLIC_META_PIXEL_ID
```

Valor: só o número, sem aspas e sem espaço. Marque os três ambientes
(Production, Preview, Development) se quiser medir também nas prévias.

**3. Redeploy.** Variável de ambiente só entra num build novo. Na
Vercel: Deployments, o último, Redeploy.

**4. Conferir.** Abra o site e, no Gerenciador de Eventos do Meta, a aba
"Testar eventos". Navegando pelo site você tem que ver `PageView`
aparecer em tempo real. Se aparecer, está ligado.

As outras duas variáveis seguem a mesma receita, quando você quiser:

| Variável                        | De onde vem                  | Cara do valor     |
| ------------------------------- | ---------------------------- | ----------------- |
| `NEXT_PUBLIC_META_PIXEL_ID`     | Meta, Gerenciador de Eventos | `123456789012345` |
| `NEXT_PUBLIC_GOOGLE_ADS_ID`     | Google Ads, tag de conversão | `AW-XXXXXXXXXX`   |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | Google Analytics 4           | `G-XXXXXXXXXX`    |

## O que o Meta vai receber

Estes eventos já estão disparando de momentos reais do produto. Nenhum
deles é gatilho inventado para encher relatório.

| Quando acontece de verdade                        | Vira, no Meta                        |
| ------------------------------------------------- | ------------------------------------ |
| Qualquer página pública ou de cadastro abre       | `PageView`                           |
| O Pix da assinatura é gerado em `/planos/assinar` | `InitiateCheckout`                   |
| O webhook do Asaas confirma o pagamento           | `Purchase`, **com o valor do plano** |
| Uma conta de responsável é criada                 | `Lead`                               |

O `Purchase` com valor é o que mais importa. Sem ele, o algoritmo do
Meta só sabe quem clica, e passa a procurar mais gente que clica. Com
ele, passa a procurar gente parecida com quem pagou.

## O que o Meta nunca vai receber

Nome, e-mail, telefone, CPF, endereço, nome de aluno, posição de
veículo. Nenhum evento carrega dado pessoal, e o rastreamento nem existe
dentro do painel autenticado, onde a família acompanha a viagem do
filho. Isso não é preferência de implementação: é o que a LGPD e os
próprios documentos legais da Rotta exigem.

O único evento que leva número é a assinatura paga, e o número é o preço
do plano, que já está público na página de planos.

## Para o CMO mexer na campanha sozinho

Hoje ele não consegue, e é honesto dizer por quê: alterar campanha,
público ou orçamento exige a **Marketing API** do Meta, que pede um
token de Usuário do Sistema criado no Business Manager, com permissão
`ads_management`, e um aplicativo aprovado pela Meta para esse uso.

Isso é decisão sua, não dele, e o caminho seria:

1. Business Manager, Configurações do Negócio, Usuários do Sistema,
   criar um com acesso à conta de anúncio.
2. Gerar um token desse usuário com `ads_management` e `ads_read`.
3. Guardar o token como segredo do ambiente (nunca no repositório, e
   nunca no chat), com um nome como `META_ADS_ACCESS_TOKEN`.

Com o token no ambiente, o CMO passa a ler o desempenho das campanhas e,
se você autorizar escrita, a ajustar público e orçamento. Enquanto isso
não existir, o trabalho dele continua sendo o de agora: deixar a
medição certa, ler o funil que a própria plataforma mede, e escrever o
que precisa ser mudado no gerenciador para você aplicar.
