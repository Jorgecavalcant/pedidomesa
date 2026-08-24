"use client";

import { useEffect, useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const HEADERS = {
  Authorization: "Bearer demo-token",
  "Content-Type": "application/json",
};

type Item = {
  id: number;
  nome: string;
  descricao: string | null;
  preco_centavos: number;
  ativo: boolean;
};

export default function CardapioAdminPage() {
  const [itens, setItens] = useState<Item[]>([]);
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [preco, setPreco] = useState(""); // em reais
  const [erro, setErro] = useState("");

  const carregar = () =>
    fetch(`${API}/api/v1/cardapio/admin`, { headers: HEADERS })
      .then((r) => r.json())
      .then(setItens);

  useEffect(() => {
    carregar();
  }, []);

  const criar = async () => {
    setErro("");
    const centavos = Math.round(parseFloat(preco.replace(",", ".")) * 100);
    if (!nome || !Number.isFinite(centavos) || centavos <= 0) {
      setErro("Informe nome e preço válidos.");
      return;
    }
    const r = await fetch(`${API}/api/v1/cardapio`, {
      method: "POST",
      headers: HEADERS,
      body: JSON.stringify({
        nome,
        descricao: descricao || null,
        preco_centavos: centavos,
      }),
    });
    if (!r.ok) {
      setErro("Falha ao criar item.");
      return;
    }
    setNome("");
    setDescricao("");
    setPreco("");
    carregar();
  };

  const toggle = async (item: Item) => {
    await fetch(`${API}/api/v1/cardapio/${item.id}`, {
      method: "PATCH",
      headers: HEADERS,
      body: JSON.stringify({ ativo: !item.ativo }),
    });
    carregar();
  };

  const editarPreco = async (item: Item) => {
    const novo = prompt(
      `Novo preço (R$) para ${item.nome}:`,
      (item.preco_centavos / 100).toFixed(2)
    );
    if (!novo) return;
    await fetch(`${API}/api/v1/cardapio/${item.id}`, {
      method: "PATCH",
      headers: HEADERS,
      body: JSON.stringify({
        preco_centavos: Math.round(parseFloat(novo.replace(",", ".")) * 100),
      }),
    });
    carregar();
  };

  return (
    <main className="mx-auto max-w-2xl p-6">
      <h1 className="mb-4 text-2xl font-bold">Cardápio — Admin Balcão</h1>

      <div className="mb-6 flex flex-col gap-2 rounded border p-4">
        <input
          className="border p-2"
          placeholder="Nome do item"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
        />
        <input
          className="border p-2"
          placeholder="Descrição (opcional)"
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
        />
        <input
          className="border p-2"
          placeholder="Preço em R$ (ex: 25.90)"
          value={preco}
          onChange={(e) => setPreco(e.target.value)}
        />
        {erro && <p className="text-sm text-red-600">{erro}</p>}
        <button className="bg-blue-600 p-2 text-white" onClick={criar}>
          Adicionar item
        </button>
      </div>

      <ul className="divide-y">
        {itens.map((i) => (
          <li key={i.id} className="flex items-center justify-between gap-2 py-2">
            <div>
              <span className={i.ativo ? "" : "line-through opacity-50"}>
                {i.nome}
              </span>
              <span className="ml-2 text-gray-500">
                R$ {(i.preco_centavos / 100).toFixed(2)}
              </span>
              {i.descricao && (
                <p className="text-xs text-gray-500">{i.descricao}</p>
              )}
            </div>
            <div className="flex gap-2">
              <button className="border px-2 py-1 text-sm" onClick={() => editarPreco(i)}>
                Editar
              </button>
              <button className="border px-2 py-1 text-sm" onClick={() => toggle(i)}>
                {i.ativo ? "Desativar" : "Ativar"}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
