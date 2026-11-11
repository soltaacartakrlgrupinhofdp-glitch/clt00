const crypto = require('crypto');
const db = require('./_db');
const cpfApi = require('./_cpf');
const { consulta, basico, detalhes } = require('./_cnpj');
const L = (s,n) => String(s || '').trim().slice(0,n);
const dg = s => String(s||'').replace(/\D/g,'');
const sha = s => crypto.createHash('sha256').update(s).digest('hex');
module.exports = async (req,res) => {
  if(req.method !== 'POST') return res.status(405).json({error:'method'});
  if(!db.configured()) return res.status(503).json({error:'db'});
  try {
    const b = typeof req.body === 'string' ? JSON.parse(req.body||'{}') : (req.body||{});
    if(b.website) return res.status(400).json({error:'invalid'});
    if(b.action === 'finish') {
      const id=L(b.id,90), token=L(b.token,150);
      const stored=await db(['HGET','leads',id]);
      if(!stored) return res.status(404).json({error:'notfound'});
      const d=JSON.parse(stored);
      if(!token || sha(token)!==d._edit_hash) return res.status(403).json({error:'auth'});
      const q=b.qualificacao||{};
      const banks=Array.isArray(b.bancos)?b.bancos:q.bancos;
      d.bancos=Array.isArray(banks)?banks.slice(0,3).map(x=>L(x,60)):[];
      d.dispositivo=L(b.dispositivo||q.dispositivo,40);
      d.horario=L(b.horario||q.horario,80);
      if(!d.bancos.length || !d.dispositivo || !d.horario) return res.status(400).json({error:'invalid'});
      d.qualificacao={bancos:d.bancos,dispositivo:d.dispositivo,horario:d.horario};
      d.status='novo';d.completed_at=new Date().toISOString();
      await db(['HSET','leads',id,JSON.stringify(d)]);
      return res.status(200).json({ok:true});
    }
    if(b.action !== 'start') return res.status(400).json({error:'invalid'});
    const d={nome:L(b.nome,120),cpf:L(b.cpf,14),cnpj:L(b.cnpj,18),fant:L(b.fant,120),cid:L(b.cid,80),seg:L(b.seg,150),m2:L(b.m2,40),fat:L(b.fat,40),zap:L(b.zap,16),mail:L(b.mail,120),quiz:L(b.quiz,1200),bancos:[],dispositivo:'',horario:''};
    if(!b.consent||!d.nome||!cpfApi.valid(d.cpf)||dg(d.cnpj).length!==14||dg(d.zap).length<10) return res.status(400).json({error:'invalid'});
    // Evita gravar várias fichas para o mesmo CNPJ mesmo em envios simultâneos.
    const id=crypto.randomUUID(), token=crypto.randomBytes(32).toString('hex');
    const lock='coleta:cnpj:'+sha(dg(d.cnpj));
    const reserved=await db(['SET',lock,id,'NX']);
    if(reserved!=='OK') return res.status(409).json({error:'duplicate'});
    d.id=id;d.status='incompleto';d.created_at=new Date().toISOString();d._edit_hash=sha(token);
    try {await db(['HSET','leads',id,JSON.stringify(d)]);} catch(e){await db(['DEL',lock]).catch(()=>{});throw e;}
    // A ficha inicial já está persistida. Recupera os dados detalhados
    // das APIs ANTES de responder ao navegador, sem perder a ficha se falharem.
    try {
      const [cnpjResult, cpfResult] = await Promise.allSettled([
        consulta(dg(d.cnpj)),
        cpfApi.lookup(d.cpf)
      ]);
      if (cnpjResult.status === 'fulfilled' && cnpjResult.value) {
        d.cnpj_dados = detalhes(cnpjResult.value);
        d.cnpj_consulta_status = 'ok';
      } else {
        d.cnpj_consulta_status = 'indisponivel';
      }
      if (cpfResult.status === 'fulfilled' && cpfResult.value) {
        d.cpf_dados = cpfResult.value;
      }
      await db(['HSET','leads',id,JSON.stringify(d)]);
    } catch (enrichmentError) {
      console.error('enrichment failure', enrichmentError.message);
      // O cadastro inicial continua salvo e o usuário pode avançar.
    }
    return res.status(200).json({ok:true,id,token});
  }catch(e){console.error('lead failure',e.message);return res.status(500).json({error:'db'});}
};
