$ErrorActionPreference='Stop'
. (Join-Path $PSScriptRoot 'experience-current-native-helpers-2026-10-01.ps1')
$skyImageEvidence=Join-Path $skyCurrentTask 'evidence/experience-galactic-native-image-copy-2026-10-01.json'
if(Test-Path -LiteralPath $skyImageEvidence){throw 'Preserve native image capability evidence'}
$skyImagePublication=(Invoke-RestMethod -Uri 'http://127.0.0.1:60065/v2/sky/galactic/manifest').image
if($skyImagePublication.width -ne 2048 -or $skyImagePublication.height -ne 1024 -or $skyImagePublication.bytes -le 0){throw 'Current publication does not match bounded native trial'}
$skyImageSourcePath=Join-Path $skyCurrentTask 'tmp/galactic-native-image-copy-probe.js'
$skyImageSource=(Get-Content -LiteralPath $skyImageSourcePath -Raw).Replace('__EXPECTED_ENCODED_BYTES__',[string]$skyImagePublication.bytes)
$skyImageReply=Invoke-SkyCurrentUi 'automation_evaluate' @('--project',$skyCurrentProject,'--fn-source',$skyImageSource)
$skyImageResult=$skyImageReply.result.result
Add-SkyCurrentObservation 'galactic-native-image-copy-capability' $skyImageResult
$skyImageBinding=@{at=[DateTime]::UtcNow.ToString('o');sdk='3.17.3';ordinaryProject=$skyCurrentProject;probeTemplateSha256=(Get-FileHash -LiteralPath $skyImageSourcePath).Hash.ToLowerInvariant();sourcePublication=@{encodedBytes=$skyImagePublication.bytes;sha256=$skyImagePublication.sha256};result=$skyImageResult}
[IO.File]::WriteAllText($skyImageEvidence,($skyImageBinding | ConvertTo-Json -Depth 10)+"`n",[Text.UTF8Encoding]::new($false))
$skyImageResult | ConvertTo-Json -Depth 6 -Compress
