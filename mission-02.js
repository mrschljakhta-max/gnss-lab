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
const qTitles=['Зупини секунду','Невідомий візок','Гонка двох візків','Таємниця маятника'];
const weights=[15,30,25,30];
const variants=[
 {distance:3,speed:1,other:1.5,length:.8},
 {distance:4,speed:1.6,other:1,length:1.0},
 {distance:5,speed:2,other:1.25,length:1.2},
 {distance:3.6,speed:1.2,other:1.8,length:.7},
 {distance:4.5,speed:1.5,other:1.0,length:.9}
];
function fresh(seed=0){return {version:2,stage:0,questStage:0,seed,marks:[null,null,null,null],mistakes:[0,0,0,0],complete:false,passed:false,lessonDone:[],questDone:[],record:{}}}
let saved;
try{const p=JSON.parse(localStorage.getItem(KEY)||'null');saved=p&&p.version===2&&p.marks?.length===4?p:fresh(p?.seed||0);if(p?.lessonDone)saved.lessonDone=p.lessonDone;if(Number.isInteger(p?.stage))saved.stage=p.stage}catch{saved=fresh()}
function store(){try{localStorage.setItem(KEY,JSON.stringify(saved))}catch{}}
const root=document.createElement('section');root.id='gnssMission02';root.hidden=true;
root.setAttribute('aria-label','Урок 02 — Час, рух і повторення');
root.innerHTML='<header class="m02-head"><small id="m02Kicker"></small><h2 id="m02Title"></h2><p id="m02Prompt"></p></header>'+
 '<div class="m02-scene" id="m02Scene"><svg id="m02Svg" viewBox="0 0 1200 660" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Секундомір, рейка з візком і маятник"></svg></div>'+
 '<div class="m02-panel" id="m02Panel"></div><nav class="m02-instrument-dock" id="m02InstrumentDock" aria-label="Інструменти пісочниці" hidden></nav><div class="m02-feedback" id="m02Feedback" role="status" aria-live="polite" hidden></div>'+
 '<footer class="m02-footer"><div><button data-action="reset" title="Почати другий курс із першого етапу" aria-label="Почати другий курс із першого етапу">↻</button><button data-action="help" title="Коротка підказка">?</button></div>'+
 '<div class="m02-advance"><span id="m02Progress"></span><button class="m02-next" data-action="next" id="m02Next">Далі →</button></div></footer>';
board.append(root);
const get=id=>root.querySelector('#'+id),svg=get('m02Svg'),panel=get('m02Panel'),feedback=get('m02Feedback'),dock=get('m02InstrumentDock');
let shown=false,mode='demo',raf=0,last=0,nowTime=0,slow=false,activeLesson=-1,drag=null,feedbackTimer=0;
const state={stopwatch:{elapsed:0,running:false,ever:false,stopped:false},cart:{elapsed:0,running:false,done:false},
 pendulum:{length:.9,theta:.5,amplitude:.5,elapsed:0,running:false,cycles:0},
 distance:3,speed:1.5,other:1,trial:0,finishTimes:[],predicted:null,
 demoComplete:false,questReady:false,readings:{},answers:{},sandboxTool:'watch'};
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
 return score()>=80;
}
function penalize(msg){
 const i=saved.questStage;saved.mistakes[i]=(saved.mistakes[i]||0)+1;store();
 notify(msg);
}
function doneQuest(description,points){
 const i=saved.questStage;if(i>=4||saved.marks[i]!==null)return;
 saved.marks[i]=Math.max(0,Math.min(weights[i],points??weights[i]-saved.mistakes[i]*5));
 saved.record['q'+i]=description;saved.questStage+=1;
 if(saved.questStage>=4){
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
 state.pendulumSamples=[];
 state.distance=mode==='quest'?j.distance:3;
 state.speed=mode==='quest'?j.speed:1.5;state.other=mode==='quest'?j.other:1;
 state.trial=0;state.finishTimes=[];state.predicted=null;state.readings={};state.answers={};state.race={elapsed:0,running:false,finished:false,guess:null};state.pendGuess=null;
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
 if(raf||!shown||document.hidden||!(state.stopwatch.running||state.cart.running||state.pendulum.running||state.race?.running))return;
 raf=requestAnimationFrame(frame);
}
function frame(ts){
 raf=0;if(!shown||document.hidden)return;
 const dt=last?clamp((ts-last)/1000,0,.08):0;last=ts;
 const scaled=dt*(slow?.22:1);
 if(state.stopwatch.running)state.stopwatch.elapsed+=mode==='quest'&&saved.questStage===0?dt:scaled;
 if(state.race?.running){state.race.elapsed+=dt;if(state.race.elapsed>=Math.max(state.distance/state.speed,state.distance/state.other)){state.race.running=false;state.race.finished=true;render()}}
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
   if(mode==='demo'&&saved.stage===5)state.pendulumSamples.push({length:p.length,period:period(),total:5*period()});
   state.stopwatch.running=false;state.stopwatch.stopped=true;
   state.stopwatch.elapsed=5*period();
   if(mode==='demo'&&saved.stage===5&&!state.demoComplete)demoDone();
   if(mode==='quest'&&saved.questStage===3)state.questReady=true;
   render();
  }
 }
 paint();startFrame();
}
function onFinish(){
 const s=station();
 if(mode==='demo'){
  if(s===1||s===3||s===4)demoDone();
  if(s===2&&state.finishTimes.length===1){
   // The first run is finished: park A at the finish, keep B at the start.
   state.cart={elapsed:0,running:false,done:false};
  }
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
 const p=state.pendulum;
 if(mode==='demo'&&saved.stage===5&&state.pendulumSamples.length>=1)state.demoComplete=false;p.running=true;p.elapsed=0;p.cycles=0;
 p.amplitude=clamp(Math.abs(p.theta),.15,.9)*Math.sign(p.theta||1);
 state.stopwatch={elapsed:0,running:true,ever:true,stopped:false};
 if(mode==='quest'&&saved.questStage===3)state.questReady=true;
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
const comparingCarts=()=>mode==='demo'&&saved.stage===2||mode==='quest'&&saved.questStage===2;
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
  const aX=mode==='quest'?385+430*clamp(state.race.elapsed/(state.distance/state.speed),0,1):385+(count>=1?430:progress*430),bX=mode==='quest'?385+430*clamp(state.race.elapsed/(state.distance/state.other),0,1):385+(count>=2?430:count===1?progress*430:0);
  return defs+signs(279,444)+rail(340)+rail(453)+
   ruler(354)+ruler(465)+
   '<text x="343" y="341" text-anchor="middle" font-size="18" font-weight="800" fill="#f6d48a">A</text>'+
   '<text x="343" y="454" text-anchor="middle" font-size="18" font-weight="800" fill="#a4e2f3">B</text>'+
   cart('m02CartA',340,aX,'#efbc46')+cart('m02CartB',453,bX,'#3c9dbf');
 }
 return defs+signs(342,391)+rail(390)+ruler(407)+cart('m02MovingCart',390,385+progress*430,'#efbc46');
};
const pendulumSvg=()=>{
 const p=state.pendulum,L=clamp(p.length,.45,1.35),r=L*148;
 const tx=730+r*Math.sin(p.theta),ty=218+r*Math.cos(p.theta);
 const ghost=(angle)=>{const x=730+r*Math.sin(angle),y=218+r*Math.cos(angle);
  return '<path d="M730 218L'+x.toFixed(2)+' '+y.toFixed(2)+'" stroke="#a5d9ea" stroke-width="2.5" opacity=".22"/>'+
   '<circle cx="'+x.toFixed(2)+'" cy="'+y.toFixed(2)+'" r="23" fill="#8ab5c5" opacity=".17" stroke="#b9e8f4" stroke-width="1.5"/>';
 };
 return '<g aria-label="Лабораторний маятник на металевому штативі">'+
 '<defs><linearGradient id="m02PendSteel" x1="0" y1="0" x2=".9" y2=".2"><stop stop-color="#354954"/><stop offset=".22" stop-color="#f8ffff"/><stop offset=".48" stop-color="#869da4"/><stop offset=".75" stop-color="#e4f0f2"/><stop offset="1" stop-color="#415861"/></linearGradient>'+
 '<radialGradient id="m02PendBrass" cx=".3" cy=".25" r=".83"><stop stop-color="#fff4c9"/><stop offset=".25" stop-color="#f2d58a"/><stop offset=".62" stop-color="#bb8744"/><stop offset="1" stop-color="#77512a"/></radialGradient></defs>'+
 // Stable physical base and separate support pillar: the swinging string is not a stand.
 '<ellipse cx="659" cy="488" rx="148" ry="13" fill="#001b2b" opacity=".3"/>'+
 '<rect x="543" y="464" width="239" height="28" rx="7" fill="url(#m02PendSteel)" stroke="#d6e6e7" stroke-width="1.6"/>'+
 '<path d="M552 468H771" stroke="#f5ffff" stroke-opacity=".65" stroke-width="1.7"/>'+
 '<rect x="558" y="491" width="24" height="7" rx="3" fill="#20333d"/><rect x="741" y="491" width="24" height="7" rx="3" fill="#20333d"/>'+
 '<rect x="586" y="188" width="14" height="279" rx="4" fill="url(#m02PendSteel)" stroke="#c5dbdf" stroke-width="1.2"/>'+
 '<rect x="575" y="195" width="34" height="31" rx="6" fill="#263943" stroke="#a0b5bc" stroke-width="1.5"/>'+
 '<circle cx="581" cy="209" r="8" fill="url(#m02PendSteel)" stroke="#253b46"/>'+
 '<rect x="602" y="200" width="185" height="12" rx="5" fill="url(#m02PendSteel)" stroke="#d8e9ea" stroke-width="1.1"/>'+
 '<rect x="712" y="192" width="36" height="29" rx="6" fill="url(#m02PendSteel)" stroke="#8ca7b0"/>'+
 '<rect x="723" y="184" width="14" height="10" rx="3" fill="#73878e" stroke="#e8f2f2"/>'+
 '<circle cx="730" cy="211" r="6.5" fill="url(#m02PendSteel)" stroke="#405965"/>'+
 // Length reference measures pivot to the centre of the brass bob.
 '<line x1="520" y1="218" x2="573" y2="218" stroke="#d2eaf1" stroke-width="1" stroke-dasharray="5 5"/>'+
 '<line x1="520" y1="'+(218+r).toFixed(2)+'" x2="573" y2="'+(218+r).toFixed(2)+'" stroke="#d2eaf1" stroke-width="1" stroke-dasharray="5 5"/>'+
 '<path d="M531 218V'+(218+r).toFixed(2)+'m-5 -'+(r-8).toFixed(2)+'l5 -8 5 8M526 '+(218+r-8).toFixed(2)+'l5 8 5 -8" fill="none" stroke="#e6f6f7" stroke-width="1.4"/>'+
 '<text x="516" y="'+(218+r/2).toFixed(2)+'" fill="#f3fafb" font-style="italic" font-size="20" text-anchor="end">L</text>'+
 '<line x1="730" y1="218" x2="730" y2="433" stroke="#bbd8e2" opacity=".35" stroke-dasharray="5 8"/>'+
 ghost(-.65)+ghost(.65)+
 '<path d="M'+(730-r*Math.sin(.7)).toFixed(2)+' '+(218+r*Math.cos(.7)).toFixed(2)+' A'+r.toFixed(2)+' '+r.toFixed(2)+' 0 0 0 '+(730+r*Math.sin(.7)).toFixed(2)+' '+(218+r*Math.cos(.7)).toFixed(2)+'" stroke="#e6f5f7" opacity=".62" stroke-width="1.5" stroke-dasharray="7 7" fill="none"/>'+
 '<path id="m02PendString" d="M730 218L'+tx+' '+ty+'" stroke="#f8e4bd" stroke-width="3" stroke-linecap="round"/>'+
 '<path id="m02PendStringHighlight" d="M730 218L'+tx+' '+ty+'" stroke="#806c54" stroke-width=".7" opacity=".6"/>'+
 '<circle id="m02PendBall" data-drag="pendulum" cx="'+tx+'" cy="'+ty+'" r="23" fill="url(#m02PendBrass)" stroke="#ffefc8" stroke-width="2" tabindex="0" role="button" aria-label="Відтягни маятник та відпусти" style="cursor:grab"/>'+
 '<ellipse id="m02PendGlint" cx="'+(tx-7)+'" cy="'+(ty-9)+'" rx="6" ry="3.5" fill="#fff7d9" opacity=".4" pointer-events="none"/>'+
 '</g>';
};
// Static SVG is built once per step. Never replace the draggable ball and
// 60 stopwatch ticks on every frame: only update the moving coordinates.
function buildScene(){
 const n=station(),sandbox=mode==='explore';
 const pend=(mode==='demo'&&n>=5)||(sandbox&&state.sandboxTool==='pendulum')||(mode==='quest'&&n===3);
 const carts=(mode==='demo'&&n>=1&&n<=4)||(sandbox&&state.sandboxTool==='cart')||(mode==='quest'&&(n===1||n===2));
 const watch=!sandbox||state.sandboxTool==='watch';
 // In sandbox, center the chosen instrument instead of stacking all three.
 svg.innerHTML='<g class="m02-physics">'+
  (watch?(sandbox?'<g transform="translate(400 0)">':'')+stopwatchSvg()+(sandbox?'</g>':''):'')+
  (carts?cartSvg():'')+
  (pend?(sandbox?'<g transform="translate(-110 0)">':'')+pendulumSvg()+(sandbox?'</g>':''):'')+'</g>';
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
 setReadout('m02FaceTime',mode==='quest'&&saved.questStage===0&&state.stopwatch.running?'•••':round(sw,1)+' с');
 const cart=get('m02MovingCart');
 if(cart)cart.setAttribute('transform','translate('+(385+clamp(state.cart.elapsed/Math.max(duration(),.001),0,1)*430).toFixed(3)+',0)');
 if(comparingCarts()){
  const count=state.finishTimes.length;
  const f=clamp(state.cart.elapsed/Math.max(duration(),.001),0,1);
  const a=get('m02CartA'),b=get('m02CartB');
  const ax=mode==='quest'?385+430*clamp(state.race.elapsed/(state.distance/state.speed),0,1):385+(count>=1?430:f*430),bx=mode==='quest'?385+430*clamp(state.race.elapsed/(state.distance/state.other),0,1):385+(count>=2?430:count===1?f*430:0);
  if(a)a.setAttribute('transform','translate('+ax.toFixed(3)+',0)');if(b)b.setAttribute('transform','translate('+bx.toFixed(3)+',0)');
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
 const bob=get('m02PendBall'),cord=get('m02PendString'),glint=get('m02PendGlint'),highlight=get('m02PendStringHighlight');
 if(bob&&cord){
  const p=state.pendulum,r=clamp(p.length,.45,1.35)*148;
  const x=730+r*Math.sin(p.theta),y=218+r*Math.cos(p.theta);
  bob.setAttribute('cx',x.toFixed(3));bob.setAttribute('cy',y.toFixed(3));
  cord.setAttribute('d','M730 218L'+x.toFixed(3)+' '+y.toFixed(3));
  if(highlight)highlight.setAttribute('d','M730 218L'+x.toFixed(3)+' '+y.toFixed(3));
  if(glint){glint.setAttribute('cx',(x-7).toFixed(3));glint.setAttribute('cy',(y-9).toFixed(3))}
 }


 setReadout('m02Cycles',state.pendulum.cycles+' циклів');
}
function button(action,label,extra=''){return '<button type="button" data-action="'+action+'" '+extra+'>'+label+'</button>'}
function input(id,placeholder,unit){return '<label class="m02-answer"><input id="'+id+'" inputmode="decimal" type="text" autocomplete="off" placeholder="'+placeholder+'"/><span>'+unit+'</span></label>'}
function controlMarkup(){
 const n=station(),q=mode==='quest',v=job();
 if(q&&n===4)return resultMarkup();
 if(mode==='explore'){
  const tool=state.sandboxTool;
  const selector='';
  if(tool==='watch')return selector+'<div class="m02-panel-title">Секундомір</div>'+
   button('watch',state.stopwatch.running?'Зупинити':'Запустити')+button('watch-reset','Обнулити');
  if(tool==='cart')return selector+'<div class="m02-panel-title">Рух вагонетки</div>'+
   '<label>Шлях <output>'+round(state.distance,1)+' м</output><input data-setting="distance" type="range" min="1" max="5" step=".2" value="'+state.distance+'"></label>'+
   '<label>Швидкість <output>'+round(state.speed,1)+' м/с</output><input data-setting="speed" type="range" min=".5" max="3" step=".1" value="'+state.speed+'"></label>'+
   button('launch-cart',state.cart.running?'Вагонетка рухається…':'Запустити вагонетку',state.cart.running?'disabled':'')+
   button('sandbox-clear','Повернути на старт');
  return selector+'<div class="m02-panel-title">Маятник</div>'+
   '<div class="m02-stat" id="m02Cycles">'+state.pendulum.cycles+' циклів</div>'+
   '<label>Довжина <output>'+round(state.pendulum.length,1)+' м</output><input data-setting="length" type="range" min=".5" max="1.3" step=".1" value="'+state.pendulum.length+'"></label>'+
   button('drag-hint','Як запустити')+button('slow',slow?'Звичайна швидкість ×1':'Уповільнити ×0,22');
 }
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
   (n===5?state.pendulumSamples.slice(-2).map((v,i)=>'<div class="m02-stat">Вимір '+(state.pendulumSamples.length>1?state.pendulumSamples.length-Math.min(2,state.pendulumSamples.length)+i+1:i+1)+': '+round(v.length,1)+' м · 5 циклів '+round(v.total,1)+' с · 1 цикл '+round(v.period,2)+' с</div>').join(''):'')+
   '<label>Довжина <input data-setting="length" type="range" min=".5" max="1.3" step=".1" value="'+state.pendulum.length+'"></label>'+
   button('slow',slow?'Повернути ×1':'Уповільнення ×0,22')+

   (n===6?input('m02Period','Час одного циклу','с')+button('check-period','Перевірити'):'');
  return '<div class="m02-panel-title">Дослід завершено</div>'+button('restart-demo','Пройти урок заново')+button('sandbox','Відкрити пісочницю');
 }
 if(n===0)return '<div class="m02-panel-title">Зупини секунду</div><div class="m02-stat">Зупини відлік якомога ближче до 5,0 с.</div>'+button('exam-watch',state.stopwatch.running?'Зупинити':'Запустити')+(state.stopwatch.stopped?'<div class="m02-stat">Результат: '+round(time(),2)+' с</div>'+button('exam-watch-grade','Зарахувати'):'');
 if(n===1)return '<div class="m02-panel-title">Невідомий візок</div><div class="m02-stat">Шлях '+round(state.distance,1)+' м. Визнач швидкість за часом.</div>'+button('launch-cart',state.cart.running?'Рух…':'Запустити',state.cart.running||state.cart.done?'disabled':'')+(state.cart.done?'<div class="m02-stat">Час '+round(state.cart.elapsed,2)+' с</div>'+input('m02Answer','Швидкість','м/с')+button('exam-speed-grade','Перевірити'):'');
 if(n===2)return '<div class="m02-panel-title">Гонка двох візків</div><div class="m02-stat">Однакова відстань. Передбач переможця до старту.</div>'+(state.race.guess===null?button('race-a','Переможе A')+button('race-b','Переможе B'):'<div class="m02-stat">Прогноз: '+state.race.guess+'</div>'+(!state.race.finished?button('race-start',state.race.running?'Рухаються…':'Запустити обидва',state.race.running?'disabled':''):'<div class="m02-stat">A: '+round(state.distance/state.speed,2)+' с · B: '+round(state.distance/state.other,2)+' с</div>'+button('race-grade','Зарахувати')));
 if(n===3)return '<div class="m02-panel-title">Таємниця маятника</div><div class="m02-stat">Який маятник зробить п’ять коливань швидше?</div>'+(state.pendGuess===null?button('pend-short','Довжина 0,5 м')+button('pend-long','Довжина 1,3 м'):'<div class="m02-stat">Відтягни тягарець і виміряй 5 циклів.</div><label>Довжина <input data-setting="length" type="range" min=".5" max="1.3" step=".1" value="'+state.pendulum.length+'"></label>'+(state.pendulum.cycles>=5?input('m02Answer','Період 1 циклу','с')+button('pend-grade','Перевірити'):''));
 return '';
}
function resultMarkup(){
 return '<div class="m02-panel-title">Практичний залік</div>'+
  '<div class="m02-grade">'+score()+'<small> / 100 балів</small></div>'+
  '<strong>'+ (saved.passed?'Залік складено':'Потрібне доопрацювання')+'</strong>'+
  weights.map((w,i)=>'<div class="m02-score-row"><span>'+qTitles[i]+'</span><b>'+saved.marks[i]+' / '+w+'</b></div>').join('')+
  '<p>Прохідний поріг: 80/100.</p>'+
  button('new-exam','Новий варіант заліку ↻','class="m02-primary"')+button('sandbox','Пісочниця →');
}
// A compact laboratory shelf, matching the large illustrated tool cards of Lesson 01.
// Reuse detailed physical-scene models for faithful high-fidelity thumbnails.
// All SVG IDs are prefixed to avoid collisions with the active laboratory instruments.
function sandboxToolArt(id){
 const scene=id==='watch'?stopwatchSvg():id==='cart'?cartSvg():pendulumSvg();
 let art=scene;
 if(id==='cart'){
  const start=scene.indexOf('<g id="m02MovingCart"');
  const defsEnd=scene.indexOf('</defs>');
  let end=-1;
  if(start>=0){
   let depth=0;
   const tags=scene.slice(start).matchAll(/<g(?=[\s>])[^>]*>|<\/g>/g);
   for(const match of tags){
    depth+=match[0].startsWith('</')?-1:1;
    if(depth===0){end=start+match.index+match[0].length;break}
   }
  }
  art=(defsEnd>=0?scene.slice(0,defsEnd+7):'')+(start>=0&&end>start?scene.slice(start,end):'');
 }
 const box=id==='watch'?'110 206 185 213':id==='cart'?'330 310 112 84':'534 177 256 326';
 return '<svg viewBox="'+box+'" aria-hidden="true" focusable="false">'+
  art.replaceAll('m02','m02Dock').replace(/ data-drag="[^"]*"/g,'')+'</svg>';
}

function renderSandboxDock(){
 const active=mode==='explore';
 dock.hidden=!active;
 if(!active){dock.innerHTML='';return}
 const tools=[['watch','Секундомір'],['cart','Вагонетка'],['pendulum','Маятник']];
 dock.innerHTML=tools.map(([id,label])=>'<button type="button" class="m02-tool-card'+(state.sandboxTool===id?' selected':'')+'" data-action="tool-'+id+'" aria-pressed="'+(state.sandboxTool===id)+'" title="'+label+'">'+sandboxToolArt(id)+'<span>'+label+'</span></button>').join('');
}
function render(){
 if(!shown)return;
 const n=station(),finished=mode==='quest'?n>=4:n>=7;
 root.classList.toggle('m02-finish',finished);
 const kicker=get('m02Kicker');if(kicker){kicker.textContent='';kicker.style.display='none'}
 get('m02Title').textContent=mode==='explore'?'Лабораторія часу':mode==='quest'?(finished?(saved.passed?'Залік складено':'Залік завершено'):qTitles[n]):finished?'Місію завершено':titles[n];
 get('m02Prompt').textContent=mode==='explore'?'Візьми інструмент і перевір закономірність сам.':finished?'':mode==='quest'?'Виконай практичний дослід самостійно.':hints[n];
 panel.innerHTML=controlMarkup();
 renderSandboxDock();
 get('m02Progress').textContent=mode==='quest'?Math.min(n,4)+'/4 · '+score()+'/100':mode==='demo'?Math.min(n,7)+'/7':'Пісочниця';
 const next=get('m02Next');next.hidden=mode==='explore'||!finished&&mode==='quest';next.disabled=mode==='demo'&&!finished&&!state.demoComplete;
 next.textContent=mode==='quest'?'Пісочниця →':finished?'Пісочниця →':'Далі →';
 buildScene();
}
function startNext(){
 if(mode==='quest'){if(saved.questStage>=4)sandbox();return}
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
 case 'tool-watch':case 'tool-cart':case 'tool-pendulum':
  if(mode!=='explore')break;
  state.stopwatch.running=false;state.cart.running=false;state.pendulum.running=false;
  state.race.running=false;state.sandboxTool=action.slice(5);
  state.stopwatch.elapsed=0;state.stopwatch.stopped=false;
  state.cart.elapsed=0;state.cart.done=false;
  state.pendulum.cycles=0;state.pendulum.elapsed=0;state.pendulum.theta=.55;
  last=0;render();break;
 case 'sandbox-clear':
  if(mode==='explore'){state.cart={elapsed:0,running:false,done:false};state.stopwatch.running=false;render()}break;
 case 'exam-watch':
  if(!state.stopwatch.running){state.stopwatch={elapsed:0,running:true,ever:true,stopped:false};last=0;render();startFrame()}
  else{state.stopwatch.running=false;state.stopwatch.stopped=true;render()}break;
 case 'exam-watch-grade':{if(!state.stopwatch.stopped)break;const d=Math.abs(time()-5);doneQuest('Зупинка: '+round(time(),2)+' с',d<=.3?15:d<=.6?10:d<=1?5:0);break}
 case 'exam-speed-grade':{const v=parse(get('m02Answer')?.value);if(!state.cart.done||!Number.isFinite(v)){notify('Виміряй час і введи швидкість.');break}const d=Math.abs(v-state.speed);doneQuest('Швидкість: '+round(v,2),d<=.1?30:d<=.25?18:0);break}
 case 'race-a':case 'race-b':state.race.guess=action==='race-a'?'A':'B';render();break;
 case 'race-start':if(state.race.guess!==null&&!state.race.running&&!state.race.finished){state.race.elapsed=0;state.race.running=true;last=0;render();startFrame()}break;
 case 'race-grade':if(state.race.finished)doneQuest('Прогноз: '+state.race.guess,state.race.guess===(state.speed>state.other?'A':'B')?25:0);break;
 case 'pend-short':case 'pend-long':state.pendGuess=action==='pend-short'?'short':'long';render();break;
 case 'pend-grade':{if(state.pendulum.cycles<5)break;const v=parse(get('m02Answer')?.value);if(!Number.isFinite(v)){notify('Введи період.');break}const d=Math.abs(v-period());doneQuest('Період: '+round(v,2)+' с',(state.pendGuess==='short'?15:0)+(d<=.15?15:d<=.3?8:0));break}
 case 'watch':startStopwatch();break;
 case 'watch-reset':
  if(mode==='quest'&&saved.questStage===0&&state.stopwatch.stopped&&state.stopwatch.elapsed>=.5){doneQuest('Секундомір запущено, зупинено й обнулено.');break}
  state.stopwatch={elapsed:0,running:false,ever:false,stopped:false};render();break;
 case 'launch-cart':
  if(comparingCarts()&&state.finishTimes.length>=2){notify('Обидва візки вже фінішували. Порівняй результати.');break}
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
 if(setting==='length'){state.pendulum.length=num;state.pendulum.running=false;state.pendulum.cycles=0;state.pendulum.elapsed=0;state.stopwatch.running=false;state.stopwatch.elapsed=0;state.demoComplete=false}
 state.demoComplete=false;
 const output=e.target.closest('label')?.querySelector('output');
 if(output)output.textContent=round(num,1)+(setting==='speed'?' м/с':' м');
 paint();
});
panel.addEventListener('change',e=>{if(e.target.matches('[data-setting]'))render()});
root.addEventListener('keydown',e=>{
 if(e.key!=='Enter'||!e.target.matches('input[type="text"]'))return;
 e.preventDefault();handle(e.target.id==='m02Predict'?'predict':e.target.id==='m02Period'?'check-period':
  saved.questStage===3?'pend-grade':'exam-speed-grade');
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
 state.pendulum.theta=clamp(Math.atan2(p.x-(mode==='explore'?620:730),p.y-218),-.9,.9);
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