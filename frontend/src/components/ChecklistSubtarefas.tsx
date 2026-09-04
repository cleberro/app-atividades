import { useState, KeyboardEvent } from 'react';
import { contarConcluidas, parseSubtarefas, serializarSubtarefas } from '../utils/subtarefas';

interface ChecklistSubtarefasProps {
  /** Conteúdo bruto do campo "O Que Precisa Ser Feito" (uma linha por sub-tarefa). */
  valor: string;
  onChange: (valor: string) => void;
}

/**
 * Editor de checklist do campo "O que precisa ser feito". Trabalha sempre
 * sobre o texto bruto (parse na entrada, serialização na saída), de modo que
 * o dono do estado continua sendo o formulário — nenhum estado de lista
 * duplicado que possa divergir do item.
 */
export default function ChecklistSubtarefas({ valor, onChange }: ChecklistSubtarefasProps) {
  const [novaTarefa, setNovaTarefa] = useState('');
  const subtarefas = parseSubtarefas(valor);
  const concluidas = contarConcluidas(subtarefas);

  function aplicar(lista: typeof subtarefas) {
    onChange(serializarSubtarefas(lista));
  }

  function adicionar() {
    const texto = novaTarefa.trim();
    if (!texto) return;
    aplicar([...subtarefas, { texto, concluida: false }]);
    setNovaTarefa('');
  }

  function alternar(indice: number) {
    aplicar(subtarefas.map((s, i) => (i === indice ? { ...s, concluida: !s.concluida } : s)));
  }

  function editar(indice: number, texto: string) {
    aplicar(subtarefas.map((s, i) => (i === indice ? { ...s, texto } : s)));
  }

  function remover(indice: number) {
    aplicar(subtarefas.filter((_, i) => i !== indice));
  }

  function onEnter(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    adicionar();
  }

  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <label className="block text-xs font-medium text-text-muted">O que precisa ser feito</label>
        {subtarefas.length > 0 && (
          <span className={`text-xs ${concluidas === subtarefas.length ? 'text-status-concluida' : 'text-text-muted'}`}>
            {concluidas}/{subtarefas.length} concluídas
          </span>
        )}
      </div>

      {subtarefas.length > 0 && (
        <ul className="mb-2 flex flex-col gap-1.5">
          {subtarefas.map((subtarefa, indice) => (
            <li key={indice} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={subtarefa.concluida}
                onChange={() => alternar(indice)}
                className="h-4 w-4 shrink-0 accent-accent-primary"
                aria-label={`Concluir "${subtarefa.texto}"`}
              />
              <input
                className={`input-base w-full py-1 text-sm ${
                  subtarefa.concluida ? 'text-text-muted line-through' : ''
                }`}
                value={subtarefa.texto}
                onChange={(e) => editar(indice, e.target.value)}
              />
              <button
                type="button"
                onClick={() => remover(indice)}
                className="shrink-0 rounded-lg px-2 py-1 text-xs text-text-muted hover:text-status-bloqueada"
                aria-label={`Remover "${subtarefa.texto}"`}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex gap-2">
        <input
          className="input-base w-full py-1 text-sm"
          placeholder="Adicionar sub-tarefa e pressionar Enter"
          value={novaTarefa}
          onChange={(e) => setNovaTarefa(e.target.value)}
          onKeyDown={onEnter}
        />
        <button
          type="button"
          onClick={adicionar}
          disabled={!novaTarefa.trim()}
          className="shrink-0 rounded-lg bg-bg-elevated px-3 py-1 text-sm font-medium text-text-primary hover:bg-bg-elevated/70 disabled:cursor-not-allowed disabled:opacity-50"
        >
          + Add
        </button>
      </div>
    </div>
  );
}
