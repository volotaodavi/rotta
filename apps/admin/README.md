# @rotta/admin — Portal Admin Rotta

Painel interno da equipe Rotta (Dossiê 11, Seção 6). Deploy **isolado** de `apps/web` por motivo de segurança — modelo de autorização cross-tenant, nunca deve compartilhar processo ou domínio com o painel de cliente (Dossiê 22, Seção 4.3).

**Estado atual: apenas a fundação.** Nenhuma tela de negócio implementada.

## Rodando localmente

```bash
cp .env.example .env.local
pnpm dev:admin
```

Sobe em `http://localhost:3001` (porta distinta de `apps/web`, que usa 3000).

## Próximos passos

Ver Dossiê 20 (`ADM-*`) para o primeiro conjunto de telas reais a implementar.
