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
    if (req.method === 'POST') {
      const b = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
      const ids = b.ids;
      if (!Array.isArray(ids) || ids.length < 1 || ids.length > 50 ||
          ids.some(x => typeof x !== 'string' || !/^[a-zA-Z0-9-]{1,100}$/.test(x)) ||
          new Set(ids).size !== ids.length) {
        return res.status(400).json({ error: 'ids_invalidos' });
      }
      // Atomicamente marca somente fichas ainda novas; preserva dados atualizados por outros operadores.
      const lua = `local updated = {}
for i=1,#ARGV do
  local raw = redis.call('HGET', KEYS[1], ARGV[i])
  if raw then
    local ok, lead = pcall(cjson.decode, raw)
    if ok and type(lead)=='table' and (lead.status==nil or lead.status=='novo') then
      lead.status='contatado'
      redis.call('HSET', KEYS[1], ARGV[i], cjson.encode(lead))
      table.insert(updated, ARGV[i])
    end
  end
end
return updated`;
      const updated = await db(['EVAL', lua, 1, 'leads', ...ids]);
      return res.status(200).json({ updated: updated || [] });
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
    if (req.method === 'DELETE') { await db(['HDEL', 'leads', id]); return res.status(200).json({ ok: true }); }
    return res.status(405).json({ error: 'method' });
  } catch (e) { return res.status(500).json({ error: 'db' }); }
};
