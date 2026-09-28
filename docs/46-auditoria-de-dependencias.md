# Dossiê 46 — Auditoria de dependências (item 3 da auditoria web + app)

> Escopo: o item 3 dos 5 achados da auditoria completa de 26/09/2026
> ("como está o app? auditoria completa na web + app nativo"). O achado
> era simples e incômodo: `pnpm audit` acusava **60 vulnerabilidades
> altas** e o CI só derrubava o merge em `critical`, ou seja, as 60
> estavam entrando sem ninguém olhar. Este Dossiê é a triagem: o que foi
> corrigido de verdade, o que sobrou, por que sobrou, e o que o CI passa
> a bloquear a partir de agora.
>
> Resultado: **60 altas → 26 altas**, todas as 26 registradas uma por uma
> com justificativa, e o CI subiu de `--audit-level=critical` para
> `--audit-level=high`.

## 1. A regra que essa triagem seguiu

Uma lista de exclusões só presta se cada linha dela tiver sido conquistada.
Então a ordem de preferência foi, sempre, nesta ordem:

1. **Corrigir** — se existe versão corrigida compatível com o que o
   pacote pai declara, sobe a versão. Não importa se é build-time.
2. **Provar que não é alcançável** — se não existe correção compatível,
   provar com evidência (não com suposição) que o código vulnerável não
   recebe entrada de atacante nem vai para o que o cliente instala.
3. **Só então excluir**, por ID de advisory, com o motivo escrito.

O que este Dossiê **não** faz: chamar "build-time" de "seguro" por
reflexo. Uma dependência de build compromete a máquina de quem compila e
o artefato que sai dela — é vetor de supply chain, não um detalhe. O que
faz cada exclusão aqui ser aceitável não é o rótulo "build", é a
combinação de: sem correção compatível + entrada vem de fonte confiável
(nosso próprio `app.json`, o registry oficial do npm) + não vai para o
APK nem para a API.

## 2. O que foi corrigido de verdade (34 das 60)

### 2.1 `adm-zip` — a única que era alcançável em produção

Essa foi a achada que justificou a triagem inteira. `adm-zip@0.5.16`
tinha GHSA-xcpc-8h2w-3j85 ("um ZIP forjado dispara alocação de 4 GB") e
GHSA-7q85-xj36-vmfc. E ela **é** alcançável:

- `apps/api/src/modules/geo/agents/inep-sync.service.ts:2` —
  `import AdmZip from "adm-zip"`
- `apps/api/src/modules/geo/agents/inep-sync.service.ts:199` —
  `new AdmZip(zipBuffer)`, onde `zipBuffer` é o Censo Escolar **baixado
  pela rede** do portal do INEP.

Ou seja: entrada externa, dentro da API, em runtime. Não é build-time,
não é teórico. Corrigido subindo para `adm-zip@^0.6.1` em
`apps/api/package.json` (correção a partir de 0.6.0). Os 27 testes do
módulo INEP continuam verdes.

### 2.2 Overrides de patch em `pnpm.overrides`

O resto veio de subir versões **dentro da faixa que o pacote pai já
declara** — isto é, correções de patch, sem quebrar contrato de ninguém:

| Pacote               | De           | Para    | Por que era seguro subir                             |
| -------------------- | ------------ | ------- | ---------------------------------------------------- |
| `nanoid@3`           | 3.3.16       | ^3.3.19 | `@react-navigation/core` declara `^3.3.11`           |
| `lodash`             | 4.17.21      | ^4.18.1 | usado pela API (`@nestjs/config`, `@nestjs/swagger`) |
| `postcss@8`          | 8.4.x/8.5.25 | ^8.5.28 | faixa `^8` em todo mundo                             |
| `js-yaml@4`          | 4.1.0        | ^4.3.2  | `@nestjs/swagger` declara `^4.1.0`                   |
| `js-yaml@3`          | 3.15.1       | ^3.15.2 | `read-yaml-file` declara `^3.x`                      |
| `sharp`              | 0.34.5       | ^0.35.4 | libvips/libheif corrigidos; `next` aceita            |
| `fast-uri@3`         | 3.1.5        | ^3.1.6  | `ajv` declara `^3.0.1`                               |
| `picomatch@4`        | 4.0.1        | ^4.0.7  | `@angular-devkit/core` declara `^4.0.1`              |
| `glob@10`            | 10.4.5       | ^10.5.0 | `@nestjs/cli` declara `^10.x`                        |
| `tmp`                | 0.0.33/0.1.0 | ^0.2.7  | só `external-editor`/`lhci`, API compatível          |
| `@xmldom/xmldom@0.9` | 0.9.10       | ^0.9.12 | `plist@3.1.1` declara `^0.9.10`                      |
| `tar`                | ^7.5.19      | ^7.5.22 | já era override; subiu para a linha corrigida        |

O seletor por faixa (`nanoid@3`, `js-yaml@4`, `@xmldom/xmldom@0.9`) é
deliberado: força a correção só na major que estava vulnerável, sem
arrastar quem depende de outra major.

### 2.3 Duas que valem registrar como _não alcançáveis_, mesmo corrigidas

Foram corrigidas de todo jeito, mas a análise vale ficar escrita porque
se algum dia o override tiver que cair, o motivo já está aqui:

- **`js-yaml` na API** — os três advisories são sobre **parsing**
  (cadeias de merge key, resolução de `!!omap`). O `@nestjs/swagger` só
  chama `jsyaml.dump` (`swagger-module.js:147`), nunca `load`. Confirmado
  por busca no `dist/` do pacote: zero ocorrências de `jsyaml.load`.
- **`lodash` na API** — o advisory é injeção de código via `_.template`
  com nomes de chave em `imports`. `@nestjs/config` importa só
  `lodash/get`, `lodash/has` e `lodash/set`; no `dist/` do
  `@nestjs/swagger` há zero ocorrências de `.template(`.

## 3. O que sobrou: 26 altas, uma por uma

Todas registradas em `pnpm.auditConfig.ignoreGhsas` (`package.json`).
Nenhuma tem versão corrigida compatível com o que o pacote pai declara —
subir qualquer uma delas exige bumps de major em dependências de
terceiros (Expo SDK, Metro, Prisma CLI, Lighthouse).

### 3.1 `tar@6` — 8 advisories + a única `critical`

`@expo/cli@0.22.28` declara `tar: ^6.2.1` e **quebra** com tar@7
(`Cannot read properties of undefined (reading 'extract')` no
`expo prebuild` — causa raiz reproduzida no commit `ff2282b`). Por isso
existe o override cirúrgico `@expo/cli>tar: ^6.2.1`: o resto do monorepo
usa tar@7.5.22, só o `@expo/cli` fica no 6.

O único caminho que exercita esse código extrai o pacote oficial
`expo-template-bare-minimum` do registry do npm — fonte confiável, nunca
entrada de usuário. Nada disso vai para o APK nem para a API.

`GHSA-23hp-3jrh-7fpw` (a `critical`, DoS de descompressão),
`GHSA-34x7-hfp2-rc4v`, `GHSA-83g3-92jg-28cx`, `GHSA-8qq5-rm4j-mr97`,
`GHSA-8x88-c5mf-7j5w`, `GHSA-9ppj-qmqm-q256`, `GHSA-qffp-2rhf-9h96`,
`GHSA-r292-9mhp-454m`, `GHSA-r6q2-hw4h-h46w`.

**Revisar quando:** o Expo SDK subir para uma versão que aceite tar@7.

### 3.2 `@xmldom/xmldom@0.7.13` — 13 advisories

Chega por `@expo/plist@0.2.2`, que declara `@xmldom/xmldom: ^0.7.0`. A
linha corrigida é `>=0.8.15`, uma major acima — a 0.8 mudou tratamento de
erro do `DOMParser` e comportamentos não-padrão, então o override seria
uma aposta em cima do `expo prebuild`, que é exatamente o passo que gera
os projetos Android/iOS. Quebrar ali quebra o build nativo.

Alcançabilidade: o `@expo/plist` serializa e lê **os nossos próprios**
`app.json`/`Info.plist` durante o prebuild. O XML que entra nesse parser
é escrito por nós, no repositório. Não há caminho em que um atacante
forneça esse XML, e o `xmldom` não é empacotado no APK (§4).

`GHSA-27p8-2357-5qqv`, `GHSA-2v35-w6hq-6mfw`, `GHSA-4w3w-2rp5-g8jm`,
`GHSA-8344-3jmq-59r6`, `GHSA-93r5-fhx6-vmg9`, `GHSA-965w-775f-mr7g`,
`GHSA-c7q8-3ch8-vqpv`, `GHSA-f6ww-3ggp-fr8h`, `GHSA-j759-j44w-7fr8`,
`GHSA-w2rr-34g9-rvrj`, `GHSA-wh4c-j3r5-mjhp`, `GHSA-x4fp-j954-r2f4`,
`GHSA-x6wf-f3px-wcqx`.

**Revisar quando:** o `@expo/config-plugins` passar a aceitar xmldom 0.8+.

### 3.3 `image-size@1.2.1` — 2 advisories

Chega por `metro@0.81.5`, que declara `image-size: ^1.0.2`. A correção é
`>=2.0.3`, major acima, e o Metro chama a API antiga. Os dois advisories
são DoS por loop infinito nos parsers **JXL/HEIF/ICNS** — o Metro usa o
`image-size` para medir os PNGs de `apps/mobile/assets/`, que são nossos
e estão no repositório. Não há JXL, HEIF nem ICNS no projeto.

`GHSA-5p2g-fcmc-qvqq`, `GHSA-w3rx-r6r6-pgpr`.

**Revisar quando:** o Metro subir para `image-size@2`.

### 3.4 `extract-zip@2.0.1` — 2 advisories, sem correção existente

O campo `patched_versions` desses dois advisories é `<0.0.0`: **não
existe versão corrigida**. Chega só por
`@lhci/cli → lighthouse → puppeteer-core → @puppeteer/browsers`, isto é,
o job do Lighthouse baixando o Chromium do repositório oficial do Google.
Nunca roda na API, nunca no app, e o ZIP vem de fonte confiável.

`GHSA-7pqw-9j4j-h8q3`, `GHSA-jmr9-qjv8-65gv`.

**Revisar quando:** o `extract-zip` publicar correção, ou o
`@puppeteer/browsers` trocar de biblioteca.

### 3.5 `deepmerge-ts@7.1.5` — 1 advisory

Chega por `@prisma/config@6.19.3` (`^7.x`); a correção é `>=8.0.0`. É o
carregador de configuração do **CLI** do Prisma — roda em
`prisma migrate`/`generate`, não no `@prisma/client` em runtime. O
advisory é esgotamento de pilha ao mesclar grafos recursivos; a entrada é
o nosso `prisma.config.ts`.

`GHSA-ggr8-5vv4-36mx`.

**Revisar quando:** o Prisma subir `@prisma/config` para deepmerge-ts 8.

## 4. A evidência de que nada disso entra no app publicado

Não bastava dizer "é build-time". A prova foi feita no artefato que o
cliente instala — o bundle Hermes gerado pelo `expo export`
(`_expo/static/js/android/index-*.hbc`, 5,94 MB, 3286 módulos), rodando
`strings` no arquivo e contando ocorrências:

| Módulo           | Ocorrências no bundle |
| ---------------- | --------------------- |
| `@xmldom/xmldom` | 0                     |
| `js-yaml`        | 0                     |
| `image-size`     | 0                     |
| `postcss`        | 0                     |
| `adm-zip`        | 0                     |
| `lodash`         | 0                     |
| `nanoid`         | 1                     |

O `nanoid` é a exceção honesta: ele **está** no app, via
`@react-navigation/core`, que o usa para gerar chaves de tela. Por isso
ele não entrou na lista de exclusões — foi corrigido (§2.2). Era o único
dos módulos acusados que ia de fato para as mãos do usuário.

A contagem de `tar` no bundle (14) não é conclusiva, porque "tar" é
substring de outras palavras (`start`, `target`). O que resolve o caso
do tar não é o `strings`, é o caminho de dependência: ele só aparece sob
`@expo/cli`, que é ferramenta de linha de comando e não é importado por
nenhum módulo do app.

### 4.1 `sharp` e o `next/image`

O `sharp` herda CVEs de libvips e libheif — e o `next/image` é
exatamente o tipo de coisa que transformaria isso em RCE remota, **se**
aceitasse imagem de domínio externo. Verificado: `apps/web/next.config.*`
e `apps/admin/next.config.*` **não têm bloco `images`/`remotePatterns`**.
Sem `remotePatterns`, o otimizador do Next só processa os arquivos
locais commitados no repositório. Mesmo assim o `sharp` foi corrigido
para `^0.35.4` (§2.2), porque havia correção compatível.

## 5. Um achado colateral: o `/docs` da API não é fechado em produção

Investigando se o `js-yaml` do Swagger era alcançável, apareceu isto:
`apps/api/src/main.ts:80` registra `SwaggerModule.setup()` **sem nenhuma
guarda de ambiente**. A documentação OpenAPI completa da API — todas as
rotas, todos os DTOs — fica servida em `/{apiPrefix}/docs` em produção,
para quem souber a URL.

Não é vulnerabilidade de dependência e por isso não entra na contagem
deste Dossiê, mas é exposição de superfície de ataque de graça e está
registrado aqui para não se perder. Correção natural: envolver o
`SwaggerModule.setup` em um `if` de ambiente, ou pôr autenticação básica
na rota.

## 6. O que o CI passa a bloquear

`.github/workflows/ci.yml`, job `dependency-audit`:

```yaml
- name: Audit
  run: pnpm audit --audit-level=high
```

Estado verificado após a triagem:

```
50 vulnerabilities found
Severity: 5 low | 18 moderate | 26 high (26 ignored) | 1 critical (1 ignored)
exit=0
```

As exclusões são **por ID de advisory**, nunca por pacote nem por nível.
Isso é o ponto todo: uma vulnerabilidade **nova** em qualquer um desses
mesmos pacotes — inclusive um advisory novo no `tar@6` — derruba o job,
porque o ID dela não está na lista. A lista não é um passe livre para os
pacotes; é um registro de 26 decisões individuais.

As 18 `moderate` e 5 `low` seguem fora do bloqueio. Subir o nível para
`moderate` é o próximo degrau natural, e deve ser feito do mesmo jeito:
triar antes, corrigir o que dá, registrar o motivo do resto. Não
adicionar exclusão sem o parágrafo que a justifica.

## 7. Verificação desta entrega

Rodado no monorepo inteiro depois de todos os overrides:

- `pnpm turbo run typecheck` — 25/25 tasks verdes.
- `pnpm turbo run test build` — 25/25 tasks verdes, incluindo o
  `expo export` do app (que passou a ser build de verdade no commit
  `ddfaa8f`) e o `next build` do Admin com `sharp@0.35.4`.
- `pnpm audit --audit-level=high` — exit 0.
- Lockfile confere: só `nanoid@3.3.19` e `sharp@0.35.4` resolvidos,
  sem sobra das versões antigas.
