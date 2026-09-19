/* 工房配方（輕量版）
   武器：每種 Lv1→Lv4，每級攻擊 +1。防具：Lv1→Lv4，每級 HP +2，Lv4 可選異常抗性。
   卡牌：每次製作 +1 張持有數，直到上限。未持有的卡牌製作一次即解鎖。 */
export const WEAPON_RECIPES = {
  gs:{2:{image015n:2,iron:2}, 3:{image005n:2,image010n:1,iron:3,crystal:1}, 4:{image001r:1,image030n:2,crystal:3}},
  sns:{2:{image016n:2,iron:2}, 3:{image011n:2,image020n:1,iron:3,crystal:1}, 4:{image019r:1,image033n:2,crystal:3}},
  lance:{2:{image023n:2,iron:2}, 3:{image006n:2,image007n:1,iron:3,crystal:1}, 4:{image002r:1,image017n:2,crystal:3}},
  hammer:{2:{image024n:2,iron:2}, 3:{image012n:2,image014n:1,iron:3,crystal:1}, 4:{image013r:1,image013n:2,crystal:3}},
  ls:{2:{image022n:2,iron:2}, 3:{image020n:2,image010n:1,iron:3,crystal:1}, 4:{image025r:1,image008n:2,crystal:3}},
};
export const ARMOR_RECIPES = {
  2:{image016n:1,image023n:2,iron:1},
  3:{image014n:1,image012n:2,iron:2,crystal:1},
  4:{image025n:2,image021n:2,crystal:2},
};
/* start = 新遊戲的持有數，max = 上限，cost = 每製作一張的花費 */
export const CARD_RECIPES = {
  basic:{start:8,max:8,cost:null},
  heavy:{start:4,max:6,cost:{iron:2}},
  skill:{start:3,max:5,cost:{iron:1,crystal:1}},
  dodge:{start:3,max:6,cost:{image016n:1,web:1}},
  shield:{start:3,max:6,cost:{iron:2}},
  knife:{start:0,max:3,cost:{iron:2,image015n:1}},
  potion:{start:2,max:5,cost:{herb:2,honey:1}},
  meat:{start:1,max:3,cost:{rawmeat:2}},
  flash:{start:1,max:3,cost:{bug:2}},
  trap:{start:2,max:4,cost:{web:2,iron:1}},
  shock:{start:0,max:2,cost:{web:1,image016r:1}},
  bomb:{start:1,max:3,cost:{powder:2,iron:1}},
  dash:{start:0,max:2,cost:{honey:2,bug:1}},
  cure:{start:0,max:2,cost:{herb:1,honey:1,bug:1}},
  cannon:{start:0,max:1,cost:{crystal:2,powder:2,iron:2}},
};
export const startingOwned = () => Object.fromEntries(Object.entries(CARD_RECIPES).map(([k,v])=>[k,v.start]));
