"""Collect single-character entries from MOE's 115-1 Kangxuan grade 5 list."""
import concurrent.futures
import html
import json
import pathlib
import re
import urllib.request

cache = pathlib.Path('.local/qa')
def lesson(number):
    path = cache / f'kangxuan115-{number:02}.html'
    url = f'https://pedia.cloud.edu.tw/Bookmark/TCollection?TextNameId=01030511501{number:02}'
    if not path.exists():
        path.write_bytes(urllib.request.urlopen(url).read())
    text = path.read_text(encoding='utf-8-sig')
    title = re.search(r'生字詞彙表：(.*?)\s*</', text).group(1)
    chars = [html.unescape(c) for c in re.findall(r'class="word_class[^"]*"[^>]*><a[^>]*>(.*?)</a>', text)]
    return title, url, [c for c in chars if len(c) == 1]

raw = {}
for line in (cache / 'ids.txt').read_text(encoding='utf-8').splitlines():
    if line.startswith('U+'):
        fields = line.split('\t')
        raw[fields[1]] = fields[2:]
entries = []
seen = set()
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
    lessons = list(pool.map(lesson, range(1, 7)))
for title, url, chars in lessons:
    for character in chars:
        if character in seen:
            continue
        seen.add(character)
        variants = raw.get(character, [])
        # Prefer a Taiwan-tagged variant, then an untagged form.
        preferred = next((v for v in variants if re.search(r'\[[^\]]*T[^\]]*\]', v)), None)
        preferred = preferred or next((v for v in variants if '[' not in v), None) or (variants[0] if variants else '')
        ids = re.sub(r'\[[^\]]*\]', '', preferred)
        entries.append(dict(character=character, lesson=title, source=url, ids=ids, rawIds=preferred, variants=variants))
entries = entries[:100]
assert len(entries) == 100, len(entries)
target = pathlib.Path('public/structure-review')
target.mkdir(parents=True, exist_ok=True)
(target / 'characters.json').write_text(json.dumps(entries, ensure_ascii=False, indent=2), encoding='utf-8')
print(json.dumps({'count':len(entries),'lessons':[(x[0],len(x[2])) for x in lessons], 'characters': ''.join(e['character'] for e in entries)},ensure_ascii=False))
