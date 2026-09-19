/* 音效架構：目前用 Web Audio 合成簡單的提示音當佔位。
   之後有正式音檔時，把檔案放進 SOUND_FILES 對應的路徑即可自動改用音檔。 */
import { settings } from './save.js';

const SOUND_FILES = {
  // hit:'audio/hit.mp3',  ← 範例：放入音檔後取消註解
};
/* 合成音：[頻率, 長度秒, 波形, 頻率滑動目標] */
const SYNTH = {
  tap:[[660,.05,'triangle']],
  hit:[[180,.12,'square',90]],
  bigHit:[[140,.22,'sawtooth',60]],
  hurt:[[300,.15,'sawtooth',120]],
  dodge:[[520,.08,'sine',880]],
  heal:[[523,.08,'sine'],[659,.08,'sine'],[784,.12,'sine']],
  item:[[440,.06,'triangle'],[660,.08,'triangle']],
  boom:[[90,.35,'sawtooth',30]],
  roar:[[110,.35,'square',70]],
  win:[[523,.12,'triangle'],[659,.12,'triangle'],[784,.12,'triangle'],[1046,.3,'triangle']],
  lose:[[392,.2,'sine'],[330,.2,'sine'],[262,.4,'sine']],
  craft:[[880,.05,'square'],[1175,.1,'square']],
  gather:[[784,.06,'sine'],[988,.1,'sine']],
};
let ctx = null;
const buffers = {};
function ac(){
  if(!ctx){ const C = window.AudioContext||window.webkitAudioContext; if(!C) return null; ctx = new C(); }
  if(ctx.state==='suspended') ctx.resume();
  return ctx;
}
async function loadFile(name){
  if(buffers[name]!==undefined) return buffers[name];
  buffers[name] = null;
  try{ const a=ac(); const r=await fetch(SOUND_FILES[name]); buffers[name]=await a.decodeAudioData(await r.arrayBuffer()); }catch(e){}
  return buffers[name];
}
export function play(name){
  if(!settings.sfx) return;
  const a = ac(); if(!a) return;
  const vol = Math.max(0, Math.min(1, settings.sfxVol));
  if(SOUND_FILES[name]){
    loadFile(name).then(buf=>{ if(!buf) return; const s=a.createBufferSource(), g=a.createGain(); g.gain.value=vol; s.buffer=buf; s.connect(g).connect(a.destination); s.start(); });
    return;
  }
  const seq = SYNTH[name]; if(!seq) return;
  let t = a.currentTime;
  for(const [f,d,type,to] of seq){
    const o=a.createOscillator(), g=a.createGain();
    o.type=type; o.frequency.setValueAtTime(f,t); if(to) o.frequency.exponentialRampToValueAtTime(to,t+d);
    g.gain.setValueAtTime(.0001,t); g.gain.exponentialRampToValueAtTime(.25*vol+.0001,t+.01); g.gain.exponentialRampToValueAtTime(.0001,t+d);
    o.connect(g).connect(a.destination); o.start(t); o.stop(t+d+.02);
    t += d*.9;
  }
}
export function vibrate(ms){ if(settings.vibrate && navigator.vibrate && (!navigator.userActivation||navigator.userActivation.hasBeenActive)) try{ navigator.vibrate(ms); }catch(e){} }
/* 背景音樂：尚未提供音檔，保留開關與介面 */
export const BGM_AVAILABLE = false;
