import { useState, FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import type {
  ClasseKozo,
  NovoItemPayload,
  PodeDelegar,
  Prioridade,
  StatusItem,
  TempoEstimado,
} from '../api/types';
import {
  CLASSE_KOZO_OPCOES,
  LEGENDA_CLASSE_KOZO,
  PODE_DELEGAR_OPCOES,
  PRIORIDADE_OPCOES,
  STATUS_ITEM_OPCOES,
  TEMPO_ESTIMADO_OPCOES,
} from '../api/types';
import ChecklistSubtarefas from './ChecklistSubtarefas';

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
  const [descricao, setDescricao] = useState('');
  const [responsavel, setResponsavel] = useState('');
  const [status, setStatus] = useState<StatusItem | ''>('Pendente');
  const [prioridade, setPrioridade] = useState<Prioridade | ''>('Média');
  const [prazo, setPrazo] = useState('');
  const [classeKozo, setClasseKozo] = useState<ClasseKozo | ''>('');
  const [tempoEstimado, setTempoEstimado] = useState<TempoEstimado | ''>('');

  // Detalhamento: fica recolhido por padrão para o cadastro rápido continuar
  // rápido — quem quer estruturar o plano de ação e a delegação abre.
  const [detalhesAbertos, setDetalhesAbertos] = useState(false);
  const [oQuePrecisaSerFeito, setOQuePrecisaSerFeito] = useState('');
  const [podeDelegar, setPodeDelegar] = useState<PodeDelegar | ''>('');
  const [delegarPara, setDelegarPara] = useState('');

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
      setClasseKozo('');
      setTempoEstimado('');
      setOQuePrecisaSerFeito('');
      setPodeDelegar('');
      setDelegarPara('');
      onSucesso?.();
    },
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!titulo.trim()) return;
    mutation.mutate({
      titulo: titulo.trim(),
      temaId: temaId || undefined,
      descricao: descricao || undefined,
      responsavel: responsavel || undefined,
      status: (status || undefined) as StatusItem | undefined,
      prioridade: (prioridade || undefined) as Prioridade | undefined,
      prazo: prazo || undefined,
      classeKozo: (classeKozo || undefined) as ClasseKozo | undefined,
      tempoEstimado: (tempoEstimado || undefined) as TempoEstimado | undefined,
      oQuePrecisaSerFeito: oQuePrecisaSerFeito || undefined,
      podeDelegar: (podeDelegar || undefined) as PodeDelegar | undefined,
      delegarPara: delegarPara || undefined,
    });
  }

  return (
    <form onSubmit={handleSubmit} className={`card flex flex-col gap-3 p-4 ${compacto ? '' : 'max-w-[84rem]'}`}>
      {/* Identificação: o que é e a que tema pertence. */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className={temaIdFixo ? 'sm:col-span-3' : 'sm:col-span-2'}>
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
      </div>

      {/* Classificação: os dois selects que definem como o item é tratado. */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
      </div>

      {/* Classificação KOZO: a natureza do item (que define em qual visão ele
          aparece) e o esforço estimado. */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-medium text-text-muted">Classe KOZO</label>
          <select
            className="input-base w-full"
            value={classeKozo}
            onChange={(e) => setClasseKozo(e.target.value as ClasseKozo | '')}
          >
            <option value="">Não classificado</option>
            {CLASSE_KOZO_OPCOES.map((op) => (
              <option key={op} value={op}>
                {op}
                {LEGENDA_CLASSE_KOZO[op] ? ` — ${LEGENDA_CLASSE_KOZO[op]}` : ''}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-text-muted">Tempo estimado</label>
          <select
            className="input-base w-full"
            value={tempoEstimado}
            onChange={(e) => setTempoEstimado(e.target.value as TempoEstimado | '')}
          >
            <option value="">Não estimado</option>
            {TEMPO_ESTIMADO_OPCOES.map((op) => (
              <option key={op} value={op}>
                {op}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Execução: quem toca e até quando. */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-medium text-text-muted">Responsável</label>
          <input
            className="input-base w-full"
            value={responsavel}
            onChange={(e) => setResponsavel(e.target.value)}
            placeholder="Nome do responsável"
          />
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
        <label className="mb-1 block text-xs font-medium text-text-muted">Descrição</label>
        <textarea
          className="input-base w-full"
          rows={3}
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
        />
      </div>

      <div className="rounded-lg bg-bg-elevated/40 p-3">
        <button
          type="button"
          onClick={() => setDetalhesAbertos((aberto) => !aberto)}
          aria-expanded={detalhesAbertos}
          className="flex w-full items-center justify-between text-left text-xs font-medium text-text-muted hover:text-text-primary"
        >
          <span>Detalhamento (plano de ação, delegação)</span>
          <span aria-hidden="true">{detalhesAbertos ? '▲' : '▼'}</span>
        </button>

        {detalhesAbertos && (
          <div className="mt-3 flex flex-col gap-3">
            <ChecklistSubtarefas valor={oQuePrecisaSerFeito} onChange={setOQuePrecisaSerFeito} />

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-text-muted">Posso delegar?</label>
                <select
                  className="input-base w-full"
                  value={podeDelegar}
                  onChange={(e) => setPodeDelegar(e.target.value as PodeDelegar | '')}
                >
                  <option value="">Não definido</option>
                  {PODE_DELEGAR_OPCOES.map((op) => (
                    <option key={op} value={op}>
                      {op}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-medium text-text-muted">Delegar para</label>
                <input
                  className="input-base w-full"
                  value={delegarPara}
                  onChange={(e) => setDelegarPara(e.target.value)}
                  placeholder="Nome de quem vai assumir"
                />
              </div>
            </div>
          </div>
        )}
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
