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


## Ambiente nesta entrega (2026-08-25)

- **GitHub `main` (após merge desta PR):** rotas Salto UX + light/dark + gaps desta missão.
- **Produção `*.tech42.com.br`:** ainda pode estar no build antigo enquanto secrets `VPS_HOST`/`VPS_USER`/`VPS_SSH_KEY` não estiverem no GitHub Actions. Sem esses secrets o CD não atualiza a VPS.
- **Como testar agora sem Docker Desktop:** na pasta do produto, API com venv (`make test` valida API) e `cd web && npm run dev` (aponta `NEXT_PUBLIC_API_URL` se a API não estiver em :8000).
