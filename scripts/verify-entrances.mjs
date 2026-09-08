// Check actual rendered visibility and animation progress, not only text in the DOM.
import {devices} from 'playwright';
export async function verifyEntrances(browser){
 const results=[];
 for(const mode of ['desktop','mobile'])for(const lang of ['en','fr']){
  const context=await browser.newContext(mode==='mobile'?{...devices['iPhone 13']}:{viewport:{width:1920,height:1000},reducedMotion:'no-preference'});
  const page=await context.newPage();
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto('http://127.0.0.1:4173/camp-subsidies?lang='+lang,{waitUntil:'load'});
  const ids=await page.locator('[data-motion-enter]').evaluateAll(nodes=>nodes.map(node=>node.id));
  results.push({test:'All subsidy entrance components restored',mode,lang,count:ids.length,passed:ids.length===16});
  if(mode==='desktop'){
   const id='comp-lua692ci1';
   const before=await page.locator('#'+id).evaluate(node=>({state:node.dataset.motionEnter,opacity:Number(getComputedStyle(node).opacity),name:getComputedStyle(node).animationName,duration:getComputedStyle(node).animationDuration}));
   await page.locator('#'+id).scrollIntoViewIfNeeded();
   await page.waitForFunction(id=>document.getElementById(id).dataset.motionEnter==='running',id);
   await page.waitForTimeout(200);
   const first=await page.locator('#'+id).evaluate(node=>Number(getComputedStyle(node).opacity));
   await page.waitForTimeout(350);
   const second=await page.locator('#'+id).evaluate(node=>Number(getComputedStyle(node).opacity));
   await page.waitForFunction(id=>document.getElementById(id).dataset.motionEnter==='done',id);
   results.push({test:'Subsidy content smoothly floats in on scroll with original timing',mode,lang,before,first,second,passed:before.state==='pending'&&before.opacity===0&&before.name==='motion-floatIn'&&before.duration==='1.2s'&&first>0&&second>first&&second<1});
  }
  for(const id of ids){
   const node=page.locator('#'+id);
   await node.scrollIntoViewIfNeeded();
   await page.waitForFunction(id=>document.getElementById(id).dataset.motionEnter==='done',id);
   const state=await node.evaluate(node=>{
    const style=getComputedStyle(node),rect=node.getBoundingClientRect();
    return {opacity:Number(style.opacity),display:style.display,visibility:style.visibility,width:rect.width,height:rect.height,text:node.innerText,images:[...node.querySelectorAll('img')].map(image=>({loaded:image.complete&&image.naturalWidth>0,width:image.getBoundingClientRect().width,height:image.getBoundingClientRect().height}))};
   });
   results.push({test:'Subsidy component is visible after scrolling',mode,lang,id,...state,passed:state.opacity===1&&state.display!=='none'&&state.visibility==='visible'&&state.width>0&&state.height>0&&state.images.every(image=>image.loaded&&image.width>0&&image.height>0)});
  }
  await page.locator('#comp-lua692ci1').scrollIntoViewIfNeeded();
  await page.screenshot({path:'migration/screenshots/'+mode+'-'+lang+'-subsidies-restored.png'});
  const texts=await page.locator('h2').allTextContents();
  results.push({test:'All subsidy fund headings present',mode,lang,texts,passed:texts.some(t=>t.includes('Sunshine Fund'))&&texts.some(t=>t.includes('John M. Smith Memorial Campership Fund'))&&texts.some(t=>lang==='en'?t.includes('Send a Kid to Camp'):t.includes('Envoyer un enfant'))});
  results.push({test:'Subsidy page has no JavaScript errors',mode,lang,errors,passed:errors.length===0});
  await context.close();
 }
 for(const lang of ['en','fr']){
  const context=await browser.newContext({viewport:{width:1920,height:1000},reducedMotion:'reduce'});
  const page=await context.newPage();
  await page.goto('http://127.0.0.1:4173/camp-subsidies?lang='+lang,{waitUntil:'load'});
  const states=await page.locator('[data-motion-enter]').evaluateAll(nodes=>nodes.map(node=>({id:node.id,state:node.dataset.motionEnter,opacity:Number(getComputedStyle(node).opacity),animation:getComputedStyle(node).animationName})));
  results.push({test:'Reduced motion shows every subsidy section immediately',lang,states,passed:states.length===16&&states.every(node=>node.state==='done'&&node.opacity===1&&node.animation==='none')});
  await context.close();
 }
 return results;
}
