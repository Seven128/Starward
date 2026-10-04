const fs = require('node:fs'), path = require('node:path');
const { chromium } = require('C:/Users/777/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root = path.resolve(__dirname, '../../..');
const source = process.argv[2] ? path.resolve(process.argv[2]) : path.join(root, 'workers/miniapp-api/assets/moon/clementine-uv750-v2-wms-2048x1024.jpg');
(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    const result = await page.evaluate(async url => {
      const image = new Image(); image.src = url; await image.decode();
      const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height;
      const ctx = canvas.getContext('2d'); ctx.drawImage(image, 0, 0);
      const pixels = ctx.getImageData(0, 0, image.width, image.height).data;
      const alphaHistogram = {};
      for(let i=3;i<pixels.length;i+=4) alphaHistogram[pixels[i]]=(alphaHistogram[pixels[i]]||0)+1;
      return { width: image.width, height: image.height, alphaHistogram, samples: [[866,492],[1038,461],[1183,646],[1883,682]].flatMap(([x,y]) =>
        [x,x+15].map(px => {
          const values=[];
          for(let dy=-1;dy<=1;dy++) for(let dx=-1;dx<=1;dx++) values.push(pixels[((y+dy)*image.width+px+dx)*4]);
          return {x:px,y,role:px===x?'observed_black_patch':'adjacent_control',center:pixels[(y*image.width+px)*4],alpha:pixels[(y*image.width+px)*4+3],
            min:Math.min(...values),max:Math.max(...values),mean:values.reduce((a,b)=>a+b,0)/values.length};
        })) };
    }, 'data:image/' + (source.endsWith('.png')?'png':'jpeg') + ';base64,' + fs.readFileSync(source).toString('base64'));
    console.log(JSON.stringify(result,null,2));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode=1; });
