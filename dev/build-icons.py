"""產生 js/icon-data.js：game-icons.net（填色）+ Lucide（線條）SVG sprite。
要加圖示：在 GAME（https://game-icons.net 的「作者/名稱」）或 LUCIDE（https://lucide.dev 的名稱）加一行，
然後在專案根目錄執行 python dev/build-icons.py。下載的原始 SVG 暫存在 dev/.icon-cache（不進版控）。"""
import urllib.request,concurrent.futures as cf,os,re,json
GI='https://cdn.jsdelivr.net/gh/game-icons/icons@master/'
LU='https://cdn.jsdelivr.net/npm/lucide-static@0.469.0/icons/'
GAME={
 # 武器
 'gs':'lorc/broadsword','sns':'skoll/gladius','lance':'lorc/barbed-spear','hammer':'lorc/flat-hammer','ls':'delapouite/katana',
 # 卡牌
 'slash':'lorc/sword-slice','impact':'lorc/punch-blast','spin':'lorc/sword-spin','dodge':'lorc/dodging','shield':'lorc/checked-shield',
 'knife':'lorc/thrown-knife','potion':'delapouite/health-potion','meat':'lorc/meat','flash':'lorc/flash-grenade','trap':'lorc/wolf-trap',
 'shock':'lorc/lightning-trio','barrel':'delapouite/barrel','flask':'lorc/fizzing-flask','pill':'lorc/pill','cannon':'lorc/cannon',
 # 狀態
 'snail':'lorc/snail','bolt':'lorc/focused-lightning','poison':'lorc/poison-bottle','fire':'sbed/fire','bleed':'lorc/bleeding-wound',
 'push':'delapouite/push','wing':'lorc/feathered-wing','rock':'lorc/rock','enrage':'delapouite/enrage','dizzy':'delapouite/knocked-out-stars',
 # 素材
 'herb':'delapouite/herbs-bundle','honey':'lorc/honeypot','steak':'delapouite/steak','beetle':'delapouite/flying-beetle','web':'lorc/spider-web',
 'ore':'faithtoken/ore','powder':'lorc/powder','crystal':'lorc/crystal-growth',
 # 成就與介面
 'target':'lorc/on-target','swords':'lorc/crossed-swords','sabres':'lorc/crossed-sabres','book':'lorc/book-cover','crown':'lorc/crown',
 'dragon':'lorc/dragon-head','dragon2':'lorc/dragon-spiral','wings':'lorc/angel-wings','stopwatch':'lorc/stopwatch','embers':'lorc/burning-embers',
 'net':'lorc/fishing-net','pine':'lorc/pine-tree','sunrise':'lorc/sunrise','anvil':'lorc/anvil-impact','armor':'delapouite/chest-armor',
 'tent':'delapouite/camping-tent','scroll':'lorc/scroll-unfurled','chest':'lorc/locked-chest','cards':'faithtoken/card-draw','cat':'lorc/cat',
 'skull':'lorc/skull-crossed-bones','claw':'lorc/claw-slashes','roar':'lorc/sonic-shout','explosion':'lorc/explosion-rays','heal':'sbed/health-increase',
 'recycle':'lorc/recycle','laurel':'lorc/laurel-crown','dice':'delapouite/dice-six-faces-five','medal':'lorc/medal','trophy':'lorc/trophy',
 'map':'lorc/treasure-map','bell':'lorc/ringing-bell','hourglass':'lorc/hourglass','present':'delapouite/present','eye':'lorc/semi-closed-eye',
 'door':'delapouite/exit-door','footprint':'lorc/footprint','bulb':'lorc/light-bulb','pin':'delapouite/position-marker','chain':'lorc/crossed-chains',
 'resist':'lorc/magic-shield','heartbreak':'lorc/broken-heart','cog':'lorc/cog','quill':'lorc/quill-ink','cap':'delapouite/graduate-cap',
 'upgrade':'delapouite/upgrade','whistle':'delapouite/whistle','hazard':'lorc/hazard-sign','spanner':'lorc/spanner','sprint':'lorc/sprint',
 # 頭像
 'visor':'lorc/visored-helm','barbute':'lorc/barbute','crested':'lorc/crested-helmet','viking':'delapouite/viking-helmet',
 'spartan':'delapouite/spartan-helmet','knight':'delapouite/black-knight-helm','samurai':'delapouite/samurai-helmet','hood':'lorc/hood',
 'elf':'kier-heyl/elf-helmet','dwarf':'kier-heyl/dwarf-helmet','fox':'lorc/fox-head','wolf':'lorc/wolf-head','eagle':'delapouite/eagle-head','bow':'lorc/pocket-bow',
}
LUCIDE={'back':'arrow-left','next':'arrow-right','chev':'chevron-right','close':'x','pause':'pause','play':'play','help':'circle-help',
 'log':'scroll-text','settings':'settings','undo':'undo-2','retry':'rotate-ccw','home':'house','copy':'clipboard-copy','lock':'lock',
 'check':'check','alert':'triangle-alert','plus':'plus','minus':'minus','user':'user','users':'users','hide':'chevron-down','info':'info'}
HERE=os.path.dirname(os.path.abspath(__file__)); CACHE=os.path.join(HERE,'.icon-cache')
os.makedirs(os.path.join(CACHE,'svg'),exist_ok=True); os.makedirs(os.path.join(CACHE,'lu'),exist_ok=True)
def fetch(url,f):
  if not os.path.exists(f):
    with urllib.request.urlopen(url,timeout=30) as r: open(f,'wb').write(r.read())
  return open(f,encoding='utf-8').read()
num=re.compile(r'-?\d*\.\d+')
def fmt(x):
  s=('%.1f'%x).rstrip('0').rstrip('.')
  if s in ('-0',''): s='0'
  if s.startswith('0.'): s=s[1:]
  return s.replace('-0.','-.')
def short(d):
  # 數字四捨五入到小數 1 位；前一個字元是數字或小數點時補空白，避免兩個數字黏在一起
  def one(m):
    v=fmt(float(m.group())); prev=d[m.start()-1] if m.start()>0 else ''
    return (' ' if v[0]!='-' and (prev.isdigit() or prev=='.') else '')+v
  return num.sub(one, d)
def game(k,p):
  s=fetch(GI+p+'.svg',os.path.join(CACHE,'svg',p.replace('/','__')+'.svg'))
  s=s.replace('<path d="M0 0h512v512H0z"/>','')
  ds=re.findall(r'<path[^>]*\sd="([^"]+)"',s)
  body=''.join(f'<path d="{short(d)}"/>' for d in ds)
  return k,f'<symbol id="i-{k}" viewBox="0 0 512 512">{body}</symbol>'
def luc(k,n):
  s=fetch(LU+n+'.svg',os.path.join(CACHE,'lu',n+'.svg'))
  inner=re.search(r'<svg[^>]*>(.*)</svg>',s,re.S).group(1).strip()
  inner=re.sub(r'\s+',' ',inner).replace('> <','><')
  return k,f'<symbol id="i-{k}" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">{inner}</g></symbol>'
with cf.ThreadPoolExecutor(16) as ex:
  syms=dict(ex.map(lambda kv:game(*kv),GAME.items()))
  syms.update(dict(ex.map(lambda kv:luc(*kv),LUCIDE.items())))
authors=sorted({p.split('/')[0] for p in GAME.values()})
sprite=''.join(syms[k] for k in list(GAME)+list(LUCIDE))
out=f"""/* 由 dev/build-icons.py 產生，請勿手動編輯。
   遊戲圖示：game-icons.net（CC BY 3.0）作者 {', '.join(authors)}
   介面圖示：Lucide（ISC License） */
export const SPRITE = {json.dumps(sprite,ensure_ascii=False)};
export const ICON_NAMES = {json.dumps(list(GAME)+list(LUCIDE))};
"""
open(os.path.join(HERE,'..','js','icon-data.js'),'w',encoding='utf-8',newline='\n').write(out)
print(len(syms),'icons',len(out)//1024,'KB', 'authors',authors)
