import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { ClasseKozoPill, PrioridadePill, StatusPill, TipoPill } from './Pills';
import type {
  ClasseKozo,
  Item,
  PodeDelegar,
  Prioridade,
  StatusItem,
  TempoEstimado,
  TipoItem,
} from '../api/types';
import {
  CLASSE_KOZO_OPCOES,
  LEGENDA_CLASSE_KOZO,
  PODE_DELEGAR_OPCOES,
  PRIORIDADE_OPCOES,
  STATUS_ITEM_OPCOES,
  TEMPO_ESTIMADO_OPCOES,
  TIPO_OPCOES,
} from '../api/types';
import ChecklistSubtarefas from './ChecklistSubtarefas';
import { estaAtrasado, formatarDataBr } from '../utils/prazo';

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
  const { data: contatosWhatsapp } = useQuery({
    queryKey: ['whatsapp-contatos'],
    queryFn: api.listarContatosWhatsapp,
  });
  const { data: contatosEmail } = useQuery({
    queryKey: ['email-contatos'],
    queryFn: api.listarContatosEmail,
  });

  const [titulo, setTitulo] = useState(item.titulo);
  const [temaId, setTemaId] = useState(item.temaIds[0] || '');
  const [tipo, setTipo] = useState<TipoItem | ''>(item.tipo || '');
  const [descricao, setDescricao] = useState(item.descricao);
  const [responsavel, setResponsavel] = useState(item.responsavel);
  const [status, setStatus] = useState<StatusItem | ''>(item.status || '');
  const [prioridade, setPrioridade] = useState<Prioridade | ''>(item.prioridade || '');
  const [prazo, setPrazo] = useState(item.prazo || '');
  const [classeKozo, setClasseKozo] = useState<ClasseKozo | ''>(item.classeKozo || '');
  const [tempoEstimado, setTempoEstimado] = useState<TempoEstimado | ''>(item.tempoEstimado || '');
  const [priorizadoHoje, setPriorizadoHoje] = useState(item.priorizadoHoje);
  const [anotacoes, setAnotacoes] = useState(item.anotacoesDiarias || '');
  const [notaNova, setNotaNova] = useState('');
  const [whatsappContatoIds, setWhatsappContatoIds] = useState<string[]>(item.whatsappContatoIds);
  const [emailContatoIds, setEmailContatoIds] = useState<string[]>(item.emailContatoIds);
  const [objetivoProblema, setObjetivoProblema] = useState(item.objetivoProblema);
  const [situacaoAtual, setSituacaoAtual] = useState(item.situacaoAtual);
  const [situacaoDesejada, setSituacaoDesejada] = useState(item.situacaoDesejada);
  const [oQuePrecisaSerFeito, setOQuePrecisaSerFeito] = useState(item.oQuePrecisaSerFeito);
  const [podeDelegar, setPodeDelegar] = useState<PodeDelegar | ''>(item.podeDelegar || '');
  const [delegarPara, setDelegarPara] = useState(item.delegarPara);
  const [motivoAtraso, setMotivoAtraso] = useState(item.motivoAtraso);
  const [dataReprogramacao, setDataReprogramacao] = useState(item.dataReprogramacao || '');

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
    setClasseKozo(item.classeKozo || '');
    setTempoEstimado(item.tempoEstimado || '');
    setPriorizadoHoje(item.priorizadoHoje);
    setAnotacoes(item.anotacoesDiarias || '');
    setNotaNova('');
    setWhatsappContatoIds(item.whatsappContatoIds);
    setEmailContatoIds(item.emailContatoIds);
    setObjetivoProblema(item.objetivoProblema);
    setSituacaoAtual(item.situacaoAtual);
    setSituacaoDesejada(item.situacaoDesejada);
    setOQuePrecisaSerFeito(item.oQuePrecisaSerFeito);
    setPodeDelegar(item.podeDelegar || '');
    setDelegarPara(item.delegarPara);
    setMotivoAtraso(item.motivoAtraso);
    setDataReprogramacao(item.dataReprogramacao || '');
  }, [item.id]);

  function alternarContatoWhatsapp(contatoId: string) {
    setWhatsappContatoIds((atual) =>
      atual.includes(contatoId) ? atual.filter((id) => id !== contatoId) : [...atual, contatoId]
    );
  }

  function alternarContatoEmail(contatoId: string) {
    setEmailContatoIds((atual) =>
      atual.includes(contatoId) ? atual.filter((id) => id !== contatoId) : [...atual, contatoId]
    );
  }

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
        classeKozo,
        tempoEstimado,
        whatsappContatoIds,
        emailContatoIds,
        objetivoProblema,
        situacaoAtual,
        situacaoDesejada,
        oQuePrecisaSerFeito,
        podeDelegar,
        delegarPara,
        motivoAtraso,
        dataReprogramacao: dataReprogramacao || '',
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

  // Atraso avaliado sobre os valores em edição (e não sobre o item salvo),
  // para o bloco reagir na hora em que o prazo ou o status muda na tela.
  const atrasado = estaAtrasado({
    prazo: prazo || null,
    dataReprogramacao: dataReprogramacao || null,
    status: (status || null) as StatusItem | null,
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 pt-10 backdrop-blur-sm sm:pt-16"
      onClick={onClose}
    >
      <div className="card w-full max-w-6xl p-5" onClick={(e) => e.stopPropagation()}>
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
              <ClasseKozoPill classeKozo={classeKozo || null} />
              {tempoEstimado && <span className="pill bg-bg-elevated">⏱ {tempoEstimado}</span>}
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

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
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
            <label className="mb-1 block text-xs font-medium text-text-muted">
              Prazo{dataReprogramacao ? ' (original)' : ''}
            </label>
            <input
              type="date"
              className="input-base w-full"
              value={prazo}
              onChange={(e) => setPrazo(e.target.value)}
            />
            {dataReprogramacao && (
              <p className="mt-1 text-xs text-text-muted">
                Vale a reprogramação: {formatarDataBr(dataReprogramacao)}
              </p>
            )}
          </div>
          <div>
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
            <p className="mt-1 text-xs text-text-muted">
              Define em qual{' '}
              <Link to="/visoes" className="text-accent-secondary hover:underline">
                visão
              </Link>{' '}
              o item aparece.
            </p>
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

        {/* Os dois campos de texto livre lado a lado: a descrição (o que é) e
            as anotações do dia a dia (o que anda acontecendo). */}
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-text-muted">Descrição</label>
            <textarea
              className="input-base w-full"
              rows={6}
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
            />
          </div>
          <div>
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
        </div>

        <div className="mt-4 rounded-lg bg-bg-elevated/40 p-3">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-text-muted">Detalhamento</p>
          <div className="flex flex-col gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-text-muted">
                Objetivo / problema a resolver
              </label>
              <textarea
                className="input-base w-full"
                rows={2}
                placeholder="Que problema este item resolve? Qual o objetivo?"
                value={objetivoProblema}
                onChange={(e) => setObjetivoProblema(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-text-muted">Como está hoje</label>
                <textarea
                  className="input-base w-full"
                  rows={3}
                  placeholder="Situação atual"
                  value={situacaoAtual}
                  onChange={(e) => setSituacaoAtual(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-text-muted">Como deveria ser</label>
                <textarea
                  className="input-base w-full"
                  rows={3}
                  placeholder="Situação desejada"
                  value={situacaoDesejada}
                  onChange={(e) => setSituacaoDesejada(e.target.value)}
                />
              </div>
            </div>

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
        </div>

        <div
          className={`mt-3 rounded-lg p-3 ${
            atrasado ? 'bg-status-bloqueada/10 ring-1 ring-status-bloqueada/40' : 'bg-bg-elevated/40'
          }`}
        >
          <p
            className={`mb-3 text-xs font-semibold uppercase tracking-wide ${
              atrasado ? 'text-status-bloqueada' : 'text-text-muted'
            }`}
          >
            {atrasado ? '⚠ Item atrasado — atraso e reprogramação' : 'Atraso e reprogramação'}
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-text-muted">Motivo do atraso</label>
              <textarea
                className="input-base w-full"
                rows={2}
                placeholder="Por que o prazo não foi cumprido?"
                value={motivoAtraso}
                onChange={(e) => setMotivoAtraso(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-text-muted">Data de reprogramação</label>
              <input
                type="date"
                className="input-base w-full"
                value={dataReprogramacao}
                onChange={(e) => setDataReprogramacao(e.target.value)}
              />
              <p className="mt-1 text-xs text-text-muted">
                Passa a valer no lugar do prazo em filtros, ordenação e avisos. O prazo original é preservado.
              </p>
            </div>
          </div>
        </div>

        {/* WhatsApp e e-mail lado a lado: são a mesma decisão ("quem avisar"),
            só que por canais diferentes. */}
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
              <div className="mb-1 flex items-center justify-between">
              <label className="block text-xs font-medium text-text-muted">
                Notificar por WhatsApp quando vencer o prazo
              </label>
              <Link to="/contatos" className="text-xs text-accent-secondary hover:underline">
                gerenciar contatos →
              </Link>
            </div>
            {(contatosWhatsapp ?? []).length === 0 ? (
              <p className="text-xs text-text-muted">
                Nenhum contato cadastrado ainda —{' '}
                <Link to="/contatos" className="text-accent-secondary hover:underline">
                  cadastre um
                </Link>
                .
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {(contatosWhatsapp ?? []).map((contato) => {
                  const selecionado = whatsappContatoIds.includes(contato.id);
                  return (
                    <button
                      type="button"
                      key={contato.id}
                      onClick={() => alternarContatoWhatsapp(contato.id)}
                      aria-pressed={selecionado}
                      className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                        selecionado
                          ? 'bg-accent-primary text-white'
                          : 'bg-bg-elevated text-text-muted hover:text-text-primary'
                      } ${contato.ativo ? '' : 'opacity-50'}`}
                    >
                      {contato.nome}
                      {!contato.ativo && ' (inativo)'}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div>
              <div className="mb-1 flex items-center justify-between">
              <label className="block text-xs font-medium text-text-muted">Notificar por E-mail quando vencer o prazo</label>
              <Link to="/contatos" className="text-xs text-accent-secondary hover:underline">
                gerenciar contatos →
              </Link>
            </div>
            {(contatosEmail ?? []).length === 0 ? (
              <p className="text-xs text-text-muted">
                Nenhum contato cadastrado ainda —{' '}
                <Link to="/contatos" className="text-accent-secondary hover:underline">
                  cadastre um
                </Link>
                .
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {(contatosEmail ?? []).map((contato) => {
                  const selecionado = emailContatoIds.includes(contato.id);
                  return (
                    <button
                      type="button"
                      key={contato.id}
                      onClick={() => alternarContatoEmail(contato.id)}
                      aria-pressed={selecionado}
                      className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                        selecionado
                          ? 'bg-accent-primary text-white'
                          : 'bg-bg-elevated text-text-muted hover:text-text-primary'
                      } ${contato.ativo ? '' : 'opacity-50'}`}
                    >
                      {contato.nome}
                      {!contato.ativo && ' (inativo)'}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-2 rounded-lg bg-bg-elevated/50 p-3 text-xs text-text-muted sm:grid-cols-4">
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
