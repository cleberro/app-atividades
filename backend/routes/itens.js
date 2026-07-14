const express = require('express');
const notionService = require('../services/notionService');
const cache = require('../cache');

const router = express.Router();

// GET /api/itens/kanban - itens agrupados por Status
// (declarada antes de "/:id" implicito para nao colidir com outras rotas)
router.get('/kanban', async (req, res, next) => {
  try {
    const cacheKey = 'itens:kanban';
    const cached = cache.get(cacheKey);
    if (cached) return res.json(cached);

    const colunas = await notionService.getKanban();
    cache.set(cacheKey, colunas);
    res.json(colunas);
  } catch (err) {
    next(err);
  }
});

// GET /api/itens?tema=&status=&tipo=&prioridade=&q=
router.get('/', async (req, res, next) => {
  try {
    const { tema, status, tipo, prioridade, q } = req.query;
    const cacheKey = `itens:list:${JSON.stringify({ tema, status, tipo, prioridade, q })}`;
    const cached = cache.get(cacheKey);
    if (cached) return res.json(cached);

    const itens = await notionService.listItens({ tema, status, tipo, prioridade, q });
    cache.set(cacheKey, itens);
    res.json(itens);
  } catch (err) {
    next(err);
  }
});

// POST /api/itens - cria novo item (Origem = "App")
router.post('/', async (req, res, next) => {
  try {
    const { titulo } = req.body;
    if (!titulo || !titulo.trim()) {
      return res.status(400).json({ error: 'Campo "titulo" é obrigatório.' });
    }
    const item = await notionService.createItem(req.body);
    cache.invalidate(['itens:', 'dashboard:', 'temas:']);
    res.status(201).json(item);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/itens/:id - atualiza status/prioridade/responsavel/prazo/etc.
router.patch('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const item = await notionService.updateItem(id, req.body);
    cache.invalidate(['itens:', 'dashboard:', 'temas:']);
    res.json(item);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/itens/:id/priorizar-hoje - alterna "Priorizado Hoje"
router.patch('/:id/priorizar-hoje', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { priorizadoHoje } = req.body;
    if (typeof priorizadoHoje !== 'boolean') {
      return res.status(400).json({ error: 'Campo "priorizadoHoje" (boolean) é obrigatório no body.' });
    }
    const item = await notionService.setPriorizadoHoje(id, priorizadoHoje);
    cache.invalidate(['itens:', 'dashboard:']);
    res.json(item);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/itens/:id - exclui (arquiva) um item
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    await notionService.deleteItem(id);
    cache.invalidate(['itens:', 'dashboard:', 'temas:']);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

module.exports = router;
