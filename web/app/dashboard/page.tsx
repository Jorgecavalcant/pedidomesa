"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiBase, authHeaders, fetchMetricas, formatBRL, type Metricas } from "@/lib/api";
import { useRequireAuth } from "@/lib/useRequireAuth";

type Mesa = { id: number; nome: string; status: string };
type Pedido = {
  id: number;
  mesa_id: number;
  nome_item: string;
  quantidade: number;
  preco_centavos: number;
  status: string;
};

export default function DashboardPage() {
  const { ready } = useRequireAuth();
  const [metricas, setMetricas] = useState<Metricas | null>(null);
  const [mesas, setMesas] = useState<Mesa[]>([]);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [erro, setErro] = useState("");

  useEffect(() => {
    if (!ready) return;
    (async () => {
      try {
        const [m, ms, ps] = await Promise.all([
          fetchMetricas(),
          fetch(`${apiBase()}/api/v1/mesas`, { headers: authHeaders() }).then(
            (r) => {
              if (!r.ok) throw new Error("mesas");
              return r.json();
            }
          ),
          fetch(`${apiBase()}/api/v1/pedidos`, { headers: authHeaders() }).then(
            (r) => {
              if (!r.ok) throw new Error("pedidos");
              return r.json();
            }
          ),
        ]);
        setMetricas(m);
        setMesas(ms);
        setPedidos(ps.slice(0, 20));
      } catch {
        setErro("Não foi possível carregar o dashboard.");
      }
    })();
  }, [ready]);

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
      <nav className="nav" aria-label="Dashboard">
        <Link href="/home" className="nav__brand">
          PedidoMesa
        </Link>
        <div className="nav__links">
          <Link href="/home" className="nav__link">
            Home
          </Link>
        </div>
      </nav>

      <h1 style={{ fontSize: "clamp(1.6rem, 5vw, 2.2rem)", margin: "0 0 6px" }}>
        Dashboard
      </h1>
      <p style={{ color: "var(--muted)", marginTop: 0 }}>
        {metricas?.data_ref ?? "Painel do dia"}
      </p>

      {erro && (
        <div className="status status--error" role="alert">
          {erro}
        </div>
      )}

      <div className="grid grid--2">
        <article className="card">
          <div className="row__meta">Faturamento hoje</div>
          <div className="row__name">
            {metricas ? formatBRL(metricas.faturamento_hoje_centavos) : "—"}
          </div>
        </article>
        <article className="card">
          <div className="row__meta">Ticket médio</div>
          <div className="row__name">
            {metricas ? formatBRL(metricas.ticket_medio_centavos) : "—"}
          </div>
        </article>
        <article className="card">
          <div className="row__meta">Mesas abertas</div>
          <div className="row__name">{metricas?.mesas_abertas ?? "—"}</div>
        </article>
        <article className="card">
          <div className="row__meta">Pedidos pendentes</div>
          <div className="row__name">{metricas?.pedidos_pendentes ?? "—"}</div>
        </article>
      </div>

      <h2 className="section-title">Mesas agora</h2>
      {mesas.length === 0 ? (
        <div className="empty">
          <strong>Nenhuma mesa</strong>
        </div>
      ) : (
        <div className="card">
          {mesas.map((m) => (
            <div key={m.id} className="row">
              <div className="row__name">{m.nome}</div>
              <span className={`badge ${m.status === "fechada" ? "" : "badge--ok"}`}>
                {m.status}
              </span>
            </div>
          ))}
        </div>
      )}

      <h2 className="section-title">Pedidos recentes</h2>
      {pedidos.length === 0 ? (
        <div className="empty">
          <strong>Sem pedidos recentes</strong>
        </div>
      ) : (
        <div className="card">
          {pedidos.map((p) => (
            <div key={p.id} className="row">
              <div>
                <div className="row__name">
                  {p.quantidade}× {p.nome_item}
                </div>
                <div className="row__meta">mesa #{p.mesa_id}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <span className="badge badge--warn">{p.status}</span>
                <div className="row__price">
                  {formatBRL(p.preco_centavos * p.quantidade)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
