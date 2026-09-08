(()=>{
 const reduced=matchMedia('(prefers-reduced-motion:reduce)'),fr=new URLSearchParams(location.search).get('lang')==='fr';
 const slides=[...document.querySelectorAll('[data-slide]')],buttons=[...document.querySelectorAll('.thumb')],display=document.getElementById('display'),animations=new Map();
 let current=0;
 document.documentElement.lang=fr?'fr':'en';
 document.getElementById('gallery').setAttribute('aria-label',fr?'Photos de nos installations':'Facility photos');
 document.getElementById('thumbnails').setAttribute('aria-label',fr?'Choisir une photo':'Choose a photo');
 slides.forEach((slide,i)=>slide.querySelector('img').alt=(fr?'Photo des installations ':'Facility photo ')+(i+1));
 buttons.forEach((button,i)=>button.setAttribute('aria-label',(fr?'Voir la photo ':'Show photo ')+(i+1)));
 function show(index,animate=true){
  const next=(index+slides.length)%slides.length;
  if(animate&&next===current)return;
  const starts=slides.map(slide=>Number(getComputedStyle(slide).opacity));
  animations.forEach(animation=>animation.cancel());animations.clear();current=next;
  slides.forEach((slide,i)=>{
   const active=i===current;slide.style.opacity=active?'1':'0';slide.style.zIndex=active?'2':'1';slide.inert=!active;slide.setAttribute('aria-hidden',String(!active));
   if(animate&&!reduced.matches){
    const animation=slide.animate([{opacity:starts[i]},{opacity:active?1:0}],{duration:700,easing:active?'cubic-bezier(.22,1,.36,1)':'ease-in',fill:'both'});
    animations.set(slide,animation);animation.onfinish=()=>{if(animations.get(slide)===animation){animations.delete(slide);animation.cancel();}};
   }
  });
  buttons.forEach((button,i)=>button.setAttribute('aria-pressed',String(i===current)));
  if(animate)buttons[current].scrollIntoView({block:'nearest',inline:'nearest',behavior:reduced.matches?'instant':'smooth'});
 }
 buttons.forEach((button,i)=>button.addEventListener('click',()=>show(i)));
 document.getElementById('gallery').addEventListener('keydown',event=>{
  if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
  event.preventDefault();show(event.key==='Home'?0:event.key==='End'?slides.length-1:current+(event.key==='ArrowRight'?1:-1));
 });
 let touchX;
 display.addEventListener('pointerdown',event=>{if(event.pointerType==='touch')touchX=event.clientX;});
 display.addEventListener('pointerup',event=>{if(touchX!==undefined&&Math.abs(event.clientX-touchX)>45)show(current+(event.clientX<touchX?1:-1));touchX=undefined;});
 display.addEventListener('pointercancel',()=>{touchX=undefined;});
 reduced.addEventListener('change',()=>{if(reduced.matches)show(current,false);});
 show(0,false);
})();