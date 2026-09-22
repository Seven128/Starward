import csv
import json
from pathlib import Path
import tempfile
import unittest
from constellation_geometry import geometric_representative, mapping

class GeometryReplacementTests(unittest.TestCase):
    def test_single_star_preserves_source_and_units(self):
        actual=geometric_representative([[270,45,.123,-.456]])
        for a,b in zip(actual,[270,45,123,-456]):self.assertAlmostEqual(a,b,places=10)
    def test_center_crosses_ra_zero(self):
        r=geometric_representative([[359.999,0,0,0],[.001,0,0,0]])
        self.assertLess(min(r[0],360-r[0]),1e-9)
    def test_center_velocity(self):
        self.assertEqual(geometric_representative([[0,0,1,2],[0,0,3,4]]),[0,0,2000,3000])
    def test_reject_distant_members(self):
        with self.assertRaisesRegex(ValueError,'extent'):geometric_representative([[0,0,0,0],[1,0,0,0]])
    def csv(self,root,file,refs):
        with (root/file).open('w',newline='') as f:
            writer=csv.DictWriter(f,fieldnames=['hip_id','cross_id']);writer.writeheader()
            writer.writerows({'hip_id':'HIP 8832','cross_id':r} for r in refs)
    def test_duplicate_bibliography_is_deduplicated(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp);self.csv(root,'simbad-identifiers.csv',[])
            self.csv(root,'simbad-components.csv',['HR 545','HR 546','HR 545'])
            self.assertEqual(mapping(root,{8832}),{8832:{'members':['HR:545','HR:546'],'relation':'SYSTEM_MEMBERS'}})
    def test_reject_ambiguous_identity(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp);self.csv(root,'simbad-identifiers.csv',['HR 545','HR 546']);self.csv(root,'simbad-components.csv',[])
            with self.assertRaisesRegex(ValueError,'ambiguous'):mapping(root,{8832})
    def test_missing_is_not_nearest_matched(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp)
            for f in ['simbad-identifiers.csv','simbad-components.csv']:self.csv(root,f,[])
            with self.assertRaisesRegex(ValueError,'unresolved'):mapping(root,{42})
    def test_real_publication(self):
        p=json.loads((Path(__file__).resolve().parents[2]/'workers/miniapp-api/assets/constellations/geometry-v2.json').read_text())
        self.assertEqual(len(p['stars']),713);self.assertEqual(p['epochJulianYear'],2000)
        self.assertEqual(p['frame'],'FK5');self.assertEqual(p['license'],'ODbL-1.0')
        self.assertEqual(sum(r[5]=='SYSTEM_MEMBERS' for r in p['stars']),18)
        self.assertEqual(next(r for r in p['stars'] if r[0]==17999)[6],['SAO:76264'])
        self.assertEqual(next(r for r in p['stars'] if r[0]==60718)[6],['HR:4730'])
        self.assertNotIn('hip-713.xml',p['sources'])

if __name__=='__main__':unittest.main()
