import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PedidoMesa — Tech42",
  description: "Pedidos pelo celular na mesa. Assinatura fixa para o seu bar.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
