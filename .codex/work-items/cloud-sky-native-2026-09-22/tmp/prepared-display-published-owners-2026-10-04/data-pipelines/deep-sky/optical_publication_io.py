"""Byte-bound offline optical publication inputs, independent of source adapters.

Streaming identities, exact bounded decoder buffers and caller-pinned receipts
belong to all optical writers; importing them never loads AVM/FITS adapters.
"""
from pathlib import Path
import hashlib,json,re,sys,io,math

def bound_file(path: Path, *, root: Path, expected: dict | None = None, max_bytes: int | None = None) -> dict:
    path, root = path.resolve(), root.resolve()
    if not path.is_relative_to(root) and path != Path(sys.executable).resolve():
        raise RuntimeError("prepared_optical_input_outside_root")
    before = path.stat()
    if max_bytes is not None and before.st_size > max_bytes:
        raise RuntimeError("prepared_optical_input_too_large")
    # Runtime inventories include legitimate empty package marker files; their
    # exact empty-content digest is still verified below. Asset admission owns
    # the separate nonempty image/receipt requirement.
    if expected is not None and (type(expected.get("bytes")) is not int or expected["bytes"] < 0 or
            before.st_size != expected["bytes"] or not isinstance(expected.get("sha256"), str) or
            re.fullmatch(r"[a-f0-9]{64}", expected["sha256"]) is None):
        raise RuntimeError("prepared_optical_input_identity_invalid")
    digest = hashlib.sha256()
    read_bytes = 0
    with path.open("rb") as file:
        while block := file.read(1024 * 1024):
            read_bytes += len(block)
            if read_bytes > before.st_size:
                raise RuntimeError("prepared_optical_input_changed")
            digest.update(block)
    after = path.stat()
    result = {"path": path.relative_to(root).as_posix() if path.is_relative_to(root) else path.as_posix(),
              "bytes": after.st_size, "sha256": digest.hexdigest()}
    if read_bytes != before.st_size or (before.st_size, before.st_mtime_ns) != (after.st_size, after.st_mtime_ns) or (
            expected is not None and result["sha256"] != expected["sha256"]):
        raise RuntimeError("prepared_optical_input_changed")
    return result


def bound_bytes(path: Path, *, root: Path, max_bytes: int, expected: dict | None = None) -> tuple[bytes, dict]:
    """Parse only the exact pinned buffer, never a later unbound file read.

    File readback still fences retained inputs. It cannot substitute for hashing
    the buffer used by JSON/NPY/PNG decoders when a file changes and restores.
    """
    identity = bound_file(path, root=root, expected=expected, max_bytes=max_bytes)
    with Path(path).open("rb") as file:
        raw = file.read(max_bytes + 1)
    if len(raw) != identity["bytes"] or hashlib.sha256(raw).hexdigest() != identity["sha256"]:
        raise RuntimeError("prepared_optical_input_changed")
    bound_file(path, root=root, expected=identity, max_bytes=max_bytes)
    return raw, identity


def pinned_json(path: Path, pin: str, *, root: Path) -> tuple[dict, dict]:
    raw, identity = bound_bytes(path, root=root, max_bytes=8 * 1024 * 1024)
    if identity["sha256"] != pin:
        raise RuntimeError("prepared_optical_receipt_pin_invalid")
    value = json.loads(raw)
    if not isinstance(value, dict):
        raise RuntimeError("prepared_optical_receipt_invalid")
    return value, identity


def decode_bound_npy(raw: bytes, *, shape: tuple[int, ...], dtype: str):
    """Validate the caller-owned shape/dtype and exact C payload before loading.

    Domain callers supply actual fixed supported dimensions, not an untrusted
    header's dimensions. Both header and decoder consume the same pinned bytes.
    """
    import numpy as np
    expected=np.dtype(dtype)
    if (not isinstance(shape,tuple) or not shape or any(type(v) is not int or v<=0 for v in shape) or
            expected.hasobject or expected.kind not in 'bifu' or
            math.prod(shape)*expected.itemsize>128*1024*1024):
        raise RuntimeError('optical_publication_array_expectation_invalid')
    header=io.BytesIO(raw);version=np.lib.format.read_magic(header)
    if version==(1,0):actual,fortran,parsed=np.lib.format.read_array_header_1_0(header,max_header_size=16384)
    elif version==(2,0):actual,fortran,parsed=np.lib.format.read_array_header_2_0(header,max_header_size=16384)
    else:raise RuntimeError('optical_publication_array_version_invalid')
    if actual!=shape or fortran or parsed!=expected:
        raise RuntimeError('optical_publication_array_shape_invalid')
    if len(raw)-header.tell()!=math.prod(shape)*expected.itemsize:
        raise RuntimeError('optical_publication_array_payload_invalid')
    value=np.load(io.BytesIO(raw),allow_pickle=False,max_header_size=16384)
    value.setflags(write=False);return value

