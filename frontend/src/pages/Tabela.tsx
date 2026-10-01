import { useMemo, useState } from 'react';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getExpandedRowModel,
  getGroupedRowModel,
  getSortedRowModel,
  useReactTable,
  type ExpandedState,
  type GroupingState,
} from '@tanstack/react-table';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { Carregando, Erro } from '../components/Estado';
import { ClasseKozoPill, PrioridadePill } from '../components/Pills';
import FiltrosItens, { FILTROS_VAZIOS, type FiltrosItensValor } from '../components/FiltrosItens';
import { passaFiltroMulti, passaFiltroMultiArray } from '../components/MultiSelectFiltro';
import { passaFiltroPrazo } from '../components/FiltroPrazo';
import { RANK_PRIORIDADE } from '../utils/ordenacao';
import { formatarDataBr, estaAtrasado } from '../utils/prazo';
import ItemDetailModal from '../components/ItemDetailModal';
import type { Item } from '../api/types';
import { CLASSE_KOZO_OPCOES, PRIORIDADE_OPCOES, TEMPO_ESTIMADO_OPCOES } from '../api/types';
import { formatarMinutos, minutosDeTempoEstimado } from '../utils/tempo';

interface LinhaItem extends Item {
  temaNome: string;
}

const columnHelper = createColumnHelper<LinhaItem>();

/** Colunas da grid pelas quais o usuário pode agrupar (id da coluna → rótulo). */
const OPCOES_AGRUPAMENTO: { id: string; label: string }[] = [
  { id: 'temaNome', label: 'Tema' },
  { id: 'titulo', label: 'Título' },
  { id: 'prioridade', label: 'Prioridade' },
  { id: 'classeKozo', label: 'Classe KOZO' },
  { id: 'tempoEstimado', label: 'Tempo est.' },
  { id: 'prazo', label: 'Prazo' },
  { id: 'priorizadoHoje', label: 'Hoje' },
];

/**
 * Texto do cabeçalho de um grupo. Lê o valor do primeiro item do grupo (e
 * não o `groupingValue` do TanStack, que vem convertido para string — null
 * vira "null", boolean vira "true"/"false").
 */
function rotuloDoGrupo(colunaId: string, item: LinhaItem): string {
  switch (colunaId) {
    case 'temaNome':
      return item.temaNome;
    case 'titulo':
      return item.titulo || 'Sem título';
    case 'prioridade':
      return item.prioridade ?? 'Sem prioridade';
    case 'classeKozo':
      return item.classeKozo ?? 'Sem classe KOZO';
    case 'tempoEstimado':
      return item.tempoEstimado ?? 'Sem tempo estimado';
    case 'prazo':
      return item.prazo ? formatarDataBr(item.prazo) : 'Sem prazo';
    case 'priorizadoHoje':
      return item.priorizadoHoje ? 'Priorizado hoje' : 'Não priorizado hoje';
    default:
      return '';
  }
}

export default function Tabela() {
  const queryClient = useQueryClient();

  const [filtros, setFiltros] = useState<FiltrosItensValor>(FILTROS_VAZIOS);
  // A grid abre sempre desagrupada; o agrupamento é escolhido no seletor.
  const [grouping, setGrouping] = useState<GroupingState>([]);
  const [expanded, setExpanded] = useState<ExpandedState>(true);
  const [itemSelecionado, setItemSelecionado] = useState<Item | null>(null);

  const temasQuery = useQuery({ queryKey: ['temas'], queryFn: api.listarTemas });
  const itensQuery = useQuery({ queryKey: ['itens', {}], queryFn: () => api.listarItens() });

  const atualizarItem = useMutation({
    mutationFn: ({ id, dados }: { id: string; dados: Partial<Item> }) => api.atualizarItem(id, dados as any),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['itens'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-semana'] });
    },
  });

  const mapaTemas = useMemo(() => {
    const mapa = new Map<string, string>();
    (temasQuery.data ?? []).forEach((t) => mapa.set(t.id, t.nome));
    return mapa;
  }, [temasQuery.data]);

  const responsaveisDisponiveis = useMemo(() => {
    const set = new Set<string>();
    (itensQuery.data ?? []).forEach((i) => i.responsavel && set.add(i.responsavel));
    return Array.from(set).sort();
  }, [itensQuery.data]);

  const dados: LinhaItem[] = useMemo(() => {
    const itens = itensQuery.data ?? [];
    return itens
      .map((item) => ({
        ...item,
        temaNome: item.temaIds[0] ? mapaTemas.get(item.temaIds[0]) || 'Sem tema' : 'Sem tema',
      }))
      .filter((item) => passaFiltroMultiArray(item.temaIds, filtros.tema))
      .filter((item) => passaFiltroMulti(item.status, filtros.status))
      .filter((item) => passaFiltroMulti(item.prioridade, filtros.prioridade))
      .filter((item) => passaFiltroMulti(item.responsavel, filtros.responsavel))
      .filter((item) => passaFiltroMulti(item.classeKozo, filtros.classeKozo))
      .filter((item) => passaFiltroMulti(item.tempoEstimado, filtros.tempoEstimado))
      .filter((item) => passaFiltroPrazo(item.prazo, filtros.prazo))
      .filter((item) =>
        filtros.busca ? item.titulo.toLowerCase().includes(filtros.busca.toLowerCase()) : true
      );
  }, [itensQuery.data, mapaTemas, filtros]);

  const totalEstimadoMinutos = useMemo(
    () => dados.reduce((soma, item) => soma + minutosDeTempoEstimado(item.tempoEstimado), 0),
    [dados]
  );

  const columns = useMemo(
    () => [
      columnHelper.accessor('temaNome', {
        header: 'Tema',
      }),
      columnHelper.accessor('titulo', {
        header: 'Título',
        cell: (info) => (
          <button
            className="text-left font-medium hover:text-accent-secondary hover:underline"
            onClick={(e) => {
              e.stopPropagation();
              setItemSelecionado(info.row.original);
            }}
          >
            {info.getValue()}
          </button>
        ),
      }),
      columnHelper.accessor('prioridade', {
        header: 'Prioridade',
        sortingFn: (rowA, rowB) =>
          (RANK_PRIORIDADE[rowA.original.prioridade ?? ''] ?? 0) -
          (RANK_PRIORIDADE[rowB.original.prioridade ?? ''] ?? 0),
        cell: (info) => {
          const item = info.row.original;
          return (
            <select
              className="input-base py-1 text-xs"
              value={item.prioridade ?? ''}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) =>
                atualizarItem.mutate({ id: item.id, dados: { prioridade: e.target.value as any } })
              }
            >
              {PRIORIDADE_OPCOES.map((op) => (
                <option key={op} value={op}>
                  {op}
                </option>
              ))}
            </select>
          );
        },
      }),
      columnHelper.accessor('classeKozo', {
        header: 'Classe KOZO',
        cell: (info) => {
          const item = info.row.original;
          return (
            <select
              className="input-base py-1 text-xs"
              value={item.classeKozo ?? ''}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) =>
                atualizarItem.mutate({ id: item.id, dados: { classeKozo: e.target.value as any } })
              }
            >
              <option value="">—</option>
              {CLASSE_KOZO_OPCOES.map((op) => (
                <option key={op} value={op}>
                  {op}
                </option>
              ))}
            </select>
          );
        },
      }),
      columnHelper.accessor('tempoEstimado', {
        header: 'Tempo est.',
        // Ordena pela duração (minutos) e não pelo texto, para "01:00" não
        // ficar antes de "00:30" quando as faixas crescerem.
        sortingFn: (rowA, rowB) =>
          minutosDeTempoEstimado(rowA.original.tempoEstimado) -
          minutosDeTempoEstimado(rowB.original.tempoEstimado),
        cell: (info) => {
          const item = info.row.original;
          return (
            <select
              aria-label="Tempo estimado"
              className="input-base py-1 text-xs"
              value={item.tempoEstimado ?? ''}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) =>
                atualizarItem.mutate({ id: item.id, dados: { tempoEstimado: e.target.value as any } })
              }
            >
              <option value="">—</option>
              {TEMPO_ESTIMADO_OPCOES.map((op) => (
                <option key={op} value={op}>
                  {op}
                </option>
              ))}
            </select>
          );
        },
      }),
      columnHelper.accessor('prazo', {
        header: 'Prazo',
        sortingFn: (rowA, rowB) => {
          const a = rowA.original.prazo;
          const b = rowB.original.prazo;
          if (!a && !b) return 0;
          if (!a) return 1;
          if (!b) return -1;
          return a.localeCompare(b);
        },
        cell: (info) => {
          const item = info.row.original;
          if (!item.prazo) return '—';
          const atrasado = estaAtrasado(item);
          return (
            <span className={`text-xs ${atrasado ? 'font-semibold text-status-bloqueada' : ''}`}>
              {formatarDataBr(item.prazo)}
            </span>
          );
        },
      }),
      columnHelper.accessor('priorizadoHoje', {
        header: 'Hoje',
        cell: (info) => {
          const item = info.row.original;
          return (
            <input
              type="checkbox"
              checked={item.priorizadoHoje}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) =>
                api
                  .alternarPriorizadoHoje(item.id, e.target.checked)
                  .then(() => queryClient.invalidateQueries({ queryKey: ['itens'] }))
              }
              className="h-4 w-4 accent-accent-primary"
            />
          );
        },
      }),
    ],
    [atualizarItem, queryClient]
  );

  const table = useReactTable({
    data: dados,
    columns,
    state: { grouping, expanded },
    onGroupingChange: setGrouping,
    onExpandedChange: setExpanded,
    // Mantém a ordem das colunas ao agrupar (o padrão move a coluna agrupada para o início).
    groupedColumnMode: false,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getGroupedRowModel: getGroupedRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    autoResetExpanded: false,
  });

  if (itensQuery.isLoading || temasQuery.isLoading) return <Carregando texto="Carregando itens..." />;
  if (itensQuery.isError) return <Erro mensagem={(itensQuery.error as Error).message} />;

  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="text-2xl font-semibold">Tabela de itens</h1>
        <p className="mt-1 text-sm text-text-muted">
          {dados.length} item(ns). Clique no título para ver todos os detalhes.
          {totalEstimadoMinutos > 0 && ` Esforço estimado: ${formatarMinutos(totalEstimadoMinutos)}.`}
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1">
          <FiltrosItens
            valor={filtros}
            onChange={setFiltros}
            temas={temasQuery.data ?? []}
            responsaveis={responsaveisDisponiveis}
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-text-muted">
          Agrupar por
          <select
            aria-label="Agrupar por"
            className="input-base py-2 text-sm"
            value={grouping[0] ?? ''}
            onChange={(e) => {
              setGrouping(e.target.value ? [e.target.value] : []);
              // Ao trocar o agrupamento, os grupos começam todos abertos.
              setExpanded(true);
            }}
          >
            <option value="">Nenhum</option>
            {OPCOES_AGRUPAMENTO.map((op) => (
              <option key={op.id} value={op.id}>
                {op.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="card overflow-x-auto p-0">
        <table className="w-full min-w-[960px] border-collapse text-sm">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="border-b border-white/10 text-left text-xs uppercase text-text-muted">
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className={`cursor-pointer select-none px-3 py-2 ${
                      header.column.id === 'titulo' ? 'w-[40%] min-w-[24rem]' : 'whitespace-nowrap'
                    }`}
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
                    {{ asc: ' ▲', desc: ' ▼' }[header.column.getIsSorted() as string] ?? ''}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => {
              if (row.getIsGrouped()) {
                const primeiroItem = row.getLeafRows()[0]?.original;
                return (
                  <tr key={row.id} className="bg-bg-elevated">
                    <td colSpan={columns.length} className="px-3 py-2 text-sm font-semibold text-accent-secondary">
                      <button onClick={row.getToggleExpandedHandler()} className="flex items-center gap-2 text-left">
                        <span>{row.getIsExpanded() ? '▾' : '▸'}</span>
                        {primeiroItem && row.groupingColumnId
                          ? rotuloDoGrupo(row.groupingColumnId, primeiroItem)
                          : ''}
                        <span className="text-xs font-normal text-text-muted">
                          ({row.subRows.length} item(ns))
                        </span>
                      </button>
                    </td>
                  </tr>
                );
              }
              return (
                <tr
                  key={row.id}
                  className="cursor-pointer border-b border-white/5 hover:bg-bg-elevated/60"
                  onClick={() => setItemSelecionado(row.original)}
                >
                  {row.getVisibleCells().map((cell) => {
                    if (cell.column.id === 'prioridade' || cell.column.id === 'classeKozo') {
                      return (
                        <td key={cell.id} className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            {cell.column.id === 'prioridade' && (
                              <PrioridadePill prioridade={row.original.prioridade} />
                            )}
                            {cell.column.id === 'classeKozo' && row.original.classeKozo && (
                              <ClasseKozoPill classeKozo={row.original.classeKozo} />
                            )}
                          </div>
                        </td>
                      );
                    }
                    return (
                      <td key={cell.id} className="px-3 py-2">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {itemSelecionado && (
        <ItemDetailModal item={itemSelecionado} onClose={() => setItemSelecionado(null)} />
      )}
    </div>
  );
}
