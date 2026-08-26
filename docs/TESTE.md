# Como testar — PedidoMesa (Salto UX + CEO 16)

**URL:** https://pedidomesa.tech42.com.br  
**Local:** `make up` → http://localhost:3000 · API http://localhost:8000/docs  
**Branch PR #16:** `claude/ceo-polimento-posicoes-20260825`

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
4. No celular: LGPD → posições → pedir itens; ver **meus pedidos**.
5. `/garcom` ou `/cozinha`: acompanhar / marcar pronto / entregue.
6. `/balcao`: fechar posição parcial (+ taxa) → liberar só com saldo 0.
7. `/dashboard` e `/pedidos` para visão gerencial.
8. `/settings`: taxa bps, users/garçons, aprovar solicitações/transferências.

## API

- OpenAPI interativo: `/docs` (tags: auth, mesas, cardapio, pedidos, cozinha, conta, cliente, solicitacoes, transferencias, users, metricas, settings, payments).
- Integrações futuras: a API é HTTP/JSON estável; ver nota em `docs/API_READY.md`.

## Pagamento

Provedor manual — sem gateway real neste salto.

- `GET /api/v1/payments/providers` — público.
- `POST /api/v1/payments/charge` — exige Bearer do estabelecimento (stub; **não** marca `quitado` — quitação é só via `/conta/.../fechar`).

## CEO 16 — cobertura UI/API vs F2

Spec: `docs/SPEC-CEO-16-POSICOES.md`.  
**CI API (2026-08-25):** `api/.venv/bin/python -m pytest -q` → **35 passed**.

Legenda: **API** / **UI** = entregue nesta PR · **F2** = fora do ship · smoke = validar à mão em staging/prod.

### F1 (must) — ship PR #16

| # | Item | API | UI | Smoke |
|:---:|:---|:---:|:---:|:---|
| 1–5 | Landing: tema system, paleta ardósia, (?), copy mensalidade, CTA Como funciona | — | ✓ (Fase A / #15 + branch) | [ ] tema claro/escuro + âncora |
| 6–9 | Home `dd/mm/aaaa`; cards Mesas / Pedidos / Faturamento | — | ✓ (Mesas→`/mesas?status=ocupada`; Pedidos→`/cozinha`; Fat.→`/dashboard?foco=hoje`) | [ ] cards clicáveis |
| 10 | Capacidade; `posicoes[]`; fechar parcial + taxa bps; liberar saldo 0; PATCH posições | ✓ | ✓ balcão + garçom | [ ] fechar pos.1 +10%; liberar só saldo 0 |
| 13 | `dono` acesso total (settings/users/fechar) | ✓ (papéis demo) | ✓ | [ ] login `dono` |
| 15 | Garçom solicita cancel/estorno; dono aprova | ✓ | ✓ settings + garçom | [ ] fluxo solicitação |
| 16 | QR LGPD gate; sessão; meus-pedidos + `cliente_sessao_id`; reentrada + rate-limit | ✓ | ✓ `/m/{token}` | [ ] sem consent → bloqueia; reabre no device |

### F1.5 (stretch) — presente nesta PR (mínimo)

| # | Item | API | UI | Smoke |
|:---:|:---|:---:|:---:|:---|
| 11 | Balcão lista + filtro `setor` | ✓ (`setor` na mesa) | ✓ `/balcao` | [ ] lista + filtro setor |
| 12 | Garçom só `mesas_ids` | ✓ | ✓ settings CRUD + filtro `/garcom` | [ ] user garçom restrito |
| 14 | Dashboard drill KPI → lista do dia | parcial (métricas existentes) | ✓ clique KPI / mesa | [ ] drill básico |
| — | Transferência pending → aprovar/rejeitar | ✓ stub | ✓ settings + garçom | [ ] move só após approve |

### F2 — não cobrir neste merge (esperado)

- Transferência rica (auditoria completa, fila avançada, multi-mesa política fina)
- Comissões de garçom
- RBAC fino além de `dono`/`garcom`/`cozinha` demo
- Setores ricos / planta / tabela `Posicao`
- Gateway Pix/cartão real; OTP no QR
- Gráficos BI; retenção PII automatizada 24–72h (hoje: anonimiza só no `liberar`)

### Fora do smoke (WON'T ciclo)

Gateway real, OTP, mapa de cadeiras, multi-tenant, % Tech42 sobre pedido.

## Ambiente nesta entrega (2026-08-25)

- **PR #16** (`claude/ceo-polimento-posicoes-20260825`): F1 + F1.5 mínimo (API+UI) — ver matriz acima.
- **GitHub `main`:** Fase A (#15) já mergeada; F1 entra após merge deste PR.
- **Produção `*.tech42.com.br`:** pode estar no build antigo enquanto secrets `VPS_HOST`/`VPS_USER`/`VPS_SSH_KEY` não estiverem no GitHub Actions.
- **Como testar agora sem Docker Desktop:** na pasta do produto, API com venv (`make test` / pytest em `api/`) e `cd web && npm run dev` (aponta `NEXT_PUBLIC_API_URL` se a API não estiver em :8000).
