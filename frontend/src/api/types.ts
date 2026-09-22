export type StatusItem = 'Pendente' | 'Em Andamento' | 'Concluída' | 'Bloqueada' | 'Não se aplica';
export type Prioridade = 'Alta' | 'Média' | 'Baixa';
export type StatusTema = 'Ativo' | 'Pausado' | 'Concluído';
export type PodeDelegar = 'Sim' | 'Não' | 'A avaliar';
/**
 * Classificação KOZO do item — é ela que alimenta as visões Núcleo
 * (Projetos), Fluxo (Tarefas) e Interface (Comunicação). "Híbrido" é o item
 * que ainda mistura mais de uma natureza e precisa ser decomposto: por isso
 * ele não tem visão própria, e sim um aviso na tela de Visões.
 */
export type ClasseKozo = 'Projeto' | 'Tarefa' | 'Comunicação' | 'Híbrido (decompor)';
/** Faixas fixas de esforço (HH:MM) — é um Select no Notion, não um número. */
export type TempoEstimado = '00:15' | '00:30' | '01:00' | '02:00' | '03:00' | '04:00';

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
  descricao: string;
  responsavel: string;
  status: StatusItem | null;
  prazo: string | null;
  prioridade: Prioridade | null;
  priorizadoHoje: boolean;
  anotacoesDiarias: string;
  urlAta: string | null;
  criadoEm: string | null;
  ordemPriorizadoHoje: number | null;
  dataOrdemPriorizado: string | null;
  whatsappContatoIds: string[];
  emailContatoIds: string[];
  /** Plano de ação em linhas "[ ] tarefa" / "[x] tarefa" (ver utils/subtarefas.ts). */
  oQuePrecisaSerFeito: string;
  podeDelegar: PodeDelegar | null;
  delegarPara: string;
  classeKozo: ClasseKozo | null;
  tempoEstimado: TempoEstimado | null;
}

export interface NovoItemPayload {
  titulo: string;
  temaId?: string;
  descricao?: string;
  responsavel?: string;
  status?: StatusItem;
  prazo?: string;
  prioridade?: Prioridade;
  priorizadoHoje?: boolean;
  anotacoesDiarias?: string;
  urlAta?: string;
  oQuePrecisaSerFeito?: string;
  podeDelegar?: PodeDelegar | '';
  delegarPara?: string;
  classeKozo?: ClasseKozo | '';
  tempoEstimado?: TempoEstimado | '';
}

export type AtualizarItemPayload = Partial<NovoItemPayload> & {
  ordemPriorizadoHoje?: number | null;
  dataOrdemPriorizado?: string | null;
  whatsappContatoIds?: string[];
  emailContatoIds?: string[];
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

export interface ContatoWhatsapp {
  id: string;
  nome: string;
  telefone: string;
  apiKeyCallMeBot: string;
  ativo: boolean;
}

export interface NovoContatoWhatsappPayload {
  nome: string;
  telefone: string;
  apiKeyCallMeBot: string;
  ativo?: boolean;
}

export interface EnvioWhatsappResultado {
  contatoId: string;
  nome: string;
  enviado: boolean;
  itens?: number;
  motivo?: string;
}

export interface ResultadoEnvioWhatsapp {
  tema?: string | null;
  data?: string;
  contatosNotificados: number;
  envios: EnvioWhatsappResultado[];
}

export interface ContatoEmail {
  id: string;
  nome: string;
  email: string;
  ativo: boolean;
}

export interface NovoContatoEmailPayload {
  nome: string;
  email: string;
  ativo?: boolean;
}

export interface EnvioEmailResultado {
  contatoId: string;
  nome: string;
  enviado: boolean;
  itens?: number;
  motivo?: string;
}

export interface ResultadoEnvioEmail {
  tema?: string | null;
  contatosNotificados: number;
  envios: EnvioEmailResultado[];
}

export const STATUS_ITEM_OPCOES: StatusItem[] = [
  'Pendente',
  'Em Andamento',
  'Concluída',
  'Bloqueada',
  'Não se aplica',
];

export const PRIORIDADE_OPCOES: Prioridade[] = ['Alta', 'Média', 'Baixa'];
export const PODE_DELEGAR_OPCOES: PodeDelegar[] = ['Sim', 'Não', 'A avaliar'];
export const CLASSE_KOZO_OPCOES: ClasseKozo[] = [
  'Projeto',
  'Tarefa',
  'Comunicação',
  'Híbrido (decompor)',
];
/**
 * O que cada classe KOZO significa na prática — usado como legenda nos
 * selects de Classe KOZO e como subtítulo das abas da tela de Visões.
 */
export const LEGENDA_CLASSE_KOZO: Record<ClasseKozo, string> = {
  Projeto: 'Núcleo',
  Tarefa: 'Fluxo',
  'Comunicação': 'Interface',
  'Híbrido (decompor)': 'precisa ser quebrado em itens menores',
};
export const TEMPO_ESTIMADO_OPCOES: TempoEstimado[] = [
  '00:15',
  '00:30',
  '01:00',
  '02:00',
  '03:00',
  '04:00',
];
export const STATUS_TEMA_OPCOES: StatusTema[] = ['Ativo', 'Pausado', 'Concluído'];
