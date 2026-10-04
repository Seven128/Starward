"""Measure actual FILE_STANDARD_INFO allocation, not uncompressed file length."""
from pathlib import Path
import ctypes,json
from ctypes import wintypes

ROOT=Path(__file__).resolve().parents[4]
DEST=ROOT/'output/target-psf-response-1003-r3/readback-r2/owned-output-allocation.json'
class FileStandardInfo(ctypes.Structure):
    _fields_=[('AllocationSize',ctypes.c_int64),('EndOfFile',ctypes.c_int64),
              ('NumberOfLinks',wintypes.DWORD),('DeletePending',ctypes.c_ubyte),('Directory',ctypes.c_ubyte)]
create=ctypes.windll.kernel32.CreateFileW
create.argtypes=[wintypes.LPCWSTR,wintypes.DWORD,wintypes.DWORD,ctypes.c_void_p,wintypes.DWORD,wintypes.DWORD,wintypes.HANDLE]
create.restype=wintypes.HANDLE
query=ctypes.windll.kernel32.GetFileInformationByHandleEx
query.argtypes=[wintypes.HANDLE,ctypes.c_int,ctypes.c_void_p,wintypes.DWORD];query.restype=wintypes.BOOL
close=ctypes.windll.kernel32.CloseHandle;close.argtypes=[wintypes.HANDLE];close.restype=wintypes.BOOL
groups=[]
for name in ('target-psf-response-1003-r1','target-psf-response-1003-r2','target-psf-response-1003-r3','target-psf-same-run-control-1003-r1'):
    directory=(ROOT/'output'/name).resolve();assert directory.is_relative_to((ROOT/'output').resolve())
    items=[]
    for p in sorted(directory.rglob('*')):
        if not p.is_file():continue
        handle=create(str(p),0x80,7,None,3,0,None)
        assert handle not in (None,ctypes.c_void_p(-1).value)
        try:
            info=FileStandardInfo();assert query(handle,1,ctypes.byref(info),ctypes.sizeof(info))
            assert info.EndOfFile==p.stat().st_size and not info.Directory
            items.append({'path':p.relative_to(ROOT).as_posix(),'logicalBytes':info.EndOfFile,'windowsAllocatedBytes':info.AllocationSize})
        finally:assert close(handle)
    groups.append({'folder':name,'files':len(items),'logicalBytes':sum(v['logicalBytes'] for v in items),
                   'windowsAllocatedBytes':sum(v['windowsAllocatedBytes'] for v in items),'items':items})
with DEST.open('x',encoding='utf-8') as f:
    json.dump({'api':'GetFileInformationByHandleEx FileStandardInfo.AllocationSize','groups':groups,
               'noCleanup':True,
               'scope':'Four new response/control trees only, includes failed stages and saved readbacks but excludes this new ledger at enumeration time. Windows allocation is not Linux/complete retention/capacity; no cleanup.'},f,indent=2);f.write('\n')
print(json.dumps([{k:v[k] for k in ('folder','files','logicalBytes','windowsAllocatedBytes')} for v in groups]))
