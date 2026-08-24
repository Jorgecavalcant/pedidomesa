"use client";

import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

type Item = {
  id: number;
  nome: string;
  descricao: string | null;
  preco_centavos: number;
};
type Pedido = {
  id: number;
  nome_item: string;
  preco_centavos: number;
  quantidade: number;
  cliente_nome: string | null;
  modo: string;
  status: string;
};

export default function MesaPage() {
  const { token } = useParams<{ token: string }>();
  const [itens, setItens] = useState<Item[]>([]);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [clienteNome, setClienteNome] = useState("");
  const [modo, setModo] = useState<"individual" | "coletivo">("individual");
  const [msg, setMsg] = useState("");

  const carregar = useCallback(() => {
    fetch(`${API}/api/v1/cardapio`).then((r) => r.json()).then(setItens);
    fetch(`${API}/api/v1/pedidos/mesa/${token}`)
      .then((r) => r.json())
      .then(setPedidos);
  }, [token]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const pedir = async (item: Item) => {
    setMsg("");
    const r = await fetch(`${API}/api/v1/pedidos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mesa_token: token,
        cardapio_item_id: item.id,
        quantidade: 1,
        cliente_nome: clienteNome || null,
        modo,
      }),
    });
    if (r.ok) {
      setMsg(`"${item.nome}" enviado!`);
      carregar();
    } else {
      setMsg("Erro ao enviar pedido.");
    }
  };

  const total = pedidos.reduce(
    (s, p) => s + p.preco_centavos * p.quantidade,
    0
  );

  return (
    <main className="mx-auto max-w-xl p-6">
      <h1 className="mb-2 text-2xl font-bold">Menu da Mesa</h1>

      <div className="mb-4 flex gap-2">
        <input
          className="flex-1 border p-2"
          placeholder="Seu nome"
          value={clienteNome}
          onChange={(e) => setClienteNome(e.target.value)}
        />
        <select
          className="border p-2"
          value={modo}
          onChange={(e) => setModo(e.target.value as typeof modo)}
        >
          <option value="individual">Individual</option>
          <option value="coletivo">Coletivo</option>
        </select>
      </div>
      {msg && <p className="mb-4 text-sm text-green-700">{msg}</p>}

      <h2 className="mb-2 text-lg font-semibold">Cardápio</h2>
      <ul className="mb-8 divide-y">
        {itens.map((i) => (
          <li key={i.id} className="flex items-center justify-between py-2">
            <div>
              <span>{i.nome}</span>
              <span className="ml-2 text-gray-500">
                R$              R$ {(i.preco_centavos / 100).toFixed(2)}
              </span>
              {i.descricao && (
                <p className="text-xs text-gray-500">{i.descricao}</p>
              )}
            </div>
            <button
              className="bg-green-600 px-3 py-1 text-white"
              onClick={() => pedir(i)}
            >
              Pedir
            </button>
          </li>
        ))}
      </ul>

      <h2 className="mb-2 text-lg font-semibold">Meus pedidos</h2>
      <ul className="mb-4 divide-y">
        {pedidos.map((p) => (
          <li key={p.id} className="py-2 text-sm">
            {p.quantidade}× {p.nome_item} — R${" "}
            {((p.preco_centavos * p.quantidade) / 100).toFixed(2)}
            {p.cliente_nome && (
              <em className="ml-2 text-gray-500">({p.cliente_nome})</em>
            )}
            <span className="ml-2 rounded bg-gray-100 px-1">{p.status}</span>
          </li>
        ))}
      </ul>
      <p className="font-semibold">Total: R$ {(total / 100).toFixed(2)}</p>
    </main>
  );
}
