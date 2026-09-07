import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { readJson, contained } from './resource-utils.mjs';
import { checkResources } from './check-resources.mjs';

export async function buildReview(directory) {
  const check = await checkResources(directory);
  if (!check.ok && !check.reviewable) throw Error(`resources rejected: ${check.errors.join('; ')}`);
  const resources = await readJson(await contained(directory, 'resources.json'));
  const candidates = [...new Set(resources.boards.filter(b => ['map','my'].includes(b.page)).map(b => b.candidateId))].sort();
  if (!candidates.length) throw Error('no paired candidates');
  const keyPath = await contained(directory, 'review-key.json', {mustExist:false});
  let key;
  try { key = await readJson(keyPath); } catch(error) { if (error.code !== 'ENOENT') throw error; key = { schema:1, entries:[] }; }
  if (key.schema !== 1 || !Array.isArray(key.entries)) throw Error('invalid private review key');
  for (const id of candidates) if (!key.entries.some(e => e.candidateId === id)) key.entries.push({candidateId:id, anonymousId:crypto.randomBytes(4).toString('hex')});
  if (new Set(key.entries.map(e=>e.anonymousId)).size !== key.entries.length) throw Error('duplicate anonymous ID');
  await fs.writeFile(keyPath, JSON.stringify(key,null,2)+'\n');
  const site = await contained(directory, 'review-site', {mustExist:false});
  await fs.mkdir(site, {recursive:true});
  const cards = [];
  const escape=s=>String(s??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
  for (const entry of key.entries.filter(e=>candidates.includes(e.candidateId)).sort((a,b)=>a.anonymousId.localeCompare(b.anonymousId))) {
    if (!/^[a-f0-9]{8}$/.test(entry.anonymousId)) throw Error('invalid anonymous ID');
    const states = [];
    for (const stage of ['初稿','最终']) {
      const figures = [];
      for (const page of ['map','my']) {
        const boards = resources.boards.filter(b=>b.candidateId === entry.candidateId && b.page === page && b.mode === 'day' && b.width === 390 && ['medium','normal'].includes(b.state));
        boards.sort((a,b)=>b.round-a.round||(b.technicalAttempt??0)-(a.technicalAttempt??0));
        const board = stage === '初稿' ? boards.find(b=>b.round === 0) : boards[0];
        if (!board) throw Error('missing paired round-0/final core board');
        const name = `${entry.anonymousId}-${stage === '初稿' ? '0' : 'f'}-${page}.png`;
        await fs.copyFile(await contained(directory,board.screenshot.path), await contained(site,name,{mustExist:false}));
        figures.push(`<figure><a href="${name}"><img src="${name}" width="${board.width}" height="${board.height}" alt="${page === 'map' ? '地图' : '我的'}"></a><figcaption>${page === 'map' ? '地图' : '我的'} · ${board.width}×${board.height} 逻辑像素</figcaption></figure>`);
        if(stage==='初稿' && board.technicalAttempt){
          const original=boards.find(b=>b.round===0&&!b.technicalAttempt);
          if(original){const raw=`${entry.anonymousId}-raw-${page}.png`;await fs.copyFile(await contained(directory,original.screenshot.path),await contained(site,raw,{mustExist:false}));figures.push(`<p>同一设计曾发生导出故障。<a href="${raw}">查看首次失败原图</a>；当前初稿图为无设计改动的重新导出。</p>`);}
        }
      }
      states.push(`<details ${stage === '最终' ? 'open' : ''}><summary>${stage}</summary><div class="pair">${figures.join('')}</div></details>`);
    }
    cards.push(`<section><h2>候选 ${entry.anonymousId}</h2>${states.join('')}<p>分别评价：产品正确性；层级、字体图标、密度、一致性、细节（1–5）；个人偏好。</p></section>`);
  }
  const html = `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>地图与我的 · 候选比较</title><style>body{margin:0;padding:24px;background:#f1f2f0;color:#202420;font:16px/1.6 system-ui,sans-serif}header,section{max-width:1100px;margin:0 auto 32px}h1{font-size:24px}h2{font-size:20px}.pair{display:flex;gap:20px;overflow:auto;padding:16px 0}figure{margin:0;flex:none}img{display:block;max-width:none;box-shadow:0 2px 12px #0001}figcaption{font-size:14px}summary{cursor:pointer;padding:12px 0}a:focus-visible,summary:focus-visible{outline:2px solid #4859b8}details{border-top:1px solid #ccc}</style><header><h1>地图与我的 · 候选比较</h1><p>图片为 Figma 导出。并排保留两页；点击图片查看原文件。此处不展示生成分组与自评分。手机端可横向查看完整逻辑尺寸，浏览器缩放不代表产品字号。</p></header>${cards.join('')}</html>`;
  const notices=(resources.notices??[]).map(n=>`<p>${escape(n.text)}${n.href&&/^https:\/\//.test(n.href)?` <a href="${escape(n.href)}">来源与许可</a>`:''}</p>`).join('');
  await fs.writeFile(await contained(site,'index.html',{mustExist:false}),html.replace('</header>',notices+'</header>'));
  return {directory:site,candidateCount:candidates.length,productChecksPassed:check.ok,unresolved:check.errors};
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try { console.log(JSON.stringify(await buildReview(process.argv[2] ?? '.'),null,2)); } catch(error) { console.error(error.message); process.exitCode=1; }
}
