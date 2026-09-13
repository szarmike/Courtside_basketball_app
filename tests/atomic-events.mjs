import assert from 'node:assert/strict';
import {newGame,applyPlan,playerPlan,parseCommand,derive} from '../dist/engine.js';

const roster=[[2,'Jalen'],[3,'Mason'],[7,'Eli'],[12,'Cayden'],[21,'Jackson'],[43,'Tyler'],[45,'Noah'],[51,'Marcus'],[55,'Brayden']];
function fixture(start=true){const state=newGame();for(const [number,first] of roster)applyPlan(state,playerPlan({number:String(number),first,team:'home'},state));applyPlan(state,parseCommand('Starters are 2, 3, 7, 12 and 21',state));if(start)applyPlan(state,parseCommand('Tip off',state));return state;}
const names=(state,events)=>events.map(e=>[e.type,e.playerId&&derive(state).players[e.playerId]?.first,e.toPlayerId&&derive(state).players[e.toPlayerId]?.first,e.stat,e.value,e.made]);

{const s=fixture(),p=parseCommand('Jalen to Mason Mason drains the three',s);assert.deepEqual(names(s,p.events),[['PASS','Jalen','Mason',undefined,undefined,undefined],['SHOT','Mason',undefined,undefined,3,1],['STAT','Jalen',undefined,'ast',undefined,undefined]]);assert(p.atomicClauses.length>=2);}
{const s=fixture(),p=parseCommand('Cayden shoots the three, off the rim, Jackson gets the offensive board and puts it back in.',s);assert.deepEqual(names(s,p.events),[['SHOT','Cayden',undefined,undefined,3,0],['STAT','Jackson',undefined,'oreb',undefined,undefined],['SHOT','Jackson',undefined,undefined,2,1]]);}
{const s=fixture(),p=parseCommand('They miss. Tyler gets the rebound.',s);assert.deepEqual(names(s,p.events),[['SHOT',null,undefined,undefined,2,0],['STAT','Tyler',undefined,'dreb',undefined,undefined]]);}
{const s=fixture(),p=parseCommand('Noah gets fouled and goes one for two.',s);assert.equal(p.events.filter(e=>e.type==='SHOT').length,2);assert.deepEqual(p.events.filter(e=>e.type==='SHOT').map(e=>[e.made,e.attempts,e.value]),[[1,1,1],[0,1,1]]);}
{const s=fixture();const p=parseCommand('Seven out, Tyler in, clock 6:12.',s);applyPlan(s,p);const d=derive(s),seven=d.roster.find(p=>p.number==='7'),tyler=d.roster.find(p=>p.number==='43');assert.equal(d.players[seven.id].minutes,108);assert.equal(d.players[tyler.id].minutes,0);assert.equal(d.clock.seconds,372);}
{const s=fixture();applyPlan(s,parseCommand('clock 6:00',s));let d=derive(s);for(const id of d.lineups.home)assert.equal(d.players[id].minutes,120);applyPlan(s,parseCommand('q1 over',s));d=derive(s);assert.equal(Object.values(d.players).reduce((n,p)=>n+(p.periodMinutes[1]||0),0),2400);assert(!d.warnings.some(w=>w.includes('playing time is')));}
{const s=fixture(false);assert.equal(derive(s).clock.started,false);applyPlan(s,parseCommand('tip off',s));assert.equal(derive(s).clock.started,true);assert.equal([...derive(s).lineups.home].length,5);}
console.log('PASS atomic pass/shot, miss/rebound/putback, opponent miss, individual free throws, timed substitutions, and starter minutes');
