"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { apiBase } from "@/lib/api";

type Mesa = { id: number; nome: string; status: string };
type Pedido = {
  id: number;
  nome_item: string;
  quantidade: number;
  preco_centavos: number;
  modo: string;
  cliente_nome: string | null;
  status: string;
};

export default function MesaClientePage({ params }: { params: { token: string } }) {
  const token = params.token;
  const [mesa, setMesa] = useState<Mesa | null>(null);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [erro, setErro] = useState("");
  const [nomeItem, setNomeItem] = useState("");
  const [preco, setPreco] = useState("12.00");
  const [qtd, setQtd] = useState("1");
  const [modo, setModo] = useState<"individual" | "coletivo">("individual");
  const [clienteNome, setClienteNome] = useState("");

  const carregar = useCallback(async () => {
    setErro("");
    const m = await fetch(`${apiBase()}/api/v1/mesas/por-token/${token}`);
    if (!m.ok) {
      setErro("Mesa não encontrada. Confira o QR.");
      return;
    }
    setMesa(await m.json());
    const p = await fetch(`${apiBase()}/api/v1/pedidos/mesa/${token}`);
    if (p.ok) setPedidos(await p.json());
  }, [token]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setErro("");
    const precoCentavos = Math.round(parseFloat(preco.replace(",", ".")) * 100);
    const res = await fetch(`${apiBase()}/api/v1/pedidos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mesa_token: token,
        nome_item: nomeItem,
        quantidade: parseInt(qtd, 10) || 1,
        preco_centavos: precoCentavos,
        modo,
        cliente_nome: modo === "individual" ? clienteNome : null,
      }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setErro(body.detail || "Não foi possível enviar o pedido.");
      return;
    }
    setNomeItem("");
    await carregar();
  }

  return (
    <main>
      <p className="muted">Pedido do cliente</p>
      <h1>{mesa ? mesa.nome : "Carregando…"}</h1>
      {mesa && <span className="badge">status: {mesa.status}</span>}
      {erro && <p style={{ color: "var(--danger)" }}>{erro}</p>}

      <form className="card" onSubmit={enviar} style={{ marginTop: "1.25rem" }}>
        <h2 style={{ marginTop: 0 }}>Novo item</h2>
        <label>O que você quer?</label>
        <input value={nomeItem} onChange={(e) => setNomeItem(e.target.value)} required />
        <label>Preço (R$)</label>
        <input value={preco} onChange={(e) => setPreco(e.target.value)} required />
        <label>Quantidade</label>
        <input value={qtd} onChange={(e) => setQtd(e.target.value)} required />
        <label>Modo</label>
        <select value={modo} onChange={(e) => setModo(e.target.value as "individual" | "coletivo")}>
          <option value="individual">Individual (só meu)</option>
          <option value="coletivo">Coletivo (mesa)</option>
        </select>
        {modo === "individual" && (
          <>
            <label>Seu nome</label>
            <input value={clienteNome} onChange={(e) => setClienteNome(e.target.value)} required />
          </>
        )}
        <button className="btn" type="submit">
          Pedir
        </button>
      </form>

      <h2>Itens da mesa</h2>
      {pedidos.length === 0 && <p className="muted">Nenhum pedido ainda.</p>}
      {pedidos.map((p) => (
        <div className="card" key={p.id}>
          <strong>
            {p.quantidade}× {p.nome_item}
          </strong>
          <div className="muted">
            {(p.preco_centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} ·{" "}
            {p.modo}
            {p.cliente_nome ? ` · ${p.cliente_nome}` : ""} · {p.status}
          </div>
        </div>
      ))}
    </main>
  );
}
