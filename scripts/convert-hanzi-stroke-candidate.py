"""Convert a Hanzi Writer candidate to local 2048-coordinate review geometry.

Usage: python scripts/convert-hanzi-stroke-candidate.py input.json output.json
Only absolute M/L/Q/C/Z paths are accepted. This does not publish or approve data.
"""
import json
import re
import sys


def point(x, y):
    return {'x': float(x) * 2, 'y': (900 - float(y)) * 2}


def outline(path):
    tokens = re.findall(r'[A-Za-z]|[-+]?(?:\d*\.\d+|\d+)(?:[eE][-+]?\d+)?', path)
    result, index = [], 0
    arities = {'M': 2, 'L': 2, 'Q': 4, 'C': 6, 'Z': 0}
    while index < len(tokens):
        command = tokens[index]
        if command not in arities:
            raise ValueError(f'Unsupported or implicit path command: {command}')
        index += 1
        count = arities[command]
        values = [float(value) for value in tokens[index:index + count]]
        if len(values) != count:
            raise ValueError('Truncated path')
        index += count
        if command == 'Z':
            continue  # Local renderer closes each outline itself.
        segment = {'type': command}
        if command in ('M', 'L'):
            segment.update(point(*values))
        else:
            segment['begin'] = point(*values[:2])
            segment['end'] = point(*values[-2:])
            if command == 'C':
                segment['mid'] = point(*values[2:4])
        result.append(segment)
    return result


if __name__ == '__main__':
    with open(sys.argv[1], encoding='utf8') as source:
        data = json.load(source)
    if len(data['strokes']) != len(data['medians']):
        raise ValueError('Outline and median counts differ')
    converted = [{'outline': outline(path), 'track': [point(*p) for p in median]}
                 for path, median in zip(data['strokes'], data['medians'])]
    if any(len(stroke['track']) < 2 for stroke in converted):
        raise ValueError('Missing track')
    with open(sys.argv[2], 'w', encoding='utf8') as target:
        json.dump(converted, target, ensure_ascii=False)
