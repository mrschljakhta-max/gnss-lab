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
 '<div class="m03-stage"><svg id="m03Svg" viewBox="0 0 1200 660" aria-label="Інтерактивна фізична модель"></svg></div>'+
 '<aside class="m03-panel" id="m03Panel"></aside><nav id="m03Dock" class="m03-dock" hidden></nav>'+
 '<button id="m03Toggle" data-act="dock" class="m03-toggle" aria-label="Відкрити інструменти" hidden>☷</button>'+
 '<footer class="m03-footer"><button data-act="restart" title="На початок уроку">↻</button><span id="m03Progress"></span><button id="m03Next" data-act="next">Далі →</button></footer>';
board.append(root);
const $=id=>root.querySelector('#'+id),svg=$('m03Svg'),panel=$('m03Panel'),dock=$('m03Dock'),next=$('m03Next');
let mode='demo',shown=false,raf=0,last=0,dockOpen=true,tool=0,phase=0,started=false,cycles=0,pressed=false,qaChoice=null;
let freq=2,amp=.55,frequency2=4,receiver=3,tx=5,markers=[.2,.4],source=false,waterRings=[],time=0,reading=null;
const active=()=>typeof window.GNSSLabActiveIndex==='function'?window.GNSSLabActiveIndex()===2:location.hash==='#lab-03';
function sync(){const want=active()&&document.body.classList.contains('engineering-live');if(!want){if(shown){shown=false;root.hidden=true;document.body.classList.remove('gnss-lesson03-active');cancelAnimationFrame(raf);raf=0}return}
 const m=document.body.dataset.expMode||'demo';if(!shown){shown=true;root.hidden=false;document.body.classList.add('gnss-lesson03-active');mode=m;reset(false);render();tick(performance.now())}else if(m!==mode){mode=m;reset(false);render()}}
function reset(resetSettings=true){started=false;cycles=0;source=false;waterRings=[];time=0;reading=null;qaChoice=null;phase=0;if(resetSettings){freq=2;amp=.55;frequency2=4;receiver=3;tx=5;markers=[.2,.4]}dockOpen=true}
const stage=()=>mode==='demo'?save.stage:mode==='quest'?save.q:tool;
const btn=(id,label,disabled=false)=>'<button type="button" data-act="'+id+'"'+(disabled?' disabled':'')+'>'+label+'</button>';
const slider=(key,label,val,min,max,step,unit='')=>'<label>'+label+' <output>'+fmt(val,step<1?1:0)+unit+'</output><input data-key="'+key+'" type="range" min="'+min+'" max="'+max+'" step="'+step+'" value="'+val+'"></label>';
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
 next.hidden=mode!=='demo';next.disabled=mode==='demo'&&!save.done.includes(n);
 $('m03Toggle').hidden=mode!=='explore';$('m03Toggle').setAttribute('aria-expanded',String(dockOpen));dock.hidden=mode!=='explore'||!dockOpen;
 dock.innerHTML=['Генератор','Хвильова ванна','Мотузка','Осцилограф','Камертони','Радіосигнал'].map((name,i)=>'<button data-act="tool" data-tool="'+i+'" class="'+(tool===i?'selected':'')+'"><span class="m03-tool-icon">'+['◉','≈','〰','▤','♬','⌁'][i]+'</span>'+name+'</button>').join('');
 draw();
}
function markDone(){if(mode==='demo'&&!save.done.includes(save.stage)){save.done.push(save.stage);persist();next.disabled=false}}
function graphics(){const raw=stage(),n=mode==='quest'?(raw===0?0:raw===1?2:raw===2?3:raw===3?5:0):raw,wave=n===1||n===2||n===3;
 const line=(f,a,y,shift=0)=>Array.from({length:210},(_,i)=>{const x=90+i*4.9;return(i?'L':'M')+x.toFixed(1)+' '+(y-Math.sin(x/105*f+shift)*a).toFixed(1)}).join(' ');
 let shapes='<defs><linearGradient id="m03glow"><stop stop-color="#b7f48c"/><stop offset="1" stop-color="#63bcd8"/></linearGradient></defs><path d="M70 335H1120" stroke="#7498a5" stroke-dasharray="5 8"/>';
 if(n===0){
  const centerX=600,centerY=340,waveAmplitude=95;
  const wavePhase=time*TAU*freq;
  const waveY=x=>centerY-Math.sin(x/105*freq+wavePhase)*waveAmplitude;
  const particleY=waveY(centerX);
  shapes+='<circle cx="600" cy="340" r="146" stroke="#80bac5" fill="none" opacity=".3"/>'+
   '<path d="'+line(freq,waveAmplitude,centerY,wavePhase)+'" stroke="#b4f58d" stroke-width="4" fill="none"/>'+
   '<circle cx="'+centerX+'" cy="'+particleY.toFixed(2)+'" r="24" fill="#e9c67e" stroke="#f9edbf" stroke-width="3"/>';
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
 else if(wave){shapes+='<path d="'+line(freq,amp*95,320,time*freq*2)+'" stroke="#b8f687" stroke-width="4" fill="none"/>';if(mode==='quest'&&raw===1)shapes+='<path d="'+line(freq,amp*40,460,time*freq*2)+'" stroke="#7cc5e0" stroke-width="4" fill="none"/>';if(n===3){shapes+='<path d="M90 180V520H1120" stroke="#92b6bf" stroke-width="2"/>';for(const [i,m] of markers.entries())shapes+='<line data-marker="'+i+'" x1="'+(90+m*1030)+'" x2="'+(90+m*1030)+'" y1="180" y2="520" stroke="'+(i===0?'#f1c681':'#8dd3eb')+'" stroke-width="3" stroke-dasharray="6 5" style="cursor:ew-resize"/>'}}
 else if(n===4){for(const [x,f] of [[430,freq],[790,frequency2]]){const spread=50*(1/(1+(f-frequency2)*(f-frequency2)*2));const offset=started?Math.sin(time*f*4)*spread:0;shapes+='<path d="M'+(x-24+offset)+' 200L'+x+' 430L'+(x+24+offset)+' 200" fill="none" stroke="#d8e6e2" stroke-width="9"/><rect x="'+(x-70)+'" y="433" width="140" height="18" fill="#7e9ba4"/>'}}
 else{shapes+='<rect x="245" y="225" width="180" height="205" rx="18" fill="#153d50" stroke="#a6cbd2" stroke-width="3"/><rect x="785" y="225" width="180" height="205" rx="18" fill="#153d50" stroke="#a6cbd2" stroke-width="3"/><path d="M335 225V130M875 225V130" stroke="#d1ece8" stroke-width="5"/>';for(let i=0;i<3;i++)shapes+='<path d="M'+(420+i*95)+' 180q55 -45 95 0" fill="none" stroke="'+(Math.abs(tx-receiver)<.15?'#b8f487':'#6b93a2')+'" stroke-width="3"/>'}
 return shapes}
function draw(){if(shown)svg.innerHTML=graphics()}
function tick(t){raf=0;if(!shown)return;const dt=last?Math.min(.07,(t-last)/1000):0;last=t;if(started||source)time+=dt;if(source)markDone();if(mode==='demo'&&(started||source))markDone();waterRings=waterRings.map(o=>({r:o.r+dt*145})).filter(o=>o.r<500);draw();raf=requestAnimationFrame(tick)}
root.addEventListener('click',e=>{const b=e.target.closest('[data-act]');if(!b)return;const act=b.dataset.act;if(act==='dock'){dockOpen=!dockOpen;render();return}if(act==='tool'){tool=Number(b.dataset.tool);dockOpen=false;reset(false);render();return}
 if(act==='restart'){if(mode==='demo'){save.stage=0;save.done=[];persist()}reset();render();return}
 if(act==='next'&&mode==='demo'&&save.done.includes(save.stage)){save.stage=Math.min(5,save.stage+1);persist();reset();render();return}
 if(act==='toggle'){if(stage()===1){source=!source}else started=!started;markDone();render();return}
 if(act==='drop'){waterRings.push({r:1});markDone();return}
 if(act==='measure'){markDone();reading=Math.abs(markers[1]-markers[0]);render();return}
 if(act==='chooseA'||act==='chooseB'){grade(act==='chooseA'?20:0);return}
 if(act==='retake'){save.q=0;save.marks=[null,null,null,null];save.attempt++;persist();reset();render();return}
 if(act==='check'){const n=save.q;if(n===0)grade(Math.abs(freq-3)<.01?20:0);else if(n===2){const v=Number(($('m03Answer')?.value||'').replace(',','.'));grade(Math.abs(v-freq)<.15?30:0)}else if(n===3)grade(Math.abs(tx-receiver)<.15?30:0);return}
});
panel.addEventListener('input',e=>{const key=e.target.dataset.key;if(!key)return;const val=Number(e.target.value);if(!Number.isFinite(val))return;({freq:()=>freq=val,amp:()=>amp=val,f2:()=>frequency2=val,receiver:()=>receiver=val,tx:()=>tx=val}[key]||(()=>{}))();const o=e.target.closest('label')?.querySelector('output');if(o)o.textContent=fmt(val,key==='freq'&&val%1===0?0:1)+(key==='freq'||key==='f2'?' Гц':key==='tx'||key==='receiver'?' МГц':'');if(mode==='demo')markDone();draw()});
svg.addEventListener('pointerdown',e=>{if(!shown||mode==='quest'||stage()!==3)return;const r=svg.getBoundingClientRect();const t=clamp(((e.clientX-r.left)/r.width*1200-90)/1030,0,1);const i=Math.abs(markers[0]-t)<Math.abs(markers[1]-t)?0:1;markers[i]=t;render();});
svg.addEventListener('pointerdown',e=>{if(!shown||stage()!==1||mode==='quest')return;const r=svg.getBoundingClientRect();const x=(e.clientX-r.left)/r.width*1200,y=(e.clientY-r.top)/r.height*660;if(x>125&&x<1055&&y>145&&y<550){waterRings.push({r:1});markDone()}});
window.addEventListener('hashchange',sync);window.addEventListener('gnss:lab-change',sync);document.getElementById('sidebarNav')?.addEventListener('click',()=>setTimeout(sync,0));new MutationObserver(sync).observe(document.body,{attributes:true,attributeFilter:['class','data-exp-mode']});
sync();
})();