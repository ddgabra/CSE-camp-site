import {readFile,writeFile,access,mkdir,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const images=[
 {page:'home',id:'img_comp-lq2mfhza',source:'https://static.wixstatic.com/media/cfa17a_f15cf8f408f3478bb24de7cbf911d2eb~mv2.png',dest:'/assets/cse-dfp-original.png'},
 {page:'home',id:'img_comp-lq2mfhzn1',source:'https://static.wixstatic.com/media/cfa17a_dfb0f8e02fb54db096b8085ed7cec806~mv2.jpg',dest:'/assets/cse-camps-original.jpg'},
 {page:'mission-en',id:'img_comp-jk06ghni',source:'https://static.wixstatic.com/media/cfa17a_0c6d0132cc564da09bd40cbf41ad9100~mv2_d_2160_1440_s_2.jpg',dest:'/assets/cse-vision-original.jpg'},
 {page:'mission-en',id:'img_comp-jk06olmh',source:'https://static.wixstatic.com/media/cfa17a_be9893f0997c4a01822d040516c1ceb3.jpg',dest:'/assets/cse-mission-original.jpg'},
 {page:'mission-en',id:'img_comp-jk06spzn',source:'https://static.wixstatic.com/media/cfa17a_8e97f2b73bb6443d96541feaa3d61192.jpg',dest:'/assets/cse-spirituality-original.jpg'},
 {page:'contact-us',id:'img_comp-ll18nupa',source:'https://static.wixstatic.com/media/cfa17a_f9ae9958388c4e5488b2292fc93585fc~mv2.jpg',dest:'/assets/cse-contact-original.jpg'},
 {page:'history',id:'img_comp-jmb2cy4i',source:'https://static.wixstatic.com/media/cfa17a_d44ad92fcedb4401a18b71b1974c405a.jpg',dest:'/assets/cse-history-original.jpg'}
];
const mapEmbed="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2601.026374699348!2d-96.95402012371082!3d49.31378417139751!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x52c1a52b256f227f%3A0x33080f03886dd49!2sCatholic%20School%20Of%20Evangelization!5e0!3m2!1sen!2sus!4v1788907710593!5m2!1sen!2sus";

await mkdir('public/assets',{recursive:true});
images.push(...[{"id":"cse-facility-photo-0","source":"https://static.wixstatic.com/media/cfa17a_fea96519443f4b968f994e3b299566e5.jpg","dest":"/assets/cse-facility-1.jpg"},{"id":"cse-facility-photo-1","source":"https://static.wixstatic.com/media/cfa17a_741976bea04c434f974ca121a4ff9c54.jpg","dest":"/assets/cse-facility-2.jpg"},{"id":"cse-facility-photo-2","source":"https://static.wixstatic.com/media/cfa17a_d4d97cf6dc5b42939df28c30c3fbb4b2.jpg","dest":"/assets/cse-facility-3.jpg"},{"id":"cse-facility-photo-3","source":"https://static.wixstatic.com/media/cfa17a_eb780272faab4a8193b5cab76bb052be.jpg","dest":"/assets/cse-facility-4.jpg"},{"id":"cse-facility-photo-4","source":"https://static.wixstatic.com/media/cfa17a_97ad665f5aa749b8bc97bbab9d8fd7a8.jpg","dest":"/assets/cse-facility-5.jpg"},{"id":"cse-facility-photo-5","source":"https://static.wixstatic.com/media/cfa17a_9c7e2a368e564b13b39788774005003a.jpg","dest":"/assets/cse-facility-6.jpg"},{"id":"cse-facility-photo-6","source":"https://static.wixstatic.com/media/cfa17a_43edab52b627461b90ea5baa92e104eb.jpg","dest":"/assets/cse-facility-7.jpg"},{"id":"cse-facility-photo-7","source":"https://static.wixstatic.com/media/cfa17a_936088b670614dba983d0594ee834dae.jpg","dest":"/assets/cse-facility-8.jpg"},{"id":"cse-facility-photo-8","source":"https://static.wixstatic.com/media/cfa17a_b69a9aaad3834bb9910932cfbd16b829.jpg","dest":"/assets/cse-facility-9.jpg"},{"id":"cse-facility-photo-9","source":"https://static.wixstatic.com/media/cfa17a_ed00c27527094dd7971fd317b3234694.jpg","dest":"/assets/cse-facility-10.jpg"}]);
const bySource=new Map(images.map(image=>[image.source,image]));
const capturedAssets=JSON.parse(await readFile('migration/reports/assets.json','utf8'));
const capturedSources=new Map(Object.entries(capturedAssets).map(([url,asset])=>[asset.dest,url]));
const files=[];
async function list(directory){
 for(const item of await readdir(directory,{withFileTypes:true})){
  const file=directory+'/'+item.name;
  if(item.isDirectory())await list(file);else if(file.endsWith('.html'))files.push(file);
 }
}
await list('public/capture');
const updates=[];
const decode=value=>value.replaceAll('&quot;','"').replaceAll('&#39;',"'").replaceAll('&amp;','&');
for(const file of files){
 let html=await readFile(file,'utf8');
 const before=html;
 // Use full source photographs, so responsive cover crops happen only once.
 html=html.replace(/<wow-image\b[\s\S]*?<\/wow-image>/g,block=>{
  const id=block.match(/\bid="([^"]+)"/)?.[1];
  const selected=id&&images.find(image=>image.id===id);
  let image=selected;
  if(!image&&/\bclass="[^"]*\b(?:bgImage|bgVideoposter)\b/.test(block)){
   const encoded=block.match(/\bdata-image-info="([^"]+)"/)?.[1];
   let info;try{info=JSON.parse(decode(encoded||'{}'));}catch{return block;}
   const uri=info.imageData?.uri;
   if(!uri||!/\.(?:jpe?g|png|webp|gif)$/i.test(uri)||/[\/?#]/.test(uri))return block;
   const current=block.match(/<img\b[^>]*\bsrc="([^"]+)"/)?.[1];
   const captured=capturedSources.get(current);
   const source=captured&&/^https:\/\/(static\.wixstatic\.com\/media|video\.wixstatic\.com\/video)\//.test(captured)?captured.split('/v1/')[0]:'https://static.wixstatic.com/media/'+uri;
   image=bySource.get(source);
   if(!image){
    const extension=uri.match(/\.[^.]+$/)[0].toLowerCase();
    image={source,dest:'/assets/cse-bg-original-'+createHash('sha256').update(uri).digest('hex').slice(0,16)+extension};
    bySource.set(source,image);
   }
  }
  if(!image)return block;
  return block.replace(/(<img\b[^>]*\bsrc=")[^"]*(")/,'$1'+image.dest+'$2').replace(/\s+srcset="[^"]*"/g,'');
 });
 if(file.endsWith('/contact-us.html')||file.endsWith('/facility-rental.html')){
  const french=file.includes('/fr/');
  const url=french?mapEmbed.replaceAll('!1sen','!1sfr'):mapEmbed;
  const frame='<iframe id="cse-contact-map" title="Google Maps - Catholic School of Evangelization" src="'+url+'" width="100%" height="100%" style="border:0;display:block" allowfullscreen loading="lazy" referrerpolicy="strict-origin-when-cross-origin"></iframe>';
  if(!/<iframe[^>]+(?:title="Google Maps"|id="cse-contact-map")/.test(html))throw new Error('Missing contact map in '+file);
  html=html.replace(/<iframe[^>]+(?:title="Google Maps"|id="cse-contact-map")[\s\S]*?<\/iframe>/,frame);
 }
 if(file.endsWith('/facility-rental.html')){
  const url='/capture/shared/facility-gallery.html'+(file.includes('/fr/')?'?lang=fr':'');
  if(!/<iframe[^>]+src="[^"]*(?:Thumbnails.html|facility-gallery.html)/.test(html))throw new Error('Missing facility gallery in '+file);
  html=html.replace(/(<iframe[^>]*src=")[^"]*(?:Thumbnails.html|facility-gallery.html)[^"]*(")/,'$1'+url+'$2');
  html=html.replace(/<iframe\b[^>]*src="[^"]*facility-gallery.html[^"]*"[^>]*>/,tag=>tag.replace(/\s+title="[^"]*"/g,'').replace('<iframe','<iframe title="'+(file.includes('/fr/')?'Photos des installations':'Facility photos')+'"'));
 }
 if(html!==before)updates.push({file,html});
}
const downloads=[...bySource.values()];
async function download(image){
 const file='public'+image.dest;
 try{await access(file);return;}catch{}
 const response=await fetch(image.source,{signal:AbortSignal.timeout(30000)});
 if(!response.ok)throw new Error('Cannot load original image: '+response.status+' '+image.source);
 await writeFile(file,Buffer.from(await response.arrayBuffer()));
}
for(let i=0;i<downloads.length;i+=4)await Promise.all(downloads.slice(i,i+4).map(download));
for(const {file,html} of updates)await writeFile(file,html);
await writeFile('migration/reports/responsive-images.json',JSON.stringify({images:downloads,updatedPages:updates.map(update=>update.file)},null,2));
console.log('Restored '+downloads.length+' original images; updated '+updates.length+' captures and the interactive contact map.');
