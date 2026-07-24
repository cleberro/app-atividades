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
  ordemPriorizadoHoje: number | null;
  dataOrdemPriorizado: string | null;
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

export type AtualizarItemPayload = Partial<NovoItemPayload> & {
  ordemPriorizadoHoje?: number | null;
  dataOrdemPriorizado?: string | null;
};

export interface NovoTemaPayload {
  nome: string;
  categoria?: string;
  descricao?: string;
  status?: StatusTema;
  prioridade?: Prioridade;
  ordem?: number;
}

export type AtualizarTemaPayload = Partial<NovoTemaPayload>;

export interface KanbanColunas {
  [status: string]: Item[];
}

export interface DashboardSemana {
  temasEmFoco: Tema[];
  itensHoje: Item[];
}

export type DiaSemana =
  | 'Segunda'
  | 'Terça'
  | 'Quarta'
  | 'Quinta'
  | 'Sexta'
  | 'Sábado'
  | 'Domingo';

export interface Habito {
  id: string;
  titulo: string;
  descricao: string;
  diasSemana: DiaSemana[];
  horario: string | null;
  ativo: boolean;
}

export interface HabitoHoje extends Habito {
  concluidoHoje: boolean;
}

export interface NovoHabitoPayload {
  titulo: string;
  descricao?: string;
  diasSemana?: DiaSemana[];
  horario?: string;
  ativo?: boolean;
}

export type AtualizarHabitoPayload = Partial<NovoHabitoPayload>;

export const DIAS_SEMANA_OPCOES: DiaSemana[] = [
  'Segunda',
  'Terça',
  'Quarta',
  'Quinta',
  'Sexta',
  'Sábado',
  'Domingo',
];

export type TipoRecorrencia = 'Diária' | 'Semanal' | 'Mensal';

export const TIPO_RECORRENCIA_OPCOES: TipoRecorrencia[] = ['Diária', 'Semanal', 'Mensal'];

export interface Rotina {
  id: string;
  nome: string;
  tipoRecorrencia: TipoRecorrencia;
  tempoTotal: number;
  ativo: boolean;
}

export interface RotinaComProgresso extends Rotina {
  periodoInicio: string;
  periodoFim: string;
  tempoRealizado: number;
  atingiuTotal: boolean;
}

export interface NovaRotinaPayload {
  nome: string;
  tipoRecorrencia: TipoRecorrencia;
  tempoTotal: number;
  ativo?: boolean;
}

export type AtualizarRotinaPayload = Partial<NovaRotinaPayload>;

export interface ApontamentoRotina {
  id: string;
  rotinaId: string | null;
  data: string;
  minutos: number;
  observacao: string;
}

export interface NovoApontamentoPayload {
  data: string;
  minutos: number;
  observacao?: string;
}

export interface ResultadoApontamento {
  apontamento: ApontamentoRotina;
  tempoRealizado: number;
  tempoTotal: number;
  atingiuTotal: boolean;
}

export interface Destinatario {
  id: string;
  email: string;
  ativo: boolean;
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
