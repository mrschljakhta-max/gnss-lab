/**
 * Geometry Studio Cloud API — Cloudflare Workers Free + D1.
 * Invite-only accounts, private projects, revocable public view links.
 * No passwords, invites, or API keys are ever committed to GitHub.
 */
const ORIGIN = 'https://mrschljakhta-max.github.io';
const SESSION_TTL = 14 * 24 * 60 * 60;  // 14 days
const MAX_BODY = 900_000;
const MAX_PROJECT = 750_000;
const MAX_SVG = 350_000;
const now = () => Math.floor(Date.now()/1000);
const encoder = new TextEncoder();

function cors(origin) {
  return {
    'Access-Control-Allow-Origin': origin === ORIGIN ? ORIGIN : 'null',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Edit-Key',
    'Access-Control-Max-Age': '3600',
    'Vary': 'Origin',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff'
  };
}
function output(data,status,origin) {
  const body=status===204?null:JSON.stringify(data);
  return new Response(body,{
    status,
    headers:{...cors(origin),'Content-Type':'application/json; charset=utf-8'}
  });
}
function error(status,message,origin) {
  return output({error:message},status,origin);
}
function safeCompare(a,b) {
  const x=encoder.encode(String(a)),y=encoder.encode(String(b));
  let diff=x.length ^ y.length;
  for(let i=0;i<Math.max(x.length,y.length);i++)diff|=(x[i]||0)^(y[i]||0);
  return diff===0;
}
function randomHex(size=32) {
  const data=crypto.getRandomValues(new Uint8Array(size));
  return [...data].map(byte=>byte.toString(16).padStart(2,'0')).join('');
}
async function sha256(value) {
  const hash=await crypto.subtle.digest('SHA-256',encoder.encode(value));
  return [...new Uint8Array(hash)].map(b=>b.toString(16).padStart(2,'0')).join('');
}
async function passwordHash(password,salt) {
  // PBKDF2 is intentionally bounded to accommodate the Workers Free CPU budget.
  const key=await crypto.subtle.importKey('raw',encoder.encode(password),'PBKDF2',false,['deriveBits']);
  const bits=await crypto.subtle.deriveBits(
    {name:'PBKDF2',salt:encoder.encode(salt),iterations:45000,hash:'SHA-256'},key,256
  );
  return [...new Uint8Array(bits)].map(b=>b.toString(16).padStart(2,'0')).join('');
}
async function jsonBody(request) {
  const type=request.headers.get('content-type')||'';
  if(!type.toLowerCase().includes('application/json'))throw {status:415,message:'Очікується JSON.'};
  const declared=Number(request.headers.get('content-length')||0);
  if(declared>MAX_BODY)throw {status:413,message:'Файл завеликий.'};
  const raw=await request.text();
  if(encoder.encode(raw).byteLength>MAX_BODY)throw {status:413,message:'Файл завеликий.'};
  try {return JSON.parse(raw);}
  catch(_) {throw {status:400,message:'Некоректний JSON.'};}
}
function validateProject(input){
  const title=String(input?.title||'').trim().slice(0,100);
  const snapshot=input?.snapshot;
  const svg=input?.svg;
  if(!title||title.length>100)throw {status:400,message:'Потрібна назва креслення.'};
  if(!snapshot||!Array.isArray(snapshot.entities)||snapshot.entities.length>7000)
    throw {status:400,message:'Некоректні об’єкти креслення.'};
  if(typeof svg!=='string'||!svg.trimStart().startsWith('<svg')||svg.length>MAX_SVG)
    throw {status:400,message:'Не вдалося зберегти попередній перегляд.'};
  const payload=JSON.stringify(snapshot);
  if(payload.length>MAX_PROJECT)throw {status:413,message:'Креслення перевищує розмір для хмари.'};
  return {title,payload,svg};
}
function validId(id){return /^[a-f0-9-]{36}$/i.test(id);}
async function requireSession(request,env) {
  const authorization=request.headers.get('Authorization')||'';
  if(!authorization.startsWith('Bearer '))return null;
  const token=authorization.slice(7);
  if(!/^[a-f0-9]{64}$/.test(token))return null;
  const hashed=await sha256(token);
  const row=await env.DB.prepare(
    'SELECT s.user_id AS userId, u.username AS username FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>?'
  ).bind(hashed,now()).first();
  return row?{...row,hashed}:null;
}
async function signInUser(env,user) {
  const token=randomHex();
  await env.DB.prepare(
    'INSERT INTO sessions(token_hash,user_id,expires_at,created_at) VALUES(?,?,?,?)'
  ).bind(await sha256(token),user.id,now()+SESSION_TTL,now()).run();
  return {token,username:user.username,expiresAt:now()+SESSION_TTL};
}
async function authLimit(env,request,username){
  if(!env.AUTH_LIMITER)return true;
  const ip=request.headers.get('cf-connecting-ip')||'unknown';
  const key='auth:'+username+':'+ip;
  const result=await env.AUTH_LIMITER.limit({key});
  return result.success;
}

/** Anonymous project capabilities: edit keys never appear in public URLs. */
function guestKey(request){
 const key=request.headers.get('X-Edit-Key')||'';
 return /^[a-f0-9]{64}$/.test(key)?key:null;
}
async function guestOwner(request,env,id){
 const key=guestKey(request);
 if(!key)return null;
 return env.DB.prepare('SELECT id,title,payload,svg,revision,share_id AS shareId,updated_at AS updatedAt FROM guest_projects WHERE id=? AND edit_hash=?')
  .bind(id,await sha256(key)).first();
}
async function guestQuota(request,env,kind,limit,seconds){
 // Persist only a daily/hourly bucket digest, not the original IP.
 const ip=request.headers.get('CF-Connecting-IP')||'unknown';
 const windowId=Math.floor(now()/seconds);
 const bucket=await sha256('gs-guest-v1:'+kind+':'+windowId+':'+ip);
 const expires=(windowId+1)*seconds;
 const result=await env.DB.prepare(
  'INSERT INTO guest_rate_limits(bucket,used,expires_at) VALUES(?,1,?) ON CONFLICT(bucket) DO UPDATE SET used=guest_rate_limits.used+1 WHERE guest_rate_limits.used < ?'
 ).bind(bucket,expires,limit).run();
 return (result.meta?.changes||0)>0;
}
function guestValidated(input){
 const result=validateProject(input);
 if(encoder.encode(result.payload).byteLength>400_000||encoder.encode(result.svg).byteLength>150_000)
  throw {status:413,message:'Креслення завелике для безкоштовної хмари. Збережи його як JSON.'};
 return result;
}
async function handleGuest(request,env,path,method,origin){
 if(path==='/api/guest/projects'&&method==='POST'){
  if(!await guestQuota(request,env,'create',12,86400))
   return error(429,'Вичерпано ліміт нових креслень на сьогодні. Локальне збереження доступне.',origin);
  const input=guestValidated(await jsonBody(request));
  const total=await env.DB.prepare('SELECT COUNT(*) AS total FROM guest_projects').first();
  if(total?.total>=500)return error(507,'Безкоштовне хмарне сховище заповнене. Локальна копія працює.',origin);
  const id=crypto.randomUUID(),editKey=randomHex(32),time=now();
  await env.DB.prepare(
   'INSERT INTO guest_projects(id,edit_hash,title,payload,svg,revision,created_at,updated_at) VALUES(?,?,?,?,?,1,?,?)'
  ).bind(id,await sha256(editKey),input.title,input.payload,input.svg,time,time).run();
  return output({id,editKey,revision:1,shareId:null,updatedAt:time},201,origin);
 }
 const share=path.match(/^\/api\/guest\/projects\/([a-f0-9-]{36})\/share$/i);
 if(share&&method==='POST'){
  const owner=await guestOwner(request,env,share[1]);
  if(!owner)return error(403,'Немає приватного ключа редагування.',origin);
  const data=await jsonBody(request);
  if(typeof data.enabled!=='boolean')return error(400,'Параметр enabled має бути true або false.',origin);
  const shareId=data.enabled?(owner.shareId||crypto.randomUUID()):null;
  await env.DB.prepare('UPDATE guest_projects SET share_id=?,updated_at=? WHERE id=? AND edit_hash=?')
   .bind(shareId,now(),share[1],await sha256(guestKey(request))).run();
  return output({id:share[1],shareId},200,origin);
 }
 const item=path.match(/^\/api\/guest\/projects\/([a-f0-9-]{36})$/i);
 if(item){
  const id=item[1];
  const owner=await guestOwner(request,env,id);
  if(!owner)return error(403,'Немає приватного ключа редагування.',origin);
  if(method==='GET')
   return output({id,title:owner.title,snapshot:JSON.parse(owner.payload),svg:owner.svg,
    revision:owner.revision,shareId:owner.shareId,updatedAt:owner.updatedAt},200,origin);
  if(method==='PUT'){
   if(!await guestQuota(request,env,'write',120,3600))
    return error(429,'Забагато збережень. Локальне креслення залишилося.',origin);
   const body=await jsonBody(request),input=guestValidated(body),revision=Number(body.revision);
   if(!Number.isInteger(revision)||revision<1)return error(400,'Некоректна версія креслення.',origin);
   const result=await env.DB.prepare(
    'UPDATE guest_projects SET title=?,payload=?,svg=?,revision=revision+1,updated_at=? WHERE id=? AND edit_hash=? AND revision=?'
   ).bind(input.title,input.payload,input.svg,now(),id,await sha256(guestKey(request)),revision).run();
   if(!result.meta?.changes)return error(409,'Є новіша версія креслення. Локальну копію не змінено.',origin);
   return output({id,revision:revision+1},200,origin);
  }
  if(method==='DELETE'){
   await env.DB.prepare('DELETE FROM guest_projects WHERE id=? AND edit_hash=?')
    .bind(id,await sha256(guestKey(request))).run();
   return output(null,204,origin);
  }
 }
 return error(404,'Невідомий запит.',origin);
}

async function handle(request,env,origin){
  if(!env.DB)return error(503,'Базу D1 ще не підключено.',origin);
  const url=new URL(request.url),path=url.pathname.replace(/\/+$/,'')||'/';
  const method=request.method.toUpperCase();
  if(path==='/api/health'&&method==='GET')
    return output({ok:true,service:'geometry-studio-cloud',version:1},200,origin);
  const guestRoute=path.startsWith('/api/guest/');
  if(guestRoute)return handleGuest(request,env,path,method,origin);

  if(path==='/api/auth/register'&&method==='POST'){
    if(!env.INVITE_CODE||env.INVITE_CODE.length<16)
      return error(503,'Для реєстрації потрібно налаштувати секрет запрошення.',origin);
    const body=await jsonBody(request);
    const username=String(body.username||'').trim().toLowerCase();
    const password=String(body.password||'');
    if(!/^[a-z0-9_.-]{3,32}$/.test(username)||password.length<12||password.length>200)
      return error(400,'Логін: 3–32 латинських символи. Пароль: 12–200 символів.',origin);
    if(!await authLimit(env,request,username))return error(429,'Забагато спроб. Повтори пізніше.',origin);
    if(!safeCompare(env.INVITE_CODE,body.inviteCode||''))
      return error(403,'Неправильний код запрошення.',origin);
    const salt=randomHex(16),password_hash=await passwordHash(password,salt),id=crypto.randomUUID();
    try {
      await env.DB.prepare(
        'INSERT INTO users(id,username,password_salt,password_hash,created_at) VALUES(?,?,?,?,?)'
      ).bind(id,username,salt,password_hash,now()).run();
    }catch(_){return error(409,'Такий логін уже зайнятий.',origin);}
    return output(await signInUser(env,{id,username}),201,origin);
  }
  if(path==='/api/auth/login'&&method==='POST'){
    const body=await jsonBody(request);
    const username=String(body.username||'').trim().toLowerCase();
    const password=String(body.password||'');
    if(!/^[a-z0-9_.-]{3,32}$/.test(username)||!password||password.length>200)
      return error(401,'Неправильний логін або пароль.',origin);
    if(!await authLimit(env,request,username))return error(429,'Забагато спроб. Повтори пізніше.',origin);
    const user=await env.DB.prepare('SELECT * FROM users WHERE username=?').bind(username).first();
    if(!user)return error(401,'Неправильний логін або пароль.',origin);
    const actual=await passwordHash(password,user.password_salt);
    if(!safeCompare(actual,user.password_hash))return error(401,'Неправильний логін або пароль.',origin);
    return output(await signInUser(env,user),200,origin);
  }

  const shared=path.match(/^\/api\/share\/([a-f0-9-]{36})$/i);
  if(shared&&method==='GET'){
    const guest=await env.DB.prepare(
      'SELECT title,svg,updated_at FROM guest_projects WHERE share_id=?'
    ).bind(shared[1]).first();
    if(guest)return output({title:guest.title,svg:guest.svg,updatedAt:guest.updated_at},200,origin);
    const row=await env.DB.prepare(
      'SELECT title,svg,updated_at FROM projects WHERE share_id=?'
    ).bind(shared[1]).first();
    return row?output({title:row.title,svg:row.svg,updatedAt:row.updated_at},200,origin)
      :error(404,'Це креслення недоступне або посилання відкликано.',origin);
  }

  const session=await requireSession(request,env);
  if(!session)return error(401,'Увійди до свого облікового запису.',origin);
  if(path==='/api/me'&&method==='GET')
    return output({username:session.username},200,origin);
  if(path==='/api/auth/logout'&&method==='POST'){
    await env.DB.prepare('DELETE FROM sessions WHERE token_hash=?').bind(session.hashed).run();
    return output(null,204,origin);
  }

  if(path==='/api/projects'&&method==='GET'){
    const result=await env.DB.prepare(
      'SELECT id,title,share_id AS shareId,revision,created_at AS createdAt,updated_at AS updatedAt FROM projects WHERE user_id=? ORDER BY updated_at DESC LIMIT 200'
    ).bind(session.userId).all();
    return output({projects:result.results||[]},200,origin);
  }
  if(path==='/api/projects'&&method==='POST'){
    const input=validateProject(await jsonBody(request));
    const count=await env.DB.prepare('SELECT COUNT(*) AS total FROM projects WHERE user_id=?')
      .bind(session.userId).first();
    if(count?.total>=200)return error(409,'Досягнуто ліміту 200 проєктів на обліковий запис.',origin);
    const id=crypto.randomUUID(),time=now();
    await env.DB.prepare(
      'INSERT INTO projects(id,user_id,title,payload,svg,revision,created_at,updated_at) VALUES(?,?,?,?,?,1,?,?)'
    ).bind(id,session.userId,input.title,input.payload,input.svg,time,time).run();
    return output({id,revision:1,createdAt:time,updatedAt:time,shareId:null},201,origin);
  }

  const shareChange=path.match(/^\/api\/projects\/([a-f0-9-]{36})\/share$/i);
  if(shareChange&&method==='POST'){
    const projectId=shareChange[1],body=await jsonBody(request);
    const existing=await env.DB.prepare(
      'SELECT share_id AS shareId FROM projects WHERE id=? AND user_id=?'
    ).bind(projectId,session.userId).first();
    if(!existing)return error(404,'Креслення не знайдено.',origin);
    if(typeof body.enabled!=='boolean')return error(400,'Вкажи enabled: true або false.',origin);
    const shareId=body.enabled?(existing.shareId||crypto.randomUUID()):null;
    await env.DB.prepare(
      'UPDATE projects SET share_id=?,updated_at=? WHERE id=? AND user_id=?'
    ).bind(shareId,now(),projectId,session.userId).run();
    return output({id:projectId,shareId},200,origin);
  }
  const single=path.match(/^\/api\/projects\/([a-f0-9-]{36})$/i);
  if(single){
    const id=single[1];
    if(method==='GET'){
      const row=await env.DB.prepare(
        'SELECT id,title,payload,svg,revision,share_id AS shareId,updated_at AS updatedAt FROM projects WHERE id=? AND user_id=?'
      ).bind(id,session.userId).first();
      return row?output({
        id:row.id,title:row.title,snapshot:JSON.parse(row.payload),svg:row.svg,
        revision:row.revision,shareId:row.shareId,updatedAt:row.updatedAt
      },200,origin):error(404,'Креслення не знайдено.',origin);
    }
    if(method==='PUT'){
      const body=await jsonBody(request);
      const project=validateProject(body),revision=Number(body.revision);
      if(!Number.isInteger(revision)||revision<1)return error(400,'Потрібна версія креслення.',origin);
      const time=now();
      const result=await env.DB.prepare(
        'UPDATE projects SET title=?,payload=?,svg=?,revision=revision+1,updated_at=? WHERE id=? AND user_id=? AND revision=?'
      ).bind(project.title,project.payload,project.svg,time,id,session.userId,revision).run();
      if(!result.meta?.changes)
        return error(409,'Креслення змінилося в іншому вікні. Завантаж останню версію перед повторним записом.',origin);
      return output({id,revision:revision+1,updatedAt:time},200,origin);
    }
    if(method==='DELETE'){
      const result=await env.DB.prepare(
        'DELETE FROM projects WHERE id=? AND user_id=?'
      ).bind(id,session.userId).run();
      return result.meta?.changes?output(null,204,origin):error(404,'Креслення не знайдено.',origin);
    }
  }
  return error(404,'Невідомий запит.',origin);
}
export default {
  async fetch(request,env){
    const origin=request.headers.get('Origin')||'';
    // Browsers may only call the API from the Geometry Studio origin.
    if(origin&&origin!==ORIGIN)return error(403,'Недозволене джерело запиту.',origin);
    if(request.method==='OPTIONS')
      return new Response(null,{status:204,headers:cors(origin)});
    try {return await handle(request,env,origin);}
    catch(ex){
      if(ex?.status)return error(ex.status,ex.message||'Помилка запиту.',origin);
      console.error('Geometry Studio API:',ex?.message||String(ex));
      return error(500,'Помилка сервера. Спробуй повторити.',origin);
    }
  }
};