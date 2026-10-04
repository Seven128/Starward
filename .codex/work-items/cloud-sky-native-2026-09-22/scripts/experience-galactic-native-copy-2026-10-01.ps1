$ErrorActionPreference='Stop'
. (Join-Path $PSScriptRoot 'experience-current-native-helpers-2026-10-01.ps1')
$skyCopyEvidence=Join-Path $skyCurrentTask 'evidence/experience-galactic-native-copy-2026-10-01.json'
if(Test-Path -LiteralPath $skyCopyEvidence){throw 'Preserve native capability evidence'}
$skyCopySourcePath=Join-Path $skyCurrentTask 'tmp/galactic-native-copy-probe.js'
$skyCopySource=Get-Content -LiteralPath $skyCopySourcePath -Raw
$skyCopyReply=Invoke-SkyCurrentUi 'automation_evaluate' @('--project',$skyCurrentProject,'--fn-source',$skyCopySource)
$skyCopyValue=$skyCopyReply.result.result
Add-SkyCurrentObservation 'galactic-native-copy-capability' $skyCopyValue
$skyCopyBinding=@{at=[DateTime]::UtcNow.ToString('o');sdk='3.17.3';ordinaryProject=$skyCurrentProject;sourceSha256=(Get-FileHash -LiteralPath $skyCopySourcePath).Hash.ToLowerInvariant();result=$skyCopyValue}
[IO.File]::WriteAllText($skyCopyEvidence,($skyCopyBinding | ConvertTo-Json -Depth 10)+"`n",[Text.UTF8Encoding]::new($false))
$skyCopyValue | ConvertTo-Json -Depth 6 -Compress
