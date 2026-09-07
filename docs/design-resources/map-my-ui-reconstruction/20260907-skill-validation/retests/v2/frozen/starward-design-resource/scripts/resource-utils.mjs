import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { inflateSync } from 'node:zlib';

export const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
export const readJson = async file => JSON.parse(await fs.readFile(file, 'utf8'));
export const isInside = (root, target) => {
  const relative = path.relative(root, target);
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
};
export async function contained(root, relative, { mustExist = true } = {}) {
  if (typeof relative !== 'string' || !relative || path.isAbsolute(relative) || /^[a-z]:|^[\\/]|[\x00-\x1f]/i.test(relative)) throw Error('invalid relative path');
  const base = await fs.realpath(root);
  const target = path.resolve(base, relative);
  if (!isInside(base, target)) throw Error('path escapes root');
  let ancestor = target;
  while (true) {
    try {
      if (!isInside(base, await fs.realpath(ancestor))) throw Error('symlink escapes root');
      break;
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      if (mustExist || ancestor === base) throw error;
      ancestor = path.dirname(ancestor);
    }
  }
  return target;
}
export async function checkedFile(root, reference) {
  if (!reference || !/^[a-f0-9]{64}$/.test(reference.sha256 ?? '')) throw Error('missing SHA-256');
  const file = await contained(root, reference.path);
  const bytes = await fs.readFile(file);
  if (!bytes.length) throw Error('empty file');
  if (hash(bytes) !== reference.sha256) throw Error('hash mismatch');
  return bytes;
}

// Return locations only: never echo a detected credential value.
export function secretIssues(value) {
  const issues = [];
  const visit = (item, at) => {
    if (Array.isArray(item)) return item.forEach((v, i) => visit(v, `${at}[${i}]`));
    if (item && typeof item === 'object') return Object.entries(item).forEach(([key, v]) => {
      if (/^(?:access[_-]?token|refresh[_-]?token|api[_-]?key|authorization|cookie|password|secret|private[_-]?key)$/i.test(key) && v) issues.push(`secret field at ${at}`);
      visit(v, `${at}.${key}`);
    });
    if (typeof item === 'string' && /(?:\bfigd_[a-zA-Z0-9_-]{12,}|\bsk-[a-zA-Z0-9_-]{20,}|Bearer\s+[a-zA-Z0-9_.-]{12,}|-----BEGIN (?:RSA |EC )?PRIVATE KEY-----|(?:password|access_token|api_key|cookie)\s*[=:]\s*["']?[a-zA-Z0-9_./+\-=]{12,})/i.test(item)) issues.push(`credential-like value at ${at}`);
  };
  visit(value, '$');
  return [...new Set(issues)];
}
export function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let n = 0; n < 8; n++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
// Fully inflate and unfilter standard non-interlaced 8-bit PNG exports.
// Reject unsupported encodings explicitly instead of declaring them decodable.
export function decodePng(bytes) {
  if (!bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) throw Error('invalid PNG signature');
  let offset = 8, width, height, channels, ended = false;
  const data = [];
  while (offset < bytes.length) {
    if (offset + 12 > bytes.length) throw Error('truncated PNG');
    const length = bytes.readUInt32BE(offset), end = offset + 12 + length;
    if (end > bytes.length) throw Error('truncated PNG chunk');
    const kind = bytes.toString('ascii', offset + 4, offset + 8);
    const body = bytes.subarray(offset + 8, end - 4);
    if (crc32(bytes.subarray(offset + 4, end - 4)) !== bytes.readUInt32BE(end - 4)) throw Error('PNG CRC mismatch');
    if (offset === 8 && kind !== 'IHDR') throw Error('missing IHDR');
    if (kind === 'IHDR') {
      if (width || length !== 13) throw Error('invalid IHDR');
      width = body.readUInt32BE(0); height = body.readUInt32BE(4);
      channels = {0:1,2:3,4:2,6:4}[body[9]];
      if (!width || !height || width * height > 40_000_000 || body[8] !== 8 || !channels || body[10] || body[11] || body[12]) throw Error('unsupported PNG encoding/dimensions');
    } else if (kind === 'IDAT') data.push(body);
    else if (kind === 'IEND') { if (length) throw Error('invalid IEND'); ended = true; offset = end; break; }
    offset = end;
  }
  if (!ended || offset !== bytes.length || !data.length) throw Error('incomplete PNG');
  const stride = width * channels;
  const raw = inflateSync(Buffer.concat(data), { maxOutputLength: (stride + 1) * height });
  if (raw.length !== (stride + 1) * height) throw Error('PNG scanline length mismatch');
  const pixels = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    if (filter > 4) throw Error('invalid PNG filter');
    for (let x = 0; x < stride; x++) {
      const pos = y * stride + x, a = x >= channels ? pixels[pos-channels] : 0, b = y ? pixels[pos-stride] : 0, c = y && x >= channels ? pixels[pos-stride-channels] : 0;
      const p = a + b - c, pa = Math.abs(p-a), pb = Math.abs(p-b), pc = Math.abs(p-c);
      const predictor = [0,a,b,Math.floor((a+b)/2),pa <= pb && pa <= pc ? a : pb <= pc ? b : c][filter];
      pixels[pos] = (raw[y * (stride+1) + x + 1] + predictor) & 255;
    }
  }
  return { width, height, pixels, channels };
}
export function flatten(root) {
  const result = [];
  const intersect=(a,b)=>({left:Math.max(a.left,b.left),top:Math.max(a.top,b.top),right:Math.min(a.right,b.right),bottom:Math.min(a.bottom,b.bottom)});
  function visit(node, visible = true, x=0, y=0, clip=null, isRoot=false) {
    x+=isRoot?0:(node.x??0); y+=isRoot?0:(node.y??0);
    const box={left:x,top:y,right:x+node.width,bottom:y+node.height};
    const shown=clip?intersect(box,clip):box;
    const area=Math.max(0,shown.right-shown.left)*Math.max(0,shown.bottom-shown.top);
    const visibleFraction=node.width*node.height>0?area/(node.width*node.height):0;
    const effectiveVisible = visible && node.visible !== false && node.opacity !== 0 && visibleFraction>0;
    result.push({ ...node, effectiveVisible, visibleFraction });
    const childClip=isRoot||node.clipsContent?(clip?intersect(box,clip):box):clip;
    for (const child of node.children ?? []) visit(child, visible && node.visible!==false && node.opacity!==0, x,y,childClip);
  }
  visit(root,true,0,0,null,true);
  return result;
}
