const fs=require('node:fs');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const playwright=require('C:/Users/777/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');

const root=path.resolve(__dirname,'../../..');
const source=fs.readFileSync(path.join(root,'apps/wechat-miniapp/src/features/sky/sky-gpu-renderer.ts'),'utf8');
function shader(name,parts={}){
  const match=source.match(new RegExp('const '+name+' = `([\\s\\S]*?)`;'));
  if(!match)throw new Error('missing shader '+name);
  return match[1].replace(/\$\{(\w+)\}/g,(_,key)=>{
    if(!(key in parts))throw new Error('missing part '+key);
    return parts[key];
  });
}
const vertex=shader('imageVertex',{position:shader('position')});
const fragment=shader('bodyTextureFragment',{skyRay:shader('skyRay')});
const imageUrl='data:image/jpeg;base64,'+fs.readFileSync(path.join(root,
  'workers/miniapp-api/assets/mercury/mercury-messenger-2013-usgs-wms-1024x512.jpg')).toString('base64');
const html=`<!doctype html><meta charset="utf-8"><canvas id="sky" width="128" height="128"></canvas><pre id="result">running</pre><script>
const vertex=${JSON.stringify(vertex)},fragment=${JSON.stringify(fragment)},imageUrl=${JSON.stringify(imageUrl)};
function compile(gl,type,code){const item=gl.createShader(type);gl.shaderSource(item,code);gl.compileShader(item);
  if(!gl.getShaderParameter(item,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(item));return item;}
async function run(){
  const bitmap=new Image();bitmap.src=imageUrl;await bitmap.decode();
  const canvas=document.getElementById('sky'),gl=canvas.getContext('webgl',{preserveDrawingBuffer:true,antialias:false});
  if(!gl)throw Error('WebGL1 unavailable');
  const program=gl.createProgram();gl.attachShader(program,compile(gl,gl.VERTEX_SHADER,vertex));
  gl.attachShader(program,compile(gl,gl.FRAGMENT_SHADER,fragment));gl.linkProgram(program);
  if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));gl.useProgram(program);
  const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
  gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([
    32,32,0,0, 96,32,1,0, 32,96,0,1,
    32,96,0,1, 96,32,1,0, 96,96,1,1]),gl.STATIC_DRAW);
  for(const [name,offset] of [['a_position',0],['a_uv',8]]){
    const loc=gl.getAttribLocation(program,name);gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc,2,gl.FLOAT,false,16,offset);
  }
  function u2(name,value){gl.uniform2fv(gl.getUniformLocation(program,name),value);}
  function u3(name,value){gl.uniform3fv(gl.getUniformLocation(program,name),value);}
  function u1(name,value){gl.uniform1f(gl.getUniformLocation(program,name),value);}
  u2('u_resolution',[128,128]);u2('u_center',[64,64]);u1('u_scale',128);
  u3('u_right',[1,0,0]);u3('u_up',[0,1,0]);u3('u_forward',[0,0,1]);
  u2('u_sunward',[1,0]);u1('u_illuminatedFraction',1);u3('u_tint',[1,1,1]);u1('u_colorMode',0);
  u1('u_polarRatio',1);u1('u_profile',0);u3('u_fallbackTint',[1,1,1]);
  const lon=164.687327*Math.PI/180,lat=3.607425*Math.PI/180;
  const observer=[Math.cos(lat)*Math.cos(lon),Math.cos(lat)*Math.sin(lon),Math.sin(lat)];
  const right=[-Math.sin(lon),Math.cos(lon),0];
  const down=[Math.sin(lat)*Math.cos(lon),Math.sin(lat)*Math.sin(lon),-Math.cos(lat)];
  u3('u_bodyObserver',observer);u3('u_bodyRight',right);u3('u_bodyDown',down);
  const texture=gl.createTexture();gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,texture);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,bitmap);
  gl.uniform1i(gl.getUniformLocation(program,'u_image'),0);
  gl.viewport(0,0,128,128);gl.clearColor(0,0,0,1);gl.clear(gl.COLOR_BUFFER_BIT);
  gl.drawArrays(gl.TRIANGLES,0,6);
  const reference=document.createElement('canvas');reference.width=1024;reference.height=512;
  const ctx=reference.getContext('2d');ctx.drawImage(bitmap,0,0);
  const results=[];
  for(const [x,y] of [[64,64],[76,64],[52,64],[64,52],[64,76]]){
    const p=[(x+.5-64)/32,(y+.5-64)/32],sq=p[0]*p[0]+p[1]*p[1],facing=Math.sqrt(1-sq);
    const body=observer.map((v,i)=>v*facing+right[i]*p[0]+down[i]*p[1]);
    const longitude=Math.atan2(body[1],body[0]),latitude=Math.asin(body[2]);
    const uv=[(longitude+Math.PI)/(2*Math.PI),.5-latitude/Math.PI];
    const sx=uv[0]*1024-.5,sy=uv[1]*512-.5,x0=Math.floor(sx),y0=Math.floor(sy),fx=sx-x0,fy=sy-y0;
    const pix=(a,b)=>ctx.getImageData(Math.max(0,Math.min(1023,a)),Math.max(0,Math.min(511,b)),1,1).data[0]/255;
    const top=pix(x0,y0)*(1-fx)+pix(x0+1,y0)*fx;
    const bottom=pix(x0,y0+1)*(1-fx)+pix(x0+1,y0+1)*fx;
    const albedo=top*(1-fy)+bottom*fy;
    const incidence=facing,daylight=Math.max(0,Math.min(1,(incidence+.012)/.024));
    const smooth=daylight*daylight*(3-2*daylight);
    const brightness=.045+smooth*(.62+.335*Math.max(incidence,0));
    const expected=Math.round(255*Math.min(1,brightness*(.3+1.2*albedo)));
    const actual=new Uint8Array(4);gl.readPixels(x,127-y,1,1,gl.RGBA,gl.UNSIGNED_BYTE,actual);
    results.push({x,y,uv,expected,actual:[...actual],difference:Math.abs(actual[0]-expected)});
  }
  return {ok:gl.getError()===gl.NO_ERROR&&results.every(p=>p.difference<=8),
    version:gl.getParameter(gl.VERSION),results};
}
run().then(value=>{document.getElementById('result').textContent=JSON.stringify(value);})
  .catch(error=>{document.getElementById('result').textContent=JSON.stringify({ok:false,error:String(error)});});
</script>`;
const output=path.join(__dirname,'evidence/mercury-webgl-probe-2026-09-24.html');
fs.writeFileSync(output,html);
(async()=>{const browser=await playwright.chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader']});
  try{const page=await browser.newPage();await page.goto(pathToFileURL(output).href);
    await page.waitForFunction(()=>document.getElementById('result').textContent!=='running',{timeout:15000});
    const result=JSON.parse(await page.locator('#result').textContent());console.log(JSON.stringify(result));
    if(!result.ok)process.exitCode=1;
  }finally{await browser.close();}})().catch(error=>{console.error(error);process.exitCode=1;});
