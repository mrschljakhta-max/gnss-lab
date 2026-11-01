/* GNSS LAB / Premium tool illustrations for the drafting shelf.
 * Vector metallic artwork stays crisp at desktop and mobile scale.
 * Existing photographic icons for the other instruments remain unchanged.
 */
(function(){
'use strict';
const tools=document.getElementById('engTools');
if(!tools)return;
const header=(id,viewBox='0 0 128 104')=>
 '<svg class="eng-premium-svg" xmlns="http://www.w3.org/2000/svg" viewBox="'+viewBox+'" role="presentation" focusable="false" aria-hidden="true"><defs>'+
 '<linearGradient id="'+id+'-steel" x1="0" y1="0" x2="0.2" y2="1">'+
 '<stop offset="0" stop-color="#f2fbff"/><stop offset=".22" stop-color="#b6c9d3"/>'+
 '<stop offset=".52" stop-color="#708b9b"/><stop offset=".79" stop-color="#e0edf1"/>'+
 '<stop offset="1" stop-color="#60798a"/></linearGradient>'+
 '<linearGradient id="'+id+'-face" x1="0" y1="0" x2="1" y2="1">'+
 '<stop stop-color="#344957"/><stop offset=".5" stop-color="#172f3c"/>'+
 '<stop offset="1" stop-color="#0a1c27"/></linearGradient>'+
 '<radialGradient id="'+id+'-hub"><stop stop-color="#f5faff"/>'+
 '<stop offset=".45" stop-color="#aec2ca"/><stop offset="1" stop-color="#45616c"/></radialGradient>'+
 '<filter id="'+id+'-glow" x="-80%" y="-80%" width="260%" height="260%">'+
 '<feGaussianBlur stdDeviation="1.4" result="blur"/>'+
 '<feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>'+
 '</defs>';
const closing='</svg>';
function protractor(){
 const id='gpt';
 let marks='';
 for(let i=0;i<=180;i+=5){
  const a=(180-i)*Math.PI/180,r0=i%30===0?44:i%10===0?48:52;
  const x1=64+r0*Math.cos(a),y1=79- r0*Math.sin(a);
  const x2=64+57*Math.cos(a),y2=79-57*Math.sin(a);
  marks+='<line x1="'+x1.toFixed(2)+'" y1="'+y1.toFixed(2)+
   '" x2="'+x2.toFixed(2)+'" y2="'+y2.toFixed(2)+'" stroke="#d5e5e9" stroke-opacity="'+(i%30===0?'.95':'.70')+
   '" stroke-width="'+(i%30===0?1.55:.8)+'"/>';
 }
 return header(id)+
 '<path d="M6 80 A58 58 0 0 1 122 80 L115 89 H13Z" fill="url(#gpt-steel)" stroke="#dce9ed" stroke-width="1.9"/>'+
 '<path d="M13 79 A51 51 0 0 1 115 79 H13" fill="url(#gpt-face)" stroke="#7c9baa" stroke-width="1"/>'+
 '<path d="M26 79 A38 38 0 0 1 102 79" stroke="#b9fa7b" stroke-width="1.5" fill="none" filter="url(#gpt-glow)"/>'+
 '<path d="M12 78H116" stroke="#edf5f6" stroke-width="2.2"/>'+
 '<g>'+marks+'</g>'+
 '<line x1="64" y1="79" x2="64" y2="24" stroke="#b8f67e" stroke-width="2.8" filter="url(#gpt-glow)"/>'+
 '<circle cx="64" cy="80" r="10" fill="#344f5b" stroke="#c5d8e1" stroke-width="2"/>'+
 '<circle cx="64" cy="80" r="6.5" fill="url(#gpt-hub)" stroke="#adf470" stroke-width="1.8"/>'+
 '<path d="M18 85H49 M79 85H110" stroke="#b7fd72" stroke-width="2" filter="url(#gpt-glow)"/>'+
 closing;
}
function triangle(){
 const id='gtr',outer='64,7 118,95 10,95',inner='64,31 95,82 33,82';
 let ticks='';
 for(let i=0;i<8;i++){
  const x=23+i*11;
  ticks+='<line x1="'+x+'" y1="91" x2="'+x+'" y2="'+(i%2===0?85:88)+'" stroke="#d9eaf0" stroke-width="1"/>';
 }
 return header(id)+
 '<polygon points="'+outer+'" fill="url(#gtr-steel)" stroke="#f1f8f9" stroke-width="2.4" stroke-linejoin="round"/>'+
 '<polygon points="64,15 111,91 17,91" fill="url(#gtr-face)" stroke="#648594" stroke-width="1.5"/>'+
 '<polygon points="'+inner+'" fill="#0b2433" stroke="#dfeff2" stroke-width="3.6" stroke-linejoin="round"/>'+
 '<polyline points="22,85 64,16 106,85" fill="none" stroke="#abf96d" stroke-opacity=".88" stroke-width="1.8" filter="url(#gtr-glow)"/>'+
 '<g>'+ticks+'</g>'+
 '<path d="M51 41Q64 50 77 41" stroke="#a7f678" stroke-width="1.8" fill="none"/>'+
 '<path d="M48 47H80" stroke="#dce7eb" stroke-width="1" stroke-dasharray="3 4" opacity=".7"/>'+
 '<g fill="#d7e5e9" stroke="#b6fa70" stroke-width="2">'+
 '<rect x="59" y="13" width="10" height="10" rx="1.5"/>'+
 '<rect x="17" y="84" width="10" height="10" rx="1.5"/>'+
 '<rect x="101" y="84" width="10" height="10" rx="1.5"/></g>'+
 closing;
}
function rectangle(){
 const id='grc';
 return header(id)+
 '<path d="M21 22H107V82H21Z" fill="url(#grc-steel)" stroke="#d7e8ed" stroke-width="2.2"/>'+
 '<path d="M27 28H101V76H27Z" fill="url(#grc-face)" stroke="#64818e" stroke-width="1.2"/>'+
 '<path d="M30 32H98V73H30Z" fill="none" stroke="#d1e6ec" stroke-width="1.5"/>'+
 '<path d="M64 11V93 M9 52H119" stroke="#c9e0e4" stroke-dasharray="5 5" stroke-width="1.3" opacity=".7"/>'+
 '<path d="M11 25Q15 6 36 9 M92 9Q113 6 117 25 M12 79Q14 99 37 96 M92 96Q116 97 118 80" stroke="#8bbfc7" stroke-width="1" fill="none" opacity=".6"/>'+
 '<circle cx="64" cy="52" r="9" fill="none" stroke="#abf66b" stroke-width="1.5" filter="url(#grc-glow)"/>'+
 '<path d="M58 52H70M64 46V58" stroke="#ddf5f3" stroke-width="1.4"/>'+
 '<g fill="#deeceb" stroke="#b7fa77" stroke-width="1.7">'+
 '<rect x="17" y="18" width="9" height="9" rx="1.2"/>'+
 '<rect x="102" y="18" width="9" height="9" rx="1.2"/>'+
 '<rect x="17" y="78" width="9" height="9" rx="1.2"/>'+
 '<rect x="102" y="78" width="9" height="9" rx="1.2"/></g>'+
 closing;
}
const drawings={protractor:protractor(),triangle:triangle(),rectangle:rectangle()};
const names={line:'Лінія',protractor:'Транспортир',triangle:'Трикутник',
 rectangle:'Прямокутник',compass:'Циркуль',caliper:'Штангенциркуль',
 eraser:'Гумка',units:'Одиниці'};
for(const [name,label] of Object.entries(names)){
 const button=tools.querySelector('button[data-tool="'+name+'"]');
 if(!button)continue;
 button.classList.add('eng-premium-card');
 if(name==='units')button.classList.add('eng-premium-units');
 button.setAttribute('aria-label',label);
 button.setAttribute('aria-pressed',String(button.classList.contains('eng-selected')));
 if(drawings[name]){
  const holder=button.querySelector('.eng-tool-icon');
  if(holder){
   holder.classList.add('eng-tool-art','eng-tool-premium-vector');
   holder.innerHTML=drawings[name];
  }
 }
}
// All selection states are still maintained by engineering.js.
// Keep aria-pressed in sync without changing the event handlers.
const watch=new MutationObserver(mutations=>{
 for(const mutation of mutations){
  const button=mutation.target;
  if(button.matches?.('button[data-tool]'))button.setAttribute('aria-pressed',
   String(button.classList.contains('eng-selected')));
 }
});
for(const button of tools.querySelectorAll('button[data-tool]'))
 watch.observe(button,{attributes:true,attributeFilter:['class']});
})();
