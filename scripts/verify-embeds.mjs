import {devices} from 'playwright';
export async function verifyEmbeds(browser){
 const results=[];
 for(const mode of ['desktop','mobile'])for(const lang of ['en','fr']){
  const context=await browser.newContext(mode==='mobile'?{...devices['iPhone 13']}:{viewport:{width:1920,height:1000}});
  const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  for(const route of ['contact-us','facility-rental']){
   const data={mode,lang,route};
   try{
    await page.goto('http://127.0.0.1:4173/'+route+'?lang='+lang,{waitUntil:'domcontentloaded'});
    const map=page.locator('#cse-contact-map');
    await map.scrollIntoViewIfNeeded();
    const frame=await (await map.elementHandle()).contentFrame();
    await frame.waitForSelector('body',{timeout:20000});
    const zoom=frame.getByRole('button',{name:/^(Zoom in|Zoom avant|Agrandir)$/i});
    await zoom.waitFor({state:'visible',timeout:25000});
    await zoom.click();
    const text=await frame.locator('body').innerText(),bounds=await map.boundingBox();
    results.push({test:'Interactive location map loads and zooms',...data,bounds,passed:/Catholic School Of Evangelization/i.test(text)&&bounds.width>200&&bounds.height>150});
    if(route==='contact-us'){
     const original=await page.locator('#img_comp-ll18nupa img').evaluate(img=>({src:img.getAttribute('src'),width:img.naturalWidth,height:img.naturalHeight}));
     results.push({test:'Contact photo uses the original uncropped file',...data,...original,passed:original.src==='/assets/cse-contact-original.jpg'&&original.width===2016&&original.height===933});
    }else{
     const element=await page.waitForSelector('iframe[src*="facility-gallery.html"]');
     await element.scrollIntoViewIfNeeded();
     const gallery=await element.contentFrame();await gallery.waitForLoadState('load');
     const thumbs=gallery.locator('.thumb'),slides=gallery.locator('[data-slide]');
     const count=await thumbs.count();
     await gallery.waitForFunction(()=>[...document.images].every(img=>img.complete&&img.naturalWidth>0));
     for(let i=0;i<count;i++){await thumbs.nth(i).click();await gallery.waitForTimeout(30);}
     await gallery.waitForTimeout(800);
     results.push({test:'All ten facility photos can be selected',...data,count,passed:count===10&&await thumbs.nth(9).getAttribute('aria-pressed')==='true'&&await slides.nth(9).getAttribute('aria-hidden')==='false'});
     await gallery.locator('#display').press('ArrowRight');await gallery.waitForTimeout(100);
     const mid=await slides.nth(0).evaluate(el=>Number(getComputedStyle(el).opacity));
     await gallery.waitForTimeout(750);
     results.push({test:'Facility slideshow crossfades and wraps with keyboard navigation',...data,mid,passed:mid>0&&mid<1&&await thumbs.nth(0).getAttribute('aria-pressed')==='true'});
     const geometry=await gallery.locator('#display').evaluate(el=>{
      const image=el.querySelector('[aria-hidden="false"] img'),box=el.getBoundingClientRect(),i=image.getBoundingClientRect();
      return {width:box.width,height:box.height,imageWidth:i.width,imageHeight:i.height};
     });
     results.push({test:'Facility slideshow image fills its frame',...data,...geometry,passed:Math.abs(geometry.width-geometry.imageWidth)<1&&Math.abs(geometry.height-geometry.imageHeight)<1});
     await page.emulateMedia({reducedMotion:'reduce'});await thumbs.nth(2).click();
     results.push({test:'Facility slideshow respects reduced motion',...data,passed:await slides.nth(2).evaluate(el=>getComputedStyle(el).opacity==='1'&&el.getAnimations().length===0)});
     await page.emulateMedia({reducedMotion:'no-preference'});
     await page.screenshot({path:'migration/screenshots/'+mode+'-'+lang+'-facility-gallery-replica.png'});
    }
   }catch(error){results.push({test:'Contact and facility components',...data,passed:false,error:error.message});}
  }
  results.push({test:'Contact and facility have no JavaScript errors',mode,lang,errors,passed:errors.length===0});
  await context.close();
 }
 return results;
}
