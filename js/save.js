/* 存檔：全部存在瀏覽器 localStorage。
   mhdesk_save_v1     狩獵紀錄與成就（沿用舊版格式，舊玩家紀錄不會遺失）
   mhdesk_story_v1    劇情模式進度
   mhdesk_settings_v1 設定
   mhdesk_free_v1     自由對戰上次的設定 */
import { MONSTERS } from './data/monsters.js';
import { startingOwned } from './data/crafting.js';
import { avatarId } from './icons.js';

const KEYS = {records:'mhdesk_save_v1', story:'mhdesk_story_v1', settings:'mhdesk_settings_v1', free:'mhdesk_free_v1'};
const read = k => { try { return JSON.parse(localStorage.getItem(k)); } catch(e){ return null; } };
const write = (k,v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch(e){} };

/* ---------- 狩獵紀錄 ---------- */
const freshRecords = () => ({hunts:{}, ach:{}, totals:{wins:0,losses:0}});
export let records = loadRecords();
function loadRecords(){ const s=read(KEYS.records); return (s&&s.hunts&&s.totals)?s:freshRecords(); }
export const saveRecords = () => write(KEYS.records, records);

const speciesWon = s => Object.values(s.hunts).filter(h=>h.wins>0).length;
export const ACH = [
  {id:'first_win',icon:'target',name:'初次狩獵',desc:'首次討伐成功',test:s=>s.totals.wins>=1},
  {id:'win5',icon:'swords',name:'老練獵人',desc:'累計討伐 5 次',test:s=>s.totals.wins>=5},
  {id:'win20',icon:'sabres',name:'狩獵狂',desc:'累計討伐 20 次',test:s=>s.totals.wins>=20},
  {id:'species10',icon:'book',name:'圖鑑收集家',desc:'討伐 10 種不同魔物',test:s=>speciesWon(s)>=10},
  {id:'species_all',icon:'crown',name:'傳說獵人',desc:'34 種魔物全部討伐',test:s=>speciesWon(s)>=MONSTERS.length},
  {id:'elder',icon:'dragon',name:'古龍討伐者',desc:'討伐任一 ★★★ 魔物',test:s=>MONSTERS.some(m=>m.t===3&&(s.hunts[m.f]||{}).wins>0)},
  {id:'elder_all',icon:'dragon2',name:'古龍終結者',desc:'所有 ★★★ 魔物皆討伐',test:s=>MONSTERS.filter(m=>m.t===3).every(m=>(s.hunts[m.f]||{}).wins>0)},
  {id:'no_damage',icon:'wings',name:'完美狩獵',desc:'一場零受傷討伐',test:(s,g)=>g&&g.win&&g.damageTaken===0},
  {id:'fast',icon:'stopwatch',name:'速攻',desc:'5 回合內討伐',test:(s,g)=>g&&g.win&&g.turns<=5},
  {id:'bomb_kill',icon:'barrel',name:'爆破專家',desc:'用爆彈桶完成最後一擊',test:(s,g)=>g&&g.win&&g.lastHit==='bomb'},
  {id:'trap_kill',icon:'trap',name:'陷阱大師',desc:'用落穴陷阱完成最後一擊',test:(s,g)=>g&&g.win&&g.lastHit==='trap'},
  {id:'comeback',icon:'embers',name:'絕地反攻',desc:'有獵人倒下後仍討伐成功',test:(s,g)=>g&&g.win&&g.downed},
  {id:'capture1',icon:'net',name:'捕獲名人',desc:'首次捕獲魔物',test:(s,g)=>g&&g.win&&g.captured},
  {id:'story_ch1',icon:'pine',name:'森林的守護者',desc:'劇情模式完成第一章',test:()=>storyChapterDone(1)},
  {id:'story_end',icon:'sunrise',name:'新大陸的英雄',desc:'劇情模式討伐絢輝龍',test:()=>!!(story&&story.cleared['q5-U'])},
  {id:'forge_max',icon:'anvil',name:'名匠之作',desc:'把任一武器強化到 Lv4',test:()=>!!(story&&Object.values(story.weapons).some(l=>l>=4))},
];
const storyChapterDone = ch => !!(story && story.cleared['q'+ch+'-U']);
/* 記錄一隻魔物的勝敗並檢查成就。回傳新解鎖的成就 */
export function recordResult(monFile, win, g){
  const h = records.hunts[monFile] || (records.hunts[monFile] = {tries:0,wins:0,bestTurn:null});
  h.tries++;
  if(win){ h.wins++; if(h.bestTurn===null||g.turns<h.bestTurn) h.bestTurn=g.turns; records.totals.wins++; }
  else records.totals.losses++;
  const fresh = checkAchievements(g);
  saveRecords();
  return fresh;
}
export function checkAchievements(g){
  const fresh=[];
  ACH.forEach(a=>{ if(!records.ach[a.id] && a.test(records,g)){ records.ach[a.id]=Date.now(); fresh.push(a); } });
  if(fresh.length) saveRecords();
  return fresh;
}
export const speciesWonCount = () => speciesWon(records);

/* ---------- 設定 ---------- */
export const DEFAULT_SETTINGS = {sfx:true, sfxVol:0.6, bgm:false, bgmVol:0.5, speed:'normal', confirmEnd:true, preview:true, vibrate:true, font:'std'};
export let settings = {...DEFAULT_SETTINGS, ...(read(KEYS.settings)||{})};
export const saveSettings = () => write(KEYS.settings, settings);

/* ---------- 劇情進度 ---------- */
export const STORY_VERSION = 1;
export function newStory(hunter){
  const owned = startingOwned();
  return {v:STORY_VERSION, created:Date.now(), hunter:{name:hunter.name||'獵人', icon:avatarId(hunter.icon), weapon:hunter.weapon||'gs'},
    exp:0, cleared:{}, tutorialDone:false, mats:{},
    weapons:{gs:1,sns:1,lance:1,hammer:1,ls:1}, armor:{lv:1,resist:null},
    owned, deck:{...owned}, lastQuest:null};
}
function migrateStory(s){
  if(!s || typeof s!=='object' || !s.hunter) return null;
  /* 未來改版時在這裡補欄位 */
  s.v = STORY_VERSION;
  s.mats = s.mats||{}; s.cleared = s.cleared||{};
  s.hunter.icon = avatarId(s.hunter.icon);
  s.weapons = {gs:1,sns:1,lance:1,hammer:1,ls:1, ...(s.weapons||{})};
  s.armor = s.armor||{lv:1,resist:null};
  s.owned = {...startingOwned(), ...(s.owned||{})};
  s.deck = s.deck||{...s.owned};
  return s;
}
export let story = migrateStory(read(KEYS.story));
export const saveStory = () => { if(story) write(KEYS.story, story); };
export function setStory(s){ story = s; saveStory(); }
export function clearStory(){ story = null; try{ localStorage.removeItem(KEYS.story); }catch(e){} }

/* ---------- 自由對戰設定 ---------- */
export let freeCfg = read(KEYS.free);
export function saveFreeCfg(c){ freeCfg = c; write(KEYS.free, c); }

/* ---------- 備份碼 ---------- */
export function exportCode(){
  const all = {kind:'mhdesk', v:2, records, story, settings, free:freeCfg};
  return btoa(unescape(encodeURIComponent(JSON.stringify(all))));
}
/* 支援新版（全部資料）與舊版（只有狩獵紀錄）備份碼 */
export function importCode(code){
  const s = JSON.parse(decodeURIComponent(escape(atob(code.trim()))));
  if(s && s.kind==='mhdesk'){
    if(!s.records||!s.records.hunts) throw new Error('bad');
    records = s.records; saveRecords();
    story = migrateStory(s.story); if(story) saveStory(); else clearStory();
    if(s.settings){ settings = {...DEFAULT_SETTINGS, ...s.settings}; saveSettings(); }
    if(s.free) saveFreeCfg(s.free);
    return 'all';
  }
  if(s && s.hunts && s.totals){ records = s; saveRecords(); return 'records'; }
  throw new Error('bad');
}
export function resetRecords(){ records = freshRecords(); saveRecords(); }
