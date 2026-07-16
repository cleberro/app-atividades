const express = require('express');
const notionService = require('../services/notionService');
const cache = require('../cache');

const router = express.Router();

const DATA_REGEX = /^\d{4}-\d{2}-\d{2}$/;

// GET /api/habitos/hoje?data=YYYY-MM-DD - hábitos previstos para o dia
// (declarada antes de "/:id" para não colidir com ele)
router.get('/hoje', async (req, res, next) => {
  try {
    const { data } = req.query;
    if (!data || !DATA_REGEX.test(data)) {
      return res.status(400).json({ error: 'Parâmetro "data" (YYYY-MM-DD) é obrigatório na query string.' });
    }

    const cacheKey = `habitos:hoje:${data}`;
    const cached = cache.get(cacheKey);
    if (cached) return res.json(cached);

    const habitos = await notionService.getHabitosHoje(data);
    cache.set(cacheKey, habitos);
    res.json(habitos);
  } catch (err) {
    next(err);
  }
});

// GET /api/habitos?ativo=true|false
router.get('/', async (req, res, next) => {
  try {
    const { ativo } = req.query;
    const filtros = {};
    if (ativo === 'true') filtros.ativo = true;
    if (ativo === 'false') filtros.ativo = false;

    const cacheKey = `habitos:list:${JSON.stringify(filtros)}`;
    const cached = cache.get(cacheKey);
    if (cached) return res.json(cached);

    const habitos = await notionService.listHabitos(filtros);
    cache.set(cacheKey, habitos);
    res.json(habitos);
  } catch (err) {
    next(err);
  }
});

// POST /api/habitos - cria um novo hábito
router.post('/', async (req, res, next) => {
  try {
    const { titulo } = req.body;
    if (!titulo || !titulo.trim()) {
      return res.status(400).json({ error: 'Campo "titulo" é obrigatório.' });
    }
    const habito = await notionService.createHabito(req.body);
    cache.invalidate(['habitos:']);
    res.status(201).json(habito);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/habitos/:id - atualiza título/descrição/dias/horário/ativo
router.patch('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const habito = await notionService.updateHabito(id, req.body);
    cache.invalidate(['habitos:']);
    res.json(habito);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/habitos/:id - exclui (arquiva) um hábito
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    await notionService.deleteHabito(id);
    cache.invalidate(['habitos:']);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

// PATCH /api/habitos/:id/checkin - marca/desmarca conclusão numa data
router.patch('/:id/checkin', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { data, concluido } = req.body;
    if (!data || !DATA_REGEX.test(data)) {
      return res.status(400).json({ error: 'Campo "data" (YYYY-MM-DD) é obrigatório no body.' });
    }
    if (typeof concluido !== 'boolean') {
      return res.status(400).json({ error: 'Campo "concluido" (boolean) é obrigatório no body.' });
    }
    const resultado = await notionService.setCheckin(id, data, concluido);
    cache.invalidate(['habitos:']);
    res.json(resultado);
  } catch (err) {
    next(err);
  }
});

// GET /api/habitos/:id/historico?dias=30 - datas concluídas mais recentes
router.get('/:id/historico', async (req, res, next) => {
  try {
    const { id } = req.params;
    const dias = req.query.dias ? Number(req.query.dias) : 30;

    const cacheKey = `habitos:historico:${id}:${dias}`;
    const cached = cache.get(cacheKey);
    if (cached) return res.json(cached);

    const datasConcluidas = await notionService.getHistoricoHabito(id, dias);
    const payload = { datasConcluidas };
    cache.set(cacheKey, payload);
    res.json(payload);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
