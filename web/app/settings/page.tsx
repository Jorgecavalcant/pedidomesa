"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import {
  TAXA_SERVICO_BPS_DEFAULT,
  fetchSettings,
  patchSettings,
} from "@/lib/api";
import { useRequireAuth } from "@/lib/useRequireAuth";

export default function SettingsPage() {
  const { ready } = useRequireAuth();
  const [nome, setNome] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [taxaBps, setTaxaBps] = useState(TAXA_SERVICO_BPS_DEFAULT);
  const [erro, setErro] = useState("");
  const [msg, setMsg] = useState("");
  const [avisoTaxa, setAvisoTaxa] = useState("");

  useEffect(() => {
    if (!ready) return;
    fetchSettings()
      .then((d) => {
        setNome(d.nome_estabelecimento);
        setMensagem(d.mensagem_conta);
        if (typeof d.taxa_servico_bps === "number") {
          setTaxaBps(d.taxa_servico_bps);
        }
      })
      .catch((e) => setErro(e instanceof Error ? e.message : "Falha."));
  }, [ready]);

  async function salvar(e: FormEvent) {
    e.preventDefault();
    setErro("");
    setMsg("");
    setAvisoTaxa("");
    const bps = Math.max(0, Math.floor(Number(taxaBps)) || 0);
    try {
      const saved = await patchSettings({
        nome_estabelecimento: nome,
        mensagem_conta: mensagem,
        taxa_servico_bps: bps,
      });
      setMsg("Configurações salvas.");
      setTaxaBps(
        typeof saved.taxa_servico_bps === "number" ? saved.taxa_servico_bps : bps
      );
      if (typeof saved.taxa_servico_bps !== "number") {
        setAvisoTaxa(
          // TODO: PATCH /settings com taxa_servico_bps
          "Taxa enviada, mas a API ainda não devolve taxa_servico_bps — confirme no backend F1."
        );
      }
    } catch {
      // Fallback sem taxa_servico_bps (API legada)
      try {
        await patchSettings({
          nome_estabelecimento: nome,
          mensagem_conta: mensagem,
        });
        setMsg("Nome e mensagem salvos.");
        setAvisoTaxa(
          // TODO: PATCH /settings com taxa_servico_bps
          "Taxa de serviço ainda não persiste na API — valor fica só nesta tela até o backend F1."
        );
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Não salvou.");
      }
    }
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

  const taxaPct = (Number(taxaBps) / 100).toFixed(1);

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
      <p style={{ color: "var(--color-muted)", marginTop: 0 }}>
        Nome da casa, mensagem ao fechar e taxa de serviço do bar. Fuso: America/Sao_Paulo.
      </p>

      {msg && (
        <div className="status status--ok" role="status">
          {msg}
        </div>
      )}
      {avisoTaxa && (
        <div className="status status--warn" role="status">
          {avisoTaxa}
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
        <label className="field">
          <span>Taxa de serviço (bps)</span>
          <input
            className="input"
            type="number"
            min={0}
            max={10000}
            step={50}
            value={taxaBps}
            onChange={(e) => setTaxaBps(Number(e.target.value))}
            aria-describedby="taxa-help"
          />
        </label>
        <p id="taxa-help" className="row__meta" style={{ marginTop: -8 }}>
          1000 bps = 10%. Atual: {taxaPct}% sobre o subtotal dos itens do escopo
          (não é % PedidoMesa).
        </p>
        <button type="submit" className="btn btn--primary btn--block">
          Salvar
        </button>
      </form>
    </div>
  );
}
