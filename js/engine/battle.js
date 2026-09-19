/* 戰鬥引擎：只處理規則與狀態，畫面效果透過 hooks 交給 UI。
   B 是目前這場戰鬥的全部狀態。 */
import { TIER, SOLO_HP, COMMON, FX, movesetOf, monsterByKey } from '../data/monsters.js';
import { WEAPONS, weaponBonus, armorBonus } from '../data/weapons.js';
import { CARDS_DB } from '../data/cards.js';
import { GRID_SIZE, HEX_DIRS, offsetToAxial, axialToOffset, getDistance, inBounds, getNeighbors, cellsWithin, lineDir, stepAlong, shuffle } from './hex.js';
import { play as sfx, vibrate } from '../audio.js';

export const B = {active:false};
let H = {};
export function setHooks(h){ H = h; }
const log = (m,alert=false) => H.log && H.log(m,alert);
const fx = (x,y,html) => H.fx && H.fx(x,y,html);
const shake = () => H.shake && H.shake();
const toast = m => H.toast && H.toast(m);
const render = () => H.render && H.render();
const wait = ms => H.wait ? H.wait(ms) : Promise.resolve();
const banner = (t,s) => H.banner ? H.banner(t,s) : Promise.resolve();
function emit(name, info){ if(B.cfg&&B.cfg.script&&B.cfg.script.event) B.cfg.script.event(name, info||{}); if(H.event) H.event(name, info||{}); }
function allowed(action, info){
  const s = B.cfg && B.cfg.script;
  if(!s || !s.gate) return true;
  const r = s.gate(action, info||{});
  if(r===true || r===undefined) return true;
  if(typeof r==='string') toast(r);
  return false;
}
export const hName = h => `<b class="${h.color==='red'?'text-red-300':'text-blue-300'}">${h.name}</b>`;
const newStatus = () => ({slow:0,stun:0,poison:0,burn:0,bleed:0});

/* ---------- 建立 ---------- */
function buildHunter(spec, id, pos){
  const w = WEAPONS[spec.weapon] || WEAPONS.gs, wb = weaponBonus(spec.wlv);
  const maxHp = w.hp + armorBonus(spec.alv);
  return {id, name:spec.name||w.name, icon:spec.icon||w.icon, weapon:w, wlv:spec.wlv||1, alv:spec.alv||1,
    atk:w.atk+wb, skillDmg:w.skill.dmg+wb, hp:maxHp, maxHp, move:w.move, maxMove:w.move,
    x:pos.x, y:pos.y, sx:pos.x, sy:pos.y, color:id===0?'red':'blue', st:newStatus(),
    comboUsed:false, spirit:0, dashBuff:0, resist:spec.resist||null, safe:false};
}
function buildMonster(spec, solo){
  const def = monsterByKey(spec.key), t = TIER[def.t];
  const baseHp = spec.hp ?? Math.round((solo?SOLO_HP[def.t]:t.hp)*(spec.hpMul||1));
  return {def, key:spec.key, name:spec.name||def.n, img:def.f, tier:def.t, hp:baseHp, maxHp:baseHp,
    dmgMod:spec.dmgMod ?? t.dmg, x:3, y:1, intent:null, blinded:false, px:-1, py:-1, fly:0, armor:0,
    enraged:false, lastMove:'', dizzy:false, dizzyImmune:0, captured:false, done:false, pool:spec.pool||null};
}
/* cfg: {mode, hunters:[{name,icon,weapon,wlv,alv,resist}], deck:[cardId...], mons:[{key,hpMul,hp,pool}],
         handSize, carts(null=無貓車), turnLimit, objective:'hunt'|'capture'|'gather', gather:{spots,need}, script, startPos, monPos} */
export function startBattle(cfg){
  const solo = cfg.hunters.length===1;
  const starts = cfg.startPos || (solo?[{x:3,y:6}]:[{x:2,y:6},{x:4,y:6}]);
  for(const k of Object.keys(B)) delete B[k];
  Object.assign(B, {active:true, cfg, solo, turn:1, cur:0, over:false, processing:false, placement:null,
    traps:[], bombs:[], gathers:[], gathered:0, danger:[], deck:[], discard:[], removed:[], hand:[],
    hunters:cfg.hunters.map((s,i)=>buildHunter(s,i,starts[i])), monQueue:cfg.mons.slice(1), mon:null,
    cartsUsed:0, undo:[], killed:[], result:null, phase:'player',
    stats:{damageTaken:0, lastHit:'', downed:false, captured:false}});
  B.handSize = cfg.handSize || (solo?4:3);
  B.mon = buildMonster(cfg.mons[0], solo);
  if(cfg.monPos){ B.mon.x=cfg.monPos.x; B.mon.y=cfg.monPos.y; }
  B.deck = cfg.deckOrder ? cfg.deckOrder.map(id=>CARDS_DB[id]).reverse() : shuffle(cfg.deck.map(id=>CARDS_DB[id]));
  if(cfg.objective==='gather') placeGatherSpots(cfg.gather.spots);
  drawCards(B.handSize);
  planMonsterIntent();
  log(`戰鬥開始！${B.mon.name} 出現了！`, true);
  emit('start');
  render();
}
function placeGatherSpots(n){
  const cand = [];
  for(let y=1;y<GRID_SIZE-1;y++) for(let x=0;x<GRID_SIZE;x++) if(!isOccupied(x,y) && getDistance(x,y,B.mon.x,B.mon.y)>1) cand.push({x,y});
  B.gathers = shuffle(cand).slice(0,n);
}

/* ---------- 查詢 ---------- */
export const curHunter = () => B.hunters[B.cur];
export const alive = h => h.hp>0;
export const isOccupied = (x,y) => (B.mon && !B.mon.done && B.mon.x===x && B.mon.y===y) || B.hunters.some(h=>alive(h)&&h.x===x&&h.y===y);
export const hasItemAt = (x,y) => B.traps.some(t=>t.x===x&&t.y===y) || B.bombs.some(b=>b.x===x&&b.y===y);
export const monAlive = () => B.mon && !B.mon.done && B.mon.hp>0;
export const isEnraged = () => B.mon.enraged || B.mon.hp<=B.mon.maxHp*.4;
export const capturable = () => monAlive() && B.mon.tier<3 && B.mon.hp<=B.mon.maxHp*.3;
export const turnsLeft = () => B.cfg.turnLimit ? B.cfg.turnLimit-B.turn+1 : null;
export const canAct = () => B.active && !B.over && !B.processing;
const distToMon = h => getDistance(h.x,h.y,B.mon.x,B.mon.y);

/* 長槍突進：魔物在直線上、距離 2–4、中間格子是空的 → 回傳落點 */
export function lanceLanding(h){
  const d = distToMon(h);
  if(d===1) return {x:h.x,y:h.y,steps:0};
  if(d<2 || d>4) return null;
  const dir = lineDir(h.x,h.y,B.mon.x,B.mon.y); if(!dir) return null;
  for(let i=1;i<d;i++){ const c=stepAlong(h.x,h.y,dir,i); if(!inBounds(c)||isOccupied(c.x,c.y)||hasItemAt(c.x,c.y)) return null; }
  const c = stepAlong(h.x,h.y,dir,d-1);
  return {x:c.x,y:c.y,steps:d-1};
}
/* 某張牌現在能不能打出，回傳 {ok, hint} */
export function canPlay(card, h){
  if(!monAlive() && card.type!=='item' && card.type!=='defend') return {ok:false,hint:'—'};
  const d = monAlive() ? distToMon(h) : 99, fly = monAlive() && B.mon.fly>0;
  switch(card.id){
    case 'dodge': case 'shield': return {ok:false,hint:'被動'};
    case 'basic': case 'heavy':
      if(fly) return {ok:false,hint:'飛行中'};
      if(d>1) return {ok:false,hint:'需相鄰'}; break;
    case 'knife':
      if(d>2) return {ok:false,hint:'距離 2 內'}; break;
    case 'cannon':
      if(d>3) return {ok:false,hint:'距離 3 內'}; break;
    case 'skill':
      if(fly) return {ok:false,hint:'飛行中'};
      if(h.weapon.id==='lance'){ if(!lanceLanding(h)) return {ok:false,hint:d>1?'需直線':'需相鄰'}; }
      else if(d>1) return {ok:false,hint:'需相鄰'};
      if(h.move<1) return {ok:false,hint:'需 1 步'}; break;
    case 'potion': if(h.hp>=h.maxHp) return {ok:false,hint:'HP已滿'}; break;
    case 'cure': if(h.hp>=h.maxHp && !Object.values(h.st).some(v=>v>0)) return {ok:false,hint:'不需要'}; break;
    case 'flash': if(!monAlive()) return {ok:false,hint:'—'}; break;
  }
  if(card.place && !getNeighbors(h.x,h.y).some(n=>!isOccupied(n.x,n.y)&&!hasItemAt(n.x,n.y))) return {ok:false,hint:'沒空格'};
  return {ok:true,hint:''};
}

/* ---------- 牌 ---------- */
function drawCards(n){
  for(let i=0;i<n;i++){
    if(B.hand.length>=B.handSize) break;
    if(!B.deck.length){
      if(!B.discard.length) break;
      B.deck = shuffle(B.discard); B.discard = [];
      log('♻️ 牌庫耗盡，棄牌堆洗回牌庫');
    }
    B.hand.push(B.deck.pop());
  }
}
function removeFromHand(i, toRemoved=false){ const c=B.hand[i]; (toRemoved?B.removed:B.discard).push(c); B.hand.splice(i,1); }
export function cancelPlacement(){ B.placement=null; render(); }

/* ---------- 玩家操作 ---------- */
export function selectHunter(i){
  if(!B.active || B.processing || !B.hunters[i] || !alive(B.hunters[i])) return;
  if(!allowed('select',{i})) return;
  B.cur=i; B.placement=null; render();
}
export function discardForMove(i){
  if(!canAct()) return;
  const h=curHunter(), card=B.hand[i]; if(!card||!alive(h)) return;
  if(!allowed('discard',{card})) return;
  h.move+=1; B.undo=[];
  log(`💨 ${hName(h)} 棄掉 [${card.name}] 換得 +1 步`); toast('棄牌換步：+1 步移動力'); sfx('tap');
  removeFromHand(i); B.placement=null; emit('discard',{card}); render();
}
export function undoMove(){
  if(!canAct() || !B.undo.length) return;
  if(!allowed('undo')) return;
  const u=B.undo.pop(), h=B.hunters[u.id];
  h.x=u.x; h.y=u.y; h.move=u.move; B.cur=u.id; B.placement=null;
  sfx('tap'); emit('undo'); render();
}
export function gatherHere(){
  if(!canAct()) return;
  const h=curHunter(), gi=B.gathers.findIndex(g=>g.x===h.x&&g.y===h.y);
  if(gi===-1) return toast('要站在採集點上');
  if(h.move<1) return toast('採集需要 1 步');
  if(!allowed('gather')) return;
  h.move-=1; B.gathers.splice(gi,1); B.gathered++; B.undo=[];
  fx(h.x,h.y,'<span class="text-2xl">🌿</span>'); sfx('gather');
  log(`🌿 ${hName(h)} 採集成功（${B.gathered}/${B.cfg.gather.need}）`);
  emit('gather'); render();
  if(B.gathered>=B.cfg.gather.need) finish(true,'採集目標達成！');
}

export function hitMonster(dmg, src='weapon', x, y){
  const m=B.mon; if(!monAlive()) return 0;
  if(m.armor>0 && dmg>1){ dmg=Math.max(1,dmg-2); log(`🛡️ ${m.name} 硬化中，傷害減為 ${dmg}`); }
  m.hp-=dmg; B.stats.lastHit=src;
  fx(x??m.x, y??m.y, `<span class="text-2xl text-red-300 drop-shadow">-${dmg}</span>`);
  shake(); sfx(dmg>=4?'bigHit':'hit'); vibrate(20);
  return dmg;
}
export async function playCard(i){
  if(!canAct()) return;
  const card=B.hand[i], h=curHunter(); if(!card||!alive(h)) return;
  const chk=canPlay(card,h); if(!chk.ok){ toast(chk.hint); return; }
  if(!allowed('play',{card})) return;
  const m=B.mon, w=h.weapon.id;
  B.undo=[];
  if(card.isItem){
    switch(card.id){
      case 'potion': { const n=w==='sns'?4:3; h.hp=Math.min(h.maxHp,h.hp+n); fx(h.x,h.y,`<span class="text-xl text-green-300">+${n}</span>`); log(`🌿 ${hName(h)} 喝下回復藥 +${n} HP`); sfx('heal'); break; }
      case 'meat': { const n=w==='sns'?3:2; h.move+=n; log(`🍖 ${hName(h)} 吃下烤肉 +${n} 步`); sfx('item'); break; }
      case 'dash': h.move+=1; h.dashBuff=1; log(`🧪 ${hName(h)} 喝下強走藥：本回合與下回合各 +1 步`); sfx('item'); break;
      case 'cure': h.st=newStatus(); h.hp=Math.min(h.maxHp,h.hp+1); fx(h.x,h.y,'<span class="text-xl text-green-300">✚</span>'); log(`💊 ${hName(h)} 使用活力劑，解除所有異常並回復 1 HP`); sfx('heal'); break;
      case 'flash':
        m.blinded=true; B.danger=[];
        if(m.fly>0){ m.fly=0; log(`⚡ 閃光彈把 ${m.name} 打了下來！`,true); }
        log(`⚡ 閃光彈！${m.name} 本回合的攻擊被取消（仍會移動）`,true); sfx('item'); break;
      case 'cannon': hitMonster(4,'cannon'); log(`🎯 ${hName(h)} 發射龍擊炮！4 傷`,true); break;
      case 'trap': case 'shock': case 'bomb':
        B.placement={type:card.id, idx:i}; toast('點擊相鄰空格放置'); render(); return;
    }
    removeFromHand(i,true); emit('play',{card}); render(); checkEnd(); return;
  }
  if(card.id==='knife'){ hitMonster(1,'knife'); log(`🔪 ${hName(h)} 投出小刀 1 傷`); removeFromHand(i); emit('play',{card}); render(); checkEnd(); return; }
  if(card.type==='skill'){
    h.move-=1;
    if(w==='gs'){ hitMonster(h.skillDmg); log(`💥 ${hName(h)} 發動【真・蓄力斬】${h.skillDmg} 傷！`,true); }
    else if(w==='sns'){ hitMonster(h.skillDmg); let extra=''; if(!h.comboUsed){ h.comboUsed=true; h.move+=1; extra='，連段回 1 步'; } log(`⚔️ ${hName(h)} 發動【鬼人連斬】${h.skillDmg} 傷${extra}`); }
    else if(w==='lance'){ const L=lanceLanding(h); if(L.steps){ h.x=L.x; h.y=L.y; } hitMonster(h.skillDmg); log(`🔱 ${hName(h)} ${L.steps?`突進 ${L.steps} 格，`:''}刺出 ${h.skillDmg} 傷`); }
    else if(w==='hammer'){
      hitMonster(h.skillDmg); log(`🔨 ${hName(h)} 發動【蓄力迴旋】${h.skillDmg} 傷`);
      if(monAlive()){
        if(m.dizzyImmune>0) log(`${m.name} 還在暈眩抗性中，沒有暈倒`);
        else { m.dizzy=true; B.danger=[]; m.px=m.x; m.py=m.y; log(`💫 ${m.name} 暈眩了！下回合不會移動也不會攻擊`,true); }
      }
    }
    else if(w==='ls'){ const dmg=h.skillDmg+h.spirit; hitMonster(dmg); log(`⚔️ ${hName(h)} 發動【氣刃斬】${dmg} 傷（練氣 ${h.spirit}）`,true); h.spirit=0; }
    removeFromHand(i); emit('play',{card}); render(); checkEnd(); return;
  }
  if(card.type==='attack'){
    let dmg = h.atk + (card.id==='heavy'?1:0);
    if(w==='hammer' && m.dizzy) dmg+=1;
    hitMonster(dmg); log(`⚔️ ${hName(h)} 打出 [${card.name}] ${dmg} 傷`);
    if(w==='ls' && h.spirit<3){ h.spirit++; }
    removeFromHand(i); emit('play',{card}); render(); checkEnd();
  }
}

export async function clickCell(x,y){
  if(!canAct()) return;
  const h=curHunter();
  const other=B.hunters.find(q=>alive(q)&&q.x===x&&q.y===y);
  if(other && other.id!==B.cur){ selectHunter(other.id); return; }
  if(!alive(h)) return;
  if(B.placement){
    if(getDistance(h.x,h.y,x,y)===1 && !isOccupied(x,y) && !hasItemAt(x,y)){
      if(!allowed('place',{x,y,type:B.placement.type})) return;
      const t=B.placement.type;
      if(t==='bomb') B.bombs.push({x,y}); else B.traps.push({x,y,type:t});
      log(`📍 ${hName(h)} 佈置了${t==='trap'?'落穴陷阱':t==='shock'?'麻痺陷阱':'大爆彈桶'}`);
      const card=B.hand[B.placement.idx];
      removeFromHand(B.placement.idx,true); B.placement=null; sfx('item');
      emit('play',{card}); render();
    } else toast('必須放在相鄰的空格');
    return;
  }
  if(B.bombs.some(b=>b.x===x&&b.y===y)){
    if(h.move<1) return toast('點燃需要 1 步');
    if(!allowed('ignite',{x,y})) return;
    h.move-=1; B.undo=[];
    log(`🧨 ${hName(h)} 耗 1 步遠程點燃爆彈桶！`);
    await triggerBomb(x,y); return;
  }
  if(x===h.x && y===h.y){ if(B.gathers.some(g=>g.x===x&&g.y===y)) gatherHere(); return; }
  if(isOccupied(x,y)) return;
  if(getDistance(h.x,h.y,x,y)===1 && h.move>0){
    if(!allowed('move',{x,y})) return;
    B.undo.push({id:h.id,x:h.x,y:h.y,move:h.move});
    h.x=x; h.y=y; h.move--; sfx('tap'); emit('move',{x,y}); render();
  } else if(h.move<=0) toast('步數用完了，可按手牌的「棄牌 +1步」換移動力');
}

async function triggerBomb(cx,cy,skipMonster=false){
  const wasProcessing=B.processing; B.processing=true;
  const idx=B.bombs.findIndex(b=>b.x===cx&&b.y===cy); if(idx!==-1) B.bombs.splice(idx,1);
  render(); fx(cx,cy,'<span class="text-4xl">💥</span>'); getNeighbors(cx,cy).forEach(n=>fx(n.x,n.y,'<span class="text-2xl opacity-80">🔥</span>'));
  shake(); sfx('boom'); vibrate(60);
  await wait(350);
  const m=B.mon;
  if(monAlive() && !skipMonster && getDistance(m.x,m.y,cx,cy)<=1){
    if(m.fly>0) log(`🕊️ ${m.name} 在空中，爆炸沒炸到牠`);
    else { hitMonster(4,'bomb'); log(`💥 ${m.name} 被炸彈波及 4 傷！`); }
  }
  for(const h of B.hunters) if(alive(h) && !h.safe && getDistance(h.x,h.y,cx,cy)<=1){ log(`⚠️ ${hName(h)} 在爆炸範圍內！`); await damageHunter(h,4,'大爆彈桶爆炸'); }
  for(const cb of B.bombs.filter(b=>getDistance(b.x,b.y,cx,cy)<=1)){ log('⛓️ 連環爆炸！'); await triggerBomb(cb.x,cb.y,skipMonster); }
  render(); checkEnd(); B.processing=wasProcessing;
}

/* ---------- 獵人受傷 ---------- */
export async function damageHunter(h, dmg, src){
  if(!alive(h) || h.safe) return {taken:0,dodged:false};
  const dI=B.hand.findIndex(c=>c.id==='dodge'), sI=B.hand.findIndex(c=>c.id==='shield');
  let taken=dmg, dodged=false, choice='take';
  const shieldCut = h.weapon.id==='gs'?3:2;
  if(dI===-1 && sI===-1) log(`🩸 ${hName(h)} 無防禦手段，受到 ${dmg} 傷`);
  else {
    choice = H.defend ? await H.defend(h,dmg,src,{dodge:dI!==-1, shield:sI!==-1, shieldCut}) : 'take';
    if(choice==='dodge'){
      taken=0; dodged=true; removeFromHand(B.hand.findIndex(c=>c.id==='dodge')); sfx('dodge');
      log(`💨 ${hName(h)} 翻滾迴避，完美閃躲！`);
      if(h.weapon.id==='ls' && monAlive() && distToMon(h)<=1){ hitMonster(2,'weapon'); log(`⚔️ ${hName(h)} 見切反擊 2 傷！`); }
    } else if(choice==='shield'){
      taken=Math.max(0,dmg-shieldCut); removeFromHand(B.hand.findIndex(c=>c.id==='shield'));
      log(`🛡️ ${hName(h)} 舉盾，受到 ${taken} 傷`);
      if(h.weapon.id==='lance' && monAlive() && distToMon(h)<=1){ hitMonster(1,'weapon'); log(`🔱 ${hName(h)} 盾擊反擊 1 傷`); }
    } else log(`🩸 ${hName(h)} 硬扛 ${dmg} 傷`);
  }
  h.hp-=taken; B.stats.damageTaken+=taken;
  if(taken>0){ fx(h.x,h.y,`<span class="text-xl text-red-400">-${taken}</span>`); sfx('hurt'); vibrate(80); }
  else fx(h.x,h.y,'<span class="text-base text-blue-200">MISS</span>');
  emit('defend',{choice});
  render(); checkEnd();
  return {taken,dodged};
}
function pushHunter(h){
  const m=B.mon; let best=null, bd=getDistance(h.x,h.y,m.x,m.y);
  getNeighbors(h.x,h.y).forEach(n=>{ if(isOccupied(n.x,n.y)) return; const d=getDistance(n.x,n.y,m.x,m.y); if(d>bd){bd=d;best=n;} });
  if(best){ h.x=best.x; h.y=best.y; log(`💨 ${hName(h)} 被擊退 1 格`); }
}
function applyHitEffects(h, hit){
  if(!hit || !alive(h) || h.safe) return;
  for(const k of hit){
    if(k==='push') pushHunter(h);
    else if(h.resist===k) log(`🧿 ${hName(h)} 的防具抵抗了${FX[k].label}`);
    else { h.st[k]=Math.max(h.st[k],FX[k].turns); log(`${FX[k].icon} ${hName(h)} ${FX[k].label}！${FX[k].desc}`); }
  }
}

/* ---------- 魔物 AI ---------- */
function pickWeighted(arr){ let t=arr.reduce((s,a)=>s+a.w,0), r=Math.random()*t; for(const a of arr){ r-=a.w; if(r<=0) return a; } return arr[arr.length-1]; }
function fxSummary(a){
  const parts=[];
  if(a.self) parts.push('自身：'+a.self.map(s=>{const k=s.split(':')[0]; return k==='bombs'?'散布爆彈':k==='detonate'?'引爆全場':k==='heal'?'回復'+s.split(':')[1]:FX[k].label;}).join('、'));
  if(a.hit&&a.hit.length) parts.push('命中：'+a.hit.map(h=>FX[h].icon+FX[h].label).join('、'));
  return parts.join('｜');
}
export function movePool(m){
  if(m.pool) return m.pool.map(a=>({...a,w:a.w||1}));
  const ms=movesetOf(m.img);
  return ms.s.map(a=>({...a,sig:true,w:1.5})).concat(ms.c.map(k=>({...COMMON[k],w:1})));
}
export function planMonsterIntent(){
  const m=B.mon; if(!monAlive()) { B.danger=[]; return; }
  if(m.dizzy){ m.intent=null; B.danger=[]; m.px=m.x; m.py=m.y; return; }
  const enraged=isEnraged();
  const scripted = B.cfg.script && B.cfg.script.intent ? B.cfg.script.intent(B.turn, B) : null;
  let base;
  if(scripted) base=scripted.move;
  else {
    let pool=movePool(m);
    if(enraged && pool.some(a=>a.sig)) pool=pool.filter(a=>a.name!=='咬擊'&&a.name!=='咆哮');
    if(m.lastMove && pool.length>1) pool=pool.filter(a=>a.name!==m.lastMove);
    base=pickWeighted(pool);
  }
  m.lastMove=base.name;
  const dmg = base.dmg>0 ? Math.max(1, base.dmg+m.dmgMod+(enraged?1:0)) : 0;
  m.intent={...base, dmg, name:(enraged?'🔥':'')+base.name, fx:fxSummary(base)};
  const live=B.hunters.filter(alive);
  let target=live[0]||B.hunters[0], minD=999;
  live.forEach(h=>{ const d=getDistance(m.x,m.y,h.x,h.y); if(d<minD){minD=d;target=h;} });
  if(scripted && scripted.target!=null) target=B.hunters[scripted.target];
  m.target=target.id;
  let cur={x:m.x,y:m.y}, prev=cur;
  if(scripted && scripted.to){ prev=cur; cur=scripted.to; }
  else for(let s=0;s<(base.move??1);s++){
    if(cur.x===target.x&&cur.y===target.y) break;
    let best=null, bd=getDistance(cur.x,cur.y,target.x,target.y);
    getNeighbors(cur.x,cur.y).forEach(n=>{
      if(B.traps.some(t=>t.x===n.x&&t.y===n.y) && Math.random()<.5) return;
      if(B.hunters.some(h=>alive(h)&&h.x===n.x&&h.y===n.y&&h!==target)) return;
      const d=getDistance(n.x,n.y,target.x,target.y); if(d<bd){bd=d;best=n;}
    });
    if(!best) break; prev=cur; cur=best;
  }
  m.px=cur.x; m.py=cur.y;
  const pa=offsetToAxial(cur.x,cur.y); let dq,dr;
  if(prev.x!==cur.x||prev.y!==cur.y){ const a=offsetToAxial(prev.x,prev.y); dq=pa.q-a.q; dr=pa.r-a.r; if(Math.abs(dq)>1||Math.abs(dr)>1||Math.abs(dq+dr)>1){ const n=getDistance(prev.x,prev.y,cur.x,cur.y); dq=Math.round(dq/n); dr=Math.round(dr/n); } }
  else { let bn=null,bd=999; getNeighbors(cur.x,cur.y).forEach(n=>{const d=getDistance(n.x,n.y,target.x,target.y); if(d<bd){bd=d;bn=n;}}); const a=bn?offsetToAxial(bn.x,bn.y):{q:pa.q+1,r:pa.r}; dq=a.q-pa.q; dr=a.r-pa.r; }
  let di=HEX_DIRS.findIndex(d=>d[0]===dq&&d[1]===dr); if(di<0){ di=0; dq=1; dr=0; }
  let dz=[]; const L=base.len||1;
  switch(base.range){
    case 'line': for(let i=1;i<=L;i++) dz.push(axialToOffset(pa.q+dq*i,pa.r+dr*i)); break;
    case 'radius': dz=cellsWithin(cur.x,cur.y,L); break;
    case 'ring': dz=cellsWithin(cur.x,cur.y,2).filter(c=>getDistance(c.x,c.y,cur.x,cur.y)===2); break;
    case 'arc': [di,(di+1)%6,(di+5)%6].forEach(k=>dz.push(axialToOffset(pa.q+HEX_DIRS[k][0],pa.r+HEX_DIRS[k][1]))); break;
    case 'target': dz=cellsWithin(target.x,target.y,base.len||0,true); break;
    case 'random': dz=shuffle(cellsWithin(cur.x,cur.y,L)).slice(0,base.n||3); break;
    case 'all': dz=cellsWithin(cur.x,cur.y,99); break;
  }
  B.danger=dz.filter(c=>inBounds(c)&&!(c.x===cur.x&&c.y===cur.y));
  log(`⚠️ ${m.name} 鎖定 ${hName(target)}，準備【${m.intent.name}】：${base.desc}`);
}

/* ---------- 結束回合：魔物行動 ---------- */
export async function endTurn(){
  if(!canAct()) return;
  if(!allowed('endTurn')) return;
  B.processing=true; B.placement=null; B.undo=[];
  emit('endTurn');
  const m=B.mon;
  B.phase='monster';
  if(monAlive()) await monsterPhase(m);
  B.phase='upkeep';
  if(B.over){ B.processing=false; B.phase='player'; return; }
  B.turn++;
  if(B.cfg.turnLimit && B.turn>B.cfg.turnLimit){ finish(false,'時間到了……任務失敗'); B.processing=false; B.phase='player'; return; }
  for(const h of B.hunters){
    h.move=h.maxMove; h.comboUsed=false; h.safe=false;
    if(!alive(h)) continue;
    if(h.dashBuff>0){ h.move+=1; h.dashBuff--; log(`🧪 ${hName(h)} 強走藥效果 +1 步`); }
    const st=h.st;
    if(st.stun>0){ h.move=0; st.stun--; log(`⚡ ${hName(h)} 麻痺中，本回合無法移動`); }
    else if(st.slow>0){ h.move=Math.max(0,h.move-1); st.slow--; log(`🐌 ${hName(h)} 減速，本回合 -1 步`); }
    for(const k of ['poison','burn','bleed']) if(st[k]>0){ st[k]--; h.hp-=1; B.stats.damageTaken+=1; fx(h.x,h.y,'<span class="text-lg text-purple-300">-1</span>'); log(`${FX[k].icon} ${hName(h)} ${FX[k].label}中 -1 HP`); }
  }
  B.phase='player';
  if(checkEnd()){ B.processing=false; return; }
  if(!alive(curHunter())){ const n=B.hunters.find(alive); if(n) B.cur=n.id; }
  drawCards(B.handSize-B.hand.length);
  planMonsterIntent();
  const tl=turnsLeft(); if(tl!==null && tl<=3) log(`⏳ 剩下 ${tl} 回合！`,true);
  B.processing=false;
  emit('turnStart');
  render();
}
async function monsterPhase(m){
  const mAlive = () => !m.done && m.hp>0;
  if(m.px<0){ m.px=m.x; m.py=m.y; }
  if(m.fly>0){ m.fly=0; log(`🕊️ ${m.name} 降落了`); }
  m.armor=0;
  if(m.dizzy){
    await banner(`💫 ${m.name} 暈眩中`,'本回合無法行動');
    log(`💫 ${m.name} 暈眩中，動彈不得！`,true);
    m.dizzy=false; m.dizzyImmune=2;
    return;
  }
  const it=m.intent;
  if(m.blinded) await banner(`😵 ${m.name} 被閃光致盲`,'攻擊取消，但仍會移動');
  else if(it) await banner(`🐲 ${it.name}`, it.dmg>0?`${it.dmg} 傷害`:'');
  // 推進：撞到站在目的格的獵人
  const ma=offsetToAxial(m.x,m.y), pa=offsetToAxial(m.px,m.py); let pq=pa.q-ma.q, pr=pa.r-ma.r;
  if(Math.abs(pq)>1||Math.abs(pr)>1||Math.abs(pq+pr)>1){ const n=getDistance(m.x,m.y,m.px,m.py); pq=Math.round(pq/n); pr=Math.round(pr/n); }
  if(!pq&&!pr){ pq=1; pr=0; }
  for(const h of B.hunters) if(alive(h) && h.x===m.px && h.y===m.py){
    const a=offsetToAxial(h.x,h.y), np=axialToOffset(a.q+pq,a.r+pr);
    log(`💥 ${m.name} 推進，將 ${hName(h)} 撞退 1 格！`);
    if(!inBounds(np) || isOccupied(np.x,np.y)){
      const free=getNeighbors(h.x,h.y).filter(n=>!isOccupied(n.x,n.y)&&!(n.x===m.px&&n.y===m.py));
      h.hp-=3; B.stats.damageTaken+=3; fx(h.x,h.y,'<span class="text-xl text-red-400">-3</span>'); sfx('hurt');
      log(`💥 ${hName(h)} 被撞到邊緣，重摔受到 3 傷（無法防禦）！`,true); shake();
      if(free.length){ const f=free[Math.floor(Math.random()*free.length)]; h.x=f.x; h.y=f.y; }
    } else { h.x=np.x; h.y=np.y; }
  }
  m.x=m.px; m.y=m.py; render();
  if(checkEnd()) return;
  await wait(250);
  let trapped=false;
  const tI=B.traps.findIndex(t=>t.x===m.x&&t.y===m.y);
  if(tI!==-1){
    const t=B.traps.splice(tI,1)[0]; trapped=true;
    if(capturable()){
      m.captured=true; B.stats.captured=true; B.stats.lastHit='trap';
      fx(m.x,m.y,'<span class="text-3xl">🪤</span>'); sfx('win');
      log(`🪤 ${m.name} 掉進陷阱，被麻醉捕獲了！`,true);
      checkEnd(); return;
    }
    if(t.type==='shock'){
      log(`🌩️ ${m.name} 踩中麻痺陷阱！攻擊中斷`,true); fx(m.x,m.y,'<span class="text-3xl">🌩️</span>');
      if(m.dizzyImmune>0) log(`${m.name} 暈眩抗性中，很快掙脫了`);
      else { m.dizzy=true; log(`💫 ${m.name} 被電得動彈不得，下回合也無法行動`,true); }
    } else { hitMonster(2,'trap'); log(`🕳️ ${m.name} 踏入落穴陷阱！中斷攻擊並受 2 傷`,true); }
    render(); if(checkEnd()) return;
  }
  else if(B.bombs.some(b=>b.x===m.x&&b.y===m.y)){ log(`💥 ${m.name} 踩到爆彈桶！`,true); await triggerBomb(m.x,m.y); if(B.over) return; }
  if(trapped || !mAlive()){ /* 攻擊被陷阱中斷，或魔物已倒下 */ }
  else if(m.blinded){ log(`😵 ${m.name} 被閃光致盲，攻擊落空`); }
  else if(it){
    log(`🐲 ${m.name} 使出【${it.name}】！${it.desc}`,true);
    shake(); sfx('roar'); B.danger.forEach(z=>fx(z.x,z.y,'<span class="text-2xl">💢</span>'));
    for(const s of (it.self||[])){
      if(s==='fly'){ m.fly=1; log(`🕊️ ${m.name} 飛上天空，下回合近戰無法命中！`); }
      else if(s==='armor'){ m.armor=1; log(`🛡️ ${m.name} 硬化，下回合受到的傷害 -2`); }
      else if(s==='enrage'){ m.enraged=true; log(`🔥 ${m.name} 進入永久狂暴！招式傷害 +1`); }
      else if(s.startsWith('heal:')){ const n=+s.slice(5); m.hp=Math.min(m.maxHp,m.hp+n); fx(m.x,m.y,`<span class="text-2xl text-green-300">+${n}</span>`); log(`💚 ${m.name} 回復 ${n} HP`); }
      else if(s.startsWith('bombs:')){
        const n=+s.slice(6);
        const cells=shuffle(cellsWithin(m.x,m.y,2).filter(c=>!isOccupied(c.x,c.y)&&!hasItemAt(c.x,c.y)&&!B.gathers.some(g=>g.x===c.x&&g.y===c.y))).slice(0,n);
        cells.forEach(c=>B.bombs.push(c));
        log(`💣 ${m.name} 散布了 ${cells.length} 顆爆彈！可以拿來反炸牠，但小心別站旁邊`);
      }
      else if(s==='detonate'){
        const list=[...B.bombs]; if(!list.length) log('（地圖上沒有爆彈可引爆）');
        for(const b of list) if(B.bombs.some(x=>x.x===b.x&&x.y===b.y)) await triggerBomb(b.x,b.y,true);
        if(B.over) return;
      }
    }
    render();
    const hits=B.danger.filter(z=>B.bombs.some(b=>b.x===z.x&&b.y===z.y));
    if(hits.length){ log('🔥 攻擊掃到爆彈桶，引爆！',true); for(const z of hits) if(B.bombs.some(b=>b.x===z.x&&b.y===z.y)) await triggerBomb(z.x,z.y); if(B.over) return; }
    const zones=B.danger.slice();
    for(const h of B.hunters) if(mAlive() && alive(h) && !h.safe && zones.some(z=>z.x===h.x&&z.y===h.y)){
      let dodged=false;
      if(it.dmg>0){ const r=await damageHunter(h,it.dmg,it.name); dodged=r.dodged; if(B.over) return; }
      else log(`💢 ${hName(h)} 被【${it.name}】波及`);
      if(!dodged) applyHitEffects(h,it.hit);
    }
  }
  m.blinded=false;
  if(m.dizzyImmune>0 && !m.dizzy) m.dizzyImmune--;
  render(); checkEnd();
}

/* ---------- 勝敗 ---------- */
function spawnNext(){
  const spec=B.monQueue.shift();
  const m=buildMonster(spec,B.solo);
  let best={x:3,y:0}, bd=-1;
  for(let y=0;y<2;y++) for(let x=0;x<GRID_SIZE;x++){
    if(isOccupied(x,y)||hasItemAt(x,y)) continue;
    const d=Math.min(...B.hunters.filter(alive).map(h=>getDistance(x,y,h.x,h.y)));
    if(d>bd){bd=d;best={x,y};}
  }
  m.x=best.x; m.y=best.y; B.mon=m; B.danger=[];
  log(`🚨 ${m.name} 趕到了！`,true); sfx('roar');
  H.announce && H.announce(`🚨 ${m.name} 登場！`);
  emit('spawn',{mon:m});
  if(B.phase!=='monster') planMonsterIntent();
}
function respawn(h){
  const left=B.cfg.carts-B.cartsUsed;
  h.hp=h.maxHp; h.st=newStatus(); h.dashBuff=0; h.spirit=0;
  h.move = B.phase==='upkeep' ? h.maxMove : 0; h.safe = B.phase==='monster';
  let pos={x:h.sx,y:h.sy};
  if(isOccupied(pos.x,pos.y) || B.hunters.some(o=>o!==h&&alive(o)&&o.x===pos.x&&o.y===pos.y)){
    const c=cellsWithin(h.sx,h.sy,3).filter(c=>!isOccupied(c.x,c.y)).sort((a,b)=>getDistance(a.x,a.y,h.sx,h.sy)-getDistance(b.x,b.y,h.sx,h.sy))[0];
    if(c) pos=c;
  }
  h.x=pos.x; h.y=pos.y;
  log(`🐱 ${hName(h)} 倒下了！艾路貓把你送回營地（剩 ${left} 次）`,true);
  H.announce && H.announce(`🐱 貓車！剩 ${left} 次`);
}
export function checkEnd(){
  if(B.over) return true;
  const m=B.mon;
  if(m && !m.done && (m.hp<=0 || m.captured)){
    m.done=true; m.hp=Math.max(0,m.hp);
    B.killed.push({key:m.key, img:m.img, captured:m.captured, turn:B.turn});
    if(!m.captured) log(`🎉 ${m.name} 被討伐了！`,true);
    B.danger=[];
    if(B.cfg.objective==='capture' && !m.captured){ finish(false,'魔物被討伐了……捕獲任務失敗'); return true; }
    if(B.monQueue.length) spawnNext();
    else if(B.cfg.objective!=='gather'){ finish(true, m.captured?'捕獲成功！':'狩獵成功！'); return true; }
  }
  for(const h of B.hunters){
    if(h.hp>0 || h.downHandled) continue;
    B.stats.downed=true;
    if(B.cfg.carts!=null){
      B.cartsUsed++;
      if(B.cartsUsed>=B.cfg.carts){ h.hp=0; finish(false,'貓車次數用盡……任務失敗'); return true; }
      respawn(h);
    } else { h.downHandled=true; h.hp=0; log(`💀 ${hName(h)} 倒下了！`,true); }
  }
  if(B.cfg.carts==null && B.hunters.every(h=>!alive(h))){ finish(false,'全員倒下……任務失敗'); return true; }
  return false;
}
export function finish(win, reason){
  if(B.over) return;
  B.over=true; B.processing=false;
  B.result={win, reason, turns:B.turn, carts:B.cartsUsed, killed:B.killed.slice(), stats:{...B.stats}, mon:B.mon, gathered:B.gathered};
  sfx(win?'win':'lose');
  render();
  emit('finish',B.result);
  H.finish && H.finish(B.result);
}
export function abandon(){ if(B.active && !B.over){ B.over=true; B.processing=false; B.result={win:false,reason:'放棄任務',abandoned:true,turns:B.turn,carts:B.cartsUsed,killed:B.killed.slice(),stats:{...B.stats},mon:B.mon}; } }
/* 還有沒有事可做（結束回合前確認用） */
export function pendingActions(){
  const out=[];
  for(const h of B.hunters){ if(!alive(h)) continue; if(h.move>0) out.push(`${h.name} 還有 ${h.move} 步`); }
  const playable=B.hand.filter(c=>B.hunters.some(h=>alive(h)&&canPlay(c,h).ok&&(c.type==='attack'||c.type==='skill')));
  if(playable.length) out.push(`手上還有 ${playable.length} 張可打出的攻擊牌`);
  return out;
}
