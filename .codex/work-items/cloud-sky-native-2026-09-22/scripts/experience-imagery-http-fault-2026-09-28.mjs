// Loopback-only development transport. All product traffic is streamed to the
// unchanged local BFF; only the exact published SDSS detail JPEG can fail.
// No request URLs, headers, bodies, credentials or observation IDs are logged.
import http from "node:http";
let mode=process.argv[2]??"pass",blocked=0;
if(!["fail","pass"].includes(mode))throw Error("invalid_detail_mode");
const forwarded={OVERVIEW:0,MEDIUM:0,DETAIL:0};
const server=http.createServer((request,response)=>{
  const send=(status,body)=>{response.writeHead(status,{"Content-Type":"application/json","Cache-Control":"no-store"});response.end(JSON.stringify(body));};
  if(request.url==="/__sky_test/status"&&request.method==="GET")return send(200,{mode,blocked,forwarded});
  if(request.url==="/__sky_test/detail-mode"&&request.method==="POST") {
    let body="";request.on("data",chunk=>{body+=chunk;if(body.length>1000)request.destroy();});
    request.on("end",()=>{let value;try{value=JSON.parse(body);}catch{return send(400,{error:"invalid_control"});}
      if(!["fail","pass"].includes(value.mode))return send(400,{error:"invalid_mode"});
      mode=value.mode;send(200,{mode,blocked,forwarded});});return;
  }
  const image=request.url?.match(/^\/v2\/sky\/sdss-optical\/[a-f0-9]{64}\/M-51-(overview|medium|detail)\.jpg$/)?.[1];
  if(image==="detail"&&mode==="fail"){blocked++;return send(503,{error:"controlled_detail_unavailable"});}
  if(image)forwarded[image.toUpperCase()]++;
  const upstream=http.request({hostname:"127.0.0.1",port:8787,path:request.url,method:request.method,
    headers:{...request.headers,host:"127.0.0.1:8787"}},received=>{
    response.writeHead(received.statusCode??502,received.headers);received.pipe(response);
  });
  upstream.setTimeout(15000,()=>upstream.destroy());
  upstream.on("error",()=>{if(!response.headersSent)send(502,{error:"local_bff_unavailable"});else response.destroy();});
  request.on("aborted",()=>upstream.destroy());request.pipe(upstream);
});
server.listen(8788,"127.0.0.1",()=>console.log(JSON.stringify({scope:"development_http_fault",port:8788,mode})));
for(const signal of ["SIGINT","SIGTERM"])process.once(signal,()=>server.close(()=>process.exit()));
