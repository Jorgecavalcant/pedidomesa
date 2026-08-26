"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  apiBase,
  authHeaders,
  fetchMetricas,
  formatBRL,
  type Metricas,
} from "@/lib/api";
import { useRequireAuth } from "@/lib/useRequireAuth";

type Mesa = { id: number; nome: string; status: string; qr_token?: string };
type Pedido = {
  id: number;
  mesa_id: number;
  nome_item: string;
  quantidade: number;
  preco_centavos: number;
  status: string;
};

function formatDataBR(isoDate: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(isoDate.trim());
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  const d = new Date(isoDate);
  if (!Number.isNaN(d.getTime())) {
    return d.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }
  return isoDate;
}

function DashboardInner() {
  const { ready } = useRequireAuth();
  const searchParams = useSearchParams();
  const foco = searchParams.get("foco") || searchParams.get("kpi") || "";
  const mesaIdParam = searchParams.get("mesa_id");

  const [metricas, setMetricas] = useState<Metricas | null>(null);
  const [mesas, setMesas] = useState<Mesa[]>([]);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [mesaDrill, setMesaDrill] = useState<number | null>(
    mesaIdParam ? Number(mesaIdParam) : null
  );
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
        setPedidos(ps);
      } catch {
        setErro("Não foi possível carregar o dashboard.");
      }
    })();
  }, [ready]);

  useEffect(() => {
    if (mesaIdParam) setMesaDrill(Number(mesaIdParam));
  }, [mesaIdParam]);

  const pedidosVisiveis = useMemo(() => {
    let list = pedidos;
    if (mesaDrill) list = list.filter((p) => p.mesa_id === mesaDrill);
    return list.slice(0, 40);
  }, [pedidos, mesaDrill]);

  const mesaNome = useMemo(() => {
    if (!mesaDrill) return null;
    return mesas.find((m) => m.id === mesaDrill)?.nome || `Mesa #${mesaDrill}`;
  }, [mesaDrill, mesas]);

  if (!ready) {
    return (
      <div className="shell">
        <div className="empty">
          <strong>Verificando sessão…</strong>
        </div>
      </div>
    );
  }

  const dataLabel = metricas ? formatDataBR(metricas.data_ref) : "";

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
      <p style={{ color: "var(--color-muted)", marginTop: 0 }}>
        {dataLabel || "Painel do dia"}
        {foco === "hoje" || foco === "faturamento"
          ? " · foco: faturamento de hoje"
          : ""}
      </p>

      {erro && (
        <div className="status status--error" role="alert">
          {erro}
        </div>
      )}

      <div className="grid grid--2">
        <Link
          href="/dashboard?foco=hoje"
          className={`card card-link rise ${
            foco === "hoje" || foco === "faturamento" ? "card--active" : ""
          }`}
          style={
            foco === "hoje" || foco === "faturamento"
              ? { borderColor: "var(--color-accent)" }
              : undefined
          }
        >
          <div className="row__meta">Faturamento hoje</div>
          <div className="row__name">
            {metricas ? formatBRL(metricas.faturamento_hoje_centavos) : "—"}
          </div>
        </Link>
        <Link href="/mesas?status=ocupada" className="card card-link rise">
          <div className="row__meta">Mesas abertas</div>
          <div className="row__name">{metricas?.mesas_abertas ?? "—"}</div>
        </Link>
        <Link href="/cozinha" className="card card-link rise">
          <div className="row__meta">Pedidos pendentes</div>
          <div className="row__name">{metricas?.pedidos_pendentes ?? "—"}</div>
        </Link>
        <article className="card rise">
          <div className="row__meta">Ticket médio</div>
          <div className="row__name">
            {metricas ? formatBRL(metricas.ticket_medio_centavos) : "—"}
          </div>
        </article>
      </div>

      <h2 className="section-title">Mesas agora</h2>
      <p style={{ color: "var(--color-muted)", marginTop: 0, fontSize: "0.9rem" }}>
        Toque numa mesa para ver os pedidos dela.
      </p>
      {mesas.length === 0 ? (
        <div className="empty">
          <strong>Nenhuma mesa</strong>
        </div>
      ) : (
        <div className="card">
          {mesas.map((m) => (
            <button
              key={m.id}
              type="button"
              className="row row-click"
              style={{
                width: "100%",
                background: "none",
                border: 0,
                borderBottom: "1px solid var(--color-border)",
                textAlign: "left",
                cursor: "pointer",
                color: "inherit",
                font: "inherit",
                ...(mesaDrill === m.id
                  ? { background: "color-mix(in srgb, var(--color-accent) 12%, transparent)" }
                  : {}),
              }}
              onClick={() =>
                setMesaDrill((cur) => (cur === m.id ? null : m.id))
              }
              aria-pressed={mesaDrill === m.id}
            >
              <div className="row__name">{m.nome}</div>
              <span className={`badge ${m.status === "fechada" ? "" : "badge--ok"}`}>
                {m.status}
              </span>
            </button>
          ))}
        </div>
      )}

      <h2 className="section-title">
        {mesaNome ? `Pedidos — ${mesaNome}` : "Pedidos recentes"}
      </h2>
      {mesaDrill && (
        <p style={{ marginTop: 0 }}>
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={() => setMesaDrill(null)}
          >
            Limpar filtro de mesa
          </button>
        </p>
      )}
      {pedidosVisiveis.length === 0 ? (
        <div className="empty">
          <strong>Sem pedidos neste recorte</strong>
        </div>
      ) : (
        <div className="card">
          {pedidosVisiveis.map((p) => (
            <div key={p.id} className="row">
              <div>
                <div className="row__name">
                  {p.quantidade}× {p.nome_item}
                </div>
                <div className="row__meta">
                  mesa #{p.mesa_id}
                  {!mesaDrill && (
                    <>
                      {" · "}
                      <button
                        type="button"
                        className="btn btn--ghost btn--sm"
                        style={{ padding: "2px 8px", minHeight: 0 }}
                        onClick={() => setMesaDrill(p.mesa_id)}
                      >
                        Ver mesa
                      </button>
                    </>
                  )}
                </div>
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

export default function DashboardPage() {
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
      <DashboardInner />
    </Suspense>
  );
}
