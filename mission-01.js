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
 {name:'Відрізок',title:'Проведи відрізок',prompt:'Візьми початкову точку й побудуй відрізок завдовжки 50 мм.'},
 {name:'Прямокутник',title:'Побудуй прямокутник',prompt:'Потягни від кута й побудуй прямокутник 40 × 25 мм.'},
 {name:'Коло',title:'Побудуй коло',prompt:'Потягни від центра назовні й побудуй коло радіусом 20 мм.'},
 {name:'Закріплення',title:'Обертай і вимірюй',prompt:'Поверни брусок і виміряй довжину, ширину та товщину.'},
 {name:'Підсумок',title:'Місію завершено',prompt:''}
];
const tasks=[
 {name:'Виміряй деталь',prompt:'Зведи губки й зчитай шкалу.'},
 {name:'Відрізок',prompt:'Побудуй відрізок 35 мм.'},
 {name:'Прямокутник',prompt:'Побудуй прямокутник 30 × 20 мм.'},
 {name:'Коло',prompt:'Побудуй коло радіусом 12 мм.'}
];
// One wooden specimen (millimetres); the caliper measures each horizontal face.
const DIMENSIONS=[
 {id:'length',name:'Довжина',mm:42,face:'верхня грань'},
 {id:'width',name:'Ширина',mm:28,face:'поворот на 90°'},
 {id:'thickness',name:'Товщина',mm:18,face:'бічна грань'}
];
const initial={scene:0,completed:[],skipped:[],assessment:0,passed:false,assessmentAttempts:0,dimensionProgress:{},curriculumVersion:3};
const firstUnfinished=()=>{for(let i=0;i<7;i++)if(!memory.completed.includes(i))return i;return 7};
let memory={...initial};
try{
 const p=JSON.parse(localStorage.getItem(STORE)||'{}');
 if(p&&typeof p==='object'){
  memory={...initial,...p,scene:clamp(Number(p.scene)||0,0,7),assessment:clamp(Number(p.assessment)||0,0,4),
   completed:Array.isArray(p.completed)?p.completed.filter(x=>Number.isInteger(x)&&x>=0&&x<7):[],
   skipped:Array.isArray(p.skipped)?p.skipped.filter(x=>Number.isInteger(x)&&x>=0&&x<7):[],
   passed:!!p.passed};
  // Old numeric conversions have been replaced with physical drafting.
  // Keep verified caliper progress but offer all three new geometry lessons.
  if(p.curriculumVersion!==3){
   memory.completed=memory.completed.filter(n=>n<3||n===6);
   memory.skipped=memory.skipped.filter(n=>n<3||n===6);
   memory.scene=Math.min(memory.scene,3);
   memory.assessment=0;memory.passed=false;memory.curriculumVersion=3;
   try{localStorage.setItem(STORE,JSON.stringify(memory))}catch{}
  }
 }
}catch{}
// All dimensions are mm, physically laid out on the existing drafting board.
const DRAW_ORIGIN={x:425,y:325};
function geometryTask(){
 if(mode==='quest')return {
  1:{kind:'line',width:35},2:{kind:'rect',width:30,height:20},3:{kind:'circle',radius:12}
 }[memory.assessment]||null;
 return {
  3:{kind:'line',width:50},4:{kind:'rect',width:40,height:25},5:{kind:'circle',radius:20}
 }[memory.scene]||null;
}
let geomPointer=null,geomDraft=null,geomDone=false,geomLast=null,geomKeyboard=0,
 geomAnimating=false,geomPlayback=null;
let mode='',visible=false,part='a',gap=78,caliperChosen=false,moved=false,choice='',
 answers={},
 hintLevel=0,feedback='',feedbackSuccess=false,dragId=null,roundAttempts=0,
 practiceIndex=0,practiced=new Set(),dimensionIndex=0,dimensionReadings={},turnPointer=null,solidPose={roll:0,yaw:0,pitch:0},turnAnimation=null,turning=false,assessmentTarget=42,assessmentSeed=0,
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
 '<footer class="m01-footer"><div class="m01-footer-left"><button type="button" data-act="hint" title="Підказка" aria-label="Підказка">?</button><button type="button" data-act="restart-all" id="m01Reset" title="Скинути місію та почати з 1/8" aria-label="Скинути весь прогрес місії та повернутися до першого рівня">↻</button></div>'+
 '<div class="m01-footer-right"><span id="m01Progress"></span><button type="button" data-act="skip" id="m01Skip">Пропустити</button><button type="button" data-act="next" id="m01Next" class="m01-primary">Далі →</button></div></footer>';
board.append(root);
const el=id=>root.querySelector('#'+id),canvas=el('m01Canvas'),controls=el('m01Controls'),feedbackEl=el('m01Feedback');
const draw=(s)=>canvas.innerHTML=s;
const persist=()=>{try{localStorage.setItem(STORE,JSON.stringify(memory))}catch{}};
function resetStep(){
 stopTurnAnimation();cancelDraftingAnimation();
 part='a';gap=78;caliperChosen=false;moved=false;settledContact=false;caliperPhase='idle';dragOffset=0;choice='';answers={};
 hintLevel=0;feedback='';feedbackSuccess=false;
 geomPointer=null;geomDraft=null;geomLast=null;geomKeyboard=0;
 geomDone=mode==='demo'&&memory.completed.includes(memory.scene)&&memory.scene>=3&&memory.scene<=5;
 dragId=null;roundAttempts=0;practiceIndex=0;practiced=new Set();
  dimensionReadings=mode==='demo'&&memory.scene===6?
   Object.fromEntries(DIMENSIONS.filter(d=>memory.dimensionProgress?.[d.id]===d.mm).map(d=>[d.id,d.mm])):{};
  dimensionIndex=mode==='demo'&&memory.scene===6?
   Math.max(0,DIMENSIONS.findIndex(d=>dimensionReadings[d.id]!==d.mm)):0;
  turnPointer=null;solidPose=facePose(dimensionIndex);
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
function canMeasure(){return caliperChosen&&!turnPointer&&!turning&&moved&&settledContact&&Math.abs(gap-target())<.001}
function sceneComplete(){
 if(mode==='quest')return memory.assessment>=4;
 switch(memory.scene){
  case 0:return !!choice;
  case 1:return caliperChosen&&moved&&gap===0;
  case 2:return answers.a===50&&answers.b===54;
  case 3:case 4:case 5:return geomDone;
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

/* A single 42×28×18 mm solid. Its six physical faces are projected from
 * three-dimensional vertices. Dragging redraws the mesh in place, frame by
 * frame; measured widths are authoritative only when a face has snapped.
 * Keeping the photo texture on the faces also avoids another image download.
 */
const SOLID_PI=Math.PI;
const FACE_POSES=[
 {roll:0,yaw:0,pitch:0},
 {roll:-SOLID_PI/2,yaw:0,pitch:0},
 {roll:0,yaw:SOLID_PI/2,pitch:0}
];
function facePose(index){return {...FACE_POSES[index]}}
function angleGap(a,b){return Math.atan2(Math.sin(a-b),Math.cos(a-b))}
function nearestFace(pose){
 const candidates=[
  {index:0,roll:0,yaw:0},
  {index:1,roll:-SOLID_PI/2,yaw:0},
  {index:1,roll:SOLID_PI/2,yaw:0},
  {index:2,roll:0,yaw:SOLID_PI/2},
  {index:2,roll:0,yaw:-SOLID_PI/2}
 ];
 let best=candidates[0],distance=Infinity;
 for(const c of candidates){
  const d=Math.pow(angleGap(pose.roll,c.roll),2)+Math.pow(angleGap(pose.yaw,c.yaw),2);
  if(d<distance){best=c;distance=d}
 }
 return best;
}
function solidPoint(pose,vec,cx,cy){
 const [x,y,z]=vec,cY=Math.cos(pose.yaw),sY=Math.sin(pose.yaw),
  cP=Math.cos(pose.pitch||0),sP=Math.sin(pose.pitch||0),
  cR=Math.cos(pose.roll),sR=Math.sin(pose.roll);
 const a=x*cY+z*sY,b=z*cY-x*sY,yy=y*cP-b*sP,zz=y*sP+b*cP;
 return {x:cx+a*cR-yy*sR,y:cy+a*sR+yy*cR,z:zz};
}
function woodSolidMesh(pose,cx){
 const L=42*MM/2,W=28*MM/2,T=18*MM/2,cy=313;
 const faces=[
  {name:'front',n:[0,0,1],corners:[[-L,-W,T],[L,-W,T],[L,W,T],[-L,W,T]],tint:'#ead4aa'},
  {name:'back',n:[0,0,-1],corners:[[L,-W,-T],[-L,-W,-T],[-L,W,-T],[L,W,-T]],tint:'#d7b78c'},
  {name:'right',n:[1,0,0],corners:[[L,-W,T],[L,-W,-T],[L,W,-T],[L,W,T]],tint:'#ad8255'},
  {name:'left',n:[-1,0,0],corners:[[-L,-W,-T],[-L,-W,T],[-L,W,T],[-L,W,-T]],tint:'#ae8054'},
  {name:'top',n:[0,-1,0],corners:[[-L,-W,-T],[L,-W,-T],[L,-W,T],[-L,-W,T]],tint:'#f0dcba'},
  {name:'bottom',n:[0,1,0],corners:[[-L,W,T],[L,W,T],[L,W,-T],[-L,W,-T]],tint:'#a98256'}
 ];
 const visible=faces.map((f,i)=>{
  const n=solidPoint(pose,f.n,0,0),d=n.z;
  const pts=f.corners.map(p=>solidPoint(pose,p,cx,cy));
  return {...f,id:i,d,pts,depth:pts.reduce((sum,p)=>sum+p.z,0)/4};
 }).filter(f=>f.d>.0001).sort((a,b)=>a.depth-b.depth);
 let out='<defs>'+
  '<filter id="m01SolidShadow" x="-30%" y="-30%" width="160%" height="170%">'+
  '<feGaussianBlur stdDeviation="5"/></filter>'+
  '</defs>';
 out+='<ellipse cx="'+(cx+8).toFixed(2)+'" cy="378" rx="85" ry="12" fill="#031b2b" opacity=".26" filter="url(#m01SolidShadow)"/>';
 for(const f of visible){
  const path=f.pts.map(p=>p.x.toFixed(2)+','+p.y.toFixed(2)).join(' ');
  const xs=f.pts.map(p=>p.x),ys=f.pts.map(p=>p.y),
   lx=Math.min(...xs),ly=Math.min(...ys),ww=Math.max(...xs)-lx,hh=Math.max(...ys)-ly;
  out+='<polygon points="'+path+'" fill="'+f.tint+'" stroke="#654c31" stroke-width="1.7" stroke-linejoin="round"/>';
  if(ww>2&&hh>2){
   // Affine-map the existing wooden photograph onto each planar 3D face.
   // The grain now rotates WITH the solid instead of sticking to the screen.
   const [p0,p1,p2,p3]=f.pts,mat=[
    p1.x-p0.x,p1.y-p0.y,p3.x-p0.x,p3.y-p0.y,p0.x,p0.y
   ].map(v=>v.toFixed(4)).join(' ');
   // The orthographic projection of a rectangular face is a parallelogram;
   // its affine image has the correct boundary without an extra clip-path.
   out+='<image href="'+WOOD_SPECIMEN+'" x="0" y="0" width="1" height="1"'+
    ' preserveAspectRatio="none" transform="matrix('+mat+')"'+
    ' opacity="'+(f.name==='front'||f.name==='back'?.92:.68)+'"/>';
  }
  const shade=f.name==='front'?'#f4e2c1':f.name==='back'?'#a57d53':'#98683b';
  out+='<polygon points="'+path+'" fill="'+shade+'" fill-opacity="'+(f.name==='front'?.08:.22)+'"'+
   ' stroke="#efd7aa" stroke-opacity=".53" stroke-width="1"/>';
 }
 return out;
}
function orientableBlockSvg(){
 const dim=DIMENSIONS[dimensionIndex],activeWidth=dim.mm*MM,cx=X0+activeWidth/2;
 return '<g class="m01-workpiece m01-wood-workpiece m01-rotatable-block" data-wood="true"'+
  ' data-orientation="'+dim.id+'" aria-label="Дерев’яний брусок: утримуй і перетягуй для обертання">'+
  '<g data-solid-mesh="true">'+woodSolidMesh(solidPose,cx)+'</g>'+
  '<rect class="m01-rotate-hit" x="'+(cx-100)+'" y="225" width="200" height="164"'+
  ' rx="15" fill="transparent" role="button" tabindex="0" data-rotate-block="true"'+
  ' aria-label="Схопити брусок та повернути перетягуванням. Клавіші зі стрілками змінюють грань." />'+
  '</g>';
}
function updateManualMesh(pose,cx){
 const g=canvas.querySelector('[data-solid-mesh]');
 if(g)g.innerHTML=woodSolidMesh(pose,cx);
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


// Drafting with a ruler and pencil: drag an endpoint from a physical anchor.
// Everything is in millimetres via the same MM factor as the caliper.
function shapeParameters(task,draft){
 const p=draft||{dx:0,dy:0};
 if(task.kind==='line')return {dx:clamp(p.dx,0,510),dy:clamp(p.dy,-220,220)};
 if(task.kind==='rect')return {dx:clamp(p.dx,0,510),dy:clamp(p.dy,0,250)};
 return {dx:clamp(p.dx,-260,260),dy:clamp(p.dy,-230,230)};
}
function shapeGoal(task){
 return task.kind==='line'?{dx:task.width*MM,dy:0}:
 task.kind==='rect'?{dx:task.width*MM,dy:task.height*MM}:
 {dx:task.radius*MM,dy:0};
}
function geometryDimensions(task,draft){
 const p=shapeParameters(task,draft);
 if(task.kind==='line')return {length:Math.hypot(p.dx,p.dy)/MM};
 if(task.kind==='rect')return {width:p.dx/MM,height:p.dy/MM};
 return {radius:Math.hypot(p.dx,p.dy)/MM};
}
function shapeMatches(task,draft){
 const v=geometryDimensions(task,draft);
 if(task.kind==='line')return Math.abs(v.length-task.width)<=1.2&&Math.abs(draft.dy/MM)<=2;
 if(task.kind==='rect')return Math.abs(v.width-task.width)<=1.2&&Math.abs(v.height-task.height)<=1.2;
 return Math.abs(v.radius-task.radius)<=1.2;
}
function shapeDescription(task){
 return task.kind==='line'?task.width+' мм':task.kind==='rect'?
  task.width+' × '+task.height+' мм':'R '+task.radius+' мм';
}
function drawnShape(task,draft){
 if(!task||!draft)return '';
 const p=shapeParameters(task,draft),x=DRAW_ORIGIN.x,y=DRAW_ORIGIN.y,ex=x+p.dx,ey=y+p.dy;
 let shape='';
 if(task.kind==='line'){
  shape='<line x1="'+x+'" y1="'+y+'" x2="'+ex+'" y2="'+ey+'" stroke="#bff68e" stroke-width="5" stroke-linecap="round"/>'+
   '<circle cx="'+ex+'" cy="'+ey+'" r="6" fill="#d8fdbd"/>';
 }else if(task.kind==='rect'){
  shape='<rect x="'+x+'" y="'+y+'" width="'+p.dx+'" height="'+p.dy+'" fill="#c1f998" fill-opacity=".09"'+
   ' stroke="#c3fb91" stroke-width="3" stroke-linejoin="round"/>'+
   '<circle cx="'+ex+'" cy="'+ey+'" r="6" fill="#d8fdbd"/>';
 }else{
  const radius=Math.hypot(p.dx,p.dy);
  shape='<circle cx="'+x+'" cy="'+y+'" r="'+radius+'" fill="#c1f998" fill-opacity=".08" stroke="#baff8b" stroke-width="3"/>'+
   '<line x1="'+x+'" y1="'+y+'" x2="'+ex+'" y2="'+ey+'" stroke="#baff8b" stroke-width="2" stroke-dasharray="5 4"/>'+
   '<circle cx="'+ex+'" cy="'+ey+'" r="5" fill="#dbffc2"/>';
 }
 const v=geometryDimensions(task,draft);
 const label=task.kind==='line'?fmt(v.length,1)+' мм':task.kind==='rect'?
  fmt(v.width,1)+' × '+fmt(v.height,1)+' мм':'R '+fmt(v.radius,1)+' мм';
 return shape+'<text x="640" y="535" text-anchor="middle" fill="#ecf9f6" font-size="21" font-weight="760">'+label+'</text>';
}

// Lesson 01 uses the EXACT sandbox drawing engine; no duplicate tool models.
// The same 3D ruler/pencil/compass and Canvas fallback operate in both modes.
function cancelDraftingAnimation(){
 const active=geomPlayback;
 geomPlayback=null;geomAnimating=false;
 document.body.classList.remove('gnss-mission-tool-playback');
 active?.cancel?.();
}
function lessonShape(task){
 const x=DRAW_ORIGIN.x,y=DRAW_ORIGIN.y,g=shapeGoal(task);
 if(task.kind==='line')return {type:'line',x1:x,y1:y,x2:x+g.dx,y2:y+g.dy};
 if(task.kind==='rect')return {type:'rect',x,y,w:g.dx,h:g.dy};
 return {type:'circle',x,y,r:g.dx,startAngle:-Math.PI/2};
}
function startDraftingAnimation(task){
 cancelDraftingAnimation();
 geomAnimating=true;geomDraft=null;geomPointer=null;
 render();
 document.body.classList.add('gnss-mission-tool-playback');
 const api=window.GNSSDrafting3D?.playLesson;
 const finish=(ok)=>{
  if(!geomAnimating||!visible||geometryTask()?.kind!==task.kind)return;
  geomPlayback=null;geomAnimating=false;
  document.body.classList.remove('gnss-mission-tool-playback');
  if(!ok){
   announce('Інструмент не зміг завершити креслення. Повтори побудову.');
   render();return;
  }
  geomDone=true;geomDraft=shapeGoal(task);
  if(mode==='quest'){onSuccess();return}
  success('✓ Побудовано інструментами: '+shapeDescription(task)+'. Натисни «Далі →».');
  render();
 };
 // 3.25 SVG px / mm in Mission, 3 px / mm in Sandbox.
 // Scale the shared physical ruler instead of showing incorrect tick labels.
 const controller=typeof api==='function'?api(lessonShape(task),{
  unitScaleFactor:MM/3,onComplete:finish
 }):null;
 if(!controller){
  geomAnimating=false;geomPlayback=null;
  document.body.classList.remove('gnss-mission-tool-playback');
  announce('Рушій інструментів недоступний. Спробуй повторити вправу.');
  render();return;
 }
 geomPlayback=controller;
}

function geometryScene(){
 const task=geometryTask();
 if(!task)return schematic();
 const goal=shapeGoal(task),x=DRAW_ORIGIN.x,y=DRAW_ORIGIN.y;
 let s=schematic();
 // A pale target makes the first action discoverable without pre-drawing the answer.
 s+='<text x="600" y="216" text-anchor="middle" font-size="24" font-weight="750" fill="#d9f4e6">'+
 (task.kind==='line'?'ВІДРІЗОК':task.kind==='rect'?'ПРЯМОКУТНИК':'КОЛО')+' · '+shapeDescription(task)+'</text>';
 if(task.kind==='line'){
  s+='<line x1="'+x+'" y1="'+y+'" x2="'+(x+goal.dx)+'" y2="'+y+'" stroke="#9cd3c2" stroke-opacity=".35" stroke-width="3" stroke-dasharray="7 8"/>';
 }else if(task.kind==='rect'){
  s+='<rect x="'+x+'" y="'+y+'" width="'+goal.dx+'" height="'+goal.dy+'" fill="none" stroke="#b8e3dd" stroke-opacity=".28" stroke-width="2" stroke-dasharray="7 8"/>';
 }else{
  s+='<circle cx="'+x+'" cy="'+y+'" r="'+goal.dx+'" fill="none" stroke="#b8e3dd" stroke-opacity=".28" stroke-width="2" stroke-dasharray="7 8"/>';
 }
 const current=geomAnimating?null:(geomDraft||(geomDone?shapeGoal(task):null));
 s+='<g data-geom-preview="true">'+drawnShape(task,current)+'</g>';
 s+='<circle cx="'+x+'" cy="'+y+'" r="11" fill="#c9fba8" stroke="#0c3440" stroke-width="4"/>'+
  '<circle cx="'+x+'" cy="'+y+'" r="29" class="m01-geom-handle" data-geom-start="true"'+
  ' fill="transparent" stroke="#c7ffa7" stroke-width="2" stroke-dasharray="5 6" tabindex="0"'+
  ' role="button" aria-label="Початок побудови. Утримуй та переміщуй курсор, або використай стрілки й Enter"/>';
 s+='<text x="'+x+'" y="'+(y-43)+'" text-anchor="middle" fill="#d6f6da" font-size="15">ПОЧАТОК</text>';
 if(geomDone)s+='<text x="600" y="578" text-anchor="middle" fill="#b5fa8f" font-size="17">✓ Побудову виконано · Далі →</text>';
 return s;
}
function updateGeometryPreview(){
 const task=geometryTask();if(!task)return;
 const group=canvas.querySelector('[data-geom-preview]');
 if(group)group.innerHTML=drawnShape(task,geomDraft);
}
function finishGeometry(draft){
 const task=geometryTask();if(!task||geomDone||geomAnimating)return;
 geomLast=draft;
 if(!shapeMatches(task,draft)){
  const values=geometryDimensions(task,draft);
  const value=task.kind==='line'?fmt(values.length,1)+' мм':
   task.kind==='rect'?fmt(values.width,1)+' × '+fmt(values.height,1)+' мм':
   'R '+fmt(values.radius,1)+' мм';
  announce('Поки '+value+'. Потрібно '+shapeDescription(task)+'. Спробуй ще раз.');
  geomDraft=null;updateGeometryPreview();
  return;
 }
 startDraftingAnimation(task);
}
function geometryBegin(e){
 if(!visible||!geometryTask()||geomDone||geomAnimating||e.button!==0||!e.target.closest('[data-geom-start]'))return false;
 const p=clientToSvg(e);if(!p)return false;
 geomPointer=e.pointerId;geomDraft={dx:0,dy:0};geomLast=null;
 e.preventDefault();
 try{canvas.setPointerCapture(e.pointerId)}catch{}
 updateGeometryPreview();return true;
}
function geometryMove(e){
 if(geomPointer!==e.pointerId)return false;
 const p=clientToSvg(e),task=geometryTask();
 if(p&&task){
  geomDraft=shapeParameters(task,{dx:p.x-DRAW_ORIGIN.x,dy:p.y-DRAW_ORIGIN.y});
  updateGeometryPreview();
 }
 return true;
}
function geometryEnd(e,cancelled=false){
 if(geomPointer!==e.pointerId)return false;
 const draft=geomDraft;geomPointer=null;
 try{canvas.releasePointerCapture(e.pointerId)}catch{}
 if(cancelled){geomDraft=null;updateGeometryPreview();return true}
 if(draft)finishGeometry(draft);
 return true;
}
function geometryKeyboard(e){
 const task=geometryTask();
 if(!visible||!task||geomDone||geomAnimating||!e.target.closest('[data-geom-start]'))return false;
 const keys=['ArrowRight','ArrowLeft','ArrowUp','ArrowDown','Enter',' '];
 if(!keys.includes(e.key))return false;
 e.preventDefault();
 if(e.key==='Enter'||e.key===' '){
  finishGeometry(geomDraft||{dx:0,dy:0});return true;
 }
 if(!geomDraft)geomDraft={dx:0,dy:0};
 const mm=e.shiftKey?5:1;
 if(e.key==='ArrowRight')geomDraft.dx+=MM*mm;
 if(e.key==='ArrowLeft')geomDraft.dx-=MM*mm;
 if(e.key==='ArrowDown')geomDraft.dy+=MM*mm;
 if(e.key==='ArrowUp')geomDraft.dy-=MM*mm;
 geomDraft=shapeParameters(task,geomDraft);
 updateGeometryPreview();return true;
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
  if(memory.assessment>=1&&memory.assessment<=3)return geometryScene();
  return summaryScene();
 }
 const scene=memory.scene;
 if(scene===0)return overviewScene();
 if(scene===1)return caliperScene(0,gap,false);
 if(scene===2)return caliperScene(target(),gap);
 if(scene>=3&&scene<=5)return geometryScene();
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
  const chips=DIMENSIONS.map((d,i)=>'<button type="button" data-act="orient-'+i+'" class="m01-dim-chip'+
   (dimensionIndex===i?' current':'')+(dimensionReadings[d.id]===d.mm?' measured':'')+'"'+
   ' aria-pressed="'+(dimensionIndex===i)+'" title="Клавіатурний вибір грані">'+
   (dimensionReadings[d.id]===d.mm?'✓ ':'○ ')+d.name+'</button>').join('');
  const input=!sceneComplete()&&dimensionReadings[dim.id]!==dim.mm&&canMeasure()
   ?promptInput('Розмір грані','Зчитай шкалу','мм')+
    '<button type="button" class="m01-submit" data-act="check">Перевірити</button>':'';
  return '<div class="m01-dim-panel">'+
   '<div class="m01-control-title">Грань '+(dimensionIndex+1)+' / 3 · '+dim.name+'</div>'+
   '<div class="m01-dim-chips" aria-label="Виміряні грані">'+chips+'</div>'+
   '<div class="m01-manual-hint"><span class="m01-hand-symbol">✋</span>'+
    '<span>Утримуй брусок і тягни: <strong>праворуч → ширина, вгору ↑ товщина</strong>. Відпусти для фіксації.</span></div>'+
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
 if(geometryTask()){
  const task=geometryTask();
  const kind=task.kind==='line'?'ЛІНІЙКА + ОЛІВЕЦЬ':task.kind==='rect'?'КУТНИК + ОЛІВЕЦЬ':'ЦИРКУЛЬ';
  return '<div class="m01-geometry-panel">'+
   '<div class="m01-control-title">'+kind+'</div>'+
   '<div class="m01-geometry-target">'+shapeDescription(task)+'</div>'+
   '<div class="m01-geometry-instruction">Натисни на зелену точку й тягни до потрібного розміру. Відпусти для перевірки.</div>'+
   (geomAnimating?'<div class="m01-geometry-building">✎ Проводимо лінії інструментом…</div>':
    geomDone?'<div class="m01-geometry-done">✓ Побудова зарахована</div>':
    '<div class="m01-geometry-keyhint">Клавіатура: стрілки — 1 мм, Shift+стрілки — 5 мм, Enter — зафіксувати</div>')+
   '</div>';
 }
 return '';
}
function guidance(){
 if(mode==='quest')return '';
 const msgs=[
  'Спочатку припущення, потім вимірювання. Помилятися дозволено.',
  caliperChosen?'Тягни каретку вправо, а потім до нуля — або скористайся клавіатурою.':'У нижній панелі є реальний інструмент. Можна вибрати його там або натиснути «Взяти».',
  'Число треба зчитати зі шкали самостійно. Контакт губок підтверджує, що вимірювання можливе.',
  'Візьми початкову точку та проведи відрізок точної довжини за лінійкою.',
  'Побудуй прямокутник перетягуванням його протилежного кута. Контролюй ширину й висоту.',
  'Циркулем побудуй коло заданого радіуса. Відстань від центра до краю — це радіус.',
  'Схопи брусок і тягни курсор: праворуч — до ширини, вгору — до товщини. Відпусти й виміряй.',
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
 root.classList.toggle('m01-geometry-active',!!geometryTask());
 const spec=quest?tasks[Math.min(current,3)]:specs[current];
 const trainingFinished=memory.completed.length===7;
 el('m01Kicker').textContent=quest?'ПРАКТИЧНИЙ ЗАЛІК · МІСІЯ 01 · '+Math.min(current+1,4)+'/4':
  'НАВЧАННЯ · МІСІЯ 01 · '+(current+1)+'/8';
 el('m01Title').textContent=quest?(current===4?'Залік складено':spec.name):
  current===7?(trainingFinished?'Місія виконана':'Маршрут переглянуто'):spec.title;
 el('m01Prompt').textContent=caliperStep()?caliperInstruction():geomAnimating?'Інструмент проводить креслення…':quest?(current===4?'4/4 підтверджено':spec.prompt):current===7?'':current>=3&&current<=5&&sceneComplete()?'Побудова готова. Натисни «Далі →».':spec.prompt;
 el('m01Guidance').textContent=hintLevel>0&&!quest?hintMessage():'';
 draw(mainScene());
 renderScaleLoupe();
 controls.innerHTML=controlView();
 controls.hidden=!controls.innerHTML.trim();
 renderFeedback();
 const next=el('m01Next'),skip=el('m01Skip'),hint=root.querySelector('[data-act="hint"]');

 const allowed=quest?current>=4:!geomAnimating&&(sceneComplete()||memory.completed.includes(current));
 next.hidden=quest&&current<4||mode==='demo'&&current===0;
 next.disabled=!allowed;
 next.textContent=quest?'Пісочниця →':current===7?(trainingFinished?'До заліку →':'Повернутися до уроку →'):current===6&&allowed?'До підсумку →':current>=3&&current<=5&&allowed?'Наступна побудова →':'Далі →';
 next.classList.toggle('m01-next-ready',mode==='demo'&&current>=3&&current<=6&&allowed);
 skip.hidden=quest||current===7;hint.hidden=quest||current===7;

 el('m01Progress').textContent=quest?'✓ '+Math.min(current,4)+'/4':
  '✓ '+memory.completed.length+'/7';
}
function hintMessage(){
 const stage=memory.scene;
 const hints=[
  ['Обери A або B. Це лише припущення.','Спробуй порівняти торці брусків.','Натисни на одну з кнопок вибору деталі.'],
  ['Знайди штангенциркуль серед інструментів.','Його можна взяти кнопкою в цій сцені.','Потягни каретку вправо, потім вліво до позначки 0.'],
  ['Встанови вимірювальний інструмент.','Зсунь рухому губку до торця деталі.','Подивись на основну шкалу — потрібне число відповідає нулю рухомої каретки.'],
  ['Утримуй зелену точку та веди вправо.','Читай довжину в мм на кресленні.','Відпусти, коли відрізок досягне заданої довжини.'],
  ['Почни з лівого верхнього кута.','Рухай курсор праворуч і вниз — змінюються два розміри.','Відпусти, коли ширина та висота збігатимуться із завданням.'],
  ['Почни в центрі майбутнього кола.','Відстань від центра до краю називається радіусом.','Потягни в будь-який бік на потрібну відстань і відпусти.'],
  ['Утримуй брусок лівою кнопкою та веди мишу. Для ширини потягни вправо.','Для товщини потягни вгору. Після відпускання грань зафіксується.','Виміряй кожну грань штангенциркулем. Кнопки граней також доступні з клавіатури.']
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
 if(!Number.isFinite(value)){announce('Введи відлік штангенциркуля в міліметрах.');return}
 let expected=null;
 if(mode==='quest'){
  expected=memory.assessment===0?assessmentTarget:null;
  if(memory.assessment===0&&!canMeasure()){announce('Спочатку правильно встанови та зведи губки до контакту.');return}
 }else if(memory.scene===2){
  if(!canMeasure()){announce('Вимірювання зараховується лише після контакту губок.');return}
  expected=target();
 }
 else if(memory.scene===6){
  if(!canMeasure()){announce('Підведи губки до контакту з обраною гранню.');return}
  expected=target();
 }
 const tolerance=Math.abs(expected)>=30?(mode==='quest'&&memory.assessment===0?0.5:0.5):0.00001;
 if(expected===null||Math.abs(value-expected)>tolerance){
  roundAttempts++;if(mode==='quest'){memory.assessmentAttempts++;persist()}
  announce('Поки не збігається. Перевір шкалу й зчитай довжину в мм.');
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
// The user grips the specimen and rotates a genuine three-dimensional mesh.
// Measurement is locked while rotating or snapping to a known planar face.
function stopTurnAnimation(){
 if(turnAnimation!==null){window.cancelAnimationFrame?.(turnAnimation);turnAnimation=null}
 turning=false;turnPointer=null;
}
function commitFace(index,pose){
 dimensionIndex=index;solidPose=pose||facePose(index);
 gap=target()+24;
 caliperChosen=true;moved=false;settledContact=false;caliperPhase='idle';
 dragOffset=0;feedback='';feedbackSuccess=false;turning=false;
 render();
}
function animateFaceSnap(selected){
 const finish={roll:selected.roll,yaw:selected.yaw,pitch:0},from={...solidPose},
  centerStart=X0+DIMENSIONS[dimensionIndex].mm*MM/2,
  centerEnd=X0+DIMENSIONS[selected.index].mm*MM/2;
 turning=true;
 let origin=null;
 function frame(now){
  if(!turning||!visible||mode!=='demo'||memory.scene!==6){turnAnimation=null;return}
  if(origin===null)origin=now;
  const t=clamp((now-origin)/330,0,1),smooth=1-Math.pow(1-t,3);
  const at={roll:from.roll+angleGap(finish.roll,from.roll)*smooth,
    yaw:from.yaw+angleGap(finish.yaw,from.yaw)*smooth,pitch:from.pitch*(1-smooth)};
  solidPose=at;
  updateManualMesh(at,centerStart+(centerEnd-centerStart)*smooth);
  if(t<1){turnAnimation=window.requestAnimationFrame(frame)}
  else{turnAnimation=null;turning=false;commitFace(selected.index,finish)}
 }
 turnAnimation=window.requestAnimationFrame(frame);
}
function rotateToFace(index){
 if(!visible||mode!=='demo'||memory.scene!==6||dragId!==null||turnPointer)return;
 if(!Number.isInteger(index)||index<0||index>=DIMENSIONS.length)return;
 stopTurnAnimation();
 animateFaceSnap({index,...facePose(index)});
}
function beginManualTurn(event){
 if(!visible||mode!=='demo'||memory.scene!==6||dragId!==null||event.button!==0)return false;
 if(!event.target.closest('[data-rotate-block]'))return false;
 const p=clientToSvg(event);if(!p)return false;
 stopTurnAnimation();
 turnPointer={id:event.pointerId,x:p.x,y:p.y,pose:{...solidPose},distance:0};
 turning=true;settledContact=false;caliperPhase='idle';
 event.preventDefault();
 try{canvas.setPointerCapture(event.pointerId)}catch{}
 return true;
}
function updateManualTurn(event){
 if(!turnPointer||turnPointer.id!==event.pointerId)return false;
 const p=clientToSvg(event);if(!p)return true;
 const dx=p.x-turnPointer.x,dy=p.y-turnPointer.y;
 turnPointer.distance=Math.hypot(dx,dy);
 const start=turnPointer.pose;
 solidPose={
  roll:clamp(start.roll-dx*Math.PI/(2*125),-Math.PI,Math.PI),
  yaw:clamp(start.yaw-dy*Math.PI/(2*125),-Math.PI,Math.PI),
  pitch:clamp(dy/230,-.27,.27)
 };
 updateManualMesh(solidPose,X0+target()*MM/2);
 return true;
}
function endManualTurn(event,cancelled=false){
 if(!turnPointer||turnPointer.id!==event.pointerId)return false;
 const drag=turnPointer;turnPointer=null;
 try{canvas.releasePointerCapture(event.pointerId)}catch{}
 if(cancelled||drag.distance<12){
  commitFace(dimensionIndex,facePose(dimensionIndex));
  if(!cancelled)announce('Утримуй брусок та перемісти курсор. Один клік його не перевертає.');
  return true;
 }
 const selected=nearestFace(solidPose);
 animateFaceSnap(selected);
 return true;
}

function resetMissionToStart(){
 // Reset Mission 01 only. Keep the sandbox and other lessons untouched.
 cancelChoiceTimer();cancelAdvanceTimer();stopTurnAnimation();cancelDraftingAnimation();
 memory={...initial,completed:[],skipped:[],dimensionProgress:{},geometryProgress:{}};
 persist();
 // Completed assessments stay in Quest mode unless we switch the active tab.
 if(mode!=='demo'||document.body.dataset.expMode!=='demo'){
  document.querySelector('#expModes [data-mode="demo"]')?.click();
  if(document.body.dataset.expMode!=='demo')document.body.dataset.expMode='demo';
 }
 mode='demo';visible=true;root.hidden=false;
 document.body.classList.add('gnss-mission-active');
 resetStep();render();
}
function respond(act){
 if(act==='restart-all'){resetMissionToStart();return}
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
  if(mode==='demo'&&(memory.scene>=3&&memory.scene<=6)){
   memory.completed=memory.completed.filter(x=>x!==memory.scene);
   if(memory.scene===6)memory.dimensionProgress={};
   if(memory.scene>=3&&memory.scene<=5)memory.geometryProgress={};
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
 if(act.startsWith('orient-')){rotateToFace(Number(act.slice('orient-'.length)));return}
 if(act==='part-a'||act==='part-b'){part=act.slice(-1);gap=target()+20;moved=false;feedback='';render();return}
 if(act==='check'){check();return}
}
root.addEventListener('click',e=>{
 const button=e.target.closest('button[data-act]');if(button)respond(button.dataset.act);
});
canvas.addEventListener('click',e=>{
 if(!visible||mode!=='demo')return;
 if(memory.scene===6&&e.target.closest('[data-rotate-block]'))return; // Clicking alone does not rotate.
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
 if(geometryBegin(e))return;
 if(beginManualTurn(e))return;
 if(!visible||!caliperStep()||e.button!==0||!e.target.closest('[data-jaw]'))return;
 const p=clientToSvg(e);if(!p)return;
 dragOffset=p.x-(X0+gap*MM);
 dragId=e.pointerId;caliperPhase='drag';settledContact=false;
 e.preventDefault();
 try{canvas.setPointerCapture(dragId)}catch{}
 syncCaliperVisual();
});
canvas.addEventListener('pointermove',e=>{
 if(geometryMove(e))return;
 if(updateManualTurn(e))return;
 if(dragId!==e.pointerId)return;
 const p=clientToSvg(e);
 if(p)updateGap((p.x-dragOffset-X0)/MM,true);
});
function release(e){
 if(geometryEnd(e))return;
 if(endManualTurn(e))return;
 if(dragId!==e.pointerId)return;
 dragId=null;
 try{canvas.releasePointerCapture(e.pointerId)}catch{}
 finishCaliperMotion();
}
canvas.addEventListener('pointerup',release);
canvas.addEventListener('pointercancel',e=>{
 if(geometryEnd(e,true))return;
 if(endManualTurn(e,true))return;
 if(dragId!==e.pointerId)return;
 dragId=null;settledContact=false;caliperPhase='idle';render();
});
canvas.addEventListener('keydown',e=>{
 if(geometryKeyboard(e))return;
 if(visible&&mode==='demo'&&memory.scene===6&&e.target.closest('[data-rotate-block]')&&
  ['Enter',' ','ArrowRight','ArrowLeft','ArrowUp','ArrowDown'].includes(e.key)){
  e.preventDefault();
  const index=e.key==='ArrowLeft'||e.key==='ArrowDown'?(dimensionIndex+2)%3:(dimensionIndex+1)%3;
  rotateToFace(index);return;
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
 stopTurnAnimation();cancelDraftingAnimation();
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
 restart(){resetMissionToStart()}
};
sync();
})();
