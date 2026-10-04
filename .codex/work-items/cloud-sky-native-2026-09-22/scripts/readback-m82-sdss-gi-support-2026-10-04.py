"""Reuse raw-address reader for new g/i; separately read actual joint support."""
from pathlib import Path
import importlib.util
import json
import sys

ROOT = Path(__file__).resolve().parents[4]
TASK = ROOT/'.codex/work-items/cloud-sky-native-2026-09-22'
GEN = ROOT/'output/sdss-m82-gi-support-1004-r1'
OUT = ROOT/'output/sdss-m82-gi-support-readback-1004-r1'
sys.path.insert(0,str(ROOT/'output/allwise-w3-atlas-0929/python-deps'))
import numpy as np


def main():
    path = TASK/'scripts/readback-m82-sdss-r-footprint-2026-10-04.py'
    spec = importlib.util.spec_from_file_location('existing_full_raw_address_reader',path)
    reader = importlib.util.module_from_spec(spec);spec.loader.exec_module(reader)
    bind = reader.bind
    report = json.loads((GEN/'result.json').read_bytes())
    assert report['acquisitionComplete'] and len(report['fields'])==6 and not OUT.exists()
    pixels = report['targetShape'][0]
    adapter = ROOT/'output/sdss-m82-gi-support-reader-adapter-1004-r1'
    assert not adapter.exists();adapter.mkdir()
    (adapter/'executed-wrapper.py').write_bytes(Path(__file__).read_bytes())
    # Existing direct FITS/address reader accepts one band's support per field.
    # Normalize saved bits only, never synthesize arrays or call reprojection.
    fields=[];union_f=np.zeros((pixels,pixels),dtype=bool);union_a=np.zeros_like(union_f)
    count=np.zeros((pixels,pixels),dtype=np.uint8)
    decoded={};core=slice(pixels//2-32,pixels//2+32)
    for f in report['fields']:
        assert bind(ROOT/f['support']['path'])==f['support']
        field_key=tuple(f['identity'][k] for k in ('run','rerun','camcol','field'))
        with np.load(ROOT/f['support']['path'],allow_pickle=False) as source:
            decoded[field_key]={k:np.unpackbits(source[k],bitorder='little',count=pixels*pixels).reshape(pixels,pixels).astype(bool)
                                for k in source.files}
            for band in ('g','i'):
                record=next(s for s in f['sourceRecords'] if s['band']==band)
                actual_raw={k:record[k] for k in ('path','bytes','sha256')}
                assert bind(ROOT/actual_raw['path'])==actual_raw
                support_path=adapter/f"support-{len(fields):02d}.npz"
                np.savez_compressed(support_path,footprint=source['footprint_'+band],finite_neighbors=source['finite_neighbors_'+band])
                fp=decoded[field_key]['footprint_'+band];valid=decoded[field_key]['finite_neighbors_'+band]
                assert int(valid.sum())==f['perBandFiniteStencilPixels'][band]
                fields.append({'identity':{**f['identity'],'band':band},'state':'R_GEOMETRY_MEASURED_QUALITY_UNKNOWN',
                    'sourceRaw':actual_raw,'support':bind(support_path),'footprintPixels':int(fp.sum()),
                    'finiteStencilPixels':int(valid.sum()),'central64SquareFinitePixels':int(valid[core,core].sum())})
                union_f|=fp;union_a|=valid;count+=valid.astype(np.uint8)
    support_path=adapter/'band-check-union.npz'
    np.savez_compressed(support_path,footprint=np.packbits(union_f,bitorder='little'),finite_neighbors=np.packbits(union_a,bitorder='little'),contributor_count=count)
    normalized={**report,'fields':fields,'unionFootprintPixels':int(union_f.sum()),'unionFiniteStencilPixels':int(union_a.sum()),'unionSupport':bind(support_path),
                'adapterMeaning':'Structural interface for direct raw g/i masks only; OR across bands is not a coadd/scientific support product'}
    (adapter/'result.json').write_text(json.dumps(normalized,indent=2)+'\n',encoding='utf-8')
    reader.GEN=adapter;reader.OUT=OUT;reader.main()
    # New g/i masks were just verified against every original pixel address;
    # r masks are byte-identical to the prior full raw-r reader generation.
    r_result=json.loads((ROOT/report['rResult']['path']).read_bytes());assert bind(ROOT/report['rResult']['path'])==report['rResult']
    r_map={tuple(f['identity'][k] for k in ('run','rerun','camcol','field')):f for f in r_result['fields']}
    unions={b:np.zeros((pixels,pixels),dtype=bool) for b in ('g','r','i')}
    joint_union=np.zeros_like(unions['g']);joint_count=np.zeros((pixels,pixels),dtype=np.uint8)
    for f in report['fields']:
        key=tuple(f['identity'][k] for k in ('run','rerun','camcol','field'));m=decoded[key]
        r_record=r_map[key];assert bind(ROOT/r_record['support']['path'])==r_record['support']
        fp_r,valid_r=reader.masks(ROOT/r_record['support']['path'],pixels)
        assert np.array_equal(m['footprint_r'],fp_r) and np.array_equal(m['finite_neighbors_r'],valid_r)
        joint=m['finite_neighbors_g']&valid_r&m['finite_neighbors_i']
        assert np.array_equal(joint,m['coherent_gri']) and int(joint.sum())==f['coherentGriPixels']
        assert int(joint[core,core].sum())==f['central64SquareCoherentGriPixels']
        for b in unions:unions[b]|=m['finite_neighbors_'+b]
        joint_union|=joint;joint_count+=joint.astype(np.uint8)
    assert bind(ROOT/report['unionSupport']['path'])==report['unionSupport']
    with np.load(ROOT/report['unionSupport']['path'],allow_pickle=False) as saved:
        for b in unions:
            actual=np.unpackbits(saved[b],bitorder='little',count=pixels*pixels).reshape(pixels,pixels).astype(bool)
            assert np.array_equal(actual,unions[b]) and int(actual.sum())==report['perBandFiniteUnionPixels'][b]
        actual_joint=np.unpackbits(saved['coherent_gri'],bitorder='little',count=pixels*pixels).reshape(pixels,pixels).astype(bool)
        assert np.array_equal(actual_joint,joint_union) and np.array_equal(saved['coherent_count'],joint_count)
    result={'scope':'Root new g/i raw full-address verification plus reused byte-exact full-r and actual coherent support, self-review not scientific quality/astrometry acceptance',
        'producer':bind(GEN/'result.json'),'wrapper':bind(Path(__file__)),'reusedRawReader':bind(path),
        'gITargetPositionsChecked':len(fields)*pixels*pixels,'allNewBandMasksExact':True,'originalRSupportExact':True,
        'coherentGriUnionPixels':int(joint_union.sum()),'targetPixels':pixels*pixels,'allActualJointMasksAndCountsExact':True,
        'newNetworkOrSourceEdits':0,'ordinaryAdoption':False,'scientificQuality':'UNVERIFIED','independentReview':'MISSING'}
    (OUT/'shared-support-effects.json').write_text(json.dumps(result,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({'actualBandAndCoherentSupportPassed':True,'gITargetPositionsChecked':result['gITargetPositionsChecked'],
                      'coherentGriUnionPixels':int(joint_union.sum())}))


if __name__=='__main__':main()
