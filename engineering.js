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
 records:[],history:[],future:[],pointer:null,measure:null,ruler:{x:230,y:565,angle:0},stage:0,segment:0,
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
      <button type="button" data-tool="compass" title="Накреслити коло"><span class="eng-tool-icon">◉</span><small>Циркуль</small></button>
      <button type="button" data-tool="caliper" title="Виміряти діаметр"><span class="eng-tool-icon">⊣</span><small>Штангенциркуль</small></button>
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
function saveHistory(){state.history.push(copyRecords());if(state.history.length>60)state.history.shift();state.future=[]}
function toast(val){state.status=val;drawHUD();setTimeout(()=>{if(state.status===val){state.status='';drawHUD()}},1450)}
function mode(){return document.body.dataset.expMode||'demo'}
function lesson(){try{return typeof active==='number'?active:0}catch{return 0}}
function setMode(next){
 if(next===state.lastMode)return;
 state.lastMode=next;state.mode=next;state.pointer=null;state.pending=null;state.measure=null;state.status='';
 if(next==='demo'){state.demoStart=performance.now();state.demoPlaying=true;state.stage=0}
 if(next==='quest'){state.stage=state.saved;state.segment=state.stage===0?0:4;state.tool=state.stage===1?'compass':state.stage===2?'ruler':'line';state.records=[];
  if(state.stage>=1)state.records.push(...expectedLines());
  if(state.stage>=2)state.records.push({type:'circle',x:circle.x,y:circle.y,r:circle.r});
 }
 if(next==='explore'){state.tool='line';state.records=[];state.history=[];state.future=[]}
 draw();
}
function expectedLines(){const x=rect.x,y=rect.y,w=rect.w,h=rect.h;return [
 {type:'line',x1:x,y1:y,x2:x+w,y2:y}, {type:'line',x1:x+w,y1:y,x2:x+w,y2:y+h},
 {type:'line',x1:x+w,y1:y+h,x2:x,y2:y+h},{type:'line',x1:x,y1:y+h,x2:x,y2:y}];}
function pt(e){const p=svg.createSVGPoint();p.x=e.clientX;p.y=e.clientY;const tr=svg.getScreenCTM();return tr?p.matrixTransform(tr.inverse()):{x:0,y:0}}
function validLine(a,b){if(dist(a,b)<25)return false;return true}
function fmt(num){const n=state.measureUnit==='cm'?num/10:num;return `${(Math.round(n*10)/10).toLocaleString('uk-UA')} ${state.measureUnit}`}
function currentLength(){if(state.pending){if(state.pending.type==='line')return dist({x:state.pending.x1,y:state.pending.y1},{x:state.pending.x2,y:state.pending.y2})/state.scale;if(state.pending.type==='circle')return state.pending.r*2/state.scale}
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
 else el=svgEl('circle',{cx:shape.x,cy:shape.y,r:shape.r,class:cls});
 root.append(el);return el;
}
function addDraftMeasure(root,shape){
 if(shape.type==='line'){
  const dx=shape.x2-shape.x1,dy=shape.y2-shape.y1,midX=(shape.x1+shape.x2)/2,midY=(shape.y1+shape.y2)/2;
  const text=svgEl('text',{x:midX+ (Math.abs(dx)<Math.abs(dy)?22:0),y:midY-14,class:'eng-blueprint-label','text-anchor':'middle'});
  text.textContent=fmt(Math.hypot(dx,dy)/state.scale);root.append(text);
 }else{const text=svgEl('text',{x:shape.x,y:shape.y-shape.r-18,class:'eng-blueprint-label','text-anchor':'middle'});text.textContent='Ø '+fmt(shape.r*2/state.scale);root.append(text)}
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
function draw(){
 const layer=svgEl('g');svg.replaceChildren(layer);
 const guide=svgEl('g'),actual=svgEl('g');layer.append(guide,actual);
 if(state.layerGuide)questGuide(guide);
 if(state.layerDrawing){for(const r of state.records){addShape(actual,r);addDraftMeasure(actual,r)}}
 if(state.pending){addShape(actual,state.pending,{preview:true});addDraftMeasure(actual,state.pending)}
 if(state.mode==='demo')rulerShape(actual);
 else if(state.tool==='ruler'||(state.mode==='quest'&&state.stage===2))rulerShape(actual);
 if(state.mode==='quest'&&state.stage===2&&state.tool==='caliper'){
  actual.append(svgEl('path',{d:`M ${circle.x-circle.r-23} ${circle.y-16}v-28h15 M ${circle.x+circle.r+23} ${circle.y-16}v-28h-15 M ${circle.x-circle.r-23} ${circle.y-29}H ${circle.x+circle.r+23}`,stroke:'#ccf9e5',fill:'none','stroke-width':3}));
 }
 drawHUD();
}
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
function commit(){
 if(!state.pending)return;
 const p=state.pending;
 if(!checkTarget(p)){toast('↔ Перевір розмір');return}
 saveHistory();state.records.push({...p});state.pending=null;
 if(state.mode==='quest'){
  if(state.stage===0){state.segment++;if(state.segment>=4){state.stage=1;state.saved=Math.max(state.saved,1);state.tool='compass';save();toast('✓ 1 / 3')}else toast('✓ '+state.segment+' / 4')}
  else if(state.stage===1){state.stage=2;state.saved=Math.max(state.saved,2);state.tool='ruler';state.measure=null;save();toast('✓ 2 / 3')}
 }
 animateInk(p);draw();
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
function undo(){if(!state.history.length)return;state.future.push(copyRecords());state.records=state.history.pop();state.pending=null;draw()}
function redo(){if(!state.future.length)return;state.history.push(copyRecords());state.records=state.future.pop();state.pending=null;draw()}
function clear(){saveHistory();state.records=[];state.pending=null;state.measure=null;if(state.mode==='quest'){state.stage=0;state.segment=0;state.saved=0;state.tool='line';save()}draw()}
function demo(now){
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
 if(state.mode==='demo'||state.stage>=3)return;
 const p=pt(e),target=e.target.closest('[data-drag]');
 if(target){state.pointer={kind:'ruler',start:p,x:state.ruler.x,y:state.ruler.y};}
 else if(state.tool==='line'){state.pointer={kind:'line',start:{x:snap(p.x),y:snap(p.y)}};
  state.pending={type:'line',x1:snap(p.x),y1:snap(p.y),x2:snap(p.x),y2:snap(p.y)};}
 else if(state.tool==='compass'){state.pointer={kind:'circle',start:{x:snap(p.x),y:snap(p.y)}};
  state.pending={type:'circle',x:snap(p.x),y:snap(p.y),r:0};}
 else if(state.tool==='eraser'){let nearest=-1,mind=22;state.records.forEach((s,i)=>{const d=s.type==='circle'?Math.abs(dist(p,s)-s.r):Math.abs((s.y2-s.y1)*p.x-(s.x2-s.x1)*p.y+s.x2*s.y1-s.y2*s.x1)/Math.max(1,Math.hypot(s.y2-s.y1,s.x2-s.x1));if(d<mind){nearest=i;mind=d}});if(nearest>=0){saveHistory();state.records.splice(nearest,1);draw()}return;}
 else if(state.tool==='caliper'){
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
 if(!state.pointer)return;const p=pt(e),q=state.pointer;
 if(q.kind==='line'){let x=snap(p.x),y=snap(p.y);if(e.shiftKey){if(Math.abs(x-q.start.x)>Math.abs(y-q.start.y))y=q.start.y;else x=q.start.x}
  state.pending.x2=clamp(x,18,1182);state.pending.y2=clamp(y,18,642);}
 if(q.kind==='circle'){state.pending.r=clamp(snap(dist(p,q.start)),5,255)}
 if(q.kind==='ruler'){state.ruler.x=clamp(q.x+p.x-q.start.x,12,920);state.ruler.y=clamp(q.y+p.y-q.start.y,40,620)}
 draw();
}
function handleUp(){if(!state.pointer)return;
 if(state.pending&&state.pending.type==='line'&&!validLine({x:state.pending.x1,y:state.pending.y1},{x:state.pending.x2,y:state.pending.y2}))state.pending=null;
 if(state.pending&&state.pending.type==='circle'&&state.pending.r<15)state.pending=null;
 if(state.pointer.kind==='ruler'&&state.mode==='quest'&&state.stage===2){
  if(Math.abs(state.ruler.y-(rect.y+rect.h+35))<28&&Math.abs(state.ruler.x-rect.x)<30){state.measure='rect';finishMeasurement()}
 }
 state.pointer=null;svg.classList.remove('eng-grab');draw();
}
svg.addEventListener('pointerdown',handleDown);svg.addEventListener('pointermove',handleMove);svg.addEventListener('pointerup',handleUp);svg.addEventListener('pointercancel',handleUp);
svg.addEventListener('dblclick',e=>{if(state.tool==='ruler'){state.ruler.angle=(state.ruler.angle+90)%360;draw()}});
confirm.addEventListener('click',commit);
tools.addEventListener('click',e=>{const btn=e.target.closest('button[data-tool]');if(!btn||state.mode==='demo')return;const t=btn.dataset.tool;
 if(t==='units'){state.measureUnit=state.measureUnit==='mm'?'cm':'mm';draw();return}
 state.tool=t;state.pending=null;draw();});
cmd.addEventListener('click',e=>{const b=e.target.closest('[data-cmd]');if(!b)return;const a=b.dataset.cmd;
 if(a==='replay'){state.demoStart=performance.now();state.demoPlaying=true;state.records=[]}
 if(a==='play'){if(!state.demoPlaying){state.demoStart=performance.now();state.records=[]}state.demoPlaying=!state.demoPlaying}
 if(a==='next'){state.demoStart=performance.now()-1.4*(Math.min(4,Math.floor((performance.now()-state.demoStart)/1400)+1))*1000;state.demoPlaying=true}
 draw();});
right.addEventListener('click',e=>{const btn=e.target.closest('button');if(!btn)return;
 if(btn.dataset.layer){state['layer'+btn.dataset.layer]=!state['layer'+btn.dataset.layer];draw()}
 if(btn.dataset.cmd==='undo')undo();if(btn.dataset.cmd==='redo')redo();if(btn.dataset.cmd==='clear')clear();
 if(btn.dataset.view==='objects'){toast('⬡ 3D наступним етапом')}if(btn.dataset.view==='blueprint'){toast('▣ 2D')}
});
window.addEventListener('keydown',e=>{if(lesson()!==0||mode()==='demo')return;
 if(e.key==='Escape'){state.pending=null;draw()}
 if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();if(e.shiftKey)redo();else undo()}
 if(e.key==='Enter'&&state.pending){e.preventDefault();commit()}
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