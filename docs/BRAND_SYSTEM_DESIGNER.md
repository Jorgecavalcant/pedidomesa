# Brand System — PedidoMesa

| Campo | Valor |
|:---|:---|
| Produto | PedidoMesa |
| Versão deste doc | **3.0** vigente |
| Dono | CEO + diretor-design-ux + designer-visual |
| Última atualização | 2026-08-25 |
| Status | [x] vigente para peça pública e produto |

---

## 1. Para que este arquivo existe

Contrato visual e de experiência do **PedidoMesa** — landing, pedido na mesa (QR), balcão, cozinha e área gerencial.

Implementação: `web/app/globals.css` (tokens light/dark) + `web/lib/theme.ts` + App Router. Este doc manda; o CSS e o tema obedecem.

---

## 2. Escopo

**Vale para:** `pedidomesa.tech42.com.br` — `/`, `/m/[token]`, `/balcao`, `/cozinha`, `/cardapio`, home gerencial, dashboard, settings, users.

**Não vale para:** site institucional Tech 42 e demais produtos da casa.

**Público:** dono de bar / food truck / operação enxuta; equipe de balcão e cozinha; cliente na mesa (celular, sem app).

---

## 3. Chassis Tech42 (comum) + pele PedidoMesa (distinta)

### 3.1 Chassis

| Camada | Regra |
|:---|:---|
| UX | 1 ação óbvia por vista; DNA Cerbasi; mobile-first; alvos ≥ 44px; contraste WCAG AA |
| Escala tipográfica | Display → H1 → H2 → H3 → Body → Small → Caption |
| Estados UI | hover / focus / disabled / error / success / loading |
| Spacing | base **8px** |
| Canto | **10–12px** (não pill 999px como padrão) |
| Card | só interação ou agrupamento acionável |

### 3.2 Pele PedidoMesa (Conselho 2026-08-25)

| Dimensão | Decisão |
|:---|:---|
| Atmosfera | Operação limpa e fria: grafite frio + off-white; destaque limão-siciliano |
| Paleta | Grafite frio + limão-siciliano (CTA) + off-white |
| Display | **Fraunces** |
| UI | **DM Sans** |
| Tema | Default = sistema (`prefers-color-scheme`); override opcional `localStorage` (`pm_theme`) |
| Voz | Direto, claro — **sem** estética marrom/boteco |

**Rejeitado:** marrom, madeira, açafrão-fogo, “noite de boteco”, âmbar/dourado genérico como identidade.

---

## 4. DNA e voz

**Base:** DNA Cerbasi — acolher, educar, um próximo passo, sem pressão.

**Voz PedidoMesa:** tom direto e operacional; trata de **você**; palavras: mesa, pedir, balcão, cozinha, fechar a conta, QR, mensalidade. Evitar: logística, enterprise, urgência falsa, jargão SaaS, “boteco” como identidade.

**Promessa:** Mesa pede no celular; balcão/cozinha vê; você fecha a conta.

### 4.1 Direção de copy — pricing (landing)

| Antes (evitar) | Direção vigente |
|:---|:---|
| “Preço que cabe no caixa” | **“Mensalidade previsível, sem comissão por pedido”** |

Alternativas no mesmo eixo:

- “Mensalidade fixa — sem percentual por pedido”
- “Você sabe quanto paga todo mês. Sem comissão no pedido.”

Implementação em `web/app/page.tsx` fica para o coding agent; este doc trava a direção.

---

## 5. UX

1. Uma ação óbvia por tela  
2. Cliente na mesa: pedir sem login  
3. Balcão cria mesa → QR; cozinha marca pronto; balcão fecha  
4. Erros em português claro  
5. Alvos ≥ 44px  

**Próximo passo:** Abrir balcão → criar mesa → `/m/TOKEN` → cozinha → Fechar conta.

**A11y:** AA texto/fundo; limão (`--color-accent`) em CTA/fills; texto/links usam `--color-accent-text`; foco `--color-ring`; `prefers-reduced-motion` off.

---

## 6. Cor — 70 / 20 / 10

| Fatia | Papel | Light | Dark | Token |
|:---|:---|:---|:---|:---|
| 70% | Fundo | `#F4F5F3` | `#121417` | `--color-bg` |
| 20% | Marca / superfície | `#2B3036` / `#FFFFFF` | `#2E343C` / `#1A1E24` | `--color-brand` / `--color-surface` |
| 10% | CTA | `#C5D63A` | `#D4E84A` | `--color-accent` |

### Light

| Token | Hex | Uso |
|:---|:---|:---|
| `--color-bg` | `#F4F5F3` | página (off-white frio) |
| `--color-surface` | `#FFFFFF` | painéis |
| `--color-brand` | `#2B3036` | grafite |
| `--color-accent` | `#C5D63A` | CTA fill |
| `--color-accent-hover` | `#A8B82E` | CTA hover |
| `--color-accent-text` | `#6B7A12` | links/kicker (AA) |
| `--color-text` | `#1A1D21` | body |
| `--color-muted` | `#5C636B` | auxiliar |
| `--color-border` | `#E2E5E8` | bordas |
| `--color-on-accent` | `#1A1D21` | texto no limão |
| `--color-ring` | `#C5D63A` | foco |
| `--input-bg` | `#FFFFFF` | campos |
| `--color-success` | `#2F8F45` | ok |
| `--color-error` | `#C23B3B` | erro |
| `--color-disabled` | `#9AA1A9` | inativo |

### Dark

| Token | Hex | Uso |
|:---|:---|:---|
| `--color-bg` | `#121417` | página (grafite frio) |
| `--color-surface` | `#1A1E24` | painéis |
| `--color-brand` | `#2E343C` | grafite |
| `--color-accent` | `#D4E84A` | CTA fill |
| `--color-accent-hover` | `#E0F05C` | CTA hover |
| `--color-accent-text` | `#D4E84A` | links/kicker |
| `--color-text` | `#F2F3F4` | body |
| `--color-muted` | `#9AA1A9` | auxiliar |
| `--color-border` | `#2A3038` | bordas |
| `--color-on-accent` | `#121417` | texto no limão |
| `--color-ring` | `#D4E84A` | foco |
| `--input-bg` | `#0E1013` | campos |
| `--color-success` | `#5CB86A` | ok |
| `--color-error` | `#E06B5C` | erro |
| `--color-disabled` | `#5A6169` | inativo |

### Tipografia

| Papel | Família | Token |
|:---|:---|:---|
| Display / títulos | Fraunces 600–700 | `--font-display` |
| UI / corpo | DM Sans 400–600 | `--font-ui` |

Radius controles: **12px**. Shadow leve, sem glow.

---

## 7. Tema light / dark

| Regra | Comportamento |
|:---|:---|
| Default | `system` → `prefers-color-scheme` |
| Override | `localStorage` chave `pm_theme` = `light` \| `dark` \| `system` |
| Resolução | `web/lib/theme.ts` → `document.documentElement.dataset.theme` = `light` \| `dark` |
| Boot | Script inline em `layout.tsx` (anti-flash) |
| Toggle | Cicla `system → light → dark → system` |

---

## 8. Tokens CSS sugeridos

```css
:root,
[data-theme="dark"] {
  --color-bg: #121417;
  --color-surface: #1A1E24;
  --color-brand: #2E343C;
  --color-accent: #D4E84A;
  --color-accent-hover: #E0F05C;
  --color-accent-text: #D4E84A;
  --color-text: #F2F3F4;
  --color-muted: #9AA1A9;
  --color-border: #2A3038;
  --color-on-accent: #121417;
  /* … */
}

[data-theme="light"] {
  --color-bg: #F4F5F3;
  --color-surface: #FFFFFF;
  --color-brand: #2B3036;
  --color-accent: #C5D63A;
  --color-accent-hover: #A8B82E;
  --color-accent-text: #6B7A12;
  --color-text: #1A1D21;
  --color-muted: #5C636B;
  --color-border: #E2E5E8;
  --color-on-accent: #1A1D21;
  /* … */
}
```

Aliases legados (`--bg`, `--accent`, `--line`, …) mapeiam aos tokens — páginas operacionais não quebram.

---

## 9. Pode / não pode

**Pode:** grafite frio, off-white, Fraunces + DM Sans, CTA limão-siciliano, light/dark pelo sistema.

**Não pode:** marrom/madeira/açafrão/boteco, âmbar como pele, roxo/indigo, cream+terracotta clichê, Inter/Roboto/Arial como stack padrão, glow, pill 999px como padrão, naming de outro produto.

---

## 10. Inventário

| Arquivo | Onde |
|:---|:---|
| Este documento | `docs/BRAND_SYSTEM_DESIGNER.md` |
| Tokens CSS | `web/app/globals.css` |
| Tema | `web/lib/theme.ts` |
| Boot | `web/app/layout.tsx` |
| Toggle | `web/components/ThemeToggle.tsx` |
| Landing | `web/app/page.tsx` |

---

## 11. Governança

Aprovação: Conselho + design-UX (2026-08-25). Mudança de cor/tipo: este doc **e** tokens no mesmo PR lógico.

---

## 12. Checklist

- [x] Doc v3.0 — grafite + limão + off-white  
- [x] Hex light + dark  
- [x] prefers-color-scheme default + localStorage opcional  
- [x] Direção copy pricing (§4.1)  
- [x] Fraunces + DM Sans  
- [x] Sem marrom/boteco  

---

*Tech 42 LTDA — PedidoMesa · Brand System 3.0 · 2026-08-25*
