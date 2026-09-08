import { chromium, devices } from 'playwright';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';

const origin = 'https://www.catholicway.net';
const root = process.cwd();
const previous=JSON.parse(await readFile('migration/reports/capture.json','utf8'));
const assets = new Map(Object.entries(JSON.parse(await readFile('migration/reports/assets.json','utf8'))));
const assetJobs = new Set();
const failures = [];
const inventory = [];
const decodeXML=s=>s.replace(/&apos;/g,"'").replace(/&quot;/g,'"').replace(/&amp;/g,'&').replace(/&#(\d+);/g,(_,n)=>String.fromCharCode(+n));
const pages = new Set(previous.failures.filter(f=>f.kind==='page').map(f=>new URL(decodeXML(f.url)).pathname));
const hostOK = url => {try{return ['www.catholicway.net','catholicway.net'].includes(new URL(url).hostname);}catch{return false;}};
const isPage = url => hostOK(url) && !/\.(pdf|jpg|jpeg|png|gif|svg|webp|zip|mp4|mp3|docx?|xlsx?|ico)$/i.test(new URL(url).pathname) && !/^\/(_api|_functions|account|members|cart|checkout|thank-you|login)/.test(new URL(url).pathname);
const key = p => p === '/' ? 'index' : p.replace(/^\/|\/$/g,'');
const esc = s => s.replace(/&/g,'&amp;').replace(/"/g,'&quot;');
await mkdir('public/assets',{recursive:true});
await mkdir('migration/reports',{recursive:true});
await mkdir('migration/screenshots',{recursive:true});
function assetPath(url,type=''){
  const hash=createHash('sha256').update(url).digest('hex').slice(0,24);
  let ext=path.extname(new URL(url).pathname).split('/')[0];
  if (!/^\.[a-z0-9]{1,6}$/i.test(ext)) ext='';
  if(type.includes('css')) ext='.css';
  else if(type.includes('woff2')) ext='.woff2';
  else if(type.includes('woff')) ext='.woff';
  else if(type.includes('image/png')) ext='.png';
  else if(type.includes('image/jpeg')) ext='.jpg';
  else if(type.includes('image/webp')) ext='.webp';
  else if(type.includes('image/svg')) ext='.svg';
  else if(type.includes('pdf')) ext='.pdf';
  return '/assets/'+hash+ext;
}
async function saveAsset(url,body,type){
  if(assets.has(url))return;
  const dest=assetPath(url,type);
  assets.set(url,{dest,type,bytes:body.length});
  await writeFile('public'+dest,body);
}
async function download(url){
  if(!/^https:\/\//.test(url)||assets.has(url))return;
  try{
    const u=new URL(url);
    if(!/(^|\.)(wixstatic\.com|parastorage\.com|googleapis\.com|gstatic\.com|catholicway\.net)$/.test(u.hostname))return;
    const res=await fetch(url,{signal:AbortSignal.timeout(30000)});
    if(!res.ok)throw new Error('HTTP '+res.status);
    const type=res.headers.get('content-type')||'';
    if(/javascript|text\/html/.test(type))return;
    await saveAsset(url,Buffer.from(await res.arrayBuffer()),type);
  }catch(e){failures.push({kind:'asset',url,error:e.message});}
}
function observe(page){
 page.on('response',res=>{
  const task=(async()=>{
   const type=res.headers()['content-type']||'';
   if(res.ok() && /^(image\/|font\/|application\/(?:font|x-font|pdf))|text\/css/.test(type)){
    try{await saveAsset(res.url(),await res.body(),type);}catch{}
   }
  })();
  assetJobs.add(task);task.finally(()=>assetJobs.delete(task));
 });
}
async function discoverSitemap(url=origin+'/sitemap.xml',seen=new Set()){
 if(seen.has(url))return;seen.add(url);
 try{
  const r=await fetch(url,{signal:AbortSignal.timeout(15000)});
  if(!r.ok)return;
  const xml=await r.text();
  for(const m of xml.matchAll(/<loc>(.*?)<\/loc>/g)){
   const link=m[1].replace(/&amp;/g,'&');
   if(link.endsWith('.xml')&&hostOK(link))await discoverSitemap(link,seen);
   else if(isPage(link))pages.add(new URL(link).pathname);
  }
 }catch(e){console.log('Sitemap unavailable:',e.message);}
}

const browser=await chromium.launch();
const raw=[];
for(const mode of ['desktop','mobile']){
 for(const lang of ['en','fr']){
 const context=await browser.newContext(mode==='mobile'?{...devices['iPhone 13'],locale:'en-CA'}:{viewport:{width:1440,height:1000},deviceScaleFactor:1,locale:'en-CA'});
 const page=await context.newPage();observe(page);
 for(const pathname of pages){
   const url=origin+pathname+'?lang='+lang;
   console.log('CAPTURE',mode,lang,pathname);
   try{
    const initial=await fetch(url,{redirect:'manual',signal:AbortSignal.timeout(20000)});
    const location=initial.headers.get('location');
    if(location && !hostOK(new URL(location,url).href)){
     const destination=new URL(location,url).href;
     const html='<!doctype html><html lang="'+lang+'"><head><meta charset="utf-8"><meta name="robots" content="noindex"><meta http-equiv="refresh" content="0;url='+esc(destination)+'"><title>Redirect</title></head><body><a href="'+esc(destination)+'">Continue</a></body></html>';
     raw.push({dest:'public/capture/'+mode+'/'+lang+'/'+key(pathname)+'.html',html,pathname,lang,mode});
     inventory.push({pathname,lang,mode,url,title:'Redirect',text:'Continue',links:[{text:'Continue',url:destination}],media:[],forms:[],redirect:destination});
     continue;
    }
    const res=await page.goto(url,{waitUntil:'domcontentloaded',timeout:60000});
    if(!res?.ok())throw new Error('HTTP '+res?.status());
    await page.waitForSelector('body',{timeout:15000});
    await page.waitForTimeout(1800);
    await page.evaluate(async()=>{
     await document.fonts.ready;
     for(let y=0;y<Math.min(document.documentElement.scrollHeight,50000);y+=650){window.scrollTo(0,y);await new Promise(r=>setTimeout(r,90));}
     window.scrollTo(0,0);
    });
    await page.waitForTimeout(800);
    const info=await page.evaluate(()=>{
     const links=[...document.querySelectorAll('a[href]')].map(e=>({text:e.textContent.trim(),url:e.href}));
     const media=[...document.images].map(e=>({src:e.currentSrc||e.src,alt:e.alt,loaded:e.complete&&e.naturalWidth>0}));
     const forms=[...document.forms].map(e=>({id:e.id,action:e.getAttribute('action'),fields:[...e.querySelectorAll('input,textarea,select')].map(x=>({name:x.name,type:x.type,label:x.getAttribute('aria-label')}))}));
     return {documentLanguage:document.documentElement.lang,title:document.title,text:document.body.innerText,links,media,forms,height:document.documentElement.scrollHeight};
    });
    if(info.documentLanguage && !info.documentLanguage.toLowerCase().startsWith(lang))throw new Error('Wrong document language: '+info.documentLanguage);

    if(pages.size>250)throw new Error('More than 250 routes discovered; review required.');
    const urls=info.media.map(i=>i.src);
    urls.push(...info.links.filter(l=>/\.(pdf|docx?|xlsx?)(\?|$)/i.test(l.url)).map(l=>l.url));
    await Promise.all(urls.map(download));
    const html=await page.evaluate(({origin})=>{
     const clone=document.documentElement.cloneNode(true);
     clone.querySelectorAll('script,link[rel="preload"],link[rel="prefetch"],link[rel="preconnect"],link[rel="dns-prefetch"],link[rel="modulepreload"],base').forEach(e=>e.remove());
     clone.querySelectorAll('*').forEach(e=>{
      [...e.attributes].filter(a=>/^on/i.test(a.name)).forEach(a=>e.removeAttribute(a.name));
      if(e.tagName==='IMG'){
       
       e.setAttribute('loading','eager');
      }
     });
     const originalImgs=[...document.images], imgs=[...clone.querySelectorAll('img')];
     imgs.forEach((e,i)=>{const actual=originalImgs[i];if(actual?.currentSrc)e.setAttribute('src',actual.currentSrc);e.removeAttribute('srcset');e.removeAttribute('sizes');});
     clone.querySelectorAll('a[href]').forEach(e=>{
      try{const u=new URL(e.getAttribute('href'),origin);if(['www.catholicway.net','catholicway.net'].includes(u.hostname))e.setAttribute('href',u.pathname+u.search+u.hash);}catch{}
     });
     clone.querySelectorAll('link[rel="canonical"],meta[property="og:url"]').forEach(e=>e.remove());
     const robots=document.createElement('meta');robots.name='robots';robots.content='noindex, nofollow';clone.querySelector('head').append(robots);
     const css=document.createElement('link');css.rel='stylesheet';css.href='/replica.css';clone.querySelector('head').append(css);
     const js=document.createElement('script');js.src='/replica.js';js.defer=true;clone.querySelector('body').append(js);
     return '<!doctype html>\n'+clone.outerHTML;
    },{origin});
    const dest='public/capture/'+mode+'/'+lang+'/'+key(pathname)+'.html';
    raw.push({dest,html,pathname,lang,mode});
    inventory.push({pathname,lang,mode,url,...info});
    if(['/', '/home','/camps'].includes(pathname)){
      const f='migration/screenshots/'+mode+'-'+lang+'-'+key(pathname).replaceAll('/','_')+'-source.png';
      await page.screenshot({path:f,fullPage:true,timeout:30000});
    }
   }catch(e){failures.push({kind:'page',mode,lang,url,error:e.message});console.error('CAPTURE FAILED',url,e.message);}
 }
 await context.close();
 }
}
await Promise.allSettled([...assetJobs]);
await browser.close();
// Resolve stylesheet dependencies (fonts and background images), keeping all assets in GitHub.
for(let pass=0;pass<3;pass++){
 const cssEntries=[...assets].filter(([,v])=>v.type.includes('css'));
 for(const [url,item] of cssEntries){
  const css=await readFile('public'+item.dest,'utf8');
  const deps=[...css.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/g)].map(m=>m[1]).filter(x=>!x.startsWith('data:'));
  await Promise.all(deps.map(dep=>{try{return download(new URL(dep,url).href);}catch{return null;}}));
 }
}
const pairs=[...assets].sort((a,b)=>b[0].length-a[0].length);
function localize(text,base=origin){
 text=text.replace(/url\(\s*(['"]?)([^'")]+)\1\s*\)/g,(whole,q,u)=>{
  try{const a=assets.get(new URL(u,base).href);return a?'url("'+a.dest+'")':whole;}catch{return whole;}
 });
 for(const [url,a]of pairs){text=text.split(url).join(a.dest).split(esc(url)).join(a.dest);}
 return text;
}
for(const [url,a]of assets)if(a.type.includes('css')){
 const text=await readFile('public'+a.dest,'utf8');await writeFile('public'+a.dest,localize(text,url));
}
for(const page of raw){
 await mkdir(path.dirname(page.dest),{recursive:true});
 await writeFile(page.dest,localize(page.html));
}
const repairedKeys=new Set(inventory.map(p=>p.mode+'|'+p.lang+'|'+p.pathname));
const mergedPages=[...previous.pages.filter(p=>!repairedKeys.has(p.mode+'|'+p.lang+'|'+p.pathname)),...inventory];
const previousKept=previous.failures.filter(f=>f.kind!=='page'||!pages.has(new URL(decodeXML(f.url)).pathname));
const mergedFailures=[...previousKept,...failures.map(f=>f.kind==='page'&&f.error==='HTTP 404'?{...f,kind:'source-unavailable'}:f)];
await writeFile('migration/reports/capture.json',JSON.stringify({capturedAt:previous.capturedAt,repairedAt:new Date().toISOString(),routes:[...new Set(mergedPages.map(p=>p.pathname))],pageCount:mergedPages.length,assetCount:assets.size,failures:mergedFailures,pages:mergedPages},null,2));
await writeFile('migration/reports/assets.json',JSON.stringify(Object.fromEntries(assets),null,2));
console.log(JSON.stringify({pages:raw.length,assets:assets.size,failures:failures.length}));
if(failures.some(f=>f.kind==='page'&&f.error!=='HTTP 404'))process.exitCode=1;
