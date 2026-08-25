"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { apiBase, authHeaders, formatBRL } from "@/lib/api";
import { useRequireAuth } from "@/lib/useRequireAuth";

type Mesa = {
  id: number;
  nome: string;
  status: string;
  qr_token: string;
};
type Item = {
  id: number;
  nome: string;
  preco_centavos: number;
};
type Pedido = {
  id: number;
  mesa_id: number;
  nome_item: string;
  quantidade: number;
  preco_centavos: number;
  status: string;
  cliente_nome?: string | null;
};
type Linha = {
  key: string;
  cardapio_item_id: number;
  nome: string;
  quantidade: number;
  modo: "individual" | "coletivo";
  cliente_nome: string;
};

export default function GarcomPage() {
  const { ready } = useRequireAuth();
  const [mesas, setMesas] = useState<Mesa[]>([]);
  const [mesaSel, setMesaSel] = useState<Mesa | null>(null);
  const [itens, setItens] = useState<Item[]>([]);
  const [linhas, setLinhas] = useState<Linha[]>([]);
  const [itemSelId, setItemSelId] = useState<number | "">("");
  const [qtd, setQtd] = useState(1);
  const [modo, setModo] = useState<"individual" | "coletivo">("coletivo");
  const [clienteNome, setClienteNome] = useState("");
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [erro, setErro] = useState("");
  const [msg, setMsg] = useState("");
  const [enviando, setEnviando] = useState(false);

  const carregarMesas = useCallback(async () => {
    const res = await fetch(`${apiBase()}/api/v1/mesas`, {
      headers: authHeaders(),
    });
    if (!res.ok) throw new Error("Falha ao carregar mesas.");
    setMesas(await res.json());
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
        await carregarMesas();
        const r = await fetch(`${apiBase()}/api/v1/cardapio`);
        if (!r.ok) throw new Error("Falha no cardápio.");
        setItens(await r.json());
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
      },
    ]);
    setItemSelId("");
    setQtd(1);
    setErro("");
  }

  async function enviar() {
    if (!mesaSel || linhas.length === 0) return;
    setEnviando(true);
    setErro("");
    try {
      for (const l of linhas) {
        const res = await fetch(`${apiBase()}/api/v1/pedidos`, {
          method: "POST",
          headers: authHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify({
            mesa_token: mesaSel.qr_token,
            cardapio_item_id: l.cardapio_item_id,
            quantidade: l.quantidade,
            modo: l.modo,
            cliente_nome: l.modo === "individual" ? l.cliente_nome : null,
          }),
        });
        if (!res.ok) throw new Error("Falha ao enviar um dos itens.");
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

  async function fecharConta() {
    if (!mesaSel) return;
    const res = await fetch(
      `${apiBase()}/api/v1/conta/mesa/${mesaSel.qr_token}/fechar`,
      { method: "POST", headers: authHeaders() }
    );
    if (!res.ok) {
      setErro("Não fechou a conta.");
      return;
    }
    setMsg(`Conta de ${mesaSel.nome} fechada.`);
    setMesaSel(null);
    await carregarMesas();
  }

  const total = useMemo(
    () =>
      pedidos
        .filter((p) => p.status !== "cancelado")
        .reduce((a, p) => a + p.preco_centavos * p.quantidade, 0),
    [pedidos]
  );

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
      <p style={{ color: "var(--muted)", marginTop: 0 }}>
        Escolha a mesa, monte o pedido e envie pra cozinha.
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
              <div className="row__name">{mesaSel.nome}</div>
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
                    </div>
                  </div>
                  {p.status !== "entregue" && p.status !== "cancelado" && (
                    <button
                      type="button"
                      className="btn btn--ghost btn--sm"
                      onClick={() => entregue(p.id)}
                    >
                      Entregue
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="card">
            <div className="row__name">Total: {formatBRL(total)}</div>
            <button
              type="button"
              className="btn btn--primary btn--block"
              style={{ marginTop: 12 }}
              onClick={fecharConta}
            >
              Fechar conta
            </button>
          </div>
        </>
      )}
    </div>
  );
}
