import {createServer} from 'node:http';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {chromium,devices} from 'playwright';
import {PNG} from 'pngjs';
import pixelmatch from 'pixelmatch';
import handler from '../api/page.js';
const report=JSON.parse(await readFile('migration/reports/capture.json','utf8'));
const results=[];
const contentTypes={'.html':'text/html','.css':'text/css','.js':'application/javascript','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.svg':'image/svg+xml','.webp':'image/webp','.woff2':'font/woff2','.woff':'font/woff','.pdf':'application/pdf'};
const server=createServer(async(req,res)=>{
 try{
  const u=new URL(req.url,'http://localhost:4173');
  if(u.pathname.startsWith('/assets/')||u.pathname.startsWith('/replica.')||u.pathname.startsWith('/capture/')||u.pathname==='/slideshow.js'){
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
  if(item.redirect){results.push({pathname:item.pathname,lang:item.lang,mode,redirect:item.redirect,preserved:true});continue;}
  const url='http://127.0.0.1:4173'+item.pathname+(item.lang==='fr'?'?lang=fr':'');
  const errors=[];
  page.removeAllListeners('pageerror');page.on('pageerror',e=>errors.push({message:e.message,stack:e.stack}));
  const response=await page.goto(url,{waitUntil:'domcontentloaded'});
  await page.evaluate(()=>Promise.race([document.fonts.ready,new Promise(r=>setTimeout(r,5000))]));
  await page.evaluate(()=>Promise.race([Promise.all([...document.images].map(i=>i.complete?Promise.resolve():new Promise(r=>{i.addEventListener('load',r,{once:true});i.addEventListener('error',r,{once:true});}))),new Promise(r=>setTimeout(r,8000))]));
  if(item.pathname==='/home'){
   const frame=page.frames().find(f=>f.url().includes('home-slideshow.html'));
   if(!frame)throw new Error('Missing standalone slideshow');
   await frame.waitForLoadState('domcontentloaded');
   const backgrounds=await frame.locator('.img').evaluateAll(nodes=>nodes.map(n=>getComputedStyle(n).backgroundImage.match(/url\(["']?(.*?)["']?\)/)?.[1]).filter(Boolean));
   for(const src of new Set(backgrounds)){const r=await fetch(src);if(!r.ok)throw new Error('Broken slideshow image '+src);}
  }
  const state=await page.evaluate(()=>({title:document.title,text:document.body.innerText,images:[...document.images].filter(i=>!i.complete||!i.naturalWidth).map(i=>({src:i.src,alt:i.alt})),links:[...document.querySelectorAll('a[href]')].map(a=>a.getAttribute('href')),forms:document.forms.length}));
  const missingText=item.text.split('\n').map(x=>x.trim()).filter(x=>x.length>30&&!state.text.includes(x));
  const result={pathname:item.pathname,lang:item.lang,mode,status:response.status(),missingText,brokenImages:state.images,sourceBrokenImages:item.media.filter(i=>!i.loaded).length,scriptErrors:errors};
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
  if(item.pathname==='/camp-faq'){
   const headers=page.locator('[data-hook="accordion-item-header"]');
   result.accordionCount=await headers.count();
   result.emptyAnswers=await page.locator('[data-hook="accordion-item-content"]').evaluateAll(nodes=>nodes.filter(n=>!n.textContent.trim()).length);
   if(result.accordionCount){const b=headers.first();await b.click();const id=await b.getAttribute('aria-controls');result.accordionOpens=await page.locator('[id="'+id+'"]').isVisible();}
  }
  if(errors.length){
   const sourceContext=await browser.newContext(mode==='mobile'?{...devices['iPhone 13']}:{viewport:{width:1440,height:1000}});
   const sourcePage=await sourceContext.newPage();const baseline=[];
   sourcePage.on('pageerror',e=>baseline.push({message:e.message,stack:e.stack}));
   await sourcePage.goto(item.url,{waitUntil:'domcontentloaded',timeout:60000}).catch(()=>{});
   await sourcePage.waitForTimeout(3000);
   result.sourceScriptErrors=baseline;
   result.newScriptErrors=errors.filter(e=>!baseline.some(b=>b.message===e.message));
   await sourceContext.close();
  }else result.newScriptErrors=[];
  results.push(result);console.log(JSON.stringify(result));
 }
 if(mode==='desktop'){
  await page.goto('http://127.0.0.1:4173/');
  const toggle=page.locator('[data-testid="languages-dropdown-handle"]');
  if(await toggle.count()){await toggle.click();await page.locator('#cse-language-options a').filter({hasText:'FR'}).click();results.push({test:'French language switch',passed:new URL(page.url()).searchParams.get('lang')==='fr'});}
  const trigger=page.locator('[data-testid="menuItemDepth0"] [aria-haspopup]').first();
  if(await trigger.count()){await trigger.click();results.push({test:'Main menu expands',passed:await page.locator('[data-cse-open] [data-testid="positionBox"]').isVisible()});}
 }
 if(mode==='mobile'){
  await page.goto('http://127.0.0.1:4173/home',{waitUntil:'domcontentloaded'});
  const toggle=page.locator('#MENU_AS_CONTAINER_TOGGLE');
  await toggle.click();
  results.push({test:'Original mobile menu opens',passed:await page.locator('#MENU_AS_CONTAINER').isVisible()});
  const row=page.locator('#MENU_AS_CONTAINER li > [data-testid="itemWrapper"]').first();
  await row.click();
  results.push({test:'Mobile submenu opens',passed:await page.locator('#MENU_AS_CONTAINER li > ul').first().isVisible()});
  await toggle.click();
  results.push({test:'Mobile menu closes',passed:!(await page.locator('#MENU_AS_CONTAINER').isVisible())});
 }
 await ctx.close();
}

 // Cover the original fixed-width regression at widths below and above capture size.
 const responsiveContext=await browser.newContext({viewport:{width:1920,height:1000}});
 const responsivePage=await responsiveContext.newPage();
 for(const lang of ['en','fr']){
  await responsivePage.goto('http://127.0.0.1:4173/home?lang='+lang,{waitUntil:'domcontentloaded'});
  const frame=responsivePage.frames().find(f=>f.url().includes('home-slideshow.html'));
  await frame.waitForLoadState('load');
  await responsivePage.waitForFunction(()=>['img_comp-lq2mfhza','img_comp-lq2mfhzn1'].every(id=>{const i=document.getElementById(id)?.querySelector('img');return i?.complete&&i.naturalWidth>0;}));
  for(const width of [1024,1280,1440,1920,2560,1280,1920]){
   await responsivePage.setViewportSize({width,height:1000});
   for(const slide of [0,1]){
    await frame.locator('.cycle-pager span').nth(slide).click();
    const bounds=await frame.evaluate(()=>{
     const image=document.querySelector('.cycle-slide-active .img').getBoundingClientRect();
     const overlay=document.querySelector('.cycle-slide-active .overlay').getBoundingClientRect();
     return {slideWidth:document.querySelector('.cycle-slide-active').getBoundingClientRect().width,viewport:innerWidth,imageLeft:image.left,imageRight:image.right,imageWidth:image.width,overlayLeft:overlay.left,overlayWidth:overlay.width};
    });
    const pageBounds=await responsivePage.evaluate(()=>({viewport:document.documentElement.clientWidth,frame:document.querySelector('iframe').getBoundingClientRect().width,scrollWidth:document.documentElement.scrollWidth}));
    const passed=bounds.imageLeft<=1&&bounds.imageRight>=bounds.viewport-1&&Math.abs(bounds.slideWidth-bounds.viewport)<1&&Math.abs(pageBounds.frame-pageBounds.viewport)<1&&pageBounds.scrollWidth<=pageBounds.viewport+1;
    results.push({test:'Full-width responsive slideshow',lang,width,slide,...bounds,...pageBounds,passed});
    const buttonBounds=await frame.locator('.cycle-slide-active .more').evaluate(button=>{
     const b=button.getBoundingClientRect();return {left:b.left,right:b.right,top:b.top,bottom:b.bottom,width:b.width,height:b.height,viewportWidth:innerWidth,viewportHeight:innerHeight};
    });
    results.push({test:'Read more button is visible within its slide',lang,width,slide,...buttonBounds,passed:buttonBounds.width>0&&buttonBounds.height>0&&buttonBounds.left>=0&&buttonBounds.right<=buttonBounds.viewportWidth+1&&buttonBounds.top>=0&&buttonBounds.bottom<=buttonBounds.viewportHeight+1});
    const photos=await responsivePage.evaluate(()=>['img_comp-lq2mfhza','img_comp-lq2mfhzn1'].map(id=>{
     const host=document.getElementById(id),image=host.querySelector('img'),h=host.getBoundingClientRect(),i=image.getBoundingClientRect();
     return {id,columnWidth:h.width,imageWidth:i.width,columnHeight:h.height,imageHeight:i.height,leftDifference:i.left-h.left,naturalWidth:image.naturalWidth,position:getComputedStyle(image).objectPosition};
    }));
    const facebook=await responsivePage.locator('#comp-ieop50h5').evaluate(host=>{
     const frame=host.querySelector('iframe'),wrapper=frame.parentElement,h=host.getBoundingClientRect(),f=frame.getBoundingClientRect(),w=wrapper.getBoundingClientRect();
     return {containerWidth:h.width,containerHeight:h.height,frameWidth:f.width,frameHeight:f.height,wrapperWidth:w.width,wrapperHeight:w.height};
    });
    results.push({test:'Quick News Facebook preview has visible dimensions',lang,width,...facebook,passed:facebook.containerWidth>0&&facebook.containerHeight>0&&Math.abs(facebook.frameWidth-facebook.containerWidth)<1&&Math.abs(facebook.frameHeight-facebook.containerHeight)<1&&Math.abs(facebook.wrapperWidth-facebook.frameWidth)<1&&Math.abs(facebook.wrapperHeight-facebook.frameHeight)<1});
    for(const photo of photos)results.push({test:'Uncropped photo fills responsive column',lang,width,...photo,passed:Math.abs(photo.imageWidth-photo.columnWidth)<1&&Math.abs(photo.imageHeight-photo.columnHeight)<1&&Math.abs(photo.leftDifference)<1&&photo.naturalWidth>=1200});

   }
   if(width===1920)await responsivePage.screenshot({path:'migration/screenshots/desktop-'+lang+'-home-wide-replica.png',fullPage:false});
  }
 }

 for(const lang of ['en','fr'])for(const slide of [0,1]){
  await responsivePage.goto('http://127.0.0.1:4173/home?lang='+lang,{waitUntil:'domcontentloaded'});
  const frame=responsivePage.frames().find(f=>f.url().includes('home-slideshow.html'));
  await frame.waitForLoadState('load');
  await frame.locator('.cycle-pager span').nth(slide).click();
  const target=slide===0?'/camps':'/banquet';
  await Promise.all([responsivePage.waitForURL(u=>u.pathname===target),frame.locator('.cycle-slide-active .more').click()]);
  const destination=new URL(responsivePage.url());
  results.push({test:'Read more opens the correct page',lang,slide,target,destination:destination.pathname+destination.search,passed:destination.pathname===target&&(lang!=='fr'||destination.searchParams.get('lang')==='fr')});
 }

 await responsiveContext.close();

await browser.close();server.close();
await writeFile('migration/reports/verification.json',JSON.stringify({verifiedAt:new Date().toISOString(),results},null,2));
if(results.some(r=>r.status&&r.status!==200||r.missingText?.length||r.newScriptErrors?.length||r.passed===false||r.emptyAnswers>0||r.accordionOpens===false||r.brokenImages?.length>r.sourceBrokenImages))process.exitCode=1;
