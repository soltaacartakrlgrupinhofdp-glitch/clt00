const db = require('./_db');
const { consulta } = require('./_cnpj');
module.exports = async (req, res) => {
  const out = { versao: 3, banco_configurado: db.configured(), banco_responde: false, cnpj_api_responde: false, variaveis_do_banco: Object.keys(process.env).filter((n) => /REST_API_(URL|TOKEN)$|REDIS_REST_(URL|TOKEN)$/.test(n)) };
  try { out.banco_responde = (await db(['PING'])) === 'PONG'; } catch (e) {}
  try { out.cnpj_api_responde = !!(await consulta('55244608000153')); } catch (e) {}
  res.status(200).json(out);
};
