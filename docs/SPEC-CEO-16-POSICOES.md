# PedidoMesa — SPEC CEO 16 (posições + quitação)

| Campo | Valor |
|:---|:---|
| Produto | PedidoMesa |
| Escopo | 16 requisitos CEO — máximo funcional sem over-modelar |
| Baseline | Salto UX (login, home, QR, garçom, settings); Mesa só nome/status; Pedido modo + `cliente_nome`; auth seed `papel=dono` |
| Status | Spec de implementação — **sem commit de código neste doc** |
| Data | 2026-08-25 |

**Fases**

| Fase | Ship | Itens |
|:---|:---|:---|
| **F1** | Obrigatório (mesma PR) | 1–5, 6–9, **10**, 13+15 mínimos, **16** mínimo, balcão fecha parcial |
| **F1.5** | Stretch (mesma PR ou PR2) | 11, 12, 14 básicos + `TransferenciaSolicitacao` pending/approved |
| **F2** | Depois | Transferência com aprovação rica; comissões; RBAC fino; setores ricos |

---

## 0. Decisões travadas

1. **Posição = inteiro `1..N`** (`Mesa.capacidade = N`). **Sem** tabela `Posicao`, sem mapa visual, sem nome de cadeira.
2. **Pedido.posicoes**: `int[]` (vazio/`null` = coletivo da mesa; ≥1 = posições cobradas).
3. **Fechamento** com escopo `posicoes` \| `itens` \| `mesa` + taxa serviço em **bps** (`Settings.taxa_servico_bps`, default **1000** = 10%).
4. **F1 reatribuição**: garçom/`dono` move posições/itens **direto** (PATCH). Workflow de aprovação = **F2** (e stub F1.5).
5. **Taxa** = linha de serviço do bar (não % Tech42). Base = subtotal dos itens do escopo (taxa não se auto-aplica). Removível no fechamento (`aplicar_taxa: false`).
6. **Mesa libera** só com saldo quitado = 0 (todos itens não cancelados cobertos por fechamento(s)). Status: após quitação total → `fechada` (ou `livre` via reabrir/liberar explícito).
7. **Papéis F1**: `dono` = admin total; `garcom` = opera + **solicita** cancel/estorno/edit (admin aprova). `cozinha` permanece no painel de preparo.
8. **Pagamento cliente**: continua **manual/demo** (provider plugável).
9. **LGPD no QR**: gate — sem consentimento explícito, não cria pedido / não vincula celular.
10. **Brand**: trocar paleta marrom por harmonia light+dark; **não** reescrever brand do zero.

---

## 1. Modelo de dados (campos)

### 1.1 Alterações em entidades existentes

**Mesa**

| Campo | Tipo | Fase | Notas |
|:---|:---|:---|:---|
| `capacidade` | int ≥ 1 | F1 | N posições (cadeiras lógicas) |
| `setor` | str(40) nullable | F1.5 | Tag leve (`salao`, `varanda`…); sem planta |

**Pedido**

| Campo | Tipo | Fase | Notas |
|:---|:---|:---|:---|
| `posicoes` | `int[]` / JSON | F1 | Cada valor ∈ `1..capacidade`; vazio = coletivo |
| `quitado` | bool default false | F1 | true quando coberto por Fechamento |
| `fechamento_id` | FK nullable | F1 | Último fechamento que quitou o item |

**EstabelecimentoSettings**

| Campo | Tipo | Fase | Default |
|:---|:---|:---|:---|
| `taxa_servico_bps` | int | F1 | `1000` (10%) |
| `lgpd_texto_versao` | str(32) | F1 | ex. `v1-2026-08` |
| `lgpd_texto` | text | F1 | Texto exibido no QR (editável pelo dono) |

**User** (ou seed + tabela se ainda não existir)

| Campo | Tipo | Fase | Notas |
|:---|:---|:---|:---|
| `papel` | enum | F1 | `dono` \| `garcom` \| `cozinha` |
| `mesas_ids` | `int[]` nullable | F1.5 | Designação simples; `null`/`[]` = dono vê todas; garçom só as listadas (se config exigir) |
| `ativo` | bool | F1 | |

### 1.2 Novas entidades

**ClienteMesaSessao** (F1 — LGPD + reentrada)

| Campo | Tipo | Notas |
|:---|:---|:---|
| `id` | PK | |
| `mesa_id` | FK | |
| `nome` | str(80) | Apelido ok |
| `celular_e164` | str(20) | E.164; **não** logar plaintext em app logs |
| `celular_ult4` | char(4) | Display mascarado |
| `consent_aceito` | bool | Deve ser true |
| `consent_texto_versao` | str(32) | |
| `consent_at` | datetime UTC | |
| `device_token_hash` | str | Hash do token de device |
| `ativa` | bool | false na baixa / liberação da mesa |
| `created_at` | datetime | |

**Fechamento** (F1)

| Campo | Tipo | Notas |
|:---|:---|:---|
| `id` | PK | |
| `mesa_id` | FK | |
| `escopo` | enum | `posicoes` \| `itens` \| `mesa` |
| `posicoes` | `int[]` nullable | Se escopo=`posicoes` |
| `pedido_ids` | `int[]` nullable | Se escopo=`itens` |
| `subtotal_centavos` | int | Itens do escopo ainda não quitados |
| `taxa_bps_aplicada` | int | Snapshot (0 se `aplicar_taxa=false`) |
| `taxa_centavos` | int | `round(subtotal * bps / 10000)` |
| `total_centavos` | int | subtotal + taxa |
| `pagamento_modo` | str | `manual` (MVP) |
| `criado_por_user_id` | FK nullable | |
| `created_at` | datetime | |

**SolicitacaoAcao** (F1 — item 15 mínimo)

| Campo | Tipo | Notas |
|:---|:---|:---|
| `id` | PK | |
| `tipo` | enum | `cancelar_pedido` \| `estorno` \| `editar_pedido` |
| `pedido_id` | FK nullable | |
| `payload` | JSON | Diff / motivo |
| `status` | enum | `pending` \| `approved` \| `rejected` |
| `solicitante_id` | FK | garçom |
| `aprovador_id` | FK nullable | dono |
| `created_at` / `resolved_at` | datetime | |

**TransferenciaSolicitacao** (F1.5 stub → F2 rico)

| Campo | Tipo | Notas |
|:---|:---|:---|
| `id` | PK | |
| `mesa_origem_id` | FK | |
| `mesa_destino_id` | FK | mesma mesa OK (posição↔posição) |
| `pedido_ids` | `int[]` | Só não quitados |
| `posicoes_origem` / `posicoes_destino` | `int[]` nullable | |
| `status` | enum | `pending` \| `approved` \| `rejected` |
| `solicitante_papel` | str | `cliente` \| `garcom` |
| `aprovador_id` | FK nullable | |
| `created_at` / `resolved_at` | datetime | |

**F1 vs F1.5 transferência:** F1 = `PATCH` direto de reatribuição por staff. F1.5 = entidade com pending/approved (cliente ou garçom solicita; dono/garçom aprova conforme regra). F2 = política completa + auditoria UI.

---

## 2. Endpoints novos / alterados

### 2.1 Mesas

| Método | Path | Fase | Mudança |
|:---|:---|:---|:---|
| `POST/PATCH` | `/api/v1/mesas` | F1 | Body: `capacidade` (≥1); F1.5: `setor?` |
| `GET` | `/api/v1/mesas` | F1.5 | Query: `setor=`, `status=`, ordenação lista |

### 2.2 Pedidos

| Método | Path | Fase | Mudança |
|:---|:---|:---|:---|
| `POST` | `/api/v1/pedidos` | F1 | `posicoes?: int[]`; validar ⊆ 1..capacidade |
| `PATCH` | `/api/v1/pedidos/{id}/posicoes` | F1 | Reatribuição direta (staff) |
| `GET` | `/api/v1/pedidos` | F1 | Filtros: `quitado=`, `posicao=` |

### 2.3 Conta / fechamento

| Método | Path | Fase | Notas |
|:---|:---|:---|:---|
| `GET` | `/api/v1/conta/mesa/{token}` | F1 | + breakdown por posição + `saldo_aberto_centavos` + `taxa_bps` sugerida |
| `POST` | `/api/v1/conta/mesa/{token}/fechar` | F1 | **Breaking soft:** body opcional abaixo; sem body = escopo `mesa` (compat) |
| `POST` | `/api/v1/conta/mesa/{token}/liberar` | F1 | Só se saldo aberto = 0; encerra sessões cliente |

**Body fechar (F1):**

```json
{
  "escopo": "posicoes",
  "posicoes": [1, 2],
  "pedido_ids": null,
  "aplicar_taxa": true
}
```

Resposta: totais + `fechamento_id` + `mesa_saldo_aberto_centavos` + `mesa_status`.

### 2.4 Cliente QR / LGPD

| Método | Path | Fase | Auth |
|:---|:---|:---|:---|
| `POST` | `/api/v1/cliente/mesa/{token}/sessao` | F1 | público | nome, celular, consent, device_token |
| `POST` | `/api/v1/cliente/reentrar` | F1 | público | celular + device_token → sessão ativa |
| `GET` | `/api/v1/cliente/mesa/{token}/meus-pedidos` | F1 | header device/sessão |
| `POST` | `/api/v1/cliente/mesa/{token}/transferencia` | F1.5 | cria `TransferenciaSolicitacao` pending |

### 2.5 Settings / users / solicitações

| Método | Path | Fase |
|:---|:---|:---|
| `GET/PATCH` | `/api/v1/settings` | F1 — inclui `taxa_servico_bps`, textos LGPD |
| `GET/POST/PATCH` | `/api/v1/users` | F1 — papéis; F1.5 — `mesas_ids` |
| `GET/POST` | `/api/v1/solicitacoes` | F1 |
| `POST` | `/api/v1/solicitacoes/{id}/aprovar` \| `/rejeitar` | F1 — só `dono` |
| `GET/POST` | `/api/v1/transferencias` | F1.5 |
| `POST` | `/api/v1/transferencias/{id}/aprovar` \| `/rejeitar` | F1.5 |

### 2.6 Métricas / home / dashboard

| Método | Path | Fase | Notas |
|:---|:---|:---|:---|
| `GET` | `/api/v1/metricas` | — | já existe |
| UI home cards | `/mesas?status=ocupada`, `/pedidos?status=pendente,preparando`, `/dashboard?foco=faturamento` | F1 | navegação (não gráfico) |
| `GET` | `/api/v1/metricas/detalhe?kpi=&de=&ate=` | F1.5 | drill básico lista |

---

## 3. Regras de quitação

1. Item **quitado** não entra em novo fechamento.
2. Escopo `posicoes`: quita pedidos cujo `posicoes` intersecta o conjunto **e** ainda não quitados. Pedido coletivo (`posicoes` vazio) **não** entra em escopo `posicoes` — só em `mesa` ou via `itens`.
3. Escopo `itens`: quita exatamente `pedido_ids` (não quitados, mesma mesa).
4. Escopo `mesa`: quita **todos** não quitados / não cancelados da mesa.
5. `taxa_centavos = floor((subtotal_centavos * taxa_bps_aplicada) / 10000)` (ou banker's round documentado nos testes; default **floor**).
6. Fechamento parcial: mesa permanece `ocupada` enquanto `saldo_aberto > 0`.
7. Liberar / fechar total: `saldo_aberto == 0` → `status=fechada`; sessões cliente `ativa=false`; QR pronto a novo ciclo após `reabrir` (capacidade preservada).
8. Cancelado nunca soma em subtotal nem exige quitação.
9. Garçom **não** cancela/estorna/edita preço direto (F1): cria `SolicitacaoAcao`. Dono executa na aprovação.
10. Reatribuição F1 (`PATCH posicoes`) só em itens não quitados.

---

## 4. LGPD — campos de consentimento

**Coletar:** `nome`, `celular_e164`, `consent_aceito`, `consent_texto_versao`, `consent_at`, vínculo `mesa_id`, `device_token` (hash), posições escolhidas, pedidos.

**Não coletar (MVP):** CPF, e-mail, GPS, foto, cartão, biometria, marketing.

**Persistir evidência:** versão do texto, timestamp UTC, resultado `aceito`, canal `qr_mesa`, `celular_ult4` (+ hash interno se necessário). **Zero PII em logs de aplicação.**

**UI gate:** checkbox desmarcado; sem consentimento → não `POST /pedidos` nem vincula sessão.

**Reentrada:** celular + `device_token` do mesmo device; só se mesa aberta e sessão ativa; rate-limit; cutoff na liberação. Sem OTP no MVP (risco residual aceito e documentado).

**Retenção (MUST produto):** PII até baixa + 24–72h → anonimizar; evidência de consentimento retenção longa (prova); sem marketing.

---

## 5. Critérios de aceite por item (GWT)

Legenda: **F1** ship · **F1.5** stretch · **F2** depois.

### Item 1 — Nova paleta light+dark · **F1**

- **Given** landing e app staff abertos  
- **When** usuário alterna Claro/Escuro  
- **Then** tokens não são a paleta marrom legada; contraste legível nos dois temas  

### Item 2 — Tema = preferência do sistema · **F1**

- **Given** visitante sem override salvo  
- **When** abre o site  
- **Then** tema inicial segue `prefers-color-scheme`; override manual persiste e prevalece  

### Item 3 — Ícone (?) “Como funciona” · **F1**

- **Given** landing  
- **When** clica/foca no (?)  
- **Then** tooltip ou painel explica o fluxo em 1 tela  

### Item 4 — Copy preço · **F1**

- **Given** seção de preço na landing  
- **When** lê o texto  
- **Then** comunica mensalidade fixa sem % por pedido; copy “Preço que cabe no caixa” revisada (clara, sem jargão)  

### Item 5 — Botão “Como funciona” · **F1**

- **Given** CTA “Como funciona”  
- **When** clica  
- **Then** rola/abre a seção correta (não 404 / âncora morta)  

### Item 6 — Data home dd/mm/aaaa · **F1**

- **Given** usuário logado em `/home`  
- **When** vê a data de referência  
- **Then** formato `dd/mm/aaaa` (America/Sao_Paulo)  

### Item 7 — Card Mesas abertas · **F1**

- **Given** `/home` com métrica mesas abertas  
- **When** clica o card  
- **Then** abre lista/filtro de mesas ocupadas (não noop)  

### Item 8 — Card Pedidos pendentes · **F1**

- **Given** `/home`  
- **When** clica Pedidos pendentes  
- **Then** abre `/pedidos` (ou equivalente) filtrado pendente/preparando  

### Item 9 — Card Faturamento hoje · **F1**

- **Given** `/home`  
- **When** clica Faturamento hoje  
- **Then** abre dashboard/lista do dia com foco faturamento  

### Item 10 — Núcleo posições + 10% + quitação · **F1**

- **Given** mesa com `capacidade=4`  
- **When** cliente/garçom lança pedidos nas posições 1 e 2 e balcão fecha escopo `posicoes:[1]` com taxa  
- **Then** posição 1 quita (subtotal + 10% bps); mesa segue ocupada; saldo = posições restantes; só com saldo 0 a mesa libera  

- **Given** item não quitado  
- **When** garçom faz `PATCH` de posições (reatribuição direta)  
- **Then** totais por posição atualizam sem workflow de aprovação  

### Item 11 — Balcão lista + filtros · **F1.5**

- **Given** várias mesas com `setor` opcional  
- **When** abre `/balcao`  
- **Then** vê **lista** (não só cards) com filtros básicos (status/setor/nome); setor vazio = todas  

### Item 12 — Designação garçom · **F1.5**

- **Given** user `garcom` com `mesas_ids=[1,2]`  
- **When** abre `/garcom`  
- **Then** só opera mesas 1 e 2 (dono vê todas). Comissões **fora** (F2)  

### Item 13 — Admin/dono acesso total · **F1**

- **Given** user `dono`  
- **When** edita/exclui/estorna/aplica desconto via aprovação, CRUD users, settings, fecha qualquer escopo  
- **Then** todas as ações sensíveis disponíveis (sem bloqueio de papel)  

### Item 14 — Dashboard drill básico · **F1.5**

- **Given** `/dashboard`  
- **When** clica um KPI  
- **Then** vê lista detalhe do dia (≥1 dimensão: mesa ou pedido); gráficos ricos = **F2**  

### Item 15 — Garçom só solicita · **F1**

- **Given** user `garcom` tenta cancelar/estornar/editar  
- **When** confirma a ação  
- **Then** cria `SolicitacaoAcao` `pending`; efeito só após `dono` aprovar  

### Item 16 — QR + LGPD mínimo · **F1**

- **Given** `/m/{token}` sem sessão  
- **When** tenta pedir sem consentimento  
- **Then** API/UI bloqueiam  

- **Given** nome + celular + checkbox LGPD  
- **When** confirma e escolhe posições ⊆ capacidade  
- **Then** sessão ativa; lista pedidos; reentrada no mesmo device por celular+token até liberação  

### Transferência · **F1.5** (stub) / **F2** (rico)

- **F1.5 Given** cliente/staff solicita mover itens não quitados  
- **When** cria transferência  
- **Then** status `pending` até aprovar → aplica destino; `rejected` não move  

- **F2:** regras de papel, auditoria completa, UI fila, multi-mesa avançada  

---

## 6. Matriz resumo 1–16

| # | Título | Fase ship | Notas |
|:---:|:---|:---|:---|
| 1 | Paleta light+dark | F1 | |
| 2 | Tema system + override | F1 | |
| 3 | (?) Como funciona | F1 | |
| 4 | Copy preço | F1 | |
| 5 | Botão Como funciona | F1 | |
| 6 | Data dd/mm/aaaa | F1 | |
| 7 | Card mesas | F1 | |
| 8 | Card pedidos | F1 | |
| 9 | Card faturamento | F1 | |
| 10 | Posições + taxa + quitação | F1 | núcleo |
| 11 | Balcão lista/filtros | F1.5 | `setor` string |
| 12 | Designação mesas | F1.5 | `mesas_ids`; sem comissão |
| 13 | Dono total | F1 | |
| 14 | Drill dashboard | F1.5 | lista, não BI |
| 15 | Garçom solicita | F1 | |
| 16 | QR LGPD + reentrada | F1 | mínimo |

---

## 7. WON'T (este ciclo)

- Gateway Pix/cartão real  
- Tabela `Posicao` / mapa de cadeiras  
- Multi-tenant / white-label  
- Comissões de garçom (além de campo futuro)  
- OTP no QR  
- % Tech42 sobre pedido  
- Brand rewrite zero / MCP / app nativo  

---

## 8. Ordem de implementação sugerida (1 PR)

1. Tema/landing/copy (1–5) + data/cards (6–9)  
2. Settings `taxa_servico_bps` + `capacidade` + `posicoes` no Pedido  
3. Fechamento parcial + liberar  
4. Sessão LGPD + gate QR (16)  
5. Papéis dono/garçom + `SolicitacaoAcao` (13+15)  
6. Stretch: balcão lista (11), `mesas_ids` (12), drill (14), `TransferenciaSolicitacao`  

**Corte se apertar:** 14 → 12 → 11 → transferência F1.5 (manter reatribuição direta F1).

---

*Tech 42 LTDA — PedidoMesa SPEC CEO-16. Implementação após alinhamento com esta spec; testes manuais em `docs/TESTE.md` § CEO 16.*
