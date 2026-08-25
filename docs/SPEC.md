# PedidoMesa — SPEC (Salto UX 2026-08)

| Campo | Valor |
|:---|:---|
| Produto | PedidoMesa |
| Versão | **v0.3 — Salto UX** (substitui v0.2 como alvo de implementação) |
| Stack | Next.js App Router (`web/`) + FastAPI (`api/`) |
| Brand | `docs/BRAND_SYSTEM_DESIGNER.md` — chassis Tech42, voz boteco, tokens atuais |
| PRD | `docs/PRD.md` § Salto UX 2026-08 |
| Status | Spec do Salto UX — implementação na branch de trabalho |

---

## 0. Inventário atual (baseline)

### 0.1 Next.js — páginas existentes

| Rota | Arquivo | Hoje |
|:---|:---|:---|
| `/` | `web/app/page.tsx` | Landing marketing |
| `/balcao` | `web/app/balcao/page.tsx` | Lista/cria mesas, fecha conta; **auto `demoLogin`** |
| `/cozinha` | `web/app/cozinha/page.tsx` | Pedidos abertos; auto login |
| `/cardapio` | `web/app/cardapio/page.tsx` | Admin cardápio; auto login |
| `/m/[token]` | `web/app/m/[token]/page.tsx` | Cliente pede (público) |

### 0.2 API — prefixos existentes

| Prefixo | Métodos relevantes |
|:---|:---|
| `POST /api/v1/auth/demo` | Login demo silencioso |
| `/api/v1/mesas` | `GET`, `POST`, `GET /{id}`, `PATCH /{id}`, `DELETE /{id}`, `GET /por-token/{token}`, `POST /{id}/reabrir` |
| `/api/v1/cardapio` | `GET` público, `GET /admin`, `POST`, `PATCH /{id}`, `DELETE /{id}` |
| `/api/v1/pedidos` | `POST`, `GET /mesa/{token}`, `PATCH /{id}/status` |
| `/api/v1/cozinha` | `GET /abertos`, `POST /pedidos/{id}/pronto` |
| `/api/v1/conta` | `GET /mesa/{token}`, `POST /mesa/{token}/fechar` |
| `/api/v1/payments` | `GET /providers`, `POST /charge` |
| `/health`, `/api/v1/health` | Health |

### 0.3 Entidades atuais (SQLAlchemy)

- **Mesa:** `id`, `nome`, `qr_token`, `status` (`livre`\|`ocupada`\|`fechada`), `created_at`
- **CardapioItem:** `id`, `nome`, `descricao?`, `preco_centavos`, `ativo`, `created_at`
- **Pedido:** `id`, `mesa_id`, `cardapio_item_id?`, `nome_item`, `quantidade`, `preco_centavos`, `modo`, `cliente_nome?`, `status`, `created_at`

---

## 1. Chassis visual (obrigatório neste salto)

- Reusar tokens de `web/app/globals.css` e regras de `BRAND_SYSTEM_DESIGNER.md`.
- **Incremental:** novas telas no mesmo DNA (charcoal `#1C1410`, açafrão CTA `#E8A54B`, Fraunces + DM Sans).
- **Não** reescrever a marca do zero; **não** importar paleta de outro produto Tech42.
- Landing `/` permanece marketing; pós-login a “casa” é `/home`.
- Uma ação óbvia por tela; alvos ≥ 44px em cozinha/garçom/balcão.

---

## 2. Telas Next.js — novas e alteradas

### 2.1 Mapa alvo

| Rota | Tipo | Auth | Função |
|:---|:---|:---|:---|
| `/` | alterar | público | Landing; CTA principal → `/login` (secundário: como funciona). Remover qualquer deep-link que sugira “entrar sem senha” no balcão. |
| `/login` | **nova** | público | Formulário explícito usuário + senha. Sucesso → `/home`. |
| `/home` | **nova** | staff | Casa do dono: boas-vindas, 3–5 métricas resumo, atalhos (Mesas, Cardápio, Garçom, Cozinha, Dashboard, Settings). |
| `/dashboard` | **nova** | staff | Painel gerencial: mesmas métricas + lista curta (mesas abertas, últimos pedidos). |
| `/mesas` | **nova** (ou extrair de balcão) | staff | CRUD mesas + ações QR / reabrir / ir ao detalhe. |
| `/mesas/[id]/qr` | **nova** | staff | Tela de impressão: QR imagem grande + nome da mesa + URL curta. |
| `/balcao` | alterar | staff | Foco em **fechar conta** + visão rápida de mesas; exige login (sem auto-demo). Pode redirecionar CRUD pesado para `/mesas`. |
| `/garcom` | **nova** | staff | Fluxo J3: selecionar mesa → montar pedido → enviar → opcional marcar entregue. |
| `/cozinha` | alterar | staff | Login explícito; UI touch-friendly mantida. |
| `/cardapio` | alterar | staff | CRUD completo visível (criar, editar, ativar/desativar); login explícito. |
| `/pedidos` | **nova** | staff | Lista filtrável de pedidos (mesa, status, período do dia); alterar status; cancelar. |
| `/m/[token]` | alterar leve | público | Polimento UX; **sem** login; garantir estados vazio/erro/sucesso. |
| `/settings` | **SHOULD** | staff (dono) | Nome fantasia, mensagem rodapé, timezone display (America/Sao_Paulo). |
| `/settings/users` | **SHOULD** | staff (dono) | CRUD usuários locais do estabelecimento. |

**Guard de rota (web):** layout ou middleware client: rotas staff sem token válido → redirect `/login?next=…`.

### 2.2 Wireframes lógicos (conteúdo mínimo por tela)

#### `/login`
- Logo tipográfico PedidoMesa
- Campos: `usuario`, `senha`
- Botão único: **Entrar**
- Erro humano: “Usuário ou senha incorretos.”
- Sem “entrar como demo” automático; credenciais demo podem existir no seed, mas o humano digita.

#### `/home`
- Saudação + nome do estabelecimento (settings ou env `ESTABELECIMENTO_NOME`)
- Cards métricas (ver §4)
- Atalhos em grid: Mesas · Garçom · Cozinha · Cardápio · Pedidos · Dashboard
- Logout

#### `/dashboard`
- Métricas em destaque (mesmo payload de `/api/v1/metricas`)
- Tabela “Mesas agora” (nome, status, total aberto se ocupada)
- Tabela “Pedidos recentes” (últimos 20)

#### `/mesas`
- Lista: nome, status, botões Editar · QR · Reabrir · Excluir
- Form criar: `nome` (obrigatório)
- Form editar: `nome`, `status`
- Empty state: “Nenhuma mesa — crie a primeira.”

#### `/mesas/[id]/qr`
- QR code imagem (≥ 280px)
- Nome da mesa
- URL completa (copiar)
- Botões: **Baixar PNG** · **Imprimir** (`window.print` + CSS `@media print`)

#### `/garcom`
- Passo 1: grid de mesas (livre/ocupada; fechada só com reabrir)
- Passo 2: cardápio ativos + quantidade + modo + `cliente_nome` opcional
- Passo 3: “Enviar pedido” → `POST /api/v1/pedidos`
- Lista da mesa: status; botão **Marcar entregue** → `PATCH .../status`

#### `/pedidos`
- Filtros: status, mesa_id, busca texto item
- Ações: mudar status (select), cancelar
- Sem criar pedido “órfão” sem mesa (criação só via `/m/...` ou `/garcom`)

#### `/settings` (SHOULD)
- `nome_estabelecimento`, `mensagem_conta` (texto curto no fechamento)
- Salvar → `PATCH /api/v1/settings`

#### `/settings/users` (SHOULD)
- Lista users: `usuario`, `papel`, ativo
- Criar/editar/desativar

---

## 3. Auth — login real explícito (MUST)

### 3.1 Comportamento

1. Remover auto-chamada a `demoLogin()` no `useEffect` de balcão/cozinha/cardápio.
2. Nova tela `/login` chama API de login.
3. Token armazenado de forma única (recomendado: `localStorage` key `pm_access_token` **ou** cookie — escolher um e documentar no README; default sugerido: localStorage para manter simplicidade do MVP).
4. Todas as rotas staff enviam `Authorization: Bearer {token}`.
5. `401` → limpar token → `/login`.

### 3.2 Endpoints

| Método | Path | Auth | Body / resposta |
|:---|:---|:---|:---|
| `POST` | `/api/v1/auth/login` | público | In: `{ "usuario": str, "senha": str }` → Out: `{ "access_token": str, "token_type": "bearer", "papel": "dono"\|"garcom"\|"cozinha" }` |
| `GET` | `/api/v1/auth/me` | Bearer | `{ "usuario", "papel", "estabelecimento_nome" }` |
| `POST` | `/api/v1/auth/logout` | Bearer | `{ "ok": true }` (invalidação best-effort; se token for HMAC estático demo, logout só limpa client) |
| `POST` | `/api/v1/auth/demo` | público | **Depreciado para UI**; manter só para testes CI / compat — não usar nas páginas. |

### 3.3 Modelo mínimo (SHOULD users; MUST login funciona com seed)

**Opção A (MUST mínimo):** um usuário seed via env (`DEMO_ESTABELECIMENTO_USER` / `DEMO_ESTABELECIMENTO_PASS`) validado em `POST /login` (mesma lógica do demo, mas **explícita**).

**Opção B (SHOULD):** tabela `users`:

| Campo | Tipo | Notas |
|:---|:---|:---|
| `id` | int PK | |
| `usuario` | str unique | login |
| `senha_hash` | str | nunca plaintext |
| `papel` | enum | `dono`, `garcom`, `cozinha` |
| `ativo` | bool | default true |
| `created_at` | datetime | |

Endpoints SHOULD users:

| Método | Path |
|:---|:---|
| `GET` | `/api/v1/users` |
| `POST` | `/api/v1/users` |
| `PATCH` | `/api/v1/users/{id}` |
| `DELETE` | `/api/v1/users/{id}` | soft: `ativo=false` |

Seed: usuário `demo` / `demo123` papel `dono` (só se env padrão).

---

## 4. Métricas (MUST — 3 a 5)

### 4.1 Endpoint

`GET /api/v1/metricas` — Bearer staff.

Resposta:

```json
{
  "data_ref": "2026-08-24",
  "mesas_abertas": 4,
  "pedidos_pendentes": 7,
  "ticket_medio_centavos": 4850,
  "faturamento_hoje_centavos": 128900,
  "tempo_medio_preparo_segundos": 720
}
```

### 4.2 Definições

| Campo | Cálculo |
|:---|:---|
| `mesas_abertas` | count `Mesa.status == ocupada` |
| `pedidos_pendentes` | count `Pedido.status in (pendente, preparando)` |
| `faturamento_hoje_centavos` | soma `preco_centavos * quantidade` de pedidos **não cancelados** com `created_at` no dia civil America/Sao_Paulo **em mesas que fecharam hoje** **ou** (aceitável no MUST) todos não cancelados criados hoje — **fixar na implementação e testar**; preferência produto: **conta fechada hoje** |
| `ticket_medio_centavos` | `faturamento_hoje / max(1, mesas_fechadas_hoje)` |
| `tempo_medio_preparo_segundos` | média `(pronto_at - created_at)` se houver timestamp; **se não houver coluna**, omitir no MUST e entregar só 4 métricas **ou** adicionar `preparado_em` ao marcar pronto |

**MUST:** exibir **no mínimo 3**, **no máximo 5** no `/home` e `/dashboard`.  
Recomendado MUST: `mesas_abertas`, `pedidos_pendentes`, `faturamento_hoje_centavos`, `ticket_medio_centavos` (+ 5ª se `tempo_medio` estiver pronto).

---

## 5. CRUD — contratos

### 5.1 Mesas (API já existe — UI MUST completar)

| Ação | API | UI |
|:---|:---|:---|
| Listar | `GET /api/v1/mesas` | `/mesas`, `/balcao`, `/garcom` |
| Criar | `POST /api/v1/mesas` `{ "nome" }` | `/mesas` |
| Editar | `PATCH /api/v1/mesas/{id}` `{ "nome?", "status?" }` | `/mesas` |
| Excluir | `DELETE /api/v1/mesas/{id}` | `/mesas` (confirmar) |
| Reabrir | `POST /api/v1/mesas/{id}/reabrir` | `/mesas`, `/balcao` |
| Público | `GET /api/v1/mesas/por-token/{token}` | `/m/[token]` |

Campos mínimos UI: `nome`, `status`, link QR.

### 5.2 Cardápio / itens (API existe — UI MUST completa)

| Ação | API | UI |
|:---|:---|:---|
| Públicos ativos | `GET /api/v1/cardapio` | `/m/[token]`, `/garcom` |
| Admin todos | `GET /api/v1/cardapio/admin` | `/cardapio` |
| Criar | `POST /api/v1/cardapio` `{ nome, descricao?, preco_centavos }` | `/cardapio` |
| Editar | `PATCH /api/v1/cardapio/{id}` | `/cardapio` |
| Soft-delete | `DELETE /api/v1/cardapio/{id}` → `ativo=false` | `/cardapio` |

Campos mínimos: `nome`, `preco_centavos`, `descricao`, `ativo`.

### 5.3 Pedidos (estender API + UI)

| Ação | API | Notas |
|:---|:---|:---|
| Criar | `POST /api/v1/pedidos` | Já existe; usado por cliente e garçom |
| Por mesa | `GET /api/v1/pedidos/mesa/{token}` | Já existe |
| Status | `PATCH /api/v1/pedidos/{id}/status` | Já existe |
| **Listar staff** | `GET /api/v1/pedidos?status=&mesa_id=&limit=50` | **Novo** — Bearer |
| **Obter** | `GET /api/v1/pedidos/{id}` | **Novo** — Bearer |
| Cancelar | `PATCH .../status` com `cancelado` | UI botão Cancelar |

Body criar (campos mínimos): `mesa_token`, `cardapio_item_id` **ou** (`nome_item` + `preco_centavos`), `quantidade`, `modo`, `cliente_nome?`.

Ao criar pedido em mesa `livre` → API deve passar mesa para `ocupada` (se ainda não fizer — **garantir** neste salto).

---

## 6. QR real por mesa (MUST)

### 6.1 Conteúdo do QR

String absoluta:

```
{PUBLIC_WEB_URL}/m/{qr_token}
```

Ex.: `https://pedidomesa.tech42.com.br/m/AbCdEf...`  
`PUBLIC_WEB_URL` vem de env (web: `NEXT_PUBLIC_APP_URL`; api: `PUBLIC_WEB_URL`). Default local: `http://localhost:3000`.

### 6.2 Onde gerar

**Preferência produto:** gerar no **web** (client) com lib leve — ex. `qrcode` (npm) ou componente que renderiza canvas/SVG — para não depender de rota binária no primeiro corte.

**Alternativa API (também aceitável):**

| Método | Path | Out |
|:---|:---|:---|
| `GET` | `/api/v1/mesas/{id}/qr.png` | `image/png` (ex. lib Python `qrcode`) |
| `GET` | `/api/v1/mesas/{id}/qr` | JSON `{ "url": "...", "qr_token": "..." }` |

### 6.3 Spec visual

- ECC level M ou Q
- Quiet zone ≥ 4 módulos
- Tamanho tela impressão ≥ 280×280 px; download PNG ≥ 512×512
- Abaixo do QR: nome da mesa + URL em texto pequeno
- Cores: QR preto em fundo claro na área de impressão (contraste de scan); chrome da página segue brand escura fora da área print

### 6.4 Critérios de aceite QR

- [ ] Câmera iOS/Android abre a URL correta sem digitar
- [ ] Botão baixar PNG funciona
- [ ] Imprimir não corta o QR
- [ ] Token não é editável na UI de impressão

---

## 7. Fluxo garçom (MUST) — sequência API

1. `GET /api/v1/mesas` → escolher `mesa_id` / `qr_token`
2. Se status `fechada` → só `reabrir` ou bloquear
3. `GET /api/v1/cardapio` → montar linhas
4. Para cada item: `POST /api/v1/pedidos` com `mesa_token`, `cardapio_item_id`, `quantidade`, `modo`, `cliente_nome?`
5. Cozinha: `GET /api/v1/cozinha/abertos` / `POST .../pronto`
6. Garçom: `PATCH /api/v1/pedidos/{id}/status` → `entregue`
7. Fechar: `POST /api/v1/conta/mesa/{token}/fechar` (+ opcional charge manual)

---

## 8. Settings (SHOULD)

### 8.1 Entidade `EstabelecimentoSettings` (singleton no deploy single-tenant)

| Campo | Tipo | Default |
|:---|:---|:---|
| `nome_estabelecimento` | str(120) | `PedidoMesa` |
| `mensagem_conta` | str(280) | `Obrigado — volte sempre` |
| `updated_at` | datetime | |

| Método | Path |
|:---|:---|
| `GET` | `/api/v1/settings` |
| `PATCH` | `/api/v1/settings` |

---

## 9. Docs públicos — limpeza IA (MUST)

Varredura e remoção de menções a IA / agentes / MCP / LLM em peças voltadas a público ou onboarding:

- `README.md`
- `web/app/page.tsx` (copy)
- `docs/INDEX.md`, `docs/TESTE.md`, `docs/PRD.md`, `docs/SPEC.md` (este doc fala de agentes só em contexto interno de processo Tech42 — **evitar** na landing)
- Qualquer footer “powered by AI”

**Estado na emissão desta SPEC:** grep no repo não encontrou menções explícitas a IA — manter a régua no PR e no checklist de QA.

---

## 10. Pagamentos (WON'T real — manter)

- Provider `manual` permanece.
- `GET /api/v1/payments/providers` público.
- `POST /api/v1/payments/charge` Bearer.
- Sem Asaas/core gateway neste salto.
- UI: no fechar conta, confirmar “pagamento registrado (manual)” se chamar charge; senão só fechar mesa.

---

## 11. Docs API-ready (SHOULD)

- Garantir OpenAPI em `/docs` (FastAPI) com tags: `auth`, `mesas`, `cardapio`, `pedidos`, `cozinha`, `conta`, `metricas`, `settings`, `users`, `payments`.
- Atualizar `docs/TESTE.md` com fluxo login explícito + QR + garçom.
- Atualizar `docs/INDEX.md` apontando Salto UX.

---

## 12. Critérios de aceite

### MUST

- [ ] `/login` existe; balcão/cozinha/cardápio **não** logam sozinhos
- [ ] `POST /api/v1/auth/login` + `GET /api/v1/auth/me` funcionam com seed demo
- [ ] `/home` com atalhos + ≥ 3 métricas de `GET /api/v1/metricas`
- [ ] `/dashboard` mostra as métricas e listas curtas
- [ ] CRUD mesas na UI (`/mesas`) ligado à API existente
- [ ] CRUD cardápio na UI completo (criar/editar/desativar)
- [ ] `/pedidos` lista + altera status / cancela; `GET /api/v1/pedidos` staff
- [ ] `/mesas/[id]/qr` com QR imagem escaneável + baixar/imprimir
- [ ] `/garcom` fluxo J3 ponta a ponta
- [ ] `/m/[token]` continua público e usável
- [ ] Brand incremental (tokens existentes)
- [ ] Docs/peças públicas sem menção a IA
- [ ] `make ci` verde
- [ ] WON'T respeitado: sem payment real, sem multi-tenant, sem MCP, sem rewrite de brand

### SHOULD

- [ ] `/settings` + `GET/PATCH /api/v1/settings`
- [ ] `/settings/users` + CRUD `/api/v1/users`
- [ ] OpenAPI tags completas + TESTE.md atualizado

---

## 13. Ordem sugerida de implementação

1. Auth login explícito + guard de rotas web  
2. `/home` + `/api/v1/metricas` + `/dashboard`  
3. `/mesas` CRUD UI + `/mesas/[id]/qr` (QR real)  
4. Polir `/cardapio` CRUD + `/pedidos` + endpoint list  
5. `/garcom`  
6. Ajustar `/` e `/balcao` (CTAs / sem auto-login)  
7. SHOULD: settings + users  
8. Docs TESTE/INDEX + CI  

---

## 14. Histórico técnico (v0.2 — preservado)

### Cardápio
- Model `CardapioItem`; endpoints `/api/v1/cardapio` como no inventário §0.2
- Seed `seed_cardapio` no startup se vazio
- Pedidos com `cardapio_item_id` ignoram nome/preço livres do body

### Pagamentos plugáveis
- `PaymentProvider` ABC + `ManualProvider` apenas
- Sem Asaas no core

### Auth legado
- `issue_demo_token` / `require_estabelecimento` — evoluir para login explícito (§3) sem quebrar testes (adaptar `conftest`)

---

*Tech 42 LTDA — PedidoMesa SPEC v0.3 Salto UX. Implementação só após aprovação do CEO no PRD.*
