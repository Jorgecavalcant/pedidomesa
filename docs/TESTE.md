# Como testar — PedidoMesa (Salto UX)

**URL:** https://pedidomesa.tech42.com.br  
**Local:** `make up` → http://localhost:3000 · API http://localhost:8000/docs

## Credenciais (login explícito)

| Campo | Valor padrão |
|:---|:---|
| Usuário | `demo` |
| Senha | `demo123` |

Em produção: `DEMO_ESTABELECIMENTO_USER` / `DEMO_ESTABELECIMENTO_PASS` no `.env`.

**Importante:** balcão, cozinha, cardápio, mesas, garçom e home **não** logam sozinhos. Entre em `/login`.

## Seed

- Cardápio: automático no startup se vazio.
- Settings: criados no primeiro `GET /api/v1/settings`.

## Roteiro UX (aceite)

1. Abra `/login` → digite usuário/senha → cai em `/home`.
2. Em `/home`, confira ≥3 métricas e atalhos.
3. `/mesas` → criar mesa → abrir **QR** → baixar PNG / imprimir → escanear no celular (`/m/{token}`).
4. No celular: pedir itens do cardápio.
5. `/garcom` ou `/cozinha`: acompanhar / marcar pronto / entregue.
6. `/balcao` ou garçom: fechar conta (pagamento **manual/demo**).
7. `/dashboard` e `/pedidos` para visão gerencial.
8. `/settings` (opcional): nome da casa + mensagem da conta.

## API

- OpenAPI interativo: `/docs` (tags: auth, mesas, cardapio, pedidos, cozinha, conta, metricas, settings, payments).
- Integrações futuras: a API é HTTP/JSON estável; ver nota em `docs/API_READY.md`.

## Pagamento

Provedor manual — sem gateway real neste salto.

- `GET /api/v1/payments/providers` — público.
- `POST /api/v1/payments/charge` — exige Bearer do estabelecimento.
