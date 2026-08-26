"use client";

import Link from "next/link";
import { FormEvent, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { apiBase, authHeaders } from "@/lib/api";
import { useRequireAuth } from "@/lib/useRequireAuth";

type Mesa = {
  id: number;
  nome: string;
  qr_token: string;
  status: string;
};

function MesasInner() {
  const { ready } = useRequireAuth();
  const searchParams = useSearchParams();
  const statusFiltro = searchParams.get("status") || "";
  const [mesas, setMesas] = useState<Mesa[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");
  const [msg, setMsg] = useState("");
  const [novoNome, setNovoNome] = useState("");
  const [editId, setEditId] = useState<number | null>(null);
  const [editNome, setEditNome] = useState("");
  const [editStatus, setEditStatus] = useState("livre");

  const mesasVisiveis = useMemo(() => {
    if (!statusFiltro) return mesas;
    return mesas.filter((m) => m.status === statusFiltro);
  }, [mesas, statusFiltro]);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiBase()}/api/v1/mesas`, {
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error("Não foi possível listar mesas.");
      setMesas(await res.json());
      setErro("");
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao carregar.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (ready) carregar();
  }, [ready, carregar]);

  async function criar(e: FormEvent) {
    e.preventDefault();
    setErro("");
    setMsg("");
    const res = await fetch(`${apiBase()}/api/v1/mesas`, {
      method: "POST",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ nome: novoNome.trim() }),
    });
    if (!res.ok) {
      setErro("Não criou a mesa.");
      return;
    }
    setMsg(`Mesa "${novoNome}" criada.`);
    setNovoNome("");
    await carregar();
  }

  async function salvarEdicao(id: number) {
    setErro("");
    const res = await fetch(`${apiBase()}/api/v1/mesas/${id}`, {
      method: "PATCH",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ nome: editNome.trim(), status: editStatus }),
    });
    if (!res.ok) {
      setErro("Não atualizou a mesa.");
      return;
    }
    setEditId(null);
    setMsg("Mesa atualizada.");
    await carregar();
  }

  async function excluir(id: number, nome: string) {
    if (!confirm(`Excluir mesa "${nome}"?`)) return;
    setErro("");
    const res = await fetch(`${apiBase()}/api/v1/mesas/${id}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
    if (!res.ok && res.status !== 204) {
      setErro("Não excluiu a mesa.");
      return;
    }
    setMsg(`Mesa "${nome}" excluída.`);
    await carregar();
  }

  async function reabrir(id: number) {
    setErro("");
    const res = await fetch(`${apiBase()}/api/v1/mesas/${id}/reabrir`, {
      method: "POST",
      headers: authHeaders(),
    });
    if (!res.ok) {
      setErro("Só reabre mesa fechada.");
      return;
    }
    setMsg("Mesa reaberta.");
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
      <nav className="nav" aria-label="Mesas">
        <Link href="/home" className="nav__brand">
          PedidoMesa
        </Link>
        <div className="nav__links">
          <Link href="/home" className="nav__link">
            Home
          </Link>
          <Link href="/garcom" className="nav__link">
            Garçom
          </Link>
        </div>
      </nav>

      <h1 style={{ fontSize: "clamp(1.6rem, 5vw, 2.2rem)", margin: "0 0 6px" }}>
        Mesas
      </h1>
      <p style={{ color: "var(--muted)", marginTop: 0 }}>
        Crie, edite e imprima o QR de cada mesa.
        {statusFiltro ? ` · filtro: ${statusFiltro}` : ""}
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

      <form className="card rise" onSubmit={criar}>
        <h2 style={{ fontSize: "1.15rem", margin: "0 0 14px" }}>Nova mesa</h2>
        <label className="field">
          <span>Nome</span>
          <input
            className="input"
            value={novoNome}
            onChange={(e) => setNovoNome(e.target.value)}
            placeholder="Ex.: Mesa 7"
            required
          />
        </label>
        <button type="submit" className="btn btn--primary btn--block">
          Criar mesa
        </button>
      </form>

      <h2 className="section-title">Lista</h2>
      {loading ? (
        <div className="empty">
          <strong>Carregando…</strong>
        </div>
      ) : mesasVisiveis.length === 0 ? (
        <div className="empty">
          <strong>
            {mesas.length === 0
              ? "Nenhuma mesa — crie a primeira."
              : `Nenhuma mesa com status "${statusFiltro}".`}
          </strong>
          {statusFiltro ? (
            <p style={{ marginTop: 12 }}>
              <Link href="/mesas">Ver todas</Link>
            </p>
          ) : null}
        </div>
      ) : (
        <div className="grid grid--2">
          {mesasVisiveis.map((m) => (
            <article key={m.id} className="card">
              {editId === m.id ? (
                <>
                  <label className="field">
                    <span>Nome</span>
                    <input
                      className="input"
                      value={editNome}
                      onChange={(e) => setEditNome(e.target.value)}
                    />
                  </label>
                  <label className="field">
                    <span>Status</span>
                    <select
                      className="input"
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value)}
                    >
                      <option value="livre">livre</option>
                      <option value="ocupada">ocupada</option>
                      <option value="fechada">fechada</option>
                    </select>
                  </label>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button
                      type="button"
                      className="btn btn--primary btn--sm"
                      onClick={() => salvarEdicao(m.id)}
                    >
                      Salvar
                    </button>
                    <button
                      type="button"
                      className="btn btn--ghost btn--sm"
                      onClick={() => setEditId(null)}
                    >
                      Cancelar
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="row__name">{m.nome}</div>
                  <span
                    className={`badge ${m.status === "fechada" ? "" : "badge--ok"}`}
                    style={{ marginTop: 8 }}
                  >
                    {m.status}
                  </span>
                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      flexWrap: "wrap",
                      marginTop: 12,
                    }}
                  >
                    <Link
                      href={`/mesas/${m.id}/qr`}
                      className="btn btn--primary btn--sm"
                    >
                      QR
                    </Link>
                    <button
                      type="button"
                      className="btn btn--ghost btn--sm"
                      onClick={() => {
                        setEditId(m.id);
                        setEditNome(m.nome);
                        setEditStatus(m.status);
                      }}
                    >
                      Editar
                    </button>
                    {m.status === "fechada" && (
                      <button
                        type="button"
                        className="btn btn--ghost btn--sm"
                        onClick={() => reabrir(m.id)}
                      >
                        Reabrir
                      </button>
                    )}
                    <button
                      type="button"
                      className="btn btn--ghost btn--sm"
                      onClick={() => excluir(m.id, m.nome)}
                    >
                      Excluir
                    </button>
                  </div>
                </>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

export default function MesasPage() {
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
      <MesasInner />
    </Suspense>
  );
}
