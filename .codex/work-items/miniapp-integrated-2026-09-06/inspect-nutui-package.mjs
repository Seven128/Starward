import { readFile, writeFile, stat } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve('artifacts/miniapp/nutui-spike/package');
const pkg = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
const relative = file => path.relative(root, file).replaceAll('\\', '/');
async function resolveLocal(from, specifier) {
  const base = path.resolve(path.dirname(from), specifier);
  for (const candidate of [base, `${base}.js`, path.join(base, 'index.js')]) {
    if (!candidate.startsWith(root + path.sep)) throw new Error('outside package');
    try { if ((await stat(candidate)).isFile()) return candidate; } catch {}
  }
  throw new Error(`unresolved ${relative(from)} -> ${specifier}`);
}

const result = { package: pkg.name, version: pkg.version, license: pkg.license,
  peerDependencies: pkg.peerDependencies, declaredDependencies: pkg.dependencies, controls: [] };
for (const [control, entries] of [
  ['DatePicker', ['datepicker']],
  ['Form + FormItem + Input', ['form', 'formitem', 'input']],
]) {
  const queue = entries.map(name => [path.join(root, `dist/es/packages/${name}/index.js`)]);
  const visited = new Set(), external = new Map();
  while (queue.length) {
    const chain = queue.shift(), file = chain.at(-1);
    if (visited.has(file)) continue;
    visited.add(file);
    const source = await readFile(file, 'utf8');
    for (const match of source.matchAll(/(?:\bfrom\s*|\bimport\s*)["']([^"']+)["']/g)) {
      const specifier = match[1];
      if (specifier.startsWith('.')) queue.push([...chain, await resolveLocal(file, specifier)]);
      else if (!external.has(specifier)) external.set(specifier, [...chain.map(relative), specifier]);
    }
  }
  result.controls.push({ control, localModules: visited.size,
    externalImports: [...external.keys()].sort(),
    iconImportPaths: [...external].filter(([name]) => name.includes('icons-react')).map(([, chain]) => chain) });
}
await writeFile('artifacts/miniapp/nutui-spike/dependency-inspection.json', JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result.controls, null, 2));
