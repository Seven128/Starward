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
const imageUrl='data:image/png;base64,'+fs.readFileSync(path.join(root,
  'workers/miniapp-api/assets/jupiter/jupiter-opal-2024c-median-bands-8x512.png')).toString('base64');
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
  u2('u_sunward',[1,0]);u1('u_illuminatedFraction',1);u3('u_tint',[1,1,1]);u1('u_colorMode',1);
  u1('u_polarRatio',66854/71492);u1('u_profile',1);u3('u_fallbackTint',[.84,.76,.65]);
  const texture=gl.createTexture();gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,texture);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,bitmap);
  gl.uniform1i(gl.getUniformLocation(program,'u_image'),0);
  const pixel=(x,y)=>{const out=new Uint8Array(4);gl.readPixels(x,127-y,1,1,gl.RGBA,gl.UNSIGNED_BYTE,out);return [...out];};
  const draw=(observer,right,down)=>{
    u3('u_bodyObserver',observer);u3('u_bodyRight',right);u3('u_bodyDown',down);
    gl.viewport(0,0,128,128);gl.clearColor(0,0,0,1);gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES,0,6);
    return {center:pixel(64,64),north:pixel(64,56),south:pixel(64,72),
      equatorialEdge:pixel(95,64),polarOutside:pixel(64,33)};
  };
  const equator=draw([1,0,0],[0,1,0],[0,0,-1]);
  const northPole=draw([0,0,1],[1,0,0],[0,1,0]);
  const colorDistance=(a,b)=>Math.abs(a[0]-b[0])+Math.abs(a[1]-b[1])+Math.abs(a[2]-b[2]);
  return {ok:gl.getError()===gl.NO_ERROR&&equator.center[3]===255&&
    equator.equatorialEdge[3]>200&&equator.polarOutside[0]===0&&
    colorDistance(equator.north,equator.south)>10&&
    colorDistance(equator.center,northPole.center)>10&&
    colorDistance(northPole.center,[214,194,166])<=3,
    version:gl.getParameter(gl.VERSION),equator,northPole};
}
run().then(value=>{document.getElementById('result').textContent=JSON.stringify(value);})
  .catch(error=>{document.getElementById('result').textContent=JSON.stringify({ok:false,error:String(error)});});
</script>`;
const output=path.join(__dirname,'evidence/jupiter-bands-webgl-probe-2026-09-24.html');
fs.writeFileSync(output,html);
(async()=>{const browser=await playwright.chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader']});
  try{const page=await browser.newPage();await page.goto(pathToFileURL(output).href);
    await page.waitForFunction(()=>document.getElementById('result').textContent!=='running',{timeout:15000});
    const result=JSON.parse(await page.locator('#result').textContent());console.log(JSON.stringify(result));
    if(!result.ok)process.exitCode=1;
  }finally{await browser.close();}})().catch(error=>{console.error(error);process.exitCode=1;});
