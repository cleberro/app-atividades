/**
 * O campo "O Que Precisa Ser Feito" é um texto simples no Notion, mas o app
 * o trata como checklist: cada linha no formato "[ ] tarefa" ou "[x] tarefa"
 * vira uma sub-tarefa. Linhas em qualquer outro formato são preservadas como
 * sub-tarefas não concluídas, para que texto escrito direto no Notion (ou
 * antes desta funcionalidade existir) nunca seja perdido.
 */
export interface Subtarefa {
  texto: string;
  concluida: boolean;
}

const LINHA_CHECKLIST = /^\s*\[([ xX])\]\s?(.*)$/;

/** Converte o texto do campo em uma lista de sub-tarefas. */
export function parseSubtarefas(conteudo: string | null | undefined): Subtarefa[] {
  if (!conteudo) return [];
  return conteudo
    .split('\n')
    .filter((linha) => linha.trim() !== '')
    .map((linha) => {
      const match = linha.match(LINHA_CHECKLIST);
      if (match) return { texto: match[2].trim(), concluida: match[1].toLowerCase() === 'x' };
      return { texto: linha.trim(), concluida: false };
    });
}

/** Converte a lista de sub-tarefas de volta para o texto salvo no Notion. */
export function serializarSubtarefas(subtarefas: Subtarefa[]): string {
  return subtarefas
    .filter((s) => s.texto.trim() !== '')
    .map((s) => `[${s.concluida ? 'x' : ' '}] ${s.texto.trim()}`)
    .join('\n');
}

/** Quantas sub-tarefas já foram concluídas, para o rótulo "3/7 concluídas". */
export function contarConcluidas(subtarefas: Subtarefa[]): number {
  return subtarefas.filter((s) => s.concluida).length;
}
