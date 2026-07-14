// Handler serverless da Vercel. Reexporta o app Express do backend — o
// próprio Express implementa a assinatura (req, res) esperada pela Vercel,
// então não é preciso nenhum wrapper além deste.
module.exports = require('../backend/server');
