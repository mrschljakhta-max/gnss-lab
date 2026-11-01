/* GNSS LAB / Mechanical 180° protractor.
 * Uses the real saved geometry: choose an existing ray endpoint, move the
 * second ray to read its live angle, click to commit one undoable drawing.
 */
(function(){
'use strict';
const board=document.getElementById('engBoard');
const drawing=document.getElementById('engSvg');
if(!board||!drawing)return;
const NS='http://www.w3.org/2000/svg',MIN_LINE=25,PI=Math.PI;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const unit=(a,b)=>({x:b.x-a.x,y:b.y-a.y});
const len=v=>Math.hypot(v.x,v.y);
const degrees=(a,b)=>Math.abs(Math.atan2(a.x*b.y-a.y*b.x,a.x*b.x+a.y*b.y))*180/PI;
const fmt=n=>(Math.round(n*10)/10).toLocaleString('uk-UA',{maximumFractionDigits:1});
const textEscape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const root=document.createElement('div');root.id='gnssProtractor';root.hidden=true;
root.innerHTML='<svg id="gnssProtractorSvg" xmlns="'+NS+'" viewBox="0 0 1200 660" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Побудова кута транспортиром. Вкажіть вершину на наявному відрізку та другий промінь."></svg>'+
 '<div id="gnssProtractorHint" role="status" aria-live="polite"></div>'+
 '<button type="button" id="gnssProtractorReset" hidden title="Змінити вершину">↶ Інша вершина</button>';
board.append(root);
const svg=root.querySelector('#gnssProtractorSvg'),hint=root.querySelector('#gnssProtractorHint'),
 reset=root.querySelector('#gnssProtractorReset');
let tool='line',mode='demo',selected=null,hover=null,cursor=null,feedback='';
let lastFeedbackAt=0;
function active(){return tool==='protractor'&&mode==='explore'&&!document.body.classList.contains('lab01-route')}
function records(){return Array.isArray(window.GNSSPublishedShapes)?window.GNSSPublishedShapes:[]}
function edges(){
 const all=[];
 const append=(a,b,type,idx)=>{
  if(![a.x,a.y,b.x,b.y].every(Number.isFinite)||distance(a,b)<1)return;
  all.push({a,b,type,idx});
 };
 records().forEach((s,index)=>{
  if(s.type==='line')append({x:s.x1,y:s.y1},{x:s.x2,y:s.y2},'line',index);
  else{
   let vertices=null;
   if(s.type==='rect')vertices=[{x:s.x,y:s.y},{x:s.x+s.w,y:s.y},
      {x:s.x+s.w,y:s.y+s.h},{x:s.x,y:s.y+s.h}];
   if(s.type==='triangle')vertices=Array.isArray(s.vertices)&&s.vertices.length===3?
      s.vertices:[{x:s.x+s.w/2,y:s.y},{x:s.x+s.w,y:s.y+s.h},{x:s.x,y:s.y+s.h}];
   if(vertices)vertices.forEach((v,i)=>append(v,vertices[(i+1)%vertices.length],s.type,index));
  }
 });
 return all;
}
function scale(){
 const m=drawing.getScreenCTM?.();
 const factor=m?Math.hypot(m.a,m.b):1;
 return Number.isFinite(factor)&&factor>.001?factor:1;
}
function anchorAt(p){
 const threshold=18/scale();let found=null,best=threshold;
 for(const edge of edges()){
  for(const [origin,other] of [[edge.a,edge.b],[edge.b,edge.a]]){
   const d=distance(origin,p);
   // Priority for a standalone segment at a shared vertex; otherwise
   // remain deterministic and avoid jumping between baselines on hover.
   const rank=d+(edge.type==='line'?0:.45);
   if(rank<best){best=rank;found={origin:{...origin},base:{...other},edge}}
  }
 }
 return found;
}
function point(e){
 const p=drawing.createSVGPoint();p.x=e.clientX;p.y=e.clientY;
 const m=drawing.getScreenCTM();
 const q=m?p.matrixTransform(m.inverse()):{x:0,y:0};
 return {x:clamp(q.x,18,1182),y:clamp(q.y,18,642)};
}
function snapEndpoint(p){
 let best=p,d=14/scale();
 for(const edge of edges()){
  for(const v of [edge.a,edge.b]){
   const vdist=distance(p,v);
   if(vdist<d){d=vdist;best=v}
  }
 }
 return {x:best.x,y:best.y};
}
function readAngle(){
 if(!selected||!cursor)return null;
 const base=unit(selected.origin,selected.base);
 const ray=unit(selected.origin,cursor);
 if(len(ray)<.001)return null;
 const signed=Math.atan2(base.x*ray.y-base.y*ray.x,base.x*ray.x+base.y*ray.y);
 return {signed,degrees:Math.abs(signed)*180/PI,base,ray};
}
function circleArc(r,from,to,sweep){
 const ax=r*Math.cos(from),ay=r*Math.sin(from);
 const bx=r*Math.cos(to),by=r*Math.sin(to);
 return 'M '+ax+' '+ay+' A '+r+' '+r+' 0 0 '+sweep+' '+bx+' '+by;
}
function graduations(side){
 return Array.from({length:181},(_,i)=>{
  const t=i*PI/180,r=i%10===0?116:i%5===0?120:125;
  const x1=r*Math.cos(t),y1=r*Math.sin(t),x2=134*Math.cos(t),y2=134*Math.sin(t);
  let fragment='<line x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'" class="'+(i%10===0?'gpr-tick-major':'gpr-tick')+'"/>';
  if(i%15===0){
   const lr=98,x=lr*Math.cos(t),y=lr*Math.sin(t);
   // The arc flips to either side of AB, but the engraved degree numbers
   // always remain upright on the screen.
   fragment+='<text transform="translate('+x+' '+y+') scale(1 '+side+')" x="0" y="0" class="gpr-graduation">'+i+'°</text>';
  }
  return fragment;
 }).join('');
}
function protractorImage(){
 const origin=selected.origin;
 const base=unit(origin,selected.base),orientation=Math.atan2(base.y,base.x)*180/PI;
 const reading=readAngle(),side=reading&&reading.signed<0?-1:1;
 return '<g transform="translate('+origin.x+' '+origin.y+') rotate('+orientation+') scale(1 '+side+')">'+
   '<path d="M-136 0 L136 0 A136 136 0 0 1 -136 0Z" class="gpr-body"/>'+
   '<path d="M-136 0 A136 136 0 0 1 136 0" class="gpr-outer-edge"/>'+
   '<path d="M-76 0 A76 76 0 0 1 76 0" class="gpr-inner-ring"/>'+
   '<line x1="-139" y1="0" x2="139" y2="0" class="gpr-base-line"/>'+
   graduations(side)+
   '<circle cx="0" cy="0" r="10" class="gpr-center-halo"/>'+
   '<circle cx="0" cy="0" r="3" class="gpr-center-dot"/>'+
   '</g>';
}
function preview(){
 if(!selected){
  return hover?
   '<circle cx="'+hover.origin.x+'" cy="'+hover.origin.y+'" r="15" class="gpr-hover"/>'+
   '<circle cx="'+hover.origin.x+'" cy="'+hover.origin.y+'" r="4" class="gpr-hover-dot"/>':'';
 }
 const {origin,base}=selected;
 const ray=cursor||origin,reading=readAngle();
 let output=protractorImage();
 output+='<path d="M'+origin.x+' '+origin.y+' L'+base.x+' '+base.y+'" class="gpr-existing-ray"/>';
 output+='<path d="M'+origin.x+' '+origin.y+' L'+ray.x+' '+ray.y+'" class="gpr-new-ray"/>';
 output+='<circle cx="'+origin.x+'" cy="'+origin.y+'" r="5" class="gpr-apex"/>';
 output+='<circle cx="'+ray.x+'" cy="'+ray.y+'" r="6" class="gpr-tip"/>';
 if(reading&&len(reading.ray)>12){
  const start=Math.atan2(reading.base.y,reading.base.x),end=start+reading.signed,rad=65;
  const ax=origin.x+rad*Math.cos(start),ay=origin.y+rad*Math.sin(start);
  const bx=origin.x+rad*Math.cos(end),by=origin.y+rad*Math.sin(end);
  output+='<path d="M '+ax+' '+ay+' A '+rad+' '+rad+' 0 0 '+(reading.signed>=0?1:0)+' '+bx+' '+by+'" class="gpr-live-arc"/>';
  const angle=start+reading.signed/2;
  const x=clamp(origin.x+190*Math.cos(angle),90,1110);
  const y=clamp(origin.y+190*Math.sin(angle),58,610);
  output+='<g class="gpr-angle-card" transform="translate('+x+' '+y+')">'+
     '<rect x="-53" y="-28" width="106" height="43" rx="7"/>'+
     '<text x="0" y="0">'+fmt(reading.degrees)+'°</text></g>';
 }
 return output;
}
function draw(){
 root.hidden=!active();
 if(!active())return;
 svg.innerHTML=preview();
 reset.hidden=!selected;
 hint.textContent=feedback||(!records().length?'Спершу накресли відрізок, а потім вибери транспортир.':
   !selected?'Транспортир · обери кінець уже намальованого відрізка.':
   'Веди курсор — кут змінюється наживо. Клікни, щоб зафіксувати другий промінь.');
 root.dataset.phase=selected?'drawing':'select';
}
function resetSelection(){
 selected=null;hover=null;cursor=null;feedback='';draw();
}
function sync(){
 if(!active()){selected=null;hover=null;cursor=null;root.hidden=true;return}
 draw();
}
function notify(message){
 feedback=message;
 lastFeedbackAt=performance.now();
 draw();
}
function moved(e){
 if(!active())return;
 const p=point(e);
 if(selected){
  cursor=snapEndpoint(p);
  feedback='';draw();
 }else{
  const next=anchorAt(p);
  if((!next&&!hover)||(next&&hover&&next.origin.x===hover.origin.x&&next.origin.y===hover.origin.y))return;
  hover=next;feedback='';draw();
 }
}
function clicked(e){
 if(!active()||e.button!==0)return;
 e.preventDefault();e.stopPropagation();
 const p=point(e);
 if(!selected){
  const picked=anchorAt(p);
  if(!picked){notify('Натисни кінець існуючого відрізка — це буде вершина кута.');return}
  selected=picked;hover=null;cursor=selected.origin;feedback='';draw();
  return;
 }
 const endpoint=snapEndpoint(p),d=distance(selected.origin,endpoint);
 const ray=unit(selected.origin,endpoint),base=unit(selected.origin,selected.base);
 const angle=degrees(base,ray);
 if(d<MIN_LINE){notify('Проведи другий промінь хоча б на 25 одиниць креслення.');return}
 if(angle<.2){notify('Напрям збігається з першим відрізком — зміни кут.');return}
 const detail={shape:{type:'line',
  x1:selected.origin.x,y1:selected.origin.y,x2:endpoint.x,y2:endpoint.y,
  angleFrom:{x:selected.base.x,y:selected.base.y}},accepted:false};
 document.dispatchEvent(new CustomEvent('gnss:protractor-commit',{detail}));
 if(detail.accepted){
  // Keep the new ray and measured angle on the blueprint; ready for another.
  resetSelection();
 }else notify('Не вдалося зафіксувати кут — перевір обрані точки.');
}
svg.addEventListener('pointermove',moved);
svg.addEventListener('pointerdown',clicked);
svg.addEventListener('pointerleave',()=>{
 if(!selected){hover=null;draw()}
});
reset.addEventListener('click',resetSelection);
document.addEventListener('keydown',e=>{
 if(!active()||e.key!=='Escape')return;
 if(selected){resetSelection();e.preventDefault()}
},true);
document.addEventListener('gnss:draft-state',e=>{
 const state=e.detail||{};mode=state.mode||mode;tool=state.tool||tool;sync();
});
document.addEventListener('gnss:request-protractor-state',draw);
document.dispatchEvent(new CustomEvent('gnss:request-draft-state'));
sync();
window.GNSSProtractor={get active(){return active()},get selected(){return selected},
 reset:resetSelection,geometry:{edges,anchorAt,readAngle}};
})();
