import type { ClasseKozo, Prioridade, StatusItem, TempoEstimado } from '../api/types';

const STATUS_COLORS: Record<string, string> = {
  Pendente: 'var(--status-pendente)',
  'Em Andamento': 'var(--status-andamento)',
  Bloqueada: 'var(--status-bloqueada)',
  'Concluída': 'var(--status-concluida)',
  'Não se aplica': '#5A5C78',
};

// Mesmas cores que as opções têm no Notion (azul/cinza/verde/laranja), para
// quem olha a database e o app reconhecer a classe pela cor nos dois lugares.
const CLASSE_KOZO_COLORS: Record<string, string> = {
  Projeto: 'var(--status-andamento)',
  Tarefa: 'var(--text-muted)',
  'Comunicação': 'var(--status-concluida)',
  'Híbrido (decompor)': '#E17055',
};

const PRIORIDADE_COLORS: Record<string, string> = {
  Alta: 'var(--status-bloqueada)',
  'Média': 'var(--status-pendente)',
  Baixa: 'var(--accent-secondary)',
};

export function StatusPill({ status }: { status: StatusItem | string | null }) {
  const color = (status && STATUS_COLORS[status]) || '#5A5C78';
  const isDark = status === 'Pendente';
  return (
    <span
      className="pill"
      style={{ backgroundColor: `${color}26`, color, border: `1px solid ${color}55` }}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: color, display: 'inline-block' }}
      />
      {status || 'Sem status'}
      {isDark && null}
    </span>
  );
}

export function PrioridadePill({ prioridade }: { prioridade: Prioridade | string | null }) {
  const color = (prioridade && PRIORIDADE_COLORS[prioridade]) || 'var(--text-muted)';
  return (
    <span
      className="pill"
      style={{ backgroundColor: `${color}26`, color, border: `1px solid ${color}55` }}
    >
      {prioridade || 'Sem prioridade'}
    </span>
  );
}

/** Pill da Classe KOZO (Projeto / Tarefa / Comunicação / Híbrido). */
export function ClasseKozoPill({ classeKozo }: { classeKozo: ClasseKozo | string | null }) {
  const color = (classeKozo && CLASSE_KOZO_COLORS[classeKozo]) || 'var(--text-muted)';
  return (
    <span
      className="pill"
      style={{ backgroundColor: `${color}26`, color, border: `1px solid ${color}55` }}
    >
      {classeKozo || 'Sem classe'}
    </span>
  );
}

/** Pill do tempo estimado (HH:MM), sempre com o relógio para não virar "um horário". */
export function TempoEstimadoPill({ tempoEstimado }: { tempoEstimado: TempoEstimado | string | null }) {
  if (!tempoEstimado) return <span className="text-text-muted">—</span>;
  const color = 'var(--accent-secondary)';
  return (
    <span
      className="pill"
      style={{ backgroundColor: `${color}26`, color, border: `1px solid ${color}55` }}
    >
      ⏱ {tempoEstimado}
    </span>
  );
}
