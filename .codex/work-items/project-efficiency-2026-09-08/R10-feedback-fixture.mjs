import { readFile, writeFile, realpath } from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import { createInterface } from 'node:readline';
import { main as fixtureOwner } from '../../../tools/miniapp/device-feedback-fixture.mjs';

const record = new URL('R10-feedback-fixture.json', import.meta.url);
const action = process.argv[2];
if (action === 'prepare') {
  let created;
  await fixtureOwner(['create', '--variant', 'A'], { emit: value => { created = value; } });
  const project = await realpath(created.project);
  const configPath = path.join(project, 'project.config.json');
  const config = JSON.parse(await readFile(configPath, 'utf8'));
  config.projectname = 'Starward isolated agent API feedback';
  // Only this disposable local HTTP fixture; never product/acceptance config.
  config.setting.urlCheck = false;
  await writeFile(configPath, JSON.stringify(config, null, 2));
  const page = path.join(project, 'weapp/pages/index/index');
  await writeFile(`${page}.js`, `Page({
    data:{count:0,inputValue:'',network:'not_requested'},
    onTap(){const count=this.data.count+1;this.setData({count});console.info('STARWARD_AGENT_PROBE tap '+count)},
    onInput(event){this.setData({inputValue:event.detail.value});console.info('STARWARD_AGENT_PROBE input')},
    onRequest(){const endpoint=require('../../task-endpoint.js');if(!endpoint){this.setData({network:'server_not_started'});return}
      wx.request({url:endpoint,method:'GET',success:r=>{this.setData({network:r.statusCode===200&&r.data.marker==='STARWARD_AGENT_PROBE'?'received':'unexpected'});console.info('STARWARD_AGENT_PROBE network '+r.statusCode)},
      fail:()=>{this.setData({network:'failed'});console.warn('STARWARD_AGENT_PROBE network_failed')}})}
  });\n`);
  await writeFile(`${page}.wxml`, `<view class="page"><text>ISOLATED AGENT API FEEDBACK</text><button id="probe-tap" bindtap="onTap">Tap once</button><text id="probe-count">{{count}}</text><input id="probe-input" value="{{inputValue}}" bindinput="onInput"/><text id="probe-input-value">{{inputValue}}</text><button id="probe-network" bindtap="onRequest">Local request</button><text id="probe-network-state">{{network}}</text></view>`);
  await writeFile(`${page}.wxss`, '.page{padding:32rpx;display:flex;flex-direction:column;gap:24rpx;color:white}input{background:white;color:black;padding:16rpx}');
  await writeFile(path.join(project, 'weapp/task-endpoint.js'), 'module.exports=null;\n');
  const result = { project, scope: 'isolated_native_agent_tools', prepared: true, runtimeVerified: false,
    expected: { tap: 'count increments exactly once', input: 'rendered echo equals entered fixture text', console: 'STARWARD_AGENT_PROBE only', network: 'one real local request returns marker' },
    conditions: 'local HTTP URL check disabled only in fixture; not product/device/domain acceptance' };
  await writeFile(record, JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result));
} else if (action === 'serve') {
  const { project } = JSON.parse(await readFile(record, 'utf8'));
  if (await realpath(project) !== project) throw Error('fixture redirected');
  const marker = JSON.parse(await readFile(path.join(project, '.starward-device-feedback-fixture.json'), 'utf8'));
  if (path.resolve(marker.directory) !== project) throw Error('fixture marker mismatch');
  const requests = [];
  const server = http.createServer((request, response) => {
    const success = request.method === 'GET' && request.url === '/starward-agent-probe';
    if (requests.length < 20) requests.push({ method: request.method, matchingPath: success, status: success ? 200 : 404 });
    response.writeHead(success ? 200 : 404, {'Content-Type':'application/json'});
    response.end(JSON.stringify({ marker: success ? 'STARWARD_AGENT_PROBE' : 'NOT_FOUND' }));
  });
  await new Promise((resolve, reject) => {server.once('error', reject); server.listen(0, '127.0.0.1', resolve)});
  const endpoint = `http://127.0.0.1:${server.address().port}/starward-agent-probe`;
  await writeFile(path.join(project, 'weapp/task-endpoint.js'), `module.exports=${JSON.stringify(endpoint)};\n`);
  console.log(JSON.stringify({project, endpoint, pid:process.pid, scope:'task_local_http_fixture'}));
  let stopping = false;
  const stop = async () => {
    if(stopping) return; stopping=true;
    await writeFile(new URL('R10-feedback-server-result.json', import.meta.url), JSON.stringify({scope:'actual_local_http_receipts',requests},null,2));
    control.close();
    server.close(); server.closeAllConnections();
  };
  const control = createInterface({ input: process.stdin });
  control.on('line', line => { if (line.trim() === 'stop') void stop(); });
  process.on('SIGINT', stop); process.on('SIGTERM', stop);
  setTimeout(stop, 20*60*1000).unref();
} else throw Error('use prepare or serve');
