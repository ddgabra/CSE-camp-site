import {createServer} from 'node:http';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {chromium,devices} from 'playwright';
import {PNG} from 'pngjs';
import pixelmatch from 'pixelmatch';
import handler from '../api/page.js';
const report=JSON.parse(await readFile('migration/reports/capture.json','utf8'));
const results=[];
const contentTypes={'.css':'text/css','.js':'application/javascript','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.svg':'image/svg+xml','.webp':'image/webp','.woff2':'font/woff2','.woff':'font/woff','.pdf':'application/pdf'};
const server=createServer(async(req,res)=>{
 try{
  const u=new URL(req.url,'http://localhost:4173');
  if(u.pathname.startsWith('/assets/')||u.pathname.startsWith('/replica.')){
   const file=path.resolve('public','.'+u.pathname);
   if(!file.startsWith(path.resolve('public')+path.sep)){res.writeHead(400);res.end();return;}
   res.setHeader('Content-Type',contentTypes[path.extname(file)]||'application/octet-stream');
   res.end(await readFile(file));return;
  }
  u.searchParams.set('route',u.pathname);req.url=u.pathname+u.search;
  res.status=n=>{res.statusCode=n;return res;};res.send=body=>res.end(body);
  await handler(req,res);
 }catch(e){res.statusCode=500;res.end(e.message);}
});
await new Promise(r=>server.listen(4173,'127.0.0.1',r));
await mkdir('migration/screenshots',{recursive:true});
const browser=await chromium.launch();
for(const mode of ['desktop','mobile']){
 const ctx=await browser.newContext(mode==='mobile'?{...devices['iPhone 13'],locale:'en-CA'}:{viewport:{width:1440,height:1000},deviceScaleFactor:1,locale:'en-CA'});
 const page=await ctx.newPage();
 for(const item of report.pages.filter(p=>p.mode===mode)){
  const url='http://127.0.0.1:4173'+item.pathname+(item.lang==='fr'?'?lang=fr':'');
  const errors=[];
  page.removeAllListeners('pageerror');page.on('pageerror',e=>errors.push(e.message));
  const response=await page.goto(url,{waitUntil:'load'});
  await page.evaluate(()=>document.fonts.ready);
  const state=await page.evaluate(()=>({title:document.title,text:document.body.innerText,images:[...document.images].filter(i=>!i.complete||!i.naturalWidth).map(i=>({src:i.src,alt:i.alt})),links:[...document.querySelectorAll('a[href]')].map(a=>a.getAttribute('href')),forms:document.forms.length}));
  const missingText=item.text.split('\n').map(x=>x.trim()).filter(x=>x.length>30&&!state.text.includes(x));
  const result={pathname:item.pathname,lang:item.lang,mode,status:response.status(),missingText,brokenImages:state.images,scriptErrors:errors};
  if(['/', '/home','/camps'].includes(item.pathname)){
   const key=item.pathname==='/'?'index':item.pathname.replace(/^\/|\/$/g,'').replaceAll('/','_');
   const prefix='migration/screenshots/'+mode+'-'+item.lang+'-'+key;
   await page.screenshot({path:prefix+'-replica.png',fullPage:true});
   const source=PNG.sync.read(await readFile(prefix+'-source.png')), replica=PNG.sync.read(await readFile(prefix+'-replica.png'));
   result.dimensions={source:[source.width,source.height],replica:[replica.width,replica.height]};
   if(source.width===replica.width&&source.height===replica.height){
    const diff=new PNG({width:source.width,height:source.height});
    result.pixelDifference=pixelmatch(source.data,replica.data,diff.data,source.width,source.height,{threshold:0.15})/(source.width*source.height);
    await writeFile(prefix+'-diff.png',PNG.sync.write(diff));
   }
  }
  results.push(result);console.log(JSON.stringify(result));
 }
 if(mode==='desktop'){
  await page.goto('http://127.0.0.1:4173/');
  const toggle=page.locator('[data-testid="languages-dropdown-handle"]');
  if(await toggle.count()){await toggle.click();await page.locator('#cse-language-options a').filter({hasText:'FR'}).click();results.push({test:'French language switch',passed:new URL(page.url()).searchParams.get('lang')==='fr'});}
  const trigger=page.locator('[data-testid="menuItemDepth0"] [aria-haspopup]').first();
  if(await trigger.count()){await trigger.click();results.push({test:'Main menu expands',passed:await page.locator('[data-cse-open] [data-testid="positionBox"]').isVisible()});}
 }
 await ctx.close();
}
await browser.close();server.close();
await writeFile('migration/reports/verification.json',JSON.stringify({verifiedAt:new Date().toISOString(),results},null,2));
if(results.some(r=>r.status&&r.status!==200||r.missingText?.length||r.scriptErrors?.length||r.passed===false))process.exitCode=1;
