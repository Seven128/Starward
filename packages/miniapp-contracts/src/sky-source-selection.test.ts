import assert from 'node:assert/strict';
import test from 'node:test';
import {parseSkySourceSelection,skySourceSelectionPath,type SkySourceSelection} from './sky-source-selection.ts';
const a='a'.repeat(64),b='b'.repeat(64);
const selections:SkySourceSelection[]=[{kind:'object',reference:'HR:7001'},
  {kind:'object',reference:'M:51',imagePublicationHash:a,opticalPublicationHash:b},
  {kind:'body',reference:'SOLAR:MOON',publicationHash:a},
  {kind:'prepared',reference:'REGION:lagoon',publicationHash:a},
  {kind:'hips',publicationHash:a,sourceIds:['ps1','other-source']}];
test('each supported source identity round-trips through the real native route format',()=>{
  for(const selected of selections){
    const route=skySourceSelectionPath(selected),query=new URL(route,'https://starward.invalid').searchParams;
    assert.deepEqual(parseSkySourceSelection(Object.fromEntries(query)),selected);
  }
  assert.equal(skySourceSelectionPath(selections[0]!),'/sky/sources/index?reference=HR%3A7001');
});
test('mixed, incomplete and wrong-domain selected parameters never enroll another family',()=>{
  const body={reference:'SOLAR%3AMOON',bodyImagePublicationHash:a};
  for(const field of ['imagePublicationHash','opticalPublicationHash','preparedPublicationHash','hipsPublicationHash','hipsSourceIds'])
    assert.equal(parseSkySourceSelection({...body,[field]:a}),null);
  for(const params of [{reference:'M:51',preparedPublicationHash:a,hipsPublicationHash:b,hipsSourceIds:'ps1'},
    {hipsPublicationHash:a,hipsSourceIds:'ps1',bodyImagePublicationHash:b},
    {reference:'M:51',hipsSourceIds:'ps1'}, {reference:'HR:7001',imagePublicationHash:a},
    {reference:'PLANET:VENUS',bodyImagePublicationHash:a},{reference:'REGION:lagoon',opticalPublicationHash:a},
    {reference:'%',bodyImagePublicationHash:a},{reference:'M:51',imagePublicationHash:''},
    {reference:['M:51']},{hipsPublicationHash:a,hipsSourceIds:'ps1,ps1'},
    {hipsPublicationHash:a,hipsSourceIds:'ps1,../outside'}, {reference:'constructor'}])
    assert.equal(parseSkySourceSelection(params),null,JSON.stringify(params));
  assert.throws(()=>skySourceSelectionPath({kind:'body',reference:'SOLAR:MOON',publicationHash:'bad'}),/selection_invalid/);
});
