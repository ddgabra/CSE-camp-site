import {devices} from 'playwright';
export async function verifyFaq(browser){
 const results=[];
 for(const mode of ['desktop','mobile'])for(const lang of ['en','fr']){
  const context=await browser.newContext(mode==='mobile'?{...devices['iPhone 13']}:{viewport:{width:1440,height:1000}});
  const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:4173/camp-faq?lang='+lang,{waitUntil:'load'});
  const buttons=page.locator('[data-hook="accordion-item-header"]');
  const originalIds=await buttons.evaluateAll(nodes=>nodes.map(n=>n.id));
  const originalLinks=await page.locator('[data-hook="accordion-item-content"] a[href]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('href')).sort());
  const expanded=()=>page.locator('[data-hook="accordion-item-header"][aria-expanded="true"]');
  await buttons.nth(0).click();await buttons.nth(1).click();
  results.push({test:'Opening another FAQ closes the previous answer',mode,lang,passed:await expanded().count()===1&&await buttons.nth(1).getAttribute('aria-expanded')==='true'&&await buttons.nth(0).getAttribute('aria-expanded')==='false'});
  await buttons.nth(10).click();
  results.push({test:'Only one answer opens across FAQ and rules sections',mode,lang,passed:await expanded().count()===1&&await buttons.nth(10).getAttribute('aria-expanded')==='true'});
  await buttons.nth(10).press('Enter');
  results.push({test:'FAQ keyboard toggle can close the open answer',mode,lang,passed:await expanded().count()===0});
  const search=page.getByRole('searchbox');
  const visible=()=>page.locator('.cse-faq-item:not([hidden]) [data-hook="accordion-item-header"]');
  const cases=lang==='en'?[
   ['medcial','medical staff'],['homesik','homesick'],['pakcing','bring to camp'],['swiming','kids do'],['bullyng','Bullying'],['can my child be grouped with a freind','friend']
  ]:[
   ['medcal','médical'],['medical','médical'],['cout','coût'],['nataton','enfants au camp'],['electroniqe','électronique']
  ];
  for(const [query,expected] of cases){
   await search.fill(query);await search.press('Enter');
   const titles=await visible().allTextContents();
   results.push({test:'FAQ search ranks typo or accent match first',mode,lang,query,expected,titles,passed:titles.length>0&&titles[0].includes(expected)&&!(await page.locator('.cse-faq-empty').isVisible())});
   if(titles.length){await visible().first().click();results.push({test:'Search result opens its original answer',mode,lang,query,passed:await expanded().count()===1});}
  }
  await search.fill(lang==='en'?'medical':'médical');await search.press('Enter');
  await page.screenshot({path:'migration/screenshots/'+mode+'-'+lang+'-faq-search.png'});
  const bounds=await search.evaluate(node=>{const a=node.getBoundingClientRect(),p=node.parentElement.getBoundingClientRect();return {input:a.width,container:p.width,left:a.left,right:a.right,viewport:innerWidth};});
  results.push({test:'FAQ search fits the viewport',mode,lang,...bounds,passed:bounds.input>100&&bounds.input<=bounds.container&&bounds.left>=0&&bounds.right<=bounds.viewport});
  await search.fill('astronautspaceship');await search.press('Enter');
  const email=page.locator('.cse-faq-empty a');
  const emailUrl=new URL(await email.getAttribute('href'));
  results.push({test:'No close FAQ match offers the information email',mode,lang,passed:await visible().count()===0&&await email.isVisible()&&emailUrl.protocol==='mailto:'&&emailUrl.pathname==='info@catholicway.net'&&emailUrl.searchParams.get('body')==='astronautspaceship'});
  await page.screenshot({path:'migration/screenshots/'+mode+'-'+lang+'-faq-no-results.png'});
  await page.getByRole('button',{name:lang==='fr'?'Effacer':'Clear',exact:true}).click();
  const restoredIds=await buttons.evaluateAll(nodes=>nodes.map(n=>n.id));
  const links=await page.locator('[data-hook="accordion-item-content"] a[href]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('href')).sort());
  results.push({test:'Clear restores all original questions, sections and links',mode,lang,passed:await visible().count()===17&&JSON.stringify(restoredIds)===JSON.stringify(originalIds)&&JSON.stringify(links)===JSON.stringify(originalLinks)&&await expanded().count()===0&&!(await page.locator('.cse-faq-empty').isVisible())});
  await search.fill('medcial');await search.press('Escape');
  results.push({test:'Escape clears the search and restores all questions',mode,lang,passed:await search.inputValue()===''&&await visible().count()===17});
  results.push({test:'FAQ search has no JavaScript errors',mode,lang,errors,passed:errors.length===0});
  await context.close();
 }
 return results;
}
