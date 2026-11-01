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
 ['Вимірювання','Обери деталь, зведи губки й прочитай ноніус','Виміряй брусок і циліндр та запиши значення зі шкали']
];
let state={stage:0,done:Array(7).fill(false)};
try{const a=JSON.parse(localStorage.getItem('gnss-lab-journey-01')||'{}');
 if(Number.isInteger(a.stage))state.stage=clamp(a.stage,0,6);
 if(Array.isArray(a.done)&&a.done.length===7)state.done=a.done.map(Boolean);
}catch{}
try{
 if(!localStorage.getItem('gnss-caliper-mechanical-v2')){
  state.done[6]=false;
  localStorage.setItem('gnss-caliper-mechanical-v2','1');
 }
}catch{}
let stage=state.stage,mode=document.body.dataset.expMode||'demo',open=false,drag=null,drawer=false,begin=performance.now(),lastFrame=0;
let length=75,angle=35,radius=63,width=315,height=165,unit='mm',used=new Set(),object='block',gap=156,measured=new Set(),timer,lensZoom=1,advanceTimer;
try{measured=new Set(JSON.parse(localStorage.getItem('gnss-caliper-parts-v2')||'[]').filter(x=>['block','cylinder'].includes(x)))}catch{}
function contact(){return Math.abs(gap-caliperTarget())<1e-7}
function choosePart(part){root.classList.remove('j-success');clearTimeout(advanceTimer);drag=null;object=part;gap=caliperTarget()+16;$('#jCaliperValue').value='';render()}
function persistParts(){try{localStorage.setItem('gnss-caliper-parts-v2',JSON.stringify([...measured]))}catch{}}
const root=document.createElement('section');root.id='lab01Journey';
root.setAttribute('aria-label','Практична лабораторія: величини та вимірювання');
root.innerHTML='<div class="journey-nav"><button type="button" class="journey-nav-toggle" id="jNavToggle" aria-expanded="false">01 / Довжина ▾</button><nav class="journey-step-list" id="jStepList" aria-label="Станції" hidden></nav></div>'+
'<div class="j-hud"><div class="j-id" id="jIndex"></div><div class="j-hud-title" id="jTitle"></div><div class="j-hud-task" id="jTask"></div></div>'+
'<svg xmlns="http://www.w3.org/2000/svg" class="journey-sketch" id="jSketch" viewBox="0 0 1200 660" preserveAspectRatio="xMidYMid meet" aria-label="Інтерактивна модель"></svg>'+
'<div class="j-units" id="jUnits" hidden><button data-unit="mm">мм</button><button data-unit="cm">см</button><button data-unit="m">м</button></div>'+
'<div class="j-caliper-entry" id="jCaliperEntry" hidden><label for="jCaliperValue">Зчитане значення з ноніуса</label><div class="j-caliper-input"><input id="jCaliperValue" inputmode="decimal" autocomplete="off" placeholder="Ваш відлік" aria-label="Виміряне значення у міліметрах"/><span>мм</span></div><small>Зведи губки до контакту, потім введи число зі шкали</small></div>'+ 
'<button type="button" id="jLensZoom" class="j-lens-zoom" hidden>Лупа ×1</button>'+
'<button type="button" id="jCaliperAB" class="j-caliper-ab" hidden>↗ Виміряти A—B на кресленні</button>'+
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
 clearTimeout(advanceTimer);drag=null;used=new Set();object='block';gap=156;$('#jCaliperValue').value='';
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
 return '';
}
const L=(a,b,c,d,cls='j-primary')=>'<line x1="'+a+'" y1="'+b+'" x2="'+c+'" y2="'+d+'" class="'+cls+'"/>';
const C=(x,y,r,cls='j-point')=>'<circle cx="'+x+'" cy="'+y+'" r="'+r+'" class="'+cls+'"/>';
const T=(x,y,v,cls='j-dimension')=>'<text x="'+x+'" y="'+y+'" text-anchor="middle" class="'+cls+'">'+v+'</text>';
const H=(x,y,id)=>'<circle cx="'+round(x)+'" cy="'+round(y)+'" r="10" class="j-handle" tabindex="0" role="slider" aria-label="Змінити розмір" data-grab="'+id+'"/>';
const defs='<defs><linearGradient id="jWood" x1="0" y1="0" x2="1" y2="0"><stop stop-color="#d3b78d"/><stop offset=".24" stop-color="#f1d7ab"/><stop offset=".72" stop-color="#b38f68"/><stop offset="1" stop-color="#e2c69e"/></linearGradient>'+
'<linearGradient id="jCylinder" x2="1" y2=".3"><stop stop-color="#899da7"/><stop offset=".5" stop-color="#bac6cb"/><stop offset="1" stop-color="#91a2ab"/></linearGradient>'+
'<linearGradient id="jMetal" x1="0" x2="0" y1="0" y2="1"><stop stop-color="#f6f8f6"/><stop offset=".5" stop-color="#b4c8cf"/><stop offset="1" stop-color="#5f7988"/></linearGradient>'+
'<pattern id="jCells" width="30" height="30" patternUnits="userSpaceOnUse"><path d="M30 0H0V30" fill="none" stroke="#b4fb8c" stroke-width=".9" opacity=".6"/></pattern></defs>';
// Both parts are dimensioned in physical 3 SVG units per millimetre.
function caliperTarget(){return object==='block'?140:64}
function caliperFrame(){
 const block=object==='block',zeroX=block?375:495;
 return {zeroX,y:400,pxPerMm:n,target:caliperTarget(),max:160,object};
}
function caliperFallbackHardware(f){
 const {zeroX:x,y}=f,m=x+gap*n;
 let ticks='',v='';
 for(let i=0;i<=170;i++)ticks+=L(x+i*n,y-10,x+i*n,y+(i%10===0?4:i%5===0?0:-4),'j-cal-tick')+(i%10===0?T(x+i*n,y+18,i,'j-cal-number'):'');
 for(let i=0;i<=10;i++)v+=L(m+i*2.7,y+26,m+i*2.7,y+(i%5===0?41:36),'j-cal-tick')+(i%5===0?T(m+i*2.7,y+52,i,'j-cal-number'):'');
 return `<g id="jCaliperHardware" aria-hidden="true"><rect x="${x-22}" y="${y-22}" width="555" height="45" rx="2" fill="url(#jMetal)"/>
 <path d="M${x-17} ${y-18}V${y-158}L${x} ${y-153}V${y-18}Z" fill="url(#jMetal)"/>
 ${ticks}<rect x="${m-8}" y="${y+23}" width="56" height="36" rx="3" fill="url(#jMetal)"/>
 <path d="M${m} ${y+23}V${y-153}L${m+17} ${y-158}V${y+23}Z" fill="url(#jMetal)"/>${v}
 <circle cx="${m+20}" cy="${y+69}" r="13" fill="url(#jMetal)" stroke="#4f6976" stroke-width="3"/>
 <path d="M-10 0H10M0-10V10" transform="translate(${m+20} ${y+69}) rotate(${gap*18})" stroke="#536a76"/></g>`;
}
function vernierMagnifier(){
 const scale=30*lensZoom,base=Math.floor(gap)-2,left=190,zero=left+(gap-base)*scale;
 let main='',secondary='';
 for(let mm=Math.max(0,base);mm<=base+19;mm++){
  const x=left+(mm-base)*scale;
  main+=L(x,529,x,mm%5===0?552:545,'j-cal-lens-tick')+T(x,520,mm,'j-cal-number');
 }
 for(let i=0;i<=10;i++){
  const x=zero+i*.9*scale;
  secondary+=L(x,556,x,i%5===0?580:573,'j-cal-vernier-tick')+T(x,597,i,'j-cal-vernier-num');
 }
 return `<g id="jCaliperLens" aria-label="Основна шкала та ноніус 0,1 мм"><defs><clipPath id="jLensClip"><rect x="175" y="498" width="590" height="108"/></clipPath></defs><rect x="165" y="493" width="610" height="118" rx="6" fill="#08283d" stroke="#8caeba"/><g clip-path="url(#jLensClip)">${main}<path d="M175 554H765" stroke="#698999"/>${secondary}</g></g>`;
}
function caliperScene(){
 const f=caliperFrame(),block=object==='block',accent='#bafa84';
 let out='';
 if(block){
  out+='<rect x="385" y="250" width="420" height="110" fill="#051b2e" opacity=".25" rx="4"/>'+
   '<rect x="375" y="240" width="420" height="110" rx="3" fill="url(#jMetal)" stroke="'+accent+'" stroke-width="2.5"/>'+
   '<path d="M380 355V245H790" fill="none" stroke="#f0f4f3" stroke-width="2" opacity=".65"/>';
 }else{
  out+='<circle cx="604" cy="290" r="96" fill="#051b2e" opacity=".25"/>'+
   '<circle cx="591" cy="280" r="96" fill="url(#jCylinder)" stroke="'+accent+'" stroke-width="2.5"/>'+
   '<circle cx="591" cy="280" r="91" fill="none" stroke="#d3ebe7" stroke-opacity=".33" stroke-width="1.5"/>';
 }
 // Two unobtrusive selection silhouettes. The active object remains at the
 // caliper's fixed jaw, never requiring the learner to move the whole tool.
 out+='<g class="j-object-hit" data-select="block" tabindex="0" role="button" aria-pressed="'+block+'" aria-label="Обрати брусок">'+
  '<rect x="972" y="176" width="151" height="57" rx="3" fill="url(#jMetal)" stroke="'+(block?accent:'#8faeba')+'" stroke-width="'+(block?2.5:1.2)+'"/>'+
  T(1047,253,'БРУСОК','j-secondary')+'</g>'+
  '<g class="j-object-hit" data-select="cylinder" tabindex="0" role="button" aria-pressed="'+(!block)+'" aria-label="Обрати циліндр">'+
  '<circle cx="1048" cy="328" r="46" fill="url(#jCylinder)" stroke="'+(!block?accent:'#8faeba')+'" stroke-width="'+(!block?2.5:1.2)+'"/>'+
  T(1047,395,'ЦИЛІНДР','j-secondary')+'</g>';
 out+=caliperFallbackHardware(f);
 const mx=f.zeroX+gap*n;
 out+=`<rect x="${mx-10}" y="${f.y+22}" width="62" height="65" rx="9" fill="transparent" data-grab="jaw" class="j-caliper-drag" tabindex="0" role="slider" aria-label="Каретка. Стрілки: 0,1 мм; Page Up і Down: 1 мм" aria-valuemin="0" aria-valuemax="160" aria-valuenow="${gap}" aria-valuetext="${contact()?'Контакт встановлено':'Губки розкриті'}"/>`;
 if(contact()){
  for(const x of [f.zeroX,mx])out+=`<path class="j-contact-face" d="M${x} 276V338" stroke="#bafd87" stroke-width="3"/>`;
  out+=vernierMagnifier();
 }
 return out;
}
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
    T(x+width/2,y+height/2+30,fmt(width*height/900,1)+' клітинок по 1 см²','j-secondary');
  else s+=T(x+width/2,y+height/2,'P = '+fmt(2*(width+height)/n)+' мм');
 }else{
  s+=caliperScene();
 }
 return s;
}
function render(){
 if(!open)return;
 const focused=stage===6&&document.activeElement?.dataset?.grab==='jaw';
 const selectedPart=document.activeElement?.dataset?.select;
 sketch.innerHTML=scene();
 if(selectedPart)sketch.querySelector('[data-select="'+selectedPart+'"]')?.focus({preventScroll:true});
 if(focused)sketch.querySelector('[data-grab="jaw"]')?.focus?.({preventScroll:true});
 $('#jMetrics').innerHTML=metrics();
 units.hidden=stage!==1;
 root.classList.toggle('j-measuring',stage===6);
 $('#jCaliperEntry').hidden=stage!==6||mode==='demo'||!contact();
 $('#jLensZoom').hidden=stage!==6||!contact();
 $('#jCaliperAB').hidden=stage!==6||mode!=='explore';
 if(stage===6)$('#jTask').textContent=contact()?(mode==='demo'?'Цілі міліметри — ліворуч від нуля ноніуса; збіг поділок додає десяті.':'Контакт встановлено · прочитай шкалу та введи відлік'):'Потягни каретку або ролик ліворуч до контакту';
 if(stage===6)document.dispatchEvent(new CustomEvent('gnss:caliper-pose',{detail:{active:true,...caliperFrame(),gap,contact:contact()}}));
 else document.dispatchEvent(new CustomEvent('gnss:caliper-pose',{detail:{active:false}}));
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
 check.hidden=mode!=='quest'&&!(stage===6&&mode==='explore');check.disabled=stage===6?false:state.done[stage];check.textContent=state.done[stage]?'✓ Виконано':'✓ Перевірити';
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
  const target=caliperTarget();
  const entered=Number($('#jCaliperValue').value.trim().replace(',','.'));
  if(!contact())say('↔ Спочатку зведи губки до контакту');
  else if(!$('#jCaliperValue').value.trim()||!Number.isFinite(entered)||Math.abs(entered-gap)>.100000001)
   say('↔ Уважно прочитай основну шкалу та ноніус');
  else{
   if(mode==='quest'){measured.add(object);persistParts()}
   root.classList.remove('j-success');void root.offsetWidth;root.classList.add('j-success');
   say('✓ '+(object==='block'?'Брусок':'Циліндр')+' виміряно');
   correct=mode==='quest'&&measured.size===2;
   if(!correct&&mode==='quest'){clearTimeout(advanceTimer);advanceTimer=setTimeout(()=>{if(open&&stage===6&&mode==='quest')choosePart(object==='block'?'cylinder':'block')},850)}
  }
 }
 if(correct){state.done[stage]=true;save();say(stage===6?'✓ Обидві деталі виміряно':'✓ Виконано. Наступна станція →');refresh()}
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
 if(kind==='jaw')gap=clamp((p.x-(drag?.offset||0)-caliperFrame().zeroX)/n,caliperTarget(),caliperFrame().max);
 render();
}
sketch.addEventListener('pointerdown',e=>{
 if(mode==='demo'||e.button!==0)return;
 const hit=e.target.closest('[data-grab],[data-select]');
 if(!hit)return;
 e.preventDefault();e.stopPropagation();
 if(hit.dataset.select){choosePart(hit.dataset.select);return}
 drag={id:e.pointerId,kind:hit.dataset.grab,offset:hit.dataset.grab==='jaw'?location(e).x-caliperFrame().zeroX-gap*n:0};
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
 if(!e.target?.dataset?.grab||e.target.dataset.grab!=='jaw'||stage!==6||mode==='demo')return;
 const d=e.key==='ArrowLeft'?-0.1:e.key==='ArrowRight'?0.1:e.key==='PageDown'?-1:e.key==='PageUp'?1:0;
 if(!d)return;
 e.preventDefault();
 gap=round(clamp(gap+d,caliperTarget(),caliperFrame().max));
 render();
});
$('#jCaliperValue').addEventListener('keydown',e=>{if(e.key==='Enter'&&mode!=='demo')verify()});
document.addEventListener('gnss:request-caliper-pose',()=>{
 document.dispatchEvent(new CustomEvent('gnss:caliper-pose',{
  detail:open&&stage===6?{active:true,...caliperFrame(),gap,contact:contact()}:{active:false}
 }));
});
sketch.addEventListener('keydown',e=>{
 if(!['Enter',' '].includes(e.key)||!e.target.dataset.select)return;
 if(mode==='demo')return;e.preventDefault();choosePart(e.target.dataset.select);
});
units.addEventListener('click',e=>{
 const b=e.target.closest('[data-unit]');if(!b||mode==='demo')return;
 unit=b.dataset.unit;used.add(unit);render();
 if(mode==='quest'&&used.size===3)say('✓ Три одиниці використано');
});
toggle.addEventListener('click',()=>{drawer=!drawer;nav.hidden=!drawer;toggle.setAttribute('aria-expanded',String(drawer))});
replay.addEventListener('click',()=>{
 begin=performance.now();reset();
 if(stage===6){state.done[6]=false;measured.clear();persistParts();save()}
 refresh();
});
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
 clearTimeout(advanceTimer);open=false;root.hidden=true;document.body.classList.remove('lab01-route');drag=null;
 document.dispatchEvent(new CustomEvent('gnss:caliper-pose',{detail:{active:false}}));
}
const restore=document.createElement('button');restore.id='jRestoreRoute';restore.type='button';restore.hidden=true;
restore.textContent='◉ Практика 01';restore.setAttribute('aria-label','Відкрити практичний маршрут');
restore.style.cssText='position:fixed;z-index:85;bottom:28px;left:calc(var(--lab-rail,52px) + 15px);border:0;border-bottom:2px solid #b9f888;background:#082638e8;color:#e8fbf0;padding:10px 13px;cursor:pointer;font:650 12px sans-serif';
document.body.append(restore);
free.addEventListener('click',()=>{deactivate();restore.hidden=false});
$('#jCaliperAB').addEventListener('click',()=>{
 deactivate();restore.hidden=false;
 document.querySelector('#engTools button[data-tool="caliper"]')?.click();
});
restore.addEventListener('click',()=>{restore.hidden=true;activate()});
// Any selection of the mechanical caliper in the normal tool shelf must
// dismiss the educational overlay. It is a tool, never a route transition.
document.addEventListener('gnss:draft-state',event=>{
 const data=event.detail||{};
 if(data.mode==='explore'&&data.tool==='caliper'&&open){
  deactivate();restore.hidden=false;
 }
});
new MutationObserver(()=>{
 const m=document.body.dataset.expMode||'demo';
 if(m!==mode){
  mode=m;begin=performance.now();reset();
  // Switching back to the sandbox returns to the actual blueprint with
  // all saved shapes, rather than a remembered practice station.
  if(m==='explore'&&open){deactivate();restore.hidden=false}
  refresh();
 }
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
 if(stage===6){
  const elapsed=(now-begin)/1000,phase=elapsed%8;
  object=Math.floor(elapsed/8)%2?'cylinder':'block';
  const q=clamp(phase/4,0,1),smooth=q*q*(3-2*q);
  gap=caliperTarget()+16*(1-smooth);
 }
 render();
}
window.GNSSLab01Journey={get active(){return open},get stage(){return stage},
 get progress(){return state.done.filter(Boolean).length},
 open:()=>{restore.hidden=true;activate()},
 openStage:i=>{if(!Number.isInteger(i)||i<0||i>=lessons.length)return false;
  restore.hidden=true;activate();selected(i);return true},
 close:deactivate};
$('#jLensZoom').addEventListener('click',()=>{lensZoom=lensZoom===1?1.5:1;$('#jLensZoom').textContent='Лупа ×'+lensZoom;render()});
 root.addEventListener('keydown',e=>{if(e.key==='Escape'){drag=null;if(stage===6){deactivate();restore.hidden=false}}});
 reset();
// The last completed practice station is not the starting workspace.
// Sandbox opens the free drafting paper, while the seven learning stations
// remain available through the explicit "Практика 01" button.
if(mode==='explore'){
 restore.hidden=false;
 root.hidden=true;
}else activate();
requestAnimationFrame(tick);
})();
