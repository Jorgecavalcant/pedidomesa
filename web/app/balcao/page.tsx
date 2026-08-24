"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { apiBase, demoLogin } from "@/lib/api";

type Mesa = {
  id: number;
  nome: string;
  qr_token: string;
  status: string;
};

function brl(centavos: number) {
  return (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function BalcaoPage() {
  const [token, setToken] = useState("");
  const [mesas, setMesas] = useState<Mesa[]>([]);
  const [nome, setNome] = useState("");
  const [erro, setErro] = useState("");
  const [contaMsg, setContaMsg] = useState("");

  const carregar = useCallback(async (access: string) => {
    const res = await fetch(`${apiBase()}/api/v1/mesas`, {
      headers: { Authorization: `Bearer ${access}` },
    });
    if (!res.ok) throw new Error("Não foi possível listar mesas.");
    setMesas(await res.json());
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const access = await demoLogin();
        setToken(access);
        await carregar(access);
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Falha ao iniciar balcão.");
      }
    })();
  }, [carregar]);

  async function criarMesa(e: FormEvent) {
    e.preventDefault();
    setErro("");
    const res = await fetch(`${apiBase()}/api/v1/mesas`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ nome }),
    });
    if (!res.ok) {
      setErro("Não criou a mesa.");
      return;
    }
    setNome("");
    await carregar(token);
  }

  async function fechar(mesa: Mesa) {
    setContaMsg("");
    setErro("");
    const res = await fetch(`${apiBase()}/api/v1/conta/mesa/${mesa.qr_token}/fechar`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      setErro("Não fechou a conta.");
      return;
    }
    const conta = await res.json();
    setContaMsg(`${mesa.nome}: ${brl(conta.total_centavos)} — conta fechada.`);
    await carregar(token);
  }

  return (
    <main>
      <p className="muted">
        <Link href="/">PedidoMesa</Link> · Balcão
      </p>
      <h1>Balcão</h1>
      <p className="muted">Crie mesas (QR) e feche contas. Mensalidade fixa — sem % por pedido.</p>
      {erro && <p style={{ color: "var(--danger)" }}>{erro}</p>}
      {contaMsg && <p className="badge">{contaMsg}</p>}

      <form className="card" onSubmit={criarMesa} style={{ marginTop: "1rem" }}>
        <h2 style={{ marginTop: 0 }}>Nova mesa</h2>
        <label>Nome</label>
        <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Mesa 3" required />
        <button className="btn" type="submit" style={{ marginTop: "0.75rem" }}>
          Criar e gerar token QR
        </button>
      </form>

      <div className="card" style={{ marginTop: "1rem" }}>
        <h2 style={{ marginTop: 0 }}>Mesas</h2>
        {mesas.length === 0 && <p className="muted">Nenhuma mesa ainda.</p>}
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {mesas.map((m) => (
            <li
              key={m.id}
              style={{
                display: "flex",
                gap: "0.75rem",
                alignItems: "center",
                flexWrap: "wrap",
                padding: "0.6rem 0",
                borderBottom: "1px solid var(--border, #ddd)",
              }}
            >
              <strong>{m.nome}</strong>
              <span className="badge">{m.status}</span>
              <code style={{ fontSize: "0.85rem" }}>/m/{m.qr_token}</code>
              <Link className="btn secondary" href={`/m/${m.qr_token}`}>
                Abrir QR
              </Link>
              <button className="btn" type="button" onClick={() => fechar(m)}>
                Fechar conta
              </button>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
