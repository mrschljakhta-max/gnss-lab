/* Non-destructive coordinate axes overlay. SVG layer is retained in SVG and PDF exports. */
(function(){
  "use strict";
  const SVG_NS="http://www.w3.org/2000/svg";
  const KEY="geometry-studio-axis-mode-v1";
  const MODES=["none","x","xy","xyz"];
  const $=id=>document.getElementById(id);
  let mode="none";
  try {const saved=localStorage.getItem(KEY);if(MODES.includes(saved))mode=saved;}catch(_){}
  const svgElement=(tag,attributes,parent)=>{
    const node=document.createElementNS(SVG_NS,tag);
    for(const [key,value] of Object.entries(attributes||{}))node.setAttribute(key,String(value));
    if(parent)parent.appendChild(node);
    return node;
  };
  function axis(parent,begin,end,color,label,labelOffset){
    svgElement("line",{x1:begin.x,y1:begin.y,x2:end.x,y2:end.y,
      stroke:color,"stroke-width":0.48,"stroke-linecap":"round",
      class:"coordinate-axis"},parent);
    const theta=Math.atan2(end.y-begin.y,end.x-begin.x);
    const tip=4.2,spread=2.15;
    const p1={x:end.x-tip*Math.cos(theta)+spread*Math.sin(theta),y:end.y-tip*Math.sin(theta)-spread*Math.cos(theta)};
    const p2={x:end.x-tip*Math.cos(theta)-spread*Math.sin(theta),y:end.y-tip*Math.sin(theta)+spread*Math.cos(theta)};
    svgElement("path",{d:"M "+p1.x+" "+p1.y+" L "+end.x+" "+end.y+" L "+p2.x+" "+p2.y,
      fill:"none",stroke:color,"stroke-width":0.45,"stroke-linecap":"round","stroke-linejoin":"round"},parent);
    const t=svgElement("text",{x:end.x+labelOffset.x,y:end.y+labelOffset.y,fill:color,
      "font-size":5.0,"font-family":"Arial, sans-serif","font-weight":700},parent);
    t.textContent=label;
  }
  function paint(){
    const sheet=$("sheet"),drawing=$("drawingLayer");
    if(!sheet||!drawing)return;
    let layer=$("axesLayer");
    if(!layer){layer=svgElement("g",{id:"axesLayer","aria-label":"Координатні осі"},null);
      sheet.insertBefore(layer,drawing);}
    layer.replaceChildren();
    const ox=148.5,oy=190;
    if(mode!=="none"){
      // X is the horizontal drafting reference axis (important for task 5).
      axis(layer,{x:14,y:oy},{x:283,y:oy},"#174a70","X",{x:-1,y:-5});
      // Origin and a light 10 mm drafting scale.
      for(let x=ox-120;x<=ox+120;x+=10){
        svgElement("line",{x1:x,y1:oy-1.3,x2:x,y2:oy+1.3,stroke:"#90a5b7",
          "stroke-width":0.22},layer);
      }
      svgElement("circle",{cx:ox,cy:oy,r:1.15,fill:"#174a70"},layer);
      const o=svgElement("text",{x:ox+3.2,y:oy+6,fill:"#58728a",
        "font-size":3.65,"font-family":"Arial, sans-serif"},layer);
      o.textContent="O";
    }
    if(mode==="xy"){
      axis(layer,{x:ox,y:385},{x:ox,y:30},"#138f8f","Y",{x:6,y:4});
    } else if(mode==="xyz"){
      // A readable, explicitly schematic axonometric triad: X horizontal, Y oblique, Z upward.
      axis(layer,{x:ox,y:oy},{x:45,y:355},"#158d8b","Y",{x:-3,y:7});
      axis(layer,{x:ox,y:oy},{x:ox,y:28},"#bf7540","Z",{x:6,y:5});
    }
    document.querySelectorAll(".axis-option").forEach(button=>{
      button.setAttribute("aria-pressed",String(button.dataset.axes===mode));
    });
    if($("axesFab"))$("axesFab").setAttribute("data-axis-mode",mode);
  }
  const isOpen=()=>!!$("axesPopover")?.classList.contains("open");
  function close(){
    $("axesPopover")?.classList.remove("open");
    $("axesPopover")?.setAttribute("aria-hidden","true");
    $("axesFab")?.setAttribute("aria-expanded","false");
  }
  function open(){
    for(const [popup,button] of [["shapesPopover","shapesFab"],["toolsPopover","toolsFab"]]){
      $(popup)?.classList.remove("open");
      $(popup)?.setAttribute("aria-hidden","true");
      $(button)?.setAttribute("aria-expanded","false");
    }
    $("axesPopover")?.classList.add("open");
    $("axesPopover")?.setAttribute("aria-hidden","false");
    $("axesFab")?.setAttribute("aria-expanded","true");
  }
  function setMode(next){
    if(!MODES.includes(next))return;
    mode=next;
    try{localStorage.setItem(KEY,mode);}catch(_){}
    paint();close();
  }
  function init(){
    const trigger=$("axesFab"),popup=$("axesPopover");
    if(!trigger||!popup||!$("sheet"))return;
    trigger.addEventListener("click",()=>isOpen()?close():open());
    $("axesPopoverClose")?.addEventListener("click",close);
    popup.querySelectorAll(".axis-option").forEach(btn=>
      btn.addEventListener("click",()=>setMode(btn.dataset.axes))
    );
    $("axesClear")?.addEventListener("click",()=>setMode("none"));
    document.addEventListener("pointerdown",event=>{
      if(isOpen()&&!popup.contains(event.target)&&!trigger.contains(event.target))close();
    });
    document.addEventListener("keydown",event=>{
      if(event.key==="Escape"&&isOpen())close();
    });
    // A new sheet means a fresh coordinate layout; the example already has its own X axis.
    for(const id of ["btnNew","btnExample"]){
      $(id)?.addEventListener("click",()=>setMode("none"));
    }
    paint();
  }
  window.GeometryStudioAxes={getMode:()=>mode,setMode};
  if(document.readyState==="loading"){
    document.addEventListener("DOMContentLoaded",init,{once:true});
  }else init();
})();