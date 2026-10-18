"""Read only pinned public runtime ZIP members into a fresh import directory.

Transport authentication/download belongs to the connected Drive owner. No key,
private ZIP, database operation or arbitrary archive extraction is performed.
"""
import argparse
import hashlib
import json
import re
from pathlib import Path, PurePosixPath
import zipfile


def digest_file(file):
    with file.open('rb') as stream:
        return digest_stream(stream)


def digest_stream(stream):
    result = hashlib.sha256()
    while chunk := stream.read(1024 * 1024):
        result.update(chunk)
    return result.hexdigest()


def import_archive(repo, archive, output):
    lock = json.loads((repo / 'data-pipelines/runtime-data/current.lock.json').read_text('utf-8'))
    if lock.get('schemaVersion') != 'starward-backend-data-lock-v1' or not re.fullmatch(r'data-pipelines/runtime-data/releases/[a-z0-9][a-z0-9._-]*', lock['runtime']['directory']):
        raise ValueError('backend_data_lock_invalid')
    mirror = next(item for item in lock['runtime']['transports'] if item['provider'] == 'GOOGLE_DRIVE')
    identity = mirror['archive']
    if archive.stat().st_size != identity['bytes'] or digest_file(archive) != identity['sha256']:
        raise ValueError('backend_data_archive_identity_mismatch')
    index_path = repo / lock['runtime']['directory'] / 'FILES.json'
    index_bytes = index_path.read_bytes()
    if len(index_bytes) != lock['runtime']['index']['bytes'] or hashlib.sha256(index_bytes).hexdigest() != lock['runtime']['index']['sha256']:
        raise ValueError('backend_data_index_identity_mismatch')
    files = json.loads(index_bytes)['files']
    if not files or len({record['path'] for record in files}) != len(files):
        raise ValueError('backend_data_index_invalid')
    if output.exists():
        raise ValueError('backend_data_fresh_import_directory_required')
    with zipfile.ZipFile(archive) as zipped:
        names = zipped.namelist()
        if len(set(names)) != len(names):
            raise ValueError('backend_data_duplicate_zip_entry')
        selected = []
        for record in files:
            relative = PurePosixPath(record['path'])
            if (relative.is_absolute() or '..' in relative.parts or '\\' in record['path'] or ':' in record['path']
                    or not re.fullmatch(r'(nightlight|terrain)/.+\.(json|png|tif)', record['path'])):
                raise ValueError('backend_data_zip_path_invalid')
            member = (mirror.get('memberRoot', '') + record['path'])
            info = zipped.getinfo(member)
            if info.file_size != record['bytes'] or (info.external_attr >> 16) & 0o170000 == 0o120000:
                raise ValueError('backend_data_zip_member_invalid')
            selected.append((record, info))
        # Validate all selected bytes before creating the fresh destination.
        for record, info in selected:
            with zipped.open(info) as stream:
                if digest_stream(stream) != record['sha256']:
                    raise ValueError('backend_data_zip_member_hash_mismatch')
        output.mkdir(parents=True, exist_ok=False)
        for record, info in selected:
            target = output / record['path']
            target.parent.mkdir(parents=True, exist_ok=True)
            with zipped.open(info) as source, target.open('xb') as target_stream:
                while chunk := source.read(1024 * 1024):
                    target_stream.write(chunk)
    return {'status': 'PINNED_PUBLIC_MEMBERS_EXTRACTED', 'files': len(files), 'databaseMutated': False}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--repo', type=Path, default=Path(__file__).resolve().parents[2])
    parser.add_argument('--archive', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    print(json.dumps(import_archive(args.repo.resolve(), args.archive.resolve(), args.output.resolve())))
