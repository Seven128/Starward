import unittest,tempfile,copy
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from server import Repository,BASE,Conflict
class ServiceTests(unittest.TestCase):
 def setUp(self):
  self.temp=tempfile.TemporaryDirectory(); self.repo=Repository(str(Path(self.temp.name)/'state.db'))
 def tearDown(self):self.temp.cleanup()
 def data(self,name='新地点'):
  value=copy.deepcopy(BASE);value['fields']['name']=name;return value
 def test_multiple_drafts_and_reopen(self):
  a=self.repo.write('a','draft',{'data':self.data('甲')});b=self.repo.write('a','draft',{'data':self.data('乙')})
  self.assertNotEqual(a['id'],b['id']);self.assertEqual(len(Repository(self.repo.path).state('a')),2);self.assertEqual(self.repo.state('b'),[])
  updated=self.repo.write('a','draft',{'id':a['id'],'revision':1,'data':self.data('甲二')})
  self.assertEqual(updated['rev'],2);self.assertEqual(len(self.repo.state('a')),2)
  with self.assertRaises(Conflict):self.repo.write('a','draft',{'id':a['id'],'revision':1,'data':self.data()})
  with self.assertRaises(Conflict):self.repo.write('b','draft',{'id':a['id'],'revision':2,'data':self.data()})
 def test_submission_freezes_same_draft(self):
  a=self.repo.write('a','draft',{'data':self.data()});r=self.repo.write('a','new',{'id':a['id'],'revision':1,'data':self.data()})
  self.assertEqual(r['id'],a['id']);self.assertEqual(r['status'],'PENDING')
  with self.assertRaises(Conflict):self.repo.write('a','draft',{'id':r['id'],'revision':2,'data':self.data()})
 def test_feedback_baseline_and_identity(self):
  original=copy.deepcopy(BASE);body={'baseRevision':1,'data':self.data('反馈名称')}
  r=self.repo.write('a','feedback',body);self.assertEqual(r['baseline'],original);self.assertEqual(BASE,original)
  body['data']['fields']['name']='后来又改';self.assertEqual(self.repo.state('a')[0]['payload']['fields']['name'],'反馈名称')
  with self.assertRaises(Conflict):self.repo.write('a','feedback',body)
  self.repo.write('b','feedback',body)
 def test_stale_and_unchanged_feedback(self):
  with self.assertRaises(Conflict):self.repo.write('a','feedback',{'baseRevision':0,'data':self.data()})
  with self.assertRaises(ValueError):self.repo.write('a','feedback',{'baseRevision':1,'data':BASE})
  self.assertEqual(self.repo.state('a'),[])
 def test_racing_feedback(self):
  def submit(_):
   try:self.repo.write('a','feedback',{'baseRevision':1,'data':self.data()});return True
   except Conflict:return False
  with ThreadPoolExecutor(max_workers=2) as pool:self.assertEqual(sorted(pool.map(submit,range(2))),[False,True])
  self.assertEqual(len(self.repo.state('a')),1)
if __name__=='__main__':unittest.main()
