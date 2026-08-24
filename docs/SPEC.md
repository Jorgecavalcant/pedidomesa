# PedidoMesa — SPEC (v0.2)

## Visão geral
MVP de pedidos por QR code para bares/restaurante. FastAPI + Next.js.

## Cardápio (novo em v0.2)
- Model `CardapioItem`: id, nome, descricao?, preco_centavos, ativo, created_at.
- Endpoints `/api/v1/cardapio`:
  - `GET /` público (somente ativos)
  - `GET /admin` Bearer demo (todos, via `require_estabelecimento`)
  - `POST /` Bearer criar
  - `PATCH /{id}` Bearer atualizar (inclui ativar/desativar)
  - `DELETE /{id}` Bearer → soft-delete (`ativo=false`)
- Seed automático no startup (`seed_cardapio` em `main.py`) se tabela vazia
  (6 itens típicos de bar/restaurante).
- Pedidos aceitam `cardapio_item_id` opcional; quando presente, `nome_item` e
  `preco_centavos` são preenchidos a partir do cardápio e **valores livres do
  body são ignorados**. Itens inativos/inexistentes retornam 400.
- Sem `cardapio_item_id`, mantém-se o fluxo legado (nome_item + preco_centavos).

## Pagamentos plugáveis (padrão LavaSeguro)
- `app/payments/provider.py`: ABC `PaymentProvider` + registry
  (`register_provider` / `get_provider` / `list_providers`).
- MVP registra apenas `ManualProvider` (registro manual: dinheiro, maquininha,
  pix avulso). **Nenhum gateway externo faz parte do core. Asaas NÃO é
  dependência nem padrão do projeto.**
- Endpoints:
  - `GET /api/v1/payments/providers` → lista nomes registrados
  - `POST /api/v1/payments/charge` → delega ao provider escolhido
  - `POST /api/v1/conta/mesa/{token}/charge` → valida valor contra a conta
    aberta da mesa e cobra via provider (default `manual`)
- Novos providers: implementar `PaymentProvider.charge()` e chamar
  `register_provider(Classe)`.

## Auth
Demo Bearer (`issue_demo_token` / `require_estabelecimento`) permanece.
Multi-tenant completo = próximo marco.

## DNS / Deploy
Ver `docs/DNS-CADDY.md` (checklist apenas; nenhum DNS real configurado).

## Próximo passo
Auth multi-tenant (usuários, estabelecimentos, isolamento por tenant).
