"use client";

import Link from "next/link";
import { FormEvent, Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getToken, login } from "@/lib/api";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [usuario, setUsuario] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (getToken()) {
      router.replace(params.get("next") || "/home");
    }
  }, [router, params]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErro("");
    setLoading(true);
    try {
      await login(usuario, senha);
      router.replace(params.get("next") || "/home");
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Usuário ou senha incorretos.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="shell" style={{ maxWidth: 420 }}>
      <nav className="nav" aria-label="Login">
        <Link href="/" className="nav__brand">
          PedidoMesa
        </Link>
      </nav>

      <h1 style={{ fontSize: "clamp(1.6rem, 5vw, 2.2rem)", margin: "0 0 6px" }}>
        Entrar
      </h1>
      <p style={{ color: "var(--muted)", marginTop: 0 }}>
        Acesse a casa com usuário e senha do estabelecimento.
      </p>

      {erro && (
        <div className="status status--error" role="alert">
          {erro}
        </div>
      )}

      <form className="card rise" onSubmit={onSubmit}>
        <label className="field">
          <span>Usuário</span>
          <input
            className="input"
            value={usuario}
            onChange={(e) => setUsuario(e.target.value)}
            autoComplete="username"
            required
          />
        </label>
        <label className="field">
          <span>Senha</span>
          <input
            className="input"
            type="password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            autoComplete="current-password"
            required
          />
        </label>
        <button
          type="submit"
          className="btn btn--primary btn--block"
          disabled={loading}
        >
          {loading ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="shell">
          <div className="empty">
            <strong>Carregando…</strong>
          </div>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
