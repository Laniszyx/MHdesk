/* 自由對戰：人數與武器 → 選魔物 → 組牌 → 戰鬥 → 結算 */
import { MONSTERS, TIER, SOLO_HP, movesetOf, monsterKey } from '../data/monsters.js';
import { WEAPONS, WEAPON_IDS } from '../data/weapons.js';
import { CARDS_DB, CARD_ORDER, cardDesc, DECK_PRESETS, DECK_RULES, deckTotal, deckItems, validateDeck } from '../data/cards.js';
import * as S from '../save.js';
import { play as sfx } from '../audio.js';
import { $, on, esc, page, modal, closeModal } from './dom.js';
import { launchBattle } from './battle-view.js';
import { go, registerNav } from './menu.js';

const ICONS = ['🗡️','🛡️','🔱','🔨','⚔️','🏹','🐱','🦊','🐺','🐉','🔥','⭐','🧑','👧','🧔','👩'];
const defaultCfg = () => ({count:2, hunters:[{name:'獵人一',icon:'🗡️',weapon:'gs'},{name:'獵人二',icon:'🛡️',weapon:'sns'}], monster:0, deck:{...DECK_PRESETS.balanced.counts}, tierTab:0});
let F = null, step = 1;

export function freeEntry(){
  F = JSON.parse(JSON.stringify(S.freeCfg || defaultCfg()));
  F.deck = {...Object.fromEntries(CARD_ORDER.map(k=>[k,0])), ...F.deck};
  if(!S.freeCfg){ step=1; return freeSetup(); }
  const m=MONSTERS[F.monster]||MONSTERS[0];
  page({title:'⚔️ 自由對戰', back:'go-menu', body:`
    <div class="space-y-3 pt-2">
      <button data-act="free-quick" class="menu-btn main"><span class="mi">⚡</span><span class="flex-1 min-w-0"><span class="block font-black">快速開始</span>
        <span class="block text-[11px] text-gray-300">沿用上次：${F.hunters.slice(0,F.count).map(h=>esc(h.name)+'（'+WEAPONS[h.weapon].name+'）').join('、')}</span>
        <span class="block text-[11px] text-gray-400">目標：${m.n}・牌組 ${deckTotal(F.deck)} 張</span></span></button>
      <button data-act="free-quick" data-random="1" class="menu-btn"><span class="mi">🎲</span><span class="flex-1"><span class="block font-black">快速開始・隨機魔物</span><span class="block text-[11px] text-gray-400">獵人和牌組沿用上次</span></span></button>
      <button data-act="free-custom" class="menu-btn"><span class="mi">🛠️</span><span class="flex-1"><span class="block font-black">自訂</span><span class="block text-[11px] text-gray-400">重新選人數、武器、魔物和牌組</span></span></button>
    </div>`});
}
on('go-menu', () => go('menu'));
on('free-quick', d => { if(d.random) F.monster=Math.floor(Math.random()*MONSTERS.length); startFree(); });
on('free-custom', () => { step=1; freeSetup(); });

/* ---------- 三步設定 ---------- */
function freeSetup(){
  const dots=[1,2,3].map(i=>`<div class="step-dot ${i<=step?'on':''}"></div>`).join('');
  const right=`<div class="flex gap-1.5 items-center pr-1">${dots}</div>`;
  let body='', footer='';
  if(step===1) body=stepHunters();
  if(step===2) body=stepMonster();
  if(step===3) body=stepDeck();
  const err = step===3 ? validateDeck(F.deck, DECK_RULES.free) : '';
  footer = `<button data-act="free-step" data-d="-1" class="tap btn-ghost px-4">← ${step===1?'返回':'上一步'}</button>
    <button data-act="free-step" data-d="1" class="tap btn-primary flex-1 py-3 text-base" ${err?'disabled':''}>${step<3?'下一步 ➔':err?err:'🔥 開始狩獵'}</button>`;
  page({title:'⚔️ 自由對戰', sub:['','STEP 1・獵人與武器','STEP 2・選擇狩獵目標','STEP 3・構築共用牌組'][step], back:'go-menu', right, body, footer});
  if(step===2) updatePreview();
}
on('free-step', d => {
  const n=step+(+d.d);
  if(n<1){ return S.freeCfg ? freeEntry() : go('menu'); }
  if(step===1) readHunterInputs();
  if(n>3){ startFree(); return; }
  step=n; sfx('tap'); freeSetup();
});

function stepHunters(){
  const hunterBox = i => { const h=F.hunters[i];
    return `<div class="panel p-3">
      <div class="font-black ${i?'text-blue-400':'text-red-400'} text-sm mb-2">獵人 ${i+1}</div>
      <div class="flex gap-2 mb-2">
        <label class="flex-1 min-w-0"><span class="block text-[10px] text-gray-500 mb-0.5">名字</span>
          <input id="fh-name-${i}" value="${esc(h.name)}" maxlength="8" class="w-full bg-black/40 border border-gray-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-400"></label>
        <label class="w-16 shrink-0"><span class="block text-[10px] text-gray-500 mb-0.5">頭像</span>
          <button data-act="free-icon" data-i="${i}" class="w-full bg-black/40 border border-gray-700 rounded-lg py-1.5 text-xl">${h.icon}</button></label>
      </div>
      <div class="grid grid-cols-5 gap-1.5">${WEAPON_IDS.map(w=>`<button data-act="free-weapon" data-i="${i}" data-w="${w}" class="wpn-pick ${h.weapon===w?'sel':''}"><div class="text-xl">${WEAPONS[w].icon}</div><div class="text-[10px] font-bold mt-0.5">${WEAPONS[w].name}</div></button>`).join('')}</div>
      <div class="text-[10px] text-gray-400 mt-2 leading-snug">${weaponLine(h.weapon)}</div>
    </div>`; };
  return `<div class="space-y-3 pt-1">
    <div class="panel p-3"><div class="text-[11px] text-gray-400 mb-1.5">人數</div>
      <div class="seg">${[1,2].map(n=>`<button class="${F.count===n?'on':''}" data-act="free-count" data-n="${n}">${n===1?'👤 單人':'👥 雙人合作'}</button>`).join('')}</div>
      <div class="text-[10px] text-gray-400 mt-1.5">${F.count===1?'魔物 HP 較低（★18／★★26／★★★36），手牌 4 張，倒下時貓車送回起點（3 次）':'兩人輪流操作、共用手牌 3 張，魔物 HP 較高（★30／★★40／★★★55），全員倒下才失敗'}</div></div>
    ${hunterBox(0)}${F.count===2?hunterBox(1):''}
  </div>`;
}
export const weaponLine = w => { const W=WEAPONS[w]; return `<b class="text-amber-200">${W.name}</b>：${W.tag}・HP ${W.hp}・${W.move} 步・攻擊 ${W.atk}<br>技能【${W.skill.name}】${W.skill.desc.replace('{dmg}',W.skill.dmg)}<br>被動：${W.passive}`; };
function readHunterInputs(){ for(let i=0;i<2;i++){ const el=$('fh-name-'+i); if(el) F.hunters[i].name=el.value.trim()||('獵人'+(i?'二':'一')); } }
on('free-count', d => { readHunterInputs(); F.count=+d.n; freeSetup(); });
on('free-weapon', d => { readHunterInputs(); F.hunters[+d.i].weapon=d.w; sfx('tap'); freeSetup(); });
on('free-icon', async d => {
  readHunterInputs();
  const v = await modal(`<h2 class="text-lg font-black mb-3">選擇頭像</h2><div class="grid grid-cols-4 gap-2">${ICONS.map(ic=>`<button data-act="pick-icon" data-v="${ic}" class="tap text-2xl panel py-2">${ic}</button>`).join('')}</div>`,[{label:'取消',value:null}],{dismiss:null});
  if(v){ F.hunters[+d.i].icon=v; } freeSetup();
});
on('pick-icon', d => closeModal(d.v));
export const iconPickerHtml = () => `<div class="grid grid-cols-4 gap-2">${ICONS.map(ic=>`<button data-act="pick-icon" data-v="${ic}" class="tap text-2xl panel py-2">${ic}</button>`).join('')}</div>`;

function stepMonster(){
  const tabs=['全部','★','★★','★★★'];
  const list=MONSTERS.map((m,i)=>({m,i})).filter(o=>!F.tierTab||o.m.t===F.tierTab);
  return `<div class="flex gap-2 items-center my-1">
      <div class="tabs flex-1">${tabs.map((t,i)=>`<button class="${F.tierTab===i?'on':''}" data-act="free-tier" data-t="${i}">${t}</button>`).join('')}</div>
      <button data-act="free-random" class="tap btn-ghost px-3 text-xs shrink-0">🎲 隨機</button></div>
    <div id="mon-preview" class="panel p-3 flex items-center gap-3 my-2"></div>
    <div class="grid grid-cols-4 gap-2">${list.map(({m,i})=>{ const wins=(S.records.hunts[m.f]||{}).wins||0;
      return `<button data-act="free-mon" data-i="${i}" class="mon-pick ${i===F.monster?'sel':''}"><img src="${m.f}" alt="${m.n}"><span class="tier ${TIER[m.t].cls}">${TIER[m.t].label}</span>${wins?`<span class="tier bg-green-600 text-white" style="right:auto;left:4px;top:auto;bottom:4px">✓${wins}</span>`:''}</button>`; }).join('')}</div>`;
}
function updatePreview(){
  const m=MONSTERS[F.monster], t=TIER[m.t], hp=F.count===1?SOLO_HP[m.t]:t.hp;
  $('mon-preview').innerHTML=`<div class="w-16 h-16 rounded-xl bg-white p-1 shrink-0"><img src="${m.f}" class="w-full h-full object-contain" alt=""></div>
    <div class="flex-1 min-w-0"><div class="font-black text-lg text-red-300 truncate">${m.n}</div>
    <div class="text-[11px] text-gray-400">${t.label}・HP ${hp}・攻擊修正 ${t.dmg>=0?'+':''}${t.dmg}</div>
    <div class="text-[11px]"><span class="text-amber-300">獨家招式：</span>${movesetOf(m.f).s.map(a=>a.name).join('／')}</div></div>`;
}
on('free-tier', d => { F.tierTab=+d.t; freeSetup(); });
on('free-mon', d => { F.monster=+d.i; sfx('tap'); document.querySelectorAll('.mon-pick.sel').forEach(e=>e.classList.remove('sel')); document.querySelector(`[data-act="free-mon"][data-i="${d.i}"]`).classList.add('sel'); updatePreview(); });
on('free-random', () => { const list=MONSTERS.map((m,i)=>i).filter(i=>!F.tierTab||MONSTERS[i].t===F.tierTab); F.monster=list[Math.floor(Math.random()*list.length)]; freeSetup(); });

function stepDeck(){
  const t=deckTotal(F.deck), it=deckItems(F.deck), err=validateDeck(F.deck,DECK_RULES.free);
  return `<div class="panel p-2 my-1 flex items-center justify-around text-center">
      <div><div class="text-[10px] text-gray-400">總牌數</div><div class="font-black text-lg">${t}<span class="text-gray-500 text-xs">/30</span></div></div>
      <div><div class="text-[10px] text-gray-400">道具卡</div><div class="font-black text-lg">${it}<span class="text-gray-500 text-xs">/10</span></div></div>
      <div class="text-[11px] text-red-400 font-bold w-28">${err}</div></div>
    <div class="text-[11px] text-gray-400 mt-2 mb-1">預設牌組</div>
    <div class="grid grid-cols-3 gap-2 mb-3">${Object.entries(DECK_PRESETS).map(([k,p])=>`<button data-act="free-preset" data-k="${k}" class="panel p-2 text-left"><div class="text-xs font-black">${p.name}</div><div class="text-[9px] text-gray-400 leading-tight">${p.desc}</div></button>`).join('')}</div>
    ${deckListHtml(F.deck, 'free-adj', null, F.count===1?F.hunters[0]:null)}`;
}
/* 牌組清單（自由對戰與劇情共用）。limits = 每張上限（劇情用持有數），null 表示不限 */
export function deckListHtml(counts, act, limits, hunterSpec){
  const h = hunterSpec ? {weapon:WEAPONS[hunterSpec.weapon], atk:WEAPONS[hunterSpec.weapon].atk+((hunterSpec.wlv||1)-1), skillDmg:WEAPONS[hunterSpec.weapon].skill.dmg+((hunterSpec.wlv||1)-1)} : null;
  return `<div class="space-y-2">${CARD_ORDER.filter(id=>!limits||limits[id]>0).map(id=>{ const c=CARDS_DB[id], n=counts[id]||0, lim=limits?limits[id]:null;
    return `<div class="panel p-2 flex items-center gap-2">
      <div class="w-9 h-9 rounded-lg flex items-center justify-center text-lg card ${c.type} !p-0" style="flex:0 0 36px">${c.glyph}</div>
      <div class="flex-1 min-w-0"><div class="text-sm font-bold">${id==='skill'&&h?h.weapon.skill.name:c.name} ${c.isItem?'<span class="text-[9px] bg-amber-900 text-amber-300 px-1 rounded">道具</span>':''}${lim!=null?`<span class="text-[9px] text-gray-500 ml-1">持有 ${lim}</span>`:''}</div><div class="text-[10px] text-gray-400 leading-tight">${cardDesc(c,h)}</div></div>
      <div class="flex items-center gap-1 shrink-0">
        <button data-act="${act}" data-id="${id}" data-d="-1" class="tap w-9 rounded-lg bg-gray-700 font-black" ${n<=0?'disabled':''}>−</button>
        <span class="w-6 text-center font-black">${n}</span>
        <button data-act="${act}" data-id="${id}" data-d="1" class="tap w-9 rounded-lg bg-gray-700 font-black" ${lim!=null&&n>=lim?'disabled':''}>+</button>
      </div></div>`; }).join('')}</div>`;
}
on('free-adj', d => { const n=(F.deck[d.id]||0)+(+d.d); if(n<0) return; F.deck[d.id]=n; const y=$('screen-view').querySelector('.page-body').scrollTop; freeSetup(); $('screen-view').querySelector('.page-body').scrollTop=y; });
on('free-preset', d => { F.deck={...Object.fromEntries(CARD_ORDER.map(k=>[k,0])), ...DECK_PRESETS[d.k].counts}; sfx('tap'); freeSetup(); });

/* ---------- 開戰與結算 ---------- */
const expandDeck = counts => Object.entries(counts).flatMap(([id,n])=>Array(n||0).fill(id));
function startFree(){
  S.saveFreeCfg(F);
  const m=MONSTERS[F.monster];
  const cfg={mode:'free', hunters:F.hunters.slice(0,F.count).map(h=>({...h, wlv:1, alv:1})), deck:expandDeck(F.deck),
    mons:[{key:monsterKey(m)}], carts:F.count===1?3:null, turnLimit:null, objective:'hunt'};
  launchBattle(cfg, {title:`自由對戰・${m.n}`, onFinish:freeResult, onAbandon:r=>{ recordFree(r); go('menu'); }, abandonText:'這場戰鬥會記為失敗。'});
}
function recordFree(r){
  const g={win:r.win, turns:r.turns, damageTaken:r.stats.damageTaken, lastHit:r.stats.lastHit, downed:r.stats.downed, captured:r.stats.captured};
  let fresh=[];
  r.killed.forEach(k=>{ fresh=fresh.concat(S.recordResult(k.img,true,{...g,win:true})); });
  if(!r.win && r.mon) fresh=fresh.concat(S.recordResult(r.mon.img,false,g));
  return fresh;
}
export function achHtml(fresh){ return fresh.map(a=>`<div class="panel px-3 py-2 flex items-center gap-2 border-amber-500/60 text-left"><span class="text-2xl">${a.icon}</span><div><div class="text-[10px] text-amber-400 font-bold">🏅 新成就解鎖</div><div class="text-sm font-black">${a.name}</div><div class="text-[10px] text-gray-400">${a.desc}</div></div></div>`).join(''); }
async function freeResult(r){
  const fresh=recordFree(r), m=r.mon, h=S.records.hunts[m.img]||{wins:0,bestTurn:null};
  const title=r.win?(r.stats.captured?'🪤 捕獲成功！':'🎉 狩獵成功！'):'💀 任務失敗';
  const sub=r.win?`第 ${r.turns} 回合${r.stats.captured?'捕獲':'討伐'} ${m.name}（此魔物 ${h.wins} 勝${h.bestTurn?'・最快 '+h.bestTurn+' 回':''}）`:`${r.reason}${m.hp>0?`（${m.name} 仍剩 ${m.hp} HP）`:''}`;
  const v = await modal(`<div class="text-center"><div class="w-28 h-28 mx-auto rounded-2xl bg-white p-2 mb-3 shadow-2xl"><img src="${m.img}" class="w-full h-full object-contain" alt=""></div>
    <h2 class="text-3xl font-black mb-1 ${r.win?'text-green-400':'text-red-500'}">${title}</h2><p class="text-gray-400 text-sm mb-3">${sub}</p>
    <div class="space-y-1.5">${achHtml(fresh)}</div></div>`,
    [{label:'🔁 再打一次',cls:'btn-primary',value:'again'},{label:'🐲 換魔物',value:'change'},{label:'🏆 紀錄',value:'records'},{label:'🏠 主選單',value:'menu'}]);
  if(v==='again') startFree();
  else if(v==='change'){ step=2; freeSetup(); }
  else if(v==='records') go('records','free');
  else go('menu');
}
registerNav({free:freeEntry, freeSetupStep:(n)=>{ step=+n||1; F=F||JSON.parse(JSON.stringify(S.freeCfg||defaultCfg())); freeSetup(); }});
