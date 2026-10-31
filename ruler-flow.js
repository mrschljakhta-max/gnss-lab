/* GNSS LAB / Two-point ruler workflow — 1 click A, 1 click B, physical animation. */
(function(){
'use strict';
const board=document.getElementById('engBoard');
const svg=document.getElementById('engSvg');
const tools=document.getElementById('engTools');
if(!board||!svg||!tools)return;
const NS='http://www.w3.org/2000/svg';
const overlay=document.createElementNS(NS,'svg');
overlay.classList.add('gnss-ruler-trace');
overlay.setAttribute('viewBox','0 0 1200 660');
overlay.setAttribute('preserveAspectRatio','xMidYMid meet');
overlay.setAttribute('aria-hidden','true');
board.append(overlay);
const marker=(x,y,text)=>{
 const g=document.createElementNS(NS,'g');
 const dot=document.createElementNS(NS,'circle');
 dot.setAttribute('cx',x);dot.setAttribute('cy',y);dot.setAttribute('r','5');
 dot.setAttribute('class','gnss-ruler-point');
 const label=document.createElementNS(NS,'text');
 label.setAttribute('x',x+12);label.setAttribute('y',y-12);
 label.setAttribute('class','gnss-ruler-mark');
 label.textContent=text;g.append(dot,label);
 return g;
};
const line=document.createElementNS(NS,'line');
line.setAttribute('class','gnss-ruler-preview');
const ink=document.createElementNS(NS,'line');
ink.setAttribute('class','gnss-ruler-ink');
const length=document.createElementNS(NS,'text');
length.setAttribute('class','gnss-ruler-length');
length.setAttribute('text-anchor','middle');
let mode='demo',tool='line',stage=0,start=null,hover=null,busy=null,demoQueued=false;
const active=()=>mode!=='demo'&&tool==='ruler'&&(mode!=='quest'||stage===0)&&document.body.classList.contains('engineering-live');
window.GNSSRulerFlow={get active(){return active()},get busy(){return !!busy},get demoPlaying(){return !!busy?.demo}};
const reduce=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
const px=e=>{const p=svg.createSVGPoint();p.x=e.clientX;p.y=e.clientY;const m=svg.getScreenCTM();return m?p.matrixTransform(m.inverse()):{x:0,y:0}};
const snap=n=>Math.round(n/3)*3; // 1 mm precision; scale in existing engine is 3 SVG units/mm
const point=p=>({x:Math.min(1190,Math.max(10,snap(p.x))),y:Math.min(650,Math.max(10,snap(p.y)))});
function showHint(message){
 const label=board.querySelector('.gnss-paper-hint');if(!label)return;
 label.textContent=message;label.classList.add('is-visible');
 clearTimeout(showHint.timeout);showHint.timeout=setTimeout(()=>label.classList.remove('is-visible'),1100);
}
function clearTrace(){overlay.replaceChildren();start=null;hover=null}
function cancel(){
 if(busy){const ctl=busy;busy=null;ctl.cancel?.()}
 clearTrace();
 render();
}
function fmt(n){return (Math.round(n*10)/10).toLocaleString('uk-UA')+' мм'}
function render(inkFraction){
 overlay.replaceChildren();
 if(!start||!active()&&!busy)return;
 overlay.append(marker(start.x,start.y,'A'));
 const end=busy?.end||hover;
 if(!end)return;
 const dx=end.x-start.x,dy=end.y-start.y,dist=Math.hypot(dx,dy);
 if(dist<1)return;
 const theta=Math.atan2(dy,dx),offset=dist?Math.min(19,Math.max(13,dist*.08)):13;
 const normalX=-Math.sin(theta),normalY=Math.cos(theta);
 const isInk=typeof inkFraction==='number';
 const path=isInk?ink:line;
 path.setAttribute('x1',start.x);path.setAttribute('y1',start.y);
 path.setAttribute('x2',isInk?start.x+dx*inkFraction:end.x);
 path.setAttribute('y2',isInk?start.y+dy*inkFraction:end.y);
 overlay.append(path);
 if(busy)overlay.append(marker(end.x,end.y,'B'));
 length.textContent=fmt(dist/3);
 length.setAttribute('x',(start.x+end.x)*.5+normalX*offset);
 length.setAttribute('y',(start.y+end.y)*.5+normalY*offset-4);
 overlay.append(length);
}
function check(a,b){
 const detail={a,b,accepted:false};
 document.dispatchEvent(new CustomEvent('gnss:ruler-check',{detail}));
 return detail.accepted;
}
function launch(a,b,isDemo=false){
 const playback=window.GNSSPhysicalTools?.playRulerStroke;
 if(typeof playback!=='function'){
  showHint('Інструмент ще завантажується');
  clearTrace();return;
 }
 start=a;hover=b;
 const ctl=playback(a,b,f=>{if(busy?.controller===ctl)render(f)});
 busy={controller:ctl,end:b,demo:isDemo,paused:false,cancel:()=>ctl.cancel()};
 render(0);
 ctl.promise.then(ok=>{
  if(!busy||busy.controller!==ctl)return;
  busy=null;
  if(ok){
   document.dispatchEvent(new CustomEvent(isDemo?'gnss:ruler-demo-finished':'gnss:ruler-commit',{detail:{a,b}}));
  }
  clearTrace();
  document.body.classList.toggle('gnss-ruler-point-mode',active());
 });
}
function startDemo(){
 if(mode!=='demo'||!document.body.classList.contains('engineering-live'))return;
 if(busy)cancel();
 // The first 140 mm edge is physically drawn; the original demonstration
 // continues with the other three edges and the circle afterwards.
 const a={x:300,y:208},b={x:720,y:208};
 document.dispatchEvent(new CustomEvent('gnss:ruler-demo-begin'));
 launch(a,b,true);
}
function queueDemo(){
 if(demoQueued)return;
 demoQueued=true;
 requestAnimationFrame(()=>{
  demoQueued=false;
  if(mode==='demo'&&document.body.classList.contains('engineering-live'))startDemo();
 });
}
const cmd=document.getElementById('engCommand');
cmd?.addEventListener('click',e=>{
 if(mode!=='demo')return;
 const button=e.target.closest('[data-cmd]');if(!button)return;
 if(button.dataset.cmd==='replay'){
  e.preventDefault();e.stopImmediatePropagation();startDemo();return;
 }
 if(!busy?.demo)return;
 if(button.dataset.cmd==='play'){
  e.preventDefault();e.stopImmediatePropagation();
  if(busy.paused){busy.controller.resume();busy.paused=false;button.textContent='Ⅱ'}
  else{busy.controller.pause();busy.paused=true;button.textContent='▶'}
 }
 if(button.dataset.cmd==='next'){
  e.preventDefault();e.stopImmediatePropagation();
  const done=busy;busy=null;done.cancel();clearTrace();
  document.dispatchEvent(new CustomEvent('gnss:ruler-demo-finished'));
 }
},true);
function pointerDown(e){
 if(!active()||e.button!==0)return;
 e.preventDefault();e.stopImmediatePropagation();
 if(busy)return;
 const p=point(px(e));
 if(!start){start=p;hover=null;showHint('A • Тепер вибери точку B');render();return}
 const d=Math.hypot(p.x-start.x,p.y-start.y);
 if(d<24){showHint('Збільш відстань');return}
 if(d>420){showHint('Лінійка до 140 мм');return}
 if(!check(start,p)){clearTrace();showHint('↔ Повтори побудову');return}
 launch(start,p);
}
function pointerMove(e){
 if(!active()||busy||!start)return;
 const p=point(px(e));
 if(e.shiftKey){
  if(Math.abs(p.x-start.x)>Math.abs(p.y-start.y))p.y=start.y;
  else p.x=start.x;
 }
 hover=p;render();
}
function updateState(d){
 const previously=active(),priorMode=mode;
 const nextMode=d.mode||document.body.dataset.expMode||'demo';
 const changedToDemo=nextMode==='demo'&&priorMode!=='demo';
 const nextTool=d.tool||'line',nextStage=d.stage||0;
 if(mode!==nextMode||tool!==nextTool||stage!==nextStage){
  if(busy)cancel();else clearTrace();
 }
 mode=nextMode;tool=nextTool;stage=nextStage;
 document.body.classList.toggle('gnss-ruler-point-mode',active());
 if(nextMode==='demo'&&changedToDemo)queueDemo();
 if(!previously&&active()){
  showHint('Лінійка • Точка A → точка B');
 }
}
svg.addEventListener('pointerdown',pointerDown,true);
svg.addEventListener('pointermove',pointerMove,true);
svg.addEventListener('pointerleave',()=>{if(!busy)hover=null;render()},true);
document.addEventListener('gnss:draft-state',e=>updateState(e.detail));
document.addEventListener('click',e=>{
 if(e.target.closest('#engFloatUndo')&&active()&&(start||busy)){
  e.preventDefault();e.stopImmediatePropagation();cancel();
 }
},true);
document.addEventListener('keydown',e=>{
 if(e.key==='Escape'&&(start||busy)){cancel();return}
 if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'&&(start||busy)){
  e.preventDefault();e.stopImmediatePropagation();cancel();
 }
},true);
document.body.addEventListener('click',e=>{if(e.target.closest('#sidebarNav'))cancel()},true);
const observer=new MutationObserver(()=>{
 if(!document.body.classList.contains('engineering-live')&&busy)cancel();
 document.body.classList.toggle('gnss-ruler-point-mode',active());
});
observer.observe(document.body,{attributes:true,attributeFilter:['class']});
updateState({mode:document.body.dataset.expMode||'demo',tool:'line',stage:0});
setTimeout(()=>{if(mode==='demo')queueDemo()},140);
})();
