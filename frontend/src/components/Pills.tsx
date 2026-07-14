import type { Prioridade, StatusItem } from '../api/types';

const STATUS_COLORS: Record<string, string> = {
  Pendente: 'var(--status-pendente)',
  'Em Andamento': 'var(--status-andamento)',
  Bloqueada: 'var(--status-bloqueada)',
  'Concluída': 'var(--status-concluida)',
  'Não se aplica': '#5A5C78',
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

export function TipoPill({ tipo }: { tipo: string | null }) {
  const isAcao = tipo === 'Ação';
  const color = isAcao ? 'var(--accent-primary)' : 'var(--accent-secondary)';
  return (
    <span
      className="pill"
      style={{ backgroundColor: `${color}26`, color, border: `1px solid ${color}55` }}
    >
      {tipo || '—'}
    </span>
  );
}
