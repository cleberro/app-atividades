import { useState, FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { Carregando, Erro, Vazio } from '../components/Estado';
import RotinaForm from '../components/RotinaForm';
import CardRotina from '../components/RotinaCard';
import type { RotinaComProgresso } from '../api/types';
import { hojeLocalISO } from '../utils/data';

function Destinatarios() {
  const queryClient = useQueryClient();
  const [email, setEmail] = useState('');

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['rotinas-destinatarios'],
    queryFn: api.listarDestinatarios,
  });

  const criar = useMutation({
    mutationFn: (email: string) => api.criarDestinatario(email),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rotinas-destinatarios'] });
      setEmail('');
    },
  });

  const toggleAtivo = useMutation({
    mutationFn: ({ id, ativo }: { id: string; ativo: boolean }) => api.atualizarDestinatario(id, { ativo }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['rotinas-destinatarios'] }),
  });

  const excluir = useMutation({
    mutationFn: (id: string) => api.excluirDestinatario(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['rotinas-destinatarios'] }),
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    criar.mutate(email.trim());
  }

  return (
    <section className="card flex flex-col gap-3 p-4">
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-text-muted">
          Destinatários do resumo diário
        </h2>
        <p className="mt-1 text-xs text-text-muted">
          Todo dia, um e-mail com o resumo das rotinas do dia anterior é enviado para os endereços ativos
          abaixo.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="email"
          className="input-base flex-1"
          placeholder="nome@empresa.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <button
          type="submit"
          disabled={criar.isPending || !email.trim()}
          className="rounded-lg bg-accent-primary px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          Adicionar
        </button>
      </form>
      {criar.isError && <p className="text-xs text-status-bloqueada">{(criar.error as Error).message}</p>}

      {isLoading ? (
        <Carregando texto="Carregando destinatários..." />
      ) : isError ? (
        <Erro mensagem={(error as Error).message} />
      ) : (data ?? []).length === 0 ? (
        <p className="text-xs text-text-muted">Nenhum destinatário cadastrado ainda.</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {(data ?? []).map((d) => (
            <li key={d.id} className="flex items-center justify-between gap-2 rounded-lg bg-bg-elevated px-3 py-2 text-sm">
              <span className={d.ativo ? '' : 'text-text-muted line-through'}>{d.email}</span>
              <div className="flex shrink-0 items-center gap-2">
                <label className="flex cursor-pointer items-center gap-1 text-xs text-text-muted">
                  <input
                    type="checkbox"
                    checked={d.ativo}
                    onChange={(e) => toggleAtivo.mutate({ id: d.id, ativo: e.target.checked })}
                    className="h-3.5 w-3.5 accent-accent-primary"
                  />
                  Ativo
                </label>
                <button
                  onClick={() => excluir.mutate(d.id)}
                  aria-label={`Remover destinatário ${d.email}`}
                  className="text-xs font-medium text-status-bloqueada hover:underline"
                >
                  Remover
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default function Rotinas() {
  const dataHoje = hojeLocalISO();
  const [formAberto, setFormAberto] = useState<'novo' | RotinaComProgresso | null>(null);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['rotinas', dataHoje],
    queryFn: () => api.listarRotinas(dataHoje),
  });

  if (isLoading) return <Carregando texto="Carregando rotinas..." />;
  if (isError) return <Erro mensagem={(error as Error).message} />;

  const rotinas = (data ?? []).slice().sort((a, b) => a.nome.localeCompare(b.nome));

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Rotinas</h1>
          <p className="mt-1 text-sm text-text-muted">
            {rotinas.length} rotina(s). Aponte o tempo dedicado a cada uma — ao atingir o tempo total do
            período, novos apontamentos ficam bloqueados até o período seguinte.
          </p>
        </div>
        <button
          onClick={() => setFormAberto((v) => (v === 'novo' ? null : 'novo'))}
          className="shrink-0 rounded-lg bg-accent-primary px-4 py-2 text-sm font-semibold text-white transition-transform hover:-translate-y-0.5"
        >
          {formAberto === 'novo' ? 'Fechar' : '+ Nova Rotina'}
        </button>
      </header>

      {formAberto === 'novo' && <RotinaForm onSucesso={() => setFormAberto(null)} />}
      {formAberto && formAberto !== 'novo' && (
        <RotinaForm rotinaEditando={formAberto} onSucesso={() => setFormAberto(null)} />
      )}

      {rotinas.length === 0 ? (
        <Vazio texto="Nenhuma rotina cadastrada ainda." />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rotinas.map((rotina) => (
            <CardRotina
              key={rotina.id}
              rotina={rotina}
              dataHoje={dataHoje}
              onEditar={() => setFormAberto(rotina)}
            />
          ))}
        </div>
      )}

      <Destinatarios />
    </div>
  );
}
