import assert from 'node:assert/strict';
import {newGame,derive,defaults,commit,applyPlan,parseCommand,playerPlan} from '../dist/engine.js';

function fixture(){const s=newGame();commit(s,[{type:'CONFIG',settings:{...defaults,home:'Wolves',away:'Woodland'}}]);for(const n of [2,4,7,9,12,14,22,35,43])applyPlan(s,playerPlan({number:String(n),first:n===22?'Mason':'Player'+n,team:'home'},s));commit(s,[{type:'STARTERS',team:'home',players:derive(s).roster.filter(p=>[7,9,14,22,43].includes(+p.number)).map(p=>p.id)}]);applyPlan(s,parseCommand('Tip off',s));return s;}
function say(s,text){const p=parseCommand(text,s);applyPlan(s,p,text);return p;}
const five=s=>[...derive(s).lineups.home].map(id=>+derive(s).players[id].number).sort((a,b)=>a-b);

for(const phrase of ['35 scores of 3','thirty five scores of three']){const s=fixture();say(s,'35 in for 43');const p=say(s,phrase);assert(!p.confirm,phrase);assert.equal(derive(s).players[derive(s).roster.find(x=>x.number==='35').id].stats.pts,3,phrase);}
for(const phrase of ['35 scores of 2','thirty five scores off two']){const s=fixture();say(s,'35 in for 43');const p=say(s,phrase);assert(!p.confirm,phrase);assert.equal(derive(s).score.home,2,phrase);}
{const s=fixture();say(s,'seven to 9 to fourteen to 22 twenty two hits the three');assert.equal(derive(s).timeline.filter(e=>e.type==='PASS').length,3);assert.equal(derive(s).score.home,3);}
for(const phrase of ['seven out twelve in','7 out 12 in','seven comes out and number twelve comes in','jersey twelve replaces jersey seven','switch seven and twelve']){const s=fixture();say(s,phrase);assert.deepEqual(five(s),[9,12,14,22,43],phrase);}
{const s=fixture();say(s,'take seven nine and fourteen out put two twelve and thirty five in');assert.deepEqual(five(s),[2,12,22,35,43]);}
{const s=fixture();say(s,'thirty five in for Mason');say(s,'seven and nine are coming out Mason and twelve are going in at four twenty three');assert.deepEqual(five(s),[12,14,22,35,43]);assert.equal(derive(s).clock.seconds,263);}
{const s=fixture();say(s,'current five are seven twelve fourteen twenty two thirty five');assert.deepEqual(five(s),[7,12,14,22,35]);assert(derive(s).timeline.filter(e=>e.inferredLineupCorrection).length===4);}
{const s=fixture();say(s,'end quarter');say(s,'same five except twelve for seven');assert.equal(derive(s).clock.period,2);assert.deepEqual(five(s),[9,12,14,22,43]);}
{const s=fixture();say(s,'seven out twelve in at 4:13');say(s,'that happened at 4:23');assert(derive(s).timeline.filter(e=>/PLAYER_(?:IN|OUT)/.test(e.type)).every(e=>e.clock===263));}
{const s=fixture();say(s,'seven out twelve in');say(s,'undo that whole substitution');assert.deepEqual(five(s),[7,9,14,22,43]);}
{const s=fixture();say(s,'seven out twelve in');say(s,'no nine came out');assert.deepEqual(five(s),[7,12,14,22,43]);}
{const s=fixture();say(s,'seven out twelve in');say(s,'correction nine out and thirty five in');assert.deepEqual(five(s),[7,14,22,35,43]);}
{const s=fixture();say(s,'seven fouled out twelve coming in');const d=derive(s),seven=d.roster.find(p=>p.number==='7');assert(d.players[seven.id].fouledOut);assert.throws(()=>say(s,'seven in for twelve'),/fouled out/);}
{const s=fixture();say(s,'Mason is coming out twelve in for him');assert.deepEqual(five(s),[7,9,12,14,43]);}
{const s=fixture();assert.throws(()=>say(s,'42 made a three'),/Did you mean #43/);}
console.log('PASS spoken 0–99 numbers, direct score values, advanced substitutions, lineup sync and foul-out protection');
