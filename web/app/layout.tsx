import type { Metadata } from "next";
import { Fraunces, DM_Sans } from "next/font/google";
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
  title: "PedidoMesa",
  description:
    "Pedido na mesa, sem fila. Mensalidade previsível, sem comissão por pedido.",
};

// Default = sistema; override localStorage (light|dark|system). Anti-flash.
const themeBoot = `(function(){try{var t=localStorage.getItem("pm_theme");var d=document.documentElement;if(t==="light"){d.dataset.theme="light"}else if(t==="dark"){d.dataset.theme="dark"}else{d.dataset.theme=window.matchMedia("(prefers-color-scheme: light)").matches?"light":"dark"}}catch(e){try{d.dataset.theme=window.matchMedia("(prefers-color-scheme: light)").matches?"light":"dark"}catch(_){d.dataset.theme="dark"}}})();`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="pt-BR"
      className={`${fraunces.variable} ${dmSans.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBoot }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
