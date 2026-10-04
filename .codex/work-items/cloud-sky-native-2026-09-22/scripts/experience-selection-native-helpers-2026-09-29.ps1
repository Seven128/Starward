if(Test-Path -LiteralPath (Join-Path $PSScriptRoot '../evidence/experience-selection-native-validation-2026-09-29.json')) {
 throw 'This selection journey is frozen. Use a new trace for later actions.'
}
. (Join-Path $PSScriptRoot 'experience-mode-layer-native-helpers-2026-09-29.ps1')
$skyProject='E:/dev/worktrees/Starward/remote-main-20260908/apps/wechat-miniapp/dist/weapp-check-sky-combined-clean-v32-0929'
$skyTracePath=Join-Path $skyEvidence 'experience-selection-native-2026-09-29.jsonl'
function Save-SkyCapture($skyStage) {
 if($skyStage -notmatch '^[a-z0-9-]+$'){throw 'Invalid capture stage'}
 $skyPath=Join-Path $skyEvidence ('experience-selection-v32-'+$skyStage+'-2026-09-29.png')
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
