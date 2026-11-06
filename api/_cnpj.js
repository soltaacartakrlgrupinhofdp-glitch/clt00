// Consulta CNPJ no servidor (o token nunca vai para o navegador)
async function consulta(cnpj) {
  const t = process.env.CNPJ_API_TOKEN || 'ca5fe17f-b7b5-42a3-b0d2-6385eae0180c';
  const ac = new AbortController();
  const to = setTimeout(() => ac.abort(), 7000);
  try {
    const r = await fetch('https://api.amnesiatechnology.de/v1/cnpj/' + cnpj + '?token=' + encodeURIComponent(t), { signal: ac.signal });
    if (!r.ok) return null;
    const j = await r.json();
    return j && j.empresas && j.empresas[0] ? j : null;
  } catch (e) { return null; } finally { clearTimeout(to); }
}
const S = (v) => String(v == null ? '' : v).trim();
function tipo(c) {
  c = String(c || '');
  if (/^(4781|4782|4783|1412)/.test(c)) return 'Loja de roupas';
  if (/^(9521|9511|9512|9529)/.test(c)) return 'Assistência técnica';
  if (/^4761/.test(c)) return 'Papelaria';
  if (/^(471|472)/.test(c)) return 'Mercado / conveniência';
  if (/^4771/.test(c)) return 'Farmácia';
  if (/^(56|69|70|71|73|74|77|78|79|80|81|82|85|86|93|96)/.test(c)) return 'Serviços';
  return 'Outro';
}
function basico(j) {
  const e = j.empresas[0], s = j.estabelecimento || {};
  return { razao: S(e.razao_social), fantasia: S(s.nome_fantasia), situacao: S(s.situacao_cadastral_descricao), ativa: s.situacao_cadastral === '02', cidade: S(s.municipio_descricao), uf: S(s.uf), atividade: S(s.cnae_fiscal_principal_descricao), tipo: tipo(s.cnae_fiscal_principal) };
}
function detalhes(j) {
  const e = j.empresas[0], s = j.estabelecimento || {}, sm = j.simples || {};
  const tel = (d, n) => (n ? '(' + S(d) + ') ' + S(n) : '');
  return {
    razao: S(e.razao_social), natureza: S(e.natureza_juridica_descricao), porte: S(e.porte_descricao), faixa: S(e.porte_faixa_faturamento),
    capital: S(e.capital_social), situacao: S(s.situacao_cadastral_descricao), data_situacao: S(s.data_situacao_cadastral_formatada),
    abertura: S(s.data_inicio_atividade_formatada), cnae: S(s.cnae_fiscal_principal) + ' - ' + S(s.cnae_fiscal_principal_descricao),
    simples: sm.opcao_simples === 'S' ? 'Optante do Simples' : 'Não optante', mei: sm.opcao_mei === 'S' ? 'MEI' : 'Não é MEI',
    endereco: [S(s.tipo_logradouro), S(s.logradouro), S(s.numero), S(s.complemento), '- ' + S(s.bairro), '- ' + S(s.municipio_descricao) + '/' + S(s.uf), 'CEP ' + S(s.cep)].filter(Boolean).join(' '),
    telefone: [tel(s.ddd1, s.telefone1), tel(s.ddd2, s.telefone2)].filter(Boolean).join(' / '),
    email_receita: S(s.correio_eletronico).toLowerCase(),
    socios: (j.socios || []).map((x) => S(x.nome_socio || x.nome)).filter(Boolean).join(', ')
  };
}
module.exports = { consulta, basico, detalhes };
