import type { Item } from '../api/types';

/** Data local de hoje no formato "YYYY-MM-DD" (mesmo formato das datas do Notion). */
export function hojeISO(): string {
  const agora = new Date();
  const mes = String(agora.getMonth() + 1).padStart(2, '0');
  const dia = String(agora.getDate()).padStart(2, '0');
  return `${agora.getFullYear()}-${mes}-${dia}`;
}

/**
 * Um item está atrasado quando o prazo já passou e ele ainda não foi
 * concluído nem marcado como "Não se aplica" — o mesmo critério que o
 * backend usa para disparar os avisos de item vencido.
 */
export function estaAtrasado(item: Pick<Item, 'prazo' | 'status'>, referencia = hojeISO()): boolean {
  if (!item.prazo) return false;
  if (item.status === 'Concluída' || item.status === 'Não se aplica') return false;
  return item.prazo < referencia;
}

/** Formata "YYYY-MM-DD" como "DD/MM/YYYY"; devolve "—" quando não há data. */
export function formatarDataBr(dataISO: string | null | undefined): string {
  if (!dataISO) return '—';
  const [ano, mes, dia] = dataISO.split('-');
  return `${dia}/${mes}/${ano}`;
}
