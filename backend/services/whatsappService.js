/**
 * whatsappService.js
 * -----------------------------------------------------------------------
 * Única camada de envio de WhatsApp (via CallMeBot). Nenhuma outra parte
 * do backend deve montar a URL da API do CallMeBot diretamente.
 *
 * CallMeBot não usa uma chave de API única do app (como a Resend) — cada
 * destinatário tem sua própria apikey, obtida enviando uma mensagem para
 * o número do bot uma única vez. Por isso a apikey fica guardada por
 * contato na database "Contatos WhatsApp" do Notion, não numa variável
 * de ambiente. Ver README para o passo a passo de cadastro de um contato.
 * -----------------------------------------------------------------------
 */

const CALLMEBOT_URL = 'https://api.callmebot.com/whatsapp.php';

// Emoji usados para status/prioridade reproduzem exatamente as mesmas
// cores do design system do app (ver frontend/src/components/Pills.tsx:
// STATUS_COLORS / PRIORIDADE_COLORS) — é a forma de manter a mesma
// linguagem visual num canal que só aceita texto simples.
const STATUS_EMOJI = {
  Pendente: '🟡',
  'Em Andamento': '🔵',
  Bloqueada: '🔴',
  'Concluída': '🟢',
  'Não se aplica': '⚪',
};

const PRIORIDADE_EMOJI = {
  Alta: '🔴',
  'Média': '🟡',
  Baixa: '🟢',
};

/** Remove caracteres de markdown do WhatsApp de texto vindo do usuário, para não quebrar a formatação da mensagem. */
function limparMarkdown(texto) {
  return String(texto ?? '').replace(/[*_~`]/g, '');
}

function formatarDataBr(dataISO) {
  if (!dataISO) return '—';
  const [ano, mes, dia] = dataISO.split('-');
  return `${dia}/${mes}/${ano}`;
}

/** Dias corridos entre "prazo" e "dataReferencia" (ambos "YYYY-MM-DD"), em aritmética UTC. */
function diasDeAtraso(prazo, dataReferencia) {
  const [pa, pm, pd] = prazo.split('-').map(Number);
  const [ra, rm, rd] = dataReferencia.split('-').map(Number);
  const msPorDia = 24 * 60 * 60 * 1000;
  const diff = Date.UTC(ra, rm - 1, rd) - Date.UTC(pa, pm - 1, pd);
  return Math.max(1, Math.round(diff / msPorDia));
}

/**
 * Monta a mensagem de aviso de itens vencidos para um contato, no mesmo
 * "design system" do app: os emoji de status/prioridade reproduzem as
 * cores usadas nos Pills da interface, e o texto usa negrito/itálico do
 * WhatsApp para hierarquia visual equivalente à dos cards.
 */
function montarMensagemVencidos(contato, itens, dataReferencia) {
  const linhas = [];
  linhas.push(`🔔 *Itens com prazo vencido — Gestão de Temas de TI*`);
  linhas.push('');
  linhas.push(
    `Olá, ${limparMarkdown(contato.nome)}! Você tem *${itens.length}* item(ns) com prazo vencido:`
  );

  for (const item of itens) {
    const statusEmoji = STATUS_EMOJI[item.status] || '⚪';
    const prioridadeEmoji = item.prioridade ? PRIORIDADE_EMOJI[item.prioridade] || '⚪' : null;
    const atraso = item.prazo ? diasDeAtraso(item.prazo, dataReferencia) : null;

    linhas.push('');
    linhas.push('▬▬▬▬▬▬▬▬▬▬');
    linhas.push(`${statusEmoji} *${limparMarkdown(item.titulo)}*`);
    if (item.temaNome) linhas.push(`📁 Tema: ${limparMarkdown(item.temaNome)}`);
    linhas.push(`👤 Responsável: ${item.responsavel ? limparMarkdown(item.responsavel) : '—'}`);
    linhas.push(
      `📅 Prazo: ${formatarDataBr(item.prazo)}${atraso ? ` _(venceu há ${atraso} dia(s))_` : ''}`
    );
    if (prioridadeEmoji) linhas.push(`${prioridadeEmoji} Prioridade: ${item.prioridade}`);
    linhas.push(`📊 Status: ${statusEmoji} ${item.status}`);
  }

  linhas.push('');
  linhas.push('▬▬▬▬▬▬▬▬▬▬');
  linhas.push('_Mensagem automática do app de Gestão de Temas de TI._');

  return linhas.join('\n');
}

/** Envia uma mensagem de texto livre via CallMeBot para um telefone/apikey específicos. */
async function enviarWhatsapp(telefone, apiKey, texto) {
  const telefoneLimpo = String(telefone).replace(/\D/g, '');
  const url = `${CALLMEBOT_URL}?phone=${encodeURIComponent(telefoneLimpo)}&text=${encodeURIComponent(
    texto
  )}&apikey=${encodeURIComponent(apiKey)}`;

  const response = await fetch(url);
  const corpo = await response.text();

  // O CallMeBot é inconsistente quanto ao status HTTP (já observado 200,
  // 203 e 503 tanto em sucesso quanto em erro) — o sinal confiável de
  // sucesso é o texto "Message queued" no corpo da resposta; qualquer
  // outra coisa (ex.: "APIKey is invalid", "Invalid phone number") é erro.
  const sucesso = /message queued/i.test(corpo);
  if (!sucesso) {
    const textoLimpo = corpo.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    throw new Error(`CallMeBot não confirmou o envio: ${textoLimpo.slice(0, 200) || `HTTP ${response.status}`}`);
  }
  return corpo;
}

/**
 * Envia o aviso de itens vencidos para cada contato do grupo, em série
 * (com um pequeno intervalo entre envios — o CallMeBot é um serviço
 * gratuito com limite de taxa por número). Nunca lança: cada contato tem
 * seu próprio resultado (sucesso ou erro) no array retornado, para um
 * envio com falha não travar os demais.
 */
async function enviarAvisosVencidos(gruposPorContato, dataReferencia) {
  const resultados = [];
  for (const { contato, itens } of gruposPorContato) {
    try {
      if (!contato.telefone || !contato.apiKeyCallMeBot) {
        resultados.push({
          contatoId: contato.id,
          nome: contato.nome,
          enviado: false,
          motivo: 'Telefone ou ApiKey CallMeBot não cadastrados para este contato.',
        });
        continue;
      }
      const mensagem = montarMensagemVencidos(contato, itens, dataReferencia);
      await enviarWhatsapp(contato.telefone, contato.apiKeyCallMeBot, mensagem);
      resultados.push({ contatoId: contato.id, nome: contato.nome, enviado: true, itens: itens.length });
    } catch (err) {
      resultados.push({
        contatoId: contato.id,
        nome: contato.nome,
        enviado: false,
        motivo: err.message || String(err),
      });
    }
    // Intervalo entre envios para não estourar o rate limit do CallMeBot.
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  return resultados;
}

module.exports = { montarMensagemVencidos, enviarWhatsapp, enviarAvisosVencidos };
