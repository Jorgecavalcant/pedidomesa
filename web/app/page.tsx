import Link from "next/link";

export default function HomePage() {
  return (
    <main>
      <p className="muted">Tech42</p>
      <h1>PedidoMesa</h1>
      <p style={{ fontSize: "1.15rem", maxWidth: 540, lineHeight: 1.5 }}>
        O cliente aponta o celular para o QR da mesa, pede o que quiser e a cozinha
        vê na hora. Você fecha a conta no balcão. Mensalidade fixa — sem percentual
        por pedido.
      </p>
      <div className="row" style={{ marginTop: "1.5rem" }}>
        <Link className="btn" href="/balcao">
          Abrir balcão
        </Link>
        <Link className="btn secondary" href="/cozinha">
          Painel cozinha
        </Link>
      </div>
      <div className="card" style={{ marginTop: "2rem" }}>
        <h2 style={{ marginTop: 0 }}>Como funciona</h2>
        <ol className="muted">
          <li>Crie a mesa no balcão (gera o QR/token).</li>
          <li>Cliente abre <code>/m/TOKEN</code> e faz o pedido.</li>
          <li>Cozinha marca como pronto.</li>
          <li>Balcão fecha a conta.</li>
        </ol>
      </div>
    </main>
  );
}
