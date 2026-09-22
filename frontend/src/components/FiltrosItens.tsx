import type { Tema } from '../api/types';
import {
  CLASSE_KOZO_OPCOES,
  PRIORIDADE_OPCOES,
  STATUS_ITEM_OPCOES,
  TEMPO_ESTIMADO_OPCOES,
} from '../api/types';
import MultiSelectFiltro, { FILTRO_MULTI_VAZIO, type FiltroMultiValor } from './MultiSelectFiltro';
import FiltroPrazo, { FILTRO_PRAZO_VAZIO, type FiltroPrazoValor } from './FiltroPrazo';

export interface FiltrosItensValor {
  tema: FiltroMultiValor;
  status: FiltroMultiValor;
  prioridade: FiltroMultiValor;
  responsavel: FiltroMultiValor;
  classeKozo: FiltroMultiValor;
  tempoEstimado: FiltroMultiValor;
  prazo: FiltroPrazoValor;
  busca: string;
}

export const FILTROS_VAZIOS: FiltrosItensValor = {
  tema: { ...FILTRO_MULTI_VAZIO },
  status: { ...FILTRO_MULTI_VAZIO },
  prioridade: { ...FILTRO_MULTI_VAZIO },
  responsavel: { ...FILTRO_MULTI_VAZIO },
  classeKozo: { ...FILTRO_MULTI_VAZIO },
  tempoEstimado: { ...FILTRO_MULTI_VAZIO },
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
  mostrarPrioridade?: boolean;
  mostrarResponsavel?: boolean;
  mostrarClasseKozo?: boolean;
  mostrarTempoEstimado?: boolean;
  mostrarPrazo?: boolean;
  mostrarBusca?: boolean;
  buscaPlaceholder?: string;
}

/**
 * Barra de filtros reutilizável para listas de itens (Ações/Informações).
 * Cada visão (Tabela, Kanban, Detalhe do Tema) decide quais filtros exibir
 * via as props `mostrarX`, já que nem todo filtro faz sentido em toda visão
 * (ex.: o Kanban já agrupa por status, então esconde o filtro de status).
 * Os filtros de select (Tema/Status/Prioridade/Responsável) aceitam
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
  mostrarPrioridade = true,
  mostrarResponsavel = true,
  mostrarClasseKozo = true,
  mostrarTempoEstimado = true,
  mostrarPrazo = true,
  mostrarBusca = true,
  buscaPlaceholder = 'Buscar por título...',
}: FiltrosItensProps) {
  // Filtros de telas que persistem o valor (sessionStorage) podem ter sido
  // salvos antes de um filtro novo existir; o merge com FILTROS_VAZIOS evita
  // que um valor antigo, sem a chave nova, quebre a barra de filtros.
  const valorCompleto: FiltrosItensValor = { ...FILTROS_VAZIOS, ...valor };

  const temFiltroAtivo =
    !!valorCompleto.busca ||
    valorCompleto.tema.valores.length > 0 ||
    valorCompleto.status.valores.length > 0 ||
    valorCompleto.prioridade.valores.length > 0 ||
    valorCompleto.responsavel.valores.length > 0 ||
    valorCompleto.classeKozo.valores.length > 0 ||
    valorCompleto.tempoEstimado.valores.length > 0 ||
    !!(valorCompleto.prazo.de || valorCompleto.prazo.ate);

  function set<K extends keyof FiltrosItensValor>(campo: K, v: FiltrosItensValor[K]) {
    onChange({ ...valorCompleto, [campo]: v });
  }

  return (
    <div className="card flex flex-wrap items-center gap-3 p-3">
      {mostrarBusca && (
        <input
          className="input-base min-w-[180px] flex-1"
          placeholder={buscaPlaceholder}
          value={valorCompleto.busca}
          onChange={(e) => set('busca', e.target.value)}
        />
      )}
      {mostrarTema && (
        <MultiSelectFiltro
          label="Tema"
          opcoes={temas.map((t) => ({ value: t.id, label: t.nome }))}
          valor={valorCompleto.tema}
          onChange={(v) => set('tema', v)}
        />
      )}
      {mostrarStatus && (
        <MultiSelectFiltro
          label="Status"
          opcoes={STATUS_ITEM_OPCOES.map((op) => ({ value: op, label: op }))}
          valor={valorCompleto.status}
          onChange={(v) => set('status', v)}
        />
      )}
      {mostrarPrioridade && (
        <MultiSelectFiltro
          label="Prioridade"
          opcoes={PRIORIDADE_OPCOES.map((op) => ({ value: op, label: op }))}
          valor={valorCompleto.prioridade}
          onChange={(v) => set('prioridade', v)}
        />
      )}
      {mostrarResponsavel && (
        <MultiSelectFiltro
          label="Responsável"
          opcoes={responsaveis.map((r) => ({ value: r, label: r }))}
          valor={valorCompleto.responsavel}
          onChange={(v) => set('responsavel', v)}
        />
      )}
      {mostrarClasseKozo && (
        <MultiSelectFiltro
          label="Classe KOZO"
          opcoes={CLASSE_KOZO_OPCOES.map((op) => ({ value: op, label: op }))}
          valor={valorCompleto.classeKozo}
          onChange={(v) => set('classeKozo', v)}
        />
      )}
      {mostrarTempoEstimado && (
        <MultiSelectFiltro
          label="Tempo est."
          opcoes={TEMPO_ESTIMADO_OPCOES.map((op) => ({ value: op, label: op }))}
          valor={valorCompleto.tempoEstimado}
          onChange={(v) => set('tempoEstimado', v)}
        />
      )}
      {mostrarPrazo && <FiltroPrazo valor={valorCompleto.prazo} onChange={(v) => set('prazo', v)} />}
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
