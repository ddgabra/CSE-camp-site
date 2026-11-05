const MAX_BYTES=64*1024;
const escapeHtml=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='POST'){res.setHeader('Allow','POST');return res.status(405).json({error:'Method not allowed'});}
 const origin=req.headers.origin;
 if(origin){try{const url=new URL(origin);const host=req.headers.host?.split(':')[0];if(url.hostname!==host)return res.status(403).json({error:'Invalid origin'});}catch{return res.status(403).json({error:'Invalid origin'});}}
 const key=process.env.RESEND_API_KEY,from=process.env.FORM_FROM_EMAIL;
 if(!key||!from)return res.status(503).json({error:'Email delivery is not configured'});
 const body=req.body;
 if(!body||typeof body!=='object'||Array.isArray(body))return res.status(400).json({error:'Invalid form data'});
 if(body._honey)return res.status(200).json({ok:true});
 const entries=Object.entries(body).filter(([k,v])=>!k.startsWith('_')&&typeof v==='string'&&v.trim());
 if(!entries.length)return res.status(400).json({error:'Empty submission'});
 if(entries.length>60||JSON.stringify(entries).length>MAX_BYTES)return res.status(413).json({error:'Submission too large'});
 const email=String(body.email||'').trim();
 if(email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return res.status(400).json({error:'Invalid email address'});
 const text=entries.map(([k,v])=>k+': '+v).join('\n\n');
 const html=entries.map(([k,v])=>'<p><strong>'+escapeHtml(k)+'</strong><br>'+escapeHtml(v).replace(/\n/g,'<br>')+'</p>').join('');
 try{
  const result=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify({from,to:['wess@catholicway.net'],subject:'CSE website form: '+String(body._form||'Website submission').slice(0,90),text,html,...(email?{reply_to:email}:{})})});
  if(!result.ok){console.error('Email provider rejected form',result.status);return res.status(502).json({error:'Email service rejected submission'});}
  return res.status(200).json({ok:true});
 }catch(e){console.error('Form email transport failed',e?.message);return res.status(502).json({error:'Email service unavailable'});}
}
