# DNS e Caddy — PedidoMesa

Linguagem simples para o CEO: o que precisa existir na internet para o site abrir em `pedidomesa.tech42.com.br`.

## 1. O que criar no DNS

No painel do domínio `tech42.com.br` (onde já ficam os outros produtos):

| Tipo | Nome / host | Aponta para | Para quê |
|---|---|---|---|
| **A** | `pedidomesa` | IP da VPS Tech42 | Site e API no mesmo host (recomendado no início) |

Alternativa (se já existir um nome canônico da VPS):

| Tipo | Nome / host | Aponta para | Para quê |
|---|---|---|---|
| **CNAME** | `pedidomesa` | nome da VPS (ex.: `vps.tech42.com.br`) | Mesmo efeito, sem colocar IP direto |

**Resultado esperado:** `pedidomesa.tech42.com.br` resolve para a VPS.

> O IP da VPS **não** vai neste arquivo nem no código — fica no `.env` da máquina/ops (`VPS_HOST` / inventário).

### Checklist CEO

- [ ] Criar registro A (ou CNAME) `pedidomesa`
- [ ] Esperar propagação (pode levar minutos a poucas horas)
- [ ] Avisar ops/dev para ligar o Caddy e o deploy

## 2. Trecho Caddy (exemplo)

Arquivo de referência na raiz do repo: `Caddyfile.example`.

```caddy
pedidomesa.tech42.com.br {
    encode gzip

    # Front (Next.js)
    reverse_proxy /api* localhost:8000
    reverse_proxy localhost:3000
}
```

Se a API e o web estiverem em containers com nomes Docker:

```caddy
pedidomesa.tech42.com.br {
    encode gzip

    handle /api* {
        reverse_proxy api:8000
    }
    handle {
        reverse_proxy web:3000
    }
}
```

Caddy cuida do HTTPS (Let's Encrypt) sozinho quando o DNS já aponta certo.

## 3. O que NÃO fazer

- Não colocar senha, token ou IP no GitHub
- Não apontar o domínio antes do serviço estar pronto na VPS (página cai / certificado falha)
- Não misturar outro produto no mesmo host sem path/proxy claro


## 4. Layout VPS (padrão Tech42)

Igual aos outros produtos (ex.: GIC):

| Item | Valor |
|---|---|
| Código / compose | `/srv/projetos/clientes/pedidomesa` |
| Domínio | `pedidomesa.tech42.com.br` |
| Proxy | Caddy (trecho neste doc + `Caddyfile.example`) |

DNS é criado **pelo CEO**. Deploy na VPS só depois do registro propagar.
