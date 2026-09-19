/* 入口：註冊畫面、處理除錯網址 */
import * as S from './save.js';
import * as E from './engine/battle.js';
import { B } from './engine/battle.js';
import { registerNav, titleScreen, menuScreen, settingsScreen, recordsScreen, go } from './ui/menu.js';
import './ui/free.js';
import { _debug as storyDebug } from './ui/story.js';
import { tutState } from './ui/tutorial.js';
import { $, showScreen, setInstant, toast } from './ui/dom.js';
import { launchBattle } from './ui/battle-view.js';
import * as hex from './engine/hex.js';
import { CARDS_DB } from './data/cards.js';

registerNav({
  title:titleScreen, menu:menuScreen, settings:settingsScreen, records:recordsScreen,
});

document.body.classList.toggle('fs-lg', S.settings.font==='lg');

/* 除錯與測試：網址 #quick 直接開一場自由對戰，#menu 直接到主選單…… */
window.__mh = {S, E, B, launchBattle, setInstant, hex, CARDS_DB, story:storyDebug, tutState};
const hash = location.hash.replace('#','');
if(hash==='quick' || hash==='quick1'){
  launchBattle({mode:'free', hunters:hash==='quick1'?[{name:'大劍',icon:'🗡️',weapon:'gs'}]:[{name:'大劍',icon:'🗡️',weapon:'gs'},{name:'片手劍',icon:'🛡️',weapon:'sns'}],
    deck:Object.entries({basic:5,heavy:4,skill:3,dodge:4,shield:4,potion:3,meat:2,flash:1,trap:2,bomb:2}).flatMap(([k,n])=>Array(n).fill(k)),
    mons:[{key:'image001'}], carts:hash==='quick1'?3:null, objective:'hunt'}, {title:'測試'});
}
else if(hash==='menu') menuScreen();
else if(hash==='settings') settingsScreen();
else if(hash==='records') recordsScreen();
else if(hash==='free') go('free');
else if(hash==='story') go(S.story?'storyContinue':'storyNew');
else titleScreen();
