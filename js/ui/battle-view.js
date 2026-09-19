/* 戰鬥畫面：把引擎狀態畫出來，並實作引擎需要的 hooks */
import * as E from '../engine/battle.js';
import { B } from '../engine/battle.js';
import { GRID_SIZE, getNeighbors } from '../engine/hex.js';
import { FX, TIER } from '../data/monsters.js';
import { cardDesc, cardBrief, CARD_TYPE_LABEL } from '../data/cards.js';
import { WEAPONS } from '../data/weapons.js';
import { settings, saveSettings } from '../save.js';
import { play as sfx } from '../audio.js';
import { $, on, toast, announce, toggleDrawer, wait, instant, modal, closeModal, confirmBox, showScreen } from './dom.js';
import { icon, micon, avatar } from '../icons.js';

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
  const ml=$('mini-log'); ml.innerHTML=`<span class="${alert?'alert':''}">${msg}</span>`; ml.classList.add('show');
  clearTimeout(ml._h); ml._h=setTimeout(()=>ml.classList.remove('show'), alert?3200:2200);
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
    $('btn-use-shield').innerHTML=`${icon('shield','text-sky-300')}舉盾掩護・減免 ${opt.shieldCut} 點`;
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
/* 招式範圍的短標籤（完整說明點「下一招」可看） */
function rangeLabel(a){
  switch(a.range){
    case 'line': return `前方 ${a.len} 格`;
    case 'radius': return a.len>1?`周圍 ${a.len} 圈`:'周圍一圈';
    case 'ring': return '距離 2 一圈';
    case 'arc': return '前方 3 格';
    case 'target': return a.len>0?'鎖定格＋周圍':'鎖定格';
    case 'random': return `隨機 ${a.n} 格`;
    case 'all': return '全場';
    default: return a.self?'自身':'不攻擊';
  }
}
const statusPills = h => Object.keys(h.st).filter(k=>h.st[k]>0).map(k=>`<span class="status-pill ${FX[k].cls}" title="${FX[k].label}">${icon(FX[k].icon)}${h.st[k]}</span>`).join('');
const fxTag = (k, text) => `<span class="${FX[k].cls}">${icon(FX[k].icon)}${text}</span>`;

export function render(){
  if(!B.active) return;
  const m=B.mon, alive=E.monAlive(), ap=E.curHunter(), c=B.cfg;
  /* 魔物：名稱、狀態、血量、目標 */
  $('hud-mon-img').src=m.img;
  $('hud-mon-name').innerHTML=`${m.name}<span class="stars">${TIER[m.tier].label}</span>`;
  const tags=[m.fly>0?fxTag('fly',''):'', m.armor>0?fxTag('armor',''):'', m.enraged?fxTag('enrage',''):'', m.dizzy?fxTag('dizzy',''):''].filter(Boolean).join('');
  $('hud-mon-tags').innerHTML=tags?`<span class="tags">${tags}</span>`:'';
  $('monster-hp-bar').style.width=`${Math.max(0,m.hp/m.maxHp*100)}%`;
  $('monster-hp-text').innerText=`${Math.max(0,m.hp)} / ${m.maxHp}`;
  $('cap-mark').classList.toggle('hidden', !(m.tier<3 && (c.objective==='capture' || c.mode!=='tutorial')));
  const total=c.mons.length, idx=B.killed.length+(alive?1:0);
  let obj='';
  if(!alive) obj='';
  else if(E.capturable()) obj=`${icon('net')}可捕獲`;
  else if(c.objective==='capture') obj=`${icon('net')}捕獲：HP 30% 以下踩陷阱`;
  else if(total>1) obj=`${icon('target')}討伐 ${Math.min(idx,total)} / ${total}`;
  $('hud-objective').innerHTML=obj;
  /* 下一招 */
  const it=$('monster-intent-desc'); let cls='intent', html;
  if(!alive){ cls+=' good'; html=m.captured?`${icon('net')}<b>已捕獲</b>`:`${icon('laurel')}<b>已討伐</b>`; }
  else if(m.dizzy){ cls+=' calm'; html=`${icon('dizzy')}<b>暈眩中</b><span class="desc">這回合不移動、不攻擊</span>`; }
  else if(m.blinded){ cls+=' calm'; html=`${icon('flash')}<b>攻擊取消</b><span class="desc">被閃光致盲，仍會移動</span>`; }
  else if(m.intent){ const it_=m.intent; html=`<span class="lbl">下一招</span><b>${it_.name}</b>${it_.dmg>0?`<span class="dmg">${it_.dmg} 傷</span>`:''}<span class="rng">${rangeLabel(it_)}</span>${(it_.hit||[]).map(k=>`<span class="${FX[k].cls}">${icon(FX[k].icon)}</span>`).join('')}${it_.self?`<span class="text-gray-400">${icon('info')}</span>`:''}<span class="more">${icon('chev')}</span>`; }
  else { cls+=' calm'; html=`<span class="desc">觀察中…</span>`; }
  if(it.className!==cls) it.className=cls;
  if(it._html!==html){ it.innerHTML=html; it._html=html; }
  $('monster-intent-name').innerText=m.intent?m.intent.name:'';
  /* 回合與貓車 */
  const tl=E.turnsLeft(), td=$('turn-display');
  if(tl!==null){ td.innerHTML=`${icon('hourglass')}${B.turn} / ${c.turnLimit} 回合`; td.classList.toggle('warn', tl<=3); }
  else { td.innerText=`第 ${B.turn} 回合`; td.classList.remove('warn'); }
  const cd=$('cart-display');
  if(c.carts!=null){ cd.innerHTML=`${icon('cat')}${B.cartsUsed} / ${c.carts}`; cd.classList.toggle('warn', B.cartsUsed>=c.carts-1); cd.classList.remove('hidden'); } else cd.classList.add('hidden');
  /* 獵人卡 */
  const solo=B.hunters.length===1;
  $('hunter-cards').innerHTML=B.hunters.map(h=>{
    const on=B.cur===h.id, dead=!E.alive(h);
    const extra=[h.weapon.id==='ls'?`<span class="text-sky-300">練氣 ${'●'.repeat(h.spirit)}${'○'.repeat(3-h.spirit)}</span>`:'', h.dashBuff?`<span class="text-lime-300" title="強走藥">${icon('flask')}</span>`:''].filter(Boolean).join('');
    return `<div data-act="hunter-select" data-i="${h.id}" class="hunter-card ${on&&!solo?'on':''} ${dead?'dead':''}">
      <div class="flex-1 min-w-0">
        <div class="hc-name"><span class="${h.color==='red'?'text-red-300':'text-blue-300'} truncate">${h.name}</span><span class="hc-wpn">${icon(h.weapon.icon)}${h.weapon.name}${solo?' Lv'+h.wlv:''}</span><span class="hc-hp">${Math.max(0,h.hp)}<i>/${h.maxHp}</i></span></div>
        <div class="bar bar-green mt-1" style="height:6px"><div style="width:${Math.max(0,h.hp/h.maxHp*100)}%"></div></div>
        ${statusPills(h)||extra?`<div class="hc-meta">${statusPills(h)}${extra}</div>`:''}
      </div>
      <div class="hc-step ${h.move?'':'zero'}"><b>${h.move}</b><span>步</span></div></div>`;
  }).join('');
  /* 棋盤 */
  const reach=(ap&&E.alive(ap)&&ap.move>0&&!B.placement&&!B.over)?getNeighbors(ap.x,ap.y).filter(n=>!E.isOccupied(n.x,n.y)):[];
  const placeable=B.placement?getNeighbors(ap.x,ap.y).filter(n=>!E.isOccupied(n.x,n.y)&&!E.hasItemAt(n.x,n.y)):[];
  const showPlan = alive && !m.blinded && !m.dizzy && settings.preview;
  for(let y=0;y<GRID_SIZE;y++) for(let x=0;x<GRID_SIZE;x++){
    const cell=$(`cell-${x}-${y}`); if(!cell) continue;
    let html='', cls='hex';
    const trap=B.traps.find(t=>t.x===x&&t.y===y);
    if(trap){ cls+=' item'; html+=trap.type==='shock'?`<span class="cell-ic text-yellow-300">${icon('shock')}</span>`:`<span class="cell-ic text-amber-300">${icon('trap')}</span>`; }
    if(B.bombs.some(b=>b.x===x&&b.y===y)){ cls+=' item'; html+=`<span class="cell-ic text-orange-400">${icon('barrel')}</span>`; }
    if(B.gathers.some(g=>g.x===x&&g.y===y)){ cls+=' gather'; html+=`<span class="cell-ic text-lime-300">${icon('herb')}</span>`; }
    if(reach.some(n=>n.x===x&&n.y===y)||placeable.some(n=>n.x===x&&n.y===y)) cls+=' reach';
    if(showPlan && m.px===x && m.py===y && (m.px!==m.x||m.py!==m.y)){ cls+=' phantom'; html+=`<img src="${m.img}" class="mon-img ghost absolute" alt="">`; }
    if(showPlan && B.danger.some(z=>z.x===x&&z.y===y)) cls+=' danger';
    if(alive && m.x===x && m.y===y){ html+=`<img src="${m.img}" class="mon-img relative" alt="">`; if(m.dizzy) html+=`<span class="mon-badge text-yellow-200">${icon('dizzy')}</span>`; else if(m.fly>0) html+=`<span class="mon-badge text-sky-300">${icon('wing')}</span>`; }
    B.hunters.forEach(h=>{ if(E.alive(h)&&h.x===x&&h.y===y) html+=`<div class="hunter-token ${h.color==='red'?'':'p2'} ${B.cur===h.id?'active':''}">${avatar(h.icon)}</div>`; });
    if(cell.className!==cls) cell.className=cls;
    if(cell._html!==html){ cell.innerHTML=html; cell._html=html; }
  }
  if(ctx.highlightCells) ctx.highlightCells().forEach(c=>{ const el=$(`cell-${c.x}-${c.y}`); if(el) el.classList.add('target-hl'); });
  /* 手牌與按鈕 */
  renderHand();
  $('placement-hint').classList.toggle('hidden',!B.placement);
  $('deck-count').innerText=B.deck.length; $('discard-count').innerText=B.discard.length; $('removed-count').innerText=B.removed.length;
  $('log-counts').innerText=`牌庫 ${B.deck.length}・棄牌 ${B.discard.length}・消耗 ${B.removed.length}`;
  $('hand-count').innerText=B.hand.length; $('hand-max').innerText=B.handSize;
  $('btn-undo').classList.toggle('hidden', !B.undo.length || B.over);
  $('btn-gather').classList.toggle('hidden', !(ap && B.gathers.some(g=>g.x===ap.x&&g.y===ap.y)) || B.over);
  $('btn-end').disabled = B.processing || B.over;
  if(ctx.afterRender) ctx.afterRender();
}
function renderHand(){
  const c=$('hand-container'), h=E.curHunter();
  c.classList.toggle('hand-4', B.hand.length>=4);
  c.innerHTML=B.hand.map((card,i)=>{
    const {ok,hint}=E.canPlay(card,h);
    const placing=B.placement&&B.placement.idx===i;
    const name=card.id==='skill'?h.weapon.skill.name:card.name;
    return `<div class="card ${card.type}" ${placing?'style="outline:2px solid #fde68a"':''}>
      <button class="cname" data-act="card-info" data-i="${i}" aria-label="${name} 說明">${name}</button>
      <div class="brief">${cardBrief(card,h)}</div>
      <div class="cfoot"><button class="cbtn play" data-act="card-play" data-i="${i}" ${ok&&!B.over?'':'disabled'}>${ok?'打出':hint}</button><button class="cdash" data-act="card-dash" data-i="${i}" ${B.over?'disabled':''} aria-label="棄牌換 1 步" title="棄牌 +1 步">+1<small>步</small></button></div></div>`;
  }).join('');
}

/* ---------- 操作 ---------- */
on('card-play', d => E.playCard(+d.i));
on('card-dash', d => E.discardForMove(+d.i));
on('intent-info', () => {
  const m=B.mon, it=m&&m.intent; if(!B.active||!it||!E.monAlive()) return; sfx('tap');
  modal(`<div class="text-[10px] font-bold text-red-300 tracking-widest mb-1">${m.name} 的下一招</div><div class="text-lg font-black mb-1">${it.name}${it.dmg>0?` <span class="text-red-300">${it.dmg} 傷</span>`:''}</div>
    <p class="text-sm text-gray-200 leading-relaxed">${it.desc}</p>${it.fx?`<p class="text-[12px] text-gray-300 mt-2">${it.fx}</p>`:''}
    <p class="text-[11px] text-gray-500 mt-3">範圍：${rangeLabel(it)}。紅色斜紋格就是會被打到的地方。</p>`,[{label:'關閉',value:1}],{dismiss:1});
});
on('card-info', d => {
  const h=E.curHunter(), card=B.hand[+d.i]; if(!card) return; sfx('tap');
  const name=card.id==='skill'?h.weapon.skill.name:card.name;
  modal(`<div class="flex items-center gap-3 mb-3"><span class="card-ic ${card.type}" style="width:44px;height:44px;flex-basis:44px;font-size:34px">${micon(card.glyph)}</span><div><div class="text-lg font-black">${name}</div><div class="text-[11px] text-gray-400">${CARD_TYPE_LABEL[card.type]}</div></div></div>
    <p class="text-sm text-gray-200 leading-relaxed">${cardDesc(card,h)}</p>`,[{label:'關閉',value:1}],{dismiss:1});
});
on('hunter-select', d => E.selectHunter(+d.i));
on('undo', () => E.undoMove());
on('gather', () => E.gatherHere());
on('cancel-place', () => E.cancelPlacement());
on('end-turn', async () => {
  if(!E.canAct()) return;
  const pend = settings.confirmEnd && !(B.cfg.script) ? E.pendingActions() : [];
  if(pend.length){
    const r = await modal(`<h2 class="text-lg font-black mb-2 flex items-center gap-2"><span class="text-amber-400">${icon('hourglass')}</span>確定結束回合？</h2><ul class="text-sm text-gray-300 list-disc pl-5 space-y-1">${pend.map(p=>`<li>${p}</li>`).join('')}</ul>`,
      [{label:'結束回合',cls:'btn-danger',value:'end'},{label:'再想想',value:'no'},{label:'結束，之後不再提示',cls:'btn-link',value:'never'}],{dismiss:'no'});
    if(r==='no') return;
    if(r==='never'){ settings.confirmEnd=false; saveSettings(); toast('可在設定重新開啟'); }
  }
  E.endTurn();
});

/* ---------- 暫停 ---------- */
function quickSettingsHtml(){
  const sw=(k,label)=>`<div class="set-row"><span class="text-sm">${label}</span><button class="switch ${settings[k]?'on':''}" data-act="qset" data-key="${k}" aria-pressed="${!!settings[k]}"></button></div>`;
  return `<div class="panel mt-3 text-left">
    <div class="set-row"><span class="text-sm">動畫速度</span><div class="seg w-40">${[['fast','快'],['normal','正常'],['slow','慢']].map(([k,l])=>`<button class="${settings.speed===k?'on':''}" data-act="qspeed" data-v="${k}">${l}</button>`).join('')}</div></div>
    ${sw('sfx','音效')}${sw('confirmEnd','結束回合前確認')}${sw('preview','顯示魔物預警格')}</div>`;
}
on('qset', d => { settings[d.key]=!settings[d.key]; saveSettings(); $('pause-set').innerHTML=quickSettingsHtml(); if(B.active) render(); });
on('qspeed', d => { settings.speed=d.v; saveSettings(); $('pause-set').innerHTML=quickSettingsHtml(); });
on('pause', async () => {
  if(!B.active || B.over) return;
  sfx('tap');
  const r = await modal(`<h2 class="text-xl font-black text-center flex items-center justify-center gap-2"><span class="text-amber-400">${icon('pause')}</span>暫停</h2><div class="text-center text-[11px] text-gray-400 mt-1">${ctx.title||''}</div><div id="pause-set">${quickSettingsHtml()}</div>`,
    [{label:'繼續',icon:'play',cls:'btn-primary',value:'go'},{label:'怎麼玩',icon:'help',value:'help'},{label:ctx.abandonLabel||'放棄任務',icon:'door',cls:'btn-danger-soft',value:'quit'}],{dismiss:'go'});
  if(r==='help') toggleDrawer('help',true);
  if(r==='quit'){
    const ok = await confirmBox('放棄任務？', ctx.abandonText||'這場戰鬥會算失敗。', '放棄', '繼續狩獵', true);
    if(ok){ E.abandon(); ctx.onAbandon && ctx.onAbandon(B.result); }
  }
});

/* ---------- 說明 ---------- */
function renderHelp(){
  const w=Object.values(WEAPONS).map(w=>`<div class="mt-1"><b class="inline-flex items-center gap-1"><span class="text-amber-300">${icon(w.icon)}</span>${w.name}</b> <span class="text-gray-400">HP ${w.hp}・${w.move} 步・攻擊 ${w.atk}</span><br><span class="text-amber-200">${w.skill.name}</span>：${w.skill.desc.replace('{dmg}',w.skill.dmg)}<br><span class="text-gray-400">被動：${w.passive}</span></div>`).join('');
  $('help-body').innerHTML=`
    <div class="panel p-3"><b class="text-amber-300">每回合流程</b>
      <ol class="list-decimal pl-4 mt-1 space-y-1">
        <li>雙人時點下方獵人卡切換操作對象（或直接點地圖上的獵人）。</li>
        <li>點<span class="text-green-300">綠色格</span>移動，每格耗 1 步。走錯可按「${icon('undo')} 撤回」。</li>
        <li>走到魔物<b>相鄰格</b>後打出攻擊牌。打不出去時按鈕會直接寫原因。</li>
        <li>動完按紅色「結束回合」，魔物才會行動。</li>
      </ol></div>
    <div class="panel p-3"><b class="text-amber-300">手牌</b>
      <div class="mt-1">點卡片<b>名稱</b>可看完整說明。</div>
      <div class="mt-1"><b class="text-yellow-300">打出</b>：使用這張牌的效果。</div>
      <div class="mt-1"><b class="text-gray-100">+1步</b>（卡片右上角）：<u>不使用效果</u>，把牌丟進棄牌堆，換目前獵人 +1 步。棄掉的牌之後會洗回牌庫。</div>
      <div class="mt-1"><b class="text-blue-300">被動</b>：翻滾／舉盾只會在你要受傷時自動跳出視窗問你要不要用。</div></div>
    <div class="panel p-3"><b class="text-amber-300">看懂地圖</b>
      <div class="mt-1"><span class="inline-block w-3 h-3 rounded-sm align-middle" style="background:#6b3a8a"></span> 半透明魔物 = 牠這回合會走到的位置。</div>
      <div class="mt-1"><span class="inline-block w-3 h-3 rounded-sm align-middle" style="background:#7a1f24"></span> 紅色斜紋 = 牠這次攻擊會打到的格子。</div>
      <div class="mt-1">魔物撞到站在牠目的格的獵人會把人推退 1 格，撞到邊緣受 3 傷。</div></div>
    <div class="panel p-3"><b class="text-amber-300">武器</b>${w}</div>
    <div class="panel p-3"><b class="text-amber-300">魔物招式與狀態</b>
      <div class="mt-1">${fxTag('slow','減速')}：下回合 -1 步　${fxTag('stun','麻痺')}：下回合不能移動</div>
      <div class="mt-1">${fxTag('poison','中毒')}／${fxTag('burn','灼燒')}／${fxTag('bleed','流血')}：接下來 2 回合各 -1 HP</div>
      <div class="mt-1">${fxTag('fly','飛行')}：近戰打不到，小刀和龍擊炮可以。閃光彈會把牠打下來</div>
      <div class="mt-1">${fxTag('armor','硬化')}：受傷 -2　${fxTag('enrage','狂暴')}：傷害 +1（HP 低於 40% 也會狂暴）</div>
      <div class="mt-1">${fxTag('dizzy','暈眩')}：大錘技能或麻痺陷阱造成，魔物下回合不動也不攻擊，之後 2 回合免疫。</div>
      <div class="mt-1">「鎖定型」招式攻擊的是預警時獵人站的格子，走開就能躲。</div></div>
    <div class="panel p-3"><b class="text-amber-300">捕獲與貓車</b>
      <div class="mt-1">★、★★ 魔物 HP 剩 30% 以下（血條綠線左邊）時踩到陷阱會直接被捕獲，捕獲的素材比較好。★★★ 無法捕獲。</div>
      <div class="mt-1"><span class="text-amber-300">${icon('cat')}</span> 貓車：單人時倒下會被送回起點並回滿血，用完次數就任務失敗。</div></div>`;
}
