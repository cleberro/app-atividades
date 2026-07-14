import { useDropdown } from '../hooks/useDropdown';

export interface FiltroPrazoValor {
  de: string;
  ate: string;
}

export const FILTRO_PRAZO_VAZIO: FiltroPrazoValor = { de: '', ate: '' };

/** Testa se a data de prazo de um item cai dentro do intervalo [de, ate]. */
export function passaFiltroPrazo(prazo: string | null | undefined, filtro: FiltroPrazoValor): boolean {
  if (!filtro.de && !filtro.ate) return true;
  if (!prazo) return false;
  if (filtro.de && prazo < filtro.de) return false;
  if (filtro.ate && prazo > filtro.ate) return false;
  return true;
}

interface FiltroPrazoProps {
  valor: FiltroPrazoValor;
  onChange: (novo: FiltroPrazoValor) => void;
}

/** Dropdown de filtro por intervalo de datas (Prazo de / até). */
export default function FiltroPrazo({ valor, onChange }: FiltroPrazoProps) {
  const { aberto, setAberto, ref } = useDropdown<HTMLDivElement>();

  const ativo = !!(valor.de || valor.ate);
  const rotulo = ativo ? `Prazo: ${valor.de || '…'} → ${valor.ate || '…'}` : 'Prazo';

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
        <div className="absolute z-20 mt-1 w-56 rounded-lg border border-white/10 bg-bg-elevated p-3 shadow-lift">
          <label className="mb-2 block text-xs text-text-muted">
            De
            <input
              type="date"
              className="input-base mt-1 w-full"
              value={valor.de}
              onChange={(e) => onChange({ ...valor, de: e.target.value })}
            />
          </label>
          <label className="block text-xs text-text-muted">
            Até
            <input
              type="date"
              className="input-base mt-1 w-full"
              value={valor.ate}
              onChange={(e) => onChange({ ...valor, ate: e.target.value })}
            />
          </label>
          {ativo && (
            <button
              type="button"
              onClick={() => onChange(FILTRO_PRAZO_VAZIO)}
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
