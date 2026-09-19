/* 劇情模式：章節與任務
   type: tutorial / hunt（討伐）/ capture（捕獲）/ gather（採集）/ timed（限時討伐）/ seq（連續狩獵）
   mons: 出場魔物（連續狩獵依序登場），turns: 回合上限，reward: 固定報酬，exp: HR 經驗
   urgent: 緊急任務（清關後解鎖下一章），req: 本章需先完成幾個其他任務 */
export const CHAPTERS = [
  {id:0,name:'序章',sub:'新手訓練',hr:1},
  {id:1,name:'第一章',sub:'古代樹森林',hr:1},
  {id:2,name:'第二章',sub:'大蟻塚荒地',hr:3},
  {id:3,name:'第三章',sub:'陸珊瑚台地・瘴氣之谷',hr:5},
  {id:4,name:'第四章',sub:'龍結晶之地',hr:7},
  {id:5,name:'終章',sub:'古龍渡',hr:9},
];
export const QUEST_TYPES = {
  tutorial:{label:'訓練',cls:'bg-sky-700 text-white'},
  hunt:{label:'討伐',cls:'bg-red-700 text-white'},
  capture:{label:'捕獲',cls:'bg-emerald-700 text-white'},
  gather:{label:'採集',cls:'bg-lime-700 text-white'},
  timed:{label:'限時',cls:'bg-orange-600 text-white'},
  seq:{label:'連續狩獵',cls:'bg-fuchsia-700 text-white'},
};
export const QUESTS = [
  /* ---------- 序章 ---------- */
  {id:'q0-1',ch:0,type:'tutorial',title:'新人獵人的第一課',client:'訓練所教官',
    text:'「歡迎加入調查團！先在訓練場跟搔鳥過過招。\n　移動、攻擊、閃避、道具，一個一個學起來就好。」',
    goal:'完成新手訓練',mons:['image010'],turns:0,reward:{herb:2,image010n:1,iron:1},exp:5},

  /* ---------- 第一章 古代樹森林 ---------- */
  {id:'q1-1',ch:1,type:'hunt',title:'森林裡的搶匪',client:'古代樹森林調查員',
    text:'「搔鳥把營地的補給物資叼走了，還在附近大搖大擺！\n　牠不強，但會丟石頭，記得看清楚牠要打哪裡再出手。」',
    mons:['image010'],turns:15,reward:{herb:2,iron:1},exp:10},
  {id:'q1-2',ch:1,type:'gather',title:'古代樹的恩惠',client:'營地廚師',
    text:'「藥草和蜂蜜都快見底了，幫我去森林裡採一些回來吧。\n　聽說附近有大兇豺龍在巡邏，採完就快跑！」',
    mons:['image024'],turns:12,gather:{spots:5,need:4},reward:{herb:3,honey:2,bug:2,web:1,rawmeat:1},exp:10},
  {id:'q1-3',ch:1,type:'hunt',title:'貪吃的大顎',client:'糧食補給班',
    text:'「大兇顎龍把我們曬的肉乾整排吞了！\n　牠吃飽會膨脹回血，別讓牠吃太多。」',
    mons:['image015'],turns:15,reward:{rawmeat:2,iron:1},exp:12},
  {id:'q1-4',ch:1,type:'capture',title:'狗頭的首領',client:'生態研究班',
    text:'「想研究大兇豺龍的麻痺牙，需要一隻活的。\n　打到牠開始跛腳（HP 30% 以下）再用陷阱，千萬別打死了。」',
    mons:['image024'],turns:16,reward:{web:2,iron:1},exp:14},
  {id:'q1-5',ch:1,type:'hunt',title:'森林裡的毒霧',client:'採集隊隊長',
    text:'「毒妖鳥在採集點附近噴毒霧，隊員都不敢過去。\n　中毒會一直掉血，帶點回復藥吧。」',
    mons:['image022'],turns:15,reward:{herb:2,honey:1},exp:12},
  {id:'q1-6',ch:1,type:'timed',title:'刺眼的求偶舞',client:'觀星隊',
    text:'「眩鳥一直在閃光，害我們觀測不了星星！\n　10 回合內解決牠。被閃到會暈，別站太近。」',
    mons:['image023'],turns:10,reward:{bug:3,powder:1},exp:14},
  {id:'q1-U',ch:1,type:'hunt',urgent:true,req:4,title:'【緊急】暴走的蠻顎',client:'調查團團長',
    text:'「蠻顎龍闖進了古代樹森林，見什麼咬什麼！\n　牠鼻翼一張開就會狂暴，要速戰速決。成功了就讓你去荒地。」',
    mons:['image033'],turns:20,reward:{iron:2,powder:2,crystal:1},exp:30},

  /* ---------- 第二章 大蟻塚荒地 ---------- */
  {id:'q2-1',ch:2,type:'hunt',title:'泥沼裡的頭冠',client:'荒地調查員',
    text:'「土砂龍用泥巴把道路封住了。\n　被泥漿黏到會減速，注意腳下。」',
    mons:['image011'],turns:15,reward:{iron:2},exp:16},
  {id:'q2-2',ch:2,type:'capture',title:'活捉泥魚龍',client:'生態研究班',
    text:'「我們想研究泥魚龍潛泥的原理，需要活體。\n　把牠打到虛弱後用陷阱捕獲，千萬別打死了。」',
    mons:['image020'],turns:18,reward:{web:1,honey:2},exp:22},
  {id:'q2-3',ch:2,type:'gather',title:'荒地的礦脈',client:'工房老闆',
    text:'「礦石不夠打造新武器啦！去荒地的礦脈挖一些回來。\n　浮空龍在上面飄來飄去，小心被壓扁。」',
    mons:['image007'],turns:12,gather:{spots:5,need:4},reward:{iron:3,powder:2,crystal:1},exp:18},
  {id:'q2-4',ch:2,type:'hunt',title:'膨脹的天空',client:'商隊領隊',
    text:'「浮空龍老是飄到商道上空，貨車都被牠壓壞了。\n　牠飛起來近戰打不到，可以準備投擲小刀。」',
    mons:['image007'],turns:15,reward:{rawmeat:2,bug:1},exp:16},
  {id:'q2-5',ch:2,type:'hunt',title:'滾動的骨球',client:'荒地調查員',
    text:'「骨鎚龍會縮成一顆球滾過來，直線上的東西全部輾平。\n　還會噴睡眠瓦斯，站遠一點比較安全。」',
    mons:['image012'],turns:20,reward:{iron:2,herb:1},exp:22},
  {id:'q2-6',ch:2,type:'timed',title:'荒地的霸者',client:'狩獵愛好者',
    text:'「角龍會潛到地底，從你腳下鑽出來。\n　聽說高手 14 回合就能搞定牠，你行嗎？」',
    mons:['image005'],turns:14,reward:{powder:2,iron:1},exp:26},
  {id:'q2-7',ch:2,type:'hunt',title:'黑色的暴君',client:'商隊領隊',
    text:'「黑角龍把商隊的營地整個掀翻了……\n　牠比角龍更兇，衝撞會把人撞飛。」',
    mons:['image006'],turns:20,reward:{crystal:1,iron:2},exp:28},
  {id:'q2-U',ch:2,type:'hunt',urgent:true,req:5,title:'【緊急】餓鬼降臨',client:'調查團團長',
    text:'「恐暴龍出現了！牠什麼都吃，連其他魔物都不放過。\n　狂暴後的龍屬性吐息非常危險。其他人撤離，交給你了。」',
    mons:['image014'],turns:24,reward:{crystal:2,powder:2},exp:50},

  /* ---------- 第三章 陸珊瑚台地・瘴氣之谷 ---------- */
  {id:'q3-1',ch:3,type:'hunt',title:'樹上的雷光',client:'陸珊瑚調查員',
    text:'「飛雷龍在珊瑚上跳來跳去，全身帶電。\n　被咬到會麻痺，下回合就動不了了。」',
    mons:['image016'],turns:15,reward:{bug:2,honey:1},exp:30},
  {id:'q3-2',ch:3,type:'hunt',title:'冰風滑翔者',client:'陸珊瑚調查員',
    text:'「風漂龍的冰風把台地都凍住了。\n　牠的凍氣會讓人變慢，保持距離觀察。」',
    mons:['image008'],turns:20,reward:{crystal:1,iron:1},exp:34},
  {id:'q3-3',ch:3,type:'capture',title:'瘴氣谷的撕裂者',client:'生態研究班',
    text:'「慘爪龍的刃爪很有研究價值，請活捉牠！\n　被抓傷會流血，別硬扛。」',
    mons:['image019'],turns:20,reward:{web:2,herb:2},exp:36},
  {id:'q3-4',ch:3,type:'seq',title:'陸之女王與天空之王',client:'調查團團長',
    text:'「雌火龍和火龍一起出現了。\n　先打倒雌火龍，火龍就會趕過來。體力要留著。」',
    mons:['image003','image001'],turns:32,reward:{crystal:1,powder:2},exp:50},
  {id:'q3-5',ch:3,type:'seq',title:'櫻與蒼',client:'狩獵愛好者',
    text:'「櫻火龍和蒼火龍，稀有的亞種夫婦！\n　連續兩場硬仗，道具帶夠再出發。」',
    mons:['image004','image002'],turns:32,reward:{crystal:2,honey:2},exp:55},
  {id:'q3-6',ch:3,type:'gather',title:'陸珊瑚的寶藏',client:'工房老闆',
    text:'「陸珊瑚上長了很稀有的結晶。\n　飛雷龍就在附近，採到 4 個就撤退。」',
    mons:['image016'],turns:12,gather:{spots:5,need:4},reward:{crystal:2,honey:2,bug:2},exp:30},
  {id:'q3-7',ch:3,type:'hunt',title:'腐臭的屍套',client:'瘴氣之谷調查員',
    text:'「屍套龍披著屍體出現在瘴氣之谷。\n　牠會吸收瘴氣回血，打要打得快。」',
    mons:['image026'],turns:24,reward:{crystal:1,herb:2},exp:55},
  {id:'q3-U',ch:3,type:'hunt',urgent:true,req:5,title:'【緊急】滅盡之刺',client:'調查團團長',
    text:'「滅盡龍……新大陸的破壞者來了。\n　牠硬化時傷害會被削弱，趁牠沒硬化時全力進攻！」',
    mons:['image009'],turns:26,reward:{crystal:3,powder:2},exp:80},

  /* ---------- 第四章 龍結晶之地 ---------- */
  {id:'q4-1',ch:4,type:'hunt',title:'結晶地的熔岩賊',client:'龍結晶調查員',
    text:'「岩賊龍會把石頭嚼一嚼再噴出來爆炸。\n　隨機落下的岩漿很難躲，看清楚紅色格子。」',
    mons:['image017'],turns:16,reward:{powder:2,iron:1},exp:45},
  {id:'q4-2',ch:4,type:'hunt',title:'冰原的遊魚',client:'龍結晶調查員',
    text:'「凍魚龍會潛進雪裡，從腳下衝出來。\n　被凍到會變慢，保持移動。」',
    mons:['image018'],turns:16,reward:{honey:2,crystal:1},exp:45},
  {id:'q4-3',ch:4,type:'capture',title:'熔岩中的影子',client:'生態研究班',
    text:'「熔岩龍在岩漿裡游泳！我們一定要活捉一隻研究。\n　牠會從岩漿衝出來燒人，陷阱擺好等牠。」',
    mons:['image021'],turns:20,reward:{web:2,iron:2},exp:55},
  {id:'q4-4',ch:4,type:'timed',title:'爆炸岩的主人',client:'狩獵愛好者',
    text:'「爆鎚龍背上都是會爆炸的岩石。\n　14 回合內討伐。牠抖落的爆炸岩也能拿來炸牠！」',
    mons:['image013'],turns:14,reward:{powder:3},exp:60},
  {id:'q4-5',ch:4,type:'seq',title:'爆炸連鎖',client:'工房老闆',
    text:'「岩賊龍和爆鱗龍一起在結晶地搗亂，到處都在爆炸。\n　爆鱗龍會引爆場上所有爆彈，別站在爆彈旁邊！」',
    mons:['image017','image025'],turns:30,reward:{powder:3,crystal:1},exp:70},
  {id:'q4-6',ch:4,type:'hunt',title:'移動的火山',client:'調查團團長',
    text:'「熔山龍正朝著龍結晶之地前進，所到之處都是岩漿。\n　牠行動很慢，但範圍攻擊很廣。」',
    mons:['image030'],turns:26,reward:{crystal:2,iron:2},exp:80},
  {id:'q4-U',ch:4,type:'hunt',urgent:true,req:5,title:'【緊急】炎王降臨',client:'調查團團長',
    text:'「炎王龍現身了！牠的超新星會把周圍兩圈全部燒光。\n　看到超新星的預警，立刻拉開距離！」',
    mons:['image028'],turns:26,reward:{crystal:3,powder:3},exp:110},

  /* ---------- 終章 古龍渡 ---------- */
  {id:'q5-1',ch:5,type:'hunt',title:'鋼之暴風',client:'古龍觀測所',
    text:'「鋼龍的龍捲風把觀測所的屋頂掀了。\n　被風吹到會被推開，別站在地圖邊緣。」',
    mons:['image027'],turns:26,reward:{crystal:2,iron:3},exp:110},
  {id:'q5-2',ch:5,type:'hunt',title:'青炎之妃',client:'古龍觀測所',
    text:'「炎妃龍的熱風會覆蓋整個區域，所有人都會灼燒。\n　帶活力劑去吧。」',
    mons:['image029'],turns:26,reward:{crystal:2,honey:2},exp:110},
  {id:'q5-3',ch:5,type:'hunt',title:'幻獸之雷',client:'古龍觀測所',
    text:'「麒麟會召喚落雷，被打到就會麻痺。\n　牠體型小，但非常危險。」',
    mons:['image031'],turns:26,reward:{crystal:2,bug:3},exp:110},
  {id:'q5-4',ch:5,type:'hunt',title:'引導之光',client:'調查團團長',
    text:'「冥燈龍在吸收龍脈能量，牠的光束會貫穿整條直線。\n　這是通往最終地點的關鍵，拜託你了。」',
    mons:['image032'],turns:26,reward:{crystal:3},exp:120},
  {id:'q5-5',ch:5,type:'seq',title:'炎之夫婦',client:'狩獵愛好者',
    text:'「炎王龍和炎妃龍一起出現了，這是傳說級的挑戰。\n　（自由挑戰，不影響主線）」',
    mons:['image028','image029'],turns:44,reward:{crystal:4,powder:3},exp:180},
  {id:'q5-U',ch:5,type:'hunt',urgent:true,req:4,title:'【最終】黃金之王',client:'調查團團長',
    text:'「一切的源頭：絢輝龍，就在古龍渡的盡頭。\n　新大陸的命運交給你了，獵人。」',
    mons:['image034'],turns:30,hpMul:1.2,reward:{crystal:5},exp:200},
];
export const questById = id => QUESTS.find(q=>q.id===id);
export const questsOf = ch => QUESTS.filter(q=>q.ch===ch);
/* HR：達到 HR k 需要累積經驗 5·(k-1)·(k+2) */
export const hrNeed = k => 5*(k-1)*(k+2);
export function hrOf(exp){let k=1;while(exp>=hrNeed(k+1))k++;return k;}
/* 評價：S 零貓車且回合 ≤60%，A 最多 1 次貓車且回合 ≤80%，B 最多 1 次貓車，其餘 C */
export function rankOf(turns,limit,carts){
  if(!limit) return carts?'B':'S';
  if(carts===0&&turns<=limit*.6) return 'S';
  if(carts<=1&&turns<=limit*.8) return 'A';
  if(carts<=1) return 'B';
  return 'C';
}
