const express = require('express');
const notionService = require('../services/notionService');
const whatsappService = require('../services/whatsappService');
const cache = require('../cache');

const router = express.Router();

const DATA_REGEX = /^\d{4}-\d{2}-\d{2}$/;

// ---------------------------------------------------------------------
// Contatos WhatsApp (rotas literais — antes de "/:id")
// ---------------------------------------------------------------------

router.get('/contatos', async (req, res, next) => {
  try {
    const cacheKey = 'whatsapp:contatos';
    const cached = cache.get(cacheKey);
    if (cached) return res.json(cached);

    const contatos = await notionService.listContatosWhatsapp();
    cache.set(cacheKey, contatos);
    res.json(contatos);
  } catch (err) {
    next(err);
  }
});

router.post('/contatos', async (req, res, next) => {
  try {
    const { nome, telefone, apiKeyCallMeBot } = req.body;
    if (!nome || !nome.trim()) {
      return res.status(400).json({ error: 'Campo "nome" é obrigatório.' });
    }
    if (!telefone || telefone.replace(/\D/g, '').length < 8) {
      return res.status(400).json({ error: 'Campo "telefone" é obrigatório (com DDI + DDD, só números).' });
    }
    if (!apiKeyCallMeBot || !apiKeyCallMeBot.trim()) {
      return res.status(400).json({
        error:
          'Campo "apiKeyCallMeBot" é obrigatório. Esse número precisa mandar uma mensagem para o CallMeBot uma vez para gerar a apikey — veja o README.',
      });
    }
    const contato = await notionService.createContatoWhatsapp(req.body);
    cache.invalidate(['whatsapp:contatos']);
    res.status(201).json(contato);
  } catch (err) {
    next(err);
  }
});

router.patch('/contatos/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const contato = await notionService.updateContatoWhatsapp(id, req.body);
    cache.invalidate(['whatsapp:contatos']);
    res.json(contato);
  } catch (err) {
    next(err);
  }
});

router.delete('/contatos/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    await notionService.deleteContatoWhatsapp(id);
    cache.invalidate(['whatsapp:contatos']);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------
// Aviso de itens vencidos (usado pelo Vercel Cron — ver vercel.json)
// ---------------------------------------------------------------------

// GET /api/whatsapp/vencidos?data=YYYY-MM-DD - por padrão, hoje no fuso
// America/Sao_Paulo. Protegida por CRON_SECRET quando configurado (mesmo
// esquema de /api/rotinas/resumo-diario).
router.get('/vencidos', async (req, res, next) => {
  try {
    if (process.env.CRON_SECRET) {
      const auth = req.headers.authorization;
      if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
        return res.status(401).json({ error: 'Não autorizado.' });
      }
    }

    const dataReferencia =
      req.query.data && DATA_REGEX.test(req.query.data) ? req.query.data : notionService.hojeSaoPaulo();

    const gruposPorContato = await notionService.getVencidosPorContato(dataReferencia);
    const envios = await whatsappService.enviarAvisosVencidos(gruposPorContato, dataReferencia);

    res.json({
      data: dataReferencia,
      contatosNotificados: gruposPorContato.length,
      envios,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
