import { useMemo, useState, FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import type { NovoTemaPayload, Prioridade, StatusTema } from '../api/types';
import { PRIORIDADE_OPCOES, STATUS_TEMA_OPCOES } from '../api/types';

interface TemaFormProps {
  onSucesso?: () => void;
  compacto?: boolean;
}

/**
 * Formulário de criação manual de um novo Tema. Categoria é um campo livre
 * (com sugestões das categorias já existentes) porque o Notion cria a opção
 * de Select automaticamente quando recebe um valor novo — não é preciso
 * alterar o schema da base para adicionar uma categoria nova.
 */
export default function TemaForm({ onSucesso, compacto }: TemaFormProps) {
  const queryClient = useQueryClient();
  const { data: temas } = useQuery({ queryKey: ['temas'], queryFn: api.listarTemas });

  const [nome, setNome] = useState('');
  const [categoria, setCategoria] = useState('');
  const [descricao, setDescricao] = useState('');
  const [status, setStatus] = useState<StatusTema>('Ativo');
  const [prioridade, setPrioridade] = useState<Prioridade>('Média');
  const [ordem, setOrdem] = useState('');

  const categoriasExistentes = useMemo(() => {
    const set = new Set<string>();
    (temas ?? []).forEach((t) => t.categoria && set.add(t.categoria));
    return Array.from(set).sort();
  }, [temas]);

  const mutation = useMutation({
    mutationFn: (payload: NovoTemaPayload) => api.criarTema(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['temas'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-semana'] });
      setNome('');
      setCategoria('');
      setDescricao('');
      setStatus('Ativo');
      setPrioridade('Média');
      setOrdem('');
      onSucesso?.();
    },
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!nome.trim()) return;
    mutation.mutate({
      nome: nome.trim(),
      categoria: categoria.trim() || undefined,
      descricao: descricao || undefined,
      status,
      prioridade,
      ordem: ordem ? Number(ordem) : undefined,
    });
  }

  return (
    <form onSubmit={handleSubmit} className={`card flex flex-col gap-3 p-4 ${compacto ? '' : 'max-w-2xl'}`}>
      <div>
        <label className="mb-1 block text-xs font-medium text-text-muted">Nome do tema *</label>
        <input
          className="input-base w-full"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Ex.: Segurança da Informação"
          required
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-text-muted">Categoria</label>
        <input
          className="input-base w-full"
          list="categorias-existentes"
          value={categoria}
          onChange={(e) => setCategoria(e.target.value)}
          placeholder="Reutilize uma categoria existente ou digite uma nova"
        />
        <datalist id="categorias-existentes">
          {categoriasExistentes.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-text-muted">Status</label>
          <select
            className="input-base w-full"
            value={status}
            onChange={(e) => setStatus(e.target.value as StatusTema)}
          >
            {STATUS_TEMA_OPCOES.map((op) => (
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

      <div>
        <label className="mb-1 block text-xs font-medium text-text-muted">Descrição</label>
        <textarea
          className="input-base w-full"
          rows={3}
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          placeholder="Escopo do tema — o que ele cobre"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-text-muted">
          Ordem <span className="font-normal normal-case text-text-muted/70">(opcional — em branco vai para o final da lista)</span>
        </label>
        <input
          type="number"
          className="input-base w-full"
          value={ordem}
          onChange={(e) => setOrdem(e.target.value)}
          placeholder="Automático"
        />
      </div>

      <button
        type="submit"
        disabled={mutation.isPending || !nome.trim()}
        className="mt-1 self-start rounded-lg bg-accent-primary px-4 py-2 text-sm font-semibold text-white transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {mutation.isPending ? 'Criando...' : 'Criar tema'}
      </button>

      {mutation.isError && (
        <p className="text-xs text-status-bloqueada">{(mutation.error as Error).message}</p>
      )}
      {mutation.isSuccess && <p className="text-xs text-status-concluida">Tema criado com sucesso.</p>}
    </form>
  );
}
