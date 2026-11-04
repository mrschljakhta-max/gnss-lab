/* Geometry Studio: offline, one-click A3 PDF/PNG and native Excel XLSX export. */
(()=>{
'use strict';
const $=id=>document.getElementById(id);
const MM={width:297,height:420,originX:245,originY:190};
const ns='http://www.w3.org/2000/svg';
const textEncoder=new TextEncoder();
const DATE=()=>new Date().toISOString().slice(0,10);
const FILE=()=> 'geometry-studio-'+DATE();
const finite=v=>typeof v==='number'&&Number.isFinite(v);
const round6=n=>finite(n)?Math.round(n*1e6)/1e6:null;

function status(message,error=false){
 const el=$('exportStatus');if(el){el.textContent=message;el.dataset.error=error?'true':'false';}
}
function download(blob,name){
 const link=document.createElement('a'),url=URL.createObjectURL(blob);
 link.href=url;link.download=name;document.body.append(link);link.click();link.remove();
 setTimeout(()=>URL.revokeObjectURL(url),20000);
}
function exportModel(){
 const api=window.GeometryStudioViewportAPI;
 if(!api?.getExportData)throw Error('Редактор ще не готовий до експорту.');
 return api.getExportData();
}
function svgSnapshot(){
 const api=window.GeometryStudioViewportAPI;
 if(!api?.getExportSvg)throw Error('Не вдалося підготувати SVG креслення.');
 return api.getExportSvg();
}
async function canvasFromSvg(){
 const svg=svgSnapshot();
 const url=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml;charset=utf-8'}));
 try{
  const image=new Image();
  await new Promise((resolve,reject)=>{
   image.onload=resolve;image.onerror=()=>reject(new Error('Не вдалося відобразити креслення для експорту.'));
   image.src=url;
  });
  const dpi=200;
  const width=Math.round(MM.width*dpi/25.4),height=Math.round(MM.height*dpi/25.4);
  const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
  const ctx=canvas.getContext('2d',{alpha:false});
  if(!ctx)throw Error('Браузер не підтримує створення файлу з креслення.');
  ctx.fillStyle='#fff';ctx.fillRect(0,0,width,height);
  ctx.drawImage(image,0,0,width,height);
  return canvas;
 }finally{URL.revokeObjectURL(url);}
}
function canvasBlob(canvas,type,quality){
 return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('Не вдалося створити зображення.')),type,quality));
}
async function downloadPNG(){
 const canvas=await canvasFromSvg();
 download(await canvasBlob(canvas,'image/png'),FILE()+'.png');
 status('PNG збережено: повний аркуш A3, 200 dpi.');
}
const bytes=str=>textEncoder.encode(str);
function pdfFromJpeg(jpeg,width,height){
 // A3 portrait PDF; rasterized at 200 dpi to keep all sheet elements consistent.
 const pageW=841.889764,pageH=1190.551181;
 const pageStream=bytes('q\n'+pageW+' 0 0 '+pageH+' 0 0 cm\n/Im0 Do\nQ\n');
 const parts=[],offsets=[0];let size=0;
 const write=part=>{const binary=typeof part==='string'?bytes(part):part;parts.push(binary);size+=binary.byteLength;};
 const object=(index,...body)=>{
  offsets[index]=size;write(index+' 0 obj\n');body.forEach(write);write('\nendobj\n');
 };
 write('%PDF-1.4\n');
 object(1,'<< /Type /Catalog /Pages 2 0 R >>');
 object(2,'<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
 object(3,'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 '+pageW+' '+pageH+'] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>');
 object(4,'<< /Type /XObject /Subtype /Image /Width '+width+' /Height '+height+' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length '+jpeg.byteLength+' >>\nstream\n',jpeg,'\nendstream');
 object(5,'<< /Length '+pageStream.byteLength+' >>\nstream\n',pageStream,'endstream');
 const xref=size;
 write('xref\n0 6\n0000000000 65535 f \n');
 for(let i=1;i<=5;i++)write(String(offsets[i]).padStart(10,'0')+' 00000 n \n');
 write('trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n'+xref+'\n%%EOF\n');
 return new Blob(parts,{type:'application/pdf'});
}
async function downloadPDF(){
 const canvas=await canvasFromSvg();
 const jpg=new Uint8Array(await (await canvasBlob(canvas,'image/jpeg',0.94)).arrayBuffer());
 download(pdfFromJpeg(jpg,canvas.width,canvas.height),FILE()+'.pdf');
 status('PDF збережено: аркуш A3, портретна орієнтація.');
}

const esc=s=>String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');
const LABEL_SUB='₀₁₂₃₄₅₆₇₈₉';
const normalized=s=>String(s??'').replace(/[₀-₉]/g,ch=>String(LABEL_SUB.indexOf(ch)));
function planeAndBase(point){
 const match=normalized(point.label).match(/^(.*?)([12])$/);
 const plane=point.plane==='pi1'||point.plane==='pi2'?point.plane:match?(match[2]==='1'?'pi1':'pi2'):null;
 return {base:match?.[1]??normalized(point.label),plane};
}
function pointRows(points){
 const groups=new Map();
 for(const point of points){
  const {base,plane}=planeAndBase(point);
  if(!plane)continue;
  if(!groups.has(base))groups.set(base,{});
  groups.get(base)[plane]=point;
 }
 return points.map((point,i)=>{
  const {base,plane}=planeAndBase(point);
  const pair=groups.get(base)||{},plan=pair.pi1,front=pair.pi2;
  // Coordinates originate from drawing's existing orthogonal projection convention.
  const x=plane?MM.originX-point.x:null;
  const y=plan?plan.y-MM.originY:null;
  const z=front?MM.originY-front.y:null;
  return [
   i+1,point.label||('Точка '+(i+1)),
   plane==='pi1'?'Π₁':plane==='pi2'?'Π₂':'2D',
   round6(x),round6(y),round6(z),
   round6(point.x),round6(point.y),
   point.source||'Користувач'
  ];
 });
}
const dashLabels={solid:'Суцільна',dashed:'Штрихова',dashdot:'Штрихпунктирна',dotted:'Точкова'};
const kindLabels={projection:'Проєкційна',guide:'Допоміжна',normal:'Звичайна',triangle:'Сторона трикутника',measurement:'Вимірювання','measurement-guide':'Допоміжна до вимірювання',perpendicular:'Перпендикуляр',extension:'Продовження'};
function segmentRows(segments){
 return segments.map((segment,i)=>{
  const from=segment.aLabel||'—',to=segment.bLabel||'—';
  return [
   i+1,segment.label||((from!=='—'&&to!=='—')?from+'–'+to:'Відрізок '+(i+1)),
   from,to,round6(segment.length),
   kindLabels[segment.kind]||segment.kind||'Звичайна',
   dashLabels[segment.dash]||segment.dash||'Суцільна',
   round6(segment.a.x),round6(segment.a.y),
   round6(segment.b.x),round6(segment.b.y)
  ];
 });
}
function colName(index){
 let result='';for(let i=index+1;i;i=Math.floor((i-1)/26))result=String.fromCharCode(65+(i-1)%26)+result;
 return result;
}
function xCell(value,ref,style){
 if(value===null||value===undefined||value==='')return '';
 const cell=finite(value)
  ?'<c r="'+ref+'" s="3"><v>'+String(value)+'</v></c>'
  :'<c r="'+ref+'" s="'+(style||0)+'" t="inlineStr"><is><t>'+esc(value)+'</t></is></c>';
 return cell;
}
function sheetXml(title,subheading,headers,data,widths){
 const count=headers.length,last=colName(count-1);
 const cols=widths.map((w,i)=>'<col min="'+(i+1)+'" max="'+(i+1)+'" width="'+w+'" customWidth="1"/>').join('');
 const header='<row r="3" ht="27" customHeight="1">'+headers.map((h,i)=>xCell(h,colName(i)+'3',2)).join('')+'</row>';
 const rows=data.map((values,i)=>'<row r="'+(i+4)+'">'+headers.map((_,j)=>xCell(values[j],colName(j)+(i+4),0)).join('')+'</row>').join('');
 const lastData=Math.max(4,data.length+3);
 return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+
 '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'+
 '<dimension ref="A1:'+last+lastData+'"/>'+
 '<sheetViews><sheetView workbookViewId="0" showGridLines="0"><pane ySplit="3" topLeftCell="A4" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>'+
 '<sheetFormatPr defaultRowHeight="18"/><cols>'+cols+'</cols><sheetData>'+
 '<row r="1" ht="33" customHeight="1">'+xCell(title,'A1',1)+'</row>'+
 '<row r="2" ht="22" customHeight="1">'+xCell(subheading,'A2',0)+'</row>'+
 header+rows+'</sheetData>'+
 '<mergeCells count="2"><mergeCell ref="A1:'+last+'1"/><mergeCell ref="A2:'+last+'2"/></mergeCells>'+
 '<autoFilter ref="A3:'+last+lastData+'"/></worksheet>';
}
const stylesXml='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+
 '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'+
 '<numFmts count="1"><numFmt numFmtId="164" formatCode="0.000"/></numFmts>'+
 '<fonts count="3"><font><sz val="11"/><name val="Calibri"/></font>'+
 '<font><b/><sz val="16"/><color rgb="FF143C51"/><name val="Calibri"/></font>'+
 '<font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font></fonts>'+
 '<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill>'+
 '<fill><patternFill patternType="solid"><fgColor rgb="FF175B75"/><bgColor indexed="64"/></patternFill></fill></fills>'+
 '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>'+
 '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>'+
 '<cellXfs count="4"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>'+
 '<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>'+
 '<xf numFmtId="0" fontId="2" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/>'+
 '<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/></cellXfs>'+
 '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>';
function xmlFiles(points,segments){
 const pointHeaders=['№','Точка','Площина','X, мм','Y, мм','Z, мм','X аркуша, мм','Y аркуша, мм','Джерело'];
 const segmentHeaders=['№','Позначення','Початок','Кінець','Довжина, мм','Призначення','Тип лінії','X₁ аркуша','Y₁ аркуша','X₂ аркуша','Y₂ аркуша'];
 const pointSheet=sheetXml('GEOMETRY STUDIO · ТОЧКИ','X/Y/Z — за наявними проєкціями; координати аркуша — фактичні, мм',pointHeaders,pointRows(points),[7,16,13,13,13,13,20,20,22]);
 const segmentSheet=sheetXml('GEOMETRY STUDIO · ВІДРІЗКИ','Довжини обчислені за фактичними кінцями відрізків на аркуші, мм',segmentHeaders,segmentRows(segments),[7,23,16,16,18,30,23,17,17,17,17]);
 const ct='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+
 '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'+
 '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'+
 '<Default Extension="xml" ContentType="application/xml"/>'+
 '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'+
 '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'+
 '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'+
 '<Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>';
 const rels='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+
 '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+
 '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>';
 const workbook='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+
 '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'+
 '<sheets><sheet name="Точки" sheetId="1" r:id="rId1"/><sheet name="Відрізки" sheetId="2" r:id="rId2"/></sheets></workbook>';
 const workbookRels='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+
 '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+
 '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>'+
 '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/>'+
 '<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>';
 return {
  '[Content_Types].xml':ct,
  '_rels/.rels':rels,
  'xl/workbook.xml':workbook,
  'xl/_rels/workbook.xml.rels':workbookRels,
  'xl/styles.xml':stylesXml,
  'xl/worksheets/sheet1.xml':pointSheet,
  'xl/worksheets/sheet2.xml':segmentSheet
 };
}
const CRC_TABLE=(()=>{
 const t=new Uint32Array(256);
 for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t[n]=c>>>0;}
 return t;
})();
function crc32(data){
 let c=0xFFFFFFFF;
 for(const b of data)c=CRC_TABLE[(c^b)&255]^(c>>>8);
 return (c^0xFFFFFFFF)>>>0;
}
function zipFiles(files){
 const local=[],central=[];let offset=0,centralSize=0;
 for(const [name,body] of Object.entries(files)){
  const fileName=bytes(name),data=bytes(body),crc=crc32(data);
  const header=new Uint8Array(30+fileName.length),view=new DataView(header.buffer);
  view.setUint32(0,0x04034b50,true);view.setUint16(4,20,true);
  view.setUint16(6,0x0800,true);view.setUint16(8,0,true);
  view.setUint32(14,crc,true);view.setUint32(18,data.length,true);view.setUint32(22,data.length,true);
  view.setUint16(26,fileName.length,true);header.set(fileName,30);
  local.push(header,data);
  const dir=new Uint8Array(46+fileName.length),dv=new DataView(dir.buffer);
  dv.setUint32(0,0x02014b50,true);dv.setUint16(4,20,true);dv.setUint16(6,20,true);
  dv.setUint16(8,0x0800,true);dv.setUint16(10,0,true);
  dv.setUint32(16,crc,true);dv.setUint32(20,data.length,true);dv.setUint32(24,data.length,true);
  dv.setUint16(28,fileName.length,true);dv.setUint32(42,offset,true);dir.set(fileName,46);
  central.push(dir);centralSize+=dir.length;
  offset+=header.length+data.length;
 }
 const end=new Uint8Array(22),e=new DataView(end.buffer);
 e.setUint32(0,0x06054b50,true);
 e.setUint16(8,central.length,true);e.setUint16(10,central.length,true);
 e.setUint32(12,centralSize,true);e.setUint32(16,offset,true);
 return new Blob([...local,...central,end],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
}
async function downloadExcel(){
 const {points,segments}=exportModel();
 download(zipFiles(xmlFiles(points,segments)),FILE()+'-coordinates.xlsx');
 status('Excel збережено: '+points.length+' точок, '+segments.length+' відрізків.');
}
async function run(button,task){
 if(button.disabled)return;
 button.disabled=true;status('Створюємо файл…');
 try{await task();}catch(error){status(error?.message||'Не вдалося сформувати файл.',true);console.error('Geometry Studio export:',error);}
 finally{button.disabled=false;}
}
function init(){
 const actions=[['btnExportPNG',downloadPNG],['btnExportPDF',downloadPDF],['btnExportExcel',downloadExcel]];
 for(const [id,fn] of actions){const button=$(id);button?.addEventListener('click',()=>run(button,fn));}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
// Small pure functions exposed solely for browser regression tests.
window.GeometryStudioExportDiagnostics={pointRows,segmentRows,xmlFiles,zipFiles,pdfFromJpeg};
})();