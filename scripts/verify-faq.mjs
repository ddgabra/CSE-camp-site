import {devices} from 'playwright';
export async function verifyFaq(browser){
 const results=[];
 for(const mode of ['desktop','mobile'])for(const lang of ['en','fr']){
  const context=await browser.newContext(mode==='mobile'?{...devices['iPhone 13']}:{viewport:{width:1440,height:1000}});
  const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:4173/camp-faq?lang='+lang,{waitUntil:'load'});
  const buttons=page.locator('[data-hook="accordion-item-header"]');
  const expanded=()=>page.locator('[data-hook="accordion-item-header"][aria-expanded="true"]');
  await buttons.nth(0).click();await buttons.nth(1).click();
  results.push({test:'Opening another FAQ closes the previous answer',mode,lang,passed:await expanded().count()===1&&await buttons.nth(1).getAttribute('aria-expanded')==='true'&&await buttons.nth(0).getAttribute('aria-expanded')==='false'});
  await buttons.nth(10).click();
  results.push({test:'Only one answer opens across FAQ and rules sections',mode,lang,passed:await expanded().count()===1&&await buttons.nth(10).getAttribute('aria-expanded')==='true'});
  await buttons.nth(10).press('Enter');
  results.push({test:'FAQ keyboard toggle can close the open answer',mode,lang,passed:await expanded().count()===0});
  results.push({test:'FAQ has no JavaScript errors',mode,lang,errors,passed:errors.length===0});
  await context.close();
 }
 return results;
}
