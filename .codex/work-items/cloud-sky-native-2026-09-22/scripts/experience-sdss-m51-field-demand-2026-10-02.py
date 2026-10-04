"""Plan one bounded CAS discovery from the actual target TAN; no network."""
from pathlib import Path
import json
import sys
import urllib.parse

ROOT = Path(__file__).resolve().parents[4]
sys.path[:0] = [str(ROOT / 'output/allwise-w3-atlas-0929/python-deps')]
from astropy.wcs import WCS

candidate = json.loads((ROOT / 'output/sdss-gri-tan-candidate-1002/candidate.json').read_text())
wcs = WCS(candidate['wcsHeader'])
n = candidate['pixels']
# Corners, edges and interior target pixels; discovery does not assert coverage.
coordinates = [0, (n-1)/4, (n-1)/2, 3*(n-1)/4, n-1]
samples = []
for y in coordinates:
    for x in coordinates:
        ra, dec = wcs.all_pix2world(x, n-1-y, 0)
        samples.append({'x': x, 'y': y, 'raDeg': float(ra), 'decDeg': float(dec)})
values = ','.join(f"({row['raDeg']:.12f},{row['decDeg']:.12f})" for row in samples)
sql = ('SELECT DISTINCT f.fieldID, f.rerun, f.run, f.camcol, f.field '
       f'FROM (VALUES {values}) AS t(ra,dec) '
       'CROSS APPLY dbo.fPolygonsContainingPointEq(t.ra,t.dec,0.01) AS p '
       'JOIN Region AS r ON r.regionID=p.regionID '
       'JOIN sdssPolygons AS s ON r.id=s.sdssPolygonID '
       'JOIN Field AS f ON f.fieldID=s.primaryFieldID ORDER BY f.fieldID')
query = 'https://skyserver.sdss.org/dr17/SkyServerWS/SearchTools/SqlSearch?' + urllib.parse.urlencode({'cmd': sql, 'format': 'csv'})
output = ROOT / 'output/sdss-corrected-m51-1002/target-field-request.json'
with output.open('x', encoding='utf-8') as stream:
    json.dump({'objectRef': 'M:51', 'targetWcs': candidate['wcsHeader'], 'samples': samples,
        'query': sql, 'requestUrl': query, 'purpose': 'Bounded primary-field discovery for actual target grid',
        'scope': '25 actual target sample positions, not complete field/mosaic/scientific coverage; required fields must be measured from real arrays and their WCS before publication',
        'documentationUrl': 'https://www.sdss.org/dr18/imaging/tools/'}, stream, indent=2)
    stream.write('\n')
print(json.dumps({'request': str(output), 'positions': len(samples), 'networkRequests': 0}))
