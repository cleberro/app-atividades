export function Carregando({ texto = 'Carregando...' }: { texto?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-text-muted">
      <div className="h-5 w-5 animate-spin rounded-full border-2 border-accent-primary border-t-transparent" />
      <span>{texto}</span>
    </div>
  );
}

export function Erro({ mensagem }: { mensagem: string }) {
  return (
    <div className="card border border-status-bloqueada/40 bg-status-bloqueada/10 p-4 text-sm text-text-primary">
      <p className="font-semibold text-status-bloqueada">Não foi possível carregar os dados</p>
      <p className="mt-1 text-text-muted">{mensagem}</p>
      <p className="mt-2 text-text-muted">
        Se a mensagem mencionar autenticação, verifique o arquivo <code>.env</code> do backend
        (variável <code>NOTION_API_KEY</code>) — veja o README do projeto.
      </p>
    </div>
  );
}

export function Vazio({ texto }: { texto: string }) {
  return <div className="py-12 text-center text-sm text-text-muted">{texto}</div>;
}
