const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const playwright = require('C:/Users/777/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root = path.resolve(__dirname, '../../..');
const source = fs.readFileSync(path.join(root, 'apps/wechat-miniapp/src/features/sky/sky-gpu-renderer.ts'), 'utf8');
function shader(name, parts = {}) {
  const match = source.match(new RegExp('const ' + name + ' = `([\\s\\S]*?)`;'));
  assert.ok(match, name);
  return match[1].replace(/\$\{(\w+)\}/g, (_, key) => {
    assert.ok(key in parts, key); return parts[key];
  });
}
const vertex = shader('artworkVertex', { position: shader('position') });
const fragment = shader('sunFragment', { skyRay: shader('skyRay') });
const label = process.argv[2];
assert.ok(['before', 'after'].includes(label));
const output = path.join(root, 'artifacts/miniapp/cloud-sky-native/solar-limb-0928');
fs.mkdirSync(output, { recursive: true });
(async () => {
  const browser = await playwright.chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader'] });
  try {
    const page = await browser.newPage({ viewport: { width: 512, height: 512 } });
    await page.setContent('<style>body{margin:0;background:#000}</style><canvas width="512" height="512"></canvas>');
    const result = await page.evaluate(({ vertex, fragment }) => {
      const gl = document.querySelector('canvas').getContext('webgl', { preserveDrawingBuffer: true, antialias: false });
      if (!gl) throw Error('webgl_unavailable');
      function compile(type, code) {
        const shader = gl.createShader(type); gl.shaderSource(shader, code); gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw Error(gl.getShaderInfoLog(shader));
        return shader;
      }
      const program = gl.createProgram();
      gl.attachShader(program, compile(gl.VERTEX_SHADER, vertex));
      gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragment)); gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw Error(gl.getProgramInfoLog(program));
      gl.useProgram(program);
      const buffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0,0,512,0,0,512,0,512,512,0,512,512]), gl.STATIC_DRAW);
      const attribute = gl.getAttribLocation(program, 'a_position'); gl.enableVertexAttribArray(attribute);
      gl.vertexAttribPointer(attribute, 2, gl.FLOAT, false, 0, 0);
      function uniform(name, values) {
        const location = gl.getUniformLocation(program, name);
        if (values.length === 1) gl.uniform1f(location, values[0]);
        if (values.length === 2) gl.uniform2fv(location, values);
        if (values.length === 3) gl.uniform3fv(location, values);
      }
      uniform('u_resolution', [512,512]); uniform('u_center', [256.5,256.5]); uniform('u_scale', [1000]);
      uniform('u_right', [1,0,0]); uniform('u_up', [0,1,0]); uniform('u_forward', [0,0,1]);
      uniform('u_discCenter', [256.5,256.5]); uniform('u_discRadius', [200]);
      gl.viewport(0,0,512,512);
      function draw(tint) {
        uniform('u_tint', tint); gl.clearColor(0,0,0,0); gl.clear(gl.COLOR_BUFFER_BIT);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
      }
      function pixel(x,y) { const rgba = new Uint8Array(4); gl.readPixels(x,511-y,1,1,gl.RGBA,gl.UNSIGNED_BYTE,rgba); return [...rgba]; }
      // Independent published NL coefficients: Hestroffer & Magnan 1998, Table 1,
      // 579.88 nm as stated in its text and Table 2 (Table 1's header has a typo).
      const coefficients = [.28392,1.36896,-1.75998,2.22154,-1.56074,.44630];
      const samples = [];
      for (const tint of [[1,1,1],[1,.24,.18]]) {
        draw(tint);
        for (const offset of [0,60,120,160,180,195]) {
          const mu = Math.sqrt(1-(offset/200)**2);
          const intensity = coefficients.reduce((sum,a,k) => sum+a*mu**k, 0);
          const actual = pixel(256+offset,256);
          const expected = tint.map(value => Math.round(255*value*intensity));
          samples.push({ tint, offset, mu, actual, expected,
            error: Math.max(...expected.map((value,index) => Math.abs(value-actual[index]))) });
        }
      }
      draw([1,1,1]);
      const outside = pixel(457,256);
      uniform('u_up', [0,0,1]); uniform('u_forward', [0,1,0]); draw([1,1,1]);
      const underground = pixel(256,300), above = pixel(256,200);
      const clipping = outside[3] === 0 && underground[3] === 0 && above[3] > 0;
      uniform('u_up', [0,1,0]); uniform('u_forward', [0,0,1]); draw([1,1,1]);
      return { ok: gl.getError() === gl.NO_ERROR && clipping && samples.every(s => s.error <= 1),
        evidenceScope: 'Chromium WebGL1 shader pixels; not WEAPP or photometry', samples, clipping };
    }, { vertex, fragment });
    await page.screenshot({ path: path.join(output, label+'.png') });
    fs.writeFileSync(path.join(output, label+'.json'), JSON.stringify(result, null, 2)+'\n');
    console.log(JSON.stringify(result));
    if (!result.ok) process.exitCode = 1;
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
