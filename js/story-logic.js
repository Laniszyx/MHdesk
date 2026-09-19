/* 劇情模式規則：解鎖、任務設定、報酬、工房。純函式，方便測試。 */
import { QUESTS, CHAPTERS, questsOf, rankOf, hrOf } from './data/quests.js';
import { monsterByKey, TIER, SOLO_HP } from './data/monsters.js';
import { WEAPON_RECIPES, ARMOR_RECIPES, CARD_RECIPES } from './data/crafting.js';
import { WEAPON_MAX_LV, ARMOR_MAX_LV } from './data/weapons.js';
import { CARDS_DB, DECK_RULES, deckTotal, deckItems, validateDeck } from './data/cards.js';

export const chapterUnlocked = (st, ch) => ch===0 ? true : ch===1 ? !!st.tutorialDone : !!st.cleared['q'+(ch-1)+'-U'];
export const clearedIn = (st, ch) => questsOf(ch).filter(q=>!q.urgent && st.cleared[q.id]).length;
export function questUnlocked(st, q){
  if(!chapterUnlocked(st, q.ch)) return false;
  if(q.urgent) return clearedIn(st, q.ch) >= q.req;
  return true;
}
export function lockReason(st, q){
  if(!chapterUnlocked(st, q.ch)) return q.ch===1 ? '完成或跳過新手訓練後開放' : `完成 ${CHAPTERS[q.ch-1].name}的緊急任務後開放`;
  if(q.urgent && clearedIn(st,q.ch)<q.req) return `完成本章任意 ${q.req} 個任務後開放（目前 ${clearedIn(st,q.ch)}）`;
  return '';
}
export const latestChapter = st => [...CHAPTERS].reverse().find(c=>chapterUnlocked(st,c.id)) || CHAPTERS[0];
export function nextQuest(st, after=null){
  const list = QUESTS.filter(q=>questUnlocked(st,q) && !st.cleared[q.id] && q.id!==after && !(q.type==='tutorial'&&st.tutorialDone));
  return list.find(q=>!q.urgent) || list[0] || null;
}
export const hunterSpec = st => ({name:st.hunter.name, icon:st.hunter.icon, weapon:st.hunter.weapon,
  wlv:st.weapons[st.hunter.weapon]||1, alv:st.armor.lv, resist:st.armor.resist});

/* 牌組：持有數會限制牌組張數 */
export function fixDeck(st){
  for(const id in CARDS_DB){ const own=st.owned[id]||0; st.deck[id]=Math.min(st.deck[id]||0, own); }
  return st.deck;
}
export const deckError = st => validateDeck(fixDeck(st), DECK_RULES.story);
export const expandDeck = counts => Object.entries(counts).flatMap(([id,n])=>Array(n||0).fill(id));

/* 劇情魔物：單人 HP × 章節倍率 × 任務倍率，攻擊修正 = 星級修正 + 章節加成 */
export function questMonSpec(q, key){
  const ch=CHAPTERS[q.ch], t=monsterByKey(key).t;
  return {key, hp:Math.round(SOLO_HP[t]*(ch.hpMul||1)*(q.hpMul||1)), dmgMod:TIER[t].dmg+(ch.dmg||0)};
}
export function questBattleCfg(st, q){
  return {mode:'story', questId:q.id, hunters:[hunterSpec(st)], deck:expandDeck(fixDeck(st)),
    mons:q.mons.map(key=>questMonSpec(q,key)), carts:3, turnLimit:q.turns||null,
    objective:q.type==='capture'?'capture':q.type==='gather'?'gather':'hunt', gather:q.gather||null};
}

/* 任務結算：更新存檔，回傳給結算畫面的資料 */
export function applyQuestResult(st, q, r){
  const out = {win:r.win, rank:null, drops:{}, exp:0, hrBefore:hrOf(st.exp), hrAfter:hrOf(st.exp), firstClear:false, unlocked:[]};
  if(!r.win) return out;
  const beforeCh = CHAPTERS.filter(c=>chapterUnlocked(st,c.id)).map(c=>c.id);
  const beforeQ = QUESTS.filter(x=>questUnlocked(st,x)).map(x=>x.id);
  out.rank = q.type==='tutorial' ? 'S' : rankOf(r.turns, q.turns, r.carts);
  const add = (id,n) => { out.drops[id]=(out.drops[id]||0)+n; };
  if(!(q.type==='tutorial' && st.cleared[q.id])) for(const [id,n] of Object.entries(q.reward||{})) add(id,n);
  (r.killed||[]).forEach((k,i)=>{
    if(q.type==='tutorial') return;
    const def = monsterByKey(k.key);
    add(k.key+'n', 2);
    if(k.captured || def.t===3 || q.urgent || (out.rank==='S' && i===0)) add(k.key+'r', 1);
  });
  if(q.type==='gather' && out.rank==='S') add(Object.keys(q.reward)[0], 1);
  for(const [id,n] of Object.entries(out.drops)) st.mats[id]=(st.mats[id]||0)+n;
  const prev = st.cleared[q.id];
  out.firstClear = !prev;
  out.exp = prev ? Math.ceil(q.exp/2) : q.exp;
  st.exp += out.exp;
  out.hrAfter = hrOf(st.exp);
  const order = ['C','B','A','S'];
  st.cleared[q.id] = {clears:(prev?prev.clears:0)+1, best:prev&&prev.best!=null?Math.min(prev.best,r.turns):r.turns,
    rank: prev&&order.indexOf(prev.rank)>order.indexOf(out.rank)?prev.rank:out.rank};
  if(q.type==='tutorial') st.tutorialDone = true;
  out.unlocked = [
    ...CHAPTERS.filter(c=>chapterUnlocked(st,c.id) && !beforeCh.includes(c.id)).map(c=>({icon:'map', text:`新章節：${c.name} ${c.sub}`})),
    ...QUESTS.filter(x=>x.urgent && questUnlocked(st,x) && !beforeQ.includes(x.id)).map(x=>({icon:'bell', text:`緊急任務出現：${x.title}`})),
  ];
  st.lastQuest = q.id;
  return out;
}

/* ---------- 工房 ---------- */
export const have = (st,id) => st.mats[id]||0;
export const canAfford = (st,cost) => !!cost && Object.entries(cost).every(([id,n])=>have(st,id)>=n);
export function pay(st,cost){ for(const [id,n] of Object.entries(cost)) st.mats[id]-=n; }
export const weaponNext = (st,w) => { const lv=st.weapons[w]||1; return lv>=WEAPON_MAX_LV?null:{lv:lv+1, cost:WEAPON_RECIPES[w][lv+1]}; };
export const armorNext = st => st.armor.lv>=ARMOR_MAX_LV?null:{lv:st.armor.lv+1, cost:ARMOR_RECIPES[st.armor.lv+1]};
export const cardNext = (st,id) => { const r=CARD_RECIPES[id]; if(!r.cost || (st.owned[id]||0)>=r.max) return null; return {cost:r.cost, max:r.max}; };
export function craftWeapon(st,w){ const n=weaponNext(st,w); if(!n||!canAfford(st,n.cost)) return false; pay(st,n.cost); st.weapons[w]=n.lv; return true; }
export function craftArmor(st){ const n=armorNext(st); if(!n||!canAfford(st,n.cost)) return false; pay(st,n.cost); st.armor.lv=n.lv; return true; }
/* 製作卡牌：持有 +1，若牌組還有空間就自動放進牌組 */
export function craftCard(st,id){
  const n=cardNext(st,id); if(!n||!canAfford(st,n.cost)) return false;
  pay(st,n.cost); st.owned[id]=(st.owned[id]||0)+1;
  const d={...st.deck, [id]:(st.deck[id]||0)+1};
  if(deckTotal(d)<=DECK_RULES.story.max && deckItems(d)<=DECK_RULES.story.items) st.deck=d;
  return true;
}
export function craftableCount(st){
  let n=0;
  for(const w in WEAPON_RECIPES){ const x=weaponNext(st,w); if(x&&canAfford(st,x.cost)) n++; }
  const a=armorNext(st); if(a&&canAfford(st,a.cost)) n++;
  for(const id in CARD_RECIPES){ const c=cardNext(st,id); if(c&&canAfford(st,c.cost)) n++; }
  return n;
}
