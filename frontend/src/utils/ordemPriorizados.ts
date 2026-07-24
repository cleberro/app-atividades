/**
 * Sequência manual (drag-and-drop) da lista "Priorizado para hoje", salva no
 * localStorage por dia — não é um dado do Notion, é só uma preferência de
 * visualização deste navegador, válida "durante o dia": no dia seguinte a
 * chave muda e a lista volta pra ordem padrão até o usuário reordenar de novo.
 */

const PREFIXO = 'ordem-priorizado-hoje:';

export function lerOrdemSalva(dataHoje: string): string[] {
  try {
    const bruto = localStorage.getItem(PREFIXO + dataHoje);
    return bruto ? (JSON.parse(bruto) as string[]) : [];
  } catch {
    return [];
  }
}

export function salvarOrdem(dataHoje: string, ids: string[]): void {
  try {
    localStorage.setItem(PREFIXO + dataHoje, JSON.stringify(ids));
    limparOrdensAntigas(dataHoje);
  } catch {
    // localStorage indisponível (ex.: navegação privada) - ignora
  }
}

/** Remove chaves de dias anteriores, para não acumular lixo indefinidamente. */
function limparOrdensAntigas(dataHoje: string): void {
  const chaveAtual = PREFIXO + dataHoje;
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const chave = localStorage.key(i);
    if (chave && chave.startsWith(PREFIXO) && chave !== chaveAtual) {
      localStorage.removeItem(chave);
    }
  }
}

/**
 * Ordena "itens" pela sequência salva; itens sem posição salva (novos no
 * período, ou nunca reordenados) vão para o final, mantendo a ordem em que
 * chegaram.
 */
export function aplicarOrdemSalva<T extends { id: string }>(itens: T[], ordemSalva: string[]): T[] {
  const indice = new Map(ordemSalva.map((id, i) => [id, i]));
  return itens
    .slice()
    .sort((a, b) => (indice.get(a.id) ?? Infinity) - (indice.get(b.id) ?? Infinity));
}
