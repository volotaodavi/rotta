# O Pixel do Meta: o que já está ligado e o que falta

Escrito em 05/10/2026, a pedido do fundador: "preciso saber onde e como
colocar para ele mandar os dados certinhos para o gerenciador de anúncio
do Meta Ads".

**Estado: ligado.** O fundador mandou o código do Pixel em 05/10/2026 e
o número `2122632155047063` está no código, em
`apps/web/src/lib/site-config.ts`. Não há nada para colar em painel
nenhum: a medição sobe junto com o deploy.

O número ficou no código, e não em variável de ambiente, porque um ID de
Pixel não é segredo (aparece no HTML de qualquer site que o usa) e não
muda de ambiente. A variável `NEXT_PUBLIC_META_PIXEL_ID` continua
existindo e continua vencendo sobre o padrão, para o dia em que houver
uma segunda conta de anúncio.

## As duas condições para medir

A medição só acontece quando as duas são verdadeiras ao mesmo tempo:

1. **A pessoa aceitou o aviso de cookies.** Antes disso, nenhum script
   do Meta é baixado. É exigência da LGPD (art. 7º/8º) e é o que a
   Política de Cookies da Rotta promete por escrito em
   `/legal/cookies`. Travado por teste em
   `apps/web/src/features/marketing/__tests__/pixel-espera-consentimento.spec.tsx`.
2. **Não é máquina de desenvolvimento.** `localhost` e `127.0.0.1` não
   medem, para evento de teste não entrar no mesmo Gerenciador de
   Eventos da produção e ensinar o algoritmo a procurar o público
   errado.

## O verificador automático do Meta vai dizer que não achou o Pixel

E está certo. O "Verificar configuração" do Gerenciador de Eventos e o
Pixel Helper abrem a página e não clicam em "Aceitar" no aviso de
cookies, então o script não carrega para eles.

**Isto não é defeito e não deve ser "consertado".** O fundador decidiu
em 05/10/2026, com as três opções na mesa (manter o portão, usar o modo
de consentimento do Meta com consentimento revogado, ou carregar sempre):
**manter o portão**. A medição espera o aceite, e a validação é feita à
mão, do jeito abaixo.

Quem mexer aqui no futuro: trocar isso não é melhoria técnica, é mudança
de postura jurídica, e exige reescrever `/legal/cookies` e
`/legal/privacidade` no mesmo commit.

## Como conferir que está funcionando

1. Abra o site de produção e clique em **Aceitar** no aviso de cookies
   (sem isso o Pixel não carrega, de propósito).
2. No Gerenciador de Eventos do Meta, aba **Testar eventos**.
3. Navegue pelo site. `PageView` tem que aparecer em tempo real.

Se nada aparecer, a causa quase sempre é uma destas três: o aviso de
cookies não foi aceito naquele navegador, um bloqueador de anúncio está
ligado, ou o deploy ainda não terminou.

## O que ainda falta (e só o fundador pode fazer)

**Verificação do domínio.** O Gerenciador de Negócios do Meta
(Configurações do negócio, Segurança da marca, Domínios) exige verificar
a propriedade do domínio para liberar a configuração e a priorização de
eventos. O método de meta-tag já está pronto no código: basta colar o
código que o Meta gera na variável `FACEBOOK_DOMAIN_VERIFICATION` na
Vercel (Settings, Environment Variables) e fazer um redeploy. O valor
não é segredo.

**Google.** Nenhuma conta do Google Ads ou Analytics existe ainda. Essas
duas continuam em variável de ambiente, porque não há número para
embutir:

| Variável                        | De onde vem                  | Cara do valor   |
| ------------------------------- | ---------------------------- | --------------- |
| `NEXT_PUBLIC_GOOGLE_ADS_ID`     | Google Ads, tag de conversão | `AW-XXXXXXXXXX` |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | Google Analytics 4           | `G-XXXXXXXXXX`  |

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
