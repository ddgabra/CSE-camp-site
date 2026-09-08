(()=>{

 // Replay Wix entrance effects using their captured keyframes, timing and direction.
 // Captures can contain both completed effects and off-screen paused effects.
 const entranceElements=new Set();
 const findEntrances=rules=>{
  for(const rule of rules){
   if(rule.selectorText?.includes('data-motion-enter')){
    for(const match of rule.selectorText.matchAll(/#([\w-]+):not\(\[data-motion-enter=["']done["']\]\)/g)){
     const element=document.getElementById(match[1]);if(element)entranceElements.add(element);
    }
   }
   if(rule.cssRules)findEntrances(rule.cssRules);
  }
 };
 for(const sheet of document.styleSheets){try{findEntrances(sheet.cssRules);}catch{/* External styles cannot be inspected. */}}
 const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
 const entranceTimers=new Map();
 let entranceObserver;
 const finishEntrance=element=>{
  clearTimeout(entranceTimers.get(element));entranceTimers.delete(element);
  element.setAttribute('data-motion-enter','done');
  element.style.removeProperty('animation-play-state');
  entranceObserver?.unobserve(element);
 };
 if(reducedMotion.matches||!('IntersectionObserver' in window)){
  entranceElements.forEach(finishEntrance);
 }else{
  entranceObserver=new IntersectionObserver(entries=>{
   for(const entry of entries){
    if(!entry.isIntersecting)continue;
    const element=entry.target;
    entranceObserver.unobserve(element);
    element.setAttribute('data-motion-enter','running');
    element.style.animationPlayState='running';
    const style=getComputedStyle(element);
    const milliseconds=value=>parseFloat(value)*(value.trim().endsWith('ms')?1:1000);
    const duration=Math.max(...style.animationDuration.split(',').map(milliseconds));
    const delay=Math.max(0,...style.animationDelay.split(',').map(milliseconds));
    const onEnd=event=>{
     if(event.target===element&&event.animationName.startsWith('motion-')){
      element.removeEventListener('animationend',onEnd);finishEntrance(element);
     }
    };
    element.addEventListener('animationend',onEnd);
    // Keep content available if an animation is interrupted or its end event is lost.
    entranceTimers.set(element,setTimeout(()=>{element.removeEventListener('animationend',onEnd);finishEntrance(element);},duration+delay+250));
   }
  },{threshold:0,rootMargin:'0px 0px -24px 0px'});
  entranceElements.forEach(element=>{
   element.removeAttribute('data-motion-enter');
   element.style.removeProperty('animation-play-state');
  });
  entranceElements.forEach(element=>{
   if(getComputedStyle(element).animationName.split(',').some(name=>name.trim().startsWith('motion-'))){
    element.setAttribute('data-motion-enter','pending');entranceObserver.observe(element);
   }else finishEntrance(element);
  });
  reducedMotion.addEventListener('change',event=>{
   if(event.matches){entranceObserver.disconnect();entranceElements.forEach(finishEntrance);}
  });
 }
 const lang=new URLSearchParams(location.search).get('lang')==='fr'?'fr':'en';
 const closeMenus=()=>document.querySelectorAll('[data-cse-open]').forEach(e=>{e.removeAttribute('data-cse-open');e.removeAttribute('data-hovered');e.removeAttribute('data-shown');delete e.dataset.cseClicked;e.querySelector('[aria-expanded]')?.setAttribute('aria-expanded','false');});
 document.querySelectorAll('[data-testid="menuItemDepth0"]').forEach(item=>{
  const trigger=item.querySelector('[aria-haspopup]');
  if(!trigger)return;
  const open=()=>{closeMenus();item.setAttribute('data-cse-open','');item.setAttribute('data-hovered','true');item.setAttribute('data-shown','true');trigger.setAttribute('aria-expanded','true');const panel=item.querySelector('[data-testid="positionBox"]');if(panel){const nav=item.closest('nav');const r=nav.getBoundingClientRect();panel.style.left=(-r.left)+'px';panel.style.right='auto';panel.style.width=Math.max(document.documentElement.clientWidth,document.body.clientWidth)+'px';panel.style.top=r.height+'px';}};
  item.addEventListener('mouseenter',open);
  item.addEventListener('mouseleave',closeMenus);
  for(const t of [trigger,item.querySelector('button[aria-label^="Toggle"]')].filter(Boolean)){
   t.addEventListener('click',e=>{e.stopPropagation();if(item.dataset.cseClicked==='true'){closeMenus();}else{open();item.dataset.cseClicked='true';}});
   t.addEventListener('keydown',e=>{if(['Enter',' '].includes(e.key)){e.preventDefault();open();}if(e.key==='Escape')closeMenus();});
  }
 });
 document.querySelectorAll('[data-testid="languages-dropdown-handle"]').forEach(button=>{
  button.addEventListener('click',()=>{
   const existing=document.getElementById('cse-language-options');
   if(existing){existing.remove();button.setAttribute('aria-expanded','false');return;}
   const menu=document.createElement('div');menu.id='cse-language-options';menu.setAttribute('role','menu');
   for(const code of ['en','fr']){
    const a=document.createElement('a');const u=new URL(location.href);code==='fr'?u.searchParams.set('lang','fr'):u.searchParams.delete('lang');
    a.href=u.pathname+u.search;a.textContent=code.toUpperCase();a.setAttribute('role','menuitem');menu.append(a);
   }
   const r=button.getBoundingClientRect();menu.style.cssText='position:fixed;z-index:2147483647;top:'+r.bottom+'px;right:'+Math.max(8,innerWidth-r.right)+'px';
   document.body.append(menu);button.setAttribute('aria-expanded','true');
  });
 });
 document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeMenus();document.getElementById('cse-language-options')?.remove();}});
 document.addEventListener('click',e=>{if(!e.target.closest('[data-testid="menuItemDepth0"]'))closeMenus();});
 document.querySelectorAll('[aria-controls]').forEach(button=>{
  if(button.matches('[data-testid="languages-dropdown-handle"], [data-hook="accordion-item-header"]'))return;
  const panel=document.getElementById(button.getAttribute('aria-controls'));if(!panel)return;
  button.addEventListener('click',()=>{const open=button.getAttribute('aria-expanded')!=='true';button.setAttribute('aria-expanded',String(open));panel.hidden=!open;panel.style.display=open?'block':'none';panel.setAttribute('aria-hidden',String(!open));});
 });

 // Keep one answer open across both FAQ sections.
 const faqButtons=[...document.querySelectorAll('[data-hook="accordion-item-header"]')];
 const setFaqExpanded=(button,open)=>{
  const panel=document.getElementById(button.getAttribute('aria-controls'));if(!panel)return;
  button.setAttribute('aria-expanded',String(open));
  panel.hidden=!open;panel.style.display=open?'block':'none';panel.setAttribute('aria-hidden',String(!open));
  const inner=panel.parentElement,outer=inner.parentElement;
  inner.style.display=open?'block':'none';inner.style.opacity=open?'1':'0';
  outer.style.height=open?'auto':'0px';outer.style.overflow=open?'visible':'hidden';
  const arrow=button.querySelector('svg');if(arrow)arrow.style.transform=open?'rotate(180deg)':'';
 };
 faqButtons.forEach(button=>{
  setFaqExpanded(button,false);
  button.addEventListener('click',()=>{
   const open=button.getAttribute('aria-expanded')!=='true';
   faqButtons.forEach(other=>{if(other!==button)setFaqExpanded(other,false);});
   setFaqExpanded(button,open);
  });
 });
 if(location.pathname.replace(/\/$/,'')==='/camp-faq'&&faqButtons.length){
  const normalize=text=>text.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
  const words=text=>normalize(text).split(/\s+/).filter(Boolean);
  const stopWords=new Set(words('a an the and or to of for in on at with is are be do does did can could would should will i me my we our you your it its if what which where how when about have has please question questions kid kids child children camp camps le la les un une des de du au aux et ou pour dans sur avec est sont etre je mon ma mes nous notre vous votre il elle ils si que qui quoi quel quelle quelles quels comment quand avez peut faire enfant enfants'));
  const distance=(a,b)=>{
   const rows=Array.from({length:a.length+1},()=>Array(b.length+1).fill(0));
   for(let i=0;i<=a.length;i++)rows[i][0]=i;
   for(let j=0;j<=b.length;j++)rows[0][j]=j;
   for(let i=1;i<=a.length;i++)for(let j=1;j<=b.length;j++){
    rows[i][j]=Math.min(rows[i-1][j]+1,rows[i][j-1]+1,rows[i-1][j-1]+(a[i-1]===b[j-1]?0:1));
    if(i>1&&j>1&&a[i-1]===b[j-2]&&a[i-2]===b[j-1])rows[i][j]=Math.min(rows[i][j],rows[i-2][j-2]+1);
   }
   return rows[a.length][b.length];
  };
  const wordScore=(query,word)=>{
   if(query===word)return 1;
   if(query.length>=3&&word.startsWith(query))return 0.9;
   const tolerance=query.length>=6?2:query.length>=4?1:0;
   if(!tolerance||Math.abs(query.length-word.length)>tolerance)return 0;
   const edits=distance(query,word);
   return edits<=tolerance?1-edits/Math.max(query.length,word.length):0;
  };
  const entries=faqButtons.map((button,index)=>{
   const panel=document.getElementById(button.getAttribute('aria-controls'));
   const row=button.parentElement;
   row.classList.add('cse-faq-item');
   return {button,row,parent:row.parentElement,index,title:words(button.textContent),answer:words(panel.textContent)};
  });
  const roots=[...document.querySelectorAll('[data-hook="faq-root"]')];
  const firstRoot=roots[0],firstList=entries[0].parent;
  const otherSections=roots.slice(1).map(root=>root.closest('section')||root);
  otherSections.forEach(section=>section.setAttribute('data-cse-faq-section',''));
  const ui=document.createElement('div');ui.className='cse-faq-search';ui.setAttribute('role','search');
  const label=document.createElement('label');label.htmlFor='cse-faq-query';label.textContent=lang==='fr'?'Rechercher dans la FAQ':'Search the FAQ';
  const controls=document.createElement('div');controls.className='cse-faq-search-controls';
  const input=document.createElement('input');input.id='cse-faq-query';input.type='search';input.maxLength=240;input.autocomplete='off';
  input.placeholder=lang==='fr'?'Posez une question ou saisissez un mot-clé…':'Ask a question or enter a keyword…';
  input.setAttribute('aria-describedby','cse-faq-search-status');
  const clear=document.createElement('button');clear.type='button';clear.textContent=lang==='fr'?'Effacer':'Clear';clear.hidden=true;
  const status=document.createElement('p');status.id='cse-faq-search-status';status.setAttribute('role','status');status.setAttribute('aria-live','polite');status.setAttribute('aria-atomic','true');
  const empty=document.createElement('div');empty.className='cse-faq-empty';empty.hidden=true;
  const message=document.createElement('p');message.textContent=lang==='fr'?'Aucune réponse proche de votre question. Notre équipe peut vous aider.':'No close match for your question. Our team can help.';
  const email=document.createElement('a');email.textContent=lang==='fr'?'Écrire à info@catholicway.net':'Email info@catholicway.net';email.href='mailto:info@catholicway.net';
  empty.append(message,email);controls.append(input,clear);ui.append(label,controls,status,empty);
  const searchHeader=firstRoot.querySelector('h2').parentElement;
  searchHeader.classList.add('cse-faq-header');searchHeader.append(ui);
  const restore=()=>{
   entries.forEach(entry=>{entry.parent.append(entry.row);entry.row.hidden=false;});
   otherSections.forEach(section=>{section.hidden=false;});
   empty.hidden=true;
  };
  const search=()=>{
   faqButtons.forEach(button=>setFaqExpanded(button,false));
   const query=input.value.trim().slice(0,240);
   clear.hidden=!query;
   const tokens=[...new Set(words(query).filter(word=>word.length>=2&&!stopWords.has(word)))].slice(0,16);
   if(!query||!tokens.length){
    restore();status.textContent=query?(lang==='fr'?'Saisissez un mot-clé, par exemple « médical » ou « bagages ».':'Enter a keyword, such as “medical” or “packing”.'):'';
    return;
   }
   const scored=entries.map(entry=>{
    const scores=tokens.map(token=>Math.max(0,...entry.title.map(word=>wordScore(token,word)),...entry.answer.map(word=>wordScore(token,word)*0.8)));
    const matched=scores.filter(score=>score>=0.5).length;
    const required=tokens.length<=2?tokens.length:Math.ceil(tokens.length*0.7);
    return {entry,score:matched>=required?scores.reduce((sum,score)=>sum+score,0)/tokens.length:0};
   }).filter(result=>result.score>=0.5).sort((a,b)=>b.score-a.score||a.entry.index-b.entry.index);
   entries.forEach(entry=>{entry.row.hidden=true;});
   otherSections.forEach(section=>{section.hidden=true;});
   for(const {entry} of scored){firstList.append(entry.row);entry.row.hidden=false;}
   empty.hidden=scored.length>0;
   status.textContent=scored.length?(lang==='fr'?scored.length+' résultat'+(scored.length>1?'s':'')+' — les plus proches en premier.':scored.length+' result'+(scored.length>1?'s':'')+' — closest matches first.'):(lang==='fr'?'Aucun résultat proche.':'No close results.');
   email.href='mailto:info@catholicway.net?subject='+encodeURIComponent(lang==='fr'?'Question sur les camps':'Camp question')+'&body='+encodeURIComponent(query);
  };
  let searchTimer;
  input.addEventListener('input',()=>{clearTimeout(searchTimer);searchTimer=setTimeout(search,120);});
  input.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();clearTimeout(searchTimer);search();}if(event.key==='Escape'){clearTimeout(searchTimer);input.value='';search();}});
  clear.addEventListener('click',()=>{clearTimeout(searchTimer);input.value='';search();input.focus();});
 }

 // Keep the original Wix submission service until a replacement backend is configured.
 // Never claim a form succeeded without submitting it.
 document.querySelectorAll('form').forEach(form=>{
  form.addEventListener('submit',e=>{e.preventDefault();location.href='https://www.catholicway.net'+location.pathname+location.search;});
  const note=document.createElement('p');note.className='cse-form-note';note.textContent=lang==='fr'?'Ce formulaire s’ouvre sur notre site actuel pour être envoyé en toute sécurité.':'This form opens on our current website for secure submission.';form.append(note);
 });
 // Reuse the original mobile menu layout and nested navigation.
 const mobileButton=document.getElementById('MENU_AS_CONTAINER_TOGGLE');
 const mobileMenu=document.getElementById('MENU_AS_CONTAINER');
 if(mobileButton&&mobileMenu){
  const setOpen=open=>{
   mobileMenu.setAttribute('data-undisplayed',String(!open));
   mobileMenu.classList.toggle('I_VSKP',open);
   mobileButton.setAttribute('aria-expanded',String(open));
   mobileButton.setAttribute('aria-label',open?(lang==='fr'?'Fermer le menu':'Close navigation menu'):(lang==='fr'?'Ouvrir le menu':'Open navigation menu'));
   mobileButton.style.zIndex=open?'2147483646':'';
   document.body.style.overflow=open?'hidden':'';
  };
  const toggle=()=>setOpen(mobileButton.getAttribute('aria-expanded')!=='true');
  mobileButton.addEventListener('click',toggle);
  mobileButton.addEventListener('keydown',e=>{if(['Enter',' '].includes(e.key)){e.preventDefault();toggle();}});
  document.addEventListener('keydown',e=>{if(e.key==='Escape')setOpen(false);});
  mobileMenu.querySelectorAll('li').forEach(li=>{
   const submenu=li.querySelector(':scope > ul');
   const row=li.querySelector(':scope > [data-testid="itemWrapper"]');
   if(!submenu||!row)return;
   row.addEventListener('click',e=>{
    if(e.target.closest('a'))return;
    const open=!li.classList.contains('rErQ82');
    li.classList.toggle('rErQ82',open);
    submenu.style.display=open?'block':'none';submenu.style.opacity=open?'1':'0';
    row.querySelector('button')?.setAttribute('aria-expanded',String(open));
   });
  });
 }
})();
