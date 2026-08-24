"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

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

function brl(centavos: number) {
  return (centavos / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export default function CardapioAdminPage() {
  const [itens, setItens] = useState<Item[]>([]);
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [preco, setPreco] = useState("");
  const [msg, setMsg] = useState("");
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(true);

  const carregar = () =>
    fetch(`${API}/api/v1/cardapio/admin`, { headers: HEADERS })
      .then((r) => r.json())
      .then((data) => {
        setItens(data);
        setErro("");
      })
      .catch(() => setErro("Não foi possível carregar o cardápio."))
      .finally(() => setLoading(false));

  useEffect(() => {
    carregar();
  }, []);

  const criar = async (e: FormEvent) => {
    e.preventDefault();
    setErro("");
    setMsg("");
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
      setErro("Não deu pra salvar o item. Confere os dados e tenta de novo.");
      return;
    }
    setMsg(`"${nome}" entrou no cardápio.`);
    setNome("");
    setDescricao("");
    setPreco("");
    carregar();
  };

  const toggle = async (item: Item) => {
    setMsg("");
    setErro("");
    await fetch(`${API}/api/v1/cardapio/${item.id}`, {
      method: "PATCH",
      headers: HEADERS,
      body: JSON.stringify({ ativo: !item.ativo }),
    });
    setMsg(
      item.ativo
        ? `"${item.nome}" saiu do ar por enquanto.`
        : `"${item.nome}" voltou pro cardápio.`
    );
    carregar();
  };

  const editarPreco = async (item: Item) => {
    const novo = prompt(
      `Novo preço (R$) para ${item.nome}:`,
      (item.preco_centavos / 100).toFixed(2)
    );
    if (!novo) return;
    setMsg("");
    setErro("");
    await fetch(`${API}/api/v1/cardapio/${item.id}`, {
      method: "PATCH",
      headers: HEADERS,
      body: JSON.stringify({
        preco_centavos: Math.round(parseFloat(novo.replace(",", ".")) * 100),
      }),
    });
    setMsg(`Preço de "${item.nome}" atualizado.`);
    carregar();
  };

  return (
    <div className="shell">
      <nav className="nav" aria-label="Admin">
        <Link href="/" className="nav__brand">
          PedidoMesa
        </Link>
        <div className="nav__links">
          <Link href="/balcao" className="nav__link">
            Balcão
          </Link>
          <Link href="/cozinha" className="nav__link">
            Cozinha
          </Link>
        </div>
      </nav>

      <h1 style={{ fontSize: "clamp(1.6rem, 5vw, 2.2rem)", margin: "0 0 6px" }}>
        Cardápio da casa
      </h1>
      <p style={{ color: "var(--muted)", marginTop: 0 }}>
        O que estiver ativo aparece nas mesas na hora.
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
        <h2 style={{ fontSize: "1.15rem", margin: "0 0 14px" }}>Novo item</h2>
        <label className="field">
          <span>Nome</span>
          <input
            className="input"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Ex.: Porção de fritas"
            required
          />
        </label>
        <label className="field">
          <span>Descrição (opcional)</span>
          <input
            className="input"
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            placeholder="Ex.: com cheddar e bacon"
          />
        </label>
        <label className="field">
          <span>Preço (R$)</span>
          <input
            className="input"
            value={preco}
            onChange={(e) => setPreco(e.target.value)}
            placeholder="24,90"
            inputMode="decimal"
            required
          />
        </label>
        <button type="submit" className="btn btn--primary btn--block">
          Adicionar ao cardápio
        </button>
      </form>

      <h2 className="section-title">Itens</h2>
      {loading ? (
        <div className="empty">
          <strong>Carregando…</strong>
        </div>
      ) : itens.length === 0 ? (
        <div className="empty">
          <strong>Cardápio vazio</strong>
          Cadastre o primeiro item acima.
        </div>
      ) : (
        <div className="card">
          {itens.map((item) => (
            <div key={item.id} className="row">
              <div>
                <div
                  className="row__name"
                  style={
                    item.ativo
                      ? undefined
                      : { textDecoration: "line-through", opacity: 0.55 }
                  }
                >
                  {item.nome}
                </div>
                {item.descricao && (
                  <div className="row__meta">{item.descricao}</div>
                )}
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  flexWrap: "wrap",
                  justifyContent: "flex-end",
                }}
              >
                <span className="row__price">{brl(item.preco_centavos)}</span>
                <span
                  className={`badge ${
                    item.ativo ? "badge--ok" : "badge--danger"
                  }`}
                >
                  {item.ativo ? "ativo" : "inativo"}
                </span>
                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  onClick={() => editarPreco(item)}
                >
                  Preço
                </button>
                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  onClick={() => toggle(item)}
                >
                  {item.ativo ? "Desativar" : "Ativar"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
