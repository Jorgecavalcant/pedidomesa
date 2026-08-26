"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  TAXA_SERVICO_BPS_DEFAULT,
  apiBase,
  authHeaders,
  createPedido,
  criarSolicitacao,
  fecharConta,
  fetchContaMesa,
  fetchMe,
  fetchSettings,
  formatBRL,
  listMesas,
  patchPedidoPosicoes,
  previewFechamento,
  type Mesa,
  type Papel,
  type Pedido,
} from "@/lib/api";
import { useRequireAuth } from "@/lib/useRequireAuth";

type Item = {
  id: number;
  nome: string;
  preco_centavos: number;
};
type Linha = {
  key: string;
  cardapio_item_id: number;
  nome: string;
  quantidade: number;
  modo: "individual" | "coletivo";
  cliente_nome: string;
  posicoes: number[];
};

type EscopoUi = "posicoes" | "grupo" | "itens" | "mesa";

export default function GarcomPage() {
  const { ready } = useRequireAuth();
  const [papel, setPapel] = useState<Papel | string>("dono");
  const [mesas, setMesas] = useState<Mesa[]>([]);
  const [mesaSel, setMesaSel] = useState<Mesa | null>(null);
  const [itens, setItens] = useState<Item[]>([]);
  const [linhas, setLinhas] = useState<Linha[]>([]);
  const [itemSelId, setItemSelId] = useState<number | "">("");
  const [qtd, setQtd] = useState(1);
  const [modo, setModo] = useState<"individual" | "coletivo">("coletivo");
  const [clienteNome, setClienteNome] = useState("");
  const [posicoesLinha, setPosicoesLinha] = useState<number[]>([]);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [erro, setErro] = useState("");
  const [msg, setMsg] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [taxaBps, setTaxaBps] = useState(TAXA_SERVICO_BPS_DEFAULT);

  const [escopo, setEscopo] = useState<EscopoUi>("mesa");
  const [posicoesFechar, setPosicoesFechar] = useState<number[]>([]);
  const [itensFechar, setItensFechar] = useState<number[]>([]);
  const [aplicarTaxa, setAplicarTaxa] = useState(true);
  const [grupoCliente, setGrupoCliente] = useState("");

  const capacidade =
    mesaSel?.capacidade && mesaSel.capacidade >= 1 ? mesaSel.capacidade : 8;

  const carregarMesas = useCallback(async () => {
    setMesas(await listMesas());
  }, []);

  const carregarPedidos = useCallback(async (mesaId: number) => {
    const res = await fetch(`${apiBase()}/api/v1/pedidos?mesa_id=${mesaId}`, {
      headers: authHeaders(),
    });
    if (!res.ok) throw new Error("Falha ao carregar pedidos.");
    setPedidos(await res.json());
  }, []);

  useEffect(() => {
    if (!ready) return;
    (async () => {
      try {
        const me = await fetchMe().catch(() => null);
        if (me?.papel) setPapel(me.papel);
        await carregarMesas();
        const r = await fetch(`${apiBase()}/api/v1/cardapio`);
        if (!r.ok) throw new Error("Falha no cardápio.");
        setItens(await r.json());
        try {
          const s = await fetchSettings();
          if (typeof s.taxa_servico_bps === "number") setTaxaBps(s.taxa_servico_bps);
        } catch {
          /* default */
        }
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Falha inicial.");
      }
    })();
  }, [ready, carregarMesas]);

  useEffect(() => {
    if (mesaSel) carregarPedidos(mesaSel.id).catch(() => {});
  }, [mesaSel, carregarPedidos]);

  async function escolherMesa(m: Mesa) {
    setErro("");
    setMsg("");
    if (m.status === "fechada") {
      const res = await fetch(`${apiBase()}/api/v1/mesas/${m.id}/reabrir`, {
        method: "POST",
        headers: authHeaders(),
      });
      if (!res.ok) {
        setErro("Não reabriu a mesa.");
        return;
      }
      setMsg(`${m.nome} reaberta.`);
      await carregarMesas();
      m = { ...m, status: "livre" };
    }
    setMesaSel(m);
    setLinhas([]);
    setEscopo("mesa");
    setPosicoesFechar([]);
    setItensFechar([]);
    setGrupoCliente("");
  }

  function toggleArr(n: number, arr: number[], set: (v: number[]) => void) {
    set(
      arr.includes(n)
        ? arr.filter((x) => x !== n)
        : [...arr, n].sort((a, b) => a - b)
    );
  }

  function addLinha(e: FormEvent) {
    e.preventDefault();
    if (itemSelId === "") return;
    if (modo === "individual" && !clienteNome.trim()) {
      setErro("Informe o nome do cliente no modo individual.");
      return;
    }
    const item = itens.find((i) => i.id === itemSelId);
    if (!item) return;
    setLinhas((prev) => [
      ...prev,
      {
        key: `${Date.now()}-${item.id}`,
        cardapio_item_id: item.id,
        nome: item.nome,
        quantidade: qtd,
        modo,
        cliente_nome: clienteNome.trim(),
        posicoes: [...posicoesLinha],
      },
    ]);
    setItemSelId("");
    setQtd(1);
    setPosicoesLinha([]);
    setErro("");
  }

  async function enviar() {
    if (!mesaSel || linhas.length === 0) return;
    setEnviando(true);
    setErro("");
    try {
      for (const l of linhas) {
        await createPedido({
          mesa_token: mesaSel.qr_token,
          cardapio_item_id: l.cardapio_item_id,
          quantidade: l.quantidade,
          modo: l.modo,
          cliente_nome: l.modo === "individual" ? l.cliente_nome : null,
          posicoes: l.posicoes.length ? l.posicoes : null,
        });
      }
      setLinhas([]);
      setMsg("Pedidos enviados.");
      await carregarPedidos(mesaSel.id);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao enviar.");
    } finally {
      setEnviando(false);
    }
  }

  async function entregue(id: number) {
    const res = await fetch(`${apiBase()}/api/v1/pedidos/${id}/status`, {
      method: "PATCH",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ status: "entregue" }),
    });
    if (!res.ok) {
      setErro("Não marcou entregue.");
      return;
    }
    if (mesaSel) await carregarPedidos(mesaSel.id);
  }

  async function solicitarCancelamento(pedido: Pedido) {
    setErro("");
    setMsg("");
    if (papel === "dono") {
      const res = await fetch(`${apiBase()}/api/v1/pedidos/${pedido.id}/status`, {
        method: "PATCH",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ status: "cancelado" }),
      });
      if (!res.ok) {
        setErro("Não cancelou o pedido.");
        return;
      }
      setMsg(`Pedido #${pedido.id} cancelado.`);
      if (mesaSel) await carregarPedidos(mesaSel.id);
      return;
    }
    try {
      await criarSolicitacao({
        tipo: "cancelar_pedido",
        pedido_id: pedido.id,
        payload: { motivo: "Solicitação do garçom" },
      });
      setMsg(`Solicitação de cancelamento do pedido #${pedido.id} enviada ao dono.`);
    } catch (e) {
      // TODO: POST /solicitacoes
      setErro(
        e instanceof Error
          ? e.message
          : "Não foi possível solicitar cancelamento (API F1)."
      );
    }
  }

  async function reatribuir(pedido: Pedido) {
    const raw = prompt(
      "Novas posições (ex.: 1,2). Vazio = coletivo da mesa:",
      (pedido.posicoes || []).join(",")
    );
    if (raw === null) return;
    const posicoes = raw
      .split(/[,\s]+/)
      .map((x) => Number(x.trim()))
      .filter((n) => n >= 1);
    try {
      await patchPedidoPosicoes(pedido.id, posicoes);
      setMsg(`Pedido #${pedido.id} reatribuído.`);
      if (mesaSel) await carregarPedidos(mesaSel.id);
    } catch (e) {
      // TODO: PATCH /pedidos/{id}/posicoes
      setErro(
        e instanceof Error
          ? e.message
          : "Reatribuição ainda não disponível na API."
      );
    }
  }

  const abertos = useMemo(
    () => pedidos.filter((p) => p.status !== "cancelado" && !p.quitado),
    [pedidos]
  );

  const clientesGrupo = useMemo(() => {
    const set = new Set<string>();
    abertos.forEach((p) => {
      if (p.cliente_nome) set.add(p.cliente_nome);
    });
    return Array.from(set).sort();
  }, [abertos]);

  const itensEscopo = useMemo(() => {
    if (escopo === "mesa") return abertos;
    if (escopo === "posicoes") {
      if (!posicoesFechar.length) return [];
      return abertos.filter((p) => {
        if (!p.posicoes?.length) return false;
        return p.posicoes.some((x) => posicoesFechar.includes(x));
      });
    }
    if (escopo === "grupo") {
      if (!grupoCliente) return [];
      return abertos.filter(
        (p) =>
          (p.cliente_nome || "").toLowerCase() === grupoCliente.toLowerCase()
      );
    }
    // itens
    return abertos.filter((p) => itensFechar.includes(p.id));
  }, [escopo, abertos, posicoesFechar, grupoCliente, itensFechar]);

  const subtotal = useMemo(
    () => itensEscopo.reduce((a, p) => a + p.preco_centavos * p.quantidade, 0),
    [itensEscopo]
  );
  const preview = useMemo(
    () => previewFechamento(subtotal, taxaBps, aplicarTaxa),
    [subtotal, taxaBps, aplicarTaxa]
  );

  async function fecharContaEscopo() {
    if (!mesaSel) return;
    setErro("");
    setMsg("");

    let body;
    if (escopo === "mesa") {
      body = { escopo: "mesa" as const, aplicar_taxa: aplicarTaxa };
    } else if (escopo === "posicoes") {
      if (!posicoesFechar.length) {
        setErro("Escolha ao menos uma posição.");
        return;
      }
      body = {
        escopo: "posicoes" as const,
        posicoes: posicoesFechar,
        aplicar_taxa: aplicarTaxa,
      };
    } else if (escopo === "itens" || escopo === "grupo") {
      const ids = itensEscopo.map((p) => p.id);
      if (!ids.length) {
        setErro("Nenhum item no escopo.");
        return;
      }
      body = {
        escopo: "itens" as const,
        pedido_ids: ids,
        aplicar_taxa: aplicarTaxa,
      };
    }

    try {
      let apiF1 = false;
      try {
        const c = await fetchContaMesa(mesaSel.qr_token);
        if (typeof c.taxa_bps === "number") setTaxaBps(c.taxa_bps);
        apiF1 =
          typeof c.saldo_aberto_centavos === "number" ||
          typeof c.taxa_bps === "number" ||
          typeof c.por_posicao === "object";
      } catch {
        /* ignore */
      }

      const parcial = escopo !== "mesa";
      if (parcial && !apiF1) {
        // TODO: POST fechar com escopo posicoes|itens — não chama API legada (fecharia a mesa inteira)
        setErro(
          "Fechamento parcial aguarda API F1. Preview: " +
            `${formatBRL(preview.total_centavos)} (sub ${formatBRL(preview.subtotal_centavos)} + taxa ${formatBRL(preview.taxa_centavos)}).`
        );
        return;
      }

      const out = await fecharConta(mesaSel.qr_token, body);
      if (
        parcial &&
        typeof out.fechamento_id !== "number" &&
        typeof out.mesa_saldo_aberto_centavos !== "number"
      ) {
        setMsg(
          `Atenção: resposta sem marcadores F1 — a mesa pode ter fechado por completo (${formatBRL(out.total_centavos ?? 0)}).`
        );
        setMesaSel(null);
        await carregarMesas();
        return;
      }
      setMsg(
        `Fechamento ${escopo}: ${formatBRL(out.total_centavos ?? preview.total_centavos)}` +
          (aplicarTaxa
            ? ` (sub ${formatBRL(preview.subtotal_centavos)} + taxa ${formatBRL(preview.taxa_centavos)})`
            : "") +
          (typeof out.mesa_saldo_aberto_centavos === "number"
            ? ` · saldo ${formatBRL(out.mesa_saldo_aberto_centavos)}`
            : "")
      );
      if (out.mesa_status === "fechada" || out.status === "fechada") {
        setMesaSel(null);
        await carregarMesas();
      } else {
        await carregarPedidos(mesaSel.id);
      }
    } catch (e) {
      if (escopo === "mesa") {
        try {
          const res = await fetch(
            `${apiBase()}/api/v1/conta/mesa/${mesaSel.qr_token}/fechar`,
            { method: "POST", headers: authHeaders() }
          );
          if (!res.ok) throw e;
          const conta = await res.json();
          setMsg(
            `Conta de ${mesaSel.nome} fechada: ${formatBRL(conta.total_centavos ?? 0)}. ` +
              `Preview taxa ${formatBRL(preview.taxa_centavos)} (API parcial pendente).`
          );
          // TODO: POST fechar com escopo parcial
          setMesaSel(null);
          await carregarMesas();
          return;
        } catch {
          /* fallthrough */
        }
      }
      setErro(
        e instanceof Error
          ? e.message
          : "Fechamento parcial exige API F1."
      );
    }
  }

  if (!ready) {
    return (
      <div className="shell">
        <div className="empty">
          <strong>Verificando sessão…</strong>
        </div>
      </div>
    );
  }

  return (
    <div className="shell">
      <nav className="nav" aria-label="Garçom">
        <Link href="/home" className="nav__brand">
          PedidoMesa
        </Link>
        <div className="nav__links">
          <Link href="/mesas" className="nav__link">
            Mesas
          </Link>
          <Link href="/cozinha" className="nav__link">
            Cozinha
          </Link>
        </div>
      </nav>

      <h1 style={{ fontSize: "clamp(1.6rem, 5vw, 2.2rem)", margin: "0 0 6px" }}>
        Garçom
      </h1>
      <p style={{ color: "var(--color-muted)", marginTop: 0 }}>
        Pedidos por posição, fechamento parcial (+ taxa) e solicitações.
        {papel === "garcom" ? " · você solicita cancelamentos" : ""}
      </p>

      {msg && (
        <div className="status status--ok" role="status">
          {msg}
        </div>
      )}
      {erro && (
        <div className="status status--error" role="alert">
          {erro}
        </div>
      )}

      {!mesaSel ? (
        <>
          <h2 className="section-title">1. Escolher mesa</h2>
          {mesas.length === 0 ? (
            <div className="empty">
              <strong>Nenhuma mesa</strong>
              Crie em Mesas primeiro.
            </div>
          ) : (
            <div className="grid grid--2">
              {mesas.map((m) => (
                <article key={m.id} className="card">
                  <div className="row__name">{m.nome}</div>
                  <div className="row__meta">
                    {m.capacidade ?? "—"} cadeiras
                    {m.setor ? ` · ${m.setor}` : ""}
                  </div>
                  <span className={`badge ${m.status === "fechada" ? "" : "badge--ok"}`}>
                    {m.status}
                  </span>
                  <button
                    type="button"
                    className="btn btn--primary btn--block"
                    style={{ marginTop: 12 }}
                    onClick={() => escolherMesa(m)}
                  >
                    {m.status === "fechada" ? "Reabrir e usar" : "Usar mesa"}
                  </button>
                </article>
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          <div className="card">
            <div className="row" style={{ borderBottom: "none", paddingTop: 0 }}>
              <div>
                <div className="row__name">{mesaSel.nome}</div>
                <div className="row__meta">
                  até {capacidade} posições
                </div>
              </div>
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={() => setMesaSel(null)}
              >
                Trocar
              </button>
            </div>
          </div>

          <h2 className="section-title">2. Montar pedido</h2>
          <form className="card" onSubmit={addLinha}>
            <label className="field">
              <span>Item</span>
              <select
                className="input"
                value={itemSelId}
                onChange={(e) =>
                  setItemSelId(e.target.value ? Number(e.target.value) : "")
                }
                required
              >
                <option value="">Selecione…</option>
                {itens.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.nome} — {formatBRL(i.preco_centavos)}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Quantidade</span>
              <input
                className="input"
                type="number"
                min={1}
                max={99}
                value={qtd}
                onChange={(e) => setQtd(Math.max(1, Number(e.target.value)))}
              />
            </label>
            <label className="field">
              <span>Modo</span>
              <select
                className="input"
                value={modo}
                onChange={(e) =>
                  setModo(e.target.value as "individual" | "coletivo")
                }
              >
                <option value="coletivo">Coletivo</option>
                <option value="individual">Individual</option>
              </select>
            </label>
            {modo === "individual" && (
              <label className="field">
                <span>Nome do cliente</span>
                <input
                  className="input"
                  value={clienteNome}
                  onChange={(e) => setClienteNome(e.target.value)}
                  required
                />
              </label>
            )}
            <div className="field">
              <span>Posições (opcional)</span>
              <div className="posicoes-grid" style={{ marginTop: 8 }}>
                {Array.from({ length: capacidade }, (_, i) => i + 1).map((n) => {
                  const on = posicoesLinha.includes(n);
                  return (
                    <button
                      key={n}
                      type="button"
                      className={`posicao-chip ${on ? "posicao-chip--on" : ""}`}
                      aria-pressed={on}
                      onClick={() =>
                        toggleArr(n, posicoesLinha, setPosicoesLinha)
                      }
                    >
                      {n}
                    </button>
                  );
                })}
              </div>
            </div>
            <button type="submit" className="btn btn--ghost btn--block">
              Adicionar ao rascunho
            </button>
          </form>

          {linhas.length > 0 && (
            <div className="card">
              <h3 style={{ marginTop: 0 }}>Rascunho</h3>
              {linhas.map((l) => (
                <div key={l.key} className="row">
                  <div>
                    {l.quantidade}× {l.nome} · {l.modo}
                    {l.cliente_nome ? ` · ${l.cliente_nome}` : ""}
                    {l.posicoes.length
                      ? ` · pos ${l.posicoes.join(",")}`
                      : ""}
                  </div>
                  <button
                    type="button"
                    className="btn btn--ghost btn--sm"
                    onClick={() =>
                      setLinhas((p) => p.filter((x) => x.key !== l.key))
                    }
                  >
                    Remover
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="btn btn--primary btn--block"
                disabled={enviando}
                onClick={enviar}
              >
                {enviando ? "Enviando…" : "Enviar pedido"}
              </button>
            </div>
          )}

          <h2 className="section-title">Pedidos da mesa</h2>
          {pedidos.length === 0 ? (
            <div className="empty">
              <strong>Nenhum pedido nesta mesa</strong>
            </div>
          ) : (
            <div className="card">
              {pedidos.map((p) => (
                <div key={p.id} className="row">
                  <div>
                    <div className="row__name">
                      {p.quantidade}× {p.nome_item}
                    </div>
                    <div className="row__meta">
                      {p.status}
                      {p.cliente_nome ? ` · ${p.cliente_nome}` : ""}
                      {p.posicoes?.length
                        ? ` · pos ${p.posicoes.join(",")}`
                        : ""}
                      {p.quitado ? " · quitado" : ""}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {p.status !== "entregue" &&
                      p.status !== "cancelado" &&
                      !p.quitado && (
                        <button
                          type="button"
                          className="btn btn--ghost btn--sm"
                          onClick={() => entregue(p.id)}
                        >
                          Entregue
                        </button>
                      )}
                    {!p.quitado && p.status !== "cancelado" && (
                      <>
                        <button
                          type="button"
                          className="btn btn--ghost btn--sm"
                          onClick={() => reatribuir(p)}
                        >
                          Posições
                        </button>
                        <button
                          type="button"
                          className="btn btn--ghost btn--sm"
                          onClick={() => solicitarCancelamento(p)}
                        >
                          {papel === "garcom" ? "Solicitar cancel." : "Cancelar"}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          <h2 className="section-title">Fechar conta</h2>
          <div className="card">
            <label className="field">
              <span>Escopo</span>
              <select
                className="input"
                value={escopo}
                onChange={(e) => setEscopo(e.target.value as EscopoUi)}
              >
                <option value="mesa">Mesa inteira</option>
                <option value="posicoes">Por posição</option>
                <option value="grupo">Por pessoa (grupo)</option>
                <option value="itens">Por itens</option>
              </select>
            </label>

            {escopo === "posicoes" && (
              <div className="posicoes-grid" style={{ marginBottom: 12 }}>
                {Array.from({ length: capacidade }, (_, i) => i + 1).map((n) => {
                  const on = posicoesFechar.includes(n);
                  return (
                    <button
                      key={n}
                      type="button"
                      className={`posicao-chip ${on ? "posicao-chip--on" : ""}`}
                      aria-pressed={on}
                      onClick={() =>
                        toggleArr(n, posicoesFechar, setPosicoesFechar)
                      }
                    >
                      {n}
                    </button>
                  );
                })}
              </div>
            )}

            {escopo === "grupo" && (
              <label className="field">
                <span>Cliente</span>
                <select
                  className="input"
                  value={grupoCliente}
                  onChange={(e) => setGrupoCliente(e.target.value)}
                >
                  <option value="">Selecione…</option>
                  {clientesGrupo.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>
            )}

            {escopo === "itens" && (
              <div style={{ marginBottom: 12 }}>
                {abertos.map((p) => (
                  <label
                    key={p.id}
                    style={{
                      display: "flex",
                      gap: 8,
                      alignItems: "center",
                      marginBottom: 6,
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={itensFechar.includes(p.id)}
                      onChange={(e) => {
                        setItensFechar((prev) =>
                          e.target.checked
                            ? [...prev, p.id]
                            : prev.filter((x) => x !== p.id)
                        );
                      }}
                    />
                    <span>
                      {p.quantidade}× {p.nome_item} —{" "}
                      {formatBRL(p.preco_centavos * p.quantidade)}
                    </span>
                  </label>
                ))}
              </div>
            )}

            <label
              className="field"
              style={{
                display: "flex",
                gap: 10,
                alignItems: "center",
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={aplicarTaxa}
                onChange={(e) => setAplicarTaxa(e.target.checked)}
              />
              <span>Aplicar taxa ({(taxaBps / 100).toFixed(0)}%)</span>
            </label>

            <div className="row">
              <span>Subtotal</span>
              <span className="row__price">{formatBRL(preview.subtotal_centavos)}</span>
            </div>
            <div className="row">
              <span>Taxa</span>
              <span className="row__price">{formatBRL(preview.taxa_centavos)}</span>
            </div>
            <div className="total">
              <span>Total</span>
              <span>{formatBRL(preview.total_centavos)}</span>
            </div>

            <button
              type="button"
              className="btn btn--primary btn--block"
              style={{ marginTop: 12 }}
              onClick={fecharContaEscopo}
            >
              Confirmar fechamento
            </button>
          </div>
        </>
      )}
    </div>
  );
}
