const express = require('express');
const notionService = require('../services/notionService');
const cache = require('../cache');

const router = express.Router();

// GET /api/temas - lista os 12 temas + contagem de itens pendentes
router.get('/', async (req, res, next) => {
  try {
    const cacheKey = 'temas:list';
    const cached = cache.get(cacheKey);
    if (cached) return res.json(cached);

    const temas = await notionService.listTemas();
    cache.set(cacheKey, temas);
    res.json(temas);
  } catch (err) {
    next(err);
  }
});

// POST /api/temas - cria um novo tema manualmente
router.post('/', async (req, res, next) => {
  try {
    const { nome } = req.body;
    if (!nome || !nome.trim()) {
      return res.status(400).json({ error: 'Campo "nome" é obrigatório.' });
    }
    const tema = await notionService.createTema(req.body);
    cache.invalidate(['temas:', 'dashboard:']);
    res.status(201).json(tema);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/temas/:id - atualiza nome/categoria/descricao/status/prioridade/ordem
router.patch('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    if (req.body.nome !== undefined && !req.body.nome.trim()) {
      return res.status(400).json({ error: 'Campo "nome" não pode ficar vazio.' });
    }
    const tema = await notionService.updateTema(id, req.body);
    cache.invalidate(['temas:', 'dashboard:']);
    res.json(tema);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/temas/:id/foco - alterna "Foco da Semana"
router.patch('/:id/foco', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { focoDaSemana } = req.body;
    if (typeof focoDaSemana !== 'boolean') {
      return res.status(400).json({ error: 'Campo "focoDaSemana" (boolean) é obrigatório no body.' });
    }
    const tema = await notionService.setFocoSemana(id, focoDaSemana);
    cache.invalidate(['temas:', 'dashboard:']);
    res.json(tema);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/temas/:id - exclui (arquiva) um tema, se nao houver itens vinculados
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    await notionService.deleteTema(id);
    cache.invalidate(['temas:', 'dashboard:']);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

module.exports = router;
