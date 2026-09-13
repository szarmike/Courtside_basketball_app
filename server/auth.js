import bcrypt from 'bcryptjs';
const enc=new TextEncoder(),ttl=30*86400;
const hex=bytes=>Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
const digest=async text=>hex(new Uint8Array(await crypto.subtle.digest('SHA-256',enc.encode(text))));
const random=()=>hex(crypto.getRandomValues(new Uint8Array(32)));
const name=req=>new URL(req.url).protocol==='https:'?'__Host-courtside_session':'courtside_session';
const cookie=(req,token,age=ttl)=>`${name(req)}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${age}${new URL(req.url).protocol==='https:'?'; Secure':''}`;
const reply=(data,status=200,headers={})=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json','cache-control':'no-store',...headers}});
const userInfo=a=>({id:a.id,username:a.username,legacyLinked:!!a.legacy_owner});
function tokenFrom(req){return (req.headers.get('cookie')||'').split(';').map(s=>s.trim()).find(s=>s.startsWith(name(req)+'='))?.slice(name(req).length+1)||'';}
export async function sessionUser(req,DB){const token=tokenFrom(req);if(!/^[a-f0-9]{64}$/.test(token))return null;return DB.prepare('SELECT a.id,a.username,a.legacy_owner FROM accounts a JOIN sessions s ON s.account_id=a.id WHERE s.token_hash=? AND s.expires_at>?').bind(await digest(token),Math.floor(Date.now()/1000)).first();}
async function newSession(req,DB,a){const token=random(),expires=Math.floor(Date.now()/1000)+ttl;await DB.batch([DB.prepare('DELETE FROM sessions WHERE expires_at < ?').bind(Math.floor(Date.now()/1000)),DB.prepare('INSERT INTO sessions(token_hash,account_id,expires_at) VALUES(?,?,?)').bind(await digest(token),a.id,expires)]);return reply({user:userInfo(a)},200,{'set-cookie':cookie(req,token)});}
async function allowed(DB,key,limit,seconds){const now=Math.floor(Date.now()/1000);const row=await DB.prepare('INSERT INTO auth_limits(key,attempts,resets_at) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET attempts=CASE WHEN resets_at<=? THEN 1 ELSE attempts+1 END,resets_at=CASE WHEN resets_at<=? THEN ? ELSE resets_at END RETURNING attempts').bind(key,now+seconds,now,now,now+seconds).first();return row.attempts<=limit;}
export async function authRoute(req,DB){
 const path=new URL(req.url).pathname;
 if(path==='/api/auth/session'&&req.method==='GET'){const user=await sessionUser(req,DB);return reply({user:user?userInfo(user):null});}
 if(req.method!=='POST')return reply({error:'Method not allowed.'},405);
 if(!req.headers.get('content-type')?.startsWith('application/json'))return reply({error:'Use JSON.'},415);
 if(path==='/api/auth/logout'){const token=tokenFrom(req);if(token)await DB.prepare('DELETE FROM sessions WHERE token_hash=?').bind(await digest(token)).run();return reply({ok:true},200,{'set-cookie':cookie(req,'',0)});}
 if(!['/api/auth/register','/api/auth/login'].includes(path))return reply({error:'Not found.'},404);
 if(Number(req.headers.get('content-length'))>2048)return reply({error:'Invalid credentials.'},400);
 const raw=await req.text();if(raw.length>2048)return reply({error:'Invalid credentials.'},400);let b;try{b=JSON.parse(raw);}catch{return reply({error:'Invalid credentials.'},400);}
 const username=typeof b.username==='string'?b.username.trim().toLowerCase():'',password=b.password;
 if(!/^[a-z0-9_]{3,24}$/.test(username)||typeof password!=='string'||password.length<12||enc.encode(password).length>72)return reply({error:'Use a 3–24 character username (letters, numbers, underscore) and a password of at least 12 characters, up to 72 bytes.'},400);
 const registration=path.endsWith('/register'),ip=req.headers.get('cf-connecting-ip')||'unknown';
 if(!await allowed(DB,await digest((registration?'signup:':'login:')+ip),registration?8:40,900)||!await allowed(DB,await digest('user:'+username+':'+ip),10,900))return reply({error:'Too many attempts. Wait 15 minutes and try again.'},429,{'retry-after':'900'});
 let account=await DB.prepare('SELECT id,username,password_hash,legacy_owner FROM accounts WHERE username=?').bind(username).first();
 if(!registration){const valid=account?await bcrypt.compare(password,account.password_hash):(await bcrypt.hash(password,12),false);if(!valid)return reply({error:'Username or password is incorrect.'},401);return newSession(req,DB,account);}
 if(account)return reply({error:'That username is already taken.'},409);
 const id='account_'+crypto.randomUUID(),hash=await bcrypt.hash(password,12);let legacy=req.headers.get('oai-authenticated-user-id');
 if(legacy&&await DB.prepare('SELECT id FROM accounts WHERE legacy_owner=?').bind(legacy).first())legacy=null;
 const statements=[DB.prepare('INSERT INTO accounts(id,username,password_hash,legacy_owner,created_at) VALUES(?,?,?,?,?)').bind(id,username,hash,legacy||null,new Date().toISOString())];
 if(legacy)statements.push(DB.prepare('UPDATE collections SET owner=? WHERE owner=?').bind(id,legacy),DB.prepare('UPDATE games SET owner=? WHERE owner=?').bind(id,legacy));
 try{await DB.batch(statements);}catch(e){if(/UNIQUE/.test(e.message))return reply({error:'That username or previous account was just claimed. Try signing in or use another username.'},409);throw e;}
 return newSession(req,DB,{id,username,legacy_owner:legacy});
}
