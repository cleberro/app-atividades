/**
 * notionService.js
 * -----------------------------------------------------------------------
 * Unica camada de acesso a API do Notion. Nenhuma outra parte do backend
 * deve importar "@notionhq/client" diretamente - tudo passa por aqui.
 *
 * Bancos de dados consumidos (ja existem no Notion, nao sao recriados):
 *  - TEMAS_DB_ID: "Temas TI Vicunha"            (12 linhas)
 *  - ITENS_DB_ID: "Itens - Acoes e Informacoes"  (371 linhas)
 *
 * IMPORTANTE: estes sao os "database ID" (usados pela API publica do
 * Notion / @notionhq/client), que sao DIFERENTES dos "data source ID"
 * (formato collection://...) usados internamente por ferramentas de IA.
 * Se o Notion mudar/recriar essas databases no futuro, confira o ID
 * correto abrindo a database no navegador: o ID fica na URL, no formato
 * notion.so/<nome>-<32 caracteres hex>.
 *
 * Sem um NOTION_API_KEY valido no .env, toda chamada aqui retorna 401
 * vindo da API do Notion - isso e esperado neste sandbox e esta
 * documentado no README do projeto.
 * -----------------------------------------------------------------------
 */

const { Client } = require('@notionhq/client');

const TEMAS_DB_ID = '92651600-a190-459f-b054-b0fb3a0736fb';
const ITENS_DB_ID = '8628bb86-8a72-4607-80a6-1da5d1938843';
const HABITOS_DB_ID = '39fa1a73-667d-81a2-900e-c00d817ff521';
const REGISTROS_HABITOS_DB_ID = '39fa1a73-667d-810f-a8ff-fbb79ca41ee6';

const notion = new Client({ auth: process.env.NOTION_API_KEY });

// Nomes usados como opções do multi-select "Dias da Semana" da database
// Hábitos, na mesma ordem do índice retornado por Date.getUTCDay() (0 =
// Domingo). Ver diaDaSemanaDe() logo abaixo.
const DIAS_SEMANA = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

/**
 * Dado um "YYYY-MM-DD", retorna o nome do dia da semana correspondente
 * (em português, igual às opções do multi-select no Notion). Usa
 * Date.UTC() de propósito: construir a data a partir dos componentes
 * Y/M/D em UTC evita o bug clássico de fuso horário onde
 * `new Date('2026-07-16').getDay()` pode "voltar" um dia dependendo do
 * fuso do processo Node (ex.: em produção o servidor roda em UTC, mas
 * localmente pode rodar em outro fuso).
 */
function diaDaSemanaDe(dataStr) {
  const [ano, mes, dia] = dataStr.split('-').map(Number);
  return DIAS_SEMANA[new Date(Date.UTC(ano, mes - 1, dia)).getUTCDay()];
}

// ---------------------------------------------------------------------
// Helpers de leitura de propriedades Notion -> valores JS simples
// ---------------------------------------------------------------------

function getTitle(prop) {
  if (!prop || !Array.isArray(prop.title)) return '';
  return prop.title.map((t) => t.plain_text).join('');
}

function getRichText(prop) {
  if (!prop || !Array.isArray(prop.rich_text)) return '';
  return prop.rich_text.map((t) => t.plain_text).join('');
}

function getSelect(prop) {
  return prop && prop.select ? prop.select.name : null;
}

function getMultiSelect(prop) {
  if (!prop || !Array.isArray(prop.multi_select)) return [];
  return prop.multi_select.map((o) => o.name);
}

function getCheckbox(prop) {
  return !!(prop && prop.checkbox);
}

function getNumber(prop) {
  return prop && typeof prop.number === 'number' ? prop.number : null;
}

function getDate(prop) {
  return prop && prop.date ? prop.date.start : null;
}

function getUrl(prop) {
  return prop && prop.url ? prop.url : null;
}

function getRelationIds(prop) {
  if (!prop || !Array.isArray(prop.relation)) return [];
  return prop.relation.map((r) => r.id);
}

function getCreatedTime(prop) {
  return prop && prop.created_time ? prop.created_time : null;
}

// O Notion limita cada bloco de rich_text a 2000 caracteres; campos que
// podem crescer (ex.: Anotações Diárias) precisam ser divididos em blocos.
const NOTION_RICH_TEXT_LIMIT = 2000;
function buildRichText(conteudo) {
  const texto = conteudo || '';
  if (!texto) return [];
  const blocos = [];
  for (let i = 0; i < texto.length; i += NOTION_RICH_TEXT_LIMIT) {
    blocos.push({ text: { content: texto.slice(i, i + NOTION_RICH_TEXT_LIMIT) } });
  }
  return blocos;
}

// ---------------------------------------------------------------------
// Mapeadores Notion Page -> objeto de dominio
// ---------------------------------------------------------------------

function mapTema(page) {
  const p = page.properties;
  return {
    id: page.id,
    nome: getTitle(p.Nome),
    categoria: getSelect(p.Categoria),
    descricao: getRichText(p['Descrição']),
    status: getSelect(p.Status),
    focoDaSemana: getCheckbox(p['Foco da Semana']),
    prioridade: getSelect(p.Prioridade),
    ordem: getNumber(p.Ordem),
  };
}

function mapItem(page) {
  const p = page.properties;
  return {
    id: page.id,
    titulo: getTitle(p['Título']),
    temaIds: getRelationIds(p.Tema),
    tipo: getSelect(p.Tipo),
    descricao: getRichText(p['Descrição']),
    responsavel: getRichText(p['Responsável']),
    status: getSelect(p.Status),
    prazo: getDate(p.Prazo),
    dataReuniao: getDate(p['Data Reunião']),
    prioridade: getSelect(p.Prioridade),
    priorizadoHoje: getCheckbox(p['Priorizado Hoje']),
    reuniaoOrigem: getRichText(p['Reunião de Origem']),
    anotacoesDiarias: getRichText(p['Anotações Diárias']),
    urlAta: getUrl(p['URL da Ata']),
    origem: getSelect(p.Origem),
    criadoEm: getCreatedTime(p['Criado em']),
  };
}

function mapHabito(page) {
  const p = page.properties;
  return {
    id: page.id,
    titulo: getTitle(p['Título do Hábito']),
    descricao: getRichText(p['Descrição']),
    diasSemana: getMultiSelect(p['Dias da Semana']),
    horario: getRichText(p['Horário']) || null,
    ativo: getCheckbox(p['Ativo']),
  };
}

function mapRegistro(page) {
  const p = page.properties;
  return {
    id: page.id,
    habitoId: getRelationIds(p['Hábito'])[0] || null,
    data: getDate(p['Data']),
  };
}

// ---------------------------------------------------------------------
// Temas
// ---------------------------------------------------------------------

/**
 * Lista todos os temas (ordenados por "Ordem" quando disponivel) e anexa
 * a contagem de itens pendentes (Status = "Pendente") de cada tema.
 */
async function listTemas() {
  const temasResponse = await notion.databases.query({
    database_id: TEMAS_DB_ID,
    sorts: [{ property: 'Ordem', direction: 'ascending' }],
  });

  const temas = temasResponse.results.map(mapTema);

  // Busca todos os itens pendentes (com paginacao) e agrupa por tema em
  // memoria, evitando 12 queries separadas ao Notion.
  const itensPendentes = await listItens({ status: 'Pendente' });

  const contagemPorTema = {};
  for (const item of itensPendentes) {
    for (const temaId of item.temaIds) {
      contagemPorTema[temaId] = (contagemPorTema[temaId] || 0) + 1;
    }
  }

  return temas.map((tema) => ({
    ...tema,
    itensPendentes: contagemPorTema[tema.id] || 0,
  }));
}

/**
 * Cria um novo tema. Categoria/Status/Prioridade sao propriedades Select do
 * Notion: se o valor enviado ainda nao existir como opcao, o Notion cria a
 * opcao automaticamente (nao precisa alterar o schema manualmente).
 * Se "ordem" nao for informado, usa o proximo numero disponivel
 * (maior "Ordem" existente + 1), para o novo tema aparecer no final da lista.
 */
async function createTema(dados) {
  const properties = {
    Nome: { title: [{ text: { content: dados.nome || 'Sem nome' } }] },
    Status: { select: { name: dados.status || 'Ativo' } },
    Prioridade: { select: { name: dados.prioridade || 'Média' } },
    'Foco da Semana': { checkbox: false },
  };

  if (dados.categoria) {
    properties.Categoria = { select: { name: dados.categoria } };
  }
  if (dados.descricao) {
    properties['Descrição'] = { rich_text: buildRichText(dados.descricao) };
  }

  let ordem = dados.ordem;
  if (ordem === undefined || ordem === null || ordem === '') {
    const temasExistentes = await notion.databases.query({
      database_id: TEMAS_DB_ID,
      sorts: [{ property: 'Ordem', direction: 'descending' }],
      page_size: 1,
    });
    const maiorOrdem = getNumber(temasExistentes.results[0]?.properties?.Ordem) || 0;
    ordem = maiorOrdem + 1;
  }
  properties.Ordem = { number: Number(ordem) };

  const page = await notion.pages.create({
    parent: { database_id: TEMAS_DB_ID },
    properties,
  });

  return { ...mapTema(page), itensPendentes: 0 };
}

/**
 * Alterna (ou define) a propriedade checkbox "Foco da Semana" de um tema.
 */
async function setFocoSemana(temaId, valor) {
  const page = await notion.pages.update({
    page_id: temaId,
    properties: {
      'Foco da Semana': { checkbox: valor },
    },
  });
  return mapTema(page);
}

/**
 * Atualiza campos de um tema existente (nome, categoria, descricao,
 * status, prioridade, ordem). Só altera os campos presentes em "dados".
 */
async function updateTema(temaId, dados) {
  const properties = {};

  if (dados.nome !== undefined) {
    properties.Nome = { title: [{ text: { content: dados.nome } }] };
  }
  if (dados.categoria !== undefined) {
    properties.Categoria = { select: dados.categoria ? { name: dados.categoria } : null };
  }
  if (dados.descricao !== undefined) {
    properties['Descrição'] = { rich_text: buildRichText(dados.descricao) };
  }
  if (dados.status !== undefined) {
    properties.Status = { select: dados.status ? { name: dados.status } : null };
  }
  if (dados.prioridade !== undefined) {
    properties.Prioridade = { select: dados.prioridade ? { name: dados.prioridade } : null };
  }
  if (dados.ordem !== undefined) {
    properties.Ordem = { number: dados.ordem === null || dados.ordem === '' ? null : Number(dados.ordem) };
  }

  const page = await notion.pages.update({ page_id: temaId, properties });
  return mapTema(page);
}

/**
 * Exclui (arquiva no Notion) um tema. Recusa a exclusao se ainda existirem
 * itens vinculados a ele, para evitar itens orfaos.
 */
async function deleteTema(temaId) {
  const itensVinculados = await listItens({ tema: temaId });
  if (itensVinculados.length > 0) {
    const err = new Error(
      `Não é possível excluir: existem ${itensVinculados.length} item(ns) vinculado(s) a este tema. Exclua ou mova esses itens primeiro.`
    );
    err.status = 409;
    throw err;
  }
  await notion.pages.update({ page_id: temaId, archived: true });
}

// ---------------------------------------------------------------------
// Itens
// ---------------------------------------------------------------------

/**
 * Lista itens aplicando filtros opcionais combinados com AND.
 * filtros: { tema, status, tipo, prioridade, q }
 */
async function listItens(filtros = {}) {
  const andFilters = [];

  if (filtros.tema) {
    andFilters.push({ property: 'Tema', relation: { contains: filtros.tema } });
  }
  if (filtros.status) {
    andFilters.push({ property: 'Status', select: { equals: filtros.status } });
  }
  if (filtros.tipo) {
    andFilters.push({ property: 'Tipo', select: { equals: filtros.tipo } });
  }
  if (filtros.prioridade) {
    andFilters.push({ property: 'Prioridade', select: { equals: filtros.prioridade } });
  }
  if (filtros.q) {
    andFilters.push({ property: 'Título', title: { contains: filtros.q } });
  }

  const query = {
    database_id: ITENS_DB_ID,
    page_size: 100,
  };
  if (andFilters.length === 1) query.filter = andFilters[0];
  if (andFilters.length > 1) query.filter = { and: andFilters };

  const results = [];
  let cursor;
  do {
    const response = await notion.databases.query({ ...query, start_cursor: cursor });
    results.push(...response.results);
    cursor = response.has_more ? response.next_cursor : undefined;
  } while (cursor);

  return results.map(mapItem);
}

/**
 * Cria um novo item. Origem e sempre fixada como "App".
 */
async function createItem(dados) {
  const properties = {
    'Título': { title: [{ text: { content: dados.titulo || 'Sem título' } }] },
    Origem: { select: { name: 'App' } },
  };

  if (dados.temaId) {
    properties.Tema = { relation: [{ id: dados.temaId }] };
  }
  if (dados.tipo) {
    properties.Tipo = { select: { name: dados.tipo } };
  }
  if (dados.descricao) {
    properties['Descrição'] = { rich_text: buildRichText(dados.descricao) };
  }
  if (dados.responsavel) {
    properties['Responsável'] = { rich_text: buildRichText(dados.responsavel) };
  }
  if (dados.status) {
    properties.Status = { select: { name: dados.status } };
  }
  if (dados.prazo) {
    properties.Prazo = { date: { start: dados.prazo } };
  }
  if (dados.dataReuniao) {
    properties['Data Reunião'] = { date: { start: dados.dataReuniao } };
  }
  if (dados.prioridade) {
    properties.Prioridade = { select: { name: dados.prioridade } };
  }
  if (typeof dados.priorizadoHoje === 'boolean') {
    properties['Priorizado Hoje'] = { checkbox: dados.priorizadoHoje };
  }
  if (dados.reuniaoOrigem) {
    properties['Reunião de Origem'] = { rich_text: buildRichText(dados.reuniaoOrigem) };
  }
  if (dados.anotacoesDiarias) {
    properties['Anotações Diárias'] = { rich_text: buildRichText(dados.anotacoesDiarias) };
  }
  if (dados.urlAta) {
    properties['URL da Ata'] = { url: dados.urlAta };
  }

  const page = await notion.pages.create({
    parent: { database_id: ITENS_DB_ID },
    properties,
  });

  return mapItem(page);
}

/**
 * Atualiza campos de um item existente (status, prioridade, responsavel,
 * prazo, titulo, descricao, tipo, tema).
 */
async function updateItem(itemId, dados) {
  const properties = {};

  if (dados.titulo !== undefined) {
    properties['Título'] = { title: [{ text: { content: dados.titulo } }] };
  }
  if (dados.temaId !== undefined) {
    properties.Tema = { relation: dados.temaId ? [{ id: dados.temaId }] : [] };
  }
  if (dados.tipo !== undefined) {
    properties.Tipo = { select: dados.tipo ? { name: dados.tipo } : null };
  }
  if (dados.descricao !== undefined) {
    properties['Descrição'] = { rich_text: buildRichText(dados.descricao) };
  }
  if (dados.responsavel !== undefined) {
    properties['Responsável'] = { rich_text: buildRichText(dados.responsavel) };
  }
  if (dados.status !== undefined) {
    properties.Status = { select: dados.status ? { name: dados.status } : null };
  }
  if (dados.prazo !== undefined) {
    properties.Prazo = { date: dados.prazo ? { start: dados.prazo } : null };
  }
  if (dados.dataReuniao !== undefined) {
    properties['Data Reunião'] = { date: dados.dataReuniao ? { start: dados.dataReuniao } : null };
  }
  if (dados.prioridade !== undefined) {
    properties.Prioridade = { select: dados.prioridade ? { name: dados.prioridade } : null };
  }
  if (dados.priorizadoHoje !== undefined) {
    properties['Priorizado Hoje'] = { checkbox: !!dados.priorizadoHoje };
  }
  if (dados.reuniaoOrigem !== undefined) {
    properties['Reunião de Origem'] = { rich_text: buildRichText(dados.reuniaoOrigem) };
  }
  if (dados.anotacoesDiarias !== undefined) {
    properties['Anotações Diárias'] = { rich_text: buildRichText(dados.anotacoesDiarias) };
  }
  if (dados.urlAta !== undefined) {
    properties['URL da Ata'] = { url: dados.urlAta || null };
  }

  const page = await notion.pages.update({ page_id: itemId, properties });
  return mapItem(page);
}

async function setPriorizadoHoje(itemId, valor) {
  const page = await notion.pages.update({
    page_id: itemId,
    properties: { 'Priorizado Hoje': { checkbox: valor } },
  });
  return mapItem(page);
}

/**
 * Exclui (arquiva no Notion) um item.
 */
async function deleteItem(itemId) {
  await notion.pages.update({ page_id: itemId, archived: true });
}

/**
 * Retorna todos os itens agrupados por Status (para a view Kanban).
 */
async function getKanban() {
  const itens = await listItens();
  const colunas = {
    Pendente: [],
    'Em Andamento': [],
    'Bloqueada': [],
    'Concluída': [],
    'Não se aplica': [],
  };
  for (const item of itens) {
    const coluna = item.status && colunas[item.status] ? item.status : 'Pendente';
    colunas[coluna].push(item);
  }
  return colunas;
}

/**
 * Dados da tela "Hoje": temas com foco ativo + itens priorizados hoje.
 */
async function getDashboardSemana() {
  const [temas, itensPriorizados] = await Promise.all([
    listTemas(),
    listItens(),
  ]);

  const temasEmFoco = temas.filter((t) => t.focoDaSemana);
  const itensHoje = itensPriorizados.filter((i) => i.priorizadoHoje);

  return { temasEmFoco, itensHoje };
}

// ---------------------------------------------------------------------
// Hábitos
// ---------------------------------------------------------------------

/**
 * Lista hábitos. filtros.ativo (boolean) restringe a apenas ativos/pausados;
 * sem filtro, retorna todos (usado na tela de gerenciamento de hábitos).
 */
async function listHabitos(filtros = {}) {
  const query = { database_id: HABITOS_DB_ID, page_size: 100 };
  if (typeof filtros.ativo === 'boolean') {
    query.filter = { property: 'Ativo', checkbox: { equals: filtros.ativo } };
  }

  const results = [];
  let cursor;
  do {
    const response = await notion.databases.query({ ...query, start_cursor: cursor });
    results.push(...response.results);
    cursor = response.has_more ? response.next_cursor : undefined;
  } while (cursor);

  return results.map(mapHabito);
}

/**
 * Cria um novo hábito. "Ativo" default true se não informado.
 */
async function createHabito(dados) {
  const properties = {
    'Título do Hábito': { title: [{ text: { content: dados.titulo || 'Sem título' } }] },
    Ativo: { checkbox: dados.ativo === undefined ? true : !!dados.ativo },
  };
  if (dados.descricao) {
    properties['Descrição'] = { rich_text: buildRichText(dados.descricao) };
  }
  if (Array.isArray(dados.diasSemana)) {
    properties['Dias da Semana'] = { multi_select: dados.diasSemana.map((nome) => ({ name: nome })) };
  }
  if (dados.horario) {
    properties['Horário'] = { rich_text: buildRichText(dados.horario) };
  }

  const page = await notion.pages.create({ parent: { database_id: HABITOS_DB_ID }, properties });
  return mapHabito(page);
}

/**
 * Atualiza campos de um hábito existente.
 */
async function updateHabito(habitoId, dados) {
  const properties = {};

  if (dados.titulo !== undefined) {
    properties['Título do Hábito'] = { title: [{ text: { content: dados.titulo } }] };
  }
  if (dados.descricao !== undefined) {
    properties['Descrição'] = { rich_text: buildRichText(dados.descricao) };
  }
  if (dados.diasSemana !== undefined) {
    properties['Dias da Semana'] = {
      multi_select: (dados.diasSemana || []).map((nome) => ({ name: nome })),
    };
  }
  if (dados.horario !== undefined) {
    properties['Horário'] = { rich_text: buildRichText(dados.horario || '') };
  }
  if (dados.ativo !== undefined) {
    properties['Ativo'] = { checkbox: !!dados.ativo };
  }

  const page = await notion.pages.update({ page_id: habitoId, properties });
  return mapHabito(page);
}

/**
 * Exclui (arquiva no Notion) um hábito. Os registros de check-in
 * associados permanecem no histórico (não são apagados junto).
 */
async function deleteHabito(habitoId) {
  await notion.pages.update({ page_id: habitoId, archived: true });
}

/** Busca registros de check-in de um hábito numa data específica. */
async function findRegistros(habitoId, data) {
  const response = await notion.databases.query({
    database_id: REGISTROS_HABITOS_DB_ID,
    filter: {
      and: [
        { property: 'Hábito', relation: { contains: habitoId } },
        { property: 'Data', date: { equals: data } },
      ],
    },
    page_size: 5,
  });
  return response.results;
}

/**
 * Marca (ou desmarca) o check-in de um hábito numa data ("YYYY-MM-DD").
 * Marcar cria uma página em Registro de Hábitos; desmarcar arquiva a(s)
 * página(s) existente(s) para aquele hábito+data — idempotente nos dois
 * sentidos.
 */
async function setCheckin(habitoId, data, concluido) {
  const existentes = await findRegistros(habitoId, data);

  if (concluido) {
    if (existentes.length === 0) {
      const habitoPage = await notion.pages.retrieve({ page_id: habitoId });
      const tituloHabito = getTitle(habitoPage.properties['Título do Hábito']);
      await notion.pages.create({
        parent: { database_id: REGISTROS_HABITOS_DB_ID },
        properties: {
          Nome: { title: [{ text: { content: `${tituloHabito} — ${data}` } }] },
          'Hábito': { relation: [{ id: habitoId }] },
          Data: { date: { start: data } },
        },
      });
    }
    return { concluido: true };
  }

  await Promise.all(
    existentes.map((page) => notion.pages.update({ page_id: page.id, archived: true }))
  );
  return { concluido: false };
}

/**
 * Hábitos ativos previstos para o dia da semana de "data" ("YYYY-MM-DD"),
 * cada um com a flag concluidoHoje indicando se já há check-in nessa data.
 * Ordenados por horário.
 */
async function getHabitosHoje(data) {
  const diaSemana = diaDaSemanaDe(data);
  const habitosAtivos = await listHabitos({ ativo: true });
  const habitosDoDia = habitosAtivos.filter((h) => h.diasSemana.includes(diaSemana));
  if (habitosDoDia.length === 0) return [];

  const response = await notion.databases.query({
    database_id: REGISTROS_HABITOS_DB_ID,
    filter: { property: 'Data', date: { equals: data } },
    page_size: 100,
  });
  const concluidosHoje = new Set(response.results.map(mapRegistro).map((r) => r.habitoId));

  return habitosDoDia
    .map((h) => ({ ...h, concluidoHoje: concluidosHoje.has(h.id) }))
    .sort((a, b) => (a.horario || '').localeCompare(b.horario || ''));
}

/**
 * Datas ("YYYY-MM-DD") em que um hábito foi concluído, das mais recentes
 * para as mais antigas, limitado a "dias" registros.
 */
async function getHistoricoHabito(habitoId, dias = 30) {
  const response = await notion.databases.query({
    database_id: REGISTROS_HABITOS_DB_ID,
    filter: { property: 'Hábito', relation: { contains: habitoId } },
    sorts: [{ property: 'Data', direction: 'descending' }],
    page_size: Math.min(Math.max(Number(dias) || 30, 1), 100),
  });
  return response.results.map(mapRegistro).map((r) => r.data).filter(Boolean);
}

module.exports = {
  TEMAS_DB_ID,
  ITENS_DB_ID,
  HABITOS_DB_ID,
  REGISTROS_HABITOS_DB_ID,
  listTemas,
  createTema,
  updateTema,
  setFocoSemana,
  deleteTema,
  listItens,
  createItem,
  updateItem,
  setPriorizadoHoje,
  deleteItem,
  getKanban,
  getDashboardSemana,
  listHabitos,
  createHabito,
  updateHabito,
  deleteHabito,
  setCheckin,
  getHabitosHoje,
  getHistoricoHabito,
};
