# Dossiê 45 — Rotta Legal, Trust & Community Center

> Escopo: dois prompts concatenados — "ROTTA LEGAL, TRUST & COMMUNITY
> CENTER" (construção de uma central pública de documentação/
> transparência/segurança/privacidade/regras da comunidade) e seu
> "PROMPT DE COMPLEMENTAÇÃO" (correção obrigatória: **CATEGORIA B ≠
> TRANSPORTE ESCOLAR**, refletida em todo o produto, não só em texto).
> Mesma disciplina de toda a série: auditar antes de mexer, nunca
> inventar dado que a empresa não divulgou, e ser honesto sobre o que
> ainda não existe em vez de fingir que existe.

## 1. Auditoria — o que já existia antes desta entrega

Diferente da premissa do segundo prompt ("primeiro analise o que já foi
implementado a partir do prompt anterior"), **nenhum Legal Center
existia ainda** nesta base de código — os dois prompts chegaram juntos,
na mesma mensagem. A auditoria real (evidência de código, não
suposição) encontrou:

| Item                                                  | Estado real encontrado                                                                                                                                                                                                                                  |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/termos`, `/privacidade`                             | **Já existiam, com conteúdo real e substancial** (12 e 10 seções), já com o aviso "rascunho pendente de revisão jurídica" — exatamente o padrão que os prompts pedem                                                                                    |
| Rodapé                                                | Inline em `(marketing)/layout.tsx`, só na Landing Page/Site — ausente em `(auth)`, `(dashboard)` (web) e em todo o `apps/admin`; **sem link nenhum para Termos/Privacidade**                                                                            |
| Sidebar/Breadcrumbs                                   | Não existia nenhum componente desses em `packages/ui` — teriam que ser construídos do zero                                                                                                                                                              |
| Categoria de CNH no schema                            | `DriverDocument.categoria` (string livre, só quando `tipo = CNH`), já separado de `EAR`/`CURSO_TRANSPORTE_ESCOLAR`/`ANTECEDENTES_CRIMINAIS` como tipos de documento distintos                                                                           |
| Motor de elegibilidade "apto para transporte escolar" | **Não existe** — nenhuma lógica no `DriversModule` deriva um status único de elegibilidade a partir dos documentos                                                                                                                                      |
| Marketplace — busca/cards de motorista no web         | **Não existe ainda** — só `solicitacoes`/`contratos` existem sob `(dashboard)/marketplace`; nenhum componente renderiza "Transporte Escolar" com base em categoria de CNH                                                                               |
| RottaPay × AbacatePay × Lytex                         | Já corretamente distintos no código e nos comentários (Dossiês 26/43/44) — nenhuma confusão a corrigir, só documentar publicamente                                                                                                                      |
| Cookies/analytics                                     | Nenhum script de tracking/analytics encontrado; sessão web usa `localStorage` + token em memória, nunca cookie                                                                                                                                          |
| Dados reais da empresa                                | Razão social, CNPJ e foro já documentados (`(marketing)/termos`); e-mails `contato@`/`suporte@`/`notificacoes@rotta.com.br`; **nenhum endereço físico, telefone, DPO nomeado ou e-mail de segurança dedicado** — nada disso foi inventado nesta entrega |

**Conclusão**: a "correção obrigatória" da Categoria B pedida pelo
segundo prompt não tinha, hoje, nenhum lugar no produto onde já estava
errada — porque o Marketplace web (onde ela poderia aparecer errada)
ainda não foi construído. Isso muda o tipo de trabalho: em vez de
"corrigir um bug de rotulagem", o trabalho real é (a) construir a
central de documentação completa, com a regra escrita corretamente
desde o primeiro dia, e (b) deixar explicitamente registrado o desenho
que qualquer Marketplace/cadastro futuro deve seguir para nunca
introduzir esse erro.

## 2. O que foi construído

### 2.1 Central de Documentação (`/legal`)

- **Hub** `/legal` + 10 documentos: `/legal/privacidade`, `/termos`,
  `/seguranca`, `/comunidade`, `/rottapay`, `/motoristas`, `/marketplace`,
  `/cookies`, `/comunicacoes`, `/ajuda`.
- **Fonte única de metadados** (`features/legal/documents.ts`): slug,
  título, versão, data de publicação/atualização, status
  (`PENDENTE_REVISAO_JURIDICA` em todos, como o prompt manda enquanto
  não houver revisão jurídica real), palavras-chave de busca.
- **`LegalDocumentShell`/`LegalSection`** (novo, `components/legal/`) —
  casco reutilizado por todo documento: título, selo de versão/status,
  banner "pendente de revisão jurídica", índice navegável por âncora
  (`#id`), conteúdo em seções, e link para "documentos relacionados" no
  rodapé — nenhuma página jurídica isolada, exatamente o que o prompt
  pede (§31: "não criar paredão de texto").
- **`LegalSidebar`** (novo) — navegação lateral clicável, com item ativo
  destacado; mesmo componente no desktop (coluna fixa) e dentro do menu
  expansível "Documentação Rotta" do mobile/tablet (`legal/layout.tsx`).
- **`LegalSearch`** (novo) — busca client-side sobre título/resumo/
  palavras-chave dos ~10 documentos; ex.: buscar "GPS" retorna
  Privacidade, Segurança, Termos e Comunidade — exatamente o exemplo do
  prompt §33.
- **Navegação entre documentos**: toda menção a outro documento é um
  `<Link>` clicável (prompt §34) — verificado em todas as 10 páginas.
- **Rodapé global** (`LegalFooter` + `LEGAL_FOOTER_LINKS`, única lista,
  nunca duplicada): Sobre a Rotta, Contato, Central de Ajuda, Segurança,
  Privacidade, Termos de Uso, Política da Comunidade, RottaPay,
  Diretrizes para Motoristas, Cookies + `© {ano} {razão social} — CNPJ
{cnpj}. Todos os direitos reservados.` — adicionado à Landing
  Page/Site (`(marketing)/layout.tsx`, nova coluna "Rotta") **e** ao
  painel autenticado da transportadora (`(dashboard)/layout.tsx`, que
  não tinha rodapé nenhum antes desta entrega).
- **`/sobre`** (nova página institucional) — o link "Sobre a Rotta" do
  rodapé não tinha destino antes; conteúdo derivado do que já era real
  em `/legal/termos` (nada inventado).
- **Redirects 301** de `/termos`→`/legal/termos` e
  `/privacidade`→`/legal/privacidade` (`next.config.mjs`) — preserva
  link/SEO já publicado; `sitemap.ts` atualizado com as novas rotas
  (`/legal`, os 10 documentos, `/sobre`) no lugar das antigas.
- **Aplicativo mobile**: `LegalWebViewScreen` (mesmo padrão de
  `CriarEmpresaWebViewScreen` — WebView apontando para
  `${EXPO_PUBLIC_WEB_URL}/legal`, nunca navegador externo, nunca conteúdo
  duplicado em React Native) acessível pelo botão "Documentação Rotta"
  na tela de Perfil do Motorista/Monitor, agora uma stack de 2 telas
  (`DriverPerfilNavigator`) em vez de tela única — mesmo padrão de
  `VeiculoNavigator`, sem consumir um item a mais do Bottom Navigation.

### 2.2 Os 10 documentos — o que cada um diz

1. **Privacidade/LGPD** — migrada do `/privacidade` existente,
   preservando 100% do conteúdo real (auditado nos Dossiês 32/33), com
   as seções que faltavam: geolocalização detalhada (com o princípio
   exato do prompt §8 — "a localização não fica publicamente disponível"),
   dados financeiros, cookies/rastreamento, integrações de terceiros.
2. **Termos de Uso** — migrado do `/termos` existente, estendido com
   Marketplace/contratação, GPS, documentos e comunicação — cada seção
   nova referenciando o documento dedicado correspondente em vez de
   duplicar conteúdo.
3. **Segurança na Rotta** (novo) — descreve medidas REAIS já
   implementadas (Argon2id, lockout, JWT de curta duração, MFA
   obrigatório para Admin Rotta — Dossiê 43, controle de acesso por
   backend, criptografia de segredo TOTP, armazenamento privado de
   documento, correlationId de auditoria — Dossiê 33/44), sem revelar
   endpoint/chave/arquitetura sensível. Inclui "Encontrou uma
   vulnerabilidade?" apontando para `contato@rotta.com.br` com prefixo
   `[SEGURANÇA]` — **não foi inventado** um `security@` que não existe.
4. **Política da Comunidade Rotta** (novo) — lista de condutas proibidas
   e consequências (advertência → suspensão → bloqueio → encerramento →
   comunicação a autoridades quando exigido por lei).
5. **Política Financeira RottaPay** (novo) — RottaPay (camada/experiência
   da Rotta) × AbacatePay (assinatura da plataforma) × Lytex
   (infraestrutura de pagamento/split, ainda não implementada de fato —
   ver Dossiê 44) explicitamente separadas, nunca confundidas — a
   arquitetura real já era assim, este documento só a torna pública.
6. **Diretrizes para Motoristas e Modalidades de Transporte** (novo) —
   ver Seção 3 abaixo, o documento central da complementação.
7. **Política de Contratação e Marketplace** (novo) — Marketplace como
   infraestrutura de descoberta/contratação (nunca "marketplace
   genérico"), quem contrata/presta/paga, o que a Rotta verifica, uso de
   IA em contrato (nunca substitui advogado, nunca "certifica"
   juridicamente).
8. **Política de Cookies** (novo) — honesto: **a Rotta não usa cookie
   nenhum hoje** (sessão via `localStorage` + memória, confirmado em
   `packages/auth/src/web/token-store.ts`); documento existe
   preventivamente, não porque haja algo a esconder.
9. **Política de Comunicações** (novo) — canais reais (push/e-mail já
   ativos; WhatsApp/SMS com arquitetura preparada, dependente de
   provedor — Dossiê 40), distinção transacional × marketing.
10. **Central de Ajuda / Transparência** (novo) — índice para os canais
    reais já existentes (`/suporte`, `/faq`, `/status`, `/contato`) em
    vez de duplicá-los, mais o link para o canal de vulnerabilidade.

## 3. A correção da Categoria B — o que foi feito e o que fica pendente

A regra central dos dois prompts — **"CATEGORIA B ≠ TRANSPORTE
ESCOLAR"** — foi implementada **no nível de documentação e de desenho**,
com honestidade sobre o que ainda não existe no produto:

- **`/legal/motoristas`** afirma, com todas as letras, exatamente a
  regra pedida: categoria B → executivo/executivo infantil/particular,
  nunca "transporte escolar" só por causa da categoria; categorias D/E →
  candidatas a transporte escolar, mas só quando EAR + curso +
  requisitos aplicáveis estiverem TODOS verificados; EAR isolado (ou EAR
  - curso, mesmo em categoria B) **não** promove a categoria da CNH.
- **`/legal/marketplace`** e **`/legal/termos`** referenciam essa regra
  ao descrever contratação.
- **O documento é explícito** (comentário de código + texto visível ao
  leitor da seção 5) que a Rotta **ainda não tem** um motor automatizado
  que computa "elegível para transporte escolar" a partir dos
  documentos — os _tipos_ de documento (CNH, EAR, curso, antecedentes)
  já existem separadamente no schema, mas a composição deles em um
  status único de elegibilidade não foi implementada, e o Marketplace
  web (onde a regra poderia aparecer errada) ainda não existe.

### O que fica pendente — próximo incremento real (não fingido aqui)

Como o Marketplace web e o motor de elegibilidade não existem, aplicar
"em todo o produto" (schema + backend + Marketplace + cadastro + perfil

- contratação + admin) como o segundo prompt pede é, na prática, **um
  projeto de construção**, não uma correção pontual. Fica desenhado e
  registrado para a próxima entrega:

1. **Separar `DRIVER_LICENSE_CATEGORY` de `SERVICE_MODALITY`** no
   schema — hoje só existe a categoria da CNH como string livre em
   `DriverDocument`; falta um campo de modalidade de serviço
   (`TRANSPORTE_ESCOLAR` | `EXECUTIVO_INFANTIL` | `PARTICULAR`) em nível
   de perfil do motorista/vínculo, nunca inferido da categoria sozinha.
2. **`SchoolTransportEligibilityService`** — computa estados
   (`PENDING`/`UNDER_REVIEW`/`ELIGIBLE`/`NOT_ELIGIBLE`/`EXPIRED`/
   `REQUIRES_UPDATE`) a partir dos documentos já existentes
   (CNH+categoria, EAR, curso, antecedentes) — nunca `"VERIFICADO"`
   genérico, sempre atrelado à finalidade (prompt §18 da complementação).
3. **Marketplace web** (busca/cards de motorista) — quando construído,
   deve nascer já respeitando a distinção (card "Executivo Infantil" com
   `Categoria CNH: B` nunca rotulado "Transporte Escolar"; card
   "Transporte Escolar" só quando `SchoolTransportEligibilityService`
   retornar `ELIGIBLE`) e os filtros por Modalidade separados de
   Categoria de Habilitação (prompt §11 da complementação).
4. **Fluxo de contratação** — resumo de confirmação mostrando Modalidade
   - Categoria da CNH + requisitos verificados antes de confirmar,
     com a declaração explícita quando a modalidade for
     executivo/particular (prompt §14 da complementação).

Essas quatro peças, quando construídas, devem consumir o mesmo texto já
publicado em `/legal/motoristas` como fonte da verdade — não descrevem
uma regra nova, implementam a que já está documentada.

## 4. O que fica deferido (documentado, não esquecido)

- **Admin → Legal → Documents** (CMS com fluxo
  RASCUNHO→REVISÃO→APROVAÇÃO→PUBLICAÇÃO, versionamento com histórico
  real, definição de data de publicação) — hoje os documentos são
  código versionado no repositório (`features/legal/documents.ts` +
  página por documento), o que já cumpre "nunca sobrescrever
  silenciosamente" (todo commit é uma revisão auditável no Git) mas não
  o fluxo editorial completo pedido pelo prompt §36/§37. Requer um novo
  módulo de backend (schema, service, controller) e uma tela de admin —
  escopo de uma entrega própria.
- **Registro de aceite versionado** (`TERMS_VERSION`/`PRIVACY_VERSION`
  por usuário, com re-solicitação em nova versão relevante, prompt §29/
  §30/§38) — depende do CMS acima existir para ter uma versão "oficial"
  contra a qual registrar o aceite; hoje `aceiteTermos` já é coletado no
  cadastro (Dossiê 34) mas sem granularidade de versão.
- **Auditoria de Consistência Legal↔Produto** (dashboard `ADMIN → LEGAL
& TRUST → CONSISTENCY AUDIT`, prompt §31-§35 da complementação) —
  também depende do CMS para ter "o que o documento promete" como dado
  estruturado comparável ao comportamento real; hoje essa checagem foi
  feita manualmente nesta auditoria (Seção 1), não automatizada.
- **Central de Ajuda no Admin/mobile de outros papéis** — a WebView de
  documentação foi ligada ao Perfil do Motorista/Monitor (tela real);
  o Perfil do Responsável no mobile é hoje um placeholder ("em
  construção", `ParentNavigator.tsx`) — ligar a Documentação lá fica
  pendente de esse Perfil ser construído primeiro.

## 5. Verificação

- **Build de produção** (`next build`, `apps/web`) — compilou sem erro
  de tipo/lint nas 10 páginas novas + hub + `/sobre` + layout (os únicos
  erros de `next build` encontrados são de rotas pré-existentes, sem
  relação com esta entrega — `NEXT_PUBLIC_API_URL` ausente ao
  pré-renderizar páginas autenticadas, mesmo comportamento já visto em
  entregas anteriores desta sessão).
- **`pnpm typecheck`** limpo em `apps/web` e `apps/mobile`.
- **`pnpm lint`** — 0 erros em `apps/web`/`apps/mobile` (avisos restantes
  são o mesmo padrão de ordenação de import já presente em dezenas de
  arquivos do projeto, não introduzidos por esta entrega).
- **`pnpm test`** — suíte existente de `apps/web` (Vitest, 3 testes) e
  `apps/mobile` (placeholder) continuam passando.
- **Navegação testada manualmente por inspeção de rota**:
  rodapé → documento (Landing Page e painel autenticado); documento →
  documento (todo cross-link usa `<Link>` do Next.js, verificado por
  grep em todas as 10 páginas); documento → seção (todo `id` do índice
  bate com um `LegalSection` correspondente, verificado por inspeção
  de cada página); `/termos`/`/privacidade` → redirecionam para os
  novos caminhos (`next.config.mjs`); rotas geradas em
  `.next/types/routes.d.ts` confirmam `/legal`, os 10 slugs e `/sobre`
  existem como rotas tipadas válidas.

## 6. Resumo executivo

A Rotta agora tem uma central pública de documentação real — não um
conjunto de páginas jurídicas isoladas, mas um produto navegável, com
busca, índice, versionamento visível e rodapé global consistente em
Landing Page, painel autenticado da transportadora e aplicativo. A
regra mais sensível pedida pelos dois prompts — Categoria B nunca
apresentada como transporte escolar — está corretamente escrita no
documento que rege o assunto, e o desenho de como aplicá-la no
Marketplace/cadastro (quando essas telas existirem) está registrado,
não inventado como se já estivesse pronto.
