import type { Item } from '../api/types';

export const RANK_PRIORIDADE: Record<string, number> = { Alta: 3, 'Média': 2, Baixa: 1 };

export type CriterioOrdenacao = 'padrao' | 'prioridade' | 'prazo';

/** Ordena itens por prioridade (Alta > Média > Baixa) ou por prazo (mais próximo primeiro, sem prazo por último). */
export function ordenarItens<T extends Pick<Item, 'prioridade' | 'prazo'>>(
  itens: T[],
  criterio: CriterioOrdenacao
): T[] {
  if (criterio === 'padrao') return itens;

  const copia = [...itens];
  if (criterio === 'prioridade') {
    copia.sort((a, b) => (RANK_PRIORIDADE[b.prioridade ?? ''] ?? 0) - (RANK_PRIORIDADE[a.prioridade ?? ''] ?? 0));
  } else {
    copia.sort((a, b) => {
      if (!a.prazo && !b.prazo) return 0;
      if (!a.prazo) return 1;
      if (!b.prazo) return -1;
      return a.prazo.localeCompare(b.prazo);
    });
  }
  return copia;
}
