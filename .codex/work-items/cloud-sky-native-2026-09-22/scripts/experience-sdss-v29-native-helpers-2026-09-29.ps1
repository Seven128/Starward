. (Join-Path $PSScriptRoot 'experience-sdss-recovery-native-helpers-2026-09-29.ps1')
$skyProject='E:/dev/worktrees/Starward/remote-main-20260908/apps/wechat-miniapp/dist/weapp-check-sky-combined-clean-v29-0929'
$skyTracePath=Join-Path $skyEvidence 'experience-sdss-recovery-v29-native-2026-09-29.jsonl'
function Save-SkyCapture($skyStage) {
 if($skyStage -notmatch '^[a-z0-9-]+$'){throw 'Invalid capture stage'}
 $skyPath=Join-Path $skyEvidence ('experience-v29-native-'+$skyStage+'-2026-09-29.png')
 if(Test-Path -LiteralPath $skyPath){throw 'Refuse to overwrite native capture'}
 $skyShot=Invoke-SkyUi 'simulator_screenshot' @('--project',$skyProject,'--optimize','false')
 Copy-Item -LiteralPath $skyShot.path -Destination $skyPath -ErrorAction Stop
 $skyValue=@{project=$skyProject;path=$skyPath;width=$skyShot.imageWidth;height=$skyShot.imageHeight;sha256=(Get-FileHash -LiteralPath $skyPath).Hash.ToLowerInvariant()}
 Add-SkyObservation $skyStage $skyValue
 return $skyValue
}
