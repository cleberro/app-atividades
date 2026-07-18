const express = require('express');
const notionService = require('../services/notionService');
const emailService = require('../services/emailService');
const cache = require('../cache');

const router = express.Router();

const DATA_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TIPOS_RECORRENCIA = ['Diária', 'Semanal', 'Mensal'];

// ---------------------------------------------------------------------
// Destinatários do resumo diário (rotas literais — antes de "/:id")
// ---------------------------------------------------------------------

router.get('/destinatarios', async (req, res, next) => {
  try {
    const cacheKey = 'rotinas:destinatarios';
    const cached = cache.get(cacheKey);
    if (cached) return res.json(cached);

    const destinatarios = await notionService.listDestinatarios();
    cache.set(cacheKey, destinatarios);
    res.json(destinatarios);
  } catch (err) {
    next(err);
  }
});

router.post('/destinatarios', async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email || !EMAIL_REGEX.test(email.trim())) {
      return res.status(400).json({ error: 'Campo "email" é obrigatório e deve ser um e-mail válido.' });
    }
    const destinatario = await notionService.createDestinatario(email.trim());
    cache.invalidate(['rotinas:destinatarios']);
    res.status(201).json(destinatario);
  } catch (err) {
    next(err);
  }
});

router.patch('/destinatarios/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const destinatario = await notionService.updateDestinatario(id, req.body);
    cache.invalidate(['rotinas:destinatarios']);
    res.json(destinatario);
  } catch (err) {
    next(err);
  }
});

router.delete('/destinatarios/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    await notionService.deleteDestinatario(id);
    cache.invalidate(['rotinas:destinatarios']);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------
// Resumo diário por e-mail (usado pelo Vercel Cron — ver vercel.json)
// ---------------------------------------------------------------------

// GET /api/rotinas/resumo-diario?data=YYYY-MM-DD - por padrão, "ontem" no
// fuso America/Sao_Paulo. Protegida por CRON_SECRET quando configurado
// (a Vercel injeta "Authorization: Bearer <CRON_SECRET>" automaticamente
// nas chamadas agendadas).
router.get('/resumo-diario', async (req, res, next) => {
  try {
    if (process.env.CRON_SECRET) {
      const auth = req.headers.authorization;
      if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
        return res.status(401).json({ error: 'Não autorizado.' });
      }
    }

    const dataAlvo = req.query.data && DATA_REGEX.test(req.query.data)
      ? req.query.data
      : notionService.ontemSaoPaulo();

    const resumo = await notionService.getResumoDiario(dataAlvo);
    const destinatarios = (await notionService.listDestinatarios())
      .filter((d) => d.ativo)
      .map((d) => d.email);

    const envio = await emailService.enviarResumoDiario(destinatarios, resumo);
    res.json({ resumo, envio });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------
// Rotinas
// ---------------------------------------------------------------------

// GET /api/rotinas?data=YYYY-MM-DD&ativo=true|false
router.get('/', async (req, res, next) => {
  try {
    const { data, ativo } = req.query;
    if (!data || !DATA_REGEX.test(data)) {
      return res.status(400).json({ error: 'Parâmetro "data" (YYYY-MM-DD) é obrigatório na query string.' });
    }
    const filtros = {};
    if (ativo === 'true') filtros.ativo = true;
    if (ativo === 'false') filtros.ativo = false;

    const cacheKey = `rotinas:list:${data}:${JSON.stringify(filtros)}`;
    const cached = cache.get(cacheKey);
    if (cached) return res.json(cached);

    const rotinas = await notionService.listRotinas(data, filtros);
    cache.set(cacheKey, rotinas);
    res.json(rotinas);
  } catch (err) {
    next(err);
  }
});

// POST /api/rotinas - cria uma nova rotina
router.post('/', async (req, res, next) => {
  try {
    const { nome, tipoRecorrencia, tempoTotal } = req.body;
    if (!nome || !nome.trim()) {
      return res.status(400).json({ error: 'Campo "nome" é obrigatório.' });
    }
    if (!TIPOS_RECORRENCIA.includes(tipoRecorrencia)) {
      return res.status(400).json({ error: 'Campo "tipoRecorrencia" deve ser Diária, Semanal ou Mensal.' });
    }
    if (!(Number(tempoTotal) > 0)) {
      return res.status(400).json({ error: 'Campo "tempoTotal" (minutos, maior que zero) é obrigatório.' });
    }
    const rotina = await notionService.createRotina(req.body);
    cache.invalidate(['rotinas:']);
    res.status(201).json(rotina);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/rotinas/:id - atualiza nome/tipoRecorrencia/tempoTotal/ativo
router.patch('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    if (req.body.tipoRecorrencia !== undefined && !TIPOS_RECORRENCIA.includes(req.body.tipoRecorrencia)) {
      return res.status(400).json({ error: 'Campo "tipoRecorrencia" deve ser Diária, Semanal ou Mensal.' });
    }
    const rotina = await notionService.updateRotina(id, req.body);
    cache.invalidate(['rotinas:']);
    res.json(rotina);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/rotinas/:id - exclui (arquiva) uma rotina
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    await notionService.deleteRotina(id);
    cache.invalidate(['rotinas:']);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

// GET /api/rotinas/:id/apontamentos?data=YYYY-MM-DD - apontamentos do
// período de recorrência que contém "data"
router.get('/:id/apontamentos', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { data } = req.query;
    if (!data || !DATA_REGEX.test(data)) {
      return res.status(400).json({ error: 'Parâmetro "data" (YYYY-MM-DD) é obrigatório na query string.' });
    }

    const cacheKey = `rotinas:apontamentos:${id}:${data}`;
    const cached = cache.get(cacheKey);
    if (cached) return res.json(cached);

    const apontamentos = await notionService.listApontamentosDaRotina(id, data);
    cache.set(cacheKey, apontamentos);
    res.json(apontamentos);
  } catch (err) {
    next(err);
  }
});

// POST /api/rotinas/:id/apontamentos - registra tempo; recusa com 409 se o
// tempo total da rotina já tiver sido atingido no período
router.post('/:id/apontamentos', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { data, minutos } = req.body;
    if (!data || !DATA_REGEX.test(data)) {
      return res.status(400).json({ error: 'Campo "data" (YYYY-MM-DD) é obrigatório no body.' });
    }
    if (!(Number(minutos) > 0)) {
      return res.status(400).json({ error: 'Campo "minutos" (maior que zero) é obrigatório no body.' });
    }
    const resultado = await notionService.criarApontamento(id, req.body);
    cache.invalidate(['rotinas:']);
    res.status(201).json(resultado);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/rotinas/apontamentos/:apontamentoId - remove um apontamento
router.delete('/apontamentos/:apontamentoId', async (req, res, next) => {
  try {
    const { apontamentoId } = req.params;
    await notionService.deleteApontamento(apontamentoId);
    cache.invalidate(['rotinas:']);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

module.exports = router;
