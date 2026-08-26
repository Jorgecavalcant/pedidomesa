"use client";

import { useEffect, useRef, useState } from "react";

const HELP_TEXT =
  "Em 3 passos: balcão cria a mesa → cliente pede no celular → cozinha e conta no balcão.";

export default function HowItWorksHelp() {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    function onPointer(e: PointerEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }

    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onPointer);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  return (
    <div ref={wrapRef} style={{ position: "relative", display: "inline-flex", alignItems: "center", gap: 8 }}>
      <button
        type="button"
        aria-label="Como funciona"
        aria-expanded={open}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={(e) => {
          e.preventDefault();
          setOpen((v) => !v);
        }}
        style={{
          width: 44,
          height: 44,
          minWidth: 44,
          borderRadius: "50%",
          border: `1px solid var(--color-border)`,
          background: open ? "var(--color-accent)" : "transparent",
          color: open ? "var(--color-on-accent)" : "var(--color-muted)",
          fontSize: 20,
          fontWeight: 700,
          cursor: "pointer",
        }}
      >
        ?
      </button>
      <span
        role="tooltip"
        hidden={!open}
        style={{
          position: "absolute",
          top: "calc(100% + 8px)",
          left: 0,
          maxWidth: 320,
          padding: "10px 14px",
          borderRadius: 8,
          background: "var(--color-brand)",
          border: `1px solid var(--color-border)`,
          boxShadow: "var(--shadow-md)",
          color: "var(--color-text)",
          fontSize: 14,
          lineHeight: 1.45,
          zIndex: 50,
        }}
      >
        {HELP_TEXT}
      </span>
    </div>
  );
}
