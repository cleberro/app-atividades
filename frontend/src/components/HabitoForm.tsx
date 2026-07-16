import { useState, FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import type { NovoHabitoPayload, DiaSemana } from '../api/types';
import { DIAS_SEMANA_OPCOES } from '../api/types';

interface HabitoFormProps {
  onSucesso?: () => void;
  compacto?: boolean;
}

export default function HabitoForm({ onSucesso, compacto }: HabitoFormProps) {
  const queryClient = useQueryClient();

  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [diasSemana, setDiasSemana] = useState<DiaSemana[]>([]);
  const [horario, setHorario] = useState('');

  const mutation = useMutation({
    mutationFn: (payload: NovoHabitoPayload) => api.criarHabito(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habitos'] });
      setTitulo('');
      setDescricao('');
      setDiasSemana([]);
      setHorario('');
      onSucesso?.();
    },
  });

  function alternarDia(dia: DiaSemana) {
    setDiasSemana((atual) => (atual.includes(dia) ? atual.filter((d) => d !== dia) : [...atual, dia]));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!titulo.trim()) return;
    mutation.mutate({
      titulo: titulo.trim(),
      descricao: descricao || undefined,
      diasSemana: diasSemana.length ? diasSemana : undefined,
      horario: horario || undefined,
    });
  }

  return (
    <form onSubmit={handleSubmit} className={`card flex flex-col gap-3 p-4 ${compacto ? '' : 'max-w-2xl'}`}>
      <div>
        <label className="mb-1 block text-xs font-medium text-text-muted">Título do hábito *</label>
        <input
          className="input-base w-full"
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          placeholder="Ex.: Beber água"
          required
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-text-muted">Descrição</label>
        <textarea
          className="input-base w-full"
          rows={2}
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          placeholder="Detalhes opcionais sobre o hábito"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-text-muted">Dias da semana</label>
        <div className="flex flex-wrap gap-2">
          {DIAS_SEMANA_OPCOES.map((dia) => {
            const ativo = diasSemana.includes(dia);
            return (
              <button
                type="button"
                key={dia}
                aria-pressed={ativo}
                onClick={() => alternarDia(dia)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  ativo
                    ? 'bg-accent-primary text-white'
                    : 'bg-bg-elevated text-text-muted hover:text-text-primary'
                }`}
              >
                {dia.slice(0, 3)}
              </button>
            );
          })}
        </div>
      </div>

      <div className="max-w-[160px]">
        <label className="mb-1 block text-xs font-medium text-text-muted">Horário</label>
        <input
          type="time"
          className="input-base w-full"
          value={horario}
          onChange={(e) => setHorario(e.target.value)}
        />
      </div>

      <button
        type="submit"
        disabled={mutation.isPending || !titulo.trim()}
        className="mt-1 self-start rounded-lg bg-accent-primary px-4 py-2 text-sm font-semibold text-white transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {mutation.isPending ? 'Salvando...' : 'Criar hábito'}
      </button>

      {mutation.isError && (
        <p className="text-xs text-status-bloqueada">{(mutation.error as Error).message}</p>
      )}
      {mutation.isSuccess && <p className="text-xs text-status-concluida">Hábito criado com sucesso.</p>}
    </form>
  );
}
