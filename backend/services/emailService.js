/**
 * emailService.js
 * -----------------------------------------------------------------------
 * Única camada de envio de e-mail (via Resend). Nenhuma outra parte do
 * backend deve importar "resend" diretamente.
 *
 * Sem RESEND_API_KEY no .env, enviarResumoDiario() não falha — apenas não
 * envia nada e retorna { enviado: false }, para o endpoint de resumo
 * diário continuar utilizável (e testável) em ambientes sem a chave
 * configurada.
 * -----------------------------------------------------------------------
 */

const { Resend } = require('resend');

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

function escapeHtml(texto) {
  return String(texto ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[c]));
}

function formatarMinutos(minutos) {
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
}

function formatarDataBr(dataISO) {
  const [ano, mes, dia] = dataISO.split('-');
  return `${dia}/${mes}/${ano}`;
}

// Mesmas cores do design system do app (frontend/src/index.css e
// components/Pills.tsx), reproduzidas aqui porque o e-mail HTML não pode
// referenciar as variáveis CSS do frontend — precisa dos valores literais.
const CORES = {
  bgBase: '#14151F',
  bgSurface: '#1C1E2E',
  bgElevated: '#252740',
  textPrimary: '#F4F4F8',
  textMuted: '#9496B0',
  accentPrimary: '#6C5CE7',
  accentSecondary: '#00C2A8',
};

const STATUS_COLORS_EMAIL = {
  Pendente: '#FDCB6E',
  'Em Andamento': '#0984E3',
  Bloqueada: '#D63031',
  'Concluída': '#00B894',
  'Não se aplica': '#5A5C78',
};

const PRIORIDADE_COLORS_EMAIL = {
  Alta: '#D63031',
  'Média': '#FDCB6E',
  Baixa: '#00C2A8',
};

/** Pill inline-styled igual ao componente Pills.tsx: fundo na cor a ~15% + borda a ~33%. */
function montarPillHtml(texto, cor) {
  return `<span style="display:inline-block;padding:3px 10px;border-radius:9999px;font-size:12px;font-weight:600;background-color:${cor}26;color:${cor};border:1px solid ${cor}55;">${escapeHtml(
    texto
  )}</span>`;
}

/**
 * Monta o HTML com a lista de itens de um tema para um contato, no mesmo
 * design system do app (cores reais via CSS, não aproximação por emoji
 * como no WhatsApp — o e-mail permite reproduzir o visual dos Pills e dos
 * cards com fidelidade).
 */
function montarHtmlItensTema(contato, itens, nomeTema) {
  const cardsHtml = itens
    .map((item) => {
      const corStatus = STATUS_COLORS_EMAIL[item.status] || CORES.textMuted;
      const corPrioridade = item.prioridade ? PRIORIDADE_COLORS_EMAIL[item.prioridade] || CORES.textMuted : null;
      return `
        <div style="background-color:${CORES.bgSurface};border-radius:12px;padding:16px;margin-bottom:12px;">
          <p style="margin:0 0 10px;font-size:15px;font-weight:600;color:${CORES.textPrimary};">${escapeHtml(
            item.titulo
          )}</p>
          <div style="margin-bottom:10px;">
            ${montarPillHtml(item.status || 'Sem status', corStatus)}
            ${corPrioridade ? ' ' + montarPillHtml(item.prioridade, corPrioridade) : ''}
          </div>
          <p style="margin:4px 0;font-size:13px;color:${CORES.textMuted};">📁 Tema: ${escapeHtml(
            item.temaNome || nomeTema || '—'
          )}</p>
          <p style="margin:4px 0;font-size:13px;color:${CORES.textMuted};">👤 Responsável: ${escapeHtml(
            item.responsavel || '—'
          )}</p>
          <p style="margin:4px 0;font-size:13px;color:${CORES.textMuted};">📅 Prazo: ${
            item.prazo ? formatarDataBr(item.prazo) : '—'
          }</p>
        </div>
      `;
    })
    .join('');

  return `
    <div style="font-family: sans-serif; background-color:${CORES.bgBase}; padding:24px; color:${CORES.textPrimary};">
      <h2 style="margin:0 0 4px;">Itens do tema "${escapeHtml(nomeTema || '')}"</h2>
      <p style="color:${CORES.textMuted};margin:0 0 16px;">
        Olá, ${escapeHtml(contato.nome)}! Segue a lista de ${itens.length} item(ns):
      </p>
      ${cardsHtml}
      <p style="margin-top:16px;font-size:12px;color:${CORES.textMuted};">
        Mensagem automática do app de Gestão de Temas de TI.
      </p>
    </div>
  `;
}

/**
 * Envia, para cada contato do grupo, um e-mail com os itens do tema dele.
 * Nunca lança: cada contato tem seu próprio resultado (sucesso ou erro)
 * no array retornado, para uma falha não travar os demais.
 */
async function enviarItensTemaPorEmail(gruposPorContato, nomeTema) {
  const resultados = [];
  for (const { contato, itens } of gruposPorContato) {
    if (!resend) {
      resultados.push({
        contatoId: contato.id,
        nome: contato.nome,
        enviado: false,
        motivo: 'RESEND_API_KEY não configurado no ambiente.',
      });
      continue;
    }
    if (!contato.email) {
      resultados.push({
        contatoId: contato.id,
        nome: contato.nome,
        enviado: false,
        motivo: 'E-mail não cadastrado para este contato.',
      });
      continue;
    }
    try {
      const html = montarHtmlItensTema(contato, itens, nomeTema);
      const { error } = await resend.emails.send({
        from: FROM_EMAIL,
        to: [contato.email],
        subject: `Itens do tema "${nomeTema}" — Gestão de Temas de TI`,
        html,
      });
      if (error) throw new Error(error.message || JSON.stringify(error));
      resultados.push({ contatoId: contato.id, nome: contato.nome, enviado: true, itens: itens.length });
    } catch (err) {
      resultados.push({
        contatoId: contato.id,
        nome: contato.nome,
        enviado: false,
        motivo: err.message || String(err),
      });
    }
  }
  return resultados;
}

/** Monta o HTML do resumo executivo a partir de { data, rotinas }. */
function montarHtmlResumo(resumo) {
  const dataFormatada = formatarDataBr(resumo.data);

  if (resumo.rotinas.length === 0) {
    return `
      <div style="font-family: sans-serif; color: #1a1a2e;">
        <h2>Resumo de rotinas — ${dataFormatada}</h2>
        <p>Nenhuma rotina teve tempo apontado em ${dataFormatada}.</p>
      </div>
    `;
  }

  const linhas = resumo.rotinas
    .map((r) => {
      const percentual = r.tempoTotal > 0 ? Math.round((r.minutosNoDia / r.tempoTotal) * 100) : null;
      return `
        <tr>
          <td style="padding:6px 10px;border-bottom:1px solid #e5e5e5;">${escapeHtml(r.nome)}</td>
          <td style="padding:6px 10px;border-bottom:1px solid #e5e5e5;">${escapeHtml(r.tipoRecorrencia)}</td>
          <td style="padding:6px 10px;border-bottom:1px solid #e5e5e5;">${formatarMinutos(r.minutosNoDia)}</td>
          <td style="padding:6px 10px;border-bottom:1px solid #e5e5e5;">${
            percentual != null ? `${percentual}% do período` : '—'
          }</td>
        </tr>
      `;
    })
    .join('');

  return `
    <div style="font-family: sans-serif; color: #1a1a2e;">
      <h2>Resumo de rotinas — ${dataFormatada}</h2>
      <p>Rotinas com tempo apontado no dia anterior:</p>
      <table style="border-collapse:collapse;width:100%;max-width:520px;">
        <thead>
          <tr style="text-align:left;">
            <th style="padding:6px 10px;border-bottom:2px solid #1a1a2e;">Rotina</th>
            <th style="padding:6px 10px;border-bottom:2px solid #1a1a2e;">Recorrência</th>
            <th style="padding:6px 10px;border-bottom:2px solid #1a1a2e;">Tempo no dia</th>
            <th style="padding:6px 10px;border-bottom:2px solid #1a1a2e;">Progresso do período</th>
          </tr>
        </thead>
        <tbody>${linhas}</tbody>
      </table>
    </div>
  `;
}

/**
 * Envia o resumo diário para os endereços informados. Não lança erro se
 * não houver chave configurada ou destinatários — retorna o motivo em
 * "enviado: false" para o chamador decidir o que fazer (ex.: logar).
 */
async function enviarResumoDiario(destinatarios, resumo) {
  if (!resend) {
    return { enviado: false, motivo: 'RESEND_API_KEY não configurado no ambiente.' };
  }
  if (!destinatarios || destinatarios.length === 0) {
    return { enviado: false, motivo: 'Nenhum destinatário ativo cadastrado.' };
  }

  const html = montarHtmlResumo(resumo);
  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: destinatarios,
    subject: `Resumo de rotinas — ${formatarDataBr(resumo.data)}`,
    html,
  });

  if (error) {
    const err = new Error(`Falha ao enviar e-mail via Resend: ${error.message || JSON.stringify(error)}`);
    throw err;
  }

  return { enviado: true, destinatarios: destinatarios.length };
}

module.exports = { enviarResumoDiario, montarHtmlResumo, montarHtmlItensTema, enviarItensTemaPorEmail };
