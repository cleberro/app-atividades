import { useMemo, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { useDraggable } from '@dnd-kit/core';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { Carregando, Erro } from '../components/Estado';
import { PrioridadePill } from '../components/Pills';
import FiltrosItens, { FILTROS_VAZIOS, type FiltrosItensValor } from '../components/FiltrosItens';
import { passaFiltroMulti, passaFiltroMultiArray } from '../components/MultiSelectFiltro';
import { passaFiltroPrazo } from '../components/FiltroPrazo';
import ItemDetailModal from '../components/ItemDetailModal';
import type { Item, StatusItem } from '../api/types';
import { STATUS_ITEM_OPCOES } from '../api/types';
import { ordenarItens, type CriterioOrdenacao } from '../utils/ordenacao';

const COLUMN_COLOR: Record<string, string> = {
  Pendente: 'var(--status-pendente)',
  'Em Andamento': 'var(--status-andamento)',
  Bloqueada: 'var(--status-bloqueada)',
  'Concluída': 'var(--status-concluida)',
  'Não se aplica': '#5A5C78',
};

function CartaoItem({ item, onAbrir }: { item: Item; onAbrir: (item: Item) => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: item.id,
    data: { item },
  });

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 50 }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={() => !isDragging && onAbrir(item)}
      className={`card card-hover cursor-grab p-3 active:cursor-grabbing ${isDragging ? 'opacity-40' : ''}`}
    >
      <p className="text-sm font-medium">{item.titulo}</p>
      <div className="mt-2 flex items-center justify-between">
        <span className="text-xs text-text-muted">{item.responsavel || 'Sem responsável'}</span>
        <PrioridadePill prioridade={item.prioridade} />
      </div>
    </div>
  );
}

function Coluna({
  status,
  itens,
  onAbrir,
}: {
  status: string;
  itens: Item[];
  onAbrir: (item: Item) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const cor = COLUMN_COLOR[status] || '#5A5C78';

  return (
    <div
      ref={setNodeRef}
      className={`flex w-72 shrink-0 flex-col gap-3 rounded-card bg-bg-surface p-3 ${
        isOver ? 'ring-2 ring-accent-primary' : ''
      }`}
      style={{ borderTop: `3px solid ${cor}` }}
    >
      <div className="flex items-center justify-between px-1">
        <h3 className="text-sm font-semibold">{status}</h3>
        <span className="pill" style={{ backgroundColor: `${cor}26`, color: cor }}>
          {itens.length}
        </span>
      </div>
      <div className="flex min-h-[80px] flex-col gap-2">
        {itens.map((item) => (
          <CartaoItem key={item.id} item={item} onAbrir={onAbrir} />
        ))}
      </div>
    </div>
  );
}

export default function Kanban() {
  const queryClient = useQueryClient();
  const [itemArrastado, setItemArrastado] = useState<Item | null>(null);
  const [itemSelecionado, setItemSelecionado] = useState<Item | null>(null);
  const [filtros, setFiltros] = useState<FiltrosItensValor>(FILTROS_VAZIOS);
  const [ordenacao, setOrdenacao] = useState<CriterioOrdenacao>('padrao');

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['kanban'],
    queryFn: api.kanban,
  });

  const temasQuery = useQuery({ queryKey: ['temas'], queryFn: api.listarTemas });

  const atualizarStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: StatusItem }) =>
      api.atualizarItem(id, { status }),
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: ['kanban'] });
      const anterior = queryClient.getQueryData<Record<string, Item[]>>(['kanban']);
      if (anterior) {
        const novo: Record<string, Item[]> = {};
        let itemMovido: Item | undefined;
        for (const [col, itens] of Object.entries(anterior)) {
          novo[col] = itens.filter((it) => {
            if (it.id === id) {
              itemMovido = it;
              return false;
            }
            return true;
          });
        }
        if (itemMovido) {
          novo[status] = [...(novo[status] || []), { ...itemMovido, status }];
        }
        queryClient.setQueryData(['kanban'], novo);
      }
      return { anterior };
    },
    onError: (_err, _vars, context) => {
      if (context?.anterior) queryClient.setQueryData(['kanban'], context.anterior);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['kanban'] }),
  });

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const responsaveisDisponiveis = useMemo(() => {
    const set = new Set<string>();
    Object.values(data ?? {}).forEach((itens) => itens.forEach((i) => i.responsavel && set.add(i.responsavel)));
    return Array.from(set).sort();
  }, [data]);

  function passaNosFiltros(item: Item) {
    if (!passaFiltroMultiArray(item.temaIds, filtros.tema)) return false;
    if (!passaFiltroMulti(item.tipo, filtros.tipo)) return false;
    if (!passaFiltroMulti(item.prioridade, filtros.prioridade)) return false;
    if (!passaFiltroMulti(item.responsavel, filtros.responsavel)) return false;
    if (!passaFiltroPrazo(item.prazo, filtros.prazo)) return false;
    if (filtros.busca && !item.titulo.toLowerCase().includes(filtros.busca.toLowerCase())) return false;
    return true;
  }

  const colunas = useMemo(() => {
    const base: Record<string, Item[]> = {};
    STATUS_ITEM_OPCOES.forEach(
      (s) => (base[s] = ordenarItens((data?.[s] || []).filter(passaNosFiltros), ordenacao))
    );
    return base;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, filtros, ordenacao]);

  function handleDragStart(event: DragStartEvent) {
    setItemArrastado((event.active.data.current?.item as Item) || null);
  }

  function handleDragEnd(event: DragEndEvent) {
    setItemArrastado(null);
    const { active, over } = event;
    if (!over) return;
    const novoStatus = over.id as StatusItem;
    const item = active.data.current?.item as Item | undefined;
    if (item && item.status !== novoStatus) {
      atualizarStatus.mutate({ id: item.id, status: novoStatus });
    }
  }

  if (isLoading) return <Carregando texto="Carregando kanban..." />;
  if (isError) return <Erro mensagem={(error as Error).message} />;

  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="text-2xl font-semibold">Kanban</h1>
        <p className="mt-1 text-sm text-text-muted">
          Arraste os cartões entre colunas para mudar o status. Clique em um cartão para ver detalhes.
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1">
          <FiltrosItens
            valor={filtros}
            onChange={setFiltros}
            temas={temasQuery.data ?? []}
            responsaveis={responsaveisDisponiveis}
            mostrarStatus={false}
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

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {STATUS_ITEM_OPCOES.map((status) => (
            <Coluna key={status} status={status} itens={colunas[status] || []} onAbrir={setItemSelecionado} />
          ))}
        </div>
        <DragOverlay>{itemArrastado ? <CartaoItem item={itemArrastado} onAbrir={() => {}} /> : null}</DragOverlay>
      </DndContext>

      {itemSelecionado && (
        <ItemDetailModal item={itemSelecionado} onClose={() => setItemSelecionado(null)} />
      )}
    </div>
  );
}
