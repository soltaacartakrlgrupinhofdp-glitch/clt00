const { consulta, basico } = require('./_cnpj');
module.exports = async (req, res) => {
  const c = String(req.query.cnpj || '').replace(/\D/g, '');
  if (c.length !== 14) return res.status(400).json({ error: 'cnpj' });
  const j = await consulta(c);
  if (!j) return res.status(200).json({ found: false, motivo: 'api_sem_resposta' });
  return res.status(200).json({ found: true, ...basico(j) }); // só o básico vai ao cliente
};
