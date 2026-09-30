"""Add pinned, separately licensed display names to the v2 constellation pack.

The v2 geometry/art publication remains a reproducible input. This stage does
not re-fetch it, re-license its geometry, or alter any original PNG bytes.
"""
import argparse
from hashlib import sha256
import json
from pathlib import Path
import re
import shutil
import subprocess

VERSION = 'stellarium-modern-v24.4.v3'
SOURCE_SHA256 = '282f913ca5dc79f4d61efde2d0366f8385a3282a25c635d09026504cd5ccd4d5'
SOURCE_FILE = 'constellation_names.eng.fab'
SOURCE_URL = ('https://raw.githubusercontent.com/Stellarium/stellarium/'
              'ab961cbde42eec8121be0df6ff48292f8d492b54/skycultures/modern/' + SOURCE_FILE)


def js_json(value):
    raw = json.dumps(value, ensure_ascii=False, allow_nan=False, separators=(',', ':')).encode()
    result = subprocess.run(['node', '-e',
        'const fs=require("node:fs");process.stdout.write(JSON.stringify(JSON.parse(fs.readFileSync(0,"utf8"))))'],
        input=raw, capture_output=True, check=True)
    return result.stdout


def publish(base_publication, base_manifest, source_file, translation_file, output_dir, asset_dir):
    original = json.loads(base_publication.read_text(encoding='utf-8'))
    base_bytes = js_json(original)
    manifest = json.loads(base_manifest.read_text(encoding='utf-8'))
    if (original.get('format') != 'constellation-catalog-v2' or
            original.get('catalogVersion') != 'stellarium-modern-v24.4.v2' or
            len(original.get('constellations', [])) != 88 or
            len(original.get('images', [])) != 85 or
            manifest.get('sha256') != sha256(base_bytes).hexdigest() or
            manifest.get('bytes') != len(base_bytes)):
        raise ValueError('base publication integrity')

    source_bytes = source_file.read_bytes()
    if sha256(source_bytes).hexdigest() != SOURCE_SHA256:
        raise ValueError('pinned Stellarium name source mismatch')
    english = {}
    for line in source_bytes.decode('utf-8').splitlines():
        match = re.fullmatch(r'([A-Z][A-Za-z]{2})\s+"([^"]+)"\s+_\("[^"]+"\)', line.strip())
        if not match or match[1] in english:
            raise ValueError('Stellarium name row')
        english[match[1]] = match[2]

    translations = json.loads(translation_file.read_text(encoding='utf-8'))
    rows = translations.get('rows')
    if (translations.get('format') != 'constellation-display-names-v1' or
            not isinstance(rows, list) or len(rows) != 88 or len(english) != 88):
        raise ValueError('translation rows')
    chinese = {}
    for row in rows:
        if (not isinstance(row, list) or len(row) != 2 or row[0] not in english or
                row[0] in chinese or not isinstance(row[1], str) or
                not re.fullmatch(r'[\u3400-\u9fff]{2,7}座', row[1])):
            raise ValueError('translation identity or name')
        chinese[row[0]] = row[1]
    codes = {row['iau'] for row in original['constellations']}
    if codes != set(english) or codes != set(chinese) or len(set(chinese.values())) != 88:
        raise ValueError('translation coverage')
    source = translations.get('source')
    if (not isinstance(source, dict) or source.get('license') != 'CC BY-SA 4.0' or
            source.get('licenseUrl') != 'https://creativecommons.org/licenses/by-sa/4.0/' or
            not source.get('url', '').endswith('oldid=93845063') or
            not re.fullmatch(r'[a-f0-9]{64}', source.get('sourceHtmlSha256', '')) or
            not source.get('modifications') or not source.get('retrievedAt')):
        raise ValueError('translation provenance')

    original['format'] = 'constellation-catalog-v3'
    original['catalogVersion'] = VERSION
    for row in original['constellations']:
        row['nameEn'] = english[row['iau']]
        row['nameZh'] = chinese[row['iau']]
    definitions = original['provenance']['definitions']
    definitions['sourceFiles'][SOURCE_FILE] = SOURCE_SHA256
    definitions['modifications'] += ' Matched original English names by IAU identifier.'
    original['provenance']['names'] = {
        'provider': source['authors'], 'url': source['url'],
        'license': source['license'], 'licenseUrl': source['licenseUrl'],
        'retrievedAt': source['retrievedAt'],
        'sourceHtmlSha256': source['sourceHtmlSha256'],
        'modifications': source['modifications'],
    }
    encoded = js_json(original)
    output_dir.mkdir(parents=True, exist_ok=True)
    asset_dir.mkdir(parents=True, exist_ok=True)
    (output_dir / (VERSION + '.json')).write_bytes(encoded + b'\n')
    upgraded_manifest = {**manifest, 'catalogVersion': VERSION,
        'sha256': sha256(encoded).hexdigest(), 'bytes': len(encoded), 'names': len(chinese)}
    (output_dir / (VERSION + '.manifest.json')).write_text(
        json.dumps(upgraded_manifest, indent=2) + '\n', encoding='utf-8')
    destination = asset_dir / SOURCE_FILE
    if source_file.resolve() != destination.resolve():
        shutil.copyfile(source_file, destination)
    notice = asset_dir / 'NOTICE.txt'
    current = notice.read_text(encoding='utf-8')
    marker = 'Constellation display names (publication v3):'
    addition = (marker + '\n'
        f'English names: Stellarium Modern v24.4, CC BY-SA 4.0, {SOURCE_URL}\n'
        f'Simplified Chinese names adapted from {source["url"]} ; {source["authors"]}, CC BY-SA 4.0.\n'
        'Only the 88 constellation names are reused; unrelated article fields and media are excluded.\n'
        'This name dataset and adapted names remain CC BY-SA 4.0; separate ODbL geometry and FAL art retain their own licenses.\n')
    if marker not in current:
        notice.write_text(current.rstrip() + '\n' + addition, encoding='utf-8')
    return upgraded_manifest


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--base-publication', type=Path, required=True)
    parser.add_argument('--base-manifest', type=Path, required=True)
    parser.add_argument('--source-file', type=Path, required=True)
    parser.add_argument('--translation-file', type=Path, required=True)
    parser.add_argument('--output-dir', type=Path, required=True)
    parser.add_argument('--asset-dir', type=Path, required=True)
    args = parser.parse_args()
    print(json.dumps(publish(args.base_publication, args.base_manifest, args.source_file,
        args.translation_file, args.output_dir, args.asset_dir)))
