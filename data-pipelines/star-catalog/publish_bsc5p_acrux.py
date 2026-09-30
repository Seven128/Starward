"""Publish the explicit IAU Acrux component correction from immutable BSC v2.

The active WGSN table names the alpha Cru system by HIP, without a component
digit. Its archived identity table explicitly assigns Acrux to HR 4730. This
publisher changes only that name; it neither copies archived astrometry nor
chooses a component by brightness or proximity.
"""
import argparse
from hashlib import sha256
from html.parser import HTMLParser
import json
from pathlib import Path


class Tables(HTMLParser):
    def __init__(self):
        super().__init__()
        self.rows = []
        self.row = None
        self.cell = None

    def handle_starttag(self, tag, attrs):
        if tag == 'tr':
            if self.row is not None:
                self.rows.append(self.row)
            self.row = []
        elif tag in ('td', 'th') and self.row is not None:
            self.cell = ''

    def handle_data(self, data):
        if self.cell is not None:
            self.cell += data

    def handle_endtag(self, tag):
        if tag in ('td', 'th') and self.cell is not None:
            self.row.append(self.cell.strip())
            self.cell = None
        elif tag == 'tr' and self.row is not None:
            self.rows.append(self.row)
            self.row = None


def read_rows(raw):
    parser = Tables()
    parser.feed(raw.decode('utf-8'))
    return parser.rows


def one_identity(rows, header_markers, name):
    headers = [r for r in rows if set(header_markers).issubset(r)]
    if len(headers) != 1:
        raise ValueError('IAU identity header changed')
    header = headers[0]
    name_column = 'proper names' if 'proper names' in header else 'IAU Name'
    matches = [dict(zip(header, r)) for r in rows if len(r) == len(header) and r[header.index(name_column)] == name]
    if len(matches) != 1:
        raise ValueError('Acrux active/archived identity is not unique')
    return matches[0]


def publish(base_path, manifest_path, active_path, archived_path, output_dir):
    base_raw = base_path.read_bytes()
    base = json.loads(base_raw)
    manifest = json.loads(manifest_path.read_bytes())
    active_raw, archived_raw = active_path.read_bytes(), archived_path.read_bytes()
    if (base['catalogVersion'] != 'bsc5p-bright-stars.v2' or
            manifest['catalogVersion'] != base['catalogVersion'] or
            manifest['derivedAssetSha256'] != sha256(base_raw).hexdigest() or
            manifest['derivedAssetBytes'] != len(base_raw) or
            manifest['rowCount'] != len(base['rows']) or len(base['rows']) != 8404 or
            base_raw != json.dumps(base, ensure_ascii=False, separators=(',', ':')).encode('utf-8')):
        raise ValueError('base BSC publication changed')
    for raw, source in ((active_raw, manifest['sources']['names']),
                        (archived_raw, manifest['sources']['nameIdentities'])):
        if sha256(raw).hexdigest() != source['responseSha256'] or len(raw) != source['responseBytes']:
            raise ValueError('IAU source bytes changed')
    active = one_identity(read_rows(active_raw), ('proper names', 'Designation', 'HIP'), 'Acrux')
    archived = one_identity(read_rows(archived_raw), ('IAU Name', 'Designation'), 'Acrux')
    if (active['HIP'] != '60718' or active['Bayer ID'] != 'α Cru' or
            archived['Designation'] != 'HR 4730'):
        raise ValueError('Acrux component evidence changed')
    candidates = [row for row in base['rows'] if row['sourceId'] == 'HR:4730']
    sibling = [row for row in base['rows'] if row['sourceId'] == 'HR:4731']
    if (len(candidates) != 1 or len(sibling) != 1 or
            candidates[0]['alternateName'] != 'Alp1Cru' or candidates[0]['properName'] is not None or
            sibling[0]['alternateName'] != 'Alp2Cru' or sibling[0]['properName'] is not None):
        raise ValueError('BSC Acrux components changed')
    candidates[0]['properName'] = 'Acrux'
    base['catalogVersion'] = 'bsc5p-bright-stars.v3'
    encoded = json.dumps(base, ensure_ascii=False, separators=(',', ':')).encode('utf-8')
    manifest['catalogVersion'] = base['catalogVersion']
    manifest['derivedAssetSha256'] = sha256(encoded).hexdigest()
    manifest['derivedAssetBytes'] = len(encoded)
    manifest['namedRowCount'] = sum(row['properName'] is not None for row in base['rows'])
    manifest['derivation']['names'] += '; active WGSN Acrux HIP60718/α Cru is explicitly assigned to HR4730 by the archived IAU table, not HR4731'
    manifest['derivation']['basePublication'] = dict(catalogVersion='bsc5p-bright-stars.v2',
                                                       assetSha256=sha256(base_raw).hexdigest(),
                                                       changedFields=['HR:4730.properName', 'catalogVersion'])
    output_dir.mkdir(parents=True, exist_ok=True)
    (output_dir / 'bsc5p-bright-stars.v3.json').write_bytes(encoded)
    (output_dir / 'bsc5p-bright-stars.v3.manifest.json').write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    return manifest


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    for flag in ('base', 'manifest', 'active-names', 'archived-names', 'output-dir'):
        parser.add_argument('--' + flag, type=Path, required=True)
    args = parser.parse_args()
    result = publish(args.base, args.manifest, args.active_names, args.archived_names, args.output_dir)
    print(json.dumps({key: result[key] for key in ('catalogVersion', 'namedRowCount', 'derivedAssetSha256')}))
