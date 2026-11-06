const db = require('./_db');
const { consulta } = require('./_cnpj');
module.exports = async (req, res) => {
  const out = { versao: 4, banco_configurado: db.configured(), banco_responde: false, cnpj_api_responde: false, variaveis_do_banco: Object.keys(process.env).filter((n) => /REST_API_(URL|TOKEN)$|REDIS_REST_(URL|TOKEN)$/.test(n)) };
  try { out.banco_responde = (await db(['PING'])) === 'PONG'; } catch (e) {}
  try { out.cnpj_api_responde = !!(await consulta('55244608000153')); } catch (e) {}
  try {
    const keys = ['salvo', 'honeypot', 'invalido', 'inativo', 'erro_db'];
    const v = (await db(['MGET', ...keys.map((k) => 'stats:' + k)])) || [];
    out.estatisticas = {};
    keys.forEach((k, i) => { out.estatisticas[k] = Number(v[i] || 0); });
    const hget = (await db(['HLEN', 'leads'])) || 0;
    out.estatisticas.fichas_no_painel = Number(hget);
  } catch (e) {}
  res.status(200).json(out);
};
