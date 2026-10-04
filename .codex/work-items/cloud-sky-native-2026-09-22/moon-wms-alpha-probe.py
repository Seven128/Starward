"""One bounded export from the already adopted WMS; candidate only."""
import hashlib
import json
from pathlib import Path
import urllib.request

root = Path(__file__).resolve().parent
manifest = json.loads((root.parents[2] / 'workers/miniapp-api/assets/moon/manifest.json').read_text())
url = manifest['source']['wmsUrl'].replace('FORMAT=image/jpeg', 'FORMAT=image/png').replace('TRANSPARENT=FALSE', 'TRANSPARENT=TRUE')
request = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
limit = 4 * 1024 * 1024
with urllib.request.urlopen(request, timeout=45) as response:
    content_type = response.headers.get('Content-Type', '')
    data = response.read(limit + 1)
    if response.status != 200 or len(data) > limit or not data.startswith(b'\x89PNG\r\n\x1a\n'):
        raise ValueError(f'Invalid/oversized PNG response: {response.status}, {content_type}, {len(data)}')
target = root / 'evidence/moon-uv750-transparent-candidate.png'
target.write_bytes(data)
print(json.dumps({'url': url, 'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest(), 'contentType': content_type, 'candidateOnly': True}, indent=2))
