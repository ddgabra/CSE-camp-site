import {chromium,devices} from 'playwright';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
const report=JSON.parse(await readFile('migration/reports/capture.json','utf8'));
const assets=JSON.parse(await readFile('migration/reports/assets.json','utf8'));
const browser=await chromium.launch();
const enriched=[];
const pending=new Set();
const origin='https://www.catholicway.net';
for(const item of report.pages){
 const key=item.pathname==='/'?'index':item.pathname.replace(/^\/|\/$/g,'');
 const file='public/capture/'+item.mode+'/'+item.lang+'/'+key+'.html';
 let html=await readFile(file,'utf8');
 if(!html.includes('data-hook="accordion-item-header"'))continue;
 const ctx=await browser.newContext(item.mode==='mobile'?{...devices['iPhone 13']}:{viewport:{width:1440,height:1000}});
 const p=await ctx.newPage();
 p.on('response',r=>{
  const task=(async()=>{
   const url=r.url(),type=r.headers()['content-type']||'';
   if(assets[url]||!r.ok()||!/^(image\/|font\/|application\/(?:font|x-font))|text\/css/.test(type))return;
   try{
    const body=await r.body();let ext=path.extname(new URL(url).pathname);
    if(!/^\.[a-z0-9]{1,6}$/i.test(ext))ext='';
    if(type.includes('css'))ext='.css';else if(type.includes('woff2'))ext='.woff2';else if(type.includes('woff'))ext='.woff';else if(type.includes('image/png'))ext='.png';else if(type.includes('image/jpeg'))ext='.jpg';else if(type.includes('image/webp'))ext='.webp';else if(type.includes('image/svg'))ext='.svg';
    const dest='/assets/'+createHash('sha256').update(url).digest('hex').slice(0,24)+ext;
    assets[url]={dest,type,bytes:body.length};await writeFile('public'+dest,body);
   }catch{}
  })();pending.add(task);task.finally(()=>pending.delete(task));
 });
 await p.goto(origin+item.pathname+'?lang='+item.lang,{waitUntil:'networkidle',timeout:60000}).catch(()=>{});
 await p.waitForSelector('[data-hook="accordion-item-header"]');
 const count=await p.locator('[data-hook="accordion-item-header"]').count();
 const panels={};
 for(let n=0;n<count;n++){
  const button=p.locator('[data-hook="accordion-item-header"]').nth(n);
  const id=await button.getAttribute('aria-controls');
  await button.click();await p.waitForTimeout(400);
  const content=await p.locator('[id="'+id+'"]').innerHTML();
  panels[id]=content;
  if(!content.replace(/<[^>]+>/g,'').trim())throw new Error('Empty FAQ answer '+id);
  await button.click();await p.waitForTimeout(100);
 }
 const extras=await p.locator('head style,head link[rel="stylesheet"]').evaluateAll(nodes=>nodes.map(n=>n.outerHTML).join('\n'));
 html=await p.evaluate(({html,panels,extras})=>{
  const d=new DOMParser().parseFromString(html,'text/html');
  for(const [id,content]of Object.entries(panels)){const e=d.getElementById(id);if(e)e.innerHTML=content;}
  d.head.insertAdjacentHTML('beforeend',extras);
  d.querySelectorAll('script:not([src="/replica.js"])').forEach(e=>e.remove());
  d.querySelectorAll('a[href]').forEach(e=>{try{const u=new URL(e.getAttribute('href'),'https://www.catholicway.net');if(['www.catholicway.net','catholicway.net'].includes(u.hostname))e.setAttribute('href',u.pathname+u.search+u.hash);}catch{}});
  return '<!doctype html>\n'+d.documentElement.outerHTML;
 },{html,panels,extras});
 await Promise.allSettled([...pending]);
 for(const [url,a]of Object.entries(assets))html=html.split(url).join(a.dest).split(url.replaceAll('&','&amp;')).join(a.dest);
 await writeFile(file,html);
 enriched.push({pathname:item.pathname,lang:item.lang,mode:item.mode,answers:count});
 await ctx.close();
}
await browser.close();
for(const item of report.pages){
 const key=item.pathname==='/'?'index':item.pathname.replace(/^\/|\/$/g,'');
 const file='public/capture/'+item.mode+'/'+item.lang+'/'+key+'.html';
 let html=await readFile(file,'utf8');
 for(const [url,a]of Object.entries(assets)){
  const u=new URL(url);
  if(['www.catholicway.net','catholicway.net'].includes(u.hostname)){
   const relative=u.pathname+u.search;
   html=html.split('href="'+relative+'"').join('href="'+a.dest+'"').split('href="'+relative.replaceAll('&','&amp;')+'"').join('href="'+a.dest+'"');
  }
 }
 await writeFile(file,html);
}
await writeFile('migration/reports/assets.json',JSON.stringify(assets,null,2));
await writeFile('migration/reports/enrichment.json',JSON.stringify({enrichedAt:new Date().toISOString(),enriched},null,2));
console.log(JSON.stringify(enriched));
