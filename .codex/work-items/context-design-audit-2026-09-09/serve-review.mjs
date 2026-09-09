import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const types={'.html':'text/html','.css':'text/css','.js':'text/javascript','.mjs':'text/javascript','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.json':'application/json','.md':'text/plain'};
http.createServer((req,res)=>{let p;try{p=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));}catch{res.writeHead(400).end();return;}if(!p.startsWith(root+path.sep)||!p.includes(path.join('docs','design-resources'))){res.writeHead(403).end();return;}if(fs.existsSync(p)&&fs.statSync(p).isDirectory())p=path.join(p,'index.html');if(!fs.existsSync(p)){res.writeHead(404).end();return;}res.writeHead(200,{'Content-Type':(types[path.extname(p)]||'application/octet-stream')+'; charset=utf-8','Cache-Control':'no-store'});fs.createReadStream(p).pipe(res);}).listen(5329,'127.0.0.1',()=>console.log('Design-only review server http://127.0.0.1:5329'));
