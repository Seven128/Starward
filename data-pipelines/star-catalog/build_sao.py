"""Build a reproducible SAO supplement; no network access or automatic publication.

The full output belongs on the server. It is not a Mini Program response/cache
body. Publication, spatial loading and object details remain separate owners.
"""
import argparse
from collections import defaultdict
from hashlib import sha256
import json
import math
from pathlib import Path
import re
import subprocess
import xml.etree.ElementTree as ET

from astropy.table import Table
import numpy as np

VERSION = 'sao-visual-supplement.v1'
ENDPOINT = 'https://heasarc.gsfc.nasa.gov/xamin/vo/tap/sync'
COLUMNS = 'name,ra,dec,proper_motion_ra_fk5,proper_motion_dec_fk5,vmag,ref_vmag,remarks,hd,hd_component,spect_type'
ROW_FIELDS = ['sourceId', 'visualMagnitude', 'raJ2000Deg', 'decJ2000Deg',
              'pmRaCosDecArcsecYr', 'pmDecArcsecYr', 'visualMagnitudeReference',
              'remarks', 'hd', 'hdComponent', 'spectralType']


def query(start):
    if start not in range(0, 360, 45):
        raise ValueError('unsupported RA partition')
    return (f'SELECT {COLUMNS} FROM sao WHERE vmag BETWEEN -2 AND 10 '
            f'AND ra >= {start} AND ra < {start + 45} ORDER BY name')


def read_complete(path):
    raw = path.read_bytes()
    xml = ET.fromstring(raw)
    statuses = [n.attrib.get('value') for n in xml.iter()
                if n.tag.endswith('INFO') and n.attrib.get('name') == 'QUERY_STATUS']
    if not statuses or any(s != 'OK' for s in statuses):
        raise ValueError('query failed or incomplete')
    return Table.read(path, format='votable'), raw


def numeric(row, key):
    if np.ma.is_masked(row[key]):
        return None
    value = float(row[key])
    if not math.isfinite(value):
        raise ValueError(f'nonfinite source value: {key}')
    return value


def text(row, key):
    return None if np.ma.is_masked(row[key]) else str(row[key]).strip() or None


def sao_ra_motion_to_tangent(time_seconds_per_year, declination_degrees):
    """Source prose/CDS units override erroneous TAP arcsec/yr metadata.

    This is dRA/dt in seconds of TIME/year. Multiply by 15 and cos(dec).
    Do not apply this adapter to BSC, whose source already includes cos(dec).
    """
    if not all(math.isfinite(x) for x in (time_seconds_per_year, declination_degrees)) or abs(declination_degrees) > 90:
        raise ValueError('invalid source RA motion')
    return time_seconds_per_year * 15 * math.cos(math.radians(declination_degrees))


def bsc_cross_identifications(base, cross):
    if base.get('catalogVersion') != 'bsc5p-bright-stars.v2' or len(base.get('rows', [])) != 8404:
        raise ValueError('unsupported BSC base')
    expected = {int(r['hr']) for r in base['rows']}
    actual = [int(r['hr']) for r in cross]
    if len(expected) != 8404 or len(actual) != len(set(actual)) or set(actual) != expected:
        raise ValueError('BSC cross-identification population differs')
    mapping = defaultdict(list)
    for row in cross:
        if np.ma.is_masked(row['sao']):
            continue
        raw = numeric(row, 'sao')
        if raw != int(raw) or not 1 <= raw <= 258997:
            raise ValueError('invalid SAO cross identification')
        mapping[int(raw)].append(int(row['hr']))
    return mapping


def encode_runtime_json(value):
    """Use the actual JS runtime serializer, including its exponent spelling.

    Integer normalization alone is insufficient (e.g. -8.7077e-05). Node is
    already a repository build dependency; do not write a second number encoder.
    """
    raw = json.dumps(value, ensure_ascii=False, allow_nan=False, separators=(',', ':')).encode()
    result = subprocess.run(['node', '-e',
        'const fs=require("node:fs");process.stdout.write(JSON.stringify(JSON.parse(fs.readFileSync(0,"utf8"))))'],
        input=raw, capture_output=True, check=True, timeout=60)
    return result.stdout


def build(source_dir, base_path, cross_path):
    base_raw = base_path.read_bytes()
    base = json.loads(base_raw)
    cross, cross_raw = read_complete(cross_path)
    mapping = bsc_cross_identifications(base, cross)
    seen, missing, duplicate_base = set(), [], []
    rows, sources = [], []
    for start in range(0, 360, 45):
        path = source_dir / f'visual-to-10-ra-{start:03}.xml'
        table, raw = read_complete(path)
        for column, unit in [('ra', 'deg'), ('dec', 'deg'),
                             ('proper_motion_ra_fk5', 'arcsec / yr'), ('proper_motion_dec_fk5', 'arcsec / yr')]:
            if str(table[column].unit) != unit:
                raise ValueError(f'source metadata changed: {column}; recheck documented RA exception')
        sources.append(dict(file=path.name, endpoint=ENDPOINT, query=query(start), maxrec=100000,
                            responseSha256=sha256(raw).hexdigest(), responseBytes=len(raw),
                            retrievedAt=None))
        for row in table:
            match = re.fullmatch(r'SAO\s+([1-9]\d{0,5})', text(row, 'name') or '')
            if not match or not 1 <= int(match[1]) <= 258997 or int(match[1]) in seen:
                raise ValueError('invalid or repeated SAO identity')
            sao = int(match[1]); seen.add(sao)
            ra, dec, mag, pmra, pmdec = [numeric(row, k) for k in
                ['ra', 'dec', 'vmag', 'proper_motion_ra_fk5', 'proper_motion_dec_fk5']]
            if ra is None or dec is None or mag is None or not (start <= ra < start+45 and -90 <= dec <= 90 and -2 <= mag <= 10):
                raise ValueError('invalid source selection or missing coordinate/photometry')
            if sao in mapping:
                duplicate_base.append(sao)
                continue
            if pmra is None or pmdec is None:
                missing.append(sao)
                continue
            flags = [numeric(row, k) for k in ['ref_vmag', 'remarks']]
            if any(v is None or v != int(v) for v in flags):
                raise ValueError('missing source photometry/remarks code')
            rows.append([f'SAO:{sao}', mag, ra, dec, round(sao_ra_motion_to_tangent(pmra, dec), 9), pmdec,
                         *[int(v) for v in flags], text(row, 'hd'), text(row, 'hd_component'), text(row, 'spect_type')])
    # Pin the observed complete release. Source drift requires reassessment, not
    # silently replacing a working publication with a smaller/different subset.
    if len(seen) != 254651 or len(rows) != 246280 or len(duplicate_base) != 8369 or sorted(missing) != [208759, 208795]:
        raise ValueError('pinned SAO selection/exclusion population changed')
    rows.sort(key=lambda r: int(r[0][4:]))
    pack = dict(schemaVersion='sao-visual-supplement-v1', catalogVersion=VERSION,
                frame='FK5', referenceEpoch=2000, magnitudeBand='VISUAL', magnitudeLimit=10,
                baseCatalogVersion=base['catalogVersion'], baseAssetSha256=sha256(base_raw).hexdigest(),
                rowFields=ROW_FIELDS, rows=rows)
    encoded = encode_runtime_json(pack)
    manifest = dict(schemaVersion='sao-visual-supplement-manifest-v1', catalogVersion=VERSION,
        rowCount=len(rows), hashEncoding='UTF-8 ECMAScript JSON.stringify, no trailing newline',
        derivedAssetSha256=sha256(encoded).hexdigest(), derivedAssetBytes=len(encoded),
        sourcePartitions=sources, crossIdentifications=dict(endpoint=ENDPOINT,
            query='SELECT hr,sao,hd FROM bsc5p WHERE vmag BETWEEN -2 AND 6.5 ORDER BY hr',
            responseSha256=sha256(cross_raw).hexdigest(), responseBytes=len(cross_raw)),
        source=dict(landingUrl='https://heasarc.gsfc.nasa.gov/W3Browse/star-catalog/sao.html',
            specificationUrl='https://cdsarc.cds.unistra.fr/viz-bin/ReadMe/I/131A?format=html',
            datasetMetadataUrl='https://data.nasa.gov/dataset/smithsonian-astrophysical-observatory-star-catalog',
            rightsUrl='https://www.usa.gov/government-works',
            usagePolicyUrl='https://heasarc.gsfc.nasa.gov/docs/heasarc/data_policy.html',
            credit='Smithsonian Astrophysical Observatory Star Catalog (1966), ADC corrections through 1991; USNO FK5 J2000 astrometry; HEASARC, NASA/GSFC'),
        derivation=dict(raMotion='Original seconds of time/year multiplied by 15*cos(dec); TAP arcsec/year label is erroneous',
            photometry='Original heterogeneous visual magnitudes; ref_vmag/remarks retained; no Johnson V normalization, B-V, distance or guaranteed V=10 completeness',
            identity='Only explicit BSC SAO cross-identifications suppress added records; retain BSC component identities, never merge by HD or proximity',
            suppressedBscSao=sorted(duplicate_base), excludedMissingMotion=sorted(missing),
            sharedBscSao={str(k): sorted(v) for k,v in sorted(mapping.items()) if len(v)>1},
            acquisitionTime='Not recorded by acquisition; retrievedAt remains null, never inferred from filesystem times',
            runtimeNetwork='No upstream queries; use a validated, separately versioned spatial publication'))
    return pack, manifest, encoded


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source-dir', type=Path, required=True)
    parser.add_argument('--bsc-base', type=Path, required=True)
    parser.add_argument('--cross-identifications', type=Path, required=True)
    parser.add_argument('--output-dir', type=Path, required=True)
    args = parser.parse_args()
    pack, manifest, encoded = build(args.source_dir, args.bsc_base, args.cross_identifications)
    args.output_dir.mkdir(parents=True, exist_ok=True)
    (args.output_dir / f'{VERSION}.json').write_bytes(encoded)
    (args.output_dir / f'{VERSION}.manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
    print(json.dumps({key:manifest[key] for key in ['rowCount','derivedAssetBytes','derivedAssetSha256']}))
