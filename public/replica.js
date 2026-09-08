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

 // Interruptible transitions preserve the current frame when a user clicks again.
 const activeMotions=new Map();
 const motionEase='cubic-bezier(0.22, 1, 0.36, 1)';
 const runMotion=(element,frames,duration,finish=()=>{})=>{
  const previous=activeMotions.get(element);
  if(previous){activeMotions.delete(element);previous.animation.cancel();}
  if(reducedMotion.matches||!element.animate||duration===0){finish();return;}
  const animation=element.animate(frames,{duration,easing:motionEase,fill:'both'});
  const settle=()=>{
   if(activeMotions.get(element)?.animation!==animation)return;
   activeMotions.delete(element);finish();animation.cancel();
  };
  activeMotions.set(element,{animation,settle});animation.onfinish=settle;
 };
 reducedMotion.addEventListener('change',event=>{
  if(event.matches)for(const motion of [...activeMotions.values()])motion.settle();
 });
 const expandBox=(element,open,finish=()=>{},duration=360)=>{
  const visible=getComputedStyle(element).display!=='none';
  const height=visible?element.getBoundingClientRect().height:0;
  const opacity=height>0?Number(getComputedStyle(element).opacity):0;
  element.hidden=false;element.style.display='block';
  element.style.boxSizing='border-box';element.style.overflow='hidden';element.style.transition='none';
  element.style.height=height+'px';element.style.opacity=open?'1':'0';
  const target=open?element.scrollHeight:0;
  runMotion(element,[{height:height+'px',opacity},{height:target+'px',opacity:open?1:0}],duration,()=>{
   element.style.height=open?'auto':'0px';
   element.style.opacity=open?'1':'0';
   element.style.overflow=open?'visible':'hidden';
   finish();
  });
 };

 const closeMenus=(except=null)=>{
  document.querySelectorAll('[data-cse-open]').forEach(item=>{
   if(item===except||item.hasAttribute('data-cse-closing'))return;
   item.setAttribute('data-cse-closing','');delete item.dataset.cseClicked;
   item.querySelector('[aria-expanded]')?.setAttribute('aria-expanded','false');
   const panel=item.querySelector('[data-testid="positionBox"]');
   const finish=()=>{
    item.removeAttribute('data-cse-open');item.removeAttribute('data-cse-closing');
    item.removeAttribute('data-hovered');item.removeAttribute('data-shown');
   };
   if(!panel){finish();return;}
   panel.inert=true;
   runMotion(panel,[{opacity:getComputedStyle(panel).opacity,transform:getComputedStyle(panel).transform},{opacity:0,transform:'translateY(-8px)'}],200,finish);
  });
 };
 document.querySelectorAll('[data-testid="menuItemDepth0"]').forEach(item=>{
  const trigger=item.querySelector('[aria-haspopup]');if(!trigger)return;
  const open=()=>{
   if(item.hasAttribute('data-cse-open')&&!item.hasAttribute('data-cse-closing'))return;
   closeMenus(item);
   const panel=item.querySelector('[data-testid="positionBox"]');
   const wasOpen=item.hasAttribute('data-cse-open');
   const opacity=wasOpen&&panel?getComputedStyle(panel).opacity:0;
   const transform=wasOpen&&panel?getComputedStyle(panel).transform:'translateY(-8px)';
   item.removeAttribute('data-cse-closing');
   item.setAttribute('data-cse-open','');item.setAttribute('data-hovered','true');item.setAttribute('data-shown','true');
   trigger.setAttribute('aria-expanded','true');
   if(panel){
    const r=item.closest('nav').getBoundingClientRect();
    panel.style.left=(-r.left)+'px';panel.style.right='auto';
    panel.style.width=Math.max(document.documentElement.clientWidth,document.body.clientWidth)+'px';panel.style.top=r.height+'px';
    panel.style.opacity='1';panel.style.transform='none';panel.inert=false;
    runMotion(panel,[{opacity,transform},{opacity:1,transform:'translateY(0)'}],260);
   }
  };
  item.addEventListener('mouseenter',open);
  item.addEventListener('mouseleave',()=>closeMenus());
  for(const button of [trigger,item.querySelector('button[aria-label^="Toggle"]')].filter(Boolean)){
   button.addEventListener('click',event=>{
    event.stopPropagation();
    if(item.dataset.cseClicked==='true')closeMenus();
    else{open();item.dataset.cseClicked='true';}
   });
   button.addEventListener('keydown',event=>{
    if(['Enter',' '].includes(event.key)){event.preventDefault();open();}
    if(event.key==='Escape')closeMenus();
   });
  }
 });
 const closeLanguage=()=>{
  const menu=document.getElementById('cse-language-options');if(!menu)return;
  document.querySelector('[data-testid="languages-dropdown-handle"]')?.setAttribute('aria-expanded','false');
  menu.inert=true;
  runMotion(menu,[{opacity:getComputedStyle(menu).opacity,transform:getComputedStyle(menu).transform},{opacity:0,transform:'translateY(-6px)'}],180,()=>menu.remove());
 };
 document.querySelectorAll('[data-testid="languages-dropdown-handle"]').forEach(button=>{
  button.addEventListener('click',()=>{
   const existing=document.getElementById('cse-language-options');
   if(existing){
    if(!existing.inert){closeLanguage();return;}
    existing.inert=false;button.setAttribute('aria-expanded','true');
    runMotion(existing,[{opacity:getComputedStyle(existing).opacity,transform:getComputedStyle(existing).transform},{opacity:1,transform:'translateY(0)'}],220);
    return;
   }
   const menu=document.createElement('div');menu.id='cse-language-options';menu.setAttribute('role','menu');
   for(const code of ['en','fr']){
    const a=document.createElement('a'),u=new URL(location.href);
    code==='fr'?u.searchParams.set('lang','fr'):u.searchParams.delete('lang');
    a.href=u.pathname+u.search;a.textContent=code.toUpperCase();a.setAttribute('role','menuitem');menu.append(a);
   }
   const r=button.getBoundingClientRect();
   menu.style.cssText='position:fixed;z-index:2147483647;top:'+r.bottom+'px;right:'+Math.max(8,innerWidth-r.right)+'px';
   document.body.append(menu);button.setAttribute('aria-expanded','true');
   runMotion(menu,[{opacity:0,transform:'translateY(-6px)'},{opacity:1,transform:'translateY(0)'}],220);
  });
 });
 document.addEventListener('keydown',event=>{if(event.key==='Escape'){closeMenus();closeLanguage();}});
 document.addEventListener('click',event=>{
  if(!event.target.closest('[data-testid="menuItemDepth0"]'))closeMenus();
  if(!event.target.closest('#cse-language-options,[data-testid="languages-dropdown-handle"]'))closeLanguage();
 });
 document.querySelectorAll('[aria-controls]').forEach(button=>{
  if(button.matches('[data-testid="languages-dropdown-handle"], [data-hook="accordion-item-header"]'))return;
  const panel=document.getElementById(button.getAttribute('aria-controls'));if(!panel)return;
  button.addEventListener('click',()=>{
   const open=button.getAttribute('aria-expanded')!=='true';
   button.setAttribute('aria-expanded',String(open));panel.setAttribute('aria-hidden',String(!open));panel.inert=!open;
   expandBox(panel,open,()=>{panel.hidden=!open;panel.style.display=open?'block':'none';});
  });
 });

 // Animate height and opacity while keeping one answer open across both FAQ sections.
 const faqButtons=[...document.querySelectorAll('[data-hook="accordion-item-header"]')];
 const setFaqExpanded=(button,open,animate=true)=>{
  const panel=document.getElementById(button.getAttribute('aria-controls'));if(!panel)return;
  if(animate&&button.getAttribute('aria-expanded')===String(open))return;
  const inner=panel.parentElement,outer=inner.parentElement;
  button.setAttribute('aria-expanded',String(open));
  panel.setAttribute('aria-hidden',String(!open));panel.inert=!open;
  if(open){panel.hidden=false;panel.style.display='block';inner.style.display='block';inner.style.opacity='1';}
  const finish=()=>{
   panel.hidden=!open;panel.style.display=open?'block':'none';
   inner.style.display=open?'block':'none';inner.style.opacity=open?'1':'0';
  };
  expandBox(outer,open,finish,animate?380:0);
  const arrow=button.querySelector('svg');if(arrow)arrow.style.transform=open?'rotate(180deg)':'';
 };
 faqButtons.forEach(button=>{
  setFaqExpanded(button,false,false);
  button.addEventListener('click',()=>{
   const open=button.getAttribute('aria-expanded')!=='true';
   faqButtons.forEach(other=>{if(other!==button)setFaqExpanded(other,false);});
   setFaqExpanded(button,open);
  });
 });
 // Keep the original Wix submission service until a replacement backend is configured.
 // Never claim a form succeeded without submitting it.
 document.querySelectorAll('form').forEach(form=>{
  form.addEventListener('submit',e=>{e.preventDefault();location.href='https://www.catholicway.net'+location.pathname+location.search;});
  const note=document.createElement('p');note.className='cse-form-note';note.textContent=lang==='fr'?'Ce formulaire s’ouvre sur notre site actuel pour être envoyé en toute sécurité.':'This form opens on our current website for secure submission.';form.append(note);
 });

 // Animate the original mobile drawer and its nested navigation.
 const mobileButton=document.getElementById('MENU_AS_CONTAINER_TOGGLE');
 const mobileMenu=document.getElementById('MENU_AS_CONTAINER');
 if(mobileButton&&mobileMenu){
  const setOpen=open=>{
   const visible=mobileMenu.getAttribute('data-undisplayed')==='false';
   const opacity=visible?getComputedStyle(mobileMenu).opacity:0;
   const transform=visible?getComputedStyle(mobileMenu).transform:'translateX(24px)';
   mobileButton.setAttribute('aria-expanded',String(open));
   mobileButton.setAttribute('aria-label',open?(lang==='fr'?'Fermer le menu':'Close navigation menu'):(lang==='fr'?'Ouvrir le menu':'Open navigation menu'));
   mobileMenu.inert=!open;
   if(open){
    mobileMenu.setAttribute('data-undisplayed','false');mobileMenu.classList.add('I_VSKP');
    mobileButton.style.zIndex='2147483646';document.body.style.overflow='hidden';
   }
   mobileMenu.style.opacity=open?'1':'0';mobileMenu.style.transform=open?'translateX(0)':'translateX(24px)';
   runMotion(mobileMenu,[{opacity,transform},{opacity:open?1:0,transform:open?'translateX(0)':'translateX(24px)'}],300,()=>{
    if(!open){
     mobileMenu.setAttribute('data-undisplayed','true');mobileMenu.classList.remove('I_VSKP');
     mobileButton.style.zIndex='';document.body.style.overflow='';
    }
   });
  };
  const toggle=()=>setOpen(mobileButton.getAttribute('aria-expanded')!=='true');
  mobileButton.addEventListener('click',toggle);
  mobileButton.addEventListener('keydown',event=>{if(['Enter',' '].includes(event.key)){event.preventDefault();toggle();}});
  document.addEventListener('keydown',event=>{if(event.key==='Escape')setOpen(false);});
  mobileMenu.querySelectorAll('li').forEach(li=>{
   const submenu=li.querySelector(':scope > ul'),row=li.querySelector(':scope > [data-testid="itemWrapper"]');
   if(!submenu||!row)return;
   row.addEventListener('click',event=>{
    if(event.target.closest('a'))return;
    const button=row.querySelector('button');
    const open=button?button.getAttribute('aria-expanded')!=='true':!li.classList.contains('rErQ82');
    button?.setAttribute('aria-expanded',String(open));submenu.inert=!open;
    expandBox(submenu,open,()=>{
     li.classList.toggle('rErQ82',open);submenu.style.display=open?'block':'none';
    },320);
    if(open)li.classList.add('rErQ82');
   });
  });
 }

 // Keep Wix's native sticky background reveal aligned after viewport/font changes.
 const revealSections=[...document.querySelectorAll('[style*="--motion-comp-height"]')];
 const sizeReveal=element=>element.style.setProperty('--motion-comp-height',element.getBoundingClientRect().height+'px');
 revealSections.forEach(sizeReveal);
 if('ResizeObserver' in window){
  const observer=new ResizeObserver(entries=>entries.forEach(entry=>sizeReveal(entry.target)));
  revealSections.forEach(element=>observer.observe(element));
 }
 // Browsers without cross-document View Transitions still get a gentle page arrival.
 if(!('CSSViewTransitionRule' in window)){
  const content=document.getElementById('PAGES_CONTAINER');
  if(content)runMotion(content,[{opacity:0.75},{opacity:1}],240);
 }

})();
