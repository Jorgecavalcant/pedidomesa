# SPEC técnica — PedidoMesa Fase B+C (posições / conta / LGPD QR)

| Campo | Valor |
|:---|:---|
| Produto | PedidoMesa |
| Versão | **B+C-v1.0** |
| Baseline | `api/app/models.py`, routers conta/mesas/pedidos |
| Ref plano | `docs/PLANO-CEO-16-20260825.md` |
| Fora | RBAC real (Fase D), Pix, mapa visual |

---

## 1. Campos / tabelas

### Alterar

| Entidade | Campos novos | Notas |
|:---|:---|:---|
| **Mesa** | `capacidade: int` (≥1) | Posições = `1..capacidade`. Backfill: `4`. |
| **Pedido** | `posicoes: JSON[int[]]` | Subconjunto ou `[]` = mesa toda. |
| **Pedido** | `cliente_sessao_id: FK?` | Vínculo QR (nullable = staff/legado). |
| **Pedido** | `cobrado_centavos: int` default 0 | Rateio já quitado. |

### Novas

| Tabela | Papel |
|:---|:---|
| **ClienteMesaSessao** | nome, celular_e164, consentimento + evidência, device_token_hash, ativo, mesa_id |
| **Cobranca** | filtro (posição/grupo/itens/mesa), subtotal, taxa 0\|10%, total, status aberta/quitada/cancelada |
| **CobrancaItem** | cobranca_id, pedido_id, valor_centavos |
| **TransferenciaCobranca** | de→para posição, pedido_ids, status pendente/aprovada/negada |

---

## 2. Endpoints-chave

- `POST /mesas` + `capacidade`
- `POST /pedidos` + `posicoes`
- `POST /m/{token}/identificar` · `POST /m/{token}/reentrar`
- `POST /conta/mesa/{token}/preview` · `/cobrancas` · `/liberar`
- `POST /conta/cobrancas/{id}/quitar`
- `POST /conta/mesa/{token}/transferencias` · `.../decidir`

`POST .../fechar` legado: se saldo=0, quita tudo + libera; senão 409.

---

## 3. Regras

- Mesa: livre → ocupada (1º pedido/identificar) → livre só com saldo 0 + liberar
- Taxa 10% = round(subtotal_filtro × 0.10); removível
- Transferência: cliente solicita → staff decide
- LGPD: sem aceite não identifica; cutoff PII no liberar; rate-limit reentrar

---

## 4. Ordem

1. capacidade + backfill  
2. pedidos.posicoes/cobrado/sessao  
3. tabelas cobrança/sessão/transferência  
4. API mesas/pedidos  
5. preview/cobrar/quitar/liberar  
6. transferência  
7. identificar/reentrar/cutoff  
8. testes + UI  

---

*Tech 42 · analista-soluções · 2026-08-25*
