/* GNSS LAB / physical drafting tools — paper-space objects, no moving camera. */
(function(){
'use strict';
const board=document.getElementById('engBoard');
const svg=document.getElementById('engSvg');
const toolbar=document.getElementById('engTools');
if(!board||!svg||!toolbar)return;
window.GNSSPhysicalTools=true;
const names={ruler:'Лінійка',line:'Креслярська ручка',compass:'Циркуль',caliper:'Штангенциркуль',eraser:'Гумка'};
const configs={
 ruler:{x:335,y:116,width:455,angle:20},
 line:{x:180,y:518,width:175,angle:-26},
 compass:{x:1050,y:144,width:135,angle:0,radius:96},
 caliper:{x:970,y:544,width:260,angle:10,gap:88},
 eraser:{x:1080,y:154,width:125,angle:-16}
};
const positions={};
const layer=document.createElement('div');
layer.className='gnss-paper-tools';
layer.setAttribute('aria-label','Інструменти на креслярському аркуші');
board.append(layer);
const hint=document.createElement('div');
hint.className='gnss-paper-hint';
hint.setAttribute('aria-live','polite');
board.append(hint);
const guides=document.createElementNS('http://www.w3.org/2000/svg','svg');
guides.classList.add('gnss-physical-guides');
guides.setAttribute('viewBox','0 0 1200 660');
guides.setAttribute('preserveAspectRatio','xMidYMid meet');
guides.setAttribute('aria-hidden','true');
layer.append(guides);
const samples=document.createElement('div');
samples.className='gnss-physical-samples';
samples.setAttribute('aria-hidden','true');
const wood=document.createElement('div');
wood.className='gnss-sample gnss-sample-wood';
const cylinder=document.createElement('div');
cylinder.className='gnss-sample gnss-sample-cylinder';
samples.append(wood,cylinder);
layer.append(samples);
const objects={};
let mode='demo',tool='line',stage=0,visible=new Set(),ready=false;
let drawing=false,lastEraseAt=0,resizeObs=null;
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
function svgPoint(e) {
 const q=svg.createSVGPoint(),m=svg.getScreenCTM();
 q.x=e.clientX;q.y=e.clientY;
 return m?q.matrixTransform(m.inverse()):{x:0,y:0};
}
function screenPoint(x,y){
 const q=svg.createSVGPoint(),m=svg.getScreenCTM();
 q.x=x;q.y=y;
 const p=m?q.matrixTransform(m):{x:0,y:0},b=board.getBoundingClientRect();
 return {x:p.x-b.left,y:p.y-b.top,scale:m?Math.hypot(m.a,m.b):1};
}
function fire(type,data){
 document.dispatchEvent(new CustomEvent('gnss:table-action',{detail:Object.assign({type:type},data)}));
}
function imageFor(name){
 return toolbar.querySelector('button[data-tool="'+name+'"] img')?.src||'';
}
function makeItem(name){
 const src=imageFor(name);
 if(!src)return null;
 const element=document.createElement('div');
 element.className='gnss-physical-item gnss-physical-'+name;
 element.dataset.instrument=name;
 element.tabIndex=name==='line'?-1:0;
 element.setAttribute('role','button');
 element.setAttribute('aria-label',names[name]+'. Перетягніть на аркуші');
 const shadow=document.createElement('div');
 shadow.className='gnss-physical-shadow';
 const body=document.createElement('div');
 body.className='gnss-physical-asset';
 const img=document.createElement('img');
 img.src=src;img.alt='';img.draggable=false;img.decoding='async';
 body.append(img);
 element.append(shadow,body);
 if(name==='ruler'){
  const knob=document.createElement('button');
  knob.type='button';knob.className='gnss-instrument-handle gnss-rotate';
  knob.setAttribute('aria-label','Повернути лінійку');
  knob.title='Повернути · або коліщатком';
  knob.textContent='↻';
  element.append(knob);
  setupHandle(knob,name,'rotate');
 }
 if(name==='compass'){
  const knob=document.createElement('button');
  knob.type='button';knob.className='gnss-instrument-handle gnss-radius';
  knob.setAttribute('aria-label','Змінити радіус циркуля');
  knob.title='Потягніть, щоб встановити радіус';
  knob.textContent='↗';
  element.append(knob);
  setupHandle(knob,name,'radius');
 }
 if(name==='caliper'){
  const knob=document.createElement('button');
  knob.type='button';knob.className='gnss-instrument-handle gnss-gap';
  knob.setAttribute('aria-label','Розсунути губки штангенциркуля');
  knob.title='Розсуньте або зведіть губки';
  knob.textContent='↔';
  const value=document.createElement('span');
  value.className='gnss-gap-value';value.textContent='88 мм';
  element.append(knob,value);
  setupHandle(knob,name,'gap');
 }
 layer.append(element);
 positions[name]=Object.assign({},configs[name]);
 element.addEventListener('pointerdown',e=>startMove(e,name,element));
 element.addEventListener('wheel',e=>{
  if(mode==='demo'||name==='line')return;
  e.preventDefault();
  positions[name].angle=(positions[name].angle+(e.deltaY>0?5:-5)+360)%360;
  update(name);
  if(name==='ruler')fire('ruler',{x:positions.ruler.x,y:positions.ruler.y,angle:positions.ruler.angle-20,end:false});
 },{passive:false});
 element.addEventListener('keydown',e=>{
  if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;
  e.preventDefault();
  const d=e.shiftKey?10:3;
  if(e.key==='ArrowLeft')positions[name].x-=d;
  if(e.key==='ArrowRight')positions[name].x+=d;
  if(e.key==='ArrowUp')positions[name].y-=d;
  if(e.key==='ArrowDown')positions[name].y+=d;
  positions[name].x=clamp(positions[name].x,35,1165);
  positions[name].y=clamp(positions[name].y,35,625);
  update(name);
  if(name==='ruler')fire('ruler',{x:positions.ruler.x,y:positions.ruler.y,angle:positions.ruler.angle-20,end:true});
 });
 objects[name]=element;return element;
}
function update(name){
 const el=objects[name],p=positions[name];if(!el||!p)return;
 const q=screenPoint(p.x,p.y),w=clamp(p.width*q.scale,72,name==='ruler'?610:350);
 el.style.left=q.x+'px';el.style.top=q.y+'px';
 el.style.width=w+'px';
 el.style.setProperty('--tool-angle',(p.angle||0)+'deg');
 if(name==='caliper'){
  const label=el.querySelector('.gnss-gap-value');
  if(label)label.textContent=Math.round(p.gap)+' мм';
 }
 if(name==='compass')drawCircleGuide();
}
function updateSamples(){
 const source=[{node:wood,x:510,y:328,w:420,h:240},{node:cylinder,x:912,y:330,w:192,h:192}];
 for(const item of source){
  const p=screenPoint(item.x,item.y);
  item.node.style.left=p.x+'px';item.node.style.top=p.y+'px';
  item.node.style.width=item.w*p.scale+'px';
  item.node.style.height=item.h*p.scale+'px';
 }
}
function updateAll(){Object.keys(objects).forEach(update);updateSamples()}
function setVisible(next){
 visible=new Set(next);
 for(const [name,el] of Object.entries(objects)){
  const show=visible.has(name)&&mode!=='demo'&&document.body.classList.contains('engineering-live');
  if(show&&!el.classList.contains('is-visible')){
   el.classList.add('is-visible','is-landing');
   el.addEventListener('animationend',()=>el.classList.remove('is-landing'),{once:true});
  }else if(!show)el.classList.remove('is-visible','is-landing','is-dragging');
 }
 drawCircleGuide();
}
function sync(data){
 mode=data.mode||document.body.dataset.expMode||'demo';
 tool=data.tool||'line';stage=data.stage||0;
 const samplesVisible=mode==='quest'&&stage===2&&document.body.classList.contains('engineering-live');
 samples.classList.toggle('is-visible',samplesVisible);
 if(samplesVisible)updateSamples();
 if(mode==='demo'){setVisible([]);return}
 if(tool==='line'){setVisible(positions.ruler._placed?['ruler','line']:['line']);}
 else if(tool==='ruler')setVisible(['ruler']);
 else if(tool==='compass')setVisible(['compass']);
 else if(tool==='caliper')setVisible(['caliper']);
 else if(tool==='eraser')setVisible(['eraser']);
 else setVisible([]);
}
function snapTool(name,p){
 const o=positions[name];
 if(name==='compass'){
  if(Math.hypot(o.x-912,o.y-330)<38){o.x=912;o.y=330;showHint('● Центр зафіксовано')}
 }
 if(name==='ruler'&&mode==='quest'&&stage===2){
  if(Math.hypot(o.x-530,o.y-487)<55){o.x=530;o.y=487;showHint('↔ 140 мм')}
 }
}
function showHint(str){
 hint.textContent=str;hint.classList.add('is-visible');
 clearTimeout(showHint.timer);
 showHint.timer=setTimeout(()=>hint.classList.remove('is-visible'),1100);
}
function startMove(e,name,element){
 if(mode==='demo'||name==='line'||e.target.closest('.gnss-instrument-handle'))return;
 if(e.button!==0)return;
 e.preventDefault();e.stopPropagation();
 const start=svgPoint(e),p=positions[name],initial={x:p.x,y:p.y},pid=e.pointerId;
 element.setPointerCapture(pid);
 element.classList.add('is-dragging');
 const move=ev=>{
  if(ev.pointerId!==pid)return;
  const cur=svgPoint(ev);
  p.x=clamp(initial.x+cur.x-start.x,28,1170);
  p.y=clamp(initial.y+cur.y-start.y,30,625);
  if(ev.shiftKey){p.x=Math.round(p.x/10)*10;p.y=Math.round(p.y/10)*10}
  update(name);
  if(name==='eraser'&&performance.now()-lastEraseAt>45){
   lastEraseAt=performance.now();
   fire('erase',{x:cur.x,y:cur.y});
  }
  if(name==='ruler')fire('ruler',{x:p.x,y:p.y,angle:p.angle-20,end:false});
 };
 const done=ev=>{
  if(ev.pointerId!==pid)return;
  element.removeEventListener('pointermove',move);
  element.removeEventListener('pointerup',done);
  element.removeEventListener('pointercancel',done);
  element.classList.remove('is-dragging');
  if(name==='ruler'){
   p._placed=true;
   snapTool(name,svgPoint(ev));
   fire('ruler',{x:p.x,y:p.y,angle:p.angle-20,end:true});
  }
  if(name==='compass')snapTool(name,svgPoint(ev));
  if(name==='caliper'&&mode==='explore')showHint('↔ Пересунь губки');
  update(name);
  try{element.releasePointerCapture(pid)}catch{}
 };
 element.addEventListener('pointermove',move);
 element.addEventListener('pointerup',done);
 element.addEventListener('pointercancel',done);
}
function setupHandle(handle,name,kind){
 handle.addEventListener('pointerdown',e=>{
  if(mode==='demo')return;
  e.preventDefault();e.stopPropagation();
  if(e.button!==0)return;
  const p=positions[name],old={x:p.x,y:p.y,angle:p.angle,radius:p.radius,gap:p.gap};
  const start=svgPoint(e),pid=e.pointerId;
  handle.setPointerCapture(pid);
  objects[name].classList.add('is-dragging');
  const move=ev=>{
   if(ev.pointerId!==pid)return;
   const at=svgPoint(ev);
   if(kind==='rotate'){
    const a0=Math.atan2(start.y-p.y,start.x-p.x);
    const a1=Math.atan2(at.y-p.y,at.x-p.x);
    p.angle=old.angle+(a1-a0)*180/Math.PI;
    if(ev.shiftKey)p.angle=Math.round(p.angle/15)*15;
    fire('ruler',{x:p.x,y:p.y,angle:p.angle-20,end:false});
   }
   if(kind==='radius'){
    p.radius=clamp(Math.hypot(at.x-p.x,at.y-p.y),20,240);
    if(Math.abs(p.radius-96)<8)p.radius=96;
    fire('circle',{x:p.x,y:p.y,r:p.radius});
    showHint('R '+Math.round(p.radius/3)+' мм');
   }
   if(kind==='gap'){
    p.gap=clamp(old.gap+(at.x-start.x)/3,0,160);
    if(Math.abs(p.gap-64)<2.8)p.gap=64;
   }
   update(name);
  };
  const done=ev=>{
   if(ev.pointerId!==pid)return;
   handle.removeEventListener('pointermove',move);
   handle.removeEventListener('pointerup',done);
   handle.removeEventListener('pointercancel',done);
   objects[name].classList.remove('is-dragging');
   if(kind==='radius')fire('circle',{x:p.x,y:p.y,r:p.radius});
   if(kind==='rotate')fire('ruler',{x:p.x,y:p.y,angle:p.angle-20,end:true});
   if(kind==='gap')fire('caliper',{x:p.x,y:p.y,gap:p.gap,end:true});
   update(name);
   try{handle.releasePointerCapture(pid)}catch{}
  };
  handle.addEventListener('pointermove',move);
  handle.addEventListener('pointerup',done);
  handle.addEventListener('pointercancel',done);
 });
}
function drawCircleGuide(){
 while(guides.firstChild)guides.firstChild.remove();
 if(tool!=='compass'||mode==='demo'||!visible.has('compass'))return;
 const p=positions.compass;
 const circle=document.createElementNS('http://www.w3.org/2000/svg','circle');
 circle.setAttribute('cx',p.x);circle.setAttribute('cy',p.y);circle.setAttribute('r',p.radius);
 circle.setAttribute('class','gnss-guide-circle');
 const dot=document.createElementNS('http://www.w3.org/2000/svg','circle');
 dot.setAttribute('cx',p.x);dot.setAttribute('cy',p.y);dot.setAttribute('r','5');
 dot.setAttribute('class','gnss-guide-dot');
 guides.append(circle,dot);
}
function spawnCrumb(e){
 const p=screenPoint(e.detail.x,e.detail.y);
 for(let i=0;i<4;i++){
  const dot=document.createElement('i');
  dot.className='gnss-crumb';
  dot.style.left=(p.x+(i-2)*5)+'px';dot.style.top=(p.y+(i%2)*3)+'px';
  dot.style.setProperty('--dx',(i-2)*7+'px');
  board.append(dot);setTimeout(()=>dot.remove(),500);
 }
}
function onSvgMove(e){
 if(mode==='demo'||tool!=='line'||!visible.has('line'))return;
 const p=svgPoint(e),pen=positions.line;
 pen.x=clamp(p.x+48,25,1170);
 pen.y=clamp(p.y-42,25,620);
 const el=objects.line;
 if(el)el.classList.toggle('is-drawing',drawing);
 update('line');
}
svg.addEventListener('pointerdown',e=>{
 if(mode==='demo'||tool!=='line')return;
 drawing=true;objects.line?.classList.add('is-drawing');
});
svg.addEventListener('pointermove',onSvgMove);
for(const kind of ['pointerup','pointercancel','pointerleave'])svg.addEventListener(kind,()=>{
 drawing=false;objects.line?.classList.remove('is-drawing');
});
document.addEventListener('gnss:eraser-contact',spawnCrumb);
document.addEventListener('gnss:draft-state',e=>sync(e.detail));
document.addEventListener('keydown',e=>{
 if(mode==='demo')return;
 const name=tool;
 if(e.key==='['||e.key===']'){
  const p=positions[name];if(p&&name!=='line'){
   e.preventDefault();p.angle+=e.key==='['?-15:15;
   update(name);
   if(name==='ruler')fire('ruler',{x:p.x,y:p.y,angle:p.angle-20,end:true});
  }
 }
});
for(const name of Object.keys(configs))makeItem(name);
if(typeof ResizeObserver!=='undefined'){
 resizeObs=new ResizeObserver(updateAll);resizeObs.observe(board);
}
window.addEventListener('resize',updateAll);
const obs=new MutationObserver(()=>sync({mode:document.body.dataset.expMode||'demo',tool:tool,stage:stage}));
obs.observe(document.body,{attributes:true,attributeFilter:['class','data-exp-mode']});
sync({mode:document.body.dataset.expMode||'demo',tool:'line',stage:0});
setTimeout(updateAll,80);
})();
