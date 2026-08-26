const TOKEN_KEY = "pm_access_token";
const DEVICE_TOKEN_KEY = "pm_device_token";

/** Versão do texto LGPD do QR — alinhada a docs/LGPD-CONSENTIMENTO-QR.md */
export const LGPD_CONSENT_VERSAO = "pm-qr-consent-v1";

export const TAXA_SERVICO_BPS_DEFAULT = 1000;

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

/** Token de device (cliente QR) — nunca logar plaintext de celular. */
export function getOrCreateDeviceToken(): string {
  if (typeof window === "undefined") return "";
  try {
    let t = localStorage.getItem(DEVICE_TOKEN_KEY);
    if (!t) {
      t =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `dev_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      localStorage.setItem(DEVICE_TOKEN_KEY, t);
    }
    return t;
  } catch {
    return `dev_${Date.now()}`;
  }
}

export function clienteSessionHeaders(extra?: HeadersInit): HeadersInit {
  const device = getOrCreateDeviceToken();
  return {
    ...(extra || {}),
    "X-Device-Token": device,
  };
}

/** Normaliza celular BR para E.164 (+55…). */
export function toE164BR(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("55") && digits.length >= 12) return `+${digits}`;
  return `+55${digits}`;
}

export function formatBRL(centavos: number): string {
  return (centavos / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

/** Taxa de serviço: floor(subtotal * bps / 10000) — SPEC §3.5 */
export function calcTaxaCentavos(
  subtotalCentavos: number,
  taxaBps: number
): number {
  if (subtotalCentavos <= 0 || taxaBps <= 0) return 0;
  return Math.floor((subtotalCentavos * taxaBps) / 10000);
}

export function previewFechamento(
  subtotalCentavos: number,
  taxaBps: number,
  aplicarTaxa: boolean
): { subtotal_centavos: number; taxa_centavos: number; total_centavos: number; taxa_bps: number } {
  const taxa = aplicarTaxa ? calcTaxaCentavos(subtotalCentavos, taxaBps) : 0;
  return {
    subtotal_centavos: subtotalCentavos,
    taxa_centavos: taxa,
    total_centavos: subtotalCentavos + taxa,
    taxa_bps: aplicarTaxa ? taxaBps : 0,
  };
}

async function parseError(res: Response, fallback: string): Promise<string> {
  try {
    const body = await res.json();
    if (typeof body?.detail === "string") return body.detail;
    if (Array.isArray(body?.detail)) {
      return body.detail.map((d: { msg?: string }) => d.msg || "").filter(Boolean).join("; ") || fallback;
    }
  } catch {
    // ignore
  }
  return fallback;
}

// ---------- Auth ----------

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

export type Papel = "dono" | "garcom" | "cozinha";

export type Me = {
  usuario: string;
  papel: Papel | string;
  estabelecimento_nome: string;
  /** F1.5 — null/[] = todas; preenchido = só designadas */
  mesas_ids?: number[] | null;
};

export async function fetchMe(): Promise<Me> {
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

// ---------- Métricas ----------

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

// ---------- Mesas ----------

export type Mesa = {
  id: number;
  nome: string;
  qr_token: string;
  status: string;
  /** F1 — cadeiras lógicas 1..N */
  capacidade?: number;
  /** F1.5 — tag leve */
  setor?: string | null;
  created_at?: string | null;
};

export type MesaPublic = {
  id: number;
  nome: string;
  status: string;
  capacidade?: number;
  estabelecimento_nome?: string;
};

export type MesaCreateBody = {
  nome: string;
  capacidade: number;
  setor?: string | null;
};

export type MesaUpdateBody = {
  nome?: string;
  status?: string;
  capacidade?: number;
  setor?: string | null;
};

export async function listMesas(params?: {
  status?: string;
  setor?: string;
}): Promise<Mesa[]> {
  const qs = new URLSearchParams();
  if (params?.status) qs.set("status", params.status);
  if (params?.setor) qs.set("setor", params.setor);
  const q = qs.toString() ? `?${qs}` : "";
  const res = await fetch(`${apiBase()}/api/v1/mesas${q}`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(await parseError(res, "Não foi possível listar mesas."));
  return res.json();
}

export async function createMesa(body: MesaCreateBody): Promise<Mesa> {
  const res = await fetch(`${apiBase()}/api/v1/mesas`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await parseError(res, "Não criou a mesa."));
  return res.json();
}

export async function updateMesa(id: number, body: MesaUpdateBody): Promise<Mesa> {
  const res = await fetch(`${apiBase()}/api/v1/mesas/${id}`, {
    method: "PATCH",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await parseError(res, "Não atualizou a mesa."));
  return res.json();
}

export async function fetchMesaPorToken(token: string): Promise<MesaPublic> {
  const res = await fetch(`${apiBase()}/api/v1/mesas/por-token/${token}`);
  if (res.status === 404) throw new Error("nao_encontrada");
  if (!res.ok) throw new Error("falha");
  return res.json();
}

// ---------- Pedidos ----------

export type Pedido = {
  id: number;
  mesa_id: number;
  cardapio_item_id?: number | null;
  nome_item: string;
  quantidade: number;
  preco_centavos: number;
  modo: string;
  cliente_nome?: string | null;
  status: string;
  /** F1 — []/null = coletivo; ≥1 = posições cobradas */
  posicoes?: number[] | null;
  quitado?: boolean;
  fechamento_id?: number | null;
  created_at?: string | null;
};

export type PedidoCreateBody = {
  mesa_token: string;
  cardapio_item_id?: number | null;
  nome_item?: string | null;
  quantidade?: number;
  preco_centavos?: number | null;
  modo: "individual" | "coletivo";
  cliente_nome?: string | null;
  posicoes?: number[] | null;
  cliente_sessao_id?: number | null;
};

export async function createPedido(body: PedidoCreateBody): Promise<Pedido> {
  const res = await fetch(`${apiBase()}/api/v1/pedidos`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await parseError(res, "Não enviou o pedido."));
  return res.json();
}

/** Cliente QR — pedido público (sem Bearer). */
export async function createPedidoCliente(
  body: PedidoCreateBody,
  deviceToken?: string
): Promise<Pedido> {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(deviceToken ? { "X-Device-Token": deviceToken } : clienteSessionHeaders()),
  };
  const res = await fetch(`${apiBase()}/api/v1/pedidos`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = new Error(await parseError(res, "Ops, o pedido não saiu.")) as Error & {
      status?: number;
    };
    err.status = res.status;
    throw err;
  }
  return res.json();
}

export async function patchPedidoPosicoes(
  id: number,
  posicoes: number[]
): Promise<Pedido> {
  // TODO: endpoint F1 — PATCH /api/v1/pedidos/{id}/posicoes
  const res = await fetch(`${apiBase()}/api/v1/pedidos/${id}/posicoes`, {
    method: "PATCH",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ posicoes }),
  });
  if (!res.ok) throw new Error(await parseError(res, "Não reatribuiu posições."));
  return res.json();
}

// ---------- Conta / fechamento ----------

export type EscopoFechamento = "posicoes" | "itens" | "mesa";

export type FecharContaBody = {
  escopo: EscopoFechamento;
  posicoes?: number[] | null;
  pedido_ids?: number[] | null;
  aplicar_taxa?: boolean;
};

export type FechamentoOut = {
  ok?: boolean;
  fechamento_id?: number;
  subtotal_centavos?: number;
  taxa_centavos?: number;
  taxa_bps_aplicada?: number;
  total_centavos: number;
  mesa_saldo_aberto_centavos?: number;
  mesa_status?: string;
  status?: string;
  mensagem_conta?: string;
};

export type ContaMesa = {
  mesa_id: number;
  mesa_nome: string;
  status: string;
  total_centavos: number;
  saldo_aberto_centavos?: number;
  taxa_bps?: number;
  itens: Pedido[];
  por_modo?: Record<string, number>;
  por_cliente?: Record<string, number>;
  por_posicao?: Record<string, number>;
};

export async function fetchContaMesa(token: string): Promise<ContaMesa> {
  const res = await fetch(`${apiBase()}/api/v1/conta/mesa/${token}`);
  if (!res.ok) throw new Error(await parseError(res, "Não carregou a conta."));
  return res.json();
}

export async function fecharConta(
  token: string,
  body?: FecharContaBody
): Promise<FechamentoOut> {
  const res = await fetch(`${apiBase()}/api/v1/conta/mesa/${token}/fechar`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(await parseError(res, "Não fechou a conta."));
  return res.json();
}

export async function liberarMesa(token: string): Promise<{ ok: boolean }> {
  // TODO: endpoint F1 — POST /api/v1/conta/mesa/{token}/liberar
  const res = await fetch(`${apiBase()}/api/v1/conta/mesa/${token}/liberar`, {
    method: "POST",
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(await parseError(res, "Não liberou a mesa."));
  return res.json();
}

// ---------- Cliente QR / LGPD ----------

export type ClienteSessao = {
  id?: number;
  mesa_id: number;
  nome: string;
  celular_ult4?: string;
  posicoes?: number[];
  consent_texto_versao?: string;
  ativa?: boolean;
};

export type SessaoCreateBody = {
  nome: string;
  celular_e164: string;
  consent_aceito: boolean;
  consent_texto_versao: string;
  device_token: string;
  posicoes?: number[];
};

export async function criarSessaoCliente(
  mesaToken: string,
  body: SessaoCreateBody
): Promise<ClienteSessao> {
  // TODO: endpoint F1 — POST /api/v1/cliente/mesa/{token}/sessao
  const res = await fetch(
    `${apiBase()}/api/v1/cliente/mesa/${mesaToken}/sessao`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );
  if (!res.ok) throw new Error(await parseError(res, "Não criou a sessão."));
  return res.json();
}

export async function reentrarCliente(body: {
  celular_e164: string;
  device_token: string;
  mesa_token?: string;
}): Promise<ClienteSessao> {
  // TODO: endpoint F1 — POST /api/v1/cliente/reentrar
  const res = await fetch(`${apiBase()}/api/v1/cliente/reentrar`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await parseError(res, "Não reentrou na mesa."));
  return res.json();
}

export async function fetchMeusPedidos(mesaToken: string): Promise<Pedido[]> {
  // TODO: endpoint F1 — GET /api/v1/cliente/mesa/{token}/meus-pedidos
  const res = await fetch(
    `${apiBase()}/api/v1/cliente/mesa/${mesaToken}/meus-pedidos`,
    { headers: clienteSessionHeaders() }
  );
  if (!res.ok) throw new Error(await parseError(res, "Não carregou seus pedidos."));
  return res.json();
}

// ---------- Settings ----------

export type Settings = {
  nome_estabelecimento: string;
  mensagem_conta: string;
  /** F1 — default 1000 = 10% */
  taxa_servico_bps?: number;
  lgpd_texto_versao?: string;
  lgpd_texto?: string;
};

export type SettingsUpdate = {
  nome_estabelecimento?: string;
  mensagem_conta?: string;
  taxa_servico_bps?: number;
  lgpd_texto_versao?: string;
  lgpd_texto?: string;
};

export async function fetchSettings(): Promise<Settings> {
  const res = await fetch(`${apiBase()}/api/v1/settings`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(await parseError(res, "Não carregou settings."));
  return res.json();
}

export async function patchSettings(body: SettingsUpdate): Promise<Settings> {
  const res = await fetch(`${apiBase()}/api/v1/settings`, {
    method: "PATCH",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await parseError(res, "Não salvou settings."));
  return res.json();
}

// ---------- Solicitações (garçom → dono) ----------

export type SolicitacaoTipo = "cancelar_pedido" | "estorno" | "editar_pedido";
export type SolicitacaoStatus = "pending" | "approved" | "rejected";

export type SolicitacaoAcao = {
  id: number;
  tipo: SolicitacaoTipo;
  pedido_id?: number | null;
  payload?: Record<string, unknown>;
  status: SolicitacaoStatus;
  solicitante_id?: number;
  created_at?: string;
};

export async function criarSolicitacao(body: {
  tipo: SolicitacaoTipo;
  pedido_id?: number | null;
  payload?: Record<string, unknown>;
}): Promise<SolicitacaoAcao> {
  // TODO: endpoint F1 — POST /api/v1/solicitacoes
  const res = await fetch(`${apiBase()}/api/v1/solicitacoes`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await parseError(res, "Não criou a solicitação."));
  return res.json();
}

export async function listSolicitacoes(statusFiltro?: string): Promise<SolicitacaoAcao[]> {
  const qs = statusFiltro ? `?status=${encodeURIComponent(statusFiltro)}` : "";
  const res = await fetch(`${apiBase()}/api/v1/solicitacoes${qs}`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(await parseError(res, "Não listou solicitações."));
  return res.json();
}

export async function aprovarSolicitacao(id: number): Promise<SolicitacaoAcao> {
  const res = await fetch(`${apiBase()}/api/v1/solicitacoes/${id}/aprovar`, {
    method: "POST",
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(await parseError(res, "Não aprovou a solicitação."));
  return res.json();
}

export async function rejeitarSolicitacao(id: number): Promise<SolicitacaoAcao> {
  const res = await fetch(`${apiBase()}/api/v1/solicitacoes/${id}/rejeitar`, {
    method: "POST",
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(await parseError(res, "Não rejeitou a solicitação."));
  return res.json();
}

// ---------- Users (dono) ----------

export type UserOut = {
  id: number;
  usuario: string;
  papel: Papel | string;
  mesas_ids?: number[] | null;
  ativo: boolean;
};

export type UserCreateBody = {
  usuario: string;
  senha: string;
  papel: Papel | string;
  mesas_ids?: number[] | null;
  ativo?: boolean;
};

export type UserUpdateBody = {
  senha?: string;
  papel?: Papel | string;
  mesas_ids?: number[] | null;
  ativo?: boolean;
};

export async function listUsers(): Promise<UserOut[]> {
  const res = await fetch(`${apiBase()}/api/v1/users`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(await parseError(res, "Não listou usuários."));
  return res.json();
}

export async function createUser(body: UserCreateBody): Promise<UserOut> {
  const res = await fetch(`${apiBase()}/api/v1/users`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await parseError(res, "Não criou o usuário."));
  return res.json();
}

export async function patchUser(id: number, body: UserUpdateBody): Promise<UserOut> {
  const res = await fetch(`${apiBase()}/api/v1/users/${id}`, {
    method: "PATCH",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await parseError(res, "Não atualizou o usuário."));
  return res.json();
}

/** Parse "1,2,3" → number[]; vazio → null (todas as mesas). */
export function parseMesasIdsCsv(raw: string): number[] | null {
  const ids = raw
    .split(/[,\s]+/)
    .map((x) => Number(x.trim()))
    .filter((n) => Number.isInteger(n) && n >= 1);
  return ids.length ? ids : null;
}

// ---------- Transferências (F1.5) ----------

export type TransferenciaStatus = "pending" | "approved" | "rejected";

export type Transferencia = {
  id: number;
  mesa_origem_id: number;
  mesa_destino_id: number;
  pedido_ids: number[];
  posicoes_origem?: number[] | null;
  posicoes_destino?: number[] | null;
  status: TransferenciaStatus | string;
  solicitante_papel: string;
  aprovador_id?: number | null;
  created_at?: string | null;
};

export type TransferenciaCreateBody = {
  mesa_origem_id: number;
  mesa_destino_id: number;
  pedido_ids: number[];
  posicoes_origem?: number[] | null;
  posicoes_destino?: number[] | null;
  solicitante_papel?: "cliente" | "garcom";
};

export async function listTransferencias(
  statusFiltro?: string
): Promise<Transferencia[]> {
  const qs = statusFiltro ? `?status=${encodeURIComponent(statusFiltro)}` : "";
  const res = await fetch(`${apiBase()}/api/v1/transferencias${qs}`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(await parseError(res, "Não listou transferências."));
  return res.json();
}

export async function criarTransferencia(
  body: TransferenciaCreateBody
): Promise<Transferencia> {
  const res = await fetch(`${apiBase()}/api/v1/transferencias`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await parseError(res, "Não criou a transferência."));
  return res.json();
}

export async function aprovarTransferencia(id: number): Promise<Transferencia> {
  const res = await fetch(`${apiBase()}/api/v1/transferencias/${id}/aprovar`, {
    method: "POST",
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(await parseError(res, "Não aprovou a transferência."));
  return res.json();
}

export async function rejeitarTransferencia(id: number): Promise<Transferencia> {
  const res = await fetch(`${apiBase()}/api/v1/transferencias/${id}/rejeitar`, {
    method: "POST",
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(await parseError(res, "Não rejeitou a transferência."));
  return res.json();
}

export function lgpdConsentTexto(nomeEstabelecimento: string): string {
  return (
    `Ao continuar, você autoriza o ${nomeEstabelecimento} a tratar seu nome e celular ` +
    `para identificar você nesta mesa, reunir seu pedido e permitir que você volte à mesa aberta pelo celular, ` +
    `até o garçom confirmar o fechamento. Tratamento pela plataforma PedidoMesa (Tech42), como operadora. ` +
    `Não usamos seus dados para marketing. Você pode pedir exclusão ou correção pelo canal do estabelecimento.`
  );
}
