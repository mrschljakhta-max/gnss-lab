/* GNSS LAB / Lesson 03 — Oscillations, waves and frequency */
(()=>{
'use strict';
const board=document.getElementById('engBoard');if(!board)return;
const NS='http://www.w3.org/2000/svg',TAU=2*Math.PI,KEY='gnss-lab-m03-v1';
const names=['Створи коливання','Народження хвилі','Керуй хвилею','Виміряй невидиме','Знайди резонанс','Від хвилі до сигналу'];
const desc=['Змінюй частоту генератора та спостерігай за циклами.','Торкнися води й увімкни джерело хвиль.','Зміни частоту й амплітуду окремо.','Встанови два маркери на сусідніх вершинах сигналу.','Налаштуй другий камертон до резонансу.','Налаштуй приймач на частоту передавача.'];
const qa=['Створи хвилю 3 Гц','Порівняй амплітуди','Виміряй частоту','Налаштуй приймач'];
const values=[20,20,30,30],clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),fmt=(v,n=1)=>Number(v).toLocaleString('uk-UA',{minimumFractionDigits:n,maximumFractionDigits:n});
let save;try{save=JSON.parse(localStorage.getItem(KEY)||'null')}catch{}
if(!save||save.version!==1)save={version:1,stage:0,done:[],q:0,marks:[null,null,null,null],attempt:0};
const persist=()=>{try{localStorage.setItem(KEY,JSON.stringify(save))}catch{}};
const root=document.createElement('section');root.id='gnssMission03';root.hidden=true;root.innerHTML=
 '<header class="m03-header"><h2 id="m03Title"></h2><p id="m03Subtitle"></p></header>'+
 '<div class="m03-stage"><canvas id="m03WaterCanvas" aria-hidden="true" hidden></canvas><svg id="m03Svg" viewBox="0 0 1200 660" aria-label="Інтерактивна фізична модель"></svg></div>'+
 '<aside class="m03-panel" id="m03Panel"></aside><nav id="m03Dock" class="m03-dock" hidden></nav>'+
 '<button id="m03Toggle" data-act="dock" class="m03-toggle" aria-label="Відкрити інструменти" hidden>☷</button>'+
 '<footer class="m03-footer"><button data-act="restart" title="На початок уроку">↻</button><span id="m03Progress"></span><button id="m03Next" data-act="next">Далі →</button></footer>';
board.append(root);
const $=id=>root.querySelector('#'+id),svg=$('m03Svg'),panel=$('m03Panel'),dock=$('m03Dock'),next=$('m03Next');
let radioClock=0,radioLock=0,tank=null,tankLoading=false,mode='demo',shown=false,raf=0,last=0,dockOpen=true,tool=0,phase=0,started=false,cycles=0,pressed=false,qaChoice=null;
let freq=2,amp=.55,frequency2=4,receiver=3,tx=5,markers=[.2,.4],source=false,waterRings=[],time=0,reading=null;
const active=()=>typeof window.GNSSLabActiveIndex==='function'?window.GNSSLabActiveIndex()===2:location.hash==='#lab-03';
function sync(){const want=active()&&document.body.classList.contains('engineering-live');if(!want){if(shown){shown=false;root.hidden=true;document.body.classList.remove('gnss-lesson03-active');cancelAnimationFrame(raf);raf=0}return}
 const m=document.body.dataset.expMode||'demo';if(!shown){shown=true;root.hidden=false;document.body.classList.add('gnss-lesson03-active');mode=m;reset(false);render();tick(performance.now())}else if(m!==mode){mode=m;reset(false);render()}}
function reset(resetSettings=true){started=false;cycles=0;source=false;waterRings=[];time=0;reading=null;qaChoice=null;phase=0;if(resetSettings){freq=2;amp=.55;frequency2=4;receiver=3;tx=5;markers=[.2,.4]}dockOpen=true}
const stage=()=>mode==='demo'?save.stage:mode==='quest'?save.q:tool;
const btn=(id,label,disabled=false)=>'<button type="button" data-act="'+id+'"'+(disabled?' disabled':'')+'>'+label+'</button>';
const slider=(key,label,val,min,max,step,unit='')=>'<label>'+label+' <output>'+fmt(val,step<1?1:0)+unit+'</output><input data-key="'+key+'" type="range" min="'+min+'" max="'+max+'" step="'+step+'" value="'+val+'"></label>';
function toolThumb(i){
 const start='<svg class="m03-thumb" viewBox="0 0 100 76" aria-hidden="true"><defs><linearGradient id="toolMetal'+i+'" x2=".8" y2="1"><stop stop-color="#e8f1ed"/><stop offset=".45" stop-color="#607e8b"/><stop offset="1" stop-color="#243846"/></linearGradient><linearGradient id="toolScreen'+i+'" x2="1" y2="1"><stop stop-color="#103a4b"/><stop offset="1" stop-color="#041723"/></linearGradient></defs>';
 const m='url(#toolMetal'+i+')',d='url(#toolScreen'+i+')';
 const images=[
  '<rect x="14" y="19" width="72" height="45" rx="7" fill="'+m+'" stroke="#c3e7ed" stroke-width="2"/><rect x="20" y="25" width="46" height="24" rx="3" fill="'+d+'"/><path d="M24 38q5-12 10 0t10 0t10 0" fill="none" stroke="#adf582" stroke-width="2.2"/><circle cx="74" cy="34" r="5" fill="#233f4b" stroke="#e3eff2"/><circle cx="74" cy="50" r="4" fill="#233f4b" stroke="#d7eff0"/><rect x="22" y="56" width="40" height="3" rx="2" fill="#243946"/>',
  '<path d="M9 29L23 17H77L91 29V60Q91 67 83 67H16Q9 67 9 60Z" fill="'+m+'" stroke="#e2fafc" stroke-width="2"/><path d="M17 29L27 23H73L83 29V55H17Z" fill="#063b55"/><ellipse cx="50" cy="42" rx="12" ry="5" fill="none" stroke="#50e0ed"/><ellipse cx="50" cy="42" rx="25" ry="11" fill="none" stroke="#44cde6" opacity=".8"/><ellipse cx="50" cy="42" rx="34" ry="17" fill="none" stroke="#38a8d3" opacity=".5"/><circle cx="50" cy="42" r="4" fill="#f0f5ed"/>',
  '<rect x="12" y="59" width="76" height="6" rx="3" fill="'+m+'"/><rect x="17" y="29" width="6" height="31" rx="2" fill="'+m+'"/><rect x="78" y="29" width="6" height="31" rx="2" fill="'+m+'"/><path d="M23 41Q30 17 39 41T55 41T72 41T79 41" fill="none" stroke="#b2f590" stroke-width="3"/><circle cx="26" cy="41" r="4" fill="#e6c48d"/>',
  '<rect x="12" y="15" width="76" height="53" rx="8" fill="'+m+'" stroke="#d9f4f4" stroke-width="2"/><rect x="17" y="20" width="52" height="37" rx="3" fill="'+d+'"/><path d="M20 40Q26 25 32 40T44 40T56 40T66 40" fill="none" stroke="#b1f484" stroke-width="2"/><path d="M30 22V55M48 22V55M18 38H68" stroke="#447082" opacity=".6"/><circle cx="77" cy="29" r="4" fill="#1b3743" stroke="#d5eef1"/><circle cx="77" cy="43" r="4" fill="#1b3743" stroke="#d5eef1"/>',
  '<rect x="12" y="61" width="76" height="6" rx="2" fill="'+m+'"/><path d="M28 16L33 47Q36 56 43 56Q50 56 53 47L58 16M59 16L64 47Q67 56 74 56Q81 56 84 47L89 16" fill="none" stroke="'+m+'" stroke-width="6" stroke-linecap="round"/><path d="M43 56V61M74 56V61" stroke="#d4eff0" stroke-width="4"/>',
  '<rect x="20" y="18" width="24" height="47" rx="5" fill="#152936" stroke="#9cbcc5" stroke-width="2"/><rect x="56" y="18" width="24" height="47" rx="5" fill="#152936" stroke="#9cbcc5" stroke-width="2"/><path d="M26 18V4M62 18V4" stroke="#d3e6e8" stroke-width="4" stroke-linecap="round"/><rect x="24" y="27" width="16" height="18" rx="2" fill="'+d+'"/><rect x="60" y="27" width="16" height="18" rx="2" fill="'+d+'"/><path d="M28 36h9M62 36q3-6 6 0t6 0" stroke="#b8f58e" fill="none" stroke-width="1.7"/><path d="M46 40Q50 34 54 40" stroke="#58d5fa" fill="none" stroke-width="2"/><path d="M25 51h14M61 51h14M25 55h14M61 55h14" stroke="#829aa3" stroke-width="2"/>'
 ];
 return start+images[i]+'</svg>';
}
const pass=()=>save.marks.reduce((a,b)=>a+(b||0),0)>=80;
function grade(points){if(mode!=='quest'||save.q>=4)return;save.marks[save.q]=clamp(points,0,values[save.q]);save.q++;persist();reset();render();
 if(save.q===4&&pass())document.dispatchEvent(new CustomEvent('gnss:mission-three-complete',{detail:{mission:3,completed:true,score:save.marks.reduce((a,b)=>a+(b||0),0)}}))}
function panelContent(){const n=stage();
 if(mode==='quest'){
  if(n===4)return '<h3>Практичний залік</h3><div class="m03-grade">'+save.marks.reduce((a,b)=>a+(b||0),0)+' / 100</div><strong>'+(pass()?'Залік складено':'Потрібно 80 балів')+'</strong>'+qa.map((v,i)=>'<p>'+v+' · '+save.marks[i]+'/'+values[i]+'</p>').join('')+btn('retake','Повторити залік');
  if(n===0)return '<h3>Генератор</h3>'+slider('freq','Частота',freq,1,8,1,' Гц')+btn('check','Перевірити частоту');
  if(n===1)return '<h3>Амплітуда</h3><p>Обери хвилю з більшою амплітудою.</p>'+btn('chooseA','Хвиля A')+btn('chooseB','Хвиля B');
  if(n===2)return '<h3>Осцилограф</h3><p>Період сигналу: '+fmt(1/freq,2)+' с. Введи частоту в Гц.</p><input id="m03Answer" inputmode="decimal" placeholder="Частота, Гц" aria-label="Частота в герцах">'+btn('check','Перевірити');
  return '<h3>Радіоприймач</h3><p>Передавач працює на '+fmt(tx,1)+' МГц.</p>'+slider('receiver','Частота приймача',receiver,1,10,.1,' МГц')+btn('check','Перевірити');
 }
 if(n===0)return '<h3>Генератор коливань</h3>'+slider('freq','Частота',freq,1,10,.5,' Гц')+btn('toggle',started?'Зупинити':'Запустити')+'<p>'+fmt(freq,1)+' циклів за секунду</p>';
 if(n===1)return '<h3>Хвильова ванна</h3>'+btn('drop','Створити хвилю')+btn('toggle',source?'Зупинити вібратор':'Увімкнути вібратор')+slider('freq','Частота',freq,1,8,.5,' Гц');
 if(n===2)return '<h3>Хвиля на мотузці</h3>'+slider('freq','Частота',freq,1,10,.5,' Гц')+slider('amp','Амплітуда',amp,.1,1,.1,'')+btn('toggle',started?'Зупинити':'Запустити');
 if(n===3)return '<h3>Осцилограф</h3>'+slider('freq','Частота',freq,1,10,.5,' Гц')+'<p>Перетягни маркери на два сусідні максимуми.</p><p>Δt: '+fmt(Math.abs(markers[1]-markers[0]),2)+' с</p>'+btn('measure','Виміряти');
 if(n===4)return '<h3>Два камертони</h3><p>Перший: '+fmt(freq,1)+' Гц</p>'+slider('f2','Другий камертон',frequency2,1,10,.1,' Гц')+btn('toggle',started?'Зупинити':'Вдарити камертон')+'<p>Відгук: '+fmt(100/(1+Math.pow(frequency2-freq,2)*9),0)+' %</p>';
 return '<h3>Передавач і приймач</h3>'+slider('tx','Передавач',tx,1,10,.1,' МГц')+slider('receiver','Приймач',receiver,1,10,.1,' МГц')+'<p>'+(Math.abs(tx-receiver)<.15?'Сигнал прийнято':'Налаштуй приймач на сигнал')+'</p>';
}
function render(){if(!shown)return;
 const n=stage(),end=mode==='quest'&&n>=4;
 $('m03Title').textContent=mode==='explore'?'Лабораторія хвиль':end?'Результат іспиту':mode==='quest'?qa[n]:names[n];
 $('m03Subtitle').textContent=mode==='explore'?'Обери інструмент і експериментуй.':end?'':mode==='quest'?'Практичне випробування':desc[n];
 panel.innerHTML=panelContent();$('m03Progress').textContent=mode==='quest'?Math.min(n,4)+'/4':mode==='demo'?Math.min(n+1,6)+'/6':'Пісочниця';
 next.hidden=mode!=='demo';next.disabled=mode==='demo'&&!save.done.includes(n);next.textContent=mode==='demo'&&n>=5?'Пісочниця →':'Далі →';
 $('m03Toggle').hidden=mode!=='explore';$('m03Toggle').setAttribute('aria-expanded',String(dockOpen));dock.hidden=mode!=='explore'||!dockOpen;
 dock.innerHTML=['Генератор','Хвильова ванна','Мотузка','Осцилограф','Камертони','Радіозв’язок'].map((name,i)=>'<button type="button" data-act="tool" data-tool="'+i+'" class="'+(tool===i?'selected':'')+'" aria-label="'+name+'" aria-pressed="'+(tool===i)+'">'+toolThumb(i)+'<span class="m03-tool-name">'+name+'</span></button>').join('');
 draw();
}
function markDone(){if(mode==='demo'&&!save.done.includes(save.stage)){save.done.push(save.stage);persist();next.disabled=false}}
function graphics(){const raw=stage(),n=mode==='quest'?(raw===0?0:raw===1?2:raw===2?3:raw===3?5:0):raw,wave=n===1||n===2||n===3;
 const line=(f,a,y,shift=0)=>Array.from({length:210},(_,i)=>{const x=90+i*4.9;return(i?'L':'M')+x.toFixed(1)+' '+(y-Math.sin(x/105*f+shift)*a).toFixed(1)}).join(' ');
 let shapes='<defs><linearGradient id="m03glow"><stop stop-color="#b7f48c"/><stop offset="1" stop-color="#63bcd8"/></linearGradient></defs><path d="M70 335H1120" stroke="#7498a5" stroke-dasharray="5 8"/>';
 if(n===0){
  const centerY=340,waveAmplitude=95;
  const wavePhase=time*TAU*freq;
  shapes+='<path d="'+line(freq,waveAmplitude,centerY,wavePhase)+'" stroke="#b4f58d" stroke-width="4" fill="none"/>';
 }

 else if(n===1){
  // Perspective acrylic tank and water caustics; SVG remains interactive and resolution-independent.
  const cx=590,cy=354,speed=145,maxR=690,spacing=speed/Math.max(.25,freq);
  shapes+='<defs>'+
  '<linearGradient id="m03TankEdge" x1="0" y1="0" x2="1" y2=".85"><stop stop-color="#f3ffff"/><stop offset=".16" stop-color="#397b91"/><stop offset=".35" stop-color="#d6fbff"/><stop offset=".59" stop-color="#35738c"/><stop offset=".83" stop-color="#c1f1fa"/><stop offset="1" stop-color="#24546e"/></linearGradient>'+
  '<linearGradient id="m03TankFace" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#a9eaf5" stop-opacity=".77"/><stop offset=".45" stop-color="#2e8ea7" stop-opacity=".68"/><stop offset="1" stop-color="#11526d" stop-opacity=".83"/></linearGradient>'+
  '<radialGradient id="m03Surface" cx=".5" cy=".4" r=".78"><stop stop-color="#006d80"/><stop offset=".62" stop-color="#074d65"/><stop offset="1" stop-color="#06334d"/></radialGradient>'+
  '<radialGradient id="m03Chrome" cx=".28" cy=".2" r=".85"><stop stop-color="#ffffff"/><stop offset=".38" stop-color="#d7e5e8"/><stop offset="1" stop-color="#50727d"/></radialGradient>'+
  '<filter id="m03SoftGlow" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="6"/></filter>'+
  '<filter id="m03WaterNoise" x="-10%" y="-10%" width="120%" height="120%"><feTurbulence type="fractalNoise" baseFrequency=".018 .032" numOctaves="2" seed="13" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="7"/></filter>'+
  '<clipPath id="m03WaterClip"><path d="M171 200L993 200Q1018 201 1024 225L1051 502Q1055 527 1021 527H163Q130 527 134 502L157 225Q159 202 171 200Z"/></clipPath>'+
  '</defs>'+
  '<ellipse cx="596" cy="566" rx="466" ry="24" fill="#001725" opacity=".28"/>'+
  '<path d="M157 166H1017Q1051 166 1060 197L1093 536Q1096 559 1057 571H126Q88 559 92 533L126 197Q130 166 157 166Z" fill="#06344c" stroke="#295b73" stroke-width="4"/>'+
  '<path d="M143 183H1034L1079 536Q1084 552 1054 553H132Q103 552 106 536Z" fill="url(#m03TankFace)" stroke="url(#m03TankEdge)" stroke-width="9"/>'+
  '<path d="M171 200H993Q1018 201 1024 225L1051 502Q1055 527 1021 527H163Q130 527 134 502L157 225Q159 202 171 200Z" fill="url(#m03Surface)"/>'+
  '<g clip-path="url(#m03WaterClip)">';
  // Procedural water reflections drift slowly; they do not carry explanatory text.
  for(let i=0;i<22;i++){
   const y=215+i*16.2;
   const offset=Math.sin(i*2.31+time*.65)*18;
   shapes+='<path d="M'+(150+offset).toFixed(1)+' '+y.toFixed(1)+' Q'+(330+offset).toFixed(1)+' '+(y-19).toFixed(1)+' '+(516+offset).toFixed(1)+' '+(y+5).toFixed(1)+' T'+(1030+offset).toFixed(1)+' '+(y-3).toFixed(1)+'" stroke="#4bd9e7" stroke-width="'+(i%4===0?2:1)+'" opacity="'+(i%4===0?.15:.065)+'" fill="none"/>';
  }
  const rings=source?Array.from({length:Math.ceil(maxR/spacing)+2},(_,i)=>((time*speed-i*spacing)%maxR+maxR)%maxR):waterRings.map(o=>o.r);
  for(const r of rings){
   if(r<7||r>maxR)continue;
   const fade=Math.pow(1-r/maxR,1.25),ry=r*.68;
   shapes+='<ellipse cx="'+cx+'" cy="'+cy+'" rx="'+r.toFixed(1)+'" ry="'+ry.toFixed(1)+'" fill="none" stroke="#35eaff" stroke-width="13" opacity="'+(.22*fade).toFixed(3)+'" filter="url(#m03SoftGlow)"/>'+
   '<ellipse cx="'+cx+'" cy="'+cy+'" rx="'+r.toFixed(1)+'" ry="'+ry.toFixed(1)+'" fill="none" stroke="#4df2ff" stroke-width="2.3" opacity="'+(.95*fade).toFixed(3)+'"/>';
  }
  shapes+='</g>'+
  '<path d="M148 196Q158 178 179 179H1003Q1039 179 1047 198" fill="none" stroke="#d6fbff" stroke-width="6" opacity=".8"/>'+
  '<path d="M112 532Q117 551 140 551H1048Q1074 550 1077 530" fill="none" stroke="#b7faff" stroke-width="7" opacity=".78"/>'+
  '<path d="M146 205L117 526M1034 205L1069 526" stroke="#a5f0fc" stroke-width="6" opacity=".48"/>'+
  '<path d="M138 535H1047" stroke="#e6ffff" stroke-width="2.5" opacity=".68"/>'+
  '<ellipse cx="'+cx+'" cy="'+(cy+12)+'" rx="28" ry="13" fill="#001b27" opacity=".65"/>'+
  '<rect x="'+(cx-18)+'" y="'+(cy-3)+'" width="36" height="24" rx="5" fill="#3c8b9a" stroke="#b5faff" stroke-width="1.8"/>'+
  '<ellipse cx="'+cx+'" cy="'+cy+'" rx="21" ry="13" fill="url(#m03Chrome)" stroke="#f7ffff" stroke-width="1.9"/>'+
  '<path d="M'+(cx-12)+' '+(cy-4)+'Q'+cx+' '+(cy-13)+' '+(cx+13)+' '+(cy-4)+'" stroke="#fff" stroke-opacity=".56" fill="none"/>';
  for(const [x,y] of [[154,191],[1023,191],[139,547],[1049,547]])
   shapes+='<circle cx="'+x+'" cy="'+y+'" r="8" fill="url(#m03Chrome)" stroke="#bde8ef" stroke-width="1.2"/><circle cx="'+x+'" cy="'+y+'" r="2.2" fill="#537888"/>';
 }
 else if(wave){shapes+='<path d="'+line(freq,amp*95,320,time*freq*2)+'" stroke="#b8f687" stroke-width="4" fill="none"/>';if(mode==='quest'&&raw===1)shapes+='<path d="'+line(freq,amp*40,460,time*freq*2)+'" stroke="#7cc5e0" stroke-width="4" fill="none"/>';if(n===3){shapes+='<path d="M90 180V520H1120" fill="none" stroke="#92b6bf" stroke-width="2"/>';for(const [i,m] of markers.entries())shapes+='<line data-marker="'+i+'" x1="'+(90+m*1030)+'" x2="'+(90+m*1030)+'" y1="180" y2="520" stroke="'+(i===0?'#f1c681':'#8dd3eb')+'" stroke-width="3" stroke-dasharray="6 5" style="cursor:ew-resize"/>'}}
 else if(n===4){
  // Two independently animated, machined-steel tuning forks on weighted feet.
  shapes+='<defs>'+
   '<linearGradient id="m03ForkSteel" x1="0" x2="1"><stop stop-color="#71858f"/><stop offset=".17" stop-color="#f2faf9"/><stop offset=".34" stop-color="#aabdc4"/><stop offset=".56" stop-color="#fff"/><stop offset=".77" stop-color="#879ca7"/><stop offset="1" stop-color="#e3f0f1"/></linearGradient>'+
   '<linearGradient id="m03ForkFoot" x1="0" y1="0" x2=".16" y2="1"><stop stop-color="#e2eff0"/><stop offset=".16" stop-color="#899da7"/><stop offset=".75" stop-color="#455968"/><stop offset="1" stop-color="#1c3443"/></linearGradient>'+
   '<filter id="m03ForkShadow" x="-30%" y="-40%" width="160%" height="190%"><feGaussianBlur stdDeviation="8"/></filter>'+
   '</defs>';
  for(const [i,x,f] of [[0,430,freq],[1,790,frequency2]]){
   const response=i===0?1:1/(1+Math.pow(frequency2-freq,2)*9);
   const vibration=started?Math.sin(time*(i===0?freq:frequency2)*TAU)*Math.max(.4,4.5*response):0;
   const left=(x-34-vibration).toFixed(2),right=(x+34+vibration).toFixed(2);
   shapes+='<g class="m03-tuning-fork" aria-label="Камертон '+(i+1)+'">'+
    '<ellipse cx="'+x+'" cy="561" rx="137" ry="19" fill="#001625" opacity=".38" filter="url(#m03ForkShadow)"/>'+
    '<rect x="'+(x-102)+'" y="524" width="204" height="42" rx="9" fill="url(#m03ForkFoot)" stroke="#bbcdd2" stroke-width="2"/>'+
    '<path d="M'+(x-90)+' 529H'+(x+90)+'" stroke="#f6ffff" stroke-width="2.5" opacity=".68"/>'+
    '<rect x="'+(x-72)+'" y="563" width="18" height="8" rx="2" fill="#132a37"/>'+
    '<rect x="'+(x+54)+'" y="563" width="18" height="8" rx="2" fill="#132a37"/>'+
    '<rect x="'+(x-13)+'" y="505" width="26" height="20" rx="5" fill="url(#m03ForkSteel)" stroke="#d8e9e9"/>'+
    '<rect x="'+(x-6)+'" y="396" width="12" height="111" rx="5" fill="url(#m03ForkSteel)" stroke="#c6d8da" stroke-width="1.3"/>'+
    '<path d="M'+left+' 214L'+(x-30-vibration).toFixed(2)+' 365Q'+(x-29)+' 403 '+x+' 404Q'+(x+29)+' 403 '+(x+30+vibration).toFixed(2)+' 365L'+right+' 214" fill="none" stroke="#344c59" stroke-width="24" stroke-linejoin="round" stroke-linecap="round"/>'+
    '<path d="M'+left+' 214L'+(x-30-vibration).toFixed(2)+' 365Q'+(x-29)+' 403 '+x+' 404Q'+(x+29)+' 403 '+(x+30+vibration).toFixed(2)+' 365L'+right+' 214" fill="none" stroke="url(#m03ForkSteel)" stroke-width="20" stroke-linejoin="round" stroke-linecap="round"/>'+
    '<path d="M'+(x-40-vibration).toFixed(2)+' 215L'+(x-36-vibration).toFixed(2)+' 365M'+(x+26+vibration).toFixed(2)+' 365L'+(x+30+vibration).toFixed(2)+' 215" fill="none" stroke="#fff" opacity=".52" stroke-width="2.4"/>'+
    '</g>';
  }
 }

 else{
  const tuned=Math.abs(tx-receiver)<.051;
  shapes+='<defs><linearGradient id="m03RadioCase" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#53636a"/><stop offset=".15" stop-color="#1e303b"/><stop offset=".58" stop-color="#172730"/><stop offset="1" stop-color="#081820"/></linearGradient><linearGradient id="m03RadioRim" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#899a9f"/><stop offset=".4" stop-color="#243c47"/><stop offset="1" stop-color="#6e7e7d"/></linearGradient><linearGradient id="m03RadioOrange" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#ffb04d"/><stop offset=".45" stop-color="#f27c21"/><stop offset="1" stop-color="#9c3c0c"/></linearGradient><linearGradient id="m03RadioScreen" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#001624"/><stop offset="1" stop-color="#073448"/></linearGradient></defs>';
  for(const [i,x,value] of [[0,335,tx],[1,870,receiver]]){
   const y=244,w=205,h=352,receiving=i===1&&tuned;
   shapes+='<g class="m03-radio">'+
    '<ellipse cx="'+x+'" cy="603" rx="111" ry="15" fill="#001521" opacity=".4"/>'+
    '<rect x="'+(x-73)+'" y="91" width="20" height="148" rx="8" fill="#0a1820" stroke="#66747d" stroke-width="2"/>'+
    '<rect x="'+(x-67)+'" y="101" width="8" height="128" rx="3" fill="#253e49"/>'+
    '<rect x="'+(x-22)+'" y="213" width="27" height="30" rx="6" fill="#111d26" stroke="#687981" stroke-width="2"/>'+
    '<rect x="'+(x+29)+'" y="212" width="28" height="31" rx="7" fill="#111c24" stroke="#6c7b80" stroke-width="2"/>'+
    '<path d="M'+(x-91)+' '+y+'H'+(x+90)+'Q'+(x+102)+' '+y+' '+(x+102)+' '+(y+22)+'V'+(y+h-23)+'Q'+(x+102)+' '+(y+h)+' '+(x+78)+' '+(y+h)+'H'+(x-79)+'Q'+(x-102)+' '+(y+h)+' '+(x-102)+' '+(y+h-23)+'V'+(y+22)+'Q'+(x-102)+' '+y+' '+(x-91)+' '+y+'Z" fill="url(#m03RadioCase)" stroke="url(#m03RadioRim)" stroke-width="7"/>'+
    '<path d="M'+(x-96)+' '+(y+22)+'L'+(x-79)+' '+(y+6)+'H'+(x+79)+'L'+(x+96)+' '+(y+22)+'V'+(y+91)+'L'+(x+87)+' '+(y+84)+'V'+(y+28)+'H'+(x-87)+'V'+(y+84)+'L'+(x-96)+' '+(y+91)+'Z" fill="#50616a" opacity=".42"/>'+
    '<path d="M'+(x-100)+' '+(y+83)+'L'+(x-83)+' '+(y+94)+'V'+(y+273)+'L'+(x-101)+' '+(y+293)+'Z" fill="#0b151c" stroke="#3c4a50" stroke-width="1.5"/>'+
    '<rect x="'+(x-113)+'" y="'+(y+96)+'" width="17" height="70" rx="5" fill="url(#m03RadioOrange)" stroke="#ab4b18" stroke-width="2"/>'+
    '<path d="M'+(x-108)+' '+(y+104)+'V'+(y+151)+'" stroke="#ffd18b" stroke-width="2" opacity=".68"/>'+
    '<rect x="'+(x+96)+'" y="'+(y+100)+'" width="11" height="54" rx="4" fill="url(#m03RadioOrange)" stroke="#a64e19" stroke-width="1.5"/>'+
    '<path d="M'+(x-90)+' '+(y+12)+'L'+(x-78)+' '+(y+2)+'M'+(x+79)+' '+(y+2)+'L'+(x+92)+' '+(y+16)+'" stroke="#9db0b2" stroke-width="3" opacity=".7"/>'+
    '<rect x="'+(x-82)+'" y="'+(y+27)+'" width="164" height="164" rx="15" fill="#061821" stroke="#5e777e" stroke-width="5"/>'+
    '<rect x="'+(x-73)+'" y="'+(y+37)+'" width="146" height="145" rx="9" fill="url(#m03RadioScreen)" stroke="#284c58" stroke-width="2"/>'+
    '<path d="M'+(x-67)+' '+(y+47)+'Q'+(x-12)+' '+(y+33)+' '+(x+62)+' '+(y+47)+'" fill="none" stroke="#8cc6d1" opacity=".18" stroke-width="3"/>'+
    '<g fill="#e0f7fb" text-anchor="middle" font-family="Inter,system-ui,sans-serif"><text x="'+x+'" y="'+(y+65)+'" font-size="13" font-weight="800">'+(i===0?'ПЕРЕДАВАЧ':'ПРИЙМАЧ')+'</text><text x="'+x+'" y="'+(y+142)+'" font-size="19" font-weight="800">'+fmt(value,1)+' МГц</text></g>';
   if(i===0)shapes+='<path d="M'+x+' '+(y+87)+'v29m-10-22q-12 9 0 17m20-17q12 9 0 17m-29-26q-21 20 0 39m38-39q21 20 0 39" stroke="#80dafa" stroke-width="2.4" fill="none"/>';
   else{
    const wave=Array.from({length:75},(_,j)=>{const px=x-60+j*1.62,py=y+107-(2+radioLock*13)*Math.sin(j*.48+radioClock*10);return (j?'L':'M')+px.toFixed(1)+' '+py.toFixed(1)}).join(' ');
    shapes+='<path d="'+wave+'" fill="none" stroke="'+(receiving?'#b8fa83':'#587680')+'" stroke-width="2.5"/><circle cx="'+(x+60)+'" cy="'+(y+65)+'" r="5" fill="'+(receiving?'#a5f477':'#496273')+'"/>';
   }
   shapes+='<rect x="'+(x-65)+'" y="'+(y+157)+'" width="130" height="8" rx="4" fill="#1a3c48"/>'+
    '<rect x="'+(x-65)+'" y="'+(y+157)+'" width="'+(i===0?110:receiving?125:15)+'" height="8" rx="4" fill="'+(i===0||receiving?'#9bf07d':'#526f7d')+'"/>';
   for(let j=0;j<3;j++)shapes+='<rect x="'+(x-63+j*47)+'" y="'+(y+209)+'" width="39" height="30" rx="8" fill="#283c46" stroke="#7d9298" stroke-width="1.5"/>';
   shapes+='<g fill="#e7eff0" font-size="10" font-family="Inter,system-ui,sans-serif" text-anchor="middle"><text x="'+(x-43)+'" y="'+(y+228)+'">MENU</text><text x="'+(x+4)+'" y="'+(y+228)+'">◆</text><text x="'+(x+52)+'" y="'+(y+228)+'">OK</text></g>';
   for(let j=0;j<5;j++)shapes+='<rect x="'+(x-68)+'" y="'+(y+260+j*15)+'" width="136" height="8" rx="4" fill="#050e15" stroke="#475c65" stroke-width="1.4"/>'+
      '<path d="M'+(x-64)+' '+(y+262+j*15)+'H'+(x+63)+'" stroke="#9fb2b4" stroke-width=".8" opacity=".28"/>';
   for(let j=0;j<7;j++)shapes+='<path d="M'+(x-93)+' '+(y+198+j*13)+'h8M'+(x+85)+' '+(y+198+j*13)+'h8" stroke="#849498" stroke-width="1.2" opacity=".45"/>';
   shapes+='</g>';
  }
  // Cinematic RF visualization: moving luminous signal ribbon, particulate field and antenna wavefronts.
  // Keep the animation inside the gap between the two radios, without obscuring their screens.
  const t=radioClock, left=449,right=761,mid=462,span=right-left;
  shapes+='<defs>'+
   '<linearGradient id="m03RfBeam" x1="0" y1="0" x2="1" y2="0"><stop stop-color="#268fcb" stop-opacity=".03"/><stop offset=".22" stop-color="#42dbff" stop-opacity=".75"/><stop offset=".56" stop-color="#b0f8ff"/><stop offset=".86" stop-color="#37ccff" stop-opacity=".8"/><stop offset="1" stop-color="#6befff" stop-opacity=".04"/></linearGradient>'+
   '<filter id="m03RfBloom" x="-80%" y="-300%" width="260%" height="700%"><feGaussianBlur stdDeviation="7"/></filter>'+
   '<filter id="m03RfFineBloom" x="-50%" y="-120%" width="200%" height="340%"><feGaussianBlur stdDeviation="2.2"/></filter>'+
   '</defs>';
  const rfY=(x)=>mid+20*Math.sin((x-left)*.025-t*7.8)+7*Math.sin((x-left)*.048-t*5.1);
  const envelope=x=>Math.pow(Math.max(0,Math.sin(Math.PI*(x-left)/span)),.55);
  let path='';
  for(let x=left;x<=right;x+=4)path+=(x===left?'M':'L')+x+' '+rfY(x).toFixed(1);
  shapes+='<path d="'+path+'" fill="none" stroke="#1ba9ff" stroke-width="25" opacity=".48" filter="url(#m03RfBloom)"/>'+
   '<path d="'+path+'" fill="none" stroke="#66e9ff" stroke-width="8" opacity=".65" filter="url(#m03RfFineBloom)"/>'+
   '<path d="'+path+'" fill="none" stroke="url(#m03RfBeam)" stroke-width="2.6" opacity=".98"/>';
  // Dense luminous particles are advected horizontally; no random flicker between frames.
  for(let j=0;j<155;j++){
   const seed=(j*.61803398875)%1;
   const p=((seed+t*(.11+(j%7)*.008))%1+1)%1;
   const x=left+p*span;
   const offset=Math.sin(j*26.71)*27+Math.cos(j*7.03+t*1.5)*6;
   const y=rfY(x)+offset*envelope(x);
   const alpha=(.13+.60*(.5+.5*Math.sin(j*4.8+t*2.7)))*envelope(x);
   const r=.5+(j%7===0?1.3:j%3===0?.6:.1);
   shapes+='<circle cx="'+x.toFixed(1)+'" cy="'+y.toFixed(1)+'" r="'+r.toFixed(1)+'" fill="'+(j%5===0?'#c9ffff':'#3ac8ff')+'" opacity="'+alpha.toFixed(3)+'"/>';
  }
  // Transverse energy fronts sweep forward, rather than appearing as isolated arcs.
  for(let j=0;j<4;j++){
   const p=((t*.46+j*.25)%1+1)%1,x=left+p*span;
   const strength=Math.sin(Math.PI*p);
   const y=rfY(x),height=36+strength*35;
   const curve='M'+x.toFixed(1)+' '+(y-height).toFixed(1)+'Q'+(x+20).toFixed(1)+' '+y.toFixed(1)+' '+x.toFixed(1)+' '+(y+height).toFixed(1);
   shapes+='<path d="'+curve+'" stroke="#30bfff" stroke-width="9" fill="none" opacity="'+(.25*strength).toFixed(3)+'" filter="url(#m03RfBloom)"/>'+
    '<path d="'+curve+'" stroke="#81edff" stroke-width="2.1" fill="none" opacity="'+(.6*strength).toFixed(3)+'"/>';
  }
  if(radioLock>.01){
   shapes+='<circle cx="870" cy="309" r="'+(12+radioLock*17).toFixed(1)+'" fill="none" stroke="#b5fc8c" stroke-width="2" opacity="'+(.25*radioLock).toFixed(2)+'"/>';
  }
 }
 return shapes}
function draw(){
 if(!shown)return;
 const physical=stage()===1&&mode!=='quest',canvas=$('m03WaterCanvas');
 if(physical&&!tank&&!tankLoading&&typeof window.GNSSWaveTank3D==='function'){
  tankLoading=true;
  window.GNSSWaveTank3D(canvas).then(instance=>{tank=instance;tankLoading=false;if(shown)draw()}).catch(()=>{tankLoading=false});
 }
 // Use the 3D model only after the renderer has initialized successfully.
 const use3D=physical&&!!tank;
 canvas.hidden=!physical;
 svg.style.opacity=use3D?'0':'1';
 if(use3D){tank.render(time,freq,source,waterRings);return}
 if(physical&&tankLoading){svg.innerHTML=graphics();return}
 if(physical&&typeof window.GNSSWaveTank==='function'&&!tankLoading){
  // Keep the SVG simulation as a safe fallback, not the old flat shader.
 }
 svg.innerHTML=graphics();
}
function tick(t){raf=0;if(!shown)return;const dt=last?Math.min(.07,(t-last)/1000):0;last=t;if(started||source)time+=dt;radioClock+=dt;radioLock+=(Math.abs(tx-receiver)<.051?1:-1)*dt*2.8;radioLock=clamp(radioLock,0,1);if(source)markDone();if(mode==='demo'&&(started||source))markDone();waterRings=waterRings.map(o=>({...o,r:o.r+dt*145})).filter(o=>o.r<650);draw();raf=requestAnimationFrame(tick)}
root.addEventListener('click',e=>{const b=e.target.closest('[data-act]');if(!b)return;const act=b.dataset.act;if(act==='dock'){dockOpen=!dockOpen;render();return}if(act==='tool'){tool=Number(b.dataset.tool);reset(false);dockOpen=false;render();return}
 if(act==='restart'){if(mode==='demo'){save.stage=0;save.done=[];persist()}reset();render();return}
 if(act==='next'&&mode==='demo'&&save.done.includes(save.stage)){if(save.stage>=5){if(typeof window.GNSSLabSwitchMode==='function')window.GNSSLabSwitchMode('explore');else document.querySelector('#expModes [data-mode="explore"]')?.click();return}save.stage++;persist();reset();render();return}
 if(act==='toggle'){if(stage()===1){source=!source}else started=!started;markDone();render();return}
 if(act==='drop'){waterRings.push({x:590,y:348,r:1});markDone();return}
 if(act==='measure'){markDone();reading=Math.abs(markers[1]-markers[0]);render();return}
 if(act==='chooseA'||act==='chooseB'){grade(act==='chooseA'?20:0);return}
 if(act==='retake'){save.q=0;save.marks=[null,null,null,null];save.attempt++;persist();reset();render();return}
 if(act==='check'){const n=save.q;if(n===0)grade(Math.abs(freq-3)<.01?20:0);else if(n===2){const v=Number(($('m03Answer')?.value||'').replace(',','.'));grade(Math.abs(v-freq)<.15?30:0)}else if(n===3)grade(Math.abs(tx-receiver)<.15?30:0);return}
});
panel.addEventListener('input',e=>{const key=e.target.dataset.key;if(!key)return;const val=Number(e.target.value);if(!Number.isFinite(val))return;({freq:()=>freq=val,amp:()=>amp=val,f2:()=>frequency2=val,receiver:()=>receiver=val,tx:()=>tx=val}[key]||(()=>{}))();const o=e.target.closest('label')?.querySelector('output');if(o)o.textContent=fmt(val,key==='freq'&&val%1===0?0:1)+(key==='freq'||key==='f2'?' Гц':key==='tx'||key==='receiver'?' МГц':'');if(mode==='demo')markDone();draw()});
svg.addEventListener('pointerdown',e=>{if(!shown||mode==='quest'||stage()!==3)return;const r=svg.getBoundingClientRect();const t=clamp(((e.clientX-r.left)/r.width*1200-90)/1030,0,1);const i=Math.abs(markers[0]-t)<Math.abs(markers[1]-t)?0:1;markers[i]=t;render();});
svg.addEventListener('pointerdown',e=>{if(!shown||stage()!==1||mode==='quest')return;const r=svg.getBoundingClientRect();const x=(e.clientX-r.left)/r.width*1200,y=(e.clientY-r.top)/r.height*660;if(x>125&&x<1055&&y>145&&y<550){waterRings.push({x,y,r:1});markDone()}});
window.addEventListener('hashchange',sync);window.addEventListener('gnss:lab-change',sync);document.getElementById('sidebarNav')?.addEventListener('click',()=>setTimeout(sync,0));new MutationObserver(sync).observe(document.body,{attributes:true,attributeFilter:['class','data-exp-mode']});
sync();
})();