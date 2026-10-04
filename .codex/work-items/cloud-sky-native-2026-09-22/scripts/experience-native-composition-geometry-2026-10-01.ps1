$ErrorActionPreference='Stop'
. (Join-Path $PSScriptRoot 'experience-current-native-helpers-2026-10-01.ps1')
$ui=Read-SkyCurrentUi 'composition-geometry-before'
if($ui.canvas.scene -ne 'READY'){throw 'Current native scene is not drawable'}
$rows=@()
foreach($selector in @('.sky-orientation-page','.sky-orientation-canvas__surface','.sky-control-dock','.sky-orientation-back-layer','.sky-quick-settings')){
  $row=@{selector=$selector;styles=@{}}
  $row.size=Invoke-SkyCurrentUi 'automation_element_action' @('--project',$skyCurrentProject,'--action','size','--selector',$selector)
  $row.offset=Invoke-SkyCurrentUi 'automation_element_action' @('--project',$skyCurrentProject,'--action','offset','--selector',$selector)
  foreach($name in @('display','visibility','position','z-index','opacity')){
    $row.styles[$name]=Invoke-SkyCurrentUi 'automation_element_action' @('--project',$skyCurrentProject,'--action','style','--selector',$selector,'--name',$name)
  }
  Add-SkyCurrentObservation 'composition-geometry-element' $row
  $rows+=$row
  $row | ConvertTo-Json -Depth 6 -Compress
}
$target=Join-Path $skyCurrentTask 'evidence/experience-native-composition-geometry-2026-10-01.json'
if(Test-Path -LiteralPath $target){throw 'Preserve prior geometry evidence'}
[IO.File]::WriteAllText($target,(@{scope='Official SDK element geometry/computed styles on the current live page; no state mutation or refresh';route=$ui.route;canvas=$ui.canvas;rows=$rows} | ConvertTo-Json -Depth 8),[Text.UTF8Encoding]::new($false))
