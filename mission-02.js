/* GNSS LAB / Lesson 02 — time, motion and repetition.
   Physical interaction first; no frequency units or lecture overlays.
   Inert unless the second laboratory is selected. */
(function(){
'use strict';
const board=document.getElementById('engBoard');
if(!board)return;
const KEY='gnss-lab-mission-02-v1',TAU=Math.PI*2,G=9.81;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const round=(v,n=1)=>Number(v).toLocaleString('uk-UA',{maximumFractionDigits:n,minimumFractionDigits:n});
const parse=v=>Number(String(v).replace(',','.').trim());
const titles=['Відчуй секунду','Виміряй час руху','Хто швидший?','Відстань, швидкість і час','Спрогнозуй результат','Рух, який повторюється','Час одного коливання'];
const hints=['Запусти секундомір. Зупини його після однієї секунди.',
 'Запусти візок і виміряй час до фінішу.',
 'Порівняй час двох візків на однаковій відстані.',
 'Зміни шлях і швидкість. Спостерігай за часом.',
 'Передбач час прибуття візка й перевір дослідом.',
 'Відтягни кульку й відпусти. Дочекайся п’яти коливань.',
 'Знайди час одного повного коливання за п’ятьма циклами.'];
const qTitles=['Перевір секундомір','Визнач час руху','Визнач швидкість','Порівняй два візки','Виміряй період маятника'];
const weights=[10,25,25,20,20];
const variants=[
 {distance:3,speed:1,other:1.5,length:.8},
 {distance:4,speed:1.6,other:1,length:1.0},
 {distance:5,speed:2,other:1.25,length:1.2},
 {distance:3.6,speed:1.2,other:1.8,length:.7},
 {distance:4.5,speed:1.5,other:1.0,length:.9}
];
function fresh(seed=0){return {version:1,stage:0,questStage:0,seed,marks:[null,null,null,null,null],
 mistakes:[0,0,0,0,0],complete:false,passed:false,lessonDone:[],questDone:[],record:{}}}
let saved;
try{const p=JSON.parse(localStorage.getItem(KEY)||'null');saved=p&&p.version===1&&Array.isArray(p.marks)&&p.marks.length===5?p:fresh()}catch{saved=fresh()}
function store(){try{localStorage.setItem(KEY,JSON.stringify(saved))}catch{}}
const root=document.createElement('section');root.id='gnssMission02';root.hidden=true;
root.setAttribute('aria-label','Урок 02 — Час, рух і повторення');
root.innerHTML='<header class="m02-head"><small id="m02Kicker"></small><h2 id="m02Title"></h2><p id="m02Prompt"></p></header>'+
 '<div class="m02-scene" id="m02Scene"><svg id="m02Svg" viewBox="0 0 1200 660" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Секундомір, рейка з візком і маятник"></svg></div>'+
 '<div class="m02-panel" id="m02Panel"></div><div class="m02-feedback" id="m02Feedback" role="status" aria-live="polite" hidden></div>'+
 '<footer class="m02-footer"><div><button data-action="reset" title="Повторити поточний дослід">↻</button><button data-action="help" title="Коротка підказка">?</button></div>'+
 '<div class="m02-advance"><span id="m02Progress"></span><button class="m02-next" data-action="next" id="m02Next">Далі →</button></div></footer>';
board.append(root);
const get=id=>root.querySelector('#'+id),svg=get('m02Svg'),panel=get('m02Panel'),feedback=get('m02Feedback');
let shown=false,mode='demo',raf=0,last=0,nowTime=0,slow=false,activeLesson=-1,drag=null,feedbackTimer=0;
const state={stopwatch:{elapsed:0,running:false,ever:false,stopped:false},cart:{elapsed:0,running:false,done:false},
 pendulum:{length:.9,theta:.5,amplitude:.5,elapsed:0,running:false,cycles:0},
 distance:3,speed:1.5,other:1,trial:0,finishTimes:[],predicted:null,
 demoComplete:false,questReady:false,readings:{},answers:{}};
const job=()=>variants[saved.seed%variants.length];
const time=()=>state.stopwatch.elapsed;
const duration=()=>state.distance/state.speed;
const period=()=>TAU*Math.sqrt(state.pendulum.length/G);
const station=()=>mode==='quest'?saved.questStage:saved.stage;
function notify(msg,good=false){
 feedback.textContent=msg;feedback.hidden=false;feedback.classList.toggle('good',good);
 clearTimeout(feedbackTimer);feedbackTimer=setTimeout(()=>{feedback.hidden=true},3300);
}
function score(){
 return saved.marks.reduce((a,b)=>a+(Number.isFinite(b)?b:0),0);
}
function pass(){
 return score()>=80 && saved.marks[0]>=6 && saved.marks[1]>=15;
}
function penalize(msg){
 const i=saved.questStage;saved.mistakes[i]=(saved.mistakes[i]||0)+1;store();
 notify(msg);
}
function doneQuest(description){
 const i=saved.questStage;if(i>=5||saved.marks[i]!==null)return;
 saved.marks[i]=Math.max(0,weights[i]-saved.mistakes[i]*4);
 saved.record['q'+i]=description;saved.questStage+=1;
 if(saved.questStage>=5){
  saved.complete=true;saved.passed=pass();
  if(saved.passed)document.dispatchEvent(new CustomEvent('gnss:mission-two-complete',
   {detail:{mission:2,completed:true,score:score()}}));
 }
 store();resetPhysics();render();notify(saved.complete?(saved.passed?'Залік складено!':'Переглянь результати та повтори досліди.'):'Станцію завершено.',true);
}
function demoDone(){
 const i=saved.stage;if(!saved.lessonDone.includes(i))saved.lessonDone.push(i);
 state.demoComplete=true;store();render();
}
function resetPhysics(){
 const j=job();
 state.stopwatch={elapsed:0,running:false,ever:false,stopped:false};
 state.cart={elapsed:0,running:false,done:false};
 state.pendulum={length:mode==='quest'?j.length:.9,theta:.55,amplitude:.55,elapsed:0,running:false,cycles:0};
 state.distance=mode==='quest'?j.distance:3;
 state.speed=mode==='quest'?j.speed:1.5;state.other=mode==='quest'?j.other:1;
 state.trial=0;state.finishTimes=[];state.predicted=null;state.readings={};state.answers={};
 state.demoComplete=mode==='demo'&&saved.lessonDone.includes(saved.stage);
 state.questReady=false;drag=null;
}
function setMode(next){
 if(!['demo','explore','quest'].includes(next))return;
 mode=next;resetPhysics();render();
}
function show(){
 if(shown)return;shown=true;root.hidden=false;document.body.classList.add('gnss-lesson02-active');
 mode=document.body.dataset.expMode||'demo';resetPhysics();render();last=0;startFrame();
}
function hide(){
 shown=false;root.hidden=true;document.body.classList.remove('gnss-lesson02-active');
 if(raf){cancelAnimationFrame(raf);raf=0}drag=null;
}
function isLessonTwo(){try{return typeof active==='number'&&active===1}catch{return location.hash==='#lab-02'}}
function sync(){
 const wanted=isLessonTwo()&&document.body.classList.contains('engineering-live');
 if(!wanted){if(shown)hide();return}
 if(!shown){show();return}
 const next=document.body.dataset.expMode||'demo';
 if(next!==mode)setMode(next);
}
function startFrame(){if(raf||!shown||document.hidden)return;raf=requestAnimationFrame(frame)}
function frame(ts){
 raf=0;if(!shown||document.hidden)return;
 const dt=last?clamp((ts-last)/1000,0,.06):0;last=ts;
 const scaled=dt*(slow?.22:1);
 if(state.stopwatch.running)state.stopwatch.elapsed+=scaled;
 if(state.cart.running){
  state.cart.elapsed+=scaled;
  if(state.cart.elapsed>=duration()){
   state.cart.elapsed=duration();state.cart.running=false;state.cart.done=true;
   if(state.stopwatch.running){state.stopwatch.elapsed=state.cart.elapsed;state.stopwatch.running=false;state.stopwatch.stopped=true}
   state.finishTimes.push(state.cart.elapsed);
   onFinish();
  }
 }
 if(state.pendulum.running){
  state.pendulum.elapsed+=scaled;
  const p=state.pendulum,elapsed=p.elapsed;
  p.theta=p.amplitude*Math.cos(TAU*elapsed/period())*Math.exp(-.009*elapsed);
  p.cycles=Math.floor(elapsed/period()+.00001);
  if(p.cycles>=5){
   p.running=false;p.cycles=5;p.elapsed=5*period();
   state.stopwatch.running=false;state.stopwatch.stopped=true;
   state.stopwatch.elapsed=5*period();
   if(mode==='demo'&&saved.stage===5&&!state.demoComplete)demoDone();
   if(mode==='quest'&&saved.questStage===4)state.questReady=true;
   render();
  }
 }
 paint();startFrame();
}
function onFinish(){
 const s=station();
 if(mode==='demo'){
  if(s===1||s===3||s===4)demoDone();
  if(s===2&&state.finishTimes.length===2)render();
 }else if(mode==='quest'){
  if(s===1||s===2)state.questReady=true;
  if(s===3){
   if(state.finishTimes.length===1){state.speed=state.other;
    state.cart={elapsed:0,running:false,done:false};
   }else state.questReady=true;
  }
 }
 render();
}
function startCart(){
 if(state.cart.running)return;
 state.cart={elapsed:0,running:true,done:false};
 state.stopwatch={elapsed:0,running:true,ever:true,stopped:false};
 render();
}
function startStopwatch(){
 const sw=state.stopwatch;
 if(sw.running){sw.running=false;sw.stopped=true;
  if(mode==='demo'&&saved.stage===0&&sw.elapsed>=.6)demoDone();
  if(mode==='quest'&&saved.questStage===0)state.questReady=true;
 }else{sw.elapsed=0;sw.running=true;sw.ever=true;sw.stopped=false}
 render();
}
function launchPendulum(){
 const p=state.pendulum;p.running=true;p.elapsed=0;p.cycles=0;
 p.amplitude=clamp(Math.abs(p.theta),.15,.9)*Math.sign(p.theta||1);
 state.stopwatch={elapsed:0,running:true,ever:true,stopped:false};
 if(mode==='quest'&&saved.questStage===4)state.questReady=true;
 render();
}
function resetTrial(){
 state.stopwatch={elapsed:0,running:false,ever:false,stopped:false};
 state.cart={elapsed:0,running:false,done:false};
 state.pendulum.elapsed=0;state.pendulum.cycles=0;state.pendulum.running=false;state.pendulum.theta=.55;
 state.finishTimes=[];state.trial=0;state.questReady=false;state.demoComplete=false;render();
}
const stopwatchSvg=()=>{
 const v=time(),hand=(v%60)/60*TAU,xx=203+Math.sin(hand)*59,yy=325-Math.cos(hand)*59;
 let tick='';for(let i=0;i<60;i++){let a=i/60*TAU,s=i%5===0?7:3;
 tick+='<line x1="'+(203+Math.sin(a)*(73-s))+'" y1="'+(325-Math.cos(a)*(73-s))+'" x2="'+(203+Math.sin(a)*74)+'" y2="'+(325-Math.cos(a)*74)+'" stroke="#436375" stroke-width="'+(i%5===0?2:1)+'"/>'}
 return '<ellipse cx="206" cy="416" rx="83" ry="12" fill="#001c30" opacity=".35"/>'+
 '<circle cx="203" cy="325" r="84" fill="#c7d5d5" stroke="#436d79" stroke-width="5"/>'+
 '<circle cx="203" cy="325" r="75" fill="#f4f8f3" stroke="#a7c3c3" stroke-width="2"/>'+tick+
 '<path d="M195 237h16v-12h-16z" fill="#a5b9bd" stroke="#607d8b"/>'+
 '<line x1="203" y1="325" x2="'+xx+'" y2="'+yy+'" stroke="#bb455a" stroke-width="3.7" stroke-linecap="round"/>'+
 '<circle cx="203" cy="325" r="6" fill="#385767"/>'+
 '<text x="203" y="452" fill="#d6f0eb" font-size="16" text-anchor="middle">СЕКУНДОМІР</text>'+
 '<text x="203" y="479" fill="#bcf39c" font-weight="800" font-size="27" text-anchor="middle">'+round(v,1)+' с</text>';
};
const cartSvg=()=>{
 const f=clamp(state.cart.elapsed/Math.max(duration(),.001),0,1),x=385+f*430;
 const cart='<g transform="translate('+x+',0)"><rect x="-42" y="331" width="84" height="39" rx="6" fill="#e5bd81" stroke="#f6ddb2" stroke-width="3"/>'+
 '<path d="M-31 338h62" stroke="#fff5d5" stroke-width="3" opacity=".6"/>'+
 '<circle cx="-24" cy="375" r="10" fill="#17364a" stroke="#aec7cc" stroke-width="3"/>'+
 '<circle cx="25" cy="375" r="10" fill="#17364a" stroke="#aec7cc" stroke-width="3"/></g>';
 let ticks='';for(let i=0;i<=10;i++)ticks+='<line x1="'+(385+i*43)+'" x2="'+(385+i*43)+'" y1="388" y2="'+(i%5===0?411:400)+'" stroke="#d0eaeb" stroke-width="1.5"/>';
 return '<rect x="363" y="374" width="475" height="12" rx="3" fill="#cbdde0" stroke="#82a5b0"/>'+ticks+
 '<line x1="385" y1="274" x2="385" y2="387" stroke="#b7ee91" stroke-width="2" stroke-dasharray="5 5"/>'+
 '<line x1="815" y1="274" x2="815" y2="387" stroke="#b7ee91" stroke-width="2" stroke-dasharray="5 5"/>'+
 '<text x="385" y="260" font-size="15" text-anchor="middle" fill="#d8f4e8">СТАРТ</text>'+
 '<text x="815" y="260" font-size="15" text-anchor="middle" fill="#d8f4e8">ФІНІШ</text>'+
 cart+'<text x="603" y="458" fill="#d8edf0" font-size="18" text-anchor="middle">Шлях '+round(state.distance,1)+' м</text>'+
 '<text x="602" y="486" fill="#b2f38f" font-size="15" text-anchor="middle">Час '+round(state.cart.elapsed,1)+' с</text>';
};
const pendulumSvg=()=>{
 const p=state.pendulum,L=clamp(p.length,.45,1.35),r=L*148,tx=730+r*Math.sin(p.theta),ty=240+r*Math.cos(p.theta);
 return '<g><rect x="688" y="207" width="85" height="10" rx="2" fill="#9db5c2"/>'+
 '<line x1="730" y1="218" x2="730" y2="452" stroke="#b6cbd4" stroke-dasharray="5 8" opacity=".3"/>'+
 '<path d="M730 218L'+tx+' '+ty+'" stroke="#e3e7da" stroke-width="3" stroke-linecap="round"/>'+
 '<circle cx="730" cy="218" r="7" fill="#abc5cd"/>'+
 '<circle data-drag="pendulum" cx="'+tx+'" cy="'+ty+'" r="22" fill="#d5ab68" stroke="#fff0cf" stroke-width="3" tabindex="0" role="button" aria-label="Відтягни кульку маятника та відпусти"/>'+
 '<path d="M730 218m-145 0a145 145 0 0 1 290 0" stroke="#83bac3" stroke-opacity=".2" fill="none"/>'+
 '<text x="728" y="480" font-size="16" fill="#e1f3ed" text-anchor="middle">МАЯТНИК · '+round(p.length,1)+' м</text>'+
 '<text x="728" y="509" font-size="19" fill="#b6f28f" font-weight="750" text-anchor="middle">'+p.cycles+' повних циклів</text></g>';
};
function paint(){
 if(!shown)return;
 const s=station(),pend=(mode==='demo'&&s>=5)||mode==='explore'||(mode==='quest'&&s===4);
 const carts=(mode==='demo'&&s>=1&&s<=4)||mode==='explore'||(mode==='quest'&&s>=1&&s<=3);
 svg.innerHTML='<g class="m02-physics">'+stopwatchSvg()+
  (carts?cartSvg():'')+(pend?pendulumSvg():'')+'</g>';
 const reading=get('m02Reading');if(reading)reading.textContent=round(state.stopwatch.elapsed,1)+' с';
 const cycles=get('m02Cycles');if(cycles)cycles.textContent=state.pendulum.cycles+' циклів';
}
function button(action,label,extra=''){return '<button type="button" data-action="'+action+'" '+extra+'>'+label+'</button>'}
function input(id,placeholder,unit){return '<label class="m02-answer"><input id="'+id+'" inputmode="decimal" type="text" autocomplete="off" placeholder="'+placeholder+'"/><span>'+unit+'</span></label>'}
function controlMarkup(){
 const n=station(),q=mode==='quest',v=job();
 if(q&&n===5)return resultMarkup();
 if(mode==='explore')return '<div class="m02-panel-title">Вільний експеримент</div>'+
  button('watch',state.stopwatch.running?'Зупинити секундомір':'Запустити секундомір')+
  button('launch-cart','Запустити візок')+button('drag-hint','Відтягни маятник')+
  '<label>Шлях <output>'+round(state.distance,1)+' м</output><input data-setting="distance" type="range" min="1" max="5" step=".2" value="'+state.distance+'"></label>'+
  '<label>Швидкість <output>'+round(state.speed,1)+' м/с</output><input data-setting="speed" type="range" min=".5" max="3" step=".1" value="'+state.speed+'"></label>'+
  '<label>Довжина маятника <output>'+round(state.pendulum.length,1)+' м</output><input data-setting="length" type="range" min=".5" max="1.3" step=".1" value="'+state.pendulum.length+'"></label>'+
  button('slow',slow?'Звичайний час ×1':'Повільний час ×0,22');
 if(!q){
  if(n===0)return '<div class="m02-panel-title">Механічний секундомір</div>'+
   '<div class="m02-time" id="m02Reading">0,0 с</div>'+
   button('watch',state.stopwatch.running?'Зупинити':'Запустити')+button('watch-reset','Скинути');
  if(n>=1&&n<=4)return '<div class="m02-panel-title">'+(n===2?'Два досліди':'Рухомий візок')+'</div>'+
    '<div class="m02-stat">Шлях '+round(state.distance,1)+' м · Швидкість '+round(state.speed,1)+' м/с</div>'+
    (n===3?'<label>Шлях <input data-setting="distance" type="range" min="1" max="5" step=".2" value="'+state.distance+'"></label>'+
      '<label>Швидкість <input data-setting="speed" type="range" min=".5" max="3" step=".1" value="'+state.speed+'"></label>':'')+
    (n===4?input('m02Predict','Час прибуття','с'):n===2?'<div class="m02-stat">Дослідів: '+state.finishTimes.length+' / 2</div>':'')+
    button('launch-cart',state.cart.running?'Візок рухається…':n===2?'Запустити дослід':'Запустити візок',state.cart.running?'disabled':'')+
    (n===2&&state.finishTimes.length>=2?button('choose-compare','Порівняти результати'):'')+
    '<div class="m02-time" id="m02Reading">'+round(time(),1)+' с</div>';
  if(n===5||n===6)return '<div class="m02-panel-title">Коливання маятника</div>'+
   '<div class="m02-stat">Відтягни кульку курсором та відпусти.</div>'+
   '<div class="m02-stat" id="m02Cycles">'+state.pendulum.cycles+' циклів</div>'+
   '<label>Довжина <input data-setting="length" type="range" min=".5" max="1.3" step=".1" value="'+state.pendulum.length+'"></label>'+
   button('slow',slow?'Повернути ×1':'Уповільнення ×0,22')+
   '<div class="m02-stat">Виміряний час: '+round(state.stopwatch.elapsed,1)+' с</div>'+
   (n===6?input('m02Period','Час одного циклу','с')+button('check-period','Перевірити'):'');
  return '<div class="m02-panel-title">Дослід завершено</div>'+button('restart-demo','Пройти урок заново')+button('sandbox','Відкрити пісочницю');
 }
 if(n===0)return '<div class="m02-panel-title">Підготуй секундомір</div>'+
  '<div class="m02-stat">Запусти, зупини та обнули відлік.</div>'+
  '<div class="m02-time" id="m02Reading">'+round(time(),1)+' с</div>'+
  button('watch',state.stopwatch.running?'Зупинити':'Запустити')+button('watch-reset','Обнулити');
 if(n>=1&&n<=3)return '<div class="m02-panel-title">Технічне замовлення</div>'+
  '<div class="m02-target">Шлях '+round(state.distance,1)+' м</div>'+
  (n===1?'<div class="m02-stat">Запусти візок і зчитай час прибуття.</div>':
   n===2?'<div class="m02-stat">Знайди швидкість за виміряним часом.</div>':
   '<div class="m02-stat">Порівняй два рухи на однаковому шляху.</div>')+
  (n===3?'<div class="m02-stat">'+(state.finishTimes.length<2?'Виміряй A, потім B.':
  'A: '+round(state.finishTimes[0],1)+' с · B: '+round(state.finishTimes[1],1)+' с')+'</div>':'')+
  button('launch-cart',state.cart.running?'Вимірювання…':n===3&&state.finishTimes.length===1?'Запустити B':'Почати вимірювання',
  state.cart.running||n===3&&state.finishTimes.length>=2?'disabled':'')+
  (state.cart.done?
   n===3?(state.finishTimes.length>=2?button('choose-a','Швидший A')+button('choose-b','Швидший B'):''):
   input('m02Answer',n===1?'Час прибуття':'Швидкість',n===1?'с':'м/с')+button('check-motion','Підтвердити'):'')+
  '<div class="m02-time" id="m02Reading">'+round(time(),1)+' с</div>';
 return '<div class="m02-panel-title">П’ять повних коливань</div>'+
  '<div class="m02-stat">Відтягни кульку. Відпусти й спостерігай за повними циклами.</div>'+
  '<div class="m02-stat" id="m02Cycles">'+state.pendulum.cycles+' циклів</div>'+
  button('slow',slow?'Звичайний ×1':'Уповільнення ×0,22')+
  '<div class="m02-stat">Час п’яти циклів: '+round(state.stopwatch.elapsed,1)+' с</div>'+
  (state.pendulum.cycles>=5?input('m02Answer','Час одного циклу','с')+button('check-period','Підтвердити'):'');
}
function resultMarkup(){
 return '<div class="m02-panel-title">Практичний залік</div>'+
  '<div class="m02-grade">'+score()+'<small> / 100 балів</small></div>'+
  '<strong>'+ (saved.passed?'Залік складено':'Потрібне доопрацювання')+'</strong>'+
  weights.map((w,i)=>'<div class="m02-score-row"><span>'+qTitles[i]+'</span><b>'+saved.marks[i]+' / '+w+'</b></div>').join('')+
  '<p>Помилок: '+saved.mistakes.reduce((a,b)=>a+b,0)+'. Поріг 80/100.</p>'+
  button('new-exam','Новий варіант заліку ↻','class="m02-primary"')+button('sandbox','Пісочниця →');
}
function render(){
 if(!shown)return;
 const n=station(),finished=mode==='quest'?n>=5:n>=7;
 root.classList.toggle('m02-finish',finished);
 get('m02Kicker').textContent=mode==='explore'?'ВІЛЬНИЙ ДОСЛІД':mode==='quest'?'ПРАКТИЧНИЙ ЗАЛІК · '+Math.min(n+1,5)+'/5':'НАВЧАННЯ · МІСІЯ 02 · '+Math.min(n+1,7)+'/7';
 get('m02Title').textContent=mode==='explore'?'Лабораторія часу':mode==='quest'?(finished?(saved.passed?'Залік складено':'Залік завершено'):qTitles[n]):finished?'Місію завершено':titles[n];
 get('m02Prompt').textContent=mode==='explore'?'Візьми інструмент і перевір закономірність сам.':finished?'':mode==='quest'?'Виконай практичний дослід самостійно.':hints[n];
 panel.innerHTML=controlMarkup();
 get('m02Progress').textContent=mode==='quest'?Math.min(n,5)+'/5 · '+score()+'/100':mode==='demo'?Math.min(n,7)+'/7':'Пісочниця';
 const next=get('m02Next');next.hidden=mode==='explore'||!finished&&mode==='quest';next.disabled=mode==='demo'&&!finished&&!state.demoComplete;
 next.textContent=mode==='quest'?'Пісочниця →':finished?'Пісочниця →':'Далі →';
 paint();
}
function startNext(){
 if(mode==='quest'){if(saved.questStage>=5)sandbox();return}
 if(mode!=='demo')return;
 if(saved.stage>=7){sandbox();return}
 if(!state.demoComplete)return;
 saved.stage++;store();resetPhysics();render();
}
function sandbox(){
 if(typeof window.GNSSLabSwitchMode==='function')window.GNSSLabSwitchMode('explore');
 else document.querySelector('#expModes [data-mode="explore"]')?.click();
}
function handle(action){
 switch(action){
 case 'watch':startStopwatch();break;
 case 'watch-reset':
  if(mode==='quest'&&saved.questStage===0&&state.stopwatch.stopped&&state.stopwatch.elapsed>=.5){doneQuest('Секундомір запущено, зупинено й обнулено.');break}
  state.stopwatch={elapsed:0,running:false,ever:false,stopped:false};render();break;
 case 'launch-cart':
  if(mode==='demo'&&saved.stage===4&&state.predicted===null){
   notify('Спочатку введи прогноз часу.');break;
  }
  if(mode==='demo'&&saved.stage===2&&state.finishTimes.length===1)state.speed=state.other;
  startCart();break;
 case 'choose-compare':if(state.finishTimes.length>=2)demoDone();break;
 case 'predict':{
  const v=parse(get('m02Predict')?.value);
  if(!Number.isFinite(v)){notify('Введи прогноз часу до запуску.');break}
  state.predicted=v;notify('Прогноз записано. Запусти візок.',true);break;
 }
 case 'choose-a':case 'choose-b':
  if(mode==='quest'&&saved.questStage===3){
   if(state.finishTimes.length<2){notify('Спочатку виміряй обидва візки.');break}
   const correct=state.finishTimes[0]<=state.finishTimes[1]?'choose-a':'choose-b';
   action===correct?doneQuest('Швидший візок вибрано правильно.'):penalize('Порівняй швидкості на однаковому шляху.');
  }break;
 case 'check-motion':{
  const val=parse(get('m02Answer')?.value),expected=saved.questStage===1?duration():state.speed;
  if(!state.cart.done||!Number.isFinite(val)){notify('Спочатку виконай вимірювання та введи число.');break}
  Math.abs(val-expected)<=(saved.questStage===1?.15:.12)?
   doneQuest('Час або швидкість визначено за вимірюванням.'):penalize('Перевір шлях, час і точність вимірювання.');
  break;
 }
 case 'check-period':{
  const val=parse((mode==='quest'?get('m02Answer'):get('m02Period'))?.value);
  if(state.pendulum.cycles<5){notify('Дочекайся п’яти повних коливань.');break}
  if(!Number.isFinite(val)){notify('Введи виміряне значення.');break}
  if(Math.abs(val-period())<=.2){mode==='quest'?doneQuest('Період визначено за п’ятьма коливаннями.'):demoDone()}
  else mode==='quest'?penalize('Порахуй час п’яти циклів і поділи на 5.'):notify('Перевір час одного циклу.');
  break;
 }
 case 'slow':slow=!slow;render();break;
 case 'next':startNext();break;
 case 'reset':resetTrial();break;
 case 'help':notify(mode==='quest'?'Виміряй сам. Не потрібно вгадувати момент кліку.':'Спочатку дія — потім спостереження.');break;
 case 'drag-hint':notify('Відтягни кульку маятника курсором і відпусти.');break;
 case 'restart-demo':saved.stage=0;saved.lessonDone=[];store();resetPhysics();render();break;
 case 'new-exam':saved=fresh((saved.seed+1)%variants.length);store();resetPhysics();render();break;
 case 'sandbox':sandbox();break;
 }
}
root.addEventListener('click',e=>{
 const b=e.target.closest('button[data-action]');
 if(b&&!b.disabled)handle(b.dataset.action);
});
panel.addEventListener('input',e=>{
 const setting=e.target.dataset.setting;if(!setting)return;
 const num=Number(e.target.value);if(!Number.isFinite(num))return;
 if(setting==='distance')state.distance=num;
 if(setting==='speed')state.speed=num;
 if(setting==='length'){state.pendulum.length=num;state.pendulum.running=false;state.pendulum.cycles=0}
 state.demoComplete=false;
 const output=e.target.closest('label')?.querySelector('output');
 if(output)output.textContent=round(num,1)+(setting==='speed'?' м/с':' м');
 paint();
});
panel.addEventListener('change',e=>{if(e.target.matches('[data-setting]'))render()});
root.addEventListener('keydown',e=>{
 if(e.key!=='Enter'||!e.target.matches('input[type="text"]'))return;
 e.preventDefault();handle(e.target.id==='m02Predict'?'predict':e.target.id==='m02Period'?'check-period':
  saved.questStage===4?'check-period':'check-motion');
});
function coords(e){
 const r=svg.getBoundingClientRect();if(!r.width||!r.height)return null;
 // Equivalent to preserveAspectRatio="xMidYMid meet" coordinate conversion.
 const scale=Math.min(r.width/1200,r.height/660),ox=(r.width-1200*scale)/2,oy=(r.height-660*scale)/2;
 return {x:(e.clientX-r.left-ox)/scale,y:(e.clientY-r.top-oy)/scale};
}
svg.addEventListener('pointerdown',e=>{
 const hit=e.target.closest('[data-drag="pendulum"]');if(!hit)return;
 if(!shown)return;
 e.preventDefault();drag=e.pointerId;state.pendulum.running=false;
 try{svg.setPointerCapture(drag)}catch{}
});
svg.addEventListener('pointermove',e=>{
 if(e.pointerId!==drag)return;
 const p=coords(e);if(!p)return;
 state.pendulum.theta=clamp(Math.atan2(p.x-730,p.y-218),-.9,.9);
 state.pendulum.cycles=0;paint();
});
function release(e){
 if(e.pointerId!==drag)return;
 drag=null;
 try{svg.releasePointerCapture(e.pointerId)}catch{}
 launchPendulum();
}
svg.addEventListener('pointerup',release);
svg.addEventListener('pointercancel',release);
document.addEventListener('visibilitychange',()=>{last=0;if(!document.hidden)startFrame()});
window.addEventListener('hashchange',()=>setTimeout(sync,0));
document.getElementById('sidebarNav')?.addEventListener('click',()=>setTimeout(sync,0));
new MutationObserver(sync).observe(document.body,{attributes:true,attributeFilter:['class','data-exp-mode']});
window.GNSSLab02={get active(){return shown},get stage(){return station()},get mode(){return mode},reset(){resetTrial()},restart(){saved=fresh();store();resetPhysics();render()}};
sync();
})();