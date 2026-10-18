#!/usr/bin/env python3
"""
Simple phoneme->viseme mapper.
Input: CSV file with columns phoneme,start,end (seconds) OR JSON list of {phoneme,start,end}.
Output: JSON list of {t, v} where t is time in seconds and v is viseme index 0..6.

This is a heuristic mapper for demo purposes. For production-quality visemes, use an expert mapping and adjust timings.
"""
import sys
import json
import csv
from pathlib import Path

PHONEME_TO_VISEME = {
    # approximate mapping (very coarse)
    'AA':4,'AE':4,'AH':3,'AO':4,'AW':5,'AY':5,
    'B':1,'CH':2,'D':1,'DH':1,'EH':3,'ER':3,'EY':4,
    'F':2,'G':1,'HH':0,'IH':3,'IY':4,'JH':2,'K':1,
    'L':1,'M':0,'N':0,'NG':0,'OW':4,'OY':5,'P':1,
    'R':1,'S':2,'SH':2,'T':1,'TH':2,'UH':3,'UW':4,'V':2,'W':5,'Y':5,'Z':2,'ZH':2
}


def load_input(path: Path):
    if path.suffix.lower() == '.json':
        return json.loads(path.read_text())
    else:
        items = []
        with path.open() as f:
            reader = csv.reader(f)
            for row in reader:
                if not row: continue
                # accept phoneme,start,end
                if len(row) >= 3:
                    phoneme = row[0].strip().upper()
                    start = float(row[1])
                    end = float(row[2])
                    items.append({'phoneme': phoneme, 'start': start, 'end': end})
        return items


def map_to_viseme(items):
    points = []
    for it in items:
        ph = it.get('phoneme','').upper()
        start = float(it.get('start',0))
        vis = PHONEME_TO_VISEME.get(ph, 0)
        points.append({'t': start, 'v': vis})
    # ensure sorted and unique by time
    points.sort(key=lambda x: x['t'])
    out = []
    lastt = -1
    for p in points:
        if abs(p['t'] - lastt) < 1e-4: continue
        out.append(p)
        lastt = p['t']
    return out


def main():
    if len(sys.argv) < 2:
        print('Usage: phoneme_to_viseme.py timings.csv|timings.json [out.json]')
        sys.exit(1)
    inp = Path(sys.argv[1])
    outp = Path(sys.argv[2]) if len(sys.argv) >=3 else Path(sys.argv[1]).with_suffix('.viseme.json')
    items = load_input(inp)
    points = map_to_viseme(items)
    outp.write_text(json.dumps(points, indent=2))
    print('Wrote', outp)

if __name__ == '__main__':
    main()
