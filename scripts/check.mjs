import {access,readFile} from 'node:fs/promises';
const report=JSON.parse(await readFile('migration/reports/capture.json','utf8'));
if(report.failures.some(x=>x.kind==='page'))throw new Error('Source pages failed to capture');
for(const mode of ['desktop','mobile'])for(const lang of ['en','fr'])await access('public/capture/'+mode+'/'+lang+'/index.html');
console.log('Validated '+report.pageCount+' captured pages and '+report.assetCount+' assets.');
