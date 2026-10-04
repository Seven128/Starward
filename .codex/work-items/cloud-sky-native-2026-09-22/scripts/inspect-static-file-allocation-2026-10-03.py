"""Read-only Windows allocation/identity audit of the actual standard export.

Not a retention policy, reclaimability calculation or cloud capacity receipt.
"""
from pathlib import Path
import ctypes
from ctypes import wintypes
import hashlib
import json
import os
ROOT=Path(__file__).resolve().parents[4]
SOURCE=ROOT / 'output/prepared-static-egress-1003-r1/standard-export/publication'
OUT=ROOT / 'output/static-file-allocation-1003-r1'
assert os.name == 'nt'
class StandardInfo(ctypes.Structure):
    _fields_=[('AllocationSize',ctypes.c_longlong),('EndOfFile',ctypes.c_longlong),
      ('NumberOfLinks',wintypes.DWORD),('DeletePending',ctypes.c_ubyte),('Directory',ctypes.c_ubyte)]
class FileIdInfo(ctypes.Structure):
    _fields_=[('VolumeSerialNumber',ctypes.c_ulonglong),('FileId',ctypes.c_ubyte*16)]
kernel=ctypes.WinDLL('kernel32',use_last_error=True)
kernel.CreateFileW.argtypes=[wintypes.LPCWSTR,wintypes.DWORD,wintypes.DWORD,ctypes.c_void_p,
    wintypes.DWORD,wintypes.DWORD,wintypes.HANDLE]
kernel.CreateFileW.restype=wintypes.HANDLE
kernel.GetFileInformationByHandleEx.argtypes=[wintypes.HANDLE,ctypes.c_int,ctypes.c_void_p,wintypes.DWORD]
kernel.GetFileInformationByHandleEx.restype=wintypes.BOOL
kernel.CloseHandle.argtypes=[wintypes.HANDLE];kernel.CloseHandle.restype=wintypes.BOOL
def info(p):
    assert not p.lstat().st_file_attributes & 0x400, 'reparse_point_not_admitted'
    handle=kernel.CreateFileW(str(p),0x80,7,None,3,0x200000,None)
    if handle == ctypes.c_void_p(-1).value: raise ctypes.WinError(ctypes.get_last_error())
    try:
        standard=StandardInfo();identity=FileIdInfo()
        for kind,record in ((1,standard),(18,identity)):
            if not kernel.GetFileInformationByHandleEx(handle,kind,ctypes.byref(record),ctypes.sizeof(record)):
                raise ctypes.WinError(ctypes.get_last_error())
        assert not standard.Directory and not standard.DeletePending
        return {'bytes':standard.EndOfFile,'reportedAllocationBytes':standard.AllocationSize,
          'links':standard.NumberOfLinks,'identity':f'{identity.VolumeSerialNumber:016x}:'+bytes(identity.FileId).hex(),
          'mtimeNs':p.stat().st_mtime_ns}
    finally:
        assert kernel.CloseHandle(handle)
def sha(p):
    h=hashlib.sha256()
    with p.open('rb') as stream:
        while block := stream.read(1024*1024): h.update(block)
    return h.hexdigest()
def scan():
    assert SOURCE.is_dir() and SOURCE.resolve().is_relative_to(ROOT / 'output')
    rows=[]
    for parent,dirs,files in os.walk(SOURCE,followlinks=False):
        for name in dirs:
            assert not (Path(parent)/name).lstat().st_file_attributes & 0x400, 'reparse_directory_not_admitted'
        for name in files:
            p=Path(parent)/name
            rows.append({'file':p.relative_to(SOURCE).as_posix(),**info(p)})
    return sorted(rows,key=lambda row:row['file'])
index_file=SOURCE / 'index.json';index_before=sha(index_file)
index=json.loads(index_file.read_bytes());assert index['publicationHash']=='2fcd028957ff8f1b7d9a9f7d62eed6c1fbe79d8ba1f749a254630eff51db1304'
before=scan();by_path={row['file']:row for row in before}
expected={'files'+record['route']:record for record in index['records']}
assert len(expected)==904 and set(by_path)==set(expected)|{'index.json','image-artifact.json','delivery.caddy'}
for file,record in expected.items():
    assert by_path[file]['bytes']==record['bytes'] and sha(SOURCE / file)==record['sha256']
assert sha(index_file)==index_before and scan()==before
identities={}
for row in before:
    if row['identity'] in identities:
        assert identities[row['identity']]['reportedAllocationBytes']==row['reportedAllocationBytes']
    identities.setdefault(row['identity'],row)
payload=[row for row in before if row['file'] in expected]
metadata=[row for row in before if row['file'] not in expected]
summary=lambda rows:{'paths':len(rows),'logicalBytes':sum(row['bytes'] for row in rows),
  'reportedAllocationBytesByPath':sum(row['reportedAllocationBytes'] for row in rows)}
families={}
for row in payload:families.setdefault(row['file'].split('/')[3],[]).append(row)
OUT.mkdir()
(OUT / 'executed-script.py').write_bytes(Path(__file__).read_bytes())
(OUT / 'file-readback.json').write_text(json.dumps(before,indent=2)+'\n')
result={'status':'ACTUAL_LOCAL_FILE_ALLOCATION_MEASURED_NOT_CLOUD_RETENTION_OR_CAPACITY',
 'source':str(SOURCE.relative_to(ROOT)),'publicationHash':index['publicationHash'],
 'indexSha256':index_before,'scanStableBeforeAfter':True,'all904PayloadHashesMatch':True,
 'method':'GetFileInformationByHandleEx FileStandardInfo AllocationSize and FileIdInfo; read attributes only, handles always closed.',
 'payload':summary(payload),'metadata':summary(metadata),'total':summary(before),
 'distinctFileIdentities':len(identities),'reportedAllocationBytesByUniqueFileIdentity':sum(row['reportedAllocationBytes'] for row in identities.values()),
 'maximumLinkCount':max(row['links'] for row in before),
 'families':[{ 'family':family,**summary(rows)} for family,rows in sorted(families.items())],
 'scope':'One existing Windows local export, no new copy/processing/HTTP/release/store mutation/deletion. AllocationSize excludes filesystem metadata/alternate streams/snapshots/shared-storage internals and is not exclusive physical device usage. SHA deduplication does not imply shared file allocation; real mount/receipt/rollback/backup refs and whole-host OCI/DB/log/raw sources remain unverified. No 180GB Linux headroom or cloud capacity claim.'}
(OUT / 'result.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps({'result':{'path':str((OUT / 'result.json').relative_to(ROOT)),
 'bytes':(OUT / 'result.json').stat().st_size,'sha256':sha(OUT / 'result.json')},
 'total':result['total'],'distinctFileIdentities':len(identities),'maximumLinkCount':result['maximumLinkCount']}))
