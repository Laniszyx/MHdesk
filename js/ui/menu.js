/* 標題、主選單、設定、圖鑑與紀錄 */
import { MONSTERS, TIER, SOLO_HP, movesetOf, COMMON, FX, monsterKey } from '../data/monsters.js';
import { MATERIALS, matIcon } from '../data/materials.js';
import { QUESTS, CHAPTERS, hrOf } from '../data/quests.js';
import { WEAPONS } from '../data/weapons.js';
import * as S from '../save.js';
import { play as sfx, BGM_AVAILABLE } from '../audio.js';
import { $, on, esc, page, showScreen, toast, modal, confirmBox, switchHtml } from './dom.js';

export const VERSION = 'v2.0';
let nav = {};                               // 其他模組註冊的畫面入口
export const registerNav = o => Object.assign(nav, o);
export const go = (name, ...a) => { sfx('tap'); nav[name](...a); };
on('go', d => go(d.to, d.arg));

/* ---------- 標題 ---------- */
export function titleScreen(){
  showScreen('view');
  const m = MONSTERS[Math.floor(Math.random()*MONSTERS.length)];
  const st = S.story;
  const prog = st ? (()=>{ const ch=[...CHAPTERS].reverse().find(c=>c.id===0||st.cleared['q'+(c.id-1)+'-U']||(c.id===1&&st.tutorialDone)); return `上次進度：${ch?ch.name+' '+ch.sub:'序章'}・HR ${hrOf(st.exp)}・${WEAPONS[st.hunter.weapon].name}`; })() : '';
  $('screen-view').innerHTML = `
  <div data-act="go" data-to="menu" class="flex-1 flex flex-col items-center justify-center px-6 text-center relative overflow-hidden">
    <div class="absolute inset-0 flex items-center justify-center pointer-events-none" style="opacity:.13;filter:blur(1px) grayscale(.3)"><img src="${m.f}" class="w-[70vw] max-w-sm rounded-[30%] bg-white" alt=""></div>
    <div class="relative">
      <div class="text-[11px] tracking-[.4em] text-amber-400 font-bold">HUNTING BOARD</div>
      <h1 class="text-4xl font-black mt-2 drop-shadow-lg">狩獵戰棋</h1>
      <div class="text-gray-400 font-bold mt-1">六角格版</div>
      ${prog?`<div class="mt-6 text-[11px] text-amber-200 bg-black/40 rounded-full px-3 py-1 inline-block">${prog}</div>`:''}
      <div class="mt-10 text-sm text-gray-200 animate-pulse">點擊畫面開始</div>
    </div>
    <div class="absolute bottom-4 text-[10px] text-gray-600">${VERSION}</div>
  </div>`;
}

/* ---------- 主選單 ---------- */
export function menuScreen(){
  const st = S.story, r = S.records;
  const btn = (act, to, icon, name, desc, main=false) => `<button data-act="${act}" data-to="${to}" class="menu-btn ${main?'main':''}"><span class="mi">${icon}</span><span class="flex-1 min-w-0"><span class="block font-black">${name}</span><span class="block text-[11px] text-gray-400">${desc}</span></span><span class="text-gray-500">›</span></button>`;
  page({title:'狩獵戰棋', sub:'主選單', right:`<button data-act="go" data-to="title" class="tap px-2 text-[11px] text-gray-500">標題</button>`,
    body:`<div class="space-y-3 pt-2">
      ${st?btn('go','storyContinue','📖','劇情模式・繼續',`${esc(st.hunter.name)}・HR ${hrOf(st.exp)}・${WEAPONS[st.hunter.weapon].name}`,true):btn('go','storyNew','📖','劇情模式','新手教學、任務、素材與工房',true)}
      ${st?btn('go','storyNew','🆕','劇情模式・新遊戲','重新開始（會覆蓋目前進度）'):''}
      ${btn('go','free','⚔️','自由對戰','1–2 位獵人，34 隻魔物任選')}
      ${btn('go','records','🏆','圖鑑與紀錄',`討伐 ${r.totals.wins} 次・圖鑑 ${S.speciesWonCount()}/${MONSTERS.length}・成就 ${Object.keys(r.ach).length}/${S.ACH.length}`)}
      ${btn('go','settings','⚙️','設定','音效、動畫速度、字體、備份')}
    </div>`});
}

/* ---------- 設定 ---------- */
export function settingsScreen(back='menu'){
  const s = S.settings;
  const row = (label, ctrl, sub='') => `<div class="set-row"><div class="min-w-0"><div class="text-sm">${label}</div>${sub?`<div class="text-[10px] text-gray-500">${sub}</div>`:''}</div>${ctrl}</div>`;
  const seg = (key, opts) => `<div class="seg w-44 shrink-0">${opts.map(([v,l])=>`<button class="${s[key]===v?'on':''}" data-act="set-val" data-key="${key}" data-v="${v}">${l}</button>`).join('')}</div>`;
  const vol = key => `<input type="range" min="0" max="1" step="0.1" value="${s[key]}" data-input="set-vol" data-key="${key}" class="w-28">`;
  page({title:'⚙️ 設定', back:'settings-back', body:`
    <div class="text-[11px] font-bold text-gray-400 mt-2 mb-1">聲音</div>
    <div class="panel">
      ${row('音效',switchHtml(s.sfx,'set-toggle','sfx'),'目前為合成提示音')}
      ${row('音效音量',vol('sfxVol'))}
      ${row('背景音樂',switchHtml(s.bgm,'set-toggle','bgm'),BGM_AVAILABLE?'':'尚未提供音樂檔，之後加入後自動生效')}
      ${row('震動回饋',switchHtml(s.vibrate,'set-toggle','vibrate'),'手機支援時受傷會震動')}
    </div>
    <div class="text-[11px] font-bold text-gray-400 mt-4 mb-1">遊戲</div>
    <div class="panel">
      ${row('動畫速度',seg('speed',[['fast','快'],['normal','正常'],['slow','慢']]),'魔物行動時每段的停頓')}
      ${row('結束回合前確認',switchHtml(s.confirmEnd,'set-toggle','confirmEnd'),'還有步數或可出的攻擊牌時提醒')}
      ${row('顯示魔物預警格',switchHtml(s.preview,'set-toggle','preview'),'關掉可增加難度')}
      ${row('字體大小',seg('font',[['std','標準'],['lg','大']]))}
    </div>
    <div class="text-[11px] font-bold text-gray-400 mt-4 mb-1">資料</div>
    <div class="panel p-3 space-y-2">
      <p class="text-[11px] text-gray-400 leading-snug">紀錄、劇情進度和設定都存在這台裝置的瀏覽器裡（清除瀏覽資料會一起清掉）。要搬到別台裝置：按「複製備份碼」，到另一台貼進欄位按「還原」。</p>
      <div class="flex gap-2"><button data-act="export" class="tap btn-ghost flex-1 text-xs">📋 複製備份碼</button></div>
      <div class="flex gap-2"><input id="import-box" placeholder="貼上備份碼" class="flex-1 min-w-0 bg-black/40 border border-gray-700 rounded-lg px-2 py-2 text-xs outline-none"><button data-act="import" class="tap btn-primary px-4 text-xs">還原</button></div>
      <div class="flex gap-2 pt-1"><button data-act="reset-story" class="tap btn-ghost flex-1 text-xs text-red-300">清除劇情進度</button><button data-act="reset-records" class="tap btn-ghost flex-1 text-xs text-red-300">清除狩獵紀錄</button></div>
    </div>
    <div class="text-[11px] font-bold text-gray-400 mt-4 mb-1">關於</div>
    <div class="panel p-3 text-[11px] text-gray-400 leading-relaxed">狩獵戰棋：六角格版 ${VERSION}<br>靈感來自魔物獵人系列的非官方同人桌遊模擬器。魔物名稱與圖片版權屬原作者所有。</div>
  `});
  settingsScreen._back = back;
}
on('settings-back', () => go(settingsScreen._back||'menu'));
const applyFont = () => document.body.classList.toggle('fs-lg', S.settings.font==='lg');
on('set-toggle', (d, el) => { S.settings[d.key]=!S.settings[d.key]; S.saveSettings(); el.classList.toggle('on', S.settings[d.key]); sfx('tap'); });
on('set-val', d => { S.settings[d.key]=d.v; S.saveSettings(); applyFont(); settingsScreen(settingsScreen._back); sfx('tap'); });
on('set-vol', (d, el) => { S.settings[d.key]=+el.value; S.saveSettings(); });
document.addEventListener('change', e => { if(e.target.dataset && e.target.dataset.input==='set-vol') sfx('hit'); });
on('export', () => {
  const code=S.exportCode(), fallback=()=>prompt('請手動全選複製備份碼：',code);
  if(navigator.clipboard&&navigator.clipboard.writeText) navigator.clipboard.writeText(code).then(()=>toast('備份碼已複製到剪貼簿'),fallback); else fallback();
});
on('import', () => {
  const v=($('import-box').value||'').trim(); if(!v) return toast('請先貼上備份碼');
  try{ const r=S.importCode(v); toast(r==='all'?'紀錄、劇情與設定已還原':'狩獵紀錄已還原'); applyFont(); settingsScreen(settingsScreen._back); }
  catch(e){ toast('備份碼格式不正確'); }
});
on('reset-story', async () => {
  if(!S.story) return toast('目前沒有劇情進度');
  if(await confirmBox('清除劇情進度？','獵人、素材、工房強化和任務進度都會刪除，無法復原。','清除','取消',true)){ S.clearStory(); toast('已清除劇情進度'); }
});
on('reset-records', async () => {
  if(await confirmBox('清除狩獵紀錄？','勝敗紀錄、圖鑑和成就都會刪除，無法復原。','清除','取消',true)){ S.resetRecords(); toast('已清除狩獵紀錄'); }
});

/* ---------- 圖鑑與紀錄 ---------- */
export function recordsScreen(back='menu'){
  const s=S.records, won=S.speciesWonCount(), unlocked=Object.keys(s.ach).length;
  let html=`<div class="grid grid-cols-3 gap-2 text-center my-2">
    <div class="panel p-2"><div class="text-[10px] text-gray-400">討伐成功</div><div class="font-black text-lg text-green-300">${s.totals.wins}<span class="text-[10px] text-gray-500 font-normal"> / 失敗 ${s.totals.losses}</span></div></div>
    <div class="panel p-2"><div class="text-[10px] text-gray-400">圖鑑</div><div class="font-black text-lg text-amber-300">${won}<span class="text-xs text-gray-500">/${MONSTERS.length}</span></div></div>
    <div class="panel p-2"><div class="text-[10px] text-gray-400">成就</div><div class="font-black text-lg text-purple-300">${unlocked}<span class="text-xs text-gray-500">/${S.ACH.length}</span></div></div></div>`;
  html+=`<b class="text-xs text-amber-300">📖 狩獵圖鑑</b><div class="text-[10px] text-gray-500">點魔物看招式與素材</div><div class="grid grid-cols-4 gap-1.5 mt-1 mb-4">`+MONSTERS.map((m,i)=>{const h=s.hunts[m.f],w=h?h.wins:0;
    return `<button data-act="mon-info" data-i="${i}" class="text-center"><div class="mon-pick ${w?'':'opacity-40 grayscale'}" style="padding:3px"><img src="${m.f}" alt="">${w?`<span class="tier bg-green-600 text-white">✓${w}</span>`:''}</div>
      <div class="text-[9px] mt-0.5 truncate">${m.n}</div><div class="text-[8px] text-gray-500 leading-tight">${h?`${h.wins}勝${h.tries-h.wins}敗${h.bestTurn?'<br>最快 '+h.bestTurn+' 回':''}`:'未遭遇'}</div></button>`;}).join('')+`</div>`;
  html+=`<b class="text-xs text-amber-300">🏅 成就</b><div class="grid grid-cols-2 gap-1.5 mt-1 mb-3">`+S.ACH.map(a=>{const on=!!s.ach[a.id];
    return `<div class="panel p-2 flex gap-2 items-center ${on?'':'opacity-40'}"><span class="text-xl">${on?a.icon:'🔒'}</span><div class="min-w-0"><div class="text-[11px] font-bold truncate">${a.name}</div><div class="text-[9px] text-gray-400 leading-tight">${a.desc}</div></div></div>`;}).join('')+`</div>`;
  page({title:'🏆 圖鑑與紀錄', back:'records-back', body:html});
  recordsScreen._back = back;
}
on('records-back', () => go(recordsScreen._back||'menu'));
export function monsterInfoHtml(m){
  const key=monsterKey(m), ms=movesetOf(m.f), t=TIER[m.t], h=S.records.hunts[m.f];
  const moveRow=a=>`<div class="panel p-2"><div class="text-xs font-bold">${a.name} ${a.dmg?`<span class="text-red-300">${a.dmg} 傷</span>`:''} ${(a.hit||[]).map(k=>FX[k].icon).join('')}</div><div class="text-[10px] text-gray-400">${a.desc}</div></div>`;
  const where=QUESTS.filter(q=>q.mons.includes(key)&&q.type!=='tutorial').map(q=>q.title).join('、');
  return `<div class="flex items-center gap-3 mb-3"><div class="w-20 h-20 rounded-xl bg-white p-1 shrink-0"><img src="${m.f}" class="w-full h-full object-contain" alt=""></div>
    <div><div class="text-xl font-black text-red-300">${m.n}</div><div class="text-[11px] text-gray-400">${t.label}・雙人 HP ${t.hp}・單人 HP ${SOLO_HP[m.t]}・攻擊修正 ${t.dmg>=0?'+':''}${t.dmg}</div>
    <div class="text-[11px] text-gray-400">${h?`${h.wins} 勝 ${h.tries-h.wins} 敗${h.bestTurn?'・最快 '+h.bestTurn+' 回合':''}`:'尚未遭遇'}</div></div></div>
    <div class="text-[11px] font-bold text-amber-300 mb-1">獨家招式</div><div class="space-y-1.5">${ms.s.map(moveRow).join('')}</div>
    <div class="text-[11px] font-bold text-amber-300 mt-2 mb-1">共通招式</div><div class="space-y-1.5">${ms.c.map(k=>moveRow(COMMON[k])).join('')}</div>
    <div class="text-[11px] font-bold text-amber-300 mt-2 mb-1">素材</div>
    <div class="flex gap-3 text-xs">${['n','r'].map(k=>`<span class="flex items-center gap-1">${matIcon(key+k,24)} ${MATERIALS[key+k].name}${k==='r'?'<span class="text-[9px] text-amber-300">稀有</span>':''}</span>`).join('')}</div>
    <div class="text-[10px] text-gray-500 mt-1">稀有素材：捕獲、討伐 ★★★、S 評價或緊急任務可取得</div>
    ${where?`<div class="text-[10px] text-gray-400 mt-2">出現任務：${where}</div>`:''}`;
}
on('mon-info', d => modal(monsterInfoHtml(MONSTERS[+d.i]), [{label:'關閉',value:'x'}], {dismiss:'x'}));
