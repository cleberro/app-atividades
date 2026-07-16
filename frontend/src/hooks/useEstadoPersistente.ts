import { useEffect, useState } from 'react';

/**
 * Como useState, mas espelhado no sessionStorage: sobrevive à navegação
 * entre telas (o componente desmontando/remontando) e a um refresh de
 * página, até a aba ser fechada ou o valor ser explicitamente resetado.
 */
export function useEstadoPersistente<T>(chave: string, valorInicial: T) {
  const [valor, setValor] = useState<T>(() => {
    try {
      const salvo = sessionStorage.getItem(chave);
      return salvo ? (JSON.parse(salvo) as T) : valorInicial;
    } catch {
      return valorInicial;
    }
  });

  useEffect(() => {
    try {
      sessionStorage.setItem(chave, JSON.stringify(valor));
    } catch {
      // sessionStorage indisponível (ex.: navegação privada) - ignora
    }
  }, [chave, valor]);

  return [valor, setValor] as const;
}
