# Dossiê 35 — Go-Live, Lançamento e Operação (Prompt 25)

> Origem: sétimo e último "Prompt" da sequência original — preparo de
> publicação em loja (Google Play/Apple, listagem, screenshots, ícones,
> política de privacidade, termos de uso), arquitetura de subdomínios
> (www/app/api/admin/status/blog/docs.rotta.com.br), central de ajuda
> pública, fluxos de onboarding por persona, templates de e-mail
> transacional, notificações padrão, canal de suporte, monitoramento
> dos primeiros usuários, plano de lançamento nacional faseado,
> checklist de pré-lançamento, atualização de documentação e um
> relatório final.

## 1. O achado real desta auditoria — e o mais sério de toda a sessão

Auditando o requisito "política de privacidade, termos de uso" contra
o código real (não suposição): `RegisterEmpresaDto.aceiteTermos` e
`RedeemInviteDto.aceiteTermos` já exigiam `@Equals(true)` no backend
desde o módulo Auth (Dossiê 15/32) — **mas nos cinco pontos de
cadastro que chamam essa API (`criar-conta/empresa`,
`criar-conta/pessoal`, `convite/[codigo]` no `apps/web`;
`CriarContaPessoal`, `ConvitePreview` no `apps/mobile`), o valor
enviado era `aceiteTermos: true` fixo no código — nunca um checkbox
real, nunca uma escolha do usuário.** E pior: as páginas de Termos de
Uso e Política de Privacidade **não existiam** — o "aceite" apontava
para um documento inexistente.

Isso significa que, até esta correção, **toda conta criada na Rotta
"aceitava" termos que a pessoa nunca viu e nunca teve a chance de
recusar** — um problema de conformidade LGPD/consumidor real, não
hipotético, e provavelmente o achado de maior risco jurídico de toda
esta auditoria de lançamento.

## 2. Correção aplicada

### 2.1 `Checkbox` — átomo especificado, nunca implementado

O catálogo do Design System (Dossiê 25 §2.5) especifica um `Checkbox`
desde a primeira versão — nunca chegou a ser construído (só
Button/Input/Select/Badge/Spinner/Typography existiam em
`packages/ui/src/web/atoms/`, mesmo princípio de "componente chega
junto com a tela que precisa dele pela primeira vez"). Implementado
agora, fiel à especificação (20×20px, `radius-sm`, check via ícone
Lucide, estado `indeterminate`), porque o aceite de termos era
finalmente uma necessidade real.

### 2.2 Checkbox de aceite real nos 5 pontos de cadastro

- **`apps/web`**: `TermsAcceptanceCheckbox` (`src/components/`) —
  usa o novo `Checkbox`, com link para `/termos` e `/privacidade`.
  Aplicado em `criar-conta/empresa`, `criar-conta/pessoal`,
  `convite/[codigo]` — em todos, o botão de envio fica `disabled`
  até o usuário marcar o checkbox.
- **`apps/mobile`**: `AuthTermsCheckbox` (`features/auth/components/`)
  — implementação mínima local (mesmo padrão de `AuthButton`: nenhum
  Design System nativo existe ainda, `@rotta/ui/native` está vazio;
  portar o átomo Checkbox para nativo é trabalho futuro documentado,
  não bloqueador deste fix). Abre `/termos`/`/privacidade` no
  navegador do sistema via `Linking`. Aplicado em
  `CriarContaPessoal` e `ConvitePreview`.

Em todos os 5 pontos, o corpo da requisição continua `aceiteTermos:
true` (o backend não mudou) — a diferença real é que agora esse `true`
só é enviado depois que a pessoa de fato marcou o checkbox, porque o
botão de envio fica desabilitado até lá.

### 2.3 `/termos` e `/privacidade`

Duas páginas novas em `apps/web`, com conteúdo redigido a partir do
que a plataforma realmente faz — auditado nesta sessão (Dossiê 32:
inventário de dado pessoal, Argon2id, RS256, buckets público/privado;
Dossiê 33: exportação de dados autoatendida), não um texto genérico de
modelo. **As duas trazem um aviso explícito de que são rascunho
pendente de revisão jurídica** — não afirmamos aqui o que não podemos
garantir (nenhuma IA deveria assinar como definitivo um documento
legal vinculante sem um advogado revisando).

## 3. O que já estava pronto (referenciado, não repetido)

- **E-mails transacionais**: `renderNotificationEmailHtml` (Dossiê 14)
  — um único template HTML responsivo para todo evento, conteúdo
  personalizado pelo `MessagePersonalizationService` (Dossiê 14/Communication
  Engine). Não são "templates por evento" porque a arquitetura já
  resolve isso de forma mais elegante — um template, conteúdo
  dinâmico.
- **Notificações padrão**: Rotta Communication Engine completo
  (push/e-mail/WhatsApp/SMS/in-app, Dossiês 14/Communication) — nada a
  acrescentar aqui.
- **Canal de suporte**: módulo Suporte (Dossiê 21/29) — chamados
  dentro do produto, fila de atendimento no Backoffice.
- **Central de ajuda pública**: `/faq` já existente (JSON-LD
  estruturado, Dossiê 12 §7.4).

## 4. O que fica de fora — e por quê (honesto, não escondido)

| Item                                                                  | Por que não implementado agora                                                                                                                                                                                                         |
| --------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Publicação nas lojas (Google Play/Apple)                              | Exige conta de desenvolvedor paga (Apple: US$99/ano, Google: US$25 único) e credenciais que só quem tem acesso a essas contas pode gerar — `eas.json` (Dossiê 33) já deixa a infraestrutura de build pronta para quando isso acontecer |
| Screenshots/descrição de ficha de loja                                | Depende do app já estar publicado numa build real, testável em dispositivo — não algo que se produz sem rodar o app de verdade                                                                                                         |
| Subdomínios (`app`/`api`/`admin`/`status`/`blog`/`docs`.rotta.com.br) | Exige acesso ao registrador de domínio `rotta.com.br` — fora do alcance desta sessão (mesmo runbook do Dossiê 33 §4)                                                                                                                   |
| Onboarding guiado por persona (tour dentro do app)                    | Gap real de UX, não de segurança/conformidade — escopo de produto maior que uma correção pontual; nenhuma tela de onboarding foi encontrada em `apps/mobile`/`apps/web`                                                                |
| Monitoramento dos primeiros usuários                                  | Ferramental já existe (Sentry — Dossiê 33; Analytics — Dossiê 30); "monitorar" de verdade só faz sentido quando houver usuário real, não é uma tarefa de código                                                                        |
| Lançamento nacional faseado                                           | Decisão de negócio (quais estados/cidades primeiro, ritmo), não uma implementação técnica                                                                                                                                              |

## 5. Checklist de pré-lançamento

| #   | Item                                             | Status                                                                         |
| --- | ------------------------------------------------ | ------------------------------------------------------------------------------ |
| 1   | Aceite de Termos/Privacidade real no cadastro    | ✅ Corrigido nesta entrega                                                     |
| 2   | Páginas de Termos de Uso/Política de Privacidade | ✅ Publicadas — **revisão jurídica pendente antes de tratar como definitivas** |
| 3   | Segurança (senha, sessão, upload, RLS)           | ✅ Auditado, Dossiê 32                                                         |
| 4   | Observabilidade (erro, health check)             | ✅ Dossiê 33                                                                   |
| 5   | Backup do banco                                  | ✅ Gerido pelo provedor (Neon/Supabase)                                        |
| 6   | Domínio próprio + subdomínios                    | ❌ Requer acesso ao registrador                                                |
| 7   | Conta de desenvolvedor Apple/Google              | ❌ Requer quem tem acesso a essas contas                                       |
| 8   | Teste de carga nos volumes-alvo                  | ❌ Requer ambiente dedicado (Dossiê 34)                                        |
| 9   | Rede de segurança automatizada no frontend       | ⚠️ Parcial — só `apps/web` tem teste real (Dossiê 34)                          |
| 10  | LGPD — exportação de dados                       | ✅ Dossiê 33                                                                   |
| 11  | LGPD — exclusão de dados                         | ❌ Decisão de produto/jurídica pendente (Dossiê 33 §4)                         |

## 6. Relatório final — estado da plataforma

Ao final da sequência de 7 Prompts (19–25), a Rotta tem: banco de
dados normalizado e auditado (Dossiê 28), todos os módulos de negócio
funcionais com API completa (Dossiê 13 + implementações subsequentes),
backoffice administrativo (Dossiê 29), analytics/BI (Dossiê 30),
infraestrutura de produção com observabilidade real (Dossiê 33),
segurança auditada com o único gap crítico real (Storage público)
corrigido (Dossiê 32), qualidade com cobertura de teste sólida no
backend e infraestrutura nova no frontend (Dossiê 34), e agora um
fluxo de cadastro que exige consentimento real, não fabricado.

**Riscos conhecidos, em ordem de severidade**:

1. Termos/Privacidade são rascunho, não documento revisado por
   advogado — não lance publicamente sem essa revisão.
2. Nenhum teste de carga real foi executado contra os volumes-alvo.
3. Cobertura de teste automatizado do frontend ainda é mínima (1
   componente).
4. Publicação em loja/domínio próprio depende de acesso externo que
   esta sessão não tem.

**Recomendação**: a plataforma está tecnicamente pronta para um
lançamento controlado (beta fechado, poucos usuários reais, sob
observação) — não para uma campanha de aquisição em massa antes dos
itens 1 e 2 acima serem resolvidos.

## 7. Verificação

- `pnpm turbo run typecheck build test` — limpo em `@rotta/web`,
  `@rotta/admin`, `@rotta/ui` (8/8 tasks).
- `apps/mobile`: `tsc --noEmit` limpo.
- Rotas novas (`/termos`, `/privacidade`) buildam e aparecem no output
  de `next build`.
