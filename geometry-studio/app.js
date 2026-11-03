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
const state={mode:'auto',tool:'select',tab:'properties',entities:[],coords3:structuredClone(DEFAULT_3D),step:6,selected:null,pending:null,style:{color:'#233c61',dash:'solid',width:0.65},shapeKind:'rectangle',squareAngle:90,stroke:null,zoom:1,pan:{x:0,y:0},grid:true,showIntersections:false,snap:5,history:[],undo:[],redo:[],counter:0,paperMode:'example',drag:null,playing:null};
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
const styleLine=(dash)=>({solid:'',dashed:'3 2',dashdot:'5 1.6 .5 1.6',dotted:'.35 1.65'})[dash]||'';
const nextId=()=>`g${++state.counter}`;
function addPoint(label,pos,opt={}){const p={id:nextId(),type:'point',label:label||`P${state.counter}`,x:pos.x,y:pos.y,color:opt.color||COLORS.ink,stage:opt.stage??0,small:opt.small??false,derivation:opt.derivation||null,offset:opt.offset||null,source:opt.source||null};state.entities.push(p);return p.id;}
function addLine(a,b,opt={}){const l={id:nextId(),type:'line',a,b,extent:opt.extent||'segment',dash:opt.dash||'solid',color:opt.color||state.style.color,width:opt.width||.65,label:opt.label||'',stage:opt.stage??0,kind:opt.kind||'normal',region:opt.region||null};state.entities.push(l);return l.id;}
const get=id=>state.entities.find(e=>e.id===id);
function pointOf(value){if(typeof value==='string'){const x=get(value);return x&&x.type==='point'?{x:x.x,y:x.y}:null;}if(value&&Number.isFinite(value.x)&&Number.isFinite(value.y))return value;return null;}
function linePoints(l){if(!l||l.type!=='line')return null;const a=pointOf(l.a),b=pointOf(l.b);if(!a||!b||len(a,b)<1e-6)return null;return {a,b};}

function addPrimitive(type,geometry,opt={}){const obj={id:nextId(),type,...geometry,color:opt.color||state.style.color,dash:opt.dash||state.style.dash,width:opt.width??state.style.width,stage:0,label:opt.label||''};state.entities.push(obj);return obj.id;}
function entityTitle(e){const labels={point:'Точка',line:e?.extent==='line'?'Пряма':'Відрізок',path:'Олівець',circle:'Коло',angle:'Кут',shape:'Фігура',dimension:'Розмір'};return labels[e?.type]||'Об’єкт';}
function renderPrimitive(layer,e,selected=false){
 const col=selected?'#e89c23':(e.color||state.style.color),wide=selected?Math.max(1.2,e.width):e.width,dash=styleLine(e.dash);let el=null;
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
 return el;
}
function rectCorners(a,b){return [a,{x:b.x,y:a.y},b,{x:a.x,y:b.y}];}
function recordPrimitive(type,geometry,message){saveUndo(message);state.selected=addPrimitive(type,geometry);state.pending=null;render();}
function handleDraftingClicks(tool,p,event){
 const point=snapped(p),pos={x:point.x,y:point.y};
 if(tool==='projection'){const horizontal=Boolean(event?.shiftKey);saveUndo('Проведено проєкційну лінію');state.selected=addLine(horizontal?{x:0,y:pos.y}:{x:pos.x,y:0},horizontal?{x:297,y:pos.y}:{x:pos.x,y:420},{color:COLORS.guide,dash:'dashed',width:.35,label:''});render();return;}
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
function recomputeDerived(){for(let pass=0;pass<4;pass++){for(const p of state.entities){if(p.type!=='point'||!p.derivation)continue;const d=p.derivation;let loc=null;if(d.kind==='intersection'){const l1=get(d.l1),l2=get(d.l2);const x=linePoints(l1),y=linePoints(l2);if(x&&y){const inter=lineIntersect(x.a,x.b,y.a,y.b,l1.extent==='segment',l2.extent==='segment');if(inter)loc=inter.point;}}if(d.kind==='foot'){const l=get(d.line),source=pointOf(d.point),ll=linePoints(l);if(source&&ll)loc=foot2(source,ll.a,ll.b);}if(loc){p.x=loc.x;p.y=loc.y;}}}}
function log(msg){state.history.unshift({msg,time:new Date().toLocaleTimeString('uk-UA',{hour:'2-digit',minute:'2-digit'})});state.history=state.history.slice(0,36);}
function saveUndo(msg){state.undo.push(JSON.stringify({entities:state.entities,coords3:state.coords3,paperMode:state.paperMode,counter:state.counter}));if(state.undo.length>70)state.undo.shift();state.redo=[];if(msg)log(msg);}
function restoreSnap(obj){state.entities=deep(obj.entities||[]);state.coords3=deep(obj.coords3||DEFAULT_3D);state.counter=obj.counter||state.entities.length;state.paperMode=obj.paperMode||'blank';taskResult=state.paperMode==='example'?computeTask(state.coords3):null;state.selected=null;state.pending=null;render();saveLocal();}
function undo(){if(!state.undo.length)return toast('Немає дій для скасування');state.redo.push(JSON.stringify({entities:state.entities,coords3:state.coords3,paperMode:state.paperMode,counter:state.counter}));restoreSnap(JSON.parse(state.undo.pop()));log('Скасування');}
function redo(){if(!state.redo.length)return toast('Немає дій для повторення');state.undo.push(JSON.stringify({entities:state.entities,coords3:state.coords3,paperMode:state.paperMode,counter:state.counter}));restoreSnap(JSON.parse(state.redo.pop()));log('Повторення');}
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
function setMode(mode){if(!['auto','manual'].includes(mode))return;state.mode=mode;state.selected=null;state.pending=null;stopPlay();$('autoStrip').classList.toggle('hidden',mode!=='auto');$('modeManual').classList.toggle('active',mode==='manual');$('modeAuto').classList.toggle('active',mode==='auto');$('statusMode').textContent=mode==='auto'?'Автопобудова':'Креслення';if(mode==='auto'&&state.paperMode==='blank')createExample();else render();closeDrawer();}
function setTool(tool){state.stroke=null;state.tool=tool;state.pending=null;state.selected=null;document.querySelectorAll('.tool').forEach(b=>b.classList.toggle('active',b.dataset.tool===tool));$('canvasViewport').classList.toggle('pan-cursor',tool==='pan');if(state.mode==='auto')setMode('manual');render();closeDrawer();closeToolMenu();closeShapeMenu();showCanvasHint(manualHint());}
function visibleEntity(e,full=false){return full||state.mode==='manual'||e.stage<=state.step;}
function labelOffset(p){if(p.offset)return [p.offset.dx,p.offset.dy];if(p.label.endsWith('1'))return [3.1,4.8];if(p.label.endsWith('2'))return [3.1,-2.8];return [3.2,-3.2];}
function drawLine(parent,e,selected=false,interactive=true){const pts=linePoints(e);if(!pts)return;let {a,b}=pts;if(e.extent==='line'){
 const d=minus(b,a);const ext=e.region==='plan'?{minX:15,minY:192,maxX:281,maxY:306}:e.region==='front'?{minX:15,minY:40,maxX:281,maxY:187}:e.region==='drawing'?{minX:15,minY:38,maxX:281,maxY:307}:{minX:0,minY:0,maxX:297,maxY:420};
 let samples=[];if(Math.abs(d.x)>1e-9){samples.push({x:ext.minX,y:a.y+(ext.minX-a.x)*d.y/d.x},{x:ext.maxX,y:a.y+(ext.maxX-a.x)*d.y/d.x});}
 if(Math.abs(d.y)>1e-9){samples.push({x:a.x+(ext.minY-a.y)*d.x/d.y,y:ext.minY},{x:a.x+(ext.maxY-a.y)*d.x/d.y,y:ext.maxY});}
 samples=samples.filter(p=>p.x>=ext.minX-.01&&p.x<=ext.maxX+.01&&p.y>=ext.minY-.01&&p.y<=ext.maxY+.01);
 if(samples.length>=2){a=samples[0];b=samples[1];}else return;
 }
 const line=makeSVG('line',{x1:a.x,y1:a.y,x2:b.x,y2:b.y,stroke:selected?'#f59e0b':e.color,'stroke-width':selected?Math.max(e.width,1.1):e.width,'stroke-dasharray':styleLine(e.dash),'stroke-linecap':'round','data-id':interactive?e.id:undefined},parent);
 if(selected)line.classList.add('selected-drawing');
 if(interactive){makeSVG('line',{x1:a.x,y1:a.y,x2:b.x,y2:b.y,stroke:'transparent','stroke-width':5,'data-id':e.id},parent);}
 if(e.label){const m=plus(a,times(minus(b,a),.58));const label=makeSVG('text',{x:m.x+3,y:m.y-3,class:'line-label','pointer-events':'none'},parent);label.textContent=e.label;}
}
function drawPoint(parent,p,selected=false,interactive=true){const radius=p.small?1.1:1.5;makeSVG('circle',{cx:p.x,cy:p.y,r:selected?radius+1.0:radius,fill:selected?'#f59e0b':'#fff',stroke:selected?'#c66c0a':p.color,'stroke-width':p.small?.6:.75,'data-id':interactive?p.id:undefined},parent);if(interactive)makeSVG('circle',{cx:p.x,cy:p.y,r:3.8,fill:'transparent','data-id':p.id},parent);
 const [dx,dy]=labelOffset(p);const text=makeSVG('text',{x:p.x+dx,y:p.y+dy,class:'point-label','pointer-events':'none'},parent);text.textContent=p.label.replace(/1$/,'₁').replace(/2$/,'₂');}
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
function redraw(){recomputeDerived();const l=$('drawingLayer');l.replaceChildren();const stage=state.mode==='auto'?state.step:6;const always=state.mode==='manual';baseDecor(l);
 const visible=state.entities.filter(e=>visibleEntity(e));
 visible.filter(e=>e.type==='line').forEach(e=>drawLine(l,e,state.selected===e.id));
 visible.filter(e=>!['line','point'].includes(e.type)).forEach(e=>renderPrimitive(l,e,state.selected===e.id));
 visible.filter(e=>e.type==='point').forEach(e=>drawPoint(l,e,state.selected===e.id));
 if(state.grid)$('gridLayer').style.display='';else $('gridLayer').style.display='none';$('canvasViewport').classList.toggle('grid-on',state.grid);
 const preview=$('previewLayer');preview.replaceChildren();
 if(state.pending?.start){const p=pointOf(state.pending.start);if(p){makeSVG('circle',{cx:p.x,cy:p.y,r:3.5,stroke:'#15a2ab','stroke-width':.8,fill:'none','stroke-dasharray':'2 1'},preview);}}
 if(state.showIntersections){const ls=visible.filter(e=>e.type==='line'&&e.kind!=='guide'&&!['drawing','front','plan'].includes(e.region));let total=0;for(let i=0;i<ls.length&&total<150;i++){for(let j=i+1;j<ls.length&&total<150;j++){const p=linePoints(ls[i]),q=linePoints(ls[j]);if(!p||!q)continue;const ans=lineIntersect(p.a,p.b,q.a,q.b,ls[i].extent==='segment',ls[j].extent==='segment');if(!ans||ans.point.x<0||ans.point.x>297||ans.point.y<0||ans.point.y>420)continue;total++;makeSVG('circle',{cx:ans.point.x,cy:ans.point.y,r:1.4,fill:'#f59d2e','fill-opacity':.55,stroke:'#fff','stroke-width':.3},preview);}}}
 updateStepUI();
}
function updateStepUI(){let step=state.step;$('stepTitle').textContent=STEPS[step][0];$('stepDescription').textContent=STEPS[step][1];$('stepCount').textContent=`${String(step+1).padStart(2,'0')} / 07`;$('stepRange').value=String(step);$('stepPrev').disabled=step===0;$('stepNext').disabled=step===6;$('stepNext').textContent=step===6?'Завершено ✓':'Далі →';$('docName').textContent=state.paperMode==='blank'?'Нове креслення':'Відстань від точки до площини';$('docVariant').textContent=state.paperMode==='blank'?'A3 • клітинка 5 мм':'Варіант 15';$('canvasHelp').textContent=state.mode==='auto'?STEPS[step][1]:manualHint();}
function manualHint(){if(state.pending){if(['segment','line','ruler'].includes(state.tool))return 'Оберіть другу точку. Esc — скасувати.';if(['perp','parallel'].includes(state.tool))return 'Тепер натисніть на точку, через яку треба провести побудову.';if(state.tool==='intersect')return 'Тепер оберіть другу лінію, щоб створити точку перетину.';if(state.pending?.points)return 'Вкажіть наступну точку побудови. Esc — скасувати.';}
 return ({pencil:'Ведіть олівцем по аркушу, утримуючи кнопку миші.',ruler:'Вкажіть дві точки для точного відрізка.',eraser:'Натисніть на об’єкт, щоб стерти його.',compass:'Вкажіть центр кола, потім точку на колі.',circle:'Вкажіть центр кола, потім точку на його окружності.',rectangle:'Вкажіть дві протилежні вершини прямокутника.',protractor:'Вкажіть вершину кута та кінці двох його сторін.',square:'Вкажіть початкову та кінцеву точки. Напрям буде кратний обраному куту.',curve:'Вкажіть початок, точку згину та кінець кривої.',shapes:'Вкажіть дві вершини прямокутника або еліпса; три точки для трикутника.',dimension:'Вкажіть дві точки для розмірної лінії.',projection:'Натисніть точку для вертикалі. Shift — горизонтальна проєкція.',select:'Клацніть об’єкт для вибору. Перетягніть точку, щоб змінити геометрію.',point:'Клацніть місце на аркуші, щоб поставити точку.',segment:'Оберіть дві точки для створення відрізка.',line:'Оберіть дві точки для нескінченної прямої.',perp:'Оберіть опорну пряму, потім точку для перпендикуляра.',parallel:'Оберіть опорну пряму, потім точку для паралелі.',intersect:'Оберіть дві прямі — сайт обчислить точку перетину.',pan:'Тягніть полотно мишкою.',erase:'Натисніть на точку або лінію, щоб видалити.'})[state.tool];}
function render(){redraw();renderInspector();saveLocalDebounced();}
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
function saveLocal(){try{localStorage.setItem('geometry-studio-v1',JSON.stringify({entities:state.entities,coords3:state.coords3,counter:state.counter,paperMode:state.paperMode,mode:state.mode,step:state.step,grid:state.grid,snap:state.snap,history:state.history.slice(0,15)}));}catch(err){}}
function loadLocal(){try{const str=localStorage.getItem('geometry-studio-v1');if(!str)return false;const p=JSON.parse(str);if(!Array.isArray(p.entities)||p.entities.length>7000)return false;state.entities=p.entities;state.coords3=p.coords3||structuredClone(DEFAULT_3D);state.counter=p.counter||p.entities.length;state.paperMode=p.paperMode||'example';state.step=clamp(Number(p.step)||0,0,6);state.grid=p.grid!==false;state.snap=[0,1,5].includes(p.snap)?p.snap:5;state.history=Array.isArray(p.history)?p.history:[];state.mode=['manual','auto'].includes(p.mode)?p.mode:'auto';if(state.paperMode==='example')taskResult=computeTask(state.coords3);return true;}catch(e){return false;}}
function screenToWorld(event){const svg=$('sheet');const pt=svg.createSVGPoint();pt.x=event.clientX;pt.y=event.clientY;const ctm=svg.getScreenCTM();if(!ctm)return null;const p=pt.matrixTransform(ctm.inverse());return {x:p.x,y:p.y};}
function nearestPoint(p,limit=5){let best=null,dist=limit;for(const e of state.entities){if(e.type!=='point'||!visibleEntity(e))continue;const d=len(p,e);if(d<dist){best=e;dist=d;}}return best;}
function nearestIntersection(p,limit=5){const ls=state.entities.filter(e=>e.type==='line'&&visibleEntity(e));let best=null,dist=limit;for(let i=0;i<ls.length;i++)for(let j=i+1;j<ls.length;j++){const a=linePoints(ls[i]),b=linePoints(ls[j]);if(!a||!b)continue;const c=lineIntersect(a.a,a.b,b.a,b.b,ls[i].extent==='segment',ls[j].extent==='segment');if(!c)continue;const d=len(p,c.point);if(d<dist){best=c.point;dist=d;}}return best;}
function snapped(p){const existing=nearestPoint(p,4);if(existing)return {x:existing.x,y:existing.y,id:existing.id};const ix=nearestIntersection(p,4);if(ix)return ix;if(!state.snap)return p;return {x:Math.round(p.x/state.snap)*state.snap,y:Math.round(p.y/state.snap)*state.snap};}
function ensurePoint(world){const pt=snapped(world);if(pt.id)return pt.id;const p=nearestPoint(pt,.4);if(p)return p.id;return addPoint(`P${state.counter+1}`,pt,{color:state.style.color});}
function lineCandidateFromEvent(ev,world){const id=ev.target.getAttribute('data-id');const e=get(id);if(e?.type==='line')return e;let winner=null,dist=4;for(const l of state.entities){if(l.type!=='line'||!visibleEntity(l))continue;const v=linePoints(l);if(!v)continue;const foot=foot2(world,v.a,v.b);if(!foot)continue;const segV=minus(v.b,v.a),t=dot(minus(foot,v.a),segV)/dot(segV,segV);if(l.extent==='segment'&&(t<0||t>1))continue;const d=len(world,foot);if(d<dist){winner=l;dist=d;}}return winner;}
function findClickEntity(ev,world){const el=ev.target.closest('[data-id]');let e=el?get(el.getAttribute('data-id')):null;if(!e){e=nearestPoint(world,3.5)||lineCandidateFromEvent(ev,world);}return e;}
function onCanvasClick(ev){if(state.drag?.moved){state.drag=null;return;}if(state.tool==='pan'||state.mode==='auto')return;const p=screenToWorld(ev);if(!p||p.x<0||p.x>A3.width||p.y<0||p.y>A3.height)return;const entity=findClickEntity(ev,p);
 if(['compass','circle','rectangle','protractor','curve','shapes','square','dimension','projection'].includes(state.tool)){handleDraftingClicks(state.tool,p,ev);return;}
 if(state.tool==='select'){state.selected=entity?.id||null;render();return;}
 if(state.tool==='erase'||state.tool==='eraser'){if(entity){state.selected=entity.id;deleteSelected();}return;}
 if(state.tool==='point'){saveUndo('Додано точку');const id=ensurePoint(p);state.selected=id;render();return;}
 if(['segment','line','ruler'].includes(state.tool)){
  if(!state.pending){state.pending={start:ensurePointWithUndo(p)};render();return;}
  const end=ensurePointWithUndo(p);const first=state.pending.start;
  if(first===end){toast('Оберіть іншу точку');return;}
  saveUndo(`Побудовано ${state.tool==='line'?'пряму':'відрізок'}`);state.selected=addLine(first,end,{extent:state.tool==='line'?'line':'segment',...state.style});state.pending=null;render();return;
 }
 if(['perp','parallel','intersect'].includes(state.tool)){
  if(!state.pending){const l=lineCandidateFromEvent(ev,p);if(!l){toast('Спочатку оберіть опорну лінію');return;}state.pending={line:l.id};render();return;}
  const base=get(state.pending.line),vec=linePoints(base);if(!vec){state.pending=null;return;}
  if(state.tool==='intersect'){
   const second=lineCandidateFromEvent(ev,p);if(!second||second.id===base.id){toast('Оберіть іншу лінію');return;}
   const q=linePoints(second);if(!q)return;const intersection=lineIntersect(vec.a,vec.b,q.a,q.b,base.extent==='segment',second.extent==='segment');
   if(!intersection){toast('У цих межах лінії не перетинаються');return;}
   saveUndo('Обчислено точку перетину');state.selected=addPoint(`I${state.counter+1}`,intersection.point,{color:'#0b9c90',derivation:{kind:'intersection',l1:base.id,l2:second.id}});state.pending=null;render();return;
  }
  saveUndo(state.tool==='perp'?'Побудовано перпендикуляр':'Побудовано паралельну пряму');const id=ensurePoint(p);if(state.tool==='perp'){
   const foot=foot2(pointOf(id),vec.a,vec.b);if(!foot||len(foot,pointOf(id))<.01){toast('Точка вже лежить на прямій');state.pending=null;render();return;}
   const footID=addPoint(`H${state.counter+1}`,foot,{color:'#0e968a',derivation:{kind:'foot',line:base.id,point:id}});state.selected=addLine(id,footID,{color:state.style.color,dash:state.style.dash,width:state.style.width});
  }else{const d=minus(vec.b,vec.a);const length=Math.hypot(d.x,d.y);const other=plus(pointOf(id),times(d,35/length));state.selected=addLine(id,other,{extent:'line',...state.style});}
  state.pending=null;render();return;
 }
}
function ensurePointWithUndo(p){const sn=snapped(p),nearest=nearestPoint(sn,.5);if(nearest)return nearest.id;saveUndo('Додано опорну точку');return ensurePoint(sn);}
function deleteSelected(){const e=get(state.selected);if(!e)return;saveUndo(`Видалено ${e.type==='point'?'точку':'лінію'} ${e.label||e.id}`);state.entities=state.entities.filter(p=>p.id!==e.id&&!(e.type==='point'&&p.type==='line'&&(p.a===e.id||p.b===e.id))&&!(p.derivation&&(p.derivation.line===e.id||p.derivation.l1===e.id||p.derivation.l2===e.id||p.derivation.point===e.id)));state.selected=null;render();}
function setStyle(key,value){const e=get(state.selected);if(e&&e.type!=='point'){saveUndo('Змінено стиль об’єкта');e[key]=value;}else state.style[key]=value;render();}
function moveZoom(factor){state.zoom=clamp(state.zoom*factor,.38,3.5);updatePaperTransform();}
function fitPaper(){const box=$('canvasViewport');if(!box.clientWidth||!box.clientHeight)return;const factor=Math.min((box.clientWidth-50)/594,(box.clientHeight-65)/840,1.14);state.zoom=clamp(factor,.35,1.14);state.pan={x:(box.clientWidth-594*state.zoom)/2,y:Math.max(15,(box.clientHeight-840*state.zoom)/2)};updatePaperTransform();}
function updatePaperTransform(){const wrap=$('paperWrap');wrap.style.transform=`translate(${state.pan.x}px,${state.pan.y}px) scale(${state.zoom})`;const viewport=$('canvasViewport');viewport.style.setProperty('--minor-step',`${10*state.zoom}px`);viewport.style.setProperty('--major-step',`${50*state.zoom}px`);viewport.style.setProperty('--grid-offset-x',`${state.pan.x}px`);viewport.style.setProperty('--grid-offset-y',`${state.pan.y}px`);$('zoomLabel').textContent=`${Math.round(state.zoom*100)}%`;}
function stopPlay(){if(state.playing){clearInterval(state.playing);state.playing=null;}$('stepPlay').textContent='▶ Пуск';}
function autoplay(){if(state.playing){stopPlay();return;}if(state.step>=6)state.step=0;setMode('auto');render();$('stepPlay').textContent='Ⅱ Пауза';state.playing=setInterval(()=>{if(state.step>=6){stopPlay();return;}state.step++;render();},1450);}
function setStep(step){stopPlay();state.step=clamp(step,0,6);if(state.mode==='auto')render();}
function newBlank(){saveUndo('Новий чистий аркуш');stopPlay();state.entities=[];state.counter=0;state.selected=null;state.paperMode='blank';taskResult=null;state.history=[];log('Створено порожнє креслення');setMode('manual');state.zoom=1;fitPaper();render();toast('Чистий аркуш A3 готовий');}
function startExample(){saveUndo('Завантажено приклад');state.coords3=deep(DEFAULT_3D);state.step=6;createExample();setMode('auto');fitPaper();}
function addPoint3D(){const name=$('add3Name').value.trim().replace(/[^A-Za-zА-Яа-яІіЇїЄєҐґ0-9_-]/g,'').slice(0,12)||'P';const x=Number($('add3X').value),y=Number($('add3Y').value),z=Number($('add3Z').value);if(![x,y,z].every(Number.isFinite)||[p1({x,y,z}),p2({x,y,z})].some(p=>p.x<0||p.x>297||p.y<0||p.y>420)){toast('Координати мають бути в межах аркуша A3');return;}
 saveUndo(`Додано просторову точку ${name}`);const q1=addPoint(`${name}1`,p1({x,y,z}),{color:state.style.color});const q2=addPoint(`${name}2`,p2({x,y,z}),{color:state.style.color});addLine(q1,q2,{dash:'dashed',color:COLORS.guide,width:.35});setMode('manual');render();toast(`Створено ${name}₁ та ${name}₂`);
}
function exportBlob(text,type,name){const a=document.createElement('a');const u=URL.createObjectURL(new Blob([text],{type}));a.href=u;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),1000);}
function exportJSON(){exportBlob(JSON.stringify({format:'geometry-studio-v1',created:new Date().toISOString(),document:{size:'A3',orientation:'portrait',unit:'mm'},entities:state.entities,coords3:state.coords3,paperMode:state.paperMode,counter:state.counter,axisMode:window.GeometryStudioAxes?.getMode()||'none'},null,2),'application/json;charset=utf-8','geometry-studio-project.json');toast('JSON-проєкт збережено');}
function exportSVG(){const cl=$('sheet').cloneNode(true);cl.querySelector('#previewLayer')?.remove();cl.removeAttribute('id');cl.setAttribute('width','297mm');cl.setAttribute('height','420mm');cl.setAttribute('xmlns','http://www.w3.org/2000/svg');exportBlob(new XMLSerializer().serializeToString(cl),'image/svg+xml;charset=utf-8','geometry-studio-A3.svg');toast('SVG-креслення збережено');}
function addExplicitPrintGrid(svg){
 const g=svg.querySelector('#gridLayer');if(!g)return;g.replaceChildren();if(!state.grid)return;
 for(let x=0;x<=A3.width+.01;x+=5){makeSVG('line',{x1:x,y1:0,x2:x,y2:420,stroke:x%25===0?'#a9bfd3':'#d5e2ed','stroke-width':x%25===0?.23:.11},g);}
 for(let y=0;y<=A3.height+.01;y+=5){makeSVG('line',{x1:0,y1:y,x2:297,y2:y,stroke:y%25===0?'#a9bfd3':'#d5e2ed','stroke-width':y%25===0?.23:.11},g);}
}
function printPDF(){const cl=$('sheet').cloneNode(true);cl.querySelector('#previewLayer')?.remove();cl.removeAttribute('id');cl.setAttribute('width','297mm');cl.setAttribute('height','420mm');addExplicitPrintGrid(cl);$('printSheet').replaceChildren(cl);window.print();}
function importJSON(file){file.text().then(txt=>{try{const obj=JSON.parse(txt);if(!Array.isArray(obj.entities)||obj.entities.length>5000)throw Error('Некоректна структура проєкту');for(const e of obj.entities){if(!['point','line','path','circle','angle','shape','dimension'].includes(e.type))throw Error('Невідомий тип об’єкта');if(e.type==='point'&&(!Number.isFinite(e.x)||!Number.isFinite(e.y)))throw Error('Некоректні координати');if(['path','shape','angle'].includes(e.type)&&(!Array.isArray(e.points)||e.points.length>3000||!e.points.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y))))throw Error('Некоректні точки фігури');}
 saveUndo('Імпорт проєкту');state.entities=obj.entities;state.counter=Math.max(Number(obj.counter)||0,state.entities.length);state.paperMode=obj.paperMode==='example'?'example':'blank';state.coords3=obj.coords3||deep(DEFAULT_3D);taskResult=state.paperMode==='example'?computeTask(state.coords3):null;setMode('manual');window.GeometryStudioAxes?.setMode(obj.axisMode||'none');render();toast('Проєкт успішно відкрито');}catch(e){toast(`Не вдалося відкрити JSON: ${e.message}`);}});}
function init(){
 const restored=loadLocal();if(!restored){state.entities=[];state.paperMode='blank';state.mode='manual';state.step=0;state.counter=0;taskResult=null;log('Новий аркуш');}else{if(state.paperMode==='example')taskResult=computeTask(state.coords3);render();}
 document.querySelectorAll('.tool').forEach(b=>b.addEventListener('click',()=>setTool(b.dataset.tool)));
 $('modeManual').addEventListener('click',()=>setMode('manual'));$('modeAuto').addEventListener('click',()=>setMode('auto'));
 $('btnNew').addEventListener('click',newBlank);$('btnExample').addEventListener('click',startExample);
 $('btnPrint').addEventListener('click',printPDF);$('btnSave').addEventListener('click',exportJSON);$('btnSVG').addEventListener('click',exportSVG);$('btnLoad').addEventListener('click',()=>$('fileImport').click());$('fileImport').addEventListener('change',e=>{if(e.target.files?.[0])importJSON(e.target.files[0]);e.target.value='';});
 $('btnUndo').addEventListener('click',undo);$('btnRedo').addEventListener('click',redo);
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

 const viewport=$('canvasViewport'),svg=$('sheet');let down=null;let suppressClick=false;const touchPointers=new Map();let pinch=null;
 svg.addEventListener('click',e=>{if(suppressClick){suppressClick=false;return;}onCanvasClick(e);});
 svg.addEventListener('contextmenu',e=>{e.preventDefault();state.pending=null;render();});
 svg.addEventListener('pointerdown',e=>{
  if(e.pointerType==='touch'){
   touchPointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
   if(touchPointers.size===2){
    const [a,b]=[...touchPointers.values()];const midpoint={x:(a.x+b.x)/2,y:(a.y+b.y)/2};const bounds=viewport.getBoundingClientRect();
    pinch={distance:Math.hypot(a.x-b.x,a.y-b.y),zoom:state.zoom,paperX:(midpoint.x-bounds.left-state.pan.x)/state.zoom,paperY:(midpoint.y-bounds.top-state.pan.y)/state.zoom};down=null;svg.setPointerCapture(e.pointerId);return;
   }
  }
  if(e.button!==0)return;
  if(state.tool==='pencil'&&state.mode==='manual'){const world=screenToWorld(e);if(world){state.stroke={pointerId:e.pointerId,points:[world]};svg.setPointerCapture(e.pointerId);e.preventDefault();return;}}
  const world=screenToWorld(e);const entity=world?findClickEntity(e,world):null;
  const dragPoint=state.mode==='manual'&&state.tool==='select'&&entity?.type==='point'&&!entity.derivation?entity:null;
  down={startX:e.clientX,startY:e.clientY,panX:state.pan.x,panY:state.pan.y,dragPoint:dragPoint?.id,original:dragPoint?{x:dragPoint.x,y:dragPoint.y}:null,moved:false,world};
  if(state.tool==='pan'||e.shiftKey){viewport.classList.add('panning');}
  svg.setPointerCapture(e.pointerId);
 });
 svg.addEventListener('pointermove',e=>{
  if(state.stroke&&state.stroke.pointerId===e.pointerId){const p=screenToWorld(e);if(p){const points=state.stroke.points;if(len(points[points.length-1],p)>.6){points.push({x:clamp(p.x,0,297),y:clamp(p.y,0,420)});const preview=$('previewLayer');preview.replaceChildren();makeSVG('polyline',{points:points.map(q=>q.x+','+q.y).join(' '),fill:'none',stroke:state.style.color,'stroke-width':state.style.width,'stroke-linecap':'round','stroke-linejoin':'round'},preview);}}return;}
  if(e.pointerType==='touch'&&touchPointers.has(e.pointerId))touchPointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(pinch&&touchPointers.size>=2){const [a,b]=[...touchPointers.values()];const newDist=Math.hypot(a.x-b.x,a.y-b.y);const midpoint={x:(a.x+b.x)/2,y:(a.y+b.y)/2};const bounds=viewport.getBoundingClientRect();
   state.zoom=clamp(pinch.zoom*newDist/Math.max(1,pinch.distance),.38,3.5);state.pan={x:midpoint.x-bounds.left-pinch.paperX*state.zoom,y:midpoint.y-bounds.top-pinch.paperY*state.zoom};updatePaperTransform();suppressClick=true;return;}
  const world=screenToWorld(e);if(world)$('cursorCoords').textContent=`X: ${fmt(world.x,1)} мм · Y: ${fmt(world.y,1)} мм`;
  if(!down)return;const dx=e.clientX-down.startX,dy=e.clientY-down.startY;
  if(Math.hypot(dx,dy)>4)down.moved=true;
  if(!down.moved)return;
  if(state.tool==='pan'||e.shiftKey){state.pan={x:down.panX+dx,y:down.panY+dy};updatePaperTransform();suppressClick=true;}
  else if(down.dragPoint){const p=get(down.dragPoint);if(p&&world){const candidate=state.snap?{x:Math.round(world.x/state.snap)*state.snap,y:Math.round(world.y/state.snap)*state.snap}:world;p.x=clamp(candidate.x,0,297);p.y=clamp(candidate.y,0,420);redraw();suppressClick=true;}}
 });
 svg.addEventListener('pointerup',e=>{
  if(state.stroke&&state.stroke.pointerId===e.pointerId){const pts=state.stroke.points;state.stroke=null;if(pts.length>=2){recordPrimitive('path',{points:pts},'Проведено олівцем');}else{$('previewLayer').replaceChildren();}down=null;suppressClick=true;setTimeout(()=>{suppressClick=false;},0);return;}
  if(e.pointerType==='touch'){touchPointers.delete(e.pointerId);if(pinch){if(touchPointers.size<2)pinch=null;down=null;suppressClick=true;setTimeout(()=>{suppressClick=false;},0);return;}}
  if(down?.dragPoint&&down.moved){const p=get(down.dragPoint);if(p&&down.original&&len(p,down.original)>.001){const after={x:p.x,y:p.y};p.x=down.original.x;p.y=down.original.y;saveUndo(`Переміщено точку ${p.label}`);p.x=after.x;p.y=after.y;state.selected=p.id;render();}}
  if(down?.moved){suppressClick=true;setTimeout(()=>{suppressClick=false;},0);}down=null;viewport.classList.remove('panning');
 });
 svg.addEventListener('pointercancel',e=>{state.stroke=null;$('previewLayer').replaceChildren();touchPointers.delete(e.pointerId);if(touchPointers.size<2)pinch=null;down=null;viewport.classList.remove('panning');});
 viewport.addEventListener('wheel',e=>{if(!e.ctrlKey&&!e.metaKey)return;e.preventDefault();moveZoom(e.deltaY<0?1.1:1/1.1);},{passive:false});
 // On graph-paper area beyond the A3 drawing viewport, drag to pan the sheet.
 let emptyDrag=null;
 viewport.addEventListener('pointerdown',e=>{
   if(e.target.closest('#paperWrap')||e.button!==0)return;
   emptyDrag={x:e.clientX,y:e.clientY,panX:state.pan.x,panY:state.pan.y,id:e.pointerId};
   viewport.setPointerCapture(e.pointerId);
 });
 viewport.addEventListener('pointermove',e=>{
   if(!emptyDrag||e.pointerId!==emptyDrag.id)return;
   state.pan={x:emptyDrag.panX+e.clientX-emptyDrag.x,y:emptyDrag.panY+e.clientY-emptyDrag.y};
   updatePaperTransform();
 });
 viewport.addEventListener('pointerup',e=>{if(emptyDrag?.id===e.pointerId)emptyDrag=null;});
 viewport.addEventListener('pointercancel',()=>{emptyDrag=null;});

 document.addEventListener('keydown',e=>{if(e.key==='Tab'&&!e.shiftKey&&!drawerIsOpen()&&(!document.activeElement||document.activeElement===document.body||document.activeElement===edge)){e.preventDefault();openDrawer();$('drawerClose').focus();return;}if(['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName))return;
 if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();undo();return;}
 if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='y'){e.preventDefault();redo();return;}
 if(e.key==='Delete'||e.key==='Backspace'){deleteSelected();return;}
 if(e.key==='Escape'){closeToolMenu();closeShapeMenu();closeDrawer();state.pending=null;state.selected=null;render();return;}
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
  const front=addPoint(label+'2',b,{color:COLORS.base});
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
   const a=p1(p),b=p2(p),plan=addPoint(names[i]+'1',a,{color:COLORS.base}),front=addPoint(names[i]+'2',b,{color:COLORS.base});
   addLine(plan,front,{color:COLORS.guide,width:.32,dash:'dashed',kind:'projection'});
   return {plan,front,label:names[i]};
  });
  for(const suffix of ['plan','front'])for(const [i,j] of [[0,1],[1,2],[2,0]]){
   addLine(pairs[i][suffix],pairs[j][suffix],{color:COLORS.base,width:.8,kind:'triangle'});
  }
  state.selected=null;state.pending=null;render();return pairs;
 }
};

init();
})();