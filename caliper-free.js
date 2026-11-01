/* GNSS LAB / Free drafting: A–B placement for a physical vernier caliper.
 * Selection establishes the measurement axis. The jaws obey actual intersections
 * with the existing rect, triangle or circle. No digital numerical shortcuts.
 */
(function(){
'use strict';
const board=document.getElementById('engBoard');
const original=document.getElementById('engSvg');
if(!board||!original)return;
const NS='http://www.w3.org/2000/svg',SCALE=3,EPS=1e-6;
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const add=(a,b)=>({x:a.x+b.x,y:a.y+b.y});
const sub=(a,b)=>({x:a.x-b.x,y:a.y-b.y});
const mul=(a,t)=>({x:a.x*t,y:a.y*t});
const dot=(a,b)=>a.x*b.x+a.y*b.y;
const cross=(a,b)=>a.x*b.y-a.y*b.x;
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const fmt=x=>x.toLocaleString('uk-UA',{maximumFractionDigits:1});
const freeze=(x)=>Number.isFinite(x)?x:0;
let mode='demo',tool='line',phase='idle',A=null,B=null,pointer=null,job=null;
let drag=null,introStart=0,introHandle=0,contactPulse=0;
const root=document.createElement('div');
root.id='gnssFreeCaliper';
root.hidden=true;
root.innerHTML='<svg xmlns="'+NS+'" viewBox="0 0 1200 660" preserveAspectRatio="xMidYMid meet" id="gfcSvg" aria-label="Штангенциркуль, вибір двох точок, рух каретки та перетину"></svg>'+
 '<div id="gfcHint" role="status" aria-live="polite"></div>'+
 '<button id="gfcReset" type="button" aria-label="Вибрати інші дві точки">↻ Новий відрізок</button>';
board.append(root);
const svg=root.querySelector('#gfcSvg'),hint=root.querySelector('#gfcHint'),reset=root.querySelector('#gfcReset');
function visible(){return mode==='explore'&&tool==='caliper'&&!document.body.classList.contains('lab01-route')}
function shapes(){return Array.isArray(window.GNSSPublishedShapes)?window.GNSSPublishedShapes:[]}
function polygon(shape){
 const {x,y,w,h}=shape;
 if(shape.type==='rect')return [{x,y},{x:x+w,y},{x:x+w,y:y+h},{x,y:y+h}];
 if(shape.type==='triangle')return [{x:x+w/2,y},{x:x+w,y:y+h},{x,y:y+h}];
 return null;
}
function closestOnSegment(p,a,b){
 const v=sub(b,a),den=dot(v,v);
 const t=den>EPS?clamp(dot(sub(p,a),v)/den,0,1):0;
 return add(a,mul(v,t));
}
function closestOnShape(p,shape){
 if(!shape)return null;
 if(shape.type==='circle'){
  const v=sub(p,shape),l=Math.hypot(v.x,v.y);
  if(!Number.isFinite(shape.r)||shape.r<=0)return null;
  return {p:add(shape,mul(v,l>EPS?shape.r/l:1)),d:Math.abs(l-shape.r)};
 }
 const verts=polygon(shape);
 if(!verts)return null;
 const candidates=verts.map((a,i)=>closestOnSegment(p,a,verts[(i+1)%verts.length]));
 let best=candidates[0];
 for(const q of candidates)if(distance(p,q)<distance(p,best))best=q;
 return {p:best,d:distance(best,p)};
}
function snapped(point){
 let best={p:point,d:18};
 for(const shape of shapes()){
  const hit=closestOnShape(point,shape);
  if(hit&&hit.d<best.d)best=hit;
 }
 return {x:freeze(best.p.x),y:freeze(best.p.y)};
}
function within(p,shape){
 if(shape.type==='circle')return distance(p,shape)<shape.r+1;
 const poly=polygon(shape);if(!poly)return false;
 let yes=false;
 for(let i=0,j=poly.length-1;i<poly.length;j=i++){
  const a=poly[i],b=poly[j];
  if((a.y>p.y)!==(b.y>p.y)&&p.x<(b.x-a.x)*(p.y-a.y)/(b.y-a.y)+a.x)yes=!yes;
 }
 return yes;
}
function section(shape,p,u){
 if(shape.type==='circle'){
  const d=sub(p,shape),along=dot(d,u),off=dot(d,{x:-u.y,y:u.x});
  const disc=shape.r*shape.r-off*off;
  if(disc<=EPS)return null;
  const q=Math.sqrt(disc);
  return [-(along+q),-along+q].sort((x,y)=>x-y);
 }
 const vertices=polygon(shape);if(!vertices)return null;
 const roots=[];
 for(let i=0;i<vertices.length;i++){
  const a=vertices[i],b=vertices[(i+1)%vertices.length],v=sub(b,a),D=cross(u,v);
  if(Math.abs(D)<EPS)continue;
  const delta=sub(a,p),t=cross(delta,v)/D,s=cross(delta,u)/D;
  if(s>=-1e-5&&s<=1+1e-5)roots.push(t);
 }
 roots.sort((x,y)=>x-y);
 const distinct=roots.filter((x,i)=>i===0||Math.abs(x-roots[i-1])>.01);
 return distinct.length>=2?[distinct[0],distinct[distinct.length-1]]:null;
}
function pickShape(mid,u){
 const candidates=shapes().map((shape,index)=>{
  const range=section(shape,mid,u);
  if(!range||range[1]-range[0]<6)return null;
  const inside=within(mid,shape);
  const nearest=closestOnShape(mid,shape);
  const dist=nearest?.d??1e4;
  return {shape,index,score:(inside?0:1e4)+dist,range};
 }).filter(Boolean).sort((a,b)=>a.score-b.score);
 return candidates[0]&&candidates[0].score<1e4+26?candidates[0]:null;
}
function geometryPath(shape){
 if(shape.type==='circle')return '<circle cx="'+shape.x+'" cy="'+shape.y+'" r="'+shape.r+'"/>';
 const pts=polygon(shape);return pts?'<path d="M'+pts.map(p=>p.x+','+p.y).join(' L')+' Z"/>':'';
}
function pickCenterAndSection(p,axis,shape){
 const n={x:-axis.y,y:axis.x},point=add(p,mul(n,job?.normalOffset||0));
 const range=shape?section(shape,point,axis):null;
 if(!range)return null;
 const origin=add(point,mul(axis,range[0])),end=add(point,mul(axis,range[1]));
 return {start:origin,end,target:distance(origin,end)/SCALE,axis:point};
}
function recalc(){
 if(!job)return;
 const found=job.shape?pickCenterAndSection(job.center,job.u,job.shape):null;
 if(found&&found.target<=170){
  job.contact=found;job.fixed=found.start;
  job.open=clamp(job.open,found.target,170);
 }else{
  job.contact=null;
  job.fixed=add(add(job.center,mul(job.n,job.normalOffset)),mul(job.u,-job.length/2));
  job.open=clamp(job.open,0,170);
 }
}
function begin(){
 if(!A||!B||distance(A,B)<15)return;
 const len=distance(A,B),u=mul(sub(B,A),1/len),n={x:-u.y,y:u.x},center=mul(add(A,B),.5);
 const candidate=pickShape(center,u);
 job={center,u,n,length:len,shape:candidate?.shape||null,shapeIndex:candidate?.index??-1,
  normalOffset:0,fixed:A,open:clamp(len/SCALE+18,12,170),contact:null};
 recalc();
 if(job.contact)job.open=clamp(job.contact.target+20,job.contact.target,170);
 phase='enter';introStart=performance.now();
 tick();
}
function cancelAnimation(){if(introHandle)cancelAnimationFrame(introHandle);introHandle=0}
function tick(){
 cancelAnimation();
 if(phase!=='enter')return;
 render();
 if(performance.now()-introStart>=650){phase='active';render();return}
 introHandle=requestAnimationFrame(tick);
}
function resetPlacement(){
 cancelAnimation();A=null;B=null;pointer=null;job=null;phase='first';drag=null;render();
}
function sync(){
 const show=visible();
 root.hidden=!show;
 if(!show){phase='idle';cancelAnimation();drag=null;return}
 if(phase==='idle')resetPlacement();
 render();
}
function point(e){
 const q=svg.createSVGPoint();q.x=e.clientX;q.y=e.clientY;
 const mat=svg.getScreenCTM();
 return mat?q.matrixTransform(mat.inverse()):{x:0,y:0};
}
function pointerDown(e){
 if(!visible()||e.button!==0)return;
 const hit=e.target.closest('[data-gfc-drag]');
 if(hit&&job&&phase==='active'){
  e.preventDefault();e.stopPropagation();
  const kind=hit.dataset.gfcDrag,p=point(e);
  drag={pointer:e.pointerId,kind,point:p,offset:job.normalOffset,open:job.open,
   relative:dot(sub(p,job.fixed),job.u)-job.open*SCALE};
  try{svg.setPointerCapture(e.pointerId)}catch{}
  return;
 }
 if(phase!=='first'&&phase!=='second')return;
 e.preventDefault();e.stopPropagation();
 const p=snapped(point(e));
 if(phase==='first'){A=p;pointer=p;phase='second';render()}
 else {B=p;if(distance(A,B)<15){hint.textContent='Задай довший відрізок';return}begin()}
}
function pointerMove(e){
 if(!visible())return;
 const p=point(e);
 if(drag?.pointer===e.pointerId&&job){
  e.preventDefault();
  if(drag.kind==='jaw'){
   const value=(dot(sub(p,job.fixed),job.u)-drag.relative)/SCALE;
   const prev=job.open;
   job.open=Math.round(clamp(value,job.contact?.target??0,170)*10)/10;
   if(prev>(job.contact?.target??-1)+.15&&job.contact&&job.open<=job.contact.target+.15)contactPulse=performance.now();
  }else if(drag.kind==='slide'){
   const delta=dot(sub(p,drag.point),job.n);
   job.normalOffset=clamp(drag.offset+delta,-130,130);
   const was=job.open;
   recalc();
   if(job.contact&&was<job.contact.target)contactPulse=performance.now();
  }
  render();return;
 }
 if(phase==='second'){pointer=p;render()}
}
function pointerUp(e){
 if(!drag||drag.pointer!==e.pointerId)return;
 drag=null;
 try{svg.releasePointerCapture(e.pointerId)}catch{}
 render();
}
const styleNumber=n=>Math.round(n*100)/100;
function P(p){return styleNumber(p.x)+' '+styleNumber(p.y)}
function circle(p,r,cls){return '<circle cx="'+p.x+'" cy="'+p.y+'" r="'+r+'" class="'+cls+'"/>'}
function measureMarks(){
 const marks=[];
 for(let i=0;i<=170;i++){
  const x=i*SCALE;
  const major=i%10===0,minor=i%5===0;
  marks.push('<line x1="'+x+'" y1="4" x2="'+x+'" y2="'+(major?19:minor?15:10)+'" class="gfc-tick"/>');
  if(major)marks.push('<text x="'+x+'" y="32" class="gfc-mark">'+i+'</text>');
 }
 return marks.join('');
}
function drawingSVG(){
 if(phase==='first')return '';
 if(phase==='second'){
  const b=snapped(pointer||A);
  return '<g class="gfc-guides">'+circle(A,5,'gfc-dot')+
   '<path d="M'+P(A)+' L'+P(b)+'" class="gfc-guide"/>'+
   circle(b,4,'gfc-dot')+
   '<text x="'+(A.x+11)+'" y="'+(A.y-11)+'">A</text>'+
   '<text x="'+(b.x+11)+'" y="'+(b.y-11)+'">B</text></g>';
 }
 if(!job)return '';
 const u=job.u,n=job.n,dir=Math.atan2(u.y,u.x)*180/Math.PI;
 const touch=!!job.contact,contactNow=touch&&job.open<=job.contact.target+.16;
 const near=touch&&job.open-job.contact.target<8;
 const remaining=phase==='enter'?Math.max(0,1-(performance.now()-introStart)/650):0;
 const progress=1-Math.pow(remaining,3);
 const position=add(job.fixed,mul(n,-64*remaining));
 const scale= .94+.06*progress;
 const activeTip=add(job.fixed,mul(u,job.open*SCALE));
 let highlight='';
 if(job.shape&&(near||contactNow)){
  const a=job.contact?.start,b=job.contact?.end;
  const c=job.shape.type==='circle'?'circle':'path';
  const outline=geometryPath(job.shape);
  highlight='<g class="gfc-contour '+(contactNow?'gfc-contact':'gfc-near')+'">'+outline+'</g>';
  if(a&&b){
   const r=contactNow?9:6;
   highlight+='<g class="gfc-points">'+circle(a,r,'gfc-contact-ring')+circle(b,r,'gfc-contact-ring')+
    circle(a,3.2,'gfc-contact-core')+circle(b,3.2,'gfc-contact-core')+'</g>';
  }
 }
 const selection='<g class="gfc-guides">'+
  '<path d="M'+P(A)+' L'+P(B)+'" class="gfc-original-axis"/>'+
  circle(A,4,'gfc-dot')+circle(B,4,'gfc-dot')+
  '</g>';
 const base='translate('+styleNumber(position.x)+' '+styleNumber(position.y)+') rotate('+styleNumber(dir)+') scale('+scale+')';
 const slider=job.open*SCALE;
 const carriage='<g transform="translate('+slider+' 0)" class="gfc-moving">'+
  '<path d="M0 0V-53H-14V-15H-33V5" class="gfc-jaw-shadow"/>'+
  '<path d="M0 0V-53H-14V-15H-33V5" class="gfc-jaw-metal"/>'+
  '<rect x="-13" y="25" width="56" height="47" rx="3" class="gfc-carriage"/>'+
  '<rect x="-12" y="26" width="54" height="6" rx="2" class="gfc-highlight"/>'+
  Array.from({length:11},(_,i)=>'<line x1="'+(i*2.7)+'" x2="'+(i*2.7)+'" y1="44" y2="'+(i%5===0?58:52)+'" class="gfc-vernier-tick"/>').join('')+
  '<circle cx="15" cy="82" r="12" class="gfc-thumb"/><circle cx="15" cy="82" r="4" class="gfc-thumb-hub"/>'+
  '<circle cx="15" cy="82" r="28" class="gfc-grab" data-gfc-drag="jaw" aria-label="Пересунути рухому губку" role="slider" tabindex="0" aria-valuemin="'+fmt(job.contact?.target||0)+'" aria-valuemax="170" aria-valuenow="'+fmt(job.open)+'"/>'+
  '</g>';
 const rail='<rect x="-37" y="-7" width="560" height="49" rx="4" class="gfc-rail"/>'+
  '<rect x="-35" y="-5" width="555" height="4" class="gfc-highlight"/>'+
  '<path d="M0 0V-53H14V-15H33V5" class="gfc-jaw-shadow"/>'+
  '<path d="M0 0V-53H14V-15H33V5" class="gfc-jaw-metal"/>'+
  '<g class="gfc-scale">'+measureMarks()+'</g>';
 const drift='<rect x="-40" y="-9" width="558" height="18" rx="7" class="gfc-body-grab" data-gfc-drag="slide" aria-label="Зсунути штангенциркуль поперек осі"/>';
 let guideLabel=phase==='enter'?'УСТАНОВЛЕННЯ':contactNow?'● КОНТАКТ':near?'◌ НАБЛИЖЕННЯ':'⇆ ЗВЕДИ ГУБКИ';
 if(!touch)guideLabel='ВІДРІЗОК · БЕЗ КОНТУРУ';
 const msg='<g class="gfc-status"><text x="'+Math.max(60,job.center.x)+'" y="'+Math.max(72,job.center.y-112)+'">'+guideLabel+'</text></g>';
 return selection+highlight+
  '<g class="gfc-instrument'+(contactNow?' gfc-locked':'')+'" transform="'+base+'" opacity="'+progress+'">'+
  rail+carriage+drift+'</g>'+msg;
}
function render(){
 if(!visible()){root.hidden=true;return}
 root.hidden=false;
 root.dataset.phase=phase;
 svg.classList.toggle('gfc-picking',phase==='first'||phase==='second');
 svg.innerHTML=drawingSVG();
 const message=phase==='first'?'Штангенциркуль · натисни точку A':
  phase==='second'?'Вкажи точку B — напрям і розмір':
  phase==='enter'?'Встановлюю штангенциркуль на AB…':
  'Перетягни ролик — губки. Потягни штангу — зміщення поперек осі.';
 hint.textContent=message;
 reset.hidden=phase==='first'||phase==='idle';
}
svg.addEventListener('pointerdown',pointerDown);
svg.addEventListener('pointermove',pointerMove);
svg.addEventListener('pointerup',pointerUp);
svg.addEventListener('pointercancel',pointerUp);
svg.addEventListener('pointerleave',()=>{if(phase==='second'){pointer=A;render()}});
svg.addEventListener('keydown',e=>{
 if(e.target?.dataset?.gfcDrag!=='jaw'||!job||!['ArrowLeft','ArrowRight'].includes(e.key))return;
 e.preventDefault();
 const d=e.key==='ArrowLeft'?-0.1:0.1;
 job.open=Math.round(clamp(job.open+d,job.contact?.target??0,170)*10)/10;
 render();svg.querySelector('[data-gfc-drag="jaw"]')?.focus({preventScroll:true});
});
reset.addEventListener('click',resetPlacement);
document.addEventListener('keydown',e=>{
 if(!visible()||e.key!=='Escape')return;
 if(phase==='second'){A=null;phase='first'}
 else if(job){job=null;A=null;B=null;phase='first'}
 else return;
 drag=null;cancelAnimation();render();e.preventDefault();
},true);
document.addEventListener('gnss:draft-state',e=>{
 const next=e.detail||{};mode=next.mode||mode;tool=next.tool||tool;sync();
});
const observer=new MutationObserver(()=>sync());
observer.observe(document.body,{attributes:true,attributeFilter:['class']});
document.dispatchEvent(new CustomEvent('gnss:request-draft-state'));
sync();
window.GNSSFreeCaliper={
 get phase(){return phase},get active(){return visible()},
 get measurement(){return job?{opening:job.open,contact:!!job.contact&&job.open<=job.contact.target+.16,
  target:job.contact?.target??null,angle:Math.atan2(job.u.y,job.u.x),offset:job.normalOffset}:null},
 reset:resetPlacement,
 geometry:{section,polygon,closestOnShape,pickShape}
};
})();