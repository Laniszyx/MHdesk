/* 劇情模式畫面：建立獵人、集會所、任務板、出發準備、牌組、工房、道具箱、獵人、結算 */
import { MONSTERS, TIER, SOLO_HP, monsterByKey } from '../data/monsters.js';
import { WEAPONS, WEAPON_IDS, WEAPON_MAX_LV, ARMOR_MAX_LV, RESISTS, weaponBonus, armorBonus } from '../data/weapons.js';
import { CARDS_DB, CARD_ORDER, DECK_RULES, deckTotal, deckItems } from '../data/cards.js';
import { CARD_RECIPES } from '../data/crafting.js';
import { MATERIALS, GENERAL, matIcon, matName } from '../data/materials.js';
import { CHAPTERS, QUESTS, QUEST_TYPES, questById, questsOf, hrOf, hrNeed } from '../data/quests.js';
import * as L from '../story-logic.js';
import * as S from '../save.js';
import { play as sfx } from '../audio.js';
import { $, on, esc, page, modal, closeModal, confirmBox, toast } from './dom.js';
import { launchBattle } from './battle-view.js';
import { go, registerNav, monsterInfoHtml, menuBtn } from './menu.js';
import { icon, micon, avatar } from '../icons.js';
import { deckListHtml, weaponLine, iconPickerHtml, achHtml } from './free.js';
import { startTutorial } from './tutorial.js';

const st = () => S.story;
const save = () => S.saveStory();
let boardCh = null, curQuest = null, forgeTab = 'weapon', here = '', returnTo = {};

/* ---------- 小元件 ---------- */
export function costHtml(cost){
  return Object.entries(cost).map(([id,n])=>{ const h=L.have(st(),id), ok=h>=n;
    return `<span class="inline-flex items-center gap-1 mr-2 mb-1 text-[11px] ${ok?'text-gray-200':'text-red-300'}">${matIcon(id,20)}${matName(id)} <b>${h}/${n}</b></span>`; }).join('');
}
const dropsHtml = drops => Object.entries(drops).map(([id,n])=>`<span class="inline-flex items-center gap-1 mr-2 mb-1 text-[11px]">${matIcon(id,22)}${matName(id)}${MATERIALS[id].kind==='rare'?'<span class="chip bg-amber-500/20 text-amber-300">稀有</span>':''} ×${n}</span>`).join('');
const typeChip = q => `<span class="chip ${QUEST_TYPES[q.type].cls}">${QUEST_TYPES[q.type].label}</span>`;
const stars = q => { const t=Math.max(...q.mons.map(k=>monsterByKey(k).t)); return TIER[t].label; };
function hrBar(){
  const s=st(), hr=hrOf(s.exp), a=hrNeed(hr), b=hrNeed(hr+1);
  return `<div class="flex items-center gap-2 text-[10px] text-gray-400"><span class="font-black text-amber-300 text-sm">HR ${hr}</span><div class="bar flex-1" style="height:6px"><div style="width:${Math.min(100,(s.exp-a)/(b-a)*100)}%;background:linear-gradient(90deg,#fde68a,#d99a25)"></div></div><span>${s.exp-a}/${b-a}</span></div>`;
}

/* ---------- 新遊戲：建立獵人 ---------- */
let draft = null;
async function storyNew(){
  if(st() && !(await confirmBox('開始新遊戲？','目前的劇情進度（素材、強化、任務）會被覆蓋。狩獵紀錄和成就不受影響。','開始新遊戲','取消',true))) return go('menu');
  draft = {name:'獵人', icon:'visor', weapon:'gs'};
  createScreen();
}
function createScreen(){
  page({title:'建立獵人', icon:'visor', sub:'劇情模式由一位獵人獨自挑戰', back:'go-menu', body:`
    <div class="panel p-3 mt-2">
      <div class="flex gap-2 mb-3">
        <label class="flex-1 min-w-0"><span class="block text-[10px] text-gray-500 mb-0.5">獵人名字</span>
          <input id="new-name" value="${esc(draft.name)}" maxlength="8" class="w-full bg-black/40 border border-gray-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-400"></label>
        <label class="w-16 shrink-0"><span class="block text-[10px] text-gray-500 mb-0.5">頭像</span>
          <button data-act="new-icon" class="av-btn" aria-label="換頭像">${avatar(draft.icon)}</button></label>
      </div>
      <div class="text-[10px] text-gray-500 mb-1">選擇武器（之後可在集會所隨時更換）</div>
      <div class="grid grid-cols-5 gap-1.5">${WEAPON_IDS.map(w=>`<button data-act="new-weapon" data-w="${w}" class="wpn-pick ${draft.weapon===w?'sel':''}"><span class="tile sm">${micon(WEAPONS[w].icon)}</span><div class="text-[10px] font-bold mt-0.5">${WEAPONS[w].name}</div></button>`).join('')}</div>
      <div class="text-[11px] text-gray-300 mt-2 leading-snug">${weaponLine(draft.weapon)}</div>
    </div>
    <div class="text-[11px] text-gray-400 mt-3 px-1 leading-relaxed">接下來會先進行「第 0 關・新手訓練」。已經會玩的話，訓練中隨時可以按「跳過教學」。</div>`,
    footer:`<button data-act="new-start" class="btn btn-lg btn-primary flex-1">開始狩獵生涯${icon('next')}</button>`});
}
const readName = () => { const el=$('new-name'); if(el) draft.name=el.value.trim()||'獵人'; };
on('new-icon', async () => { readName(); const v=await modal(`<h2 class="text-lg font-black mb-3">選擇頭像</h2>${iconPickerHtml(draft.icon)}`,[{label:'取消',value:null}],{dismiss:null}); if(v) draft.icon=v; createScreen(); });
on('new-weapon', d => { readName(); draft.weapon=d.w; sfx('tap'); createScreen(); });
on('new-start', () => { readName(); S.setStory(S.newStory(draft)); runTutorial(); });

/* ---------- 集會所 ---------- */
function hub(){
  const s=st(); if(!s) return storyNew();
  here='hub'; curQuest=null;
  const w=WEAPONS[s.hunter.weapon], wl=s.weapons[s.hunter.weapon], ch=L.latestChapter(s), nq=L.nextQuest(s), craft=L.craftableCount(s);
  const card=(act,ic,name,desc,badge='')=>menuBtn({act, icon:ic, name, desc, badge});
  page({title:'集會所', icon:'tent', sub:`${ch.name}・${ch.sub}`, back:'go-menu', right:`<button data-act="go" data-to="settings" data-arg="storyHub" class="btn btn-icon" aria-label="設定">${icon('settings')}</button>`, body:`
    <div class="panel p-3 mt-1 flex items-center gap-3">
      <div class="flex-1 min-w-0">
        <div class="font-black text-base truncate">${esc(s.hunter.name)}</div>
        <div class="text-[11px] text-gray-400 flex flex-wrap gap-x-2"><span>${icon(w.icon,'text-amber-300')} ${w.name} Lv${wl}（攻擊 ${w.atk+weaponBonus(wl)}）</span><span>${icon('armor','text-amber-300')} 防具 Lv${s.armor.lv}（HP ${w.hp+armorBonus(s.armor.lv)}）${s.armor.resist?'・抗'+RESISTS[s.armor.resist]:''}</span></div>
        <div class="mt-1">${hrBar()}</div>
      </div></div>
    ${nq?`<button data-act="quest" data-id="${nq.id}" class="quest-card ${nq.urgent?'urgent':''} mt-3"><div class="flex-1 min-w-0"><div class="text-[10px] text-amber-300 font-bold">建議下一個任務</div><div class="font-black text-sm truncate">${nq.title}</div><div class="text-[10px] text-gray-400">${typeChip(nq)} ${stars(nq)}${nq.turns?'・'+nq.turns+' 回合':''}</div></div><div class="qimg"><img src="${monsterByKey(nq.mons[0]).f}" alt=""></div><span class="chev text-gray-500">${icon('chev')}</span></button>`:`<div class="panel p-3 mt-3 text-center text-sm text-amber-200"><div class="tile lg mx-auto mb-2">${micon('sunrise')}</div>所有主線任務都完成了！可以回任務板刷素材或挑戰更高評價。</div>`}
    <div class="space-y-3 mt-3">
      ${card('board','scroll','任務板',`${CHAPTERS.filter(c=>L.chapterUnlocked(s,c.id)).length}/${CHAPTERS.length} 章節開放・已完成 ${Object.keys(s.cleared).length}/${QUESTS.length}`)}
      ${card('forge','anvil','工房','強化武器與防具、製作卡牌',craft?`<span class="chip bg-amber-500 text-black">可製作 ${craft}</span>`:'')}
      ${card('box','chest','道具箱','素材與持有的卡牌')}
      ${card('hunter','visor','獵人','更換武器、名字與頭像、防具抗性')}
    </div>`});
}
on('board', () => { sfx('tap'); board(); });
const PAGES = () => ({hub, board, prep, deck:deckEdit, forge, box, hunter:hunterPage});
const openFrom = (name, fn) => { if(here!==name) returnTo[name]=here||'hub'; sfx('tap'); fn(); };
const backFrom = name => { const t=returnTo[name]||'hub'; (PAGES()[t]||hub)(); };
on('forge', () => openFrom('forge', forge));
on('box', () => { sfx('tap'); box(); });
on('hunter', () => openFrom('hunter', hunterPage));
on('to-hub', () => { sfx('tap'); hub(); });

/* ---------- 任務板 ---------- */
function board(){
  here='board';
  const s=st(); if(boardCh===null || !L.chapterUnlocked(s,boardCh)) boardCh=L.latestChapter(s).id;
  const tabs=CHAPTERS.map(c=>`<button class="${c.id===boardCh?'on':''}" data-act="board-ch" data-ch="${c.id}" ${L.chapterUnlocked(s,c.id)?'':'disabled'}>${L.chapterUnlocked(s,c.id)?'':icon('lock')}${c.name}</button>`).join('');
  const ch=CHAPTERS[boardCh];
  const list=questsOf(boardCh).map(q=>{
    const ok=L.questUnlocked(s,q), c=s.cleared[q.id], m=monsterByKey(q.mons[q.mons.length-1]);
    return `<button data-act="quest" data-id="${q.id}" class="quest-card ${q.urgent?'urgent':''} ${ok?'':'locked'}">
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-1">${typeChip(q)}<span class="text-[10px] text-gray-400">${stars(q)}</span>${c?`<span class="ml-auto text-[10px] text-green-300 inline-flex items-center gap-0.5">${icon('check')}${c.clears} 次・<span class="rank rank-${c.rank}">${c.rank}</span></span>`:''}</div>
        <div class="font-black text-sm truncate mt-0.5">${ok?'':icon('lock','text-gray-400')+' '}${q.title}</div>
        <div class="text-[10px] text-gray-400 truncate">${ok?`${q.turns?icon('hourglass')+' '+q.turns+' 回合・':''}委託：${q.client}`:L.lockReason(s,q)}</div>
      </div>
      <div class="qimg"><img src="${m.f}" alt="">${q.mons.length>1?`<span class="tier bg-fuchsia-700 text-white">×${q.mons.length}</span>`:''}</div></button>`; }).join('');
  page({title:'任務板', icon:'scroll', sub:`${ch.name}・${ch.sub}・建議 HR ${ch.hr}`, back:'to-hub', body:`<div class="tabs my-2">${tabs}</div><div class="space-y-2">${list}</div>`});
}
on('board-ch', d => { boardCh=+d.ch; sfx('tap'); board(); });
on('quest', d => { const q=questById(d.id); if(!L.questUnlocked(st(),q)) return toast(L.lockReason(st(),q)); sfx('tap'); curQuest=q; prep(); });

/* ---------- 出發準備 ---------- */
function prep(){
  here='prep';
  const s=st(), q=curQuest, c=s.cleared[q.id], spec=L.hunterSpec(s), w=WEAPONS[spec.weapon];
  const err=L.deckError(s), total=deckTotal(s.deck), items=deckItems(s.deck);
  const goal = q.type==='tutorial'?q.goal : q.type==='gather'?`採集 ${q.gather.need} 個素材（場上有 ${q.gather.spots} 個採集點）`
    : q.type==='capture'?`捕獲 ${monsterByKey(q.mons[0]).n}（HP 30% 以下時讓牠踩中陷阱）`
    : q.type==='seq'?`依序討伐 ${q.mons.map(k=>monsterByKey(k).n).join(' → ')}` : `討伐 ${monsterByKey(q.mons[0]).n}`;
  const monHtml=q.mons.map(k=>{ const m=monsterByKey(k), i=MONSTERS.indexOf(m), sp=L.questMonSpec(q,k), dm=sp.dmgMod;
    return `<button data-act="mon-info" data-i="${i}" class="flex items-center gap-2 panel p-2 flex-1 min-w-0"><div class="w-10 h-10 rounded-lg bg-white p-0.5 shrink-0"><img src="${m.f}" class="w-full h-full object-contain" alt=""></div><div class="min-w-0 text-left"><div class="text-xs font-black truncate">${m.n}</div><div class="text-[10px] text-gray-400">${TIER[m.t].label}・HP ${sp.hp}・攻擊${dm>=0?'+':''}${dm}</div><div class="text-[10px] text-amber-300 inline-flex items-center">看招式${icon('chev')}</div></div></button>`; }).join('');
  const drops = q.type==='tutorial' ? '' : `<div class="text-[10px] text-gray-400 mt-1">＋ 魔物素材：每隻一般素材 ×2。捕獲、★★★、緊急任務或 S 評價另得稀有素材。</div>`;
  page({title:q.title, sub:`${CHAPTERS[q.ch].name}・${CHAPTERS[q.ch].sub}`, back:'board', body:`
    <div class="quest-scroll mt-1">
      <div class="flex items-center gap-2 mb-1">${typeChip(q)}<span class="text-[11px] text-amber-200">${stars(q)}</span>${c?`<span class="ml-auto text-[10px] text-green-300">最佳 ${c.best} 回合・<span class="rank rank-${c.rank}">${c.rank}</span></span>`:''}</div>
      <div class="text-[11px] text-amber-200/80">委託人：${q.client}</div>
      <div class="text-sm leading-relaxed mt-1 text-amber-50" style="white-space:pre-line">${q.text}</div>
      <div class="border-t border-amber-900/60 mt-2 pt-2 text-[12px] space-y-0.5">
        <div class="irow">${icon('target')}<div><b>目標</b>：${goal}</div></div>
        ${q.turns?`<div class="irow">${icon('hourglass')}<div><b>回合上限</b>：${q.turns}</div></div><div class="irow">${icon('cat')}<div><b>貓車</b>：3 次</div></div>`:''}
        <div class="irow pt-1">${icon('present')}<div><b>報酬</b></div></div><div class="flex flex-wrap">${dropsHtml(q.reward)}</div>${drops}
        <div class="text-[10px] text-gray-400">HR 經驗 +${c?Math.ceil(q.exp/2)+'（重複）':q.exp}</div>
      </div>
    </div>
    <div class="sec">${icon('claw')}出場魔物</div>
    <div class="flex gap-2">${monHtml}</div>
    <div class="sec">${icon('armor')}裝備</div>
    <button data-act="hunter" class="panel p-2 w-full text-left flex items-center gap-2"><span class="tile">${micon(w.icon)}</span><div class="flex-1 min-w-0"><div class="text-xs font-black">${w.name} Lv${spec.wlv}・防具 Lv${spec.alv}${spec.resist?'・抗'+RESISTS[spec.resist]:''}</div><div class="text-[10px] text-gray-400">HP ${w.hp+armorBonus(spec.alv)}・攻擊 ${w.atk+weaponBonus(spec.wlv)}・${w.move} 步・技能【${w.skill.name}】</div></div><span class="text-[11px] text-amber-300 inline-flex items-center shrink-0">更換${icon('chev')}</span></button>
    <button data-act="deck-edit" class="panel p-2 w-full text-left flex items-center gap-2 mt-2"><span class="tile">${micon('cards')}</span><div class="flex-1 min-w-0"><div class="text-xs font-black">牌組 ${total} 張・道具 ${items} 張</div><div class="text-[10px] ${err?'text-red-300':'text-gray-400'}">${err||'單人手牌 4 張'}</div></div><span class="text-[11px] text-amber-300 inline-flex items-center shrink-0">編輯${icon('chev')}</span></button>`,
    footer: q.type==='tutorial'
      ? `${s.tutorialDone?'':'<button data-act="skip-tutorial" class="btn btn-lg btn-secondary">跳過教學</button>'}<button data-act="depart" class="btn btn-lg btn-primary flex-1">${s.tutorialDone?'重玩訓練':'開始訓練'}${icon('next')}</button>`
      : `<button data-act="depart" class="btn btn-lg btn-primary flex-1" ${err?'disabled':''}>${err?'牌組不符規定':`${icon('swords')}出發！`}</button>`});
}
on('depart', () => { const q=curQuest; if(q.type==='tutorial') return runTutorial(); if(L.deckError(st())) return toast(L.deckError(st())); runQuest(q); });
on('skip-tutorial', async () => { if(await confirmBox('跳過新手訓練？','第一章會直接開放。之後可以從任務板重玩訓練。','跳過','取消')){ skipTutorial(); } });
function skipTutorial(){ const s=st(); s.tutorialDone=true; save(); toast('已跳過新手訓練，第一章開放！'); boardCh=1; hub(); }

/* ---------- 牌組 ---------- */
function deckEdit(){
  here='deck';
  const s=st(); L.fixDeck(s); const err=L.deckError(s), rule=DECK_RULES.story;
  page({title:'編輯牌組', icon:'cards', sub:`${rule.min}–${rule.max} 張・道具最多 ${rule.items} 張・只能放持有的卡`, back:'deck-back', body:`
    <div class="panel p-2 my-1 flex items-center justify-around text-center">
      <div><div class="text-[10px] text-gray-400">總牌數</div><div class="font-black text-lg">${deckTotal(s.deck)}<span class="text-gray-500 text-xs">/${rule.max}</span></div></div>
      <div><div class="text-[10px] text-gray-400">道具卡</div><div class="font-black text-lg">${deckItems(s.deck)}<span class="text-gray-500 text-xs">/${rule.items}</span></div></div>
      <div class="text-[11px] text-red-400 font-bold w-28">${err}</div></div>
    <div class="flex gap-2 my-2"><button data-act="deck-all" class="btn btn-sm btn-secondary flex-1">${icon('cards')}全部放進去</button><button data-act="forge" class="btn btn-sm btn-secondary flex-1">${icon('anvil')}去工房做更多卡</button></div>
    ${deckListHtml(s.deck,'story-adj',s.owned,L.hunterSpec(s))}`,
    footer:`<button data-act="deck-back" class="btn btn-lg btn-primary flex-1" ${err?'disabled':''}>${err||icon('check')+'完成'}</button>`});
}
on('deck-edit', () => openFrom('deck', deckEdit));
on('deck-back', () => { save(); backFrom('deck'); });
on('story-adj', d => { const s=st(), n=(s.deck[d.id]||0)+(+d.d); if(n<0||n>(s.owned[d.id]||0)) return; s.deck[d.id]=n; save(); const y=$('screen-view').querySelector('.page-body').scrollTop; deckEdit(); $('screen-view').querySelector('.page-body').scrollTop=y; });
on('deck-all', () => { const s=st(); s.deck={...s.owned}; while(deckItems(s.deck)>DECK_RULES.story.items){ const k=CARD_ORDER.filter(id=>CARDS_DB[id].isItem&&s.deck[id]>0).pop(); s.deck[k]--; } while(deckTotal(s.deck)>DECK_RULES.story.max){ const k=['basic','heavy','shield','dodge'].find(id=>s.deck[id]>2); if(!k) break; s.deck[k]--; } save(); deckEdit(); });

/* ---------- 工房 ---------- */
function forge(){
  here='forge';
  const s=st();
  const tabs=[['weapon','gs','武器'],['armor','armor','防具'],['card','cards','卡牌']].map(([k,ic,l])=>`<button class="${forgeTab===k?'on':''}" data-act="forge-tab" data-t="${k}">${icon(ic)}${l}</button>`).join('');
  let body='';
  if(forgeTab==='weapon') body=WEAPON_IDS.map(w=>{ const W=WEAPONS[w], lv=s.weapons[w]||1, n=L.weaponNext(s,w), ok=n&&L.canAfford(s,n.cost);
    return `<div class="panel p-3"><div class="flex items-center gap-2"><span class="tile">${micon(W.icon)}</span><div class="flex-1"><div class="font-black text-sm">${W.name} <span class="text-amber-300">Lv${lv}</span>${s.hunter.weapon===w?' <span class="chip bg-sky-700 text-white">使用中</span>':''}</div><div class="text-[10px] text-gray-400">攻擊 ${W.atk+weaponBonus(lv)}・技能 ${W.skill.dmg+weaponBonus(lv)} 傷${n?` → Lv${n.lv}：攻擊 ${W.atk+weaponBonus(n.lv)}・技能 ${W.skill.dmg+weaponBonus(n.lv)}`:'（已滿級）'}</div></div>
      ${n?`<button data-act="craft-weapon" data-w="${w}" class="btn btn-sm ${ok?'btn-primary':'btn-secondary opacity-60'}">強化</button>`:''}</div>
      ${n?`<div class="mt-2 flex flex-wrap">${costHtml(n.cost)}</div>`:''}</div>`; }).join('');
  if(forgeTab==='armor'){ const n=L.armorNext(s), ok=n&&L.canAfford(s,n.cost);
    body=`<div class="panel p-3"><div class="flex items-center gap-2"><span class="tile">${micon('armor')}</span><div class="flex-1"><div class="font-black text-sm">獵人防具 <span class="text-amber-300">Lv${s.armor.lv}</span></div><div class="text-[10px] text-gray-400">最大 HP +${armorBonus(s.armor.lv)}${n?` → Lv${n.lv}：+${armorBonus(n.lv)}${n.lv===ARMOR_MAX_LV?'，並可選一種異常抗性':''}`:'（已滿級）'}</div></div>
      ${n?`<button data-act="craft-armor" class="btn btn-sm ${ok?'btn-primary':'btn-secondary opacity-60'}">強化</button>`:''}</div>
      ${n?`<div class="mt-2 flex flex-wrap">${costHtml(n.cost)}</div>`:''}</div>
      ${s.armor.lv>=ARMOR_MAX_LV?resistPicker():''}`; }
  if(forgeTab==='card') body=CARD_ORDER.map(id=>{ const c=CARDS_DB[id], r=CARD_RECIPES[id], own=s.owned[id]||0, n=L.cardNext(s,id), ok=n&&L.canAfford(s,n.cost);
    return `<div class="panel p-3 ${own?'':'border-dashed'}"><div class="flex items-center gap-2"><div class="card-ic ${c.type}">${micon(c.glyph)}</div>
      <div class="flex-1 min-w-0"><div class="font-black text-sm">${c.name} ${own?'':'<span class="chip bg-fuchsia-700 text-white">未解鎖</span>'}</div><div class="text-[10px] text-gray-400">持有 ${own}/${r.max}${c.isItem?'・道具':''}</div></div>
      ${n?`<button data-act="craft-card" data-id="${id}" class="btn btn-sm ${ok?'btn-primary':'btn-secondary opacity-60'}">${own?'製作':'解鎖'}</button>`:`<span class="text-[10px] text-gray-500">${r.cost?'已滿':'基本卡'}</span>`}</div>
      ${n?`<div class="mt-2 flex flex-wrap">${costHtml(n.cost)}</div>`:''}</div>`; }).join('');
  page({title:'工房', icon:'anvil', sub:'「素材帶來了？交給我吧！」', back:'forge-back', body:`<div class="tabs my-2">${tabs}</div><div class="space-y-2">${body}</div>`});
}
function resistPicker(){ const s=st();
  return `<div class="panel p-3"><div class="text-sm font-black mb-2 flex items-center gap-1.5"><span class="text-amber-300">${icon('resist')}</span>防具抗性<span class="text-[10px] text-gray-400 font-normal">（可隨時更換）</span></div><div class="seg">${[['','無'],...Object.entries(RESISTS)].map(([k,l])=>`<button class="${(s.armor.resist||'')===k?'on':''}" data-act="set-resist" data-k="${k}">${k?'抗'+l:l}</button>`).join('')}</div></div>`; }
on('forge-tab', d => { forgeTab=d.t; sfx('tap'); forge(); });
on('forge-back', () => backFrom('forge'));
const crafted = (msg) => { save(); sfx('craft'); toast(msg); S.checkAchievements(null); forge(); };
on('craft-weapon', d => { const s=st(), n=L.weaponNext(s,d.w); if(!n||!L.canAfford(s,n.cost)) return toast('素材不足'); L.craftWeapon(s,d.w); crafted(`${WEAPONS[d.w].name} 強化到 Lv${n.lv}！`); });
on('craft-armor', d => { const s=st(), n=L.armorNext(s); if(!n||!L.canAfford(s,n.cost)) return toast('素材不足'); L.craftArmor(s); crafted(`防具強化到 Lv${n.lv}！`); });
on('craft-card', d => { const s=st(), n=L.cardNext(s,d.id); if(!n||!L.canAfford(s,n.cost)) return toast('素材不足'); const first=!s.owned[d.id]; L.craftCard(s,d.id); crafted(`${first?'解鎖':'製作'}了 ${CARDS_DB[d.id].name}！${deckTotal(s.deck)<=30?'（已放進牌組）':''}`); });
on('set-resist', d => { st().armor.resist=d.k||null; save(); sfx('tap'); (here==='forge'?forge:hunterPage)(); });

/* ---------- 道具箱 ---------- */
function box(){
  here='box';
  const s=st();
  const gen=Object.keys(GENERAL).map(id=>`<div class="panel p-2 flex items-center gap-2">${matIcon(id,28)}<div class="flex-1 min-w-0 text-xs">${matName(id)}</div><b class="text-sm">${L.have(s,id)}</b></div>`).join('');
  const monIds=Object.keys(MATERIALS).filter(id=>MATERIALS[id].kind!=='general'&&L.have(s,id)>0);
  const mon=monIds.length?monIds.map(id=>`<div class="panel p-2 flex items-center gap-2">${matIcon(id,28)}<div class="flex-1 min-w-0 text-[11px] leading-tight">${matName(id)}${MATERIALS[id].kind==='rare'?' <span class="chip bg-amber-500/20 text-amber-300">稀有</span>':''}</div><b class="text-sm">${L.have(s,id)}</b></div>`).join(''):'<div class="text-xs text-gray-500 col-span-2">還沒有魔物素材。完成任務就會取得。</div>';
  const cards=CARD_ORDER.filter(id=>s.owned[id]>0).map(id=>`<div class="panel p-2 flex items-center gap-2 text-xs"><span class="card-ic ${CARDS_DB[id].type}" style="width:28px;height:28px;flex-basis:28px;font-size:22px">${micon(CARDS_DB[id].glyph)}</span><span class="flex-1">${CARDS_DB[id].name}</span><b>${s.owned[id]}</b><span class="text-gray-500 text-[10px]">牌組 ${s.deck[id]||0}</span></div>`).join('');
  page({title:'道具箱', icon:'chest', back:'to-hub', body:`
    <div class="sec">${icon('herb')}通用素材</div><div class="grid grid-cols-2 gap-1.5">${gen}</div>
    <div class="sec">${icon('claw')}魔物素材</div><div class="grid grid-cols-2 gap-1.5">${mon}</div>
    <div class="sec">${icon('cards')}持有卡牌</div><div class="grid grid-cols-2 gap-1.5">${cards}</div>`});
}

/* ---------- 獵人 ---------- */
function hunterPage(){
  here='hunter';
  const s=st();
  page({title:'獵人', icon:'visor', back:'hunter-back', body:`
    <div class="panel p-3 mt-2">
      <div class="flex gap-2">
        <label class="flex-1 min-w-0"><span class="block text-[10px] text-gray-500 mb-0.5">名字</span>
          <input id="hunter-name" value="${esc(s.hunter.name)}" maxlength="8" data-input="hunter-rename" class="w-full bg-black/40 border border-gray-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-400"></label>
        <label class="w-16 shrink-0"><span class="block text-[10px] text-gray-500 mb-0.5">頭像</span>
          <button data-act="hunter-icon" class="av-btn" aria-label="換頭像">${avatar(s.hunter.icon)}</button></label>
      </div></div>
    <div class="sec">${icon('swords')}武器<span class="font-normal text-gray-500">（強化等級各自獨立）</span></div>
    <div class="grid grid-cols-5 gap-1.5">${WEAPON_IDS.map(w=>`<button data-act="hunter-weapon" data-w="${w}" class="wpn-pick ${s.hunter.weapon===w?'sel':''}"><span class="tile sm">${micon(WEAPONS[w].icon)}</span><div class="text-[10px] font-bold mt-0.5">${WEAPONS[w].name}</div><div class="text-[9px] text-amber-300">Lv${s.weapons[w]||1}</div></button>`).join('')}</div>
    <div class="panel p-3 mt-2 text-[11px] text-gray-300 leading-snug">${weaponLine(s.hunter.weapon)}<br><span class="text-amber-200">目前 Lv${s.weapons[s.hunter.weapon]}：攻擊 +${weaponBonus(s.weapons[s.hunter.weapon])}</span></div>
    <div class="sec">${icon('armor')}防具 Lv${s.armor.lv}<span class="font-normal text-gray-500">（HP +${armorBonus(s.armor.lv)}）</span></div>
    ${s.armor.lv>=ARMOR_MAX_LV?resistPicker():'<div class="text-[11px] text-gray-500">防具強化到 Lv4 後可選擇異常抗性</div>'}`});
}
on('hunter-back', () => backFrom('hunter'));
on('hunter-rename', (d,el) => { st().hunter.name=el.value.trim()||'獵人'; save(); });
on('hunter-weapon', d => { st().hunter.weapon=d.w; save(); sfx('tap'); hunterPage(); });
on('hunter-icon', async () => { const v=await modal(`<h2 class="text-lg font-black mb-3">選擇頭像</h2>${iconPickerHtml(st().hunter.icon)}`,[{label:'取消',value:null}],{dismiss:null}); if(v){ st().hunter.icon=v; save(); } hunterPage(); });

/* ---------- 戰鬥與結算 ---------- */
function runQuest(q){
  curQuest=q;
  launchBattle(L.questBattleCfg(st(),q), {title:q.title,
    onFinish:r=>questResult(q,r),
    onAbandon:r=>{ recordBattle(r,false); toast('已放棄任務'); prep(); },
    abandonText:'任務會算失敗（素材不會減少）。'});
}
function runTutorial(){
  curQuest=questById('q0-1');
  startTutorial(L.hunterSpec(st()), {
    onFinish:r=>questResult(curQuest,r),
    onSkip:()=>skipTutorial(),
    onAbandon:()=>{ toast('已離開訓練'); hub(); }});
}
function recordBattle(r, isTutorial){
  if(isTutorial) return [];
  const g={win:r.win, turns:r.turns, damageTaken:r.stats.damageTaken, lastHit:r.stats.lastHit, downed:r.stats.downed, captured:r.stats.captured};
  let fresh=[];
  (r.killed||[]).forEach(k=>{ fresh=fresh.concat(S.recordResult(k.img,true,{...g,win:true})); });
  if(!r.win && r.mon && !r.mon.done) fresh=fresh.concat(S.recordResult(r.mon.img,false,g));
  return fresh;
}
function questResult(q, r){
  const s=st();
  let fresh=recordBattle(r, q.type==='tutorial');
  const res=L.applyQuestResult(s,q,r); save();
  fresh=fresh.concat(S.checkAchievements(null));
  const nq=L.nextQuest(s);
  const title = r.win ? (q.type==='tutorial'?'訓練完成！':r.stats.captured?'捕獲成功！':q.type==='gather'?'採集完成！':'任務完成！') : '任務失敗';
  const hero = !r.win ? ['skull','text-red-400'] : q.type==='tutorial' ? ['cap','text-sky-300'] : r.stats.captured ? ['net','text-emerald-300'] : q.type==='gather' ? ['herb','text-lime-300'] : ['laurel','text-amber-300'];
  const m=r.mon;
  page({title:'任務結算', sub:q.title, body:`
    <div class="text-center pt-2">
      <div class="w-24 h-24 mx-auto rounded-2xl bg-white p-2 mb-2 shadow-2xl"><img src="${m.img}" class="w-full h-full object-contain" alt=""></div>
      <div class="hero-ic mb-2">${micon(hero[0])}</div><h2 class="text-3xl font-black ${r.win?'text-green-400':'text-red-500'}">${title}</h2>
      <p class="text-gray-400 text-xs mt-1">${r.win?'':r.reason}</p>
      ${r.win&&q.type!=='tutorial'?`<div class="rank rank-${res.rank} text-6xl mt-1">${res.rank}</div>`:''}
    </div>
    <div class="grid grid-cols-3 gap-2 text-center mt-3">
      <div class="panel p-2"><div class="text-[10px] text-gray-400 inline-flex items-center gap-1">${icon('hourglass')}回合</div><div class="font-black">${r.turns}${q.turns?`<span class="text-[10px] text-gray-500">/${q.turns}</span>`:''}</div></div>
      <div class="panel p-2"><div class="text-[10px] text-gray-400 inline-flex items-center gap-1">${icon('cat')}貓車</div><div class="font-black">${r.carts}<span class="text-[10px] text-gray-500">/3</span></div></div>
      <div class="panel p-2"><div class="text-[10px] text-gray-400 inline-flex items-center gap-1">${icon('heartbreak')}受到傷害</div><div class="font-black">${r.stats.damageTaken}</div></div>
    </div>
    ${r.win?`<div class="panel p-3 mt-3"><div class="text-[11px] font-bold text-amber-300 mb-1 flex items-center gap-1">${icon('present')}獲得素材</div><div class="flex flex-wrap">${dropsHtml(res.drops)}</div></div>
    <div class="panel p-3 mt-2"><div class="text-[11px] font-bold text-amber-300 mb-1">HR 經驗 +${res.exp}${res.firstClear?'':'（重複挑戰減半）'}</div>${hrBar()}${res.hrAfter>res.hrBefore?`<div class="text-center text-amber-300 font-black mt-1 flex items-center justify-center gap-1">${icon('upgrade')}HR 提升到 ${res.hrAfter}！</div>`:''}</div>`
    :`<div class="panel p-3 mt-3 text-[11px] text-gray-300 leading-relaxed irow"><span class="text-amber-300">${icon('bulb')}</span><div><b class="text-amber-200">提示</b>：${failTip(q,r)}</div></div>`}
    ${res.unlocked.length?`<div class="space-y-1.5 mt-2">${res.unlocked.map(u=>`<div class="panel p-2 text-sm font-black text-amber-200 border-amber-500/60 flex items-center gap-2"><span class="tile sm">${micon(u.icon)}</span>${u.text}</div>`).join('')}</div>`:''}
    <div class="space-y-1.5 mt-2">${achHtml(fresh)}</div>`,
    footer:`<button data-act="to-hub" class="btn btn-lg btn-secondary px-3">${icon('tent')}集會所</button>
      ${q.type==='tutorial'?'':`<button data-act="retry" class="btn btn-lg btn-secondary px-3">${icon('retry')}再挑戰</button>`}
      ${nq&&r.win?`<button data-act="quest" data-id="${nq.id}" class="btn btn-lg btn-primary flex-1">下一個任務${icon('next')}</button>`:`<button data-act="retry-prep" class="btn btn-lg btn-primary flex-1">${r.win?icon('scroll')+'任務板':'調整後再戰'}</button>`}`});
}
function failTip(q,r){
  if(r.reason.includes('時間')) return '回合不夠用：多帶攻擊牌和技能卡，或到工房強化武器。';
  if(r.reason.includes('捕獲')) return '捕獲任務要在魔物 HP 30% 以下（血條綠線左邊）時讓牠踩到陷阱，別把牠打死。';
  if(r.reason.includes('貓車')) return '看清楚紅色斜紋格再結束回合，帶多一點翻滾、舉盾和回復藥。防具強化可以提高 HP。';
  return '調整牌組或到工房強化後再試一次。';
}
on('retry', () => runQuest(curQuest));
on('retry-prep', () => { if(curQuest && curQuest.type!=='tutorial' && !st().cleared[curQuest.id]) prep(); else board(); });

registerNav({storyNew, storyContinue:hub, storyHub:hub, storyBoard:board});
export const _debug = {hub, board, prep:(id)=>{curQuest=questById(id); prep();}, forge, box, hunterPage, deckEdit, runQuest:id=>runQuest(questById(id)), questResult};
