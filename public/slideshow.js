(()=>{
// Captured Wix slides have pixel widths; size them to their live iframe instead.
const responsiveStyle=document.createElement("style");
responsiveStyle.textContent="html,body{margin:0;width:100%;height:100%;overflow:hidden}\n#wrapper,#viewport{width:100%;height:100%}\n#viewport .cycle-slide,#viewport .grid-sizer,#viewport .img{width:100%!important}\n#viewport .cycle-slide,#viewport .img{height:100vh!important}\n#viewport .overlay{left:max(0px,calc((100% - 980px)/2))!important;width:min(100%,980px)!important}\n";
document.head.append(responsiveStyle);
const slides=[...document.querySelectorAll('.cycle-slide:not(.cycle-sentinel)')];const dots=[...document.querySelectorAll('.cycle-pager span')];
// Wix initially places inactive slide text at top:1000px. Reuse the visible slide position.
const descriptionTop=slides.map(s=>s.querySelector('.sb-description')?.style.top).find(Boolean)||'calc((100vh - 51px)/2)';
slides.forEach(s=>{const description=s.querySelector('.sb-description');if(description)description.style.top=descriptionTop;});

const reduce=matchMedia('(prefers-reduced-motion: reduce)');
const fades=new Map();
let current=Math.max(0,slides.findIndex(slide=>slide.classList.contains('cycle-slide-active')));
function show(index,animate=true){
 const next=(index+slides.length)%slides.length;
 if(animate&&next===current)return;
 const starts=slides.map(slide=>getComputedStyle(slide).display==='none'?0:Number(getComputedStyle(slide).opacity));
 fades.forEach(animation=>animation.cancel());fades.clear();
 current=next;
 slides.forEach((slide,i)=>{
  const active=i===current;
  slide.style.display='block';slide.style.position='absolute';slide.style.top='0';slide.style.left='0';
  slide.style.zIndex=active?'2':'1';slide.style.opacity=active?'1':'0';
  slide.style.pointerEvents=active?'auto':'none';slide.inert=!active;
  slide.setAttribute('aria-hidden',String(!active));slide.classList.toggle('cycle-slide-active',active);
  if(!animate||reduce.matches||!slide.animate)return;
  const fade=slide.animate([{opacity:starts[i]},{opacity:active?1:0}],{
   duration:650,easing:active?'cubic-bezier(0.22,1,0.36,1)':'ease-in',fill:'both'
  });
  fades.set(slide,fade);
  fade.onfinish=()=>{if(fades.get(slide)===fade){fades.delete(slide);fade.cancel();}};
 });
 dots.forEach((dot,i)=>{dot.classList.toggle('cycle-pager-active',i===current);dot.setAttribute('aria-pressed',String(i===current));});
}
dots.forEach((dot,i)=>{
 dot.setAttribute('role','button');dot.tabIndex=0;dot.setAttribute('aria-label','Slide '+(i+1));
 dot.addEventListener('click',()=>show(i));
 dot.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();show(i);}});
});
const lang=location.pathname.includes('/fr/')?'?lang=fr':'';
slides.forEach((slide,i)=>{
 const button=slide.querySelector('.more');if(!button)return;
 button.setAttribute('role','link');button.tabIndex=0;
 const go=()=>{parent.location.href=(i===0?'/camps':'/banquet')+lang;};
 button.addEventListener('click',go);
 button.addEventListener('keydown',event=>{if(event.key==='Enter')go();});
});
show(current,false);
reduce.addEventListener('change',event=>{if(event.matches)show(current,false);});
if(slides.length>1)setInterval(()=>{
 if(!reduce.matches&&!document.hidden&&!document.querySelector('.more:focus'))show(current+1);
},8000);
const motionStyle=document.createElement('style');
motionStyle.textContent='@media(prefers-reduced-motion:reduce){#viewport .img{animation:none!important}}';
document.head.append(motionStyle);
})();
