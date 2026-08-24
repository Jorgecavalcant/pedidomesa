"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { apiBase, demoLogin } from "@/lib/api";

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
  const [token, setToken] = useState("");
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [erro, setErro] = useState("");

  const carregar = useCallback(async (access: string) => {
    const res = await fetch(`${apiBase()}/api/v1/cozinha/abertos`, {
      headers: { Authorization: `Bearer ${access}` },
    });
    if (!res.ok) throw new Error("Não carregou a fila da cozinha.");
    setPedidos(await res.json());
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const access = await demoLogin();
        setToken(access);
        await carregar(access);
        const id = setInterval(() => carregar(access), 5000);
        return () => clearInterval(id);
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Falha na cozinha.");
      }
    })();
  }, [carregar]);

  async function pronto(id: number) {
    setErro("");
    const res = await fetch(`${apiBase()}/api/v1/cozinha/pedidos/${id}/pronto`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      setErro("Não marcou como pronto.");
      return;
    }
    await carregar(token);
  }

  return (
    <main>
      <p className="muted">
        <Link href="/">PedidoMesa</Link> · Cozinha
      </p>
      <h1>Painel da cozinha</h1>
      <p className="muted">Pedidos abertos (atualiza a cada 5s).</p>
      {erro && <p style={{ color: "var(--danger)" }}>{erro}</p>}
      <div className="card" style={{ marginTop: "1rem" }}>
        {pedidos.length === 0 && <p className="muted">Fila vazia.</p>}
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {pedidos.map((p) => (
            <li
              key={p.id}
              style={{
                display: "flex",
                gap: "0.75rem",
                alignItems: "center",
                flexWrap: "wrap",
                padding: "0.75rem 0",
                borderBottom: "1px solid var(--border, #ddd)",
              }}
            >
              <strong>
                {p.quantidade}× {p.nome_item}
              </strong>
              <span className="badge">{p.status}</span>
              <span className="muted">
                mesa #{p.mesa_id} · {p.modo}
                {p.cliente_nome ? ` · ${p.cliente_nome}` : ""}
              </span>
              <button className="btn" type="button" onClick={() => pronto(p.id)}>
                Marcar pronto
              </button>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
