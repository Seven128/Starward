"""Build the pinned Modern constellation geometry and independently obtainable art.

Uses acquired originals, never runtime provider requests. Astropy decodes the
independent BSC5P/SAO VOTables; SIMBAD supplies identity relationships only. PNGs are copied byte-for-byte, not re-encoded or recolored.
"""
import argparse
from hashlib import sha256
import json
from pathlib import Path
import re
import shutil
import struct

from constellation_geometry import build_geometry
from build_sao import encode_runtime_json

VERSION = 'stellarium-modern-v24.4.v2'
COMMIT = 'ab961cbde42eec8121be0df6ff48292f8d492b54'
BASE = f'https://raw.githubusercontent.com/Stellarium/stellarium/{COMMIT}/skycultures/modern/'
PIN = {
    'constellationship.fab': '92441ca09d71320ec29709af6e51ff6b76f090e7576f1d0e8b25a3fe5626707c',
    'constellationsart.fab': '0dd0d68281ee0832c4dcd2423b806b1e9d987fdcf31435347d0340239d5f976c',
    'info.ini': 'ecfc1652dbdd978fb18c226a2046527d627fb953a9871c752adacaa01f1e3499',
}
SHARED = {'Car': ['Car', 'Pup', 'Vel'], 'Oph': ['Oph', 'Ser']}


def definitions(source):
    for file, digest in PIN.items():
        if sha256((source/file).read_bytes()).hexdigest() != digest:
            raise ValueError(f'pinned source mismatch: {file}')
    groups = {}
    needed = set()
    for line in (source/'constellationship.fab').read_text().splitlines():
        fields = line.split()
        if not fields or fields[0].startswith('#'):
            continue
        iau, count, *ids = fields
        ids = [int(value) for value in ids]
        if not re.fullmatch('[A-Z][A-Za-z]{2}', iau) or iau in groups or len(ids) != 2*int(count):
            raise ValueError('invalid line definition')
        groups[iau] = {'iau': iau, 'lines': [ids[i:i+2] for i in range(0,len(ids),2)], 'artId': None}
        needed.update(ids)
    images = []
    for line in (source/'constellationsart.fab').read_text().splitlines():
        fields = line.split()
        if not fields or fields[0].startswith('#'):
            continue
        iau, file, *values = fields
        if iau not in groups or not re.fullmatch('[a-z_-]+[.]png', file) or len(values) != 9:
            raise ValueError('invalid art definition')
        values = [int(value) for value in values]
        raw = (source/'images'/file).read_bytes()
        if raw[:8] != b'\x89PNG\r\n\x1a\n' or raw[12:16] != b'IHDR':
            raise ValueError('not PNG')
        width,height = struct.unpack('>II',raw[16:24])
        if not (1 <= width <= 4096 and 1 <= height <= 4096):
            raise ValueError('image dimensions')
        anchors = [{'hip': values[i+2], 'pixel': values[i:i+2]} for i in range(0,9,3)]
        for a in anchors:
            if not (0 <= a['pixel'][0] <= width and 0 <= a['pixel'][1] <= height):
                raise ValueError('image anchor bounds')
        needed.update(a['hip'] for a in anchors)
        members = SHARED.get(iau,[iau])
        for member in members:
            if groups[member]['artId'] is not None:
                raise ValueError('multiple art owners')
            groups[member]['artId'] = iau
        images.append({'id': iau, 'members': members, 'file': file, 'width': width, 'height': height,
            'anchors': anchors, 'sha256': sha256(raw).hexdigest(), 'bytes': len(raw), 'originalUrl': BASE+file})
    if len(groups) != 88 or len(images) != 85 or len(needed) != 713 or any(g['artId'] is None for g in groups.values()):
        raise ValueError('incomplete pinned coverage')
    return sorted(groups.values(),key=lambda g:g['iau']), sorted(images,key=lambda a:a['id']), needed


def build(source, geometry_source, output, assets):
    groups,images,needed = definitions(source)
    rows,source_hashes = build_geometry(geometry_source,needed)
    acquired = json.loads((geometry_source/'acquisition.json').read_text())
    retrieved = max(item['retrievedAt'] for item in acquired)
    geometry = {
        'format':'constellation-geometry-v2', 'frame':'FK5','epochJulianYear':2000,
        'properMotionUnit':'mas/year','raMotion':'cos(dec)*dRA/dt',
        'fields':['hip','raDeg','decDeg','pmRaCosDecMasYr','pmDecMasYr','identityRelation','members'],
        'stars':rows,
        'license':'ODbL-1.0','licenseUrl':'https://opendatacommons.org/licenses/odbl/1-0/',
        'credit':'Contains CDS/SIMBAD identity information, available under ODbL 1.0; BSC5P and SAO numerical geometry from HEASARC.',
        'identificationsUrl':'https://simbad.cds.unistra.fr/simbad/',
        'additionalCredit':{'provider':'All Skies Encyclopaedia / IAU-WGSN',
            'authors':['Susanne M Hoffmann','Youla Azkarrula','Ian Ridpath'],
            'url':'https://ase.exopla.net/index.php/Acrux','license':'CC BY 4.0',
            'licenseUrl':'https://creativecommons.org/licenses/by/4.0/',
            'usage':'Only the explicit Acrux HIP60718 / HR4730 identity; no positions, photometry, article text or images.'},
        'sources':source_hashes,
        'sourceUrls':{
            'simbad-identifiers.csv':'https://simbad.cds.unistra.fr/simbad/sim-tap/',
            'simbad-components.csv':'https://simbad.cds.unistra.fr/simbad/sim-tap/',
            'bsc-geometry.xml':'https://heasarc.gsfc.nasa.gov/W3Browse/star-catalog/bsc5p.html',
            'sao-geometry.xml':'https://heasarc.gsfc.nasa.gov/W3Browse/star-catalog/sao.html',
            'iau-acrux.html':'https://ase.exopla.net/index.php/Acrux'},
        'method':'Same-object HR preferred; explicit system HR members use normalized equal-weight direction and tangent velocity; otherwise same-object SAO. HIP60718 uses IAU-WGSN explicit HR4730 component. No Hipparcos numerical data; no nearest-star mapping.',
        'limitations':['System representatives are derived decorative geometry, not measured photocentres or selectable stellar identities.',
            'FK5 J2000 linear proper motion; no binary orbital model, parallax, radial velocity or refraction.']}
    geometry_bytes = encode_runtime_json(geometry)
    geometry_file = 'geometry-v2.json'
    pack = {'format':'constellation-catalog-v2','catalogVersion':VERSION,'commit':COMMIT,
        'retrievedAt':retrieved,'astrometry':{key:geometry[key] for key in ['frame','epochJulianYear','properMotionUnit','raMotion','fields']},
        'stars':rows,'constellations':groups,'images':images,
        'geometryAsset':{'file':geometry_file,'sha256':sha256(geometry_bytes).hexdigest(),'bytes':len(geometry_bytes)},
        'provenance':{
            'definitions':{'provider':"Stellarium's team",'url':BASE,'license':'CC BY-SA 4.0',
                'licenseUrl':'https://creativecommons.org/licenses/by-sa/4.0/','sourceFiles':PIN,
                'modifications':'Parsed line pairs and image anchors; added explicit shared-image membership. Geometry is a separate ODbL database.'},
            'art':{'author':'Johan Meuris','url':'https://johanmeuris.eu/work/stellarium-constellation-art/',
                'license':'Free Art License 1.3','licenseUrl':'https://artlibre.org/licence/lal/en/',
                'modifications':'Original PNG bytes unchanged. Runtime projection, opacity and display-mode tint only.'},
            'astrometry':{'provider':'Hoffleit & Warren BSC5P; SAO/ADC/USNO; HEASARC; CDS/SIMBAD identity relationships',
                'url':geometry['sourceUrls']['bsc-geometry.xml'],'license':'ODbL-1.0',
                'licenseUrl':geometry['licenseUrl'],'licenseStatementUrl':geometry['identificationsUrl'],
                'usagePolicyUrl':'https://heasarc.gsfc.nasa.gov/docs/heasarc/data_policy.html',
                'sourceFiles':source_hashes,'sourceUrls':geometry['sourceUrls'],
                'modifications':geometry['method']}},
        'limitations':geometry['limitations']+['Acrux identity credit: All Skies Encyclopaedia / IAU-WGSN, Susanne M Hoffmann, Youla Azkarrula, Ian Ridpath; CC BY 4.0 https://creativecommons.org/licenses/by/4.0/ . Only identifier relationship reused.',
            'Geometry is independently derived for the 713 definition identifiers; it does not add, rename or merge rendered stars.',
            'Art is a cultural illustration, not physical celestial imagery.']}
    encoded = encode_runtime_json(pack)
    manifest = {'catalogVersion':VERSION,'hashEncoding':'JSON.stringify(parsed catalog)',
        'sha256':sha256(encoded).hexdigest(),'bytes':len(encoded),'constellations':len(groups),
        'images':len(images),'geometryRows':len(rows),'originalImageBytes':sum(a['bytes'] for a in images),
        'geometryAsset':pack['geometryAsset']}
    output.mkdir(parents=True,exist_ok=True); assets.mkdir(parents=True,exist_ok=True)
    (output/(VERSION+'.json')).write_bytes(encoded+b'\n')
    (output/(VERSION+'.manifest.json')).write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf-8')
    (assets/geometry_file).write_bytes(geometry_bytes)
    for a in images:
        shutil.copyfile(source/'images'/a['file'],assets/a['file'])
    for file in PIN:
        shutil.copyfile(source/file,assets/file)
    (assets/'NOTICE.txt').write_text(
        f'Stellarium Modern v24.4, commit {COMMIT}\n'+
        "Line definitions and image anchor identifiers: Stellarium's team, CC BY-SA 4.0.\n"+
        'https://creativecommons.org/licenses/by-sa/4.0/\n'+
        'Illustrations: Johan Meuris, Free Art License 1.3; original PNG bytes retained.\n'+
        'https://artlibre.org/licence/lal/en/\nhttps://johanmeuris.eu/work/stellarium-constellation-art/\n'+
        f'Original files: {BASE}\n'+
        'Separate geometry-v2.json: contains CDS/SIMBAD identity information under ODbL 1.0.\n'+
        'https://simbad.cds.unistra.fr/simbad/\nhttps://opendatacommons.org/licenses/odbl/1-0/\n'+
        'Coordinates/proper motions: BSC5P (Hoffleit & Warren 1991), SAO/ADC/USNO FK5 J2000, HEASARC.\n'+
        'https://heasarc.gsfc.nasa.gov/docs/heasarc/data_policy.html\n'+
        'No Hipparcos numerical astrometry. Explicit multiple-system members use geometric representatives, not photocentres.\n'+
        'HIP60718 component identification only: All Skies Encyclopaedia / IAU-WGSN, Susanne M Hoffmann, Youla Azkarrula, Ian Ridpath.\n'+
        'https://ase.exopla.net/index.php/Acrux ; CC BY 4.0 https://creativecommons.org/licenses/by/4.0/ .\n'+
        'Geometry and topology retain separate licenses; runtime projection/opacity/tint do not change original downloadable art.\n',encoding='utf-8')
    return manifest


if __name__ == '__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('--source-dir',type=Path,required=True)
    parser.add_argument('--geometry-source-dir',type=Path,required=True)
    parser.add_argument('--output-dir',type=Path,required=True)
    parser.add_argument('--asset-dir',type=Path,required=True)
    args=parser.parse_args()
    print(json.dumps(build(args.source_dir,args.geometry_source_dir,args.output_dir,args.asset_dir)))
