/**
 * Data local de hoje no formato "YYYY-MM-DD", usando os componentes
 * ano/mês/dia do relógio do navegador — evita o bug de `new
 * Date().toISOString()`, que converte para UTC e pode "voltar" um dia
 * dependendo do fuso horário do usuário.
 */
export function hojeLocalISO(): string {
  const agora = new Date();
  const ano = agora.getFullYear();
  const mes = String(agora.getMonth() + 1).padStart(2, '0');
  const dia = String(agora.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}
