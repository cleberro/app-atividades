import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { Carregando, Erro, Vazio } from '../components/Estado';
import HabitoForm from '../components/HabitoForm';

function ultimosDiasISO(quantidade: number): string[] {
  return Array.from({ length: quantidade }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (quantidade - 1 - i));
    const ano = d.getFullYear();
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const dia = String(d.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
  });
}

function HistoricoHabito({ habitoId }: { habitoId: string }) {
  const DIAS = 14;
  const { data, isLoading } = useQuery({
    queryKey: ['habito-historico', habitoId],
    queryFn: () => api.historicoHabito(habitoId, DIAS),
  });

  if (isLoading) return <p className="text-xs text-text-muted">Carregando histórico...</p>;

  const datasConcluidas = new Set(data?.datasConcluidas ?? []);

  return (
    <div className="flex gap-1">
      {ultimosDiasISO(DIAS).map((data) => (
        <span
          key={data}
          title={data}
          className={`h-4 w-4 rounded-sm ${
            datasConcluidas.has(data) ? 'bg-status-concluida' : 'bg-bg-elevated'
          }`}
        />
      ))}
    </div>
  );
}

export default function Habitos() {
  const queryClient = useQueryClient();
  const [mostrarForm, setMostrarForm] = useState(false);
  const [expandido, setExpandido] = useState<string | null>(null);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['habitos'],
    queryFn: () => api.listarHabitos(),
  });

  const toggleAtivo = useMutation({
    mutationFn: ({ id, ativo }: { id: string; ativo: boolean }) => api.atualizarHabito(id, { ativo }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['habitos'] }),
  });

  const excluirHabito = useMutation({
    mutationFn: (id: string) => api.excluirHabito(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['habitos'] }),
    onError: (err: Error) => window.alert(err.message),
  });

  function confirmarExclusao(id: string, titulo: string) {
    if (window.confirm(`Excluir o hábito "${titulo}"? Ele será movido para a lixeira do Notion.`)) {
      excluirHabito.mutate(id);
    }
  }

  if (isLoading) return <Carregando texto="Carregando hábitos..." />;
  if (isError) return <Erro mensagem={(error as Error).message} />;

  const habitos = (data ?? []).slice().sort((a, b) => a.titulo.localeCompare(b.titulo));

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Hábitos</h1>
          <p className="mt-1 text-sm text-text-muted">
            {habitos.length} hábito(s) cadastrado(s). Defina os dias da semana e o horário em que cada um
            deve ocorrer.
          </p>
        </div>
        <button
          onClick={() => setMostrarForm((v) => !v)}
          className="shrink-0 rounded-lg bg-accent-primary px-4 py-2 text-sm font-semibold text-white transition-transform hover:-translate-y-0.5"
        >
          {mostrarForm ? 'Fechar' : '+ Novo Hábito'}
        </button>
      </header>

      {mostrarForm && <HabitoForm onSucesso={() => setMostrarForm(false)} />}

      {habitos.length === 0 ? (
        <Vazio texto="Nenhum hábito cadastrado ainda." />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {habitos.map((habito) => (
            <div key={habito.id} className={`card flex flex-col gap-3 p-4 ${habito.ativo ? '' : 'opacity-60'}`}>
              <div className="flex items-start justify-between gap-2">
                <span className="font-semibold">{habito.titulo}</span>
                <button
                  onClick={() => confirmarExclusao(habito.id, habito.titulo)}
                  disabled={excluirHabito.isPending}
                  aria-label={`Excluir hábito ${habito.titulo}`}
                  className="rounded-lg px-2 py-1 text-xs font-medium text-status-bloqueada hover:bg-status-bloqueada/15 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Excluir
                </button>
              </div>

              {habito.descricao && <p className="line-clamp-2 text-xs text-text-muted">{habito.descricao}</p>}

              <div className="flex flex-wrap items-center gap-2 text-xs text-text-muted">
                {habito.diasSemana.length === 0 && <span className="pill bg-bg-elevated">Sem dias definidos</span>}
                {habito.diasSemana.map((dia) => (
                  <span key={dia} className="pill bg-bg-elevated">
                    {dia.slice(0, 3)}
                  </span>
                ))}
                {habito.horario && (
                  <span className="pill bg-accent-secondary/20 text-accent-secondary">{habito.horario}</span>
                )}
              </div>

              <label className="mt-1 flex cursor-pointer items-center justify-between rounded-lg bg-bg-elevated px-3 py-2 text-sm">
                <span>Ativo</span>
                <input
                  type="checkbox"
                  checked={habito.ativo}
                  onChange={(e) => toggleAtivo.mutate({ id: habito.id, ativo: e.target.checked })}
                  className="h-4 w-4 accent-accent-primary"
                />
              </label>

              <button
                type="button"
                onClick={() => setExpandido((atual) => (atual === habito.id ? null : habito.id))}
                className="self-start text-xs text-accent-secondary hover:underline"
              >
                {expandido === habito.id ? 'Ocultar histórico' : 'Ver histórico (14 dias)'}
              </button>
              {expandido === habito.id && <HistoricoHabito habitoId={habito.id} />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
