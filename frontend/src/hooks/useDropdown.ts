import { useEffect, useRef, useState } from 'react';

/** Estado + fechamento (clique fora / Esc) para dropdowns de filtro. */
export function useDropdown<T extends HTMLElement = HTMLDivElement>() {
  const [aberto, setAberto] = useState(false);
  const ref = useRef<T>(null);

  useEffect(() => {
    if (!aberto) return;
    function onClickFora(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setAberto(false);
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') setAberto(false);
    }
    document.addEventListener('mousedown', onClickFora);
    window.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onClickFora);
      window.removeEventListener('keydown', onEsc);
    };
  }, [aberto]);

  return { aberto, setAberto, ref };
}
