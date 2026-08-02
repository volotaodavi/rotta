# @rotta/mobile

App React Native/Expo da Rotta — um único aplicativo chamado "Rotta" (Motorista, Monitor e Responsável, mesmo código-fonte e mesmo produto de loja — Dossiê 15: "nunca aplicativos separados por papel"; substitui o plano anterior de dois produtos de loja do Dossiê 9, Seção 4.2.1).

**Estado atual:** fluxo de entrada/autenticação completo (Dossiê 15 `AUTH-01`) — tela inicial, Entrar (telefone/e-mail/CPF + senha, com seleção de perfil quando há múltiplos vínculos), Criar Conta (Área Profissional/Pessoal), Criar Empresa via WebView integrada (nunca navegador externo), resgate de convite de Motorista/Responsável. Pós-login, a navegação troca para `DriverNavigator`/`ParentNavigator` conforme o papel da sessão real — ainda com telas placeholder (próxima fase).

## Rodando localmente

```bash
cp .env.example .env
pnpm dev
```

## Estrutura

- `src/navigation/` — `RootNavigator` (decide Auth vs. papel da sessão real), `AuthNavigator` (Entrada/Login/CriarConta/Convite/WebView), `DriverNavigator`, `ParentNavigator` — ver Dossiê 10, Seção 11.1
- `src/features/auth/` — telas do fluxo de entrada/autenticação (Dossiê 15)
- `src/providers/` — TanStack Query, tema e sessão (`@rotta/auth/native`) (Dossiê 23, Seção 1.1)
- `src/lib/api-client.ts` — instância única de `@rotta/api-client`, mesma conta/API de `apps/web`/`apps/admin`

## Próximos passos

Telas reais de Motorista/Responsável (Dossiê 11, Seções 3-4) e Dossiê 9 Seção 6 para o pipeline de publicação nas lojas (EAS Build/Submit).
