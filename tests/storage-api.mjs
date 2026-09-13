import assert from 'node:assert/strict';import {newGame,commit,defaults} from '../dist/engine.js';
const origin='http://127.0.0.1:8765',suffix=Date.now(),password='test-only-password-2026';
const req=(path,method='GET',body,session={},extra={})=>fetch(origin+'/api/'+path,{method,headers:{'content-type':'application/json','x-test-anonymous':'1',...(session.cookie?{cookie:session.cookie,'x-courtside-account':session.user.id}:{}),...extra},...(body?{body:JSON.stringify(body)}:{})});
async function signup(n){const r=await req('auth/register','POST',{username:n+suffix,password});assert.equal(r.status,200,await r.clone().text());const cookie=r.headers.get('set-cookie');assert.match(cookie,/HttpOnly/);assert.match(cookie,/SameSite=Lax/);const {user}=await r.json();assert.deepEqual(Object.keys(user).sort(),['id','legacyLinked','username']);return {cookie:cookie.split(';')[0],user};}
assert.equal((await req('library')).status,401);const a=await signup('alice'),b=await signup('bob');
assert.equal((await req('auth/login','POST',{username:a.user.username,password:'incorrect-pass'})).status,401);
assert.equal((await req('auth/register','POST',{username:a.user.username,password})).status,409);
const c={id:'season',name:'Wolves 2026',teamName:'Wolves'};assert.equal((await req('collections','POST',c,a)).status,201);
const s=newGame();s.meta={collectionId:c.id,date:'2026-09-18',startTime:''};commit(s,[{type:'CONFIG',settings:{...defaults,home:'Wolves',away:'Tigers'}}]);const p='games/'+s.id;
assert.equal((await req(p,'PUT',{game:s,revision:0},a)).status,200);assert.equal((await req(p,'PUT',{game:s,revision:0},a)).status,409);assert.equal((await req(p,'GET',null,b)).status,404);assert.equal((await req('library','GET',null,b).then(r=>r.json())).games.length,0);
assert.equal((await req(p,'PUT',{game:s,revision:1},b)).status,400);
assert.equal((await req(p,'PUT',{game:s,revision:1},a,{'x-courtside-account':b.user.id})).status,401);
assert.equal((await req('auth/logout','POST',{},a,{origin:'https://evil.example'})).status,403);
assert.equal((await req('auth/logout','POST',{},a)).status,200);assert.equal((await req('library','GET',null,a)).status,401);
const login=await req('auth/login','POST',{username:a.user.username.toUpperCase(),password});assert.equal(login.status,200);a.cookie=login.headers.get('set-cookie').split(';')[0];assert.equal((await req(p,'GET',null,a).then(r=>r.json())).game.id,s.id);
console.log('PASS username/password signup, login, logout, cookie flags, case normalization, private game isolation, collection ownership, stale session and cross-origin protection');
