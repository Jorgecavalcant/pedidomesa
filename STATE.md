# STATE — PedidoMesa

**Atualizado:** 2026-08-24

## Status
Scaffold MVP rodável (API + web + Docker + CI). Pronto para repo GitHub e deploy no padrão VPS.

## Decisões do CEO (2026-08-24)
- DNS: CEO cria; docs só descrevem o que apontar
- VPS: `/srv/projetos/clientes/pedidomesa` (mesmo padrão dos outros produtos)
- Pagamentos: sem adquirente fixo da Tech42; plugável (cliente escolhe)
- Modelo Tech42: assinatura mensal fixa (sem % por pedido)

## Feito
- [x] PRD / SPEC / DNS-CADDY
- [x] API: mesas, pedidos, cozinha, conta, auth demo
- [x] Web: landing, `/m/[token]`, balcão, cozinha
- [x] Docker Compose + Caddy example + CI

## Próximo
- [ ] Cardápio admin (itens fixos)
- [ ] Auth real multi-tenant
- [ ] Deploy VPS após DNS
- [ ] Provedor de pagamento plugável na conta do cliente (opcional)
