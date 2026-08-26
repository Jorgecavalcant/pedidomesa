"use client";

import Link from "next/link";
import HowItWorksHelp from "../components/HowItWorksHelp";

export default function LandingPage() {
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
        <span className="hero__kicker">Pedido na mesa, sem fila</span>
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
          <HowItWorksHelp />
        </div>
      </header>

      <section id="como-funciona" aria-labelledby="como-funciona-title">
        <h2 className="section-title" id="como-funciona-title">
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
              Abre o link do QR no celular, escolhe no cardápio — individual ou
              coletivo.
            </p>
          </div>
          <div className="card step rise">
            <h3>Cozinha e conta</h3>
            <p>
              Cozinha marca pronto. Balcão fecha a conta e a mesa volta a ficar
              livre.
            </p>
          </div>
        </div>
      </section>

      <section aria-labelledby="prova">
        <h2 className="section-title" id="prova">
          Mensalidade fixa — sem % na venda
        </h2>
        <div className="proof rise">
          <p style={{ margin: 0 }}>
            <strong>Você paga um valor fixo por mês.</strong> Não cobramos
            porcentagem sobre o que a mesa pede. Vendeu mais? O lucro fica com a
            casa.
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
          Entre na casa, crie uma mesa de teste e veja o fluxo completo em
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

      <footer className="footer-note">PedidoMesa · sua mesa, seu ritmo.</footer>
    </div>
  );
}
