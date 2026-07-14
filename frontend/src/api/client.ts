import type {
  Tema,
  Item,
  NovoItemPayload,
  AtualizarItemPayload,
  NovoTemaPayload,
  KanbanColunas,
  DashboardSemana,
} from './types';

// Em dev local, aponta para o backend na porta 4000 por padrão. Em produção
// (build via `vite build`), sem VITE_API_URL definido, usa caminho relativo
// (mesma origem) — é o caso do deploy único na Vercel, onde o frontend e o
// backend (função serverless em /api) ficam sob o mesmo domínio.
const API_URL = import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? 'http://localhost:4000' : '');

class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    let message = `Erro ${response.status} ao chamar ${path}`;
    try {
      const body = await response.json();
      if (body?.error) message = body.error;
    } catch {
      // resposta sem corpo JSON, mantém mensagem padrão
    }
    throw new ApiError(message, response.status);
  }

  if (response.status === 204) return undefined as unknown as T;
  return response.json() as Promise<T>;
}

function buildQuery(params: Record<string, string | undefined>): string {
  const usp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) usp.set(key, value);
  }
  const qs = usp.toString();
  return qs ? `?${qs}` : '';
}

export const api = {
  // Temas
  listarTemas: () => request<Tema[]>('/api/temas'),
  criarTema: (dados: NovoTemaPayload) =>
    request<Tema>('/api/temas', { method: 'POST', body: JSON.stringify(dados) }),
  alternarFocoSemana: (id: string, focoDaSemana: boolean) =>
    request<Tema>(`/api/temas/${id}/foco`, {
      method: 'PATCH',
      body: JSON.stringify({ focoDaSemana }),
    }),
  excluirTema: (id: string) => request<void>(`/api/temas/${id}`, { method: 'DELETE' }),

  // Itens
  listarItens: (filtros: {
    tema?: string;
    status?: string;
    tipo?: string;
    prioridade?: string;
    q?: string;
  } = {}) => request<Item[]>(`/api/itens${buildQuery(filtros)}`),
  criarItem: (dados: NovoItemPayload) =>
    request<Item>('/api/itens', { method: 'POST', body: JSON.stringify(dados) }),
  atualizarItem: (id: string, dados: AtualizarItemPayload) =>
    request<Item>(`/api/itens/${id}`, { method: 'PATCH', body: JSON.stringify(dados) }),
  excluirItem: (id: string) => request<void>(`/api/itens/${id}`, { method: 'DELETE' }),
  alternarPriorizadoHoje: (id: string, priorizadoHoje: boolean) =>
    request<Item>(`/api/itens/${id}/priorizar-hoje`, {
      method: 'PATCH',
      body: JSON.stringify({ priorizadoHoje }),
    }),
  kanban: () => request<KanbanColunas>('/api/itens/kanban'),

  // Dashboard
  dashboardSemana: () => request<DashboardSemana>('/api/dashboard/semana'),
};

export { ApiError };
