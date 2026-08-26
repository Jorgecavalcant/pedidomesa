"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  fetchMe,
  fetchMetricas,
  formatBRL,
  logout,
  type Metricas,
} from "@/lib/api";
import { useRequireAuth } from "@/lib/useRequireAuth";

const ATALHOS = [
  { href: "/mesas", label: "Mesas" },
  { href: "/garcom", label: "Garçom" },
  { href: "/cozinha", label: "Cozinha" },
  { href: "/cardapio", label: "Cardápio" },
  { href: "/pedidos", label: "Pedidos" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/balcao", label: "Balcão" },
  { href: "/settings", label: "Settings" },
];

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

export default function HomeStaffPage() {
  const { ready } = useRequireAuth();
  const [nome, setNome] = useState("PedidoMesa");
  const [usuario, setUsuario] = useState("");
  const [metricas, setMetricas] = useState<Metricas | null>(null);

  useEffect(() => {
    if (!ready) return;
    fetchMe()
      .then((m) => {
        setNome(m.estabelecimento_nome);
        setUsuario(m.usuario);
      })
      .catch(() => {});
    fetchMetricas()
      .then(setMetricas)
      .catch(() => setMetricas(null));
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

  const dataLabel = metricas ? formatDataBR(metricas.data_ref) : "";

  return (
    <div className="shell">
      <nav className="nav" aria-label="Home">
        <Link href="/home" className="nav__brand">
          PedidoMesa
        </Link>
        <div className="nav__links">
          <button
            type="button"
            className="nav__link"
            style={{ background: "none", border: 0, cursor: "pointer" }}
            onClick={() => logout().then(() => (location.href = "/login"))}
          >
            Sair
          </button>
        </div>
      </nav>

      <h1 style={{ fontSize: "clamp(1.6rem, 5vw, 2.2rem)", margin: "0 0 6px" }}>
        Olá{usuario ? `, ${usuario}` : ""}
      </h1>
      <p style={{ color: "var(--muted)", marginTop: 0 }}>
        {nome}
        {dataLabel ? ` · ${dataLabel}` : ""}
      </p>

      <h2 className="section-title">Hoje na casa</h2>
      <div className="grid grid--2">
        <Link
          href="/mesas?status=ocupada"
          className="card rise"
          style={{ textDecoration: "none" }}
        >
          <div className="row__meta">Mesas abertas</div>
          <div className="row__name" style={{ fontSize: "1.6rem" }}>
            {metricas?.mesas_abertas ?? "—"}
          </div>
        </Link>
        <Link
          href="/pedidos?status=pendente"
          className="card rise"
          style={{ textDecoration: "none" }}
        >
          <div className="row__meta">Pedidos pendentes</div>
          <div className="row__name" style={{ fontSize: "1.6rem" }}>
            {metricas?.pedidos_pendentes ?? "—"}
          </div>
        </Link>
        <Link
          href="/dashboard"
          className="card rise"
          style={{ textDecoration: "none" }}
        >
          <div className="row__meta">Ticket médio</div>
          <div className="row__name" style={{ fontSize: "1.4rem" }}>
            {metricas ? formatBRL(metricas.ticket_medio_centavos) : "—"}
          </div>
        </Link>
        <Link
          href="/dashboard?kpi=faturamento"
          className="card rise"
          style={{ textDecoration: "none" }}
        >
          <div className="row__meta">Faturamento hoje</div>
          <div className="row__name" style={{ fontSize: "1.4rem" }}>
            {metricas ? formatBRL(metricas.faturamento_hoje_centavos) : "—"}
          </div>
        </Link>
      </div>

      <h2 className="section-title">Atalhos</h2>
      <div className="grid grid--2">
        {ATALHOS.map((a) => (
          <Link
            key={a.href}
            href={a.href}
            className="card rise"
            style={{ textDecoration: "none" }}
          >
            <div className="row__name">{a.label}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
