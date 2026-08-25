"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import QRCode from "qrcode";
import { useCallback, useEffect, useRef, useState } from "react";
import { apiBase, authHeaders } from "@/lib/api";
import { useRequireAuth } from "@/lib/useRequireAuth";

const QR_SIZE = 320;

export default function MesaQrPage() {
  const { ready } = useRequireAuth();
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [mesa, setMesa] = useState<{
    id: number;
    nome: string;
    qr_token: string;
  } | null>(null);
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [erro, setErro] = useState("");

  const publicUrl = mesa
    ? `${process.env.NEXT_PUBLIC_APP_URL || (typeof window !== "undefined" ? window.location.origin : "http://localhost:3000")}/m/${mesa.qr_token}`
    : "";

  const renderQr = useCallback(async (url: string) => {
    if (!url) return;
    try {
      if (canvasRef.current) {
        await QRCode.toCanvas(canvasRef.current, url, {
          width: QR_SIZE,
          margin: 4,
          color: { dark: "#000000", light: "#FFFFFF" },
          errorCorrectionLevel: "M",
        });
      }
      const d = await QRCode.toDataURL(url, {
        width: 512,
        margin: 4,
        color: { dark: "#000000", light: "#FFFFFF" },
        errorCorrectionLevel: "M",
      });
      setDataUrl(d);
    } catch {
      setErro("Não foi possível gerar o QR.");
    }
  }, []);

  useEffect(() => {
    if (!ready || !id) return;
    fetch(`${apiBase()}/api/v1/mesas/${id}`, { headers: authHeaders() })
      .then(async (res) => {
        if (!res.ok) throw new Error("Mesa não encontrada.");
        setMesa(await res.json());
      })
      .catch((e) =>
        setErro(e instanceof Error ? e.message : "Mesa não encontrada.")
      );
  }, [ready, id]);

  useEffect(() => {
    if (publicUrl) renderQr(publicUrl);
  }, [publicUrl, renderQr]);

  function baixarPng() {
    if (!dataUrl || !mesa) return;
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `qr-${mesa.nome.replace(/\s+/g, "-").toLowerCase()}.png`;
    a.click();
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

  return (
    <div className="shell">
      <nav className="nav" aria-label="QR">
        <Link href="/mesas" className="nav__brand">
          PedidoMesa
        </Link>
        <div className="nav__links">
          <Link href="/mesas" className="nav__link">
            Mesas
          </Link>
        </div>
      </nav>

      <h1 style={{ fontSize: "clamp(1.6rem, 5vw, 2.2rem)", margin: "0 0 6px" }}>
        {mesa ? `QR · ${mesa.nome}` : "QR da mesa"}
      </h1>

      {erro && (
        <div className="status status--error" role="alert">
          {erro}
        </div>
      )}

      {mesa && (
        <>
          <div
            className="print-area"
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 12,
              padding: 32,
              background: "#ffffff",
              color: "#000000",
              borderRadius: 12,
              textAlign: "center",
            }}
          >
            <p style={{ margin: 0, fontSize: "1.4rem", fontWeight: 700 }}>
              {mesa.nome}
            </p>
            <canvas ref={canvasRef} width={QR_SIZE} height={QR_SIZE} />
            <p
              style={{
                margin: 0,
                fontSize: "0.85rem",
                wordBreak: "break-all",
                color: "#333",
              }}
            >
              {publicUrl}
            </p>
          </div>

          <div className="card" style={{ marginTop: 16 }}>
            <label className="field">
              <span>Link (somente leitura)</span>
              <input className="input" value={publicUrl} readOnly />
            </label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                type="button"
                className="btn btn--primary"
                onClick={baixarPng}
                disabled={!dataUrl}
              >
                Baixar PNG
              </button>
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => window.print()}
              >
                Imprimir
              </button>
            </div>
          </div>
        </>
      )}

      <style>{`
        @media print {
          body * { visibility: hidden; }
          .print-area, .print-area * { visibility: visible; }
          .print-area {
            position: fixed;
            inset: 0;
            margin: 0;
            box-shadow: none;
            border: none;
          }
          .nav, .card, h1 { display: none !important; }
        }
      `}</style>
    </div>
  );
}
