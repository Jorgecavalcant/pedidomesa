# PedidoMesa

**Pedidos pelo celular na mesa — sem garçom no meio do caminho.**

**Repositório:** GitHub Tech42 (`pedidomesa`)  
**VPS (padrão):** `/srv/projetos/clientes/pedidomesa`  
**Domínio:** `pedidomesa.tech42.com.br` (DNS criado pelo CEO)

O cliente aponta a câmera para o QR da mesa, escolhe o que quer e envia. A cozinha/balcão vê na hora. No fim, o estabelecimento fecha a conta. Cobrança da Tech42: **assinatura mensal fixa** (sem percentual por pedido). Pagamento do cliente na mesa (Pix/cartão) é plugável — o estabelecimento escolhe o banco/adquirente; MVP fecha conta sem gateway fixo.

---

## O que é (em uma frase)

Software para bar, boteco e food truck: QR por mesa → pedido (individual ou coletivo) → painel da cozinha → fechamento de conta.

## Stack

| Parte | Tecnologia |
|---|---|
| Site / telas | Next.js 14 (App Router) |
| API | FastAPI (Python) |
| Banco | PostgreSQL 16 |
| Subir tudo local | Docker Compose |
| Produção (proxy) | Caddy |
| Domínio alvo | `pedidomesa.tech42.com.br` |

## Como rodar (desenvolvimento)

```bash
cd PROJETOS/pedidomesa
cp .env.example .env
make up
```

- Site: http://localhost:3000  
- API: http://localhost:8000  
- Docs da API: http://localhost:8000/docs  

### Testes e CI local

```bash
make test   # testes da API (pytest, SQLite em memória)
make ci     # lint + testes (o mesmo que o GitHub Actions)
```

### Requisitos

- Docker + Docker Compose v2
- GNU Make
- (opcional, fora do Docker) Python 3.11+ e Node 20+

### Variáveis de ambiente do web (produção)

`NEXT_PUBLIC_API_URL` (API vista pelo navegador) e `NEXT_PUBLIC_APP_URL` (domínio público, usado no QR da mesa) são
inlinadas no bundle do Next.js em **build-time**, não em runtime. O `docker-compose.yml` já passa as duas como
`build.args` do serviço `web` a partir do `.env` — então, ao trocar o domínio em produção, é preciso `docker compose
up -d --build web` (rebuild da imagem), não só reiniciar o container.

## Onde ficam os documentos

| Arquivo | Para quê |
|---|---|
| [docs/INDEX.md](docs/INDEX.md) | Índice de toda a documentação |
| [docs/PRD.md](docs/PRD.md) | O que o produto faz (negócio) |
| [docs/SPEC.md](docs/SPEC.md) | Telas e endpoints do MVP |
| [docs/DNS-CADDY.md](docs/DNS-CADDY.md) | DNS e Caddy para o domínio |
| [STATE.md](STATE.md) | Estado atual do projeto |
| [STATE.min.md](STATE.min.md) | Resumo de uma página |

## Modelo de negócio (resumo)

- Estabelecimento paga **mensalidade fixa**.
- **Não** cobramos % por pedido neste produto.
- Pagamento do cliente na mesa: integração plugável (banco/adquirente do cliente). MVP = fechar conta no balcão.

## Status

Scaffold MVP rodável: API + web + Docker + CI verdes localmente. Pagamentos e multi-tenant real ainda não.
