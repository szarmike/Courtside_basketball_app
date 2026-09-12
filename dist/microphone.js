const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// Chrome desktop supports SpeechRecognition.start(audioTrack). Android's
// recognizer controls its own audio route and ignores that parameter.
export function supportsMicSelection(nav=navigator){const major=+(nav.userAgent.match(/(?:Chrome|Chromium)\/(\d+)/)||[])[1];return major>=135&&!/Android|iPhone|iPad/i.test(nav.userAgent)&&!nav.userAgentData?.mobile;}
export function createMicInput(bridge){
 const selectable=supportsMicSelection(),key='courtside.microphone.v1';let selected='',stream=null,generation=0,devices=[];
 try{selected=localStorage.getItem(key)||'';}catch{}
 if(!selectable)selected='';
 const $=s=>document.querySelector(s);
 function release(){generation++;const old=stream;stream=null;old?.getTracks().forEach(t=>t.stop());}
 async function start(recognition){
  const ticket=++generation;
  if(!selected){recognition.start();return;}
  if(!selectable)throw Error('Choose your microphone in your device settings, then reconnect listening.');
  let captured;
  try{captured=await navigator.mediaDevices.getUserMedia({audio:{deviceId:{exact:selected},echoCancellation:true,noiseSuppression:true},video:false});}
  catch(e){throw Error(e.name==='NotAllowedError'?'Allow microphone access, then try again.':e.name==='OverconstrainedError'||e.name==='NotFoundError'?'That microphone is disconnected. Open Switch mic and choose another.':'Could not open that microphone. Check its connection or choose another.');}
  if(ticket!==generation){captured.getTracks().forEach(t=>t.stop());return;}
  stream=captured;const track=stream.getAudioTracks()[0];
  track.onended=()=>{if(stream===captured){bridge.stopMic();bridge.feedback('Microphone disconnected. Open Switch mic to choose another.',true);}};
  try{recognition.start(track);}catch(e){release();throw Error('This browser could not use the selected microphone. Choose Browser default or use current desktop Chrome.');}
 }
 function restart(recognition){if(selected){const track=stream?.getAudioTracks()[0];if(!track||track.readyState!=='live')throw Error('Microphone disconnected.');recognition.start(track);}else recognition.start();}
 async function list(){devices=(await navigator.mediaDevices.enumerateDevices()).filter(d=>d.kind==='audioinput'&&d.deviceId);const picker=$('#micDevice');if(!picker)return;picker.innerHTML='<option value="">Browser default</option>'+devices.map((d,i)=>`<option value="${esc(d.deviceId)}">${esc(d.label||'Microphone '+(i+1))}</option>`).join('');if(selected&&!devices.some(d=>d.deviceId===selected))picker.insertAdjacentHTML('beforeend',`<option value="${esc(selected)}">Previously selected microphone · disconnected</option>`);picker.value=selected;}
 async function open(){
  const resume=bridge.isListening();bridge.stopMic();
  bridge.showDialog(`<h2>Switch microphone</h2><div class="micPicker">${selectable?'<label for="micDevice">Microphone</label><select id="micDevice"><option value="">Browser default</option></select><button id="refreshMics">Allow access / refresh microphones</button><p class="muted">Connect a headset or USB microphone, then refresh to see its name.</p>':'<p>Speech recognition on this browser uses your device’s audio input. Connect your preferred headset or microphone and select it in your device settings if available.</p><p class="muted">On Pixel, reconnect the headset before restarting listening. Chrome may still use the phone microphone; this browser does not offer a microphone picker for speech.</p>'}<p id="micNotice" role="status"></p><button id="applyMic" class="primary">${resume?'Apply & resume listening':selectable?'Use microphone':'Reconnect listening'}</button></div>`);
  if(selectable){try{await list();}catch{$('#micNotice').textContent='Allow microphone access to list connected inputs.';}
   $('#refreshMics').onclick=async()=>{const b=$('#refreshMics');b.disabled=true;let permissionStream;try{permissionStream=await navigator.mediaDevices.getUserMedia({audio:true,video:false});await list();if($('#micNotice'))$('#micNotice').textContent='Choose the microphone you want to use.';}catch{if($('#micNotice'))$('#micNotice').textContent='Microphone access was unavailable. Check Chrome permissions and try again.';}finally{permissionStream?.getTracks().forEach(t=>t.stop());b.disabled=false;}};
  }
  $('#applyMic').onclick=()=>{selected=selectable?$('#micDevice').value:'';try{localStorage.setItem(key,selected);}catch{}$('#dialog').close();bridge.feedback(selected?'Microphone selected. Tap Start listening when ready.':'Using your browser’s microphone.');if(resume||!selectable)bridge.startMic();};
 }
 navigator.mediaDevices?.addEventListener?.('devicechange',()=>{if($('#micDevice'))list().catch(()=>{});});
 return {start,restart,release,open};
}
