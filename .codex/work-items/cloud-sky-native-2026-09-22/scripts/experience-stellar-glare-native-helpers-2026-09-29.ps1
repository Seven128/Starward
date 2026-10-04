if(Test-Path -LiteralPath (Join-Path $PSScriptRoot '../evidence/experience-stellar-glare-native-validation-2026-09-29.json')) {
 throw 'This stellar-glare journey is frozen. Use a new trace for later actions.'
}
. (Join-Path $PSScriptRoot 'experience-review-repairs-native-helpers-2026-09-29.ps1')
$skyProject='E:/dev/worktrees/Starward/remote-main-20260908/apps/wechat-miniapp/dist/weapp-check-sky-combined-clean-v33-0929'
$skyTracePath=Join-Path $skyEvidence 'experience-stellar-glare-native-2026-09-29.jsonl'
function Save-SkyCapture($skyStage) {
 if($skyStage -notmatch '^[a-z0-9-]+$'){throw 'Invalid capture stage'}
 $skyPath=Join-Path $skyEvidence ('experience-stellar-glare-v33-'+$skyStage+'-2026-09-29.png')
 if(Test-Path -LiteralPath $skyPath){throw 'Refuse to overwrite native capture'}
 $skyShot=Invoke-SkyUi 'simulator_screenshot' @('--project',$skyProject,'--optimize','false')
 Copy-Item -LiteralPath $skyShot.path -Destination $skyPath -ErrorAction Stop
 $skyValue=@{project=$skyProject;path=$skyPath;width=$skyShot.imageWidth;height=$skyShot.imageHeight;sha256=(Get-FileHash -LiteralPath $skyPath).Hash.ToLowerInvariant()}
 Add-SkyObservation $skyStage $skyValue
 return $skyValue
}
function Read-SkySelectionUi($skyStage) {
 $skyRoot=Invoke-SkyUi 'automation_element_action' @('--project',$skyProject,'--action','wxml','--selector','.sky-orientation-page')
 $skyValue=@{hasModal=$skyRoot -match 'class="sky-object-modal';hasList=$skyRoot -match 'sky-orientation-details--list';hasChoices=$skyRoot -match 'class="sky-object-choice';hasTimePanel=$skyRoot -match 'class="[^"]*sky-time';marker=([regex]::Match($skyRoot,'<button[^>]*class="sky-selected-object[^>]*>')).Value;name=([regex]::Match($skyRoot,'<text[^>]*class="sky-selected-object__name[^>]*>[^<]*</text>')).Value;reticle=([regex]::Match($skyRoot,'<view[^>]*class="sky-selected-object__reticle[^>]*>')).Value;title=([regex]::Match($skyRoot,'<text[^>]*class="sky-object-modal__title[^>]*>([^<]*)</text>')).Groups[1].Value;status=([regex]::Match($skyRoot,'<view[^>]*class="sky-selection-status[^>]*>')).Value}
 Add-SkyObservation $skyStage $skyValue
 return $skyValue
}
function Invoke-SkyMeasuredPinch($skyStartDistance,$skyEndDistance) {
 $skySize=Invoke-SkyUi 'automation_element_action' @('--project',$skyProject,'--action','size','--selector','canvas')
 $skyOffset=Invoke-SkyUi 'automation_element_action' @('--project',$skyProject,'--action','offset','--selector','canvas')
 if(-not ($skySize.width -gt 0 -and $skySize.height -gt 0)){throw 'Canvas size unavailable'}
 if(-not ($skyOffset.PSObject.Properties.Name -contains 'left') -or -not ($skyOffset.PSObject.Properties.Name -contains 'top')){throw 'Canvas offset unavailable'}
 $skyCenterX=$skyOffset.left+$skySize.width/2
 $skyCenterY=$skyOffset.top+$skySize.height/2
 $skyStart=@(1,2|ForEach-Object {@{identifier=$_;clientX=$skyCenterX+(($_*2-3)*$skyStartDistance/2);clientY=$skyCenterY;pageX=$skyCenterX+(($_*2-3)*$skyStartDistance/2);pageY=$skyCenterY}})|ConvertTo-Json -Compress
 $skyMove=@(1,2|ForEach-Object {@{identifier=$_;clientX=$skyCenterX+(($_*2-3)*$skyEndDistance/2);clientY=$skyCenterY;pageX=$skyCenterX+(($_*2-3)*$skyEndDistance/2);pageY=$skyCenterY}})|ConvertTo-Json -Compress
 $skyInputs=Join-Path $skyEvidence ('experience-stellar-glare-v33-native-inputs/'+[Guid]::NewGuid().ToString('N'))
 [IO.Directory]::CreateDirectory($skyInputs)|Out-Null
 $skyStartFile=Join-Path $skyInputs 'start.json'
 $skyMoveFile=Join-Path $skyInputs 'move.json'
 $skyEndFile=Join-Path $skyInputs 'end.json'
 [IO.File]::WriteAllText($skyStartFile,$skyStart,[Text.UTF8Encoding]::new($false))
 [IO.File]::WriteAllText($skyMoveFile,$skyMove,[Text.UTF8Encoding]::new($false))
 [IO.File]::WriteAllText($skyEndFile,'[]',[Text.UTF8Encoding]::new($false))
 Invoke-SkyUi 'automation_element_action' @('--project',$skyProject,'--action','touchstart','--selector','canvas','--touches-file',$skyStartFile,'--changed-touches-file',$skyStartFile)|Out-Null
 Invoke-SkyUi 'automation_element_action' @('--project',$skyProject,'--action','touchmove','--selector','canvas','--touches-file',$skyMoveFile,'--changed-touches-file',$skyMoveFile)|Out-Null
 Invoke-SkyUi 'automation_element_action' @('--project',$skyProject,'--action','touchend','--selector','canvas','--touches-file',$skyEndFile,'--changed-touches-file',$skyMoveFile)|Out-Null
 Add-SkyObservation 'v33-official-sdk-pinch' @{startDistance=$skyStartDistance;endDistance=$skyEndDistance;canvasSize=$skySize;canvasOffset=$skyOffset;center=@($skyCenterX,$skyCenterY);inputDirectory=$skyInputs;scope='Official SDK events; not phone multi-touch acceptance.'}
}
