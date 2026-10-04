$ErrorActionPreference='Stop'
. (Join-Path $PSScriptRoot 'experience-current-native-helpers-2026-10-01.ps1')
$baseline=Read-SkyCurrentUi 'composition-unmount-baseline'
if($baseline.canvas.scene -ne 'READY' -or -not $baseline.canvas.label.Contains('45.0')){throw 'Expected current restored baseline'}
$exitCompleted=$false
try {
  Tap-SkyCurrentAction '返回' 'composition-unmount-public-exit'
  $exitCompleted=$true
  $source='function(){var p=getCurrentPages().at(-1),out={route:p.route,rootClass:p.data.root.cl||null,canvasCount:0,viewCount:0,textCount:0,buttonCount:0,scope:"Read-only current native render tree; route query, UID and content omitted"};function walk(n){if(n.nn==="16"||n.nn==="canvas")out.canvasCount++;if(n.nn==="6"||n.nn==="view")out.viewCount++;if(n.nn==="8"||n.nn==="text")out.textCount++;if(n.nn==="14"||n.nn==="button")out.buttonCount++;(n.cn||[]).forEach(walk)}walk(p.data.root);return out}'
  $tree=(Invoke-SkyCurrentUi 'automation_evaluate' @('--project',$skyCurrentProject,'--fn-source',$source)).result.result
  Add-SkyCurrentObservation 'composition-unmount-map-native-tree' $tree
  if($tree.route -ne 'pages/map/index' -or $tree.canvasCount -ne 0){throw 'Expected actual map without a native canvas'}
  $selector=Invoke-SkyCurrentUi 'automation_page_action' @('--project',$skyCurrentProject,'--action','querySelectorAll','--selector','canvas')
  Add-SkyCurrentObservation 'composition-unmount-map-native-selector' @{count=@($selector.elements).Count;scope='Official SDK current-page Canvas selector count only'}
  if(@($selector.elements).Count -ne 0){throw 'Map native Canvas selector remained'}
  $files=Read-SkyCurrentFiles 'composition-unmount-map-files'
  if($files.count -ne 0){throw 'Sky files survived public owner exit'}
  Save-SkyCurrentCapture 'composition-unmount-map' | Out-Null
} finally {
  if($exitCompleted){
    & (Join-Path $PSScriptRoot 'experience-current-native-reenter-2026-10-01.ps1') -Stage composition-unmount-final-restored
    Read-SkyCurrentFiles 'composition-unmount-final-restored-files' | Out-Null
  }
}
$restored=Read-SkyCurrentUi 'composition-unmount-final-restored-scene'
if($restored.canvas.scene -ne 'READY' -or -not $restored.canvas.label.Contains('45.0')){throw 'Native scene restoration is unresolved'}
Save-SkyCurrentCapture 'composition-unmount-final-restored' | Out-Null
& (Join-Path $PSScriptRoot 'experience-cold-image-native-2026-10-01.ps1') -ReadbackOnly
