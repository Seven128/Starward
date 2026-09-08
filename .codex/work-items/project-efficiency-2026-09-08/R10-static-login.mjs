import fs from 'node:fs';
const file = fs.openSync('tmp/wechat-devtools-agent-eval/extracted/resources/app.asar', 'r');
try {
  const prefix = Buffer.alloc(16); fs.readSync(file, prefix, 0, 16, 0);
  const length = prefix.readUInt32LE(12), base = 8 + prefix.readUInt32LE(4);
  if (length > 20_000_000) throw Error('unexpected header size');
  const header = Buffer.alloc(length); fs.readSync(file, header, 0, length, 16);
  const tree = JSON.parse(header.toString('utf8'));
  const onlyFile = process.argv.find(arg => arg.startsWith('--file='))?.slice(7);
  const needles = process.argv.slice(2).filter(arg => !arg.startsWith('--file='));
  let matches = 0;
  function* files(entries, prefix = '') {
    for (const [name, entry] of Object.entries(entries)) {
      if (entry.files) yield* files(entry.files, `${prefix}${name}/`);
      else yield [`${prefix}${name}`, entry];
    }
  }
  for (const [name, entry] of files(tree.files.js.files)) {
    if (onlyFile && name !== onlyFile) continue;
    if (!name.endsWith('.js') || entry.size > 15_000_000) continue;
    let bytes;
    if (entry.unpacked) bytes = fs.readFileSync(`tmp/wechat-devtools-agent-eval/extracted/resources/app.asar.unpacked/js/${name}`);
    else { bytes = Buffer.alloc(entry.size); fs.readSync(file, bytes, 0, bytes.length, base + Number(entry.offset)); }
    const source = bytes.toString('utf8');
    for (const needle of needles) {
      const at = source.indexOf(needle);
      if (at !== -1) { console.log(JSON.stringify({ file: `js/${name}`, needle, at, excerpt: source.slice(Math.max(0, at - 180), at + 800) })); matches++; }
    }
    if (matches >= 12) break;
  }
} finally { fs.closeSync(file); }
