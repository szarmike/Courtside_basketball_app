// Cleanup and special cases for real-world gym transcription.
const QUIET=/^(?:okay|ok|alright|lets see|let me think|hold on|one second|what was that|what are they doing|come on(?: guys| ref)?|nice|nice job|good job|great job|great play|good defense|lets go|that was terrible|seriously|thats crazy|wow|yep|yeah|uh huh|mm hmm|the score is right|thats correct)$/;
const TOTAL_ONLY=/^(?:he|she|they|we|our team|opponent|[a-z]+|#?\d+)\s+(?:has|have|is at|are at)\s+\d+\s+(?:points?|rebounds?|assists?|fouls?)$/;

function clean(raw,normalize){
  let t=normalize(raw)
    .replace(/\b(\w+)(?:\s+\1){1,3}\b/g,'$1')
    .replace(/\b(?:no wait|wait no|sorry|actually)\b[,. ]*/g,' actually ')
    .replace(/\s+/g,' ').trim();
  t=t.replace(/\bscores? (?:of|off) ([23])\b/g,'scores a $1 pointer');
  t=t.replace(/^(?:number )?#?\d+\s+actually\s+((?:number )?#?\d+\s+.+)$/,'$1');
  // Keep the final player in a same-sentence correction.
  let m=t.match(/^(.*?)\b(?:wait|actually|sorry) (?:that was |it was )?(?:number )?(#?\d+|[a-z]+)$/);
  if(m&&/\b(?:made|miss|rebound|board|foul|steal|block|turnover)\b/.test(m[1]))t=m[2]+' '+m[1].replace(/^(?:player |number )?#?\d+\s+|^[a-z]+\s+/,'');
  t=t.replace(/^(.*?)\bshoots?\b.*?\b(?:actually|nope)\s+(?:he |she )?(?:passed|kicked)\s+(?:it )?(?:to )?(.+)$/,'$1 passes to $2');
  t=t.replace(/\bfor (?:a )?3\b.*\bactually (?:he |she )?(?:stepped|was) inside (?:the )?line\b/,'shoots a 2');
  t=t.replace(/\bmiss(?:ed|es)?\b.*\bactually (?:it )?(?:went in|was good)\b/,'made');
  return t.replace(/\bactually\b/g,' ').replace(/\s+/g,' ').trim();
}

function recent(events,predicate){return [...events].reverse().find(predicate);}

export function prepareEdge(raw,state,h){
  const d=h.derive(state),normalized=h.normalize(raw),n=clean(raw,h.normalize),cleaned=n!==normalized,events=h.effectiveEvents(state),stamp={period:d.clock.period,clock:d.clock.seconds};
  const plan=(items,label,extra={})=>({events:items.map(e=>({...stamp,...e})),label,...extra});
  const leading=n.match(/^(?:number |player |jersey )?(\d{1,2})\s+(?:shoots?|scores?|made|makes?|misses?|rebound|passes?|fouls?|steals?|blocks?|turnover)\b/);if(leading&&!d.roster.some(p=>p.team==='home'&&String(p.number)===leading[1])){const near=d.roster.filter(p=>p.team==='home'&&Math.abs(+p.number-+leading[1])===1);if(near.length===1)throw Error(`Player #${leading[1]} is not on the roster. Did you mean #${near[0].number} ${near[0].first}?`);}
  if(/^actually it was .*\bfor\b/.test(normalized))return {raw};
  if(/^wait that was (?:number )?#?\d+$/.test(normalized))return {raw:normalized.replace(/^wait /,'')};
  if(QUIET.test(n)||TOTAL_ONLY.test(n)||/^(?:no call|play on|nothing there|almost (?:a )?(?:steal|block)|nearly (?:a )?(?:steal|block))$/.test(n))return {plan:{ignored:true,label:'Heard as sideline talk · nothing recorded'}};
  if(/^(?:pause|stop) listening$/.test(n))return {plan:{microphone:'pause',ignored:true,label:'Listening paused'}};
  if(/^(?:resume|start) listening$/.test(n))return {plan:{microphone:'start',ignored:true,label:'Listening started'}};

  const score=n.match(/\b(?:score(?: is|board(?: says)?)?|its)\s+(\d+)\s*(?:to|-|–|\s+)\s*(\d+)\b/);
  let scoreCheck=null,next=n;
  if(score){scoreCheck={home:+score[1],away:+score[2]};next=(n.slice(0,score.index)+n.slice(score.index+score[0].length)).replace(/^[,; ]+|[,; ]+$/g,'').replace(/^(?:and|then)\s+/,'').trim();}

  if(/\b(?:no basket|basket (?:was )?waved off|doesnt count|shot (?:was |went in but )?after (?:the )?(?:horn|buzzer))\b/.test(n)){
    const shot=recent(events,e=>e.type==='SHOT'&&!e.voided);if(!shot)return {plan:{ignored:true,label:'No recent basket or shot to wave off'}};
    return {plan:plan([{type:'PATCH',patches:[{id:shot.id,values:{voided:true,voidReason:/after/.test(n)?'After the horn':'Waved off'}}]}],'Last shot waved off')};
  }
  if(/\b(?:shot|basket) was before (?:the )?(?:horn|buzzer)\b/.test(n)){
    const shot=recent(events,e=>e.type==='SHOT');if(!shot)return {plan:{ignored:true,label:'No recent shot to mark before the horn'}};
    return {plan:plan([{type:'PATCH',patches:[{id:shot.id,values:{voided:false,beforeBuzzer:true}}]}],'Last shot counted before the horn')};
  }
  if(/\b(?:scoreboard|officials?) (?:changed|ruled).*\b3\b.*\b2\b/.test(n)){
    const shot=recent(events,e=>e.type==='SHOT'&&e.value===3&&!e.voided);if(shot)return {plan:plan([{type:'PATCH',patches:[{id:shot.id,values:{value:2,points:shot.made*2}}]}],'Official ruling changed the three to a two')};
  }
  if(/^scratch (?:that |the )?(?:last )?foul$/.test(n)){
    const foul=recent(events,e=>e.type==='STAT'&&e.stat==='pf');if(!foul)return {plan:{ignored:true,label:'No recent foul to remove'}};return {plan:plan([{type:'PATCH',patches:[{id:foul.id,values:{removed:true}}]}],'Last foul removed')};
  }
  let m=n.match(/\b(?:earlier|last play).*?(?:#?|number )?(\d+)\b.*?rebound.*?(?:actually|was)\s+(?:#?|number )?(\d+)\b/);
  if(m){const from=h.findPlayer(m[1],d.roster,'home'),to=h.findPlayer(m[2],d.roster,'home'),e=recent(events,e=>e.type==='STAT'&&['reb','oreb','dreb'].includes(e.stat)&&e.playerId===from.id);if(!e)throw Error(`No recent rebound for #${from.number} was found.`);return {plan:plan([{type:'PATCH',patches:[{id:e.id,values:{playerId:to.id,team:to.team}}]}],`Rebound reassigned to #${to.number}`)};}

  if(/\b(?:shot clock violation|backcourt violation|lane violation|team turnover)\b/.test(n))return {plan:plan([{type:'TEAM_TURNOVER',team:/\b(opponent|their|them)\b/.test(n)?'away':'home',reason:n}],'Team turnover')};
  m=n.match(/^(.+?) fouled out[,]? (.+?) (?:is )?(?:coming|comes|goes|checks)?\s*in$/);
  if(m){const outgoing=h.findPlayer(m[1],d.roster,'home'),incoming=h.findPlayer(m[2],d.roster,'home');if(outgoing.id===incoming.id)throw Error('A player cannot replace themselves.');return {plan:plan([{type:'STAT',stat:'pf',playerId:outgoing.id,team:outgoing.team},{type:'PLAYER_OUT',playerId:outgoing.id,team:outgoing.team,reason:'FOUL_OUT'},{type:'PLAYER_IN',playerId:incoming.id,team:incoming.team,reason:'FOUL_OUT_REPLACEMENT'}],`#${outgoing.number} fouled out · #${incoming.number} in`,{substitution:true})};}
  m=n.match(/^(.+?) (?:is )?coming out[,]? (.+?) in for (?:him|her)$/);
  if(m){const outgoing=h.findPlayer(m[1],d.roster,'home'),incoming=h.findPlayer(m[2],d.roster,'home');if(outgoing.id===incoming.id)throw Error('A player cannot replace themselves.');return {plan:plan([{type:'PLAYER_OUT',playerId:outgoing.id,team:outgoing.team,reason:'INJURY'},{type:'PLAYER_IN',playerId:incoming.id,team:incoming.team,reason:'INJURY_REPLACEMENT'}],`#${outgoing.number} out · #${incoming.number} in`,{substitution:true})};}
  if(/\b(?:jump ball|held ball|tie up)\b/.test(n))return {plan:plan([{type:'HELD_BALL',team:/\b(opponent|their|them)\b/.test(n)?'away':'home'}],'Held ball')};
  if(/\b(?:possession arrow|arrow stays|arrow goes|won (?:the )?tip|controls? (?:the )?tip)\b/.test(n))return {plan:plan([{type:'POSSESSION',team:/\b(opponent|their|them)\b/.test(n)?'away':'home',reason:n}],'Possession updated')};
  if(/\b(?:official|referee|ref|media) timeout\b/.test(n))return {plan:plan([{type:'OFFICIAL_TIMEOUT',reason:n}],'Official timeout',{clock:{officialRunning:false}})};
  if(/^timeout$/.test(n))throw Error('Which team called timeout? Say “our timeout,” “opponent timeout,” or “official timeout.”');

  if(state.speechContext?.pendingPassFrom&&/^(?:player |number |#)?\d{1,3}$/.test(n)){
    const to=h.findPlayer(n,d.roster,'home'),from=d.players[state.speechContext.pendingPassFrom];if(from&&to.id!==from.id)return {plan:plan([{type:'PASS',playerId:from.id,toPlayerId:to.id,team:from.team}],`#${from.number} → #${to.number} pass`,{context:{activeId:to.id,activeTeam:to.team,updatedAt:Date.now()}})};
  }
  m=n.match(/^(?:player |number |#)?(\d{1,3})$/);
  if(m&&d.roster.some(p=>p.team==='home'&&String(p.number)===m[1])){const p=h.findPlayer(m[1],d.roster,'home');return {plan:{contextOnly:true,context:{...(state.speechContext||{}),activeId:p.id,activeTeam:p.team,updatedAt:Date.now()},label:`Active player is #${p.number} ${p.first}`}};}
  m=n.match(/^(?:player |number |#)?(\d{1,3})\s+passes?\s+to$/);
  if(m){const p=h.findPlayer(m[1],d.roster,'home');return {plan:{contextOnly:true,context:{...(state.speechContext||{}),activeId:p.id,activeTeam:p.team,pendingPassFrom:p.id,updatedAt:Date.now()},label:`Waiting for who received #${p.number}'s pass`}};}

  if(/\b(?:deflect(?:s|ed|ion)|tipped the pass)\b/.test(n)){const p=h.findPlayer(n,d.roster,'home');return {plan:plan([{type:'DEFLECTION',playerId:p.id,team:p.team}],`#${p.number} deflection`)};}
  if(/\b(?:loose ball|dives? for it|wins? the loose ball|saves? it)\b/.test(n)){const p=h.findPlayer(n,d.roster,'home');return {plan:plan([{type:'HUSTLE_PLAY',playerId:p.id,team:p.team,detail:n}],`#${p.number} hustle play`)};}
  if(/\b(?:technical|flagrant|unsportsmanlike)\b/.test(n)){let p=null;try{p=h.findPlayer(n,d.roster,/\b(opponent|their)\b/.test(n)?'away':'home');}catch{}const type=/flagrant/.test(n)?'FLAGRANT_FOUL':/unsportsmanlike/.test(n)?'UNSPORTSMANLIKE_FOUL':'TECHNICAL_FOUL';return {plan:plan([{type,playerId:p?.id||null,team:p?.team||(/\b(opponent|their)\b/.test(n)?'away':'home')}],type.replaceAll('_',' '),{clock:{officialRunning:false}})};}
  if(/\b(?:offensive foul|charge)\b/.test(n)){const p=h.findPlayer(n,d.roster,'home');return {plan:plan([{type:'STAT',stat:'pf',playerId:p.id,team:p.team},{type:'STAT',stat:'to',playerId:p.id,team:p.team}],`#${p.number} offensive foul and turnover`,{clock:{officialRunning:false}})};}

  return {raw:scoreCheck?(next||''):(cleaned?n:raw),scoreCheck};
}

export function attachScoreCheck(plan,check,d){
  if(!check)return plan;
  const events=[...(plan.events||[])];
  if(check.home!==d.score.home)events.push({type:'SCORE_CORRECTION',team:'home',absolute:check.home});
  if(check.away!==d.score.away)events.push({type:'SCORE_CORRECTION',team:'away',absolute:check.away});
  const changed=events.length!==(plan.events||[]).length;
  return {...plan,events,confirm:changed||plan.confirm,notes:[...(plan.notes||[]),changed?`Score check differs from the tracked score ${d.score.home}–${d.score.away}. Confirm before updating it.`:'Score check matches the tracked score.'],label:changed?'Scoreboard check needs confirmation':plan.label};
}
