import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {localParts} from '@starward/miniapp-contracts';
import {calendarDateInTimezone,clockTimeInTimezone} from '../../utils/zoned-date';

const source=ts.createSourceFile('spot-sky-page.tsx',readFileSync(new URL('./spot-sky-page.tsx',import.meta.url),'utf8'),
  ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
const declaration=source.statements.find(statement=>ts.isFunctionDeclaration(statement)&&
  statement.name?.text==='timezoneOffsetLabel') as ts.FunctionDeclaration;
assert.ok(declaration);
const label=vm.runInNewContext(ts.transpileModule(declaration.getText(source)+'\ntimezoneOffsetLabel',
  {compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,{calendarDateInTimezone,clockTimeInTimezone,localParts}) as
  (at:string|null|undefined,timezone:string)=>string;

test('the current public Sky instant keeps UTC+8 across seconds, fractions and midnight',()=>{
  for(const at of ['2026-09-30T13:50:33.000Z','2026-09-30T13:50:29.999Z','2026-09-30T13:50:30.001Z',
    '2026-09-30T13:50:59.999Z','2026-09-30T15:59:59.999Z','2026-09-30T16:00:00.001Z'])
    assert.equal(label(at,'Asia/Shanghai'),'UTC+8',at);
});

test('zone offsets with zero, positive quarter-hours and negative half-hours do not inherit the instant seconds',()=>{
  for(const [timezone,expected] of [['UTC','UTC+0'],['Asia/Kathmandu','UTC+5:45'],['America/St_Johns','UTC−3:30']])
    for(const seconds of ['00.000','33.500','59.999'])assert.equal(label('2026-01-15T12:10:'+seconds+'Z',timezone!),expected);
});

test('the offset uses the exact instant at a daylight-saving transition, not one fixed offset for its date',()=>{
  assert.equal(label('2026-03-08T06:59:59.999Z','America/New_York'),'UTC−5');
  assert.equal(label('2026-03-08T07:00:00.001Z','America/New_York'),'UTC−4');
});

test('missing or unsupported time keeps the existing explicit timezone fallback',()=>{
  assert.equal(label(undefined,'Asia/Shanghai'),'Asia/Shanghai');
  assert.equal(label(null,'Asia/Shanghai'),'Asia/Shanghai');
  assert.equal(label('invalid','Asia/Shanghai'),'Asia/Shanghai');
  assert.equal(label('2026-09-30T13:50:33.000Z','Unrecognized/Zone'),'Unrecognized/Zone');
});

test('the existing bounded phone fallback keeps all admitted modern east-eight zones without Intl parts',()=>{
  const descriptor=Object.getOwnPropertyDescriptor(Intl.DateTimeFormat.prototype,'formatToParts')!;
  try{
    Object.defineProperty(Intl.DateTimeFormat.prototype,'formatToParts',{...descriptor,value:undefined});
    for(const timezone of ['Asia/Shanghai','Asia/Hong_Kong','Asia/Macau'])
      assert.equal(label('2026-09-30T15:59:59.999Z',timezone),'UTC+8');
    assert.equal(label('2026-09-30T13:50:33.000Z','America/New_York'),'America/New_York','unsupported fallback must remain unavailable');
  }finally{Object.defineProperty(Intl.DateTimeFormat.prototype,'formatToParts',descriptor);}
});
