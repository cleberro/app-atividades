import { useState, FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { Carregando, Erro, Vazio } from '../components/Estado';
import RotinaForm from '../components/RotinaForm';
import type { RotinaComProgresso } from '../api/types';
import { hojeLocalISO } from '../utils/data';
import { formatarMinutos } from '../utils/tempo';

const COR_RECORRENCIA: Record<string, string> = {
  Diária: 'var(--accent-secondary)',
  Semanal: 'var(--status-pendente)',
  Mensal: 'var(--status-andamento)',
};

function ApontarTempoForm({
  rotina,
  dataHoje,
  onFechar,
}: {
  rotina: RotinaComProgresso;
  dataHoje: string;
  onFechar: () => void;
}) {
  const queryClient = useQueryClient();
  const [minutos, setMinutos] = useState('');
  const [observacao, setObservacao] = useState('');

  const mutation = useMutation({
    mutationFn: () => api.criarApontamento(rotina.id, { data: dataHoje, minutos: Number(minutos), observacao }),
    onSuccess: (resultado) => {
      queryClient.invalidateQueries({ queryKey: ['rotinas'] });
      setMinutos('');
      setObservacao('');
      if (resultado.atingiuTotal) {
        window.alert(
          `Você atingiu o tempo total (${formatarMinutos(resultado.tempoTotal)}) da rotina "${rotina.nome}" neste período. Não será possível registrar mais tempo até o próximo período.`
        );
      }
      onFechar();
    },
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!(Number(minutos) > 0)) return;
    mutation.mutate();
  }

  return (
    <form onSubmit={handleSubmit} className="mt-2 flex flex-col gap-2 rounded-lg bg-bg-elevated p-3">
      <div className="flex items-center gap-2">
        <input
          type="number"
          min={1}
          autoFocus
          className="input-base w-24"
          placeholder="min"
          value={minutos}
          onChange={(e) => setMinutos(e.target.value)}
        />
        <input
          className="input-base flex-1"
          placeholder="Observação (opcional)"
          value={observacao}
          onChange={(e) => setObservacao(e.target.value)}
        />
      </div>
      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={mutation.isPending || !(Number(minutos) > 0)}
          className="rounded-lg bg-accent-primary px-3 py-1.5 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {mutation.isPending ? 'Salvando...' : 'Registrar'}
        </button>
        <button
          type="button"
          onClick={onFechar}
          className="rounded-lg px-3 py-1.5 text-xs font-medium text-text-muted hover:text-text-primary"
        >
          Cancelar
        </button>
      </div>
      {mutation.isError && (
        <p className="text-xs text-status-bloqueada">{(mutation.error as Error).message}</p>
      )}
    </form>
  );
}

function CardRotina({
  rotina,
  dataHoje,
  onEditar,
}: {
  rotina: RotinaComProgresso;
  dataHoje: string;
  onEditar: () => void;
}) {
  const queryClient = useQueryClient();
  const [apontando, setApontando] = useState(false);

  const excluirRotina = useMutation({
    mutationFn: () => api.excluirRotina(rotina.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['rotinas'] }),
    onError: (err: Error) => window.alert(err.message),
  });

  function confirmarExclusao() {
    if (window.confirm(`Excluir a rotina "${rotina.nome}"? Ela será movida para a lixeira do Notion.`)) {
      excluirRotina.mutate();
    }
  }

  const percentual = rotina.tempoTotal > 0 ? Math.min(100, (rotina.tempoRealizado / rotina.tempoTotal) * 100) : 0;
  const cor = COR_RECORRENCIA[rotina.tipoRecorrencia] || 'var(--accent-primary)';

  return (
    <div className={`card flex flex-col gap-3 p-4 ${rotina.ativo ? '' : 'opacity-60'}`}>
      <div className="flex items-start justify-between gap-2">
        <span className="font-semibold">{rotina.nome}</span>
        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={onEditar}
            aria-label={`Editar rotina ${rotina.nome}`}
            className="rounded-lg px-2 py-1 text-xs font-medium text-text-muted hover:bg-bg-elevated hover:text-text-primary"
          >
            Editar
          </button>
          <button
            onClick={confirmarExclusao}
            disabled={excluirRotina.isPending}
            aria-label={`Excluir rotina ${rotina.nome}`}
            className="rounded-lg px-2 py-1 text-xs font-medium text-status-bloqueada hover:bg-status-bloqueada/15 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Excluir
          </button>
        </div>
      </div>

      <span className="pill w-fit" style={{ backgroundColor: `${cor}26`, color: cor }}>
        {rotina.tipoRecorrencia}
      </span>

      <div>
        <div className="mb-1 flex items-center justify-between text-xs text-text-muted">
          <span>
            {formatarMinutos(rotina.tempoRealizado)} de {formatarMinutos(rotina.tempoTotal)}
          </span>
          <span>{Math.round(percentual)}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-bg-elevated">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${percentual}%`,
              backgroundColor: rotina.atingiuTotal ? 'var(--status-concluida)' : cor,
            }}
          />
        </div>
      </div>

      {rotina.atingiuTotal ? (
        <p className="rounded-lg bg-status-concluida/15 px-3 py-2 text-xs font-medium text-status-concluida">
          Tempo total do período já foi atingido — novos apontamentos liberam no próximo período.
        </p>
      ) : apontando ? (
        <ApontarTempoForm rotina={rotina} dataHoje={dataHoje} onFechar={() => setApontando(false)} />
      ) : (
        <button
          onClick={() => setApontando(true)}
          className="self-start rounded-lg bg-bg-elevated px-3 py-1.5 text-xs font-semibold text-text-primary hover:bg-accent-primary hover:text-white"
        >
          + Apontar tempo
        </button>
      )}
    </div>
  );
}

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
