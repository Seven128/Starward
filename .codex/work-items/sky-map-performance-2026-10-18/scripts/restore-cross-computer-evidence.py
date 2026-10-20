"""Verify this task's declared Drive byte parts and restore to a fresh private directory."""
import argparse
import hashlib
import json
import stat
import tempfile
import zipfile
from pathlib import Path, PurePosixPath


def digest_file(file):
    result = hashlib.sha256()
    with file.open('rb') as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b''):
            result.update(chunk)
    return result.hexdigest()


def member_path(value):
    path = PurePosixPath(value)
    if not value or '\\' in value or ':' in value or path.is_absolute() or any(p in ('', '.', '..') for p in value.split('/')):
        raise ValueError('Unsafe archive member')
    return path


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--parts-directory', type=Path, required=True)
    parser.add_argument('--destination', type=Path, required=True)
    parser.add_argument('--receipt', type=Path,
                        default=Path(__file__).resolve().parent.parent / 'CROSS-COMPUTER-TRANSFER.json',
                        help='Explicit receipt for a later task evidence packet; the original handoff remains the default.')
    args = parser.parse_args()
    receipt = json.loads(args.receipt.read_text(encoding='utf-8-sig'))
    packet = receipt['packet']
    destination = args.destination.resolve()
    if destination.exists() or args.destination.is_symlink():
        raise ValueError('Destination must be a fresh directory; existing files are never overlaid')
    if not destination.parent.is_dir():
        raise ValueError('Prepare the intended private parent directory first')
    parts = packet['parts']
    if [row['order'] for row in parts] != list(range(1, len(parts) + 1)):
        raise ValueError('Part order mismatch')
    # The temporary assembled ZIP stays beside the private destination and is
    # removed by TemporaryFile; no source download is deleted or modified.
    with tempfile.TemporaryFile(dir=destination.parent) as combined:
        complete_hash = hashlib.sha256()
        complete_bytes = 0
        for row in parts:
            if len(member_path(row['name']).parts) != 1:
                raise ValueError('Part filename must be a basename')
            file = args.parts_directory / row['name']
            if file.is_symlink() or not file.is_file() or file.stat().st_size != row['bytes'] or digest_file(file) != row['sha256']:
                raise ValueError('Part identity mismatch: ' + row['name'])
            part_hash = hashlib.sha256()
            with file.open('rb') as source:
                for chunk in iter(lambda: source.read(1024 * 1024), b''):
                    combined.write(chunk)
                    part_hash.update(chunk)
                    complete_hash.update(chunk)
                    complete_bytes += len(chunk)
            if part_hash.hexdigest() != row['sha256']:
                raise ValueError('Part changed during assembly')
        if complete_bytes != packet['bytes'] or complete_hash.hexdigest() != packet['sha256']:
            raise ValueError('Complete archive identity mismatch')
        combined.seek(0)
        with zipfile.ZipFile(combined) as archive:
            infos = archive.infolist()
            names = [item.filename for item in infos]
            if len(set(names)) != len(names):
                raise ValueError('Duplicate archive member')
            manifest_bytes = archive.read(packet['manifestName'])
            if hashlib.sha256(manifest_bytes).hexdigest() != packet['manifestSha256']:
                raise ValueError('Selection manifest identity mismatch')
            manifest = json.loads(manifest_bytes)
            rows = manifest['files']
            if len(rows) != packet['files'] or sum(row['bytes'] for row in rows) != packet['uncompressedBytes']:
                raise ValueError('Selection inventory mismatch')
            expected = {row['path']: row for row in rows}
            if len(expected) != len(rows) or set(names) != set(expected) | {packet['manifestName']}:
                raise ValueError('Unexpected or missing archive member')
            for item in infos:
                member_path(item.filename)
                if item.is_dir() or stat.S_ISLNK(item.external_attr >> 16):
                    raise ValueError('Only regular file members are supported')
                limit = len(manifest_bytes) if item.filename == packet['manifestName'] else expected[item.filename]['bytes']
                if item.file_size != limit:
                    raise ValueError('Archive member size mismatch')
            # Do not expose a partially restored directory as the requested
            # completed destination. Failure leaves its named staging directory.
            staging = Path(tempfile.mkdtemp(prefix=destination.name + '.incomplete-', dir=destination.parent))
            for row in rows:
                target = staging.joinpath(*member_path(row['path']).parts)
                target.parent.mkdir(parents=True, exist_ok=True)
                member_hash = hashlib.sha256()
                written = 0
                with archive.open(row['path']) as source, target.open('xb') as output:
                    while True:
                        chunk = source.read(min(1024 * 1024, row['bytes'] - written + 1))
                        if not chunk:
                            break
                        written += len(chunk)
                        if written > row['bytes']:
                            raise ValueError('Archive member exceeds declared size')
                        output.write(chunk)
                        member_hash.update(chunk)
                if written != row['bytes'] or member_hash.hexdigest() != row['sha256'] or digest_file(target) != row['sha256']:
                    raise ValueError('Restored member identity mismatch')
            (staging / packet['manifestName']).write_bytes(manifest_bytes)
            if destination.exists():
                raise ValueError('Destination appeared during restore; staging retained')
            staging.rename(destination)
    print(json.dumps({'restored': True, 'files': len(rows), 'bytes': packet['uncompressedBytes'], 'archiveSha256': packet['sha256'], 'manifestSha256': packet['manifestSha256'], 'destination': str(destination), 'startedService': False, 'deviceOperation': False}))


if __name__ == '__main__':
    main()
