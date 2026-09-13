import assert from 'node:assert/strict';
import {newGame,derive,defaults,commit,applyPlan,parseCommand,playerPlan} from '../dist/engine.js';

function fixture(){const s=newGame();commit(s,[{type:'CONFIG',settings:{...defaults,home:'Wolves',away:'Woodland'}}]);for(const n of [2,7,12,16,43,45])applyPlan(s,playerPlan({number:String(n),first:'Player'+n,team:'home'},s));commit(s,[{type:'STARTERS',team:'home',players:derive(s).roster.filter(p=>[2,7,12,16,43].includes(+p.number)).map(p=>p.id)}]);applyPlan(s,parseCommand('Tip off',s));return s;}
function say(s,text,confirm=false){const p=parseCommand(text,s);if(confirm)p.confirmed=true;applyPlan(s,p,text);return p;}

{const s=fixture(),before=s.transactions.length,p=parseCommand('okay',s);assert(p.ignored);applyPlan(s,p,'okay');assert.equal(s.transactions.length,before);}
{const s=fixture();say(s,'43 43 shoots shoots a three and scores scores');assert.equal(derive(s).score.home,3);}
{const s=fixture();say(s,'43 passes to');assert.equal(s.speechContext.pendingPassFrom,derive(s).roster.find(p=>p.number==='43').id);say(s,'12');assert.equal(derive(s).timeline.filter(e=>e.type==='PASS').length,1);}
{const s=fixture();say(s,'43 made a three');say(s,'basket was waved off');const d=derive(s);assert.equal(d.score.home,0);assert(d.timeline.find(e=>e.type==='SHOT').voided);}
{const s=fixture();say(s,'shot clock violation');assert.equal(derive(s).teamTurnovers.home,1);assert.equal(derive(s).totals.home.to,1);}
{const s=fixture();say(s,'opponent possession arrow');assert.equal(derive(s).possession,'away');}
{const s=fixture(),timeouts=derive(s).timeouts.home;say(s,'official timeout');assert.equal(derive(s).timeouts.home,timeouts);}
{const s=fixture(),p=parseCommand('score is 3 to 2',s);assert(p.confirm);assert.match(p.notes[0],/differs/);say(s,'score is 3 to 2',true);assert.deepEqual(derive(s).score,{home:3,away:2});}
{const s=fixture();assert.throws(()=>say(s,'45 deflection'),/bench/);say(s,'43 deflection');assert.equal(derive(s).players[derive(s).roster.find(p=>p.number==='43').id].advanced.deflections,1);}
console.log('PASS real-world transcription cleanup, partial speech, review, voids, possession and advanced events');
