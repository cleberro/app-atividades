import { useState, FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { Carregando, Erro, Vazio } from './Estado';
import type { ContatoEmail } from '../api/types';

export default function ContatosEmailSection() {
  const queryClient = useQueryClient();
  const [contatoEditando, setContatoEditando] = useState<ContatoEmail | null>(null);
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['email-contatos'],
    queryFn: api.listarContatosEmail,
  });

  function limparFormulario() {
    setContatoEditando(null);
    setNome('');
    setEmail('');
  }

  function iniciarEdicao(contato: ContatoEmail) {
    setContatoEditando(contato);
    setNome(contato.nome);
    setEmail(contato.email);
  }

  const salvar = useMutation({
    mutationFn: () => {
      const dados = { nome: nome.trim(), email: email.trim() };
      return contatoEditando
        ? api.atualizarContatoEmail(contatoEditando.id, dados)
        : api.criarContatoEmail(dados);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-contatos'] });
      limparFormulario();
    },
  });

  const toggleAtivo = useMutation({
    mutationFn: ({ id, ativo }: { id: string; ativo: boolean }) => api.atualizarContatoEmail(id, { ativo }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['email-contatos'] }),
  });

  const excluir = useMutation({
    mutationFn: (id: string) => api.excluirContatoEmail(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ['email-contatos'] });
      if (contatoEditando?.id === id) limparFormulario();
    },
    onError: (err: Error) => window.alert(err.message),
  });

  function confirmarExclusao(id: string, nomeContato: string) {
    if (window.confirm(`Remover o contato "${nomeContato}"? Ele deixa de receber itens por e-mail.`)) {
      excluir.mutate(id);
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!nome.trim() || !email.trim()) return;
    salvar.mutate();
  }

  return (
    <section className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold">Contatos E-mail</h2>
        <p className="mt-1 text-sm text-text-muted">
          Pessoas que podem receber itens por e-mail. Vincule um contato a um item no popup de detalhe do
          item, em "Notificar por E-mail". Sem passo de autorização — diferente do WhatsApp, e-mail não
          exige opt-in prévio.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="card flex flex-col gap-3 p-4 sm:max-w-xl">
        {contatoEditando && (
          <p className="text-xs font-medium text-accent-secondary">Editando "{contatoEditando.nome}"</p>
        )}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-text-muted">Nome *</label>
            <input
              className="input-base w-full"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex.: Cleber"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-text-muted">E-mail *</label>
            <input
              type="email"
              className="input-base w-full"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nome@empresa.com"
              required
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="submit"
            disabled={salvar.isPending || !nome.trim() || !email.trim()}
            className="self-start rounded-lg bg-accent-primary px-4 py-2 text-sm font-semibold text-white transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {salvar.isPending ? 'Salvando...' : contatoEditando ? 'Salvar alterações' : 'Adicionar contato'}
          </button>
          {contatoEditando && (
            <button
              type="button"
              onClick={limparFormulario}
              className="rounded-lg px-3 py-2 text-sm font-medium text-text-muted hover:text-text-primary"
            >
              Cancelar
            </button>
          )}
        </div>
        {salvar.isError && <p className="text-xs text-status-bloqueada">{(salvar.error as Error).message}</p>}
      </form>

      {isLoading ? (
        <Carregando texto="Carregando contatos..." />
      ) : isError ? (
        <Erro mensagem={(error as Error).message} />
      ) : (data ?? []).length === 0 ? (
        <Vazio texto="Nenhum contato cadastrado ainda." />
      ) : (
        <ul className="flex flex-col gap-2 sm:max-w-xl">
          {(data ?? []).map((contato) => (
            <li key={contato.id} className="card flex flex-wrap items-center justify-between gap-2 p-3">
              <div className={contato.ativo ? '' : 'text-text-muted line-through'}>
                <p className="text-sm font-medium">{contato.nome}</p>
                <p className="text-xs text-text-muted">{contato.email}</p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <label className="flex cursor-pointer items-center gap-1 text-xs text-text-muted">
                  <input
                    type="checkbox"
                    checked={contato.ativo}
                    onChange={(e) => toggleAtivo.mutate({ id: contato.id, ativo: e.target.checked })}
                    className="h-3.5 w-3.5 accent-accent-primary"
                  />
                  Ativo
                </label>
                <button
                  onClick={() => iniciarEdicao(contato)}
                  aria-label={`Editar contato ${contato.nome}`}
                  className="text-xs font-medium text-text-muted hover:text-text-primary"
                >
                  Editar
                </button>
                <button
                  onClick={() => confirmarExclusao(contato.id, contato.nome)}
                  disabled={excluir.isPending}
                  aria-label={`Remover contato ${contato.nome}`}
                  className="text-xs font-medium text-status-bloqueada hover:underline disabled:cursor-not-allowed disabled:opacity-50"
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
