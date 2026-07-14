const express = require('express');
const notionService = require('../services/notionService');
const cache = require('../cache');

const router = express.Router();

// GET /api/dashboard/semana - temas em foco + itens priorizados hoje
router.get('/semana', async (req, res, next) => {
  try {
    const cacheKey = 'dashboard:semana';
    const cached = cache.get(cacheKey);
    if (cached) return res.json(cached);

    const dados = await notionService.getDashboardSemana();
    cache.set(cacheKey, dados);
    res.json(dados);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
