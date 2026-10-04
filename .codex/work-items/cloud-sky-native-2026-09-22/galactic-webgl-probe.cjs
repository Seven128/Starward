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
const vertex=shader('artworkVertex',{position:shader('position')});
const fragment=shader('galacticImageFragment',{skyRay:shader('skyRay')});
const imageUrl='data:image/jpeg;base64,'+fs.readFileSync(path.join(root,
  'workers/miniapp-api/assets/deep-sky/galactic-2mass/2mass-galactic-2048x1024.jpg')).toString('base64');
const html=`<!doctype html><meta charset="utf-8"><canvas id="sky" width="128" height="128"></canvas><pre id="result">running</pre><script>
const vertex=${JSON.stringify(vertex)},fragment=${JSON.stringify(fragment)},imageUrl=${JSON.stringify(imageUrl)};
function compile(gl,type,code){const shader=gl.createShader(type);gl.shaderSource(shader,code);gl.compileShader(shader);
  if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(shader));return shader;}
async function run(){
  const bitmap=new Image();bitmap.src=imageUrl;await bitmap.decode();
  const canvas=document.getElementById('sky'),gl=canvas.getContext('webgl',{preserveDrawingBuffer:true,antialias:false});
  if(!gl)throw Error('WebGL1 unavailable');
  const program=gl.createProgram();gl.attachShader(program,compile(gl,gl.VERTEX_SHADER,vertex));
  gl.attachShader(program,compile(gl,gl.FRAGMENT_SHADER,fragment));gl.linkProgram(program);
  if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));gl.useProgram(program);
  const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
  gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([0,0,128,0,0,128,0,128,128,0,128,128]),gl.STATIC_DRAW);
  const loc=gl.getAttribLocation(program,'a_position');gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);
  function u2(name,value){gl.uniform2fv(gl.getUniformLocation(program,name),value);}
  function u3(name,value){gl.uniform3fv(gl.getUniformLocation(program,name),value);}
  u2('u_resolution',[128,128]);u2('u_center',[64,64]);gl.uniform1f(gl.getUniformLocation(program,'u_scale'),128);
  u3('u_right',[1,0,0]);u3('u_up',[0,1,0]);u3('u_forward',[0,0,1]);
  u3('u_galacticCenter',[0,0,1]);u3('u_galacticPole',[0,1,0]);
  gl.uniform1f(gl.getUniformLocation(program,'u_strength'),1);
  const texture=gl.createTexture();gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,texture);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,bitmap);
  gl.uniform1i(gl.getUniformLocation(program,'u_image'),0);
  gl.viewport(0,0,128,128);gl.clearColor(0,0,0,1);gl.clear(gl.COLOR_BUFFER_BIT);
  gl.enable(gl.BLEND);gl.blendFuncSeparate(gl.SRC_ALPHA,gl.ONE,gl.ZERO,gl.ONE);
  gl.drawArrays(gl.TRIANGLES,0,6);
  const reference=document.createElement('canvas');reference.width=2048;reference.height=1024;
  const ctx=reference.getContext('2d');ctx.drawImage(bitmap,0,0);
  const results=[];
  for(const [x,y] of [[64,64],[64,32],[96,64]]){
    const p=[(x+.5-64)/128,-(y+.5-64)/128];const sq=p[0]*p[0]+p[1]*p[1];
    const ray=[2*p[0]/(1+sq),2*p[1]/(1+sq),(1-sq)/(1+sq)];
    const uv=[.5-Math.atan2(ray[0],ray[2])/(2*Math.PI),.5-Math.asin(ray[1])/Math.PI];
    const expected=[...ctx.getImageData(Math.floor(uv[0]*2048),Math.floor(uv[1]*1024),1,1).data].slice(0,3);
    const actual=new Uint8Array(4);gl.readPixels(x,127-y,1,1,gl.RGBA,gl.UNSIGNED_BYTE,actual);
    results.push({x,y,uv,expected,actual:[...actual],difference:expected.map((value,i)=>Math.abs(actual[i]-Math.round(value*.24)))});
  }
  return {ok:gl.getError()===gl.NO_ERROR&&results.every(p=>p.difference.every(d=>d<=8)),version:gl.getParameter(gl.VERSION),results};
}
run().then(value=>{document.getElementById('result').textContent=JSON.stringify(value);})
  .catch(error=>{document.getElementById('result').textContent=JSON.stringify({ok:false,error:String(error)});});
</script>`;
const output=path.join(__dirname,'evidence/galactic-webgl-probe-2026-09-24.html');
fs.writeFileSync(output,html);
(async()=>{const browser=await playwright.chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader']});
  try{const page=await browser.newPage();await page.goto(pathToFileURL(output).href);
    await page.waitForFunction(()=>document.getElementById('result').textContent!=='running',{timeout:15000});
    const result=JSON.parse(await page.locator('#result').textContent());console.log(JSON.stringify(result));
    if(!result.ok)process.exitCode=1;
  }finally{await browser.close();}})().catch(error=>{console.error(error);process.exitCode=1;});
