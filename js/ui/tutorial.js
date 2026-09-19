/* 第 0 關・新手訓練：固定牌序與魔物行動的腳本戰鬥。
   每一步：說明文字、要框起來的元素、允許的操作（gate）、完成條件（until）。 */
import * as E from '../engine/battle.js';
import { B } from '../engine/battle.js';
import { getNeighbors, getDistance } from '../engine/hex.js';
import { CARDS_DB } from '../data/cards.js';
import { WEAPONS } from '../data/weapons.js';
import { play as sfx } from '../audio.js';
import { $, on, confirmBox } from './dom.js';
import { launchBattle, battleCtx, render } from './battle-view.js';
import { icon } from '../icons.js';

/* 教官要你做的動作，用黃字加箭頭標出來 */
const DO = t => `<span class="do">${icon('next')}${t}</span>`;

const POOL = [
  {name:'啄擊',range:'line',len:1,dmg:1,desc:'啄向正前方 1 格'},
  {name:'投石',range:'line',len:3,dmg:1,move:0,desc:'抱起石頭丟向前方 3 格'},
];
const DECK = ['basic','heavy','dodge','shield','basic','skill','trap','potion','bomb','basic','heavy','flash','basic','heavy','dodge','shield','potion','basic','heavy','skill'];

let idx = 0, opts = {}, active = false;
const h = () => B.hunters[0];
const mon = () => B.mon;
const inDanger = c => B.danger.some(z=>z.x===c.x&&z.y===c.y);
const handIdx = id => B.hand.findIndex(c=>c.id===id);
const handEl = (id, btn='card-play') => { const i=handIdx(id); return i<0?null:document.querySelector(`#hand-container [data-act="${btn}"][data-i="${i}"]`)?.closest('.card'); };
function ensureCard(id){
  if(handIdx(id)>=0) return;
  if(B.hand.length>=B.handSize){ const drop=B.hand.findIndex(c=>c.id!=='skill'&&c.id!=='trap'); B.hand.splice(drop<0?0:drop,1); }
  B.hand.push(CARDS_DB[id]);
}
const blockAll = msg => () => msg;
const only = (actions, msg) => (a) => actions.includes(a) ? true : msg;

/* ---------- 步驟 ---------- */
const STEPS = [
  {text:()=>`歡迎來到訓練場，${h().name}！我是教官。<br>今天的對手是<b>搔鳥</b>，牠很弱，放心練習。<br>跟著黃框一步一步來就好。`, next:true, gate:blockAll('先看完說明，按「下一步」')},
  {text:()=>'畫面上方是魔物的<b>血量</b>和<b>下一招預告</b>。<br>這回合搔鳥只是在觀察你，不會攻擊。', hl:()=>$('monster-intent-desc'), next:true, gate:blockAll('先看完說明，按「下一步」')},
  {text:()=>`<b>綠色格子</b>是你能走的地方，每格花 1 步。<br>你的${h().weapon.name}每回合有 <b>${h().maxMove} 步</b>。<br>${DO('走到搔鳥<b>旁邊的格子</b>！')}`,
    cells:()=>getNeighbors(h().x,h().y).filter(c=>getDistance(c.x,c.y,mon().x,mon().y)===1&&!E.isOccupied(c.x,c.y)),
    gate:(a,i)=>a==='move'?(getDistance(i.x,i.y,mon().x,mon().y)===1||'往黃框的格子走，要站在搔鳥旁邊'):a==='undo'||'先移動到搔鳥旁邊',
    until:()=>getDistance(h().x,h().y,mon().x,mon().y)===1},
  {text:()=>`站在魔物<b>相鄰格</b>就能攻擊。<br>${DO('按「基礎斬擊」的<b>打出</b>！')}`, enter:()=>ensureCard('basic'), hl:()=>handEl('basic'),
    gate:(a,i)=>a==='play'&&i.card.id==='basic'?true:'先打出「基礎斬擊」', until:(n,i)=>n==='play'&&i.card.id==='basic'},
  {text:()=>'命中！動完之後要按紅色的<b>結束回合</b>，魔物才會行動。<br>'+DO('按「結束回合」。'), hl:()=>$('btn-end'), gate:only(['endTurn'],'按紅色的「結束回合」'), until:n=>n==='turnStart'},
  {text:()=>'注意！<b>紅色斜紋</b>是搔鳥這回合會打到的格子。<br>你現在就站在裡面！', hl:()=>$('grid-wrap'), next:true, gate:blockAll('先看完說明，按「下一步」')},
  {text:()=>'步數不夠用時，可以把暫時用不到的牌丟掉換 <b>+1 步</b>。<br>'+DO('按攻擊牌下方的<b>「棄牌 +1步」</b>。')+'（防禦牌先留著，等等要用）',
    enter:()=>{ if(handIdx('heavy')<0&&handIdx('basic')<0) ensureCard('heavy'); },
    hl:()=>{ const i=[handIdx('heavy'),handIdx('basic')].find(x=>x>=0); return document.querySelector(`#hand-container [data-act="card-dash"][data-i="${i}"]`); },
    gate:(a,i)=>a==='discard'?(['basic','heavy'].includes(i.card.id)||'先丟攻擊牌，翻滾和舉盾等一下要用'):'按攻擊牌的「棄牌 +1步」',
    until:n=>n==='discard'},
  {text:()=>DO('現在<b>走出紅色區域</b>！'),
    cells:()=>getNeighbors(h().x,h().y).filter(c=>!inDanger(c)&&!E.isOccupied(c.x,c.y)),
    gate:(a,i)=>a==='move'?true:a==='undo'||a==='discard'||'先走出紅色區域',
    until:()=>!inDanger(h())},
  {text:()=>'安全了！<br>'+DO('結束回合，看搔鳥丟空。'), hl:()=>$('btn-end'), gate:only(['endTurn','move','undo','discard'],'按「結束回合」'), until:n=>n==='turnStart'},
  {text:()=>'下一招<b>猛撲</b>會鎖定你站的格子。<br>這次故意不讓你躲，來學<b>防禦牌</b>。<br>'+DO('直接按「結束回合」。'), hl:()=>$('btn-end'),
    enter:()=>{ ensureCard('dodge'); ensureCard('shield'); }, gate:only(['endTurn'],'這次先不要動，直接結束回合'), until:n=>n==='endTurn'},
  {text:()=>'魔物要打到你時，手上有<b>翻滾迴避</b>或<b>舉盾掩護</b>就會跳出這個視窗。<br>翻滾：完全閃躲。舉盾：減少傷害。<br>'+DO('選一個吧！'), top:true, gate:blockAll(''), until:n=>n==='defend'},
  {text:()=>`每把武器都有<b>職業技能</b>（耗 1 步）。<br>你的是【${h().weapon.skill.name}】：${h().weapon.skill.desc.replace('{dmg}',h().skillDmg)}<br>${DO('打出技能卡！')}`,
    wait:n=>n==='turnStart', enter:()=>ensureCard('skill'), hl:()=>handEl('skill'),
    cells:()=>getDistance(h().x,h().y,mon().x,mon().y)>1?getNeighbors(mon().x,mon().y).filter(c=>getDistance(c.x,c.y,h().x,h().y)===1&&!E.isOccupied(c.x,c.y)):[],
    gate:(a,i)=>a==='play'&&i.card.id==='skill'?true:a==='move'||a==='discard'||a==='undo'||'先打出職業技能卡', until:(n,i)=>n==='play'&&i.card.id==='skill'},
  {text:()=>'<b>陷阱</b>放在相鄰空格，魔物踩到會受傷並中斷攻擊。<br>魔物 HP 剩 30% 以下時踩到還能直接<b>捕獲</b>！<br>'+DO('打出「落穴陷阱」，再點旁邊發亮的空格。'),
    enter:()=>ensureCard('trap'), hl:()=>B.placement?$('grid-wrap'):handEl('trap'),
    gate:(a,i)=>(a==='play'&&i.card.id==='trap')||a==='place'?true:'先打出「落穴陷阱」並放好', until:(n,i)=>n==='play'&&i.card.id==='trap'},
  {text:()=>'陷阱放好了。<br>'+DO('結束回合，搔鳥會往陷阱走過來！'), hl:()=>$('btn-end'),
    enter:()=>{ E.planMonsterIntent(); }, gate:only(['endTurn'],'按「結束回合」'), until:n=>n==='turnStart'&&!B.traps.length},
  {text:()=>'漂亮！牠掉進陷阱了。<br>最後，用你學到的一切把<b>搔鳥打倒</b>吧！<br><span class="text-gray-400">道具還有爆彈桶、閃光彈等，按右上 '+icon('help')+' 可以看說明。</span>', gate:()=>true, done:true},
];

/* 魔物腳本 */
function scriptIntent(turn){
  if(turn===1) return {move:{name:'觀察',range:'none',move:0,dmg:0,desc:'搔鳥警戒地盯著你'}};
  if(turn===2) return {move:{name:'投石',range:'line',len:3,move:0,dmg:1,desc:'抱起石頭丟向你'}};
  if(turn===3){
    const hh=h(), m=mon();
    const to=getNeighbors(hh.x,hh.y).filter(c=>!E.isOccupied(c.x,c.y)).sort((a,b)=>getDistance(a.x,a.y,m.x,m.y)-getDistance(b.x,b.y,m.x,m.y))[0];
    return {move:{name:'猛撲',range:'target',len:0,dmg:2,desc:'撲向你所在的格子'}, to};
  }
  if(B.traps.length) return {move:{name:'追擊',range:'line',len:1,dmg:1,desc:'追向你'}, to:{x:B.traps[0].x,y:B.traps[0].y}};
  return null;
}

/* ---------- 遮罩與說明框 ---------- */
function showStep(){
  const s=STEPS[idx]; if(!s) return;
  if(s.enter && !s._entered){ s._entered=true; s.enter(); }
  render();
  const box=$('tut-box');
  box.innerHTML=`<div class="flex items-center justify-between mb-1"><span class="who">${icon('whistle')}教官・${Math.min(idx+1,STEPS.length)}/${STEPS.length}</span><button data-act="tut-skip" class="btn btn-link">跳過教學</button></div>
    <div class="text-[13px] leading-relaxed">${s.text()}</div>
    ${s.next?`<div class="text-right mt-2"><button data-act="tut-next" class="btn btn-sm btn-primary px-4">下一步${icon('next')}</button></div>`:''}
    ${s.done?`<div class="text-right mt-2"><button data-act="tut-hide" class="btn btn-sm btn-secondary">${icon('hide')}收起提示</button></div>`:''}`;
  box.classList.remove('hidden');
  place();
}
function place(){
  const s=STEPS[idx], ring=$('tut-ring'), box=$('tut-box');
  if(!active || !s || box.classList.contains('hidden')) { ring.classList.add('hidden'); return; }
  const el = s.hl ? s.hl() : (s.cells && s.cells().length ? $('grid-wrap') : null);
  if(el){
    const r=el.getBoundingClientRect(), pad=4;
    Object.assign(ring.style,{left:(r.left-pad)+'px',top:(r.top-pad)+'px',width:(r.width+pad*2)+'px',height:(r.height+pad*2)+'px'});
    ring.classList.remove('hidden');
    const low = r.top + r.height/2 > innerHeight*0.5;
    box.style.top = low||s.top ? '12px' : ''; box.style.bottom = low||s.top ? '' : '12px';
  } else {
    ring.classList.add('hidden');
    box.style.top = '12px'; box.style.bottom = '';
  }
  box.style.zIndex = s.top ? 95 : 89;
}
function advance(){
  idx++; sfx('tap');
  const s=STEPS[idx];
  if(s && s.wait){ s._waiting=true; $('tut-box').classList.add('hidden'); $('tut-ring').classList.add('hidden'); return; }
  E && B.active && setTimeout(()=>{ showStep(); }, 0);
}
function onEvent(name, info){
  if(!active) return;
  const s=STEPS[idx]; if(!s) return;
  if(name==='finish'){ end(); return; }
  if(s._waiting){ if(s.wait(name,info)){ s._waiting=false; showStep(); } return; }
  if(s.done){ if(['move','play','endTurn','discard'].includes(name)){ $('tut-box').classList.add('hidden'); $('tut-ring').classList.add('hidden'); } return; }
  if(s.until && s.until(name,info)) advance();
  else if(name==='turnStart'||name==='render') place();
}
function end(){
  active=false;
  $('tut-box').classList.add('hidden'); $('tut-ring').classList.add('hidden');
  const ctx=battleCtx(); ctx.highlightCells=null; ctx.afterRender=null;
}
on('tut-next', () => advance());
on('tut-hide', () => { $('tut-box').classList.add('hidden'); $('tut-ring').classList.add('hidden'); });
on('tut-skip', async () => {
  if(!(await confirmBox('跳過新手訓練？','第一章會直接開放。之後可以從任務板重玩訓練。','跳過','繼續訓練'))) return;
  E.abandon(); end(); opts.onSkip && opts.onSkip();
});
addEventListener('resize', () => active && place());

export function startTutorial(spec, o){
  opts=o; idx=0; active=true;
  STEPS.forEach(s=>{ delete s._entered; delete s._waiting; });
  const script = {
    intent:scriptIntent,
    gate:(a,i)=>{ const s=STEPS[idx]; if(!s||!s.gate) return true; if(s._waiting) return a==='endTurn'||a==='move'||a==='discard'||a==='undo'||'等一下'; return s.gate(a,i); },
    event:(n,i)=>{ /* 引擎事件在畫面更新後處理 */ queueMicrotask(()=>onEvent(n,i)); },
  };
  launchBattle({mode:'tutorial', questId:'q0-1', hunters:[{...spec}], deckOrder:DECK, deck:DECK,
    mons:[{key:'image023', hp:12, pool:POOL, dmgMod:0, name:'搔鳥（訓練用）'}], handSize:4, carts:3, turnLimit:null, objective:'hunt',
    startPos:[{x:3,y:5}], monPos:{x:3,y:3}, script},
    {title:'第 0 關・新手訓練', onFinish:r=>{ end(); opts.onFinish && opts.onFinish(r); }, onAbandon:()=>{ end(); opts.onAbandon && opts.onAbandon(); },
     abandonLabel:'離開訓練', abandonText:'這次訓練進度不會保存。想直接開放第一章，請改按「跳過教學」。',
     highlightCells:()=>{ const s=STEPS[idx]; return active&&s&&!s._waiting&&s.cells?s.cells():[]; },
     afterRender:()=>{ if(active) requestAnimationFrame(place); }});
  showStep();
}
export const tutState = () => ({active, idx, waiting:!!(STEPS[idx]&&STEPS[idx]._waiting), total:STEPS.length});
