. (Join-Path $PSScriptRoot 'experience-sdss-recovery-native-helpers-2026-09-29.ps1')
$skyOutput=Join-Path $skyEvidence 'experience-sdss-proxy-replacement-2026-09-29.json'
if(Test-Path -LiteralPath $skyOutput){throw 'Refuse to overwrite replacement proof'}
$skyFn="function(){var s=wx.getStorageSync('starward.wechat-miniapp.state.current');return s.observationContext.contextId;}"
$skyPrivateId=Invoke-SkyUi 'automation_evaluate' @('--project',$skyProject,'--fn-source',$skyFn)
while($skyPrivateId -is [pscustomobject] -and $skyPrivateId.PSObject.Properties.Name -contains 'result'){$skyPrivateId=$skyPrivateId.result}
if(-not ($skyPrivateId -is [string]) -or $skyPrivateId.Length -lt 10){throw 'Native Context identity unavailable'}
$skyContextRoute='/v2/observation-contexts/'+[Uri]::EscapeDataString($skyPrivateId)
$skyBefore=Read-SkyHttp $skyContextRoute
$skyBeforeJson=$skyBefore.data | ConvertTo-Json -Depth 15 -Compress
$skyBeforeHash=[Convert]::ToHexString([Security.Cryptography.SHA256]::HashData([Text.Encoding]::UTF8.GetBytes($skyBeforeJson))).ToLowerInvariant()
$skyOldTraffic=Read-SkyHttp '/__sky_test/traffic-status'
$skyOldPublication=Read-SkyHttp '/__sky_test/publication-status'
if($skyOldTraffic.active.Count -ne 0 -or $skyOldTraffic.heldResourceCount -ne 0 -or $skyOldTraffic.resourceMode -ne 'pass'){throw 'Old task transport has active effects'}
$skyOldContextStatus=Read-SkyHttp '/__sky_test/context-status'
Write-Output ('Ready for owned transport replacement; durable Context digest '+$skyBeforeHash)
$skyDeadline=[DateTime]::UtcNow.AddSeconds(60)
$skyNewTraffic=$null
do {
 Start-Sleep -Milliseconds 500
 try {
  $skyCandidate=Read-SkyHttp '/__sky_test/traffic-status'
  if($skyCandidate.epochStartedAt -ne $skyOldTraffic.epochStartedAt){$skyNewTraffic=$skyCandidate;break}
 } catch { }
} while([DateTime]::UtcNow -lt $skyDeadline)
if($null -eq $skyNewTraffic){throw 'Replacement was not ready within bounded wait'}
$skyAfter=Read-SkyHttp $skyContextRoute
$skyAfterJson=$skyAfter.data | ConvertTo-Json -Depth 15 -Compress
$skyAfterHash=[Convert]::ToHexString([Security.Cryptography.SHA256]::HashData([Text.Encoding]::UTF8.GetBytes($skyAfterJson))).ToLowerInvariant()
if($skyAfterJson -cne $skyBeforeJson){throw 'Durable native Context changed during task transport replacement'}
$skyNewPublication=Read-SkyHttp '/__sky_test/publication-status'
if($skyNewPublication.informationModuleSha256 -cne $skyOldPublication.informationModuleSha256 -or $skyNewPublication.publicationHash -cne $skyOldPublication.publicationHash -or ($skyNewPublication.sdssPublications|ConvertTo-Json -Compress) -cne ($skyOldPublication.sdssPublications|ConvertTo-Json -Compress)){throw 'Publication owner changed unexpectedly'}
$skyNewContextStatus=Read-SkyHttp '/__sky_test/context-status'
if($skyNewContextStatus.mode -ne 'pass' -or $skyNewContextStatus.puts -ne 0){throw 'Unexpected Context effect'}
$skyPrivateId=$null;$skyContextRoute=$null;$skyBeforeJson=$null;$skyAfterJson=$null
$skyResult=@{scope='Owned local transport replacement only; original 8789 Context and native candidate preserved';beforeEpoch=$skyOldTraffic.epochStartedAt;afterEpoch=$skyNewTraffic.epochStartedAt;durableContextEqual=$true;contextDataSha256=$skyAfterHash;oldContextStatus=$skyOldContextStatus;newContextStatus=$skyNewContextStatus;publication=$skyNewPublication;held=$skyNewTraffic.heldResourceCount;active=$skyNewTraffic.active.Count;source=(Read-SkyHttp '/__sky_test/source-status');transportScriptSha256=(Get-FileHash -LiteralPath (Join-Path $PSScriptRoot 'experience-context-http-fault-2026-09-28.mjs')).Hash.ToLowerInvariant()}
$skyJson=$skyResult|ConvertTo-Json -Depth 12
$skyStream=[IO.File]::Open($skyOutput,[IO.FileMode]::CreateNew)
try{$skyBytes=[Text.Encoding]::UTF8.GetBytes($skyJson+"`n");$skyStream.Write($skyBytes,0,$skyBytes.Length)}finally{$skyStream.Dispose()}
Add-SkyObservation 'sdss-transport-replacement' $skyResult
$skyResult|ConvertTo-Json -Depth 12
