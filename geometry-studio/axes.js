/* SVG coordinate axes and precise numbered scale. All marks remain vector-based. */
(function(){
"use strict";
const SVG_NS="http://www.w3.org/2000/svg";
const MODE_KEY="geometry-studio-axis-mode-v1";
const SCALE_KEY="geometry-studio-axis-scale-v1";
const MODES=["none","x","xy","xyz"];
const STEPS=[1,2,5,10,20];
const O={x:245,y:190}, X_LEFT=14, X_RIGHT=283;
const $=id=>document.getElementById(id);
let mode="none";
let scale={step:5,ticks:true,numbers:true,crossings:true};
let lines=[],zoom=1;
try{
 const saved=localStorage.getItem(MODE_KEY);if(MODES.includes(saved))mode=saved;
 const stored=JSON.parse(localStorage.getItem(SCALE_KEY)||"null");
 if(stored&&typeof stored==="object")scale=normalizeScale(stored);
}catch(_){}
function normalizeScale(obj){
 const n=Number(obj?.step);
 return {step:STEPS.includes(n)?n:5,
  ticks:obj?.ticks!==false,numbers:obj?.numbers!==false,crossings:obj?.crossings!==false};
}
function svgElement(tag,attributes,parent){
 const node=document.createElementNS(SVG_NS,tag);
 for(const [key,value] of Object.entries(attributes||{}))node.setAttribute(key,String(value));
 if(parent)parent.appendChild(node);
 return node;
}
function label(parent,value,x,y,opts={}){
 const t=svgElement("text",{
   x,y,fill:opts.color||"#325978","font-size":opts.size||3.1,
   "font-family":"Arial, sans-serif","font-weight":opts.weight||600,
   "text-anchor":opts.anchor||"middle","paint-order":"stroke",
   stroke:"#fff","stroke-width":opts.halo||.65,"stroke-linejoin":"round",
   "pointer-events":"none",class:opts.css||"coordinate-scale-number"
 },parent);
 t.textContent=String(value);return t;
}
function axis(parent,begin,end,color,name,offset){
 svgElement("line",{x1:begin.x,y1:begin.y,x2:end.x,y2:end.y,
  stroke:color,"stroke-width":.48,"stroke-linecap":"round",class:"coordinate-axis"},parent);
 const theta=Math.atan2(end.y-begin.y,end.x-begin.x);
 const tip=4.2,spread=2.15;
 const p1={x:end.x-tip*Math.cos(theta)+spread*Math.sin(theta),y:end.y-tip*Math.sin(theta)-spread*Math.cos(theta)};
 const p2={x:end.x-tip*Math.cos(theta)-spread*Math.sin(theta),y:end.y-tip*Math.sin(theta)+spread*Math.cos(theta)};
 svgElement("path",{d:"M "+p1.x+" "+p1.y+" L "+end.x+" "+end.y+" L "+p2.x+" "+p2.y,
  fill:"none",stroke:color,"stroke-width":.45,"stroke-linecap":"round","stroke-linejoin":"round"},parent);
 label(parent,name,end.x+offset.x,end.y+offset.y,{color,size:5,weight:700,css:"coordinate-axis-name"});
}
function scaleFont(){return Math.max(1.2,Math.min(4.8,9.5/(2*Math.max(.38,zoom))));}
function markScale(layer){
 if(!scale.ticks&&!scale.numbers)return;
 const step=scale.step,pxPerMm=2*Math.max(.38,zoom),size=scaleFont();
 const positive=Math.floor((O.x-X_LEFT)/step),negative=Math.floor((X_RIGHT-O.x)/step);
 // Positive X points left. Keep negative numbering available to the right of origin.
 for(const sign of [1,-1]){
  let lastScreen=null,lastWidth=0;
  const limit=sign===1?positive:negative;
  for(let k=1;k<=limit;k++){
   const number=sign*k*step;
   const x=O.x-number;
   if(x<X_LEFT||x>X_RIGHT)continue;
   if(scale.ticks){
    const major=k%5===0,length=major?2.15:1.3;
    svgElement("line",{x1:x,y1:O.y-length,x2:x,y2:O.y+length,
      stroke:major?"#557a99":"#8da9bd","stroke-width":major?.3:.2,
      class:"coordinate-scale-tick"},layer);
   }
   if(!scale.numbers)continue;
   const content=String(number),screen=x*pxPerMm;
   // Avoid overlapping text, but keep every tick. Zooming reveals extra labels.
   const width=content.length*size*pxPerMm*.54;
   const minGap=width/2+lastWidth/2+1.5;
   if(lastScreen!==null&&Math.abs(screen-lastScreen)<minGap)continue;
   label(layer,content,x,O.y+2.1+size,{size,color:"#436b89",weight:600});
   lastScreen=screen;lastWidth=width;
  }
 }
}
function crossingValues(){
 const out=[];
 for(const e of lines){
  if(e?.kind==="guide"||!Number.isFinite(e?.x1)||!Number.isFinite(e?.y1)||
    !Number.isFinite(e?.x2)||!Number.isFinite(e?.y2))continue;
  const dy=e.y2-e.y1;
  if(Math.abs(dy)<1e-8)continue; // An axis-collinear line has no unique crossing.
  const t=(O.y-e.y1)/dy;
  if(e.extent!=="line"&&(t<-.000001||t>1.000001))continue;
  const x=e.x1+t*(e.x2-e.x1);
  if(x<X_LEFT-.00001||x>X_RIGHT+.00001)continue;
  // Merge coincident crossings; shared vertices must not add duplicate markers.
  if(out.some(v=>Math.abs(v.x-x)<.16))continue;
  out.push({x,value:O.x-x});
  if(out.length>=100)break;
 }
 return out.sort((a,b)=>a.x-b.x);
}
function formatted(n){
 const precision=Math.abs(n-Math.round(n))<.001?0:Math.abs(n*10-Math.round(n*10))<.001?1:2;
 return Number(n.toFixed(precision)).toLocaleString("uk-UA",{maximumFractionDigits:precision});
}
function paintCrossings(layer){
 if(!scale.crossings)return;
 const entries=crossingValues(),size=scaleFont(),space=2*Math.max(.38,zoom);
 let lastCenter=-Infinity,lastWidth=0;
 for(const item of entries){
  const x=item.x,textValue=formatted(item.value);
  const group=svgElement("g",{class:"coordinate-axis-intersection"},layer);
  svgElement("line",{x1:x,y1:O.y-2.3,x2:x,y2:O.y+2.3,
    stroke:"#c57524","stroke-width":.75},group);
  svgElement("circle",{cx:x,cy:O.y,r:1.0,fill:"#fff",
    stroke:"#bd7828","stroke-width":.6},group);
  const title=svgElement("title",{},group);
  title.textContent="Перетин з X = "+textValue+" мм";
  // Crossing values belong above the axis; regular ruler numbers are below it.
  const width=textValue.length*size*space*.54,center=x*space;
  if(center-lastCenter<width/2+lastWidth/2+5)continue;
  label(group,textValue,x,O.y-3.4,{color:"#a75a1f",size,weight:700,css:"coordinate-intersection-label"});
  lastCenter=center;lastWidth=width;
 }
}
function syncControls(){
 for(const btn of document.querySelectorAll(".axis-option"))
  btn.setAttribute("aria-pressed",String(btn.dataset.axes===mode));
 $("axesFab")?.setAttribute("data-axis-mode",mode);
 if($("axisTickStep"))$("axisTickStep").value=String(scale.step);
 if($("axisShowTicks"))$("axisShowTicks").checked=scale.ticks;
 if($("axisShowNumbers"))$("axisShowNumbers").checked=scale.numbers;
 if($("axisShowCrossings"))$("axisShowCrossings").checked=scale.crossings;
}
function paint(){
 const sheet=$("sheet"),drawing=$("drawingLayer");
 if(!sheet||!drawing)return;
 let layer=$("axesLayer");
 if(!layer){
  layer=svgElement("g",{id:"axesLayer","aria-label":"Координатні осі та шкала"},null);
  sheet.insertBefore(layer,drawing);
 }
 layer.replaceChildren();
 if(mode!=="none"){
  axis(layer,{x:283,y:O.y},{x:X_LEFT,y:O.y},"#174a70","X",{x:2,y:-5});
  markScale(layer);
  svgElement("circle",{cx:O.x,cy:O.y,r:1.15,fill:"#174a70"},layer);
  label(layer,"O",O.x+3.2,O.y+6,{color:"#58728a",size:3.65,weight:400,anchor:"start"});
  paintCrossings(layer);
 }
 if(mode==="xy"){
  axis(layer,{x:O.x,y:30},{x:O.x,y:385},"#138f8f","Y",{x:6,y:3});
 }else if(mode==="xyz"){
  axis(layer,{x:O.x,y:O.y},{x:283,y:315},"#158d8b","Y",{x:-10,y:7});
  axis(layer,{x:O.x,y:O.y},{x:O.x,y:28},"#bf7540","Z",{x:6,y:5});
 }
 syncControls();
}
function save(){try{localStorage.setItem(SCALE_KEY,JSON.stringify(scale));}catch(_){}}
const isOpen=()=>!!$("axesPopover")?.classList.contains("open");
function close(){
 $("axesPopover")?.classList.remove("open");
 $("axesPopover")?.setAttribute("aria-hidden","true");
 $("axesFab")?.setAttribute("aria-expanded","false");
}
function open(){
 for(const [popup,button] of [["shapesPopover","shapesFab"],["toolsPopover","toolsFab"],
   ["projectionPopover","projectionFab"]]){
  $(popup)?.classList.remove("open");$(popup)?.setAttribute("aria-hidden","true");
  $(button)?.setAttribute("aria-expanded","false");
 }
 $("axesPopover")?.classList.add("open");$("axesPopover")?.setAttribute("aria-hidden","false");
 $("axesFab")?.setAttribute("aria-expanded","true");
}
function setMode(next){
 if(!MODES.includes(next))return;
 mode=next;
 try{localStorage.setItem(MODE_KEY,mode);}catch(_){}
 paint();close();
}
function setScaleSettings(settings){
 scale=normalizeScale({...scale,...settings});
 save();
 paint();
}
function refresh(drawingLines,currentZoom){
 if(Array.isArray(drawingLines))lines=drawingLines.slice(0,1200);
 if(Number.isFinite(currentZoom)&&currentZoom>0)zoom=currentZoom;
 paint();
}
function init(){
 const trigger=$("axesFab"),popup=$("axesPopover");
 if(!trigger||!popup||!$("sheet"))return;
 trigger.addEventListener("click",()=>isOpen()?close():open());
 $("axesPopoverClose")?.addEventListener("click",close);
 popup.querySelectorAll(".axis-option").forEach(btn=>btn.addEventListener("click",()=>setMode(btn.dataset.axes)));
 $("axesClear")?.addEventListener("click",()=>setMode("none"));
 $("axisTickStep")?.addEventListener("change",e=>setScaleSettings({step:Number(e.target.value)}));
 for(const [id,key] of [["axisShowTicks","ticks"],["axisShowNumbers","numbers"],
   ["axisShowCrossings","crossings"]]){
  $(id)?.addEventListener("change",e=>setScaleSettings({[key]:e.target.checked}));
 }
 document.addEventListener("pointerdown",event=>{
  if(isOpen()&&!popup.contains(event.target)&&!trigger.contains(event.target))close();
 });
 document.addEventListener("keydown",event=>{if(event.key==="Escape"&&isOpen())close();});
 for(const id of ["btnNew","btnExample"])$(id)?.addEventListener("click",()=>setMode("none"));
 // The editor may have rendered an existing drawing before this module initialized.
 const current=window.GeometryStudioViewportAPI;
 const initial=current?.getAxisScaleSegments?.();
 if(Array.isArray(initial))lines=initial;
 const initialZoom=current?.getZoom?.();
 if(Number.isFinite(initialZoom)&&initialZoom>0)zoom=initialZoom;
 paint();
}
window.GeometryStudioAxes={
 getMode:()=>mode,setMode,
 getScaleSettings:()=>({...scale}),setScaleSettings,
 refresh,setZoom:z=>{if(Number.isFinite(z)&&z>0&&Math.abs(z-zoom)>.001){zoom=z;paint();}},
 getCrossings:()=>crossingValues().map(item=>({...item}))
};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});
else init();
})();