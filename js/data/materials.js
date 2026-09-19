/* 素材：通用素材 + 每隻魔物一般／稀有素材 */
import { MONSTERS, monsterKey } from './monsters.js';
import { micon } from '../icons.js';

export const GENERAL = {
  herb:{name:'藥草',icon:'herb',cls:'text-green-300'}, honey:{name:'蜂蜜',icon:'honey',cls:'text-amber-300'}, rawmeat:{name:'生肉',icon:'steak',cls:'text-rose-300'},
  bug:{name:'光蟲',icon:'beetle',cls:'text-lime-300'}, web:{name:'蜘蛛網',icon:'web',cls:'text-slate-300'}, iron:{name:'鐵礦石',icon:'ore',cls:'text-stone-300'},
  powder:{name:'爆藥粉',icon:'powder',cls:'text-orange-300'}, crystal:{name:'大地結晶',icon:'crystal',cls:'text-cyan-300'},
};
const PARTS = {
  image001:['火龍之鱗','火龍紅玉'], image002:['蒼火龍之甲殼','蒼火龍逆鱗'], image003:['雌火龍之棘','雌火龍之延髓'],
  image004:['櫻火龍之鱗','櫻火龍紅玉'], image005:['角龍之甲殼','角龍之扭曲角'], image006:['黑角龍之甲殼','黑角龍之延髓'],
  image007:['浮空龍之皮','浮空龍之瓦斯袋'], image008:['風漂龍之鱗','風漂龍之冰晶翼'], image009:['滅盡龍之棘','滅盡龍之天鱗'],
  image010:['搔鳥之羽毛','搔鳥之翼爪'], image011:['土砂龍之泥皮','土砂龍之頭冠'], image012:['骨鎚龍之骨殼','骨鎚龍之尾鎚'],
  image013:['爆鎚龍之岩殼','爆鎚龍之顎'], image014:['蠻顎龍之鱗','蠻顎龍之鼻角'], image015:['大兇顎龍之皮','大兇顎龍之牙'],
  image016:['飛雷龍之毛皮','飛雷龍之電氣袋'], image017:['凍魚龍之鱗','凍魚龍之冰鰭'], image018:['冰牙龍之皮','冰牙龍之尖牙'],
  image019:['慘爪龍之鱗','慘爪龍之刃爪'], image020:['泥魚龍之鱗','泥魚龍之鰭'], image021:['熔岩龍之鱗','熔岩龍之熱甲'],
  image022:['毒妖鳥之皮','毒妖鳥之毒袋'], image023:['眩鳥之羽毛','眩鳥之閃光袋'], image024:['大兇豺龍之皮','大兇豺龍之麻痺牙'],
  image025:['爆鱗龍之鱗','爆鱗龍之爆鱗'], image026:['屍套龍之皮','屍套龍之瘴氣囊'], image027:['黑蝕龍之翼膜','黑蝕龍之異獸因子'],
  image028:['炎王龍之鬃毛','炎王龍之寶玉'], image029:['炎妃龍之鬃毛','炎妃龍之寶玉'], image030:['熔山龍之岩殼','熔山龍之寶玉'],
  image031:['麒麟之皮','麒麟之角'], image032:['冥燈龍之翼','冥燈龍之寶玉'], image033:['恐暴龍之皮','恐暴龍之碎顎'],
  image034:['絢輝龍之金鱗','絢輝龍之寶玉'],
};
/* id 規則：image001 一般素材 = 'image001n'，稀有 = 'image001r' */
export const MATERIALS = {};
for(const [k,v] of Object.entries(GENERAL)) MATERIALS[k] = {...v, kind:'general'};
for(const m of MONSTERS){
  const key = monsterKey(m), [n,r] = PARTS[key];
  MATERIALS[key+'n'] = {name:n, img:m.f, kind:'normal', mon:key};
  MATERIALS[key+'r'] = {name:r, img:m.f, kind:'rare', mon:key};
}
export const matName = id => (MATERIALS[id]||{name:id}).name;
/* 小圖示 HTML：通用素材用圖示，魔物素材用魔物頭像，稀有多一圈金框 */
export function matIcon(id, size=28){
  const m = MATERIALS[id]; if(!m) return '';
  if(m.icon) return `<span class="mat-ico" style="width:${size}px;height:${size}px;font-size:${Math.round(size*.78)}px">${micon(m.icon)}</span>`;
  return `<span class="mat-ico img ${m.kind==='rare'?'rare':''}" style="width:${size}px;height:${size}px"><img src="${m.img}" alt=""></span>`;
}
