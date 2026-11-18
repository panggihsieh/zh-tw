"""Render review geometry, including direction, from a JSON array of strokes.

Usage: python scripts/render-stroke-details.py input.json output.png
Each row contains outline, track, and number. This renders evidence only;
it does not approve stroke names or change review status.
"""
import json
import math
import sys
from PIL import Image, ImageDraw

rows = json.load(open(sys.argv[1], encoding='utf8'))
image = Image.new('RGB', (1000, max(1, math.ceil(len(rows) / 4)) * 250), 'white')
draw = ImageDraw.Draw(image)
for index, row in enumerate(rows):
    ox, oy = index % 4 * 250, index // 4 * 250
    points, current = [], (0, 0)
    for segment in row['outline']:
        kind = segment['type']
        if kind in ('M', 'L'):
            current = segment['x'], segment['y']
            points.append(current)
        elif kind in ('Q', 'C'):
            start, control, end = current, segment['begin'], segment['end']
            for step in range(1, 41):
                t, u = step / 40, 1 - step / 40
                if kind == 'Q':
                    point = tuple(u*u*start[k] + 2*u*t*control[axis] + t*t*end[axis] for k, axis in enumerate(('x', 'y')))
                else:
                    mid = segment['mid']
                    point = tuple(u**3*start[k] + 3*u*u*t*control[axis] + 3*u*t*t*mid[axis] + t**3*end[axis] for k, axis in enumerate(('x', 'y')))
                points.append(point)
            current = end['x'], end['y']
        elif kind != 'Z':
            raise ValueError(f'Unsupported outline segment: {kind}')
    transform = lambda p: (ox + p[0] / 2048 * 240, oy + p[1] / 2048 * 240)
    draw.polygon([transform(point) for point in points], fill='#172c27')
    draw.text((ox + 5, oy + 5), f"{index} / {row['number']}", fill='red')
    track = [transform((point['x'], point['y'])) for point in row['track']]
    draw.line(track, fill='#468fcb', width=2)
    x, y = track[0]
    draw.ellipse((x-3, y-3, x+3, y+3), fill='red')
image.save(sys.argv[2])
