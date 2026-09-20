import { useMemo, useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { Carregando, Erro, Vazio } from '../components/Estado';
import { ClasseKozoPill, PrioridadePill, StatusPill } from '../components/Pills';
import FiltrosItens, { FILTROS_VAZIOS, type FiltrosItensValor } from '../components/FiltrosItens';
import { passaFiltroMulti, passaFiltroMultiArray } from '../components/MultiSelectFiltro';
import { passaFiltroPrazo } from '../components/FiltroPrazo';
import ItemDetailModal from '../components/ItemDetailModal';
import { useEstadoPersistente } from '../hooks/useEstadoPersistente';
import type { ClasseKozo, Item } from '../api/types';
import { estaAtrasado, formatarDataBr, prazoEfetivo } from '../utils/prazo';
import { contarConcluidas, parseSubtarefas } from '../utils/subtarefas';
import { formatarMinutos, minutosDeTempoEstimado } from '../utils/tempo';
import { hojeLocalISO } from '../utils/data';

/** O método KOZO pede no máximo 5 itens priorizados por dia. */
const LIMITE_HOJE = 5;

interface LinhaVisao extends Item {
  temaNome: string;
  /** Posição do item na fila de "Priorizado para hoje" (só na visão Hoje). */
  posicaoHoje?: number;
}

interface ColunaVisao {
  chave: string;
  titulo: string;
  celula: (item: LinhaVisao) => ReactNode;
}

// ---------------------------------------------------------------------
// Colunas reaproveitadas entre as visões (mesmas propriedades exibidas
// pelas views correspondentes no Notion).
// ---------------------------------------------------------------------

const COL_TITULO: ColunaVisao = {
  chave: 'titulo',
  titulo: 'Título',
  celula: (item) => <span className="font-medium">{item.titulo}</span>,
};

const COL_TEMA: ColunaVisao = {
  chave: 'tema',
  titulo: 'Tema',
  celula: (item) => <span className="text-xs text-text-muted">{item.temaNome}</span>,
};

const COL_STATUS: ColunaVisao = {
  chave: 'status',
  titulo: 'Status',
  celula: (item) => <StatusPill status={item.status} />,
};

const COL_PRIORIDADE: ColunaVisao = {
  chave: 'prioridade',
  titulo: 'Prioridade',
  celula: (item) => <PrioridadePill prioridade={item.prioridade} />,
};

const COL_PRAZO: ColunaVisao = {
  chave: 'prazo',
  titulo: 'Prazo',
  // Mostra o prazo original riscado quando há reprogramação, igual à Tabela:
  // o que vale é o prazo efetivo, mas a data combinada não se perde de vista.
  celula: (item) => {
    if (!item.prazo && !item.dataReprogramacao) return <span className="text-text-muted">—</span>;
    const atrasado = estaAtrasado(item);
    return (
      <span className={`text-xs ${atrasado ? 'font-semibold text-status-bloqueada' : ''}`}>
        {item.dataReprogramacao ? (
          <>
            <span className="text-text-muted line-through">{formatarDataBr(item.prazo)}</span> →{' '}
            {formatarDataBr(item.dataReprogramacao)}
          </>
        ) : (
          formatarDataBr(item.prazo)
        )}
      </span>
    );
  },
};

const COL_TEMPO_ESTIMADO: ColunaVisao = {
  chave: 'tempoEstimado',
  titulo: 'Tempo est.',
  celula: (item) =>
    item.tempoEstimado ? (
      <span className="text-xs">⏱ {item.tempoEstimado}</span>
    ) : (
      <span className="text-text-muted">—</span>
    ),
};

const COL_RESPONSAVEL: ColunaVisao = {
  chave: 'responsavel',
  titulo: 'Responsável',
  celula: (item) => <span className="text-xs">{item.responsavel || '—'}</span>,
};

const COL_SITUACAO_ATUAL: ColunaVisao = {
  chave: 'situacaoAtual',
  titulo: 'Como está hoje',
  celula: (item) => (
    <span className="line-clamp-2 max-w-[260px] text-xs text-text-muted">
      {item.situacaoAtual || '—'}
    </span>
  ),
};

const COL_PLANO: ColunaVisao = {
  chave: 'oQuePrecisaSerFeito',
  titulo: 'O que precisa ser feito',
  // O campo é um checklist (ver utils/subtarefas): na visão só interessa o
  // andamento, o detalhe fica no popup do item.
  celula: (item) => {
    const subtarefas = parseSubtarefas(item.oQuePrecisaSerFeito);
    if (subtarefas.length === 0) return <span className="text-text-muted">—</span>;
    const concluidas = contarConcluidas(subtarefas);
    const completo = concluidas === subtarefas.length;
    return (
      <span className={`text-xs ${completo ? 'text-status-concluida' : 'text-text-muted'}`}>
        {concluidas}/{subtarefas.length} concluída(s)
      </span>
    );
  },
};

const COL_PODE_DELEGAR: ColunaVisao = {
  chave: 'podeDelegar',
  titulo: 'Pode delegar',
  celula: (item) => <span className="text-xs">{item.podeDelegar || '—'}</span>,
};

const COL_DELEGAR_PARA: ColunaVisao = {
  chave: 'delegarPara',
  titulo: 'Delegar para',
  celula: (item) => <span className="text-xs">{item.delegarPara || '—'}</span>,
};

const COL_CLASSE_KOZO: ColunaVisao = {
  chave: 'classeKozo',
  titulo: 'Classe KOZO',
  celula: (item) => <ClasseKozoPill classeKozo={item.classeKozo} />,
};

const COL_ORDEM_HOJE: ColunaVisao = {
  chave: 'ordemHoje',
  titulo: 'Ordem',
  celula: (item) => <span className="text-xs text-text-muted">{item.posicaoHoje ?? '—'}</span>,
};

interface DefinicaoVisao {
  id: string;
  nome: string;
  subtitulo: string;
  /** Classe KOZO que a visão filtra; null na visão Hoje (que filtra por "Priorizado Hoje"). */
  classe: ClasseKozo | null;
  descricao: string;
  colunas: ColunaVisao[];
}

/**
 * As quatro visões do método KOZO, espelhando as views de mesmo nome da
 * database "Itens - Ações e Informações" no Notion: mesmo filtro, mesmas
 * colunas e mesma ordenação (prazo crescente nas três visões de classe;
 * ordem de priorização na visão Hoje).
 */
const VISOES: DefinicaoVisao[] = [
  {
    id: 'nucleo',
    nome: 'Núcleo',
    subtitulo: 'Projetos',
    classe: 'Projeto',
    descricao:
      'O que exige mais de uma etapa para acontecer. Aqui importa o plano de ação, não o "fazer agora".',
    colunas: [
      COL_TITULO,
      COL_TEMA,
      COL_STATUS,
      COL_PRIORIDADE,
      COL_PRAZO,
      COL_TEMPO_ESTIMADO,
      COL_SITUACAO_ATUAL,
      COL_PLANO,
    ],
  },
  {
    id: 'fluxo',
    nome: 'Fluxo',
    subtitulo: 'Tarefas',
    classe: 'Tarefa',
    descricao: 'Execução direta: cada item se resolve numa sentada — ou é delegado.',
    colunas: [
      COL_TITULO,
      COL_TEMA,
      COL_STATUS,
      COL_PRIORIDADE,
      COL_PRAZO,
      COL_TEMPO_ESTIMADO,
      COL_PODE_DELEGAR,
      COL_DELEGAR_PARA,
    ],
  },
  {
    id: 'interface',
    nome: 'Interface',
    subtitulo: 'Comunicação',
    classe: 'Comunicação',
    descricao: 'O que só anda falando com alguém: cobrar, alinhar, responder, combinar.',
    colunas: [
      COL_TITULO,
      COL_TEMA,
      COL_STATUS,
      COL_PRIORIDADE,
      COL_PRAZO,
      COL_RESPONSAVEL,
      COL_DELEGAR_PARA,
    ],
  },
  {
    id: 'hoje',
    nome: 'Hoje',
    subtitulo: 'máx. 5',
    classe: null,
    descricao:
      'Os itens marcados como "Priorizado para hoje", na ordem definida na tela Hoje. O método pede no máximo 5 por dia.',
    colunas: [
      COL_TITULO,
      COL_CLASSE_KOZO,
      COL_ORDEM_HOJE,
      COL_TEMPO_ESTIMADO,
      COL_PRAZO,
      COL_PRIORIDADE,
      COL_STATUS,
    ],
  },
];

/** Ordena por prazo efetivo crescente, itens sem prazo por último. */
function ordenarPorPrazo(itens: LinhaVisao[]): LinhaVisao[] {
  return [...itens].sort((a, b) => {
    const prazoA = prazoEfetivo(a);
    const prazoB = prazoEfetivo(b);
    if (!prazoA && !prazoB) return 0;
    if (!prazoA) return 1;
    if (!prazoB) return -1;
    return prazoA.localeCompare(prazoB);
  });
}

function TabelaVisao({
  colunas,
  itens,
  onAbrir,
}: {
  colunas: ColunaVisao[];
  itens: LinhaVisao[];
  onAbrir: (item: Item) => void;
}) {
  return (
    <div className="card overflow-x-auto p-0">
      <table className="w-full min-w-[720px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-white/10 text-left text-xs uppercase text-text-muted">
            {colunas.map((coluna) => (
              <th key={coluna.chave} className="px-3 py-2">
                {coluna.titulo}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {itens.map((item) => (
            <tr
              key={item.id}
              onClick={() => onAbrir(item)}
              className="cursor-pointer border-b border-white/5 hover:bg-bg-elevated/60"
            >
              {colunas.map((coluna) => (
                <td key={coluna.chave} className="px-3 py-2 align-top">
                  {coluna.celula(item)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Tela de Visões: as quatro views do método KOZO (Núcleo, Fluxo, Interface e
 * Hoje) sobre a mesma lista de itens, escolhidas por abas. O recorte de cada
 * visão vem da "Classe KOZO" do item — por isso a tela também avisa quando
 * existem itens sem classe ou marcados como "Híbrido (decompor)", que não
 * aparecem em nenhuma das três primeiras visões.
 */
export default function Visoes() {
  const [visaoAtiva, setVisaoAtiva] = useEstadoPersistente<string>('visao-kozo-ativa', VISOES[0].id);
  const [filtros, setFiltros] = useEstadoPersistente<FiltrosItensValor>('filtros-visoes', FILTROS_VAZIOS);
  const [itemSelecionado, setItemSelecionado] = useState<Item | null>(null);
  const dataHoje = hojeLocalISO();

  const temasQuery = useQuery({ queryKey: ['temas'], queryFn: api.listarTemas });
  const itensQuery = useQuery({ queryKey: ['itens', {}], queryFn: () => api.listarItens() });

  const mapaTemas = useMemo(() => {
    const mapa = new Map<string, string>();
    (temasQuery.data ?? []).forEach((t) => mapa.set(t.id, t.nome));
    return mapa;
  }, [temasQuery.data]);

  const responsaveisDisponiveis = useMemo(() => {
    const set = new Set<string>();
    (itensQuery.data ?? []).forEach((i) => i.responsavel && set.add(i.responsavel));
    return Array.from(set).sort();
  }, [itensQuery.data]);

  const linhas: LinhaVisao[] = useMemo(
    () =>
      (itensQuery.data ?? []).map((item) => ({
        ...item,
        temaNome: item.temaIds[0] ? mapaTemas.get(item.temaIds[0]) || 'Sem tema' : 'Sem tema',
      })),
    [itensQuery.data, mapaTemas]
  );

  const visao = VISOES.find((v) => v.id === visaoAtiva) ?? VISOES[0];
  const ehVisaoHoje = visao.classe === null;

  // Filtros da barra só se aplicam às visões de classe: a visão Hoje é a
  // fila do dia inteira, esconder item dela por filtro só confundiria.
  const linhasFiltradas = useMemo(() => {
    if (ehVisaoHoje) return linhas;
    return linhas
      .filter((item) => passaFiltroMultiArray(item.temaIds, filtros.tema))
      .filter((item) => passaFiltroMulti(item.status, filtros.status))
      .filter((item) => passaFiltroMulti(item.prioridade, filtros.prioridade))
      .filter((item) => passaFiltroMulti(item.responsavel, filtros.responsavel))
      .filter((item) => passaFiltroMulti(item.tempoEstimado, filtros.tempoEstimado))
      .filter((item) => passaFiltroPrazo(prazoEfetivo(item), filtros.prazo))
      .filter((item) =>
        filtros.busca ? item.titulo.toLowerCase().includes(filtros.busca.toLowerCase()) : true
      );
  }, [linhas, filtros, ehVisaoHoje]);

  // Fila de hoje: mesma regra da tela Hoje — a ordem manual só vale se tiver
  // sido definida hoje; quem não tem ordem do dia entra no fim.
  const itensDeHoje = useMemo(() => {
    const semOrdem = Infinity;
    return linhas
      .filter((item) => item.priorizadoHoje)
      .sort((a, b) => {
        const va = a.dataOrdemPriorizado === dataHoje ? a.ordemPriorizadoHoje ?? semOrdem : semOrdem;
        const vb = b.dataOrdemPriorizado === dataHoje ? b.ordemPriorizadoHoje ?? semOrdem : semOrdem;
        return va - vb;
      })
      .map((item, indice) => ({ ...item, posicaoHoje: indice + 1 }));
  }, [linhas, dataHoje]);

  const itensDaVisao = ehVisaoHoje
    ? itensDeHoje
    : ordenarPorPrazo(linhasFiltradas.filter((item) => item.classeKozo === visao.classe));

  // Na visão Hoje, o que passa de 5 fica num bloco separado: continua
  // visível (não some da fila), mas fora do compromisso do dia.
  const dentroDoLimite = ehVisaoHoje ? itensDaVisao.slice(0, LIMITE_HOJE) : itensDaVisao;
  const acimaDoLimite = ehVisaoHoje ? itensDaVisao.slice(LIMITE_HOJE) : [];

  const minutosEstimados = dentroDoLimite.reduce(
    (soma, item) => soma + minutosDeTempoEstimado(item.tempoEstimado),
    0
  );

  const semClasse = useMemo(
    () => linhas.filter((item) => !item.classeKozo || item.classeKozo === 'Híbrido (decompor)'),
    [linhas]
  );

  if (itensQuery.isLoading || temasQuery.isLoading) return <Carregando texto="Carregando visões..." />;
  if (itensQuery.isError) return <Erro mensagem={(itensQuery.error as Error).message} />;

  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="text-2xl font-semibold">Visões</h1>
        <p className="mt-1 text-sm text-text-muted">
          Os mesmos itens, recortados pela Classe KOZO — as quatro views que existem no Notion.
        </p>
      </header>

      <nav className="flex flex-wrap gap-2" aria-label="Visões KOZO">
        {VISOES.map((v) => {
          const ativa = v.id === visao.id;
          const quantidade =
            v.classe === null
              ? itensDeHoje.length
              : linhas.filter((item) => item.classeKozo === v.classe).length;
          return (
            <button
              key={v.id}
              onClick={() => setVisaoAtiva(v.id)}
              aria-pressed={ativa}
              className={`rounded-lg px-4 py-2 text-left text-sm font-medium transition-colors ${
                ativa
                  ? 'bg-accent-primary text-white shadow-soft'
                  : 'bg-bg-elevated text-text-muted hover:text-text-primary'
              }`}
            >
              <span className="block">
                {v.nome}{' '}
                <span className={ativa ? 'text-white/70' : 'text-text-muted'}>({v.subtitulo})</span>
              </span>
              <span className={`text-xs ${ativa ? 'text-white/70' : 'text-text-muted'}`}>
                {quantidade} item(ns)
              </span>
            </button>
          );
        })}
      </nav>

      {semClasse.length > 0 && (
        <p className="rounded-lg bg-bg-elevated/50 p-3 text-xs text-text-muted">
          <span className="font-semibold text-text-primary">{semClasse.length} item(ns)</span> ainda
          sem Classe KOZO ou marcados como "Híbrido (decompor)" — eles não aparecem em Núcleo, Fluxo
          nem Interface. Classifique (ou decomponha) cada um no popup do item, ou pela coluna
          "Classe KOZO" da Tabela.
        </p>
      )}

      <section className="rounded-2xl border border-white/10 bg-bg-surface/30 p-4 sm:p-5">
        <div className="mb-3">
          <h2 className="text-lg font-semibold">
            {visao.nome} <span className="text-text-muted">({visao.subtitulo})</span>
          </h2>
          <p className="mt-1 text-sm text-text-muted">{visao.descricao}</p>
          <p className="mt-1 text-xs text-text-muted">
            {dentroDoLimite.length} item(ns)
            {minutosEstimados > 0 && ` · esforço estimado ${formatarMinutos(minutosEstimados)}`}
            {!ehVisaoHoje && ' · ordenados por prazo'}
          </p>
        </div>

        {!ehVisaoHoje && (
          <div className="mb-4">
            <FiltrosItens
              valor={filtros}
              onChange={setFiltros}
              temas={temasQuery.data ?? []}
              responsaveis={responsaveisDisponiveis}
              mostrarTipo={false}
              mostrarClasseKozo={false}
            />
          </div>
        )}

        {ehVisaoHoje && itensDaVisao.length > LIMITE_HOJE && (
          <p className="mb-3 rounded-lg bg-status-pendente/10 p-3 text-xs text-status-pendente ring-1 ring-status-pendente/40">
            ⚠ {itensDaVisao.length} itens priorizados para hoje — {itensDaVisao.length - LIMITE_HOJE}{' '}
            acima do limite de {LIMITE_HOJE}. Desmarque o que não cabe no dia (ou reordene na tela
            Hoje, que é quem define a fila).
          </p>
        )}

        {dentroDoLimite.length === 0 ? (
          <Vazio
            texto={
              ehVisaoHoje
                ? 'Nada priorizado para hoje ainda. Marque "Priorizar para hoje" no popup de um item.'
                : `Nenhum item com Classe KOZO "${visao.classe}" nos filtros atuais.`
            }
          />
        ) : (
          <TabelaVisao colunas={visao.colunas} itens={dentroDoLimite} onAbrir={setItemSelecionado} />
        )}

        {acimaDoLimite.length > 0 && (
          <div className="mt-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
              Acima do limite de {LIMITE_HOJE}
            </p>
            <TabelaVisao colunas={visao.colunas} itens={acimaDoLimite} onAbrir={setItemSelecionado} />
          </div>
        )}
      </section>

      {itemSelecionado && (
        <ItemDetailModal item={itemSelecionado} onClose={() => setItemSelecionado(null)} />
      )}
    </div>
  );
}
