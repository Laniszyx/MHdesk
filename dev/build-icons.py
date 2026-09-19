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
# 魔物圖騰用的配色（取自魔物圖示）：每個遊戲圖示 = [暗色底片, 亮色主體]
P={'charcoal':'#343843','rust':'#a13b2c','tan':'#ac8b5e','mustard':'#e0c060','ochre':'#c09040','olive':'#607040','leaf':'#8fb050',
   'slate':'#505070','steel':'#80a0d0','plum':'#504060','lilac':'#a070b0','pink':'#c67f7d','cream':'#e0d0b0','brown':'#6b4a2e',
   'teal':'#509070','ash':'#707070','bone':'#c0c0b0','wine':'#702030'}
TONE={
 'gs':'charcoal rust','sns':'charcoal steel','lance':'charcoal tan','hammer':'charcoal ochre','ls':'charcoal slate',
 'slash':'charcoal rust','impact':'wine rust','spin':'brown mustard','dodge':'slate steel','shield':'slate steel','knife':'charcoal ash',
 'potion':'olive leaf','meat':'wine pink','flash':'ochre mustard','trap':'charcoal tan','shock':'slate mustard','barrel':'brown tan',
 'flask':'olive teal','pill':'olive leaf','cannon':'charcoal ochre',
 'snail':'olive teal','bolt':'ochre mustard','poison':'plum lilac','fire':'rust mustard','bleed':'wine rust','push':'ash bone',
 'wing':'slate steel','rock':'ash bone','enrage':'wine rust','dizzy':'ochre mustard',
 'herb':'olive leaf','honey':'ochre mustard','steak':'wine pink','beetle':'olive mustard','web':'ash bone','ore':'charcoal ash',
 'powder':'brown ochre','crystal':'slate steel',
 'target':'charcoal rust','swords':'charcoal rust','sabres':'charcoal tan','book':'brown tan','crown':'ochre mustard','dragon':'charcoal rust',
 'dragon2':'plum lilac','wings':'ash cream','stopwatch':'charcoal ochre','embers':'rust mustard','net':'olive tan','pine':'olive leaf',
 'sunrise':'ochre mustard','anvil':'charcoal rust','armor':'charcoal tan','tent':'brown tan','scroll':'brown cream','chest':'brown ochre',
 'cards':'charcoal tan','cat':'charcoal pink','skull':'charcoal bone','claw':'charcoal rust','roar':'charcoal ochre','explosion':'rust mustard',
 'heal':'olive leaf','recycle':'olive teal','laurel':'ochre mustard','dice':'charcoal cream','medal':'ochre mustard','trophy':'ochre mustard',
 'map':'brown cream','bell':'ochre mustard','hourglass':'brown tan','present':'rust mustard','eye':'charcoal steel','door':'brown tan',
 'footprint':'charcoal tan','bulb':'ochre mustard','pin':'rust tan','chain':'charcoal ash','resist':'slate steel','heartbreak':'wine rust',
 'cog':'charcoal ash','quill':'brown cream','cap':'charcoal tan','upgrade':'olive leaf','whistle':'charcoal ochre','hazard':'ochre mustard',
 'spanner':'charcoal ash','sprint':'rust ochre',
 'visor':'charcoal tan','barbute':'charcoal ash','crested':'charcoal rust','viking':'brown tan','spartan':'charcoal ochre','knight':'charcoal slate',
 'samurai':'wine rust','hood':'plum slate','elf':'olive leaf','dwarf':'brown ochre','fox':'rust ochre','wolf':'ash bone','eagle':'brown tan','bow':'brown tan',
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
  dark,acc=(P[c] for c in TONE[k].split())
  # 魔物圖騰風格：暗色底片往右下偏移、亮色主體、右下角回到暗色，各層之間用白色細線切開
  mh=(f'<use href="#p-{k}" fill="{dark}" transform="translate(16 16)"/><use href="#p-{k}" fill="none" stroke="#fff" stroke-width="13" stroke-linejoin="round" transform="translate(16 16)"/>'
      f'<use href="#p-{k}" fill="{acc}"/><use href="#p-{k}" fill="{dark}" clip-path="url(#mh-cut)"/><use href="#p-{k}" fill="none" stroke="#fff" stroke-width="7" stroke-linejoin="round"/>')
  return k,(f'<g id="p-{k}">{body}</g>', f'<symbol id="i-{k}" viewBox="0 0 512 512"><use href="#p-{k}"/></symbol><symbol id="m-{k}" viewBox="-10 -10 548 548">{mh}</symbol>')
def luc(k,n):
  s=fetch(LU+n+'.svg',os.path.join(CACHE,'lu',n+'.svg'))
  inner=re.search(r'<svg[^>]*>(.*)</svg>',s,re.S).group(1).strip()
  inner=re.sub(r'\s+',' ',inner).replace('> <','><')
  return k,('', f'<symbol id="i-{k}" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">{inner}</g></symbol>')
with cf.ThreadPoolExecutor(16) as ex:
  syms=dict(ex.map(lambda kv:game(*kv),GAME.items()))
  syms.update(dict(ex.map(lambda kv:luc(*kv),LUCIDE.items())))
authors=sorted({p.split('/')[0] for p in GAME.values()})
keys=list(GAME)+list(LUCIDE)
sprite='<defs><clipPath id="mh-cut"><polygon points="512,0 512,512 0,512"/></clipPath>'+''.join(syms[k][0] for k in keys)+'</defs>'+''.join(syms[k][1] for k in keys)
out=f"""/* 由 dev/build-icons.py 產生，請勿手動編輯。
   遊戲圖示：game-icons.net（CC BY 3.0）作者 {', '.join(authors)}
   介面圖示：Lucide（ISC License） */
export const SPRITE = {json.dumps(sprite,ensure_ascii=False)};
export const ICON_NAMES = {json.dumps(keys)};
export const MH_ICONS = {json.dumps(list(GAME))};
"""
open(os.path.join(HERE,'..','js','icon-data.js'),'w',encoding='utf-8',newline='\n').write(out)
print(len(syms),'icons',len(out)//1024,'KB', 'authors',authors)
