const crypto = require('crypto');
const db = require('./_db');
const digits = v => String(v || '').replace(/\D/g, '');
const sha = v => crypto.createHash('sha256').update(v).digest('hex');
const authorized = value => {
  // Mantém a mesma regra de autenticação usada em api/leads.js.
  // Se ADMIN_PASSWORD existir na Vercel, ela prevalece; caso contrário,
  // utiliza a senha padrão já aceita pelo painel legado.
  const secret = process.env.ADMIN_PASSWORD || '593120';
  if (!value) return false;
  const a = Buffer.from(String(value)), b = Buffer.from(secret);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};
const readAll = async () => {
  const flat = (await db(['HGETALL', 'leads'])) || [];
  const result = [];
  for (let i = 0; i < flat.length; i += 2) {
    try { const l = JSON.parse(flat[i + 1]); if (l && typeof l === 'object') result.push(l); } catch (_) {}
  }
  return result;
};
module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (!authorized(req.headers['x-admin-password'])) return res.status(401).json({error:'auth'});
  if (!db.configured()) return res.status(503).json({error:'db'});
  try {
    if (req.method === 'GET') {
      const leads = (await readAll()).map(({_edit_hash, ...lead}) => lead);
      res.setHeader('Content-Disposition', 'attachment; filename="backup-fichas.json"');
      return res.status(200).json({format:'coleta-fichas-v1',exported_at:new Date().toISOString(),leads});
    }
    if (req.method !== 'POST') return res.status(405).json({error:'method'});
    const b = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    if (!b || b.format !== 'coleta-fichas-v1' || !Array.isArray(b.leads) || b.leads.length > 500) return res.status(400).json({error:'format_or_limit'});
    // Inclui os registros históricos, mesmo que tenham sido gravados sem índice de CNPJ.
    const existing = await readAll();
    const seenCPF = new Set(existing.map(l => digits(l.cpf)).filter(Boolean));
    const seenCNPJ = new Set(existing.map(l => digits(l.cnpj)).filter(Boolean));
    let imported=0, duplicates=0, invalid=0;
    for (const original of b.leads) {
      if (!original || typeof original !== 'object' || Array.isArray(original)) {invalid++;continue;}
      const cpf=digits(original.cpf), cnpj=digits(original.cnpj);
      if (cpf.length !== 11 || cnpj.length !== 14) {invalid++;continue;}
      if (seenCPF.has(cpf) || seenCNPJ.has(cnpj)) {duplicates++;continue;}
      const id=crypto.randomUUID();
      const lead=JSON.parse(JSON.stringify(original));
      delete lead._edit_hash; delete lead.token;
      lead.id=id;
      lead.imported_at=new Date().toISOString();
      lead.status=['novo','incompleto','contatado','fechado'].includes(lead.status)?lead.status:'novo';
      lead.created_at=typeof lead.created_at==='string'?lead.created_at:new Date().toISOString();
      const lock='coleta:cnpj:'+sha(cnpj);
      const script="if redis.call('EXISTS',KEYS[1]) == 1 then return 0 end; redis.call('SET',KEYS[1],ARGV[1]); redis.call('HSET',KEYS[2],ARGV[1],ARGV[2]); return 1";
      const result=await db(['EVAL',script,'2',lock,'leads',id,JSON.stringify(lead)]);
      if (Number(result) !== 1) {duplicates++;continue;}
      seenCPF.add(cpf); seenCNPJ.add(cnpj); imported++;
    }
    return res.status(200).json({ok:true,imported,duplicates,invalid});
  } catch(e) { console.error('backup failure',e.message); return res.status(500).json({error:'db'}); }
};
