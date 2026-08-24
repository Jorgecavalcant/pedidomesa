# Brand System — PedidoMesa

| Campo | Valor |
|:---|:---|
| Produto | PedidoMesa |
| Versão deste doc | 1.0 vigente |
| Dono | CEO + designer-visual |
| Última atualização | 2026-08-24 |
| Status | [x] vigente para peça pública |

---

## 1. Para que este arquivo existe

Contrato visual e de experiência do **PedidoMesa** — landing, pedido na mesa, balcão e cozinha.

Implementação: `web/app/globals.css` (tokens `:root`) + páginas App Router.

---

## 2. Escopo

**Vale para:** portal `pedidomesa.tech42.com.br`, telas `/`, `/m/[token]`, `/balcao`, `/cozinha`, `/cardapio`.

**Não vale para:** site institucional Tech 42, LavaSeguro, EntregaRota, Bagagem, outros produtos da casa.

**Público:** dono de bar/boteco/food truck; equipe de balcão e cozinha; cliente na mesa (celular, sem app).

---

## 3. DNA da casa vs voz deste produto

**Base:** DNA Cerbasi — acolher, educar, um próximo passo, sem pressão.

**Voz deste produto:**

- Tom: caloroso, direto, ritmo de boteco
- Trata o leitor de: **você**
- Palavras que usamos: mesa, pedir, balcão, cozinha, fechar a conta, QR
- Palavras que não usamos: “logística”, “enterprise”, urgência falsa, jargão de SaaS
- Promessa em uma frase: **Mesa pede no celular; balcão/cozinha vê; você fecha a conta.**

---

## 4. UX — como funciona

### 4.1 Princípios

1. Uma ação óbvia por tela
2. Cliente na mesa: pedir sem login
3. Balcão cria mesa → QR; cozinha marca pronto; balcão fecha
4. Erros em português claro
5. Alvos grandes no polegar (cozinha/balcão)

### 4.2 Próximo passo

Ação padrão: **Abrir balcão** → criar mesa → cliente em `/m/TOKEN` → cozinha → **Fechar conta**

### 4.3 Estados obrigatórios

| Estado | O que a pessoa vê | O que pode fazer |
|:---|:---|:---|
| Carregando | “Carregando mesas…” / spinner | Esperar |
| Vazio | “Nenhuma mesa aberta” + criar mesa | Criar mesa |
| Erro | Mensagem humana (ex.: “Não foi possível listar mesas”) | Tentar de novo |
| Sucesso | Conta fechada / pedido enviado | Próximo passo único |

### 4.4 Acessibilidade (piso)

- Contraste AA: texto `#F5EFE6` / muted `#C4B5A0` no charcoal; açafrão só em CTA
- Foco visível `--ring`
- Rótulos visíveis; alvos ≥ 44px
- `prefers-reduced-motion`: animações desligadas

### 4.5 Confiança e dado

- Sem PII em logs; login demo só em ambiente de teste
- Footer: mensalidade fixa — sem % sobre pedido

---

## 5. UI — como aparece

### 5.1 Logo

| Uso | Arquivo | Fundo |
|:---|:---|:---|
| Marca tipográfica | Texto **PedidoMesa** + wordmark CSS | escuro |
| Favicon | pendente | — |

### 5.2 Cor — regra 70 / 20 / 10

| Fatia | Papel | Hex | Onde |
|:---|:---|:---|:---|
| 70% | Fundo | `#1C1410` | Página |
| 20% | Marca / bloco | `#5C4033` / soft `#2A2018` | Cards, faixas |
| 10% | Acento / CTA | `#E8A54B` | Botão principal |

| Nome | Hex | Uso |
|:---|:---|:---|
| Texto | `#F5EFE6` | body |
| Texto auxiliar | `#C4B5A0` | muted (≥ 4.5:1) |
| Linha | `#3D3226` | bordas |
| Sucesso | `#6FBF73` | status |
| Alerta | `#E07060` | erro |

### 5.3 Tipografia

| Papel | Família | Pesos | Fallback |
|:---|:---|:---|:---|
| Título | Fraunces | 600–700 | Georgia, serif |
| UI | DM Sans | 400–600 | system-ui, sans-serif |

### 5.4 Espaço, canto, elevação

| Token | Valor | Uso |
|:---|:---|:---|
| Espaço base | 8px | múltiplos |
| Canto | 12px | cards |
| Botão | pill 999px | CTA |
| Sombra | quente suave | cards |

Largura máxima: 920px.

### 5.5 Peças de interface

| Peça | Regra |
|:---|:---|
| Botão principal | Um por vista; açafrão; verbo |
| Botão secundário | Contorno; nunca compete |
| Campo | Fundo `#120E0A`; rótulo muted |
| Cartão | soft + linha |

### 5.6 Movimento

Fade/slide curto no hero; respeita `prefers-reduced-motion`.

---

## 6. Aplicações fora da tela

| Peça | Como vestir |
|:---|:---|
| Post | Uma frase + açafrão num detalhe |
| WhatsApp | Voz da §3 |

---

## 7. Pode / não pode

**Pode:** noite de boteco, Fraunces, um CTA açafrão, radial quente.

**Não pode:** roxo/indigo, Inter/Roboto/Arial, Material Design, paleta de outro produto da casa.

---

## 8. Inventário de arquivos

| Arquivo | Onde |
|:---|:---|
| Este documento | `docs/BRAND_SYSTEM_DESIGNER.md` |
| Tokens CSS | `web/app/globals.css` |
| Landing | `web/app/page.tsx` |

---

## 9. Governança

Aprovação vigente: CEO + design-UX (2026-08-24). Mudança de cor: atualizar este doc + `:root`.

---

## 10. Checklist antes de entregar

- [x] Doc vigente
- [x] 70/20/10; açafrão só CTA
- [x] Tipografia Fraunces + DM Sans
- [x] Uma ação óbvia
- [x] Não parece outro produto da casa

---

*Tech 42 LTDA — PedidoMesa.*
