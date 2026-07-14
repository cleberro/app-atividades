export type StatusItem = 'Pendente' | 'Em Andamento' | 'Concluída' | 'Bloqueada' | 'Não se aplica';
export type Prioridade = 'Alta' | 'Média' | 'Baixa';
export type TipoItem = 'Ação' | 'Informação';
export type StatusTema = 'Ativo' | 'Pausado' | 'Concluído';
export type Origem = 'Ata Notion' | 'App';

export interface Tema {
  id: string;
  nome: string;
  categoria: string | null;
  descricao: string;
  status: StatusTema | null;
  focoDaSemana: boolean;
  prioridade: Prioridade | null;
  ordem: number | null;
  itensPendentes: number;
}

export interface Item {
  id: string;
  titulo: string;
  temaIds: string[];
  tipo: TipoItem | null;
  descricao: string;
  responsavel: string;
  status: StatusItem | null;
  prazo: string | null;
  dataReuniao: string | null;
  prioridade: Prioridade | null;
  priorizadoHoje: boolean;
  reuniaoOrigem: string;
  anotacoesDiarias: string;
  urlAta: string | null;
  origem: Origem | null;
  criadoEm: string | null;
}

export interface NovoItemPayload {
  titulo: string;
  temaId?: string;
  tipo?: TipoItem;
  descricao?: string;
  responsavel?: string;
  status?: StatusItem;
  prazo?: string;
  dataReuniao?: string;
  prioridade?: Prioridade;
  priorizadoHoje?: boolean;
  reuniaoOrigem?: string;
  anotacoesDiarias?: string;
  urlAta?: string;
}

export type AtualizarItemPayload = Partial<NovoItemPayload>;

export interface NovoTemaPayload {
  nome: string;
  categoria?: string;
  descricao?: string;
  status?: StatusTema;
  prioridade?: Prioridade;
  ordem?: number;
}

export interface KanbanColunas {
  [status: string]: Item[];
}

export interface DashboardSemana {
  temasEmFoco: Tema[];
  itensHoje: Item[];
}

export const STATUS_ITEM_OPCOES: StatusItem[] = [
  'Pendente',
  'Em Andamento',
  'Concluída',
  'Bloqueada',
  'Não se aplica',
];

export const PRIORIDADE_OPCOES: Prioridade[] = ['Alta', 'Média', 'Baixa'];
export const TIPO_OPCOES: TipoItem[] = ['Ação', 'Informação'];
export const STATUS_TEMA_OPCOES: StatusTema[] = ['Ativo', 'Pausado', 'Concluído'];
