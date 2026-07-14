require('dotenv').config();

const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const temasRouter = require('./routes/temas');
const itensRouter = require('./routes/itens');
const dashboardRouter = require('./routes/dashboard');

const app = express();
const PORT = process.env.PORT || 4000;
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173';

// Necessário na Vercel (e em qualquer host atrás de proxy/load balancer):
// sem isso, express-rate-limit rejeita as requisições porque não confia no
// cabeçalho X-Forwarded-For enviado pelo proxy.
app.set('trust proxy', 1);

app.use(cors({ origin: CORS_ORIGIN }));
app.use(express.json());

// Rate limit basico para proteger o token do Notion de uso abusivo.
const limiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', limiter);

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    notionConfigured: Boolean(process.env.NOTION_API_KEY),
    timestamp: new Date().toISOString(),
  });
});

app.use('/api/temas', temasRouter);
app.use('/api/itens', itensRouter);
app.use('/api/dashboard', dashboardRouter);

// Handler de erro central: traduz erros da API do Notion (ex.: 401 sem
// token valido) em respostas JSON legiveis para o frontend.
app.use((err, req, res, next) => {
  console.error('[erro]', err.body || err.message || err);

  const isUnauthorized = err.status === 401 || err.code === 'unauthorized';
  const status = isUnauthorized ? 401 : (err.status || 500);
  const message =
    isUnauthorized
      ? 'Não foi possível autenticar com o Notion. Verifique se NOTION_API_KEY está definido no .env e se a página foi compartilhada com a integração.'
      : err.message || 'Erro interno no servidor.';

  res.status(typeof status === 'number' ? status : 500).json({ error: message });
});

if (!process.env.NOTION_API_KEY) {
  console.warn(
    '[aviso] NOTION_API_KEY não definido. As chamadas ao Notion retornarão 401. Veja o README para configurar.'
  );
}

// Na Vercel o app roda como função serverless (importado por api/index.js,
// que chama app diretamente como handler) — não deve abrir uma porta própria.
// Localmente (npm start / npm run dev), continua subindo um servidor normal.
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Backend Gestão de Temas TI - Vicunha rodando em http://localhost:${PORT}`);
  });
}

module.exports = app;