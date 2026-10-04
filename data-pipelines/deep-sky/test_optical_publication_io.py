"""Actual common IO decoder-buffer pin fence and affected Prepared consumer."""
from pathlib import Path
import hashlib,tempfile,unittest,io
from unittest.mock import patch
import optical_publication_io as owner

class OpticalPublicationIoTest(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory(prefix='starward-publication-io-');self.addCleanup(self.temp.cleanup)
        self.root=Path(self.temp.name);self.path=self.root/'receipt.json';self.old=b'{"credit":"original reviewed credit"}\n'
        self.forged=b'{"credit":"unreviewed forged credit"}\n';self.assertEqual(len(self.old),len(self.forged))
        self.path.write_bytes(self.old);self.pin=hashlib.sha256(self.old).hexdigest()

    def test_shared_prepared_decoder_functions_are_exact_same_owner(self):
        import publish_prepared_optical as prepared
        for name in ('bound_file','bound_bytes','pinned_json','decode_bound_npy'):self.assertIs(getattr(prepared,name),getattr(owner,name))
        parsed,identity=prepared.pinned_json(self.path,self.pin,root=self.root)
        self.assertEqual(parsed,{'credit':'original reviewed credit'});self.assertEqual(identity['sha256'],self.pin)
        with self.assertRaisesRegex(RuntimeError,'too_large'):owner.bound_bytes(self.path,root=self.root,max_bytes=1)
        with self.assertRaisesRegex(RuntimeError,'outside_root'):owner.bound_file(self.path,root=self.root/'unrelated')

    def run_race(self,unsafe=False):
        self.path.write_bytes(self.old);real_open=Path.open;reads=[];outer=self
        class Restore:
            def __init__(self,f):self.f=f
            def __enter__(self):return self.f
            def __exit__(self,*args):self.f.close();outer.path.write_bytes(outer.old)
        def controlled_open(path,mode='r',*args,**kwargs):
            if path.resolve()==self.path.resolve() and mode=='rb':
                reads.append(1)
                if len(reads)==2:
                    self.path.write_bytes(self.forged);return Restore(real_open(path,mode,*args,**kwargs))
            return real_open(path,mode,*args,**kwargs)
        def unfenced(path,*,root,max_bytes,expected=None):
            identity=owner.bound_file(path,root=root,expected=expected,max_bytes=max_bytes)
            with Path(path).open('rb') as f:raw=f.read(max_bytes+1)
            owner.bound_file(path,root=root,expected=identity,max_bytes=max_bytes)
            return raw,identity
        def run():
            with patch.object(Path,'open',controlled_open):return owner.pinned_json(self.path,self.pin,root=self.root)
        if unsafe:
            with patch.object(owner,'bound_bytes',unfenced):result=run()
        else:result=run()
        self.assertGreaterEqual(len(reads),2);return result

    def test_same_size_swap_restored_on_disk_cannot_escape_actual_parse_buffer_pin(self):
        with self.assertRaisesRegex(RuntimeError,'input_changed'):self.run_race()
        self.assertEqual(self.path.read_bytes(),self.old)
        parsed,identity=self.run_race(unsafe=True)
        self.assertEqual(parsed,{'credit':'unreviewed forged credit'})
        self.assertEqual(identity['sha256'],self.pin);self.assertEqual(self.path.read_bytes(),self.old)

    def test_header_and_exact_payload_admit_signed_unknowns_before_any_allocation(self):
        import numpy as np
        expected=np.array([[-7,0],[np.nan,.25]],dtype='<f4');b=io.BytesIO();np.save(b,expected,allow_pickle=False)
        actual=owner.decode_bound_npy(b.getvalue(),shape=(2,2),dtype='<f4')
        np.testing.assert_array_equal(actual,expected);self.assertFalse(actual.flags.writeable)
        for shape,dtype,fortran,trailing in (((1000000,1000000),'<f4',False,0),((2,2),'|O',False,0),
                ((2,2),'<f4',True,0),((2,2),'<f4',False,0),((2,2),'<f4',False,17)):
            raw=io.BytesIO();np.lib.format.write_array_header_1_0(raw,{'shape':shape,'descr':dtype,'fortran_order':fortran});raw.write(b'\0'*trailing)
            with patch.object(np,'load',side_effect=AssertionError('malformed header reached allocating decoder')):
                with self.assertRaises(RuntimeError):owner.decode_bound_npy(raw.getvalue(),shape=(2,2),dtype='<f4')

if __name__=='__main__':unittest.main()
