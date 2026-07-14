import { useMemo, useState } from 'react';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getExpandedRowModel,
  getGroupedRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { Carregando, Erro } from '../components/Estado';
import { PrioridadePill, StatusPill } from '../components/Pills';
import FiltrosItens, { FILTROS_VAZIOS, type FiltrosItensValor } from '../components/FiltrosItens';
import { passaFiltroMulti, passaFiltroMultiArray } from '../components/MultiSelectFiltro';
import { passaFiltroPrazo } from '../components/FiltroPrazo';
import { RANK_PRIORIDADE } from '../utils/ordenacao';
import ItemDetailModal from '../components/ItemDetailModal';
import type { Item } from '../api/types';
import { PRIORIDADE_OPCOES, STATUS_ITEM_OPCOES } from '../api/types';

interface LinhaItem extends Item {
  temaNome: string;
}

const columnHelper = createColumnHelper<LinhaItem>();

export default function Tabela() {
  const queryClient = useQueryClient();

  const [filtros, setFiltros] = useState<FiltrosItensValor>(FILTROS_VAZIOS);
  const [grouping, setGrouping] = useState<string[]>(['temaNome']);
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
      .filter((item) => passaFiltroMulti(item.tipo, filtros.tipo))
      .filter((item) => passaFiltroMulti(item.prioridade, filtros.prioridade))
      .filter((item) => passaFiltroMulti(item.responsavel, filtros.responsavel))
      .filter((item) => passaFiltroPrazo(item.prazo, filtros.prazo))
      .filter((item) =>
        filtros.busca ? item.titulo.toLowerCase().includes(filtros.busca.toLowerCase()) : true
      );
  }, [itensQuery.data, mapaTemas, filtros]);

  const columns = useMemo(
    () => [
      columnHelper.accessor('temaNome', {
        header: 'Tema',
        aggregatedCell: ({ getValue }) => getValue(),
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
      columnHelper.accessor('tipo', {
        header: 'Tipo',
        cell: (info) => info.getValue() || '—',
      }),
      columnHelper.accessor('status', {
        header: 'Status',
        cell: (info) => {
          const item = info.row.original;
          return (
            <select
              className="input-base py-1 text-xs"
              value={item.status ?? ''}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) =>
                atualizarItem.mutate({ id: item.id, dados: { status: e.target.value as any } })
              }
            >
              {STATUS_ITEM_OPCOES.map((op) => (
                <option key={op} value={op}>
                  {op}
                </option>
              ))}
            </select>
          );
        },
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
      columnHelper.accessor('responsavel', {
        header: 'Responsável',
        cell: (info) => info.getValue() || '—',
      }),
      columnHelper.accessor('prazo', {
        header: 'Prazo',
        cell: (info) => info.getValue() || '—',
      }),
      columnHelper.accessor('anotacoesDiarias', {
        header: 'Notas',
        cell: (info) => {
          const texto = info.getValue();
          const primeiraLinha = texto ? texto.split('\n')[0] : '';
          const preview = primeiraLinha.length > 40 ? `${primeiraLinha.slice(0, 40)}…` : primeiraLinha;
          return (
            <button
              className="max-w-[180px] truncate text-left text-xs text-text-muted hover:text-accent-secondary hover:underline"
              onClick={(e) => {
                e.stopPropagation();
                setItemSelecionado(info.row.original);
              }}
            >
              {preview || '+ anotar'}
            </button>
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
    state: { grouping },
    onGroupingChange: setGrouping,
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
          {dados.length} item(ns) — agrupados por tema. Clique no título para ver todos os detalhes.
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
        <button
          onClick={() => setGrouping(grouping.length ? [] : ['temaNome'])}
          className="rounded-lg bg-bg-elevated px-3 py-2 text-sm font-medium text-text-primary hover:bg-accent-primary"
        >
          {grouping.length ? 'Desagrupar' : 'Agrupar por tema'}
        </button>
      </div>

      <div className="card overflow-x-auto p-0">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="border-b border-white/10 text-left text-xs uppercase text-text-muted">
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="cursor-pointer select-none px-3 py-2"
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
                return (
                  <tr key={row.id} className="bg-bg-elevated">
                    <td colSpan={columns.length} className="px-3 py-2 text-sm font-semibold text-accent-secondary">
                      <button onClick={row.getToggleExpandedHandler()} className="flex items-center gap-2">
                        <span>{row.getIsExpanded() ? '▾' : '▸'}</span>
                        {row.getValue('temaNome') as string}
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
                    if (cell.column.id === 'temaNome' && grouping.includes('temaNome')) {
                      return <td key={cell.id} className="px-3 py-2 text-text-muted" />;
                    }
                    if (cell.column.id === 'status' || cell.column.id === 'prioridade') {
                      return (
                        <td key={cell.id} className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            {cell.column.id === 'status' && <StatusPill status={row.original.status} />}
                            {cell.column.id === 'prioridade' && (
                              <PrioridadePill prioridade={row.original.prioridade} />
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
