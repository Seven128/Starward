import ctypes
from ctypes import wintypes
import json
from pathlib import Path
import sys
import time

root = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(root / 'data-pipelines/planet-textures'))
from clementine_moon import sha256_file
from publish_clementine_moon import publish

source = root / 'output/moon-source-cache/clementine-v21.tif'
output = Path(__file__).resolve().parent / 'evidence/moon-clementine-v21-coverage-candidate.png'
started = time.monotonic()
digest = sha256_file(source)
result = publish(source, output, digest)

class MemoryCounters(ctypes.Structure):
    _fields_ = [('cb', wintypes.DWORD), ('PageFaultCount', wintypes.DWORD)] + [
        (field, ctypes.c_size_t) for field in ['PeakWorkingSetSize', 'WorkingSetSize',
        'QuotaPeakPagedPoolUsage', 'QuotaPagedPoolUsage', 'QuotaPeakNonPagedPoolUsage',
        'QuotaNonPagedPoolUsage', 'PagefileUsage', 'PeakPagefileUsage']]

memory = MemoryCounters()
memory.cb = ctypes.sizeof(memory)
ctypes.windll.kernel32.GetCurrentProcess.restype = wintypes.HANDLE
ctypes.windll.psapi.GetProcessMemoryInfo.argtypes = [wintypes.HANDLE, ctypes.POINTER(MemoryCounters), wintypes.DWORD]
ok = ctypes.windll.psapi.GetProcessMemoryInfo(ctypes.windll.kernel32.GetCurrentProcess(), ctypes.byref(memory), memory.cb)
result.update({'elapsedSeconds': time.monotonic()-started,
               'processPeakWorkingSetBytes': memory.PeakWorkingSetSize if ok else None})
print(json.dumps(result, indent=2))
