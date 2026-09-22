/** Formata minutos como "1h 30min", "45min" ou "2h". */
export function formatarMinutos(minutos: number): string {
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
}

/**
 * Converte o "Tempo estimado" do item ("HH:MM", um Select no Notion) em
 * minutos, para somar o esforço de uma lista de itens. Valor vazio ou fora
 * do formato vira 0 — o total continua fazendo sentido mesmo com itens ainda
 * não estimados (eles só não somam nada).
 */
export function minutosDeTempoEstimado(tempoEstimado: string | null | undefined): number {
  if (!tempoEstimado) return 0;
  const match = tempoEstimado.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return 0;
  return Number(match[1]) * 60 + Number(match[2]);
}
