if(Test-Path -LiteralPath (Join-Path $PSScriptRoot '../evidence/experience-v30-combined-native-validation-2026-09-29.json')) {
 throw 'This journey is frozen. Use a new trace for subsequent native actions.'
}
. (Join-Path $PSScriptRoot 'experience-optical-boundary-v30-native-helpers-2026-09-29.ps1')
# V30 optical and all older traces/captures are frozen; this journey is separate.
$skyTracePath=Join-Path $skyEvidence 'experience-v30-combined-native-2026-09-29.jsonl'
function Save-SkyCapture($skyStage) {
 if($skyStage -notmatch '^[a-z0-9-]+$'){throw 'Invalid capture stage'}
 $skyPath=Join-Path $skyEvidence ('experience-v30-combined-'+$skyStage+'-2026-09-29.png')
 if(Test-Path -LiteralPath $skyPath){throw 'Refuse to overwrite native capture'}
 $skyShot=Invoke-SkyUi 'simulator_screenshot' @('--project',$skyProject,'--optimize','false')
 Copy-Item -LiteralPath $skyShot.path -Destination $skyPath -ErrorAction Stop
 $skyValue=@{project=$skyProject;path=$skyPath;width=$skyShot.imageWidth;height=$skyShot.imageHeight;sha256=(Get-FileHash -LiteralPath $skyPath).Hash.ToLowerInvariant()}
 Add-SkyObservation $skyStage $skyValue
 return $skyValue
}
