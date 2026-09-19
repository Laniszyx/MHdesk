/* 共用 UI 工具：data-act 事件分派、toast、抽屜、對話框、畫面切換 */
import { settings } from '../save.js';
import { play as sfx } from '../audio.js';
import { icon, micon } from '../icons.js';

export const $ = id => document.getElementById(id);
export const esc = s => String(s??'').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

/* 任何元素加上 data-act="名稱" 就會呼叫 on('名稱') 註冊的函式，參數是元素的 dataset */
const ACTIONS = {};
export const on = (name, fn) => { ACTIONS[name] = fn; };
document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]');
  if(!el || el.disabled) return;
  const fn = ACTIONS[el.dataset.act];
  if(fn){ e.preventDefault(); fn(el.dataset, el, e); }
});
document.addEventListener('input', e => {
  const el = e.target.closest('[data-input]');
  if(el && ACTIONS[el.dataset.input]) ACTIONS[el.dataset.input](el.dataset, el, e);
});

export function toast(msg){
  const t=$('toast'); t.innerHTML=msg; t.classList.add('show');
  clearTimeout(t._h); t._h=setTimeout(()=>t.classList.remove('show'),1600);
}
export function announce(msg){
  const a=$('announce'); a.innerHTML=msg; a.classList.add('show');
  clearTimeout(a._h); a._h=setTimeout(()=>a.classList.remove('show'),1500);
}
export function toggleDrawer(n, force){
  const d=$('drawer-'+n), b=$('backdrop-'+n); if(!d) return;
  const open = force!==undefined ? force : !d.classList.contains('open');
  d.classList.toggle('open',open); b.classList.toggle('open',open);
}
on('drawer', d => toggleDrawer(d.name));

/* 動畫速度 */
export const SPEEDS = {fast:.45, normal:1, slow:1.6};
export let instant = false;          // 測試用：跳過所有等待
export const setInstant = v => { instant = v; };
export const wait = ms => instant ? Promise.resolve() : new Promise(r=>setTimeout(r, ms*(SPEEDS[settings.speed]||1)));

/* 通用對話框：modal(html, buttons:[{label, icon, cls, value}]) → Promise<value> */
let modalResolve = null;
export function modal(html, buttons=[], {dismiss=null}={}){
  const box=$('modal-box');
  box.innerHTML = html + (buttons.length?`<div class="flex flex-col gap-2 mt-4">${buttons.map((b,i)=>`<button class="btn btn-block ${b.cls||'btn-secondary'}" data-act="modal-btn" data-i="${i}">${b.icon?icon(b.icon):''}${b.label}</button>`).join('')}</div>`:'');
  $('modal').classList.remove('hidden');
  $('modal')._dismiss = dismiss;
  return new Promise(res => { modalResolve = v => { $('modal').classList.add('hidden'); modalResolve=null; res(v); }; box._buttons = buttons; });
}
export const closeModal = v => { if(modalResolve) modalResolve(v); else $('modal').classList.add('hidden'); };
export const modalOpen = () => !$('modal').classList.contains('hidden');
on('modal-btn', d => { sfx('tap'); const b=$('modal-box')._buttons[+d.i]; closeModal(b?b.value:null); });
$('modal').addEventListener('click', e => { if(e.target.id==='modal' && $('modal')._dismiss!==null) closeModal($('modal')._dismiss); });
export const confirmBox = (title, text, ok='確定', cancel='取消', danger=false) =>
  modal(`<h2 class="text-lg font-black mb-2 flex items-center gap-2">${danger?`<span class="text-red-400">${icon('alert')}</span>`:''}${title}</h2><p class="text-sm text-gray-300 leading-relaxed">${text}</p>`,
    [{label:ok, cls:danger?'btn-danger':'btn-primary', value:true},{label:cancel, value:false}], {dismiss:false});

/* 畫面切換 */
export function showScreen(name){
  $('screen-view').classList.toggle('hidden', name!=='view');
  $('screen-game').classList.toggle('hidden', name!=='game');
  document.body.classList.toggle('fs-lg', settings.font==='lg');
}
/* 一般頁面：標題列（返回鈕、圖示、標題）+ 可捲動內容 + 底部按鈕列 */
export function page({title, icon:ic='', sub='', back=null, right='', body='', footer=''}){
  showScreen('view');
  $('screen-view').innerHTML = `
  <header class="shrink-0 px-3 pt-3 pb-2 flex items-center gap-2">
    ${back?`<button data-act="${back}" class="btn btn-icon" aria-label="返回">${icon('back')}</button>`:'<span class="w-1"></span>'}
    <div class="flex-1 min-w-0"><h1 class="text-lg font-black truncate leading-tight">${title}</h1>${sub?`<div class="text-[11px] text-gray-400 truncate">${sub}</div>`:''}</div>
    ${right}
  </header>
  <section class="page-body flex-1 min-h-0 overflow-y-auto px-4 pb-4">${body}</section>
  ${footer?`<footer class="shrink-0 px-4 pb-4 pt-2 flex gap-2">${footer}</footer>`:''}`;
  $('screen-view').scrollTop = 0;
}
export const switchHtml = (on, act, key) => `<button class="switch ${on?'on':''}" data-act="${act}" data-key="${key}" aria-pressed="${on}"></button>`;
