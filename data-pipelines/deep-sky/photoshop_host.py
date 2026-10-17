"""Shared bounded native COM dispatch; app ownership stays with Photoshop.

Never persists raw external/account diagnostics. Timeout retires only our host;
Photoshop completion remains UNKNOWN and existing user documents are untouched.
"""
import json
from pathlib import Path
import subprocess
import time
import psutil


def dispatch_photoshop(config_path,result_path,seconds=240):
    started,peak=time.perf_counter(),0
    process=subprocess.Popen(['pwsh','-NoProfile','-File',str(Path(__file__).with_name('photoshop_batch.ps1')),
        '-ConfigPath',str(config_path),'-ResultPath',str(result_path)],stdout=subprocess.PIPE,stderr=subprocess.STDOUT)
    try:
        while process.poll() is None:
            for app in psutil.process_iter(['name','memory_info']):
                try:
                    if app.info['name'] and app.info['memory_info'] and app.info['name'].lower()=='photoshop.exe':
                        peak=max(peak,app.info['memory_info'].rss)
                except (psutil.NoSuchProcess,psutil.AccessDenied):
                    continue
            if time.perf_counter()-started>seconds:
                process.kill()
                raise TimeoutError('photoshop_host_timeout_application_completion_unverified')
            time.sleep(.1)
        process.communicate()  # Raw account/vendor diagnostics intentionally discarded.
        if process.returncode or not result_path.is_file():
            raise RuntimeError('photoshop_host_failed_vendor_diagnostics_not_logged')
        report=json.loads(result_path.read_text(encoding='utf-8-sig'))
        if report['status']!='EXPORTED_NOT_PIXEL_ACCEPTANCE':
            code=report.get('error','UNKNOWN')
            if not isinstance(code,str) or not (code.startswith('benchmark_') or code=='PHOTOSHOP_API_ERROR'):
                code='UNKNOWN'
            raise RuntimeError('photoshop_operation_failed_'+code)
        return report,{'hostAndApplicationSeconds':time.perf_counter()-started,
            'photoshopPeakWorkingSetBytes':peak,'gpuPeakBytes':'UNKNOWN',
            'memoryMeasurement':'100ms Photoshop process RSS samples; includes app baseline, sampled lower bound'}
    finally:
        if process.poll() is None:
            process.kill()
        process.wait()
        if process.stdout:
            process.stdout.close()
