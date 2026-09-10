/* Mobile presentation only. Captured content, destinations and media stay in place. */
(()=>{
 if(!document.body.classList.contains('device-mobile-optimized'))return;
 const body=document.body,main=document.getElementById('PAGES_CONTAINER');
 if(!main)return;
 const fr=new URLSearchParams(location.search).get('lang')==='fr';
 const t=(en,frText)=>fr?frText:en;
 const path=location.pathname.replace(/\/$/,'')||'/';
 const local=route=>route+(fr?'?lang=fr':'');
 const make=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text)e.textContent=text;return e;};
 const link=(text,href,cls)=>{const a=make('a',cls,text);a.href=href;return a;};

 // Read the captured visual ordering before replacing fixed grid coordinates.
 const meshes=[...document.querySelectorAll('#PAGES_CONTAINER [data-mesh-id$="gridContainer"],#SITE_FOOTER [data-mesh-id$="gridContainer"]')];
 for(const mesh of meshes){
  mesh.classList.add('cse-flow');
  const children=[...mesh.children];
  children.map((e,index)=>({e,index,row:parseInt(getComputedStyle(e).gridRowStart)||0}))
   .sort((a,b)=>a.row-b.row||a.index-b.index).forEach(({e},i)=>e.style.setProperty('--cse-order',i));
  if(children.some(e=>e.matches('.wixui-section,.wixui-column-strip')))mesh.classList.add('cse-section-stack');
  for(const e of children){
   if(e.matches('[data-mesh-id*="wedge"],.kDXsdp')||(!e.id&&!e.textContent.trim()&&!e.querySelector('img,iframe,form')))e.classList.add('cse-spacer');
   if(e.querySelector(':scope > a.wixui-button__link,:scope > a[data-testid="linkElement"]')&&!e.matches('.wixui-image'))e.classList.add('cse-action');
  }
 }
 for(const e of main.querySelectorAll('.wixui-image')){
  const rect=e.getBoundingClientRect();
  if(rect.width&&rect.height){e.style.setProperty('--cse-image-ratio',rect.width/rect.height);e.classList.add('cse-fluid-image');}
 }
 for(const e of main.querySelectorAll('.wixui-rich-text')){
  const text=e.textContent.replace(/[\s\u200b]/g,'');
  if(!text){e.classList.add('cse-spacer');continue;}
  const sizes=[...e.querySelectorAll('h1,h2,h3,h4,h5,h6,p,span')].map(n=>parseFloat(getComputedStyle(n).fontSize));
  if(text.length<180&&Math.max(...sizes)>=23)e.classList.add('cse-title');
  e.querySelectorAll('p').forEach(p=>{if(!p.textContent.replace(/[\s\u200b]/g,'')&&!p.querySelector('img'))p.classList.add('cse-empty-line');});
 }
 main.querySelectorAll('.wixui-column,.wixui-column-strip__column').forEach(e=>{
  e.parentElement.classList.add('cse-columns');
  if(!e.textContent.trim()&&e.querySelector('[data-hook="bgLayers"] img'))e.classList.add('cse-photo-column');
 });

 // A compact, bilingual header and a native modal replace the deeply nested menu.
 const originalHeader=document.getElementById('SITE_HEADER');
 const originalNav=document.getElementById('MENU_AS_CONTAINER_EXPANDABLE_MENU');
 const header=make('header','cse-phone-header');
 const brand=link('',local('/home'),'cse-phone-brand');
 const logo=originalHeader?.querySelector('img');
 if(logo){const image=logo.cloneNode();image.removeAttribute('id');image.alt='';brand.append(image);}
 const brandText=make('span','',t('Catholic School of','École catholique'));
 brandText.append(make('strong','',t('Evangelization','d’évangélisation')));brand.append(brandText);header.append(brand);
 const language=new URL(location.href);fr?language.searchParams.delete('lang'):language.searchParams.set('lang','fr');
 const languageLink=link(fr?'EN':'FR',language.pathname+language.search+language.hash,'cse-language-link');
 languageLink.lang=fr?'en':'fr';languageLink.setAttribute('aria-label',fr?'Switch to English':'Passer en français');header.append(languageLink);
 const menuButton=make('button','cse-menu-button');menuButton.type='button';
 menuButton.innerHTML='<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M3 6h18M3 12h18M3 18h18"/></svg>';
 menuButton.setAttribute('aria-label',t('Open menu','Ouvrir le menu'));menuButton.setAttribute('aria-expanded','false');menuButton.setAttribute('aria-controls','cse-phone-menu');header.append(menuButton);
 const dialog=make('dialog','cse-phone-menu');dialog.id='cse-phone-menu';dialog.setAttribute('aria-labelledby','cse-menu-title');
 const menuTop=make('div','cse-menu-top');const title=make('h2','',t('Explore CSE','Découvrir l’ÉCÉ'));title.id='cse-menu-title';
 const close=make('button','cse-menu-close',t('Close ×','Fermer ×'));close.type='button';menuTop.append(title,close);dialog.append(menuTop);
 const nav=make('nav');nav.setAttribute('aria-label',t('Main navigation','Navigation principale'));
 const shortcuts=make('div','cse-menu-shortcuts');
 shortcuts.append(link(t('Home','Accueil'),local('/home')),link(t('Camps','Camps'),local('/camps')),link(t('Camp sign up','Inscription aux camps'),local('/camp-registration'),'cse-primary'),link(t('Contact us','Nous joindre'),local('/contact-us')));nav.append(shortcuts);
 // Flatten one redundant level, but keep every original navigation destination.
 const groups=[...originalNav?.querySelectorAll(':scope > ul > li')||[]];
 const addGroup=(li,parent=nav)=>{
  const row=li.querySelector(':scope > [data-testid="itemWrapper"]');
  const list=li.querySelector(':scope > ul');
  const label=row?.querySelector('[data-testid="linkElement"]');
  if(!label)return;
  if(list){
   const details=make('details','cse-menu-group');details.append(make('summary','',label.textContent.trim()));
   const items=make('div');for(const child of list.children)addGroup(child,items);details.append(items);parent.append(details);
  }else if(label.matches('a')){
   const a=link(label.textContent.trim(),label.getAttribute('href'));
   if(label.target)a.target=label.target;if(label.rel)a.rel=label.rel;parent.append(a);
  }
 };
 for(const li of groups){
  const label=li.querySelector('[data-testid="linkElement"]')?.textContent.trim();
  if(/^(MINISTRIES|MINISTÈRES)$/i.test(label||''))for(const child of li.querySelector(':scope > ul')?.children||[])addGroup(child);
  else if(!li.querySelector('#cse-camp-signup'))addGroup(li);
 }
 if(!nav.querySelector('a[href^="/donate"]'))nav.append(link(t('Donate','Faire un don'),local('/donate'),'cse-menu-donate'));
 dialog.append(nav);body.prepend(header);body.append(dialog);
 let opener;
 const openMenu=e=>{opener=e.currentTarget;dialog.showModal();body.classList.add('cse-menu-open');menuButton.setAttribute('aria-expanded','true');close.focus();};
 menuButton.addEventListener('click',openMenu);
 close.addEventListener('click',()=>dialog.close());
 dialog.addEventListener('close',()=>{body.classList.remove('cse-menu-open');menuButton.setAttribute('aria-expanded','false');opener?.focus();});
 dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close();});
 dialog.querySelectorAll('a').forEach(a=>{if(new URL(a.href).pathname===path)a.setAttribute('aria-current','page');});

 const dock=make('nav','cse-phone-dock');dock.setAttribute('aria-label',t('Quick navigation','Navigation rapide'));
 const icons={home:'M3 10 12 3l9 7v11h-6v-7H9v7H3z',camps:'m2 21 10-18 10 18H2zm6 0 4-7 4 7M12 3v5',contact:'M3 5h18v14H3zM3 5l9 7 9-7',menu:'M3 6h18M3 12h18M3 18h18'};
 for(const [key,label,route] of [['home',t('Home','Accueil'),'/home'],['camps','Camps','/camps'],['contact','Contact','/contact-us'],['menu','Menu',null]]){
  const e=route?link('',local(route)):make('button');if(!route){e.type='button';e.addEventListener('click',openMenu);e.setAttribute('aria-controls',dialog.id);}
  e.innerHTML='<svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" aria-hidden="true"><path d="'+icons[key]+'"/></svg>';
  e.append(make('span','',label));if(route===path||(key==='camps'&&path.startsWith('/camp')))e.setAttribute('aria-current','page');dock.append(e);
 }
 body.append(dock);

 // Bring the most useful existing destinations within reach on the home page.
 if(path==='/home'){
  const quick=make('nav','cse-home-links');quick.setAttribute('aria-label',t('Explore our ministries','Découvrir nos ministères'));
  quick.append(link(t('Explore camps','Découvrir les camps'),local('/camps'),'cse-primary'),link(t('Formation program','Programme de formation'),local('/dfp')));
  document.getElementById('comp-ll18nuq2')?.after(quick);
 }
 // Jump links make the long camp page useful without repeatedly scrolling.
 if(path==='/camps'){
  const jumps=make('nav','cse-jump-links');jumps.setAttribute('aria-label',t('On this page','Sur cette page'));
  for(const [id,label] of [['comp-mjdel0jg4',t('Dates','Dates')],['comp-mjdel0jw4',t('Fees','Tarifs')],['comp-mjdel0kc3',t('Activities','Activités')]])if(document.getElementById(id))jumps.append(link(label,'#'+id));
  jumps.append(link('FAQ',local('/camp-faq')));document.getElementById('comp-mjdel0fo')?.after(jumps);
  const gallery=document.getElementById('comp-mjdel0kf1');
  const pictures=[...gallery?.querySelectorAll('[data-hook="item-container"]')||[]];
  if(pictures.length){
   const track=make('div','cse-activity-track');track.id='cse-camp-activities';track.tabIndex=0;track.setAttribute('role','region');track.setAttribute('aria-label',t('Camp activity photos','Photos des activités du camp'));
   for(const item of pictures){
    const picture=item.querySelector('picture'),title=item.querySelector('[data-hook="item-title"]');
    if(!picture)continue;const figure=make('figure','cse-activity');figure.append(picture);
    if(title)figure.append(make('figcaption','',title.textContent.trim()));track.append(figure);
   }
   const controls=make('div','cse-gallery-controls');controls.append(make('span','',t('Explore the activities','Découvrir les activités')));
   for(const [direction,label] of [[-1,t('Previous photo','Photo précédente')],[1,t('Next photo','Photo suivante')]]){
    const button=make('button','',direction===1?'→':'←');button.type='button';button.setAttribute('aria-label',label);button.setAttribute('aria-controls',track.id);
    button.addEventListener('click',()=>track.scrollBy({left:direction*(track.firstElementChild.getBoundingClientRect().width+14),behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'}));controls.append(button);
   }
   gallery.replaceChildren(track,controls);gallery.classList.add('cse-activity-gallery');
  }
  const posters=['comp-mq9lyvac','comp-mq9mc2ol'].map(id=>document.getElementById(id)).filter(Boolean);
  if(posters.length){
   const fold=make('details','cse-social-fold cse-camp-posters');fold.style.setProperty('--cse-order','3');fold.append(make('summary','',t('View camp posters','Voir les affiches des camps')));
   posters[0].before(fold);for(const poster of posters)fold.append(poster);
  }
 }
 if(path==='/camp-faq'){
  const headings=[...main.querySelectorAll('h2[data-hook="title"]')];
  if(headings[0])headings[0].textContent=t('Frequently asked questions','Questions fréquentes');
  if(headings[1])headings[1].textContent=t('Rules and guidelines','Règles et directives');
 }
 if(path==='/'){
  for(const [id,text] of [['comp-jv421zla','Choose your language to explore our site.'],['comp-iuybr827','Choisissez votre langue pour découvrir notre site.']]){
   const e=document.getElementById(id)?.querySelector('p');if(e)e.textContent=text;
  }
  for(const [id,text,href] of [['comp-lq1nv4wp','Continue in English','/home'],['comp-lq1notgi','Continuer en français','/home?lang=fr']]){
   const a=document.getElementById(id)?.querySelector('a');if(a){a.href=href;const label=a.querySelector('[class*="label"]');if(label)label.textContent=text;}
  }
 }
 // Turn existing schedule paragraphs into scannable groups, preserving their text.
 for(const id of ['comp-mjdel0jq1','comp-mq9j80i7']){
  const container=document.getElementById(id);if(!container)continue;
  let card;
  for(const paragraph of [...container.children]){
   const text=paragraph.textContent.replace(/[\s\u200b]/g,'');
   if(!text){card=null;paragraph.remove();continue;}
   if(!card){card=make('div','cse-date-card');container.insertBefore(card,paragraph);}card.append(paragraph);
  }
  container.classList.add('cse-date-list');
 }
 // Embedded social services can be blocked on phones. Keep their links available
 // without reserving a screenful of empty space before a visitor opens the feed.
 const news=document.getElementById('comp-ieop50h5');
 if(news){
  const fold=make('details','cse-social-fold');const summary=make('summary','',t('News from our community','Nouvelles de notre communauté'));
  fold.style.setProperty('--cse-order',news.style.getPropertyValue('--cse-order'));news.before(fold);
  const socialUrl=news.querySelector('.fb-page')?.getAttribute('data-href')||document.querySelector('#SITE_FOOTER a[aria-label="CSE Facebook"]')?.href;
  fold.append(summary,news);if(socialUrl)fold.append(link(t('Visit us on Facebook','Nous suivre sur Facebook'),socialUrl));
 }
 for(const id of ['comp-ky3fk18j','comp-ky4nivum']){
  const embed=document.getElementById(id);if(!embed)continue;
  const fold=make('details','cse-social-fold cse-newsletter');fold.style.setProperty('--cse-order',embed.style.getPropertyValue('--cse-order'));
  fold.append(make('summary','',t('Join our mailing list','S’abonner à notre infolettre')));embed.before(fold);fold.append(embed);
 }
 if(path==='/contact-us'){
  const content=document.getElementById('comp-ll18nupb');const newsletter=document.getElementById('comp-ll18nupa');
  content?.style.setProperty('--cse-order','0');newsletter?.style.setProperty('--cse-order','1');
  const actions=make('div','cse-contact-actions');actions.style.setProperty('--cse-order','0');
  actions.append(link(t('Call 204-347-5396','Appeler le 204-347-5396'),'tel:+12043475396'),link(t('Email us','Nous écrire'),'mailto:info@catholicway.net'));
  document.getElementById('comp-ifihjwb1')?.after(actions);
 }
 const footer=document.getElementById('SITE_FOOTER');
 if(footer){
  const contact=make('div','cse-footer-actions');contact.append(link(t('Call us','Nous appeler'),'tel:+12043475396'),link(t('Email us','Nous écrire'),'mailto:info@catholicway.net'));footer.prepend(contact);
 }
 body.dataset.csePage=path.slice(1)||'welcome';body.classList.add('cse-mobile-ready');
})();
