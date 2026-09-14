import assert from 'node:assert/strict';
import {audioMime,createClipRecorder,speechFailureMessage,transcriptText,transcribeWithPuter} from '../dist/puter-speech.js';

class Recorder{
 static isTypeSupported=type=>type==='audio/webm;codecs=opus';
 constructor(stream,options){assert.equal(stream,'mic');this.mimeType=options.mimeType;this.state='inactive';}
 start(){this.state='recording';}
 stop(){this.state='inactive';this.ondataavailable?.({data:new Blob(['audio'],{type:this.mimeType})});this.onstop?.();}
}
assert.equal(audioMime(Recorder),'audio/webm;codecs=opus');
assert.equal(transcriptText({text:'  35 scores a three  '}),'35 scores a three');
assert.equal(transcriptText('game over'),'game over');
assert.equal(speechFailureMessage({message:'Monthly quota exceeded'}),'Puter transcription credits are unavailable.');
assert.equal(speechFailureMessage({message:'Permission denied'}),'Puter transcription was not authorized.');
await assert.rejects(()=>transcribeWithPuter({ai:{speech2txt:()=>new Promise(()=>{})}},new Blob(['audio']),{},10),/timed out/);
const clips=[];const recorder=createClipRecorder({stream:'mic',Recorder,clipMs:60000,onClip:blob=>clips.push(blob),onError:error=>{throw error;}});recorder.start();recorder.stop();assert.equal(clips.length,1);assert.equal(clips[0].type,'audio/webm;codecs=opus');
const discarded=[];const cancelled=createClipRecorder({stream:'mic',Recorder,clipMs:60000,onClip:blob=>discarded.push(blob),onError:error=>{throw error;}});cancelled.start();cancelled.stop({flush:false});assert.equal(discarded.length,0);
console.log('PASS Puter transcript normalization, credit detection, supported audio selection, rolling clip flush and cancellation');
