import {readFile,writeFile,access,mkdir} from 'node:fs/promises';
const images=[
 {id:'img_comp-lq2mfhza',source:'https://static.wixstatic.com/media/cfa17a_f15cf8f408f3478bb24de7cbf911d2eb~mv2.png',dest:'/assets/cse-dfp-original.png'},
 {id:'img_comp-lq2mfhzn1',source:'https://static.wixstatic.com/media/cfa17a_dfb0f8e02fb54db096b8085ed7cec806~mv2.jpg',dest:'/assets/cse-camps-original.jpg'}
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
for(const mode of ['desktop','mobile'])for(const lang of ['en','fr']){
 const file='public/capture/'+mode+'/'+lang+'/home.html';
 let html=await readFile(file,'utf8');
 for(const image of images){
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
console.log('Restored uncropped source images for both home-page columns in all languages and layouts.');
