import {readFile,writeFile,access,mkdir} from 'node:fs/promises';
const images=[
 {page:'home',id:'img_comp-lq2mfhza',source:'https://static.wixstatic.com/media/cfa17a_f15cf8f408f3478bb24de7cbf911d2eb~mv2.png',dest:'/assets/cse-dfp-original.png'},
 {page:'home',id:'img_comp-lq2mfhzn1',source:'https://static.wixstatic.com/media/cfa17a_dfb0f8e02fb54db096b8085ed7cec806~mv2.jpg',dest:'/assets/cse-camps-original.jpg'},
 {page:'mission-en',id:'img_comp-jk06ghni',source:'https://static.wixstatic.com/media/cfa17a_0c6d0132cc564da09bd40cbf41ad9100~mv2_d_2160_1440_s_2.jpg',dest:'/assets/cse-vision-original.jpg'},
 {page:'mission-en',id:'img_comp-jk06olmh',source:'https://static.wixstatic.com/media/cfa17a_be9893f0997c4a01822d040516c1ceb3.jpg',dest:'/assets/cse-mission-original.jpg'},
 {page:'mission-en',id:'img_comp-jk06spzn',source:'https://static.wixstatic.com/media/cfa17a_8e97f2b73bb6443d96541feaa3d61192.jpg',dest:'/assets/cse-spirituality-original.jpg'},
 {page:'history',id:'img_comp-jmb2cy4i',source:'https://static.wixstatic.com/media/cfa17a_d44ad92fcedb4401a18b71b1974c405a.jpg',dest:'/assets/cse-history-original.jpg'}
];
await mkdir('public/assets',{recursive:true});
for(const image of images){
 const file='public'+image.dest;
 try{await access(file);}catch{
  const response=await fetch(image.source,{signal:AbortSignal.timeout(30000)});
  if(!response.ok)throw new Error('Cannot load original image: '+response.status);
  await writeFile(file,Buffer.from(await response.arrayBuffer()));
 }
}
for(const mode of ['desktop','mobile'])for(const lang of ['en','fr'])for(const page of new Set(images.map(image=>image.page))){
 const file='public/capture/'+mode+'/'+lang+'/'+page+'.html';
 let html=await readFile(file,'utf8');
 for(const image of images.filter(image=>image.page===page)){
  const start=html.indexOf('<wow-image id="'+image.id+'"');
  if(start<0)throw new Error('Missing photo '+image.id+' in '+file);
  const end=html.indexOf('</wow-image>',start)+12;
  const block=html.slice(start,end);
  const fixed=block.replace(/(<img\b[^>]*\bsrc=")[^"]*(")/,'$1'+image.dest+'$2');
  if(fixed===block&&!block.includes('src="'+image.dest+'"'))throw new Error('Image source not updated');
  html=html.slice(0,start)+fixed+html.slice(end);
 }
 await writeFile(file,html);
}
const cssFile='public/replica.css';
let css=await readFile(cssFile,'utf8');
if(!css.includes('/* Responsive home column photos */')){
 css+='\n/* Responsive home column photos */\n#img_comp-lq2mfhza > img,#img_comp-lq2mfhzn1 > img{width:100%!important;height:100%!important;object-fit:cover}\n';
 await writeFile(cssFile,css);
}
await writeFile('migration/reports/responsive-images.json',JSON.stringify({images},null,2));
console.log('Restored original home, mission and history images in both languages and layouts.');
