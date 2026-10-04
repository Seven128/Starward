param(
  [Parameter(Mandatory)][ValidateSet('inject','capture','restore')][string]$Action,
  [ValidatePattern('^[a-z0-9-]+$')][string]$StagePrefix='composition-canvas-child'
)
$ErrorActionPreference='Stop'
. (Join-Path $PSScriptRoot 'experience-current-native-helpers-2026-10-01.ps1')
$probeId='sky-native-child-cover-probe'
$ownerFn='function(){var p=getCurrentPages().at(-1),out={route:p.route,canvas:null};function walk(n,path){if(n.uid==="spot-night-sky-scene")out.canvas={nn:n.nn,sid:n.sid,childPath:path+".cn",children:(n.cn||[]).map(function(c){return {uid:c.uid,nn:c.nn,cl:c.cl,text:(c.cn||[]).map(function(t){return t.v||""}).join("")}})};(n.cn||[]).forEach(function(c,i){walk(c,path+".cn["+i+"]")})}walk(p.data.root,"root");return out}'
$owner=(Invoke-SkyCurrentUi 'automation_evaluate' @('--project',$skyCurrentProject,'--fn-source',$ownerFn)).result.result
if($owner.route -ne 'sky/detail/index' -or $owner.canvas.nn -ne '16'){throw 'Current native Canvas owner changed'}
Add-SkyCurrentObservation ($StagePrefix+'-'+$Action+'-owner') $owner
if($Action -eq 'inject'){
  if($owner.canvas.children.Count -ne 0){throw 'Do not displace existing native Canvas children'}
  $child=@{nn='22';sid=$probeId;uid=$probeId;cl='sky-native-child-cover-probe';st='position:absolute;left:20px;top:400px;width:160px;height:44px;z-index:100;background-color:#d91aa8;color:#ffffff;font-size:16px;line-height:44px;text-align:center;';cn=@(@{nn='9';sid=($probeId+'-text');v='Canvas 内覆盖诊断'})}
  $patch=@{}; $patch[$owner.canvas.childPath]=@($child)
  Invoke-SkyCurrentUi 'automation_page_action' @('--project',$skyCurrentProject,'--action','setData','--patch',($patch | ConvertTo-Json -Depth 10 -Compress)) | Out-Null
  Add-SkyCurrentObservation ($StagePrefix+'-injected') @{id=$probeId;scope='One native-data diagnostic child inside the existing WebGL Canvas; no React/Taro product change, gesture, refresh or state-owner acceptance'}
} elseif($Action -eq 'capture'){
  if($owner.canvas.children.Count -ne 1 -or $owner.canvas.children[0].uid -ne $probeId){throw 'The owned diagnostic child is not present'}
  $row=@{id=$probeId;size=(Invoke-SkyCurrentUi 'automation_element_action' @('--project',$skyCurrentProject,'--action','size','--selector',('#'+$probeId)));offset=(Invoke-SkyCurrentUi 'automation_element_action' @('--project',$skyCurrentProject,'--action','offset','--selector',('#'+$probeId)))}
  Add-SkyCurrentObservation ($StagePrefix+'-layout') $row
  Save-SkyCurrentCapture ($StagePrefix+'-diagnostic') | Out-Null
  $row | ConvertTo-Json -Depth 5 -Compress
} else {
  if($owner.canvas.children.Count -ne 1 -or $owner.canvas.children[0].uid -ne $probeId -or $owner.canvas.children[0].nn -ne '22'){throw 'Restore only the owned diagnostic child'}
  $patch=@{}; $patch[$owner.canvas.childPath]=@()
  Invoke-SkyCurrentUi 'automation_page_action' @('--project',$skyCurrentProject,'--action','setData','--patch',($patch | ConvertTo-Json -Depth 5 -Compress)) | Out-Null
  $after=(Invoke-SkyCurrentUi 'automation_evaluate' @('--project',$skyCurrentProject,'--fn-source',$ownerFn)).result.result
  if($after.canvas.children.Count -ne 0){throw 'Native Canvas child restoration is not confirmed'}
  Add-SkyCurrentObservation ($StagePrefix+'-restored') $after
  Save-SkyCurrentCapture ($StagePrefix+'-restored') | Out-Null
  Read-SkyCurrentUi ($StagePrefix+'-final-view') | Out-Null
  Read-SkyCurrentFiles ($StagePrefix+'-final-files') | ConvertTo-Json -Depth 4 -Compress
}
