"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { apiBase, authHeaders } from "@/lib/api";
import { useRequireAuth } from "@/lib/useRequireAuth";

export default function SettingsPage() {
  const { ready } = useRequireAuth();
  const [nome, setNome] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [erro, setErro] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (!ready) return;
    fetch(`${apiBase()}/api/v1/settings`, { headers: authHeaders() })
      .then(async (r) => {
        if (!r.ok) throw new Error("Não carregou settings.");
        return r.json();
      })
      .then((d) => {
        setNome(d.nome_estabelecimento);
        setMensagem(d.mensagem_conta);
      })
      .catch((e) => setErro(e instanceof Error ? e.message : "Falha."));
  }, [ready]);

  async function salvar(e: FormEvent) {
    e.preventDefault();
    setErro("");
    setMsg("");
    const res = await fetch(`${apiBase()}/api/v1/settings`, {
      method: "PATCH",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({
        nome_estabelecimento: nome,
        mensagem_conta: mensagem,
      }),
    });
    if (!res.ok) {
      setErro("Não salvou.");
      return;
    }
    setMsg("Configurações salvas.");
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
      <nav className="nav" aria-label="Settings">
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
        Settings
      </h1>
      <p style={{ color: "var(--muted)", marginTop: 0 }}>
        Nome da casa e mensagem ao fechar a conta. Fuso: America/Sao_Paulo.
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

      <form className="card" onSubmit={salvar}>
        <label className="field">
          <span>Nome do estabelecimento</span>
          <input
            className="input"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            required
            maxLength={120}
          />
        </label>
        <label className="field">
          <span>Mensagem da conta</span>
          <input
            className="input"
            value={mensagem}
            onChange={(e) => setMensagem(e.target.value)}
            maxLength={280}
          />
        </label>
        <button type="submit" className="btn btn--primary btn--block">
          Salvar
        </button>
      </form>
    </div>
  );
}
