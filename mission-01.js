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
 {name:'Спостереження',title:'Який брусок довший?',prompt:'Натисни на той, що здається довшим.'},
 {name:'Інструмент',title:'Підготуй штангенциркуль',prompt:'Розкрий губки. Зведи їх до нуля.'},
 {name:'Вимірювання',title:'Виміряй обидві деталі',prompt:'Зведи губки до торців і зчитай показ.'},
 {name:'Одиниці',title:'Зміни одиниці',prompt:'Натисни «см», потім «м». Подивись, як змінюється шкала.'},
 {name:'Масштаб',title:'Зміни масштаб',prompt:'Від метра до кілометра.'},
 {name:'Префікси',title:'Від нано до гіга',prompt:'Натисни ×1 000, щоб побачити дедалі менші проміжки часу.'},
 {name:'Закріплення',title:'Обертай і вимірюй',prompt:'Поверни брусок і виміряй довжину, ширину та товщину.'},
 {name:'Підсумок',title:'Місію завершено',prompt:''}
];
const tasks=[
 {name:'Виміряй деталь',prompt:'Зведи губки й зчитай шкалу.'},
 {name:'Одиниці',prompt:'Перетвори мм у см.'},
 {name:'Відстань',prompt:'Перетвори км у м.'},
 {name:'Частота',prompt:'Перетвори мегагерци в кілогерци.'}
];
// One wooden specimen (millimetres); the caliper measures each horizontal face.
const DIMENSIONS=[
 {id:'length',name:'Довжина',mm:42,face:'верхня грань'},
 {id:'width',name:'Ширина',mm:28,face:'поворот на 90°'},
 {id:'thickness',name:'Товщина',mm:18,face:'бічна грань'}
];
const initial={scene:0,completed:[],skipped:[],assessment:0,passed:false,assessmentAttempts:0,dimensionProgress:{}};
const firstUnfinished=()=>{for(let i=0;i<7;i++)if(!memory.completed.includes(i))return i;return 7};
let memory={...initial};
try{
 const p=JSON.parse(localStorage.getItem(STORE)||'{}');
 if(p&&typeof p==='object'){
  memory={...initial,...p,scene:clamp(Number(p.scene)||0,0,7),assessment:clamp(Number(p.assessment)||0,0,4),
   completed:Array.isArray(p.completed)?p.completed.filter(x=>Number.isInteger(x)&&x>=0&&x<7):[],
   skipped:Array.isArray(p.skipped)?p.skipped.filter(x=>Number.isInteger(x)&&x>=0&&x<7):[],
   passed:!!p.passed};
  // Existing students saw cards rather than experiments in the old 6/8.
  // Revisit it once, preserving all other completed and assessment states.
  if(memory.completed.includes(5)&&p.prefixLabProgress?.version!==2){
   memory.completed=memory.completed.filter(n=>n!==5);
   memory.skipped=memory.skipped.filter(n=>n!==5);
   memory.scene=5;
   memory.prefixLabProgress={version:2,step:0,timeIndex:0,freqIndex:0,pairIndex:0,
    timeSeen:[0],freqSeen:[0],pairSeen:[]};
   try{localStorage.setItem(STORE,JSON.stringify(memory))}catch{}
  }
 }
}catch{}
// Seven powers-of-a-thousand prefixes; all measurements share the same SI logic.
const TIME_ZOOM=[
 {label:'1 с',unit:'с',note:'1 с = 1 000 мс'},
 {label:'1 мс',unit:'мс',note:'1 мс = 1 000 мкс'},
 {label:'1 мкс',unit:'мкс',note:'1 мкс = 1 000 нс'},
 {label:'1 нс',unit:'нс',note:'1 нс = 10⁻⁹ с'}
];
const SIGNAL_FREQ=[
 {label:'1 Гц',span:'4 с',period:'1 с'},
 {label:'1 кГц',span:'4 мс',period:'1 мс'},
 {label:'1 МГц',span:'4 мкс',period:'1 мкс'},
 {label:'1 ГГц',span:'4 нс',period:'1 нс'}
];
const PERIOD_PAIRS=SIGNAL_FREQ.slice(1);
let prefixLabStage=0,prefixTimeIndex=0,prefixFreqIndex=0,prefixPairIndex=0,
 prefixTimeSeen=new Set([0]),prefixFreqSeen=new Set([0]),prefixPairSeen=new Set(),prefixReferenceOpen=false;
function restorePrefixLab(){
 const p=memory.prefixLabProgress&&typeof memory.prefixLabProgress==='object'?memory.prefixLabProgress:{};
 const idx=(v,max)=>Number.isInteger(v)?clamp(v,0,max):0;
 const sanitized=(xs,max)=>new Set(Array.isArray(xs)?xs.filter(x=>Number.isInteger(x)&&x>=0&&x<=max):[]);
 prefixLabStage=idx(p.step,2);
 prefixTimeIndex=idx(p.timeIndex,3);prefixFreqIndex=idx(p.freqIndex,3);prefixPairIndex=idx(p.pairIndex,2);
 prefixTimeSeen=sanitized(p.timeSeen,3);prefixTimeSeen.add(0);
 prefixFreqSeen=sanitized(p.freqSeen,3);prefixFreqSeen.add(0);
 prefixPairSeen=sanitized(p.pairSeen,2);
 prefixTimeSeen.add(prefixTimeIndex);prefixFreqSeen.add(prefixFreqIndex);
}
function savePrefixLab(){
 memory.prefixLabProgress={version:2,step:prefixLabStage,timeIndex:prefixTimeIndex,freqIndex:prefixFreqIndex,
  pairIndex:prefixPairIndex,timeSeen:[...prefixTimeSeen],freqSeen:[...prefixFreqSeen],pairSeen:[...prefixPairSeen]};
 persist();
}
const prefixSubstepComplete=()=>prefixLabStage===0?prefixTimeSeen.size===4:
 prefixLabStage===1?prefixFreqSeen.size===4:prefixPairSeen.size===3;
const prefixLabComplete=()=>prefixLabStage===2&&prefixPairSeen.size===3;
let mode='',visible=false,part='a',gap=78,caliperChosen=false,moved=false,choice='',
 answers={},unitsIndex=0,unitSelected='mm',seenUnits=new Set(['mm']),zoomIndex=0,prefixIndex=0,seenScale=new Set(),seenPrefix=new Set(),
 hintLevel=0,feedback='',feedbackSuccess=false,dragId=null,roundAttempts=0,
 practiceIndex=0,practiced=new Set(),dimensionIndex=0,dimensionReadings={},turnPointer=null,suppressTurnClick=false,assessmentTarget=42,assessmentSeed=0,
 caliperPhase='idle',settledContact=false,dragOffset=0,caliperStartGap=0;
const root=document.createElement('section');
root.id='gnssMissionV1';
root.hidden=true;
root.setAttribute('aria-label','GNSS LAB — Місія 01: Виміряй світ');
root.innerHTML=
 '<header class="m01-header"><div class="m01-kicker" id="m01Kicker"></div><h2 id="m01Title"></h2><p id="m01Prompt"></p></header>'+
 '<div class="m01-guidance" id="m01Guidance" role="status" aria-live="polite"></div>'+
 '<svg id="m01Canvas" class="m01-canvas" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 660" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Інтерактивна навчальна сцена"></svg>'+
 '<section class="m01-scale-loupe" id="m01ScaleLoupe" aria-label="Збільшена механічна шкала" hidden></section>'+
 '<div class="m01-controls" id="m01Controls"></div>'+
 '<div class="m01-feedback" id="m01Feedback" role="status" aria-live="polite"></div>'+
 '<footer class="m01-footer"><div class="m01-footer-left"><button type="button" data-act="hint" title="Підказка" aria-label="Підказка">?</button><button type="button" data-act="repeat" title="Повторити крок" aria-label="Повторити крок">↻</button></div>'+
 '<div class="m01-footer-right"><span id="m01Progress"></span><button type="button" data-act="skip" id="m01Skip">Пропустити</button><button type="button" data-act="next" id="m01Next" class="m01-primary">Далі →</button></div></footer>';
board.append(root);
const el=id=>root.querySelector('#'+id),canvas=el('m01Canvas'),controls=el('m01Controls'),feedbackEl=el('m01Feedback');
const draw=(s)=>canvas.innerHTML=s;
const persist=()=>{try{localStorage.setItem(STORE,JSON.stringify(memory))}catch{}};
function resetStep(){
 part='a';gap=78;caliperChosen=false;moved=false;settledContact=false;caliperPhase='idle';dragOffset=0;choice='';answers={};unitsIndex=0;unitSelected='mm';seenUnits=new Set(['mm']);zoomIndex=0;prefixIndex=0;
 seenScale=new Set();seenPrefix=new Set();hintLevel=0;feedback='';feedbackSuccess=false;
  prefixReferenceOpen=false;
  if(mode==='demo'&&memory.scene===5)restorePrefixLab();
 dragId=null;roundAttempts=0;practiceIndex=0;practiced=new Set();
  dimensionReadings=mode==='demo'&&memory.scene===6?
   Object.fromEntries(DIMENSIONS.filter(d=>memory.dimensionProgress?.[d.id]===d.mm).map(d=>[d.id,d.mm])):{};
  dimensionIndex=mode==='demo'&&memory.scene===6?
   Math.max(0,DIMENSIONS.findIndex(d=>dimensionReadings[d.id]!==d.mm)):0;
  turnPointer=null;suppressTurnClick=false;
 if(mode==='quest'){assessmentSeed=Math.min(4,Math.max(0,Number(memory.assessmentAttempts)||0)%5);
  assessmentTarget=[42,47,63,38,69][assessmentSeed];gap=assessmentTarget+24;}
 if(mode==='demo'&&memory.scene===2)gap=70;
 if(mode==='demo'&&memory.scene===6)gap=target()+24;
 if(mode==='demo'&&memory.scene===1)gap=12;
 caliperChosen=mode==='quest'&&memory.assessment===0||mode==='demo'&&(
  memory.scene===1||memory.scene===2||memory.scene===6);
 caliperStartGap=gap;
}
function target(){
 if(mode==='quest')return assessmentTarget;
 if(memory.scene===2)return part==='a'?50:54;
 if(memory.scene===6)return DIMENSIONS[dimensionIndex].mm;
 return 50;
}
function canMeasure(){return caliperChosen&&moved&&settledContact&&Math.abs(gap-target())<.001}
function sceneComplete(){
 if(mode==='quest')return memory.assessment>=4;
 switch(memory.scene){
  case 0:return !!choice;
  case 1:return caliperChosen&&moved&&gap===0;
  case 2:return answers.a===50&&answers.b===54;
  case 3:return seenUnits.size===3;
  case 4:return seenScale.size>=4&&answers.km===1;
  case 5:return prefixLabComplete();
  case 6:return DIMENSIONS.every(d=>dimensionReadings[d.id]===d.mm);
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
 '<linearGradient id="m01Ceramic" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#e3d7bb"/><stop offset=".4" stop-color="#c9b997"/><stop offset="1" stop-color="#9f916f"/></linearGradient>'+
 '</defs><rect width="1200" height="660" fill="url(#m01Grid)" pointer-events="none"/>';
 return grid;
}
// Transparent wood specimen generated for GNSS LAB. Pixel artwork is decorative:
// its SVG width remains the exact physical measurement used by the caliper.
const WOOD_SPECIMEN='./assets/wooden-block.webp';
function woodSurface(x,y,w,h){
 const cap=Math.min(22,Math.max(11,w*.12));
 const img=(viewX,viewW,ox,ow)=>'<svg x="'+ox+'" y="'+y+'" width="'+ow+'" height="'+h+
  '" viewBox="'+viewX+' 0 '+viewW+' 139" preserveAspectRatio="none" overflow="hidden" aria-hidden="true">'+
  '<image href="'+WOOD_SPECIMEN+'" x="0" y="0" width="220" height="139" preserveAspectRatio="none"/>'+
  '</svg>';
 // Nine-slice-like horizontal scaling prevents elongated corners on the 50-mm teaching ruler.
 if(w>225){
  return img(0,30,x,cap)+img(30,160,x+cap,w-2*cap)+img(190,30,x+w-cap,cap);
 }
 return '<image class="m01-wood-image" href="'+WOOD_SPECIMEN+
  '" x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" preserveAspectRatio="none"/>';
}
function blockSvg(x,y,w,title,selected=false,dim=true){
 const height=96;
 return '<g class="m01-workpiece m01-wood-workpiece" data-wood="true">'+
  '<rect x="'+(x+8)+'" y="'+(y+11)+'" width="'+w+'" height="'+height+'" rx="6" fill="#001b2b" opacity=".34"/>'+
  // Keep a neutral fallback until the external WebP loads.
  '<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+height+'" rx="18" fill="url(#m01Ceramic)" stroke="none"/>'+
  woodSurface(x,y,w,height)+
  (selected?'<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+height+'" rx="6" fill="none" stroke="#b6fb91" stroke-width="2.5"/>':'')+
  (dim?'<text x="'+(x+w/2)+'" y="'+(y-20)+'" fill="#e3f2e9" font-size="19" font-weight="600" text-anchor="middle">'+title+'</text>':'')+'</g>';
}

/* A 2.5D orthographic turn of the SAME 42×28×18 mm block.
 * The dimension exposed between the jaws is always target()*MM.
 * Length: top face; width: 90° around vertical axis of screen;
 * thickness: tip onto the 42×18 mm side face.
 */
function orientableBlockSvg(){
 const dim=DIMENSIONS[dimensionIndex],w=dim.mm*MM;
 const h=(dimensionIndex===0?28:42)*MM,y=dimensionIndex===0?268:246;
 const base='<rect x="0" y="0" width="'+w+'" height="'+h+'" rx="5" fill="url(#m01Ceramic)"/>';
 let face='';
 if(dimensionIndex!==0){
  // Rotate the original wood grain instead of stretching it through 90 degrees.
  face='<g transform="translate('+w+' 0) rotate(90)">'+woodSurface(0,0,h,w)+'</g>';
 }else{
  face=woodSurface(0,0,w,h);
 }
 const highlight=dimensionIndex===2
  ?'<path d="M3 7v'+(h-14)+'" stroke="#fff4d8" stroke-width="4" stroke-opacity=".25"/>'+
   '<path d="M'+(w-5)+' 9v'+(h-18)+'" stroke="#6d4f31" stroke-width="4" stroke-opacity=".42"/>'
  :'<path d="M7 4h'+(w-14)+'" stroke="#ffedd3" stroke-width="2" stroke-opacity=".35"/>';
 return '<g class="m01-workpiece m01-wood-workpiece m01-rotatable-block" data-wood="true"'+
  ' data-orientation="'+dim.id+'" aria-label="Дерев’яний брусок, '+dim.name.toLowerCase()+'">'+
  '<rect x="'+(X0+8)+'" y="'+(y+10)+'" width="'+w+'" height="'+h+'" rx="5" fill="#001b2b" opacity=".32"/>'+
  '<g class="m01-rotating-face" transform="translate('+X0+' '+y+')"><g class="m01-face-animation">'+
   base+face+highlight+'</g></g>'+
  '<rect class="m01-rotate-hit" x="'+(X0+9)+'" y="'+(y+5)+'" width="'+Math.max(w-20,29)+'" height="'+(h-10)+'"'+
  ' rx="8" fill="transparent" role="button" tabindex="0" data-rotate-block="true"'+
  ' aria-label="Повернути дерев’яний брусок, наступна грань" />'+
  '</g>';
}

function overviewScene(){
 let s=schematic();
 s+='<g class="m01-choice'+(choice==='a'?' m01-chosen':'')+'" data-guess="a" role="button" tabindex="0" aria-label="Обрати деталь A" aria-pressed="'+(choice==='a')+'">'+
    blockSvg(350,242,50*MM,'A',choice==='a')+'<rect class="m01-choice-hit" x="335" y="215" width="195" height="152" rx="9" fill="transparent" pointer-events="all"/></g>';
 s+='<g class="m01-choice'+(choice==='b'?' m01-chosen':'')+'" data-guess="b" role="button" tabindex="0" aria-label="Обрати деталь B" aria-pressed="'+(choice==='b')+'">'+
    blockSvg(665,242,54*MM,'B',choice==='b')+'<rect class="m01-choice-hit" x="650" y="215" width="208" height="152" rx="9" fill="transparent" pointer-events="all"/></g>';
 return s;
}
function caliperScene(calTarget,calGap,showBlock=true){
 let s=schematic();
 const jawX=X0+calGap*MM,contact=Math.abs(calGap-calTarget)<.001;
 const travelStart=calGap,limit=showBlock?calTarget:0;
 const label=mode==='quest'?'Невідома деталь':memory.scene===6?DIMENSIONS[dimensionIndex].name:part==='a'?'Деталь A':'Деталь B';
 if(showBlock){
  s+=mode==='demo'&&memory.scene===6?orientableBlockSvg():blockSvg(X0,265,calTarget*MM,'',false,false);
  s+='<text x="'+(X0+calTarget*MM/2)+'" y="242" fill="#e3efdf" text-anchor="middle" font-size="17">'+label+'</text>';
 }
 s+='<g class="m01-caliper" aria-label="Механічний штангенциркуль">'+
  '<rect x="'+(X0-38)+'" y="410" width="608" height="56" rx="4" fill="url(#m01Steel)" stroke="#dce9eb" stroke-width="2"/>'+
  '<rect x="'+(X0-38)+'" y="465" width="608" height="8" fill="#466272"/>'+
  '<path d="M'+(X0-17)+' 405V265H'+X0+'V405Z" fill="url(#m01Steel)" stroke="#e4f1f2" stroke-width="2"/>';
 for(let i=0;i<=170;i++){
  const px=X0+i*MM,major=i%10===0,half=i%5===0;
  s+='<line x1="'+px+'" x2="'+px+'" y1="414" y2="'+(major?441:half?432:424)+'" stroke="#244559" stroke-width="'+(major?1.8:1.05)+'"/>';
  if(major)s+='<text x="'+px+'" y="455" text-anchor="middle" font-size="11" font-weight="700" fill="#183e51">'+i+'</text>';
 }
 s+='<g class="m01-jaw-assembly" data-jaw-assembly data-base-gap="'+travelStart+'" data-active="false">'+
  '<path class="m01-moving-jaw" d="M'+(jawX-14)+' 405V265H'+jawX+'V405Z" fill="url(#m01Steel)" stroke="#e4f1f2" stroke-width="2"/>'+
  '<rect class="m01-carriage" x="'+(jawX-23)+'" y="405" width="76" height="76" rx="3" fill="url(#m01Dark)" stroke="#d1e6ed" stroke-width="2"/>';
 // Nonius stays rigidly attached to the movable slider.
 for(let i=0;i<=10;i++){
  const px=jawX+i*MM*.9;
  s+='<line x1="'+px+'" x2="'+px+'" y1="479" y2="'+(i%5===0?493:486)+'" stroke="#dbeaf0" stroke-width="1.6"/>';
 }
 s+='<rect class="m01-thumb-wheel" x="'+(jawX+9)+'" y="481" width="40" height="31" rx="9" fill="#becbd1" stroke="#567887" stroke-width="2"/>'+
  '<circle cx="'+(jawX+29)+'" cy="496" r="7" fill="#648192" stroke="#dfedef" stroke-width="1.5"/>'+
  '<path d="M'+(jawX+23)+' 496h12" stroke="#d8e8e5" stroke-width="1.5"/>'+
  '<path d="M'+jawX+' 407v79" stroke="#b9fa89" stroke-width="2.8" stroke-linecap="round"/>'+
  '<path d="M'+(jawX-7)+' 395l7 10 7-10z" fill="#b9fa89"/>'+
  '<text x="'+jawX+'" y="504" text-anchor="middle" fill="#b9fa89" font-size="11" font-weight="800">0</text>'+
  '<rect class="m01-jaw-hit" x="'+(jawX-35)+'" y="259" width="112" height="258" rx="8" fill="transparent" data-jaw="true" tabindex="0" role="slider" aria-label="Пересунути рухому каретку штангенциркуля" aria-valuemin="'+limit+'" aria-valuemax="160" aria-valuenow="'+calGap.toFixed(1)+'" aria-valuetext="'+(contact?'Контакт':'Губки розкриті')+'"/>'+
  '</g></g>';
 if(showBlock){
  s+='<g data-contact-indicator class="m01-contact-indicator" style="opacity:'+(contact?1:0)+'">'+
   '<path d="M'+X0+' 270V357 M'+(X0+calTarget*MM)+' 270V357" stroke="#b9fa83" stroke-width="4" stroke-linecap="round"/>'+
   '</g>';
 }else{
  s+='<g data-contact-indicator class="m01-contact-indicator" style="opacity:'+(contact?1:0)+'"><circle cx="'+X0+'" cy="276" r="10" fill="none" stroke="#bcf78b" stroke-width="2"/></g>';
 }
 s+='<g class="m01-drag-cue" data-drag-cue style="opacity:'+(settledContact||caliperPhase==='answer'?0:1)+'">'+
  '<path d="M'+(jawX-11)+' 541H'+(jawX+68)+' M'+(jawX-2)+' 533l-9 8 9 8 M'+(jawX+59)+' 533l9 8 -9 8" stroke="#b9fa89" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>'+
  '</g>';
 return s;
}

// Optical loupe: a physical magnification of the main scale and 0.1 mm vernier.
// The zero mark follows the jaw, while vernier divisions are 0.9 mm apart.
// There is no independent digital measurement and no revealed answer in the test mode.
function scaleLoupeMarkup(){
 const reading=Math.round(gap*10)/10,whole=Math.floor(reading+1e-7),tenths=Math.round((reading-whole)*10);
 const base=Math.max(0,whole-1),unit=32,origin=40,zero=origin+(reading-base)*unit;
 let main='',vernier='';
 for(let n=base;n<=Math.min(170,base+11);n++){
  const x=origin+(n-base)*unit;
  main+='<line x1="'+x+'" y1="55" x2="'+x+'" y2="'+(n%5===0?84:76)+'" stroke="#18394b" stroke-width="'+(n%5===0?2.2:1.45)+'"/>'+
   '<text x="'+x+'" y="44" text-anchor="middle" fill="#163c4f" font-size="13" font-weight="700">'+n+'</text>';
 }
 for(let n=0;n<=10;n++){
  const x=zero+n*unit*.9,matched=n===tenths;
  vernier+='<line x1="'+x.toFixed(2)+'" y1="97" x2="'+x.toFixed(2)+'" y2="'+(n%5===0?128:matched?125:119)+'" stroke="'+(matched?'#b7f886':'#dff7ff')+'" stroke-width="'+(matched?3:1.4)+'"/>';
  if(n%2===0)vernier+='<text x="'+x.toFixed(2)+'" y="143" text-anchor="middle" font-size="11" font-weight="'+(matched?'800':'600')+'" fill="'+(matched?'#b7f886':'#dff7ff')+'">'+n+'</text>';
 }
 const scaled=reading.toLocaleString('uk-UA',{minimumFractionDigits:1,maximumFractionDigits:1});
 const fractional=(tenths/10).toLocaleString('uk-UA',{minimumFractionDigits:1,maximumFractionDigits:1});
 const training=mode==='demo';
 return '<div class="m01-loupe-heading"><span>⌕ ЛУПА ×4 · МЕХАНІЧНА ШКАЛА</span><span>мм</span></div>'+
  '<svg class="m01-loupe-drawing" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 154" role="img" aria-label="Основна шкала в міліметрах; зелена риска — нуль ноніуса">'+
  '<rect x="4" y="13" width="412" height="79" rx="5" fill="#dbe8e9" stroke="#96adb5" stroke-width="2"/>'+
  '<rect x="4" y="93" width="412" height="57" rx="5" fill="#173a50" stroke="#74939f" stroke-width="2"/>'+
  main+vernier+
  '<line x1="'+zero.toFixed(2)+'" y1="50" x2="'+zero.toFixed(2)+'" y2="135" stroke="#b7f886" stroke-width="2.3" stroke-dasharray="5 3"/>'+
  '<path d="M'+(zero-8).toFixed(2)+' 15h16l-8 13z" fill="#88bf44" stroke="#345b33" stroke-width="1"/>'+
  '<text x="12" y="10" font-size="10" fill="#bad7e0">ОСНОВНА</text>'+
  '<text x="12" y="109" font-size="10" fill="#c1e0e8">НОНІУС</text>'+
  '</svg>'+
  (training?
   '<div class="m01-loupe-reading"><span>Шкала: <b>'+whole+' мм</b></span><span>Ноніус: <b>'+fractional+' мм</b></span><strong>Разом: '+scaled+' мм</strong></div>':
   '<p class="m01-loupe-guide">Цілі мм — перед зеленою рискою. Десяті — за збігом рисок ноніуса.</p>');
}
function renderScaleLoupe(){
 const loupe=el('m01ScaleLoupe');
 const show=caliperStep()&&!calibration()&&settledContact&&atContact();
 loupe.hidden=!show;
 if(show)loupe.innerHTML=scaleLoupeMarkup();
 else loupe.replaceChildren();
}


// Physical length is constant at 50 mm. Only the ruler labels and units change.
function unitRulerScene(){
 const x=360,pxPerMm=8,bodyWidth=50*pxPerMm,right=x+bodyWidth;
 const names={mm:'мм',cm:'см',m:'м'},readings={mm:'50',cm:'5',m:'0,05'};
 const mark=i=>unitSelected==='mm'?String(i):unitSelected==='cm'?String(i/10):
   i===0?'0':(i/1000).toLocaleString('uk-UA',{minimumFractionDigits:2,maximumFractionDigits:2});
 let s=schematic(),marks='';
 for(let mm=0;mm<=60;mm++){
  const xx=x+mm*pxPerMm,major=mm%10===0,half=mm%5===0;
  marks+='<line x1="'+xx+'" x2="'+xx+'" y1="421" y2="'+(major?458:half?444:436)+'"'+
   ' stroke="#173e52" stroke-width="'+(major?2.5:1.3)+'"/>';
  if(major)marks+='<text x="'+xx+'" y="484" text-anchor="middle" font-family="ui-monospace,Consolas,monospace"'+
   ' font-size="'+(unitSelected==='m'?15:18)+'" font-weight="700" fill="#20485a">'+mark(mm)+'</text>';
 }
 s+='<g class="m01-unit-physical" aria-label="Брусок постійної довжини 50 мм">'+
   blockSvg(x,255,bodyWidth,'',false,false)+
   '<path d="M'+x+' 373V399 M'+right+' 373V399 M'+x+' 391H'+right+'"'+
   ' fill="none" stroke="#dceff1" stroke-width="2.5"/>'+
   '<rect x="340" y="405" width="536" height="99" rx="8" fill="url(#m01Steel)" stroke="#e5f2f3" stroke-width="2"/>'+
   '<rect x="340" y="405" width="536" height="9" rx="4" fill="#edf7f5" opacity=".65"/>'+
   '<g class="m01-unit-ticks">'+marks+'</g>'+
   '<path d="M'+right+' 416V501" stroke="#a7ee79" stroke-width="3.7"/>'+
   '<path d="M'+(right-9)+' 403L'+right+' 415l9-12Z" fill="#b6f989"/>'+
   '</g>';
 s+='<text x="610" y="220" text-anchor="middle" font-size="34" font-weight="780" fill="#d6ffc2"'+
    ' class="m01-unit-reading">'+readings[unitSelected]+' '+names[unitSelected]+'</text>';
 s+='<text x="610" y="554" text-anchor="middle" font-size="'+(seenUnits.size===3?19:16)+'"'+
   ' font-weight="650" fill="'+(seenUnits.size===3?'#c7faab':'#bbdce2')+'">'+
   (seenUnits.size===3?'Довжина залишилась тією самою ✓':'Брусок не змінюється — змінюються поділки')+'</text>';
 s+='<rect x="340" y="405" width="536" height="100" rx="8" fill="transparent"'+
  ' class="m01-unit-hit" data-unit-cycle="true" role="button" tabindex="0"'+
  ' aria-label="Перемкнути одиницю лінійки" />';
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

function prefixLabPrompt(){
 if(prefixLabComplete())return 'Готово! Ти пов’язав масштаб часу з частотою. Натисни «До вимірювань →».';
 if(prefixLabStage===0)return prefixSubstepComplete()?'Ти дійшов до наносекунди. Відкрий генератор сигналу.':'Збільшуй часову шкалу в 1 000 разів. Дійди до наносекунди.';
 if(prefixLabStage===1)return prefixSubstepComplete()?'Ти побачив чотири частоти. Тепер досліди їхні періоди.':'Підвищуй частоту. Осцилограф автоматично змінює часову розгортку.';
 return 'Обери 1 кГц, 1 МГц і 1 ГГц та знайди тривалість одного коливання.';
}
function prefixLabControls(){
 const stageNames=['ЗБІЛЬШЕННЯ ЧАСУ','ГЕНЕРАТОР СИГНАЛУ','ЧАСТОТА ↔ ПЕРІОД'];
 const selected=prefixLabStage===0?prefixTimeIndex:prefixLabStage===1?prefixFreqIndex:prefixPairIndex;
 const current=prefixLabStage===0?TIME_ZOOM[prefixTimeIndex].label:
  prefixLabStage===1?SIGNAL_FREQ[prefixFreqIndex].label:PERIOD_PAIRS[prefixPairIndex].label;
 const seen=prefixLabStage===0?prefixTimeSeen.size:prefixLabStage===1?prefixFreqSeen.size:prefixPairSeen.size;
 const total=prefixLabStage===2?3:4;
 let controlsHtml='';
 if(prefixLabStage!==2){
  const names=prefixLabStage===0?TIME_ZOOM:SIGNAL_FREQ;
  controlsHtml='<div class="m01-prefix-current" aria-live="polite">'+current+'</div>'+
   '<div class="m01-prefix-slider-wrap"><label for="m01PrefixRange" class="m01-prefix-sr">Рівень '+(prefixLabStage===0?'збільшення':'частоти')+'</label>'+
   '<input id="m01PrefixRange" data-prefix-range="true" type="range" min="0" max="3" step="1" value="'+selected+'" aria-valuetext="'+current+'" /></div>'+
   '<div class="m01-prefix-row">'+
   '<button type="button" data-act="prefix-dec"'+(selected===0?' disabled':'')+' aria-label="Попередній масштаб">−</button>'+
   '<button type="button" class="m01-prefix-grow" data-act="prefix-inc"'+(selected===3?' disabled':'')+'>'+
    (prefixLabStage===0?'Збільшити ×1 000':'Частота ×1 000')+' →</button></div>'+
   '<div class="m01-prefix-steps">'+names.map((d,i)=>
    '<button type="button" data-act="prefix-set-'+i+'"'+(i===selected?' class="active"':'')+
    ' aria-pressed="'+(i===selected)+'">'+d.label+'</button>').join('')+'</div>';
 }else{
  controlsHtml='<div class="m01-prefix-steps m01-prefix-pair-buttons">'+PERIOD_PAIRS.map((d,i)=>
    '<button type="button" data-act="prefix-pair-'+i+'" class="'+(i===selected?'active ':'')+
    (prefixPairSeen.has(i)?'seen':'')+'" aria-pressed="'+(i===selected)+'">'+
    (prefixPairSeen.has(i)?'✓ ':'')+d.label+'</button>').join('')+'</div>'+
   '<div class="m01-prefix-relationship">f ↑ · T ↓</div>';
 }
 const references=[
  ['Гіга','G','10⁹'],['Мега','M','10⁶'],['Кіло','k','10³'],
  ['Без префікса','—','10⁰'],['Мілі','m','10⁻³'],['Мікро','µ','10⁻⁶'],['Нано','n','10⁻⁹']
 ];
 return '<div class="m01-prefix-panel">'+
  '<div class="m01-prefix-heading"><span>ЕКСПЕРИМЕНТ '+(prefixLabStage+1)+' / 3</span><span>'+seen+'/'+total+' ✓</span></div>'+
  '<div class="m01-control-title">'+stageNames[prefixLabStage]+'</div>'+
  controlsHtml+
  (prefixSubstepComplete()&&prefixLabStage<2?
   '<button type="button" class="m01-prefix-proceed" data-act="prefix-phase-next">'+
   (prefixLabStage===0?'До генератора →':'До періоду →')+'</button>':'')+
  (prefixLabComplete()?'<div class="m01-prefix-ok">✓ Відкрито всі три взаємозв’язки</div>':'')+
  '<button type="button" class="m01-prefix-reference-toggle" data-act="prefix-reference" aria-expanded="'+prefixReferenceOpen+'">'+
   (prefixReferenceOpen?'▾ Сховати префікси':'▸ Таблиця префіксів')+'</button>'+
  (prefixReferenceOpen?'<div class="m01-prefix-reference" aria-label="Сім масштабів SI">'+
   references.map(([name,symbol,power])=>'<span>'+name+'</span><b>'+symbol+'</b><span>'+power+'</span>').join('')+
   '<small>m = мілі · M = мега · µ = мікро</small></div>':'')+
  '</div>';
}
function prefixLabAction(act){
 if(!visible||mode!=='demo'||memory.scene!==5)return;
 if(act==='prefix-reference'){
  prefixReferenceOpen=!prefixReferenceOpen;render();return;
 }
 if(act==='prefix-phase-next'){
  if(prefixLabStage<2&&prefixSubstepComplete()){
   prefixLabStage+=1;prefixReferenceOpen=false;savePrefixLab();
   announce(prefixLabStage===1?'✓ Масштаби часу відкрито. Тепер керуй частотою.':'✓ Частоти відкрито. Досліди період.',true);
   render();
  }
  return;
 }
 if(act==='prefix-dec'||act==='prefix-inc'){
  const current=prefixLabStage===0?prefixTimeIndex:prefixFreqIndex;
  if(prefixLabStage>1)return;
  prefixSelect(clamp(current+(act==='prefix-inc'?1:-1),0,3));return;
 }
 if(act.startsWith('prefix-set-')&&prefixLabStage<2){
  const i=Number(act.slice('prefix-set-'.length));
  if(Number.isInteger(i)&&i>=0&&i<=3)prefixSelect(i);
  return;
 }
 if(act.startsWith('prefix-pair-')&&prefixLabStage===2){
  const i=Number(act.slice('prefix-pair-'.length));
  if(!Number.isInteger(i)||i<0||i>2)return;
  prefixPairIndex=i;prefixPairSeen.add(i);savePrefixLab();
  if(prefixLabComplete()&&!memory.completed.includes(5)){
   success('✓ Частота та час пов’язані: T = 1/f. Натисни «До вимірювань →».');
  }
  render();
 }
}
function prefixSelect(i){
 if(!Number.isInteger(i)||i<0||i>3||prefixLabStage>1)return;
 if(prefixLabStage===0){prefixTimeIndex=i;prefixTimeSeen.add(i)}
 else {prefixFreqIndex=i;prefixFreqSeen.add(i)}
 savePrefixLab();render();
}
function prefixWavePath(x,y,w,h,cycles){
 let d='';
 for(let i=0;i<=160;i++){
  const xx=x+w*i/160,yy=y-Math.sin(i/160*Math.PI*2*cycles)*h;
  d+=(i===0?'M':'L')+xx.toFixed(2)+' '+yy.toFixed(2)+' ';
 }
 return d;
}
function prefixScopeBase(x=235,y=242,w=695,h=270){
 let out='<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="12" fill="#061e30" fill-opacity=".82" stroke="#729fae" stroke-width="2"/>';
 for(let i=1;i<8;i++)out+='<line x1="'+(x+w*i/8)+'" y1="'+y+'" x2="'+(x+w*i/8)+'" y2="'+(y+h)+'" stroke="#a3cedb" stroke-opacity=".13"/>';
 for(let j=1;j<5;j++)out+='<line x1="'+x+'" y1="'+(y+h*j/5)+'" x2="'+(x+w)+'" y2="'+(y+h*j/5)+'" stroke="#a3cedb" stroke-opacity=".13"/>';
 return out;
}
function prefixScene(){
 let s=schematic();
 if(mode==='quest'){
  s+=prefixScopeBase();
  s+='<path d="'+prefixWavePath(252,382,652,64,4)+'" fill="none" stroke="#b6f78b" stroke-width="4"/>'+
   '<text x="585" y="212" text-anchor="middle" font-size="28" fill="#e5f7f8">Мегагерци → кілогерци</text>';
  return s;
 }
 const stage=prefixLabStage;
 if(stage===0){
  const t=TIME_ZOOM[prefixTimeIndex],x=255,w=640;
  s+='<text x="575" y="218" font-size="25" font-weight="750" text-anchor="middle" fill="#ebf9f6">Часове вікно: '+t.label+'</text>'+
    prefixScopeBase(225,253,700,258);
  s+='<line x1="'+x+'" y1="420" x2="'+(x+w)+'" y2="420" stroke="#b6f88c" stroke-width="4"/>';
  for(let i=0;i<=10;i++){
   const px=x+w*i/10;
   s+='<line x1="'+px+'" y1="406" x2="'+px+'" y2="'+(i%5===0?445:436)+'" stroke="#dceff0" stroke-width="'+(i%5===0?3:1.5)+'"/>';
  }
  for(const [n,pos] of [[0,0],[0.25,0.25],[0.5,0.5],[0.75,0.75],[1,1]]){
   s+='<text x="'+(x+w*pos)+'" y="473" font-size="16" fill="#e3f2f6" text-anchor="middle">'+
   (n===0?'0':String(n).replace('.',','))+'</text>';
  }
  s+='<rect class="m01-prefix-focus" x="'+(x+w*.45)+'" y="285" width="'+(w*.10)+'" height="110" rx="6" fill="#b4f68b" fill-opacity=".10" stroke="#b4f68b" stroke-dasharray="7 6" stroke-width="2"/>';
  s+='<text x="575" y="550" text-anchor="middle" font-size="18" fill="#c1e7e7">'+t.note+'</text>';
 }else{
  const freq=stage===1?SIGNAL_FREQ[prefixFreqIndex]:PERIOD_PAIRS[prefixPairIndex];
  const cycles=stage===1?4:1;
  const x=260,w=635,y=380;
  s+='<text x="575" y="218" text-anchor="middle" font-size="28" font-weight="750" fill="#e9faf2">'+freq.label+'</text>';
  s+=prefixScopeBase(225,253,700,258);
  s+='<line x1="'+x+'" y1="'+y+'" x2="'+(x+w)+'" y2="'+y+'" stroke="#a1cbd3" stroke-opacity=".42" stroke-width="2"/>';
  s+='<path class="m01-prefix-wave" d="'+prefixWavePath(x,y,w,82,cycles)+'" fill="none" stroke="#baf990" stroke-width="3.7" stroke-linejoin="round"/>';
  if(stage===1){
   for(let i=0;i<=4;i++){
    const xx=x+w*i/4;
    s+='<line x1="'+xx+'" y1="270" x2="'+xx+'" y2="483" stroke="#bde4e8" stroke-opacity=".24" stroke-dasharray="6 7"/>';
   }
   s+='<text x="575" y="549" text-anchor="middle" fill="#d5ebf1" font-size="18">Розгортка: '+freq.span+' · 4 коливання</text>';
  }else{
   s+='<line x1="'+x+'" y1="481" x2="'+(x+w)+'" y2="481" stroke="#baf990" stroke-width="2.4"/>'+
    '<path d="M'+x+' 470v22 m0-11l12-7m-12 7l12 7 M'+(x+w)+' 470v22m0-11l-12-7m12 7l-12 7" stroke="#baf990" stroke-width="2" fill="none"/>';
   s+='<text x="575" y="547" text-anchor="middle" fill="#d4ffb5" font-size="25" font-weight="750">T = '+freq.period+'</text>'+
    '<text x="575" y="581" text-anchor="middle" fill="#aaceda" font-size="16">T = 1 / f</text>';
  }
 }
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
 if(scene===3)return unitRulerScene();
 if(scene===4)return scaleScene();
 if(scene===5)return prefixScene();
 if(scene===6)return caliperScene(target(),gap);
 return summaryScene();
}
function controlView(){
 const quest=mode==='quest',step=quest?memory.assessment:memory.scene;
 if(quest&&step>=4)return '';
 if(!quest&&step===7)return '';
 if(!quest&&step===0)return '';
 if(!quest&&step===6){
  const dim=DIMENSIONS[dimensionIndex],done=Object.keys(dimensionReadings).length;
  const chips=DIMENSIONS.map((d,i)=>'<span class="m01-dim-chip'+(dimensionIndex===i?' current':'')+
   (dimensionReadings[d.id]===d.mm?' measured':'')+'">'+
   (dimensionReadings[d.id]===d.mm?'✓ ':'○ ')+d.name+'</span>').join('');
  const input=!sceneComplete()&&dimensionReadings[dim.id]!==dim.mm&&canMeasure()
   ?promptInput('Розмір грані','Зчитай шкалу','мм')+
    '<button type="button" class="m01-submit" data-act="check">Перевірити</button>':'';
  return '<div class="m01-dim-panel">'+
   '<div class="m01-control-title">Грань '+(dimensionIndex+1)+' / 3 · '+dim.name+'</div>'+
   '<div class="m01-dim-chips" aria-label="Виміряні грані">'+chips+'</div>'+
   '<button type="button" class="m01-rotate-button" data-act="rotate-block"'+
    ' aria-label="Повернути брусок до наступної грані">↻ Повернути брусок</button>'+
   '<div class="m01-dim-progress">'+done+'/3 виміряно</div>'+
   input+'</div>';
 }
 if((!quest&&(step===1||step===2))||(quest&&step===0)){
  const isZero=!quest&&step===1,measurement=!isZero;
  let content='';
  // No extra tool-selection button: the mechanical caliper is already on the bench.
  if(!isZero&&!quest&&step===2){
   content+='<div class="m01-buttons">'+selectButton('part-a','Деталь A',part==='a')+selectButton('part-b','Деталь B',part==='b')+'</div>';
   content+='<span class="m01-dots" aria-label="Виміряні деталі">'+(answers.a===50?'✓ A':'○ A')+' · '+(answers.b===54?'✓ B':'○ B')+'</span>';
  }
  if(measurement&&canMeasure()){
   content+=promptInput('Твій відлік','Введи значення','мм')+
    '<button type="button" class="m01-submit" data-act="check">Перевірити</button>';
  }
    return content;
 }
 if(!quest&&step===3){
  const choices=[['mm','мм'],['cm','см'],['m','м']];
  return '<div class="m01-unit-switch" role="group" aria-label="Одиниці шкали лінійки">'+
   '<div class="m01-unit-heading"><span>ШКАЛА ЛІНІЙКИ</span><span>'+seenUnits.size+' / 3</span></div>'+
   '<div class="m01-unit-buttons">'+choices.map(([key,label])=>
    '<button type="button" data-act="unit-'+key+'" class="'+(unitSelected===key?'active ':'')+
    (seenUnits.has(key)?'m01-unit-seen':'')+'" aria-pressed="'+(unitSelected===key)+'">'+
    (seenUnits.has(key)?'✓ ':'')+label+'</button>').join('')+'</div></div>';
 }
 if(!quest&&step===4){
  const labels=['1 метр','10 метрів','100 метрів','1 000 метрів'];
  return '<div class="m01-control-title">Вибери масштаб огляду</div><div class="m01-buttons">'+
   labels.map((l,i)=>selectButton('scale-'+i,l,zoomIndex===i)).join('')+'</div>'+
   '<span class="m01-dots" aria-label="Переглянуті масштаби">'+seenScale.size+'/4 ✓</span>'+
   (seenScale.size===4?promptInput('1 000 м = скільки км?','Введи значення','км')+
    '<button type="button" class="m01-submit" data-act="check">Перевірити</button>':'');
 }
 if(!quest&&step===5)return prefixLabControls();
 if(quest&&step===1){
  return '<div class="m01-control-title">Нова величина</div>'+promptInput('86 мм = скільки см?','Введи результат','см')+'<button type="button" class="m01-submit" data-act="check">Зафіксувати відповідь</button>';
 }
 if(quest&&step===2){
  return '<div class="m01-control-title">Нова величина</div>'+promptInput('2,5 км = скільки метрів?','Введи результат','м')+'<button type="button" class="m01-submit" data-act="check">Зафіксувати відповідь</button>';
 }
 if(quest&&step===3){
  return '<div class="m01-control-title">Нова величина</div>'+promptInput('3 МГц = скільки кГц?','Введи результат','кГц')+'<button type="button" class="m01-submit" data-act="check">Зафіксувати відповідь</button>';
 }
 return '';
}
function guidance(){
 if(mode==='quest')return '';
 const msgs=[
  'Спочатку припущення, потім вимірювання. Помилятися дозволено.',
  caliperChosen?'Тягни каретку вправо, а потім до нуля — або скористайся клавіатурою.':'У нижній панелі є реальний інструмент. Можна вибрати його там або натиснути «Взяти».',
  'Число треба зчитати зі шкали самостійно. Контакт губок підтверджує, що вимірювання можливе.',
  'Натисни «см» і «м» праворуч або саму лінійку. Брусок не змінюється.',
  'Масштаб зображення і одиниця вимірювання — різні речі.',
  'Керуй масштабом часу та частотою сигналу: кожен сусідній префікс відрізняється у 1 000 разів.',
  'Натисни на брусок або поверни його свайпом. Виміряй кожну грань штангенциркулем.',
  'Готово! Тепер закріпи навички в режимі «Тести».'
 ];
 return msgs[memory.scene]||'';
}
function caliperStep(){
 return mode==='quest'&&memory.assessment===0||
  mode==='demo'&&(memory.scene===1||memory.scene===2||
    memory.scene===6);
}
function calibration(){return mode==='demo'&&memory.scene===1}
function atContact(){return Math.abs(gap-(calibration()?0:target()))<.001}
function caliperInstruction(){
 if(mode==='demo'&&memory.scene===6){
  const dim=DIMENSIONS[dimensionIndex];
  if(sceneComplete())return '✓ Три грані виміряно. Натисни «Далі →».';
  if(dimensionReadings[dim.id]===dim.mm)return '✓ '+dim.name+' виміряна. Поверни брусок.';
  if(caliperPhase==='answer')return 'Контакт. Зчитай '+dim.name.toLowerCase()+' за шкалою.';
  if(caliperPhase==='contact')return 'Контакт. Відпусти каретку.';
  if(caliperPhase==='drag')return 'Підведи губку до деталі.';
  return 'Виміряй '+dim.name.toLowerCase()+'. Зведи губки до торця.';
 }
 if(caliperPhase==='success')return '✓ Вимірювання підтверджено';
 if(caliperPhase==='answer')return 'Контакт. Прочитай показ у лупі та введи його.';
 if(caliperPhase==='contact')return 'Контакт. Відпусти каретку.';
 if(caliperPhase==='approach')return 'Ще трохи…';
 if(caliperPhase==='drag')return 'Рухай губку до деталі.';
 return calibration()?'Зведи губки до нуля.':'Підведи рухому губку до торця деталі.';
}
function syncCaliperVisual(){
 const assembly=canvas.querySelector('[data-jaw-assembly]');
 if(!assembly)return;
 const base=Number(assembly.getAttribute('data-base-gap'));
 assembly.setAttribute('transform','translate('+((gap-base)*MM).toFixed(3)+',0)');
 assembly.setAttribute('data-active',String(dragId!==null));
 const hit=assembly.querySelector('[data-jaw]');
 if(hit){
  hit.setAttribute('aria-valuenow',gap.toFixed(1));
  hit.setAttribute('aria-valuetext',atContact()?'Контакт':'Губки розкриті');
 }
 const light=canvas.querySelector('[data-contact-indicator]');
 if(light)light.style.opacity=atContact()?'1':'0';
 const cue=canvas.querySelector('[data-drag-cue]');
 if(cue)cue.style.opacity=atContact()?'0':'1';
 const prompt=el('m01Prompt');
 if(prompt)prompt.textContent=caliperInstruction();
 const loupe=el('m01ScaleLoupe');
 if(loupe&&(!settledContact||!atContact()))loupe.hidden=true;
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
 el('m01Prompt').textContent=caliperStep()?caliperInstruction():quest?(current===4?'4/4 підтверджено':spec.prompt):current===7?'':current===5?prefixLabPrompt():current===3&&sceneComplete()?'Готово. Натисни «Далі →».':spec.prompt;
 el('m01Guidance').textContent=hintLevel>0&&!quest?hintMessage():'';
 draw(mainScene());
 renderScaleLoupe();
 controls.innerHTML=controlView();
 controls.hidden=!controls.innerHTML.trim();
 renderFeedback();
 const next=el('m01Next'),skip=el('m01Skip'),hint=root.querySelector('[data-act="hint"]');
 const replay=root.querySelector('[data-act="repeat"]');
 const allowed=quest?current>=4:current===5?sceneComplete():sceneComplete()||memory.completed.includes(current);
 next.hidden=quest&&current<4||mode==='demo'&&current===0;
 next.disabled=!allowed;
 next.textContent=quest?'Пісочниця →':current===7?(trainingFinished?'До заліку →':'Повернутися до уроку →'):current===6&&allowed?'До підсумку →':current===5&&allowed?'До вимірювань →':current===3&&allowed?'До масштабу →':'Далі →';
 next.classList.toggle('m01-unit-next-ready',mode==='demo'&&(current===3||current===5||current===6)&&allowed);
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
  ['Натисни кнопку «см» біля лінійки.','Тепер натисни «м». Порівняй числа над бруском.','Можна натискати й саму лінійку, щоб перемикати її шкалу.'],
  ['Відкрий усі масштаби.','Кіло означає тисячу.','1 000 м дорівнює 1 км.'],
  ['Натисни «×1 000» або перемісти повзунок праворуч.','Переглянь 1 с, 1 мс, 1 мкс, 1 нс. Потім зміни частоту генератора.','Частота — коливання за секунду, період — час одного коливання: T = 1/f.'],
  ['Виміряй довжину: потягни рухому губку до дерев’яного бруска.','Натисни «↻ Повернути брусок» або проведи пальцем по ньому.','Потрібно виміряти 3 грані: довжину, ширину і товщину.']
 ];
 return (hints[Math.min(stage,6)]||[])[Math.min(hintLevel-1,2)]||'';
}
let choiceTimer=null,advanceTimer=null;
function cancelChoiceTimer(){if(choiceTimer!==null){clearTimeout(choiceTimer);choiceTimer=null}}
function cancelAdvanceTimer(){if(advanceTimer!==null){clearTimeout(advanceTimer);advanceTimer=null}}
function setScene(index){
 cancelChoiceTimer();cancelAdvanceTimer();memory.scene=clamp(index,0,7);persist();resetStep();render();
}
function setAssessment(index){
 cancelAdvanceTimer();
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
 // Prefix lab is instrument-led; the separate assessment keeps the conversion test.
 else if(memory.scene===6){
  if(!canMeasure()){announce('Підведи губки до контакту з обраною гранню.');return}
  expected=target();
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
   caliperPhase='success';
   success('✓ Обидві деталі виміряно.');
  }else{part=doneA?'b':'a';gap=target()+20;caliperChosen=true;moved=false;settledContact=false;caliperPhase='idle';
   announce('✓ Деталь виміряно. Наступна.',true)}
  render();return;
 }
 // Scene 3 is an instrument-led experiment; its assessment remains a separate task.
 if(memory.scene===4){answers.km=1;success('✓ 1 000 м = 1 км. Зміна одиниці не змінює відстань.')}
 // Prefix experiments are completed through manipulation, not a text answer.
 if(memory.scene===6){
  const d=DIMENSIONS[dimensionIndex];
  dimensionReadings[d.id]=d.mm;
  memory.dimensionProgress={...dimensionReadings};persist();
  if(sceneComplete())success('✓ Виміряно всі три грані! Натисни «До підсумку →».');
  else announce('✓ '+d.name+' — '+d.mm+' мм. Поверни брусок для наступного вимірювання.',true);
  caliperPhase='success';render();return;
 }
 render();
}
function updateGap(v,passive=false){
 if(!caliperStep()||!caliperChosen)return;
 const min=calibration()?0:target(),newGap=Math.round(clamp(v,min,160)*10)/10;
 if(Math.abs(gap-newGap)>.001){moved=true;settledContact=false}
 gap=newGap;
 caliperPhase=atContact()?'contact':gap-min<=5?'approach':dragId!==null?'drag':'idle';
 syncCaliperVisual();
 if(!passive&&dragId===null)finishCaliperMotion();
}
function finishCaliperMotion(){
 if(!caliperStep())return;
 settledContact=atContact()&&moved;
 if(settledContact){
  caliperPhase=calibration()?'success':'answer';
  if(calibration()){
   success('✓ Нуль установлено.');
   // Calibration is preparation, not a destination. Show the specimen automatically.
   cancelAdvanceTimer();
   advanceTimer=setTimeout(()=>{
    advanceTimer=null;
    if(visible&&mode==='demo'&&memory.scene===1&&memory.completed.includes(1))setScene(2);
   },750);
  }
 }else caliperPhase='idle';
 render();
}
function rotateSpecimen(){
 if(!visible||mode!=='demo'||memory.scene!==6||dragId!==null)return;
 dimensionIndex=(dimensionIndex+1)%DIMENSIONS.length;
 gap=target()+24;
 caliperChosen=true;moved=false;settledContact=false;caliperPhase='idle';dragOffset=0;
 feedback='';feedbackSuccess=false;hintLevel=0;
 render();
}
function respond(act){
 if(act==='hint'){hintLevel=Math.min(3,hintLevel+1);render();return}
 if(act==='show'){hintLevel=3;render();return}
 if(act==='skip'&&mode==='demo'){if(!memory.skipped.includes(memory.scene))memory.skipped.push(memory.scene);setScene(memory.scene+1);return}
 if(act==='next'){
  if(mode==='quest'&&memory.assessment===4){document.querySelector('#expModes [data-mode="explore"]')?.click();return}
  if(mode==='demo'&&sceneComplete()){
   if(memory.scene===7){
    if(firstUnfinished()<7){setScene(firstUnfinished());return}
    document.querySelector('#expModes [data-mode="quest"]')?.click();return;
   }
   setScene(memory.scene+1);
  }
  return;
 }
 if(act==='repeat'){
  cancelAdvanceTimer();
  if(mode==='demo'&&(memory.scene===3||memory.scene===5||memory.scene===6)){
   memory.completed=memory.completed.filter(x=>x!==memory.scene);
   if(memory.scene===6)memory.dimensionProgress={};
   if(memory.scene===5)memory.prefixLabProgress={};
   persist();
  }
  resetStep();render();return
 }
 if(act==='choose-a'||act==='choose-b'){
  if(mode!=='demo'||memory.scene!==0||choice)return;
  choice=act.slice(-1);success('✓ Обрано. Перевіримо вимірюванням.');render();
  cancelChoiceTimer();choiceTimer=setTimeout(()=>{
   choiceTimer=null;
   if(visible&&mode==='demo'&&memory.scene===0&&choice)setScene(1);
  },520);
  return;
 }
 if(act.startsWith('unit-')){
  const unit=act.slice(5);
  if(mode!=='demo'||memory.scene!==3||!['mm','cm','m'].includes(unit))return;
  unitSelected=unit;seenUnits.add(unit);
  if(sceneComplete()&&!memory.completed.includes(3))
   success('✓ 50 мм = 5 см = 0,05 м. Брусок не змінився. Натисни «Далі →».');
  render();
  controls.querySelector('[data-act="unit-'+unit+'"]')?.focus({preventScroll:true});
  return;
 }
 if(act==='rotate-block'){rotateSpecimen();return}
 if(act==='part-a'||act==='part-b'){part=act.slice(-1);gap=target()+20;moved=false;feedback='';render();return}
 if(act.startsWith('scale-')){zoomIndex=Number(act.slice(6));seenScale.add(zoomIndex);render();return}
 if(act.startsWith('prefix-')){prefixLabAction(act);return}
 if(act==='check'){check();return}
}
root.addEventListener('click',e=>{
 const button=e.target.closest('button[data-act]');if(button)respond(button.dataset.act);
});
root.addEventListener('change',e=>{
 if(!visible||mode!=='demo'||memory.scene!==5||e.target?.id!=='m01PrefixRange')return;
 prefixSelect(Number(e.target.value));
});
canvas.addEventListener('click',e=>{
 if(!visible||mode!=='demo')return;
 if(memory.scene===6&&e.target.closest('[data-rotate-block]')){
  if(suppressTurnClick){suppressTurnClick=false;return}
  rotateSpecimen();return;
 }
 if(memory.scene===3&&e.target.closest('[data-unit-cycle]')){
  const units=['mm','cm','m'];respond('unit-'+units[(units.indexOf(unitSelected)+1)%units.length]);return;
 }
 if(memory.scene!==0)return;
 const item=e.target.closest('[data-guess]');if(item)respond('choose-'+item.dataset.guess);
});
root.addEventListener('keydown',e=>{
 if(e.key==='Enter'&&e.target.id==='m01Value'){e.preventDefault();check()}
});

dock.addEventListener('click',e=>{
 if(!visible||!caliperStep())return;
 const b=e.target.closest('button[data-tool="caliper"]');
 if(!b)return;
 // The training station owns the measurement: don't trigger the free-drafting tool.
 e.preventDefault();e.stopImmediatePropagation();
 // Already present and interactive in this lesson; don't open the free-drawing version.
},{capture:true});
function clientToSvg(event){
 const p=canvas.createSVGPoint();p.x=event.clientX;p.y=event.clientY;
 const mat=canvas.getScreenCTM();return mat?p.matrixTransform(mat.inverse()):null;
}
canvas.addEventListener('pointerover',e=>{
 if(!visible||!caliperStep()||dragId!==null||!e.target.closest('[data-jaw]'))return;
 caliperPhase=atContact()?'contact':'hover';
 syncCaliperVisual();
});
canvas.addEventListener('pointerout',e=>{
 if(!visible||!caliperStep()||dragId!==null||!e.target.closest('[data-jaw]'))return;
 caliperPhase=atContact()?'contact':'idle';
 syncCaliperVisual();
});
canvas.addEventListener('pointerdown',e=>{
 if(visible&&mode==='demo'&&memory.scene===6&&e.button===0&&e.target.closest('[data-rotate-block]')){
  const p=clientToSvg(e);
  if(!p)return;
  suppressTurnClick=false;
  turnPointer={id:e.pointerId,x:p.x,y:p.y};
  e.preventDefault();
  try{canvas.setPointerCapture(e.pointerId)}catch{}
  return;
 }
 if(!visible||!caliperStep()||e.button!==0||!e.target.closest('[data-jaw]'))return;
 const p=clientToSvg(e);if(!p)return;
 dragOffset=p.x-(X0+gap*MM);
 dragId=e.pointerId;caliperPhase='drag';settledContact=false;
 e.preventDefault();
 try{canvas.setPointerCapture(dragId)}catch{}
 syncCaliperVisual();
});
canvas.addEventListener('pointermove',e=>{
 if(turnPointer&&turnPointer.id===e.pointerId)return;
 if(dragId!==e.pointerId)return;
 const p=clientToSvg(e);
 if(p)updateGap((p.x-dragOffset-X0)/MM,true);
});
function release(e){
 if(turnPointer&&turnPointer.id===e.pointerId){
  turnPointer=null;
  try{canvas.releasePointerCapture(e.pointerId)}catch{}
  // A tap or swipe turns the wooden solid; suppress any synthetic click.
  suppressTurnClick=true;
  rotateSpecimen();
  return;
 }
 if(dragId!==e.pointerId)return;
 dragId=null;
 try{canvas.releasePointerCapture(e.pointerId)}catch{}
 finishCaliperMotion();
}
canvas.addEventListener('pointerup',release);
canvas.addEventListener('pointercancel',e=>{
 if(turnPointer&&turnPointer.id===e.pointerId){
  turnPointer=null;suppressTurnClick=false;return;
 }
 if(dragId!==e.pointerId)return;
 dragId=null;settledContact=false;caliperPhase='idle';render();
});
canvas.addEventListener('keydown',e=>{
 if(visible&&mode==='demo'&&memory.scene===6&&e.target.closest('[data-rotate-block]')&&['Enter',' ','ArrowRight','ArrowLeft'].includes(e.key)){
  e.preventDefault();rotateSpecimen();
  canvas.querySelector('[data-rotate-block]')?.focus({preventScroll:true});return;
 }
 if(visible&&mode==='demo'&&memory.scene===3&&e.target.closest('[data-unit-cycle]')&&['Enter',' '].includes(e.key)){
  e.preventDefault();const units=['mm','cm','m'];respond('unit-'+units[(units.indexOf(unitSelected)+1)%units.length]);return;
 }
 const item=e.target.closest('[data-guess]');
 if(visible&&mode==='demo'&&memory.scene===0&&item&&['Enter',' '].includes(e.key)){
  e.preventDefault();respond('choose-'+item.dataset.guess);return;
 }
 if(!visible||!caliperStep()||!e.target.closest('[data-jaw]'))return;
 const key=e.key;
 if(!['ArrowLeft','ArrowRight','PageUp','PageDown','Home','End'].includes(key))return;
 e.preventDefault();
 const delta=key==='ArrowLeft'?-0.1:key==='ArrowRight'?0.1:key==='PageDown'?-1:1;
 const val=key==='Home'?(calibration()?0:target()):key==='End'?160:gap+delta;
 updateGap(val,true);
 if(atContact()){
  finishCaliperMotion();
  canvas.querySelector('[data-jaw]')?.focus({preventScroll:true});
 }
});
function show(nextMode){
 cancelChoiceTimer();cancelAdvanceTimer();visible=true;mode=nextMode;root.hidden=false;
 // On reload, don't leave a student on an already-completed calibration or a skipped ending.
 if(nextMode==='demo'&&(firstUnfinished()<memory.scene||
   memory.scene<7&&memory.scene!==5&&memory.completed.includes(memory.scene))){
  memory.scene=firstUnfinished();persist();
 }
 document.body.classList.add('gnss-mission-active');
 window.GNSSLab01Journey?.close?.();
 const legacy=document.getElementById('jRestoreRoute');if(legacy)legacy.hidden=true;
 resetStep();render();
}
function hide(){
 if(!visible)return;
 cancelChoiceTimer();cancelAdvanceTimer();visible=false;root.hidden=true;document.body.classList.remove('gnss-mission-active');
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
  else {cancelChoiceTimer();cancelAdvanceTimer();memory.scene=0;memory.completed=[];memory.skipped=[];memory.dimensionProgress={};memory.prefixLabProgress={};persist()}
  resetStep();if(visible)render();
 }
};
sync();
})();
