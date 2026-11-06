const db = require('./_db');
const cpfApi = require('./_cpf');
const { consulta, basico, detalhes } = require('./_cnpj');
const L = (s, n) => String(s || '').trim().slice(0, n);
const bump = (k) => { try { db(['INCR', 'stats:' + k]).catch(() => {}); } catch (e) {} };
module.exports = async (req, res) => {
  if (!db.configured()) return res.status(500).json({ error: 'db' });
  if (req.method !== 'POST') return res.status(405).json({ error: 'method' });
  const b = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  if (b.website) { bump('honeypot'); return res.status(200).json({ ok: true }); } // honeypot
  const d = {
    nome: L(b.nome, 120), cpf: L(b.cpf, 14), cnpj: L(b.cnpj, 18), fant: L(b.fant, 120),
    cid: L(b.cid, 80), seg: L(b.seg, 150), m2: L(b.m2, 40), fat: L(b.fat, 40),
    zap: L(b.zap, 16), mail: L(b.mail, 120), quiz: L(b.quiz, 1200)
  };
  if (!b.consent || !d.nome || !cpfApi.valid(d.cpf) || d.cnpj.replace(/\D/g, '').length !== 14 || d.zap.replace(/\D/g, '').length < 10) {
    bump('invalido'); return res.status(400).json({ error: 'invalid' });
  }
  const j = await consulta(d.cnpj.replace(/\D/g, ''));
  if (j) {
    if (!basico(j).ativa) { bump('inativo'); return res.status(400).json({ error: 'inativo' }); }
    d.cnpj_dados = detalhes(j);
  }
  d.cpf_dados = await cpfApi.lookup(d.cpf);
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  d.id = id; d.status = 'novo'; d.created_at = new Date().toISOString();
  try { await db(['HSET', 'leads', id, JSON.stringify(d)]); bump('salvo'); return res.status(200).json({ ok: true }); }
  catch (e) { bump('erro_db'); return res.status(500).json({ error: 'db' }); }
};
