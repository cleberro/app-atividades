import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/client';
import { Carregando, Erro, Vazio } from '../components/Estado';
import { PrioridadePill, StatusPill } from '../components/Pills';
import ItemForm from '../components/ItemForm';
import FiltrosItens, { FILTROS_VAZIOS, type FiltrosItensValor } from '../components/FiltrosItens';
import { passaFiltroMulti } from '../components/MultiSelectFiltro';
import { passaFiltroPrazo } from '../components/FiltroPrazo';
import ItemDetailModal from '../components/ItemDetailModal';
import { STATUS_ITEM_OPCOES } from '../api/types';
import type { Item } from '../api/types';
import { ordenarItens, type CriterioOrdenacao } from '../utils/ordenacao';

export default function TemaDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [mostrarForm, setMostrarForm] = useState(false);
  const [filtros, setFiltros] = useState<FiltrosItensValor>(FILTROS_VAZIOS);
  const [ordenacao, setOrdenacao] = useState<CriterioOrdenacao>('padrao');
  const [itemSelecionado, setItemSelecionado] = useState<Item | null>(null);

  const temasQuery = useQuery({ queryKey: ['temas'], queryFn: api.listarTemas });
  const itensQuery = useQuery({
    queryKey: ['itens', { tema: id }],
    queryFn: () => api.listarItens({ tema: id }),
    enabled: !!id,
  });

  const toggleFoco = useMutation({
    mutationFn: ({ valor }: { valor: boolean }) => api.alternarFocoSemana(id!, valor),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['temas'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-semana'] });
    },
  });

  const atualizarStatus = useMutation({
    mutationFn: ({ itemId, status }: { itemId: string; status: string }) =>
      api.atualizarItem(itemId, { status: status as any }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['itens', { tema: id }] }),
  });

  const excluirTema = useMutation({
    mutationFn: () => api.excluirTema(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['temas'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-semana'] });
      navigate('/temas');
    },
  });

  function confirmarExclusaoTema() {
    if (!tema) return;
    if (window.confirm(`Excluir o tema "${tema.nome}"? Ele será movido para a lixeira do Notion.`)) {
      excluirTema.mutate();
    }
  }

  const responsaveisDisponiveis = useMemo(() => {
    const set = new Set<string>();
    (itensQuery.data ?? []).forEach((i) => i.responsavel && set.add(i.responsavel));
    return Array.from(set).sort();
  }, [itensQuery.data]);

  const itensFiltrados = useMemo(() => {
    const itens = itensQuery.data ?? [];
    const filtrados = itens
      .filter((item) => passaFiltroMulti(item.status, filtros.status))
      .filter((item) => passaFiltroMulti(item.tipo, filtros.tipo))
      .filter((item) => passaFiltroMulti(item.prioridade, filtros.prioridade))
      .filter((item) => passaFiltroMulti(item.responsavel, filtros.responsavel))
      .filter((item) => passaFiltroPrazo(item.prazo, filtros.prazo))
      .filter((item) =>
        filtros.busca ? item.titulo.toLowerCase().includes(filtros.busca.toLowerCase()) : true
      );
    return ordenarItens(filtrados, ordenacao);
  }, [itensQuery.data, filtros, ordenacao]);

  if (temasQuery.isLoading || itensQuery.isLoading) return <Carregando texto="Carregando tema..." />;
  if (temasQuery.isError) return <Erro mensagem={(temasQuery.error as Error).message} />;
  if (itensQuery.isError) return <Erro mensagem={(itensQuery.error as Error).message} />;

  const tema = (temasQuery.data ?? []).find((t) => t.id === id);
  if (!tema) return <Vazio texto="Tema não encontrado." />;

  return (
    <div className="flex flex-col gap-6">
      <Link to="/temas" className="text-sm text-accent-secondary hover:underline">
        ← voltar para Temas
      </Link>

      <header className="card flex flex-col gap-3 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">{tema.nome}</h1>
            <p className="mt-1 max-w-2xl text-sm text-text-muted">{tema.descricao}</p>
          </div>
          <div className="flex items-center gap-2">
            <PrioridadePill prioridade={tema.prioridade} />
            <button
              onClick={confirmarExclusaoTema}
              disabled={excluirTema.isPending}
              className="rounded-lg bg-status-bloqueada/15 px-3 py-1.5 text-sm font-medium text-status-bloqueada hover:bg-status-bloqueada/25 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {excluirTema.isPending ? 'Excluindo...' : 'Excluir tema'}
            </button>
          </div>
        </div>
        {excluirTema.isError && (
          <p className="text-sm text-status-bloqueada">{(excluirTema.error as Error).message}</p>
        )}
        <div className="flex flex-wrap items-center gap-2 text-xs text-text-muted">
          {tema.categoria && <span className="pill bg-bg-elevated">{tema.categoria}</span>}
          {tema.status && <span className="pill bg-bg-elevated">{tema.status}</span>}
          <span className="pill bg-status-pendente/20 text-status-pendente">
            {tema.itensPendentes} pendente(s)
          </span>
        </div>
        <label className="mt-2 flex w-fit cursor-pointer items-center gap-2 rounded-lg bg-bg-elevated px-3 py-2 text-sm">
          <input
            type="checkbox"
            checked={tema.focoDaSemana}
            onChange={(e) => toggleFoco.mutate({ valor: e.target.checked })}
            className="h-4 w-4 accent-accent-primary"
          />
          Focar esta semana
        </label>
      </header>

      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">Itens ({itensFiltrados.length})</h2>
          <button
            onClick={() => setMostrarForm((v) => !v)}
            className="rounded-lg bg-accent-primary px-3 py-1.5 text-sm font-semibold text-white"
          >
            {mostrarForm ? 'Fechar' : '+ Novo item neste tema'}
          </button>
        </div>

        {mostrarForm && (
          <div className="mb-4">
            <ItemForm temaIdFixo={tema.id} onSucesso={() => setMostrarForm(false)} />
          </div>
        )}

        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="flex-1">
            <FiltrosItens
              valor={filtros}
              onChange={setFiltros}
              mostrarTema={false}
              responsaveis={responsaveisDisponiveis}
            />
          </div>
          <select
            className="input-base"
            value={ordenacao}
            onChange={(e) => setOrdenacao(e.target.value as CriterioOrdenacao)}
          >
            <option value="padrao">Ordenar: padrão</option>
            <option value="prioridade">Ordenar por Prioridade</option>
            <option value="prazo">Ordenar por Prazo</option>
          </select>
        </div>

        {itensFiltrados.length === 0 ? (
          <Vazio texto="Nenhum item encontrado com os filtros atuais." />
        ) : (
          <ul className="flex flex-col gap-2">
            {itensFiltrados.map((item) => (
              <li
                key={item.id}
                onClick={() => setItemSelecionado(item)}
                className="card card-hover flex cursor-pointer flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{item.titulo}</p>
                  <p className="truncate text-xs text-text-muted">
                    {item.responsavel || 'Sem responsável'}
                    {item.prazo ? ` · prazo ${item.prazo}` : ''}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <PrioridadePill prioridade={item.prioridade} />
                  <select
                    className="input-base py-1 text-xs"
                    value={item.status ?? ''}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => atualizarStatus.mutate({ itemId: item.id, status: e.target.value })}
                  >
                    {STATUS_ITEM_OPCOES.map((op) => (
                      <option key={op} value={op}>
                        {op}
                      </option>
                    ))}
                  </select>
                  <StatusPill status={item.status} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {itemSelecionado && (
        <ItemDetailModal item={itemSelecionado} onClose={() => setItemSelecionado(null)} />
      )}
    </div>
  );
}
