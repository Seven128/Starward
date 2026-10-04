import fs from 'node:fs/promises';
import {createRequire} from 'node:module';
const code=await fs.readFile('apps/wechat-miniapp/src/features/sky/sky-gpu-renderer.ts','utf8');
const shader=name=>code.match(new RegExp('const '+name+' = `([\\s\\S]*?)`;'))[1];
const vertex=shader('pointVertex').replace('${position}',shader('position')),fragment=shader('pointFragment');
const {chromium}=createRequire(import.meta.url)('C:/Users/777/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader']});
try{
 const page=await browser.newPage();await page.setContent('<canvas></canvas>');
 const result=await page.evaluate(({vertex,fragment})=>{
  const gl=document.querySelector('canvas').getContext('webgl'),program=gl.createProgram(),stages=[];
  for(const [name,source,type]of [['vertex',vertex,gl.VERTEX_SHADER],['fragment',fragment,gl.FRAGMENT_SHADER]]){
   const shader=gl.createShader(type);gl.shaderSource(shader,source);gl.compileShader(shader);
   stages.push({name,compiled:gl.getShaderParameter(shader,gl.COMPILE_STATUS),log:gl.getShaderInfoLog(shader)});gl.attachShader(program,shader);
  }
  gl.linkProgram(program);return{stages,linked:gl.getProgramParameter(program,gl.LINK_STATUS),log:gl.getProgramInfoLog(program)};
 },{vertex,fragment});console.log(JSON.stringify(result));
}finally{await browser.close();}
