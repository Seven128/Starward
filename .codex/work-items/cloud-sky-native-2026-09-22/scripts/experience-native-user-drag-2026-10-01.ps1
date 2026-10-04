$ErrorActionPreference='Stop'
. (Join-Path $PSScriptRoot 'experience-current-native-helpers-2026-10-01.ps1')
$ui=Read-SkyCurrentUi 'user-drag-demonstration-before'
if($ui.canvas.scene -ne 'READY'){throw 'Current native scene is not drawable'}
$size=Invoke-SkyCurrentUi 'automation_element_action' @('--project',$skyCurrentProject,'--action','size','--selector','canvas')
$offset=Invoke-SkyCurrentUi 'automation_element_action' @('--project',$skyCurrentProject,'--action','offset','--selector','canvas')
if(-not ($size.width -gt 300 -and $size.height -gt 500)){throw 'Actual native canvas dimensions changed'}
$x0=$offset.left+$size.width*0.25
$x1=$offset.left+$size.width*0.85
$y=$offset.top+$size.height*0.5
Save-SkyCurrentCapture 'user-drag-demonstration-before' | Out-Null
foreach($input in @(@{action='touchstart';x=$x0},@{action='touchmove';x=$x1},@{action='touchend';x=$x1})){
  Invoke-SkyCurrentUi 'automation_element_action' @('--project',$skyCurrentProject,'--action',$input.action,'--x',([string]$input.x),'--y',([string]$y)) | Out-Null
  Add-SkyCurrentObservation ('user-drag-demonstration-'+$input.action) @{x=$input.x;y=$y;scope='Official SDK viewport touch; no selector end-coordinate ambiguity, React handler or state injection; not a physical mouse/phone gesture'}
}
$after=Read-SkyCurrentUi 'user-drag-demonstration-after'
if($after.canvas.scene -ne 'READY'){throw 'Current native drag result is unresolved'}
Save-SkyCurrentCapture 'user-drag-demonstration-after' | Out-Null
@{route=$after.route;canvas=$after.canvas;scope='Current official simulated drag result; leave this view for the user to inspect'} | ConvertTo-Json -Depth 5 -Compress
