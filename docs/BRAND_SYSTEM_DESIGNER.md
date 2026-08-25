# Brand System — PedidoMesa

| Campo | Valor |
|:---|:---|
| Produto | PedidoMesa |
| Versão deste doc | **2.0** vigente |
| Dono | CEO + diretor-design-ux + designer-visual |
| Última atualização | 2026-08-24 |
| Status | [x] vigente para peça pública e produto |

---

## 1. Para que este arquivo existe

Contrato visual e de experiência do **PedidoMesa** — landing, pedido na mesa (QR), balcão, cozinha e área gerencial.

Implementação: `web/app/globals.css` (tokens `:root`) + App Router. Este doc manda; o CSS obedece.

---

## 2. Escopo

**Vale para:** `pedidomesa.tech42.com.br` — `/`, `/m/[token]`, `/balcao`, `/cozinha`, `/cardapio`, home gerencial, dashboard, settings, users.

**Não vale para:** site institucional Tech 42 e demais produtos da casa (LavaSeguro, EntregaRota, Bagagem, etc.).

**Público:** dono de bar/boteco/food truck; equipe de balcão e cozinha; cliente na mesa (celular, sem app).

---

## 3. Chassis Tech42 (comum) + pele PedidoMesa (distinta)

### 3.1 Chassis — o que não muda entre produtos da casa

| Camada | Regra |
|:---|:---|
| UX | 1 ação óbvia por vista; DNA Cerbasi (acolher, educar, próximo passo, anti-pressão); mobile-first; alvos ≥ 44px; contraste WCAG AA |
| Escala tipográfica | Display → H1 → H2 → H3 → Body → Small → Caption (mesmos papéis; famílias mudam na pele) |
| Estados UI | hover / focus / disabled / error / success / loading — sempre definidos |
| Spacing | base **8px**; múltiplos 4/8/12/16/24/32/48 |
| Canto | **10–12px** em botões e inputs (não pill 999px como padrão) |
| Card | só quando há interação ou agrupamento acionável — não decoração |
| Layouts | home gerencial, dashboard, settings, users compartilham estrutura (§8) |

### 3.2 Pele — o que é só PedidoMesa

| Dimensão | Decisão |
|:---|:---|
| Atmosfera | Noite de boteco: madeira, calor, luz baixa |
| Paleta | Carvão quente + madeira + açafrão-fogo |
| Display | **Fraunces** (serif expressiva, calor) |
| UI | **DM Sans** |
| Voz | Ritmo de mesa: direto, caloroso, sem jargão SaaS |

---

## 4. DNA da casa vs voz deste produto

**Base:** DNA Cerbasi — acolher, educar, um próximo passo, sem pressão.

**Voz PedidoMesa:**

- Tom: caloroso, direto, ritmo de boteco
- Trata o leitor de: **você**
- Palavras que usamos: mesa, pedir, balcão, cozinha, fechar a conta, QR
- Palavras que não usamos: logística, enterprise, urgência falsa, jargão de SaaS
- Promessa: **Mesa pede no celular; balcão/cozinha vê; você fecha a conta.**

---

## 5. UX — como funciona

### 5.1 Princípios

1. Uma ação óbvia por tela
2. Cliente na mesa: pedir sem login
3. Balcão cria mesa → QR; cozinha marca pronto; balcão fecha
4. Erros em português claro, ao lado do campo quando possível
5. Alvos grandes no polegar (cozinha/balcão)

### 5.2 Próximo passo padrão

**Abrir balcão** → criar mesa → cliente em `/m/TOKEN` → cozinha → **Fechar conta**

### 5.3 Estados obrigatórios (comportamento)

| Estado | O que a pessoa vê | O que pode fazer |
|:---|:---|:---|
| Carregando | “Carregando mesas…” + spinner discreto | Esperar |
| Vazio | “Nenhuma mesa aberta” + CTA criar mesa | Criar mesa |
| Erro | Mensagem humana (ex.: “Não foi possível listar mesas”) | Tentar de novo |
| Sucesso | Conta fechada / pedido enviado | Próximo passo único |

### 5.4 Acessibilidade (piso)

- Contraste AA em texto/fundo e muted/fundo
- Açafrão (`--color-accent`) só em CTA e destaques curtos — não em parágrafo longo
- Foco visível `--ring` (2px sólido)
- Rótulos visíveis; `prefers-reduced-motion`: animações off

### 5.5 Confiança e dado

- Sem PII em logs; login demo só em ambiente de teste
- Footer: mensalidade fixa — sem % sobre pedido

---

## 6. UI — pele PedidoMesa

### 6.1 Logo

| Uso | Arquivo | Fundo |
|:---|:---|:---|
| Marca tipográfica | **PedidoMesa** em Fraunces | escuro |
| Favicon | pendente | — |

### 6.2 Cor — regra 70 / 20 / 10

| Fatia | Papel | Hex | Token |
|:---|:---|:---|:---|
| 70% | Fundo | `#17100C` | `--color-bg` |
| 20% | Marca / superfície | `#3D241C` / soft `#241610` | `--color-brand` / `--color-surface` |
| 10% | Acento / CTA | `#E8943A` | `--color-accent` |

| Nome | Hex | Token | Uso |
|:---|:---|:---|:---|
| Texto | `#F6EFE4` | `--color-text` | body |
| Texto auxiliar | `#C9B8A4` | `--color-muted` | auxiliar (≥ 4.5:1 no bg) |
| Linha | `#3A2A22` | `--color-border` | bordas |
| Sucesso | `#5CB86A` | `--color-success` | status ok |
| Erro | `#E06B5C` | `--color-error` | erro |
| Hover accent | `#F0A54F` | `--color-accent-hover` | CTA hover |
| Disabled | `#5A4A40` | `--color-disabled` | inativo |

### 6.3 Tipografia

| Papel | Família | Pesos | Token | Fallback |
|:---|:---|:---|:---|:---|
| Display / títulos | Fraunces | 600–700 | `--font-display` | Georgia, serif |
| UI / corpo | DM Sans | 400–600 | `--font-ui` | system-ui, sans-serif |

**Escala (chassis):**

| Papel | Tamanho | Line-height | Uso |
|:---|:---|:---|:---|
| Display | 2.5rem / 40px | 1.15 | hero |
| H1 | 2rem / 32px | 1.2 | página |
| H2 | 1.5rem / 24px | 1.25 | seção |
| H3 | 1.25rem / 20px | 1.3 | bloco |
| Body | 1rem / 16px | 1.5 | texto |
| Small | 0.875rem / 14px | 1.45 | auxiliar |
| Caption | 0.75rem / 12px | 1.4 | meta |

### 6.4 Espaço, canto, elevação

| Token | Valor | Uso |
|:---|:---|:---|
| `--space-unit` | 8px | base |
| `--radius-control` | 12px | botão, input |
| `--radius-surface` | 12px | painéis |
| `--shadow-soft` | `0 8px 24px rgba(0,0,0,.35)` | elevação leve (sem glow) |
| `--max-width` | 960px | conteúdo |

### 6.5 Estados visuais de controle

| Estado | Botão primário | Input |
|:---|:---|:---|
| Default | bg accent, texto `#17100C` | bg `#120D0A`, border border |
| Hover | accent-hover | border um tom mais claro |
| Focus | ring 2px accent | ring 2px accent |
| Disabled | disabled, opacity 0.55, cursor not-allowed | idem |
| Error | — | border error + texto error abaixo |
| Success | — | feedback curto em success |
| Loading | spinner + label “…”; disabled | — |

### 6.6 Peças de interface

| Peça | Regra |
|:---|:---|
| Botão principal | Um por vista; accent; verbo; radius 12px (**não** pill) |
| Botão secundário | Contorno border + texto; nunca compete |
| Campo | Fundo `#120D0A`; rótulo muted |
| Tabela | header surface; zebra suave; ações no fim da linha |
| Card | só se clicável ou agrupa ação (mesa, pedido) |

### 6.7 Movimento

Fade/slide ≤ 200ms no hero e troca de mesa; respeita `prefers-reduced-motion`. Sem glow, sem pulse agressivo.

---

## 7. Layouts gerenciais (padrões)

Estrutura comum Tech42; pele PedidoMesa nos tokens.

### 7.1 Home gerencial

- Shell: topo compacto (marca + estabelecimento) + nav lateral (desktop) / bottom nav (mobile)
- Centro: 1 KPI principal (mesas abertas ou faturamento do dia) + CTA único (**Abrir balcão** ou **Ver cozinha**)
- Sem cards decorativos; no máximo 3 blocos acionáveis

### 7.2 Dashboard

- Grid: resumo do dia → mesas ativas → pedidos em cozinha
- Hierarquia: número grande (display/H1) → label small → ação
- Filtros secundários; nunca dois CTAs primários

### 7.3 Settings

- Lista de seções à esquerda (ou accordion no mobile): Estabelecimento, Cardápio, Equipe, Cobrança
- Formulário à direita; salvar = único primário
- Mudanças destrutivas = secundário + confirmação

### 7.4 Users (equipe)

- Tabela: nome, papel (balcão/cozinha/dono), status, ações
- CTA único: **Convidar** / **Adicionar**
- Vazio: ilustração tipográfica + CTA

---

## 8. Tokens CSS concretos (`web/app/globals.css`)

```css
:root {
  /* Pele PedidoMesa */
  --color-bg: #17100C;
  --color-surface: #241610;
  --color-brand: #3D241C;
  --color-accent: #E8943A;
  --color-accent-hover: #F0A54F;
  --color-text: #F6EFE4;
  --color-muted: #C9B8A4;
  --color-border: #3A2A22;
  --color-success: #5CB86A;
  --color-error: #E06B5C;
  --color-disabled: #5A4A40;
  --color-ring: #E8943A;
  --color-on-accent: #17100C;

  --font-display: "Fraunces", Georgia, serif;
  --font-ui: "DM Sans", system-ui, sans-serif;

  /* Chassis */
  --space-unit: 8px;
  --radius-control: 12px;
  --radius-surface: 12px;
  --shadow-soft: 0 8px 24px rgba(0, 0, 0, 0.35);
  --max-width: 960px;
  --touch-min: 44px;
}
```

---

## 9. Aplicações fora da tela

| Peça | Como vestir |
|:---|:---|
| Post | Uma frase + açafrão num detalhe; fundo carvão |
| WhatsApp | Voz da §4; sem emoji excessivo |

---

## 10. Pode / não pode

**Pode:** noite de boteco, Fraunces, um CTA açafrão, radial quente sutil no hero.

**Não pode:** roxo/indigo, cream+terracotta clichê, Inter/Roboto/Arial, Material Design genérico, glow, pills 999px como padrão, paleta de outro produto da casa.

---

## 11. Inventário de arquivos

| Arquivo | Onde |
|:---|:---|
| Este documento | `docs/BRAND_SYSTEM_DESIGNER.md` |
| Tokens CSS | `web/app/globals.css` |
| Layout + fontes | `web/app/layout.tsx` |
| Landing | `web/app/page.tsx` |
| Mesa cliente | `web/app/m/[token]/page.tsx` |
| Cardápio | `web/app/cardapio/page.tsx` |
| Balcão | `web/app/balcao/page.tsx` |
| Cozinha | `web/app/cozinha/page.tsx` |

---

## 12. Governança

Aprovação vigente: CEO + design-UX (2026-08-24). Mudança de cor/tipo: atualizar este doc **e** `:root` no mesmo PR/commit lógico.

---

## 13. Checklist antes de entregar

- [x] Doc v2.0 vigente
- [x] Chassis + pele distintos
- [x] 70/20/10; açafrão só CTA
- [x] Fraunces + DM Sans; radius 12px (sem pill padrão)
- [x] Layouts home/dashboard/settings/users
- [x] Tokens CSS nomeados
- [x] Uma ação óbvia; não parece outro produto da casa

---

*Tech 42 LTDA — PedidoMesa · Brand System 2.0 · 2026-08-24*
