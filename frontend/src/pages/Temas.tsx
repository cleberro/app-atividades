import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { Carregando, Erro, Vazio } from '../components/Estado';
import { PrioridadePill } from '../components/Pills';
import { PRIORIDADE_OPCOES } from '../api/types';
import MultiSelectFiltro, { FILTRO_MULTI_VAZIO, passaFiltroMulti, type FiltroMultiValor } from '../components/MultiSelectFiltro';
import TemaForm from '../components/TemaForm';

export default function Temas() {
  const queryClient = useQueryClient();
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<FiltroMultiValor>(FILTRO_MULTI_VAZIO);
  const [filtroCategoria, setFiltroCategoria] = useState<FiltroMultiValor>(FILTRO_MULTI_VAZIO);
  const [filtroPrioridade, setFiltroPrioridade] = useState<FiltroMultiValor>(FILTRO_MULTI_VAZIO);
  const [mostrarForm, setMostrarForm] = useState(false);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['temas'],
    queryFn: api.listarTemas,
  });

  const toggleFoco = useMutation({
    mutationFn: ({ id, valor }: { id: string; valor: boolean }) =>
      api.alternarFocoSemana(id, valor),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['temas'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-semana'] });
    },
  });

  const excluirTema = useMutation({
    mutationFn: (id: string) => api.excluirTema(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['temas'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-semana'] });
    },
    onError: (err: Error) => window.alert(err.message),
  });

  function confirmarExclusao(id: string, nome: string) {
    if (window.confirm(`Excluir o tema "${nome}"? Ele será movido para a lixeira do Notion.`)) {
      excluirTema.mutate(id);
    }
  }

  const categorias = useMemo(() => {
    const set = new Set<string>();
    (data ?? []).forEach((t) => t.categoria && set.add(t.categoria));
    return Array.from(set).sort();
  }, [data]);

  const statusDisponiveis = useMemo(() => {
    const set = new Set<string>();
    (data ?? []).forEach((t) => t.status && set.add(t.status));
    return Array.from(set).sort();
  }, [data]);

  const temas = useMemo(() => {
    return (data ?? [])
      .slice()
      .sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0))
      .filter((t) => passaFiltroMulti(t.status, filtroStatus))
      .filter((t) => passaFiltroMulti(t.categoria, filtroCategoria))
      .filter((t) => passaFiltroMulti(t.prioridade, filtroPrioridade))
      .filter((t) => (busca ? t.nome.toLowerCase().includes(busca.toLowerCase()) : true));
  }, [data, filtroStatus, filtroCategoria, filtroPrioridade, busca]);

  if (isLoading) return <Carregando texto="Carregando temas..." />;
  if (isError) return <Erro mensagem={(error as Error).message} />;

  const temFiltroAtivo = !!(
    busca ||
    filtroStatus.valores.length ||
    filtroCategoria.valores.length ||
    filtroPrioridade.valores.length
  );

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Temas de TI</h1>
          <p className="mt-1 text-sm text-text-muted">
            {temas.length} tema(s). Marque "Focar esta semana" para destacar na tela Hoje.
          </p>
        </div>
        <button
          onClick={() => setMostrarForm((v) => !v)}
          className="shrink-0 rounded-lg bg-accent-primary px-4 py-2 text-sm font-semibold text-white transition-transform hover:-translate-y-0.5"
        >
          {mostrarForm ? 'Fechar' : '+ Novo Tema'}
        </button>
      </header>

      {mostrarForm && <TemaForm onSucesso={() => setMostrarForm(false)} />}

      <div className="card flex flex-wrap items-center gap-3 p-3">
        <input
          className="input-base min-w-[180px] flex-1"
          placeholder="Buscar por nome do tema..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
        <MultiSelectFiltro
          label="Status"
          opcoes={statusDisponiveis.map((op) => ({ value: op, label: op }))}
          valor={filtroStatus}
          onChange={setFiltroStatus}
        />
        <MultiSelectFiltro
          label="Categoria"
          opcoes={categorias.map((op) => ({ value: op, label: op }))}
          valor={filtroCategoria}
          onChange={setFiltroCategoria}
        />
        <MultiSelectFiltro
          label="Prioridade"
          opcoes={PRIORIDADE_OPCOES.map((op) => ({ value: op, label: op }))}
          valor={filtroPrioridade}
          onChange={setFiltroPrioridade}
        />
        {temFiltroAtivo && (
          <button
            onClick={() => {
              setBusca('');
              setFiltroStatus(FILTRO_MULTI_VAZIO);
              setFiltroCategoria(FILTRO_MULTI_VAZIO);
              setFiltroPrioridade(FILTRO_MULTI_VAZIO);
            }}
            className="rounded-lg bg-bg-elevated px-3 py-2 text-sm font-medium text-text-muted hover:text-text-primary"
          >
            Limpar filtros
          </button>
        )}
      </div>

      {temas.length === 0 ? (
        <Vazio texto="Nenhum tema encontrado com os filtros atuais." />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {temas.map((tema) => (
            <div key={tema.id} className="card flex flex-col gap-3 p-4">
              <div className="flex items-start justify-between gap-2">
                <Link to={`/temas/${tema.id}`} className="font-semibold hover:text-accent-secondary">
                  {tema.nome}
                </Link>
                <div className="flex shrink-0 items-center gap-2">
                  <PrioridadePill prioridade={tema.prioridade} />
                  <button
                    onClick={() => confirmarExclusao(tema.id, tema.nome)}
                    disabled={excluirTema.isPending}
                    aria-label={`Excluir tema ${tema.nome}`}
                    className="rounded-lg px-2 py-1 text-xs font-medium text-status-bloqueada hover:bg-status-bloqueada/15 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Excluir
                  </button>
                </div>
              </div>
              <p className="line-clamp-3 text-xs text-text-muted">{tema.descricao}</p>
              <div className="flex flex-wrap items-center gap-2 text-xs text-text-muted">
                {tema.categoria && <span className="pill bg-bg-elevated">{tema.categoria}</span>}
                {tema.status && <span className="pill bg-bg-elevated">{tema.status}</span>}
                <span className="pill bg-status-pendente/20 text-status-pendente">
                  {tema.itensPendentes} pendente(s)
                </span>
              </div>
              <label className="mt-2 flex cursor-pointer items-center justify-between rounded-lg bg-bg-elevated px-3 py-2 text-sm">
                <span>Focar esta semana</span>
                <input
                  type="checkbox"
                  checked={tema.focoDaSemana}
                  onChange={(e) => toggleFoco.mutate({ id: tema.id, valor: e.target.checked })}
                  className="h-4 w-4 accent-accent-primary"
                />
              </label>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
