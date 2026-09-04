/**
 * adicionar-campos-itens.js
 * -----------------------------------------------------------------------
 * Migracao de schema da database "Itens - Acoes e Informacoes" do Notion.
 *
 * Cria as propriedades de detalhamento do item (objetivo, situacao atual,
 * situacao desejada, plano de acao, delegacao) e as de atraso/reprogramacao.
 * NAO cria a database nem altera dados existentes - apenas acrescenta as
 * propriedades que ainda nao existirem.
 *
 * E idempotente: rodar duas vezes nao duplica nada, porque o script le o
 * schema atual antes e so envia ao Notion o que estiver faltando.
 *
 * Uso (a partir da pasta "backend", com NOTION_API_KEY no .env):
 *   node scripts/adicionar-campos-itens.js --dry-run   # so mostra o que faria
 *   node scripts/adicionar-campos-itens.js             # aplica
 * -----------------------------------------------------------------------
 */

require('dotenv').config();
const { Client } = require('@notionhq/client');

const ITENS_DB_ID = '8628bb86-8a72-4607-80a6-1da5d1938843';

// Propriedades a garantir na database, no formato aceito por databases.update.
// A chave e exatamente o nome da propriedade lido/escrito pelo notionService.
const PROPRIEDADES = {
  'Objetivo / Problema': { rich_text: {} },
  'Situação Atual': { rich_text: {} },
  'Situação Desejada': { rich_text: {} },
  'O Que Precisa Ser Feito': { rich_text: {} },
  'Pode Delegar': {
    select: {
      options: [
        { name: 'Sim', color: 'green' },
        { name: 'Não', color: 'red' },
        { name: 'A avaliar', color: 'yellow' },
      ],
    },
  },
  'Delegar Para': { rich_text: {} },
  'Motivo do Atraso': { rich_text: {} },
  'Data de Reprogramação': { date: {} },
};

async function main() {
  const dryRun = process.argv.includes('--dry-run');

  if (!process.env.NOTION_API_KEY) {
    console.error('NOTION_API_KEY nao definida - preencha o backend/.env antes de rodar.');
    process.exit(1);
  }

  const notion = new Client({ auth: process.env.NOTION_API_KEY });
  const db = await notion.databases.retrieve({ database_id: ITENS_DB_ID });
  const existentes = new Set(Object.keys(db.properties));

  const faltando = {};
  for (const [nome, definicao] of Object.entries(PROPRIEDADES)) {
    if (existentes.has(nome)) {
      console.log(`ja existe : ${nome}`);
    } else {
      faltando[nome] = definicao;
      console.log(`criar     : ${nome} (${Object.keys(definicao)[0]})`);
    }
  }

  const nomesFaltando = Object.keys(faltando);
  if (nomesFaltando.length === 0) {
    console.log('\nNada a fazer: a database ja tem todas as propriedades.');
    return;
  }
  if (dryRun) {
    console.log(`\n--dry-run: ${nomesFaltando.length} propriedade(s) seriam criadas. Nada foi alterado.`);
    return;
  }

  await notion.databases.update({ database_id: ITENS_DB_ID, properties: faltando });
  console.log(`\nOK: ${nomesFaltando.length} propriedade(s) criada(s) em "${db.title?.[0]?.plain_text || ITENS_DB_ID}".`);
}

main().catch((err) => {
  console.error('Falha na migracao:', err.code || '', err.message);
  process.exit(1);
});
