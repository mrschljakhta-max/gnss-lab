/* GNSS LAB / Illustrated drafting tools: pure SVG artwork, no WebGL dependency. */
(function(){
'use strict';
const tools=document.getElementById('engTools');
if(!tools)return;
const metal='<linearGradient id="metal" x1="0" y1="0" x2="0.21" y2="1"><stop stop-color="#f7fbfa"/><stop offset=".2" stop-color="#c9d6db"/><stop offset=".47" stop-color="#7d919b"/><stop offset=".68" stop-color="#d8e3e3"/><stop offset="1" stop-color="#677c86"/></linearGradient>';
const edge='<linearGradient id="edge" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#f9ffff"/><stop offset=".48" stop-color="#8097a5"/><stop offset="1" stop-color="#364e60"/></linearGradient>';
const blue='<linearGradient id="blue" x1="0" y1="0" x2="0.3" y2="1"><stop stop-color="#4b86a5"/><stop offset=".26" stop-color="#234e6f"/><stop offset=".65" stop-color="#0d2e4e"/><stop offset="1" stop-color="#366c91"/></linearGradient>';
const rubber='<linearGradient id="rubber" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#fffdf0"/><stop offset=".48" stop-color="#d6d9cf"/><stop offset="1" stop-color="#a3b1ad"/></linearGradient>';
const shared='<defs>'+metal+edge+blue+rubber+
 '<filter id="shade" x="-50%" y="-60%" width="200%" height="230%"><feGaussianBlur stdDeviation="4"/></filter>'+
 '<linearGradient id="shine" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#fff" stop-opacity=".8"/><stop offset=".4" stop-color="#fff" stop-opacity="0"/></linearGradient>'+
 '</defs>';
const marks=(count,x0,span,y0,sign=1)=>Array.from({length:count+1},(_,i)=>{
 const x=x0+span*i/count;
 return '<path d="M'+x.toFixed(2)+' '+y0+'v'+(sign*(i%10===0?15:i%5===0?10:6))+'" stroke="#405966" stroke-width="'+(i%10===0?1.45:.8)+'" opacity=".88"/>';
}).join('');
const ruler='<g transform="translate(82 57) rotate(-20) translate(-82 -57)">'+
 '<rect x="10" y="38" width="144" height="35" rx="3.5" fill="#000" opacity=".27" transform="translate(3 6)" filter="url(#shade)"/>'+
 '<rect x="10" y="38" width="144" height="35" rx="3" fill="url(#metal)" stroke="#f0f6f4" stroke-width="1.1"/>'+
 '<path d="M14 42H150" stroke="#fff" stroke-opacity=".72" stroke-width="1.5"/>'+
 '<path d="M13 67H150" stroke="#30444f" stroke-opacity=".8"/>'+marks(42,17,124,40,1)+
 '<circle cx="145" cy="58" r="4.2" fill="#173340" stroke="#ecf6f3" stroke-width="1.7"/>'+
 [0,2,4,6,8,10,12].map((n,i)=>'<text x="'+(19+i*19.3)+'" y="64" fill="#304854" font-size="6.5" font-family="monospace">'+n+'</text>').join('')+
 '<path d="M13 41H150" stroke="#fff" stroke-opacity=".52"/>'+
 '</g>';
const pen='<g transform="translate(80 55) rotate(-37) translate(-80 -55)">'+
 '<ellipse cx="83" cy="61" rx="69" ry="9" opacity=".23" fill="#000" filter="url(#shade)"/>'+
 '<path d="M12 56L27 50L27 63Z" fill="url(#edge)" stroke="#a9c1c8"/>'+
 '<path d="M7 56L13 53V59Z" fill="#c3dae1"/>'+
 '<rect x="25" y="46" width="99" height="20" rx="8" fill="url(#blue)" stroke="#9eb9c9" stroke-width="1.1"/>'+
 '<rect x="36" y="48" width="54" height="3" rx="1.5" fill="#91c1d9" opacity=".68"/>'+
 '<rect x="29" y="46" width="29" height="20" rx="4" fill="url(#metal)" opacity=".9"/>'+
 Array.from({length:9},(_,i)=>'<path d="M'+(31+i*3)+' 47v17" stroke="#2f4c5e" stroke-width=".8" opacity=".55"/>').join('')+
 '<rect x="117" y="45" width="7" height="22" rx="2" fill="url(#metal)" stroke="#e0eef1"/>'+
 '<path d="M124 46h11l5 6v8l-5 6h-11z" fill="url(#metal)" stroke="#eff5f3"/>'+
 '<path d="M125 48h10" stroke="#fff" stroke-width="1.3" opacity=".65"/>'+
 '<path d="M110 42h30v3h-30z" fill="#cad6d9" transform="rotate(3 110 42)"/>'+
 '</g>';
const compass='<g>'+
 '<ellipse cx="83" cy="99" rx="42" ry="7" fill="#000" opacity=".18" filter="url(#shade)"/>'+
 '<rect x="77" y="7" width="13" height="19" rx="3" fill="url(#metal)" stroke="#e6f2f5"/>'+
 Array.from({length:6},(_,i)=>'<path d="M78 '+(10+i*2.4)+'h11" stroke="#4b5b62" stroke-width=".7"/>').join('')+
 '<circle cx="83" cy="29" r="15.5" fill="url(#metal)" stroke="#d9e7e7" stroke-width="2"/>'+
 '<circle cx="83" cy="29" r="8" fill="#0b1b25" stroke="#dbeaf1" stroke-width="2"/>'+
 '<path d="M76 45L43 104L51 109L88 49Z" fill="url(#metal)" stroke="#d5e3e8" stroke-width="1.5"/>'+
 '<path d="M90 45L123 104L115 109L79 49Z" fill="url(#edge)" stroke="#d5e3e8" stroke-width="1.5"/>'+
 '<path d="M45 104l-4 8 10-3zM115 109l11 3-5-8z" fill="#dae8eb" stroke="#7d929c" stroke-width="1"/>'+
 '<path d="M52 80H113" stroke="#b9c8cd" stroke-width="6" stroke-linecap="round"/>'+
 '<path d="M52 80H113" stroke="#526875" stroke-width="2" stroke-linecap="round"/>'+
 '<circle cx="83" cy="80" r="4" fill="#d8e8e8" stroke="#617e8c"/>'+
 '<rect x="56" y="59" width="10" height="23" rx="3" fill="url(#blue)" transform="rotate(26 56 59)"/>'+
 '<path d="M82 13h2M82 18h2" stroke="#243e49" stroke-width="2"/>'+
 '</g>';
const caliper='<g transform="translate(82 57) rotate(-19) translate(-82 -57)">'+
 '<ellipse cx="80" cy="83" rx="73" ry="11" fill="#000" opacity=".28" filter="url(#shade)"/>'+
 '<rect x="8" y="50" width="148" height="15" rx="1" fill="url(#metal)" stroke="#e0ebed" stroke-width="1.2"/>'+
 marks(35,14,129,52,1)+
 '<path d="M16 49h10V19h9v39H16Z" fill="url(#edge)" stroke="#d6e9eb" stroke-width="1.5"/>'+
 '<path d="M38 49h11V27h-7l-4 9Z" fill="url(#metal)" stroke="#e5f2f3" stroke-width="1"/>'+
 '<rect x="51" y="44" width="57" height="29" rx="2" fill="url(#metal)" stroke="#dce9eb" stroke-width="1.4"/>'+
 '<rect x="55" y="47" width="49" height="8" rx="1" fill="#637e8e" opacity=".7"/>'+
 '<path d="M54 47H106" stroke="#f4f9fa" stroke-width="1"/>'+
 Array.from({length:15},(_,i)=>'<path d="M'+(57+i*3.2)+' 63v'+(i%5===0?8:4)+'" stroke="#496675" stroke-width=".6"/>').join('')+
 '<path d="M52 68h-7v29h10V75M103 69h8v29h-10V75" fill="url(#metal)" stroke="#e4eff0" stroke-width="1.5"/>'+
 '<circle cx="85" cy="42" r="4" fill="url(#edge)" stroke="#dde8ee"/>'+
 '<rect x="130" y="53" width="24" height="9" rx="1" fill="url(#metal)"/>'+
 '</g>';
const eraser='<g transform="translate(82 56) rotate(-18) translate(-82 -56)">'+
 '<ellipse cx="82" cy="78" rx="52" ry="13" fill="#000" opacity=".22" filter="url(#shade)"/>'+
 '<path d="M34 47 116 31 144 47 66 64Z" fill="url(#rubber)" stroke="#f1f2e7" stroke-width="1.3"/>'+
 '<path d="M66 64 144 47 139 73 61 90Z" fill="#aab8b9" stroke="#d4dedf" stroke-width="1"/>'+
 '<path d="M34 47 66 64 61 90 30 72Z" fill="#e9efe9" stroke="#fff" stroke-width=".9"/>'+
 '<path d="M112 31 144 47 139 73 108 55Z" fill="url(#blue)" stroke="#8ea9bf"/>'+
 '<path d="M109 55 139 73l-29 5-3-21z" fill="#4a7f9d" opacity=".6"/>'+
 '<path d="M38 50 115 34" stroke="#fff" stroke-width="2" opacity=".7"/>'+
 '</g>';
const images={ruler,line:pen,compass,caliper,eraser};
for(const [name,graphic]of Object.entries(images)){
 const btn=tools.querySelector('button[data-tool="'+name+'"]');
 const icon=btn?.querySelector('.eng-tool-icon');
 if(!icon)continue;
 icon.classList.add('eng-tool-art');
 icon.innerHTML='<svg aria-hidden="true" class="eng-illustration" viewBox="0 0 165 117" xmlns="http://www.w3.org/2000/svg">'+shared+graphic+'</svg>';
 btn.classList.add('eng-illustrated');
 btn.setAttribute('aria-label',btn.title||name);
}
const units=tools.querySelector('[data-tool="units"]');
if(units)units.classList.add('eng-tool-units');
tools.setAttribute('aria-label','Реалістичні креслярські інструменти');
})();
