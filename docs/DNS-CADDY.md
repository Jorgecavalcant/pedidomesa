```markdown
# DNS & Caddy — Checklist (nenhum DNS real configurado)

## Checklist DNS (documentação apenas)
- [ ] Definir domínio de produção (ex.: pedidomesa.example)
- [ ] Registro A/AAAA para apex → IP do servidor (a definir)
- [ ] Registro A/AAAA para `api.` → mesmo servidor
- [ ] CNAME `www.` → apex
- [ ] Verificar propagação antes de emitir TLS

## Checklist Caddy
- [ ] Instalar Caddy no servidor
- [ ] Caddyfile: reverse_proxy `web` (:3000) e `api` (:8000)
- [ ] TLS automático (Let's Encrypt) após DNS propagado
- [ ] Healthcheck `/api/v1/health`

> Este documento é somente checklist. Não configure DNS real nesta fase.
```
