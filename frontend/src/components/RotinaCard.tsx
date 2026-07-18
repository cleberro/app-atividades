import { useState, FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import type { RotinaComProgresso } from '../api/types';
import { formatarMinutos } from '../utils/tempo';

const COR_RECORRENCIA: Record<string, string> = {
  Diária: 'var(--accent-secondary)',
  Semanal: 'var(--status-pendente)',
  Mensal: 'var(--status-andamento)',
};

function ApontarTempoForm({
  rotina,
  dataHoje,
  onFechar,
}: {
  rotina: RotinaComProgresso;
  dataHoje: string;
  onFechar: () => void;
}) {
  const queryClient = useQueryClient();
  const [minutos, setMinutos] = useState('');
  const [observacao, setObservacao] = useState('');

  const mutation = useMutation({
    mutationFn: () => api.criarApontamento(rotina.id, { data: dataHoje, minutos: Number(minutos), observacao }),
    onSuccess: (resultado) => {
      queryClient.invalidateQueries({ queryKey: ['rotinas'] });
      setMinutos('');
      setObservacao('');
      if (resultado.atingiuTotal) {
        window.alert(
          `Você atingiu o tempo total (${formatarMinutos(resultado.tempoTotal)}) da rotina "${rotina.nome}" neste período. Não será possível registrar mais tempo até o próximo período.`
        );
      }
      onFechar();
    },
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!(Number(minutos) > 0)) return;
    mutation.mutate();
  }

  return (
    <form onSubmit={handleSubmit} className="mt-2 flex flex-col gap-2 rounded-lg bg-bg-elevated p-3">
      <div className="flex items-center gap-2">
        <input
          type="number"
          min={1}
          autoFocus
          className="input-base w-24"
          placeholder="min"
          value={minutos}
          onChange={(e) => setMinutos(e.target.value)}
        />
        <input
          className="input-base flex-1"
          placeholder="Observação (opcional)"
          value={observacao}
          onChange={(e) => setObservacao(e.target.value)}
        />
      </div>
      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={mutation.isPending || !(Number(minutos) > 0)}
          className="rounded-lg bg-accent-primary px-3 py-1.5 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {mutation.isPending ? 'Salvando...' : 'Registrar'}
        </button>
        <button
          type="button"
          onClick={onFechar}
          className="rounded-lg px-3 py-1.5 text-xs font-medium text-text-muted hover:text-text-primary"
        >
          Cancelar
        </button>
      </div>
      {mutation.isError && (
        <p className="text-xs text-status-bloqueada">{(mutation.error as Error).message}</p>
      )}
    </form>
  );
}

interface CardRotinaProps {
  rotina: RotinaComProgresso;
  dataHoje: string;
  /** Quando omitido, o card não mostra os botões Editar/Excluir (uso na tela Hoje). */
  onEditar?: () => void;
}

export default function CardRotina({ rotina, dataHoje, onEditar }: CardRotinaProps) {
  const queryClient = useQueryClient();
  const [apontando, setApontando] = useState(false);

  const excluirRotina = useMutation({
    mutationFn: () => api.excluirRotina(rotina.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['rotinas'] }),
    onError: (err: Error) => window.alert(err.message),
  });

  function confirmarExclusao() {
    if (window.confirm(`Excluir a rotina "${rotina.nome}"? Ela será movida para a lixeira do Notion.`)) {
      excluirRotina.mutate();
    }
  }

  const percentual = rotina.tempoTotal > 0 ? Math.min(100, (rotina.tempoRealizado / rotina.tempoTotal) * 100) : 0;
  const cor = COR_RECORRENCIA[rotina.tipoRecorrencia] || 'var(--accent-primary)';

  return (
    <div className={`card flex flex-col gap-3 p-4 ${rotina.ativo ? '' : 'opacity-60'}`}>
      <div className="flex items-start justify-between gap-2">
        <span className="font-semibold">{rotina.nome}</span>
        {onEditar && (
          <div className="flex shrink-0 items-center gap-2">
            <button
              onClick={onEditar}
              aria-label={`Editar rotina ${rotina.nome}`}
              className="rounded-lg px-2 py-1 text-xs font-medium text-text-muted hover:bg-bg-elevated hover:text-text-primary"
            >
              Editar
            </button>
            <button
              onClick={confirmarExclusao}
              disabled={excluirRotina.isPending}
              aria-label={`Excluir rotina ${rotina.nome}`}
              className="rounded-lg px-2 py-1 text-xs font-medium text-status-bloqueada hover:bg-status-bloqueada/15 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Excluir
            </button>
          </div>
        )}
      </div>

      <span className="pill w-fit" style={{ backgroundColor: `${cor}26`, color: cor }}>
        {rotina.tipoRecorrencia}
      </span>

      <div>
        <div className="mb-1 flex items-center justify-between text-xs text-text-muted">
          <span>
            {formatarMinutos(rotina.tempoRealizado)} de {formatarMinutos(rotina.tempoTotal)}
          </span>
          <span>{Math.round(percentual)}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-bg-elevated">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${percentual}%`,
              backgroundColor: rotina.atingiuTotal ? 'var(--status-concluida)' : cor,
            }}
          />
        </div>
      </div>

      {rotina.atingiuTotal ? (
        <p className="rounded-lg bg-status-concluida/15 px-3 py-2 text-xs font-medium text-status-concluida">
          Tempo total do período já foi atingido — novos apontamentos liberam no próximo período.
        </p>
      ) : apontando ? (
        <ApontarTempoForm rotina={rotina} dataHoje={dataHoje} onFechar={() => setApontando(false)} />
      ) : (
        <button
          onClick={() => setApontando(true)}
          className="self-start rounded-lg bg-bg-elevated px-3 py-1.5 text-xs font-semibold text-text-primary hover:bg-accent-primary hover:text-white"
        >
          + Apontar tempo
        </button>
      )}
    </div>
  );
}
