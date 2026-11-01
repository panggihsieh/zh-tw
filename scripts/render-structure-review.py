"""Render 100 sourced characters as review contact sheets (no AI API calls)."""
import collections
import csv
import html
import json
import pathlib
import re
import shutil

out = pathlib.Path('public/structure-review')
entries = json.loads((out / 'characters.json').read_text(encoding='utf-8'))
assert len(entries) == len({e['character'] for e in entries}) == 100
operators = dict(zip('⿰⿱⿲⿳⿴⿵⿶⿷⿸⿹⿺⿻', [2,2,3,3,2,2,2,2,2,2,2,2]))
names = dict(zip(operators, ['左右','上下','左中右','上中下','全包圍','上三包圍','下三包圍','左三包圍','左上包圍','右上包圍','左下包圍','重疊']))
palette = ['#e8efde', '#f8e7d7', '#e1edf1']
def parse(sequence):
    tokens = re.findall(r'&[^;]+;|.', sequence)
    cursor = 0
    def node():
        nonlocal cursor
        if cursor >= len(tokens):
            raise ValueError(sequence)
        value = tokens[cursor]
        cursor += 1
        return (value, [node() for _ in range(operators.get(value, 0))])
    result = node()
    assert cursor == len(tokens), sequence
    return result

def esc(value): return html.escape(str(value), quote=True)
def rect(x,y,w,h,fill):
    assert min(w,h) > 0 and min(x,y) >= 0 and x+w <= 101 and y+h <= 101
    return f'<rect x="{x:.2f}" y="{y:.2f}" width="{w:.2f}" height="{h:.2f}" fill="{fill}" stroke="#82977c" stroke-width=".7"/>'
def label(value,x,y,w,h):
    size = min(w*.69,h*.69,36)
    return f'<text x="{x+w/2:.2f}" y="{y+h/2:.2f}" font-size="{size:.2f}" text-anchor="middle" dominant-baseline="central">{esc(value)}</text>'
def draw(node,x=1,y=1,w=98,h=98,depth=0):
    op, children = node
    color = palette[depth%3]
    if not children:
        return rect(x,y,w,h,color)+label(op,x,y,w,h)
    if op in '⿰⿲⿱⿳':
        vertical = op in '⿱⿳'
        weights = [1]*len(children)
        if len(children)==2:
            first, second = children[0][0], children[1][0]
            if vertical and first in '艹宀竹雨龶亠丿': weights=[.28,.72]
            elif vertical and second in '心力土言八': weights=[.7,.3]
            elif not vertical and first in '氵扌忄礻糹彳阝亻': weights=[.32,.68]
            elif not vertical and second in '刂力': weights=[.7,.3]
        total=sum(weights)
        result=''
        shift=0
        for i, child in enumerate(children):
            size=(h if vertical else w)*weights[i]/total
            result += draw(child,x if vertical else x+shift,y+shift if vertical else y,w if vertical else size,size if vertical else h,depth+i+1)
            shift+=size
        return result
    if op == '⿻':
        return (rect(x,y,w*.75,h*.75,palette[0])+label(children[0][0],x,y,w*.5,h*.5)
                +rect(x+w*.25,y+h*.25,w*.75,h*.75,'#f8e7d7aa')+label(children[1][0],x+w*.5,y+h*.5,w*.5,h*.5))
    # Enclosure is a diagram of occupied regions, not a glyph outline.
    result=rect(x,y,w,h,palette[0])
    if op=='⿺':
        result+=label(children[0][0],x,y+h*.6,w*.34,h*.4)
        return result+draw(children[1],x+w*.35,y+h*.04,w*.6,h*.6,depth+1)
    result+=label(children[0][0],x,y,w*.34,h*.3)
    return result+draw(children[1],x+w*.35,y+h*.32,w*.6,h*.63,depth+1)

cards=[]
for i,entry in enumerate(entries,1):
    tree=parse(entry['ids'])
    unknown=bool(re.search(r'[①-⑳&？]',entry['ids']))
    rare=any(ord(c)>0xffff for c in entry['ids'])
    kind=names.get(tree[0],'獨體／未再拆分')
    status='未編碼部件・待核' if unknown else '罕見部件・待核' if rare else '結構候選・待核'
    diagram=rect(1,1,98,98,'#fff5e4')+label('待核',1,1,98,98) if unknown else draw(tree)
    svg=f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" role="img" aria-label="{esc(entry["character"]+kind)}"><g fill="#285d50" font-family="MingLiU-ExtB, PMingLiU, Microsoft JhengHei, serif">{diagram}</g></svg>'
    (out/f'{i:03}-{entry["character"]}.svg').write_text(svg,encoding='utf-8')
    entry.update(index=i,kind=kind,status=status,diagramRendered=not unknown,proportionStatus='示意比例，未逐字審定')
    cards.append(f'<article class="card"><div class="card-top"><b>{i:03}</b><span>{esc(kind)}</span></div><div class="pair"><div class="character">{entry["character"]}</div>{svg}</div><div class="bottom"><span>{esc(entry["lesson"].split("：")[0])}</span><span>{status}</span></div></article>')

css='''*{box-sizing:border-box}body{margin:0;background:#f7f8f2;color:#233f36;font-family:"Microsoft JhengHei",sans-serif}main{width:1500px;margin:auto;padding:24px}h1{font-size:28px;margin:0 0 8px}p{margin:6px 0;font-size:16px;line-height:1.6}.grid{display:grid;grid-template-columns:repeat(5,1fr);gap:12px;margin-top:18px}.card{border:1px solid #bccbb4;border-radius:10px;padding:10px;background:white;break-inside:avoid}.card-top,.bottom{display:flex;justify-content:space-between;gap:4px;font-size:12px;color:#63735d}.card-top b{color:#a56b3a}.pair{display:grid;grid-template-columns:1fr 1fr;gap:14px;align-items:center;margin:9px 0}.character{font-family:"DFKai-SB","KaiTi",serif;text-align:center;font-size:76px}.pair svg{display:block;width:100%;aspect-ratio:1}.bottom{font-size:11px}a{color:#285d50}footer{margin-top:18px;font-size:13px;line-height:1.7}nav{display:flex;gap:16px;margin:10px 0}@media print{nav{display:none}main{width:100%}.grid{grid-template-columns:repeat(5,1fr)}body{background:white}}'''
def page(number, subset):
    title=f'康軒五上｜100 字結構測試・{number}'
    navigation=' '.join(f'<a href="page-{p}.html">第 {p} 張</a>' for p in range(1,5))
    body=f'''<!doctype html><html lang="zh-Hant"><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>{title}</title><style>{css}</style><main><h1>{title}</h1><p>115 學年度上學期・依教育百科康軒五上生字課序取前 100 個不重複單字</p><p>每格左：完整生字　右：結構候選圖。比例為示意；全部結構仍待教師核對。存、典含未編碼部件，保留待核框。</p><nav>{navigation}<a href="index.html">全部 100 字</a><a href="report.csv">檢查表 CSV</a></nav><section class="grid">{''.join(subset)}</section><footer>生字來源：<a href="https://pedia.cloud.edu.tw/Bookmark/Textword?category=國語&degree=5&press=康軒版&year=115_1">教育部教育百科生字詞彙表</a>。結構來源：CJKVI／CHISE IDS（GPLv2）；優先選 T 標記版本，無 T 時採一般版本。<a href="NOTICE.md">資料說明</a>・<a href="GPL-2.0.txt">授權全文</a>。這是批次呈現測試，未代表正式教材審定；未呼叫 AI。</footer></main></html>'''
    filename=f'page-{number}.html' if isinstance(number,int) else 'index.html'
    (out/filename).write_text(body,encoding='utf-8')
for number in range(1,5): page(number,cards[(number-1)*25:number*25])
page('總覽',cards)
with (out/'report.csv').open('w',encoding='utf-8-sig',newline='') as f:
    fields=['index','character','lesson','kind','ids','status','diagramRendered','proportionStatus','source']
    writer=csv.DictWriter(f,fieldnames=fields,extrasaction='ignore');writer.writeheader();writer.writerows(entries)
(out/'review-results.json').write_text(json.dumps(entries,ensure_ascii=False,indent=2),encoding='utf-8')
shutil.copyfile('.local/qa/GPL-2.0.txt',out/'GPL-2.0.txt')
stats={'characters':len(entries),'rendered':sum(e['diagramRendered'] for e in entries),'unencoded':[e['character'] for e in entries if not e['diagramRendered']],'rare':[e['character'] for e in entries if '罕見' in e['status']],'kinds':dict(collections.Counter(e['kind'] for e in entries))}
(out/'summary.json').write_text(json.dumps(stats,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(stats,ensure_ascii=False))
