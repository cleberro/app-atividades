import type { Item } from '../api/types';
import { prazoEfetivo } from './prazo';

export const RANK_PRIORIDADE: Record<string, number> = { Alta: 3, 'Média': 2, Baixa: 1 };

export type CriterioOrdenacao = 'padrao' | 'prioridade' | 'prazo';

/**
 * Ordena itens por prioridade (Alta > Média > Baixa) ou por prazo (mais
 * próximo primeiro, sem prazo por último). A ordenação por prazo usa o
 * prazo efetivo — item reprogramado vai para a data nova.
 */
export function ordenarItens<T extends Pick<Item, 'prioridade' | 'prazo' | 'dataReprogramacao'>>(
  itens: T[],
  criterio: CriterioOrdenacao
): T[] {
  if (criterio === 'padrao') return itens;

  const copia = [...itens];
  if (criterio === 'prioridade') {
    copia.sort((a, b) => (RANK_PRIORIDADE[b.prioridade ?? ''] ?? 0) - (RANK_PRIORIDADE[a.prioridade ?? ''] ?? 0));
  } else {
    copia.sort((a, b) => {
      const prazoA = prazoEfetivo(a);
      const prazoB = prazoEfetivo(b);
      if (!prazoA && !prazoB) return 0;
      if (!prazoA) return 1;
      if (!prazoB) return -1;
      return prazoA.localeCompare(prazoB);
    });
  }
  return copia;
}
