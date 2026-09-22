"""Commercial-source constellation geometry; no Hipparcos numerical input.

HIP remains the identifier in the independently licensed Stellarium topology.
SIMBAD supplies identity relationships only. BSC5P and SAO supply FK5 J2000
positions and proper motions. Multiple systems use an equal-weight geometric
representative, never a claimed photocentre or a selectable stellar object.
"""
import csv
from collections import defaultdict
from hashlib import sha256
import math
from pathlib import Path
import re

import numpy as np
from build_sao import read_complete, sao_ra_motion_to_tangent

ACRUX_URL = 'https://ase.exopla.net/index.php/Acrux'


def identifiers(path, needed):
    found = defaultdict(set)
    for row in csv.DictReader(path.read_text(encoding='utf-8').splitlines()):
        hip = re.fullmatch(r'HIP\s+([1-9]\d*)', row['hip_id'])
        ref = re.fullmatch(r'(HR|SAO)\s+([1-9]\d*)', row['cross_id'])
        if not hip or int(hip[1]) not in needed:
            raise ValueError('unexpected cross-identification HIP')
        if ref:
            found[int(hip[1])].add(f'{ref[1]}:{int(ref[2])}')
    return found


def mapping(source, needed):
    direct = identifiers(source/'simbad-identifiers.csv', needed)
    children = identifiers(source/'simbad-components.csv', needed)
    result = {}
    for hip in sorted(needed):
        hr = sorted(r for r in direct[hip] if r.startswith('HR:'))
        members = sorted(r for r in children[hip] if r.startswith('HR:'))
        sao = sorted(r for r in direct[hip] if r.startswith('SAO:'))
        if len(hr) > 1:
            raise ValueError('ambiguous direct HR identity')
        if hr:
            refs, relation = hr, 'SAME_OBJECT'
        elif members:
            refs, relation = members, 'SYSTEM_MEMBERS'
        elif hip == 60718:
            # The WGSN page explicitly gives both identifiers. Its positions
            # and photometry are not read or copied into this publication.
            raw = (source/'iau-acrux.html').read_text(encoding='utf-8')
            if not re.search(r'HIP\s+60718.*?HR\s+4730', raw, re.S):
                raise ValueError('Acrux explicit IAU identity missing')
            refs, relation = ['HR:4730'], 'IAU_NAMED_COMPONENT'
        elif len(sao) == 1:
            refs, relation = sao, 'SAME_OBJECT'
        else:
            raise ValueError(f'unresolved identity: HIP {hip}')
        result[hip] = dict(members=refs, relation=relation)
    return result


def catalog_rows(source):
    result = {}
    for file, kind, fields in [
        ('bsc-geometry.xml', 'HR', ['ra','dec','pmra','pmdec']),
        ('sao-geometry.xml', 'SAO', ['ra','dec','proper_motion_ra_fk5','proper_motion_dec_fk5']),
    ]:
        table, _ = read_complete(source/file)
        for field, unit in zip(fields, ['deg','deg','arcsec / yr','arcsec / yr']):
            if str(table[field].unit) != unit:
                raise ValueError(f'geometry unit mismatch: {field}')
        for row in table:
            ref = f"HR:{int(row['hr'])}" if kind == 'HR' else re.sub(r'\s+', ':', str(row['name']).strip())
            if not re.fullmatch(r'(HR|SAO):[1-9]\d*', ref) or ref in result:
                raise ValueError('invalid or duplicate geometry identity')
            if any(np.ma.is_masked(row[k]) for k in fields):
                raise ValueError('missing geometry')
            ra, dec, pmra, pmdec = [float(row[k]) for k in fields]
            if not all(math.isfinite(v) for v in [ra,dec,pmra,pmdec]) or not (0 <= ra < 360 and abs(dec) <= 90):
                raise ValueError('invalid geometry')
            if kind == 'SAO':
                pmra = sao_ra_motion_to_tangent(pmra, dec)
            result[ref] = [ra,dec,pmra,pmdec]
    return result


def geometric_representative(members):
    """Differentiate normalized mean direction; discard radial velocity.

    Inputs use tangent arcsec/year. No flux weights, distances, orbital motion
    or Hipparcos flags are fabricated for a system representative.
    """
    positions, velocities = [], []
    for ra, dec, pmra, pmdec in members:
        a, d = np.radians([ra,dec])
        positions.append([np.cos(d)*np.cos(a),np.cos(d)*np.sin(a),np.sin(d)])
        velocities.append((np.array([-np.sin(a),np.cos(a),0])*pmra +
            np.array([-np.sin(d)*np.cos(a),-np.sin(d)*np.sin(a),np.cos(d)])*pmdec)*np.pi/648000)
    positions = np.array(positions)
    # A multiple-system representative cannot silently join distant stars.
    for first in positions:
        for second in positions:
            angle = math.degrees(math.atan2(np.linalg.norm(np.cross(first,second)),np.dot(first,second)))*3600
            if angle > 30:
                raise ValueError('system geometry exceeds reviewed 30 arcsec extent')
    mean = positions.mean(axis=0)
    length = np.linalg.norm(mean)
    v = mean/length
    dv = np.array(velocities).mean(axis=0)
    dv = (dv-v*np.dot(v,dv))/length
    a, d = math.atan2(v[1],v[0]), math.asin(v[2])
    return [math.degrees(a)%360,math.degrees(d),
        float(np.dot(dv,[-math.sin(a),math.cos(a),0])*648000/np.pi)*1000,
        float(np.dot(dv,[-math.sin(d)*math.cos(a),-math.sin(d)*math.sin(a),math.cos(d)])*648000/np.pi)*1000]


def build_geometry(source, needed):
    identities = mapping(source, needed)
    values = catalog_rows(source)
    used = {r for row in identities.values() for r in row['members']}
    if used != set(values):
        raise ValueError('geometry input population differs from identity mapping')
    stars = []
    for hip, item in identities.items():
        refs = item['members']
        stars.append([hip,*geometric_representative([values[r] for r in refs]),item['relation'],refs])
    files = ['simbad-identifiers.csv','simbad-components.csv','bsc-geometry.xml','sao-geometry.xml','iau-acrux.html']
    return stars, {name:sha256((source/name).read_bytes()).hexdigest() for name in files}
