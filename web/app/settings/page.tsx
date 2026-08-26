"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import {
  TAXA_SERVICO_BPS_DEFAULT,
  aprovarSolicitacao,
  aprovarTransferencia,
  createUser,
  fetchMe,
  fetchSettings,
  listSolicitacoes,
  listTransferencias,
  listUsers,
  parseMesasIdsCsv,
  patchSettings,
  patchUser,
  rejeitarSolicitacao,
  rejeitarTransferencia,
  type Papel,
  type SolicitacaoAcao,
  type Transferencia,
  type UserOut,
} from "@/lib/api";
import { useRequireAuth } from "@/lib/useRequireAuth";

export default function SettingsPage() {
  const { ready } = useRequireAuth();
  const [papel, setPapel] = useState<Papel | string>("");
  const [nome, setNome] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [taxaBps, setTaxaBps] = useState(TAXA_SERVICO_BPS_DEFAULT);
  const [erro, setErro] = useState("");
  const [msg, setMsg] = useState("");
  const [avisoTaxa, setAvisoTaxa] = useState("");

  const [users, setUsers] = useState<UserOut[]>([]);
  const [novoUsuario, setNovoUsuario] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [novoPapel, setNovoPapel] = useState<Papel>("garcom");
  const [novasMesas, setNovasMesas] = useState("");
  const [novoAtivo, setNovoAtivo] = useState(true);

  const [sols, setSols] = useState<SolicitacaoAcao[]>([]);
  const [xfers, setXfers] = useState<Transferencia[]>([]);

  const isDono = papel === "dono";

  const carregarAdmin = useCallback(async () => {
    try {
      const [u, s, t] = await Promise.all([
        listUsers(),
        listSolicitacoes("pending"),
        listTransferencias("pending"),
      ]);
      setUsers(u);
      setSols(s);
      setXfers(t);
    } catch (e) {
      // garçom/cozinha: 403 esperado em users
      const m = e instanceof Error ? e.message : "Falha admin.";
      if (!m.toLowerCase().includes("permissão")) {
        setErro(m);
      }
      try {
        setSols(await listSolicitacoes("pending"));
      } catch {
        /* ignore */
      }
      try {
        setXfers(await listTransferencias("pending"));
      } catch {
        /* ignore */
      }
    }
  }, []);

  useEffect(() => {
    if (!ready) return;
    (async () => {
      try {
        const me = await fetchMe();
        setPapel(me.papel);
      } catch {
        /* ignore */
      }
      fetchSettings()
        .then((d) => {
          setNome(d.nome_estabelecimento);
          setMensagem(d.mensagem_conta);
          if (typeof d.taxa_servico_bps === "number") {
            setTaxaBps(d.taxa_servico_bps);
          }
        })
        .catch((e) => setErro(e instanceof Error ? e.message : "Falha."));
    })();
  }, [ready]);

  useEffect(() => {
    if (!ready || !papel) return;
    if (papel === "dono") carregarAdmin();
  }, [ready, papel, carregarAdmin]);

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
          "Taxa enviada, mas a API ainda não devolve taxa_servico_bps — confirme no backend F1."
        );
      }
    } catch {
      try {
        await patchSettings({
          nome_estabelecimento: nome,
          mensagem_conta: mensagem,
        });
        setMsg("Nome e mensagem salvos.");
        setAvisoTaxa(
          "Taxa de serviço ainda não persiste na API — valor fica só nesta tela até o backend F1."
        );
      } catch (err) {
        setErro(err instanceof Error ? err.message : "Não salvou.");
      }
    }
  }

  async function criarGarcom(e: FormEvent) {
    e.preventDefault();
    setErro("");
    setMsg("");
    try {
      await createUser({
        usuario: novoUsuario.trim(),
        senha: novaSenha,
        papel: novoPapel,
        mesas_ids: parseMesasIdsCsv(novasMesas),
        ativo: novoAtivo,
      });
      setMsg(`Usuário ${novoUsuario.trim()} criado.`);
      setNovoUsuario("");
      setNovaSenha("");
      setNovasMesas("");
      setNovoPapel("garcom");
      setNovoAtivo(true);
      await carregarAdmin();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Não criou usuário.");
    }
  }

  async function toggleAtivo(u: UserOut) {
    setErro("");
    try {
      await patchUser(u.id, { ativo: !u.ativo });
      setMsg(`${u.usuario}: ${u.ativo ? "desativado" : "ativado"}.`);
      await carregarAdmin();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Não atualizou.");
    }
  }

  async function editarMesas(u: UserOut) {
    const raw = prompt(
      `Mesas de ${u.usuario} (ids separados por vírgula; vazio = todas):`,
      (u.mesas_ids || []).join(",")
    );
    if (raw === null) return;
    setErro("");
    try {
      await patchUser(u.id, { mesas_ids: parseMesasIdsCsv(raw) });
      setMsg(`Mesas de ${u.usuario} atualizadas.`);
      await carregarAdmin();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Não atualizou mesas.");
    }
  }

  async function resetSenha(u: UserOut) {
    const senha = prompt(`Nova senha para ${u.usuario} (mín. 4):`);
    if (!senha) return;
    setErro("");
    try {
      await patchUser(u.id, { senha });
      setMsg(`Senha de ${u.usuario} atualizada.`);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Não atualizou senha.");
    }
  }

  async function resolverSol(id: number, ok: boolean) {
    setErro("");
    setMsg("");
    try {
      if (ok) await aprovarSolicitacao(id);
      else await rejeitarSolicitacao(id);
      setMsg(ok ? `Solicitação #${id} aprovada.` : `Solicitação #${id} rejeitada.`);
      await carregarAdmin();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Não resolveu.");
    }
  }

  async function resolverXfer(id: number, ok: boolean) {
    setErro("");
    setMsg("");
    try {
      if (ok) await aprovarTransferencia(id);
      else await rejeitarTransferencia(id);
      setMsg(ok ? `Transferência #${id} aprovada.` : `Transferência #${id} rejeitada.`);
      await carregarAdmin();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Não resolveu.");
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
          <Link href="/garcom" className="nav__link">
            Garçom
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

      {isDono && (
        <>
          <h2 className="section-title">Solicitações pendentes</h2>
          {sols.length === 0 ? (
            <div className="empty">
              <strong>Nenhuma pendente</strong>
              Cancelamentos e edições do garçom aparecem aqui.
            </div>
          ) : (
            <div className="card">
              {sols.map((s) => (
                <div key={s.id} className="row">
                  <div>
                    <div className="row__name">
                      #{s.id} · {s.tipo}
                    </div>
                    <div className="row__meta">
                      {s.pedido_id ? `pedido #${s.pedido_id}` : "sem pedido"}
                      {s.created_at ? ` · ${s.created_at}` : ""}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <button
                      type="button"
                      className="btn btn--primary btn--sm"
                      onClick={() => resolverSol(s.id, true)}
                      aria-label={`Aprovar solicitação ${s.id}`}
                    >
                      Aprovar
                    </button>
                    <button
                      type="button"
                      className="btn btn--ghost btn--sm"
                      onClick={() => resolverSol(s.id, false)}
                      aria-label={`Rejeitar solicitação ${s.id}`}
                    >
                      Rejeitar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <h2 className="section-title">Transferências pendentes</h2>
          {xfers.length === 0 ? (
            <div className="empty">
              <strong>Nenhuma pendente</strong>
            </div>
          ) : (
            <div className="card">
              {xfers.map((t) => (
                <div key={t.id} className="row">
                  <div>
                    <div className="row__name">#{t.id} · transferência</div>
                    <div className="row__meta">
                      mesa {t.mesa_origem_id} → {t.mesa_destino_id}
                      {t.posicoes_destino?.length
                        ? ` · pos dest ${t.posicoes_destino.join(",")}`
                        : ""}
                      {" · "}
                      pedidos {t.pedido_ids.join(",")}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <button
                      type="button"
                      className="btn btn--primary btn--sm"
                      onClick={() => resolverXfer(t.id, true)}
                      aria-label={`Aprovar transferência ${t.id}`}
                    >
                      Aprovar
                    </button>
                    <button
                      type="button"
                      className="btn btn--ghost btn--sm"
                      onClick={() => resolverXfer(t.id, false)}
                      aria-label={`Rejeitar transferência ${t.id}`}
                    >
                      Rejeitar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <h2 className="section-title">Usuários</h2>
          <form className="card" onSubmit={criarGarcom}>
            <label className="field">
              <span>Usuário</span>
              <input
                className="input"
                value={novoUsuario}
                onChange={(e) => setNovoUsuario(e.target.value)}
                required
                maxLength={80}
                autoComplete="off"
              />
            </label>
            <label className="field">
              <span>Senha</span>
              <input
                className="input"
                type="password"
                value={novaSenha}
                onChange={(e) => setNovaSenha(e.target.value)}
                required
                minLength={4}
                autoComplete="new-password"
              />
            </label>
            <label className="field">
              <span>Papel</span>
              <select
                className="input"
                value={novoPapel}
                onChange={(e) => setNovoPapel(e.target.value as Papel)}
              >
                <option value="garcom">Garçom</option>
                <option value="cozinha">Cozinha</option>
                <option value="dono">Dono</option>
              </select>
            </label>
            <label className="field">
              <span>Mesas (ids, vírgula)</span>
              <input
                className="input"
                value={novasMesas}
                onChange={(e) => setNovasMesas(e.target.value)}
                placeholder="Ex.: 1,2,3 — vazio = todas"
                aria-describedby="mesas-help"
              />
            </label>
            <p id="mesas-help" className="row__meta" style={{ marginTop: -8 }}>
              Só para garçom: restringe quais mesas ele vê no app.
            </p>
            <label
              className="field"
              style={{
                display: "flex",
                gap: 10,
                alignItems: "center",
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={novoAtivo}
                onChange={(e) => setNovoAtivo(e.target.checked)}
              />
              <span>Ativo</span>
            </label>
            <button type="submit" className="btn btn--primary btn--block">
              Criar usuário
            </button>
          </form>

          {users.length === 0 ? (
            <div className="empty">
              <strong>Nenhum usuário listado</strong>
            </div>
          ) : (
            <div className="card">
              {users.map((u) => (
                <div key={u.id} className="row">
                  <div>
                    <div className="row__name">{u.usuario}</div>
                    <div className="row__meta">
                      {u.papel}
                      {u.mesas_ids?.length
                        ? ` · mesas ${u.mesas_ids.join(",")}`
                        : " · todas as mesas"}
                      {" · "}
                      <span className={`badge ${u.ativo ? "badge--ok" : ""}`}>
                        {u.ativo ? "ativo" : "inativo"}
                      </span>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <button
                      type="button"
                      className="btn btn--ghost btn--sm"
                      onClick={() => editarMesas(u)}
                    >
                      Mesas
                    </button>
                    <button
                      type="button"
                      className="btn btn--ghost btn--sm"
                      onClick={() => resetSenha(u)}
                    >
                      Senha
                    </button>
                    <button
                      type="button"
                      className="btn btn--ghost btn--sm"
                      onClick={() => toggleAtivo(u)}
                    >
                      {u.ativo ? "Desativar" : "Ativar"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {!isDono && papel && (
        <div className="status status--warn" role="status" style={{ marginTop: 16 }}>
          Aprovações e usuários são só para o dono. Seu papel: {papel}.
        </div>
      )}
    </div>
  );
}
