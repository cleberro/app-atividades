import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { PrioridadePill, StatusPill, TipoPill } from './Pills';
import type { Item, Prioridade, StatusItem, TipoItem } from '../api/types';
import { PRIORIDADE_OPCOES, STATUS_ITEM_OPCOES, TIPO_OPCOES } from '../api/types';

interface ItemDetailModalProps {
  item: Item;
  onClose: () => void;
}

/**
 * Modal de detalhe de um item (Ação/Informação), aberto ao clicar em
 * qualquer item nas visões Tabela, Kanban, Cards de Tema ou tela Hoje.
 * Mostra todos os campos e permite editar, incluindo o toggle de
 * "Priorizar para hoje" (motor da priorização diária).
 */
export default function ItemDetailModal({ item, onClose }: ItemDetailModalProps) {
  const queryClient = useQueryClient();
  const { data: temas } = useQuery({ queryKey: ['temas'], queryFn: api.listarTemas });

  const [titulo, setTitulo] = useState(item.titulo);
  const [temaId, setTemaId] = useState(item.temaIds[0] || '');
  const [tipo, setTipo] = useState<TipoItem | ''>(item.tipo || '');
  const [descricao, setDescricao] = useState(item.descricao);
  const [responsavel, setResponsavel] = useState(item.responsavel);
  const [status, setStatus] = useState<StatusItem | ''>(item.status || '');
  const [prioridade, setPrioridade] = useState<Prioridade | ''>(item.prioridade || '');
  const [prazo, setPrazo] = useState(item.prazo || '');
  const [priorizadoHoje, setPriorizadoHoje] = useState(item.priorizadoHoje);
  const [anotacoes, setAnotacoes] = useState(item.anotacoesDiarias || '');
  const [notaNova, setNotaNova] = useState('');

  // Reseta o formulário sempre que um item diferente é aberto no modal.
  useEffect(() => {
    setTitulo(item.titulo);
    setTemaId(item.temaIds[0] || '');
    setTipo(item.tipo || '');
    setDescricao(item.descricao);
    setResponsavel(item.responsavel);
    setStatus(item.status || '');
    setPrioridade(item.prioridade || '');
    setPrazo(item.prazo || '');
    setPriorizadoHoje(item.priorizadoHoje);
    setAnotacoes(item.anotacoesDiarias || '');
    setNotaNova('');
  }, [item.id]);

  useEffect(() => {
    function onEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [onClose]);

  function invalidarTudo() {
    queryClient.invalidateQueries({ queryKey: ['itens'] });
    queryClient.invalidateQueries({ queryKey: ['kanban'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard-semana'] });
    queryClient.invalidateQueries({ queryKey: ['temas'] });
  }

  const salvar = useMutation({
    mutationFn: () =>
      api.atualizarItem(item.id, {
        titulo,
        temaId: temaId || undefined,
        tipo: (tipo || undefined) as TipoItem | undefined,
        descricao,
        responsavel,
        status: (status || undefined) as StatusItem | undefined,
        prioridade: (prioridade || undefined) as Prioridade | undefined,
        prazo: prazo || undefined,
      }),
    onSuccess: invalidarTudo,
  });

  const togglePriorizado = useMutation({
    mutationFn: (valor: boolean) => api.alternarPriorizadoHoje(item.id, valor),
    onSuccess: (_data, valor) => {
      setPriorizadoHoje(valor);
      invalidarTudo();
    },
  });

  const adicionarNota = useMutation({
    mutationFn: (conteudo: string) => api.atualizarItem(item.id, { anotacoesDiarias: conteudo }),
    onSuccess: (_data, conteudo) => {
      setAnotacoes(conteudo);
      invalidarTudo();
    },
  });

  function handleAdicionarNota() {
    const texto = notaNova.trim();
    if (!texto) return;
    const carimbo = new Date().toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
    const entrada = `[${carimbo}] ${texto}`;
    const novoConteudo = anotacoes ? `${entrada}\n\n${anotacoes}` : entrada;
    adicionarNota.mutate(novoConteudo);
    setNotaNova('');
  }

  const excluir = useMutation({
    mutationFn: () => api.excluirItem(item.id),
    onSuccess: () => {
      invalidarTudo();
      onClose();
    },
  });

  function confirmarExclusao() {
    if (window.confirm(`Excluir o item "${item.titulo}"? Ele será movido para a lixeira do Notion.`)) {
      excluir.mutate();
    }
  }

  const temaAtual = (temas ?? []).find((t) => t.id === (item.temaIds[0] || temaId));

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 pt-10 backdrop-blur-sm sm:pt-16"
      onClick={onClose}
    >
      <div className="card w-full max-w-xl p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <input
              className="input-base w-full text-lg font-semibold"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
            />
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-text-muted">
              {temaAtual && <span className="pill bg-bg-elevated">{temaAtual.nome}</span>}
              <StatusPill status={status || null} />
              <PrioridadePill prioridade={prioridade || null} />
              <TipoPill tipo={tipo || null} />
              {item.origem && <span className="pill bg-bg-elevated">{item.origem}</span>}
            </div>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 rounded-lg bg-bg-elevated px-2 py-1 text-sm text-text-muted hover:text-text-primary"
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>

        <label className="mt-4 flex w-fit cursor-pointer items-center gap-2 rounded-lg bg-accent-primary/15 px-3 py-2 text-sm font-medium text-accent-primary">
          <input
            type="checkbox"
            checked={priorizadoHoje}
            onChange={(e) => togglePriorizado.mutate(e.target.checked)}
            className="h-4 w-4 accent-accent-primary"
          />
          Priorizar para hoje
        </label>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
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

        <div className="mt-3">
          <label className="mb-1 block text-xs font-medium text-text-muted">Descrição</label>
          <textarea
            className="input-base w-full"
            rows={4}
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
          />
        </div>

        <div className="mt-3">
          <label className="mb-1 block text-xs font-medium text-text-muted">Anotações diárias</label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <textarea
              className="input-base w-full"
              rows={2}
              placeholder="O que aconteceu hoje com este item?"
              value={notaNova}
              onChange={(e) => setNotaNova(e.target.value)}
            />
            <button
              onClick={handleAdicionarNota}
              disabled={adicionarNota.isPending || !notaNova.trim()}
              className="shrink-0 rounded-lg bg-bg-elevated px-4 py-2 text-sm font-medium text-text-primary hover:bg-bg-elevated/70 disabled:cursor-not-allowed disabled:opacity-50 sm:self-start"
            >
              {adicionarNota.isPending ? 'Salvando...' : 'Adicionar'}
            </button>
          </div>
          {anotacoes && (
            <div className="mt-2 max-h-40 overflow-y-auto whitespace-pre-wrap rounded-lg bg-bg-elevated/50 p-3 text-xs text-text-muted">
              {anotacoes}
            </div>
          )}
        </div>

        <div className="mt-4 grid grid-cols-1 gap-2 rounded-lg bg-bg-elevated/50 p-3 text-xs text-text-muted sm:grid-cols-2">
          <p>
            <span className="font-medium text-text-primary">Reunião de origem:</span>{' '}
            {item.reuniaoOrigem || '—'}
          </p>
          <p>
            <span className="font-medium text-text-primary">Data da reunião:</span>{' '}
            {item.dataReuniao || '—'}
          </p>
          <p>
            <span className="font-medium text-text-primary">Ata:</span>{' '}
            {item.urlAta ? (
              <a
                href={item.urlAta}
                target="_blank"
                rel="noreferrer"
                className="text-accent-secondary hover:underline"
              >
                abrir no Notion ↗
              </a>
            ) : (
              '—'
            )}
          </p>
          <p>
            <span className="font-medium text-text-primary">Criado em:</span>{' '}
            {item.criadoEm ? new Date(item.criadoEm).toLocaleString('pt-BR') : '—'}
          </p>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs">
            {salvar.isError && <span className="text-status-bloqueada">{(salvar.error as Error).message}</span>}
            {salvar.isSuccess && <span className="text-status-concluida">Alterações salvas.</span>}
            {excluir.isError && <span className="text-status-bloqueada">{(excluir.error as Error).message}</span>}
          </div>
          <div className="flex flex-wrap gap-2">
            <a
              href="https://app.xmind.com/Ocve3Pj6"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg bg-bg-elevated px-4 py-2 text-sm font-medium text-text-muted hover:text-text-primary"
            >
              Mapa mental ↗
            </a>
            <button
              onClick={confirmarExclusao}
              disabled={excluir.isPending}
              className="rounded-lg bg-status-bloqueada/15 px-4 py-2 text-sm font-medium text-status-bloqueada hover:bg-status-bloqueada/25 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {excluir.isPending ? 'Excluindo...' : 'Excluir item'}
            </button>
            <button
              onClick={onClose}
              className="rounded-lg bg-bg-elevated px-4 py-2 text-sm font-medium text-text-primary hover:bg-bg-elevated/70"
            >
              Fechar
            </button>
            <button
              onClick={() => salvar.mutate()}
              disabled={salvar.isPending || !titulo.trim()}
              className="rounded-lg bg-accent-primary px-4 py-2 text-sm font-semibold text-white transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {salvar.isPending ? 'Salvando...' : 'Salvar alterações'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
