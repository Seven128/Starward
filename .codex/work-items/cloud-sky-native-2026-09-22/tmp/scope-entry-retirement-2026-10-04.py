from pathlib import Path
root=Path(__file__).resolve().parents[4]
p=root/'.codex/work-items/cloud-sky-native-2026-09-22/scripts/experience-real-taro-entry-journey-2026-10-04.mts'
s=p.read_text(encoding='utf-8-sig')
start=s.index('const marker=await page.evaluate(');end=s.index('const actions:any[]=[];',start)
block=s[start:end].replace('const entry=await wait','entry=await wait')
s=s[:start]+"let entry:any,returned:any;\nif(process.argv[4]!=='proposal-only'){\n"+block+"}\n"+s[end:]
start=s.index('const back=await page.evaluate(');end=s.index("if(process.argv[4]==='integrated'){",start)
block=s[start:end].replace('const returned=await wait','returned=await wait')
s=s[:start]+"if(process.argv[4]!=='proposal-only'){\n"+block+"}\n"+s[end:]
start=s.index('// Explicit synthetic data')
pos=s.rfind("if(process.argv[4]==='integrated'){",0,start)
s=s[:pos]+s[pos:].replace("if(process.argv[4]==='integrated'){","if(['integrated','proposal-only'].includes(process.argv[4])){",1)
old="v.activeRoute==='pages/map/index'&&v.mapButtons.some(n=>n.props['data-control']==='proposal-cloud-stargazing-action')&&v.pendingNativeRequests===0"
assert old in s
s=s.replace(old,"v.activeRoute==='pages/map/index'&&v.map?.markers?.some(m=>m.id>=100000)&&v.pendingNativeRequests===0",1)
anchor="await save('actual-both-entry-navigation.json',"
pos=s.index(anchor)
s=s[:pos]+"await save('proposal-return-panel-result.json',{status:proposalBack.mapButtons.some(n=>n.props['data-control']==='proposal-cloud-stargazing-action')?'PASS':'FAILED_RETAINED',scope:'Original Map hides the pending panel when selectedSpotId is null and page is hidden. No Map business changes. Actual prior Map/coordinates/time return and Sky retirement are checked separately; marker re-opening is not panel preservation.'});"+s[pos:]
s=s.replace('returnedSceneCalls:returned.sceneCalls','returnedSceneCalls:returned?.sceneCalls??final.sceneCalls')
p.write_text(s,encoding='utf8',newline='')
print('Scoped proposal-only task mode; Map panel failure retained, production unchanged.')
