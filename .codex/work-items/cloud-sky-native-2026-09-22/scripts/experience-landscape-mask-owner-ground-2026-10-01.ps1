$ErrorActionPreference='Stop'
. (Join-Path $PSScriptRoot 'experience-current-native-helpers-2026-10-01.ps1')
Read-SkyCurrentUi 'landscape-empty-view-mask-owner-ground-before' | Out-Null
$directory=Join-Path $skyCurrentTask ('tmp/current-native-inputs/'+[Guid]::NewGuid().ToString('N'))
[IO.Directory]::CreateDirectory($directory) | Out-Null
$start=Join-Path $directory 'start.json'; $move=Join-Path $directory 'move.json'; $end=Join-Path $directory 'end.json'
foreach($row in @(@{path=$start;y=650},@{path=$move;y=250})){
 $point=@(@{identifier=1;pageX=196;pageY=$row.y;clientX=196;clientY=$row.y})
 [IO.File]::WriteAllText($row.path,(ConvertTo-Json -InputObject $point -Compress),[Text.UTF8Encoding]::new($false))
}
[IO.File]::WriteAllText($end,'[]',[Text.UTF8Encoding]::new($false))
foreach($step in 1..2){
 Invoke-SkyCurrentUi 'automation_element_action' @('--project',$skyCurrentProject,'--action','touchstart','--selector','canvas','--touches-file',$start,'--changed-touches-file',$start) | Out-Null
 Invoke-SkyCurrentUi 'automation_element_action' @('--project',$skyCurrentProject,'--action','touchmove','--selector','canvas','--touches-file',$move,'--changed-touches-file',$move) | Out-Null
 Invoke-SkyCurrentUi 'automation_element_action' @('--project',$skyCurrentProject,'--action','touchend','--selector','canvas','--touches-file',$end,'--changed-touches-file',$move) | Out-Null
}
Add-SkyCurrentObservation 'landscape-empty-view-mask-owner-ground-input' @{start=@{x=196;y=650};end=@{x=196;y=250};count=2;scope='Official SDK public single-touch streams, not physical input or exact camera measurement'}
Read-SkyCurrentUi 'landscape-empty-view-mask-owner-ground-state' | ConvertTo-Json -Depth 3 -Compress
Save-SkyCurrentCapture 'landscape-empty-view-mask-owner-ground' | ConvertTo-Json -Depth 4 -Compress
