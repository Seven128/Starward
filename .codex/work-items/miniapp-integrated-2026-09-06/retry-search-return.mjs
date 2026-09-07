import automator from 'miniprogram-automator';
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
const p=await automator.connect({wsEndpoint:'ws://127.0.0.1:9421'});
const pause=ms=>new Promise(r=>setTimeout(r,ms));
async function read(){return p.evaluate(()=>{const page=getCurrentPages().at(-1),text=[],inputs=[];function scan(n){if(!n||typeof n!=='object')return;if(typeof n.v==='string')text.push(n.v);if(n.nn==='input')inputs.push(n.value);for(const v of Object.values(n))if(typeof v==='object')scan(v);}scan(page.data);return{route:page.route,text,inputs,calls:globalThis.__searchReturnProbe?.calls??[]};});}
async function tap(){await p.evaluate(()=>{const page=getCurrentPages().at(-1);let sid,parent,root;function scan(n){if(!n||typeof n!=='object')return;if(n.ariaLabel==='返回地图')sid=n.sid;if(n.cl==='spot-search-field')parent=n.sid;if(n.cl?.split(' ').includes('spot-search-page'))root=n.sid;for(const v of Object.values(n))if(typeof v==='object')scan(v);}scan(page.data);if(!sid||!parent||!root)throw Error('return_chain_missing');const target={id:sid,dataset:{sid}},timeStamp=Date.now();for(const current of [sid,parent,root])page.eh({type:'tap',timeStamp,target,currentTarget:{id:current,dataset:{sid:current}},detail:{}});});}
try{await tap();await pause(2000);console.log(JSON.stringify(await read()));}finally{await p.disconnect();}