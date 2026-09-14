const PUTER_SRC='https://js.puter.com/v2/';

export function audioMime(Recorder=globalThis.MediaRecorder){
 for(const type of ['audio/webm;codecs=opus','audio/webm','audio/mp4'])if(Recorder?.isTypeSupported?.(type))return type;
 return '';
}

export function transcriptText(result){return String(result?.text??result??'').trim();}

export function speechFailureMessage(error){
 const text=String(error?.message||error?.error?.message||error?.code||error||'').toLowerCase();
 if(/credit|quota|limit|payment|fund|balance|usage/.test(text))return 'Puter transcription credits are unavailable.';
 if(/auth|sign.?in|permission|denied/.test(text))return 'Puter transcription was not authorized.';
 return 'Puter transcription is unavailable.';
}

export async function transcribeWithPuter(puter,blob,options,timeoutMs=12000){
 let timer;try{return await Promise.race([puter.ai.speech2txt(blob,options),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Puter transcription timed out.')),timeoutMs);})]);}finally{clearTimeout(timer);}
}

export function loadPuter(win=globalThis.window,timeoutMs=4000){
 if(win?.puter?.ai?.speech2txt)return Promise.resolve(win.puter);
 if(!win?.document)return Promise.reject(Error('Puter.js cannot load here.'));
 if(win.__courtsidePuterPromise)return win.__courtsidePuterPromise;
 const pending=new Promise((resolve,reject)=>{
  const existing=win.document.querySelector(`script[src="${PUTER_SRC}"]`),script=existing||win.document.createElement('script');let settled=false;
  const finish=(fn,value)=>{if(settled)return;settled=true;clearTimeout(timer);fn(value);};
  const ready=()=>win.puter?.ai?.speech2txt?finish(resolve,win.puter):finish(reject,Error('Puter.js loaded without speech transcription.'));
  script.addEventListener('load',ready,{once:true});script.addEventListener('error',()=>finish(reject,Error('Puter.js could not load.')),{once:true});
  if(!existing){script.src=PUTER_SRC;script.async=true;win.document.head.append(script);}
  const timer=setTimeout(()=>finish(reject,Error('Puter.js took too long to load.')),timeoutMs);
 });
 win.__courtsidePuterPromise=pending.catch(error=>{win.__courtsidePuterPromise=null;if(!win.puter)win.document.querySelector(`script[src="${PUTER_SRC}"]`)?.remove();throw error;});
 return win.__courtsidePuterPromise;
}

export function createClipRecorder({stream,onClip,onError,clipMs=6000,Recorder=globalThis.MediaRecorder,BlobClass=globalThis.Blob}){
 if(!Recorder)throw Error('Audio recording is unavailable in this browser.');
 let active=false,current=null,timer=null,flush=true;const mime=audioMime(Recorder);
 function begin(){
  if(!active)return;const parts=[];
  try{current=new Recorder(stream,mime?{mimeType:mime}:undefined);}catch(error){active=false;onError(error);return;}
  current.ondataavailable=event=>{if(event.data?.size)parts.push(event.data);};
  current.onerror=event=>{active=false;clearTimeout(timer);onError(event.error||Error('Audio recording failed.'));};
  current.onstop=()=>{clearTimeout(timer);const blob=parts.length?new BlobClass(parts,{type:current?.mimeType||mime||'audio/webm'}):null;current=null;if(flush&&blob?.size)onClip(blob);if(active)queueMicrotask(begin);};
  try{current.start();timer=setTimeout(()=>{if(current?.state==='recording')current.stop();},clipMs);}catch(error){active=false;onError(error);}
 }
 return {start(){if(active)return;active=true;flush=true;begin();},stop(options={}){flush=options.flush!==false;active=false;clearTimeout(timer);if(current?.state==='recording')current.stop();},active:()=>active};
}
