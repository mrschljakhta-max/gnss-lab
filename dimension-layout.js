/* GNSS LAB / Collision-free drafting dimensions.
 * Pure layout in SVG viewBox units. No interaction or measurement logic changed.
 * Shared by saved strokes and in-progress 3D playback.
 */
(function(){
 'use strict';
 const VIEW={left:16,top:56,right:1184,bottom:636};
 const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
 const hypot=Math.hypot;
 const dist=(x1,y1,x2,y2)=>hypot(x1-x2,y1-y2);
 function bounds(x,y,text,font=14){
  // Monospace widths: large enough for Ukrainian decimal comma and "мм".
  const width=Math.max(39,[...String(text)].length*font*.65+9);
  const height=font+9;
  return {left:x-width/2,right:x+width/2,top:y-height+6,bottom:y+6,x,y,width,height};
 }
 function overlaps(a,b,pad=6){
  return a.left<b.right+pad&&a.right>b.left-pad&&a.top<b.bottom+pad&&a.bottom>b.top-pad;
 }
 function segmentTouchesBox(s,b,pad=7){
  const x1=s.x1,y1=s.y1,x2=s.x2,y2=s.y2;
  const lo=b.left-pad,hi=b.right+pad,up=b.top-pad,down=b.bottom+pad;
  // Liang-Barsky clipping against expanded label bounds.
  let t0=0,t1=1,dx=x2-x1,dy=y2-y1;
  const p=[-dx,dx,-dy,dy],q=[x1-lo,hi-x1,y1-up,down-y1];
  for(let i=0;i<4;i++){
   if(Math.abs(p[i])<1e-8){if(q[i]<0)return false;continue;}
   const t=q[i]/p[i];
   if(p[i]<0){t0=Math.max(t0,t)}else{t1=Math.min(t1,t)}
   if(t0>t1)return false;
  }
  return true;
 }
 function circleTouchesBox(s,b,pad=7){
  // A label should not touch a circle's stroke.
  const x=clamp(s.x,b.left-pad,b.right+pad),y=clamp(s.y,b.top-pad,b.bottom+pad);
  const near=dist(x,y,s.x,s.y);
  const far=Math.max(
   dist(b.left-pad,b.top-pad,s.x,s.y),
   dist(b.right+pad,b.top-pad,s.x,s.y),
   dist(b.left-pad,b.bottom+pad,s.x,s.y),
   dist(b.right+pad,b.bottom+pad,s.x,s.y)
  );
  return s.r>=near-1&&s.r<=far+1;
 }
 function boxPenalty(box,shapes,placed){
  let p=0;
  if(box.left<VIEW.left)p+=900+(VIEW.left-box.left)*50;
  if(box.right>VIEW.right)p+=900+(box.right-VIEW.right)*50;
  if(box.top<VIEW.top)p+=900+(VIEW.top-box.top)*50;
  if(box.bottom>VIEW.bottom)p+=900+(box.bottom-VIEW.bottom)*50;
  for(const prev of placed){
   if(overlaps(box,prev,9))p+=5000;
   else if(overlaps(box,prev,19))p+=260;
  }
  for(const s of shapes){
   if(!s)continue;
   if(s.type==='line'&&segmentTouchesBox(s,box))p+=1100;
   if(s.type==='circle'&&circleTouchesBox(s,box))p+=1100;
  }
  return p;
 }
 function lineCandidates(shape){
  const dx=shape.x2-shape.x1,dy=shape.y2-shape.y1,L=hypot(dx,dy)||1;
  let nx=-dy/L,ny=dx/L;
  // Prefer the upper side of the dimension, including diagonal lines.
  if(ny>0 || (Math.abs(ny)<.05&&nx>0)){nx=-nx;ny=-ny}
  const candidates=[];
  const fractions=[.5,.32,.68,.2,.8,.4,.6,.1,.9];
  const offsets=[27,38,51,67,84,105];
  for(const offset of offsets){
   for(const fraction of fractions){
    for(const sign of [1,-1]){
     const cx=shape.x1+dx*fraction+nx*offset*sign;
     const cy=shape.y1+dy*fraction+ny*offset*sign;
     candidates.push({x:cx,y:cy,base:offset*.28+Math.abs(fraction-.5)*70+(sign===-1?8:0)});
    }
   }
  }
  return candidates;
 }
 function circleCandidates(shape){
  const options=[],angles=[-Math.PI/2,-Math.PI/4,-3*Math.PI/4,0,Math.PI,Math.PI/4,3*Math.PI/4,Math.PI/2];
  for(const offset of [23,35,49,68,88,110]){
   for(let i=0;i<angles.length;i++){
    const a=angles[i],r=shape.r+offset;
    options.push({x:shape.x+r*Math.cos(a),y:shape.y+r*Math.sin(a),
      base:offset*.26+i*2});
   }
  }
  return options;
 }
 function layout(shapes,texts,options={}){
  const result=[],placed=[...(options.reserved||[])],sz=options.font||14;
  const obstacles=[...(options.obstacles||[]),...shapes];
  if(!Array.isArray(shapes))return result;
  // Stable ordering: existing labels retain preference; new one avoids them.
  for(let i=0;i<shapes.length;i++){
   const shape=shapes[i],label=String(texts?.[i]??'');
   if(!shape||!label){result.push(null);continue}
   const candidates=shape.type==='circle'?circleCandidates(shape):lineCandidates(shape);
   let best=null,score=Infinity;
   for(const candidate of candidates){
    const box=bounds(candidate.x,candidate.y,label,sz);
    const value=candidate.base+boxPenalty(box,obstacles,placed);
    if(value<score){score=value;best={x:candidate.x,y:candidate.y,box,score:value};}
    if(value<15)break;
   }
   if(!best){result.push(null);continue}
   placed.push(best.box);
   result.push({x:Math.round(best.x*10)/10,y:Math.round(best.y*10)/10,
     box:best.box,score:best.score});
  }
  return result;
 }
 window.GNSSDimensions=Object.freeze({layout,segmentTouchesBox,bounds});
})();