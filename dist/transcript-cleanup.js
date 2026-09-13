// Conservative cleanup before basketball parsing. Raw speech is retained on the plan.
const action='pass(?:es|ed)?|shoot(?:s|ing)?|score(?:s|d)?|make(?:s|d)?|miss(?:es|ed)?|hit(?:s)?|rebound(?:s|ed)?|board(?:s|ed)?|steal(?:s|ing)?|stole|block(?:s|ed)?|turnover|foul(?:s|ed)?|dribble(?:s|d)?|drive(?:s|d)?';
export function cleanupTranscript(raw,d={roster:[]}){
 let text=String(raw||'').replace(/[\u2018\u2019]/g,"'").replace(/\s+/g,' ').trim();
 if(!text)return text;
 // Recognition often duplicates a complete phrase or the subject at a clause boundary.
 const halves=text.match(/^(.{5,}?)\s*[.;,]\s*\1[.!?]*$/i);if(halves)text=halves[1];
 const words=text.split(/\s+/);if(words.length>=4&&words.length%2===0&&words.slice(0,words.length/2).join(' ').toLowerCase()===words.slice(words.length/2).join(' ').toLowerCase())text=words.slice(0,words.length/2).join(' ');
 text=text.replace(/\b(um+|uh+|erm|hmm|you know|like|okay okay|all right all right)\b/gi,' ');
 text=text.replace(/\b(past|passed)\s+(?=(?:to\s+)?(?:#?\d+|[A-Za-z]))/gi,'passes ')
   .replace(/\b(?:got|gets?)\s+(?:the\s+)?bored\b/gi,'gets the board')
   .replace(/\b(?:a\s+)?steel\b/gi,'a steal')
   .replace(/\bfile\s+on\b/gi,'foul on');
 // Keep a repeated destination when it is also the next actor: "12 to 45 45 scores".
 text=text.replace(new RegExp(`\\b(#?\\d{1,3}|[A-Za-z][A-Za-z'-]*)\\s+\\1\\s+(?=${action}\\b)`,'gi'),'$1, $1 ');
 // Collapse recognition stutters for words, player references, and actions.
 text=text.replace(/\b([A-Za-z]+|#?\d{1,3})(?:\s+\1){1,3}\b/gi,'$1');
 text=text.replace(new RegExp(`\\b(${action})(?:\\s+\\1)+\\b`,'gi'),'$1');
 // Resolve common immediate false starts without inventing a new play.
 text=text.replace(/\b(?:no|wait|sorry)[, ]+(?:not\s+)?(#?\d{1,3}|[A-Za-z][A-Za-z'-]*)[, ]+(?:it was|make that|use)\s+(#?\d{1,3}|[A-Za-z][A-Za-z'-]*)/gi,'$2')
   .replace(/\b#?\d{1,3}\s+(?:no|wait|sorry)[, ]+(#?\d{1,3})(?=\s+(?:scores?|shoots?|passes?|rebounds?|steals?|blocks?|turnovers?|fouls?)\b)/gi,'$1')
   .replace(/\bpasses?\s+to\s+(#?\d{1,3}|[A-Za-z][A-Za-z'-]*)\s+(?:no|wait|sorry)[, ]+(#?\d{1,3}|[A-Za-z][A-Za-z'-]*)/gi,'passes to $2')
   .replace(/\bpasses?\s+(?:no|wait|sorry)[, ]+(?=shoots?|scores?|rebounds?|steals?|blocks?)/gi,'')
   .replace(/\b(?:a )?(?:3|three)(?: pointer)?[, ]+(?:no|wait|sorry)[, ]+(?:a )?(?:2|two)(?: pointer)?/gi,'a two pointer')
   .replace(/\b(?:made|good)[, ]+(?:no|wait|sorry)[, ]+(?:missed|no good)/gi,'missed');
 // "number + name" spoken twice for the same roster player becomes one reference.
 for(const p of d.roster||[]){const names=[p.first,p.last,p.nickname,...(p.aliases||[])].filter(Boolean);for(const name of names){const e=String(name).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');text=text.replace(new RegExp(`\\b#?${p.number}\\s+${e}\\b`,'gi'),String(p.number));}}
 return text.replace(/\s+([,.;!?])/g,'$1').replace(/([,.;!?])(?=\S)/g,'$1 ').replace(/\s+/g,' ').trim();
}

export function mergeTranscriptOverlap(left,right){
 const a=String(left||'').trim(),b=String(right||'').trim();if(!a)return b;if(!b)return a;
 const A=a.split(/\s+/),B=b.split(/\s+/),key=s=>s.toLowerCase().replace(/[^a-z0-9#]/g,'');let overlap=0;
 for(let n=Math.min(A.length,B.length,12);n>=1;n--)if(A.slice(-n).map(key).join(' ' )===B.slice(0,n).map(key).join(' ')){overlap=n;break;}
 return A.concat(B.slice(overlap)).join(' ');
}

export function eventFingerprint(plan){
 return (plan?.events||[]).filter(e=>!['NARRATION_CONTEXT','CLOCK_SYNC'].includes(e.type)).map(e=>[e.type,e.team||'',e.playerId||'',e.toPlayerId||'',e.stat||'',e.value??'',e.made??'',e.attempts??'',e.absolute??'',e.delta??''].join(':')).join('|');
}
