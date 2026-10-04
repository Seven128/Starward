if(Test-Path -LiteralPath (Join-Path $PSScriptRoot '../evidence/experience-stellar-layer-native-validation-2026-09-29.json')) {
 throw 'This stellar journey is frozen. Start a new trace for later actions.'
}
. (Join-Path $PSScriptRoot 'experience-optical-boundary-v30-native-helpers-2026-09-29.ps1')
# Previous optical/combined traces are immutable; only this new trace is writable.
$skyTracePath=Join-Path $skyEvidence 'experience-stellar-layer-native-2026-09-29.jsonl'
function Invoke-SkyCenterTap {
 $skySize=Invoke-SkyUi 'automation_element_action' @('--project',$skyProject,'--action','size','--selector','canvas')
 $skyOffset=Invoke-SkyUi 'automation_element_action' @('--project',$skyProject,'--action','offset','--selector','canvas')
 $skyX=$skyOffset.left+$skySize.width/2; $skyY=$skyOffset.top+$skySize.height/2
 $skyInputs=Join-Path $skyEvidence ('experience-stellar-v30-native-inputs/'+[Guid]::NewGuid().ToString('N'))
 [IO.Directory]::CreateDirectory($skyInputs) | Out-Null
 $skyOne=ConvertTo-Json -InputObject @(@{identifier=1;x=$skyX;y=$skyY;clientX=$skyX;clientY=$skyY;pageX=$skyX;pageY=$skyY}) -Compress
 $skyStart=Join-Path $skyInputs 'start.json';$skyEnd=Join-Path $skyInputs 'end.json'
 [IO.File]::WriteAllText($skyStart,$skyOne,[Text.UTF8Encoding]::new($false))
 [IO.File]::WriteAllText($skyEnd,'[]',[Text.UTF8Encoding]::new($false))
 Invoke-SkyUi 'automation_element_action' @('--project',$skyProject,'--action','touchstart','--selector','canvas','--touches-file',$skyStart,'--changed-touches-file',$skyStart) | Out-Null
 Invoke-SkyUi 'automation_element_action' @('--project',$skyProject,'--action','touchend','--selector','canvas','--touches-file',$skyEnd,'--changed-touches-file',$skyStart) | Out-Null
 Add-SkyObservation 'stellar-official-sdk-center-tap' @{x=$skyX;y=$skyY;inputDirectory=$skyInputs;scope='Measured Canvas one-finger events, explicit x/y plus client/page fields; no catalog-ID/marker click or state injection; not physical phone input.'}
}
function Save-SkyCapture($skyStage) {
 if($skyStage -notmatch '^[a-z0-9-]+$'){throw 'Invalid capture stage'}
 $skyPath=Join-Path $skyEvidence ('experience-stellar-v30-'+$skyStage+'-2026-09-29.png')
 if(Test-Path -LiteralPath $skyPath){throw 'Refuse to overwrite native capture'}
 $skyShot=Invoke-SkyUi 'simulator_screenshot' @('--project',$skyProject,'--optimize','false')
 Copy-Item -LiteralPath $skyShot.path -Destination $skyPath -ErrorAction Stop
 $skyValue=@{project=$skyProject;path=$skyPath;width=$skyShot.imageWidth;height=$skyShot.imageHeight;sha256=(Get-FileHash -LiteralPath $skyPath).Hash.ToLowerInvariant()}
 Add-SkyObservation $skyStage $skyValue
 return $skyValue
}
