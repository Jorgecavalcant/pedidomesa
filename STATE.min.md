# STATE.min — PedidoMesa

- **Status:** MVP com cardápio, reabrir mesa e breakdown de conta
- **Domínio:** pedidomesa.tech42.com.br (DNS = CEO)
- **VPS:** /srv/projetos/clientes/pedidomesa
- **Negócio:** assinatura fixa; sem % por pedido
- **Pagamento cliente:** plugável (sem vendor fixo / sem Asaas core); `POST /payments/charge` exige auth de estabelecimento (`GET /payments/providers` aberto)
- **Repo:** público (workaround CI)
- **Atualizado:** 2026-08-24
