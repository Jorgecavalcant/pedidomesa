"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  LGPD_CONSENT_VERSAO,
  apiBase,
  createPedidoCliente,
  criarSessaoCliente,
  fetchMeusPedidos,
  formatBRL,
  getOrCreateDeviceToken,
  lgpdConsentTexto,
  reentrarCliente,
  toE164BR,
  type MesaPublic,
  type Pedido,
} from "@/lib/api";

type Item = {
  id: number;
  nome: string;
  descricao: string | null;
  preco_centavos: number;
};

type Step = "gate" | "posicoes" | "cardapio";

const SESSION_KEY = (token: string) => `pm_cliente_sessao_${token}`;

type LocalSessao = {
  nome: string;
  celular_e164: string;
  posicoes: number[];
  consent_texto_versao: string;
};

function loadLocalSessao(token: string): LocalSessao | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(SESSION_KEY(token));
    if (!raw) return null;
    return JSON.parse(raw) as LocalSessao;
  } catch {
    return null;
  }
}

function saveLocalSessao(token: string, s: LocalSessao) {
  try {
    sessionStorage.setItem(SESSION_KEY(token), JSON.stringify(s));
  } catch {
    // ignore
  }
}

export default function MesaPage() {
  const { token } = useParams<{ token: string }>();
  const [mesa, setMesa] = useState<MesaPublic | null>(null);
  const [mesaErro, setMesaErro] = useState<"nao_encontrada" | "falha" | "">("");
  const [itens, setItens] = useState<Item[]>([]);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [step, setStep] = useState<Step>("gate");

  const [nome, setNome] = useState("");
  const [celular, setCelular] = useState("");
  const [consent, setConsent] = useState(false);
  const [posicoesSel, setPosicoesSel] = useState<number[]>([]);
  const [sessao, setSessao] = useState<LocalSessao | null>(null);

  const [msg, setMsg] = useState("");
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [apiAviso, setApiAviso] = useState("");

  const capacidade = mesa?.capacidade && mesa.capacidade >= 1 ? mesa.capacidade : 4;
  const nomeCasa = mesa?.estabelecimento_nome || "este estabelecimento";
  const consentTexto = useMemo(() => lgpdConsentTexto(nomeCasa), [nomeCasa]);

  const carregarMesaECardapio = useCallback(async () => {
    setLoading(true);
    try {
      const mesaRes = await fetch(`${apiBase()}/api/v1/mesas/por-token/${token}`);
      if (mesaRes.status === 404) {
        setMesaErro("nao_encontrada");
        setMesa(null);
        return;
      }
      if (!mesaRes.ok) {
        setMesaErro("falha");
        setMesa(null);
        return;
      }
      const mesaData: MesaPublic = await mesaRes.json();
      setMesa(mesaData);
      setMesaErro("");

      const cardapioRes = await fetch(`${apiBase()}/api/v1/cardapio`);
      if (!cardapioRes.ok) throw new Error("cardapio");
      setItens(await cardapioRes.json());
      setErro("");
    } catch {
      setErro("Não conseguimos falar com a cozinha agora. Tente de novo.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  const carregarMeusPedidos = useCallback(
    async (local: LocalSessao) => {
      try {
        const meus = await fetchMeusPedidos(token);
        setPedidos(meus);
        setApiAviso("");
      } catch {
        // Fallback: lista pública filtrada pelo nome da sessão (API F1 ainda pode faltar)
        try {
          const r = await fetch(`${apiBase()}/api/v1/pedidos/mesa/${token}`);
          if (!r.ok) throw new Error("pedidos");
          const all: Pedido[] = await r.json();
          const filtrados = all.filter((p) => {
            if (p.cliente_nome && local.nome) {
              return (
                p.cliente_nome.trim().toLowerCase() ===
                local.nome.trim().toLowerCase()
              );
            }
            if (local.posicoes.length && p.posicoes?.length) {
              return p.posicoes.some((x) => local.posicoes.includes(x));
            }
            return false;
          });
          setPedidos(filtrados);
          setApiAviso(
            // TODO: GET /cliente/mesa/{token}/meus-pedidos — fallback por nome até API F1
            "Mostrando seus itens (filtro local). Sync completo quando a API de sessão estiver no ar."
          );
        } catch {
          setPedidos([]);
        }
      }
    },
    [token]
  );

  useEffect(() => {
    carregarMesaECardapio();
  }, [carregarMesaECardapio]);

  useEffect(() => {
    if (!mesa || mesaErro) return;
    const local = loadLocalSessao(token);
    if (local?.consent_texto_versao && local.nome) {
      setSessao(local);
      setNome(local.nome);
      setCelular(local.celular_e164);
      setPosicoesSel(local.posicoes);
      setStep(local.posicoes.length ? "cardapio" : "posicoes");
      if (local.posicoes.length) carregarMeusPedidos(local);
      return;
    }
    // Tentativa de reentrada silenciosa com celular salvo no device
    const savedCel = (() => {
      try {
        return localStorage.getItem(`pm_celular_${token}`) || "";
      } catch {
        return "";
      }
    })();
    if (!savedCel) {
      setStep("gate");
      return;
    }
    (async () => {
      try {
        const s = await reentrarCliente({
          celular_e164: savedCel,
          device_token: getOrCreateDeviceToken(),
          mesa_token: token,
        });
        const next: LocalSessao = {
          nome: s.nome,
          celular_e164: savedCel,
          posicoes: s.posicoes || [],
          consent_texto_versao: s.consent_texto_versao || LGPD_CONSENT_VERSAO,
        };
        saveLocalSessao(token, next);
        setSessao(next);
        setNome(next.nome);
        setPosicoesSel(next.posicoes);
        setStep(next.posicoes.length ? "cardapio" : "posicoes");
        if (next.posicoes.length) await carregarMeusPedidos(next);
      } catch {
        // TODO: POST /cliente/reentrar — sem endpoint, segue gate normal
        setStep("gate");
      }
    })();
  }, [mesa, mesaErro, token, carregarMeusPedidos]);

  async function confirmarGate(e: FormEvent) {
    e.preventDefault();
    setErro("");
    setMsg("");
    if (!consent) {
      setErro("Para continuar, marque que leu e concorda com o aviso de privacidade.");
      return;
    }
    if (!nome.trim()) {
      setErro("Informe como podemos te chamar nesta mesa.");
      return;
    }
    const e164 = toE164BR(celular);
    if (e164.replace(/\D/g, "").length < 12) {
      setErro("Informe um celular válido com DDD.");
      return;
    }

    const device = getOrCreateDeviceToken();
    try {
      await criarSessaoCliente(token, {
        nome: nome.trim(),
        celular_e164: e164,
        consent_aceito: true,
        consent_texto_versao: LGPD_CONSENT_VERSAO,
        device_token: device,
      });
    } catch {
      // TODO: POST /cliente/mesa/{token}/sessao — segue em modo local até API F1
      setApiAviso("Sessão salva neste aparelho. Sync com o servidor quando a API de LGPD estiver no ar.");
    }

    try {
      localStorage.setItem(`pm_celular_${token}`, e164);
    } catch {
      // ignore
    }

    const next: LocalSessao = {
      nome: nome.trim(),
      celular_e164: e164,
      posicoes: [],
      consent_texto_versao: LGPD_CONSENT_VERSAO,
    };
    saveLocalSessao(token, next);
    setSessao(next);
    setStep("posicoes");
  }

  function togglePosicao(n: number) {
    setPosicoesSel((prev) =>
      prev.includes(n) ? prev.filter((x) => x !== n) : [...prev, n].sort((a, b) => a - b)
    );
  }

  function confirmarPosicoes() {
    setErro("");
    if (posicoesSel.length === 0) {
      setErro("Escolha pelo menos uma posição (cadeira) nesta mesa.");
      return;
    }
    if (!sessao) return;
    const next = { ...sessao, posicoes: posicoesSel };
    saveLocalSessao(token, next);
    setSessao(next);
    setStep("cardapio");
    carregarMeusPedidos(next);
  }

  const pedir = async (item: Item) => {
    setMsg("");
    setErro("");
    if (!sessao) {
      setErro("Confirme o aviso de privacidade antes de pedir.");
      setStep("gate");
      return;
    }
    if (!sessao?.posicoes?.length) {
      setErro("Escolha suas posições antes de pedir.");
      setStep("posicoes");
      return;
    }
    setEnviando(true);
    try {
      await createPedidoCliente(
        {
          mesa_token: token,
          cardapio_item_id: item.id,
          quantidade: 1,
          cliente_nome: sessao.nome,
          modo: "individual",
          posicoes: sessao.posicoes,
        },
        getOrCreateDeviceToken()
      );
      setMsg(`"${item.nome}" enviado! Já está a caminho da cozinha.`);
      await carregarMeusPedidos(sessao);
    } catch (e) {
      const status = (e as Error & { status?: number }).status;
      if (status === 400) {
        setErro("Esta mesa está fechada. Fale com o balcão para reabrir.");
      } else if (status === 422) {
        setErro("Não foi possível registrar o pedido. Confira seus dados e tente de novo.");
      } else {
        setErro("Ops, o pedido não saiu. Tenta mais uma vez?");
      }
    } finally {
      setEnviando(false);
    }
  };

  const total = pedidos.reduce(
    (s, p) => s + p.preco_centavos * p.quantidade,
    0
  );

  const mesaFechada = mesa?.status === "fechada";

  if (mesaErro === "nao_encontrada") {
    return (
      <div className="shell shell--narrow">
        <nav className="nav" aria-label="Mesa">
          <Link href="/" className="nav__brand">
            PedidoMesa
          </Link>
        </nav>
        <div className="empty" style={{ marginTop: 24 }}>
          <strong>Essa mesa não existe</strong>
          Confira o QR ou fale com o balcão para pegar o link certo.
        </div>
      </div>
    );
  }

  if (mesaErro === "falha") {
    return (
      <div className="shell shell--narrow">
        <nav className="nav" aria-label="Mesa">
          <Link href="/" className="nav__brand">
            PedidoMesa
          </Link>
        </nav>
        <div className="status status--error" role="alert" style={{ marginTop: 24 }}>
          Não conseguimos abrir sua mesa agora.
        </div>
        <button
          type="button"
          className="btn btn--primary"
          style={{ marginTop: 12 }}
          onClick={() => carregarMesaECardapio()}
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  return (
    <div className="shell shell--narrow">
      <nav className="nav" aria-label="Mesa">
        <Link href="/" className="nav__brand">
          PedidoMesa
        </Link>
        <span className={`badge ${mesaFechada ? "badge--danger" : "badge--warn"}`}>
          {mesa ? mesa.nome : "Mesa"}
        </span>
      </nav>

      <header className="rise">
        <h1 style={{ fontSize: "clamp(1.6rem, 5vw, 2.2rem)", margin: "0 0 6px" }}>
          {step === "gate"
            ? "Bem-vindo à mesa"
            : step === "posicoes"
              ? "Onde você está sentado?"
              : "Boa noite! O que vai ser?"}
        </h1>
        <p style={{ color: "var(--color-muted)", margin: 0 }}>
          {step === "gate"
            ? "Só precisamos do seu nome e celular nesta mesa — sem marketing."
            : step === "posicoes"
              ? `Escolha a(s) posição(ões) de 1 a ${capacidade}.`
              : "Peça no seu ritmo — a cozinha recebe na hora."}
        </p>
      </header>

      {mesaFechada && (
        <div className="status status--warn" role="status" style={{ marginTop: 16 }}>
          Esta conta já foi fechada. Fale com o balcão se precisar pedir mais alguma coisa.
        </div>
      )}

      {apiAviso && (
        <div className="status status--warn" role="status" style={{ marginTop: 12 }}>
          {apiAviso}
        </div>
      )}
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

      {!mesaFechada && step === "gate" && (
        <form className="card rise" onSubmit={confirmarGate} style={{ marginTop: 20 }}>
          <label className="field">
            <span>Seu nome</span>
            <input
              className="input"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex.: Ana"
              autoComplete="nickname"
              required
              maxLength={80}
            />
          </label>
          <label className="field">
            <span>Celular (com DDD)</span>
            <input
              className="input"
              type="tel"
              inputMode="tel"
              value={celular}
              onChange={(e) => setCelular(e.target.value)}
              placeholder="Ex.: 11999998888"
              autoComplete="tel"
              required
            />
          </label>
          <label
            className="field"
            style={{
              display: "flex",
              gap: 10,
              alignItems: "flex-start",
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              style={{ marginTop: 4, width: 18, height: 18, flexShrink: 0 }}
              aria-required
            />
            <span style={{ fontSize: "0.9rem", color: "var(--color-muted)", lineHeight: 1.45 }}>
              {consentTexto}
              <br />
              <strong style={{ color: "var(--color-text)" }}>Li e concordo.</strong>
              <span className="row__meta"> · versão {LGPD_CONSENT_VERSAO}</span>
            </span>
          </label>
          <button
            type="submit"
            className="btn btn--primary btn--block"
            disabled={!consent}
          >
            Continuar
          </button>
          <p className="row__meta" style={{ marginTop: 10, marginBottom: 0 }}>
            Já esteve nesta mesa neste aparelho? Informe o mesmo celular para reentrar.
          </p>
        </form>
      )}

      {!mesaFechada && step === "posicoes" && (
        <div className="card rise" style={{ marginTop: 20 }}>
          <p style={{ color: "var(--color-muted)", marginTop: 0 }}>
            {sessao?.nome ? `Oi, ${sessao.nome}. ` : ""}
            Toque nas posições que você ocupa (pode ser mais de uma).
          </p>
          <div className="posicoes-grid" role="group" aria-label="Posições da mesa">
            {Array.from({ length: capacidade }, (_, i) => i + 1).map((n) => {
              const on = posicoesSel.includes(n);
              return (
                <button
                  key={n}
                  type="button"
                  className={`posicao-chip ${on ? "posicao-chip--on" : ""}`}
                  aria-pressed={on}
                  onClick={() => togglePosicao(n)}
                >
                  {n}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            className="btn btn--primary btn--block"
            style={{ marginTop: 16 }}
            onClick={confirmarPosicoes}
          >
            Ir ao cardápio
          </button>
          <button
            type="button"
            className="btn btn--ghost btn--block"
            style={{ marginTop: 8 }}
            onClick={() => setStep("gate")}
          >
            Voltar
          </button>
        </div>
      )}

      {step === "cardapio" && (
        <>
          {sessao && (
            <div className="card" style={{ marginTop: 16 }}>
              <div className="row" style={{ borderBottom: "none", paddingTop: 0 }}>
                <div>
                  <div className="row__name">{sessao.nome}</div>
                  <div className="row__meta">
                    Posições: {sessao.posicoes.join(", ") || "—"}
                    {sessao.celular_e164
                      ? ` · …${sessao.celular_e164.slice(-4)}`
                      : ""}
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  onClick={() => setStep("posicoes")}
                  aria-label="Alterar posições"
                >
                  Posições
                </button>
              </div>
            </div>
          )}

          <h2 className="section-title">Cardápio</h2>
          {loading ? (
            <div className="empty">
              <strong>Pegando o cardápio…</strong>
              só um instante.
            </div>
          ) : itens.length === 0 ? (
            <div className="empty">
              <strong>Cardápio vazio por aqui</strong>
              Fale com o balcão — deve ser só um momento.
            </div>
          ) : (
            <div className="grid grid--2">
              {itens.map((item) => (
                <article key={item.id} className="card">
                  <h3 style={{ fontSize: "1.05rem", margin: "0 0 4px" }}>
                    {item.nome}
                  </h3>
                  {item.descricao && (
                    <p
                      style={{
                        color: "var(--color-muted)",
                        fontSize: ".9rem",
                        margin: "0 0 12px",
                      }}
                    >
                      {item.descricao}
                    </p>
                  )}
                  <div className="row" style={{ borderBottom: "none", paddingTop: 0 }}>
                    <span className="row__price">{formatBRL(item.preco_centavos)}</span>
                    <button
                      type="button"
                      className="btn btn--primary btn--sm"
                      onClick={() => pedir(item)}
                      disabled={mesaFechada || enviando || !sessao}
                      aria-label={`Pedir ${item.nome}`}
                    >
                      {enviando ? "Enviando…" : "Pedir"}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}

          <h2 className="section-title">Seus pedidos</h2>
          <div className="card">
            {pedidos.length === 0 ? (
              <div className="empty" style={{ border: "none" }}>
                <strong>Nada pedido ainda</strong>
                Escolha algo acima e faça sua primeira rodada.
              </div>
            ) : (
              <>
                {pedidos.map((p) => (
                  <div key={p.id} className="row">
                    <div>
                      <div className="row__name">
                        {p.quantidade}× {p.nome_item}
                      </div>
                      <div className="row__meta">
                        {p.posicoes?.length
                          ? `pos. ${p.posicoes.join(",")}`
                          : "coletivo"}{" "}
                        ·{" "}
                        <span
                          className={`badge ${
                            p.status === "pronto" ? "badge--ok" : "badge--warn"
                          }`}
                        >
                          {p.status === "pronto" ? "pronto" : p.status}
                        </span>
                        {p.quitado ? " · quitado" : ""}
                      </div>
                    </div>
                    <span className="row__price">
                      {formatBRL(p.preco_centavos * p.quantidade)}
                    </span>
                  </div>
                ))}
                <div className="total">
                  <span>Total</span>
                  <span>{formatBRL(total)}</span>
                </div>
              </>
            )}
          </div>
        </>
      )}

      <footer className="footer-note">Sua mesa, seu ritmo. Bom apetite!</footer>
    </div>
  );
}
