if(Test-Path -LiteralPath (Join-Path $PSScriptRoot '../evidence/experience-constellation-local-native-validation-2026-09-29.json')) {
 throw 'This constellation journey is frozen. Start a new trace for later actions.'
}
. (Join-Path $PSScriptRoot 'experience-mode-layer-native-helpers-2026-09-29.ps1')
$skyProject='E:/dev/worktrees/Starward/remote-main-20260908/apps/wechat-miniapp/dist/weapp-check-sky-combined-clean-v31-0929'
$skyTracePath=Join-Path $skyEvidence 'experience-constellation-local-native-2026-09-29.jsonl'
function Save-SkyCapture($skyStage) {
 if($skyStage -notmatch '^[a-z0-9-]+$'){throw 'Invalid capture stage'}
 $skyPath=Join-Path $skyEvidence ('experience-constellation-v31-'+$skyStage+'-2026-09-29.png')
 if(Test-Path -LiteralPath $skyPath){throw 'Refuse to overwrite native capture'}
 $skyShot=Invoke-SkyUi 'simulator_screenshot' @('--project',$skyProject,'--optimize','false')
 Copy-Item -LiteralPath $skyShot.path -Destination $skyPath -ErrorAction Stop
 $skyValue=@{project=$skyProject;path=$skyPath;width=$skyShot.imageWidth;height=$skyShot.imageHeight;sha256=(Get-FileHash -LiteralPath $skyPath).Hash.ToLowerInvariant()}
 Add-SkyObservation $skyStage $skyValue
 return $skyValue
}
