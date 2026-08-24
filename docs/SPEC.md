# SPEC — PedidoMesa MVP

**Escopo:** scaffold rodável. Sem pagamentos online.

## Telas (web)

| Rota | Quem usa | O que faz |
|---|---|---|
| `/` | Visitante | Landing simples do produto |
| `/m/[token]` | Cliente | Ver mesa, adicionar item (individual ou coletivo), ver itens da mesa |
| `/cozinha` | Cozinha/balcão | Listar pedidos abertos; marcar como pronto |
| `/balcao` | Balcão | Listar mesas; ver conta; fechar conta |

API base (dev): `http://localhost:8000`  
Prefixo: `/api/v1`

## Auth (placeholder)

| Método | Rota | Descrição |
|---|---|---|
| POST | `/api/v1/auth/demo` | Retorna token demo do estabelecimento (header `Authorization: Bearer …`) |

Credenciais demo vêm do `.env` (`DEMO_ESTABELECIMENTO_USER` / `DEMO_ESTABELECIMENTO_PASS`).  
Rotas de operação do estabelecimento exigem o Bearer. Rotas do cliente (por token da mesa) **não**.

## Mesas

| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/v1/mesas` | Lista mesas |
| POST | `/api/v1/mesas` | Cria mesa (`nome`) e gera `qr_token` |
| GET | `/api/v1/mesas/{id}` | Detalhe |
| PATCH | `/api/v1/mesas/{id}` | Atualiza nome / status |
| DELETE | `/api/v1/mesas/{id}` | Remove mesa |
| GET | `/api/v1/mesas/por-token/{token}` | Cliente: dados públicos da mesa |

## Pedidos

| Método | Rota | Descrição |
|---|---|---|
| POST | `/api/v1/pedidos` | Cria item: `mesa_token`, `nome_item`, `quantidade`, `preco_centavos`, `modo` (`individual`\|`coletivo`), `cliente_nome` opcional |
| GET | `/api/v1/pedidos/mesa/{token}` | Lista itens da mesa (aberta) |
| PATCH | `/api/v1/pedidos/{id}/status` | Atualiza status (`pendente`\|`preparando`\|`pronto`\|`entregue`\|`cancelado`) |

## Cozinha

| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/v1/cozinha/abertos` | Pedidos não prontos/entregues/cancelados |
| POST | `/api/v1/cozinha/pedidos/{id}/pronto` | Marca como pronto |

## Conta

| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/v1/conta/mesa/{token}` | Soma itens ativos da mesa |
| POST | `/api/v1/conta/mesa/{token}/fechar` | Fecha conta: marca mesa `fechada`, itens `entregue` |

## Health

| Método | Rota | Descrição |
|---|---|---|
| GET | `/health` | Liveness |
| GET | `/api/v1/health` | Health da API |

## Status de mesa

`livre` → `ocupada` (ao primeiro pedido) → `fechada` (ao fechar conta; pode reabrir no balcão futuro)

## Critérios de aceite

1. `GET /health` → 200  
2. Criar mesa gera `qr_token`  
3. Cliente cria pedido individual e coletivo pelo token  
4. Cozinha lista abertos e marca pronto  
5. Fechar conta zera a mesa para novos pedidos (status `fechada`)  
6. `make test` e `make ci` passam sem Postgres real (SQLite em teste)
