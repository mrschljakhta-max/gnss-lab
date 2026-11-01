/* GNSS LAB / Engineering drafting workbench — zero-dependency, interactive lesson 01.
   Fixed orthographic 2D drawing surface, designed for an eventual Three.js object stage.
   Keeps the other eight lessons and the existing expedition modes intact. */
(function(){
'use strict';
const ns='http://www.w3.org/2000/svg';
const qs=(s,root=document)=>root.querySelector(s);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const snap=v=>Math.round(v/10)*10;
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const rect={x:300,y:208,w:420,h:240}; // 140 x 80 mm at 3 SVG units / mm
const circle={x:912,y:330,r:96}; // Ø 64 mm
const names=['Лінійка','Лінія','Циркуль','Штангенциркуль','Гумка'];
const icons=['▤','╱','◉','⊣','▱'];
const ids=['ruler','line','compass','caliper','eraser'];
const key='gnss-lab-draft-v1';
const state={mode:'demo',tool:'line',measureUnit:'mm',layerGrid:true,layerGuide:true,layerDrawing:true,pending:null,
 records:[],history:[],future:[],pointer:null,snapHover:null,measure:null,ruler:{x:72,y:124,angle:0},stage:0,segment:0,
 saved:0,demoStart:0,demoPlaying:true,lastMode:null,complete:false,hasTouch:false,status:'',scale:3};
try{state.saved=clamp(Number(localStorage.getItem(key))||0,0,3)}catch{}
const container=document.createElement('section');
container.id='engWorkspace';container.setAttribute('aria-label','Інтерактивний креслярський стіл');
container.innerHTML=`
  <div class="eng-board" id="engBoard">
    <div class="eng-paper" id="engPaper">
      <svg class="eng-geometry" id="engSvg" xmlns="${ns}" viewBox="0 0 1200 660" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Синій креслярський аркуш. Оберіть інструмент і працюйте безпосередньо на поверхні."></svg>
    </div>
    <div id="engReadout" class="eng-readout" aria-live="polite">140 мм</div>
    <div class="eng-command" id="engCommand">
      <button type="button" data-cmd="replay" title="Повторити" aria-label="Повторити">↻</button>
      <button type="button" data-cmd="play" title="Відтворення або пауза" aria-label="Пауза / відтворення">▶</button>
      <button type="button" data-cmd="next" title="Наступний крок" aria-label="Наступний крок">→</button>
    </div>
    <div class="eng-topline" id="engStatus" aria-live="polite"></div>
    <div class="eng-stamp">GNSS LAB / DRAFTING 01</div>
    <div class="eng-demo-label" id="engStepNote">A3 · SCALE 1:1</div>
  </div>
  <aside class="eng-right" aria-label="Інструменти перегляду й шари">
    <div class="eng-rail eng-rail-view"><button type="button" class="eng-active" data-view="blueprint" title="Креслення">▣</button><button type="button" data-view="objects" title="Об'єкти">⬡</button></div>
    <div class="eng-rail eng-rail-layers"><div class="eng-rail-title">ШАРИ</div>
      <button type="button" class="eng-layer on" data-layer="Drawing" aria-pressed="true"><span>◉ Контур</span><span class="led"></span></button>
      <button type="button" class="eng-layer on" data-layer="Guide" aria-pressed="true"><span>◉ Розмітка</span><span class="led"></span></button>
      <button type="button" class="eng-layer on" data-layer="Grid" aria-pressed="true"><span>◉ Сітка</span><span class="led"></span></button>
    </div>
    <div class="eng-rail eng-history"><button type="button" data-cmd="undo" title="Скасувати" aria-label="Скасувати">↶</button><button type="button" data-cmd="redo" title="Повернути" aria-label="Повернути">↷</button><button type="button" data-cmd="clear" title="Очистити" aria-label="Очистити">♲</button><div class="eng-mini" aria-hidden="true"></div></div>
  </aside>
  <div class="eng-dock" aria-label="Інженерні інструменти">
    <div class="eng-tools" id="engTools">
      <button type="button" data-tool="ruler" title="Лінійка"><span class="eng-tool-icon">▤</span><small>Лінійка</small></button>
      <button type="button" data-tool="line" title="Провести відрізок"><span class="eng-tool-icon">╱</span><small>Лінія</small></button>
      <button type="button" data-tool="rectangle" title="Прямокутник: протягни діагональ, Ctrl — квадрат" aria-label="Прямокутник, Ctrl — квадрат"><span class="eng-tool-icon">▭</span><small>Прямокутник</small></button>
      <button type="button" data-tool="triangle" title="Трикутник: протягни діагональ, Ctrl — рівносторонній" aria-label="Трикутник, Ctrl — рівносторонній"><span class="eng-tool-icon">△</span><small>Трикутник</small></button>
      <button type="button" data-tool="compass" title="Накреслити коло"><span class="eng-tool-icon">◉</span><small>Циркуль</small></button>
      <button type="button" data-tool="protractor" title="Побудувати кут від існуючого відрізка" aria-label="Транспортир — обери вершину і напрям другого променя"><span class="eng-tool-icon">◠</span><small>Транспортир</small></button>
      <button type="button" data-tool="caliper" title="Виміряти фігуру: вкажи дві точки A і B" aria-label="Штангенциркуль — виміряти на цьому кресленні"><span class="eng-tool-icon">⊣</span><small>Штангенциркуль</small></button>
      <button type="button" data-tool="eraser" title="Видалити елемент"><span class="eng-tool-icon">⌫</span><small>Гумка</small></button>
      <span class="eng-divider"></span>
      <button type="button" data-tool="units" title="Перемкнути одиниці"><span class="eng-tool-icon" id="engUnitIcon">мм</span><small>Одиниці</small></button>
    </div>
    <button type="button" class="eng-confirm" id="engConfirm" disabled title="Підтвердити побудову" aria-label="Підтвердити побудову">✓</button>
  </div>`;
const main=qs('#main');if(!main)return;
main.append(container);
const svg=qs('#engSvg',container),paper=qs('#engPaper',container),board=qs('#engBoard',container);
const readout=qs('#engReadout',container),status=qs('#engStatus',container),confirm=qs('#engConfirm',container),tools=qs('#engTools',container);
const cmd=qs('#engCommand',container),right=qs('.eng-right',container),stepNote=qs('#engStepNote',container);
const svgEl=(tag,attr={},children=[])=>{const el=document.createElementNS(ns,tag);for(const [k,v] of Object.entries(attr))el.setAttribute(k,v);for(const child of children)el.append(child);return el};
const copyRecords=()=>state.records.map(r=>({...r}));
// Free-drafting shapes survive tool changes, lesson overlay visits and reloads.
const freeDrawingKey='gnss-lab-free-drawing-v1';
let lastFreeDrawingJSON=null;
function safeFreeShape(s){
 if(!s||typeof s!=='object')return null;
 const keys=s.type==='line'?['x1','y1','x2','y2']:
  s.type==='circle'?['x','y','r']:
  (s.type==='rect'||s.type==='triangle')?['x','y','w','h']:null;
 if(!keys||keys.some(k=>!Number.isFinite(s[k])||Math.abs(s[k])>10000))return null;
 if((s.type==='circle'&&s.r<=0)||((s.type==='rect'||s.type==='triangle')&&(s.w<=0||s.h<=0)))return null;
 const clean={type:s.type,...Object.fromEntries(keys.map(k=>[k,s[k]]))};
 if(s.type==='line'&&s.angleFrom&&Number.isFinite(s.angleFrom.x)&&Number.isFinite(s.angleFrom.y)&&
  Math.abs(s.angleFrom.x)<10000&&Math.abs(s.angleFrom.y)<10000)
  clean.angleFrom={x:s.angleFrom.x,y:s.angleFrom.y};
 if(s.type==='triangle'&&Array.isArray(s.vertices)&&s.vertices.length===3&&
    s.vertices.every(p=>Number.isFinite(p?.x)&&Number.isFinite(p?.y)&&Math.abs(p.x)<10000&&Math.abs(p.y)<10000))
  clean.vertices=s.vertices.map(p=>({x:p.x,y:p.y}));
 return clean;
}
function readFreeDrawing(){
 try{
  const v=JSON.parse(localStorage.getItem(freeDrawingKey)||'[]');
  return Array.isArray(v)?v.slice(0,300).map(safeFreeShape).filter(Boolean):[];
 }catch{return []}
}
function persistFreeDrawing(){
 if(state.mode!=='explore')return;
 const json=JSON.stringify(state.records.map(safeFreeShape).filter(Boolean));
 if(json===lastFreeDrawingJSON)return;
 lastFreeDrawingJSON=json;
 try{localStorage.setItem(freeDrawingKey,json)}catch{}
}
function snapshot(){return {records:copyRecords(),stage:state.stage,segment:state.segment,saved:state.saved,tool:state.tool,measure:state.measure,complete:state.complete}}
function restoreSnapshot(s){state.records=s.records.map(r=>({...r}));state.stage=s.stage;state.segment=s.segment;state.saved=s.saved;state.tool=s.tool;state.measure=s.measure;state.complete=s.complete;save()}
function saveHistory(){state.history.push(snapshot());if(state.history.length>60)state.history.shift();state.future=[]}
function toast(val){state.status=val;drawHUD();setTimeout(()=>{if(state.status===val){state.status='';drawHUD()}},1450)}
function mode(){return document.body.dataset.expMode||'demo'}
function lesson(){try{return typeof active==='number'?active:0}catch{return 0}}
function setMode(next){
 if(next===state.lastMode)return;
 state.lastMode=next;state.mode=next;state.pointer=null;state.snapHover=null;state.pending=null;state.measure=null;state.status='';state.history=[];state.future=[];state.complete=false;
 if(next==='demo'){state.demoStart=performance.now();state.demoPlaying=true;state.stage=0}
 if(next==='quest'){state.stage=state.saved;state.segment=state.stage===0?0:4;state.tool=state.stage===1?'compass':state.stage===2?'ruler':'line';state.records=[];
  if(state.stage>=1)state.records.push(...expectedLines());
  if(state.stage>=2)state.records.push({type:'circle',x:circle.x,y:circle.y,r:circle.r});
 }
 if(next==='explore'){
  state.stage=0;state.tool='line';state.records=readFreeDrawing();
  state.history=[];state.future=[];lastFreeDrawingJSON=null;
 }
 draw();
}
function expectedLines(){const x=rect.x,y=rect.y,w=rect.w,h=rect.h;return [
 {type:'line',x1:x,y1:y,x2:x+w,y2:y}, {type:'line',x1:x+w,y1:y,x2:x+w,y2:y+h},
 {type:'line',x1:x+w,y1:y+h,x2:x,y2:y+h},{type:'line',x1:x,y1:y+h,x2:x,y2:y}];}
function pt(e){const p=svg.createSVGPoint();p.x=e.clientX;p.y=e.clientY;const tr=svg.getScreenCTM();return tr?p.matrixTransform(tr.inverse()):{x:0,y:0}}
function validLine(a,b){if(dist(a,b)<25)return false;return true}
// One continuous diagonal drag; Ctrl constrains both sides to the same length.
function rectPoint(p){
 return {x:clamp(Math.round(p.x/state.scale)*state.scale,18,1182),
  y:clamp(Math.round(p.y/state.scale)*state.scale,18,642)};
}
// Magnetic snap to already-drawn, real geometry vertices.
// The hit radius is in on-screen pixels and remains consistent on resize.
function snapVertices(){
 const list=[];
 const put=(x,y,source,kind)=>{
  if(Number.isFinite(x)&&Number.isFinite(y))list.push({x,y,source,kind});
 };
 if(!state.layerDrawing)return list;
 state.records.forEach((s,i)=>{
  if(s.type==='line'){
   put(s.x1,s.y1,i,'Кінець відрізка');put(s.x2,s.y2,i,'Кінець відрізка');
  }else if(s.type==='rect'){
   put(s.x,s.y,i,'Вершина');put(s.x+s.w,s.y,i,'Вершина');
   put(s.x+s.w,s.y+s.h,i,'Вершина');put(s.x,s.y+s.h,i,'Вершина');
  }else if(s.type==='triangle'){
   triangleVertices(s).forEach(p=>put(p.x,p.y,i,'Вершина'));
  }else if(s.type==='circle'){
   put(s.x,s.y,i,'Центр кола');
  }
 });
 return list;
}
function snapEnabled(){
 return state.mode==='explore'&&state.layerDrawing&&
  ['line','rectangle','triangle','compass'].includes(state.tool);
}
function nearestSnap(p){
 if(!snapEnabled()||!Number.isFinite(p?.x)||!Number.isFinite(p?.y))return null;
 const tr=svg.getScreenCTM?.();
 const scale=tr?Math.hypot(tr.a,tr.b):1;
 const limit=16/(Number.isFinite(scale)&&scale>0?scale:1);
 let found=null,best=limit;
 for(const v of snapVertices()){
  const d=dist(p,v);
  if(d<best){best=d;found=v}
 }
 return found;
}
function drawingPoint(p,grid='fine'){
 const vertex=nearestSnap(p);
 if(vertex)return {x:vertex.x,y:vertex.y};
 if(grid==='line')return {x:snap(p.x),y:snap(p.y)};
 if(grid==='circle')return {x:snap(p.x),y:snap(p.y)};
 return rectPoint(p);
}
function paintSnap(){
 const layer=svg.querySelector('.eng-snap-layer');
 if(!layer)return;
 layer.replaceChildren();
 const a=state.snapHover;
 if(!a||!snapEnabled())return;
 const ring=svgEl('circle',{cx:a.x,cy:a.y,r:15,class:'eng-snap-ring'});
 const dot=svgEl('circle',{cx:a.x,cy:a.y,r:4,class:'eng-snap-dot'});
 layer.append(ring,dot);
 // Keep the marker visible on the blueprint without obscuring the vertex.
 const label=svgEl('text',{x:a.x+19,y:a.y-12,class:'eng-snap-label'});
 label.textContent='● '+a.kind;
 layer.append(label);
}
function hoverSnap(p){
 const a=nearestSnap(p);
 const old=state.snapHover;
 if(!a&& !old)return;
 if(a&&old&&a.x===old.x&&a.y===old.y&&a.kind===old.kind)return;
 state.snapHover=a;paintSnap();
}
function rectFromDiagonal(a,b,lockSquare=false){
 let dx=b.x-a.x,dy=b.y-a.y;
 if(lockSquare){
  const side=Math.min(Math.abs(dx),Math.abs(dy));
  dx=(Math.sign(dx)||1)*side;
  dy=(Math.sign(dy)||1)*side;
 }
 return {type:'rect',x:Math.min(a.x,a.x+dx),y:Math.min(a.y,a.y+dy),
  w:Math.abs(dx),h:Math.abs(dy)};
}
function triangleFromDiagonal(a,b,equilateral=false){
 let dx=b.x-a.x,dy=b.y-a.y;
 if(equilateral){
  // Fit the exact 60° triangle within the dragged bounds.
  const width=Math.min(Math.abs(dx),Math.abs(dy)*2/Math.sqrt(3));
  dx=(Math.sign(dx)||1)*width;
  dy=(Math.sign(dy)||1)*width*Math.sqrt(3)/2;
 }
 const x=Math.min(a.x,a.x+dx),y=Math.min(a.y,a.y+dy);
 return {type:'triangle',x,y,w:Math.abs(dx),h:Math.abs(dy)};
}
function triangleVertices(shape){
 if(Array.isArray(shape.vertices)&&shape.vertices.length===3)return shape.vertices;
 const {x,y,w,h}=shape;
 return [{x:x+w/2,y},{x:x+w,y:y+h},{x,y:y+h}];
}
// Reuse a saved segment as the precise base when both endpoints are snapped.
// For arbitrary angles the triangle stores three true points, not a false
// axis-aligned bounding triangle. The construction is equilateral.
function triangleFromExistingBase(a,b){
 const near=(p,q)=>dist(p,q)<1;
 const edge=state.records.find(sh=>sh.type==='line'&&(
  (near(a,{x:sh.x1,y:sh.y1})&&near(b,{x:sh.x2,y:sh.y2}))||
  (near(a,{x:sh.x2,y:sh.y2})&&near(b,{x:sh.x1,y:sh.y1}))
 ));
 if(!edge)return null;
 const len=dist(a,b);if(len<12)return null;
 const u={x:(b.x-a.x)/len,y:(b.y-a.y)/len};
 const normal={x:-u.y,y:u.x},mid={x:(a.x+b.x)/2,y:(a.y+b.y)/2};
 const h=len*Math.sqrt(3)/2;
 const candidates=[
  {x:mid.x+normal.x*h,y:mid.y+normal.y*h},
  {x:mid.x-normal.x*h,y:mid.y-normal.y*h}
 ];
 const clearance=p=>Math.min(p.x-18,1182-p.x,p.y-18,642-p.y);
 const apex=clearance(candidates[0])>=clearance(candidates[1])?candidates[0]:candidates[1];
 const vertices=[{...a},{...b},apex],xs=vertices.map(v=>v.x),ys=vertices.map(v=>v.y);
 return {type:'triangle',x:Math.min(...xs),y:Math.min(...ys),
  w:Math.max(...xs)-Math.min(...xs),h:Math.max(...ys)-Math.min(...ys),vertices};
}
function triangleEdges(shape){
 const pts=triangleVertices(shape);
 return pts.map((p,i)=>{
  const q=pts[(i+1)%pts.length];
  return {type:'line',x1:p.x,y1:p.y,x2:q.x,y2:q.y};
 });
}
function shapeEdges(shape){
 return shape.type==='rect'?rectEdges(shape):shape.type==='triangle'?triangleEdges(shape):[];
}
function rectEdges(shape){
 const {x,y,w,h}=shape;
 return [
  {type:'line',x1:x,y1:y,x2:x+w,y2:y},
  {type:'line',x1:x+w,y1:y,x2:x+w,y2:y+h},
  {type:'line',x1:x+w,y1:y+h,x2:x,y2:y+h},
  {type:'line',x1:x,y1:y+h,x2:x,y2:y}
 ];
}
function pointSegmentDistance(p,s){
 const dx=s.x2-s.x1,dy=s.y2-s.y1;
 const u=clamp(((p.x-s.x1)*dx+(p.y-s.y1)*dy)/Math.max(1,dx*dx+dy*dy),0,1);
 return dist(p,{x:s.x1+u*dx,y:s.y1+u*dy});
}
function fmt(num){const n=state.measureUnit==='cm'?num/10:num;return `${(Math.round(n*10)/10).toLocaleString('uk-UA')} ${state.measureUnit}`}
function currentLength(){if(state.pending){if(state.pending.type==='line')return dist({x:state.pending.x1,y:state.pending.y1},{x:state.pending.x2,y:state.pending.y2})/state.scale;if(state.pending.type==='circle')return state.pending.r*2/state.scale;if(state.pending.type==='rect'||state.pending.type==='triangle')return state.pending.w/state.scale}
 if(typeof state.measure==='number')return state.measure;
 if(state.mode==='quest'&&state.stage===1)return circle.r*2/state.scale;
 return rect.w/state.scale;
}
function selectedView(){return state.layerDrawing}
function addShape(root,shape,opts={}){
 if(!shape)return null;
 const cls=opts.preview?'eng-preview':opts.ghost?'eng-target':shape.type==='circle'?'shape-circle':'shape-line';
 const common={class:cls,'data-shape':opts.clickable?'1':undefined};
 delete common['data-shape'];
 let el;if(shape.type==='line')el=svgEl('line',{x1:shape.x1,y1:shape.y1,x2:shape.x2,y2:shape.y2,class:cls});
 else if(shape.type==='circle')el=svgEl('circle',{cx:shape.x,cy:shape.y,r:shape.r,class:cls});
 else if(shape.type==='rect')el=svgEl('rect',{x:shape.x,y:shape.y,width:shape.w,height:shape.h,class:cls});
 else if(shape.type==='triangle'){
  const pts=triangleVertices(shape);
  el=svgEl('polygon',{points:pts.map(p=>p.x+','+p.y).join(' '),class:cls});
 }
 else return null;
 root.append(el);return el;
}
function dimensionText(shape){
 if(shape.type==='triangle'&&shape.vertices){
  const pts=triangleVertices(shape);
  const base=dist(pts[0],pts[1])/state.scale;
  return fmt(base)+' · △';
 }
 if(shape.type==='rect'||shape.type==='triangle'){
  const divisor=state.measureUnit==='cm'?10:1;
  const number=v=>(Math.round(v/state.scale/divisor*10)/10).toLocaleString('uk-UA');
  return number(shape.w)+' × '+number(shape.h)+' '+(state.measureUnit==='cm'?'см':'мм');
 }
 if(shape.type==='line')return fmt(Math.hypot(shape.x2-shape.x1,shape.y2-shape.y1)/state.scale);
 return 'Ø '+fmt(shape.r*2/state.scale);
}
// The angle is stored with its new ray so the line, arc and label form one
// persistent, undoable measurement and remain linked to the common vertex.
function angleAnnotation(root,shape){
 if(shape?.type!=='line'||!shape.angleFrom)return;
 const origin={x:shape.x1,y:shape.y1};
 const a={x:shape.angleFrom.x-origin.x,y:shape.angleFrom.y-origin.y};
 const b={x:shape.x2-origin.x,y:shape.y2-origin.y};
 const al=Math.hypot(a.x,a.y),bl=Math.hypot(b.x,b.y);
 if(al<.01||bl<.01)return;
 const a0=Math.atan2(a.y,a.x);
 const turn=Math.atan2(a.x*b.y-a.y*b.x,a.x*b.x+a.y*b.y);
 const degrees=Math.abs(turn)*180/Math.PI;
 const radius=clamp(Math.min(al,bl)*.3,21,53);
 const start={x:origin.x+radius*Math.cos(a0),y:origin.y+radius*Math.sin(a0)};
 const end={x:origin.x+radius*Math.cos(a0+turn),y:origin.y+radius*Math.sin(a0+turn)};
 root.append(svgEl('path',{d:`M ${start.x} ${start.y} A ${radius} ${radius} 0 0 ${turn>=0?1:0} ${end.x} ${end.y}`,
  class:'eng-angle-arc','pointer-events':'none'}));
 const middle=a0+turn/2;
 const lx=origin.x+(radius+24)*Math.cos(middle);
 const ly=origin.y+(radius+24)*Math.sin(middle);
 const label=svgEl('text',{x:lx,y:ly,class:'eng-angle-label','text-anchor':'middle',
  'dominant-baseline':'central','pointer-events':'none'});
 label.textContent=(Math.round(degrees*10)/10).toLocaleString('uk-UA',{maximumFractionDigits:1})+'°';
 root.append(label);
}
function addDraftMeasure(root,shape,position){
 const fallback=shape.type==='triangle'
  ?shape.vertices
   ?{x:(shape.vertices[0].x+shape.vertices[1].x)/2,
     y:(shape.vertices[0].y+shape.vertices[1].y)/2+25}
   :{x:shape.x+shape.w/2,y:shape.y+shape.h+26}
  :shape.type==='rect'
  ?{x:shape.x+shape.w/2,y:shape.y<48?shape.y+shape.h+27:shape.y-18}
  :shape.type==='line'
  ?{x:(shape.x1+shape.x2)/2,y:(shape.y1+shape.y2)/2-29}
  :{x:shape.x,y:shape.y-shape.r-28};
 const p=position||fallback;
 const label=svgEl('text',{
  x:p.x,y:p.y,class:'eng-blueprint-label','text-anchor':'middle',
  'pointer-events':'none'
 });
 label.textContent=dimensionText(shape);
 root.append(label);return label;
}
function targetLine(){return expectedLines()[Math.min(state.segment,3)]}
function questGuide(root){
 if(state.mode!=='quest'||!state.layerGuide||state.stage>=3)return;
 if(state.stage===0){
  expectedLines().forEach((v,i)=>addShape(root,v,{ghost:true}));
  const l=targetLine();const overlay=svgEl('line',{x1:l.x1,y1:l.y1,x2:l.x2,y2:l.y2,class:'eng-focus'});root.append(overlay);
  root.append(svgEl('circle',{cx:l.x1,cy:l.y1,r:9,class:'eng-dot'}));
  root.append(svgEl('circle',{cx:l.x2,cy:l.y2,r:9,class:'eng-dot'}));
 }
 if(state.stage===1){root.append(svgEl('circle',{cx:circle.x,cy:circle.y,r:circle.r,class:'eng-focus'}));root.append(svgEl('circle',{cx:circle.x,cy:circle.y,r:8,class:'eng-dot'}))}
 if(state.stage===2){root.append(svgEl('line',{x1:rect.x,y1:rect.y+rect.h+35,x2:rect.x+rect.w,y2:rect.y+rect.h+35,class:'eng-focus'}));
  root.append(svgEl('circle',{cx:circle.x,cy:circle.y,r:circle.r,class:'eng-focus'}));}
}
function rulerShape(root){
 // Physical tools only appear during replay; no permanent paper ruler.
 return;
 if(state.mode==='demo'||state.tool==='ruler'||(state.mode==='quest'&&state.stage===2)){
  const grp=svgEl('g',{class:'eng-ruler',transform:`translate(${state.ruler.x} ${state.ruler.y}) rotate(${state.ruler.angle})`,'data-drag':'ruler'});
  grp.append(svgEl('rect',{x:0,y:-13,width:460,height:35,rx:4,fill:'#e5e9e1',stroke:'#829ba0','stroke-width':2,'data-drag':'ruler'}));
  for(let i=0;i<=140;i++){
    const x=i*3.2;const m=i%10===0;
    grp.append(svgEl('line',{x1:x,y1:-10,x2:x,y2:m?9:0,stroke:'#28545c','stroke-width':m?1.5:.6,'data-drag':'ruler'}));
    if(m&&i<=130){const t=svgEl('text',{x,y:18,'font-size':8,'font-family':'monospace',fill:'#34515c','text-anchor':'middle','data-drag':'ruler'});t.textContent=i;grp.append(t)}
  }
  root.append(grp);
 }
}
// Animated eraser owns a single record; it is not deleted until the last frame.
let eraserVisual=null;
const measureShapeLength=shape=>shape.type==='triangle'?
 triangleEdges(shape).reduce((n,e)=>n+Math.hypot(e.x2-e.x1,e.y2-e.y1),0):
 shape.type==='rect'?2*(shape.w+shape.h):
 shape.type==='circle'?Math.PI*2*shape.r:Math.hypot(shape.x2-shape.x1,shape.y2-shape.y1);
function applyEraserVisual(shape,path,label,visual){
 if(!visual||!path)return;
 const progress=clamp(visual.progress,0,1),L=measureShapeLength(shape);
 path.style.strokeDasharray=L+' '+(L+2);
 path.style.strokeDashoffset=String(-L*progress);
 // Rotating a circle changes the starting position of the wiped stroke,
 // without changing the saved geometry or the measured diameter.
 if(shape.type==='circle'&&visual.at){
  const a=Math.atan2(visual.at.y-shape.y,visual.at.x-shape.x);
  path.setAttribute('transform','rotate('+(a*180/Math.PI)+' '+shape.x+' '+shape.y+')');
 }
 if(label)label.style.opacity=String(clamp((.73-progress)/.45,0,1));
}
function updateEraserVisual(){
 if(!eraserVisual)return;
 const i=eraserVisual.index,shape=state.records[i];
 const path=svg.querySelector('[data-record-index="'+i+'"]');
 const label=svg.querySelector('[data-record-label="'+i+'"]');
 if(shape&&path)applyEraserVisual(shape,path,label,eraserVisual);
}
function recordAtPoint(p){
 let match=null,best=18;
 state.records.forEach((shape,index)=>{
  let d;
  if(shape.type==='circle')d=Math.abs(dist(p,shape)-shape.r);
  else if(shape.type==='rect'||shape.type==='triangle')d=Math.min(...shapeEdges(shape).map(edge=>pointSegmentDistance(p,edge)));
  else if(shape.type==='line')d=pointSegmentDistance(p,shape);
  else return;
  if(d<best){best=d;match={index,shape:{...shape},at:{...p}}}
 });
 return match;
}
function draw(){
 const layer=svgEl('g');svg.replaceChildren(layer);
 const guide=svgEl('g'),actual=svgEl('g');layer.append(guide,actual);
 if(state.layerGuide)questGuide(guide);
 const saved=state.layerDrawing?state.records:[];
 const measureShapes=state.pending?[...saved,state.pending]:[...saved];
 const measurePositions=window.GNSSDimensions?.layout(
  measureShapes.map(s=>s.type==='rect'
   ?{type:'line',x1:s.x,y1:s.y,x2:s.x+s.w,y2:s.y}
   :s.type==='triangle'
   ?s.vertices
    ?{type:'line',x1:s.vertices[0].x,y1:s.vertices[0].y,
      x2:s.vertices[1].x,y2:s.vertices[1].y}
    :{type:'line',x1:s.x,y1:s.y+s.h,x2:s.x+s.w,y2:s.y+s.h}:s),
  measureShapes.map(dimensionText),
  {font:13,obstacles:measureShapes.flatMap(shapeEdges)}
 )||[];
 window.GNSSPublishedShapes=saved.map(shape=>({...shape}));
 persistFreeDrawing();
 if(state.layerDrawing){
  saved.forEach((shape,i)=>{
   const path=addShape(actual,shape);
   const label=addDraftMeasure(actual,shape,measurePositions[i]);
   angleAnnotation(actual,shape);
   path.setAttribute('data-record-index',String(i));
   label.setAttribute('data-record-label',String(i));
   if(eraserVisual?.index===i)applyEraserVisual(shape,path,label,eraserVisual);
  });
 }
 if(state.pending){
  addShape(actual,state.pending,{preview:true});
  addDraftMeasure(actual,state.pending,measurePositions[measureShapes.length-1]);
 }
 actual.append(svgEl('g',{class:'eng-snap-layer','pointer-events':'none'}));
 paintSnap();
 if(state.mode==='demo')rulerShape(actual);
 else if(state.tool==='ruler'||(state.mode==='quest'&&state.stage===2))rulerShape(actual);
 if(state.mode==='quest'&&state.stage===2&&state.tool==='caliper'){
  actual.append(svgEl('path',{d:`M ${circle.x-circle.r-23} ${circle.y-16}v-28h15 M ${circle.x+circle.r+23} ${circle.y-16}v-28h-15 M ${circle.x-circle.r-23} ${circle.y-29}H ${circle.x+circle.r+23}`,stroke:'#ccf9e5',fill:'none','stroke-width':3}));
 }
 drawHUD();
}
let lastPublished='';
function publishDraftState(){
 const data={mode:state.mode,tool:state.tool,stage:state.stage,segment:state.segment,measure:state.measure,complete:state.complete};
 const k=JSON.stringify(data);
 if(k===lastPublished)return;
 lastPublished=k;
 document.dispatchEvent(new CustomEvent('gnss:draft-state',{detail:data}));
}
document.addEventListener('gnss:request-draft-state',()=>{lastPublished='';publishDraftState()});
function drawHUD(){
 const v=currentLength();readout.textContent=fmt(v);
 const lbl=qs('#engUnitIcon',container);if(lbl)lbl.textContent=state.measureUnit;
 const states=state.mode==='quest'?['▰ 140 × 80 мм','◯ Ø 64 мм','▤ 140 мм  /  ⊣ 64 мм','✓ 3/3']:[];
 const label=state.status||(state.mode==='demo'?'● '+['Прямокутник','Прямокутник','Прямокутник','Прямокутник','Коло'][Math.min(4,Math.floor((performance.now()-state.demoStart)/1400))]:
 state.mode==='quest'?['01 / '+states[0],'02 / '+states[1],'03 / '+states[2],'✓ Усі побудови'][state.stage]:'');
 status.replaceChildren();if(label){const chip=document.createElement('span');chip.textContent=label;if(state.complete||state.stage>=3)chip.className='eng-success';status.append(chip)}
 confirm.disabled=state.mode==='demo'||!state.pending;
 tools.querySelectorAll('[data-tool]').forEach(b=>b.classList.toggle('eng-selected',b.dataset.tool===state.tool));
 const play=cmd.querySelector('[data-cmd="play"]');play.textContent=state.demoPlaying?'Ⅱ':'▶';
 cmd.style.display=state.mode==='demo'?'flex':'none';
 const unit=qs('[data-tool="units"]',tools);unit.classList.toggle('eng-selected',state.tool==='units');
 right.querySelectorAll('[data-layer]').forEach(b=>{const v=state['layer'+b.dataset.layer];b.classList.toggle('off',!v);b.classList.toggle('on',!!v);b.setAttribute('aria-pressed',String(v))});
 paper.style.backgroundImage=state.layerGrid?"url('./assets/blueprint-paper.svg')":'none';
 stepNote.textContent=state.mode==='quest'?`${Math.min(3,state.stage+1)} / 3`:'A3 · SCALE 1:1';
 publishDraftState();
}
function checkTarget(p){
 if(state.mode!=='quest'||state.stage>=3)return true;
 if(state.stage===0&&p.type==='line'){
  const g=targetLine(),a={x:p.x1,y:p.y1},b={x:p.x2,y:p.y2},c={x:g.x1,y:g.y1},d={x:g.x2,y:g.y2};
  return Math.min(Math.max(dist(a,c),dist(b,d)),Math.max(dist(a,d),dist(b,c)))<18;
 }
 if(state.stage===1&&p.type==='circle')return dist(p,{x:circle.x,y:circle.y})<15&&Math.abs(p.r-circle.r)<12;
 return false;
}
function commit(withInk=true){
 if(!state.pending)return;
 const p=state.pending;
 if(!checkTarget(p)){toast('↔ Перевір розмір');return}
 saveHistory();state.records.push({...p});state.pending=null;
 if(state.mode==='quest'){
  if(state.stage===0){state.segment++;if(state.segment>=4){state.stage=1;state.saved=Math.max(state.saved,1);state.tool='compass';save();toast('✓ 1 / 3')}else toast('✓ '+state.segment+' / 4')}
  else if(state.stage===1){state.stage=2;state.saved=Math.max(state.saved,2);state.tool='ruler';state.measure=null;save();toast('✓ 2 / 3')}
 }
 if(withInk)animateInk(p);draw();
}
function save(){try{localStorage.setItem(key,String(state.saved))}catch{}}
function finishMeasurement(){
 if(state.mode!=='quest'||state.stage!==2)return;
 if(state.measure==='rect'){
  state.measure='rectDone';toast('✓ 140 мм');draw();return;
 }
 if(state.measure==='rectDone'&&state.tool==='caliper'){
  state.measure=circle.r*2/state.scale;state.stage=3;state.saved=3;save();state.complete=true;toast('✓ 3 / 3');draw();
 }
}
function animateInk(p){
 const cls=p.type==='line'?'shape-line':'shape-circle',v=p.type==='line'?dist({x:p.x1,y:p.y1},{x:p.x2,y:p.y2}):2*Math.PI*p.r;
 const el=p.type==='line'?svgEl('line',{x1:p.x1,y1:p.y1,x2:p.x2,y2:p.y2,class:cls}):svgEl('circle',{cx:p.x,cy:p.y,r:p.r,class:cls});
 el.style.stroke='#d5fcff';el.style.strokeDasharray=String(v);el.style.strokeDashoffset=String(v);el.style.pointerEvents='none';
 svg.append(el);
 if(typeof el.animate==='function'){
  const a=el.animate([{strokeDashoffset:v},{strokeDashoffset:0}],{duration:550,fill:'forwards',easing:'ease-out'});
  a.onfinish=()=>el.remove();
 }else el.remove();
}
function undo(){if(window.GNSSDrafting3D?.animating){window.GNSSDrafting3D.cancel();return}if(!state.history.length)return;state.future.push(snapshot());restoreSnapshot(state.history.pop());state.pending=null;draw()}
function redo(){if(window.GNSSDrafting3D?.animating){window.GNSSDrafting3D.cancel();return}if(!state.future.length)return;state.history.push(snapshot());restoreSnapshot(state.future.pop());state.pending=null;draw()}
function clear(){if(window.GNSSDrafting3D?.animating)window.GNSSDrafting3D.cancel();saveHistory();state.records=[];state.pending=null;state.measure=null;if(state.mode==='quest'){state.stage=0;state.segment=0;state.saved=0;state.tool='line';save()}draw()}
function demo(now){
 if(window.GNSSLab01Journey?.active)return;
 if(window.GNSSDrafting3D?.demoRunning)return;
 if(state.mode!=='demo'||!state.demoPlaying)return;
 const elapsed=(now-state.demoStart)/1000;
 const segs=expectedLines();const all=[...segs,{type:'circle',...circle}];
 state.records=[];
 const k=clamp(Math.floor(Math.max(0,elapsed)/1.4),0,5);
 for(let i=0;i<k;i++)state.records.push(all[i]);
 const partial=clamp((elapsed-k*1.4)/1.1,0,1);
 state.pending=null;
 if(k<5){const item=all[k];if(item.type==='line')state.pending={...item,x2:item.x1+(item.x2-item.x1)*partial,y2:item.y1+(item.y2-item.y1)*partial};
 else state.pending={...item,r:Math.max(2,item.r*partial)};}
 if(elapsed>=7.4){state.records=all;state.pending=null;state.demoPlaying=false}
 draw();
}
function handleDown(e){
 if(window.GNSSDrafting3D?.animating||window.GNSSDrafting3D?.intercepts)return;
 if(state.mode==='demo'||state.stage>=3)return;
 const p=pt(e),target=e.target.closest('[data-drag]');
 if(snapEnabled())hoverSnap(p);
 if(target){state.pointer={kind:'ruler',start:p,x:state.ruler.x,y:state.ruler.y};}
 else if(state.tool==='line'){
  const start=drawingPoint(p,'line');
  state.pointer={kind:'line',start};
  state.pending={type:'line',x1:start.x,y1:start.y,x2:start.x,y2:start.y};
 }
 else if((state.tool==='rectangle'||state.tool==='triangle')&&state.mode==='explore'){
  const start=drawingPoint(p),kind=state.tool;
  state.pointer={kind,start,last:start,ctrl:!!e.ctrlKey};
  state.pending=kind==='triangle'?triangleFromDiagonal(start,start,false):rectFromDiagonal(start,start,false);
 }
 else if(state.tool==='compass'){
  const start=drawingPoint(p,'circle');
  state.pointer={kind:'circle',start};
  state.pending={type:'circle',x:start.x,y:start.y,r:0};
 }
 else if(state.tool==='eraser'){
  if(eraserVisual)return;
  const hit=recordAtPoint(p);
  if(hit){
   const detail={...hit,accepted:false};
   document.dispatchEvent(new CustomEvent('gnss:erase-start',{detail}));
   // Keep erasing functional when the 3D layer is unavailable.
   if(!detail.accepted&&!window.GNSSDrafting3D){saveHistory();state.records.splice(hit.index,1);draw()}
  }
  return;
 }
 else if(state.tool==='caliper'){
  if(state.mode==='explore')return; // owned by the A–B caliper overlay
  if(state.mode==='quest'&&state.stage===2&&state.measure==='rectDone'&&dist(p,circle)<circle.r+35){finishMeasurement();return}
  const c=state.records.find(r=>r.type==='circle');if(c&&dist(p,c)<c.r+26){state.measure=c.r*2/state.scale;toast('Ø '+fmt(state.measure));draw()}return;
 }
 else if(state.tool==='ruler'&&state.mode==='quest'&&state.stage===2){
  if(p.x>=rect.x-30&&p.x<=rect.x+rect.w+35&&p.y>=rect.y+rect.h-10&&p.y<=rect.y+rect.h+80){state.measure='rect';finishMeasurement();return}
 }
 if(!state.pointer)return;
 try{svg.setPointerCapture(e.pointerId)}catch{}
 svg.classList.add('eng-grab');
}
function handleMove(e){
 const p=pt(e);
 if(snapEnabled())hoverSnap(p);
 if(!state.pointer)return;
 const q=state.pointer;
 if(q.kind==='line'){
  const pos=drawingPoint(p,'line');
  let x=pos.x,y=pos.y;
  if(e.shiftKey){if(Math.abs(x-q.start.x)>Math.abs(y-q.start.y))y=q.start.y;else x=q.start.x}
  state.pending.x2=clamp(x,18,1182);state.pending.y2=clamp(y,18,642);
 }
 if(q.kind==='rectangle'||q.kind==='triangle'){
  q.last=drawingPoint(p);q.ctrl=!!e.ctrlKey;
  state.pending=q.kind==='triangle'
   ?triangleFromExistingBase(q.start,q.last)||triangleFromDiagonal(q.start,q.last,q.ctrl)
   :rectFromDiagonal(q.start,q.last,q.ctrl);
 }
 if(q.kind==='circle'){
  const at=drawingPoint(p,'circle');
  const r=dist(at,q.start);
  state.pending.r=clamp(nearestSnap(p)?r:snap(r),5,255);
 }
 if(q.kind==='ruler'){state.ruler.x=clamp(q.x+p.x-q.start.x,12,920);state.ruler.y=clamp(q.y+p.y-q.start.y,40,620)}
 draw();
}
function handleUp(e){if(!state.pointer)return;
 if(state.pointer.kind==='rectangle'||state.pointer.kind==='triangle'){
  const q=state.pointer;
  const released=e?.type==='pointercancel';
  const end=!released&&Number.isFinite(e?.clientX)&&Number.isFinite(e?.clientY)
   ?drawingPoint(pt(e)):q.last;
  const constrained=typeof e?.ctrlKey==='boolean'?e.ctrlKey:q.ctrl;
  const shape=q.kind==='triangle'
   ?triangleFromExistingBase(q.start,end)||triangleFromDiagonal(q.start,end,constrained)
   :rectFromDiagonal(q.start,end,constrained);
  let animated=false;
  if(!released&&shape.w>=state.scale*2&&shape.h>=state.scale*2){
   const detail={shape,accepted:false};
   document.dispatchEvent(new CustomEvent('gnss:shape-draw-start',{detail}));
   animated=detail.accepted;
   if(!animated){saveHistory();state.records.push(shape)}
  }
  state.pending=null;state.pointer=null;
  svg.classList.remove('eng-grab');
  draw();return;
 }
 if(state.pending&&state.pending.type==='line'&&!validLine({x:state.pending.x1,y:state.pending.y1},{x:state.pending.x2,y:state.pending.y2}))state.pending=null;
 if(state.pending&&state.pending.type==='circle'&&state.pending.r<15)state.pending=null;
 if(state.pointer.kind==='ruler'&&state.mode==='quest'&&state.stage===2){
  if(Math.abs(state.ruler.y-(rect.y+rect.h+35))<28&&Math.abs(state.ruler.x-rect.x)<30){state.measure='rect';finishMeasurement()}
 }
 state.pointer=null;svg.classList.remove('eng-grab');draw();
}
svg.addEventListener('pointerdown',handleDown);svg.addEventListener('pointermove',handleMove);svg.addEventListener('pointerup',handleUp);svg.addEventListener('pointercancel',handleUp);
svg.addEventListener('pointerleave',()=>{
 if(!state.pointer){state.snapHover=null;paintSnap()}
});
svg.addEventListener('dblclick',e=>{if(state.tool==='ruler'){state.ruler.angle=(state.ruler.angle+90)%360;draw()}});
confirm.addEventListener('click',commit);
tools.addEventListener('click',e=>{const btn=e.target.closest('button[data-tool]');if(!btn||state.mode==='demo')return;const t=btn.dataset.tool;
 if(t==='units'){state.measureUnit=state.measureUnit==='mm'?'cm':'mm';draw();return}
 // In free drafting, the caliper now measures the selected A–B cross-section
 // on this canvas. The practice station remains available via "Практика 01".
 state.tool=t;state.pending=null;state.snapHover=null;draw();});
cmd.addEventListener('click',e=>{const b=e.target.closest('[data-cmd]');if(!b)return;const a=b.dataset.cmd;
 if(a==='replay'){state.demoStart=performance.now();state.demoPlaying=true;state.records=[]}
 if(a==='play'){if(!state.demoPlaying){state.demoStart=performance.now();state.records=[]}state.demoPlaying=!state.demoPlaying}
 if(a==='next'){state.demoStart=performance.now()-1.4*(Math.min(4,Math.floor((performance.now()-state.demoStart)/1400)+1))*1000;state.demoPlaying=true}
 draw();});
// Physical instrument layer actions share the same geometry and quest scoring.
function erasePoint(p){
 if(eraserVisual)return false;
 const hit=recordAtPoint(p);
 if(!hit)return false;
 const detail={...hit,accepted:false};
 document.dispatchEvent(new CustomEvent('gnss:erase-start',{detail}));
 if(!detail.accepted&&!window.GNSSDrafting3D){saveHistory();state.records.splice(hit.index,1);draw()}
 return true;
}
// Ruler's two-point workflow asks the original drawing engine to validate
// target coordinates before any tool animation. The final stroke is committed
// as one undoable operation only after the pen reaches endpoint B.
document.addEventListener('gnss:ruler-demo-begin',()=>{
 if(state.mode!=='demo')return;
 state.records=[];state.pending=null;state.demoPlaying=true;draw();
});
document.addEventListener('gnss:ruler-demo-finished',()=>{
 if(state.mode!=='demo')return;
 state.records=[expectedLines()[0]];state.pending=null;
 state.demoStart=performance.now()-1400;
 state.demoPlaying=true;draw();
});
// Shared geometry validation; the renderer owns transient 3D visuals.
document.addEventListener('gnss:erase-progress',e=>{
 const d=e.detail||{},i=d.index;
 if(!Number.isInteger(i)||!state.records[i])return;
 if(!eraserVisual||eraserVisual.index!==i){
  eraserVisual={index:i,progress:0,at:d.at};
 }
 eraserVisual.progress=clamp(d.progress||0,0,1);
 updateEraserVisual();
});
document.addEventListener('gnss:erase-cancel',()=>{
 if(eraserVisual){eraserVisual=null;draw()}
});
document.addEventListener('gnss:erase-commit',e=>{
 const d=e.detail||{};
 if(!Number.isInteger(d.index)||!state.records[d.index]||
    JSON.stringify(state.records[d.index])!==JSON.stringify(d.shape)){
  eraserVisual=null;draw();return;
 }
 eraserVisual=null;
 saveHistory();state.records.splice(d.index,1);
 draw();
});
document.addEventListener('gnss:draw-check',e=>{
 const d=e.detail||{},p=d.shape;
 d.accepted=!!p&&lesson()===0&&state.mode!=='demo'&&!state.complete&&
  (state.mode!=='quest'||(p.type==='line'&&state.stage===0)||(p.type==='circle'&&state.stage===1))&&
  (p.type!=='line'||validLine({x:p.x1,y:p.y1},{x:p.x2,y:p.y2}))&&
  (p.type!=='circle'||p.r>=15)&&checkTarget(p);
 if(!d.accepted&&state.mode==='quest')toast('↔ Перевір геометрію');
});
// One transaction for every compound figure: the 3D engine animates all
// sides before adding the saved rectangle/triangle with a single Undo step.
document.addEventListener('gnss:shape-draw-commit',e=>{
 const p=e.detail?.shape;
 if(!p||!['rect','triangle'].includes(p.type)||state.mode!=='explore'||
    state.complete||lesson()!==0)return;
 if(![p.x,p.y,p.w,p.h].every(Number.isFinite)||p.w<state.scale*2||p.h<state.scale*2)return;
 saveHistory();state.records.push({...p});state.pending=null;draw();
});
document.addEventListener('gnss:draw-commit',e=>{
 const p=e.detail?.shape;if(!p||lesson()!==0||state.mode==='demo'||state.complete)return;
 if(!checkTarget(p))return;
 state.pending={...p};commit(false);
});
document.addEventListener('gnss:ruler-check',e=>{
 const d=e.detail||{};
 if(!d.a||!d.b)return;
 const p={type:'line',x1:d.a.x,y1:d.a.y,x2:d.b.x,y2:d.b.y};
 d.accepted=lesson()===0&&state.mode!=='demo'&&!state.complete&&
  (state.mode!=='quest'||state.stage===0)&&validLine(d.a,d.b)&&checkTarget(p);
 if(!d.accepted&&state.mode==='quest')toast('↔ Перевір точки');
});
document.addEventListener('gnss:protractor-commit',e=>{
 const p=e.detail?.shape;
 if(!p||p.type!=='line'||state.mode!=='explore'||state.complete||lesson()!==0)return;
 const o=p.angleFrom;
 if(!o||![p.x1,p.y1,p.x2,p.y2,o.x,o.y].every(Number.isFinite)||
  !validLine({x:p.x1,y:p.y1},{x:p.x2,y:p.y2})||
  dist({x:p.x1,y:p.y1},o)<12)return;
 const angle=Math.abs(Math.atan2(
  (o.x-p.x1)*(p.y2-p.y1)-(o.y-p.y1)*(p.x2-p.x1),
  (o.x-p.x1)*(p.x2-p.x1)+(o.y-p.y1)*(p.y2-p.y1)))*180/Math.PI;
 if(angle<.2)return;
 saveHistory();
 state.records.push({type:'line',x1:p.x1,y1:p.y1,x2:p.x2,y2:p.y2,
  angleFrom:{x:o.x,y:o.y}});
 state.pending=null;
 draw();
});
document.addEventListener('gnss:ruler-commit',e=>{
 const d=e.detail||{};
 if(lesson()!==0||!d.a||!d.b||state.mode==='demo'||state.complete||
    (state.mode==='quest'&&state.stage!==0))return;
 state.pending={type:'line',x1:d.a.x,y1:d.a.y,x2:d.b.x,y2:d.b.y};
 commit(false);
});
document.addEventListener('gnss:table-action',e=>{
 if(lesson()!==0||state.mode==='demo'||state.complete)return;
 const a=e.detail||{},p={x:a.x||0,y:a.y||0};
 if(a.type==='ruler'){
  state.ruler.x=clamp(p.x-230,12,920);
  state.ruler.y=clamp(p.y-4,40,620);
  state.ruler.angle=Number(a.angle)||0;
  if(a.end&&state.mode==='quest'&&state.stage===2&&
    Math.abs(state.ruler.y-(rect.y+rect.h+35))<28&&Math.abs(state.ruler.x-rect.x)<32){
   state.measure='rect';finishMeasurement();
  }
  draw();
 }else if(a.type==='circle'&&state.tool==='compass'){
  state.pending={type:'circle',x:snap(p.x),y:snap(p.y),r:clamp(snap(a.r||0),5,255)};
  draw();
 }else if(a.type==='caliper'&&state.tool==='caliper'&&a.end){
  if(Math.hypot(p.x-circle.x,p.y-circle.y)<150&&Math.abs((a.gap||0)-64)<=3){
   if(state.mode==='quest'&&state.stage===2&&state.measure==='rectDone')finishMeasurement();
   else {state.measure=64;toast('Ø '+fmt(64));draw()}
  }else toast('↔ Сумісти губки');
 }else if(a.type==='erase'&&state.tool==='eraser'){
  if(erasePoint(p))document.dispatchEvent(new CustomEvent('gnss:eraser-contact',{detail:p}));
 }
});
right.addEventListener('click',e=>{const btn=e.target.closest('button');if(!btn)return;
 if(btn.dataset.layer){state['layer'+btn.dataset.layer]=!state['layer'+btn.dataset.layer];draw()}
 if(btn.dataset.cmd==='undo')undo();if(btn.dataset.cmd==='redo')redo();if(btn.dataset.cmd==='clear')clear();
 if(btn.dataset.view==='objects'){toast('⬡ 3D наступним етапом')}if(btn.dataset.view==='blueprint'){toast('▣ 2D')}
});
window.addEventListener('keydown',e=>{if(lesson()!==0||mode()==='demo')return;
 if(e.key==='Control'&&(state.pointer?.kind==='rectangle'||state.pointer?.kind==='triangle')){
  state.pointer.ctrl=true;
  state.pending=state.pointer.kind==='triangle'
   ?triangleFromExistingBase(state.pointer.start,state.pointer.last)||
      triangleFromDiagonal(state.pointer.start,state.pointer.last,true)
   :rectFromDiagonal(state.pointer.start,state.pointer.last,true);
  draw();
 }
 if(e.key==='Escape'){
  if(state.pointer?.kind==='rectangle'||state.pointer?.kind==='triangle'){state.pointer=null;svg.classList.remove('eng-grab')}
  state.pending=null;draw();
 }
 if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();if(e.shiftKey)redo();else undo()}
 if(e.key==='Enter'&&state.pending){e.preventDefault();commit()}
});
window.addEventListener('keyup',e=>{
 if(e.key==='Control'&&(state.pointer?.kind==='rectangle'||state.pointer?.kind==='triangle')){
  state.pointer.ctrl=false;
  state.pending=state.pointer.kind==='triangle'
   ?triangleFromExistingBase(state.pointer.start,state.pointer.last)||
      triangleFromDiagonal(state.pointer.start,state.pointer.last,false)
   :rectFromDiagonal(state.pointer.start,state.pointer.last,false);
  draw();
 }
});
let last=0;
function frame(now){requestAnimationFrame(frame);
 const showing=lesson()===0;container.style.display=showing?'grid':'none';document.body.classList.toggle('engineering-live',showing);
 if(!showing)return;
 const m=mode();if(m!==state.lastMode)setMode(m);
 if(m==='demo'&&now-last>34){demo(now);last=now}
}
setMode(mode());requestAnimationFrame(frame);
})();
