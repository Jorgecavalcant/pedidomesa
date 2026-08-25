# PRD — PedidoMesa

| Campo | Valor |
|:---|:---|
| Produto | PedidoMesa |
| Dono | Tech42 (CPO) |
| Repo | `~/TECH42/PROJETOS/pedidomesa` · GitHub `Jorgecavalcant/pedidomesa` |
| URL | https://pedidomesa.tech42.com.br |
| Data | 2026-08-24 |
| Status | **Salto UX 2026-08** — PRD pronto para SPEC / implementação |
| Nota CEO (baseline) | 03/10 — exige salto massivo de experiência |

---

## 1. Problema

Em bar, boteco e food truck, pedir e fechar conta ainda depende demais de garçom e papel. Fila, erro de pedido e demora no fechamento.

**Gap atual (pós-MVP scaffold):** o produto já sobe com balcão, cozinha, cardápio e mesa por token — mas a nota do CEO é 03/10 porque a experiência ainda parece demo técnica: login silencioso, QR que é só link/texto, sem casa do dono, sem métricas, sem fluxo de garçom e CRUD incompleto na UI.

## 2. Solução (visão)

1. Cada mesa tem um **QR code real** (imagem imprimível) que abre o pedido no celular.
2. Cliente pede sozinho **ou** o garçom registra o pedido pela mesa.
3. Cozinha/balcão vê os pedidos em painéis claros.
4. Dono entra com **login explícito**, vê **home + painel gerencial** com 3–5 métricas e administra mesas, itens e pedidos.
5. O bar paga à Tech42 uma **mensalidade fixa** (não percentual por pedido). Pagamento do cliente na mesa permanece **manual/demo** neste salto.

## 3. Para quem (personas — Salto UX)

### 3.1 Dono (estabelecimento)

- **Quem:** dono ou gerente do boteco.
- **Job:** “Quando abro o sistema no início do expediente, quero ver se a casa está rodando e controlar mesas/cardápio, para não depender de planilha.”
- **Precisa:** login claro; home pós-login; métricas do dia; CRUD de mesas, itens e pedidos; settings básicos (SHOULD).

### 3.2 Garçom / balcão

- **Quem:** quem atende mesa e fecha conta.
- **Job:** “Quando o cliente não quer usar o celular (ou pediu no balcão), quero registrar o pedido na mesa certa em segundos.”
- **Precisa:** fluxo garçom (escolher mesa → itens → enviar); ver status; fechar conta; imprimir/mostrar QR da mesa.

### 3.3 Cliente na mesa

- **Quem:** pessoa sentada, sem instalar app.
- **Job:** “Quando aponto o celular no QR da mesa, quero pedir e acompanhar o que pedi, sem criar conta.”
- **Precisa:** `/m/[token]` rápido, cardápio claro, pedido individual/coletivo, ver conta aberta. **Sem login.**

## 4. Fora deste salto (WON'T)

| Item | Motivo |
|:---|:---|
| MCP completo | Fora do escopo de produto cliente |
| Payment real (Pix/cartão gateway) | Mantém provider `manual`; plugável fica para depois |
| Multi-tenant completo | Um estabelecimento por deploy neste marco |
| Brand rewrite do zero | Chassis Tech42 + identidade PedidoMesa incremental (calor de boteco) |

## 5. Modelo de receita

Assinatura mensal fixa por estabelecimento. **Sem % sobre o valor do pedido.**

---

## 6. Salto UX 2026-08

> Seção de produto deste marco. Substitui a ambição do “MVP scaffold” como definição de “pronto para nota do CEO”.

### 6.1 Objetivo de negócio

Tirar o PedidoMesa de “demo técnica” para **produto usável numa noite de boteco real**, com identidade visual coerente e fluxos completos para dono, garçom e cliente.

### 6.2 Priorização (conselho)

| Prioridade | Itens |
|:---|:---|
| **MUST** | Login real explícito; CRUD mesas / itens / pedidos na UI; painel dono + home; 3–5 métricas; QR **real** por mesa; fluxo garçom; limpar menções a IA em docs/peças públicas |
| **SHOULD** | Settings + users; brand incremental; docs API-ready (OpenAPI/README de integração) |
| **WON'T** | MCP completo; payment real; multi-tenant; brand rewrite zero |

### 6.3 User journeys

#### J1 — Dono abre o expediente

1. Acessa `/login` → digita usuário/senha (sem auto-login silencioso).
2. Cai em `/home` (casa do dono): atalhos + 3–5 métricas do dia.
3. Vai a `/mesas` (ou balcão enriquecido), cria/edita mesas, imprime QR.
4. Ajusta cardápio em `/cardapio` (CRUD completo).
5. Consulta `/dashboard` se quiser detalhe das métricas.

#### J2 — Cliente pede pelo QR

1. Aponta a câmera no QR impresso da mesa.
2. Abre `https://pedidomesa.tech42.com.br/m/{token}`.
3. Escolhe itens, modo individual/coletivo, envia.
4. Vê confirmação e pode consultar a conta da mesa.
5. Não cria conta; não vê telas de staff.

#### J3 — Garçom registra pedido

1. Logado → `/garcom`.
2. Seleciona mesa ocupada/livre (se livre, ocupa).
3. Adiciona itens do cardápio em nome do cliente (opcional `cliente_nome`).
4. Pedido aparece na cozinha; garçom pode marcar entregue quando levar à mesa.
5. No fim, balcão/garçom fecha a conta (pagamento manual).

#### J4 — Cozinha prepara

1. Abre `/cozinha` (autenticado).
2. Lista pedidos pendentes/preparando.
3. Marca **pronto**.
4. Garçom/balcão conclui entrega.

### 6.4 Métricas de sucesso (produto)

| # | Métrica | Como medir | Meta deste salto |
|:---|:---|:---|:---|
| 1 | Tempo até primeiro pedido útil (dono) | Do login até criar mesa + ver QR | ≤ 3 min em teste guiado |
| 2 | QR escaneável de verdade | Câmera do celular abre `/m/{token}` sem digitar URL | 100% nos testes de aceite |
| 3 | Completude do CRUD na UI | Criar/editar/desativar mesas, itens; listar/alterar status/cancelar pedidos | Todos os MUST cobertos |
| 4 | Nota subjetiva CEO (experiência) | Avaliação pós-demo do salto | ≥ 7/10 |
| 5 | Zero menção a IA em peça pública | Varredura README, landing, docs INDEX/TESTE/PRD público | 0 ocorrências |

**North Star operacional (dia a dia do boteco):** % de mesas que fecham a conta no sistema sem papel paralelo — baseline a medir após piloto; não bloqueia o MUST.

### 6.5 Regras de negócio

1. Cliente na mesa **nunca** autentica.
2. Staff (dono, garçom, cozinha) **sempre** passa por `/login` explícito; token Bearer em sessão (localStorage ou cookie httpOnly — decisão na SPEC).
3. Um `qr_token` por mesa; URL canônica = `{PUBLIC_WEB_URL}/m/{qr_token}`.
4. Pedido com `cardapio_item_id` herda nome/preço do cardápio; item inativo não pode ser pedido.
5. Fechar conta marca mesa `fechada` e pedidos não cancelados como `entregue` (comportamento atual preservado).
6. Pagamento do cliente: só provider `manual` neste salto.
7. Textos públicos: voz boteco; **proibido** falar de IA, agentes, MCP ou “inteligência artificial” em README, landing e docs voltados a cliente.

### 6.6 Checklist LGPD / compliance

- [x] Cliente na mesa: coleta mínima (`cliente_nome` opcional) — sem CPF, e-mail ou telefone neste salto.
- [x] Sem PII em logs de aplicação.
- [x] Credenciais só em `.env` (nunca no repo).
- [x] Produto é software de pedidos — **não** consultoria financeira (CVM 175 N/A ao domínio, mas tom comercial sem promessa de “retorno”).
- [ ] SHOULD users: papéis mínimos (`dono` \| `garcom` \| `cozinha`) sem expor dados além de login operacional.

### 6.7 Fora do escopo (explícito — Salto UX)

- Gateway Pix/cartão real
- Multi-estabelecimento / white-label
- App nativo
- Impressora térmica integrada
- Fotos avançadas / categorias ricas no cardápio
- Relatório financeiro fiscal / contábil
- MCP / integrações de agentes

### 6.8 Dependências

- Stack atual: Next.js (`web/`) + FastAPI (`api/`) + Docker Compose.
- Brand: `docs/BRAND_SYSTEM_DESIGNER.md` (Fraunces + DM Sans; charcoal/açafrão; calor boteco) — **evolução incremental**, não redesign zero.
- Implementação: Implementação segue a SPEC após aprovação do CEO.

### 6.9 Critérios de “pronto” do salto (aceite produto)

1. Login explícito obrigatório para `/home`, `/dashboard`, `/balcao`, `/cozinha`, `/cardapio`, `/garcom`, `/mesas` (e settings/users se feitos).
2. Home do dono com atalhos + métricas.
3. CRUD usable de mesas, itens e pedidos.
4. QR real (imagem) por mesa, imprimível/baixável.
5. Fluxo garçom ponta a ponta (J3).
6. Docs públicos sem menção a IA.
7. `make ci` verde após implementação.

---

## 7. Histórico — MVP scaffold (mantido como baseline)

Critérios originais do scaffold (ainda válidos como piso técnico):

- Cliente pede com o token da mesa
- Cozinha marca pedido como pronto
- Balcão fecha a conta e a mesa fica disponível de novo
- Tudo sobe com `make up` e testes passam com `make ci`

**Inventário de rotas atuais (antes do salto):**

| Camada | Rotas / prefixos |
|:---|:---|
| Next.js | `/`, `/balcao`, `/cozinha`, `/cardapio`, `/m/[token]` |
| API | `/api/v1/auth/demo`, `/mesas`, `/cardapio`, `/pedidos`, `/cozinha`, `/conta`, `/payments` |

O salto **não apaga** esses fluxos — os eleva com login real, home, métricas, QR imagem e garçom.

---

## 8. Aprovação

| Papel | Status |
|:---|:---|
| CPO (diretor-produto) | PRD emitido 2026-08-24 |
| CEO | Pendente de leitura/aprovação antes de código |
| CTO | Implementa conforme SPEC aprovada |

**Próximo passo único:** CEO aprova este PRD → implementação segue `docs/SPEC.md` (Salto UX 2026-08).
