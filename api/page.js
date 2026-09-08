import {readFile} from 'node:fs/promises';
import path from 'node:path';
export default async function handler(req,res){
 const u=new URL(req.url,'https://cse-camp-site.vercel.app');
 const route=req.query?.route||u.searchParams.get('route')||'/';
 const lang=(req.query?.lang||u.searchParams.get('lang'))==='fr'?'fr':'en';
 const mobile=/Android|iPhone|iPod|Mobile/i.test(req.headers['user-agent']||'');
 let decoded;try{decoded=decodeURIComponent(route);}catch{res.status(400).send('Invalid path');return;}
 const clean=decoded.replace(/^\/+|\/+$/g,'')||'index';
 if(clean.split('/').some(x=>x==='..'||x==='.')||clean.includes('\\')||clean.includes('\0')){res.status(400).send('Invalid path');return;}
 const base=path.join(process.cwd(),'public','capture',mobile?'mobile':'desktop',lang);
 try{
  const html=await readFile(path.join(base,clean+'.html'),'utf8');
  res.setHeader('Content-Type','text/html; charset=utf-8');
  res.setHeader('Cache-Control','public, max-age=0, must-revalidate');
  res.setHeader('Vary','User-Agent');
  res.setHeader('X-Robots-Tag','noindex, nofollow');
  res.status(200).send(html);
 }catch{
  res.status(404).send('<!doctype html><html lang="'+lang+'"><meta charset="utf-8"><title>404</title><h1>'+(lang==='fr'?'Page introuvable':'Page not found')+'</h1><a href="/'+(lang==='fr'?'?lang=fr':'')+'">'+(lang==='fr'?'Accueil':'Home')+'</a></html>');
 }
}
