/* GNSS LAB 01 / learning through physical interaction, no theory or quizzes. */
(function(){
'use strict';
const board=document.getElementById('engBoard');if(!board)return;
const n=3,clamp=(x,a,b)=>Math.min(b,Math.max(a,x)),round=(x,d=1)=>Math.round(x*10**d)/10**d;
const fmt=(x,d=1)=>round(x,d).toLocaleString('uk-UA',{maximumFractionDigits:d});
const lessons=[
 ['Довжина','Перетягни точку B','Побудуй відрізок 120 мм'],
 ['Одиниці','Порівняй одну довжину в різних одиницях','Перемкни мм, см і м'],
 ['Кути','Обертай промінь за зелену точку','Встанови кут 90°'],
 ['Коло','Змінюй радіус перетягуванням','Побудуй коло Ø 64 мм'],
 ['Периметр','Змінюй прямокутник за кут','Побудуй 140 × 80 мм, P = 440 мм'],
 ['Площа','Рухай кут і спостерігай клітинки','Отримай 11 200 мм² (140 × 80 мм)'],
 ['Вимірювання','Обери деталь і рухай губку штангенциркуля','Виміряй брусок і циліндр']
];
let state={stage:0,done:Array(7).fill(false)};
try{const a=JSON.parse(localStorage.getItem('gnss-lab-journey-01')||'{}');
 if(Number.isInteger(a.stage))state.stage=clamp(a.stage,0,6);
 if(Array.isArray(a.done)&&a.done.length===7)state.done=a.done.map(Boolean);
}catch{}
let stage=state.stage,mode=document.body.dataset.expMode||'demo',open=false,drag=null,drawer=false,begin=performance.now(),lastFrame=0;
let length=75,angle=35,radius=63,width=315,height=165,unit='mm',used=new Set(),object='block',gap=70,measured=new Set(),timer;
const root=document.createElement('section');root.id='lab01Journey';
root.setAttribute('aria-label','Практична лабораторія: величини та вимірювання');
root.innerHTML='<div class="journey-nav"><button type="button" class="journey-nav-toggle" id="jNavToggle" aria-expanded="false">01 / Довжина ▾</button><nav class="journey-step-list" id="jStepList" aria-label="Станції" hidden></nav></div>'+
'<div class="j-hud"><div class="j-id" id="jIndex"></div><div class="j-hud-title" id="jTitle"></div><div class="j-hud-task" id="jTask"></div></div>'+
'<svg xmlns="http://www.w3.org/2000/svg" class="journey-sketch" id="jSketch" viewBox="0 0 1200 660" preserveAspectRatio="xMidYMid meet" aria-label="Інтерактивна модель"></svg>'+
'<div class="j-units" id="jUnits" hidden><button data-unit="mm">мм</button><button data-unit="cm">см</button><button data-unit="m">м</button></div>'+
'<div class="j-notice" id="jNotice" role="status"></div><div class="j-metrics" id="jMetrics" aria-live="polite"></div>'+
'<div class="j-footer"><div><button type="button" class="j-action" id="jReplay">↻</button><button type="button" class="j-action" id="jFree">Вільне креслення</button></div>'+
'<div class="j-progress" id="jProgress"></div><div><button type="button" class="j-action j-primary-action" id="jCheck">✓ Перевірити</button><button type="button" class="j-action" id="jNext">Далі →</button></div></div>';
board.append(root);
const $=s=>root.querySelector(s),sketch=$('#jSketch'),units=$('#jUnits'),nav=$('#jStepList'),toggle=$('#jNavToggle');
const replay=$('#jReplay'),free=$('#jFree'),next=$('#jNext'),check=$('#jCheck');
function save(){try{localStorage.setItem('gnss-lab-journey-01',JSON.stringify({stage,done:state.done}))}catch{}}
function say(t){const el=$('#jNotice');el.textContent=t;clearTimeout(timer);timer=setTimeout(()=>{if(el.textContent===t)el.textContent=''},2400)}
function reset(){
 length=stage===1?120:75;angle=35;radius=64;width=315;height=165;unit='mm';
 used=new Set();object='block';gap=70;measured=new Set();
}
function selected(i){
 if(i<0||i>=7)return;
 stage=i;begin=performance.now();drag=null;drawer=false;nav.hidden=true;
 toggle.setAttribute('aria-expanded','false');reset();save();refresh();
}
function value(v){return unit==='mm'?fmt(v)+' мм':unit==='cm'?fmt(v/10,2)+' см':fmt(v/1000,3)+' м'}
function metric(v,name){return '<div class="j-metric"><strong>'+v+'</strong><small>'+name+'</small></div>'}
function metrics(){
 const w=width/n,h=height/n,area=w*h;
 if(stage===0)return metric(fmt(length)+' мм','ДОВЖИНА')+metric(fmt(length/10,2)+' см','ТА САМА ВІДСТАНЬ');
 if(stage===1)return metric(value(120),'ОДНА ДОВЖИНА')+metric('120 мм = 12 см = 0,12 м','ПОРІВНЯННЯ');
 if(stage===2)return metric(fmt(angle)+'°','КУТ')+metric(angle<90?'ГОСТРИЙ':angle>90?'ТУПИЙ':'ПРЯМИЙ','ТИП');
 if(stage===3)return metric(fmt(radius/n,1)+' мм','РАДІУС')+metric(fmt(radius*2/n,1)+' мм','ДІАМЕТР');
 if(stage===4)return metric(fmt(w)+' × '+fmt(h)+' мм','СТОРОНИ')+metric(fmt(2*(w+h))+' мм','ПЕРИМЕТР');
 if(stage===5)return metric(fmt(w)+' × '+fmt(h)+' мм','СТОРОНИ')+metric(fmt(area,0)+' мм²','ПЛОЩА');
 return metric(fmt(gap,1)+' мм','ГУБКИ')+metric(measured.size+' / 2','ВИМІРЯНО');
}
const L=(a,b,c,d,cls='j-primary')=>'<line x1="'+a+'" y1="'+b+'" x2="'+c+'" y2="'+d+'" class="'+cls+'"/>';
const C=(x,y,r,cls='j-point')=>'<circle cx="'+x+'" cy="'+y+'" r="'+r+'" class="'+cls+'"/>';
const T=(x,y,v,cls='j-dimension')=>'<text x="'+x+'" y="'+y+'" text-anchor="middle" class="'+cls+'">'+v+'</text>';
const H=(x,y,id)=>'<circle cx="'+round(x)+'" cy="'+round(y)+'" r="10" class="j-handle" tabindex="0" role="slider" aria-label="Змінити розмір" data-grab="'+id+'"/>';
const defs='<defs><linearGradient id="jWood" x1="0" y1="0" x2="1" y2="0"><stop stop-color="#d3b78d"/><stop offset=".24" stop-color="#f1d7ab"/><stop offset=".72" stop-color="#b38f68"/><stop offset="1" stop-color="#e2c69e"/></linearGradient>'+
'<radialGradient id="jCylinder"><stop stop-color="#daeadf"/><stop offset=".7" stop-color="#8cafae"/><stop offset="1" stop-color="#416876"/></radialGradient>'+
'<linearGradient id="jMetal" x1="0" x2="0" y1="0" y2="1"><stop stop-color="#f6f8f6"/><stop offset=".5" stop-color="#b4c8cf"/><stop offset="1" stop-color="#5f7988"/></linearGradient>'+
'<pattern id="jCells" width="30" height="30" patternUnits="userSpaceOnUse"><path d="M30 0H0V30" fill="none" stroke="#b4fb8c" stroke-width=".9" opacity=".6"/></pattern></defs>';
function scene(){
 let s=defs;
 if(stage<=1){
  const b=320+(stage===1?120:length)*n;
  s+=L(320,330,b,330)+L(320,295,320,360,'j-measure')+L(b,295,b,360,'j-measure');
  s+=C(320,330,5)+C(b,330,5)+T(320,313,'A','j-secondary')+T(b,313,'B','j-secondary');
  s+=T((320+b)/2,291,stage===1?value(120):fmt(length)+' мм');
  if(stage===0)s+=H(b,330,'length');
 }else if(stage===2){
  const rad=angle*Math.PI/180,x=500+270*Math.cos(rad),y=390-270*Math.sin(rad);
  s+=L(500,390,795,390)+L(500,390,x,y)+C(500,390,5)+H(x,y,'angle');
  const ax=500+70*Math.cos(rad/2),ay=390-70*Math.sin(rad/2);
  s+='<path d="M570 390 A70 70 0 0 0 '+round(ax,2)+' '+round(ay,2)+'" fill="none" stroke="#b8fa84" stroke-width="2.6"/>';
  s+=T(500+115*Math.cos(rad/2),390-115*Math.sin(rad/2),fmt(angle)+'°');
 }else if(stage===3){
  s+=C(580,355,radius,'j-primary')+L(580,355,580+radius,355,'j-measure')+C(580,355,5);
  s+=H(580+radius,355,'radius')+T(580+radius/2,338,'R '+fmt(radius/n,1)+' мм')+T(580,326-radius,'Ø '+fmt(2*radius/n,1)+' мм');
 }else if(stage===4||stage===5){
  const x=435,y=242;
  if(stage===5)s+='<rect x="'+x+'" y="'+y+'" width="'+width+'" height="'+height+'" fill="#b8f98a" fill-opacity=".12"/>'+
   '<rect x="'+x+'" y="'+y+'" width="'+width+'" height="'+height+'" fill="url(#jCells)"/>';
  s+='<rect x="'+x+'" y="'+y+'" width="'+width+'" height="'+height+'" fill="none" stroke="#ecfdff" stroke-width="2.8"/>';
  s+=H(x+width,y+height,'corner')+L(x,y-18,x+width,y-18,'j-measure')+L(x-17,y,x-17,y+height,'j-measure');
  s+=T(x+width/2,y-30,fmt(width/n)+' мм')+T(x-45,y+height/2,fmt(height/n)+' мм');
  if(stage===5)s+=T(x+width/2,y+height/2,fmt(width*height/9,0)+' мм²')+
    T(x+width/2,y+height/2+30,fmt(width*height/900,1)+' см²','j-secondary');
  else s+=T(x+width/2,y+height/2,'P = '+fmt(2*(width+height)/n)+' мм');
 }else{
  const block=object==='block',accent='#bafa84';
  s+='<g class="j-object-hit" data-select="block" tabindex="0" role="button" aria-label="Дерев’яний брусок">'+
    '<rect x="310" y="221" width="420" height="240" rx="3" fill="#02172b" opacity=".28"/>'+
    '<rect x="300" y="211" width="420" height="240" rx="3" fill="url(#jWood)" stroke="'+(block?accent:'#acc4c4')+'" stroke-width="'+(block?3:1.5)+'"/>'+
    '<path d="M314 254Q490 248 702 267M315 341Q509 323 705 340M315 421Q510 403 704 413" fill="none" stroke="#875c36" opacity=".32" stroke-width="2"/>'+
    T(510,348,'БРУСОК','j-secondary')+'</g>';
  s+='<g class="j-object-hit" data-select="cylinder" tabindex="0" role="button" aria-label="Циліндр">'+
    '<circle cx="937" cy="346" r="96" fill="#041e30" opacity=".3"/>'+
    '<circle cx="927" cy="335" r="96" fill="url(#jCylinder)" stroke="'+(!block?accent:'#acc4c4')+'" stroke-width="'+(!block?3:1.5)+'"/>'+
    '<circle cx="927" cy="335" r="79" fill="none" stroke="#d6eae7" opacity=".35"/>'+
    T(927,340,'ЦИЛІНДР','j-secondary')+'</g>';
  const start=block?300:831,jaw=start+gap*n,railStart=block?260:791,railWidth=block?695:398;
  s+=L(start,430,start,541,'j-measure')+L(jaw,430,jaw,541,'j-measure');
  s+='<rect x="'+railStart+'" y="541" width="'+railWidth+'" height="14" rx="2" fill="url(#jMetal)" stroke="#668792"/>'+
    '<path d="M'+start+' 543v-101h18v82h20v20" stroke="#e6eeec" stroke-width="10" fill="none"/>'+
    '<path d="M'+jaw+' 543v-101h-18v82h-20v20" stroke="#e6eeec" stroke-width="10" fill="none"/>'+
    '<rect x="'+(jaw-17)+'" y="540" width="35" height="37" rx="3" fill="#b8cdd1" stroke="#426778" stroke-width="2"/>'+
    H(jaw,559,'jaw')+T((start+jaw)/2,615,fmt(gap)+' мм');
  s+=T(512,200,measured.has('block')?'✓ 140 мм':'140 мм · креслення','j-secondary')+
    T(927,219,measured.has('cylinder')?'✓ Ø 64 мм':'Ø 64 мм · креслення','j-secondary');
 }
 return s;
}
function render(){
 if(!open)return;
 sketch.innerHTML=scene();$('#jMetrics').innerHTML=metrics();
 units.hidden=stage!==1;
 if(stage===1)units.querySelectorAll('[data-unit]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.unit===unit)));
}
function refresh(){
 toggle.textContent=String(stage+1).padStart(2,'0')+' / '+lessons[stage][0]+' ▾';
 nav.replaceChildren();
 lessons.forEach((lesson,i)=>{
  const b=document.createElement('button');b.type='button';
  b.textContent=(state.done[i]?'✓ ':String(i+1).padStart(2,'0')+' ')+lesson[0];
  if(i===stage)b.setAttribute('aria-current','step');
  b.addEventListener('click',()=>selected(i));nav.append(b);
 });
 $('#jIndex').textContent='ЛАБ 01 / '+String(stage+1).padStart(2,'0')+'—07';
 $('#jTitle').textContent=lessons[stage][0];
 $('#jTask').textContent=mode==='demo'?'Спостерігай за зміною величини':mode==='quest'?lessons[stage][2]:lessons[stage][1];
 check.hidden=mode!=='quest';check.disabled=state.done[stage];check.textContent=state.done[stage]?'✓ Виконано':'✓ Перевірити';
 replay.textContent=mode==='demo'?'↻ Повторити':'↻ Скинути';
 next.textContent=stage===6?'На початок ↻':'Далі →';
 $('#jProgress').innerHTML=lessons.map((_,i)=>'<i class="'+(state.done[i]?'done':i===stage?'active':'')+'"></i>').join('');
 render();
}
function verify(){
 let correct=false;
 if(stage===0)correct=Math.abs(length-120)<=2;
 if(stage===1)correct=['mm','cm','m'].every(v=>used.has(v));
 if(stage===2)correct=Math.abs(angle-90)<=2;
 if(stage===3)correct=Math.abs(radius*2/n-64)<=2;
 if(stage===4||stage===5)correct=Math.abs(width/n-140)<=2&&Math.abs(height/n-80)<=2;
 if(stage===6){
  const target=object==='block'?140:64;
  if(Math.abs(gap-target)<=2){measured.add(object);say('✓ '+(object==='block'?'Брусок':'Циліндр')+' виміряно');correct=measured.size===2}
  else say('↔ Сумісти губки з деталлю');
 }
 if(correct){state.done[stage]=true;save();say('✓ Виконано. Наступна станція →');refresh()}
 else if(stage!==6)say(stage===1?'↔ Перемкни усі три одиниці':'↔ Підкоригуй розмір');
 render();
}
function location(e){
 const q=sketch.createSVGPoint();q.x=e.clientX;q.y=e.clientY;
 const m=sketch.getScreenCTM();return m?q.matrixTransform(m.inverse()):{x:0,y:0};
}
function manipulate(kind,p){
 if(kind==='length')length=round(clamp((p.x-320)/n,10,275));
 if(kind==='angle')angle=round(clamp(Math.atan2(Math.max(0,390-p.y),p.x-500)*180/Math.PI,0,180));
 if(kind==='radius')radius=clamp(round(Math.hypot(p.x-580,p.y-355)/n)*n,24,230);
 if(kind==='corner'){width=clamp(Math.round((p.x-435)/n)*n,60,600);height=clamp(Math.round((p.y-242)/n)*n,60,315)}
 if(kind==='jaw')gap=round(clamp((p.x-(object==='block'?300:831))/n,0,object==='block'?195:110));
 render();
}
sketch.addEventListener('pointerdown',e=>{
 if(mode==='demo'||e.button!==0)return;
 const hit=e.target.closest('[data-grab],[data-select]');
 if(!hit)return;
 e.preventDefault();e.stopPropagation();
 if(hit.dataset.select){object=hit.dataset.select;gap=70;render();return}
 drag={id:e.pointerId,kind:hit.dataset.grab};
 try{sketch.setPointerCapture(e.pointerId)}catch{}
 manipulate(drag.kind,location(e));
});
sketch.addEventListener('pointermove',e=>{
 if(!drag||drag.id!==e.pointerId)return;
 e.preventDefault();manipulate(drag.kind,location(e));
});
function release(e){
 if(!drag||drag.id!==e.pointerId)return;
 drag=null;try{sketch.releasePointerCapture(e.pointerId)}catch{}
}
sketch.addEventListener('pointerup',release);
sketch.addEventListener('pointercancel',release);
sketch.addEventListener('keydown',e=>{
 if(!['Enter',' '].includes(e.key)||!e.target.dataset.select)return;
 e.preventDefault();object=e.target.dataset.select;gap=70;render();
});
units.addEventListener('click',e=>{
 const b=e.target.closest('[data-unit]');if(!b||mode==='demo')return;
 unit=b.dataset.unit;used.add(unit);render();
 if(mode==='quest'&&used.size===3)say('✓ Три одиниці використано');
});
toggle.addEventListener('click',()=>{drawer=!drawer;nav.hidden=!drawer;toggle.setAttribute('aria-expanded',String(drawer))});
replay.addEventListener('click',()=>{begin=performance.now();reset();refresh()});
next.addEventListener('click',()=>selected((stage+1)%7));
check.addEventListener('click',verify);
function selected(i){
 if(i<0||i>=7)return;
 stage=i;begin=performance.now();drag=null;drawer=false;nav.hidden=true;
 toggle.setAttribute('aria-expanded','false');reset();save();refresh();
}
function activate(){
 if(open)return;
 open=true;root.hidden=false;document.body.classList.add('lab01-route');
 window.GNSSDrafting3D?.cancel?.();refresh();
}
function deactivate(){
 open=false;root.hidden=true;document.body.classList.remove('lab01-route');drag=null;
}
const restore=document.createElement('button');restore.id='jRestoreRoute';restore.type='button';restore.hidden=true;
restore.textContent='◉ Практика 01';restore.setAttribute('aria-label','Відкрити практичний маршрут');
restore.style.cssText='position:fixed;z-index:85;bottom:28px;left:calc(var(--lab-rail,52px) + 15px);border:0;border-bottom:2px solid #b9f888;background:#082638e8;color:#e8fbf0;padding:10px 13px;cursor:pointer;font:650 12px sans-serif';
document.body.append(restore);
free.addEventListener('click',()=>{deactivate();restore.hidden=false});
restore.addEventListener('click',()=>{restore.hidden=true;activate()});
new MutationObserver(()=>{
 const m=document.body.dataset.expMode||'demo';
 if(m!==mode){mode=m;begin=performance.now();reset();refresh()}
 root.style.pointerEvents=document.body.classList.contains('engineering-live')?'':'none';
}).observe(document.body,{attributes:true,attributeFilter:['class','data-exp-mode']});
function tick(now){
 requestAnimationFrame(tick);
 if(!open||mode!=='demo'||!document.body.classList.contains('engineering-live')||now-lastFrame<60)return;
 lastFrame=now;
 const t=((now-begin)/1000)%5.4,p=clamp(t/3.7,0,1),e=p*p*(3-2*p);
 if(stage===0)length=round(30+150*e);
 if(stage===1)unit=['mm','cm','m'][Math.floor(t/1.8)%3];
 if(stage===2)angle=round(20+130*e);
 if(stage===3)radius=round(25+129*e);
 if(stage===4||stage===5){width=Math.round(210+210*e);height=Math.round(120+120*e)}
 if(stage===6){object=Math.floor(t/2.7)%2?'cylinder':'block';gap=round(30+110*e)}
 render();
}
window.GNSSLab01Journey={get active(){return open},get stage(){return stage},
 get progress(){return state.done.filter(Boolean).length},open:()=>{restore.hidden=true;activate()},close:deactivate};
reset();activate();requestAnimationFrame(tick);
})();