"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { apiBase } from "@/lib/api";
import { useRequireAuth } from "@/lib/useRequireAuth";

type Mesa = {
  id: number;
  nome: string;
  qr_token: string;
  status: string;
};

function brl(centavos: number) {
  return (centavos / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export default function BalcaoPage() {
  const { ready, token } = useRequireAuth();
  const [mesas, setMesas] = useState<Mesa[]>([]);
  const [nome, setNome] = useState("");
  const [erro, setErro] = useState("");
  const [contaMsg, setContaMsg] = useState("");
  const [loading, setLoading] = useState(true);

  const carregar = useCallback(async (access: string) => {
    const res = await fetch(`${apiBase()}/api/v1/mesas`, {
      headers: { Authorization: `Bearer ${access}` },
    });
    if (!res.ok) throw new Error("Não foi possível listar mesas.");
    setMesas(await res.json());
  }, []);

  useEffect(() => {
    if (!ready || !token) return;
    (async () => {
      try {
        await carregar(token);
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Falha ao iniciar balcão.");
      } finally {
        setLoading(false);
      }
    })();
  }, [carregar, ready, token]);

  async function criarMesa(e: FormEvent) {
    e.preventDefault();
    setErro("");
    setContaMsg("");
    const res = await fetch(`${apiBase()}/api/v1/mesas`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ nome }),
    });
    if (!res.ok) {
      setErro("Não criou a mesa. Tente de novo.");
      return;
    }
    setContaMsg(`Mesa "${nome}" criada. Compartilhe o link com o cliente.`);
    setNome("");
    await carregar(token);
  }

  async function fechar(mesa: Mesa) {
    setContaMsg("");
    setErro("");
    const res = await fetch(
      `${apiBase()}/api/v1/conta/mesa/${mesa.qr_token}/fechar`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    if (!res.ok) {
      setErro("Não fechou a conta.");
      return;
    }
    const conta = await res.json();
    setContaMsg(
      `${mesa.nome}: ${brl(conta.total_centavos ?? 0)} — conta fechada.`
    );
    await carregar(token);
  }

  async function reabrir(mesa: Mesa) {
    setContaMsg("");
    setErro("");
    const res = await fetch(`${apiBase()}/api/v1/mesas/${mesa.id}/reabrir`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      setErro("Só reabre mesa com status fechada.");
      return;
    }
    setContaMsg(`${mesa.nome}: reaberta (livre).`);
    await carregar(token);
  }

  return (
    <div className="shell">
      <nav className="nav" aria-label="Balcão">
        <Link href="/" className="nav__brand">
          PedidoMesa
        </Link>
        <div className="nav__links">
          <Link href="/home" className="nav__link">
            Home
          </Link>
          <Link href="/mesas" className="nav__link">
            Mesas
          </Link>
          <Link href="/cardapio" className="nav__link">
            Cardápio
          </Link>
          <Link href="/cozinha" className="nav__link">
            Cozinha
          </Link>
        </div>
      </nav>

      <h1 style={{ fontSize: "clamp(1.6rem, 5vw, 2.2rem)", margin: "0 0 6px" }}>
        Balcão
      </h1>
      <p style={{ color: "var(--muted)", marginTop: 0 }}>
        Crie mesas (QR) e feche contas. Mensalidade fixa — sem % por pedido.
      </p>

      {contaMsg && (
        <div className="status status--ok" role="status">
          {contaMsg}
        </div>
      )}
      {erro && (
        <div className="status status--error" role="alert">
          {erro}
        </div>
      )}

      <form className="card rise" onSubmit={criarMesa}>
        <h2 style={{ fontSize: "1.15rem", margin: "0 0 14px" }}>Nova mesa</h2>
        <label className="field">
          <span>Nome</span>
          <input
            className="input"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Ex.: Mesa 7"
            required
          />
        </label>
        <button type="submit" className="btn btn--primary btn--block">
          Criar e gerar token QR
        </button>
      </form>

      <h2 className="section-title">Mesas</h2>
      {loading ? (
        <div className="empty">
          <strong>Carregando…</strong>
        </div>
      ) : mesas.length === 0 ? (
        <div className="empty">
          <strong>Nenhuma mesa ainda</strong>
          Crie a primeira acima para começar a receber pedidos.
        </div>
      ) : (
        <div className="grid grid--2">
          {mesas.map((m) => (
            <article key={m.id} className="card">
              <div className="row" style={{ borderBottom: "none", paddingTop: 0 }}>
                <div>
                  <div className="row__name">{m.nome}</div>
                  <div className="row__meta" style={{ marginTop: 6 }}>
                    <code style={{ fontSize: "0.85rem" }}>/m/{m.qr_token}</code>
                  </div>
                  <span
                    className={`badge ${
                      m.status === "fechada" ? "" : "badge--ok"
                    }`}
                    style={{ marginTop: 8 }}
                  >
                    {m.status}
                  </span>
                </div>
              </div>
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                  marginTop: 12,
                }}
              >
                <Link
                  href={`/m/${m.qr_token}`}
                  className="btn btn--ghost btn--sm"
                >
                  Abrir QR
                </Link>
                {m.status !== "fechada" ? (
                  <button
                    type="button"
                    className="btn btn--primary btn--sm"
                    onClick={() => fechar(m)}
                  >
                    Fechar conta
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn btn--ghost btn--sm"
                    onClick={() => reabrir(m)}
                  >
                    Reabrir mesa
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
