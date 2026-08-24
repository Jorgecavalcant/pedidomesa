# STATE — PedidoMesa

## Feito
- Scaffold MVP: FastAPI (models Mesa/Pedido com enums MesaStatus/PedidoModo/PedidoStatus, routers auth/mesas/pedidos/cozinha/conta/health), Next.js (/, /m/[token], /balcao, /cozinha)
- Auth demo Bearer (`issue_demo_token`, `require_estabelecimento`)
- **Cardápio admin (v0.2)**: model CardapioItem, CRUD completo (/api/v1/cardapio), soft-delete, seed de 6 itens no startup, pedidos via cardapio_item_id (preço travado no cardápio), página web /cardapio e menu na /m/[token]
- **Pagamentos plugáveis (v0.2)**: ABC PaymentProvider + registry (padrão LavaSeguro), MVP só `manual`; endpoints GET /payments/providers, POST /payments/charge, POST /conta/mesa/{token}/charge. Sem Asaas no core.

## Em progresso
- —

## Próximo
- Auth multi-tenant completo (usuários, estabelecimentos, isolamento por tenant)

## Restrições permanentes
- Asaas nunca como core/padrão; apenas provider opcional plugável futuro
- DNS: apenas documentado (docs/DNS-CADDY.md), sem configuração real
