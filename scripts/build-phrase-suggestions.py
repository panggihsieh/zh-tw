"""Extract unmodified word titles from the bundled MOE dictionary for suggestions."""
import json
from pathlib import Path

root = Path(__file__).resolve().parents[1]
source = root / "public/dictionaries/moe-concised.json"
data = json.loads(source.read_text(encoding="utf-8"))
words = list(dict.fromkeys(
    entry[0] for entry in data["entries"]
    if 2 <= len(entry[0]) <= 8
    and len(set(entry[0])) == len(entry[0])
    and all("\u3400" <= char <= "\u9fff" for char in entry[0])
))
target = source.with_name("moe-suggestions.json")
target.write_text(json.dumps(words, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
print(f"Exported {len(words)} unique word titles to {target.name}")
