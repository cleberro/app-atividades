import { useState, FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import type { NovaRotinaPayload, Rotina, TipoRecorrencia } from '../api/types';
import { TIPO_RECORRENCIA_OPCOES } from '../api/types';

interface RotinaFormProps {
  rotinaEditando?: Rotina;
  onSucesso?: () => void;
  compacto?: boolean;
}

/**
 * Formulário de criação/edição de uma Rotina. O tempo total é digitado
 * como horas + minutos (mais natural para o usuário) e combinado num único
 * valor em minutos antes de enviar ao backend.
 */
export default function RotinaForm({ rotinaEditando, onSucesso, compacto }: RotinaFormProps) {
  const queryClient = useQueryClient();
  const editando = !!rotinaEditando;

  const [nome, setNome] = useState(rotinaEditando?.nome ?? '');
  const [tipoRecorrencia, setTipoRecorrencia] = useState<TipoRecorrencia>(
    rotinaEditando?.tipoRecorrencia ?? 'Diária'
  );
  const [horas, setHoras] = useState(
    rotinaEditando ? String(Math.floor(rotinaEditando.tempoTotal / 60) || '') : ''
  );
  const [minutosExtra, setMinutosExtra] = useState(
    rotinaEditando ? String(rotinaEditando.tempoTotal % 60 || '') : ''
  );

  const mutation = useMutation({
    mutationFn: (payload: NovaRotinaPayload) =>
      editando ? api.atualizarRotina(rotinaEditando!.id, payload) : api.criarRotina(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rotinas'] });
      if (!editando) {
        setNome('');
        setTipoRecorrencia('Diária');
        setHoras('');
        setMinutosExtra('');
      }
      onSucesso?.();
    },
  });

  const tempoTotal = (Number(horas) || 0) * 60 + (Number(minutosExtra) || 0);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!nome.trim() || tempoTotal <= 0) return;
    mutation.mutate({ nome: nome.trim(), tipoRecorrencia, tempoTotal });
  }

  return (
    <form onSubmit={handleSubmit} className={`card flex flex-col gap-3 p-4 ${compacto ? '' : 'max-w-2xl'}`}>
      <div>
        <label className="mb-1 block text-xs font-medium text-text-muted">Nome da rotina *</label>
        <input
          className="input-base w-full"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Ex.: Estudar inglês"
          required
        />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-text-muted">Recorrência</label>
          <select
            className="input-base w-full"
            value={tipoRecorrencia}
            onChange={(e) => setTipoRecorrencia(e.target.value as TipoRecorrencia)}
          >
            {TIPO_RECORRENCIA_OPCOES.map((op) => (
              <option key={op} value={op}>
                {op}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-text-muted">Tempo total — horas</label>
          <input
            type="number"
            min={0}
            className="input-base w-full"
            value={horas}
            onChange={(e) => setHoras(e.target.value)}
            placeholder="0"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-text-muted">e minutos</label>
          <input
            type="number"
            min={0}
            max={59}
            className="input-base w-full"
            value={minutosExtra}
            onChange={(e) => setMinutosExtra(e.target.value)}
            placeholder="0"
          />
        </div>
      </div>
      <p className="text-xs text-text-muted">
        Tempo total por período: <strong>{tempoTotal} min</strong>
        {tipoRecorrencia === 'Diária' && ' por dia'}
        {tipoRecorrencia === 'Semanal' && ' por semana (segunda a domingo)'}
        {tipoRecorrencia === 'Mensal' && ' por mês'}
      </p>

      <button
        type="submit"
        disabled={mutation.isPending || !nome.trim() || tempoTotal <= 0}
        className="mt-1 self-start rounded-lg bg-accent-primary px-4 py-2 text-sm font-semibold text-white transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {mutation.isPending ? 'Salvando...' : editando ? 'Salvar alterações' : 'Criar rotina'}
      </button>

      {mutation.isError && (
        <p className="text-xs text-status-bloqueada">{(mutation.error as Error).message}</p>
      )}
      {mutation.isSuccess && (
        <p className="text-xs text-status-concluida">
          {editando ? 'Rotina atualizada com sucesso.' : 'Rotina criada com sucesso.'}
        </p>
      )}
    </form>
  );
}
