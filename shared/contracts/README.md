# @rotta/shared-contracts

Fonte única de verdade dos contratos de domínio da Rotta — entidades, DTOs de API e eventos internos. Ver Dossiê 22, Seção 6.3.

## Por que este pacote existe separado de `packages/types`

`packages/types` (Dossiê 22, Seção 5.4) e `packages/validators` (Seção 5.5) são a superfície consumida pelo **frontend**. `shared/contracts` é a definição canônica, em schemas [Zod](https://zod.dev), consumida tanto por eles quanto diretamente pelo backend (`apps/api`) — a mesma regra é escrita **uma única vez**.

## Estado atual

Apenas a organização de pastas (fase de fundação). O primeiro contrato real deve ser criado junto com o primeiro módulo de domínio implementado — recomendação: `auth` (Dossiê 15), pois todo o resto depende dele.

```
src/
├── entities/   # Espelham as entidades do Dossiê 8 (Aluno, Rota, Motorista...)
├── dtos/       # Request/response de cada endpoint do Dossiê 13
└── events/     # Eventos de domínio do Dossiê 14, Seção 4
```
