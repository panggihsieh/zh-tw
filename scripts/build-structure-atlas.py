"""Generate eight teaching structure families as text-free square SVG diagrams."""
import html
import pathlib
import xml.etree.ElementTree as ET

out = pathlib.Path('public/structure-atlas')
out.mkdir(parents=True, exist_ok=True)
colors = ['#dce9cf', '#f4deca', '#d8e7ee']
stroke = '#739079'

def rect(x, y, w, h, color):
    assert min(x, y) >= 0 and min(w, h) > 0 and x+w <= 100 and y+h <= 100
    return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="{color}" stroke="{stroke}" stroke-width=".7"/>'

def bands(weights, vertical=False):
    result, offset = '', 0
    assert sum(weights) == 100
    for i, weight in enumerate(weights):
        result += rect(0 if vertical else offset, offset if vertical else 0, 100 if vertical else weight, weight if vertical else 100, colors[i])
        offset += weight
    return result

def enclosure(kind):
    shapes = {
        'full': ('M0 0H100V100H0Z M20 20V80H80V20Z', (24,24,52,52)),
        'top': ('M0 100V0H100V100H80V20H20V100Z', (24,24,52,72)),
        'bottom': ('M0 0V100H100V0H80V80H20V0Z', (24,4,52,72)),
        'left': ('M100 0H0V100H100V80H20V20H100Z', (24,24,72,52)),
        'upper-left': ('M0 100V0H100V20H20V100Z', (24,24,72,72)),
        'upper-right': ('M0 0H100V100H80V20H0Z', (4,24,72,72)),
        'lower-left': ('M0 0V100H100V80H20V0Z', (24,4,72,72)),
    }
    path, inside = shapes[kind]
    return f'<path d="{path}" fill="{colors[0]}" fill-rule="evenodd" stroke="{stroke}" stroke-width=".7"/>'+rect(*inside, colors[1])

groups = [
    ('左右結構', [
        ('左窄右寬', '35 : 65', bands([35,65])),
        ('左右等寬', '50 : 50', bands([50,50])),
        ('左寬右窄', '65 : 35', bands([65,35])),
    ]),
    ('上下結構', [
        ('上短下長', '35 : 65', bands([35,65], True)),
        ('上下等長', '50 : 50', bands([50,50], True)),
        ('上長下短', '65 : 35', bands([65,35], True)),
    ]),
    ('左中右結構', [
        ('三部分近等寬', '33 : 34 : 33', bands([33,34,33])),
        ('中寬兩側窄', '25 : 50 : 25', bands([25,50,25])),
        ('左部較寬', '50 : 25 : 25', bands([50,25,25])),
        ('右部較寬', '25 : 25 : 50', bands([25,25,50])),
    ]),
    ('上中下結構', [
        ('三部分近等長', '33 : 34 : 33', bands([33,34,33], True)),
        ('中長上下短', '25 : 50 : 25', bands([25,50,25], True)),
        ('上部較長', '50 : 25 : 25', bands([50,25,25], True)),
        ('下部較長', '25 : 25 : 50', bands([25,25,50], True)),
    ]),
    ('全包圍結構', [('四面包圍', '外框＋內部', enclosure('full'))]),
    ('半包圍結構', [
        ('上三包圍', '下方開口', enclosure('top')),
        ('下三包圍', '上方開口', enclosure('bottom')),
        ('左三包圍', '右方開口', enclosure('left')),
        ('左上包圍', '左側＋上側', enclosure('upper-left')),
        ('右上包圍', '右側＋上側', enclosure('upper-right')),
        ('左下包圍', '左側＋下側', enclosure('lower-left')),
    ]),
    ('獨體結構', [('整體一區', '不再分區', rect(0,0,100,100,colors[0]))]),
    ('品字形結構', [('上一、下二', '三個同類部件', rect(27,0,46,46,colors[0])+rect(0,54,46,46,colors[1])+rect(54,54,46,46,colors[2]))]),
]

def square(content, title):
    # Accessible names stay in title/attributes; there are no visible text nodes in the square.
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="-1 -1 102 102" role="img" aria-label="{title}"><title>{title}</title><rect x="0" y="0" width="100" height="100" fill="#fff" stroke="{stroke}" stroke-width=".8"/>{content}</svg>'

sections, overview = [], []
y, number = 155, 0
for group_index, (group, items) in enumerate(groups, 1):
    overview.append(f'<text x="35" y="{y}" font-size="26" font-weight="bold">{group_index:02}　{group}</text>')
    cards = []
    for i, (title, subtitle, content) in enumerate(items):
        number += 1
        filename = f'{number:02}.svg'
        svg = square(content, title)
        root = ET.fromstring(svg)
        assert not root.findall('.//{http://www.w3.org/2000/svg}text')
        (out / filename).write_text(svg, encoding='utf-8')
        cards.append(f'<figure><h3>{title}</h3>{svg}<figcaption>{subtitle}</figcaption><a href="{filename}" download="{title}.svg">下載 SVG</a></figure>')
        x, top = 35+(i%4)*250, y+22+(i//4)*275
        overview.append(f'<text x="{x}" y="{top+20}" font-size="20">{title}</text><g transform="translate({x},{top+35}) scale(1.8)">{content}<rect width="100" height="100" fill="none" stroke="{stroke}" stroke-width=".8"/></g><text x="{x}" y="{top+243}" font-size="17" fill="#657860">{subtitle}</text>')
    sections.append(f'<section><h2>{group_index:02}　{group}</h2><div class="grid">{"".join(cards)}</div></section>')
    y += 55+((len(items)+3)//4)*275

overview_svg = f'<svg xmlns="http://www.w3.org/2000/svg" width="1050" height="{y+45}" viewBox="0 0 1050 {y+45}"><rect width="1050" height="{y+45}" fill="#f7f8f2"/><g fill="#254b40" font-family="Microsoft JhengHei,Noto Sans CJK TC,sans-serif"><text x="35" y="55" font-size="34" font-weight="bold">八大結構與子結構・正方形 SVG 圖例</text><text x="35" y="95" font-size="18">框內無文字，色塊只表示部件位置；比例為可調整的檢視起點。</text>{"".join(overview)}</g></svg>'
ET.fromstring(overview_svg)
(out / 'overview.svg').write_text(overview_svg, encoding='utf-8')
css = '''*{box-sizing:border-box}body{margin:0;color:#254b40;background:#f7f8f2;font:18px/1.6 "Microsoft JhengHei",sans-serif}main{max-width:1320px;padding:30px;margin:auto}a{color:#286c60}header nav{display:flex;gap:24px;flex-wrap:wrap}h1{font-size:34px;margin:24px 0 12px}header p{max-width:950px}.download{display:inline-block;padding:12px 20px;background:#285d50;color:white;border-radius:9px;text-decoration:none}.grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:20px}section{margin-top:36px}h2{font-size:24px;border-bottom:1px solid #c7d3bd;padding-bottom:12px}figure{margin:0;padding:18px;background:white;border:1px solid #c7d3bd;border-radius:12px}h3{font-size:19px;font-weight:600;margin:0 0 18px}figure svg{display:block;width:100%;aspect-ratio:1}figcaption{margin-top:16px;color:#6b7e64;font-size:16px}figure a{display:inline-block;margin-top:8px;font-size:14px}footer{border-top:1px solid #c7d3bd;margin-top:36px;padding-top:18px;font-size:15px}@media(max-width:950px){.grid{grid-template-columns:repeat(3,minmax(0,1fr))}}@media(max-width:650px){main{padding:18px}.grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}figure{padding:12px}h1{font-size:27px}h3{font-size:17px}}@media(max-width:360px){.grid{grid-template-columns:1fr}}@media print{header nav,.download,figure a{display:none}section{break-inside:avoid}body{background:white}main{padding:0}.grid{grid-template-columns:repeat(4,minmax(0,1fr))}}'''
(out / 'index.html').write_text(f'''<!doctype html><html lang="zh-Hant"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>八大結構與子結構 SVG 圖例</title><style>{css}</style></head><body><main><header><nav><a href="/structure-review/five-upper.html">← 五上拆合總覽</a><a href="/structure-review/editor.html">生字結構修正</a></nav><h1>八大結構與子結構</h1><p>8 大主結構、23 張正方形圖例。框內只畫色塊與分界，不放文字；名稱、比例與包圍方向標在框外。</p><a class="download" href="overview.svg" download="八大結構與子結構.svg">下載整張 SVG 總圖</a><p>這是本專案的教學檢視分類；色塊表示位置，不是字形輪廓。三分結構的比例為範例，仍可逐字調整。</p></header>{"".join(sections)}<footer>品字形以三個方塊表示上一下二的位置，實際部件應相同；不同顏色僅方便辨識。半包圍外框用連續色帶示意包圍方向，未將內部誤畫成左右切分。重疊／穿插另列進階結構，未納入本次八類。</footer></main></body></html>''', encoding='utf-8')
print(f'Generated {len(groups)} groups / {number} text-free square SVG diagrams and overview.svg')
