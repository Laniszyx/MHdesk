/* 卡牌資料。type: attack / skill / defend / item。isItem = 消耗品（打出後本場移除）。glyph = 圖示名稱（見 js/icons.js） */
export const CARDS_DB = {
  basic:{id:'basic',type:'attack',isItem:false,name:'基礎斬擊',glyph:'slash'},
  heavy:{id:'heavy',type:'attack',isItem:false,name:'重擊',glyph:'impact'},
  skill:{id:'skill',type:'skill',isItem:false,name:'職業技能',glyph:'spin'},
  dodge:{id:'dodge',type:'defend',isItem:false,name:'翻滾迴避',glyph:'dodge'},
  shield:{id:'shield',type:'defend',isItem:false,name:'舉盾掩護',glyph:'shield'},
  knife:{id:'knife',type:'attack',isItem:false,name:'投擲小刀',glyph:'knife',ranged:2},
  potion:{id:'potion',type:'item',isItem:true,name:'回復藥',glyph:'potion'},
  meat:{id:'meat',type:'item',isItem:true,name:'烤肉',glyph:'meat'},
  flash:{id:'flash',type:'item',isItem:true,name:'閃光彈',glyph:'flash'},
  trap:{id:'trap',type:'item',isItem:true,name:'落穴陷阱',glyph:'trap',place:true},
  shock:{id:'shock',type:'item',isItem:true,name:'麻痺陷阱',glyph:'shock',place:true},
  bomb:{id:'bomb',type:'item',isItem:true,name:'大爆彈桶',glyph:'barrel',place:true},
  dash:{id:'dash',type:'item',isItem:true,name:'強走藥',glyph:'flask'},
  cure:{id:'cure',type:'item',isItem:true,name:'活力劑',glyph:'pill'},
  cannon:{id:'cannon',type:'item',isItem:true,name:'龍擊炮',glyph:'cannon',ranged:3},
};
export const CARD_ORDER = Object.keys(CARDS_DB);

/* 依武器與強化等級算出卡片實際文字（卡片上直接顯示數字） */
export function cardDesc(card, h){
  const atk = h ? h.atk : null;
  const w = h ? h.weapon : null;
  switch(card.id){
    case 'basic': return atk!=null?`相鄰時造成 ${atk} 傷`:'相鄰時造成 武器攻擊 傷害';
    case 'heavy': return atk!=null?`相鄰時造成 ${atk+1} 傷`:'相鄰時造成 武器攻擊+1 傷害';
    case 'skill': return w ? w.skill.desc.replace('{dmg}', h.skillDmg) : '依武器不同：大劍蓄力斬、片手連斬、長槍突進、大錘暈眩、太刀氣刃斬';
    case 'dodge': return '被動：受傷時打出，完全閃躲（連同附加效果）';
    case 'shield': return `被動：受傷時打出，減免 ${h&&w&&w.id==='gs'?3:2} 點${h&&w&&w.id==='lance'?'，相鄰時反擊 1 傷':''}`;
    case 'knife': return '距離 2 以內造成 1 傷，不耗步，打得到飛行中的魔物';
    case 'potion': return `消耗品：恢復 ${h&&w&&w.id==='sns'?4:3} HP`;
    case 'meat': return `消耗品：本回合 +${h&&w&&w.id==='sns'?3:2} 步`;
    case 'flash': return '消耗品：魔物本回合仍會移動，但攻擊被取消。飛行中的魔物會被打下來';
    case 'trap': return '消耗品：放在相鄰格。魔物踩中 -2 HP 並取消攻擊。牠 HP 30% 以下時直接捕獲';
    case 'shock': return '消耗品：放在相鄰格。魔物踩中取消攻擊並暈眩一回合。牠 HP 30% 以下時直接捕獲';
    case 'bomb': return '消耗品：放在相鄰格。耗 1 步點燃或被攻擊引爆，周圍一圈 4 傷（會傷到自己人）';
    case 'dash': return '消耗品：本回合 +1 步，下回合也 +1 步';
    case 'cure': return '消耗品：解除自己所有異常狀態並回復 1 HP';
    case 'cannon': return '消耗品：距離 3 以內造成 4 傷，打得到飛行中的魔物';
  }
  return '';
}

export const DECK_RULES = {free:{min:30,max:30,items:10}, story:{min:20,max:30,items:10}};
export const DECK_PRESETS = {
  balanced:{name:'平衡',desc:'攻守道具均衡，適合新手',counts:{basic:5,heavy:4,skill:3,dodge:4,shield:4,potion:3,meat:2,flash:1,trap:2,bomb:2}},
  attack:{name:'猛攻',desc:'攻擊與技能多，道具少',counts:{basic:7,heavy:6,skill:5,dodge:3,shield:3,knife:2,potion:2,meat:1,bomb:1}},
  items:{name:'道具流',desc:'陷阱爆彈控場',counts:{basic:5,heavy:3,skill:3,dodge:3,shield:3,knife:3,potion:2,flash:2,trap:2,shock:1,bomb:3}},
};
export const deckTotal = counts => Object.values(counts).reduce((a,b)=>a+(b||0),0);
export const deckItems = counts => Object.entries(counts).reduce((a,[k,v])=>a+(CARDS_DB[k]&&CARDS_DB[k].isItem?v:0),0);
export function validateDeck(counts, rule){
  const t=deckTotal(counts), it=deckItems(counts);
  if(t<rule.min||t>rule.max) return rule.min===rule.max?`需剛好 ${rule.min} 張`:`需 ${rule.min}–${rule.max} 張`;
  if(it>rule.items) return `道具最多 ${rule.items} 張`;
  return '';
}
