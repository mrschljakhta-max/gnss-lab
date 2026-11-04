(()=>{
'use strict';
const NS='http://www.w3.org/2000/svg';
const $=id=>document.getElementById(id);
const A3={width:297,height:420,origin:{x:245,y:190}};
const COLORS={base:'#2364ae',help:'#bb8848',normal:'#0a968d',answer:'#d24e61',guide:'#8ba1b8',ink:'#253c57'};
const DEFAULT_3D={A:{x:180,y:80,z:10},B:{x:70,y:5,z:13},C:{x:55,y:95,z:65},D:{x:100,y:10,z:25}};
const STEPS=[
 ['Вихідні дані','Наносимо A, B, C і D на два вигляди. Нижче від осі x — план (Π₁), вище — фасад (Π₂).'],
 ['З’єднання трикутника','З’єднуємо A₁B₁C₁ та A₂B₂C₂. Точка D лишається поза площиною.'],
 ['Горизонталь і фронталь','Будуємо J та K, далі горизонталь A₁J₁ і фронталь A₂K₂ у площині ABC.'],
 ['Проєкції перпендикуляра','Через D₁ та D₂ проводимо прямі p₁ і p₂ перпендикулярно до відповідних допоміжних ліній.'],
 ['Допоміжні точки U і V','На плані знаходимо U₁ та V₁; переносимо на фасад U₂, V₂ та проводимо U₂V₂.'],
 ['Основа перпендикуляра H','H₂ = p₂ ∩ U₂V₂. Вертикальна лінія зв’язку дає H₁ на p₁. Виділяємо DH.'],
 ['Справжня довжина DH','Будуємо прямокутний трикутник RST: RS = D₁H₁, ST = |zD − zH|, RT — справжня довжина DH.']
];
const state={mode:'auto',tool:'select',tab:'properties',entities:[],coords3:structuredClone(DEFAULT_3D),step:6,selected:null,pending:null,style:{color:'#233c61',dash:'solid',width:0.65},shapeKind:'rectangle',squareAngle:90,stroke:null,pointScale:0.6,zoom:1,pan:{x:0,y:0},projection:{view:'both',links:true,profile:false},grid:true,showIntersections:false,snap:5,history:[],undo:[],redo:[],counter:0,paperMode:'example',drag:null,playing:null};
let toastTimeout=null,persistTimer=null,needFit=true;
let drawerCloseTimer=null, hintTimer=null, lastPointer={x:window.innerWidth/2,y:window.innerHeight/2};
const drawerEl=()=>document.getElementById('studioDrawer');
const drawerIsOpen=()=>drawerEl()?.classList.contains('open');
const toolMenuEl=()=>document.getElementById('toolsPopover');
const toolMenuIsOpen=()=>toolMenuEl()?.classList.contains('open');
function openToolMenu(){closeShapeMenu();const p=toolMenuEl(),b=$('toolsFab'); if(!p)return; p.classList.add('open'); p.setAttribute('aria-hidden','false'); b?.setAttribute('aria-expanded','true');}
function closeToolMenu(){const p=toolMenuEl(),b=$('toolsFab'); if(!p)return; p.classList.remove('open'); p.setAttribute('aria-hidden','true'); b?.setAttribute('aria-expanded','false');}
function toggleToolMenu(){toolMenuIsOpen()?closeToolMenu():openToolMenu();}
const shapeMenuEl=()=>document.getElementById('shapesPopover');
const shapeMenuIsOpen=()=>shapeMenuEl()?.classList.contains('open');
function openShapeMenu(){closeToolMenu();const p=shapeMenuEl(),b=$('shapesFab');if(!p)return;p.classList.add('open');p.setAttribute('aria-hidden','false');b?.setAttribute('aria-expanded','true');}
function closeShapeMenu(){const p=shapeMenuEl(),b=$('shapesFab');if(!p)return;p.classList.remove('open');p.setAttribute('aria-hidden','true');b?.setAttribute('aria-expanded','false');}
function toggleShapeMenu(){shapeMenuIsOpen()?closeShapeMenu():openShapeMenu();}
function openDrawer(){
 clearTimeout(drawerCloseTimer);
 const d=drawerEl(),edge=document.getElementById('edgeTrigger');
 if(!d)return;
 d.classList.add('open');d.setAttribute('aria-hidden','false');edge?.setAttribute('aria-expanded','true');
}
function closeDrawer(){
 clearTimeout(drawerCloseTimer);
 const d=drawerEl(),edge=document.getElementById('edgeTrigger');
 if(!d)return;
 d.classList.remove('open');d.setAttribute('aria-hidden','true');edge?.setAttribute('aria-expanded','false');
}
function scheduleDrawerClose(){clearTimeout(drawerCloseTimer);drawerCloseTimer=setTimeout(()=>{if(!drawerEl()?.matches(':hover'))closeDrawer();},140);}
function showCanvasHint(message){
 const help=document.getElementById('canvasHelp'),viewport=document.getElementById('canvasViewport');if(!help||!viewport||!message)return;
 const rect=viewport.getBoundingClientRect();
 help.textContent=message;
 help.style.left=`${Math.max(25,Math.min(rect.width-305,lastPointer.x-rect.left+14))}px`;
 help.style.top=`${Math.max(18,Math.min(rect.height-65,lastPointer.y-rect.top+16))}px`;
 help.classList.add('visible');
 clearTimeout(hintTimer);hintTimer=setTimeout(()=>help.classList.remove('visible'),1900);
}

const deep=o=>JSON.parse(JSON.stringify(o));
const fmt=(n,d=2)=>Number(n).toFixed(d).replace('.',',');
const len=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const minus=(a,b)=>({x:a.x-b.x,y:a.y-b.y});
const plus=(a,b)=>({x:a.x+b.x,y:a.y+b.y});
const times=(a,t)=>({x:a.x*t,y:a.y*t});
const dot=(a,b)=>a.x*b.x+a.y*b.y;
const cross=(a,b)=>a.x*b.y-a.y*b.x;
const clamp=(x,min,max)=>Math.min(max,Math.max(min,x));
const world3=(v)=>({x:v.x,y:v.y,z:v.z});
const sub3=(u,v)=>({x:u.x-v.x,y:u.y-v.y,z:u.z-v.z});
const dot3=(a,b)=>a.x*b.x+a.y*b.y+a.z*b.z;
const cross3=(a,b)=>({x:a.y*b.z-a.z*b.y,y:a.z*b.x-a.x*b.z,z:a.x*b.y-a.y*b.x});
const sq3=v=>dot3(v,v);
const mix3=(a,b,t)=>({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,z:a.z+(b.z-a.z)*t});
const p1=p=>({x:A3.origin.x-p.x,y:A3.origin.y+p.y});
const p2=p=>({x:A3.origin.x-p.x,y:A3.origin.y-p.z});
const makeSVG=(tag,attrs={},parent)=>{const el=document.createElementNS(NS,tag);for(const [key,v] of Object.entries(attrs)){if(v!==null&&v!==undefined)el.setAttribute(key,String(v));}if(parent)parent.appendChild(el);return el;};
const lineIntersect=(a,b,c,d,asSegment=false,bsSegment=false)=>{
 const r=minus(b,a),s=minus(d,c),den=cross(r,s);
 if(Math.abs(den)<1e-8)return null;
 const t=cross(minus(c,a),s)/den,u=cross(minus(c,a),r)/den;
 if((asSegment&&(t<-.00001||t>1.00001))||(bsSegment&&(u<-.00001||u>1.00001)))return null;
 return {point:plus(a,times(r,t)),t,u};
};
const foot2=(p,a,b)=>{const d=minus(b,a);if(dot(d,d)<1e-10)return null;return plus(a,times(d,dot(minus(p,a),d)/dot(d,d)));};
const LINE_DASH_TYPES=['solid','dashed','dashdot','dotted'];
const normalizedLineDash=dash=>LINE_DASH_TYPES.includes(dash)?dash:'solid';
const styleLine=(dash)=>({solid:'',dashed:'3 2',dashdot:'5 1.6 .5 1.6',dotted:'.35 1.65'})[normalizedLineDash(dash)]||'';
const nextId=()=>`g${++state.counter}`;
function addPoint(label,pos,opt={}){const p={id:nextId(),type:'point',label:label||`P${state.counter}`,x:pos.x,y:pos.y,color:opt.color||COLORS.ink,stage:opt.stage??0,small:opt.small??false,derivation:opt.derivation||null,offset:opt.offset||null,source:opt.source||null};state.entities.push(p);return p.id;}
function addLine(a,b,opt={}){const l={id:nextId(),type:'line',a,b,extent:opt.extent||'segment',dash:opt.dash||'solid',color:opt.color||state.style.color,width:opt.width||.65,label:opt.label||'',stage:opt.stage??0,kind:opt.kind||'normal',region:opt.region||null};state.entities.push(l);return l.id;}
const get=id=>state.entities.find(e=>e.id===id);
function pointOf(value){if(typeof value==='string'){const x=get(value);return x&&x.type==='point'&&!x.invalid?{x:x.x,y:x.y}:null;}if(value&&Number.isFinite(value.x)&&Number.isFinite(value.y))return value;return null;}
function linePoints(l){
 if(!l||l.type!=='line')return null;
 if(l.kind==='extension'&&l.sourceLine&&l.sourceEndpoint){
  const source=get(l.sourceLine),sourceGeometry=source&&source.id!==l.id?linePoints(source):null;
  const endpoint=pointOf(l.b);
  if(!sourceGeometry||!endpoint)return null;
  const anchor=sourceGeometry[l.sourceEndpoint];
  return anchor?{a:anchor,b:endpoint}:null;
 }
 if(l.kind==='perpendicular'&&l.perpendicularBase&&l.perpendicularStart){
  const anchor=pointOf(l.perpendicularStart),base=get(l.perpendicularBase);
  if(!anchor||!base||base.id===l.id)return null;
  const vec=linePoints(base);
  if(!vec||!Number.isFinite(l.perpendicularLength))return null;
  const d=minus(vec.b,vec.a),length=Math.hypot(d.x,d.y);
  if(length<1e-8||Math.abs(l.perpendicularLength)<1e-6)return null;
  const normal={x:-d.y/length,y:d.x/length};
  return {a:anchor,b:plus(anchor,times(normal,l.perpendicularLength))};
 }
 const a=pointOf(l.a),b=pointOf(l.b);
 if(!a||!b||len(a,b)<1e-6)return null;
 return {a,b};
}

function addPrimitive(type,geometry,opt={}){const obj={id:nextId(),type,...geometry,color:opt.color||state.style.color,dash:opt.dash||state.style.dash,width:opt.width??state.style.width,stage:0,label:opt.label||''};state.entities.push(obj);return obj.id;}
function entityTitle(e){const labels={point:'Точка',line:e?.extent==='line'?'Пряма':'Відрізок',path:'Олівець',circle:'Коло',angle:'Кут',shape:'Фігура',dimension:'Розмір'};return labels[e?.type]||'Об’єкт';}
function renderPrimitive(layer,e,selected=false){
 const col=e.color||state.style.color,wide=e.width??state.style.width,dash=styleLine(e.dash);let el=null;
 const pathAttrs={fill:'none',stroke:col,'stroke-width':wide,'stroke-dasharray':dash,'stroke-linecap':'round','stroke-linejoin':'round','data-id':e.id};
 if(e.type==='path'&&e.points?.length>=2){
  const d=e.curve&&e.points.length===3?`M ${e.points[0].x} ${e.points[0].y} Q ${e.points[1].x} ${e.points[1].y} ${e.points[2].x} ${e.points[2].y}`:'M '+e.points.map(p=>`${p.x} ${p.y}`).join(' L ');
  el=makeSVG('path',{d,...pathAttrs},layer);makeSVG('path',{d,fill:'none',stroke:'transparent','stroke-width':5,'data-id':e.id},layer);
 }
 if(e.type==='circle'&&e.center&&e.radius>0){el=makeSVG('circle',{cx:e.center.x,cy:e.center.y,r:e.radius,...pathAttrs},layer);makeSVG('circle',{cx:e.center.x,cy:e.center.y,r:e.radius,fill:'none',stroke:'transparent','stroke-width':5,'data-id':e.id},layer);}
 if(e.type==='shape'&&e.points?.length){
  if(e.kind==='ellipse'){const a=e.points[0],b=e.points[1];el=makeSVG('ellipse',{cx:(a.x+b.x)/2,cy:(a.y+b.y)/2,rx:Math.abs(b.x-a.x)/2,ry:Math.abs(b.y-a.y)/2,...pathAttrs},layer);makeSVG('ellipse',{cx:(a.x+b.x)/2,cy:(a.y+b.y)/2,rx:Math.abs(b.x-a.x)/2,ry:Math.abs(b.y-a.y)/2,fill:'transparent',stroke:'transparent','stroke-width':7,'data-id':e.id},layer);}
  else{const pts=e.kind==='rectangle'?rectCorners(e.points[0],e.points[1]):e.points;el=makeSVG('polygon',{points:pts.map(p=>`${p.x},${p.y}`).join(' '),fill:col,'fill-opacity':'.04',stroke:col,'stroke-width':wide,'stroke-dasharray':dash,'data-id':e.id},layer);}
 }
 if(e.type==='dimension'){const a=pointOf(e.a),b=pointOf(e.b);if(a&&b&&len(a,b)>.01){const vector=minus(b,a),unit=times(vector,1/len(a,b)),normal={x:-unit.y,y:unit.x},v=times(normal,8),s=plus(a,v),t=plus(b,v),tick=2;
  const g=makeSVG('g',{'data-id':e.id},layer);
  makeSVG('line',{x1:a.x,y1:a.y,x2:s.x+normal.x*3,y2:s.y+normal.y*3,...pathAttrs},g);
  makeSVG('line',{x1:b.x,y1:b.y,x2:t.x+normal.x*3,y2:t.y+normal.y*3,...pathAttrs},g);
  makeSVG('line',{x1:s.x,y1:s.y,x2:t.x,y2:t.y,...pathAttrs},g);
  for(const [pt,sgn] of [[s,1],[t,-1]]){const tip=plus(pt,times(unit,2.6*sgn));makeSVG('path',{d:`M ${pt.x} ${pt.y} l ${unit.x*3*sgn+normal.x*tick} ${unit.y*3*sgn+normal.y*tick} l ${-normal.x*2*tick} ${-normal.y*2*tick} Z`,fill:col,stroke:'none'},g);}
  const txt=makeSVG('text',{x:(s.x+t.x)/2+normal.x*3,y:(s.y+t.y)/2+normal.y*3,'font-size':3.8,'font-family':'Arial','text-anchor':'middle',fill:col,'paint-order':'stroke',stroke:'#fff','stroke-width':1.2},g);txt.textContent=`${fmt(len(a,b),2)} мм`;
 }}
 if(e.type==='angle'&&e.points?.length===3){const [v,a,b]=e.points,alpha=Math.atan2(a.y-v.y,a.x-v.x),beta=Math.atan2(b.y-v.y,b.x-v.x);let delta=(beta-alpha)%(Math.PI*2);if(delta>Math.PI)delta-=Math.PI*2;if(delta< -Math.PI)delta+=Math.PI*2;
  const radius=Math.min(16,Math.max(7,Math.min(len(v,a),len(v,b))*.38)),p1=plus(v,{x:radius*Math.cos(alpha),y:radius*Math.sin(alpha)}),p2=plus(v,{x:radius*Math.cos(alpha+delta),y:radius*Math.sin(alpha+delta)});
  const g=makeSVG('g',{'data-id':e.id},layer);makeSVG('line',{x1:v.x,y1:v.y,x2:a.x,y2:a.y,...pathAttrs},g);makeSVG('line',{x1:v.x,y1:v.y,x2:b.x,y2:b.y,...pathAttrs},g);
  makeSVG('path',{d:`M ${p1.x} ${p1.y} A ${radius} ${radius} 0 0 ${delta>0?1:0} ${p2.x} ${p2.y}`,...pathAttrs},g);
  const mid=alpha+delta/2,t=plus(v,{x:(radius+6)*Math.cos(mid),y:(radius+6)*Math.sin(mid)});
  const label=makeSVG('text',{x:t.x,y:t.y,'text-anchor':'middle','font-size':4.3,'font-weight':'bold',fill:col,'paint-order':'stroke',stroke:'#fff','stroke-width':1.3},g);label.textContent=`${fmt(Math.abs(delta*180/Math.PI),1)}°`;
 }
 if(selected&&el)el.classList.add('selected-drawing');
 return el;
}
function rectCorners(a,b){return [a,{x:b.x,y:a.y},b,{x:a.x,y:b.y}];}
function recordPrimitive(type,geometry,message){saveUndo(message);state.selected=addPrimitive(type,geometry);state.pending=null;render();}
function handleDraftingClicks(tool,p,event){
 const point=snapped(p),pos={x:point.x,y:point.y};
 if(tool==='projection'){const horizontal=Boolean(event?.shiftKey);saveUndo('Проведено проєкційну лінію');state.selected=addLine(horizontal?{x:0,y:pos.y}:{x:pos.x,y:0},horizontal?{x:297,y:pos.y}:{x:pos.x,y:420},{color:COLORS.guide,dash:'dashed',width:.35,label:'',kind:'manual-projection'});render();return;}
 if(tool==='compass'||tool==='circle'){
  if(!state.pending){state.pending={points:[pos]};render();return;}
  const center=state.pending.points[0],radius=len(center,pos);if(radius<.4){toast('Задайте радіус більший за 0');return;}
  recordPrimitive('circle',{center,radius},'Побудовано коло');return;
 }
 if(tool==='protractor'||tool==='curve'||tool==='shapes'&&state.shapeKind==='triangle'){
  const points=state.pending?.points||[];points.push(pos);
  if(points.length<3){state.pending={points};render();return;}
  if(tool==='protractor'){if(len(points[0],points[1])<.5||len(points[0],points[2])<.5){toast('Потрібні дві різні сторони кута');state.pending=null;render();return;}recordPrimitive('angle',{points},'Виміряно і побудовано кут');}
  else if(tool==='curve'){recordPrimitive('path',{points,curve:true},'Побудовано лекало');}
  else{recordPrimitive('shape',{kind:'triangle',points},'Побудовано трикутник');}
  return;
 }
 if(tool==='shapes'||tool==='rectangle'){
  if(!state.pending){state.pending={points:[pos]};render();return;}
  const a=state.pending.points[0];if(len(a,pos)<.5){toast('Потрібна друга точка');return;}
  const kind=tool==='rectangle'?'rectangle':state.shapeKind;recordPrimitive('shape',{kind,points:[a,pos]},kind==='ellipse'?'Побудовано еліпс':'Побудовано прямокутник');return;
 }
 if(tool==='square'){
  if(!state.pending){state.pending={points:[pos]};render();return;}
  const a=state.pending.points[0],v=minus(pos,a),length=Math.hypot(v.x,v.y);if(length<.3){toast('Потрібна друга точка');return;}
  const raw=Math.atan2(v.y,v.x),step=state.squareAngle*Math.PI/180,dir=Math.round(raw/step)*step,b=plus(a,{x:Math.cos(dir)*length,y:Math.sin(dir)*length});
  saveUndo(`Побудовано кутником ${state.squareAngle}°`);state.selected=addLine(a,b,{extent:'segment',...state.style});state.pending=null;render();return;
 }
 if(tool==='dimension'){
  if(!state.pending){state.pending={points:[pos]};render();return;}
  const a=state.pending.points[0];if(len(a,pos)<.4){toast('Оберіть іншу точку');return;}
  recordPrimitive('dimension',{a,b:pos},'Нанесено розмір');return;
 }
}
function recomputeDerived(){
 for(let pass=0;pass<4;pass++){
  for(const p of state.entities){
   if(p.type!=='point'||!p.derivation)continue;
   const d=p.derivation;let loc=null;
   if(d.kind==='extensionIntersection'||d.kind==='extensionParam'){
    loc=extensionPointPosition(d);
    // Do not show an obsolete intersection if its source geometry becomes invalid.
    p.invalid=!loc;
   }else if(d.kind==='intersection'){
    const l1=get(d.l1),l2=get(d.l2),x=linePoints(l1),y=linePoints(l2);
    if(x&&y){const inter=lineIntersect(x.a,x.b,y.a,y.b,l1.extent==='segment',l2.extent==='segment');if(inter)loc=inter.point;}
   }else if(d.kind==='foot'){
    const l=get(d.line),source=pointOf(d.point),ll=linePoints(l);
    if(source&&ll)loc=foot2(source,ll.a,ll.b);
   }
   if(loc){p.x=loc.x;p.y=loc.y;}
  }
 }
}
function log(msg){state.history.unshift({msg,time:new Date().toLocaleTimeString('uk-UA',{hour:'2-digit',minute:'2-digit'})});state.history=state.history.slice(0,36);}
function syncUndoControls(){
 const undoAvailable=state.undo.length>0||!!state.pending?.undoBefore;
 const redoAvailable=state.redo.length>0;
 for(const id of ['btnUndo','floatingUndo']){
  const button=$(id);if(button)button.disabled=!undoAvailable;
 }
 const redoButton=$('btnRedo');if(redoButton)redoButton.disabled=!redoAvailable;
}
function pushUndoBefore(snapshot,msg){
 state.undo.push(snapshot);
 if(state.undo.length>70)state.undo.shift();
 state.redo=[];
 if(msg)log(msg);
 syncUndoControls();
}
function saveUndo(msg){pushUndoBefore(snapshotForUndo(),msg);}
function restoreSnap(obj){state.entities=deep(obj.entities||[]);state.coords3=deep(obj.coords3||DEFAULT_3D);state.counter=obj.counter||state.entities.length;state.paperMode=obj.paperMode||'blank';state.pointScale=normalizedPointScale(obj.pointScale);taskResult=state.paperMode==='example'?computeTask(state.coords3):null;state.selected=null;state.pending=null;render();saveLocal();}
function undo(){
 if(state.pending?.undoBefore){
  const before=JSON.parse(state.pending.undoBefore);
  state.entities=deep(before.entities);state.counter=before.counter;state.pending=null;state.selected=null;
  render();toast('Скасовано початок відрізка');return;
 }
 if(!state.undo.length)return toast('Немає дій для скасування');
 state.redo.push(snapshotForUndo());restoreSnap(JSON.parse(state.undo.pop()));
 log('Скасування');syncUndoControls();
}
function redo(){
 if(!state.redo.length)return toast('Немає дій для повторення');
 state.undo.push(snapshotForUndo());restoreSnap(JSON.parse(state.redo.pop()));
 log('Повторення');syncUndoControls();
}
function isManualProjectionLine(line){
 if(line?.type!=='line')return false;
 if(line.kind==='manual-projection')return true;
 // Compatibility with old projects: manual projections previously used kind='normal'.
 if(line.kind!=='normal'||line.extent!=='segment'||line.dash!=='dashed'
     ||Math.abs((line.width??0)-.35)>.005||line.color!==COLORS.guide)return false;
 const v=linePoints(line);if(!v)return false;
 const vertical=Math.abs(v.a.x-v.b.x)<.0001&&Math.min(v.a.y,v.b.y)<.01&&Math.max(v.a.y,v.b.y)>419.99;
 const horizontal=Math.abs(v.a.y-v.b.y)<.0001&&Math.min(v.a.x,v.b.x)<.01&&Math.max(v.a.x,v.b.x)>296.99;
 return vertical||horizontal;
}
window.GeometryStudioHistoryAPI={
 undo:()=>undo(),redo:()=>redo(),
 countManualProjections:()=>state.entities.filter(isManualProjectionLine).length,
 removeLastManualProjection:()=>{
  const index=state.entities.findLastIndex(isManualProjectionLine);
  if(index<0)return false;
  saveUndo('Видалено випадкову проєкційну лінію');
  const removed=state.entities.splice(index,1)[0];
  if(state.selected===removed.id)state.selected=null;
  if(extensionState)extensionCancel();
  render();toast('Прибрано останню проєкційну лінію — Ctrl+Z відновить її');
  return true;
 }
};
function computeTask(coords){
 const {A,B,C,D}=coords;const n=cross3(sub3(B,A),sub3(C,A));if(sq3(n)<1e-9)throw Error('Точки A, B, C лежать на одній прямій. Задайте іншу площину.');
 const H=Object.fromEntries(['x','y','z'].map(k=>[k,D[k]-n[k]*dot3(n,sub3(D,A))/sq3(n)]));
 const dist=Math.sqrt(sq3(sub3(H,D)));const horizontal=Math.hypot(H.x-D.x,H.y-D.y);const deltaZ=Math.abs(D.z-H.z);
 if(Math.abs(C.z-B.z)<1e-8||Math.abs(C.y-B.y)<1e-8)throw Error('Для цієї конфігурації горизонталь або фронталь не будується за BC.');
 const J=mix3(B,C,(A.z-B.z)/(C.z-B.z));const K=mix3(B,C,(A.y-B.y)/(C.y-B.y));
 const interU=lineIntersect({x:D.x,y:D.y},{x:H.x,y:H.y},{x:A.x,y:A.y},{x:B.x,y:B.y});
 const interV=lineIntersect({x:D.x,y:D.y},{x:H.x,y:H.y},{x:B.x,y:B.y},{x:C.x,y:C.y});
 if(!interU||!interV)throw Error('Не вдалося побудувати перетини U,V для заданих координат.');
 return {H,J,K,U:mix3(A,B,interU.u),V:mix3(B,C,interV.u),dist,horizontal,deltaZ};
}
let taskResult=null;
function createExample(){
 state.entities=[];state.counter=0;state.selected=null;state.pending=null;taskResult=computeTask(state.coords3);state.paperMode='example';
 const ids={};
 function P(label,pos,stage,color,small=false,offset=null){ids[label]=addPoint(label,pos,{stage,color,small,offset,source:'task5'});return ids[label];}
 function L(a,b,stage,color=COLORS.guide,width=.4,dash='solid',label='',extent='segment',region=null){return addLine(ids[a],ids[b],{stage,color,width,dash,label,extent,region,kind:'task5'});}
 for(const n of 'ABCD'){
  P(`${n}1`,p1(state.coords3[n]),0,n==='D'?COLORS.answer:COLORS.base);
  P(`${n}2`,p2(state.coords3[n]),0,n==='D'?COLORS.answer:COLORS.base);
  L(`${n}1`,`${n}2`,0,COLORS.guide,.25,'dashed');
 }
 for(const suffix of [1,2]){L(`A${suffix}`,`B${suffix}`,1,COLORS.base,.75);L(`B${suffix}`,`C${suffix}`,1,COLORS.base,.75);L(`C${suffix}`,`A${suffix}`,1,COLORS.base,.75);}
 for(const n of 'JK'){
  P(`${n}1`,p1(taskResult[n]),2,COLORS.help,true);
  P(`${n}2`,p2(taskResult[n]),2,COLORS.help,true);
  L(`${n}1`,`${n}2`,2,COLORS.guide,.25,'dashed');
 }
 L('A1','J1',2,COLORS.help,.75,'solid','h₁');L('A2','J2',2,COLORS.help,.55,'dashed');
 L('A1','K1',2,COLORS.help,.55,'dashed');L('A2','K2',2,'#a05dac',.75,'solid','f₂');
 P('H1',p1(taskResult.H),5,COLORS.normal,false,{dx:4,dy:5});
 P('H2',p2(taskResult.H),5,COLORS.normal,false,{dx:4,dy:-4});
 L('D1','H1',3,COLORS.normal,.8,'dashdot','p₁','line','plan');
 L('D2','H2',3,COLORS.normal,.8,'dashdot','p₂','line','front');
 for(const n of 'UV'){
  P(`${n}1`,p1(taskResult[n]),4,COLORS.help,true);
  P(`${n}2`,p2(taskResult[n]),4,COLORS.help,true);
  L(`${n}1`,`${n}2`,4,COLORS.guide,.25,'dashed');
 }
 L('U2','V2',4,COLORS.help,.7,'solid','UV');
 L('H1','H2',5,COLORS.normal,.35,'dashed');
 L('D1','H1',5,COLORS.answer,1.4);L('D2','H2',5,COLORS.answer,1.4);
 const R={x:174,y:376};const S={x:R.x+taskResult.horizontal,y:R.y};const T={x:S.x,y:S.y-taskResult.deltaZ};
 P('R',R,6,COLORS.ink,true,{dx:-5,dy:5});P('S',S,6,COLORS.ink,true,{dx:3,dy:5});P('T',T,6,COLORS.ink,true,{dx:3,dy:-3});
 L('R','S',6,COLORS.ink,.6);L('S','T',6,COLORS.ink,.6);L('R','T',6,COLORS.answer,1.15);
 log('Завантажено варіант 15');render();saveLocal();
}
function setMode(mode){if(!['auto','manual'].includes(mode))return;if(extensionState)extensionCancel();state.mode=mode;state.selected=null;state.pending=null;stopPlay();$('autoStrip').classList.toggle('hidden',mode!=='auto');$('modeManual').classList.toggle('active',mode==='manual');$('modeAuto').classList.toggle('active',mode==='auto');$('statusMode').textContent=mode==='auto'?'Автопобудова':'Креслення';if(mode==='auto'&&state.paperMode==='blank')createExample();else render();closeDrawer();}
function setTool(tool){
 if(extensionState)extensionCancel();
 if(state.pending?.undoBefore){
  const before=JSON.parse(state.pending.undoBefore);
  state.entities=deep(before.entities);state.counter=before.counter;
 }
 state.stroke=null;state.tool=tool;state.pending=null;state.selected=null;document.querySelectorAll('.tool').forEach(b=>b.classList.toggle('active',b.dataset.tool===tool));$('canvasViewport').classList.toggle('pan-cursor',tool==='pan'||tool==='select');$('canvasViewport').classList.remove('can-pan','panning','cursor-on-vertex','cursor-on-geometry','cursor-on-label','cursor-dragging-label');if(state.mode==='auto')setMode('manual');render();closeDrawer();closeToolMenu();closeShapeMenu();showCanvasHint(manualHint());}
function projectedPlane(e){
 if(!e)return null;
 if(e.type==='point'){
  if(e.projectionPlane)return e.projectionPlane;
  if(e.source==='task5'&&/[12]$/.test(e.label))return e.label.endsWith('1')?'pi1':'pi2';
  if(/[12]$/.test(e.label)){
   const match=state.entities.some(l=>l.type==='line'&&l.kind==='projection'&&(l.a===e.id||l.b===e.id));
   if(match)return e.label.endsWith('1')?'pi1':'pi2';
  }
  return null;
 }
 if(e.type==='line'){
  if(e.kind==='projection')return 'link';
  if(e.kind==='perpendicular'&&e.perpendicularStart)
   return projectedPlane(get(e.perpendicularStart));
  const a=get(e.a),b=get(e.b),pa=projectedPlane(a),pb=projectedPlane(b);
  if(pa&&pb)return pa===pb?pa:'link';
 }
 return null;
}
function visibleEntity(e,full=false){
 if(full)return true;
 if(e?.invalid)return false;
 if(state.mode==='auto'&&e.stage>state.step)return false;
 const type=projectedPlane(e),mode=state.projection.view;
 if(type==='pi1'&&mode==='pi2')return false;
 if(type==='pi2'&&mode==='pi1')return false;
 if(type==='link'&&(!state.projection.links||mode!=='both'))return false;
 return true;
}
const SUBSCRIPT_DIGITS='₀₁₂₃₄₅₆₇₈₉';
function printablePointLabel(label){return String(label||'').replace(/([0-9]+)$/,numbers=>[...numbers].map(n=>SUBSCRIPT_DIGITS[Number(n)]).join(''));}
function pointLabelMetrics(zoom=state.zoom){
 const z=clamp(Number(zoom)||1,.35,3.5);
 // SVG viewport: 297 mm viewBox is displayed at 594 CSS px before zoom.
 // 11.5–22 CSS px keeps labels legible while still growing with the drawing.
 const screenFont=clamp(14.4*Math.pow(z,.34),11.5,22);
 const screenGap=9+Math.min(6,Math.max(0,z-1)*2);
 return {fontSize:screenFont/(2*z),gap:screenGap/(2*z),halo:2.7/(2*z)};
}
function labelOffset(p,metrics=pointLabelMetrics()){
 const side=p.offset?.dx<0?-1:1;
 const down=p.offset?.dy!=null?p.offset.dy>=0:/1$/.test(String(p.label||''));
 const x=side*Math.max(metrics.gap,Math.abs(p.offset?.dx||0));
 const upBaseline=Math.max(metrics.fontSize*.45,Math.abs(p.offset?.dy||0));
 const downBaseline=Math.max(metrics.fontSize*1.2,Math.abs(p.offset?.dy||0));
 return [x,down?downBaseline:-upBaseline];
}
/* Smart drafting labels: put text outside geometry, never over a triangle edge or face. */
function labelRectIntersection(a,b){
 return a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
}
function labelSegmentCrossesRect(a,b,r){
 let lower=0,upper=1;
 const dx=b.x-a.x,dy=b.y-a.y;
 const checks=[[-dx,a.x-r.x],[dx,r.x+r.w-a.x],[-dy,a.y-r.y],[dy,r.y+r.h-a.y]];
 for(const [p,q] of checks){
  if(Math.abs(p)<1e-10){if(q<0)return false;continue;}
  const t=q/p;
  if(p<0){if(t>upper)return false;if(t>lower)lower=t;}
  else{if(t<lower)return false;if(t<upper)upper=t;}
 }
 return lower<=upper;
}
function labelPointInTriangle(point,tri){
 const crossSign=(a,b,p)=>(b.x-a.x)*(p.y-a.y)-(b.y-a.y)*(p.x-a.x);
 const a=crossSign(tri[0],tri[1],point);
 const b=crossSign(tri[1],tri[2],point);
 const c=crossSign(tri[2],tri[0],point);
 return !(a<-.0001||b<-.0001||c<-.0001)||!(a>.0001||b>.0001||c>.0001);
}
function labelRectOverTriangle(r,tri){
 const corners=[{x:r.x,y:r.y},{x:r.x+r.w,y:r.y},{x:r.x+r.w,y:r.y+r.h},{x:r.x,y:r.y+r.h}];
 if(corners.some(p=>labelPointInTriangle(p,tri)))return true;
 if(tri.some(p=>p.x>=r.x&&p.x<=r.x+r.w&&p.y>=r.y&&p.y<=r.y+r.h))return true;
 for(let k=0;k<3;k++)if(labelSegmentCrossesRect(tri[k],tri[(k+1)%3],r))return true;
 return false;
}
function labelTriangles(){
 const adjacency=new Map();
 const addEdge=(a,b)=>{
  if(!adjacency.has(a))adjacency.set(a,new Set());
  adjacency.get(a).add(b);
 };
 const eligible=state.entities.filter(e=>e.type==='line'&&e.extent!=='line'&&e.dash==='solid'&&e.kind!=='projection'&&e.kind!=='guide'&&visibleEntity(e)&&typeof e.a==='string'&&typeof e.b==='string');
 for(const line of eligible){
  const a=get(line.a),b=get(line.b);
  if(!a||!b||a.type!=='point'||b.type!=='point')continue;
  addEdge(a.id,b.id);addEdge(b.id,a.id);
 }
 const triangles=[],seen=new Set();
 for(const [a,neighbors] of adjacency){
  for(const b of neighbors){
   if(a>=b)continue;
   for(const c of adjacency.get(b)||[]){
    if(b>=c||!neighbors.has(c))continue;
    const key=[a,b,c].join(':');
    if(seen.has(key))continue;
    seen.add(key);
    const p=[get(a),get(b),get(c)].map(q=>q&&{x:q.x,y:q.y});
    if(p.every(Boolean)){
     const area=Math.abs((p[1].x-p[0].x)*(p[2].y-p[0].y)-(p[1].y-p[0].y)*(p[2].x-p[0].x));
     if(area>1)triangles.push(p);
    }
    if(triangles.length>=250)return triangles;
   }
  }
 }
 return triangles;
}
function layoutPointLabels(root,metrics){
 if(!root)return;
 const labels=[...root.querySelectorAll('.point-label')];
 if(!labels.length)return;
 const segments=[];
 for(const line of root.querySelectorAll('line')){
  const stroke=line.getAttribute('stroke');
  if(!stroke||stroke==='none'||stroke==='transparent')continue;
  const vals=['x1','y1','x2','y2'].map(x=>Number(line.getAttribute(x)));
  if(vals.every(Number.isFinite))
   segments.push({a:{x:vals[0],y:vals[1]},b:{x:vals[2],y:vals[3]}});
 }
 const triangles=labelTriangles();
 const markers=[];
 for(const circle of root.querySelectorAll('circle[data-id]')){
  const r=Number(circle.getAttribute('r'));
  if(!Number.isFinite(r)||r>3.6)continue;
  const cx=Number(circle.getAttribute('cx')),cy=Number(circle.getAttribute('cy'));
  if(Number.isFinite(cx)&&Number.isFinite(cy))markers.push({x:cx,y:cy,r:r+.5});
 }
 const occupied=[];
 const margin=Math.max(.45,metrics.halo*.5+.4);
 for(const node of labels){
  const id=node.getAttribute('data-point-id'),point=id?get(id):null;
  let x=point?.x,y=point?.y;
  if(!point&&node.hasAttribute('data-profile-x')){
   x=Number(node.getAttribute('data-profile-x'));
   y=Number(node.getAttribute('data-profile-y'));
  }
  if(!Number.isFinite(x)||!Number.isFinite(y))continue;
  node.setAttribute('font-size',metrics.fontSize);
  node.setAttribute('stroke-width',metrics.halo);
  node.setAttribute('x',0);node.setAttribute('y',0);
  node.setAttribute('text-anchor','start');
  let width=0,height=0,originX=0,originY=0;
  try{
   const bbox=node.getBBox();
   if(bbox?.width>0&&bbox?.height>0){
    width=bbox.width;height=bbox.height;originX=bbox.x;originY=bbox.y;
   }
  }catch(_){}
  if(!width||!height){
   width=Math.max(metrics.fontSize*.65,([...node.textContent].length||2)*metrics.fontSize*.66);
   height=metrics.fontSize*1.12;
   originX=0;originY=-height*.83;
  }
  // Explicitly placed names remain fixed relative to their own points.
  // Automatic collision avoidance continues for all other point names.
  if(point?.labelOffset&&Number.isFinite(point.labelOffset.dx)&&Number.isFinite(point.labelOffset.dy)){
   const labelX=point.x+point.labelOffset.dx;
   const labelY=point.y+point.labelOffset.dy;
   node.setAttribute('x',labelX);
   node.setAttribute('y',labelY);
   occupied.push({x:labelX+originX-margin,y:labelY+originY-margin,
    w:width+margin*2,h:height+margin*2});
   continue;
  }
  // Prefer labels outside the plan/elevation; placement is determined by geometry.
  const isPlan=point?/1$/.test(point.label):false;
  const preferred=isPlan?[[-1,1],[1,1],[-1,-1],[1,-1]]:[[-1,-1],[1,-1],[-1,1],[1,1]];
  const directions=[...preferred,[1,0],[-1,0],[0,-1],[0,1]];
  let best=null;
  for(const factor of [1,1.5,2.2,3]){
   for(let i=0;i<directions.length;i++){
    const [dx,dy]=directions[i],gap=metrics.gap*factor;
    const left=dx>0?x+gap:dx<0?x-gap-width:x-width/2;
    const top=dy>0?y+gap:dy<0?y-gap-height:y-height/2;
    const box={x:left,y:top,w:width,h:height};
    const inflated={x:box.x-margin,y:box.y-margin,w:box.w+2*margin,h:box.h+2*margin};
    let score=i*.12+(factor-1)*7;
    if(inflated.x<1||inflated.y<1||inflated.x+inflated.w>296||inflated.y+inflated.h>419)score+=200;
    for(const line of segments)if(labelSegmentCrossesRect(line.a,line.b,inflated))score+=1000;
    for(const tri of triangles)if(labelRectOverTriangle(inflated,tri))score+=2500;
    for(const other of occupied)if(labelRectIntersection(other,inflated))score+=3500;
    for(const marker of markers){
     const cx=clamp(marker.x,inflated.x,inflated.x+inflated.w);
     const cy=clamp(marker.y,inflated.y,inflated.y+inflated.h);
     if((marker.x-cx)**2+(marker.y-cy)**2<(marker.r+margin)**2)score+=600;
    }
    // A valid non-overlapping position is always preferred to the initial hint.
    if(!best||score<best.score)best={score,box};
    if(score<15)break;
   }
   if(best&&best.score<15)break;
  }
  if(!best)continue;
  node.setAttribute('x',best.box.x-originX);
  node.setAttribute('y',best.box.y-originY);
  occupied.push({x:best.box.x-margin,y:best.box.y-margin,w:best.box.w+2*margin,h:best.box.h+2*margin});
 }
}
function refreshPointLabels(){
 layoutPointLabels($('drawingLayer'),pointLabelMetrics());
}
function standardizeExportLabels(svg){
 layoutPointLabels(svg,{fontSize:3.8,gap:4.4,halo:.75});
 for(const label of svg.querySelectorAll('.point-label')){
  label.setAttribute('pointer-events','none');
  label.removeAttribute('data-point-label-id');
  label.removeAttribute('data-point-id');
 }
}

/* Editable annotation attached to the segment: its offset survives vertex moves. */
function lineLabelMetrics(zoom=state.zoom){
 const z=clamp(Number(zoom)||1,.38,3.5);
 return {fontSize:clamp(14.4*Math.pow(z,.27),11,21)/(2*z),halo:2.15/(2*z)};
}
function lineLabelPosition(line,a,b,metrics=lineLabelMetrics()){
 const dx=b.x-a.x,dy=b.y-a.y,n=Math.hypot(dx,dy);
 if(n<1e-8)return {x:a.x,y:a.y};
 const point={x:a.x+dx*.55,y:a.y+dy*.55};
 let nx=-dy/n,ny=dx/n;
 if(ny>0||(Math.abs(ny)<1e-5&&nx<0)){nx=-nx;ny=-ny;}
 const gap=Math.max(3.5,metrics.fontSize*.82);
 return {x:point.x+nx*gap+(Number(line.labelOffset?.dx)||0),
  y:point.y+ny*gap+(Number(line.labelOffset?.dy)||0)};
}
function refreshLineLabels(){
 const layer=$('drawingLayer');if(!layer)return;
 const metrics=lineLabelMetrics();
 for(const node of layer.querySelectorAll('[data-line-label-id]')){
  const line=get(node.getAttribute('data-line-label-id'));if(!line?.label)continue;
  const v=linePoints(line);if(!v)continue;
  const p=lineLabelPosition(line,v.a,v.b,metrics);
  node.setAttribute('x',p.x);node.setAttribute('y',p.y);
  node.setAttribute('font-size',metrics.fontSize);
  node.setAttribute('stroke-width',metrics.halo);
  node.setAttribute('fill',line.color||state.style.color);
 }
}
function standardizeExportLineLabels(svg){
 const metrics={fontSize:3.8,halo:.75};
 for(const node of svg.querySelectorAll('[data-line-label-id]')){
  const line=get(node.getAttribute('data-line-label-id'));if(!line?.label)continue;
  const v=linePoints(line);if(!v)continue;
  const p=lineLabelPosition(line,v.a,v.b,metrics);
  node.setAttribute('x',p.x);node.setAttribute('y',p.y);
  node.setAttribute('font-size',metrics.fontSize);
  node.setAttribute('stroke-width',metrics.halo);
  node.setAttribute('font-style','italic');
  node.setAttribute('fill',line.color||state.style.color);
  node.removeAttribute('data-line-label-id');
  node.removeAttribute('data-id');
  node.setAttribute('pointer-events','none');
 }
}

function drawLine(parent,e,selected=false,interactive=true){const pts=linePoints(e);if(!pts)return;let {a,b}=pts;if(e.extent==='line'){
 const d=minus(b,a);const ext=e.region==='plan'?{minX:15,minY:192,maxX:281,maxY:306}:e.region==='front'?{minX:15,minY:40,maxX:281,maxY:187}:e.region==='drawing'?{minX:15,minY:38,maxX:281,maxY:307}:{minX:0,minY:0,maxX:297,maxY:420};
 let samples=[];if(Math.abs(d.x)>1e-9){samples.push({x:ext.minX,y:a.y+(ext.minX-a.x)*d.y/d.x},{x:ext.maxX,y:a.y+(ext.maxX-a.x)*d.y/d.x});}
 if(Math.abs(d.y)>1e-9){samples.push({x:a.x+(ext.minY-a.y)*d.x/d.y,y:ext.minY},{x:a.x+(ext.maxY-a.y)*d.x/d.y,y:ext.maxY});}
 samples=samples.filter(p=>p.x>=ext.minX-.01&&p.x<=ext.maxX+.01&&p.y>=ext.minY-.01&&p.y<=ext.maxY+.01);
 if(samples.length>=2){a=samples[0];b=samples[1];}else return;
 }
 const line=makeSVG('line',{x1:a.x,y1:a.y,x2:b.x,y2:b.y,stroke:e.color||state.style.color,'stroke-width':e.width??state.style.width,'stroke-dasharray':styleLine(e.dash),'stroke-linecap':'round','data-id':interactive?e.id:undefined},parent);
 if(selected)line.classList.add('selected-drawing');
 if(interactive){makeSVG('line',{x1:a.x,y1:a.y,x2:b.x,y2:b.y,stroke:'transparent','stroke-width':5,'data-id':e.id},parent);}
 if(e.label){
  const metrics=lineLabelMetrics(),position=lineLabelPosition(e,a,b,metrics);
  const label=makeSVG('text',{x:position.x,y:position.y,class:'line-label',
   'data-line-label-id':interactive?e.id:undefined,'data-id':interactive?e.id:undefined,
   'text-anchor':'middle','font-size':metrics.fontSize,'stroke-width':metrics.halo,
   fill:e.color||state.style.color,
   'font-style':'italic','pointer-events':interactive?'bounding-box':'none'},parent);
  label.textContent=printablePointLabel(e.label);
 }
}
function drawPoint(parent,p,selected=false,interactive=true){
 if(p.invalid)return;
 const scale=state.pointScale;
 const radius=(p.small?1.1:1.5)*scale;
 const stroke=(p.width??(p.small?.6:.75))*Math.max(.55,scale);
 const glowGap=Math.max(.32,.65*scale);
 if(selected)makeSVG('circle',{cx:p.x,cy:p.y,r:radius+glowGap,
   fill:'none',stroke:'#e99624','stroke-width':Math.max(.3,.45*scale),'pointer-events':'none'},parent);
 makeSVG('circle',{cx:p.x,cy:p.y,r:radius,fill:'#fff',
   stroke:p.color||COLORS.ink,'stroke-width':stroke,'data-id':interactive?p.id:undefined},parent);
 // A separate, invisible hit zone keeps tiny markers selectable, without
 // allowing B₂ to mask a nearby dependent point J₂ when zoomed in.
 if(interactive){
  const hitRadius=Math.max(radius+.45,Math.min(5,6/(2*Math.max(.38,state.zoom))));
  makeSVG('circle',{cx:p.x,cy:p.y,r:hitRadius,
   fill:'transparent','data-id':p.id},parent);
 }
 const metrics=pointLabelMetrics(),[dx,dy]=labelOffset(p,metrics);
 const text=makeSVG('text',{x:p.x+dx,y:p.y+dy,class:'point-label','data-point-id':p.id,
  'data-point-label-id':interactive?p.id:undefined,
  'font-size':metrics.fontSize,'stroke-width':metrics.halo,
  'pointer-events':interactive?'bounding-box':'none'},parent);
 text.textContent=printablePointLabel(p.label);
}
function legendText(parent,x,y,text,color='#5b6e83',size=3.3,weight='normal'){const t=makeSVG('text',{x,y,fill:color,'font-size':size,'font-family':'Arial,sans-serif','font-weight':weight,'pointer-events':'none'},parent);t.textContent=text;return t;}
function baseDecor(layer){
 if(state.paperMode==='blank'){return;}
 makeSVG('line',{x1:13,y1:190,x2:283,y2:190,stroke:'#465a75','stroke-width':.55},layer);
 legendText(layer,16,185,'x',COLORS.ink,4.3,'bold');
 for(let x=25;x<=175;x+=25){const sx=A3.origin.x-x;makeSVG('line',{x1:sx,y1:188.4,x2:sx,y2:191.6,stroke:'#7188a1','stroke-width':.35},layer);legendText(layer,sx-3,195.5,String(x),'#73859b',2.65);}
 makeSVG('line',{x1:A3.origin.x,y1:188.5,x2:A3.origin.x,y2:191.5,stroke:'#57687d','stroke-width':.4},layer);legendText(layer,247,195,'O',COLORS.ink,3.1);
 legendText(layer,16,35,'Π₂  /  ВИГЛЯД СПЕРЕДУ','#61778e',3.5,'bold');
 legendText(layer,16,314,'Π₁  /  ВИГЛЯД ЗВЕРХУ','#61778e',3.5,'bold');
 if(state.step>=6||state.mode==='manual'){
  makeSVG('rect',{x:205,y:338,width:72,height:41,rx:1.4,fill:'#f8fbfd','fill-opacity':.94,stroke:'#b4cad8','stroke-width':.45},layer);
  legendText(layer,209,345,'СПРАВЖНЯ ДОВЖИНА DH',COLORS.ink,3.3,'bold');
  if(taskResult){legendText(layer,209,352,`RS = ${fmt(taskResult.horizontal,3)} мм`,'#586f85',3.3);legendText(layer,209,358,`ST = ${fmt(taskResult.deltaZ,3)} мм`,'#586f85',3.3);legendText(layer,209,367,`DH = ${fmt(taskResult.dist)} мм`,COLORS.answer,5.3,'bold');}
 }
 if(state.step>=6||state.mode==='manual')legendText(layer,160,338,'МЕТОД ПРЯМОКУТНОГО ТРИКУТНИКА','#647990',3.1,'bold');
}

/* Orthographic profile: Π₃ = (Y,Z), derived from the paired Π₁ / Π₂ points. */
function renderProfileProjection(parent){
 if(!state.projection.profile)return;
 const pairMap=new Map();
 const pset=state.entities.filter(e=>e.type==='point'&&visibleEntity(e,true));
 for(const p of pset){
  if(!p.label||!/[12]$/.test(p.label))continue;
  const plane=projectedPlane(p);
  if(!plane)continue;
  const base=p.label.slice(0,-1);
  const pair=pairMap.get(base)||{};
  pair[plane]=p;pairMap.set(base,pair);
 }
 const points=new Map();
 for(const [name,pair] of pairMap){
  if(!pair.pi1||!pair.pi2)continue;
  const projected={x:174+pair.pi1.y-A3.origin.y,y:405-(A3.origin.y-pair.pi2.y)};
  if(projected.x>=166&&projected.x<=280&&projected.y>=318&&projected.y<=411)points.set(name,projected);
 }
 const g=makeSVG('g',{'aria-label':'Третя ортогональна проєкція Π3'},parent);
 makeSVG('rect',{x:165,y:309,width:119,height:106,rx:2,fill:'#fff','fill-opacity':.94,stroke:'#d1e0e8','stroke-width':.35},g);
 legendText(g,170,316,'Π₃  /  ПРОФІЛЬ (Y, Z)','#4e6c85',3.8,'bold');
 makeSVG('line',{x1:174,y1:405,x2:277,y2:405,stroke:'#839eb4','stroke-width':.35},g);
 makeSVG('line',{x1:174,y1:405,x2:174,y2:322,stroke:'#839eb4','stroke-width':.35},g);
 legendText(g,273,402,'Y','#14888c',3.5,'bold');legendText(g,177,326,'Z','#ae7547',3.5,'bold');
 for(const line of state.entities.filter(e=>e.type==='line'&&(e.kind==='triangle'||(e.kind==='task5'&&e.stage===1)))){
  const a=get(line.a),b=get(line.b);
  if(!a||!b||!a.label?.endsWith('1')||!b.label?.endsWith('1'))continue;
  const p=points.get(a.label.slice(0,-1)),q=points.get(b.label.slice(0,-1));
  if(p&&q)makeSVG('line',{x1:p.x,y1:p.y,x2:q.x,y2:q.y,
   stroke:line.color||COLORS.base,'stroke-width':Math.min(line.width||.7,.8)},g);
 }
 for(const [name,p] of points){
  makeSVG('circle',{cx:p.x,cy:p.y,r:1.35*state.pointScale,fill:'#fff',stroke:COLORS.base,'stroke-width':.65*Math.max(.55,state.pointScale)},g);
  const metrics=pointLabelMetrics(),left=p.x>260;
  const text=makeSVG('text',{x:p.x+(left?-metrics.gap:metrics.gap),y:p.y-Math.max(metrics.fontSize*.45,2),'data-profile-x':p.x,'data-profile-y':p.y,'text-anchor':left?'end':'start',class:'point-label','font-size':metrics.fontSize,'stroke-width':metrics.halo,'pointer-events':'none'},g);
  text.textContent=printablePointLabel(name+'3');
 }
 if(!points.size)legendText(g,170,350,'Спочатку додайте точки X, Y, Z','#778b9d',2.8);
}

function axisScaleSegments(){
 return state.entities.filter(e=>e.type==='line'&&visibleEntity(e)).map(e=>{
  const v=linePoints(e);
  if(!v?.a||!v?.b)return null;
  return {x1:v.a.x,y1:v.a.y,x2:v.b.x,y2:v.b.y,
   extent:e.extent||'segment',kind:e.kind||'normal'};
 }).filter(Boolean);
}
function redraw(){recomputeDerived();const l=$('drawingLayer');l.replaceChildren();const stage=state.mode==='auto'?state.step:6;const always=state.mode==='manual';baseDecor(l);
 const visible=state.entities.filter(e=>visibleEntity(e));
 visible.filter(e=>e.type==='line').forEach(e=>drawLine(l,e,state.selected===e.id));
 visible.filter(e=>!['line','point'].includes(e.type)).forEach(e=>renderPrimitive(l,e,state.selected===e.id));
 visible.filter(e=>e.type==='point').forEach(e=>drawPoint(l,e,state.selected===e.id));
 if(state.mode==='manual'&&state.selected)showSelectionHandles(l,get(state.selected));
 renderProfileProjection(l);
 window.GeometryStudioAxes?.refresh?.(axisScaleSegments(),state.zoom);
 if(state.grid)$('gridLayer').style.display='';else $('gridLayer').style.display='none';$('canvasViewport').classList.toggle('grid-on',state.grid);
 const preview=$('previewLayer');preview.replaceChildren();
 if(state.pending?.start){const p=pointOf(state.pending.start);if(p){makeSVG('circle',{cx:p.x,cy:p.y,r:3.5,stroke:'#15a2ab','stroke-width':.8,fill:'none','stroke-dasharray':'2 1'},preview);}}
 if(state.showIntersections){const ls=visible.filter(e=>e.type==='line'&&e.kind!=='guide'&&!['drawing','front','plan'].includes(e.region));let total=0;for(let i=0;i<ls.length&&total<150;i++){for(let j=i+1;j<ls.length&&total<150;j++){const p=linePoints(ls[i]),q=linePoints(ls[j]);if(!p||!q)continue;const ans=lineIntersect(p.a,p.b,q.a,q.b,ls[i].extent==='segment',ls[j].extent==='segment');if(!ans||ans.point.x<0||ans.point.x>297||ans.point.y<0||ans.point.y>420)continue;total++;makeSVG('circle',{cx:ans.point.x,cy:ans.point.y,r:1.4,fill:'#f59d2e','fill-opacity':.55,stroke:'#fff','stroke-width':.3},preview);}}}
 refreshPointLabels();
 updateStepUI();
}
function updateStepUI(){let step=state.step;$('stepTitle').textContent=STEPS[step][0];$('stepDescription').textContent=STEPS[step][1];$('stepCount').textContent=`${String(step+1).padStart(2,'0')} / 07`;$('stepRange').value=String(step);$('stepPrev').disabled=step===0;$('stepNext').disabled=step===6;$('stepNext').textContent=step===6?'Завершено ✓':'Далі →';$('docName').textContent=state.paperMode==='blank'?'Нове креслення':'Відстань від точки до площини';$('docVariant').textContent=state.paperMode==='blank'?'A3 • клітинка 5 мм':'Варіант 15';$('canvasHelp').textContent=state.mode==='auto'?STEPS[step][1]:manualHint();}
function manualHint(){if(state.pending){if(['segment','line','ruler'].includes(state.tool))return 'Оберіть другу точку. Shift — строго горизонтально (0°) або вертикально (90°). Esc — скасувати.';if(state.tool==='perp')return state.pending.start
 ?'Перпендикуляр: вкажіть третім натисканням довжину відрізка n₁/n₂. Напрям строго 90°.'
 :'Перпендикуляр: натисніть на точку D₁ або D₂; точка не дублюватиметься.';
 if(state.tool==='parallel')return 'Натисніть на точку, через яку провести паралельну лінію.';if(state.tool==='intersect')return 'Тепер оберіть другу лінію, щоб створити точку перетину.';if(state.pending?.points)return 'Вкажіть наступну точку побудови. Esc — скасувати.';}
 return ({select:'Перетягуй полотно мишкою. Клацни об’єкт, щоб вибрати. Alt + перетягування — перемістити точку.',pan:'Перетягуй полотно мишкою.',pencil:'Ведіть олівцем по аркушу, утримуючи кнопку миші.',ruler:'Вкажіть дві точки для точного відрізка.',eraser:'Натисніть на об’єкт, щоб стерти його.',compass:'Вкажіть центр кола, потім точку на колі.',circle:'Вкажіть центр кола, потім точку на його окружності.',rectangle:'Вкажіть дві протилежні вершини прямокутника.',protractor:'Вкажіть вершину кута та кінці двох його сторін.',square:'Вкажіть початкову та кінцеву точки. Напрям буде кратний обраному куту.',curve:'Вкажіть початок, точку згину та кінець кривої.',shapes:'Вкажіть дві вершини прямокутника або еліпса; три точки для трикутника.',dimension:'Вкажіть дві точки для розмірної лінії.',projection:'Натисніть точку для вертикалі. Shift — горизонтальна проєкція.',select:'Клацніть об’єкт для вибору. Перетягніть точку, щоб змінити геометрію.',point:'Клацніть місце на аркуші, щоб поставити точку.',segment:'Оберіть дві точки для створення відрізка.',line:'Оберіть дві точки для нескінченної прямої.',perp:'Перпендикулярний ВІДРІЗОК: спочатку оберіть h₁ або f₂, потім точку D, потім кінець відрізка.',parallel:'Оберіть опорну пряму, потім точку для паралелі.',intersect:'Оберіть дві прямі — сайт обчислить точку перетину.',pan:'Тягніть полотно мишкою.',erase:'Натисніть на точку або лінію, щоб видалити.'})[state.tool];}

/* Contextual style controls for already-drawn geometry. */
let styleChangeSnapshot=null,styleChangeKind=null;
function editableStyleTargets(){
 if(state.tool!=='select'||state.mode!=='manual'||!state.selected)return [];
 const selected=get(state.selected);
 if(!selected||!visibleEntity(selected)||!['point','line','shape','circle','path','angle','dimension'].includes(selected.type))return [];
 // A triangle is a single logical figure; its three connected edges share styling.
 if(selected.type==='line'&&selected.kind==='triangle'){
  const ids=new Set(connectedLinePointIds(selected));
  const sides=state.entities.filter(e=>e.type==='line'&&e.kind==='triangle'&&visibleEntity(e)&&
    typeof e.a==='string'&&typeof e.b==='string'&&ids.has(e.a)&&ids.has(e.b));
  if(sides.length)return sides;
 }
 return [selected];
}
/* Exact continuation of a line through its original endpoints. */
let extensionState=null;
let preparedExtension=null;
function extensionGeometry(base,target,endpoint){
 if(!base||!target||base.type!=='line'||target.type!=='line'||base.id===target.id)return null;
 const v=linePoints(base),q=linePoints(target);if(!v||!q)return null;
 const solution=lineIntersect(v.a,v.b,q.a,q.b,false,target.extent!=='line');
 if(!solution)return null;
 const eps=1e-5;
 if(endpoint==='a'&&solution.t>=-eps)return null;
 if(endpoint==='b'&&solution.t<=1+eps)return null;
 return solution;
}
function extensionFreeGeometry(base,endpoint,world){
 const v=linePoints(base);if(!v||!world)return null;
 const d=minus(v.b,v.a),n=dot(d,d);if(n<1e-10)return null;
 const t=dot(minus(world,v.a),d)/n;
 if((endpoint==='a'&&t>=-.005)||(endpoint==='b'&&t<=1.005))return null;
 return {point:plus(v.a,times(d,t)),t};
}
function extensionPointPosition(derivation){
 const base=get(derivation.base);
 if(!base)return null;
 if(derivation.kind==='extensionIntersection')return extensionGeometry(base,get(derivation.target),derivation.endpoint)?.point||null;
 if(derivation.kind==='extensionParam'){
  const v=linePoints(base);return v&&Number.isFinite(derivation.t)?
    plus(v.a,times(minus(v.b,v.a),derivation.t)):null;
 }
 return null;
}
function extensionEndpointLabel(value,fallback){
 const p=typeof value==='string'?get(value):null;
 return p?.label?printablePointLabel(p.label):fallback;
}
function extensionNormalizeLabel(raw){
 const map={'₀':'0','₁':'1','₂':'2','₃':'3','₄':'4','₅':'5','₆':'6','₇':'7','₈':'8','₉':'9'};
 const label=String(raw||'').trim().replace(/[₀-₉]/g,c=>map[c]);
 if(!/^[A-Za-zА-Яа-яІіЇїЄєҐґ][A-Za-zА-Яа-яІіЇїЄєҐґ0-9_'′-]{0,11}$/.test(label))
   throw Error('Вкажіть коротку назву точки, наприклад J₂.');
 if(state.entities.some(p=>p.type==='point'&&p.label===label))
   throw Error('Точка '+printablePointLabel(label)+' вже існує. Вкажіть іншу назву.');
 return label;
}
function extensionMessage(message,kind='normal'){
 const el=$('extendStatus');if(!el)return;
 el.textContent=message;
 el.classList.toggle('error',kind==='error');
 el.classList.toggle('ready',kind==='ready');
}
function extensionSource(){
 const base=extensionState?get(extensionState.base):null;
 return base?.type==='line'?base:null;
}
function extensionSetEndpoint(endpoint){
 if(!extensionState||!['a','b'].includes(endpoint))return;
 extensionState.endpoint=endpoint;
 preparedExtension=null;
 const confirm=$('extendConfirm');if(confirm){confirm.disabled=true;confirm.hidden=extensionState.stage!=='pick';}
 document.querySelectorAll('#extendEndpoints button').forEach(btn=>
  btn.setAttribute('aria-pressed',String(btn.dataset.endpoint===endpoint)));
 extensionMessage(extensionState.stage==='pick'?'Оберіть цільову лінію або довільну довжину за цим кінцем.':'Натисніть «Почати», а потім виберіть цільову лінію на кресленні.');
}
function updateExtensionPanel(){
 const controls=$('extensionControls'),options=$('extendOptions');
 if(!controls||!options)return;
 const chosen=get(state.selected);
 const supported=state.mode==='manual'&&state.tool==='select'&&chosen?.type==='line'&&
  chosen.extent!=='line'&&chosen.kind!=='projection'&&chosen.kind!=='extension';
 controls.hidden=!supported;
 if(!supported){
  if(extensionState)extensionState=null;
  preparedExtension=null;
  const confirm=$('extendConfirm');if(confirm){confirm.hidden=true;confirm.disabled=true;}
  options.hidden=true;
  $('canvasViewport')?.classList.remove('extend-picking');
  return;
 }
 if(extensionState&&extensionState.base!==chosen.id){extensionState=null;options.hidden=true;}
 options.hidden=!extensionState;
 const confirm=$('extendConfirm');if(confirm){confirm.hidden=extensionState?.stage!=='pick';confirm.disabled=!preparedExtension?.result;}
 if(extensionState){
  const source=extensionSource();if(!source)return;
  const optionsGroup=$('extendEndpoints');
  const key=source.id+':'+String(source.a)+':'+String(source.b);
  if(optionsGroup.dataset.sourceKey!==key){
   optionsGroup.dataset.sourceKey=key;
   optionsGroup.replaceChildren();
   for(const [endpoint,fallback] of [['a','A'],['b','B']]){
    const btn=document.createElement('button');
    btn.type='button';btn.dataset.endpoint=endpoint;
    btn.textContent=extensionEndpointLabel(source[endpoint],fallback);
    btn.setAttribute('aria-label','Продовжити за точку '+btn.textContent);
    btn.addEventListener('click',()=>extensionSetEndpoint(endpoint));
    optionsGroup.append(btn);
   }
  }
  optionsGroup.querySelectorAll('button').forEach(btn=>
   btn.setAttribute('aria-pressed',String(btn.dataset.endpoint===extensionState.endpoint)));
  $('extendActivate').textContent=extensionState.stage==='pick'?(extensionState.mode==='free'?'Виберіть кінець на аркуші':'Виберіть лінію на аркуші'):'Почати';
  $('extendActivate').disabled=extensionState.stage==='pick';
 }
}
function extensionBegin(){
 const base=get(state.selected);if(base?.type!=='line')return;
 extensionState={base:base.id,endpoint:'a',stage:'setup',mode:'intersection'};
 preparedExtension=null;
 $('extendLineDash').value=normalizedLineDash(base.dash);
 const labels=[extensionEndpointLabel(base.a,'A'),extensionEndpointLabel(base.b,'B')];
 // Keep a descriptive-geometric point name, not an auto-numbered P marker.
 $('extendPointName').value=state.entities.some(p=>p.type==='point'&&p.label==='J2')?'J3':'J2';
 $('extendEndpoints').dataset.sourceKey='';
 $('extendOptions').hidden=false;
 document.querySelector('#extensionControls input[value="intersection"]').checked=true;
 updateExtensionPanel();
 extensionMessage('Оберіть кінець '+labels.join(' або ')+' й натисніть «Почати».');
}
function extensionCancel(){
 extensionState=null;
 preparedExtension=null;
 if($('extendConfirm')){$('extendConfirm').hidden=true;$('extendConfirm').disabled=true;}
 $('extendOptions')?.setAttribute('hidden','');
 $('canvasViewport')?.classList.remove('extend-picking');
 $('previewLayer')?.replaceChildren();
 if(state.mode==='manual')updateExtensionPanel();
}
function extensionActivate(){
 if(!extensionSource())return;
 const selected=document.querySelector('#extensionControls input[name="extendMethod"]:checked');
 extensionState.mode=selected?.value==='free'?'free':'intersection';
 extensionState.dash=normalizedLineDash($('extendLineDash').value);
 try{extensionNormalizeLabel($('extendPointName').value);}catch(e){extensionMessage(e.message,'error');return;}
 extensionState.stage='pick';
 preparedExtension=null;
 if($('extendConfirm')){$('extendConfirm').hidden=false;$('extendConfirm').disabled=true;}
 $('extendActivate').disabled=true;
 $('extendActivate').textContent=extensionState.mode==='free'?'Вкажіть кінець на аркуші':'Виберіть лінію на аркуші';
 $('canvasViewport').classList.add('extend-picking');
 extensionMessage(extensionState.mode==='free'
  ?'Наведіть курсор за вибраний кінець. Лінія залишиться строго на тій самій прямій. Натисніть для завершення.'
  :'Наведіть курсор на лінію, з якою має перетнутися продовження, та натисніть на неї.');
}
function extensionChoice(event,p){
 if(!extensionState||!p)return null;
 const source=extensionSource();if(!source)return null;
 if(extensionState.mode==='free')
  return {result:extensionFreeGeometry(source,extensionState.endpoint,p),target:null,endpoint:extensionState.endpoint};
 // Mouse pointer capture changes event.target into the viewport. Find the nearest
 // actual geometric target instead of relying on the DOM hit element.
 const directId=event?.target?.closest?.('[data-id]')?.getAttribute('data-id');
 const tolerance=Math.max(3.1,dragTolerance());
 let best=null,nearestInvalid=null,invalidDistance=Infinity;
 for(const line of state.entities){
  if(line.type!=='line'||!visibleEntity(line)||line.id===source.id||
    line.kind==='projection'||line.kind==='extension')continue;
  const distance=geometryEdgeDistance(line,p);
  if(distance>tolerance)continue;
  if(distance<invalidDistance){invalidDistance=distance;nearestInvalid=line;}
  const endpoint=extensionState.endpoint;
  const requested=extensionGeometry(source,line,endpoint);
  // If the user selected the other endpoint inadvertently, allow the only
  // geometrically valid outward continuation instead of rejecting the point.
  const reverse=endpoint==='a'?'b':'a';
  const alternate=requested?null:extensionGeometry(source,line,reverse);
  const result=requested||alternate;
  if(!result)continue;
  const chosenEnd=requested?endpoint:reverse;
  const preference=(chosenEnd===endpoint?0:.35)+(line.id===directId?-.25:0);
  const score=distance+preference;
  if(!best||score<best.score)
   best={result,target:line,endpoint:chosenEnd,score};
 }
 return best||{result:null,target:nearestInvalid,endpoint:extensionState.endpoint};
}
function drawExtensionPreview(world,event){
 if(extensionState?.stage!=='pick'||!world)return;
 const base=extensionSource(),v=linePoints(base);
 if(!v)return;
 const layer=$('previewLayer');
 layer.replaceChildren();
 const origin=extensionState.endpoint==='a'?v.a:v.b;
 const d=minus(v.b,v.a),m=Math.hypot(d.x,d.y);
 if(m<1e-7)return;
 const forward=extensionState.endpoint==='a'?-1:1;
 const latest=extensionChoice(event,world);
 if(latest?.result){
  preparedExtension={...latest,baseId:base.id,mode:extensionState.mode};
  const confirm=$('extendConfirm');if(confirm){confirm.disabled=false;confirm.hidden=false;}
 }
 const projected=latest?.result?latest:(preparedExtension?.baseId===base.id?preparedExtension:null);
 const chosenEnd=projected?.endpoint||extensionState.endpoint;
 const actualOrigin=chosenEnd==='a'?v.a:v.b;
 const end=projected?.result?.point||plus(origin,times(d,forward*55/m));
 makeSVG('line',{x1:actualOrigin.x,y1:actualOrigin.y,x2:end.x,y2:end.y,
  stroke:'#e98b35','stroke-width':.8,'stroke-dasharray':styleLine(extensionState.dash),
  'stroke-linecap':'round','pointer-events':'none'},layer);
 if(projected?.result){
  makeSVG('circle',{cx:end.x,cy:end.y,r:2.35,fill:'#fff',stroke:'#098f8c',
   'stroke-width':.8,'pointer-events':'none'},layer);
  extensionMessage('Перетин знайдено. Натисніть «Поставити точку» або клацніть на цільовій лінії.','ready');
 }else if(projected?.target){
  extensionMessage('Перетин не лежить за обраним кінцем, або прямі паралельні. Оберіть іншу лінію.','error');
 }else{
  extensionMessage(extensionState.mode==='free'?'Ведіть курсор у напрямку продовження.':
   'Натисніть на цільову лінію: її перетин буде обчислено автоматично.');
 }
}
function extensionApplyPoint(geometry,target,endpointOverride){
 if(!geometry?.point||!extensionState)return false;
 const chosenEndpoint=endpointOverride||extensionState.endpoint;
 const base=extensionSource();
 if(!base)return false;
 let label;
 try{label=extensionNormalizeLabel($('extendPointName').value);}
 catch(e){extensionMessage(e.message,'error');return false;}
 const at=base[chosenEndpoint];
 if(typeof at!=='string'&&(!at||!Number.isFinite(at.x)||!Number.isFinite(at.y))){
  extensionMessage('Не вдалося визначити опорну вершину відрізка.','error');return false;
 }
 const derivation=extensionState.mode==='intersection'?
  {kind:'extensionIntersection',base:base.id,target:target.id,endpoint:chosenEndpoint}:
  {kind:'extensionParam',base:base.id,t:geometry.t,endpoint:chosenEndpoint};
 const before=snapshotForUndo();
 try{
  const pointId=addPoint(label,geometry.point,{color:'#128a88',derivation});
  const point=get(pointId);
  point.projectionPlane=projectedPlane(base)||undefined;
  const extensionId=addLine(at,pointId,{kind:'extension',
    dash:normalizedLineDash(extensionState.dash||base.dash),
    color:base.color||state.style.color,width:base.width??.65,extent:'segment'});
  get(extensionId).sourceLine=base.id;
  get(extensionId).sourceEndpoint=chosenEndpoint;
  if(target)get(extensionId).targetLine=target.id;
  pushUndoBefore(before,'Продовжено відрізок до '+printablePointLabel(label));
  extensionState=null;
  preparedExtension=null;
  if($('extendConfirm')){$('extendConfirm').hidden=true;$('extendConfirm').disabled=true;}
  state.pending=null;state.selected=pointId;
  $('canvasViewport').classList.remove('extend-picking');
  render();
  toast('Створено '+printablePointLabel(label)+' — точка залежить від вихідних ліній');
  return true;
 }catch(e){
  const snapshot=JSON.parse(before);
  state.entities=deep(snapshot.entities);state.counter=snapshot.counter;
  extensionMessage('Помилка побудови: '+e.message,'error');
  render();return false;
 }
}
function handleExtensionClick(event,p){
 if(extensionState?.stage!=='pick')return false;
 const current=extensionChoice(event,p);
 const choice=current?.result?current:preparedExtension;
 if(!choice?.result){
  extensionMessage(current?.target?
   'Перетин не знайдено. Наведіть на цільову лінію або змініть кінець продовження.':
   'Наведіть на цільову лінію — після появи точки натисніть «Поставити точку».','error');
  return true;
 }
 extensionApplyPoint(choice.result,choice.target,choice.endpoint);
 return true;
}
function initializeExtensionUI(){
 if(!$('extendStart'))return;
 $('extendStart').addEventListener('click',extensionBegin);
 $('extendActivate').addEventListener('click',extensionActivate);
 $('extendConfirm')?.addEventListener('click',()=>{
  if(extensionState?.stage!=='pick'||!preparedExtension?.result)return;
  extensionApplyPoint(preparedExtension.result,preparedExtension.target,preparedExtension.endpoint);
 });
 $('extendCancel').addEventListener('click',extensionCancel);
}


let lineLabelDraft=null;
function lineAnnotationValue(text){return String(text??'').trim().slice(0,18);}
function updateLineAnnotation(text,commit=false){
 const selected=get(state.selected);
 if(selected?.type!=='line')return;
 if(!lineLabelDraft||lineLabelDraft.id!==selected.id)
  lineLabelDraft={id:selected.id,before:snapshotForUndo()};
 selected.label=lineAnnotationValue(text);
 if(commit){
  const before=lineLabelDraft.before;
  lineLabelDraft=null;
  if(before!==snapshotForUndo())pushUndoBefore(before,'Змінено позначення відрізка');
  render();
 }else{
  redraw();
  saveLocalDebounced();
 }
}


/* Rename displayed point labels without changing stable geometric IDs.
 * Existing segments, projection links and dependent intersections keep working. */
function normalizeRenamedPointLabel(raw){
 const map={'₀':'0','₁':'1','₂':'2','₃':'3','₄':'4','₅':'5','₆':'6','₇':'7','₈':'8','₉':'9'};
 const label=String(raw??'').trim().replace(/[₀-₉]/g,char=>map[char]);
 if(!/^[A-Za-zА-Яа-яІіЇїЄєҐґ][A-Za-zА-Яа-яІіЇїЄєҐґ0-9_'′-]{0,11}$/.test(label))
  throw Error('Назва має починатися з літери й містити не більш ніж 12 символів.');
 return label;
}
function pointRenameMessage(message,isError=false){
 const status=$('selectedPointLabelStatus');
 if(!status)return;
 status.textContent=message;
 status.classList.toggle('error',isError);
}
function commitPointRename(){
 const point=get(state.selected);
 if(point?.type!=='point')return false;
 const input=$('selectedPointLabel');
 if(!input)return false;
 let label;
 try{label=normalizeRenamedPointLabel(input.value);}
 catch(error){pointRenameMessage(error.message,true);return false;}
 if(state.entities.some(entity=>entity.type==='point'&&entity.id!==point.id&&
    String(entity.label||'').toLocaleLowerCase('uk-UA')===label.toLocaleLowerCase('uk-UA'))){
  pointRenameMessage('Точка з назвою '+printablePointLabel(label)+' уже існує. Вибери іншу назву.',true);
  return false;
 }
 if(point.label===label){
  pointRenameMessage('Назва точки: '+printablePointLabel(label));
  return true;
 }
 const before=snapshotForUndo();
 point.label=label;
 pushUndoBefore(before,'Перейменовано точку на '+printablePointLabel(label));
 render();
 pointRenameMessage('Збережено: '+printablePointLabel(label));
 return true;
}

function updateSelectedStyleUI(){
 const panel=$('selectedStylePanel');if(!panel)return;
 const targets=editableStyleTargets();
 panel.hidden=!targets.length;
 if(!targets.length){
  $('selectedLineLabelRow').hidden=true;
  $('selectedPointLabelRow').hidden=true;
  $('selectedLineDashRow').hidden=true;
  updateExtensionPanel();return;
 }
 const selected=get(state.selected),current=targets[0];
 const pointLabelInput=$('selectedPointLabel');
 $('selectedPointLabelRow').hidden=selected?.type!=='point';
 if(selected?.type==='point'){
  if($('selectedPointLabelRow').dataset.pointId!==selected.id){
   $('selectedPointLabelRow').dataset.pointId=selected.id;
   pointRenameMessage('Наприклад, K1 → K₁. Натисни Enter або ✓, щоб зберегти.');
  }
  if(document.activeElement!==pointLabelInput)pointLabelInput.value=selected.label||'';
 }
 const dashRow=$('selectedLineDashRow'),dashInput=$('selectedLineDash');
 dashRow.hidden=selected?.type!=='line';
 if(selected?.type==='line'){
  dashInput.value=normalizedLineDash(current.dash);
  const preview=$('selectedLineDashPreview');
  preview.setAttribute('stroke-dasharray',styleLine(current.dash));
  preview.setAttribute('stroke',current.color||state.style.color);
 }
 const labelField=$('selectedLineLabel');
 $('selectedLineLabelRow').hidden=selected?.type!=='line';
 if(selected?.type==='line'&&document.activeElement!==labelField)
  labelField.value=selected.label||'';
 const family=targets.length>1;
 const title=family?'Трикутник · '+targets.length+' сторони':entityTitle(selected)+(selected.label?' · '+printablePointLabel(selected.label):'');
 $('selectedStyleName').textContent=title;
 $('selectedStyleScope').textContent=family?
  'Колір, товщина й тип лінії застосовуються до всіх сторін цього трикутника.':
  selected.type==='point'?'Зміни застосовуються до маркера вибраної точки.':
  'Колір, товщина й тип лінії застосовуються до вибраної фігури.';
 const color=(current.color||state.style.color||'#233c61').toLowerCase();
 $('selectedStyleCustom').value=/^#[0-9a-f]{6}$/.test(color)?color:'#233c61';
 document.querySelectorAll('.selected-style-swatch').forEach(btn=>
  btn.setAttribute('aria-pressed',String(btn.dataset.styleColor?.toLowerCase()===color)));
 const width=clamp(Number(current.width??(selected.type==='point'?.75:.65)),.2,3);
 const slider=$('selectedStyleWidth');
 if(document.activeElement!==slider)slider.value=String(width);
 $('selectedStyleWidthValue').textContent=width.toLocaleString('uk-UA',{maximumFractionDigits:2})+' мм';
 updateExtensionPanel();
}
function mutateSelectedStyle(property,value){
 const targets=editableStyleTargets();
 if(!targets.length)return false;
 for(const item of targets)item[property]=value;
 return true;
}
function commitSelectedStyle(property,value){
 const targets=editableStyleTargets();
 if(!targets.length)return;
 if(targets.every(item=>item[property]===value))return;
 pushUndoBefore(snapshotForUndo(),property==='color'?'Змінено колір фігури':property==='dash'?'Змінено тип лінії':'Змінено товщину фігури');
 mutateSelectedStyle(property,value);
 render();
}
function beginStyleChange(property,value){
 const targets=editableStyleTargets();
 if(!targets.length)return;
 if(!styleChangeSnapshot){styleChangeSnapshot=snapshotForUndo();styleChangeKind=property;}
 mutateSelectedStyle(property,value);
 redraw();
 $('selectedStyleWidthValue').textContent=Number($('selectedStyleWidth').value).toLocaleString('uk-UA',{maximumFractionDigits:2})+' мм';
}
function endStyleChange(property,value){
 if(!styleChangeSnapshot){commitSelectedStyle(property,value);return;}
 mutateSelectedStyle(property,value);
 const changed=styleChangeSnapshot!==snapshotForUndo();
 if(changed)pushUndoBefore(styleChangeSnapshot,property==='color'?'Змінено колір фігури':'Змінено товщину фігури');
 styleChangeSnapshot=null;styleChangeKind=null;
 render();
}
function initializeSelectedStyleUI(){
 const panel=$('selectedStylePanel');if(!panel)return;
 const pointInput=$('selectedPointLabel');
 if(pointInput){
  pointInput.addEventListener('keydown',event=>{
   if(event.key==='Enter'){event.preventDefault();commitPointRename();pointInput.blur();}
  });
  pointInput.addEventListener('change',commitPointRename);
  $('selectedPointLabelApply')?.addEventListener('click',commitPointRename);
 }

 const annotation=$('selectedLineLabel');
 if(annotation){
  annotation.addEventListener('input',e=>updateLineAnnotation(e.target.value,false));
  annotation.addEventListener('change',e=>updateLineAnnotation(e.target.value,true));
  annotation.addEventListener('keydown',e=>{
   if(e.key==='Enter'){e.preventDefault();annotation.blur();}
  });
  $('selectedLineLabelClear')?.addEventListener('click',()=>{
   updateLineAnnotation('',true);
   annotation.value='';
  });
 }
 $('selectedStyleClose').addEventListener('click',()=>{extensionCancel();state.selected=null;render();});
 panel.querySelectorAll('[data-style-color]').forEach(btn=>btn.addEventListener('click',()=>{
  commitSelectedStyle('color',btn.dataset.styleColor);
 }));
 const picker=$('selectedStyleCustom');
 picker.addEventListener('input',event=>beginStyleChange('color',event.target.value));
 picker.addEventListener('change',event=>endStyleChange('color',event.target.value));
 const dashSelect=$('selectedLineDash');
 dashSelect.addEventListener('change',event=>{
  if(get(state.selected)?.type==='line')commitSelectedStyle('dash',normalizedLineDash(event.target.value));
 });
 const slider=$('selectedStyleWidth');
 slider.addEventListener('input',event=>beginStyleChange('width',Number(event.target.value)));
 slider.addEventListener('change',event=>endStyleChange('width',Number(event.target.value)));
}


/* One global size setting for all point markers. Labels and lines retain their size. */
function normalizedPointScale(value){
 const n=Number(value);
 return Number.isFinite(n)&&n>0?clamp(Math.round(n*20)/20,.3,1.2):.6;
}
let globalPointSizeBefore=null;
function syncGlobalPointSize(){
 const range=$('globalPointSize'),value=$('globalPointSizeValue');
 if(range)range.value=String(Math.round(state.pointScale*100));
 if(value)value.textContent=Math.round(state.pointScale*100)+'%';
}
function initializeGlobalPointSize(){
 const range=$('globalPointSize');
 if(!range)return;
 range.addEventListener('pointerdown',()=>{globalPointSizeBefore=snapshotForUndo();});
 range.addEventListener('focus',()=>{if(!globalPointSizeBefore)globalPointSizeBefore=snapshotForUndo();});
 range.addEventListener('input',event=>{
  if(!globalPointSizeBefore)globalPointSizeBefore=snapshotForUndo();
  state.pointScale=normalizedPointScale(Number(event.target.value)/100);
  syncGlobalPointSize();redraw();saveLocalDebounced();
 });
 range.addEventListener('change',event=>{
  if(!globalPointSizeBefore)globalPointSizeBefore=snapshotForUndo();
  state.pointScale=normalizedPointScale(Number(event.target.value)/100);
  if(globalPointSizeBefore!==snapshotForUndo())pushUndoBefore(globalPointSizeBefore,'Змінено розмір усіх точок');
  globalPointSizeBefore=null;render();
 });
 syncGlobalPointSize();
}

function render(){redraw();renderInspector();syncUndoControls();updateSelectedStyleUI();syncGlobalPointSize();saveLocalDebounced();}
window.GeometryStudioViewportAPI={
 zoomIn:()=>moveZoom(1.2),
 zoomOut:()=>moveZoom(1/1.2),
 resetZoom:()=>fitPaper(),
 getAxisScaleSegments:()=>axisScaleSegments(),
 getZoom:()=>state.zoom,
 getProjection:()=>({...state.projection}),
 setProjection:options=>{
  state.projection={view:['both','pi1','pi2'].includes(options?.view)?options.view:state.projection.view,
   links:options?.links===undefined?state.projection.links:!!options.links,
   profile:options?.profile===undefined?state.projection.profile:!!options.profile};
  render();return {...state.projection};
 }
};

function renderInspector(){
 document.querySelectorAll('.inspector-tabs button').forEach(b=>b.classList.toggle('active',b.dataset.tab===state.tab));
 for(const tab of ['properties','points','history'])$(tab+'Tab').classList.toggle('hidden',state.tab!==tab);
 const sel=get(state.selected);const dyn=$('propertiesDynamic');dyn.replaceChildren();
 if(sel){const card=document.createElement('div');card.className='selection-banner';const title=document.createElement('div');title.className='title';title.textContent=`${entityTitle(sel)} ${sel.label||sel.id}`;card.append(title);const info=document.createElement('div');info.className='detail';
 if(sel.type==='point')info.textContent=`X аркуша: ${fmt(sel.x,3)} мм · Y аркуша: ${fmt(sel.y,3)} мм${sel.derivation?' · Залежна від побудови':''}`;
 else{const l=linePoints(sel);info.textContent=l?`Довжина між опорними точками: ${fmt(len(l.a,l.b),2)} мм · ${sel.extent==='line'?'Пряма':'Відрізок'}`:'Об’єкт без геометрії';}
 card.append(info);if(sel.type==='point'&&!sel.derivation){const row=document.createElement('div');row.className='xyz-form';row.style.marginTop='10px';for(const key of ['x','y']){const lab=document.createElement('label');lab.textContent=`${key.toUpperCase()}, мм`;const inp=document.createElement('input');inp.type='number';inp.step='any';inp.value=sel[key].toFixed(3);inp.addEventListener('change',()=>{const n=Number(inp.value);if(!Number.isFinite(n))return;saveUndo(`Зміна точки ${sel.label}`);sel[key]=n;render();});lab.append(inp);row.append(lab);}card.append(row);}
 const del=document.createElement('button');del.type='button';del.className='btn outline';del.textContent='Видалити об’єкт';del.addEventListener('click',deleteSelected);card.append(del);dyn.append(card);
 }else if(state.mode==='auto'&&state.paperMode==='example'){
 const sec=document.createElement('div');sec.className='panel-section';const title=document.createElement('h3');title.textContent='Координати · варіант 15';sec.append(title);
 const hint=document.createElement('p');hint.className='section-hint';hint.textContent='Змінюйте координати — геометрія та всі допоміжні точки перерахуються автоматично.';sec.append(hint);
 const table=document.createElement('div');table.className='coords-table';table.style.cssText='display:grid;grid-template-columns:30px repeat(3,1fr);gap:5px;align-items:center';
 for(const txt of ['','X','Y','Z']){const d=document.createElement('span');d.textContent=txt;d.style.cssText='text-align:center;font-size:10px;color:#91a0af;font-weight:700';table.append(d);}
 for(const key of 'ABCD'){const label=document.createElement('strong');label.textContent=key;label.style.fontSize='11px';table.append(label);for(const dim of 'xyz'){const inp=document.createElement('input');inp.type='number';inp.value=state.coords3[key][dim];inp.step='any';inp.style.cssText='padding:7px 3px;text-align:center';inp.title=`${key}.${dim}`;inp.addEventListener('change',()=>{const n=Number(inp.value);if(!Number.isFinite(n))return;const draft=deep(state.coords3);draft[key][dim]=n;try{computeTask(draft);saveUndo(`Зміна координати ${key}.${dim}`);state.coords3=draft;createExample();}catch(err){toast(err.message);inp.value=state.coords3[key][dim];}});table.append(inp);}}
 sec.append(table);if(taskResult){const d=document.createElement('div');d.className='readout';d.style.marginTop='13px';d.innerHTML=`<b>Розрахунок</b><div>H = (${fmt(taskResult.H.x,3)}; ${fmt(taskResult.H.y,3)}; ${fmt(taskResult.H.z,3)})</div><b style="color:#0b8d8e">DH = ${fmt(taskResult.dist,3)} мм</b>`;sec.append(d);}dyn.append(sec);
 }else{const info=document.createElement('div');info.className='panel-section';info.innerHTML='<h3>Побудова з точних координат</h3><p class="section-hint">Додайте точки мишкою або введіть просторові координати нижче. Виділіть лінію, щоб змінити її стиль.</p>';dyn.append(info);}
 const sw=sel&&sel.type!=='point'?sel.color:state.style.color;document.querySelectorAll('.swatch').forEach(b=>b.classList.toggle('active',b.dataset.color===sw));$('linePattern').value=sel&&sel.type!=='point'?sel.dash:state.style.dash;$('lineWidth').value=String(sel&&sel.type!=='point'?(Math.abs(sel.width-.35)<.15?.35:Math.abs(sel.width-.65)<.25?.65:1.05):state.style.width);
 const objectList=$('objectList');objectList.replaceChildren();const vis=state.entities.filter(e=>visibleEntity(e));
 for(const e of vis){const item=document.createElement('button');item.className='object-row';item.type='button';const dot=document.createElement('span');dot.className='obj-dot';dot.style.background=e.color||COLORS.ink;item.append(dot);const lab=document.createElement('span');lab.textContent=e.type==='point'?e.label:`${entityTitle(e)} ${e.label||e.id}`;item.append(lab);const extra=document.createElement('strong');extra.textContent=e.type==='point'?`${fmt(e.x,1)}; ${fmt(e.y,1)}`:'';item.append(extra);item.addEventListener('click',()=>{state.selected=e.id;state.tab='properties';render();openDrawer();});objectList.append(item);}
 const hist=$('historyList');hist.replaceChildren();for(const h of state.history){const d=document.createElement('div');d.className='history-item';const i=document.createElement('i'),t=document.createElement('span');t.textContent=`${h.time} · ${h.msg}`;d.append(i,t);hist.append(d);}if(!state.history.length){const e=document.createElement('p');e.className='section-hint';e.textContent='Тут з’являться ваші дії.';hist.append(e);}
 $('btnUndo').disabled=state.undo.length===0;$('btnRedo').disabled=state.redo.length===0;
}
function toast(text){const t=$('toast');t.textContent=text;t.classList.add('show');clearTimeout(toastTimeout);toastTimeout=setTimeout(()=>t.classList.remove('show'),3000);}
function saveLocalDebounced(){clearTimeout(persistTimer);persistTimer=setTimeout(saveLocal,450);}
function saveLocal(){
 const payload={entities:state.entities,coords3:state.coords3,counter:state.counter,paperMode:state.paperMode,
  mode:state.mode,step:state.step,grid:state.grid,snap:state.snap,projection:state.projection,pointScale:state.pointScale,history:state.history.slice(0,15),
  undo:state.undo.slice(-24),redo:state.redo.slice(-24)};
 // Preserve the drawing even if many previous snapshots would exceed storage quota.
 let data=JSON.stringify(payload);
 while(data.length>2800000&&(payload.undo.length||payload.redo.length)){
  if(payload.undo.length>=payload.redo.length)payload.undo.shift();
  else payload.redo.shift();
  data=JSON.stringify(payload);
 }
 try{localStorage.setItem('geometry-studio-v1',data);}
 catch(err){
  delete payload.undo;delete payload.redo;
  try{localStorage.setItem('geometry-studio-v1',JSON.stringify(payload));}catch(_){}
 }
}
function loadLocal(){try{const str=localStorage.getItem('geometry-studio-v1');if(!str)return false;const p=JSON.parse(str);if(!Array.isArray(p.entities)||p.entities.length>7000)return false;state.entities=p.entities;state.coords3=p.coords3||structuredClone(DEFAULT_3D);state.counter=p.counter||p.entities.length;state.paperMode=p.paperMode||'example';state.step=clamp(Number(p.step)||0,0,6);state.grid=p.grid!==false;state.projection=(p.projection&&['both','pi1','pi2'].includes(p.projection.view))?{view:p.projection.view,links:p.projection.links!==false,profile:!!p.projection.profile}:{view:'both',links:true,profile:false};state.snap=[0,1,5].includes(p.snap)?p.snap:5;state.history=Array.isArray(p.history)?p.history:[];state.mode=['manual','auto'].includes(p.mode)?p.mode:'auto';state.pointScale=normalizedPointScale(p.pointScale);
 const safeHistory=list=>Array.isArray(list)?list.filter(v=>typeof v==='string'&&v.length<350000&&v[0]==='{').slice(-24):[];
 state.undo=safeHistory(p.undo);state.redo=safeHistory(p.redo);
 if(state.paperMode==='example')taskResult=computeTask(state.coords3);return true;}catch(e){return false;}}
function screenToWorld(event){const svg=$('sheet');const pt=svg.createSVGPoint();pt.x=event.clientX;pt.y=event.clientY;const ctm=svg.getScreenCTM();if(!ctm)return null;const p=pt.matrixTransform(ctm.inverse());return {x:p.x,y:p.y};}
function nearestPoint(p,limit=5){let best=null,dist=limit;for(const e of state.entities){if(e.type!=='point'||!visibleEntity(e))continue;const d=len(p,e);if(d<dist){best=e;dist=d;}}return best;}
function nearestIntersection(p,limit=5){const ls=state.entities.filter(e=>e.type==='line'&&visibleEntity(e));let best=null,dist=limit;for(let i=0;i<ls.length;i++)for(let j=i+1;j<ls.length;j++){const a=linePoints(ls[i]),b=linePoints(ls[j]);if(!a||!b)continue;const c=lineIntersect(a.a,a.b,b.a,b.b,ls[i].extent==='segment',ls[j].extent==='segment');if(!c)continue;const d=len(p,c.point);if(d<dist){best=c.point;dist=d;}}return best;}
function snapped(p){const existing=nearestPoint(p,4);if(existing)return {x:existing.x,y:existing.y,id:existing.id};const ix=nearestIntersection(p,4);if(ix)return ix;if(!state.snap)return p;return {x:Math.round(p.x/state.snap)*state.snap,y:Math.round(p.y/state.snap)*state.snap};}
function ensurePoint(world){const pt=snapped(world);if(pt.id)return pt.id;const p=nearestPoint(pt,.4);if(p)return p.id;return addPoint(`P${state.counter+1}`,pt,{color:state.style.color});}
function lineCandidateFromEvent(ev,world){const id=ev.target.getAttribute('data-id');const e=get(id);if(e?.type==='line')return e;let winner=null,dist=4;for(const l of state.entities){if(l.type!=='line'||!visibleEntity(l))continue;const v=linePoints(l);if(!v)continue;const foot=foot2(world,v.a,v.b);if(!foot)continue;const segV=minus(v.b,v.a),t=dot(minus(foot,v.a),segV)/dot(segV,segV);if(l.extent==='segment'&&(t<0||t>1))continue;const d=len(world,foot);if(d<dist){winner=l;dist=d;}}return winner;}
function findClickEntity(ev,world){const el=ev.target.closest('[data-id]');let e=el?get(el.getAttribute('data-id')):null;if(!e){e=nearestPoint(world,3.5)||lineCandidateFromEvent(ev,world);}return e;}


/* CURSOR EDITOR
 * Point/vertex > figure outline > blank canvas.
 * An outline drag translates its entire connected figure; a handle drag
 * adjusts geometry. Projection partners follow X but retain their own Y/Z.
 */
function dragTolerance(){
 return Math.max(1.35,Math.min(4.5,8/Math.max(.7,2*state.zoom)));
}
function distanceToEdge(p,a,b){
 const vx=b.x-a.x,vy=b.y-a.y,den=vx*vx+vy*vy;
 if(den<1e-10)return Math.hypot(p.x-a.x,p.y-a.y);
 const t=clamp(((p.x-a.x)*vx+(p.y-a.y)*vy)/den,0,1);
 return Math.hypot(p.x-a.x-t*vx,p.y-a.y-t*vy);
}
function primitiveVertices(e){
 if(!e)return [];
 if((e.type==='shape'||e.type==='path'||e.type==='angle')&&e.points){
  if(e.type==='shape'&&e.kind==='rectangle'&&e.points.length>=2)return rectCorners(e.points[0],e.points[1]);
  return e.points;
 }
 if(e.type==='dimension'){
  const a=pointOf(e.a),b=pointOf(e.b);
  return a&&b?[a,b]:[];
 }
 if(e.type==='circle'&&e.center)return [
  {x:e.center.x,y:e.center.y},
  {x:e.center.x+e.radius,y:e.center.y}
 ];
 return [];
}
function isGeometryEditable(e){
 return !!e&&visibleEntity(e)&&(
  e.type==='line'&&!['projection','guide'].includes(e.kind)||
  ['path','shape','circle','angle','dimension'].includes(e.type)
 );
}
function geometryEdgeDistance(e,p){
 if(e.type==='line'){
  const v=linePoints(e);
  if(!v)return Infinity;
  if(e.extent==='line'){
   const d={x:v.b.x-v.a.x,y:v.b.y-v.a.y},den=d.x*d.x+d.y*d.y;
   if(den<1e-10)return Infinity;
   const t=((p.x-v.a.x)*d.x+(p.y-v.a.y)*d.y)/den;
   return Math.hypot(p.x-v.a.x-t*d.x,p.y-v.a.y-t*d.y);
  }
  return distanceToEdge(p,v.a,v.b);
 }
 if(e.type==='circle'&&e.center)return Math.abs(Math.hypot(p.x-e.center.x,p.y-e.center.y)-e.radius);
 if(e.type==='shape'&&e.kind==='ellipse'&&e.points?.length>=2){
  const a=e.points[0],b=e.points[1],cx=(a.x+b.x)/2,cy=(a.y+b.y)/2,rx=Math.abs(a.x-b.x)/2,ry=Math.abs(a.y-b.y)/2;
  if(rx<.001||ry<.001)return Infinity;
  const angle=Math.atan2((p.y-cy)/ry,(p.x-cx)/rx);
  return Math.hypot(p.x-(cx+rx*Math.cos(angle)),p.y-(cy+ry*Math.sin(angle)));
 }
 const verts=primitiveVertices(e);
 if(verts.length<2)return Infinity;
 let best=Infinity;
 for(let k=1;k<verts.length;k++)best=Math.min(best,distanceToEdge(p,verts[k-1],verts[k]));
 if(e.type==='shape'&&e.kind!=='ellipse')best=Math.min(best,distanceToEdge(p,verts[verts.length-1],verts[0]));
 if(e.type==='angle'&&verts.length===3)best=Math.min(best,distanceToEdge(p,verts[0],verts[2]));
 return best;
}
function connectedLinePointIds(line){
 const ids=new Set(),visited=new Set(),todo=[line.id];
 const category=line.kind==='triangle'?'triangle':line.kind;
 while(todo.length){
  const id=todo.pop();
  if(visited.has(id))continue;
  visited.add(id);
  const l=get(id);
  if(!l||l.type!=='line'||l.kind!==category||!isGeometryEditable(l))continue;
  for(const pid of [l.a,l.b]){
   if(typeof pid!=='string')continue;
   const p=get(pid);
   if(!p||p.type!=='point'||p.derivation)continue;
   if(ids.has(pid))continue;
   ids.add(pid);
   for(const other of state.entities){
    if(other.type==='line'&&other.kind===category&&isGeometryEditable(other)&&(other.a===pid||other.b===pid)){
      todo.push(other.id);
    }
   }
  }
 }
 return [...ids];
}
function geometryTargetAt(event,p){
 if(!p||state.mode!=='manual')return null;
 // Clicking the rendered text is distinct from grabbing the underlying vertex.
 // It works for calculated points too: only the annotation moves, never the point.
 const pointLabelNode=event?.target?.closest?.('[data-point-label-id]');
 const pointLabelId=pointLabelNode?.getAttribute('data-point-label-id');
 const labelPoint=pointLabelId?get(pointLabelId):null;
 if(labelPoint?.type==='point'&&visibleEntity(labelPoint)){
  const x=Number(pointLabelNode.getAttribute('x')),y=Number(pointLabelNode.getAttribute('y'));
  if(Number.isFinite(x)&&Number.isFinite(y))
   return {kind:'point-label',id:pointLabelId,labelStart:{x,y}};
 }
 const labelId=event?.target?.closest?.('[data-line-label-id]')?.getAttribute('data-line-label-id');
 const labelLine=labelId?get(labelId):null;
 if(labelLine?.type==='line'&&labelLine.label&&visibleEntity(labelLine))
  return {kind:'label',id:labelId};
 const tolerance=dragTolerance();
 let closestPoint=null,pointDistance=tolerance+1;
 for(const e of state.entities){
  if(e.type!=='point'||e.derivation||!visibleEntity(e))continue;
  const d=Math.hypot(e.x-p.x,e.y-p.y);
  if(d<pointDistance){pointDistance=d;closestPoint=e;}
 }
 if(closestPoint&&pointDistance<=tolerance)return {kind:'point',id:closestPoint.id};
 // Vertices of a primitive can be moved even before the primitive is selected.
 let vertex=null,vertexDistance=tolerance+1;
 for(const e of state.entities){
  if(!isGeometryEditable(e)||e.type==='line')continue;
  const vertices=primitiveVertices(e);
  for(let i=0;i<vertices.length;i++){
   const v=vertices[i];
   if(!v)continue;
   const d=Math.hypot(v.x-p.x,v.y-p.y);
   if(d<vertexDistance){vertex={kind:'vertex',id:e.id,index:i};vertexDistance=d;}
  }
 }
 if(vertex&&vertexDistance<=tolerance)return vertex;
 let body=null,bodyDistance=tolerance+1;
 const directId=event?.target?.closest?.('[data-id]')?.getAttribute('data-id');
 for(const e of state.entities){
  if(!isGeometryEditable(e))continue;
  const d=geometryEdgeDistance(e,p);
  if(d<=tolerance&&(d<bodyDistance||(Math.abs(d-bodyDistance)<.001&&e.id===directId))){
    bodyDistance=d;body={kind:'body',id:e.id};
  }
 }
 return bodyDistance<=tolerance?body:null;
}
function snapshotForUndo(){
 return JSON.stringify({entities:state.entities,coords3:state.coords3,paperMode:state.paperMode,counter:state.counter,pointScale:state.pointScale});
}
function projectionMateIds(ids){
 const origin=new Set(ids),extra=new Set();
 for(const line of state.entities){
  if(line.type!=='line'||line.kind!=='projection')continue;
  for(const [a,b] of [[line.a,line.b],[line.b,line.a]]){
   if(origin.has(a)&&typeof b==='string'&&!origin.has(b)){
    const point=get(b);if(point?.type==='point'&&!point.derivation)extra.add(b);
   }
  }
 }
 return [...extra];
}
function beginCursorGeometryDrag(target,p){
 if(!target)return null;
 const figure=get(target.id);
 const pointIds=target.kind==='point'?[target.id]:
  figure?.type==='line'&&target.kind==='body'?connectedLinePointIds(figure):[];
 const mates=projectionMateIds(pointIds);
 const originals=new Map(state.entities.map(e=>[e.id,deep(e)]));
 return {...target,at:p,pointIds,mates,originals,undoBefore:snapshotForUndo()};
}
function applyCursorGeometryDrag(drag,p){
 if(!drag||!p)return;
 const dx=p.x-drag.at.x,dy=p.y-drag.at.y;
 if(drag.kind==='point-label'){
  const point=get(drag.id),before=drag.originals.get(drag.id);
  if(point?.type==='point'&&before&&drag.labelStart){
   point.labelOffset={
    dx:drag.labelStart.x-before.x+dx,
    dy:drag.labelStart.y-before.y+dy
   };
  }
  return;
 }
 if(drag.kind==='label'){
  const line=get(drag.id),before=drag.originals.get(drag.id);
  if(line?.type==='line'&&before){
   line.labelOffset={dx:(Number(before.labelOffset?.dx)||0)+dx,
    dy:(Number(before.labelOffset?.dy)||0)+dy};
  }
  return;
 }
 if(drag.kind==='point'||drag.kind==='body'&&drag.pointIds.length){
  for(const id of drag.pointIds){
   const dest=get(id),src=drag.originals.get(id);
   if(dest?.type==='point'&&src){dest.x=src.x+dx;dest.y=src.y+dy;}
  }
  for(const id of drag.mates){
   const dest=get(id),src=drag.originals.get(id);
   if(dest?.type==='point'&&src){dest.x=src.x+dx;dest.y=src.y;}
  }
  return;
 }
 const entity=get(drag.id),before=drag.originals.get(drag.id);
 if(!entity||!before)return;
 if(drag.kind==='body'){
  const shift=v=>({x:v.x+dx,y:v.y+dy});
  if(entity.type==='line'){
   if(typeof before.a==='object')entity.a=shift(before.a);
   if(typeof before.b==='object')entity.b=shift(before.b);
  }else if(entity.type==='circle'&&before.center){
   entity.center=shift(before.center);
  }else if(Array.isArray(before.points)){
   entity.points=before.points.map(shift);
  }else if(entity.type==='dimension'){
   entity.a=typeof before.a==='object'?shift(before.a):before.a;
   entity.b=typeof before.b==='object'?shift(before.b):before.b;
  }
  return;
 }
 if(drag.kind!=='vertex')return;
 const i=drag.index;
 if(entity.type==='circle'){
  if(i===0){entity.center={x:before.center.x+dx,y:before.center.y+dy};}
  else entity.radius=Math.max(.4,Math.hypot(p.x-before.center.x,p.y-before.center.y));
 }else if(entity.type==='shape'&&entity.kind==='rectangle'&&before.points?.length>=2){
  const a=before.points[0],b=before.points[1];
  if(i===0){entity.points=[{x:p.x,y:p.y},deep(b)];}
  if(i===1){entity.points=[{x:a.x,y:p.y},{x:p.x,y:b.y}];}
  if(i===2){entity.points=[deep(a),{x:p.x,y:p.y}];}
  if(i===3){entity.points=[{x:p.x,y:a.y},{x:b.x,y:p.y}];}
 }else if(Array.isArray(before.points)){
  entity.points=deep(before.points);
  if(entity.points[i])entity.points[i]={x:p.x,y:p.y};
 }else if(entity.type==='dimension'){
  const key=i===0?'a':'b';
  if(typeof before[key]==='object')entity[key]={x:p.x,y:p.y};
 }
}
function finalizeGeometryDrag(drag){
 if(!drag)return;
 const after=snapshotForUndo();
 if(after===drag.undoBefore)return;
 pushUndoBefore(drag.undoBefore);
 const selected=get(drag.id);
 state.selected=selected?.id||null;
 log(drag.kind==='point-label'?'Переміщено назву точки':drag.kind==='label'?'Переміщено позначення лінії':drag.kind==='point'?'Переміщено вершину':drag.kind==='vertex'?'Змінено контур фігури':'Переміщено фігуру');
 render();
}
function showSelectionHandles(layer,e){
 if(!e||!isGeometryEditable(e)||e.type==='line')return;
 const verts=primitiveVertices(e);
 for(let i=0;i<verts.length;i++){
  const p=verts[i];
  if(!p)continue;
  makeSVG('circle',{cx:p.x,cy:p.y,r:2.2,fill:'#fff',stroke:'#e99624','stroke-width':.8,
    'pointer-events':'none','data-edit-index':i},layer);
 }
}

/* SHIFT geometry constraint: lock a straight segment to 0° or 90°
   relative to the sheet's X/Y axes. Constrain after the start is chosen. */
function isStraightDrawingTool(tool){return tool==='segment'||tool==='ruler'||tool==='line';}
function constrainedStraightEndpoint(start,raw){
 const horizontal=Math.abs(raw.x-start.x)>=Math.abs(raw.y-start.y);
 const free=horizontal?raw.x:raw.y;
 const aligned=state.snap?Math.round(free/state.snap)*state.snap:free;
 return horizontal
  ?{x:aligned,y:start.y,axis:'horizontal'}
  :{x:start.x,y:aligned,axis:'vertical'};
}
function ensureExactPoint(pos){
 const at=state.entities.find(e=>e.type==='point'&&Math.hypot(e.x-pos.x,e.y-pos.y)<1e-7);
 if(at)return at.id;
 return addPoint(`P${state.counter+1}`,pos,{color:state.style.color});
}
function renderStraightPreview(world,holdingShift){
 if(!isStraightDrawingTool(state.tool)||!state.pending?.start)return;
 const start=pointOf(state.pending.start);
 if(!start)return;
 const preview=$('previewLayer');
 preview.replaceChildren();
 makeSVG('circle',{cx:start.x,cy:start.y,r:3,stroke:'#0d9fa9','stroke-width':.8,fill:'none','stroke-dasharray':'1.7 1.3'},preview);
 if(!world||!Number.isFinite(world.x)||!Number.isFinite(world.y))return;
 const endpoint=holdingShift?constrainedStraightEndpoint(start,world):snapped(world);
 if(len(start,endpoint)<.15)return;
 makeSVG('line',{x1:start.x,y1:start.y,x2:endpoint.x,y2:endpoint.y,stroke:'#087d94','stroke-width':.95,'stroke-dasharray':'3 1.5','stroke-linecap':'round','pointer-events':'none'},preview);
 makeSVG('circle',{cx:endpoint.x,cy:endpoint.y,r:1.7,fill:'#f5ffff',stroke:'#087d94','stroke-width':.7,'pointer-events':'none'},preview);
 if(holdingShift){
  const label=endpoint.axis==='horizontal'?'0°  ·  горизонталь':'90°  ·  вертикаль';
  const x=clamp(endpoint.x+3,5,235),y=clamp(endpoint.y-3,7,412);
  const t=makeSVG('text',{x,y,fill:'#0b6575',stroke:'#fff','stroke-width':1.3,'paint-order':'stroke','font-family':'Arial, sans-serif','font-size':4.3,'font-weight':700,'pointer-events':'none'},preview);
  t.textContent=label;
 }
}


/* Perpendicular segment: base line → existing anchor → freely chosen length.
 * The endpoint is constrained to 90° while dragging the pointer. */
function perpendicularCandidate(base,point,world){
 const line=linePoints(base),a=pointOf(point);
 if(!line||!a||!world)return null;
 const d=minus(line.b,line.a),n=Math.hypot(d.x,d.y);
 if(n<1e-8)return null;
 const normal={x:-d.y/n,y:d.x/n};
 const signedLength=dot(minus(world,a),normal);
 return {a,b:plus(a,times(normal,signedLength)),signedLength};
}
function perpendicularLabel(point){
 const last=String(point?.label||'').match(/([12])$/);
 const suffix=last?.[1]||'';
 const label='n'+suffix;
 return state.entities.some(e=>e.type==='line'&&e.label===label)?'':label;
}
function renderPerpendicularPreview(world){
 if(state.tool!=='perp'||!state.pending?.start)return;
 const base=get(state.pending.line),pos=pointOf(state.pending.start);
 const calculated=perpendicularCandidate(base,pos,world);
 if(!calculated)return;
 const layer=$('previewLayer');
 layer.replaceChildren();
 const {a,b}=calculated;
 makeSVG('circle',{cx:a.x,cy:a.y,r:2.5,stroke:'#0f8eaa','stroke-width':.7,
  fill:'none','pointer-events':'none'},layer);
 if(Math.abs(calculated.signedLength)<.4)return;
 makeSVG('line',{x1:a.x,y1:a.y,x2:b.x,y2:b.y,stroke:'#0c9a91',
  'stroke-width':.9,'stroke-dasharray':'2.7 1.4','stroke-linecap':'round',
  'pointer-events':'none'},layer);
 makeSVG('circle',{cx:b.x,cy:b.y,r:1.75,fill:'#fff',stroke:'#0c9a91',
  'stroke-width':.6,'pointer-events':'none'},layer);
}

function onCanvasClick(ev){if(state.drag?.moved){state.drag=null;return;}if(state.tool==='pan'||state.mode==='auto')return;const p=screenToWorld(ev);if(!p||!Number.isFinite(p.x)||!Number.isFinite(p.y))return;if(extensionState?.stage==='pick'){handleExtensionClick(ev,p);return;}const entity=findClickEntity(ev,p);
 if(['compass','circle','rectangle','protractor','curve','shapes','square','dimension','projection'].includes(state.tool)){handleDraftingClicks(state.tool,p,ev);return;}
 if(state.tool==='select'){state.selected=entity?.id||null;render();return;}
 if(state.tool==='erase'||state.tool==='eraser'){if(entity){state.selected=entity.id;deleteSelected();}return;}
 if(state.tool==='point'){saveUndo('Додано точку');const id=ensurePoint(p);state.selected=id;render();return;}
 if(['segment','line','ruler'].includes(state.tool)){
  if(!state.pending){
   const before=snapshotForUndo();
   const start=ensurePoint(p);
   state.pending={start,undoBefore:before};
   render();return;
  }
  const first=state.pending.start;
  const origin=pointOf(first);
  const endpoint=ev.shiftKey&&origin?constrainedStraightEndpoint(origin,p):p;
  if(!origin||len(origin,endpoint)<.15){toast('Оберіть іншу точку');return;}
  const end=ev.shiftKey?ensureExactPoint(endpoint):ensurePoint(endpoint);
  if(first===end){toast('Оберіть іншу точку');return;}
  pushUndoBefore(state.pending.undoBefore||snapshotForUndo(),`Побудовано ${state.tool==='line'?'пряму':'відрізок'}`);
  state.selected=addLine(first,end,{extent:state.tool==='line'?'line':'segment',...state.style});
  state.pending=null;render();return;
 }
 if(state.tool==='perp'){
  if(!state.pending){
   const line=lineCandidateFromEvent(ev,p);
   if(!line||line.kind==='projection'||line.kind==='perpendicular'){
    toast('Спочатку натисніть на опорний відрізок (h₁ або f₂)');return;
   }
   state.pending={line:line.id};
   render();toast('Тепер виберіть точку D₁ або D₂');return;
  }
  const base=get(state.pending.line);
  if(!base||!linePoints(base)){state.pending=null;render();return;}
  if(!state.pending.start){
   if(entity?.type!=='point'||!visibleEntity(entity)){
    toast('Виберіть саме наявну точку D₁ або D₂, не порожнє місце');return;
   }
   state.pending.start=entity.id;
   render();toast('Тепер вкажіть довжину й напрям перпендикуляра третім натисканням');return;
  }
  const point=get(state.pending.start);
  const candidate=perpendicularCandidate(base,point,p);
  if(!candidate||Math.abs(candidate.signedLength)<1){
   toast('Вкажіть кінець відрізка далі від вихідної точки');return;
  }
  const before=snapshotForUndo();
  const label=perpendicularLabel(point);
  const segmentId=addLine(point.id,candidate.b,{
   extent:'segment',kind:'perpendicular',label,
   color:state.style.color,dash:state.style.dash,width:state.style.width
  });
  const segment=get(segmentId);
  segment.perpendicularBase=base.id;
  segment.perpendicularStart=point.id;
  segment.perpendicularLength=candidate.signedLength;
  pushUndoBefore(before,'Побудовано перпендикулярний відрізок '+(label||''));
  state.selected=segmentId;state.pending=null;
  // Show segment properties immediately so the name/color/width can be edited.
  state.tool='select';
  document.querySelectorAll('.tool').forEach(button=>
   button.classList.toggle('active',button.dataset.tool==='select'));
  $('canvasViewport').classList.add('pan-cursor');
  render();
  toast('Створено відрізок '+(label?printablePointLabel(label):'')+' під кутом 90°. Можна редагувати його назву.');
  return;
 }
 if(['parallel','intersect'].includes(state.tool)){
  if(!state.pending){const l=lineCandidateFromEvent(ev,p);if(!l){toast('Спочатку оберіть опорну лінію');return;}state.pending={line:l.id};render();return;}
  const base=get(state.pending.line),vec=linePoints(base);if(!vec){state.pending=null;return;}
  if(state.tool==='intersect'){
   const second=lineCandidateFromEvent(ev,p);if(!second||second.id===base.id){toast('Оберіть іншу лінію');return;}
   const q=linePoints(second);if(!q)return;const intersection=lineIntersect(vec.a,vec.b,q.a,q.b,base.extent==='segment',second.extent==='segment');
   if(!intersection){toast('У цих межах лінії не перетинаються');return;}
   saveUndo('Обчислено точку перетину');state.selected=addPoint(`I${state.counter+1}`,intersection.point,{color:'#0b9c90',derivation:{kind:'intersection',l1:base.id,l2:second.id}});state.pending=null;render();return;
  }
  saveUndo('Побудовано паралельну пряму');
  const id=ensurePoint(p);
  const d=minus(vec.b,vec.a),length=Math.hypot(d.x,d.y);
  const other=plus(pointOf(id),times(d,35/length));
  state.selected=addLine(id,other,{extent:'line',...state.style});
  state.pending=null;render();return;
 }
}
function ensurePointWithUndo(p){const sn=snapped(p),nearest=nearestPoint(sn,.5);if(nearest)return nearest.id;saveUndo('Додано опорну точку');return ensurePoint(sn);}
function deleteSelected(){
 const e=get(state.selected);if(!e)return;
 if(extensionState)extensionCancel();
 saveUndo('Видалено '+(e.label||e.id));
 const removed=new Set([e.id]);let changed=true;
 while(changed){
  changed=false;
  for(const item of state.entities){
   if(removed.has(item.id))continue;
   const d=item.derivation;
   const dependencies=[...(d?[d.line,d.l1,d.l2,d.point,d.base,d.target]:[]),item.perpendicularBase,item.perpendicularStart].filter(Boolean);
   const endpointRemoved=item.type==='line'&&
    (typeof item.a==='string'&&removed.has(item.a)||typeof item.b==='string'&&removed.has(item.b));
   if(endpointRemoved||dependencies.some(id=>removed.has(id))){
    removed.add(item.id);changed=true;
   }
  }
 }
 state.entities=state.entities.filter(item=>!removed.has(item.id));
 state.selected=null;render();
}
function setStyle(key,value){const e=get(state.selected);if(e&&e.type!=='point'){saveUndo('Змінено стиль об’єкта');e[key]=value;}else state.style[key]=value;render();}
function moveZoom(factor,clientPoint=null){
 const old=state.zoom,updated=clamp(old*factor,.38,3.5);
 if(Math.abs(updated-old)<1e-8)return;
 const bounds=$('canvasViewport').getBoundingClientRect();
 const anchor=clientPoint?{x:clientPoint.x-bounds.left,y:clientPoint.y-bounds.top}:{x:bounds.width/2,y:bounds.height/2};
 const pageX=(anchor.x-state.pan.x)/old,pageY=(anchor.y-state.pan.y)/old;
 state.zoom=updated;state.pan={x:anchor.x-pageX*updated,y:anchor.y-pageY*updated};
 updatePaperTransform();
}
function fitPaper(){const box=$('canvasViewport');if(!box.clientWidth||!box.clientHeight)return;const factor=Math.min((box.clientWidth-50)/594,(box.clientHeight-65)/840,1.14);state.zoom=clamp(factor,.35,1.14);state.pan={x:(box.clientWidth-594*state.zoom)/2,y:Math.max(15,(box.clientHeight-840*state.zoom)/2)};updatePaperTransform();}
function updatePaperTransform(){
 const wrap=$('paperWrap'),viewport=$('canvasViewport');
 // Resize the real SVG viewport; do not CSS-scale a rasterized container.
 const dpr=Math.max(1,window.devicePixelRatio||1);
 const place=v=>Math.round(v*dpr)/dpr;
 const left=place(state.pan.x),top=place(state.pan.y);
 state.pan={x:left,y:top};
 wrap.style.transform='none';
 wrap.style.width=(594*state.zoom)+'px';
 wrap.style.height=(840*state.zoom)+'px';
 wrap.style.left=left+'px';
 wrap.style.top=top+'px';
 // Keep CSS grid background aligned with the vector sheet.
 viewport.style.setProperty('--minor-step',(10*state.zoom)+'px');
 viewport.style.setProperty('--major-step',(50*state.zoom)+'px');
 viewport.style.setProperty('--grid-offset-x',left+'px');
 viewport.style.setProperty('--grid-offset-y',top+'px');
 $('zoomLabel').textContent=Math.round(state.zoom*100)+'%';
 if($('zoomPercent'))$('zoomPercent').textContent=Math.round(state.zoom*100)+'%';
 refreshPointLabels();
 refreshLineLabels();
 window.GeometryStudioAxes?.setZoom?.(state.zoom);
}
function stopPlay(){if(state.playing){clearInterval(state.playing);state.playing=null;}$('stepPlay').textContent='▶ Пуск';}
function autoplay(){if(state.playing){stopPlay();return;}if(state.step>=6)state.step=0;setMode('auto');render();$('stepPlay').textContent='Ⅱ Пауза';state.playing=setInterval(()=>{if(state.step>=6){stopPlay();return;}state.step++;render();},1450);}
function setStep(step){stopPlay();state.step=clamp(step,0,6);if(state.mode==='auto')render();}
function newBlank(){saveUndo('Новий чистий аркуш');stopPlay();state.entities=[];state.counter=0;state.selected=null;state.paperMode='blank';taskResult=null;state.history=[];log('Створено порожнє креслення');setMode('manual');state.zoom=1;fitPaper();render();toast('Чистий аркуш A3 готовий');}
function startExample(){saveUndo('Завантажено приклад');state.coords3=deep(DEFAULT_3D);state.step=6;createExample();setMode('auto');fitPaper();}
function addPoint3D(){const name=$('add3Name').value.trim().replace(/[^A-Za-zА-Яа-яІіЇїЄєҐґ0-9_-]/g,'').slice(0,12)||'P';const x=Number($('add3X').value),y=Number($('add3Y').value),z=Number($('add3Z').value);if(![x,y,z].every(Number.isFinite)||[p1({x,y,z}),p2({x,y,z})].some(p=>p.x<0||p.x>297||p.y<0||p.y>420)){toast('Координати мають бути в межах аркуша A3');return;}
 saveUndo(`Додано просторову точку ${name}`);const q1=addPoint(`${name}1`,p1({x,y,z}),{color:state.style.color});const q2=addPoint(`${name}2`,p2({x,y,z}),{color:state.style.color});get(q1).projectionPlane='pi1';get(q2).projectionPlane='pi2';addLine(q1,q2,{dash:'dashed',color:COLORS.guide,width:.35,kind:'projection'});setMode('manual');render();toast(`Створено ${name}₁ та ${name}₂`);
}
function exportBlob(text,type,name){const a=document.createElement('a');const u=URL.createObjectURL(new Blob([text],{type}));a.href=u;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),1000);}
function exportJSON(){exportBlob(JSON.stringify({format:'geometry-studio-v1',created:new Date().toISOString(),document:{size:'A3',orientation:'portrait',unit:'mm'},entities:state.entities,coords3:state.coords3,paperMode:state.paperMode,counter:state.counter,axisMode:window.GeometryStudioAxes?.getMode()||'none',axisScale:window.GeometryStudioAxes?.getScaleSettings?.(),projection:state.projection,pointScale:state.pointScale},null,2),'application/json;charset=utf-8','geometry-studio-project.json');toast('JSON-проєкт збережено');}
function exportSVG(){const cl=$('sheet').cloneNode(true);cl.querySelector('#previewLayer')?.remove();standardizeExportLabels(cl);standardizeExportLineLabels(cl);cl.removeAttribute('id');cl.setAttribute('width','297mm');cl.setAttribute('height','420mm');cl.setAttribute('xmlns','http://www.w3.org/2000/svg');exportBlob(new XMLSerializer().serializeToString(cl),'image/svg+xml;charset=utf-8','geometry-studio-A3.svg');toast('SVG-креслення збережено');}
function addExplicitPrintGrid(svg){
 const g=svg.querySelector('#gridLayer');if(!g)return;g.replaceChildren();if(!state.grid)return;
 for(let x=0;x<=A3.width+.01;x+=5){makeSVG('line',{x1:x,y1:0,x2:x,y2:420,stroke:x%25===0?'#a9bfd3':'#d5e2ed','stroke-width':x%25===0?.23:.11},g);}
 for(let y=0;y<=A3.height+.01;y+=5){makeSVG('line',{x1:0,y1:y,x2:297,y2:y,stroke:y%25===0?'#a9bfd3':'#d5e2ed','stroke-width':y%25===0?.23:.11},g);}
}
function printPDF(){const cl=$('sheet').cloneNode(true);cl.querySelector('#previewLayer')?.remove();standardizeExportLabels(cl);standardizeExportLineLabels(cl);cl.removeAttribute('id');cl.setAttribute('width','297mm');cl.setAttribute('height','420mm');addExplicitPrintGrid(cl);$('printSheet').replaceChildren(cl);window.print();}
function importJSON(file){file.text().then(txt=>{try{const obj=JSON.parse(txt);if(!Array.isArray(obj.entities)||obj.entities.length>5000)throw Error('Некоректна структура проєкту');for(const e of obj.entities){if(!['point','line','path','circle','angle','shape','dimension'].includes(e.type))throw Error('Невідомий тип об’єкта');if(e.type==='point'&&(!Number.isFinite(e.x)||!Number.isFinite(e.y)))throw Error('Некоректні координати');if(['path','shape','angle'].includes(e.type)&&(!Array.isArray(e.points)||e.points.length>3000||!e.points.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y))))throw Error('Некоректні точки фігури');}
 saveUndo('Імпорт проєкту');state.entities=obj.entities;state.counter=Math.max(Number(obj.counter)||0,state.entities.length);state.paperMode=obj.paperMode==='example'?'example':'blank';state.coords3=obj.coords3||deep(DEFAULT_3D);taskResult=state.paperMode==='example'?computeTask(state.coords3):null;setMode('manual');window.GeometryStudioAxes?.setMode(obj.axisMode||'none');window.GeometryStudioAxes?.setScaleSettings?.(obj.axisScale||{step:5,ticks:true,numbers:true,crossings:true});state.projection=(obj.projection&&['both','pi1','pi2'].includes(obj.projection.view))?{view:obj.projection.view,links:obj.projection.links!==false,profile:!!obj.projection.profile}:{view:'both',links:true,profile:false};state.pointScale=normalizedPointScale(obj.pointScale);render();toast('Проєкт успішно відкрито');}catch(e){toast(`Не вдалося відкрити JSON: ${e.message}`);}});}
function init(){
 initializeSelectedStyleUI();
 initializeGlobalPointSize();
 initializeExtensionUI();
 const restored=loadLocal();if(!restored){state.entities=[];state.paperMode='blank';state.mode='manual';state.step=0;state.counter=0;taskResult=null;log('Новий аркуш');}else{if(state.paperMode==='example')taskResult=computeTask(state.coords3);render();}
 document.querySelectorAll('.tool').forEach(b=>b.addEventListener('click',()=>setTool(b.dataset.tool)));
 $('modeManual').addEventListener('click',()=>setMode('manual'));$('modeAuto').addEventListener('click',()=>setMode('auto'));
 $('btnNew').addEventListener('click',newBlank);$('btnExample').addEventListener('click',startExample);
 $('btnPrint').addEventListener('click',printPDF);$('btnSave').addEventListener('click',exportJSON);$('btnSVG').addEventListener('click',exportSVG);$('btnLoad').addEventListener('click',()=>$('fileImport').click());$('fileImport').addEventListener('change',e=>{if(e.target.files?.[0])importJSON(e.target.files[0]);e.target.value='';});
 $('btnUndo').addEventListener('click',undo);$('floatingUndo')?.addEventListener('click',undo);$('btnRedo').addEventListener('click',redo);
 $('showGrid').checked=state.grid;$('showGrid').addEventListener('change',e=>{state.grid=e.target.checked;render();});
 $('showIntersections').addEventListener('change',e=>{state.showIntersections=e.target.checked;redraw();});
 $('gridSize').value=String(state.snap);$('gridSize').addEventListener('change',e=>{state.snap=Number(e.target.value);saveLocal();toast(state.snap?`Прив’язка: ${state.snap} мм`:'Прив’язку вимкнено');});
 $('zoomIn').addEventListener('click',()=>moveZoom(1.2));$('zoomOut').addEventListener('click',()=>moveZoom(1/1.2));$('zoomReset').addEventListener('click',fitPaper);
 $('stepPrev').addEventListener('click',()=>setStep(state.step-1));$('stepNext').addEventListener('click',()=>setStep(state.step+1));$('stepPlay').addEventListener('click',autoplay);$('stepRange').addEventListener('input',e=>setStep(Number(e.target.value)));
 $('btnAdd3D').addEventListener('click',addPoint3D);
 document.querySelectorAll('.inspector-tabs button').forEach(b=>b.addEventListener('click',()=>{state.tab=b.dataset.tab;renderInspector();}));
 document.querySelectorAll('.swatch').forEach(b=>b.addEventListener('click',()=>setStyle('color',b.dataset.color)));$('customColor').addEventListener('input',e=>setStyle('color',e.target.value));$('linePattern').addEventListener('change',e=>setStyle('dash',e.target.value));$('lineWidth').addEventListener('change',e=>setStyle('width',Number(e.target.value)));
 $('menuButton').addEventListener('click',openDrawer);$('inspectorClose').addEventListener('click',closeDrawer);
 $('toolsFab')?.addEventListener('click',toggleToolMenu);$('toolsPopoverClose')?.addEventListener('click',closeToolMenu);$('shapesFab')?.addEventListener('click',toggleShapeMenu);$('shapesPopoverClose')?.addEventListener('click',closeShapeMenu);$('shapeKind')?.addEventListener('change',e=>{state.shapeKind=e.target.value;});$('squareAngle')?.addEventListener('change',e=>{state.squareAngle=Number(e.target.value);});
 const edge=$('edgeTrigger'),drawer=$('studioDrawer');
 edge.addEventListener('pointerenter',e=>{if(e.pointerType!=='touch')openDrawer();});
 edge.addEventListener('click',openDrawer);
 drawer.addEventListener('pointerenter',()=>clearTimeout(drawerCloseTimer));
 drawer.addEventListener('pointerleave',e=>{if(e.pointerType!=='touch')scheduleDrawerClose();});
 $('drawerClose').addEventListener('click',closeDrawer);
 $('canvasViewport').addEventListener('pointerdown',()=>{if(drawerIsOpen())closeDrawer(); if(toolMenuIsOpen())closeToolMenu(); if(shapeMenuIsOpen())closeShapeMenu();});
 document.addEventListener('pointermove',e=>{lastPointer={x:e.clientX,y:e.clientY};},{passive:true});
 document.addEventListener('pointerdown',e=>{if(drawerIsOpen()&&!drawer.contains(e.target)&&e.target!==edge)closeDrawer(); const toolsFab=$('toolsFab'), toolsPopover=toolMenuEl(); if(toolMenuIsOpen()&&toolsPopover&&!toolsPopover.contains(e.target)&&e.target!==toolsFab&&!toolsFab?.contains(e.target))closeToolMenu(); const shapesFab=$('shapesFab'),shapesPopover=shapeMenuEl();if(shapeMenuIsOpen()&&shapesPopover&&!shapesPopover.contains(e.target)&&!shapesFab?.contains(e.target))closeShapeMenu();});
 const isHoverless=matchMedia('(hover:none)');if(isHoverless.matches){edge.setAttribute('title','Натисни, щоб відкрити інструменти');}

 const viewport=$('canvasViewport'),svg=$('sheet');let down=null;let suppressClick=false;let lastStraightCursor=null,shiftPreviewHeld=false;const touchPointers=new Map();let pinch=null;
 // Drawing clicks are resolved on pointerup, ensuring that viewport pointer capture never swallows an anchor click.
 viewport.addEventListener('contextmenu',e=>{e.preventDefault();state.pending=null;render();});
 viewport.addEventListener('auxclick',e=>{if(e.button===1)e.preventDefault();});
 viewport.addEventListener('pointerdown',e=>{
  if(e.pointerType==='touch'){
   touchPointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
   if(touchPointers.size===2){
    const [a,b]=[...touchPointers.values()];const midpoint={x:(a.x+b.x)/2,y:(a.y+b.y)/2};const bounds=viewport.getBoundingClientRect();
    pinch={distance:Math.hypot(a.x-b.x,a.y-b.y),zoom:state.zoom,paperX:(midpoint.x-bounds.left-state.pan.x)/state.zoom,paperY:(midpoint.y-bounds.top-state.pan.y)/state.zoom};down=null;viewport.setPointerCapture(e.pointerId);return;
   }
  }
  if(e.button!==0&&e.button!==1)return;
  const forcedPan=e.button===1||state.tool==='pan';
  if(state.tool==='pencil'&&state.mode==='manual'&&!forcedPan){const world=screenToWorld(e);if(world){state.stroke={pointerId:e.pointerId,points:[world]};viewport.setPointerCapture(e.pointerId);e.preventDefault();return;}}
  const world=screenToWorld(e);const entity=world?findClickEntity(e,world):null;
  const extensionPicking=extensionState?.stage==='pick';
  const candidate=state.tool==='select'&&!forcedPan&&!extensionPicking?geometryTargetAt(e,world):null;
  const geometry=state.mode==='manual'&&candidate?beginCursorGeometryDrag(candidate,world):null;
  const shouldPan=forcedPan||(state.tool==='select'&&!geometry&&!extensionPicking);
  down={startX:e.clientX,startY:e.clientY,panX:state.pan.x,panY:state.pan.y,
    geometry,backgroundPan:shouldPan,moved:false,world,pointerId:e.pointerId};
  if(shouldPan){e.preventDefault();viewport.classList.add('panning');}
  viewport.setPointerCapture(e.pointerId);
 });
 viewport.addEventListener('pointermove',e=>{
  if(state.stroke&&state.stroke.pointerId===e.pointerId){const p=screenToWorld(e);if(p){const points=state.stroke.points;if(len(points[points.length-1],p)>.6){points.push({x:p.x,y:p.y});const preview=$('previewLayer');preview.replaceChildren();makeSVG('polyline',{points:points.map(q=>q.x+','+q.y).join(' '),fill:'none',stroke:state.style.color,'stroke-width':state.style.width,'stroke-linecap':'round','stroke-linejoin':'round'},preview);}}return;}
  if(e.pointerType==='touch'&&touchPointers.has(e.pointerId))touchPointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(pinch&&touchPointers.size>=2){const [a,b]=[...touchPointers.values()];const newDist=Math.hypot(a.x-b.x,a.y-b.y);const midpoint={x:(a.x+b.x)/2,y:(a.y+b.y)/2};const bounds=viewport.getBoundingClientRect();
   state.zoom=clamp(pinch.zoom*newDist/Math.max(1,pinch.distance),.38,3.5);state.pan={x:midpoint.x-bounds.left-pinch.paperX*state.zoom,y:midpoint.y-bounds.top-pinch.paperY*state.zoom};updatePaperTransform();suppressClick=true;return;}
  const world=screenToWorld(e);if(world){$('cursorCoords').textContent=`X: ${fmt(world.x,1)} мм · Y: ${fmt(world.y,1)} мм`;lastStraightCursor=world;if(isStraightDrawingTool(state.tool)&&state.pending?.start)renderStraightPreview(world,e.shiftKey||shiftPreviewHeld);if(state.tool==='perp'&&state.pending?.start)renderPerpendicularPreview(world);if(extensionState?.stage==='pick')drawExtensionPreview(world,e);}
  if(!down){
   const candidate=state.tool==='select'&&extensionState?.stage!=='pick'?geometryTargetAt(e,world):null;
   viewport.classList.toggle('cursor-on-vertex',!!candidate&&(candidate.kind==='point'||candidate.kind==='vertex'));
   viewport.classList.toggle('cursor-on-geometry',!!candidate&&candidate.kind==='body');
   viewport.classList.toggle('cursor-on-label',!!candidate&&(candidate.kind==='label'||candidate.kind==='point-label'));
   viewport.classList.toggle('can-pan',(state.tool==='select'&&!candidate&&extensionState?.stage!=='pick')||state.tool==='pan');
  }
  if(!down)return;const dx=e.clientX-down.startX,dy=e.clientY-down.startY;
  if(Math.hypot(dx,dy)>4)down.moved=true;
  if(!down.moved)return;
  if(down.backgroundPan){state.pan={x:down.panX+dx,y:down.panY+dy};updatePaperTransform();viewport.classList.add('panning');suppressClick=true;}
  else if(down.geometry&&world){
   applyCursorGeometryDrag(down.geometry,world);
   viewport.classList.toggle('cursor-dragging-label',['label','point-label'].includes(down.geometry.kind));
   redraw();suppressClick=true;
  }
 });
 viewport.addEventListener('pointerup',e=>{
  if(state.stroke&&state.stroke.pointerId===e.pointerId){const pts=state.stroke.points;state.stroke=null;if(pts.length>=2){recordPrimitive('path',{points:pts},'Проведено олівцем');}else{$('previewLayer').replaceChildren();}down=null;suppressClick=true;setTimeout(()=>{suppressClick=false;},0);return;}
  if(e.pointerType==='touch'){touchPointers.delete(e.pointerId);if(pinch){if(touchPointers.size<2)pinch=null;down=null;suppressClick=true;setTimeout(()=>{suppressClick=false;},0);return;}}
  if(down?.moved&&!down.backgroundPan&&!down.geometry&&state.mode==='manual'){
   const gestureTool=state.tool;
   const straight=isStraightDrawingTool(gestureTool);
   const twoStep=['rectangle','circle','compass'].includes(gestureTool);
   if(straight||twoStep){
    const startWorld=down.world,endWorld=screenToWorld(e);
    if(startWorld&&endWorld&&Math.hypot(endWorld.x-startWorld.x,endWorld.y-startWorld.y)>1){
     const eventAt=(x,y)=>({clientX:x,clientY:y,target:e.target,shiftKey:e.shiftKey});
     if(!state.pending)onCanvasClick(eventAt(down.startX,down.startY));
     if(state.pending)onCanvasClick(eventAt(e.clientX,e.clientY));
    }
   }
  }
  if(down&&!down.moved&&e.button===0&&state.tool!=='pan'){
   if(state.tool==='select'&&down.geometry){state.selected=down.geometry.id;render();}
   else onCanvasClick(e);
  }
  if(down?.geometry&&down.moved)finalizeGeometryDrag(down.geometry);
  if(down?.moved){suppressClick=true;setTimeout(()=>{suppressClick=false;},0);}down=null;viewport.classList.remove('panning','cursor-dragging-label');
 });
 viewport.addEventListener('pointercancel',e=>{
  if(down?.geometry?.undoBefore&&down.moved){
   const snapshot=JSON.parse(down.geometry.undoBefore);
   state.entities=deep(snapshot.entities);render();
  }
  state.stroke=null;$('previewLayer').replaceChildren();touchPointers.delete(e.pointerId);
  if(touchPointers.size<2)pinch=null;down=null;
  viewport.classList.remove('panning','cursor-on-geometry','cursor-on-vertex','cursor-on-label','cursor-dragging-label');
 });
 viewport.addEventListener('wheel',e=>{if(!e.ctrlKey&&!e.metaKey)return;e.preventDefault();moveZoom(e.deltaY<0?1.1:1/1.1,{x:e.clientX,y:e.clientY});},{passive:false});
 // All drawing, point selection, and pan gestures use the complete viewport.
 document.addEventListener('keydown',e=>{
  if(e.key==='Shift'&&!e.repeat){shiftPreviewHeld=true;if(lastStraightCursor)renderStraightPreview(lastStraightCursor,true);}
 });
 document.addEventListener('keyup',e=>{
  if(e.key==='Shift'){shiftPreviewHeld=false;if(lastStraightCursor)renderStraightPreview(lastStraightCursor,false);}
 });
 window.addEventListener('blur',()=>{shiftPreviewHeld=false;});
 // Capture undo shortcuts before a canvas tool or a hidden panel can consume them.
 document.addEventListener('keydown',e=>{
  const mod=(e.ctrlKey||e.metaKey)&&!e.altKey;
  const key=String(e.key||'').toLowerCase();
  if(!mod||key!=='z'&&key!=='y')return;
  const active=document.activeElement;
  const textField=active?.isContentEditable||
    active?.tagName==='TEXTAREA'||
    active?.tagName==='INPUT'&&['text','search','number','email','url','tel','password'].includes(active.type);
  const visible=!!active?.getClientRects?.().length&&!active?.closest?.('[hidden],[aria-hidden="true"]');
  if(textField&&visible)return; // Keep native text-editing undo inside an active text field.
  e.preventDefault();e.stopImmediatePropagation();
  if(key==='y'||key==='z'&&e.shiftKey)redo();else undo();
 },true);
 window.addEventListener('pagehide',saveLocal);
 document.addEventListener('keydown',e=>{if(e.key==='Tab'&&!e.shiftKey&&!drawerIsOpen()&&(!document.activeElement||document.activeElement===document.body||document.activeElement===edge)){e.preventDefault();openDrawer();$('drawerClose').focus();return;}if(['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName))return;

 if(e.key==='Delete'||e.key==='Backspace'){deleteSelected();return;}
 if(e.key==='Escape'){
  if(extensionState){extensionCancel();render();return;}
  closeToolMenu();closeShapeMenu();closeDrawer();
  if(state.pending?.undoBefore){
   const before=JSON.parse(state.pending.undoBefore);
   state.entities=deep(before.entities);state.counter=before.counter;
  }
  state.pending=null;state.selected=null;render();return;
 }
 if(e.key===' '){e.preventDefault();setTool('pan');return;}if(e.key.toLowerCase()==='t'&&!e.ctrlKey&&!e.altKey&&!e.metaKey){e.preventDefault();toggleToolMenu();return;}
 const keys={v:'select',p:'pencil',l:'ruler',i:'line',e:'eraser',c:'compass'};if(keys[e.key?.toLowerCase()])setTool(keys[e.key.toLowerCase()]);
 });
 window.addEventListener('resize',()=>{if(needFit)fitPaper();});
 $('modeManual').classList.toggle('active',state.mode==='manual');$('modeAuto').classList.toggle('active',state.mode==='auto');$('autoStrip').classList.toggle('hidden',state.mode!=='auto');$('statusMode').textContent=state.mode==='auto'?'Автопобудова':'Креслення';
 requestAnimationFrame(()=>{fitPaper();needFit=false;render();});
}

/* Task 5: safe bridge for the two triangle-construction workflows */
window.GeometryStudioTriangleAPI={
 nextLabels(){
  const used=new Set(state.entities.filter(e=>e.type==='point').map(e=>e.label));
  for(let i=0;i<50;i++){
   const suffix=i===0?'':i<=3?'′'.repeat(i):'_'+(i+1);
   const names=['A','B','C'].map(x=>x+suffix);
   if(names.every(n=>!used.has(n+'1')&&!used.has(n+'2')))return names;
  }
  throw Error('Надто багато трикутників на одному аркуші.');
 },
 validateVertex(p){
  if(!p||!['x','y','z'].every(k=>Number.isFinite(p[k])))throw Error('Введи числові значення X, Y, Z.');
  const a=p1(p),b=p2(p);
  if([a,b].some(q=>q.x<0||q.x>A3.width||q.y<0||q.y>A3.height))throw Error('Точка поза межами аркуша A3. Зміни координати.');
  return {a,b};
 },
 validateTriangle(points){
  if(!Array.isArray(points)||points.length!==3)throw Error('Трикутнику потрібні три точки.');
  points.forEach(p=>this.validateVertex(p));
  const n=cross3(sub3(points[1],points[0]),sub3(points[2],points[0]));
  if(sq3(n)<1e-8)throw Error('Точки лежать на одній прямій. Зміни координати.');
 },
 addVertex(label,p){
  const {a,b}=this.validateVertex(p);
  if(state.mode==='auto')setMode('manual');
  saveUndo('Нанесено точку '+label);
  const plan=addPoint(label+'1',a,{color:COLORS.base});
  const front=addPoint(label+'2',b,{color:COLORS.base});get(plan).projectionPlane='pi1';get(front).projectionPlane='pi2';
  addLine(plan,front,{color:COLORS.guide,width:.32,dash:'dashed',kind:'projection'});
  state.pending=null;state.selected=null;render();return {plan,front,label};
 },
 updateVertex(pair,p){
  const {a,b}=this.validateVertex(p);
  const q1=get(pair?.plan),q2=get(pair?.front);
  if(q1?.type!=='point'||q2?.type!=='point')throw Error('Ці точки більше не існують на аркуші.');
  saveUndo('Оновлено точку '+pair.label);
  Object.assign(q1,a);Object.assign(q2,b);render();return pair;
 },
 connectTriangle(pairs,points){
  this.validateTriangle(points);
  if(!pairs.every(v=>get(v?.plan)?.type==='point'&&get(v?.front)?.type==='point'))throw Error('Не знайдено всі вершини трикутника.');
  saveUndo('З’єднано вершини трикутника');
  for(const suffix of ['plan','front'])for(const [i,j] of [[0,1],[1,2],[2,0]]){
   addLine(pairs[i][suffix],pairs[j][suffix],{color:COLORS.base,width:.8,kind:'triangle'});
  }
  state.selected=null;state.pending=null;render();return true;
 },
 createTriangle(points){
  this.validateTriangle(points);
  if(state.mode==='auto')setMode('manual');
  const names=this.nextLabels();
  saveUndo('Побудовано трикутник ABC за координатами');
  const pairs=points.map((p,i)=>{
   const a=p1(p),b=p2(p),plan=addPoint(names[i]+'1',a,{color:COLORS.base}),front=addPoint(names[i]+'2',b,{color:COLORS.base});get(plan).projectionPlane='pi1';get(front).projectionPlane='pi2';
   addLine(plan,front,{color:COLORS.guide,width:.32,dash:'dashed',kind:'projection'});
   return {plan,front,label:names[i]};
  });
  for(const suffix of ['plan','front'])for(const [i,j] of [[0,1],[1,2],[2,0]]){
   addLine(pairs[i][suffix],pairs[j][suffix],{color:COLORS.base,width:.8,kind:'triangle'});
  }
  state.selected=null;state.pending=null;render();return pairs;
 }
};


/* Coordinate point entry for Task 5 and independent Π₁ / Π₂ points. */
window.GeometryStudioPointAPI={
 prepareCoordinate(){setTool('select');},
 create({name,view='both',x,y,z}={}){
  const label=String(name??'').trim();
  if(!/^[A-Za-zА-Яа-яІіЇїЄєҐґ][A-Za-zА-Яа-яІіЇїЄєҐґ0-9_'′-]{0,11}$/.test(label)){
   throw Error('Вкажи назву точки, наприклад D або M. До 12 символів.');
  }
  if(!['both','pi1','pi2'].includes(view))throw Error('Оберіть правильну площину проєкції.');
  if(!Number.isFinite(x)||(view!=='pi2'&&!Number.isFinite(y))||(view!=='pi1'&&!Number.isFinite(z))){
   throw Error('Введи числові координати X, Y та Z для вибраної проєкції.');
  }
  const positions=view==='both'
   ?[{suffix:'1',plane:'pi1',pos:p1({x,y,z})},{suffix:'2',plane:'pi2',pos:p2({x,y,z})}]
   :view==='pi1'
    ?[{suffix:'1',plane:'pi1',pos:p1({x,y,z:0})}]
    :[{suffix:'2',plane:'pi2',pos:p2({x,y:0,z})}];
  if(positions.some(({pos})=>pos.x<0||pos.x>A3.width||pos.y<0||pos.y>A3.height)){
   throw Error('Проєкція виходить за межі аркуша А3. Зміни координати.');
  }
  if(positions.some(({suffix})=>state.entities.some(e=>e.type==='point'&&e.label===label+suffix))){
   throw Error('Точка з такою назвою вже є. Зміни назву або вибери іншу.');
  }
  if(state.mode==='auto')setMode('manual');
  saveUndo('Додано точку '+label+' за координатами');
  const pointIds=positions.map(({suffix,plane,pos})=>{
   const id=addPoint(label+suffix,pos,{color:COLORS.base});
   get(id).projectionPlane=plane;
   return id;
  });
  if(pointIds.length===2){
   addLine(pointIds[0],pointIds[1],{color:COLORS.guide,width:.32,dash:'dashed',kind:'projection'});
   state.projection={...state.projection,view:'both',links:true};
  }else{
   state.projection={...state.projection,view:positions[0].plane};
  }
  state.pending=null;
  setTool('select');
  state.selected=null;
  render();
  return {labels:positions.map(item=>label+item.suffix),pointIds};
 },
 activateManual(){
  if(state.mode==='auto')setMode('manual');
  setTool('point');
 },
 suggestName(){
  for(const s of ['D','E','F','G','H','M','N','P','Q','R']){
   if(!state.entities.some(e=>e.type==='point'&&(e.label===s+'1'||e.label===s+'2')))return s;
  }
  return 'T'+String(state.counter+1);
 },
 listPoints(){return state.entities.filter(e=>e.type==='point').map(e=>e.label)}
};

init();
})();