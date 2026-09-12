import assert from 'node:assert/strict';import {newGame,playerPlan,applyPlan,parseCommand,derive,commit,defaults,undo} from '../dist/engine.js';
export function fixture(autoAssists=false){const s=newGame();for(const number of [2,3,4,12,16,22,35,43,45,60,70])applyPlan(s,playerPlan({number:String(number),first:number===22?'Mason':number===43?'Cayden':`P${number}`,last:'',team:'home',aliases:[]},s));commit(s,[{type:'CONFIG',settings:{...defaults,autoAssists}}]);return s;}
const cases=[
['12 passes to 45 to 16 16 shoots and scores on the 2 point line',[['PASS',12,45],['PASS',45,16],['SHOT',16,2,1]]],
['35 passed to 70 to 60 then shoots for a three and scores',[['PASS',35,70],['PASS',70,60],['SHOT',60,3,1]]],
['35 passes to 70 who kicks it to 60, he drains the three',[['PASS',35,70],['PASS',70,60],['SHOT',60,3,1]]],
['43 launches one from downtown and completely airballs it',[['SHOT',43,3,0]]],
['43 shot that three and whiffed that one',[['SHOT',43,3,0]]],
['43 shoots the three, off the rim, 12 gets the board',[['SHOT',43,3,0],['STAT',12,'oreb']]],
['43 misses the layup, gets his own rebound and puts it back in',[['SHOT',43,2,0],['STAT',43,'oreb'],['SHOT',43,2,1]]],
['43 steals it, takes it coast to coast and scores',[['STAT',43,'stl'],['SHOT',43,2,1]]],
['43 steals it, throws it ahead to 12 and 12 lays it in',[['STAT',43,'stl'],['PASS',43,12],['SHOT',12,2,1]]],
['43 blocks the shot and Mason gets the rebound',[['STAT',43,'blk'],['STAT',22,'dreb']]],
['12 passes to 43, 43 steps back and splashes the three',[['PASS',12,43],['SHOT',43,3,1]]],
['35 gives it to 70 who swings it to 60, 60 misses the three, 22 gets the offensive board and scores',[['PASS',35,70],['PASS',70,60],['SHOT',60,3,0],['STAT',22,'oreb'],['SHOT',22,2,1]]],
['43 puts up the three... it\'s up... it\'s good... yeah he made it',[['SHOT',43,3,1]]],
['35 brings it up, passes to 70, 70 swings it over to 60, 60 shoots the three, airball, 22 gets the offensive rebound, puts it back up and scores',[['PASS',35,70],['PASS',70,60],['SHOT',60,3,0],['STAT',22,'oreb'],['SHOT',22,2,1]]],
['43 almost made the three but missed',[['SHOT',43,3,0]]],
['43 didn\'t make the three',[['SHOT',43,3,0]]],
['43 gets the ball, he drives inside, misses, gets his own rebound and puts it back in',[['SHOT',43,2,0],['STAT',43,'oreb'],['SHOT',43,2,1]]],
['43 drives, scores and gets fouled',[['SHOT',43,2,1],['STAT',null,'pf'],['AND_ONE_PENDING_FREE_THROW',43]]],
['43 gets fouled shooting, first one\'s good, second one no good',[['STAT',null,'pf'],['SHOT',43,1,1],['SHOT',43,1,0]]],
['Okay um 43 gets it and then uh passes to 12 and 12, yeah, shoots the three and it\'s good',[['PASS',43,12],['SHOT',12,3,1]]],
];
function compact(p,s){const d=derive(s);return p.events.filter(e=>e.type!=='NARRATION_CONTEXT').map(e=>{const n=e.playerId?+d.players[e.playerId].number:null;return e.type==='PASS'?[e.type,n,+d.players[e.toPlayerId].number]:e.type==='SHOT'?[e.type,n,e.value,e.made]:e.type==='STAT'?[e.type,n,e.stat]:[e.type,n];});}
let failures=0;for(const [raw,want]of cases){try{const s=fixture(),p=parseCommand(raw,s);assert.deepEqual(p.choices||[],[],'unexpected review');assert.deepEqual(compact(p,s),want);applyPlan(s,p,raw);console.log('PASS',raw);}catch(e){console.error('FAIL',raw,'\n',e.message);failures++;}}
{const s=fixture(true);const p=parseCommand('35 to 70 to 60, three pointer good',s);console.log('AUTO',compact(p,s));assert.deepEqual(compact(p,s),[['PASS',35,70],['PASS',70,60],['SHOT',60,3,1],['STAT',70,'ast']]);applyPlan(s,p);assert.equal(derive(s).score.home,3);undo(s);assert.equal(derive(s).score.home,0);}
{const s=fixture();let p=parseCommand('43 shoots the three',s);assert(p.waiting);applyPlan(s,p,'43 shoots the three');assert.equal(derive(s).totals.home.fga,0);p=parseCommand('airball',s);applyPlan(s,p,'airball');assert.equal(derive(s).totals.home.fga,1);assert.equal(derive(s).score.home,0);p=parseCommand('yeah he missed everything',s);applyPlan(s,p);assert.equal(derive(s).totals.home.fga,1);}
assert.equal(failures,0,`${failures} narration failures`);

for(const raw of ['Mason in, Cayden out Q2 4:23','Cayden out, Mason in Q2 4:23','Put Mason in for Cayden Q2 4:23','Mason replaces Cayden Q2 4:23']){const s=fixture(),p=parseCommand(raw,s);assert.deepEqual(compact(p,s),[['PLAYER_OUT',43],['PLAYER_IN',22]],raw);assert(p.events.every(e=>e.clock===263&&e.period===2));}
for(const raw of ['12 passes to 43, 43 dribbles and makes a three','12 passes to 43, 43 drives and scores','12 passes to 43, 43 steps back and splashes the three']){const s=fixture(true),p=parseCommand(raw,s);assert(!p.events.some(e=>e.autoAssist),raw);}
{const s=fixture(true);applyPlan(s,parseCommand('12 to 43, three good',s));applyPlan(s,parseCommand('That was Mason, not 43',s));const d=derive(s);assert.equal(d.players[d.roster.find(p=>p.number==='22').id].stats.pts,3);assert.equal(d.totals.home.ast,0);applyPlan(s,parseCommand('That was a two',s));assert.equal(derive(s).score.home,2);}
{const s=fixture(),p=parseCommand('43 drains it',s);assert.equal(p.choices[0].kind,'shot');assert.throws(()=>applyPlan(s,p));assert.equal(derive(s).score.home,0);assert.throws(()=>parseCommand('43 passes to 999 and 999 scores',s),/Player not found/);}
{const s=fixture();applyPlan(s,parseCommand('43 shoots the three',s),'43 shoots the three');applyPlan(s,parseCommand('nothing but net',s),'nothing but net');const e=derive(s).timeline.find(e=>e.type==='SHOT');assert.deepEqual(e.sourceTranscripts,['43 shoots the three','nothing but net']);}
console.log('PASS substitution phrasing, explicit clocks, self-created shots, corrections, missing-type review, unknown players and raw delayed-shot transcripts');

for(const [raw,value] of [['43 shoots a jumper in the paint and scores',2],['43 splashes a two point jumper',2],['43 hits a triple',3]]){const s=fixture(),p=parseCommand(raw,s);assert.deepEqual(compact(p,s),[['SHOT',43,value,1]],raw);}
