// Função serverless (Vercel) — recebe o formulário de orçamento e envia por e-mail via Resend.
// Nenhuma credencial fica no navegador: tudo vem de variáveis de ambiente.
const busboy = require('busboy');

const MAX_FILE = 3.5 * 1024 * 1024; // limite de corpo da Vercel é ~4,5 MB
const EXT_OK = /\.(pdf|dwg|dxf|step|stp|igs|iges|png|jpe?g|zip)$/i;
const MAGIC = { pdf: [0x25, 0x50, 0x44, 0x46], png: [0x89, 0x50, 0x4e, 0x47], jpg: [0xff, 0xd8, 0xff], jpeg: [0xff, 0xd8, 0xff], zip: [0x50, 0x4b] };
const hits = new Map(); // limitador por IP (best-effort; use Upstash/Redis para algo mais rígido)
const LIMIT = 5, WINDOW = 60 * 60 * 1000;

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clean = (s, n) => String(s || '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, n);

function parse(req) {
  return new Promise((resolve, reject) => {
    const fields = {}; let file = null, tooBig = false;
    const bb = busboy({ headers: req.headers, limits: { fileSize: MAX_FILE, files: 1, fields: 20, fieldSize: 8000 } });
    bb.on('field', (k, v) => { fields[k] = v; });
    bb.on('file', (k, stream, info) => {
      const chunks = [];
      stream.on('data', d => chunks.push(d));
      stream.on('limit', () => { tooBig = true; });
      stream.on('end', () => { const buf = Buffer.concat(chunks); if (info.filename && buf.length) file = { name: info.filename, buf }; });
    });
    bb.on('close', () => resolve({ fields, file, tooBig }));
    bb.on('error', reject);
    req.pipe(bb);
  });
}

module.exports = async (req, res) => {
  const reply = (code, body) => res.status(code).json(body);
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return reply(405, { error: 'Método não permitido.' }); }

  const origin = process.env.ALLOWED_ORIGIN; // ex.: https://www.machtooling.com.br (opcional em homologação)
  if (origin && req.headers.origin && req.headers.origin !== origin) return reply(403, { error: 'Origem não autorizada.' });

  const { RESEND_API_KEY, MAIL_TO, MAIL_FROM } = process.env;
  if (!RESEND_API_KEY || !MAIL_TO || !MAIL_FROM) return reply(500, { error: 'Envio ainda não configurado no servidor.' });

  const ip = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
  const now = Date.now(); const arr = (hits.get(ip) || []).filter(t => now - t < WINDOW);
  if (arr.length >= LIMIT) return reply(429, { error: 'Muitas solicitações. Aguarde um pouco.' });
  arr.push(now); hits.set(ip, arr);

  let data;
  try { data = await parse(req); } catch (e) { return reply(400, { error: 'Requisição inválida.' }); }
  const { fields: f, file, tooBig } = data;

  // Antispam: honeypot e tempo mínimo de preenchimento (resposta "ok" silenciosa para bots)
  if (f.website) return reply(200, { ok: true });
  if (f._t && now - Number(f._t) < 3000) return reply(200, { ok: true });

  if (process.env.TURNSTILE_SECRET_KEY) {
    try {
      const r = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ secret: process.env.TURNSTILE_SECRET_KEY, response: f['cf-turnstile-response'] || '', remoteip: ip }) });
      if (!(await r.json()).success) return reply(400, { error: 'Falha na verificação antispam.' });
    } catch (e) { return reply(502, { error: 'Não foi possível validar o antispam.' }); }
  }

  const v = { nome: clean(f.nome, 120), empresa: clean(f.empresa, 120), email: clean(f.email, 160), telefone: clean(f.telefone, 30), servico: clean(f.servico, 80), mensagem: String(f.mensagem || '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').trim().slice(0, 3000) };
  if (!v.nome || !v.empresa || !v.servico || v.mensagem.length < 10) return reply(400, { error: 'Preencha todos os campos obrigatórios.' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email)) return reply(400, { error: 'E-mail inválido.' });
  if (v.telefone.replace(/\D/g, '').length < 10) return reply(400, { error: 'Telefone inválido.' });
  if (!['on', 'true', '1'].includes(String(f.consentimento))) return reply(400, { error: 'É necessário consentir com o tratamento dos dados.' });

  let attachments;
  if (tooBig) return reply(413, { error: 'O arquivo excede 3,5 MB.' });
  if (file) {
    const ext = (file.name.match(/\.([a-z0-9]+)$/i) || [])[1];
    if (!EXT_OK.test(file.name)) return reply(400, { error: 'Formato de arquivo não permitido.' });
    const sig = MAGIC[ext.toLowerCase()];
    if (sig && !sig.every((b, i) => file.buf[i] === b)) return reply(400, { error: 'O arquivo não corresponde ao formato informado.' });
    attachments = [{ filename: file.name.replace(/[^\w.\- ]/g, '_').slice(0, 100), content: file.buf.toString('base64') }];
  }

  const rows = [['Nome', v.nome], ['Empresa', v.empresa], ['E-mail', v.email], ['Telefone', v.telefone], ['Serviço', v.servico], ['Mensagem', v.mensagem]];
  const html = '<h2>Nova solicitação de orçamento — site Mach Tooling</h2><table cellpadding="8" style="border-collapse:collapse">' + rows.map(([k, x]) => `<tr><td style="border:1px solid #ddd"><b>${k}</b></td><td style="border:1px solid #ddd;white-space:pre-wrap">${esc(x)}</td></tr>`).join('') + '</table>' + (attachments ? `<p>Anexo: ${esc(attachments[0].filename)}</p>` : '');
  const text = rows.map(([k, x]) => `${k}: ${x}`).join('\n');

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST', headers: { Authorization: 'Bearer ' + RESEND_API_KEY, 'content-type': 'application/json' },
      body: JSON.stringify({ from: MAIL_FROM, to: MAIL_TO.split(',').map(s => s.trim()), reply_to: v.email, subject: `Orçamento — ${v.servico} — ${v.empresa}`.replace(/[\r\n]/g, ' '), html, text, attachments })
    });
    if (!r.ok) { console.error('Resend', r.status); return reply(502, { error: 'Falha ao enviar a mensagem.' }); }
  } catch (e) { console.error(e); return reply(502, { error: 'Falha ao enviar a mensagem.' }); }
  return reply(200, { ok: true });
};
