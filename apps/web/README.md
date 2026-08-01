# @rotta/web — Landing Page + Painel Administrativo

Next.js 15 (App Router). Serve dois públicos via _route groups_ (Dossiê 22, Seção 4.1):

- `(marketing)` — Landing Page pública (Dossiê 11, Seção 1)
- `(auth)` — login, cadastro, recuperação de senha (Dossiê 15)
- `(dashboard)` — Painel autenticado de Empresa/Gestor/Escola (Dossiê 11, Seções 2 e 5)

**Estado atual: apenas a fundação.** Providers (TanStack Query, tema), error boundary e loading state globais estão configurados; nenhuma tela de negócio foi implementada.

## Rodando localmente

```bash
cp .env.example .env.local
pnpm dev:web
```

## Próximos passos

Ver Dossiê 15 (`AUTH-*`) para o primeiro conjunto de telas reais a implementar.
