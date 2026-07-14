import type { Tema } from '../api/types';
import { PRIORIDADE_OPCOES, STATUS_ITEM_OPCOES, TIPO_OPCOES } from '../api/types';
import MultiSelectFiltro, { FILTRO_MULTI_VAZIO, type FiltroMultiValor } from './MultiSelectFiltro';
import FiltroPrazo, { FILTRO_PRAZO_VAZIO, type FiltroPrazoValor } from './FiltroPrazo';

export interface FiltrosItensValor {
  tema: FiltroMultiValor;
  status: FiltroMultiValor;
  tipo: FiltroMultiValor;
  prioridade: FiltroMultiValor;
  responsavel: FiltroMultiValor;
  prazo: FiltroPrazoValor;
  busca: string;
}

export const FILTROS_VAZIOS: FiltrosItensValor = {
  tema: { ...FILTRO_MULTI_VAZIO },
  status: { ...FILTRO_MULTI_VAZIO },
  tipo: { ...FILTRO_MULTI_VAZIO },
  prioridade: { ...FILTRO_MULTI_VAZIO },
  responsavel: { ...FILTRO_MULTI_VAZIO },
  prazo: { ...FILTRO_PRAZO_VAZIO },
  busca: '',
};

interface FiltrosItensProps {
  valor: FiltrosItensValor;
  onChange: (novo: FiltrosItensValor) => void;
  temas?: Tema[];
  responsaveis?: string[];
  mostrarTema?: boolean;
  mostrarStatus?: boolean;
  mostrarTipo?: boolean;
  mostrarPrioridade?: boolean;
  mostrarResponsavel?: boolean;
  mostrarPrazo?: boolean;
  mostrarBusca?: boolean;
  buscaPlaceholder?: string;
}

/**
 * Barra de filtros reutilizável para listas de itens (Ações/Informações).
 * Cada visão (Tabela, Kanban, Detalhe do Tema) decide quais filtros exibir
 * via as props `mostrarX`, já que nem todo filtro faz sentido em toda visão
 * (ex.: o Kanban já agrupa por status, então esconde o filtro de status).
 * Os filtros de select (Tema/Status/Tipo/Prioridade/Responsável) aceitam
 * múltiplos valores e um modo "Mostrar" (inclui só os marcados) ou
 * "Ocultar" (exclui os marcados). Prazo filtra por intervalo de datas.
 */
export default function FiltrosItens({
  valor,
  onChange,
  temas = [],
  responsaveis = [],
  mostrarTema = true,
  mostrarStatus = true,
  mostrarTipo = true,
  mostrarPrioridade = true,
  mostrarResponsavel = true,
  mostrarPrazo = true,
  mostrarBusca = true,
  buscaPlaceholder = 'Buscar por título...',
}: FiltrosItensProps) {
  const temFiltroAtivo =
    !!valor.busca ||
    valor.tema.valores.length > 0 ||
    valor.status.valores.length > 0 ||
    valor.tipo.valores.length > 0 ||
    valor.prioridade.valores.length > 0 ||
    valor.responsavel.valores.length > 0 ||
    !!(valor.prazo.de || valor.prazo.ate);

  function set<K extends keyof FiltrosItensValor>(campo: K, v: FiltrosItensValor[K]) {
    onChange({ ...valor, [campo]: v });
  }

  return (
    <div className="card flex flex-wrap items-center gap-3 p-3">
      {mostrarBusca && (
        <input
          className="input-base min-w-[180px] flex-1"
          placeholder={buscaPlaceholder}
          value={valor.busca}
          onChange={(e) => set('busca', e.target.value)}
        />
      )}
      {mostrarTema && (
        <MultiSelectFiltro
          label="Tema"
          opcoes={temas.map((t) => ({ value: t.id, label: t.nome }))}
          valor={valor.tema}
          onChange={(v) => set('tema', v)}
        />
      )}
      {mostrarStatus && (
        <MultiSelectFiltro
          label="Status"
          opcoes={STATUS_ITEM_OPCOES.map((op) => ({ value: op, label: op }))}
          valor={valor.status}
          onChange={(v) => set('status', v)}
        />
      )}
      {mostrarTipo && (
        <MultiSelectFiltro
          label="Tipo"
          opcoes={TIPO_OPCOES.map((op) => ({ value: op, label: op }))}
          valor={valor.tipo}
          onChange={(v) => set('tipo', v)}
        />
      )}
      {mostrarPrioridade && (
        <MultiSelectFiltro
          label="Prioridade"
          opcoes={PRIORIDADE_OPCOES.map((op) => ({ value: op, label: op }))}
          valor={valor.prioridade}
          onChange={(v) => set('prioridade', v)}
        />
      )}
      {mostrarResponsavel && (
        <MultiSelectFiltro
          label="Responsável"
          opcoes={responsaveis.map((r) => ({ value: r, label: r }))}
          valor={valor.responsavel}
          onChange={(v) => set('responsavel', v)}
        />
      )}
      {mostrarPrazo && <FiltroPrazo valor={valor.prazo} onChange={(v) => set('prazo', v)} />}
      {temFiltroAtivo && (
        <button
          onClick={() => onChange(FILTROS_VAZIOS)}
          className="rounded-lg bg-bg-elevated px-3 py-2 text-sm font-medium text-text-muted hover:text-text-primary"
        >
          Limpar filtros
        </button>
      )}
    </div>
  );
}
