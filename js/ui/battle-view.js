/* 戰鬥畫面：把引擎狀態畫出來，並實作引擎需要的 hooks */
import * as E from '../engine/battle.js';
import { B } from '../engine/battle.js';
import { GRID_SIZE, getNeighbors } from '../engine/hex.js';
import { FX, TIER } from '../data/monsters.js';
import { cardDesc } from '../data/cards.js';
import { WEAPONS } from '../data/weapons.js';
import { settings, saveSettings } from '../save.js';
import { play as sfx } from '../audio.js';
import { $, on, toast, announce, toggleDrawer, wait, instant, modal, closeModal, confirmBox, showScreen } from './dom.js';

let ctx = {};          // {onFinish(result), onAbandon(), eventListener}
export const battleCtx = () => ctx;

/* ---------- 啟動 ---------- */
export function launchBattle(cfg, opts={}){
  ctx = opts;
  E.setHooks({render, log:logMsg, fx:spawnFx, shake, toast, wait, banner, defend:defensePrompt, announce,
    event:(n,i)=>{ if(ctx.eventListener) ctx.eventListener(n,i); },
    finish:r=>{ setTimeout(()=>ctx.onFinish && ctx.onFinish(r), instant?0:700); }});
  $('battle-log').innerHTML=''; $('mini-log').innerHTML='';
  toggleDrawer('help',false); toggleDrawer('log',false);
  showScreen('game');
  generateGrid();
  renderHelp();
  E.startBattle(cfg);
}

/* ---------- 效果 ---------- */
function logMsg(msg, alert=false){
  const b=$('battle-log'), e=document.createElement('div');
  e.innerHTML=msg; if(alert) e.className='text-amber-300 font-bold';
  b.appendChild(e); b.scrollTop=b.scrollHeight;
  const rows=[...b.children].slice(-2);
  $('mini-log').innerHTML=rows.map(r=>`<div class="truncate ${r.className}">${r.innerHTML}</div>`).join('');
}
function shake(){ const g=$('grid-wrap'); g.classList.remove('shake'); void g.offsetWidth; g.classList.add('shake'); }
function spawnFx(x,y,html){
  const cell=$(`cell-${x}-${y}`); if(!cell) return;
  const f=document.createElement('div'); f.className='fx';
  Object.assign(f.style,{left:cell.style.left,top:cell.style.top,width:cell.style.width,height:cell.style.height});
  f.innerHTML=html; $('grid-container').appendChild(f); setTimeout(()=>f.remove(),750);
}
async function banner(main, sub=''){
  if(instant) return;
  const b=$('banner'); b.querySelector('.b-main').innerHTML=main; b.querySelector('.b-sub').innerHTML=sub||'&nbsp;';
  b.classList.add('show'); await wait(750); b.classList.remove('show'); await wait(120);
}
function defensePrompt(h, dmg, src, opt){
  return new Promise(res=>{
    const m=$('defense-modal');
    $('def-target').innerText=h.name; $('def-dmg').innerText=dmg; $('def-source').innerText=src;
    $('btn-use-shield').innerHTML=`🛡️ 舉盾掩護 ・ 減免 ${opt.shieldCut} 點`;
    const wire=(id,show,val)=>{ const old=$(id), nb=old.cloneNode(true); old.parentNode.replaceChild(nb,old); nb.classList.toggle('hidden',!show); nb.onclick=()=>{ m.classList.add('hidden'); res(val); }; };
    wire('btn-use-dodge',opt.dodge,'dodge'); wire('btn-use-shield',opt.shield,'shield'); wire('btn-take-dmg',true,'take');
    m.classList.remove('hidden');
  });
}

/* ---------- 棋盤 ---------- */
function generateGrid(){
  const c=$('grid-container'); c.innerHTML='';
  const W=100/7.5, H=100/5.5;
  for(let y=0;y<GRID_SIZE;y++) for(let x=0;x<GRID_SIZE;x++){
    const cell=document.createElement('div'); cell.className='hex'; cell.id=`cell-${x}-${y}`;
    cell.style.left=`${x*W+(y%2?W/2:0)}%`; cell.style.top=`${y*H*.75}%`; cell.style.width=`${W}%`; cell.style.height=`${H}%`;
    cell.onclick=()=>E.clickCell(x,y);
    c.appendChild(cell);
  }
}
const statusPills = h => Object.keys(h.st).filter(k=>h.st[k]>0).map(k=>`<span class="status-pill" title="${FX[k].label}">${FX[k].icon}${h.st[k]}</span>`).join('');

export function render(){
  if(!B.active) return;
  const m=B.mon, alive=E.monAlive(), ap=E.curHunter();
  /* 魔物資訊 */
  $('hud-mon-img').src=m.img; $('hud-mon-name').innerHTML=`${m.name} <span class="text-[9px] text-gray-400">${TIER[m.tier].label}</span>${E.capturable()?' <span class="chip bg-emerald-700 text-white">可捕獲</span>':''}`;
  $('monster-hp-bar').style.width=`${Math.max(0,m.hp/m.maxHp*100)}%`;
  $('monster-hp-text').innerText=`${Math.max(0,m.hp)}/${m.maxHp}`;
  $('cap-mark').classList.toggle('hidden', !(m.tier<3 && (B.cfg.objective==='capture' || B.cfg.mode!=='tutorial')));
  const mst=(m.fly>0?'🕊️飛行 ':'')+(m.armor>0?'🛡️硬化 ':'')+(m.enraged?'🔥狂暴 ':'')+(m.dizzyImmune>0&&!m.dizzy?'（暈眩抗性）':'');
  let iname, idesc;
  if(!alive){ iname = m.captured?'🪤 已捕獲':'💀 已討伐'; idesc = B.cfg.objective==='gather'?'魔物已倒下，安心採集吧':'—'; }
  else if(m.dizzy){ iname=`${mst}💫 暈眩中`; idesc='本回合魔物不會移動，也不會攻擊'; }
  else if(m.blinded){ iname=`${mst}😵 攻擊被取消`; idesc='本回合魔物仍會移動，但不會攻擊'; }
  else if(m.intent){ iname=`${mst}⚠️ ${m.intent.name}${m.intent.dmg>0?` (${m.intent.dmg}傷)`:''}`; idesc=`${m.intent.desc}${m.intent.fx?'　'+m.intent.fx:''}`; }
  else { iname=mst||'…'; idesc=''; }
  $('monster-intent-name').innerText=iname; $('monster-intent-desc').innerText=idesc;
  $('turn-display').innerText=`第 ${B.turn} 回合`;
  renderObjective();
  /* 獵人卡 */
  const solo=B.hunters.length===1;
  $('hunter-cards').innerHTML=B.hunters.map(h=>{
    const on=B.cur===h.id, dead=!E.alive(h);
    const extra=[h.weapon.id==='ls'?`<span class="text-sky-300">練氣 ${'●'.repeat(h.spirit)}${'○'.repeat(3-h.spirit)}</span>`:'', h.dashBuff?'<span class="text-lime-300">🧪</span>':''].filter(Boolean).join(' ');
    return `<div data-act="hunter-select" data-i="${h.id}" class="tap hunter-card panel px-2 py-1.5 flex items-center gap-2 border-2" style="border-color:${on&&!solo?'var(--amber)':'transparent'};opacity:${dead?.4:1}">
      <span class="text-xl">${h.icon}</span>
      <div class="flex-1 min-w-0">
        <div class="flex justify-between text-[11px] gap-1"><b class="${h.color==='red'?'text-red-300':'text-blue-300'} truncate">${h.name}</b><span class="text-gray-300 shrink-0">${Math.max(0,h.hp)}/${h.maxHp}</span></div>
        <div class="bar bar-green mt-0.5" style="height:6px"><div style="width:${Math.max(0,h.hp/h.maxHp*100)}%"></div></div>
        <div class="text-[10px] text-gray-400 mt-0.5 flex items-center gap-1 flex-wrap">步數 <span class="text-white font-black">${h.move}</span><span class="text-gray-600">/${h.maxMove}</span>
          <span class="text-gray-500">${h.weapon.icon}${solo?h.weapon.name+' Lv'+h.wlv:''}</span>${statusPills(h)} ${extra}</div>
      </div></div>`;
  }).join('');
  /* 棋盤 */
  const reach=(ap&&E.alive(ap)&&ap.move>0&&!B.placement&&!B.over)?getNeighbors(ap.x,ap.y).filter(n=>!E.isOccupied(n.x,n.y)):[];
  const placeable=B.placement?getNeighbors(ap.x,ap.y).filter(n=>!E.isOccupied(n.x,n.y)&&!E.hasItemAt(n.x,n.y)):[];
  const showPlan = alive && !m.blinded && !m.dizzy && settings.preview;
  for(let y=0;y<GRID_SIZE;y++) for(let x=0;x<GRID_SIZE;x++){
    const cell=$(`cell-${x}-${y}`); if(!cell) continue;
    let html='', cls='hex';
    const trap=B.traps.find(t=>t.x===x&&t.y===y);
    if(trap){ cls+=' item'; html+=`<span class="absolute text-xl">${trap.type==='shock'?'🌩️':'🕳️'}</span>`; }
    if(B.bombs.some(b=>b.x===x&&b.y===y)){ cls+=' item'; html+='<span class="absolute text-xl">💣</span>'; }
    if(B.gathers.some(g=>g.x===x&&g.y===y)){ cls+=' gather'; html+='<span class="absolute text-xl">🌿</span>'; }
    if(reach.some(n=>n.x===x&&n.y===y)||placeable.some(n=>n.x===x&&n.y===y)) cls+=' reach';
    if(showPlan && m.px===x && m.py===y && (m.px!==m.x||m.py!==m.y)){ cls+=' phantom'; html+=`<img src="${m.img}" class="mon-img ghost absolute" alt="">`; }
    if(showPlan && B.danger.some(z=>z.x===x&&z.y===y)) cls+=' danger';
    if(alive && m.x===x && m.y===y){ html+=`<img src="${m.img}" class="mon-img relative" alt="">`; if(m.dizzy) html+='<span class="absolute text-lg" style="top:-4px;z-index:25">💫</span>'; else if(m.fly>0) html+='<span class="absolute text-lg" style="top:-4px;z-index:25">🕊️</span>'; }
    B.hunters.forEach(h=>{ if(E.alive(h)&&h.x===x&&h.y===y) html+=`<div class="hunter-token ${B.cur===h.id?'active':''}">${h.icon}</div>`; });
    if(cell.className!==cls) cell.className=cls;
    if(cell._html!==html){ cell.innerHTML=html; cell._html=html; }
  }
  if(ctx.highlightCells) ctx.highlightCells().forEach(c=>{ const el=$(`cell-${c.x}-${c.y}`); if(el) el.classList.add('target-hl'); });
  /* 手牌與按鈕 */
  renderHand();
  $('placement-hint').classList.toggle('hidden',!B.placement);
  $('deck-count').innerText=B.deck.length; $('discard-count').innerText=B.discard.length; $('removed-count').innerText=B.removed.length;
  $('hand-count').innerText=B.hand.length; $('hand-max').innerText=B.handSize;
  $('btn-undo').classList.toggle('hidden', !B.undo.length || B.over);
  $('btn-gather').classList.toggle('hidden', !(ap && B.gathers.some(g=>g.x===ap.x&&g.y===ap.y)) || B.over);
  $('btn-end').disabled = B.processing || B.over;
  if(ctx.afterRender) ctx.afterRender();
}
function renderObjective(){
  const bar=$('objective-bar'), c=B.cfg;
  if(c.mode==='free' && !c.turnLimit && c.carts==null){ bar.classList.add('hidden'); return; }
  let goal='';
  const total=c.mons.length, idx=B.killed.length+(E.monAlive()?1:0);
  if(c.objective==='gather') goal=`🌿 採集 <b>${B.gathered}/${c.gather.need}</b>`;
  else if(c.objective==='capture') goal=`🪤 捕獲 ${B.mon.name}（HP 30% 以下踩陷阱）`;
  else if(c.mode==='tutorial') goal='🎓 新手訓練';
  else goal=`🎯 討伐 ${B.mon.name}${total>1?`（${Math.min(idx,total)}/${total}）`:''}`;
  const right=[];
  const tl=E.turnsLeft(); if(tl!==null) right.push(`<span class="${tl<=3?'text-red-300 font-black':''}">⏳ 剩 ${Math.max(0,tl)} 回合</span>`);
  if(c.carts!=null) right.push(`🐱 ${B.cartsUsed}/${c.carts}`);
  bar.innerHTML=`<span class="truncate">${goal}</span><span class="shrink-0">${right.join(' ・ ')}</span>`;
  bar.classList.remove('hidden');
}
function renderHand(){
  const c=$('hand-container'), h=E.curHunter();
  c.classList.toggle('hand-4', B.hand.length>=4);
  c.innerHTML=B.hand.map((card,i)=>{
    const {ok,hint}=E.canPlay(card,h);
    const placing=B.placement&&B.placement.idx===i;
    return `<div class="card ${card.type}" ${placing?'style="outline:2px solid #fde68a"':''}>
      <div class="flex items-center gap-1"><span class="text-base">${card.glyph}</span><b class="text-[11px] truncate">${card.id==='skill'?h.weapon.skill.name:card.name}</b></div>
      <div class="text-[9px] text-gray-300 leading-tight flex-1 clamp3">${cardDesc(card,h)}</div>
      <div class="flex flex-col gap-1 mt-1">
        <button class="cbtn play" data-act="card-play" data-i="${i}" ${ok&&!B.over?'':'disabled'}>${ok?'打出':hint}</button>
        <button class="cbtn dash" data-act="card-dash" data-i="${i}" ${B.over?'disabled':''}>棄牌 +1步</button></div></div>`;
  }).join('');
}

/* ---------- 操作 ---------- */
on('card-play', d => E.playCard(+d.i));
on('card-dash', d => E.discardForMove(+d.i));
on('hunter-select', d => E.selectHunter(+d.i));
on('undo', () => E.undoMove());
on('gather', () => E.gatherHere());
on('cancel-place', () => E.cancelPlacement());
on('end-turn', async () => {
  if(!E.canAct()) return;
  const pend = settings.confirmEnd && !(B.cfg.script) ? E.pendingActions() : [];
  if(pend.length){
    const r = await modal(`<h2 class="text-lg font-black mb-2">確定結束回合？</h2><ul class="text-sm text-gray-300 list-disc pl-5 space-y-1">${pend.map(p=>`<li>${p}</li>`).join('')}</ul>`,
      [{label:'結束回合',cls:'btn-danger',value:'end'},{label:'再想想',value:'no'},{label:'結束，之後不再提示',value:'never'}],{dismiss:'no'});
    if(r==='no') return;
    if(r==='never'){ settings.confirmEnd=false; saveSettings(); toast('可在設定重新開啟'); }
  }
  E.endTurn();
});

/* ---------- 暫停 ---------- */
function quickSettingsHtml(){
  const sw=(k,label)=>`<div class="set-row"><span class="text-sm">${label}</span><button class="switch ${settings[k]?'on':''}" data-act="qset" data-key="${k}"></button></div>`;
  return `<div class="panel mt-3 text-left">
    <div class="set-row"><span class="text-sm">動畫速度</span><div class="seg w-40">${[['fast','快'],['normal','正常'],['slow','慢']].map(([k,l])=>`<button class="${settings.speed===k?'on':''}" data-act="qspeed" data-v="${k}">${l}</button>`).join('')}</div></div>
    ${sw('sfx','音效')}${sw('confirmEnd','結束回合前確認')}${sw('preview','顯示魔物預警格')}</div>`;
}
on('qset', d => { settings[d.key]=!settings[d.key]; saveSettings(); $('pause-set').innerHTML=quickSettingsHtml(); if(B.active) render(); });
on('qspeed', d => { settings.speed=d.v; saveSettings(); $('pause-set').innerHTML=quickSettingsHtml(); });
on('pause', async () => {
  if(!B.active || B.over) return;
  sfx('tap');
  const r = await modal(`<h2 class="text-xl font-black text-center">⏸️ 暫停</h2><div class="text-center text-[11px] text-gray-400 mt-1">${ctx.title||''}</div><div id="pause-set">${quickSettingsHtml()}</div>`,
    [{label:'▶ 繼續',cls:'btn-primary',value:'go'},{label:'❓ 怎麼玩',value:'help'},{label:ctx.abandonLabel||'🏳️ 放棄任務',cls:'bg-red-950 border border-red-800 text-red-200',value:'quit'}],{dismiss:'go'});
  if(r==='help') toggleDrawer('help',true);
  if(r==='quit'){
    const ok = await confirmBox('放棄任務？', ctx.abandonText||'這場戰鬥會算失敗。', '放棄', '繼續狩獵', true);
    if(ok){ E.abandon(); ctx.onAbandon && ctx.onAbandon(B.result); }
  }
});

/* ---------- 說明 ---------- */
function renderHelp(){
  const w=Object.values(WEAPONS).map(w=>`<div class="mt-1"><b>${w.icon} ${w.name}</b> <span class="text-gray-400">HP ${w.hp}・${w.move} 步・攻擊 ${w.atk}</span><br><span class="text-amber-200">${w.skill.name}</span>：${w.skill.desc.replace('{dmg}',w.skill.dmg)}<br><span class="text-gray-400">被動：${w.passive}</span></div>`).join('');
  $('help-body').innerHTML=`
    <div class="panel p-3"><b class="text-amber-300">每回合流程</b>
      <ol class="list-decimal pl-4 mt-1 space-y-1">
        <li>雙人時點下方獵人卡切換操作對象（或直接點地圖上的獵人）。</li>
        <li>點<span class="text-green-300">綠色格</span>移動，每格耗 1 步。走錯可按「↶ 撤回」。</li>
        <li>走到魔物<b>相鄰格</b>後打出攻擊牌。打不出去時按鈕會直接寫原因。</li>
        <li>動完按紅色「結束回合」，魔物才會行動。</li>
      </ol></div>
    <div class="panel p-3"><b class="text-amber-300">手牌上的兩顆按鈕</b>
      <div class="mt-1"><b class="text-yellow-300">打出</b>：使用這張牌的效果。</div>
      <div class="mt-1"><b class="text-gray-100">棄牌 +1步</b>：<u>不使用效果</u>，把牌丟進棄牌堆，換目前獵人 +1 步。棄掉的牌之後會洗回牌庫。</div>
      <div class="mt-1"><b class="text-blue-300">被動</b>：翻滾／舉盾只會在你要受傷時自動跳出視窗問你要不要用。</div></div>
    <div class="panel p-3"><b class="text-amber-300">看懂地圖</b>
      <div class="mt-1"><span class="inline-block w-3 h-3 rounded-sm align-middle" style="background:#6b3a8a"></span> 半透明魔物 = 牠這回合會走到的位置。</div>
      <div class="mt-1"><span class="inline-block w-3 h-3 rounded-sm align-middle" style="background:#7a1f24"></span> 紅色斜紋 = 牠這次攻擊會打到的格子。</div>
      <div class="mt-1">魔物撞到站在牠目的格的獵人會把人推退 1 格，撞到邊緣受 3 傷。</div>
      <div class="mt-1">🌿 採集點：站上去按「採集」（耗 1 步）。</div></div>
    <div class="panel p-3"><b class="text-amber-300">武器</b>${w}</div>
    <div class="panel p-3"><b class="text-amber-300">魔物招式與狀態</b>
      <div class="mt-1">🐌 減速：下回合 -1 步　⚡ 麻痺：下回合不能移動　☠️🔥🩸 中毒／灼燒／流血：接下來 2 回合各 -1 HP</div>
      <div class="mt-1">🕊️ 飛行：近戰打不到，小刀和龍擊炮可以。閃光彈會把牠打下來　🛡️ 硬化：受傷 -2　🔥 狂暴：傷害 +1（HP 低於 40% 也會狂暴）</div>
      <div class="mt-1">💫 暈眩：大錘技能或麻痺陷阱造成，魔物下回合不動也不攻擊，之後 2 回合免疫。</div>
      <div class="mt-1">「鎖定型」招式攻擊的是預警時獵人站的格子，走開就能躲。</div></div>
    <div class="panel p-3"><b class="text-amber-300">捕獲與貓車</b>
      <div class="mt-1">★、★★ 魔物 HP 剩 30% 以下（血條綠線左邊）時踩到陷阱會直接被捕獲，捕獲的素材比較好。★★★ 無法捕獲。</div>
      <div class="mt-1">🐱 貓車：單人時倒下會被送回起點並回滿血，用完次數就任務失敗。</div></div>`;
}
