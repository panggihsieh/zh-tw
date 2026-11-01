"""Build four-book review candidates from cached MOE lesson lists and CJKVI IDS."""
import html
import json
import pathlib
import re

cache = pathlib.Path('.local/qa/kangxuan-books')
out = pathlib.Path('public/structure-review')
raw = {}
for line in pathlib.Path('.local/qa/ids.txt').read_text(encoding='utf-8').splitlines():
    if line.startswith('U+'):
        fields = line.split('\t')
        raw[fields[1]] = fields[2:]
dictionary = json.loads(pathlib.Path('public/dictionaries/moe-concised.json').read_text(encoding='utf-8'))
moe = {}
for row in dictionary['entries']:
    if len(row[0]) == 1:
        moe.setdefault(row[0], []).append(dict(radical=row[2].strip(), reading=row[6], meaning=row[13]))
books = []
for grade, term, year in [(5, '上', '115_1'), (5, '下', '114_2'), (6, '上', '115_1'), (6, '下', '114_2')]:
    index = (cache / f'{grade}-{year}.html').read_text(encoding='utf-8-sig')
    ids = re.findall(r'class="textname[^>]*id="(\d+)"', index)
    assert ids, (grade, year)
    lessons = []
    for lesson_id in ids:
        text = (cache / f'{lesson_id}.html').read_text(encoding='utf-8-sig')
        title = html.unescape(re.search(r'生字詞彙表：(.*?)\s*</', text).group(1))
        words = [html.unescape(x).strip() for x in re.findall(r'class="word_class[^"]*"[^>]*><a[^>]*>(.*?)</a>', text)]
        characters = []
        for c in dict.fromkeys(w for w in words if len(w) == 1):
            variants = raw.get(c, [])
            preferred = next((v for v in variants if re.search(r'\[[^\]]*T[^\]]*\]', v)), None)
            preferred = preferred or next((v for v in variants if '[' not in v), None) or (variants[0] if variants else '')
            characters.append(dict(character=c, ids=re.sub(r'\[[^\]]*\]', '', preferred), rawIds=preferred, variants=variants, dictionary=moe.get(c, [])))
        assert characters, title
        lessons.append(dict(id=lesson_id, title=title, source=f'https://pedia.cloud.edu.tw/Bookmark/TCollection?TextNameId={lesson_id}', characters=characters))
    books.append(dict(id=f'{grade}-{term}', title=f'康軒{grade}{term}', year=year, lessons=lessons))
payload = dict(version=1, collectedAt='2026-11-01', books=books)
(out / 'books.json').write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding='utf-8')
print(json.dumps({b['title']:dict(year=b['year'], lessons=len(b['lessons']), entries=sum(len(l['characters']) for l in b['lessons']), unique=len({c['character'] for l in b['lessons'] for c in l['characters']})) for b in books}, ensure_ascii=False))
