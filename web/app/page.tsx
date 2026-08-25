import Link from "next/link";

export default function HomePage() {
  return (
    <div className="shell">
      <nav className="nav" aria-label="Principal">
        <Link href="/" className="nav__brand">
          PedidoMesa
        </Link>
        <div className="nav__links">
          <Link href="/login" className="nav__link">
            Entrar
          </Link>
        </div>
      </nav>

      <header className="hero rise">
        <span className="hero__kicker">Noite de boteco, sem fila</span>
        <h1>Sua mesa, seu ritmo.</h1>
        <p>
          O cliente aponta o celular para o QR da mesa, pede o que quiser e a
          cozinha vê na hora. Você fecha a conta no balcão — mensalidade fixa,
          sem percentual por pedido.
        </p>
        <div className="hero__actions">
          <Link href="/login" className="btn btn--primary">
            Entrar na casa
          </Link>
          <Link href="#como-funciona" className="btn btn--ghost">
            Como funciona
          </Link>
        </div>
      </header>

      <section aria-labelledby="como-funciona">
        <h2 className="section-title" id="como-funciona">
          Como funciona
        </h2>
        <div className="steps">
          <div className="card step rise">
            <h3>Crie a mesa</h3>
            <p>No balcão você gera o QR/token da mesa. Um código, uma conta.</p>
          </div>
          <div className="card step rise">
            <h3>Cliente pede</h3>
            <p>
              Abre <code>/m/TOKEN</code> no celular, escolhe no cardápio — individual
              ou coletivo.
            </p>
          </div>
          <div className="card step rise">
            <h3>Cozinha e conta</h3>
            <p>Cozinha marca pronto. Balcão fecha a conta e a mesa volta a ficar livre.</p>
          </div>
        </div>
      </section>

      <section aria-labelledby="prova">
        <h2 className="section-title" id="prova">
          Preço que cabe no caixa
        </h2>
        <div className="proof rise">
          <p style={{ margin: 0 }}>
            <strong>Mensalidade fixa.</strong> Sem taxa por pedido, sem porcentagem
            em cima da venda. Quanto mais a casa vende, melhor pra você.
          </p>
        </div>
      </section>

      <section
        aria-labelledby="cta-final"
        style={{ marginTop: 48, textAlign: "center" }}
      >
        <h2
          className="section-title"
          id="cta-final"
          style={{ justifyContent: "center" }}
        >
          Pronto pra começar?
        </h2>
        <p
          style={{
            color: "var(--muted)",
            maxWidth: "46ch",
            margin: "0 auto 24px",
          }}
        >
          Abra o balcão, crie uma mesa de teste e veja o fluxo completo em
          segundos.
        </p>
        <div className="hero__actions" style={{ justifyContent: "center" }}>
          <Link href="/login" className="btn btn--primary">
            Entrar na casa
          </Link>
          <Link href="#como-funciona" className="btn btn--ghost">
            Como funciona
          </Link>
        </div>
      </section>

      <footer className="footer-note">
        PedidoMesa · sua mesa, seu ritmo.
      </footer>
    </div>
  );
}
