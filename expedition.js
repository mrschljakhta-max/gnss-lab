(function installExpedition(){
'use strict';
const $=id=>document.getElementById(id);
const Q=[
[
[0,'Точний розмір','Вистав довжину 1,50 м.',{length:.5},[['length','=',1.5]]],
[1,'Зміни одиницю','Зроби 1 м і покажи його у сантиметрах.',{length:.5,unit:'m'},[['length','=',1],['unit','=', 'cm']]],
[1,'Міліметровий фініш','Зроби 0,75 м і перейди до міліметрів.',{length:1.5,unit:'km'},[['length','=',.75],['unit','=','mm']]]
],
[
[0,'Чверть секунди','Зроби повний цикл тривалістю 0,25 секунди.',{freq:1},[['freq','=',4]]],
[1,'120 метрів','Доведи кульку рівно до 120 метрів.',{speed:7,time:5},[['distance','=',120]]],
[1,'Новий маршрут','Пройди 150 м зі швидкістю до 15 м/с.',{speed:9,time:5},[['distance','=',150],['speed','<=',15]]]
],
[
[0,'Сім коливань','Вистав генератор на 7 Гц.',{freq:2,amp:.8},[['freq','=',7]]],
[0,'Тихіша хвиля','Зменши амплітуду до 0,4, залишивши 7 Гц.',{freq:7,amp:1},[['amp','=',.4],['freq','=',7]]],
[1,'Почуй биття очима','Досягни різниці частот 1 Гц.',{f1:2,f2:8},[['difference','=',1]]]
],
[
[0,'Скороти хвилю','Зроби довжину хвилі 40 м за швидкості 240 м/с.',{freq:3,v:240},[['wavelength','=',40],['v','=',240]]],
[0,'Зміни середовище','Отримай хвилю довжиною 60 м за швидкості 300 м/с.',{freq:4,v:200},[['wavelength','=',60],['v','=',300]]],
[1,'Поверни промінь','Задай кут падіння 50°.',{angle:15},[['angle','=',50]]]
],
[
[0,'Підніми супутник','Встанови висоту орбіти 20 000 км.',{alt:1500},[['alt','=',20000]]],
[1,'Вузьке небо','Вистав маску видимості 40°.',{mask:5},[['mask','=',40]]],
[1,'Відкрий обрій','Зменши маску видимості до 10°.',{mask:50},[['mask','=',10]]]
],
[
[0,'Північний схід','Перетягни маркер північніше 52° N і східніше 32° E.',{lat:46,lon:23},[['lat','>',52],['lon','>',32]]],
[1,'Два кроки','Встанови +10 км на північ і +10 км на схід.',{north:-18,east:-22},[['north','=',10],['east','=',10]]],
[0,'Знайди сектор','Поверни маркер у сектор 49–51° N, 29–31° E.',{lat:54,lon:38},[['lat','>=',49],['lat','<=',51],['lon','>=',29],['lon','<=',31]]]
],
[
[0,'Додай супутники','Увімкни чотири джерела дальності.',{count:2,noise:0},[['count','=',4]]],
[1,'Зміни геометрію','Розмісти джерела «Скупчено».',{layout:'wide',noise:12},[['layout','=','tight']]],
[1,'Покращ оцінку','Рознеси джерела і знизь шум до 4 або менше.',{layout:'tight',noise:16},[['layout','=','wide'],['noise','<=',4]]]
],
[
[0,'Знайди код','Зрушуй код, поки кореляція не стане 1,00.',{shift:0},[['correlation','=',1]]],
[1,'Зсув годинника','Додай похибку +10 мкс.',{ms:70,bias:-10},[['bias','=',10]]],
[1,'Синхронізуй час','Прибери зсув до 0 мкс і вистав 80 мс.',{ms:65,bias:15},[['bias','=',0],['ms','=',80]]]
],
[
[0,'Розсій точки','Підніми випадкову похибку до 15 м або більше.',{sigma:2,bias:0,samples:40},[['sigma','>=',15]]],
[0,'Змісти середнє','Створи систематичний зсув 12 м або більше.',{sigma:6,bias:0,samples:40},[['bias','>=',12]]],
[1,'Очисти сигнал','Знизь силу відбиття до 0,05 або менше.',{reflection:.9,path:24},[['reflection','<=',.05]]]
]
];
const DEMO=[
[[0,{length:.4},'Предмет короткий'],[0,{length:1.7},'Розтягуємо предмет'],[1,{length:1.7,unit:'mm'},'Той самий розмір — інша одиниця']],
[[0,{freq:1},'Повільні цикли'],[0,{freq:6},'Часті цикли'],[1,{speed:15,time:8},'Рух перетворюється на шлях']],
[[0,{freq:2,amp:.8},'Рідкі коливання'],[0,{freq:8,amp:.8},'Більше коливань'],[1,{f1:5,f2:6},'Биття двох хвиль']],
[[0,{freq:2,v:240},'Довга хвиля'],[0,{freq:8,v:240},'Вкорочуємо хвилю'],[1,{angle:65},'Відбиваємо промінь']],
[[0,{alt:1000},'Низька орбіта'],[0,{alt:20000},'Висока орбіта'],[1,{mask:40},'Відсікаємо супутники']],
[[0,{lat:47,lon:24},'Початкова точка'],[0,{lat:53,lon:36},'Рухаємо маркер'],[1,{north:18,east:26},'Зміщення у кілометрах']],
[[0,{count:2,noise:8},'Мало відстаней'],[0,{count:4,noise:8},'Додаємо джерела'],[1,{layout:'tight',noise:12},'Погіршуємо геометрію']],
[[0,{shift:0},'Шукаємо код'],[0,{shift:5},'Виявляємо збіг'],[1,{ms:70,bias:10},'Помилка годинника']],
[[0,{sigma:2,bias:0,samples:40},'Точки зблизька'],[0,{sigma:17,bias:12,samples:40},'Розкид і зсув'],[1,{reflection:.9,path:24},'Відбитий шлях']]
];
const style=document.createElement('style');
style.textContent=`
#expModes{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin:24px 0 12px}
.exp-mode{display:flex;align-items:center;gap:10px;text-align:left;min-width:0;border:1px solid #35505a;background:#10212a;border-radius:10px;padding:15px;color:#a2bec6;transition:.2s}
.exp-mode:hover{border-color:#a8ef88;transform:translateY(-2px)}
.exp-mode.active{border-color:#b1f378;background:#1c372b;color:#e5f6e0;box-shadow:inset 0 -2px #b1f378}
.exp-mode b{font:700 12px monospace;background:#29483b;border-radius:6px;padding:9px;color:#b8f580}
.exp-mode strong{font-size:14px}.exp-mode small{font:10px monospace;color:#79a194;display:block;margin-top:4px}
#expPanel{margin-bottom:18px}#expPanel .exp-box{padding:18px 21px;border-radius:10px;background:linear-gradient(115deg,#19362c,#132834);border:1px solid #46705b;display:flex;gap:15px;align-items:center;justify-content:space-between}
#expPanel .exp-box h3{font-size:21px;margin:6px 0;color:#ebffdf}
#expPanel .exp-box p{margin:4px 0;color:#b5cfc8;line-height:1.55}
.exp-label{font:700 11px monospace;letter-spacing:.07em;color:#b1f378}
.exp-actions{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.exp-actions button,#expPanel .next-mission{padding:11px 15px;border:1px solid #9de27d;border-radius:7px;background:#b1f378;color:#102317;font-weight:750;cursor:pointer}
.exp-actions button.secondary{background:#1e3834;color:#e4f5df}
.exp-ticks{display:flex;gap:6px;margin:8px 0}.exp-ticks i{height:4px;flex:1;background:#315258;border-radius:5px}.exp-ticks i.done{background:#b1f378}.exp-ticks i.now{background:#77badc}
.exp-quest.passed{border-color:#aceb8a!important;background:#20432f!important}
.exp-quest .exp-status{font:11px monospace;color:#7fabb2}.exp-quest.passed .exp-status{color:#b1f378}
.exp-score{color:#b1f378;font:12px monospace}
body[data-exp-mode="demo"] #experimentTabs,body[data-exp-mode="quest"] #experimentTabs,body[data-exp-mode="demo"] .mission,body[data-exp-mode="quest"] .mission{display:none}
body[data-exp-mode="demo"] .control-column{display:none}body[data-exp-mode="demo"] .lab-body{display:block}body[data-exp-mode="demo"] .canvas-column{width:100%}
body[data-exp-mode="demo"] #scene{pointer-events:none;min-height:360px}
body[data-exp-mode="quest"] .observation{display:none}
body[data-exp-mode="explore"] .mission-hint,body[data-exp-mode="explore"] .observation{display:none}
body[data-exp-mode="quest"] #scene,body[data-exp-mode="explore"] #scene{touch-action:none;cursor:crosshair}
.side-entry.exp-finished .side-sub{color:#b1f378}
@media(max-width:900px){#expModes{gap:5px}.exp-mode{padding:10px 7px;gap:6px}.exp-mode strong{font-size:12px}.exp-mode small{font-size:9px}}
@media(max-width:650px){.exp-mode{flex-direction:column;align-items:flex-start}.exp-mode b{padding:5px}.exp-mode strong{font-size:11px}#expPanel .exp-box{flex-direction:column;align-items:stretch}.exp-actions button{flex:1}}
@media(prefers-reduced-motion:reduce){.exp-mode{transition:none}}
`;
document.head.append(style);
const tabs=document.createElement('div');tabs.id='expModes';tabs.setAttribute('role','tablist');
tabs.innerHTML='<button class="exp-mode" data-mode="demo" role="tab"><b>01</b><span><strong>▶ Демонстрація</strong><small>АНІМОВАНИЙ ПОКАЗ</small></span></button><button class="exp-mode" data-mode="explore" role="tab"><b>02</b><span><strong>✥ Пісочниця</strong><small>3D-МАЙСТЕРНЯ</small></span></button><button class="exp-mode" data-mode="quest" role="tab"><b>03</b><span><strong>◆ Тести</strong><small>ПРАКТИЧНІ МІСІЇ</small></span></button>';
$('modeTabsAnchor').appendChild(tabs);
const panel=document.createElement('div');panel.id='expPanel';$('modePanelAnchor').appendChild(panel);
let mode='explore',snapshot=null,snapshotLab=null,playing=false,raf=0,demoPos=0,demoStart=0,demoDone=false,passed=false,interacted=false;
const KEY='gnss-lab-expeditions-v1';
let wins={};try{wins=JSON.parse(localStorage.getItem(KEY)||'{}')||{}}catch{}
const count=i=>Math.max(0,Math.min(3,Number(wins[i])||0));
const total=()=>topics.reduce((n,_,i)=>n+count(i),0);
/* Mission 01's physically verified practical exam is the first of the
 * original 27 expedition missions; existing modules keep their progress. */
document.addEventListener('gnss:mission-one-complete',event=>{
 if(!event.detail?.completed||count(0)>=1)return;
 wins[0]=1;save();
 drawPanel();
 toast('✓ Перша практична місія підтверджена й записана до журналу.');
});

function save(){try{localStorage.setItem(KEY,JSON.stringify(wins))}catch{}}
function preserve(){snapshot=states[active].map(s=>({...s}));snapshotLab=active}
function restore(){if(snapshot&&snapshotLab!==null){states[snapshotLab][0]={...snapshot[0]};states[snapshotLab][1]={...snapshot[1]}}snapshot=null;snapshotLab=null}
function stop(){playing=false;if(raf)cancelAnimationFrame(raf);raf=0}
function rulesOkay(s,rules){
function value(key){if(key==='distance')return s.speed*s.time;if(key==='difference')return Math.abs(s.f1-s.f2);if(key==='wavelength')return s.v/s.freq;if(key==='correlation')return correlation(s.shift);return s[key]}
return rules.every(([key,op,target])=>{const v=value(key);if(op==='=')return typeof target==='number'?Math.abs(v-target)<.00001:v===target;if(op==='>')return v>target;if(op==='>=')return v>=target;if(op==='<=')return v<=target;return false})
}
function label(){return Array.from({length:3},(_,i)=>`<i class="${i<(mode==='demo'?demoPos:count(active))?'done':i===(mode==='demo'?demoPos:count(active))?'now':''}"></i>`).join('')}
function prepareQuest(){
passed=false;interacted=false;
const step=count(active);if(step>=3)return;
const [exp,,,start]=Q[active][step];
expt=exp;const defaults=Object.fromEntries(topics[active].exps[exp].params.map(p=>[p.key,p.initial]));
states[active][exp]={...defaults,...start};
}
function drawPanel(){
document.body.dataset.expMode=mode;
tabs.querySelectorAll('[data-mode]').forEach(b=>{const sel=b.dataset.mode===mode;b.classList.toggle('active',sel);b.setAttribute('aria-selected',sel?'true':'false')});
$('progressText').textContent=`${total()} / 27`;
$('progressFill').style.width=(total()/27*100)+'%';
$('sidebarNav').querySelectorAll('[data-topic]').forEach(el=>{const i=+el.dataset.topic;const sub=el.querySelector('.side-sub');if(sub)sub.textContent=`${count(i)} / 3 місії${count(i)===3?' ✓':''}`;el.classList.toggle('exp-finished',count(i)===3)});
if(mode==='explore'){panel.innerHTML='<div class="exp-box"><div><span class="exp-label">✥ ВІЛЬНА ПРАКТИКА</span><p>Рухай повзунки, натискай на схему та перетягуй маркери. Обери один із двох експериментів нижче.</p></div><span class="exp-score">18 ВІЛЬНИХ ДОСЛІДІВ</span></div>';return}
if(mode==='demo'){
const d=DEMO[active][demoPos];
panel.innerHTML=`<div class="exp-box"><div><span class="exp-label">▶ АНІМОВАНИЙ УРОК ${demoPos+1}/3</span><h3>${d[2]}</h3><p>Дивись, як змінюється сама модель. Далі повториш рухи власноруч.</p></div><div class="exp-actions"><button data-video="back" class="secondary">←</button><button data-video="toggle">${playing?'Ⅱ Пауза':demoDone?'↻ Повторити':'▶ Показати'}</button><button data-video="forward" class="secondary">→</button></div></div><div class="exp-ticks">${label()}</div>`;return;
}
const step=count(active);
if(step>=3){panel.innerHTML='<div class="exp-box exp-quest passed"><div><span class="exp-label">✦ КВЕСТ ЗАВЕРШЕНО</span><h3>Усі три місії виконано!</h3><p>Можеш перейти до наступної лабораторії або переграти цей квест.</p></div><div class="exp-actions"><button data-quest="replay">↻ Ще раз</button><button data-quest="nextlab">Наступна →</button></div></div><div class="exp-ticks"><i class="done"></i><i class="done"></i><i class="done"></i></div>';return}
const [,name,goal]=Q[active][step];
panel.innerHTML=`<div class="exp-box exp-quest ${passed?'passed':''}"><div><span class="exp-label">◆ МІСІЯ ${step+1}/3 · ${passed?'ЗАВЕРШЕНО':'ТВІЙ ХІД'}</span><h3>${name}</h3><p>${goal}</p><p class="exp-status">${passed?'✓ Модель досягла цілі. Наступну місію відкрито.':'Зміни параметри на стенді. Результат перевіряється автоматично.'}</p></div><div class="exp-actions">${passed?'<button data-quest="next">Далі →</button>':'<span style="color:#a5e57c;font-size:35px">◎</span>'}</div></div><div class="exp-ticks">${label()}</div>`;
}
const originalRender=render;
render=function(){originalRender();drawPanel()};
const originalGoLab=goLab;
goLab=function(i){stop();restore();mode='explore';originalGoLab(i);switchMode('demo')};
function refreshModel(){renderControls();updateScene()}
function setStepDemo(idx,exact=true){
demoPos=Math.max(0,Math.min(2,idx));
const [e,vals]=DEMO[active][demoPos];
if(expt!==e){expt=e;originalRender()}
if(exact)Object.assign(getState(),vals);
updateScene();drawPanel();
}
function animate(now){
if(!playing||mode!=='demo')return;
const i=Math.min(2,Math.floor((now-demoStart)/3100));
if(i!==demoPos){demoPos=i;const e=DEMO[active][i][0];if(expt!==e){expt=e;originalRender()};drawPanel()}
const frameWithin=Math.max(0,Math.min(1,((now-demoStart)-i*3100)/2100));
const eased=frameWithin*frameWithin*(3-2*frameWithin);
const [e,to]=DEMO[active][i];
const from=(i>0&&DEMO[active][i-1][0]===e)?DEMO[active][i-1][1]:Object.fromEntries(topics[active].exps[e].params.map(p=>[p.key,p.initial]));
const s=getState();
for(const [k,v]of Object.entries(to)){const p=topics[active].exps[e].params.find(x=>x.key===k);if(typeof v==='number'){let z=Number(from[k]??p.initial)+(v-Number(from[k]??p.initial))*eased;s[k]=p.step?Math.round(z/p.step)*p.step:z;if(frameWithin>=1)s[k]=v}else if(frameWithin>.6)s[k]=v}
updateScene();
if(now-demoStart>=9300){stop();demoDone=true;drawPanel();return}
raf=requestAnimationFrame(animate)
}
function play(){if(mode!=='demo')return;if(demoDone){demoPos=0;demoDone=false}playing=true;demoStart=performance.now()-demoPos*3100;drawPanel();raf=requestAnimationFrame(animate)}
function switchMode(next){
if(!['demo','explore','quest'].includes(next))return;
stop();restore();mode=next;
if(mode!=='explore')preserve();
if(mode==='quest')prepareQuest();
if(mode==='demo'){demoPos=0;demoDone=false;expt=0}
render();
if(mode==='demo')play()
}
function onInteraction(){
if(mode!=='quest'||passed||count(active)===3)return;
interacted=true;
const [requiredExp,,,,rules]=Q[active][count(active)];
if(expt===requiredExp&&rulesOkay(getState(),rules)){passed=true;drawPanel();toast('◆ Місію виконано! Тисни «Далі».')}
}
tabs.addEventListener('click',e=>{const b=e.target.closest('[data-mode]');if(b)switchMode(b.dataset.mode)});
panel.addEventListener('click',e=>{
const b=e.target.closest('button');if(!b)return;
if(b.dataset.video==='toggle'){if(playing){stop();drawPanel()}else play()}
if(b.dataset.video==='back'){stop();setStepDemo(demoPos-1)}
if(b.dataset.video==='forward'){stop();setStepDemo(demoPos+1)}
if(b.dataset.quest==='next'&&passed){wins[active]=count(active)+1;save();passed=false;prepareQuest();render();toast('Нова практична місія!')}
if(b.dataset.quest==='replay'){wins[active]=0;save();prepareQuest();render()}
if(b.dataset.quest==='nextlab'&&active<topics.length-1)goLab(active+1)
});
$('controls').addEventListener('input',e=>{if(e.target.matches('[data-param]'))onInteraction()});
$('controls').addEventListener('click',e=>{if(e.target.closest('[data-set],[data-action]'))onInteraction()});
let pointer=null;
const scene=$('scene');
scene.addEventListener('pointerdown',e=>{
if(mode==='demo'||e.target.closest('#dragLength,#dragCoord'))return;
pointer=e.pointerId;try{scene.setPointerCapture(pointer)}catch{}
gesture(e);
});
scene.addEventListener('pointermove',e=>{if(pointer===e.pointerId)gesture(e);else if(scene.dataset.dragging==='true'&&mode==='quest')setTimeout(onInteraction,0)});
scene.addEventListener('pointerup',()=>pointer=null);
scene.addEventListener('pointercancel',()=>pointer=null);
function gesture(e){
if(mode==='demo')return;
const root=scene.querySelector('svg');if(!root)return;
const box=root.getBoundingClientRect();if(!box.width)return;
const x=Math.max(0,Math.min(1,(e.clientX-box.left)/box.width)),y=Math.max(0,Math.min(1,(e.clientY-box.top)/box.height));
const s=getState(),ps=topics[active].exps[expt].params;
const set=(key,pos)=>{const p=ps.find(q=>q.key===key);if(!p)return;let v=p.min+(p.max-p.min)*pos;s[key]=Math.max(p.min,Math.min(p.max,Math.round(v/p.step)*p.step));s[key]=+s[key].toFixed(5)};
if(active===0)set('length',x);
if(active===1){if(expt===0)set('freq',x);else{set('speed',x);set('time',1-y)}}
if(active===2){if(expt===0){set('freq',x);set('amp',1-y)}else{set('f1',x);set('f2',1-y)}}
if(active===3){if(expt===0)set('freq',x);else set('angle',x)}
if(active===4){if(expt===0)set('alt',x);else set('mask',1-y)}
if(active===5){if(expt===0){set('lon',x);set('lat',1-y)}else{set('east',x);set('north',1-y)}}
if(active===6){if(expt===0)set('count',x);else{s.layout=x>.5?'tight':'wide';set('noise',1-y)}}
if(active===7){if(expt===0)set('shift',x);else{set('bias',x);set('ms',1-y)}}
if(active===8){if(expt===0){set('sigma',x);set('bias',1-y)}else{set('reflection',x);set('path',1-y)}}
s.touched=true;refreshModel();onInteraction()
}
const originalHelp=help;
help=function(){showModal('Три способи взаємодіяти', '<p><b>01 Демонстрація:</b> анімований показ із паузою та переходом між кадрами.</p><p><b>02 Пісочниця:</b> керуй схемою та повзунками, без запитань.</p><p><b>03 Тести:</b> 3 практичні місії для кожної з 9 тем. Досягни показаної цілі на стенді й перейди далі.</p><p>Усі моделі навчальні й спрощені; реальні супутники не підключені.</p>')};
const originalJournal=journal;
journal=function(){originalJournal();if($('modalContent'))$('modalContent').insertAdjacentHTML('afterbegin',`<div class="notice-card">◆ Квест: ${total()}/27 місій. Прогрес автоматично збережений у цьому браузері.</div>`)};
$('journalOpen').addEventListener('click',()=>{const root=$('modalContent');if(root)root.insertAdjacentHTML('afterbegin','<div class="notice-card">◆ ПРАКТИЧНІ КВЕСТИ: '+total()+' / 27 місій виконано. Прогрес збережений автоматично.</div>')});
$('helpOpen').addEventListener('click',()=>{const root=$('modalContent');if(root)root.innerHTML='<p><b>01 Демонстрація.</b> Натискай відтворення або паузу, перемикай анімовані кадри.</p><p><b>02 Пісочниця.</b> Рухай параметри або взаємодій безпосередньо зі схемою.</p><p><b>03 Тести.</b> Виконай три місії на кожній темі. Далі відкривається тільки після зміни стану моделі — тестів немає.</p><p>Це навчальна симуляція, а не приймач GNSS.</p>'});
switchMode('demo')
})();
