import { useState, FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import type { NovoItemPayload, Prioridade, StatusItem, TipoItem } from '../api/types';
import { PRIORIDADE_OPCOES, STATUS_ITEM_OPCOES, TIPO_OPCOES } from '../api/types';

interface ItemFormProps {
  temaIdFixo?: string;
  onSucesso?: () => void;
  compacto?: boolean;
}

export default function ItemForm({ temaIdFixo, onSucesso, compacto }: ItemFormProps) {
  const queryClient = useQueryClient();
  const { data: temas } = useQuery({ queryKey: ['temas'], queryFn: api.listarTemas });

  const [titulo, setTitulo] = useState('');
  const [temaId, setTemaId] = useState(temaIdFixo || '');
  const [tipo, setTipo] = useState<TipoItem | ''>('Ação');
  const [descricao, setDescricao] = useState('');
  const [responsavel, setResponsavel] = useState('');
  const [status, setStatus] = useState<StatusItem | ''>('Pendente');
  const [prioridade, setPrioridade] = useState<Prioridade | ''>('Média');
  const [prazo, setPrazo] = useState('');

  const mutation = useMutation({
    mutationFn: (payload: NovoItemPayload) => api.criarItem(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['itens'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-semana'] });
      queryClient.invalidateQueries({ queryKey: ['temas'] });
      setTitulo('');
      setDescricao('');
      setResponsavel('');
      setPrazo('');
      onSucesso?.();
    },
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!titulo.trim()) return;
    mutation.mutate({
      titulo: titulo.trim(),
      temaId: temaId || undefined,
      tipo: (tipo || undefined) as TipoItem | undefined,
      descricao: descricao || undefined,
      responsavel: responsavel || undefined,
      status: (status || undefined) as StatusItem | undefined,
      prioridade: (prioridade || undefined) as Prioridade | undefined,
      prazo: prazo || undefined,
    });
  }

  return (
    <form onSubmit={handleSubmit} className={`card flex flex-col gap-3 p-4 ${compacto ? '' : 'max-w-2xl'}`}>
      <div>
        <label className="mb-1 block text-xs font-medium text-text-muted">Título *</label>
        <input
          className="input-base w-full"
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          placeholder="Descreva a ação ou informação"
          required
        />
      </div>

      {!temaIdFixo && (
        <div>
          <label className="mb-1 block text-xs font-medium text-text-muted">Tema</label>
          <select className="input-base w-full" value={temaId} onChange={(e) => setTemaId(e.target.value)}>
            <option value="">Sem tema</option>
            {(temas ?? []).map((t) => (
              <option key={t.id} value={t.id}>
                {t.nome}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-text-muted">Tipo</label>
          <select className="input-base w-full" value={tipo} onChange={(e) => setTipo(e.target.value as TipoItem)}>
            {TIPO_OPCOES.map((op) => (
              <option key={op} value={op}>
                {op}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-text-muted">Prioridade</label>
          <select
            className="input-base w-full"
            value={prioridade}
            onChange={(e) => setPrioridade(e.target.value as Prioridade)}
          >
            {PRIORIDADE_OPCOES.map((op) => (
              <option key={op} value={op}>
                {op}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-text-muted">Status</label>
          <select
            className="input-base w-full"
            value={status}
            onChange={(e) => setStatus(e.target.value as StatusItem)}
          >
            {STATUS_ITEM_OPCOES.map((op) => (
              <option key={op} value={op}>
                {op}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-text-muted">Prazo</label>
          <input
            type="date"
            className="input-base w-full"
            value={prazo}
            onChange={(e) => setPrazo(e.target.value)}
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-text-muted">Responsável</label>
        <input
          className="input-base w-full"
          value={responsavel}
          onChange={(e) => setResponsavel(e.target.value)}
          placeholder="Nome do responsável"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-text-muted">Descrição</label>
        <textarea
          className="input-base w-full"
          rows={3}
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
        />
      </div>

      <button
        type="submit"
        disabled={mutation.isPending || !titulo.trim()}
        className="mt-1 self-start rounded-lg bg-accent-primary px-4 py-2 text-sm font-semibold text-white transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {mutation.isPending ? 'Salvando...' : 'Criar item'}
      </button>

      {mutation.isError && (
        <p className="text-xs text-status-bloqueada">{(mutation.error as Error).message}</p>
      )}
      {mutation.isSuccess && <p className="text-xs text-status-concluida">Item criado com sucesso.</p>}
    </form>
  );
}
