import { useDropdown } from '../hooks/useDropdown';

export interface FiltroMultiValor {
  valores: string[];
  modo: 'incluir' | 'excluir';
}

export const FILTRO_MULTI_VAZIO: FiltroMultiValor = { valores: [], modo: 'incluir' };

export interface OpcaoFiltro {
  value: string;
  label: string;
}

/** Testa se um valor único (ex.: status de um item) passa no filtro. */
export function passaFiltroMulti(valorItem: string | null | undefined, filtro: FiltroMultiValor): boolean {
  if (filtro.valores.length === 0) return true;
  const contido = valorItem != null && filtro.valores.includes(valorItem);
  return filtro.modo === 'incluir' ? contido : !contido;
}

/** Testa se algum valor de uma relação (ex.: temaIds de um item) passa no filtro. */
export function passaFiltroMultiArray(valoresItem: string[], filtro: FiltroMultiValor): boolean {
  if (filtro.valores.length === 0) return true;
  const contido = valoresItem.some((v) => filtro.valores.includes(v));
  return filtro.modo === 'incluir' ? contido : !contido;
}

interface MultiSelectFiltroProps {
  label: string;
  opcoes: OpcaoFiltro[];
  valor: FiltroMultiValor;
  onChange: (novo: FiltroMultiValor) => void;
}

/**
 * Dropdown de filtro com múltipla seleção e alternância "Mostrar" (inclui
 * apenas os valores marcados) / "Ocultar" (exclui os valores marcados,
 * mostra todo o resto). Usado em qualquer tela com filtros de select.
 */
export default function MultiSelectFiltro({ label, opcoes, valor, onChange }: MultiSelectFiltroProps) {
  const { aberto, setAberto, ref } = useDropdown<HTMLDivElement>();

  function toggleValor(v: string) {
    const jaSelecionado = valor.valores.includes(v);
    const novosValores = jaSelecionado ? valor.valores.filter((x) => x !== v) : [...valor.valores, v];
    onChange({ ...valor, valores: novosValores });
  }

  const ativo = valor.valores.length > 0;
  const rotuloValores =
    valor.valores.length === 1
      ? opcoes.find((o) => o.value === valor.valores[0])?.label ?? valor.valores[0]
      : `${valor.valores.length} selecionados`;
  const rotulo = ativo ? `${label} ${valor.modo === 'excluir' ? '≠' : '='} ${rotuloValores}` : label;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        className={`input-base flex items-center gap-1 whitespace-nowrap text-left text-sm ${
          ativo ? 'border border-accent-primary text-accent-primary' : ''
        }`}
      >
        {rotulo}
        <span className="text-xs">▾</span>
      </button>

      {aberto && (
        <div className="absolute z-20 mt-1 w-60 rounded-lg border border-white/10 bg-bg-elevated p-2 shadow-lift">
          <div className="mb-2 flex gap-1 rounded-md bg-bg-surface p-1 text-xs">
            <button
              type="button"
              onClick={() => onChange({ ...valor, modo: 'incluir' })}
              className={`flex-1 rounded px-2 py-1 ${
                valor.modo === 'incluir' ? 'bg-accent-primary text-white' : 'text-text-muted'
              }`}
            >
              Mostrar
            </button>
            <button
              type="button"
              onClick={() => onChange({ ...valor, modo: 'excluir' })}
              className={`flex-1 rounded px-2 py-1 ${
                valor.modo === 'excluir' ? 'bg-accent-primary text-white' : 'text-text-muted'
              }`}
            >
              Ocultar
            </button>
          </div>
          <div className="flex max-h-56 flex-col gap-1 overflow-y-auto">
            {opcoes.map((op) => (
              <label
                key={op.value}
                className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 text-sm hover:bg-bg-surface"
              >
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-accent-primary"
                  checked={valor.valores.includes(op.value)}
                  onChange={() => toggleValor(op.value)}
                />
                {op.label}
              </label>
            ))}
          </div>
          {ativo && (
            <button
              type="button"
              onClick={() => onChange(FILTRO_MULTI_VAZIO)}
              className="mt-2 w-full rounded px-2 py-1 text-xs text-text-muted hover:text-text-primary"
            >
              Limpar
            </button>
          )}
        </div>
      )}
    </div>
  );
}
