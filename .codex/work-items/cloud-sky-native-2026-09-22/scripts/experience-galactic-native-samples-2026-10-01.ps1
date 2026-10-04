$ErrorActionPreference='Stop'
. (Join-Path $PSScriptRoot 'experience-current-native-helpers-2026-10-01.ps1')
$skySamplesEvidence=Join-Path $skyCurrentTask 'evidence/experience-galactic-native-samples-2026-10-01.json'
if(Test-Path -LiteralPath $skySamplesEvidence){throw 'Preserve native sampled evidence'}
$skySamplesBefore=Read-SkyCurrentUi 'galactic-native-samples-before'
if($skySamplesBefore.canvas.scene -ne 'READY' -or [DateTimeOffset]::Parse($skySamplesBefore.canvas.frameAt) -ne [DateTimeOffset]::Parse('2026-09-30T13:50:33Z')){throw 'Current native page is not the recovered owned frame'}
$skySamplesSource=Get-Content -LiteralPath (Join-Path $skyCurrentTask 'tmp/galactic-native-production-samples-probe.js') -Raw
$skySamplesReply=Invoke-StarwardWechatTool -Tool 'automation_evaluate' -ToolArguments @('--project',$skyCurrentProject,'--fn-source',$skySamplesSource)
if(-not $skySamplesReply.ok){
 $skySamplesFailure=@{type=$skySamplesReply.errorType;message=$skySamplesReply.message;reason=$skySamplesReply.reason;scope='Bounded native sample proof unavailable, not a product pass'}
 Add-SkyCurrentObservation 'galactic-native-samples-tool-failure' $skySamplesFailure
 $skySamplesFailure | ConvertTo-Json -Compress
 throw 'Bounded native sampled probe failed; no replay'
}
$skySamplesResult=$skySamplesReply.result.result.result
Add-SkyCurrentObservation 'galactic-native-production-samples' $skySamplesResult
$skySamplesBinding=Get-Content -LiteralPath (Join-Path $skyCurrentTask 'tmp/galactic-native-production-samples-binding.json') -Raw | ConvertFrom-Json -DateKind String
[IO.File]::WriteAllText($skySamplesEvidence,(@{at=[DateTime]::UtcNow.ToString('o');sdk='3.17.3';binding=$skySamplesBinding;result=$skySamplesResult} | ConvertTo-Json -Depth 18)+"`n",[Text.UTF8Encoding]::new($false))
$skySamplesResult | ConvertTo-Json -Depth 8 -Compress
