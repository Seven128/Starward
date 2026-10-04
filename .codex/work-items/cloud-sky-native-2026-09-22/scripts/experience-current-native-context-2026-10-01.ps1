$ErrorActionPreference='Stop'
$skyTask=Resolve-Path (Join-Path $PSScriptRoot '..')
foreach($skyRecordName in @('current-native-context-2026-10-01.json','current-native-report-2026-10-01.json')){
 if(Test-Path -LiteralPath (Join-Path $skyTask ('tmp/'+$skyRecordName))){throw 'Preserve current runtime records; do not replay Context creation'}
}
$skyPriorContext=Get-Content (Join-Path $skyTask 'tmp/v53-context-readback.json') -Raw | ConvertFrom-Json -DateKind String
$skyPrior=$skyPriorContext.data
$skyResolveBody=@{
  location=@{kind='FORMAL_SPOT';spotId=$skyPrior.location.spotId}
  localDate=$skyPrior.localDate
  selectedAt=$skyPrior.selectedAtUtc
  targetProfile=$skyPrior.targetProfile
} | ConvertTo-Json -Depth 8 -Compress
$skyResolved=(Invoke-WebRequest -Method Post -Uri 'http://127.0.0.1:60065/v2/observation-contexts/resolve' -ContentType 'application/json' -Body $skyResolveBody).Content | ConvertFrom-Json -DateKind String
$skyCurrent=$skyResolved.data
if($skyCurrent.privacyClass -ne 'PUBLIC_REFERENCE' -or $skyCurrent.revision -ne 1 -or $skyCurrent.selectedAtUtc -ne $skyPrior.selectedAtUtc){throw 'Current public Context did not preserve the intended observing conditions'}
$skyContextReadback=(Invoke-WebRequest -Uri ('http://127.0.0.1:60065/v2/observation-contexts/'+[uri]::EscapeDataString($skyCurrent.contextId))).Content | ConvertFrom-Json -DateKind String
if($skyContextReadback.data.contextFingerprint -ne $skyCurrent.contextFingerprint){throw 'Current Context readback mismatched'}
$skyReportUri='http://127.0.0.1:60065/v2/spots/'+[uri]::EscapeDataString($skyCurrent.location.spotId)+'/sky?contextId='+[uri]::EscapeDataString($skyCurrent.contextId)
$skyReport=Invoke-WebRequest -Uri $skyReportUri
$skyReportData=$skyReport.Content | ConvertFrom-Json -DateKind String
if($skyReportData.contextRevision -ne 1 -or $skyReportData.data.context.contextId -ne $skyCurrent.contextId){throw 'Current Sky report did not bind the Context'}
# Private task-local records retain the exact owned runtime binding; no IDs,
# fingerprints, request headers or URL query are emitted to the transcript.
$skyOutputs=@{
 'current-native-context-2026-10-01.json'=($skyContextReadback | ConvertTo-Json -Depth 24)
 'current-native-report-2026-10-01.json'=$skyReport.Content
}
foreach($skyRecord in $skyOutputs.GetEnumerator()){
 $skyDestination=Join-Path $skyTask ('tmp/'+$skyRecord.Key)
 if(Test-Path -LiteralPath $skyDestination){throw 'Preserve current runtime records; do not replay Context creation'}
 [System.IO.File]::WriteAllText($skyDestination,$skyRecord.Value,[System.Text.UTF8Encoding]::new($false))
}
[pscustomobject]@{resolved=$true;readbackMatched=$true;reportStatus=[int]$skyReport.StatusCode;revision=$skyCurrent.revision;privacyClass=$skyCurrent.privacyClass;selectedAtUtc=$skyCurrent.selectedAtUtc} | ConvertTo-Json -Compress
