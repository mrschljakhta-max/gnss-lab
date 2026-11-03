/* Geometry Studio projection and zoom controls — attaches to the native drawing engine */
(()=>{
"use strict";
const $=id=>document.getElementById(id);
const api=()=>window.GeometryStudioViewportAPI;
const menu=()=>$("projectionPopover");
const isOpen=()=>!!menu()?.classList.contains("open");
const sync=()=>{
 const config=api()?.getProjection();
 if(!config)return;
 document.querySelectorAll(".projection-option").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.view===config.view)));
 if($("projectionLinks"))$("projectionLinks").checked=!!config.links;
 if($("projectionProfile"))$("projectionProfile").checked=!!config.profile;
};
function close(){
 menu()?.classList.remove("open");
 menu()?.setAttribute("aria-hidden","true");
 $("projectionFab")?.setAttribute("aria-expanded","false");
}
function open(){
 for(const [p,b] of [["toolsPopover","toolsFab"],["shapesPopover","shapesFab"],["axesPopover","axesFab"]]){
  $(p)?.classList.remove("open");$(p)?.setAttribute("aria-hidden","true");
  $(b)?.setAttribute("aria-expanded","false");
 }
 sync();menu()?.classList.add("open");menu()?.setAttribute("aria-hidden","false");
 $("projectionFab")?.setAttribute("aria-expanded","true");
}
function init(){
 const trigger=$("projectionFab");
 if(!trigger)return;
 trigger.addEventListener("click",()=>isOpen()?close():open());
 $("projectionClose")?.addEventListener("click",close);
 document.querySelectorAll(".projection-option").forEach(b=>b.addEventListener("click",()=>{
  api()?.setProjection({view:b.dataset.view});sync();close();
 }));
 $("projectionLinks")?.addEventListener("change",e=>{api()?.setProjection({links:e.target.checked});sync();});
 $("projectionProfile")?.addEventListener("change",e=>{api()?.setProjection({profile:e.target.checked});sync();});
 $("zoomPlus")?.addEventListener("click",()=>api()?.zoomIn());
 $("zoomMinus")?.addEventListener("click",()=>api()?.zoomOut());
 $("zoomPercent")?.addEventListener("click",()=>api()?.resetZoom());
 document.addEventListener("pointerdown",e=>{
  if(isOpen()&&!menu().contains(e.target)&&!trigger.contains(e.target))close();
 });
 for(const b of ["axesFab","shapesFab","toolsFab"]){
  $(b)?.addEventListener("click",close);
 }
 document.addEventListener("keydown",e=>{if(e.key==="Escape"&&isOpen())close();});
 sync();
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});
else init();
})();