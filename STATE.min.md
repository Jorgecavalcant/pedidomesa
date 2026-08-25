# STATE.min — PedidoMesa

- **Status:** Salto UX 2026-08 — login explícito, home, métricas, mesas+QR real, garçom, pedidos, settings
- **Domínio:** pedidomesa.tech42.com.br (DNS = CEO)
- **VPS:** /srv/projetos/clientes/pedidomesa
- **Deploy:** `.github/workflows/deploy.yml` — push/merge main → CI gate → SSH VPS (`git reset --hard origin/main` + `docker compose up -d --build`, preserva .env) → healthcheck `/health`. Secrets `VPS_*` ainda ausentes (CD bloqueado no SSH).
- **Negócio:** assinatura fixa; sem % por pedido
- **Auth:** POST /api/v1/auth/login + /me (demo/demo123)
- **Pagamento cliente:** plugável manual; charge exige Bearer
- **Repo:** público (workaround CI)
- **Atualizado:** 2026-08-25
- **Log 2026-08-25:** Deploy YAML corrigido (PR fix 2026-08-25): Telegram sem secrets.* em if:; healthcheck só `/health`. Pipeline parseia OK; job deploy falha em `Preparar chave SSH` porque secrets `VPS_SSH_KEY`/`VPS_HOST`/`VPS_USER` estão vazios/ausentes — VPS NÃO tocada. Produção estável (smoke /health=200). CEO: cadastrar secrets VPS_* (e opcional TELEGRAM_*) nos 4 repos.
