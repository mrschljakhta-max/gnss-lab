(function mission00(){
  'use strict';
  // A separate, non-destructive onboarding layer. Mission 01 and free drafting remain untouched.
  const board=document.getElementById('engBoard');
  if(!board)return;
  const STORE='gnss-lab-mission-00-v1';
  const A={x:440,y:372,name:'A',color:'#b8f98b'};
  const B={x:760,y:372,name:'B',color:'#89d9ff'};
  const C={x:600,y:520,name:'C',color:'#ffd389'};
  const X={x:600,y:245};
  const stations=[A,B,C];
  const radius=p=>Math.hypot(X.x-p.x,X.y-p.y);
  const round=n=>Math.round(n);
  const saved=()=>{try{return JSON.parse(localStorage.getItem(STORE)||'{}')}catch{return {}}};
  const memory=saved();
  let seen=Boolean(memory.seen),completed=Boolean(memory.completed);
  let stage=0,visible=false,drag=null,preview=null,feedback='',hint=false,transition=false,autoShown=false,advanceTimer=0;
  const root=document.createElement('section');
  root.id='gnssIntro0';
  root.hidden=true;
  root.setAttribute('aria-label','Місія 00: Де прихована точка?');
  root.innerHTML=`
    <div class="intro0-head">
      <div class="intro0-kicker" id="intro0Kicker">GNSS LAB · МІСІЯ 00 / 06</div>
      <h2 id="intro0Title">Де прихована точка?</h2>
      <p id="intro0Prompt">Запам’ятай X. А тепер спробуй знайти її без підказки.</p>
    </div>
    <svg id="intro0Map" viewBox="0 0 1200 660" preserveAspectRatio="xMidYMid meet"
      xmlns="http://www.w3.org/2000/svg" aria-label="Навчальна схема з трьома маяками" role="group"></svg>
    <div class="intro0-feedback" id="intro0Feedback" role="status" aria-live="polite"></div>
    <div class="intro0-footer">
      <div class="intro0-tools">
        <button type="button" data-act="hint" title="Підказка" aria-label="Показати підказку">?</button>
        <button type="button" data-act="restart" title="Почати спочатку" aria-label="Повторити урок">↻</button>
        <span id="intro0Progress" aria-label="Прогрес уроку">01 / 06</span>
      </div>
      <div class="intro0-actions">
        <button type="button" data-act="skip" class="intro0-quiet">Пропустити</button>
        <button type="button" data-act="next" id="intro0Next" class="intro0-primary">Сховати X →</button>
      </div>
    </div>`;
  board.append(root);
  const svg=root.querySelector('#intro0Map');
  const byId=id=>root.querySelector('#'+id);
  const replay=document.createElement('button');
  replay.type='button';
  replay.id='gnssIntroReplay';
  replay.textContent='00 · Знайди точку';
  replay.setAttribute('aria-label','Повторити вступну місію 00');
  replay.hidden=true;
  board.append(replay);
  function remember(){
    try{localStorage.setItem(STORE,JSON.stringify({seen,completed}))}catch{}
  }
  function element(p){
    const active=stage>=1&&stage<=3&&stations[stage-1]===p;
    return `<g class="intro0-beacon ${active?'intro0-beacon-active':''}">
      <circle cx="${p.x}" cy="${p.y}" r="18" fill="${p.color}" opacity=".12"/>
      <circle cx="${p.x}" cy="${p.y}" r="7" fill="${p.color}" stroke="#12364c" stroke-width="3"/>
      <text x="${p.x+17}" y="${p.y-14}" fill="${p.color}" font-size="19" font-weight="750">${p.name}</text>
      ${active?`<circle cx="${p.x}" cy="${p.y}" r="29" class="intro0-touch"
         data-beacon="${p.name}" tabindex="0" role="button" aria-label="Побудувати коло маяка ${p.name}"/>`:''}
    </g>`;
  }
  function ring(p,cls){
    return `<circle cx="${p.x}" cy="${p.y}" r="${radius(p)}" fill="none"
        stroke="${p.color}" class="${cls}" stroke-width="2.4"/>`;
  }
  function common(){
    return `<defs>
      <pattern id="intro0Grid" width="20" height="20" patternUnits="userSpaceOnUse">
        <path d="M20 0H0V20" fill="none" stroke="#c0ebff" stroke-opacity=".10" stroke-width=".8"/>
      </pattern>
      <radialGradient id="intro0Globe"><stop stop-color="#3e94b2"/><stop offset=".65" stop-color="#216381"/>
        <stop offset="1" stop-color="#072c43"/></radialGradient>
      <clipPath id="intro0EarthClip"><circle cx="600" cy="360" r="143"/></clipPath>
    </defs>
    <rect width="1200" height="660" fill="url(#intro0Grid)" pointer-events="none"/>`;
  }
  function space(){
    let s='<g class="intro0-space"><circle cx="600" cy="360" r="143" fill="url(#intro0Globe)" stroke="#9adcf2" stroke-width="2"/>';
    s+='<g clip-path="url(#intro0EarthClip)" fill="#82aa9c" opacity=".75">'+
      '<path d="M500 245l52 15 25 36-22 25-18 63-31 21-28-51 10-41z"/>'+
      '<path d="M650 268l55 17 26 52-18 50-47 4-38 45-24-33 25-47-12-37z"/>'+
      '<path d="M544 442l32 8 17 46-18 16-38-27z"/></g>';
    s+='<ellipse cx="600" cy="360" rx="143" ry="49" fill="none" stroke="#d2f9ff" stroke-opacity=".28"/>';
    s+='<ellipse cx="600" cy="360" rx="72" ry="143" fill="none" stroke="#d2f9ff" stroke-opacity=".28"/>';
    s+='<circle cx="626" cy="324" r="7" fill="#c4ff93"/><circle cx="626" cy="324" r="13" fill="none" stroke="#c4ff93" stroke-opacity=".85"/>';
    const sats=[[330,210],[860,185],[910,496],[307,470]];
    for(let i=0;i<sats.length;i++){
      const [x,y]=sats[i],color=['#b8f98b','#89d9ff','#ffd389','#e5b8ff'][i];
      s+=`<line x1="${x}" y1="${y}" x2="626" y2="324" stroke="${color}" stroke-width="1.8" stroke-dasharray="7 9" opacity=".72"/>
      <g transform="translate(${x} ${y})" class="intro0-satellite" style="animation-delay:${i*.15}s">
        <rect x="-10" y="-8" width="20" height="16" rx="3" fill="#d9e8ec"/>
        <rect x="-37" y="-7" width="23" height="14" fill="#5897b3" stroke="#bbd9e5"/>
        <rect x="14" y="-7" width="23" height="14" fill="#5897b3" stroke="#bbd9e5"/>
        <path d="M-25-7v14 M25-7v14" stroke="#e4f4fc" stroke-width="1"/>
      </g>`;
    }
    s+='</g>';
    return s;
  }
  function scene(){
    if(stage===5)return common()+space();
    let s=common();
    if(stage===0){
      s+=`<circle cx="${X.x}" cy="${X.y}" r="25" fill="#c4fa90" fill-opacity=".11" class="intro0-pulse"/>
        <circle cx="${X.x}" cy="${X.y}" r="7" fill="#c4fa90" />
        <text x="${X.x+19}" y="${X.y-8}" fill="#eaffd5" font-size="22" font-weight="700">X</text>`;
    }
    if(stage>=2)s+=ring(A,'intro0-ring-drawn');
    if(stage>=3)s+=ring(B,'intro0-ring-drawn');
    if(stage>=4)s+=ring(C,'intro0-ring-drawn');
    if(drag&&preview){
      const p=stations[stage-1],rr=round(preview.r),ok=Math.abs(preview.r-radius(p))<=17;
      s+=`<circle cx="${p.x}" cy="${p.y}" r="${preview.r}" fill="none"
        stroke="${ok?'#bbfc8a':'#e8f4f1'}" stroke-width="2.5" stroke-dasharray="8 7"/>
        <path d="M${p.x} ${p.y}L${preview.x} ${preview.y}" stroke="${ok?'#b8fa89':'#ffffff'}" stroke-opacity=".68" stroke-width="1.6" stroke-dasharray="4 6"/>
        <text x="${Math.min(1060,Math.max(120,preview.x+17))}" y="${Math.max(190,preview.y-10)}"
        font-size="18" fill="${ok?'#b8fa89':'#effaff'}" font-weight="700">${rr} м</text>`;
    }
    if(stage===4){
      const wrongY=2*A.y-X.y;
      for(const [y,which] of [[X.y,'correct'],[wrongY,'wrong']]){
        s+=`<g class="intro0-candidate">
          <circle cx="${X.x}" cy="${y}" r="17" fill="#e9f9ff" fill-opacity=".08"
            stroke="#e6f9ff" stroke-width="2" stroke-dasharray="4 4"/>
          <circle cx="${X.x}" cy="${y}" r="25" class="intro0-choice-hit" data-choice="${which}"
            role="button" tabindex="0" aria-label="Обрати точку перетину" />
        </g>`;
      }
    }
    s+=stations.map(element).join('');
    if(stage===1){
      s+='<path class="intro0-handcue" d="M458 351l35-35m-8 2l8-2-1 9" fill="none" stroke="#bbfa88" stroke-width="2.4" stroke-linecap="round"/>';
    }
    return s;
  }
  const prompts=[
    ['Де прихована точка?','Запам’ятай X. Потім сховай її.'],
    ['Почни з маяка A',`Потягни від A до ${round(radius(A))} м.`],
    ['Додай маяк B',`Потягни від B до ${round(radius(B))} м.`],
    ['Додай маяк C',`Потягни від C до ${round(radius(C))} м.`],
    ['Де точка X?','Натисни на правильний перетин.'],
    ['Ти знайшов точку!','Те саме геометричне правило працює і в навігації.']
  ];
  function render(){
    if(!visible)return;
    const [title,prompt]=prompts[stage];
    byId('intro0Kicker').textContent=`GNSS LAB · МІСІЯ 00 · ${String(stage+1).padStart(2,'0')} / 06`;
    byId('intro0Title').textContent=title;
    byId('intro0Prompt').textContent=prompt;
    byId('intro0Progress').textContent=`${String(stage+1).padStart(2,'0')} / 06`;
    svg.innerHTML=scene();
    const next=byId('intro0Next');
    next.hidden=stage!==0&&stage!==5;
    next.textContent=stage===0?'Сховати X →':'До вимірювань →';
    const f=byId('intro0Feedback');
    f.textContent=feedback||(hint?[
      'Точка X зникне. Залишаться лише відстані до маяків.',
      'Утримуй зелену точку A й рухай курсор. Стрілки клавіатури не потрібні.',
      'Спробуй побудувати таке саме коло від синього B.',
      'Жовтий маяк відсіє зайву точку перетину.',
      'Перевір, яка з двох точок лежить також на третьому колі.',
      'На площині достатньо трьох таких відстаней. У GNSS є ще й час.'
    ][stage]:'');
    f.classList.toggle('intro0-has-feedback',!!f.textContent);
    root.classList.toggle('intro0-in-space',stage===5);
  }
  function setStage(n){
    window.clearTimeout(advanceTimer);
    stage=n;
    drag=null;preview=null;feedback='';hint=false;transition=false;render();
  }
  function begin(){
    if(visible)return;
    visible=true;
    root.hidden=false;
    replay.hidden=true;
    document.body.classList.add('gnss-intro-active');
    setStage(0);
    byId('intro0Next').focus({preventScroll:true});
  }
  function close(){
    window.clearTimeout(advanceTimer);
    drag=null;preview=null;transition=false;
    if(!visible)return;
    visible=false;root.hidden=true;
    document.body.classList.remove('gnss-intro-active');
    replay.hidden=!document.body.classList.contains('engineering-live')||(document.body.dataset.expMode||'demo')!=='demo';
  }
  function finish(skipped){
    seen=true;if(!skipped)completed=true;
    remember();close();
    document.dispatchEvent(new CustomEvent('gnss:intro-00-finish',{detail:{completed:!skipped,skipped}}));
  }
  function stageSuccess(){
    if(transition)return;
    transition=true;
    feedback='✓ Коло побудовано.';
    drag=null;preview=null;render();
    advanceTimer=window.setTimeout(()=>{
      if(visible)setStage(stage+1);
    },470);
  }
  function clientPoint(event){
    const m=svg.getScreenCTM();
    if(!m)return null;
    const p=svg.createSVGPoint();p.x=event.clientX;p.y=event.clientY;
    return p.matrixTransform(m.inverse());
  }
  function pointerRadius(event){
    const p=clientPoint(event),station=stations[stage-1];
    if(!p||!station)return null;
    return {x:p.x,y:p.y,r:Math.max(0,Math.min(500,Math.hypot(p.x-station.x,p.y-station.y)))};
  }
  svg.addEventListener('pointerdown',event=>{
    if(!visible||stage<1||stage>3||transition||event.button!==0)return;
    const station=stations[stage-1];
    const hit=event.target.closest('[data-beacon]');
    if(!hit||hit.dataset.beacon!==station.name)return;
    drag=event.pointerId;
    preview={x:station.x+10,y:station.y,r:10};
    feedback='';hint=false;
    try{svg.setPointerCapture(event.pointerId)}catch{}
    event.preventDefault();render();
  });
  svg.addEventListener('pointermove',event=>{
    if(drag!==event.pointerId)return;
    const p=pointerRadius(event);
    if(p){preview=p;render()}
  });
  function release(event){
    if(drag!==event.pointerId)return;
    const p=pointerRadius(event)||preview;
    drag=null;preview=null;
    try{svg.releasePointerCapture(event.pointerId)}catch{}
    if(p&&Math.abs(p.r-radius(stations[stage-1]))<=17){
      stageSuccess();
    }else{
      feedback='Не збігається. Рухай до заданої відстані й відпусти.';
      render();
    }
  }
  svg.addEventListener('pointerup',release);
  svg.addEventListener('pointercancel',event=>{
    if(drag!==event.pointerId)return;
    drag=null;preview=null;render();
  });
  function pick(which){
    if(!visible||stage!==4||transition)return;
    if(which==='correct'){
      transition=true;
      feedback='✓ Точка X знайдена.';
      render();
      advanceTimer=window.setTimeout(()=>{
        if(visible){completed=true;seen=true;remember();setStage(5)}
      },580);
    }else{
      feedback='Тут збігаються лише дві відстані. Перевір коло C.';
      render();
    }
  }
  svg.addEventListener('click',event=>{
    const target=event.target.closest('[data-choice]');
    if(target)pick(target.dataset.choice);
  });
  svg.addEventListener('keydown',event=>{
    if(!['Enter',' '].includes(event.key))return;
    const beacon=event.target.closest('[data-beacon]');
    const candidate=event.target.closest('[data-choice]');
    if(beacon&&stage>=1&&stage<=3&&beacon.dataset.beacon===stations[stage-1].name){
      event.preventDefault();stageSuccess();
    }else if(candidate){event.preventDefault();pick(candidate.dataset.choice)}
  });
  root.addEventListener('click',event=>{
    const action=event.target.closest('button[data-act]')?.dataset.act;
    if(!action)return;
    if(action==='hint'){hint=true;feedback='';render()}
    if(action==='restart'){setStage(0)}
    if(action==='skip'){finish(true)}
    if(action==='next'&&stage===0){setStage(1)}
    else if(action==='next'&&stage===5){finish(false)}
  });
  root.addEventListener('keydown',event=>{
    if(event.key==='Escape'){event.preventDefault();finish(true)}
  });
  replay.addEventListener('click',begin);
  function sync(){
    const active=document.body.classList.contains('engineering-live')&&
      (document.body.dataset.expMode||'demo')==='demo';
    if(!active){if(visible)close();replay.hidden=true;return}
    if(!seen&&!autoShown&&!visible){autoShown=true;begin()}
    else replay.hidden=visible;
  }
  new MutationObserver(sync).observe(document.body,{attributes:true,attributeFilter:['class','data-exp-mode']});
  window.GNSSMission00={
    open:begin,
    close,
    get active(){return visible},
    get completed(){return completed},
    restart(){begin();setStage(0)}
  };
  sync();
})();
