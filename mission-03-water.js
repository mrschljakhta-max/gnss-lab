/* GNSS LAB — WebGL ripple tank with graceful SVG fallback. */
(function(){
'use strict';
const vert='attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}';
const frag="precision highp float;\nuniform vec2 res;uniform float t,f,on;uniform vec3 hits[8];uniform float nh;\nvoid main(){\nvec2 p=vec2(gl_FragCoord.x/res.x*1200.,(1.-gl_FragCoord.y/res.y)*660.);\nfloat y=p.y,x=p.x,k=clamp((y-166.)/401.,0.,1.);\nfloat l=mix(167.,106.,k),r=mix(1013.,1079.,k);\nfloat edge=min(min(x-l,r-x),min(y-165.,566.-y));\nif(edge<0.)discard;\nfloat wet=min(min(x-(l+20.),r-20.-x),min(y-196.,531.-y));\nvec3 c;\nif(wet<0.){\nfloat band=clamp(edge/21.,0.,1.);\nc=mix(vec3(.016,.14,.23),vec3(.70,.94,.97),band);\nc+=vec3(.2,.24,.26)*pow(max(0.,sin((x+y*.45)*.025)),16.);\n}else{\nfloat d=length((p-vec2(590.,348.))*vec2(1.,1.47));\nfloat ripple=on>.5?sin(d*.043-t*f*6.28318)*exp(-d/740.):0.;\nfloat pulse=0.;\nfor(int i=0;i<8;i++){if(float(i)<nh){vec3 h=hits[i];float rad=length((p-h.xy)*vec2(1.,1.47));pulse+=exp(-pow((rad-h.z)/8.,2.));}}\nfloat caust=pow(max(0.,sin(x*.038+sin(y*.03+t*.55)*2.)*sin(y*.047+sin(x*.025-t*.42)*2.)),6.);\nfloat bright=clamp(.5+.24*sin(x*.04+t*.3)+.2*sin(y*.04-t*.32),0.,1.);\nc=mix(vec3(.003,.14,.22),vec3(.004,.34,.43),clamp(.4+bright*.42,0.,1.));\nc+=vec3(.026,.28,.31)*caust;\nc+=vec3(.04,.59,.73)*(pow(max(0.,ripple),8.)*.63+pulse*.73);\nc*=mix(.65,1.,smoothstep(0.,65.,wet));\n}\nfloat metal=length((p-vec2(590.,348.))/vec2(22.,14.));\nif(y>348.&&y<365.&&abs(x-590.)<19.)c=vec3(.13,.54,.63);\nif(metal<1.){float shine=clamp(.69-.39*(x-590.)/22.-.25*(y-348.)/14.,0.,1.);c=mix(vec3(.26,.43,.49),vec3(.96,.99,1.),shine);}\nc+=vec3(.19,.46,.52)*(exp(-pow((y-181.)/5.,2.))+exp(-pow((y-548.)/5.,2.)));\ngl_FragColor=vec4(clamp(c,0.,1.),1.);\n}";
window.GNSSWaveTank=function(canvas){
 let gl,prog,buffer;
 try{
 gl=canvas.getContext('webgl',{alpha:true,antialias:true,powerPreference:'default'});
 if(!gl)return null;
 const compile=(kind,src)=>{const s=gl.createShader(kind);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s};
 const v=compile(gl.VERTEX_SHADER,vert),f=compile(gl.FRAGMENT_SHADER,frag);
 prog=gl.createProgram();gl.attachShader(prog,v);gl.attachShader(prog,f);gl.linkProgram(prog);if(!gl.getProgramParameter(prog,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(prog));
 gl.deleteShader(v);gl.deleteShader(f);
 buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
 }catch(err){console.warn('Wave tank SVG fallback',err);return null}
 const u=n=>gl.getUniformLocation(prog,n);
 const loc={res:u('res'),time:u('t'),freq:u('f'),on:u('on'),hits:u('hits[0]'),count:u('nh')};
 return {render(time,freq,on,hits){
 const box=canvas.getBoundingClientRect();if(!box.width||!box.height)return;
 const ratio=Math.min(window.devicePixelRatio||1,1.5),w=Math.round(box.width*ratio),h=Math.round(box.height*ratio);
 if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;gl.viewport(0,0,w,h)}
 gl.useProgram(prog);gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
 const attr=gl.getAttribLocation(prog,'a');gl.enableVertexAttribArray(attr);gl.vertexAttribPointer(attr,2,gl.FLOAT,false,0,0);
 gl.uniform2f(loc.res,w,h);gl.uniform1f(loc.time,time);gl.uniform1f(loc.freq,freq);gl.uniform1f(loc.on,on?1:0);
 const values=new Float32Array(24);for(let i=0;i<Math.min(8,hits.length);i++){const hit=hits[i];values.set([hit.x||590,hit.y||348,hit.r],i*3)}
 gl.uniform3fv(loc.hits,values);gl.uniform1f(loc.count,Math.min(hits.length,8));gl.drawArrays(gl.TRIANGLES,0,6);
 },destroy(){gl.deleteBuffer(buffer);gl.deleteProgram(prog)}};
};
})();