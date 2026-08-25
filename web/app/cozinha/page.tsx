"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { apiBase } from "@/lib/api";
import { useRequireAuth } from "@/lib/useRequireAuth";

type Pedido = {
  id: number;
  mesa_id: number;
  nome_item: string;
  quantidade: number;
  status: string;
  modo: string;
  cliente_nome: string | null;
};

export default function CozinhaPage() {
  const { ready, token } = useRequireAuth();
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [erro, setErro] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(true);

  const carregar = useCallback(async (access: string) => {
    const res = await fetch(`${apiBase()}/api/v1/cozinha/abertos`, {
      headers: { Authorization: `Bearer ${access}` },
    });
    if (!res.ok) throw new Error("Não carregou a fila da cozinha.");
    setPedidos(await res.json());
  }, []);

  useEffect(() => {
    if (!ready || !token) return;
    let cancelled = false;
    let intervalId: ReturnType<typeof setInterval> | undefined;

    (async () => {
      try {
        await carregar(token);
        intervalId = setInterval(() => carregar(token), 5000);
      } catch (e) {
        if (!cancelled) {
          setErro(e instanceof Error ? e.message : "Falha na cozinha.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      if (intervalId) clearInterval(intervalId);
    };
  }, [carregar, ready, token]);

  async function pronto(id: number) {
    setErro("");
    setMsg("");
    const res = await fetch(`${apiBase()}/api/v1/cozinha/pedidos/${id}/pronto`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      setErro("Não marcou como pronto.");
      return;
    }
    setMsg("Pedido marcado como pronto.");
    await carregar(token);
  }

  return (
    <div className="shell">
      <nav className="nav" aria-label="Cozinha">
        <Link href="/" className="nav__brand">
          PedidoMesa
        </Link>
        <div className="nav__links">
          <Link href="/balcao" className="nav__link">
            Balcão
          </Link>
          <Link href="/cardapio" className="nav__link">
            Cardápio
          </Link>
        </div>
      </nav>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div>
          <h1
            style={{
              fontSize: "clamp(1.6rem, 5vw, 2.2rem)",
              margin: "0 0 6px",
            }}
          >
            Painel da cozinha
          </h1>
          <p style={{ color: "var(--muted)", margin: 0 }}>
            Pedidos abertos — atualiza a cada 5 segundos.
          </p>
        </div>
        <span className="badge badge--warn">ao vivo</span>
      </div>

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

      <h2 className="section-title">Na fila</h2>
      {loading ? (
        <div className="empty">
          <strong>Aquecendo a chapa…</strong>
          carregando pedidos.
        </div>
      ) : pedidos.length === 0 ? (
        <div className="empty">
          <strong>Fila vazia</strong>
          Nenhum pedido aberto. Aproveita pra respirar.
        </div>
      ) : (
        <div className="grid grid--2">
          {pedidos.map((p) => (
            <article key={p.id} className="card rise">
              <div className="row" style={{ borderBottom: "none", paddingTop: 0 }}>
                <div>
                  <div className="row__name">
                    {p.quantidade}× {p.nome_item}
                  </div>
                  <div className="row__meta">
                    mesa #{p.mesa_id} · {p.modo}
                    {p.cliente_nome ? ` · ${p.cliente_nome}` : ""}
                  </div>
                </div>
                <span className="badge badge--warn">{p.status}</span>
              </div>
              <button
                type="button"
                className="btn btn--primary btn--block"
                onClick={() => pronto(p.id)}
                style={{ marginTop: 12 }}
              >
                Marcar pronto
              </button>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
