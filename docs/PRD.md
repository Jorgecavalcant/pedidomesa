# PRD — PedidoMesa (mínimo)

**Produto:** PedidoMesa  
**Dono:** Tech42  
**Data:** 2026-08-24  
**Status:** MVP scaffold

## Problema

Em bar, boteco e food truck, pedir e fechar conta ainda depende demais de garçom e papel. Fila, erro de pedido e demora no fechamento.

## Solução

1. Cada mesa tem um **QR code**.
2. Cliente abre o link no celular e **pede** (sozinho ou junto com a mesa).
3. Cozinha/balcão vê os pedidos num **painel**.
4. No fim, o estabelecimento **fecha a conta** da mesa.
5. O bar paga à Tech42 uma **mensalidade fixa** (não percentual por pedido).

## Para quem

- Dono de bar / boteco / food truck
- Equipe de balcão e cozinha
- Cliente final (só usa o celular na mesa — sem instalar app)

## Fora do MVP (depois)

- Pix/cartão via provedor plugável (banco/adquirente do cliente)
- Cardápio rico com fotos e categorias avançadas
- Impressora térmica
- App nativo
- Relatórios financeiros completos

## Critérios de sucesso do MVP

- Cliente consegue pedir com o token da mesa
- Cozinha marca pedido como pronto
- Balcão fecha a conta e a mesa fica disponível de novo
- Tudo sobe com `make up` e testes passam com `make ci`

## Modelo de receita

Assinatura mensal fixa por estabelecimento. **Sem % sobre o valor do pedido.**
