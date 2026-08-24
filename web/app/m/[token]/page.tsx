"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

type Item = {
  id: number;
  nome: string;
  descricao: string | null;
  preco_centavos: number;
};

type Pedido = {
  id: number;
  nome_item: string;
  preco_centavos: number;
  quantidade: number;
  cliente_nome: string | null;
  modo: string;
  status: string;
};

function brl(centavos: number) {
  return (centavos / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export default function MesaPage() {
  const { token } = useParams<{ token: string }>();
  const [itens, setItens] = useState<Item[]>([]);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [clienteNome, setClienteNome] = useState("");
  const [modo, setModo] = useState<"individual" | "coletivo">("individual");
  const [msg, setMsg] = useState("");
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(true);

  const carregar = useCallback(() => {
    setLoading(true);
    Promise.all([
      fetch(`${API}/api/v1/cardapio`).then((r) => r.json()),
      fetch(`${API}/api/v1/pedidos/mesa/${token}`).then((r) => r.json()),
    ])
      .then(([ci, cp]) => {
        setItens(ci);
        setPedidos(cp);
        setErro("");
      })
      .catch(() => {
        setErro("Não conseguimos falar com a cozinha agora. Tente de novo.");
      })
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const pedir = async (item: Item) => {
    setMsg("");
    setErro("");
    const r = await fetch(`${API}/api/v1/pedidos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mesa_token: token,
        cardapio_item_id: item.id,
        quantidade: 1,
        cliente_nome: clienteNome || null,
        modo,
      }),
    });
    if (r.ok) {
      setMsg(`"${item.nome}" enviado! Já está a caminho da cozinha.`);
      carregar();
    } else {
      setErro("Ops, o pedido não saiu. Tenta mais uma vez?");
    }
  };

  const total = pedidos.reduce(
    (s, p) => s + p.preco_centavos * p.quantidade,
    0
  );

  return (
    <div className="shell shell--narrow">
      <nav className="nav" aria-label="Mesa">
        <Link href="/" className="nav__brand">
          PedidoMesa
        </Link>
        <span className="badge badge--warn">Mesa</span>
      </nav>

      <header className="rise">
        <h1 style={{ fontSize: "clamp(1.6rem, 5vw, 2.2rem)", margin: "0 0 6px" }}>
          Boa noite! O que vai ser?
        </h1>
        <p style={{ color: "var(--muted)", margin: 0 }}>
          Peça no seu ritmo — a cozinha recebe na hora.
        </p>
      </header>

      <form
        className="card rise"
        onSubmit={(e) => e.preventDefault()}
        style={{ marginTop: 20 }}
      >
        <label className="field">
          <span>Seu nome (opcional)</span>
          <input
            className="input"
            value={clienteNome}
            onChange={(e) => setClienteNome(e.target.value)}
            placeholder="Ex.: Ana"
            autoComplete="nickname"
          />
        </label>
        <label className="field">
          <span>Modo do pedido</span>
          <select
            className="input"
            value={modo}
            onChange={(e) => setModo(e.target.value as typeof modo)}
          >
            <option value="individual">Só meu</option>
            <option value="coletivo">Dividir com a mesa</option>
          </select>
        </label>
      </form>

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

      <h2 className="section-title">Cardápio</h2>
      {loading ? (
        <div className="empty">
          <strong>Pegando o cardápio…</strong>
          só um instante.
        </div>
      ) : itens.length === 0 ? (
        <div className="empty">
          <strong>Cardápio vazio por aqui</strong>
          Fale com o balcão — deve ser só um momento.
        </div>
      ) : (
        <div className="grid grid--2">
          {itens.map((item) => (
            <article key={item.id} className="card">
              <h3 style={{ fontSize: "1.05rem", margin: "0 0 4px" }}>
                {item.nome}
              </h3>
              {item.descricao && (
                <p
                  style={{
                    color: "var(--muted)",
                    fontSize: ".9rem",
                    margin: "0 0 12px",
                  }}
                >
                  {item.descricao}
                </p>
              )}
              <div className="row" style={{ borderBottom: "none", paddingTop: 0 }}>
                <span className="row__price">{brl(item.preco_centavos)}</span>
                <button
                  type="button"
                  className="btn btn--primary btn--sm"
                  onClick={() => pedir(item)}
                  aria-label={`Pedir ${item.nome}`}
                >
                  Pedir
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      <h2 className="section-title">Seus pedidos</h2>
      <div className="card">
        {pedidos.length === 0 ? (
          <div className="empty" style={{ border: "none" }}>
            <strong>Nada pedido ainda</strong>
            Escolha algo acima e faça sua primeira rodada.
          </div>
        ) : (
          <>
            {pedidos.map((p) => (
              <div key={p.id} className="row">
                <div>
                  <div className="row__name">
                    {p.quantidade}× {p.nome_item}
                  </div>
                  <div className="row__meta">
                    {p.cliente_nome ? `${p.cliente_nome} · ` : ""}
                    {p.modo === "coletivo" ? "da mesa" : "individual"} ·{" "}
                    <span
                      className={`badge ${
                        p.status === "pronto" ? "badge--ok" : "badge--warn"
                      }`}
                    >
                      {p.status === "pronto" ? "pronto" : p.status}
                    </span>
                  </div>
                </div>
                <span className="row__price">
                  {brl(p.preco_centavos * p.quantidade)}
                </span>
              </div>
            ))}
            <div className="total">
              <span>Total</span>
              <span>{brl(total)}</span>
            </div>
          </>
        )}
      </div>

      <footer className="footer-note">Sua mesa, seu ritmo. Bom apetite!</footer>
    </div>
  );
}
