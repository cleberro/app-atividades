import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { Carregando, Erro, Vazio } from '../components/Estado';
import { PrioridadePill, StatusPill } from '../components/Pills';
import ItemDetailModal from '../components/ItemDetailModal';
import CardRotina from '../components/RotinaCard';
import type { Item } from '../api/types';
import { hojeLocalISO } from '../utils/data';

export default function Hoje() {
  const queryClient = useQueryClient();
  const [novoTitulo, setNovoTitulo] = useState('');
  const [itemSelecionado, setItemSelecionado] = useState<Item | null>(null);
  const dataHoje = hojeLocalISO();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['dashboard-semana'],
    queryFn: api.dashboardSemana,
  });

  const habitosHojeQuery = useQuery({
    queryKey: ['habitos-hoje', dataHoje],
    queryFn: () => api.habitosHoje(dataHoje),
  });

  const toggleCheckinHabito = useMutation({
    mutationFn: ({ id, valor }: { id: string; valor: boolean }) =>
      api.alternarCheckinHabito(id, dataHoje, valor),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['habitos-hoje', dataHoje] }),
  });

  const rotinasHojeQuery = useQuery({
    queryKey: ['rotinas', dataHoje, { ativo: true }],
    queryFn: () => api.listarRotinas(dataHoje, true),
  });

  const criarMutation = useMutation({
    mutationFn: (titulo: string) => api.criarItem({ titulo, status: 'Pendente', priorizadoHoje: true }),
    onSuccess: () => {
      setNovoTitulo('');
      queryClient.invalidateQueries({ queryKey: ['dashboard-semana'] });
      queryClient.invalidateQueries({ queryKey: ['itens'] });
    },
  });

  const togglePriorizado = useMutation({
    mutationFn: ({ id, valor }: { id: string; valor: boolean }) =>
      api.alternarPriorizadoHoje(id, valor),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['dashboard-semana'] }),
  });

  if (isLoading) return <Carregando texto="Carregando o resumo de hoje..." />;
  if (isError) return <Erro mensagem={(error as Error).message} />;

  const { temasEmFoco = [], itensHoje = [] } = data ?? { temasEmFoco: [], itensHoje: [] };

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="text-2xl font-semibold">Bom dia, Cleber 👋</h1>
        <p className="mt-1 text-sm text-text-muted">
          Aqui está o que está em foco esta semana e priorizado para hoje.
        </p>
      </header>

      <section
        className="card p-4"
        aria-label="Adicionar item rapidamente"
      >
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-text-muted">
          Adicionar rápido (fica priorizado para hoje)
        </h2>
        <form
          className="flex flex-col gap-3 sm:flex-row"
          onSubmit={(e) => {
            e.preventDefault();
            if (novoTitulo.trim()) criarMutation.mutate(novoTitulo.trim());
          }}
        >
          <input
            className="input-base flex-1"
            placeholder="Ex.: Validar proposta do fornecedor X"
            value={novoTitulo}
            onChange={(e) => setNovoTitulo(e.target.value)}
          />
          <button
            type="submit"
            disabled={criarMutation.isPending || !novoTitulo.trim()}
            className="rounded-lg bg-accent-primary px-4 py-2 text-sm font-semibold text-white transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {criarMutation.isPending ? 'Adicionando...' : 'Adicionar'}
          </button>
        </form>
        {criarMutation.isError && (
          <p className="mt-2 text-xs text-status-bloqueada">
            {(criarMutation.error as Error).message}
          </p>
        )}
      </section>

      <section className="rounded-2xl border border-white/10 bg-bg-surface/30 p-4 sm:p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Temas em foco esta semana</h2>
          <Link to="/temas" className="text-sm text-accent-secondary hover:underline">
            ver todos os temas →
          </Link>
        </div>
        {temasEmFoco.length === 0 ? (
          <Vazio texto="Nenhum tema marcado como foco da semana ainda. Vá em Temas e ative o toggle 'Focar esta semana'." />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {temasEmFoco.map((tema) => (
              <Link
                key={tema.id}
                to={`/temas/${tema.id}`}
                className="card card-hover flex flex-col gap-2 p-4"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{tema.nome}</span>
                  <PrioridadePill prioridade={tema.prioridade} />
                </div>
                <p className="line-clamp-2 text-xs text-text-muted">{tema.descricao}</p>
                <div className="mt-1 flex items-center justify-between text-xs">
                  <span className="text-text-muted">{tema.categoria}</span>
                  <span className="pill bg-status-pendente/20 text-status-pendente">
                    {tema.itensPendentes} pendente(s)
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-white/10 bg-bg-surface/30 p-4 sm:p-5">
        <h2 className="mb-3 text-lg font-semibold">Priorizado para hoje</h2>
        {itensHoje.length === 0 ? (
          <Vazio texto="Nada priorizado para hoje ainda. Use a Tabela, o Kanban ou o detalhe de um item para marcar 'Priorizar para hoje'." />
        ) : (
          <ul className="flex flex-col gap-2">
            {itensHoje.map((item) => (
              <li
                key={item.id}
                onClick={() => setItemSelecionado(item)}
                className="card card-hover flex cursor-pointer items-center justify-between gap-3 p-3"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <input
                    type="checkbox"
                    checked={item.priorizadoHoje}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) =>
                      togglePriorizado.mutate({ id: item.id, valor: e.target.checked })
                    }
                    className="h-4 w-4 accent-accent-primary"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{item.titulo}</p>
                    <p className="truncate text-xs text-text-muted">{item.responsavel || 'Sem responsável'}</p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <PrioridadePill prioridade={item.prioridade} />
                  <StatusPill status={item.status} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-white/10 bg-bg-surface/30 p-4 sm:p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Hábitos de hoje</h2>
          <Link to="/habitos" className="text-sm text-accent-secondary hover:underline">
            gerenciar hábitos →
          </Link>
        </div>
        {habitosHojeQuery.isLoading ? (
          <Carregando texto="Carregando hábitos..." />
        ) : habitosHojeQuery.isError ? (
          <Erro mensagem={(habitosHojeQuery.error as Error).message} />
        ) : (habitosHojeQuery.data ?? []).length === 0 ? (
          <Vazio texto="Nenhum hábito previsto para hoje. Cadastre hábitos em 'gerenciar hábitos'." />
        ) : (
          <ul className="flex flex-col gap-2">
            {(habitosHojeQuery.data ?? []).map((habito) => (
              <li key={habito.id} className="card flex items-center justify-between gap-3 p-3">
                <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3">
                  <input
                    type="checkbox"
                    checked={habito.concluidoHoje}
                    onChange={(e) =>
                      toggleCheckinHabito.mutate({ id: habito.id, valor: e.target.checked })
                    }
                    className="h-4 w-4 accent-accent-primary"
                  />
                  <div className="min-w-0">
                    <p
                      className={`truncate text-sm font-medium ${
                        habito.concluidoHoje ? 'text-text-muted line-through' : ''
                      }`}
                    >
                      {habito.titulo}
                    </p>
                    {habito.descricao && (
                      <p className="truncate text-xs text-text-muted">{habito.descricao}</p>
                    )}
                  </div>
                </label>
                {habito.horario && (
                  <span className="pill shrink-0 bg-accent-secondary/20 text-accent-secondary">
                    {habito.horario}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-white/10 bg-bg-surface/30 p-4 sm:p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Rotinas de hoje</h2>
          <Link to="/rotinas" className="text-sm text-accent-secondary hover:underline">
            gerenciar rotinas →
          </Link>
        </div>
        {rotinasHojeQuery.isLoading ? (
          <Carregando texto="Carregando rotinas..." />
        ) : rotinasHojeQuery.isError ? (
          <Erro mensagem={(rotinasHojeQuery.error as Error).message} />
        ) : (rotinasHojeQuery.data ?? []).length === 0 ? (
          <Vazio texto="Nenhuma rotina ativa cadastrada ainda. Cadastre em 'gerenciar rotinas'." />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(rotinasHojeQuery.data ?? []).map((rotina) => (
              <CardRotina key={rotina.id} rotina={rotina} dataHoje={dataHoje} />
            ))}
          </div>
        )}
      </section>

      {itemSelecionado && (
        <ItemDetailModal item={itemSelecionado} onClose={() => setItemSelecionado(null)} />
      )}
    </div>
  );
}
