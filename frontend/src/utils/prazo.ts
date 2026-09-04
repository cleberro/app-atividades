import type { Item } from '../api/types';

/** Campos mínimos de um item para se calcular o prazo efetivo. */
type ComPrazo = Pick<Item, 'prazo' | 'dataReprogramacao'>;

/**
 * Prazo que vale de fato para o item: a data de reprogramação quando ela
 * existe, senão o prazo original. O campo "Prazo" nunca é sobrescrito ao
 * reprogramar — ele guarda a data originalmente combinada, e é o prazo
 * efetivo que alimenta filtros, ordenação, destaque de atraso e os avisos
 * de vencimento por WhatsApp/e-mail (mesma regra do backend).
 */
export function prazoEfetivo(item: ComPrazo): string | null {
  return item.dataReprogramacao || item.prazo || null;
}

/** Data local de hoje no formato "YYYY-MM-DD" (mesmo formato das datas do Notion). */
export function hojeISO(): string {
  const agora = new Date();
  const mes = String(agora.getMonth() + 1).padStart(2, '0');
  const dia = String(agora.getDate()).padStart(2, '0');
  return `${agora.getFullYear()}-${mes}-${dia}`;
}

/**
 * Um item está atrasado quando o prazo efetivo já passou e ele ainda não foi
 * concluído nem marcado como "Não se aplica" — o mesmo critério que o
 * backend usa para disparar os avisos de item vencido.
 */
export function estaAtrasado(item: ComPrazo & Pick<Item, 'status'>, referencia = hojeISO()): boolean {
  const prazo = prazoEfetivo(item);
  if (!prazo) return false;
  if (item.status === 'Concluída' || item.status === 'Não se aplica') return false;
  return prazo < referencia;
}

/** Formata "YYYY-MM-DD" como "DD/MM/YYYY"; devolve "—" quando não há data. */
export function formatarDataBr(dataISO: string | null | undefined): string {
  if (!dataISO) return '—';
  const [ano, mes, dia] = dataISO.split('-');
  return `${dia}/${mes}/${ano}`;
}
