const express = require('express');
const notionService = require('../services/notionService');
const emailService = require('../services/emailService');
const cache = require('../cache');

const router = express.Router();

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ---------------------------------------------------------------------
// Contatos Email (rotas literais — antes de "/:id")
// ---------------------------------------------------------------------

router.get('/contatos', async (req, res, next) => {
  try {
    const cacheKey = 'email:contatos';
    const cached = cache.get(cacheKey);
    if (cached) return res.json(cached);

    const contatos = await notionService.listContatosEmail();
    cache.set(cacheKey, contatos);
    res.json(contatos);
  } catch (err) {
    next(err);
  }
});

router.post('/contatos', async (req, res, next) => {
  try {
    const { nome, email } = req.body;
    if (!nome || !nome.trim()) {
      return res.status(400).json({ error: 'Campo "nome" é obrigatório.' });
    }
    if (!email || !EMAIL_REGEX.test(email.trim())) {
      return res.status(400).json({ error: 'Campo "email" é obrigatório e deve ser um e-mail válido.' });
    }
    const contato = await notionService.createContatoEmail(req.body);
    cache.invalidate(['email:contatos']);
    res.status(201).json(contato);
  } catch (err) {
    next(err);
  }
});

router.patch('/contatos/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const contato = await notionService.updateContatoEmail(id, req.body);
    cache.invalidate(['email:contatos']);
    res.json(contato);
  } catch (err) {
    next(err);
  }
});

router.delete('/contatos/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    await notionService.deleteContatoEmail(id);
    cache.invalidate(['email:contatos']);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------
// Envio manual por tema
// ---------------------------------------------------------------------

// POST /api/email/temas/:temaId/enviar - envia, para os respectivos
// contatos de e-mail vinculados, os itens do tema que tiverem algum
// contato cadastrado — não filtra por prazo vencido.
router.post('/temas/:temaId/enviar', async (req, res, next) => {
  try {
    const { temaId } = req.params;
    const { temaNome, grupos } = await notionService.getItensPorTemaComContatoEmail(temaId);

    if (grupos.length === 0) {
      return res.json({ tema: temaNome, contatosNotificados: 0, envios: [] });
    }

    const envios = await emailService.enviarItensTemaPorEmail(grupos, temaNome || 'Sem nome');
    res.json({ tema: temaNome, contatosNotificados: grupos.length, envios });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
