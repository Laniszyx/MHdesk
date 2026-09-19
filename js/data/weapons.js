/* 五種武器：基本數值、職業技能、被動 */
export const WEAPONS = {
  gs:{id:'gs',name:'大劍',icon:'gs',hp:15,move:1,atk:2,
    tag:'慢速高傷',
    skill:{name:'真・蓄力斬',dmg:5,desc:'相鄰、耗 1 步：造成 {dmg} 傷'},
    passive:'舉盾掩護減免 3 點（其他武器 2 點）'},
  sns:{id:'sns',name:'片手劍',icon:'sns',hp:13,move:2,atk:2,
    tag:'高速機動',
    skill:{name:'鬼人連斬',dmg:2,desc:'相鄰、耗 1 步：造成 {dmg} 傷，每回合首次使用回 1 步'},
    passive:'回復藥 +4 HP、烤肉 +3 步（其他武器 +3／+2）'},
  lance:{id:'lance',name:'長槍',icon:'lance',hp:14,move:1,atk:2,
    tag:'突進堅守',
    skill:{name:'突進',dmg:3,desc:'耗 1 步：沿直線衝到魔物身邊（最多 3 格，途中不能有障礙）造成 {dmg} 傷'},
    passive:'舉盾成功時，若魔物相鄰則反擊 1 傷'},
  hammer:{id:'hammer',name:'大錘',icon:'hammer',hp:14,move:1,atk:2,
    tag:'暈眩控場',
    skill:{name:'蓄力迴旋',dmg:4,desc:'相鄰、耗 1 步：造成 {dmg} 傷並使魔物暈眩（下回合不移動也不攻擊，之後 2 回合免疫暈眩）'},
    passive:'魔物暈眩時，你的攻擊牌傷害 +1'},
  ls:{id:'ls',name:'太刀',icon:'ls',hp:13,move:1,atk:2,
    tag:'練氣見切',
    skill:{name:'氣刃斬',dmg:2,desc:'相鄰、耗 1 步：造成 {dmg} + 練氣值 傷，之後練氣歸零'},
    passive:'每打出一張攻擊牌累積 1 練氣（上限 3）。翻滾迴避成功時，若魔物相鄰則見切反擊 2 傷'},
};
export const WEAPON_IDS = Object.keys(WEAPONS);
export const WEAPON_MAX_LV = 4;
export const ARMOR_MAX_LV = 4;
/* 武器等級 Lv1–4：攻擊 +0/+1/+2/+3。防具等級 Lv1–4：HP +0/+2/+4/+6，Lv4 可選一種異常抗性 */
export const weaponBonus = lv => Math.max(0,(lv||1)-1);
export const armorBonus = lv => Math.max(0,(lv||1)-1)*2;
export const RESISTS = {burn:'灼燒',poison:'中毒',stun:'麻痺'};
