(()=>{
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
  if(button.matches('[data-testid="languages-dropdown-handle"]'))return;
  const panel=document.getElementById(button.getAttribute('aria-controls'));if(!panel)return;
  button.addEventListener('click',()=>{const open=button.getAttribute('aria-expanded')!=='true';button.setAttribute('aria-expanded',String(open));panel.hidden=!open;panel.style.display=open?'block':'none';panel.setAttribute('aria-hidden',String(!open));if(button.matches('[data-hook="accordion-item-header"]')){const inner=panel.parentElement,outer=inner.parentElement;inner.style.display=open?'block':'none';inner.style.opacity=open?'1':'0';outer.style.height=open?'auto':'0px';outer.style.overflow=open?'visible':'hidden';const arrow=button.querySelector('svg');if(arrow)arrow.style.transform=open?'rotate(180deg)':'';}});
 });
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
