/* SVG 圖示。
   icon('名稱')  單色版：大小跟著文字（1em），顏色跟著文字顏色。用在文字行內、日誌、小按鈕。
   micon('名稱') 魔物圖騰版：仿魔物圖示的雙色剪影加白色切線，要放在白色方塊（.tile、.card-ic、.mat-ico）裡。
   遊戲物件用 game-icons.net 的剪影圖示，介面操作（返回、關閉、加減…）用 Lucide 線條圖示。
   圖示資料在 icon-data.js，由 dev/build-icons.py 產生。 */
import { SPRITE, ICON_NAMES, MH_ICONS } from './icon-data.js';

if(typeof document!=='undefined' && !document.getElementById('icon-sprite')){
  const box = document.createElement('div');
  box.innerHTML = `<svg id="icon-sprite" xmlns="http://www.w3.org/2000/svg" style="position:absolute;width:0;height:0;overflow:hidden" aria-hidden="true">${SPRITE}</svg>`;
  document.body.prepend(box.firstChild);
}
const KNOWN = new Set(ICON_NAMES), MH = new Set(MH_ICONS);
export const icon = (name, cls='') => `<svg class="ic${cls?' '+cls:''}" aria-hidden="true"><use href="#i-${KNOWN.has(name)?name:'info'}"/></svg>`;
export const micon = (name, cls='') => MH.has(name) ? `<svg class="ic mh${cls?' '+cls:''}" aria-hidden="true"><use href="#m-${name}"/></svg>` : icon(name, cls);

/* 獵人頭像 */
export const AVATARS = ['visor','barbute','crested','viking','spartan','knight','samurai','hood','elf','dwarf','cat','fox','wolf','dragon','eagle','bow'];
/* 舊版存檔用 emoji 當頭像，讀檔時換成對應圖示 */
const LEGACY = {'🗡':'knight','🛡':'spartan','🔱':'crested','🔨':'dwarf','⚔':'samurai','🏹':'bow','🐱':'cat','🦊':'fox','🐺':'wolf',
  '🐉':'dragon','🔥':'viking','⭐':'elf','🧑':'visor','👧':'hood','🧔':'viking','👩':'barbute'};
export const avatarId = v => AVATARS.includes(v) ? v : (LEGACY[String(v||'').replace(/️/g,'')] || 'visor');
export const avatar = (v, cls='') => micon(avatarId(v), cls);
