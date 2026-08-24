# Como testar — PedidoMesa (2 min)

**URL:** https://pedidomesa.tech42.com.br  
**Local:** `make up` → http://localhost:3000 · API http://localhost:8000/docs

## Login demo

- Usuário: `demo`
- Senha: `demo123`
- As telas **Balcão** e **Cozinha** autenticam sozinhas via `/api/v1/auth/demo` (Bearer).

> Em produção o par vem de `DEMO_ESTABELECIMENTO_USER` / `DEMO_ESTABELECIMENTO_PASS` no `.env` da VPS (padrão do exemplo acima).

## Seed

Automático no startup da API (`seed_cardapio`) se o cardápio estiver vazio.

## Fluxo feliz

1. Abra https://pedidomesa.tech42.com.br/balcao → **criar mesa** (anote o token/QR).
2. No celular/aba anônima: `/m/<TOKEN>` → pedir itens do cardápio.
3. https://pedidomesa.tech42.com.br/cozinha → marcar pedido como pronto.
4. No balcão → fechar conta (pagamento **manual/demo**, plugável).

## Pagamento

Provedor manual — sem gateway real nesta demo.
