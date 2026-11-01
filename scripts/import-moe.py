"""Convert the official XLSX without editing entry content (Python standard library)."""
import json
import pathlib
import re
import sys
import zipfile
import xml.etree.ElementTree as ET

source = pathlib.Path(sys.argv[1])
target = pathlib.Path('public/dictionaries')
target.mkdir(parents=True, exist_ok=True)
ns = {'m': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
with zipfile.ZipFile(source) as archive:
    strings = [''.join(x.itertext()) for x in ET.fromstring(archive.read('xl/sharedStrings.xml')).findall('m:si', ns)]
    rows = []
    for row in ET.fromstring(archive.read('xl/worksheets/sheet1.xml')).findall('m:sheetData/m:row', ns):
        fields = [''] * 15
        for cell in row:
            letters = re.match('[A-Z]+', cell.attrib['r'])[0]
            index = 0
            for letter in letters:
                index = index * 26 + ord(letter) - 64
            value = cell.findtext('m:v', '', ns)
            if cell.get('t') == 's':
                value = strings[int(value)]
            # Decode SpreadsheetML's escaped carriage return, not editorial text.
            fields[index - 1] = value.replace('_x000D_', '\r')
        rows.append(fields)
payload = {'version': '2014_20260929', 'columns': rows[0], 'entries': rows[1:]}
(target / 'moe-concised.json').write_text(json.dumps(payload, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
print(f'{len(rows)-1} entries imported, preserving all 15 columns.')
