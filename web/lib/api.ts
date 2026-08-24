export function apiBase(): string {
  return process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
}

export async function demoLogin(): Promise<string> {
  const res = await fetch(`${apiBase()}/api/v1/auth/demo`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ usuario: "demo", senha: "demo123" }),
  });
  if (!res.ok) throw new Error("Falha no login demo");
  const data = await res.json();
  return data.access_token as string;
}
