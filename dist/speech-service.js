// Network here describes the recognition service, not the entire connection.
export const retryDelay=attempt=>[2000,5000,10000,20000,30000][Math.min(Math.max(0,attempt-1),4)];
export async function prepareRecognition(Recognition,recognition){
 if(!('processLocally' in recognition)||typeof Recognition.available!=='function')return {mode:'online',local:'unsupported'};
 let timer;try{const local=await Promise.race([Recognition.available({langs:['en-US'],processLocally:true}),new Promise(resolve=>{timer=setTimeout(()=>resolve('unknown'),2500);})]);recognition.processLocally=local==='available';return {mode:recognition.processLocally?'offline':'online',local};}catch{return {mode:'online',local:'unavailable'};}finally{clearTimeout(timer);}
}
