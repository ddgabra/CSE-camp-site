import {readFile} from 'node:fs/promises';
import path from 'node:path';

const campRegistrationPath='/camp-registration';
const campRegistrationUrl='https://cse-camps-claude.vercel.app/camps';

// The desktop response and its shared assets are deliberately left untouched.
export function improveMobile(html,mobile){
 if(!mobile||html.includes('/replica.mobile.js'))return html;
 return html.replace(/(<meta\b[^>]*name="viewport"[^>]*content=")[^"]*/i,'$1width=device-width, initial-scale=1, viewport-fit=cover')
  .replace('</head>','<link rel="stylesheet" href="/replica.mobile.css?v=1"></head>')
  .replace('</body>','<script src="/replica.mobile.js?v=1" defer></script></body>');
}

// Apply the connection when serving captures so future Wix recaptures keep it.
export function connectCampRegistration(html,lang,mobile){
 const label=lang==='fr'?'INSCRIPTION AUX CAMPS':'CAMP SIGN UP';
 // Existing camp registration buttons should use the same destination as the header.
 html=html.replace(/<a\b[^>]*\bhref="https?:\/\/(?:www\.)?stmalocamps\.net\/?"[^>]*>/gi,tag=>
  tag.replace(/href="[^"]*"/i,'href="'+campRegistrationPath+'"').replace(/target="[^"]*"/i,'target="_self"'));
 if(html.includes('id="cse-camp-signup"'))return html;
 if(mobile){
  const item='<li class="FWN1UT GrMktH WIf5uD wixui-vertical-menu__item"><div data-testid="itemWrapper" class="keDKhi"><span data-testid="linkWrapper" class="j945c8"><a id="cse-camp-signup" data-testid="linkElement" href="'+campRegistrationPath+'" class="G7GdaI wixui-vertical-menu__item-label">'+label+'</a></span></div></li>';
  return html.replace(/(<nav\b[^>]*\bid="MENU_AS_CONTAINER_EXPANDABLE_MENU"[^>]*>\s*<ul\b[^>]*>)/,'$1'+item);
 }
 const item='<li class="itemDepth02233374943__itemWrapper wixui-horizontal-menu__item" data-testid="menuItemDepth0" data-item-depth="0"><div class="itemShared2352141355__rootContainer itemShared2352141355--isRow"><a id="cse-camp-signup" data-item-label="true" data-testid="linkElement" href="'+campRegistrationPath+'" class="itemDepth02233374943__root StylableHorizontalMenu3372578893__menuItem itemShared2352141355__menuItem"><div class="itemDepth02233374943__container"><span class="itemDepth02233374943__label wixui-horizontal-menu__item-label">'+label+'</span></div></a></div></li>';
 return html.replace(/(<nav\b[^>]*\bwixui-horizontal-menu\b[^>]*>\s*<ul\b[^>]*>)/,'$1'+item);
}

export default async function handler(req,res){
 const u=new URL(req.url,'https://cse-camp-site.vercel.app');
 const route=req.query?.route||u.searchParams.get('route')||'/';
 const lang=(req.query?.lang||u.searchParams.get('lang'))==='fr'?'fr':'en';
 const mobile=/Android|iPhone|iPod|Mobile/i.test(req.headers['user-agent']||'');
 let decoded;try{decoded=decodeURIComponent(route);}catch{res.status(400).send('Invalid path');return;}
 const clean=decoded.replace(/^\/+|\/+$/g,'')||'index';
 if(clean.split('/').some(x=>x==='..'||x==='.')||clean.includes('\\')||clean.includes('\0')){res.status(400).send('Invalid path');return;}
 if(clean==='camp-registration'){
  res.setHeader('Location',campRegistrationUrl);
  res.setHeader('Cache-Control','no-store');
  res.status(307).end();return;
 }
 const base=path.join(process.cwd(),'public','capture',mobile?'mobile':'desktop',lang);
 try{
  const html=await readFile(path.join(base,clean+'.html'),'utf8');
  res.setHeader('Content-Type','text/html; charset=utf-8');
  res.setHeader('Cache-Control','public, max-age=0, must-revalidate');
  res.setHeader('Vary','User-Agent');
  res.setHeader('X-Robots-Tag','noindex, nofollow');
  res.status(200).send(improveMobile(connectCampRegistration(html,lang,mobile),mobile));
 }catch{
  res.status(404).send('<!doctype html><html lang="'+lang+'"><meta charset="utf-8"><title>404</title><h1>'+(lang==='fr'?'Page introuvable':'Page not found')+'</h1><a href="/'+(lang==='fr'?'?lang=fr':'')+'">'+(lang==='fr'?'Accueil':'Home')+'</a></html>');
 }
}
