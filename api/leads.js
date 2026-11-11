const crypto = require('crypto');
const db = require('./_db');
const ok = (p) => { const a = Buffer.from(String(p || '')), b = Buffer.from(process.env.ADMIN_PASSWORD || '593120'); return b.length > 0 && a.length === b.length && crypto.timingSafeEqual(a, b); };
module.exports = async (req, res) => {
  if (!ok(req.headers['x-admin-password'])) { await new Promise((r) => setTimeout(r, 1500)); return res.status(401).json({ error: 'auth' }); }
  const id = String(req.query.id || '');
  try {
    if (req.method === 'GET') {
      const flat = (await db(['HGETALL', 'leads'])) || [];
      const out = [];
      for (let i = 1; i < flat.length; i += 2) { try { out.push(JSON.parse(flat[i])); } catch (e) {} }
      out.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
      return res.status(200).json(out);
    }
    if (!id) return res.status(400).json({ error: 'id' });
    if (req.method === 'PATCH') {
      const b = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      if (!['novo', 'contatado', 'fechado'].includes(b.status)) return res.status(400).json({ error: 'status' });
      const cur = await db(['HGET', 'leads', id]);
      if (!cur) return res.status(404).json({ error: 'nf' });
      const l = JSON.parse(cur); l.status = b.status;
      await db(['HSET', 'leads', id, JSON.stringify(l)]);
      return res.status(200).json({ ok: true });
    }
    if (req.method === 'DELETE') {
      const raw = await db(['HGET', 'leads', id]);
      if (!raw) return res.status(404).json({ error: 'nf' });
      const lead = JSON.parse(raw);
      const cnpj = String(lead.cnpj || '').replace(/\D/g, '');
      const lock = 'coleta:cnpj:' + crypto.createHash('sha256').update(cnpj).digest('hex');
      // Remove o índice apenas se ele pertence à ficha excluída.
      // Script atômico impede liberar o bloqueio de outro registro.
      const script = "if redis.call('GET', KEYS[1]) == ARGV[1] then redis.call('DEL', KEYS[1]) end; return redis.call('HDEL', KEYS[2], ARGV[1])";
      await db(['EVAL', script, '2', lock, 'leads', id]);
      return res.status(200).json({ ok: true });
    }
    return res.status(405).json({ error: 'method' });
  } catch (e) { return res.status(500).json({ error: 'db' }); }
};
