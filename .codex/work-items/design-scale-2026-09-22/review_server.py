"""Loopback design review; reuse existing prototype data owner, no production API."""
import importlib.util,os
from pathlib import Path
from http.server import ThreadingHTTPServer
ROOT=Path('E:/Dev/Starward')
os.environ['STARWARD_DESIGN_DB']=str(Path(__file__).with_name('review.sqlite'))
spec=importlib.util.spec_from_file_location('design_service',ROOT/'docs/design-resources/wechat-miniapp/feedback/adopted/spot-feedback/server.py')
service=importlib.util.module_from_spec(spec);spec.loader.exec_module(service)
class Handler(service.Handler):
 def translate_path(self,path):
  path=path.split('?',1)[0].split('#',1)[0]
  if path.split('/')[1:2] and path.split('/')[1] in ['shared','map','my','search','plan','settings','sky','feedback','contributions','events']:
   path='/docs/design-resources/wechat-miniapp'+path
  from urllib.parse import unquote
  target=(ROOT/unquote(path).lstrip('/')).resolve()
  return str(target if target.is_relative_to(ROOT) else ROOT/'404')
ThreadingHTTPServer(('127.0.0.1',4194),Handler).serve_forever()
