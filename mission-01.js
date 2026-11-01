/* GNSS LAB / Mission 01 — Measure the World
 * Interactive lesson and practical assessment within the EXISTING drafting board.
 * Free sandbox shapes, existing journey and its caliper are intentionally untouched.
 */
(function(){
'use strict';
const board=document.getElementById('engBoard');
const dock=document.getElementById('engTools');
if(!board||!dock)return;
const STORE='gnss-mission-01-v1';
const N=8,MM=3.25,X0=302;
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const parse=s=>Number(String(s).trim().replace(/\s/g,'').replace(',','.'));
const fmt=(v,d=2)=>Number(v).toLocaleString('uk-UA',{maximumFractionDigits:d});
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const specs=[
 {name:'Спостереження',title:'Порівняй деталі',prompt:'Яка довша — A чи B?'},
 {name:'Інструмент',title:'Підготуй штангенциркуль',prompt:'Розкрий губки. Зведи їх до нуля.'},
 {name:'Вимірювання',title:'Виміряй обидві деталі',prompt:'Зведи губки до торців і зчитай показ.'},
 {name:'Одиниці',title:'Зміни одиниці',prompt:'Чи зміниться довжина?'},
 {name:'Масштаб',title:'Зміни масштаб',prompt:'Від метра до кілометра.'},
 {name:'Префікси',title:'Кіло · Мега · Гіга',prompt:'Згрупуй величини по тисячі.'},
 {name:'Закріплення',title:'Перевір себе',prompt:'Три короткі задачі.'},
 {name:'Підсумок',title:'Місію завершено',prompt:''}
];
const tasks=[
 {name:'Виміряй деталь',prompt:'Зведи губки й зчитай шкалу.'},
 {name:'Одиниці',prompt:'Перетвори мм у см.'},
 {name:'Відстань',prompt:'Перетвори км у м.'},
 {name:'Масштаби',prompt:'Перетвори мега в кіло.'}
];
const initial={scene:0,completed:[],skipped:[],assessment:0,passed:false,assessmentAttempts:0};
let memory={...initial};
try{
 const p=JSON.parse(localStorage.getItem(STORE)||'{}');
 if(p&&typeof p==='object'){
  memory={...initial,...p,scene:clamp(Number(p.scene)||0,0,7),assessment:clamp(Number(p.assessment)||0,0,4),
   completed:Array.isArray(p.completed)?p.completed.filter(x=>Number.isInteger(x)&&x>=0&&x<7):[],
   skipped:Array.isArray(p.skipped)?p.skipped.filter(x=>Number.isInteger(x)&&x>=0&&x<7):[],
   passed:!!p.passed};
 }
}catch{}
let mode='',visible=false,part='a',gap=78,caliperChosen=false,moved=false,choice='',
 answers={},unitsIndex=0,zoomIndex=0,prefixIndex=0,seenScale=new Set(),seenPrefix=new Set(),
 hintLevel=0,feedback='',feedbackSuccess=false,dragId=null,roundAttempts=0,
 practiceIndex=0,practiced=new Set(),assessmentTarget=42,assessmentSeed=0;
const root=document.createElement('section');
root.id='gnssMissionV1';
root.hidden=true;
root.setAttribute('aria-label','GNSS LAB — Місія 01: Виміряй світ');
root.innerHTML=
 '<header class="m01-header"><div class="m01-kicker" id="m01Kicker"></div><h2 id="m01Title"></h2><p id="m01Prompt"></p></header>'+
 '<div class="m01-guidance" id="m01Guidance" role="status" aria-live="polite"></div>'+
 '<svg id="m01Canvas" class="m01-canvas" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 660" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Інтерактивна навчальна сцена"></svg>'+
 '<div class="m01-controls" id="m01Controls"></div>'+
 '<div class="m01-feedback" id="m01Feedback" role="status" aria-live="polite"></div>'+
 '<footer class="m01-footer"><div class="m01-footer-left"><button type="button" data-act="hint" title="Підказка" aria-label="Підказка">?</button><button type="button" data-act="repeat" title="Повторити крок" aria-label="Повторити крок">↻</button></div>'+
 '<div class="m01-footer-right"><span id="m01Progress"></span><button type="button" data-act="skip" id="m01Skip">Пропустити</button><button type="button" data-act="next" id="m01Next" class="m01-primary">Далі →</button></div></footer>';
board.append(root);
const el=id=>root.querySelector('#'+id),canvas=el('m01Canvas'),controls=el('m01Controls'),feedbackEl=el('m01Feedback');
const draw=(s)=>canvas.innerHTML=s;
const persist=()=>{try{localStorage.setItem(STORE,JSON.stringify(memory))}catch{}};
function resetStep(){
 part='a';gap=78;caliperChosen=false;moved=false;choice='';answers={};unitsIndex=0;zoomIndex=0;prefixIndex=0;
 seenScale=new Set();seenPrefix=new Set();hintLevel=0;feedback='';feedbackSuccess=false;
 dragId=null;roundAttempts=0;practiceIndex=0;practiced=new Set();
 if(mode==='quest'){assessmentSeed=Math.min(4,Math.max(0,Number(memory.assessmentAttempts)||0)%5);
  assessmentTarget=[42,47,63,38,69][assessmentSeed];gap=assessmentTarget+24;}
 if(mode==='demo'&&memory.scene===2)gap=70;
 if(mode==='demo'&&memory.scene===6)gap=66;
 if(mode==='demo'&&memory.scene===1)gap=12;
}
function target(){
 if(mode==='quest')return assessmentTarget;
 if(memory.scene===2)return part==='a'?50:54;
 if(memory.scene===6)return 42;
 return 50;
}
function canMeasure(){return caliperChosen&&moved&&Math.abs(gap-target())<.001}
function sceneComplete(){
 if(mode==='quest')return memory.assessment>=4;
 switch(memory.scene){
  case 0:return !!choice;
  case 1:return caliperChosen&&moved&&gap===0;
  case 2:return answers.a===50&&answers.b===54;
  case 3:return unitsIndex>=3;
  case 4:return seenScale.size>=4&&answers.km===1;
  case 5:return seenPrefix.size>=3&&prefixIndex>=2;
  case 6:return practiceIndex>=3;
  case 7:return true;
 }
 return false;
}
function announce(message,success=false){feedback=message;feedbackSuccess=success;renderFeedback();}
function renderFeedback(){
 feedbackEl.textContent=feedback;
 feedbackEl.classList.toggle('m01-positive',feedbackSuccess);
 feedbackEl.hidden=!feedback;
}
function completed(){return memory.completed.includes(memory.scene)||sceneComplete()}
function success(message){
 const msg=message||'✓ Чудово. Перевір результат і переходь далі.';
 announce(msg,true);
 if(mode==='demo'&&memory.scene<7){
  if(!memory.completed.includes(memory.scene)){memory.completed.push(memory.scene);persist()}
 }
}
function promptInput(label,placeholder,unit=''){
 return '<label class="m01-answer">'+escape(label)+'<span class="m01-field"><input id="m01Value" type="text" inputmode="decimal" autocomplete="off" placeholder="'+escape(placeholder)+'" aria-label="'+escape(label)+'" /><em>'+escape(unit)+'</em></span></label>';
}
const selectButton=(name,id,selected=false)=>'<button type="button" class="m01-pill'+(selected?' active':'')+'" data-act="'+name+'">'+escape(id)+'</button>';
function schematic(){
 const grid='<defs>'+
 '<pattern id="m01Grid" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M20 0H0V20" stroke="#9ecbd8" stroke-opacity=".12" stroke-width="1" fill="none"/></pattern>'+
 '<linearGradient id="m01Steel" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f2f7f7"/><stop offset=".24" stop-color="#b5c5cc"/><stop offset=".7" stop-color="#6a8393"/><stop offset="1" stop-color="#d2e4e6"/></linearGradient>'+
 '<linearGradient id="m01Dark" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#4e7484"/><stop offset="1" stop-color="#153749"/></linearGradient>'+
 '</defs><rect width="1200" height="660" fill="url(#m01Grid)" pointer-events="none"/>';
 return grid;
}
function blockSvg(x,y,w,title,selected=false,dim=true){
 return '<g><rect x="'+(x+8)+'" y="'+(y+12)+'" width="'+w+'" height="96" rx="5" fill="#041627" opacity=".35"/>'+
 '<rect x="'+x+'" y="'+y+'" width="'+w+'" height="96" rx="4" fill="url(#m01Steel)" stroke="'+(selected?'#b7f58d':'#d0e1e5')+'" stroke-width="'+(selected?3:1.5)+'"/>'+
 '<path d="M'+(x+8)+' '+(y+10)+'h'+(w-16)+'" stroke="#e8f5f6" stroke-opacity=".85" stroke-width="2"/>'+
 (dim?'<text x="'+(x+w/2)+'" y="'+(y-20)+'" fill="#ddf3ef" font-size="19" font-weight="600" text-anchor="middle">'+title+'</text>':'')+'</g>';
}
function overviewScene(){
 let s=schematic();
 s+=blockSvg(350,242,50*MM,'Деталь A',choice==='a');
 s+=blockSvg(665,242,54*MM,'Деталь B',choice==='b');
 s+='<text x="600" y="410" fill="#a9d1dc" text-anchor="middle" font-size="18">Розміри не показані — їх потрібно виміряти.</text>';
 return s;
}
function caliperScene(calTarget,calGap,showBlock=true){
 let s=schematic();const jawX=X0+calGap*MM,contact=Math.abs(calGap-calTarget)<.001;
 if(showBlock){
  s+=blockSvg(X0,262,calTarget*MM,'',contact,false);
  s+='<text x="'+(X0+calTarget*MM/2)+'" y="245" fill="#ddeef3" text-anchor="middle" font-size="17">'+(mode==='quest'?'Невідома деталь':memory.scene===6?'Нова деталь':part==='a'?'Деталь A':'Деталь B')+'</text>';
 }
 // Accurate 1 mm tick spacing: one millimetre equals MM scene units.
 s+='<g class="m01-caliper" aria-label="Механічний штангенциркуль із основною шкалою">'+
  '<rect x="'+(X0-38)+'" y="410" width="608" height="56" rx="4" fill="url(#m01Steel)" stroke="#dce9eb" stroke-width="2"/>'+
  '<rect x="'+(X0-38)+'" y="465" width="608" height="8" fill="#466272"/>'+
  '<path d="M'+(X0-15)+' 405V265H'+X0+'V405Z" fill="url(#m01Steel)" stroke="#e4f1f2" stroke-width="2"/>'+
  '<path d="M'+(jawX-14)+' 405V265H'+jawX+'V405Z" fill="url(#m01Steel)" stroke="#e4f1f2" stroke-width="2"/>'+
  '<rect x="'+(jawX-23)+'" y="405" width="76" height="76" rx="3" fill="url(#m01Dark)" stroke="#d1e6ed" stroke-width="2"/>';
 for(let i=0;i<=170;i++){
  const px=X0+i*MM,major=i%10===0,half=i%5===0;
  s+='<line x1="'+px+'" x2="'+px+'" y1="414" y2="'+(major?441:half?432:424)+'" stroke="#244559" stroke-width="'+(major?1.8:1.05)+'"/>';
  if(major)s+='<text x="'+px+'" y="455" text-anchor="middle" font-size="11" font-weight="700" fill="#183e51">'+i+'</text>';
 }
 // vernier engraved on slider, no automatic numeric shortcut.
 for(let i=0;i<=10;i++){const px=jawX+i*MM*.9;
  s+='<line x1="'+px+'" x2="'+px+'" y1="479" y2="'+(i%5===0?493:486)+'" stroke="#dbeaf0" stroke-width="1.6"/>';
 }
 s+='<rect x="'+(jawX+13)+'" y="482" width="29" height="24" rx="7" fill="#becbd1" stroke="#567887" stroke-width="2"/>'+
 '<circle cx="'+(jawX+27)+'" cy="494" r="5" fill="#648192"/>';
 if(contact&&showBlock)s+='<path d="M'+X0+' 266V358 M'+(X0+calTarget*MM)+' 266V358" stroke="#b8f78c" stroke-width="4" opacity=".8"/>';
 if(contact&&!showBlock)s+='<circle cx="'+X0+'" cy="284" r="10" fill="none" stroke="#b7f88b" stroke-width="2"/>';
 s+='</g>';
 const min=showBlock?calTarget:0;
 // Accessible handle: pointer drag + arrow keys (0.1 mm).
 s+='<rect x="'+(jawX-25)+'" y="267" width="82" height="247" fill="transparent" data-jaw="true" class="m01-drag-jaw" tabindex="0" role="slider" aria-label="Рухома каретка штангенциркуля" aria-valuemin="'+min+'" aria-valuemax="160" aria-valuenow="'+calGap.toFixed(1)+'" aria-valuetext="'+(contact?'Контакт':'Губки розкриті')+'"/>';
 s+='<text x="600" y="559" text-anchor="middle" fill="#bbd8df" font-size="16">Перетягни каретку або скористайся стрілками ← →</text>';
 return s;
}
function conversionScene(){
 let s=schematic();
 s+=blockSvg(450,245,50*MM,'',false,false);
 s+='<path d="M450 355V392M'+(450+50*MM)+' 355V392M450 376H'+(450+50*MM)+'" stroke="#c5e9e9" stroke-width="2"/>';
 s+='<text x="530" y="426" font-size="24" fill="#e1f6fa" text-anchor="middle">Та сама довжина</text>';
 return s;
}
function scaleScene(){
 let s=schematic();
 s+='<text x="600" y="235" font-size="20" fill="#e1f4f7" text-anchor="middle">Один і той самий екран — різний масштаб огляду</text>';
 const labels=['1 м','10 м','100 м','1 000 м'];
 const barX=285,barW=630;
 s+='<line x1="'+barX+'" y1="355" x2="'+(barX+barW)+'" y2="355" stroke="#b6f98a" stroke-width="5"/>';
 for(let i=0;i<=10;i++){const x=barX+barW*i/10;
  s+='<line x1="'+x+'" y1="342" x2="'+x+'" y2="'+(i%5===0?380:370)+'" stroke="#d6eff0" stroke-width="2"/>';}
 s+='<text x="285" y="402" fill="#d2eef2" font-size="18">0</text><text x="916" y="402" text-anchor="end" fill="#d2eef2" font-size="18">'+labels[zoomIndex]+'</text>';
 return s;
}
function prefixScene(){
 let s=schematic();
 const blocks=prefixIndex===0?3:prefixIndex===1?6:9;
 const label=['КІЛО · 10³','МЕГА · 10⁶','ГІГА · 10⁹'][prefixIndex];
 s+='<text x="600" y="222" fill="#e6f5f8" font-size="32" font-weight="700" text-anchor="middle">'+label+'</text>';
 for(let i=0;i<blocks;i++){
  const x=445+(i%3)*110,y=267+Math.floor(i/3)*79;
  s+='<rect x="'+x+'" y="'+y+'" width="95" height="59" rx="5" fill="#6d93a5" fill-opacity=".45" stroke="#c4e8e8" stroke-width="1.5"/>'+
   '<rect x="'+(x+9)+'" y="'+(y+10)+'" width="77" height="39" fill="#9fcf96" fill-opacity=".40"/>';
 }
 s+='<text x="600" y="545" fill="#c7e2e9" font-size="15" text-anchor="middle">Один блок символізує групу одиниць, а не їхню кількість на екрані.</text>';
 return s;
}
function summaryScene(){
 let s=schematic(),done=mode==='quest'?memory.passed||memory.assessment>=4:memory.completed.length===7;
 if(done){
  s+='<circle class="m01-final-ring" cx="600" cy="335" r="75" fill="#245b45" fill-opacity=".32" stroke="#b4f68f" stroke-width="3"/>'+
   '<path class="m01-final-check" d="M553 340l34 32 65-73" fill="none" stroke="#c1ff9a" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>';
 }else{
  s+='<circle cx="600" cy="335" r="72" fill="#20435b" fill-opacity=".28" stroke="#8bbaca" stroke-width="2"/>'+
   '<path d="M601 304v66M569 338h64" fill="none" stroke="#cee9eb" stroke-width="5" stroke-linecap="round"/>';
 }
 return s;
}
function mainScene(){
 if(mode==='quest'){
  if(memory.assessment===0)return caliperScene(assessmentTarget,gap);
  if(memory.assessment===1)return conversionScene();
  if(memory.assessment===2)return scaleScene();
  if(memory.assessment===3)return prefixScene();
  return summaryScene();
 }
 const scene=memory.scene;
 if(scene===0)return overviewScene();
 if(scene===1)return caliperScene(0,gap,false);
 if(scene===2)return caliperScene(target(),gap);
 if(scene===3)return conversionScene();
 if(scene===4)return scaleScene();
 if(scene===5)return prefixScene();
 if(scene===6&&practiceIndex===0)return caliperScene(42,gap);
 if(scene===6&&practiceIndex===1)return conversionScene();
 if(scene===6&&practiceIndex===2)return prefixScene();
 return summaryScene();
}
function controlView(){
 const quest=mode==='quest',step=quest?memory.assessment:memory.scene;
 if(quest&&step>=4)return '';
 if(!quest&&step===7)return '';
 if(!quest&&step===0)return ''+
  '<div class="m01-buttons">'+selectButton('choose-a','Деталь A',choice==='a')+selectButton('choose-b','Деталь B',choice==='b')+'</div>';
 if((!quest&&(step===1||step===2||step===6&&practiceIndex===0))||(quest&&step===0)){
  const isZero=!quest&&step===1,measurement=!isZero;
  let content='';
  if(!caliperChosen)content+='<button type="button" data-act="caliper" class="m01-pill">Взяти штангенциркуль</button>';
  if(!isZero&&!quest&&step===2){
   content+='<div class="m01-buttons">'+selectButton('part-a','Деталь A',part==='a')+selectButton('part-b','Деталь B',part==='b')+'</div>';
   content+='<span class="m01-dots" aria-label="Виміряні деталі">'+(answers.a===50?'✓ A':'○ A')+' · '+(answers.b===54?'✓ B':'○ B')+'</span>';
  }
  const contact=isZero?gap===0:Math.abs(gap-target())<.001;
  if(caliperChosen)content+='<label class="m01-sr-only" for="m01JawRange">Рухома каретка</label>'+
   '<input type="range" id="m01JawRange" min="'+(isZero?0:target())+'" max="160" step="0.1" value="'+gap+'" aria-label="Положення рухомої губки"/>';
  if(measurement&&contact&&caliperChosen)content+=promptInput('Що показує шкала?','Введи відлік','мм')+'<button type="button" class="m01-submit" data-act="check">Перевірити вимірювання</button>';

  return content;
 }
 if(!quest&&step===3){
  const q=[['50 мм = ? см','см'],['120 мм = ? см','см'],['50 мм = ? м','м']][Math.min(unitsIndex,2)];
  return '<div class="m01-control-title">Перетворення '+(unitsIndex+1)+'/3</div>'+
   promptInput(q[0],'Твоє значення',q[1])+'<button type="button" class="m01-submit" data-act="check">Перевірити</button>';
 }
 if(!quest&&step===4){
  const labels=['1 метр','10 метрів','100 метрів','1 000 метрів'];
  return '<div class="m01-control-title">Вибери масштаб огляду</div><div class="m01-buttons">'+
   labels.map((l,i)=>selectButton('scale-'+i,l,zoomIndex===i)).join('')+'</div>'+
   '<span class="m01-dots" aria-label="Переглянуті масштаби">'+seenScale.size+'/4 ✓</span>'+
   (seenScale.size===4?promptInput('1 000 м = скільки км?','Введи значення','км')+
    '<button type="button" class="m01-submit" data-act="check">Перевірити</button>':'');
 }
 if(!quest&&step===5){
  const labels=['Кіло ×1 000','Мега ×1 000 000','Гіга ×1 000 000 000'];
  return '<div class="m01-control-title">Переглянь три десяткові масштаби</div><div class="m01-buttons">'+
   labels.map((l,i)=>selectButton('prefix-'+i,l,prefixIndex===i)).join('')+'</div>'+
   '<span class="m01-dots" aria-label="Переглянуті множники">'+seenPrefix.size+'/3 ✓</span>'+
   (seenPrefix.size===3?promptInput(prefixIndex>-1&&unitsIndex===0?'3 М = скільки к?':'2 Г = скільки М?','Введи число',unitsIndex===0?'к':'М')+
    '<button type="button" class="m01-submit" data-act="check">Перевірити</button>':'');
 }
 if(!quest&&step===6){
  return practiceIndex===1?'<div class="m01-control-title">Задача 2 / 3</div>'+
   promptInput('75 мм = скільки см?','Введи значення','см')+'<button type="button" class="m01-submit" data-act="check">Перевірити</button>':
   '<div class="m01-control-title">Задача 3 / 3</div>'+
   promptInput('4 М = скільки к?','Введи значення','к')+'<button type="button" class="m01-submit" data-act="check">Перевірити</button>';
 }
 if(quest&&step===1){
  return '<div class="m01-control-title">Нова величина</div>'+promptInput('86 мм = скільки см?','Введи результат','см')+'<button type="button" class="m01-submit" data-act="check">Зафіксувати відповідь</button>';
 }
 if(quest&&step===2){
  return '<div class="m01-control-title">Нова величина</div>'+promptInput('2,5 км = скільки метрів?','Введи результат','м')+'<button type="button" class="m01-submit" data-act="check">Зафіксувати відповідь</button>';
 }
 if(quest&&step===3){
  return '<div class="m01-control-title">Нова величина</div>'+promptInput('3 М = скільки к?','Введи результат','к')+'<button type="button" class="m01-submit" data-act="check">Зафіксувати відповідь</button>';
 }
 return '';
}
function guidance(){
 if(mode==='quest')return '';
 const msgs=[
  'Спочатку припущення, потім вимірювання. Помилятися дозволено.',
  caliperChosen?'Тягни каретку вправо, а потім до нуля — або скористайся клавіатурою.':'У нижній панелі є реальний інструмент. Можна вибрати його там або натиснути «Взяти».',
  'Число треба зчитати зі шкали самостійно. Контакт губок підтверджує, що вимірювання можливе.',
  '50 мм і 5 см — та сама довжина. Змінюється її числовий запис.',
  'Масштаб зображення і одиниця вимірювання — різні речі.',
  'Переходи k → M → G щоразу означають множення на тисячу.',
  'Спробуй сам: це ще тренування, підказки доступні.',
  'Готово! Тепер закріпи навички в режимі «Тести».'
 ];
 return msgs[memory.scene]||'';
}
function render(){
 if(!visible)return;
 const quest=mode==='quest',current=quest?memory.assessment:memory.scene;
 const spec=quest?tasks[Math.min(current,3)]:specs[current];
 const trainingFinished=memory.completed.length===7;
 el('m01Kicker').textContent=quest?'ПРАКТИЧНИЙ ЗАЛІК · МІСІЯ 01 · '+Math.min(current+1,4)+'/4':
  'НАВЧАННЯ · МІСІЯ 01 · '+(current+1)+'/8';
 el('m01Title').textContent=quest?(current===4?'Залік складено':spec.name):
  current===7?(trainingFinished?'Місія виконана':'Маршрут переглянуто'):spec.title;
 el('m01Prompt').textContent=quest?(current===4?'4/4 підтверджено':spec.prompt):current===7?'':spec.prompt;
 el('m01Guidance').textContent=hintLevel>0&&!quest?hintMessage():'';
 draw(mainScene());
 controls.innerHTML=controlView();
 controls.hidden=!controls.innerHTML.trim();
 renderFeedback();
 const next=el('m01Next'),skip=el('m01Skip'),hint=root.querySelector('[data-act="hint"]');
 const replay=root.querySelector('[data-act="repeat"]');
 const allowed=quest?current>=4:sceneComplete()||memory.completed.includes(current);
 next.hidden=quest&&current<4;
 next.disabled=!allowed;
 next.textContent=quest?'Пісочниця →':current===7?'До заліку →':'Далі →';
 skip.hidden=quest||current===7;hint.hidden=quest||current===7;
 replay.hidden=quest||current===7;
 el('m01Progress').textContent=quest?'✓ '+Math.min(current,4)+'/4':
  '✓ '+memory.completed.length+'/7';
}
function hintMessage(){
 const stage=memory.scene;
 const hints=[
  ['Обери A або B. Це лише припущення.','Спробуй порівняти торці брусків.','Натисни на одну з кнопок вибору деталі.'],
  ['Знайди штангенциркуль серед інструментів.','Його можна взяти кнопкою в цій сцені.','Потягни каретку вправо, потім вліво до позначки 0.'],
  ['Встанови вимірювальний інструмент.','Зсунь рухому губку до торця деталі.','Подивись на основну шкалу — потрібне число відповідає нулю рухомої каретки.'],
  ['У сантиметрі 10 міліметрів.','Щоб перейти з мм у см, число поділи на 10.','Для метрів поділи міліметри на 1 000.'],
  ['Відкрий усі масштаби.','Кіло означає тисячу.','1 000 м дорівнює 1 км.'],
  ['Переглянь k, M і G.','Кожен перехід між ними — множник 1 000.','3 М = 3 000 к; 2 Г = 2 000 М.'],
  ['Почни з вимірювання невідомої деталі.','Після вимірювання перетвори сантиметри.','Перехід М → к множить число на 1 000.']
 ];
 return (hints[Math.min(stage,6)]||[])[Math.min(hintLevel-1,2)]||'';
}
function setScene(index){
 memory.scene=clamp(index,0,7);persist();resetStep();render();
}
function setAssessment(index){
 memory.assessment=clamp(index,0,4);persist();resetStep();render();
}
function onSuccess(){
 if(mode==='quest'){
  const next=memory.assessment+1;
  setAssessment(next);
  if(next===4){
   memory.passed=true;persist();
   document.dispatchEvent(new CustomEvent('gnss:mission-one-complete',{detail:{mission:1,completed:true,attempts:memory.assessmentAttempts}}));
   announce('✓ Практичний залік завершено. Усі чотири навички підтверджено.',true);
  }else announce('✓ Правильно! Наступна практична задача.',true);
 }else if(memory.scene===6){
  practiceIndex+=1;gap=66;caliperChosen=false;moved=false;
  if(practiceIndex===3){success('✓ Усі три тренувальні задачі виконано.');}
  else{announce('✓ Виконано. Наступна вправа.',true)}
  render();
 }else success();
}
function check(){
 const text=controls.querySelector('#m01Value'),value=text?parse(text.value):NaN;
 if(!Number.isFinite(value)){announce('Введи числовий результат вимірювання або перетворення.');return}
 let expected=null;
 if(mode==='quest'){
  expected=[assessmentTarget,8.6,2500,3000][memory.assessment];
  if(memory.assessment===0&&!canMeasure()){announce('Спочатку правильно встанови та зведи губки до контакту.');return}
 }else if(memory.scene===2){
  if(!canMeasure()){announce('Вимірювання зараховується лише після контакту губок.');return}
  expected=target();
 }else if(memory.scene===3)expected=[5,12,0.05][unitsIndex];
 else if(memory.scene===4)expected=1;
 else if(memory.scene===5)expected=[3000,2000][Math.min(unitsIndex,1)];
 else if(memory.scene===6){
  if(practiceIndex===0){if(!canMeasure()){announce('Спочатку зведи губки до контакту.');return}expected=42}
  if(practiceIndex===1)expected=7.5;
  if(practiceIndex===2)expected=4000;
 }
 const tolerance=Math.abs(expected)>=30?(mode==='quest'&&memory.assessment===0?0.5:0.5):0.00001;
 if(expected===null||Math.abs(value-expected)>tolerance){
  roundAttempts++;if(mode==='quest'){memory.assessmentAttempts++;persist()}
  announce('Поки не збігається. Перевір шкалу, одиницю або десятковий множник.');
  return;
 }
 if(mode==='quest'){onSuccess();return}
 if(memory.scene===2){
  answers[part]=target();
  const doneA=answers.a===50,doneB=answers.b===54;
  if(doneA&&doneB){
   success('✓ A = 50 мм, B = 54 мм. Твій висновок можна перевірити вимірюванням.');
  }else{part=doneA?'b':'a';gap=target()+20;caliperChosen=true;moved=false;
   announce('✓ Першу деталь виміряно. Тепер виміряй другу.',true)}
  render();return;
 }
 if(memory.scene===3){unitsIndex+=1;if(unitsIndex>=3)success('✓ 50 мм = 5 см = 0,05 м. Розмір не змінився.');else announce('✓ Правильно. Спробуй ще одну одиницю.',true);}
 if(memory.scene===4){answers.km=1;success('✓ 1 000 м = 1 км. Зміна одиниці не змінює відстань.')}
 if(memory.scene===5){unitsIndex+=1;if(unitsIndex>=2)success('✓ Мега = 1 000 кіло, гіга = 1 000 мега.');else announce('✓ Правильно. Залишився ще один масштаб.',true)}
 if(memory.scene===6){onSuccess();return}
 render();
}
function updateGap(v,passive=false){
 if(!caliperChosen)return;
 const min=mode==='quest'?assessmentTarget:memory.scene===1?0:memory.scene===2?target():42;
 const newGap=Math.round(clamp(v,min,160)*10)/10;
 if(Math.abs(gap-newGap)>.001)moved=true;
 gap=newGap;
 if(mode==='demo'&&memory.scene===1&&gap===0&&moved)success('✓ Каретку зведено до нуля. Тепер можна вимірювати.');
 if(passive){draw(mainScene());return}
 render();
}
function respond(act){
 if(act==='hint'){hintLevel=Math.min(3,hintLevel+1);render();return}
 if(act==='show'){hintLevel=3;render();return}
 if(act==='skip'&&mode==='demo'){if(!memory.skipped.includes(memory.scene))memory.skipped.push(memory.scene);setScene(memory.scene+1);return}
 if(act==='next'){
  if(mode==='quest'&&memory.assessment===4){document.querySelector('#expModes [data-mode="explore"]')?.click();return}
  if(mode==='demo'&&sceneComplete()){
   if(memory.scene===7){document.querySelector('#expModes [data-mode="quest"]')?.click();return}
   setScene(memory.scene+1);
  }
  return;
 }
 if(act==='repeat'){resetStep();render();return}
 if(act==='caliper'){caliperChosen=true;gap=mode==='quest'?assessmentTarget+24:memory.scene===1?12:memory.scene===6?66:target()+20;announce('✓ Інструмент готовий. Рухай каретку до контакту.',true);render();return}
 if(act==='choose-a'||act==='choose-b'){choice=act.slice(-1);success('Припущення збережено. Тепер перевір його вимірюванням.');render();return}
 if(act==='part-a'||act==='part-b'){part=act.slice(-1);gap=target()+20;moved=false;feedback='';render();return}
 if(act.startsWith('scale-')){zoomIndex=Number(act.slice(6));seenScale.add(zoomIndex);render();return}
 if(act.startsWith('prefix-')){prefixIndex=Number(act.slice(7));seenPrefix.add(prefixIndex);render();return}
 if(act==='check'){check();return}
}
root.addEventListener('click',e=>{
 const button=e.target.closest('button[data-act]');if(button)respond(button.dataset.act);
});
root.addEventListener('keydown',e=>{
 if(e.key==='Enter'&&e.target.id==='m01Value'){e.preventDefault();check()}
});
root.addEventListener('input',e=>{
 if(e.target.id==='m01JawRange')updateGap(Number(e.target.value),true);
});
root.addEventListener('change',e=>{
 if(e.target.id==='m01JawRange')render();
});
dock.addEventListener('click',e=>{
 if(!visible||((mode==='demo'&&![1,2,6].includes(memory.scene))||(mode==='quest'&&memory.assessment!==0)))return;
 const b=e.target.closest('button[data-tool="caliper"]');
 if(!b)return;
 // The training station owns the measurement: don't trigger the free-drafting tool.
 e.preventDefault();e.stopImmediatePropagation();
 respond('caliper');
},{capture:true});
function clientToSvg(event){
 const p=canvas.createSVGPoint();p.x=event.clientX;p.y=event.clientY;
 const mat=canvas.getScreenCTM();return mat?p.matrixTransform(mat.inverse()):null;
}
canvas.addEventListener('pointerdown',e=>{
 if(!visible||e.button!==0||!e.target.closest('[data-jaw]'))return;
 if(!caliperChosen)return;
 dragId=e.pointerId;e.preventDefault();
 try{canvas.setPointerCapture(dragId)}catch{}
 const p=clientToSvg(e);if(p)updateGap((p.x-X0)/MM,true);
});
canvas.addEventListener('pointermove',e=>{
 if(dragId!==e.pointerId)return;
 const p=clientToSvg(e);if(p)updateGap((p.x-X0)/MM,true);
});
function release(e){
 if(dragId!==e.pointerId)return;
 dragId=null;try{canvas.releasePointerCapture(e.pointerId)}catch{}
 render();
}
canvas.addEventListener('pointerup',release);canvas.addEventListener('pointercancel',release);
canvas.addEventListener('keydown',e=>{
 if(!e.target.closest('[data-jaw]')||!['ArrowLeft','ArrowRight','PageUp','PageDown'].includes(e.key))return;
 e.preventDefault();
 const delta=e.key==='ArrowLeft'?-0.1:e.key==='ArrowRight'?0.1:e.key==='PageDown'?-1:1;
 updateGap(gap+delta);
 canvas.querySelector('[data-jaw]')?.focus({preventScroll:true});
});
function show(nextMode){
 visible=true;mode=nextMode;root.hidden=false;
 document.body.classList.add('gnss-mission-active');
 window.GNSSLab01Journey?.close?.();
 const legacy=document.getElementById('jRestoreRoute');if(legacy)legacy.hidden=true;
 resetStep();render();
}
function hide(){
 if(!visible)return;
 visible=false;root.hidden=true;document.body.classList.remove('gnss-mission-active');
 const legacy=document.getElementById('jRestoreRoute');
 if(legacy&&document.body.dataset.expMode==='explore')legacy.hidden=false;
}
function sync(){
 const next=document.body.dataset.expMode||'demo';
 const active=document.body.classList.contains('engineering-live');
 if(!active||!['demo','quest'].includes(next)){hide();return}
 if(!visible||mode!==next)show(next);
}
new MutationObserver(sync).observe(document.body,{attributes:true,attributeFilter:['class','data-exp-mode']});
window.GNSSLab01MissionV1={
 get active(){return visible},get scene(){return memory.scene},
 get assessment(){return memory.assessment},get passed(){return memory.passed},
 restart(){
  if(mode==='quest'){memory.assessment=0;memory.assessmentAttempts++;persist()}
  else {memory.scene=0;memory.completed=[];memory.skipped=[];persist()}
  resetStep();if(visible)render();
 }
};
sync();
})();
