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

/**
 * Dias corridos entre "prazo" e "dataReferencia" (ambos "YYYY-MM-DD"), em
 * aritmética UTC. Positivo = prazo no passado (vencido); negativo = prazo
 * no futuro; não força um mínimo — quem decide se "está vencido" é quem
 * chama, comparando o resultado com zero (ver montarMensagemItens).
 */
function diasDeAtraso(prazo, dataReferencia) {
  const [pa, pm, pd] = prazo.split('-').map(Number);
  const [ra, rm, rd] = dataReferencia.split('-').map(Number);
  const msPorDia = 24 * 60 * 60 * 1000;
  const diff = Date.UTC(ra, rm - 1, rd) - Date.UTC(pa, pm - 1, pd);
  return Math.round(diff / msPorDia);
}

/**
 * Monta uma mensagem com a lista de itens para um contato, no mesmo
 * "design system" do app: os emoji de status/prioridade reproduzem as
 * cores usadas nos Pills da interface, e o texto usa negrito/itálico do
 * WhatsApp para hierarquia visual equivalente à dos cards. "cabecalho" é
 * a primeira linha (varia conforme o motivo do envio — vencidos ou envio
 * manual por tema); a anotação "venceu há N dia(s)" só aparece quando o
 * item realmente já passou de "dataReferencia".
 */
function montarMensagemItens(contato, itens, dataReferencia, cabecalho) {
  const linhas = [];
  linhas.push(cabecalho);
  linhas.push('');
  linhas.push(`Olá, ${limparMarkdown(contato.nome)}! Segue a lista de *${itens.length}* item(ns):`);

  for (const item of itens) {
    const statusEmoji = STATUS_EMOJI[item.status] || '⚪';
    const prioridadeEmoji = item.prioridade ? PRIORIDADE_EMOJI[item.prioridade] || '⚪' : null;
    // O atraso é medido pelo prazo efetivo (reprogramação, quando houver),
    // a mesma regra usada pelo app e pelo getItensVencidos().
    const prazoEfetivo = item.dataReprogramacao || item.prazo || null;
    const atraso = prazoEfetivo ? diasDeAtraso(prazoEfetivo, dataReferencia) : null;
    const estaVencido = atraso !== null && atraso > 0;
    const sufixoAtraso = estaVencido ? ` _(venceu há ${atraso} dia(s))_` : '';

    linhas.push('');
    linhas.push('▬▬▬▬▬▬▬▬▬▬');
    linhas.push(`${statusEmoji} *${limparMarkdown(item.titulo)}*`);
    if (item.temaNome) linhas.push(`📁 Tema: ${limparMarkdown(item.temaNome)}`);
    linhas.push(`👤 Responsável: ${item.responsavel ? limparMarkdown(item.responsavel) : '—'}`);
    linhas.push(`📅 Prazo: ${formatarDataBr(item.prazo)}${item.dataReprogramacao ? '' : sufixoAtraso}`);
    if (item.dataReprogramacao) {
      linhas.push(`🔁 Reprogramado para: ${formatarDataBr(item.dataReprogramacao)}${sufixoAtraso}`);
    }
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
    // O corpo de erro do CallMeBot ecoa "Message to: ... Text to send:
    // {a mensagem inteira}" ANTES do motivo real do erro — para mensagens
    // longas (o normal aqui, com vários itens), um truncamento simples
    // dos primeiros N caracteres cortava exatamente a parte útil. O
    // motivo real vem sempre no último bloco "<p ...>", depois do eco.
    const blocos = corpo.split(/<p\b[^>]*>/i);
    const ultimoBloco = blocos[blocos.length - 1] || corpo;
    const textoLimpo = ultimoBloco.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    throw new Error(`CallMeBot não confirmou o envio: ${textoLimpo.slice(0, 300) || `HTTP ${response.status}`}`);
  }
  return corpo;
}

/**
 * Envia, para cada contato do grupo, uma mensagem com os itens dele (o
 * texto de "cabecalho" muda conforme o motivo do envio). Em série, com um
 * pequeno intervalo entre envios — o CallMeBot é um serviço gratuito com
 * limite de taxa por número. Nunca lança: cada contato tem seu próprio
 * resultado (sucesso ou erro) no array retornado, para um envio com falha
 * não travar os demais.
 */
async function enviarAvisos(gruposPorContato, dataReferencia, cabecalho) {
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
      const mensagem = montarMensagemItens(contato, itens, dataReferencia, cabecalho);
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

module.exports = { montarMensagemItens, enviarWhatsapp, enviarAvisos };
