"""Derive the bounded BSC5P runtime pack from an acquired HEASARC VOTable.

Astropy owns VOTable decoding, including binary arrays, nulls and units.
Only names/identifiers are read from the IAU table; no article text or images.
"""
import argparse
from collections import defaultdict
from datetime import datetime, timezone
from hashlib import sha256
from html.parser import HTMLParser
import json
import math
from pathlib import Path
import re
import xml.etree.ElementTree as ET
from urllib.parse import urlencode

from astropy.table import Table
import numpy as np

NON_STELLAR = {92, 95, 182, 1057, 1841, 2472, 2496, 3515, 3671, 6309, 6515, 7189, 7539, 8296}
PROFILES = {
    5: dict(version='bsc5p-bright-stars.v1', row_count=1630),
    6.5: dict(version='bsc5p-bright-stars.v2', row_count=8404),
}


def query_url(magnitude_limit=5):
    if magnitude_limit not in PROFILES: raise ValueError('unsupported magnitude limit')
    query = ('SELECT hr,ra,dec,vmag,vmag_code,vmag_uncert,bv_color,bv_uncert,pmra,pmdec,hd,spect_type,alt_name '
             f'FROM bsc5p WHERE vmag BETWEEN -2 AND {magnitude_limit:g} ORDER BY vmag ASC,hr ASC')
    return 'https://heasarc.gsfc.nasa.gov/xamin/vo/tap/sync?' + urlencode(dict(REQUEST='doQuery', LANG='ADQL', MAXREC=12000, QUERY=query))


class NameTable(HTMLParser):
    def __init__(self):
        super().__init__(); self.rows = []; self.row = None; self.cell = None
    def handle_starttag(self, tag, attrs):
        if tag == 'tr':
            # HTML permits the previous row's closing tag to be omitted.
            if self.row is not None: self.rows.append(self.row)
            self.row = []
        if tag in ('td', 'th') and self.row is not None: self.cell = ''
    def handle_data(self, data):
        if self.cell is not None: self.cell += data
    def handle_endtag(self, tag):
        if tag in ('td', 'th') and self.cell is not None:
            self.row.append(self.cell.strip()); self.cell = None
        if tag == 'tr' and self.row is not None:
            self.rows.append(self.row); self.row = None


GREEK = dict(zip('αβγδεζηθικλμνξοπρστυφχψω', ['Alp','Bet','Gam','Del','Eps','Zet','Eta','The','Iot','Kap','Lam','Mu','Nu','Xi','Omi','Pi','Rho','Sig','Tau','Ups','Phi','Chi','Psi','Ome']))


def archived_name_identities(raw):
    parser = NameTable(); parser.feed(raw.decode('utf-8'))
    header = next((row for row in parser.rows if 'IAU Name' in row and 'Designation' in row), None)
    if not header: raise ValueError('IAU archived identifier table header missing')
    identities = defaultdict(set)
    for row in parser.rows:
        if len(row) != len(header): continue
        match = re.fullmatch(r'HR\s+([1-9]\d{0,3})', row[header.index('Designation')])
        if match: identities[row[header.index('IAU Name')]].add(int(match[1]))
    return identities


def names_by_hr(raw, table, identity_raw=None):
    parser = NameTable(); parser.feed(raw.decode('utf-8'))
    published_identities = archived_name_identities(identity_raw) if identity_raw is not None else {}
    candidates = defaultdict(list)
    aliases = defaultdict(set)
    for item in table:
        hr = int(item['hr'])
        aliases[f'HR:{hr}'].add(hr)
        if not np.ma.is_masked(item['hd']): aliases[f'HD:{int(item["hd"])}'].add(hr)
        alt = '' if np.ma.is_masked(item['alt_name']) else re.sub(r'\s+', '', str(item['alt_name']))
        # BSC's published Bayer code and component digit must match exactly.
        bayer = re.fullmatch(r'\d*([A-Za-z]{2,3}[1-9]?[A-Z][A-Za-z]{2})', alt)
        if bayer: aliases[f'BAYER:{bayer[1]}'].add(hr)
        flamsteed = re.fullmatch(r'(\d+)([A-Z][A-Za-z]{2})', alt)
        if flamsteed: aliases[f'FLAMSTEED:{flamsteed[1]}{flamsteed[2]}'].add(hr)
    header = next((row for row in parser.rows if 'proper names' in row and 'Designation' in row and 'HIP' in row), None)
    if not header: raise ValueError('IAU identifier table header missing')
    for row in parser.rows:
        if len(row) != len(header): continue
        designation = row[header.index('Designation')]
        match = re.fullmatch(r'(HR|HD)\s+(\d+)', designation)
        ids = set(aliases.get(f'{match[1]}:{int(match[2])}', ())) if match else set()
        if not match:
            bayer = re.fullmatch(r'([αβγδεζηθικλμνξοπρστυφχψω])([1-9]?)\s+([A-Z][A-Za-z]{2})', row[header.index('Bayer ID')])
            flamsteed = re.fullmatch(r'(\d+)\s*([A-Z][A-Za-z]{2})', designation)
            if bayer: ids = set(aliases.get(f'BAYER:{GREEK[bayer[1]]}{bayer[2]}{bayer[3]}', ()))
            elif flamsteed: ids = set(aliases.get(f'FLAMSTEED:{flamsteed[1]}{flamsteed[2]}', ()))
        name = row[header.index('proper names')].strip()
        if len(ids) > 1:
            # Exact same active name + one explicitly published HR component.
            # Never select by magnitude, position, first row or a shared HIP.
            published = published_identities.get(name, set())
            if len(published) == 1 and published.issubset(ids): ids = published
        if len(ids) != 1: continue
        hip = row[header.index('HIP')].strip()
        if name: candidates[next(iter(ids))].append((name, hip if re.fullmatch(r'\d{1,6}', hip) else None))
    return {hr: values[0] for hr, values in candidates.items() if len(set(values)) == 1}


def build(catalog_path, names_path, magnitude_limit=5, identity_names_path=None):
    if magnitude_limit not in PROFILES: raise ValueError('unsupported magnitude limit')
    profile = PROFILES[magnitude_limit]
    raw = catalog_path.read_bytes(); names_raw = names_path.read_bytes()
    xml = ET.fromstring(raw)
    statuses = [node.attrib.get('value') for node in xml.iter() if node.tag.endswith('INFO') and node.attrib.get('name') == 'QUERY_STATUS']
    if not statuses or any(value != 'OK' for value in statuses): raise ValueError('query error or truncated response')
    table = Table.read(catalog_path, format='votable')
    for column, unit in [('ra', 'deg'), ('dec', 'deg'), ('pmra', 'arcsec / yr'), ('pmdec', 'arcsec / yr')]:
        if str(table[column].unit) != unit: raise ValueError(f'unexpected unit: {column}')
    identity_raw = identity_names_path.read_bytes() if identity_names_path is not None else None
    names = names_by_hr(names_raw, table, identity_raw)
    rows = []; seen = set(); excluded = []
    for raw_row in table:
        hr = int(raw_row['hr'])
        if hr in NON_STELLAR: excluded.append(hr); continue
        if not 1 <= hr <= 9110 or hr in seen: raise ValueError('invalid or repeated HR')
        seen.add(hr)
        def numeric(key, digits):
            value = raw_row[key]
            if np.ma.is_masked(value): return None
            value = float(value)
            if not math.isfinite(value): raise ValueError(f'nonfinite {key}')
            return round(value, digits)
        def optional_text(key):
            return None if np.ma.is_masked(raw_row[key]) else str(raw_row[key]).strip() or None
        ra, dec, mag = numeric('ra', 8), numeric('dec', 8), numeric('vmag', 2)
        pmra, pmdec = numeric('pmra', 3), numeric('pmdec', 3)
        if None in (ra, dec, mag, pmra, pmdec) or not (0 <= ra < 360 and -90 <= dec <= 90 and -2 <= mag <= magnitude_limit):
            raise ValueError(f'essential astrometry missing: HR {hr}')
        name, hip = names.get(hr, (None, None))
        rows.append(dict(sourceId=f'HR:{hr}', hr=str(hr), hip=hip, hd=str(int(raw_row['hd'])) if not np.ma.is_masked(raw_row['hd']) else None,
                         raDeg=ra, decDeg=dec, pmRaCosDecArcsecYr=pmra, pmDecArcsecYr=pmdec, refEpoch=2000,
                         vMag=mag, vMagCode=optional_text('vmag_code'), vMagUncertainty=optional_text('vmag_uncert'),
                         bV=numeric('bv_color', 2), bVUncertainty=optional_text('bv_uncert'),
                         spectralType=optional_text('spect_type'), alternateName=optional_text('alt_name'), properName=name))
    rows.sort(key=lambda row: (row['vMag'], int(row['hr'])))
    if len(rows) != profile['row_count']: raise ValueError('complete query population differs from the pinned publication')
    pack = dict(schemaVersion='bsc5p-bright-stars-v1', catalogVersion=profile['version'], release='HEASARC BSC5P (5th edition preliminary)',
                frame='FK5', referenceEpoch=2000, magnitudeBand='V', magnitudeLimit=magnitude_limit, rows=rows)
    # Match runtime JSON.stringify number spelling (including 0, not -0.0).
    def canonical(value):
        if isinstance(value, float) and value.is_integer(): return int(value)
        if isinstance(value, list): return [canonical(item) for item in value]
        if isinstance(value, dict): return {key: canonical(item) for key, item in value.items()}
        return value
    pack = canonical(pack)
    encoded = json.dumps(pack, ensure_ascii=False, separators=(',', ':'), allow_nan=False).encode('utf-8')
    manifest = dict(schemaVersion='bsc5p-bright-stars-manifest-v1', catalogVersion=pack['catalogVersion'], rowCount=len(rows),
                    namedRowCount=sum(row['properName'] is not None for row in rows), rowOrder='Vmag ASC, HR numeric ASC',
                    derivedAssetSha256=sha256(encoded).hexdigest(), derivedAssetBytes=len(encoded),
                    retrievedAt=datetime.fromtimestamp(catalog_path.stat().st_mtime, timezone.utc).isoformat().replace('+00:00', 'Z'),
                    sources=dict(catalog=dict(queryUrl=query_url(magnitude_limit), responseSha256=sha256(raw).hexdigest(), responseBytes=len(raw),
                        landingUrl='https://heasarc.gsfc.nasa.gov/W3Browse/star-catalog/bsc5p.html',
                        datasetMetadataUrl='https://data.nasa.gov/dataset/bright-star-catalog', rightsUrl='https://www.usa.gov/government-works',
                        usagePolicyUrl='https://heasarc.gsfc.nasa.gov/docs/heasarc/data_policy.html',
                        credit='Hoffleit & Warren (1991), Bright Star Catalog, 5th Revised Edition (Preliminary Version); HEASARC, NASA/GSFC'),
                        names=dict(sourceUrl='https://exopla.net/star-names/modern-iau-star-names/', provider='IAU Working Group on Star Names',
                            responseSha256=sha256(names_raw).hexdigest(), responseBytes=len(names_raw), usage='Proper names and unambiguous published HR/HD/Bayer/Flamsteed identifiers; HIP aliases from the same IAU row')),
                    derivation=dict(excludedNonStellarHr=sorted(excluded), nonStellarExclusionList=sorted(NON_STELLAR),
                        properMotion='mu_alpha_cos_delta and mu_delta, arcsec/year at FK5 J2000 epoch; no copied Hipparcos astrometry',
                        photometry='Source V magnitude code and uncertainty retained; H is original HR photometry, not normalized to Johnson V',
                        names='Exact unambiguous HR or HD, otherwise exact Bayer including component digit or Flamsteed identity; missing/component/ambiguous names are not guessed', runtimeNetwork='forbidden'))
    if identity_raw is not None:
        manifest['sources']['nameIdentities'] = dict(
            sourceUrl='https://iauarchive.eso.org/public/themes/naming_stars/',
            provider='IAU Working Group on Star Names', publication='IAU-approved names as of 2021-01-01',
            responseSha256=sha256(identity_raw).hexdigest(), responseBytes=len(identity_raw),
            usage='Only explicit HR identity for the exact same active name when current designation matches multiple BSC components; no archived astrometry, photometry or retired names')
        manifest['derivation']['names'] += '; ambiguous matches may resolve only through one explicit archived IAU HR within the current candidate set'
    return pack, manifest, encoded


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--catalog', type=Path, required=True); parser.add_argument('--names', type=Path, required=True)
    parser.add_argument('--output-dir', type=Path, required=True)
    parser.add_argument('--magnitude-limit', type=float, choices=tuple(PROFILES), default=5)
    parser.add_argument('--identity-names', type=Path, help='Optional archived IAU explicit HR component identities')
    args = parser.parse_args()
    pack, manifest, encoded = build(args.catalog, args.names, args.magnitude_limit, args.identity_names)
    args.output_dir.mkdir(parents=True, exist_ok=True)
    (args.output_dir / f'{pack["catalogVersion"]}.json').write_bytes(encoded)
    (args.output_dir / f'{pack["catalogVersion"]}.manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({key: manifest[key] for key in ['rowCount', 'namedRowCount', 'derivedAssetSha256']}, ensure_ascii=False))
