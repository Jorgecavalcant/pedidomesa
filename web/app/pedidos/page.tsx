"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { apiBase, authHeaders, formatBRL } from "@/lib/api";
import { useRequireAuth } from "@/lib/useRequireAuth";

type Pedido = {
  id: number;
  mesa_id: number;
  nome_item: string;
  quantidade: number;
  preco_centavos: number;
  modo: string;
  cliente_nome?: string | null;
  status: string;
  created_at?: string;
};

const STATUS = [
  "",
  "pendente",
  "preparando",
  "pronto",
  "entregue",
  "cancelado",
] as const;

function PedidosInner() {
  const { ready } = useRequireAuth();
  const searchParams = useSearchParams();
  const statusParam = searchParams.get("status") || "";
  const initialFiltro = STATUS.includes(statusParam as (typeof STATUS)[number])
    ? statusParam
    : "";
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [filtro, setFiltro] = useState(initialFiltro);
  const [erro, setErro] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (initialFiltro && filtro !== initialFiltro) setFiltro(initialFiltro);
    // sync once from URL
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialFiltro]);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const qs = filtro ? `?status=${encodeURIComponent(filtro)}` : "";
      const res = await fetch(`${apiBase()}/api/v1/pedidos${qs}`, {
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error("Falha ao carregar pedidos.");
      setPedidos(await res.json());
      setErro("");
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha.");
    } finally {
      setLoading(false);
    }
  }, [filtro]);

  useEffect(() => {
    if (ready) carregar();
  }, [ready, carregar]);

  async function setStatus(id: number, status: string) {
    setErro("");
    setMsg("");
    const res = await fetch(`${apiBase()}/api/v1/pedidos/${id}/status`, {
      method: "PATCH",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      setErro("Não atualizou o status.");
      return;
    }
    setMsg(`Pedido #${id} → ${status}`);
    await carregar();
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
      <nav className="nav" aria-label="Pedidos">
        <Link href="/home" className="nav__brand">
          PedidoMesa
        </Link>
        <div className="nav__links">
          <Link href="/garcom" className="nav__link">
            Garçom
          </Link>
          <Link href="/cozinha" className="nav__link">
            Cozinha
          </Link>
        </div>
      </nav>

      <h1 style={{ fontSize: "clamp(1.6rem, 5vw, 2.2rem)", margin: "0 0 6px" }}>
        Pedidos
      </h1>

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

      <label className="field">
        <span>Filtrar status</span>
        <select
          className="input"
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
        >
          {STATUS.map((s) => (
            <option key={s || "all"} value={s}>
              {s || "Todos"}
            </option>
          ))}
        </select>
      </label>

      {loading ? (
        <div className="empty">
          <strong>Carregando…</strong>
        </div>
      ) : pedidos.length === 0 ? (
        <div className="empty">
          <strong>Nenhum pedido</strong>
        </div>
      ) : (
        <div className="card">
          {pedidos.map((p) => (
            <div key={p.id} className="row">
              <div>
                <div className="row__name">
                  #{p.id} · {p.quantidade}× {p.nome_item}
                </div>
                <div className="row__meta">
                  mesa #{p.mesa_id} · {p.modo}
                  {p.cliente_nome ? ` · ${p.cliente_nome}` : ""}
                </div>
                <div className="row__price">
                  {formatBRL(p.preco_centavos * p.quantidade)}
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <select
                  className="input"
                  value={p.status}
                  onChange={(e) => setStatus(p.id, e.target.value)}
                  style={{ minWidth: 130 }}
                >
                  {STATUS.filter(Boolean).map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                {p.status !== "cancelado" && p.status !== "entregue" && (
                  <button
                    type="button"
                    className="btn btn--ghost btn--sm"
                    onClick={() => setStatus(p.id, "cancelado")}
                  >
                    Cancelar
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function PedidosPage() {
  return (
    <Suspense
      fallback={
        <div className="shell">
          <div className="empty">
            <strong>Carregando…</strong>
          </div>
        </div>
      }
    >
      <PedidosInner />
    </Suspense>
  );
}
