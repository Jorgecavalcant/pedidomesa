const TOKEN_KEY = "pm_access_token";

export function apiBase(): string {
  return process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export function authHeaders(extra?: HeadersInit): HeadersInit {
  const token = getToken();
  return {
    ...(extra || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function login(
  usuario: string,
  senha: string
): Promise<{ access_token: string; papel?: string }> {
  const res = await fetch(`${apiBase()}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ usuario, senha }),
  });
  if (!res.ok) throw new Error("Usuário ou senha incorretos.");
  const data = await res.json();
  setToken(data.access_token as string);
  return data;
}

export async function logout(): Promise<void> {
  try {
    await fetch(`${apiBase()}/api/v1/auth/logout`, {
      method: "POST",
      headers: authHeaders(),
    });
  } finally {
    clearToken();
  }
}

export async function fetchMe(): Promise<{
  usuario: string;
  papel: string;
  estabelecimento_nome: string;
}> {
  const res = await fetch(`${apiBase()}/api/v1/auth/me`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Sessão inválida.");
  return res.json();
}

/** @deprecated UI deve usar login() — mantido só para scripts/testes. */
export async function demoLogin(): Promise<string> {
  const data = await login("demo", "demo123");
  return data.access_token;
}

export type Metricas = {
  data_ref: string;
  mesas_abertas: number;
  pedidos_pendentes: number;
  ticket_medio_centavos: number;
  faturamento_hoje_centavos: number;
  tempo_medio_preparo_segundos: number | null;
};

export async function fetchMetricas(): Promise<Metricas> {
  const res = await fetch(`${apiBase()}/api/v1/metricas`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Falha ao carregar métricas");
  return res.json();
}

export function formatBRL(centavos: number): string {
  return (centavos / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}
