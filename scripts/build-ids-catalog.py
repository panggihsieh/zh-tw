"""Create the local lookup used for uploaded lessons; source and GPLv2 notice remain alongside it."""
import json
from pathlib import Path
import re

catalog = {}
for line in Path('.local/qa/ids.txt').read_text(encoding='utf-8').splitlines():
    if not line.startswith('U+'):
        continue
    fields = line.split('\t')
    variants = fields[2:]
    preferred = next((v for v in variants if re.search(r'\[[^\]]*T[^\]]*\]', v)), None)
    preferred = preferred or next((v for v in variants if '[' not in v), None) or (variants[0] if variants else fields[1])
    catalog[fields[1]] = re.sub(r'\[[^\]]*\]', '', preferred)
Path('public/structure-review/ids-catalog.json').write_text(json.dumps(catalog, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
Path('public/structure-review/moe-stroke-ids.json').write_bytes(Path('src/data/moe-characters.json').read_bytes())
print(f'Generated {len(catalog)} local IDS candidates and official stroke embed whitelist')
