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

module.exports = { enviarResumoDiario, montarHtmlResumo };
