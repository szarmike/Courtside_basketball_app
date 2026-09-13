import {jsPDF} from 'jspdf';
import {autoTable} from 'jspdf-autotable';
import {derive,formatTime,periodLabel,emptyStats} from '../dist/engine.js';
export function buildReport(state,scope='team'){
 const d=derive(state),player=scope==='team'?null:d.players[scope];if(scope!=='team'&&!player)throw Error('Choose a player.');
 const doc=new jsPDF({orientation:'landscape',unit:'pt',format:'a4'}),width=doc.internal.pageSize.getWidth();
 const title=player?`#${player.number} ${player.first} ${player.last}`:d.settings.home;
 doc.setFontSize(22);const lines=doc.splitTextToSize(title,width-72);doc.text(lines,36,42);let y=48+lines.length*24;
 doc.setFontSize(12);const sub=doc.splitTextToSize(`${d.settings.home} ${d.score.home} - ${d.score.away} ${d.settings.away} | ${state.clock.final?'FINAL':'IN PROGRESS'}`,width-72);doc.text(sub,36,y);y+=sub.length*16;
 doc.setFontSize(10);doc.text(`${state.meta?.date||'Date not set'}${state.meta?.startTime?' at '+state.meta.startTime:''} | ${d.settings.periods} periods, ${formatTime(d.settings.length)} each`,36,y);y+=22;
 const head=['Player / period','MIN','PTS','FG','2PT','3PT','FT','OREB','DREB','REB','AST','STL','BLK','TO','PF'];
 const row=(label,min,s)=>[label,formatTime(min),s.pts,`${s.fgm}/${s.fga}`,`${s.twoM}/${s.twoA}`,`${s.threeM}/${s.threeA}`,`${s.ftm}/${s.fta}`,...['oreb','dreb','reb','ast','stl','blk','to','pf'].map(k=>s[k])];
 const periods=Array.from({length:Math.max(d.settings.periods,d.clock.period)},(_,i)=>i+1);
 const players=d.roster.filter(p=>p.team==='home').map(p=>d.players[p.id]);
 const body=player?[row('GAME TOTAL',player.minutes,player.stats),...periods.map(q=>row(periodLabel(q,d.settings),player.periodMinutes[q]||0,player.periodStats[q]||emptyStats()))]:[...players.map(p=>row(`#${p.number} ${p.first} ${p.last}`,p.minutes,p.stats)),row('TEAM TOTAL',players.reduce((n,p)=>n+p.minutes,0),d.totals.home)];
 const table=(head,body,startY=y)=>autoTable(doc,{head:[head],body,startY,margin:36,styles:{fontSize:8,cellPadding:5,overflow:'linebreak'},headStyles:{fillColor:[25,43,62]},columnStyles:{0:{cellWidth:145}},theme:'striped'});
 table(head,body);y=doc.lastAutoTable.finalY+24;
 if(player){table(['Period','Entered','Left','Playing time'],player.intervals.map(i=>[periodLabel(i.period,d.settings),formatTime(i.in),formatTime(i.out),formatTime(i.seconds)]),y);}else{table(['Score by period',...periods.map(q=>periodLabel(q,d.settings)),'TOTAL'],['home','away'].map(t=>[d.settings[t],...periods.map(q=>d.periodTotals[q]?.score[t]||0),d.score[t]]),y);}
 for(let i=1;i<=doc.getNumberOfPages();i++){doc.setPage(i);doc.setFontSize(8);doc.setTextColor(90);doc.text('Courtside | Minutes follow the reported game clock. Score corrections may differ from player totals.',36,doc.internal.pageSize.getHeight()-20);doc.text(`${i} / ${doc.getNumberOfPages()}`,width-60,doc.internal.pageSize.getHeight()-20);}
 return {doc,filename:`courtside-${(state.meta?.date||'game')}-${title.replace(/[^a-z0-9]+/gi,'-').slice(0,65)}.pdf`};
}
export function downloadReport(state,scope){const {doc,filename}=buildReport(state,scope);doc.save(filename);}
