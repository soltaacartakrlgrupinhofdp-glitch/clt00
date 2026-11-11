const db = require('./_db');
const cpfApi = require('./_cpf');
const { consulta, basico, detalhes } = require('./_cnpj');
const L = (s, n) => String(s || '').trim().slice(0, n);
module.exports = async (req, res) => {
  if (!db.configured()) return res.status(500).json({ error: 'db' });
  if (req.method !== 'POST') return res.status(405).json({ error: 'method' });
  const b = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  if (b.website) return res.status(200).json({ ok: true }); // honeypot
  const q = b.qualificacao && typeof b.qualificacao === 'object' ? b.qualificacao : {};
  const bancos = Array.isArray(b.bancos) ? b.bancos : q.bancos;
  const d = {
    nome: L(b.nome, 120), cpf: L(b.cpf, 14), cnpj: L(b.cnpj, 18), fant: L(b.fant, 120),
    cid: L(b.cid, 80), seg: L(b.seg, 150), m2: L(b.m2, 40), fat: L(b.fat, 40),
    zap: L(b.zap, 16), mail: L(b.mail, 120), quiz: L(b.quiz, 1200), bancos: Array.isArray(bancos) ? bancos.slice(0, 3).map(x => L(x, 60)) : [],
    dispositivo: L(b.dispositivo || q.dispositivo, 40), horario: L(b.horario || q.horario, 80)
  };
  d.reuniao_video = b.reuniao_video === 'aceitou' ? 'aceitou' : b.reuniao_video === 'nao_aceitou' ? 'nao_aceitou' : '';
  d.orientacao_telefone = d.reuniao_video === 'nao_aceitou';
  d.qualificacao = { bancos: d.bancos, dispositivo: d.dispositivo, horario: d.horario };
  if (!b.consent || !d.nome || !cpfApi.valid(d.cpf) || d.cnpj.replace(/\D/g, '').length !== 14 || d.zap.replace(/\D/g, '').length < 10 || !d.bancos.length || !d.dispositivo || !d.horario || !d.reuniao_video)
    return res.status(400).json({ error: 'invalid' });
  const j = await consulta(d.cnpj.replace(/\D/g, ''));
  if (j) {
    if (!basico(j).ativa) return res.status(400).json({ error: 'inativo' });
    d.cnpj_dados = detalhes(j);
  }
  d.cpf_dados = await cpfApi.lookup(d.cpf);
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  d.id = id; d.status = 'novo'; d.created_at = new Date().toISOString();
  try { await db(['HSET', 'leads', id, JSON.stringify(d)]); return res.status(200).json({ ok: true }); }
  catch (e) { return res.status(500).json({ error: 'db' }); }
};
