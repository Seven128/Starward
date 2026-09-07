// Resource-only technical corrections. The original Stitch exports remain byte-identical.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = path.dirname(fileURLToPath(import.meta.url));
let html = await readFile(path.join(root, 'outputs/repaired-original/code.html'), 'utf8');
const assetManifest = JSON.parse(await readFile(path.join(root, 'assets/source-manifest.json'), 'utf8'));
const image = assetManifest.assets.find(asset => asset.kind === 'image');
if (!image || !html.includes(image.url)) throw new Error('Original map image source changed');
html = html.replace(image.url, '../../assets/stitch-map-reference.jpg');
html = html.replace(' animate-pulse', '');
if (!html.includes('top-[382px]')) throw new Error('Original attribution anchor changed');
html = html.replace('top-[382px]', 'top-[350px]');
html = html.replaceAll('class="text-slate-500 hover:text-slate-700 py-1"', 'class="text-slate-500 hover:text-slate-700 py-1 resource-evidence-action"');
const corrections = `
/* Codex technical corrections; not part of the Stitch original. */
input[readonly] { border: 0; padding: 0; box-shadow: none; outline: none; min-width: 0; }
input[readonly]:focus { border: 0; box-shadow: none; outline: none; }
div:has(> input[readonly]) { min-height: 44px; }
.resource-evidence-action { min-height: 44px; margin-block: -9px; }
`;
html = html.replace('</head>', `<style>${corrections}</style></head>`);
await mkdir(path.join(root, 'outputs/technical-preview'), { recursive: true });
await writeFile(path.join(root, 'outputs/technical-preview/code.html'), html);
