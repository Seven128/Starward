. (Join-Path $PSScriptRoot 'experience-source-wrap-native-helpers-2026-09-29.ps1')
$skyTracePath = Join-Path $skyEvidence 'experience-mode-layer-native-2026-09-29.jsonl'

function Invoke-SkyModePinch($skyStartDistance, $skyEndDistance) {
 $skySize = Invoke-SkyUi 'automation_element_action' @('--project',$skyProject,'--action','size','--selector','canvas')
 $skyOffset = Invoke-SkyUi 'automation_element_action' @('--project',$skyProject,'--action','offset','--selector','canvas')
 if (-not ($skySize.width -gt 0 -and $skySize.height -gt 0)) { throw 'Canvas size unavailable' }
 if (-not ($skyOffset.PSObject.Properties.Name -contains 'left') -or -not ($skyOffset.PSObject.Properties.Name -contains 'top')) { throw 'Canvas offset unavailable' }
 $skyCenterX = $skyOffset.left + $skySize.width / 2
 $skyCenterY = $skyOffset.top + $skySize.height / 2
 $skyStart = @(1,2 | ForEach-Object { @{identifier=$_;clientX=$skyCenterX + (($_ * 2 - 3) * $skyStartDistance / 2);clientY=$skyCenterY;pageX=$skyCenterX + (($_ * 2 - 3) * $skyStartDistance / 2);pageY=$skyCenterY} }) | ConvertTo-Json -Compress
 $skyMove = @(1,2 | ForEach-Object { @{identifier=$_;clientX=$skyCenterX + (($_ * 2 - 3) * $skyEndDistance / 2);clientY=$skyCenterY;pageX=$skyCenterX + (($_ * 2 - 3) * $skyEndDistance / 2);pageY=$skyCenterY} }) | ConvertTo-Json -Compress
 $skyInputs = Join-Path $skyEvidence ('experience-v26-mode-native-inputs/' + [Guid]::NewGuid().ToString('N'))
 [IO.Directory]::CreateDirectory($skyInputs) | Out-Null
 $skyStartFile=Join-Path $skyInputs 'start.json'
 $skyMoveFile=Join-Path $skyInputs 'move.json'
 $skyEndFile=Join-Path $skyInputs 'end.json'
 [IO.File]::WriteAllText($skyStartFile,$skyStart,[Text.UTF8Encoding]::new($false))
 [IO.File]::WriteAllText($skyMoveFile,$skyMove,[Text.UTF8Encoding]::new($false))
 [IO.File]::WriteAllText($skyEndFile,'[]',[Text.UTF8Encoding]::new($false))
 Invoke-SkyUi 'automation_element_action' @('--project',$skyProject,'--action','touchstart','--selector','canvas','--touches-file',$skyStartFile,'--changed-touches-file',$skyStartFile) | Out-Null
 Invoke-SkyUi 'automation_element_action' @('--project',$skyProject,'--action','touchmove','--selector','canvas','--touches-file',$skyMoveFile,'--changed-touches-file',$skyMoveFile) | Out-Null
 Invoke-SkyUi 'automation_element_action' @('--project',$skyProject,'--action','touchend','--selector','canvas','--touches-file',$skyEndFile,'--changed-touches-file',$skyMoveFile) | Out-Null
 Add-SkyObservation 'v26-official-sdk-pinch' @{startDistance=$skyStartDistance;endDistance=$skyEndDistance;canvasSize=$skySize;canvasOffset=$skyOffset;center=@($skyCenterX,$skyCenterY);inputDirectory=$skyInputs;scope='Official SDK native events, not phone multi-touch acceptance'}
}
