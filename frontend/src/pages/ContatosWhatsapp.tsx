import { useState, FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { Carregando, Erro, Vazio } from '../components/Estado';

export default function ContatosWhatsapp() {
  const queryClient = useQueryClient();
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [apiKeyCallMeBot, setApiKeyCallMeBot] = useState('');

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['whatsapp-contatos'],
    queryFn: api.listarContatosWhatsapp,
  });

  const criar = useMutation({
    mutationFn: () => api.criarContatoWhatsapp({ nome: nome.trim(), telefone: telefone.trim(), apiKeyCallMeBot: apiKeyCallMeBot.trim() }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-contatos'] });
      setNome('');
      setTelefone('');
      setApiKeyCallMeBot('');
    },
  });

  const toggleAtivo = useMutation({
    mutationFn: ({ id, ativo }: { id: string; ativo: boolean }) => api.atualizarContatoWhatsapp(id, { ativo }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['whatsapp-contatos'] }),
  });

  const excluir = useMutation({
    mutationFn: (id: string) => api.excluirContatoWhatsapp(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['whatsapp-contatos'] }),
    onError: (err: Error) => window.alert(err.message),
  });

  function confirmarExclusao(id: string, nomeContato: string) {
    if (window.confirm(`Remover o contato "${nomeContato}"? Ele deixa de receber avisos de itens vencidos.`)) {
      excluir.mutate(id);
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!nome.trim() || !telefone.trim() || !apiKeyCallMeBot.trim()) return;
    criar.mutate();
  }

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-semibold">Contatos WhatsApp</h1>
        <p className="mt-1 text-sm text-text-muted">
          Pessoas que podem receber avisos de itens com prazo vencido pelo WhatsApp. Vincule um contato a
          um item no popup de detalhe do item, em "Notificar por WhatsApp".
        </p>
      </header>

      <div className="card flex flex-col gap-2 p-4 text-sm text-text-muted">
        <p className="font-medium text-text-primary">Como conseguir a ApiKey do CallMeBot (grátis)</p>
        <ol className="list-decimal space-y-1 pl-5">
          <li>
            Adicione o número{' '}
            <span className="font-mono text-text-primary">+34 644 59 71 65</span> aos contatos do celular
            que vai receber os avisos.
          </li>
          <li>
            Pelo WhatsApp desse celular, envie a mensagem{' '}
            <span className="font-mono text-text-primary">"I allow callmebot to send me messages"</span>{' '}
            para esse número.
          </li>
          <li>Em poucos segundos o bot responde com uma ApiKey — cole ela no formulário abaixo.</li>
        </ol>
      </div>

      <form onSubmit={handleSubmit} className="card flex flex-col gap-3 p-4 sm:max-w-xl">
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
            <label className="mb-1 block text-xs font-medium text-text-muted">
              Telefone * <span className="font-normal normal-case text-text-muted/70">(DDI+DDD, só números)</span>
            </label>
            <input
              className="input-base w-full"
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
              placeholder="5511999998888"
              required
            />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-text-muted">ApiKey do CallMeBot *</label>
          <input
            className="input-base w-full"
            value={apiKeyCallMeBot}
            onChange={(e) => setApiKeyCallMeBot(e.target.value)}
            placeholder="Recebida por WhatsApp após o passo a passo acima"
            required
          />
        </div>
        <button
          type="submit"
          disabled={criar.isPending || !nome.trim() || !telefone.trim() || !apiKeyCallMeBot.trim()}
          className="mt-1 self-start rounded-lg bg-accent-primary px-4 py-2 text-sm font-semibold text-white transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {criar.isPending ? 'Salvando...' : 'Adicionar contato'}
        </button>
        {criar.isError && <p className="text-xs text-status-bloqueada">{(criar.error as Error).message}</p>}
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
            <li
              key={contato.id}
              className="card flex flex-wrap items-center justify-between gap-2 p-3"
            >
              <div className={contato.ativo ? '' : 'text-text-muted line-through'}>
                <p className="text-sm font-medium">{contato.nome}</p>
                <p className="text-xs text-text-muted">{contato.telefone}</p>
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
    </div>
  );
}
