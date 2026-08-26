"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  TAXA_SERVICO_BPS_DEFAULT,
  apiBase,
  authHeaders,
  fecharConta,
  fetchContaMesa,
  fetchSettings,
  formatBRL,
  liberarMesa,
  listMesas,
  previewFechamento,
  type Mesa,
  type Pedido,
} from "@/lib/api";
import { useRequireAuth } from "@/lib/useRequireAuth";

export default function BalcaoPage() {
  const { ready, token } = useRequireAuth();
  const [mesas, setMesas] = useState<Mesa[]>([]);
  const [erro, setErro] = useState("");
  const [contaMsg, setContaMsg] = useState("");
  const [loading, setLoading] = useState(true);
  const [taxaBps, setTaxaBps] = useState(TAXA_SERVICO_BPS_DEFAULT);

  const [filtroMesa, setFiltroMesa] = useState("");
  const [filtroCapMin, setFiltroCapMin] = useState("");
  const [filtroSetor, setFiltroSetor] = useState("");

  const [fecharMesa, setFecharMesa] = useState<Mesa | null>(null);
  const [posicoesSel, setPosicoesSel] = useState<number[]>([]);
  const [aplicarTaxa, setAplicarTaxa] = useState(true);
  const [contaItens, setContaItens] = useState<Pedido[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);

  const carregar = useCallback(async () => {
    setMesas(await listMesas());
  }, []);

  useEffect(() => {
    if (!ready || !token) return;
    (async () => {
      try {
        await carregar();
        try {
          const s = await fetchSettings();
          if (typeof s.taxa_servico_bps === "number") {
            setTaxaBps(s.taxa_servico_bps);
          }
        } catch {
          // settings sem taxa ainda — usa default
        }
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Falha ao iniciar balcão.");
      } finally {
        setLoading(false);
      }
    })();
  }, [carregar, ready, token]);

  const setores = useMemo(() => {
    const set = new Set<string>();
    mesas.forEach((m) => {
      if (m.setor) set.add(m.setor);
    });
    return Array.from(set).sort();
  }, [mesas]);

  const lista = useMemo(() => {
    return mesas.filter((m) => {
      if (filtroMesa && !m.nome.toLowerCase().includes(filtroMesa.toLowerCase())) {
        return false;
      }
      if (filtroSetor && (m.setor || "") !== filtroSetor) return false;
      if (filtroCapMin) {
        const min = Number(filtroCapMin);
        if (!Number.isNaN(min) && (m.capacidade ?? 0) < min) return false;
      }
      return true;
    });
  }, [mesas, filtroMesa, filtroSetor, filtroCapMin]);

  async function abrirFecharParcial(mesa: Mesa) {
    setErro("");
    setContaMsg("");
    setFecharMesa(mesa);
    setPosicoesSel([]);
    setAplicarTaxa(true);
    setPreviewLoading(true);
    try {
      const conta = await fetchContaMesa(mesa.qr_token);
      setContaItens(conta.itens || []);
      if (typeof conta.taxa_bps === "number") setTaxaBps(conta.taxa_bps);
    } catch {
      setContaItens([]);
    } finally {
      setPreviewLoading(false);
    }
  }

  const capacidade = fecharMesa?.capacidade && fecharMesa.capacidade >= 1
    ? fecharMesa.capacidade
    : 8;

  const itensEscopo = useMemo(() => {
    const abertos = contaItens.filter(
      (p) => p.status !== "cancelado" && !p.quitado
    );
    if (posicoesSel.length === 0) return abertos;
    return abertos.filter((p) => {
      if (!p.posicoes || p.posicoes.length === 0) return false; // coletivo fora de escopo posicoes
      return p.posicoes.some((x) => posicoesSel.includes(x));
    });
  }, [contaItens, posicoesSel]);

  const subtotalPreview = useMemo(
    () =>
      itensEscopo.reduce((s, p) => s + p.preco_centavos * p.quantidade, 0),
    [itensEscopo]
  );

  const preview = useMemo(
    () => previewFechamento(subtotalPreview, taxaBps, aplicarTaxa),
    [subtotalPreview, taxaBps, aplicarTaxa]
  );

  async function confirmarFechar() {
    if (!fecharMesa) return;
    setErro("");
    setContaMsg("");
    const body =
      posicoesSel.length > 0
        ? {
            escopo: "posicoes" as const,
            posicoes: posicoesSel,
            aplicar_taxa: aplicarTaxa,
          }
        : {
            escopo: "mesa" as const,
            aplicar_taxa: aplicarTaxa,
          };

    try {
      // Detecta API F1 via conta (taxa_bps / saldo) antes de fechar parcial
      let apiF1 = false;
      try {
        const conta = await fetchContaMesa(fecharMesa.qr_token);
        setContaItens(conta.itens || []);
        if (typeof conta.taxa_bps === "number") setTaxaBps(conta.taxa_bps);
        apiF1 =
          typeof conta.saldo_aberto_centavos === "number" ||
          typeof conta.taxa_bps === "number" ||
          typeof conta.por_posicao === "object";
      } catch {
        /* preview local já calculado */
      }

      if (posicoesSel.length > 0 && !apiF1) {
        // TODO: POST fechar com escopo=posicoes
        setErro(
          "Fechamento parcial aguarda API F1. Preview: " +
            `${formatBRL(preview.total_centavos)} (sub ${formatBRL(preview.subtotal_centavos)} + taxa ${formatBRL(preview.taxa_centavos)}).`
        );
        return;
      }

      const conta = await fecharConta(fecharMesa.qr_token, body);
      const parcial = posicoesSel.length > 0;
      const apiParcial =
        typeof conta.fechamento_id === "number" ||
        typeof conta.mesa_saldo_aberto_centavos === "number";
      if (parcial && !apiParcial) {
        setContaMsg(
          `${fecharMesa.nome}: resposta sem marcadores F1 (${formatBRL(conta.total_centavos ?? 0)}). Preview parcial era ${formatBRL(preview.total_centavos)}.`
        );
      } else {
        const total = conta.total_centavos ?? preview.total_centavos;
        const saldo = conta.mesa_saldo_aberto_centavos;
        setContaMsg(
          `${fecharMesa.nome}: ${formatBRL(total)}` +
            (aplicarTaxa
              ? ` (subtotal ${formatBRL(preview.subtotal_centavos)} + taxa ${formatBRL(preview.taxa_centavos)})`
              : "") +
            (typeof saldo === "number" ? ` · saldo aberto ${formatBRL(saldo)}` : "")
        );
      }
      setFecharMesa(null);
      await carregar();
    } catch (e) {
      // Fallback: fechar mesa inteira sem body (API legada)
      if (posicoesSel.length === 0) {
        try {
          const res = await fetch(
            `${apiBase()}/api/v1/conta/mesa/${fecharMesa.qr_token}/fechar`,
            { method: "POST", headers: authHeaders() }
          );
          if (!res.ok) throw e;
          const conta = await res.json();
          setContaMsg(
            `${fecharMesa.nome}: ${formatBRL(conta.total_centavos ?? 0)} — conta fechada.` +
              ` Preview taxa: ${formatBRL(preview.taxa_centavos)} (API parcial ainda não aplica bps).`
          );
          // TODO: POST fechar com escopo/posicoes/aplicar_taxa
          setFecharMesa(null);
          await carregar();
          return;
        } catch {
          /* fall through */
        }
      }
      setErro(
        e instanceof Error
          ? e.message
          : "Não fechou a conta. Fechamento parcial exige API F1."
      );
    }
  }

  async function reabrir(mesa: Mesa) {
    setContaMsg("");
    setErro("");
    const res = await fetch(`${apiBase()}/api/v1/mesas/${mesa.id}/reabrir`, {
      method: "POST",
      headers: authHeaders(),
    });
    if (!res.ok) {
      setErro("Só reabre mesa com status fechada.");
      return;
    }
    setContaMsg(`${mesa.nome}: reaberta (livre).`);
    await carregar();
  }

  async function liberar(mesa: Mesa) {
    setContaMsg("");
    setErro("");
    try {
      await liberarMesa(mesa.qr_token);
      setContaMsg(`${mesa.nome}: liberada (livre). Sessões de cliente encerradas.`);
      setFecharMesa(null);
      await carregar();
    } catch (e) {
      setErro(
        e instanceof Error
          ? e.message
          : "Não liberou. Quite todo o saldo antes."
      );
    }
  }

  function togglePos(n: number) {
    setPosicoesSel((prev) =>
      prev.includes(n) ? prev.filter((x) => x !== n) : [...prev, n].sort((a, b) => a - b)
    );
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
      <p style={{ color: "var(--color-muted)", marginTop: 0 }}>
        Lista de mesas e fechamento parcial (posições) com taxa de serviço.
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

      <div className="list-filters">
        <label className="field">
          <span>Mesa</span>
          <input
            className="input"
            value={filtroMesa}
            onChange={(e) => setFiltroMesa(e.target.value)}
            placeholder="Nome"
            aria-label="Filtrar por mesa"
          />
        </label>
        <label className="field">
          <span>Qtd. pessoas (mín.)</span>
          <input
            className="input"
            type="number"
            min={0}
            value={filtroCapMin}
            onChange={(e) => setFiltroCapMin(e.target.value)}
            placeholder="Capacidade"
            aria-label="Filtrar por capacidade mínima"
          />
        </label>
        <label className="field">
          <span>Setor</span>
          <select
            className="input"
            value={filtroSetor}
            onChange={(e) => setFiltroSetor(e.target.value)}
            aria-label="Filtrar por setor"
          >
            <option value="">Todos</option>
            {setores.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
      </div>

      <h2 className="section-title">Mesas</h2>
      {loading ? (
        <div className="empty">
          <strong>Carregando…</strong>
        </div>
      ) : lista.length === 0 ? (
        <div className="empty">
          <strong>Nenhuma mesa neste filtro</strong>
          Ajuste os filtros ou crie mesas em Mesas.
        </div>
      ) : (
        <div className="list" role="list">
          {lista.map((m) => (
            <div key={m.id} className="list-row" role="listitem">
              <div>
                <div className="row__name">{m.nome}</div>
                <div className="row__meta">
                  <code style={{ fontSize: "0.85rem" }}>/m/{m.qr_token}</code>
                </div>
              </div>
              <div className="row__meta">
                {m.capacidade ?? "—"} pessoas
                {m.setor ? ` · ${m.setor}` : ""}
                <br />
                <span
                  className={`badge ${m.status === "fechada" ? "" : "badge--ok"}`}
                >
                  {m.status}
                </span>
              </div>
              <div className="list-row__actions">
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
                    onClick={() => abrirFecharParcial(m)}
                  >
                    Fechar
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn btn--ghost btn--sm"
                    onClick={() => reabrir(m)}
                  >
                    Reabrir
                  </button>
                )}
                {m.status !== "livre" && (
                  <button
                    type="button"
                    className="btn btn--ghost btn--sm"
                    onClick={() => liberar(m)}
                  >
                    Liberar
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {fecharMesa && (
        <div className="card" style={{ marginTop: 24 }} role="dialog" aria-labelledby="fechar-titulo">
          <h2 id="fechar-titulo" style={{ fontSize: "1.15rem", marginTop: 0 }}>
            Fechar — {fecharMesa.nome}
          </h2>
          <p style={{ color: "var(--color-muted)", marginTop: 0 }}>
            Sem posições = mesa inteira. Com posições = fechamento parcial (+ taxa).
          </p>

          {previewLoading ? (
            <div className="empty">
              <strong>Carregando conta…</strong>
            </div>
          ) : (
            <>
              <div className="posicoes-grid" role="group" aria-label="Posições a fechar">
                {Array.from({ length: capacidade }, (_, i) => i + 1).map((n) => {
                  const on = posicoesSel.includes(n);
                  return (
                    <button
                      key={n}
                      type="button"
                      className={`posicao-chip ${on ? "posicao-chip--on" : ""}`}
                      aria-pressed={on}
                      onClick={() => togglePos(n)}
                    >
                      {n}
                    </button>
                  );
                })}
              </div>

              <label
                className="field"
                style={{
                  display: "flex",
                  gap: 10,
                  alignItems: "center",
                  marginTop: 14,
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={aplicarTaxa}
                  onChange={(e) => setAplicarTaxa(e.target.checked)}
                />
                <span>
                  Aplicar taxa de serviço ({(taxaBps / 100).toFixed(0)}%)
                </span>
              </label>

              <div className="card" style={{ marginTop: 12, boxShadow: "none" }}>
                <div className="row">
                  <span>Subtotal</span>
                  <span className="row__price">{formatBRL(preview.subtotal_centavos)}</span>
                </div>
                <div className="row">
                  <span>Taxa ({preview.taxa_bps / 100}%)</span>
                  <span className="row__price">{formatBRL(preview.taxa_centavos)}</span>
                </div>
                <div className="total">
                  <span>Total</span>
                  <span>{formatBRL(preview.total_centavos)}</span>
                </div>
                <p className="row__meta" style={{ marginBottom: 0 }}>
                  {itensEscopo.length} item(ns) no escopo
                  {posicoesSel.length
                    ? ` · posições ${posicoesSel.join(", ")}`
                    : " · mesa completa"}
                </p>
              </div>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 }}>
                <button
                  type="button"
                  className="btn btn--primary"
                  onClick={confirmarFechar}
                >
                  Confirmar fechamento
                </button>
                <button
                  type="button"
                  className="btn btn--ghost"
                  onClick={() => liberar(fecharMesa)}
                >
                  Liberar mesa
                </button>
                <button
                  type="button"
                  className="btn btn--ghost"
                  onClick={() => setFecharMesa(null)}
                >
                  Cancelar
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
