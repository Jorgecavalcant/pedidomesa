"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getToken } from "./api";

/** Redirect para /login se não houver token. Retorna true quando autenticado. */
export function useRequireAuth(): { ready: boolean; token: string } {
  const router = useRouter();
  const pathname = usePathname();
  const [token, setTok] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const t = getToken();
    if (!t) {
      const next = encodeURIComponent(pathname || "/home");
      router.replace(`/login?next=${next}`);
      return;
    }
    setTok(t);
    setReady(true);
  }, [router, pathname]);

  return { ready, token };
}
