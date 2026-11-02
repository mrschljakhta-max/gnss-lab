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
const parse=v=>{const raw=String(v??'').trim().replace(',','.');return raw?Number(raw):NaN};
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
 '<footer class="m02-footer"><div><button data-action="reset" title="Почати другий курс із першого етапу" aria-label="Почати другий курс із першого етапу">↻</button><button data-action="help" title="Коротка підказка">?</button></div>'+
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
 if(raf){cancelAnimationFrame(raf);raf=0}last=0;drag=null;
}
function isLessonTwo(){return typeof window.GNSSLabActiveIndex==='function'?window.GNSSLabActiveIndex()===1:
 typeof active==='number'?active===1:location.hash==='#lab-02'}
function sync(){
 const wanted=isLessonTwo()&&document.body.classList.contains('engineering-live');
 if(!wanted){if(shown)hide();return}
 if(!shown){show();return}
 const next=document.body.dataset.expMode||'demo';
 if(next!==mode)setMode(next);
}
function startFrame(){
 if(raf||!shown||document.hidden||!(state.stopwatch.running||state.cart.running||state.pendulum.running))return;
 raf=requestAnimationFrame(frame);
}
function frame(ts){
 raf=0;if(!shown||document.hidden)return;
 const dt=last?clamp((ts-last)/1000,0,.08):0;last=ts;
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
  if(p.cycles>=5&&mode!=='explore'){
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
 render();startFrame();
}
function startStopwatch(){
 const sw=state.stopwatch;
 if(sw.running){sw.running=false;sw.stopped=true;
  if(mode==='demo'&&saved.stage===0&&sw.elapsed>=.6)demoDone();
  if(mode==='quest'&&saved.questStage===0)state.questReady=true;
 }else{sw.elapsed=0;sw.running=true;sw.ever=true;sw.stopped=false}
 render();startFrame();
}
function launchPendulum(){
 const p=state.pendulum;p.running=true;p.elapsed=0;p.cycles=0;
 p.amplitude=clamp(Math.abs(p.theta),.15,.9)*Math.sign(p.theta||1);
 state.stopwatch={elapsed:0,running:true,ever:true,stopped:false};
 if(mode==='quest'&&saved.questStage===4)state.questReady=true;
 render();startFrame();
}
function resetTrial(){
 state.stopwatch={elapsed:0,running:false,ever:false,stopped:false};
 state.cart={elapsed:0,running:false,done:false};
 state.pendulum.elapsed=0;state.pendulum.cycles=0;state.pendulum.running=false;state.pendulum.theta=.55;
 state.finishTimes=[];state.trial=0;state.questReady=false;state.demoComplete=false;render();
}
// Premium vector interpretation of the GNSS LAB mechanical stopwatch artwork.
// One static SVG body; the second hand remains the sole animated dial element.
const stopwatchSvg=()=>{
 const v=time(),hand=(v%60)/60*TAU,cx=203,cy=325;
 const xx=cx+Math.sin(hand)*59,yy=cy-Math.cos(hand)*59;
 let tick='';
 for(let i=0;i<60;i++){
  const a=i/60*TAU,major=i%15===0,medium=i%5===0;
  const inner=major?61:medium?65:69,outer=74;
  tick+='<line x1="'+(cx+Math.sin(a)*inner).toFixed(2)+'" y1="'+(cy-Math.cos(a)*inner).toFixed(2)+'" x2="'+(cx+Math.sin(a)*outer).toFixed(2)+'" y2="'+(cy-Math.cos(a)*outer).toFixed(2)+'" stroke="'+(major?'#26363c':'#39484d')+'" stroke-width="'+(major?2.8:medium?1.9:1.05)+'" stroke-linecap="round"/>';
 }
 return '<defs>'+
 '<linearGradient id="m02Chrome" x1="0" y1="0" x2="1" y2=".9"><stop offset="0" stop-color="#4b5c64"/><stop offset=".13" stop-color="#e8f0f2"/><stop offset=".28" stop-color="#879aa1"/><stop offset=".47" stop-color="#fff"/><stop offset=".63" stop-color="#9eacb0"/><stop offset=".8" stop-color="#3b505a"/><stop offset="1" stop-color="#c3d1d2"/></linearGradient>'+
 '<linearGradient id="m02Bezel" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f5ffff"/><stop offset=".24" stop-color="#607984"/><stop offset=".48" stop-color="#e0e9e8"/><stop offset=".7" stop-color="#5a7079"/><stop offset="1" stop-color="#f2fcfb"/></linearGradient>'+
 '<radialGradient id="m02Dial" cx=".35" cy=".26" r=".85"><stop offset="0" stop-color="#fff"/><stop offset=".68" stop-color="#f5f5f2"/><stop offset="1" stop-color="#dae2e1"/></radialGradient>'+
 '<linearGradient id="m02Crown" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#4e6068"/><stop offset=".2" stop-color="#f1f8f7"/><stop offset=".52" stop-color="#798d94"/><stop offset=".8" stop-color="#f7ffff"/><stop offset="1" stop-color="#455962"/></linearGradient>'+
 '<radialGradient id="m02Pin"><stop offset="0" stop-color="#ffffff"/><stop offset=".45" stop-color="#acb6ba"/><stop offset="1" stop-color="#34444b"/></radialGradient>'+
 '</defs>'+
 '<ellipse cx="205" cy="413" rx="87" ry="12" fill="#001b2a" opacity=".33"/>'+
 // Steel hanging ring, crown, and side push button.
 '<path d="M187 231V218a16 16 0 0 1 32 0v13" fill="none" stroke="#263c45" stroke-width="7"/>'+
 '<path d="M187 231V218a16 16 0 0 1 32 0v13" fill="none" stroke="url(#m02Chrome)" stroke-width="4"/>'+
 '<rect x="194" y="225" width="18" height="17" rx="3" fill="url(#m02Crown)" stroke="#3c535d" stroke-width="1.3"/>'+
 Array.from({length:8},(_,i)=>'<line x1="'+(196+i*2)+'" y1="227" x2="'+(196+i*2)+'" y2="238" stroke="#526771" stroke-opacity=".8" stroke-width=".7"/>').join('')+
 '<g transform="translate(264 255) rotate(38)"><rect x="-7" y="-18" width="14" height="26" rx="4" fill="url(#m02Crown)" stroke="#374f59"/><rect x="-10" y="-21" width="20" height="9" rx="2" fill="url(#m02Chrome)" stroke="#40535a"/></g>'+
 // Multiple concentric machined rings make the case dimensional.
 '<circle cx="203" cy="325" r="87" fill="#16394b" opacity=".55"/>'+
 '<circle cx="203" cy="325" r="86" fill="url(#m02Chrome)" stroke="#344e59" stroke-width="1.7"/>'+
 '<circle cx="203" cy="325" r="81.5" fill="none" stroke="#e9f3f2" stroke-opacity=".8" stroke-width="1.2"/>'+
 '<circle cx="203" cy="325" r="79" fill="url(#m02Bezel)" stroke="#455d66" stroke-width="1.2"/>'+
 '<circle cx="203" cy="325" r="75.5" fill="url(#m02Dial)" stroke="#85989d" stroke-width="1.4"/>'+
 '<circle cx="203" cy="325" r="73.7" fill="none" stroke="#ffffff" stroke-opacity=".7" stroke-width=".9"/>'+
 tick+
 '<path d="M154 272Q175 252 212 253" stroke="#fff" stroke-opacity=".4" stroke-width="3" fill="none" stroke-linecap="round"/>'+
 '<line id="m02Hand" x1="203" y1="325" x2="'+xx+'" y2="'+yy+'" stroke="#c72e45" stroke-width="2.7" stroke-linecap="round"/>'+
 '<circle cx="203" cy="325" r="6.2" fill="#344d57" stroke="#d7e4e2" stroke-width=".8"/>'+
 '<circle cx="203" cy="325" r="4.6" fill="url(#m02Pin)" stroke="#58666a" stroke-width=".65"/>'+
 '<text x="203" y="452" fill="#d6f0eb" font-size="16" text-anchor="middle">СЕКУНДОМІР</text>'+
 '<text id="m02FaceTime" x="203" y="479" fill="#bcf39c" font-weight="800" font-size="27" text-anchor="middle">'+round(v,1)+' с</text>';
};
const comparingCarts=()=>mode==='demo'&&saved.stage===2||mode==='quest'&&saved.questStage===3;
const cartSvg=()=>{
 const progress=clamp(state.cart.elapsed/Math.max(duration(),.001),0,1);
 const compare=comparingCarts();
 // Metallic cart modeled in SVG rather than using a flat rectangular icon.
 // Wheel groups are rotated in paint() at the same distance traveled by the body.
 const wheel=(cx,y,id)=>'<g id="'+id+'" transform="translate('+cx+' '+y+')">'+
  '<circle r="12" fill="#101f2a" stroke="#536a74" stroke-width="1.5"/>'+
  '<circle r="9" fill="url(#m02Tire)" stroke="#11212c" stroke-width="1"/>'+
  '<circle r="6.3" fill="url(#m02Steel)" stroke="#f4faf8" stroke-width=".8"/>'+
  '<path d="M-4 0H4M0-4V4" stroke="#526a76" stroke-width=".75"/>'+
  '<circle r="2.7" fill="url(#m02Steel)" stroke="#3f5059" stroke-width=".6"/></g>';
 const cart=(id,y,x,tint)=>'<g id="'+id+'" transform="translate('+x+',0)">'+
  '<ellipse cx="0" cy="'+(y+6)+'" rx="48" ry="7" fill="#071c2a" opacity=".3"/>'+
  '<path d="M-43 '+(y-43)+' H43 Q49 '+(y-43)+' 50 '+(y-38)+' L48 '+(y-34)+' H-48 L-50 '+(y-38)+'Z" fill="url(#m02Steel)" stroke="#e4f2f3" stroke-width="1.2"/>'+
  '<path d="M-45 '+(y-33)+' H45 V'+(y-4)+' Q45 '+y+' 39 '+y+' H-39 Q-45 '+y+' -45 '+(y-5)+'Z" fill="url(#m02CartMetal)" stroke="#c5d5d6" stroke-width="1.4"/>'+
  '<rect x="-37" y="'+(y-29)+'" width="74" height="24" rx="4" fill="'+tint+'" opacity=".14"/>'+
  '<path d="M-34 '+(y-27)+' V'+(y-9)+' Q-34 '+(y-7)+' -30 '+(y-7)+' H30 Q34 '+(y-7)+' 34 '+(y-11)+'V'+(y-27)+'" fill="none" stroke="#ffffff" stroke-opacity=".56" stroke-width="1.3"/>'+
  '<path d="M-46 '+(y-45)+' H46 Q49 '+(y-45)+' 49 '+(y-42)+' L45 '+(y-38)+' H-45 L-49 '+(y-42)+'Z" fill="url(#m02Steel)" stroke="#f0faf8" stroke-width="1"/>'+
  '<path d="M-38 '+(y-44)+' H38" stroke="#233944" stroke-width="2" stroke-linecap="round"/>'+
  '<path d="M17 '+(y-23)+' l8 -7m-3 9 8 -7m-3 9 8 -7" stroke="'+tint+'" stroke-width="3"/>'+
  '<circle cx="-33" cy="'+(y-23)+'" r="2" fill="#586b76" stroke="#edf5f2" stroke-width=".8"/>'+
  '<circle cx="33" cy="'+(y-23)+'" r="2" fill="#586b76" stroke="#edf5f2" stroke-width=".8"/>'+
  wheel(-26,y,id+'WheelL')+
  wheel(26,y,id+'WheelR')+'</g>';
 // A physically legible 0–distance rule, independent of screen scaling.
 const ruler=(y)=>'<g>'+
  '<rect x="358" y="'+(y+31)+'" width="480" height="38" rx="5" fill="#0b3a55" opacity=".94" stroke="#91b3c0" stroke-width="1"/>'+
  Array.from({length:61},(_,i)=>{
   const x=385+i*430/60,major=i%10===0,half=i%5===0;
   return '<path d="M'+x.toFixed(2)+' '+(y+32)+'v'+(major?14:half?10:5)+'" stroke="#deeff1" stroke-width="'+(major?1.3:.7)+'"/>'+
   (major?'<text x="'+x.toFixed(2)+'" y="'+(y+60)+'" fill="#f0fafb" font-size="10" text-anchor="middle">'+round(state.distance*i/60,1)+'</text>':'');
  }).join('')+
  '<text x="827" y="'+(y+61)+'" fill="#e8f8fa" font-size="9">м</text></g>';
 const rail=(y)=>'<g>'+
  '<rect x="362" y="'+(y-8)+'" width="477" height="13" rx="3" fill="#041d2d" opacity=".35"/>'+
  Array.from({length:6},(_,i)=>{
   const x=390+i*82;
   return '<path d="M'+x+' '+(y+5)+'v13" stroke="#b3c5ce" stroke-width="5"/>'+
   '<path d="M'+(x-8)+' '+(y+17)+'h16" stroke="#dce9ea" stroke-width="3"/>';
  }).join('')+
  '<rect x="361" y="'+(y-12)+'" width="478" height="9" rx="2" fill="url(#m02Steel)" stroke="#d1e0e3" stroke-width=".7"/>'+
  '<path d="M365 '+(y-10)+' H835" stroke="#fff" stroke-opacity=".66"/>'+
  '<rect x="361" y="'+(y-1)+'" width="478" height="6" rx="1.5" fill="url(#m02Steel)" stroke="#9cbbc5" stroke-width=".6"/>'+
  '</g>';
 const signs=(top,bottom)=>'<g>'+
  '<path d="M385 '+(top-12)+'V'+(bottom+8)+' M815 '+(top-12)+'V'+(bottom+8)+'" fill="none" stroke="#a8ef79" stroke-width="2" stroke-dasharray="4 6" opacity=".9"/>'+
  '<rect x="361" y="'+(top-60)+'" width="70" height="26" rx="5" fill="#102d3e" stroke="#9fbac2"/>'+
  '<rect x="781" y="'+(top-60)+'" width="70" height="26" rx="5" fill="#102d3e" stroke="#9fbac2"/>'+
  '<text x="396" y="'+(top-42)+'" fill="#f2f9f7" font-weight="700" font-size="13" text-anchor="middle">СТАРТ</text>'+
  '<text x="816" y="'+(top-42)+'" fill="#f2f9f7" font-weight="700" font-size="13" text-anchor="middle">ФІНІШ</text>'+
  '</g>';
 const defs='<defs>'+
  '<linearGradient id="m02Steel" x1="0" y1="0" x2=".1" y2="1"><stop stop-color="#f4fcfd"/><stop offset=".24" stop-color="#8398a1"/><stop offset=".51" stop-color="#ffffff"/><stop offset=".78" stop-color="#607987"/><stop offset="1" stop-color="#ccdce0"/></linearGradient>'+
  '<linearGradient id="m02CartMetal" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#a8b7b9"/><stop offset=".42" stop-color="#f1f1e8"/><stop offset=".77" stop-color="#929fa2"/><stop offset="1" stop-color="#dae6e4"/></linearGradient>'+
  '<radialGradient id="m02Tire"><stop stop-color="#405466"/><stop offset=".6" stop-color="#223644"/><stop offset="1" stop-color="#0c1b27"/></radialGradient>'+
  '</defs>';
 if(compare){
  const count=state.finishTimes.length;
  const aX=385+(count>=1?430:progress*430),bX=385+(count>=2?430:count===1?progress*430:0);
  return defs+signs(279,444)+rail(340)+rail(453)+
   ruler(354)+ruler(465)+
   '<text x="343" y="341" text-anchor="middle" font-size="18" font-weight="800" fill="#f6d48a">A</text>'+
   '<text x="343" y="454" text-anchor="middle" font-size="18" font-weight="800" fill="#a4e2f3">B</text>'+
   cart('m02CartA',340,aX,'#efbc46')+cart('m02CartB',453,bX,'#3c9dbf');
 }
 return defs+signs(342,391)+rail(390)+ruler(407)+cart('m02MovingCart',390,385+progress*430,'#efbc46');
};
const pendulumSvg=()=>{
 const p=state.pendulum,L=clamp(p.length,.45,1.35),r=L*148,tx=730+r*Math.sin(p.theta),ty=240+r*Math.cos(p.theta);
 return '<g><rect x="688" y="207" width="85" height="10" rx="2" fill="#9db5c2"/>'+
 '<line x1="730" y1="218" x2="730" y2="452" stroke="#b6cbd4" stroke-dasharray="5 8" opacity=".3"/>'+
 '<path id="m02PendString" d="M730 218L'+tx+' '+ty+'" stroke="#e3e7da" stroke-width="3" stroke-linecap="round"/>'+
 '<circle cx="730" cy="218" r="7" fill="#abc5cd"/>'+
 '<circle id="m02PendBall" data-drag="pendulum" cx="'+tx+'" cy="'+ty+'" r="22" fill="#d5ab68" stroke="#fff0cf" stroke-width="3" tabindex="0" role="button" aria-label="Відтягни кульку маятника та відпусти"/>'+
 '<path d="M730 218m-145 0a145 145 0 0 1 290 0" stroke="#83bac3" stroke-opacity=".2" fill="none"/>'+
 '<text x="728" y="480" font-size="16" fill="#e1f3ed" text-anchor="middle">МАЯТНИК · '+round(p.length,1)+' м</text>'+
 '<text id="m02PendCount" x="728" y="509" font-size="19" fill="#b6f28f" font-weight="750" text-anchor="middle">'+p.cycles+' повних циклів</text></g>';
};
// Static SVG is built once per step. Never replace the draggable ball and
// 60 stopwatch ticks on every frame: only update the moving coordinates.
function buildScene(){
 const n=station(),pend=(mode==='demo'&&n>=5)||mode==='explore'||(mode==='quest'&&n===4);
 const carts=(mode==='demo'&&n>=1&&n<=4)||mode==='explore'||(mode==='quest'&&n>=1&&n<=3);
 svg.innerHTML='<g class="m02-physics">'+stopwatchSvg()+
  (carts?cartSvg():'')+(pend?pendulumSvg():'')+'</g>';
 paint();
}
function setReadout(id,value){
 const el=get(id);if(el&&el.textContent!==value)el.textContent=value;
}
function paint(){
 if(!shown)return;
 const sw=state.stopwatch.elapsed,a=(sw%60)/60*TAU;
 const hand=get('m02Hand');
 if(hand){hand.setAttribute('x2',(203+Math.sin(a)*59).toFixed(3));
  hand.setAttribute('y2',(325-Math.cos(a)*59).toFixed(3))}
 setReadout('m02FaceTime',round(sw,1)+' с');
 const cart=get('m02MovingCart');
 if(cart)cart.setAttribute('transform','translate('+(385+clamp(state.cart.elapsed/Math.max(duration(),.001),0,1)*430).toFixed(3)+',0)');
 if(comparingCarts()){
  const count=state.finishTimes.length;
  const f=clamp(state.cart.elapsed/Math.max(duration(),.001),0,1);
  const a=get('m02CartA'),b=get('m02CartB');
  if(a)a.setAttribute('transform','translate('+(385+(count>=1?430:f*430)).toFixed(3)+',0)');
  if(b)b.setAttribute('transform','translate('+(385+(count>=2?430:count===1?f*430:0)).toFixed(3)+',0)');
 }

 // Rotate wheel hubs proportionally to traveled distance (radius 12 SVG units).
 const rotation=(state.cart.elapsed/Math.max(duration(),.001)*430/12)*180/Math.PI;
 for(const id of ['m02MovingCart','m02CartA','m02CartB']){
  const moving=id==='m02MovingCart'||id==='m02CartA'&&state.finishTimes.length===0||id==='m02CartB'&&state.finishTimes.length===1;
  const degrees=moving?rotation:0;
  for(const suffix of ['WheelL','WheelR']){
   const wheel=get(id+suffix);
   if(wheel){const cx=suffix==='WheelL'?-26:26,y=id==='m02CartA'?340:id==='m02CartB'?453:390;
    wheel.setAttribute('transform','translate('+cx+' '+y+') rotate('+degrees.toFixed(2)+')')}
  }
 }
 const bob=get('m02PendBall'),cord=get('m02PendString');
 if(bob&&cord){
  const p=state.pendulum,r=clamp(p.length,.45,1.35)*148;
  const x=730+r*Math.sin(p.theta),y=240+r*Math.cos(p.theta);
  bob.setAttribute('cx',x.toFixed(3));bob.setAttribute('cy',y.toFixed(3));
  cord.setAttribute('d','M730 218L'+x.toFixed(3)+' '+y.toFixed(3));
 }
 setReadout('m02PendCount',state.pendulum.cycles+' повних циклів');

 setReadout('m02Cycles',state.pendulum.cycles+' циклів');
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
   
   button('watch',state.stopwatch.running?'Зупинити':'Запустити')+button('watch-reset','Скинути');
  if(n>=1&&n<=4)return '<div class="m02-panel-title">'+(n===2?'Два досліди':'Рухомий візок')+'</div>'+
    '<div class="m02-stat">Шлях '+round(state.distance,1)+' м · Швидкість '+round(state.speed,1)+' м/с</div>'+
    (n===3?'<label>Шлях <input data-setting="distance" type="range" min="1" max="5" step=".2" value="'+state.distance+'"></label>'+
      '<label>Швидкість <input data-setting="speed" type="range" min=".5" max="3" step=".1" value="'+state.speed+'"></label>':'')+
    (n===4?input('m02Predict','Час прибуття','с')+
     (state.cart.done?'<div class="m02-stat">Прогноз: '+round(state.predicted,1)+' с · Виміряно: '+round(state.cart.elapsed,1)+' с</div>':''):
     n===2?'<div class="m02-stat">Візок A: '+(state.finishTimes.length>=1?round(state.finishTimes[0],1)+' с':'очікує запуску')+'</div><div class="m02-stat">Візок B: '+(state.finishTimes.length>=2?round(state.finishTimes[1],1)+' с':state.finishTimes.length===1?'готовий до запуску':'очікує запуску')+'</div>'+
      (state.finishTimes.length?'<div class="m02-stat">Час A: '+round(state.finishTimes[0],1)+' с'+
       (state.finishTimes.length>1?' · B: '+round(state.finishTimes[1],1)+' с':'')+'</div>':''):'')+
    button('launch-cart',state.cart.running?'Візок рухається…':n===2?'Запустити дослід':'Запустити візок',state.cart.running?'disabled':'')+
    (n===2&&state.finishTimes.length>=2?button('choose-compare','Порівняти результати'):'')+
    '';
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
  '';
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
 const kicker=get('m02Kicker');if(kicker){kicker.textContent='';kicker.style.display='none'}
 get('m02Title').textContent=mode==='explore'?'Лабораторія часу':mode==='quest'?(finished?(saved.passed?'Залік складено':'Залік завершено'):qTitles[n]):finished?'Місію завершено':titles[n];
 get('m02Prompt').textContent=mode==='explore'?'Візьми інструмент і перевір закономірність сам.':finished?'':mode==='quest'?'Виконай практичний дослід самостійно.':hints[n];
 panel.innerHTML=controlMarkup();
 get('m02Progress').textContent=mode==='quest'?Math.min(n,5)+'/5 · '+score()+'/100':mode==='demo'?Math.min(n,7)+'/7':'Пісочниця';
 const next=get('m02Next');next.hidden=mode==='explore'||!finished&&mode==='quest';next.disabled=mode==='demo'&&!finished&&!state.demoComplete;
 next.textContent=mode==='quest'?'Пісочниця →':finished?'Пісочниця →':'Далі →';
 buildScene();
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
 case 'reset':
  // Restart Lesson 02 training from its first stage, retaining exam results.
  if(mode!=='demo')sandbox();
  saved.stage=0;saved.lessonDone=[];
  store();resetPhysics();render();
  if(typeof window.GNSSLabSwitchMode==='function')window.GNSSLabSwitchMode('demo');
  else document.querySelector('#expModes [data-mode="demo"]')?.click();
  break;
 case 'help':notify(mode==='quest'?'Виміряй сам. Не потрібно вгадувати момент кліку.':'Спочатку дія — потім спостереження.');break;
 case 'drag-hint':notify('Відтягни кульку маятника курсором і відпусти.');break;
 case 'restart-demo':saved.stage=0;saved.lessonDone=[];store();resetPhysics();render();break;
 case 'new-exam':{
  const old=saved;saved=fresh((old.seed+1)%variants.length);
  saved.stage=old.stage;saved.lessonDone=[...old.lessonDone];
  store();resetPhysics();render();break;
 }
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
window.addEventListener('gnss:lab-change',sync);
document.getElementById('sidebarNav')?.addEventListener('click',()=>setTimeout(sync,0));
new MutationObserver(sync).observe(document.body,{attributes:true,attributeFilter:['class','data-exp-mode']});
window.GNSSLab02={get active(){return shown},get stage(){return station()},get mode(){return mode},reset(){resetTrial()},restart(){saved=fresh();store();resetPhysics();render()}};
sync();
})();