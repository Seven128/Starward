import http from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve('docs/design-resources/wechat-miniapp');
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.js':'text/javascript; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.json':'application/json'};
http.createServer(async(req,res)=>{try{const url=new URL(req.url,'http://localhost');const file=path.resolve(root,'.'+decodeURIComponent(url.pathname).replace(/^\/docs\/design-resources\/wechat-miniapp(?=\/)/,''));if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}let dest=file;if((await stat(dest)).isDirectory())dest=path.join(dest,'index.html');const data=await readFile(dest);res.writeHead(200,{'Content-Type':types[path.extname(dest)]||'application/octet-stream','Cache-Control':'no-store'}).end(data);}catch{res.writeHead(404).end('Not found');}}).listen(4178,'127.0.0.1',()=>console.log('Design preview http://127.0.0.1:4178/shared/astronomical-event-modal/review.html'));
