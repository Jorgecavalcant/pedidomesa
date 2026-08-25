# STATE.min — PedidoMesa

- **Status:** Salto UX 2026-08 — login explícito, home, métricas, mesas+QR real, garçom, pedidos, settings
- **Domínio:** pedidomesa.tech42.com.br (DNS = CEO)
- **VPS:** /srv/projetos/clientes/pedidomesa
- **Deploy:** `.github/workflows/deploy.yml` — push/merge main → CI gate → SSH VPS (`git reset --hard origin/main` + `docker compose up -d --build`, preserva .env) → healthcheck `/health`+`/login`. Requer secrets `VPS_SSH_KEY`/`VPS_HOST`/`VPS_USER` + clone git na VPS.
- **Negócio:** assinatura fixa; sem % por pedido
- **Auth:** POST /api/v1/auth/login + /me (demo/demo123)
- **Pagamento cliente:** plugável manual; charge exige Bearer
- **Repo:** público (workaround CI)
- **Atualizado:** 2026-08-24
