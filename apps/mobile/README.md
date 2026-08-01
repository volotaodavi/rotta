# @rotta/mobile

App React Native/Expo da Rotta — Motorista, Monitor e Responsável em um único código-fonte, publicado como dois produtos de loja ("Rotta Motorista" e "Rotta Família", Dossiê 9, Seção 4.2.1).

**Estado atual: apenas a fundação.** Navegação condicionada por papel (estrutura pronta, sempre exibindo o fluxo de autenticação por ora), providers (TanStack Query, tema) e telas placeholder. Nenhuma tela de negócio real implementada.

## Rodando localmente

```bash
cp .env.example .env
pnpm dev:mobile        # variante padrão (driver)
pnpm dev:driver         # força variante "Rotta Motorista"
pnpm dev:parent          # força variante "Rotta Família"
```

## Estrutura

- `src/navigation/` — `RootNavigator` (decide Auth vs. papel), `AuthNavigator`, `DriverNavigator`, `ParentNavigator` — ver Dossiê 10, Seção 11.1
- `src/providers/` — TanStack Query + tema (Dossiê 23, Seção 1.1)
- `src/features/` — vazio, reservado para features reais (Dossiê 23, Seção 1.1)

## Próximos passos

Ver Dossiê 15 (`AUTH-*`) para o primeiro fluxo real a implementar, e Dossiê 9 Seção 6 para o pipeline de publicação nas lojas (EAS Build/Submit).
