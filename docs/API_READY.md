# API-ready — PedidoMesa

A API FastAPI expõe OpenAPI em `/docs` e `/openapi.json`.

**Tags atuais:** `auth`, `mesas`, `cardapio`, `pedidos`, `cozinha`, `conta`, `metricas`, `settings`, `payments`.

**Contrato:** JSON + Bearer JWT/demo para rotas staff. Prefixos estáveis sob `/api/v1/`.

**MCP:** sem servidor MCP neste salto. A superfície HTTP/OpenAPI já permite conectar um adaptador MCP depois (tools = endpoints documentados), sem mudar o core do produto.
