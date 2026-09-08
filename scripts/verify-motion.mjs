import {devices} from 'playwright';
const base='http://127.0.0.1:4173';
export async function verifyMotion(browser){
 const results=[];
 const record=(test,data,passed)=>results.push({test,...data,passed});
 const attempt=async(test,data,work)=>{
  try{await work();}catch(error){record(test,{...data,error:error.message},false);}
 };
 for(const mode of ['desktop','mobile'])for(const lang of ['en','fr']){
  const context=await browser.newContext(mode==='mobile'?{...devices['iPhone 13']}:{viewport:{width:1920,height:1000}});
  const page=await context.newPage();const errors=[];page.on('pageerror',error=>errors.push(error.message));
  const data={mode,lang};
  await attempt('Smooth FAQ interactions',data,async()=>{
   await page.goto(base+'/camp-faq?lang='+lang,{waitUntil:'load'});
   const button=page.locator('[data-hook="accordion-item-header"]').first();
   const id=await button.getAttribute('aria-controls');
   const sample=()=>page.evaluate(id=>{
    const panel=document.getElementById(id),outer=panel.parentElement.parentElement;
    return {height:outer.getBoundingClientRect().height,target:outer.scrollHeight,opacity:Number(getComputedStyle(outer).opacity),hidden:panel.hidden,inert:panel.inert,animations:outer.getAnimations().length};
   },id);
   await button.click();await page.waitForTimeout(90);const opening=await sample();
   await page.waitForTimeout(450);const opened=await sample();
   record('FAQ expands through intermediate heights', {...data,opening,opened}, opening.height>0&&opening.height<opened.height-1&&opening.opacity>0&&opening.opacity<1&&opened.height>0&&!opened.hidden);
   await button.click();await page.waitForTimeout(90);const closing=await sample();
   await page.waitForTimeout(450);const closed=await sample();
   record('FAQ collapses before hiding its answer',{...data,closing,closed},closing.height>0&&closing.height<opened.height-1&&closing.inert&&!closing.hidden&&closed.height===0&&closed.hidden);
   await button.click();await page.waitForTimeout(60);await button.click();await page.waitForTimeout(60);await button.click();await page.waitForTimeout(450);
   const reversed=await sample();
   record('Rapid FAQ clicks settle open without leftover animations',{...data,reversed},!reversed.hidden&&!reversed.inert&&reversed.height>0&&reversed.animations===0&&await button.getAttribute('aria-expanded')==='true');
   record('FAQ search remains removed',data,await page.locator('input[type="search"],[role="search"],#cse-faq-search').count()===0);
   await page.emulateMedia({reducedMotion:'reduce'});
   await button.click();const reduced=await sample();
   record('Reduced motion closes FAQ immediately',{...data,reduced},reduced.hidden&&reduced.height===0&&reduced.animations===0);
   record('Reduced motion disables smooth scrolling',data,await page.evaluate(()=>getComputedStyle(document.documentElement).scrollBehavior)==='auto');
   await page.emulateMedia({reducedMotion:'no-preference'});
  });
  await attempt('Navigation transitions',data,async()=>{
   await page.goto(base+'/home?lang='+lang,{waitUntil:'load'});
   if(mode==='mobile'){
    const button=page.locator('#MENU_AS_CONTAINER_TOGGLE'),menu=page.locator('#MENU_AS_CONTAINER');
    await button.click();await page.waitForTimeout(75);
    const opening=await menu.evaluate(el=>({opacity:Number(getComputedStyle(el).opacity),transform:getComputedStyle(el).transform}));
    await page.waitForTimeout(350);
    record('Mobile drawer fades and slides into view',{...data,opening},opening.opacity>0&&opening.opacity<1&&await menu.isVisible());
    const row=menu.locator('li > [data-testid="itemWrapper"]').first(),submenu=menu.locator('li > ul').first();
    await row.click();await page.waitForTimeout(75);
    const expanding=await submenu.evaluate(el=>({height:el.getBoundingClientRect().height,opacity:Number(getComputedStyle(el).opacity)}));
    await page.waitForTimeout(350);const full=(await submenu.boundingBox()).height;
    record('Mobile submenu expands gradually',{...data,expanding,full},expanding.height>0&&expanding.height<full-1&&expanding.opacity>0&&expanding.opacity<1);
    await row.click();await page.waitForTimeout(350);
    record('Mobile submenu finishes closed',data,!(await submenu.isVisible()));
    await button.click();await page.waitForTimeout(75);const closing=await menu.evaluate(el=>({opacity:Number(getComputedStyle(el).opacity),inert:el.inert}));
    await menu.waitFor({state:'hidden',timeout:3000});
    record('Mobile drawer fades out before hiding',{...data,closing},closing.opacity>0&&closing.opacity<1&&closing.inert);
    await button.click();await page.waitForTimeout(350);
   }else{
    const trigger=page.locator('[data-testid="menuItemDepth0"] [aria-haspopup]').first();
    await trigger.hover();await page.waitForTimeout(70);
    const panel=page.locator('[data-cse-open] > [data-testid="positionBox"]');
    const opening=await panel.evaluate(el=>({opacity:Number(getComputedStyle(el).opacity),animations:el.getAnimations().length}));
    await page.waitForTimeout(300);
    record('Desktop menu fades into view',{...data,opening},opening.opacity>0&&opening.opacity<1&&await panel.isVisible());
    await page.mouse.move(5,900);await page.waitForTimeout(60);
    const closing=await panel.evaluate(el=>({opacity:Number(getComputedStyle(el).opacity),inert:el.inert}));
    await page.waitForTimeout(250);
    record('Desktop menu fades out before hiding',{...data,closing},closing.opacity>0&&closing.opacity<1&&closing.inert&&await page.locator('[data-cse-open]').count()===0);
   }
   const toggle=page.locator('[data-testid="languages-dropdown-handle"]').first();
   await toggle.click();await page.waitForTimeout(60);
   const language=page.locator('#cse-language-options');
   const opacity=await language.evaluate(el=>Number(getComputedStyle(el).opacity));
   record('Language menu fades into view',{...data,opacity},opacity>0&&opacity<1);
   await toggle.click();await page.waitForTimeout(40);await toggle.click();await page.waitForTimeout(300);
   record('Language menu can reverse a closing animation',data,await language.isVisible()&&await toggle.getAttribute('aria-expanded')==='true'&&!(await language.evaluate(el=>el.inert)));
   await page.keyboard.press('Escape');await language.waitFor({state:'detached',timeout:3000});
  });
  record('Motion interactions have no JavaScript errors',{...data,errors},errors.length===0);
  await context.close();
 }
 for(const lang of ['en','fr']){
  const context=await browser.newContext({viewport:{width:1920,height:1000}});
  const page=await context.newPage();
  await attempt('Home banner transitions',{lang},async()=>{
   await page.goto(base+'/home?lang='+lang,{waitUntil:'load'});
   const frame=await (await page.waitForSelector('iframe[src*="home-slideshow.html"]')).contentFrame();
   await frame.waitForLoadState('load');
   const dots=frame.locator('.cycle-pager span');
   await dots.nth(0).click();await page.waitForTimeout(700);
   await dots.nth(1).click();await page.waitForTimeout(100);
   const mid=await frame.locator('.cycle-slide:not(.cycle-sentinel)').evaluateAll(slides=>slides.map(el=>({opacity:Number(getComputedStyle(el).opacity),inert:el.inert})));
   record('Home banners crossfade without an instant swap',{lang,mid},mid.length===2&&mid.every(s=>s.opacity>0&&s.opacity<1)&&mid[0].inert&&!mid[1].inert);
   await dots.nth(0).click();await page.waitForTimeout(80);await dots.nth(1).click();await page.waitForTimeout(750);
   const settled=await frame.locator('.cycle-slide:not(.cycle-sentinel)').evaluateAll(slides=>slides.map(el=>({opacity:Number(getComputedStyle(el).opacity),active:el.classList.contains('cycle-slide-active'),animations:el.getAnimations().length})));
   record('Rapid banner changes settle on the selected slide',{lang,settled},settled[0].opacity===0&&settled[1].opacity===1&&settled[1].active&&settled.every(s=>s.animations===0));
   await page.emulateMedia({reducedMotion:'reduce'});await dots.nth(0).click();
   record('Reduced motion changes banners immediately',{lang},await frame.locator('.cycle-slide-active').evaluate(el=>getComputedStyle(el).opacity==='1'&&el.getAnimations().length===0));
  });
  await context.close();
 }
 for(const mode of ['desktop','mobile'])for(const lang of ['en','fr']){
  const context=await browser.newContext(mode==='mobile'?{...devices['iPhone 13']}:{viewport:{width:1920,height:1000}});
  const page=await context.newPage();
  for(const route of ['mission-en','history']){
   await attempt('Responsive background photos',{mode,lang,route},async()=>{
    await page.goto(base+'/'+route+'?lang='+lang,{waitUntil:'load'});
    const ids=route==='history'?['img_comp-jmb2cy4i']:['img_comp-jk06ghni','img_comp-jk06olmh','img_comp-jk06spzn'];
    await page.waitForFunction(ids=>ids.every(id=>{const img=document.getElementById(id)?.querySelector('img');return img?.complete&&img.naturalWidth>0;}),ids);
    for(const width of mode==='mobile'?[390]:[1024,1440,1920,2560,1920]){
     if(mode==='desktop')await page.setViewportSize({width,height:1000});
     await page.waitForTimeout(60);
     for(const id of ids){
      const geometry=await page.locator('#'+id).evaluate(host=>{
       const img=host.querySelector('img'),h=host.getBoundingClientRect(),i=img.getBoundingClientRect();
       const section=host.closest('[style*="--motion-comp-height"]')||host.closest('section');
       const s=section.getBoundingClientRect();
       return {hostLeft:h.left,hostRight:h.right,hostWidth:h.width,hostHeight:h.height,imageLeft:i.left,imageRight:i.right,imageWidth:i.width,imageHeight:i.height,sectionWidth:s.width,naturalWidth:img.naturalWidth,src:img.getAttribute('src'),fit:getComputedStyle(img).objectFit};
      });
      record('Background photo covers its full responsive container',{mode,lang,route,width,id,...geometry},geometry.hostWidth>0&&Math.abs(geometry.hostLeft-geometry.imageLeft)<1&&Math.abs(geometry.hostRight-geometry.imageRight)<1&&Math.abs(geometry.hostHeight-geometry.imageHeight)<1&&geometry.hostWidth>=geometry.sectionWidth-1&&geometry.src.includes('-original.')&&geometry.naturalWidth>=1700);
     }
    }
    if(mode==='desktop'){
     const id=ids[route==='history'?0:1];
     const sectionId=id.replace('img_','');
     const top=await page.locator('#'+sectionId).evaluate(el=>el.getBoundingClientRect().top+scrollY);
     await page.evaluate(y=>scrollTo({top:y,behavior:'instant'}),top);
     const before=await page.locator('#'+id).evaluate(el=>({imageTop:el.getBoundingClientRect().top,scroll:scrollY,position:getComputedStyle(el).position}));
     await page.evaluate(()=>scrollBy({top:120,behavior:'instant'}));
     const after=await page.locator('#'+id).evaluate(el=>({imageTop:el.getBoundingClientRect().top,scroll:scrollY}));
     record('Background reveal stays steady during scrolling',{mode,lang,route,before,after},before.position==='sticky'&&Math.abs(after.imageTop-before.imageTop)<1&&Math.abs(after.scroll-before.scroll-120)<1);
     await page.screenshot({path:'migration/screenshots/'+mode+'-'+lang+'-'+route+'-wide-replica.png'});
     await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));
     await page.evaluate(()=>scrollTo({top:500,behavior:'smooth'}));await page.waitForTimeout(60);
     const midway=await page.evaluate(()=>scrollY);await page.waitForTimeout(700);const end=await page.evaluate(()=>scrollY);
     record('Smooth scrolling moves through intermediate positions',{mode,lang,route,midway,end},midway>0&&midway<500&&end===500);
    }
   });
  }
  await context.close();
 }
 return results;
}
