// Basketball narration pipeline: references → clauses → context → events → review.
const reEscape=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const MISS=/\b(miss(?:es|ed|ing)?|no good|nope|airball(?:s|ed)?|whiff(?:s|ed)?|brick(?:s|ed)?|clank(?:s|ed)?|off (?:the )?(?:back |front )?(?:rim|iron)|rims? out|rolls? (?:out|off)|short|long|way off|not even close|ugly miss|missed everything|didnt (?:make|hit|go)|doesnt (?:go|fall)|cant (?:connect|finish|get)|couldnt (?:connect|get)|wouldnt fall|nearly|almost)\b/;
const MADE=/\b(good|scores?|scored|makes?|made|hits?|hit|drains?|drained|buries|buried|knocks? down|knocked (?:it )?down|nails?|nailed|splashes?|splashed|splash|money|bucket|bang|nothing but net|connects?|connected|finishes?|finished|converted|sinks?|sank|gets? (?:it|the layup|the bucket|the bank shot|2)|got it|puts? (?:it |it back )?in|lays? it in|banks? it in)\b/;
const PASS=/\b(?:pass(?:es|ed)?(?: (?:it|ahead))?(?: to)?|dish(?:es|ed)?(?: it)?(?: to)?|feeds?|fed|finds?|kick(?:s|ed)?(?: it)?(?: back)?(?: out| over)?(?: to)?|swing(?:s)?(?: it)?(?: over)?(?: to)?|swung|gives? it to|moves? it to|throws? it ahead to|over to|to)\s*$/;
const LAUNCH=/\b(shoots?|shot|launch(?:es|ed)?|puts? (?:it |it back )?up|lets? (?:it|that .*?) fly|pulls? up|steps? back)\b/;
const SELF_CREATE=/\b(dribbles?|drives?|steps? back|coast to coast|creates?)\b/;
const REBOUND=/\b(?:(?:offensive|defensive|o|d|own) (?:rebounds?|boards?)|rebounds?|boards?|gets? (?:his |their )?own (?:miss|shot|rebound|board)|follows? (?:his |their )?own shot|pulls? down (?:the )?(?:rebound|board)|cleans? up the glass|grabs? it|pulls? it down|cleans? it up|gets? it again)\b/;
const TWO=/\b(2(?: point)?|layup|jumper|dunk|floater|hook|midrange|fadeaway|turnaround|paint|inside|at the rim|to the rim|off the glass|bank shot|bucket|puts? (?:it |it back )?in|lays? it in|banks? it in|putback|back up|drive|drives|coast to coast)\b/;
const THREE=/\b(3(?: point(?:er)?)?|downtown|deep|splash(?:es|ed)?)\b/;
const FREE=/\b(free throws?|ft|at the line|1st|2nd|first|second|both|pair|perfect at the line)\b|\b[0-3] for [1-3]\b/;

function markPlayers(text,d,normalize){
  const refs=[],aliases=new Map();
  for(const p of d.roster)for(const a of [p.first,p.last,p.nickname,`${p.first} ${p.last}`,...p.aliases].filter(Boolean)){const n=normalize(String(a)).trim();if(/^\d+$/.test(n))continue;const list=aliases.get(n)||[];if(!list.some(q=>q.id===p.id))list.push(p);aliases.set(n,list);}
  function choose(candidates,before){const team=/\b(opponent|their|them)\s*$/.test(before)?'away':'home';let list=candidates.filter(p=>p.team===team);if(list.length!==1)throw Error(list.length?'That player name is ambiguous. Use a unique alias or jersey number.':'Player not found on that team. Add the player before recording the play.');refs.push(list[0]);return ` @p${refs.length-1} `;}
  const names=[...aliases.keys()].sort((a,b)=>b.length-a.length);
  if(names.length)text=text.replace(new RegExp(`\\b(${names.map(reEscape).join('|')})(?:s(?= (?:coming|going)))?\\b`,'g'),(m,a,offset)=>choose(aliases.get(a),text.slice(Math.max(0,offset-24),offset)));
  text=text.replace(/(?<![\w@])#?(\d{1,3})(?!\w)/g,(m,n,offset)=>{const before=text.slice(0,offset),after=text.slice(offset+m.length);if(/^\s+(?:out|in)\b/.test(after)&&/\b(?:take|put|get)\s*$/.test(before))return choose(d.roster.filter(p=>String(p.number)===n),before.slice(-24));if(/\b(point|points|pointer|ball|defenders?|seconds?|minutes?)\b/.test(after.slice(0,18).trim().split(/[,.;]/)[0])&&/^\s*(?:point|points|pointer|ball|defenders?|seconds?|minutes?)\b/.test(after))return n;if(/\b(?:from|made|makes?|missed|misses?|hits?|hit|a|the|that|gets?|got|takes?|launches?|shoots?|number)\s*$/.test(before)&&!(/\b(?:player|number)\s*$/.test(before)&&!/(?:thats|that is)\s+number\s*$/.test(before)))return n;if(/^\s+for\s+[1-3]\b/.test(after)&&!/\bsub(?:stitute)?\b/.test(before))return n;if(/\bfor\s*$/.test(before)&&/^[1-3]$/.test(n)&&!/\bsub(?:stitute)?\b|\bin\s+for\s*$/.test(before))return n;if(/^[123]$/.test(n)&&/^\s+(?:no good|good|is good|is off|is short|is long|nope)\b/.test(after)&&!/^\s*$/.test(before))return n;if(/^[123]$/.test(n)&&/^\s+(?:no good|good)\b/.test(after)&&/^\s*$/.test(before))return n;return choose(d.roster.filter(p=>String(p.number)===n),before.slice(-24));});
  return {text:text.replace(/\s+/g,' ').trim(),refs};
}

export function parseNarration(raw,state,helpers){
  const {derive,normalize,parseTime,uid,formatTime}=helpers,d=derive(state),ti=parseTime(raw,d.clock,d.settings);
  let normalized=ti.text.replace(/\b(trey|triple)\b/g,'3 pointer').replace(/\b(?:nothing but nylon|all net)\b/g,'nothing but net').replace(/\b(?:does not|did not)\b/g,m=>m==='does not'?'doesnt':'didnt').replace(/\b(?:okay|um|uh|alright|lets see|yeah)\b/g,' ').replace(/\band then\b/g,' then ').replace(/\b(?:its|it is) up\b/g,' ').trim();
  const {text,refs}=markPlayers(normalized,d,normalize),stamp={period:ti.period,clock:ti.seconds};
  const saved=state.speechContext;const ctx=saved&&Date.now()-(saved.updatedAt||0)<90000?structuredClone(saved):{};
  ctx.updatedAt=Date.now();let active=d.players[ctx.activeId]||null,pending=ctx.pendingShot||null,lastShot=ctx.lastShot||null,lastPass=ctx.lastPass||null,lastMiss=ctx.lastMiss||null,freeShooter=ctx.freeShooter||null;
  const events=[],choices=[],notes=[];let freshReference=false,shotResolved=false,pause=false,recognized=false;
  const add=(type,extra={})=>{const e={id:uid(),type,...stamp,...extra};events.push(e);return e;};
  const requirePlayer=()=>{if(!active)throw Error('Who made that play? Say a jersey number or player name.');return active;};
  function shotValue(clause){if(FREE.test(clause))return 1;if(/\b(?:3(?: point(?:er)?)?|downtown|deep)\b/.test(clause))return 3;if(TWO.test(clause))return 2;if(THREE.test(clause))return 3;return null;}
  function setOutcome(made,clause,{forceNew=false,value=null,attempts=1}={}){
    const p=requirePlayer();recognized=true;value=value||shotValue(clause)||pending?.value||((freeShooter===p.id)?1:null)||ctx.shotHint;
    const explicitNew=forceNew||/\bagain\b/.test(clause);
    // A second description of the same outcome is not another shot.
    if(!pending&&lastShot?.playerId===p.id&&!freshReference&&!explicitNew&&shotResolved){
      if(made===0&&lastShot.made>0){const local=events.find(e=>e.id===lastShot.id);if(local){local.made=0;local.points=0;lastShot.made=0;for(const id of lastShot.assistIds||[]){const i=events.findIndex(e=>e.id===id);if(i>=0)events.splice(i,1);}}else add('PATCH',{patches:[{id:lastShot.id,values:{made:0,points:0}},...(lastShot.assistIds||[]).map(id=>({id,values:{removed:true}}))]});lastMiss={playerId:p.id,team:p.team,value:lastShot.value};}
      return;
    }
    if(!pending&&lastShot?.playerId===p.id&&!freshReference&&!explicitNew&&!LAUNCH.test(clause)&&Date.now()-(lastShot.at||0)<15000&&!FREE.test(clause)&&!/putback|puts? .*back|back up|scores|bucket/.test(clause)){
      if(made===0&&lastShot.made>0&&/\b(no|actually|missed|didnt)\b/.test(clause)){add('PATCH',{patches:[{id:lastShot.id,values:{made:0,points:0}},...(lastShot.assistIds||[]).map(id=>({id,values:{removed:true}}))]});lastShot.made=0;return;}
      if(made===lastShot.made){notes.push('Repeated outcome ignored.');return;}
    }
    if(!value)value=lastMiss?.playerId===p.id?lastMiss.value:null;
    const e=add('SHOT',{playerId:p.id,team:p.team,value:value||2,made,attempts,points:(value||2)*made,...(pending?.playerId===p.id?{period:pending.period,clock:pending.clock,raw:pending.raw===raw?raw:pending.raw+' / '+raw,sourceTranscripts:pending.raw===raw?[raw]:[pending.raw,raw]}:{})});
    if(!value)choices.push({eventId:e.id,kind:'shot',label:`#${p.number}: was that a two, three, or free throw?`});
    lastShot={id:e.id,playerId:p.id,value:value||null,made,at:Date.now(),assistIds:[]};
    if(made&&value!==1&&lastPass?.to===p.id&&lastPass.from!==p.id){const passer=d.players[lastPass.from];if(passer&&passer.team===p.team){if(d.settings.autoAssists){const ast=add('STAT',{stat:'ast',playerId:passer.id,team:p.team,autoAssist:true,shotId:e.id,period:e.period,clock:e.clock});lastShot.assistIds.push(ast.id);}else notes.push(`Possible assist: #${passer.number} (auto-assists off).`);}}
    if(!made){lastMiss={playerId:p.id,team:p.team,value:value||null};}else lastMiss=null;
    if(value===1)freeShooter=p.id;else freeShooter=null;
    pending=null;ctx.shotHint=null;freshReference=false;shotResolved=true;lastPass=null;
  }
  function processClause(clause,nextPlayer){
    clause=clause.trim();if(!clause)return;
    const entry=clause.match(/^(?:(?:he|she|is|checks?|checking|comes?|coming|goes?|going|actually)\s+)*(in|out|entered|to the bench)\b/);
    if(entry){const p=requirePlayer();add(entry[1]==='out'||entry[1]==='to the bench'?'PLAYER_OUT':'PLAYER_IN',{playerId:p.id,team:p.team});recognized=true;pending=null;lastPass=null;clause=clause.slice(entry[0].length).trim();if(!clause||/^(?:put|take|get|sub)$/.test(clause))return;}

    if(/\bthey\b/.test(clause)&&!refs.length)throw Error('Which team or player do you mean? Use a name or jersey number.');
    if(SELF_CREATE.test(clause)&&lastPass?.to===active?.id)lastPass=null;
    if(/\b(?:at the line|gets? fouled(?: shooting)?|was fouled(?: shooting)?)\b/.test(clause)){const p=requirePlayer();freeShooter=p.id;recognized=true;if(/fouled/.test(clause)){add('STAT',{stat:'pf',team:p.team==='home'?'away':'home',playerId:null,drawnBy:p.id});pause=true;if(lastShot?.playerId===p.id&&lastShot.made>0&&lastShot.value!==1)add('AND_ONE_PENDING_FREE_THROW',{playerId:p.id,team:p.team,shotId:lastShot.id});}clause=clause.replace(/\b(?:at the line|gets? fouled(?: shooting)?|was fouled(?: shooting)?)\b/g,'');}
    const stats=[['stl',/\b(?:steals?|stole|strips?(?: him)?|picks? his pocket|takes? it away|jumps? the passing lane|intercepts? (?:the )?pass|comes? away with it)\b/],['blk',/\b(?:blocks?(?: (?:the )?shot| him)?|swats?(?: it)?|rejects?(?: it)?|stuffs? the shot|sends? it back)\b/],['to',/\b(?:turnovers?|turns? it over|loses? (?:the ball|control)|throws? it away|bad pass|steps? out of bounds|travel(?:s|ed|ing)?|double dribble|coughs? it up)\b/],['pf',/\b(?:foul(?:s|ed)?(?: him)?|whistle on|thats (?:number \d+ )?on|reaches? in.*gets? called)\b/],['ast',/\bassist\b/]];
    // A blocking or shooting foul is a personal foul, not a block/attempt.
    if(/\b(?:blocking|shooting|personal) foul\b/.test(clause))clause=clause.replace(/\b(?:blocking|shooting|personal) foul\b/,'foul');
    for(const [stat,re]of stats){const m=clause.match(re);if(m){const p=requirePlayer();if(stat==='ast'&&lastShot?.assistIds?.length&&events.some(e=>lastShot.assistIds.includes(e.id)&&e.playerId===p.id)){notes.push('Assist already included.');}else add('STAT',{stat,playerId:p.id,team:p.team});recognized=true;if(stat==='pf')pause=true;if(stat==='blk')lastMiss={team:p.team==='home'?'away':'home',value:null};if(stat==='stl'||stat==='to')lastPass=null;clause=clause.replace(m[0],'');if(stat==='blk')clause=clause.replace(/\b(?:the )?shot\b/g,'');}}
    const reb=clause.match(REBOUND);if(reb){const p=requirePlayer();if(pending){const shooter=d.players[pending.playerId],savedActive=active;active=shooter;setOutcome(0,'missed',{value:pending.value});active=savedActive;}let stat=/offensive|\bo board|\bown\b|follows.*own|get.*again/.test(clause)?'oreb':/defensive|\bd board/.test(clause)?'dreb':lastMiss?(lastMiss.team===p.team?'oreb':'dreb'):null;const e=add('STAT',{stat:stat||'reb',playerId:p.id,team:p.team});if(!stat)choices.push({eventId:e.id,kind:'rebound',label:`#${p.number}: offensive or defensive rebound?`});recognized=true;pending=null;lastPass=null;shotResolved=false;freshReference=true;ctx.shotHint=stat==='oreb'?2:null;clause=clause.replace(reb[0],'');if(/own miss|own shot|own rebound|own board/.test(reb[0]))clause=clause.replace(/\b(?:his|their)\b/g,'');}
    if(nextPlayer&&PASS.test(clause)){const p=requirePlayer();if(p.id!==nextPlayer.id)add('PASS',{playerId:p.id,toPlayerId:nextPlayer.id,team:p.team});lastPass={from:p.id,to:nextPlayer.id};recognized=true;return;}
    const pair=clause.match(/\b([0-3]) for ([1-3])\b/);if(pair||/splits? (?:the )?(?:pair|free throws)|perfect at the line|\bboth\b/.test(clause)){const made=pair?+pair[1]:/miss/.test(clause)?0:/split/.test(clause)?1:2,attempts=pair?+pair[2]:2;if(made>attempts)throw Error('Free throws made cannot exceed attempts.');setOutcome(made,clause,{forceNew:true,value:1,attempts});return;}
    if(/\b(drives?|coast to coast|inside|to the rim)\b/.test(clause))ctx.shotHint=2;
    if(/^(?:(?:he|she) )?gets? (?:the ball|it)$/.test(clause)){recognized=true;return;}
    const value=shotValue(clause),launch=LAUNCH.test(clause),miss=MISS.test(clause),made=MADE.test(clause);
    if(value===1){freeShooter=requirePlayer().id;if(/1st|2nd|free throw/.test(clause)&&!pending){freshReference=true;shotResolved=false;}}
    if(launch&&!pending&&!shotResolved){const p=requirePlayer();pending={playerId:p.id,value:value||null,period:ti.period,clock:ti.seconds,raw};recognized=true;}else if(pending&&value)pending.value=value;
    if(miss||made){setOutcome(miss?0:1,clause,{value,forceNew:/\bagain\b|putback|back up|puts? .*back/.test(clause)});return;}
    if(/\b(drives?|gets? (?:the ball|it)|brings? it up|takes? it (?:the other way|coast to coast))\b/.test(clause)){recognized=true;if(/drive|inside|rim|coast/.test(clause)){ctx.shotHint=2;if(pending&&!pending.value)pending.value=2;}}
    if(/putback/.test(clause))setOutcome(1,clause,{forceNew:true,value:2});
  }
  const tokens=[...text.matchAll(/@p(\d+)/g)];
  if(tokens.length){const pre=text.slice(0,tokens[0].index);for(let i=0;i<tokens.length;i++){const p=refs[+tokens[i][1]];
    const following=tokens[i+1],between=following?text.slice(tokens[i].index+tokens[i][0].length,following.index).trim():'';
    if(following&&/^(?:(?:checks? |coming |goes? |comes? )?in for|replaces?|for)$/.test(between)){const outgoing=refs[+following[1]];if(p.team!==outgoing.team||p.id===outgoing.id)throw Error('A substitution needs two different players on the same team.');add('PLAYER_OUT',{playerId:outgoing.id,team:outgoing.team});add('PLAYER_IN',{playerId:p.id,team:p.team});recognized=true;pending=null;lastPass=null;active=p;i++;continue;}
    const different=active?.id!==p.id;active=p;freshReference=true;if(different){shotResolved=false;ctx.shotHint=null;}let segment=text.slice(tokens[i].index+tokens[i][0].length,tokens[i+1]?.index??text.length);if(i===0&&/foul on|whistle on|block by|airball|bucket|turnover|thats.*on|no good/.test(pre))segment=pre+' '+segment;const next=tokens[i+1]?refs[+tokens[i+1][1]]:null;
    if(next&&/^[\s,]*(?:and)?\s*$/.test(segment)){const tail=text.slice(tokens[i+1].index+tokens[i+1][0].length,tokens[i+2]?.index??text.length),role=tail.match(/^\s*(?:checks?\s+)?(in|out)\b/);if(role){add(role[1]==='in'?'PLAYER_IN':'PLAYER_OUT',{playerId:p.id,team:p.team});recognized=true;continue;}}
const clauses=segment.split(/[,;.!]+|\b(?:and|then|who)\b/).map(s=>s.trim()).filter(Boolean);if(!clauses.length&&next&&p.id!==next.id&&/^\s*[, ]*\s*$/.test(segment)){add('PASS',{playerId:p.id,toPlayerId:next.id,team:p.team});lastPass={from:p.id,to:next.id};recognized=true;}for(let j=0;j<clauses.length;j++)processClause(clauses[j],j===clauses.length-1?next:null);}}
  else {freshReference=false;for(const clause of text.split(/[,;.!]+|\b(?:and|then)\b/))processClause(clause,null);}
  if(!recognized&&!events.length)throw Error('No basketball action was clear. Nothing was recorded. Say the player and what happened.');
  ctx.activeId=active?.id||null;ctx.pendingShot=pending;ctx.lastShot=lastShot;ctx.lastPass=lastPass;ctx.lastMiss=lastMiss;ctx.freeShooter=freeShooter;
  const waiting=pending?`Waiting for #${d.players[pending.playerId]?.number}'s shot result. Say “good,” “missed,” or “airball.”`:null;
  const label=events.map(e=>e.type==='SHOT'?`#${d.players[e.playerId]?.number} · ${e.value===1?`${e.made}/${e.attempts} FT`:e.value+'PT '+(e.made?'MADE':'MISSED')}`:e.type==='PASS'?`#${d.players[e.playerId]?.number} → #${d.players[e.toPlayerId]?.number} PASS`:e.type==='STAT'?`${e.playerId?'#'+d.players[e.playerId]?.number:'Opponent'} · ${e.stat.toUpperCase()}`:e.type.replaceAll('_',' ')).join(' · ');
  return {events,clock:{...(ti.explicit?{period:ti.period,seconds:ti.seconds}:{}),...(pause?{running:false}:{})},context:ctx,choices,confirm:choices.length>0,notes,waiting:!!pending,label:label||waiting||notes.join(' ')||'Context updated; no stat added.',waitingLabel:waiting};
}
