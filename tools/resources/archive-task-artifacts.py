"""Archive Git-visible task files without deleting or altering any source.

Python standard-library tar/gzip, not a new storage format. The receipt is small;
file paths and original bytes live once in the archive, not in cumulative JSON.
Run before adding ignore rules. A local archive is not an off-host backup.
"""
import argparse
import hashlib
import json
from pathlib import Path
import re
import subprocess
import tarfile

ROOT = Path(__file__).resolve().parents[2]


def digest(stream):
    result = hashlib.sha256()
    while block := stream.read(1024 * 1024):
        result.update(block)
    return result.hexdigest()


def visible_files(task):
    prefix = f'.codex/work-items/{task}/'
    raw = subprocess.check_output(
        ['git', 'ls-files', '--cached', '--others', '--exclude-standard', '-z', '--', prefix], cwd=ROOT)
    files = sorted(set(p.decode('utf8') for p in raw.split(b'\0') if p))
    if not files:
        raise ValueError('No Git-visible task inputs')
    for name in files:
        source = ROOT / name
        source.resolve(strict=True).relative_to((ROOT / prefix).resolve(strict=True))
        if source.is_symlink() or not source.is_file():
            raise ValueError(f'Not a regular task file: {name}')
    return files


def archive(task, output):
    if not re.fullmatch(r'[a-z0-9][a-z0-9-]+', task):
        raise ValueError('Expected one task directory name')
    output = (ROOT / output).resolve()
    output.relative_to((ROOT / 'output').resolve())
    if output.suffixes[-2:] != ['.tar', '.gz']:
        raise ValueError('Expected output/*.tar.gz')
    partial = output.with_name(output.name + '.partial')
    receipt = output.with_name(output.name + '.receipt.json')
    if any(p.exists() for p in (output, partial, receipt)):
        raise FileExistsError('Existing archive/partial/receipt retained; inspect before a new run')
    output.parent.mkdir(parents=True, exist_ok=True)
    files = visible_files(task)
    expected = set(files)
    print(json.dumps({'stage': 'archive', 'files': len(files)}), flush=True)
    with partial.open('xb') as target:
        with tarfile.open(fileobj=target, mode='w:gz', compresslevel=6, dereference=True) as bundle:
            for name in files:
                info = bundle.gettarinfo(str(ROOT / name), arcname=name)
                if not info.isfile():
                    raise ValueError(f'Non-regular archive member: {name}')
                with (ROOT / name).open('rb') as source:
                    bundle.addfile(info, source)
    print(json.dumps({'stage': 'verify', 'files': len(files)}), flush=True)
    seen = set()
    raw_bytes = 0
    unique = {}
    with tarfile.open(partial, 'r|gz') as bundle:
        for member in bundle:
            if not member.isfile() or member.name not in expected or member.name in seen:
                raise ValueError('Unexpected or duplicate archive member')
            seen.add(member.name)
            with bundle.extractfile(member) as encoded:
                archived_hash = digest(encoded)
            with (ROOT / member.name).open('rb') as source:
                if digest(source) != archived_hash:
                    raise ValueError(f'Source changed / archive mismatch: {member.name}')
            if (ROOT / member.name).stat().st_size != member.size:
                raise ValueError(f'Size changed: {member.name}')
            raw_bytes += member.size
            unique[archived_hash] = member.size
    if seen != expected or visible_files(task) != files:
        raise ValueError('Task inventory changed during archive')
    with partial.open('rb') as source:
        archive_hash = digest(source)
    partial.rename(output)
    result = {'status': 'ALL_ARCHIVE_MEMBERS_EQUAL_CURRENT_SOURCE', 'task': task,
              'archive': output.relative_to(ROOT).as_posix(), 'sha256': archive_hash,
              'archiveBytes': output.stat().st_size, 'files': len(files), 'rawBytes': raw_bytes,
              'uniqueContentFiles': len(unique), 'uniqueContentBytes': sum(unique.values()),
              'sourceFilesChanged': 0, 'deleted': 0, 'offHostBackup': False,
              'restore': 'Verify archive SHA256, then use tar -xzf <archive> -C <empty-recovery-directory>; do not overwrite live work.'}
    with receipt.open('x', encoding='utf8') as target:
        json.dump(result, target, indent=2)
        target.write('\n')
    print(json.dumps(result), flush=True)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--task', required=True)
    parser.add_argument('--output', required=True)
    args = parser.parse_args()
    archive(args.task, args.output)
