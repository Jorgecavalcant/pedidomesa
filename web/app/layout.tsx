import type { Metadata } from "next";
import { Fraunces, DM_Sans } from "next/font/google";
import ThemeToggle from "./components/ThemeToggle";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "PedidoMesa — sua mesa, seu ritmo",
  description:
    "Pedidos pelo celular na mesa. Mensalidade fixa para o seu bar — sem percentual por pedido.",
};

const themeBoot = `(function(){try{var t=localStorage.getItem('pm_theme');if(t!=='light'&&t!=='dark')t='dark';var d=document.documentElement;d.dataset.theme=t;d.style.colorScheme=t;}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className={`${fraunces.variable} ${dmSans.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBoot }} />
      </head>
      <body>
        {children}
        <ThemeToggle />
      </body>
    </html>
  );
}
