$ErrorActionPreference='Stop'
. (Join-Path $PSScriptRoot 'experience-current-native-helpers-2026-10-01.ps1')
$skyShaderEvidence=Join-Path $skyCurrentTask 'evidence/experience-galactic-native-shader-2026-10-01.json'
if(Test-Path -LiteralPath $skyShaderEvidence){throw 'Preserve same-input native shader evidence'}
$skyShaderSource=Get-Content -LiteralPath (Join-Path $skyCurrentTask 'tmp/galactic-native-production-shader-probe-v2.js') -Raw
$skyShaderReply=Invoke-StarwardWechatTool -Tool 'automation_evaluate' -ToolArguments @('--project',$skyCurrentProject,'--fn-source',$skyShaderSource)
if(-not $skyShaderReply.ok -or $skyShaderReply.result.success -eq $false){
 $skyShaderFailure=@{tool='automation_evaluate';ok=$skyShaderReply.ok;type=$skyShaderReply.errorType;code=$skyShaderReply.code;message=([string]$skyShaderReply.message).Substring(0,[Math]::Min(500,([string]$skyShaderReply.message).Length));reason=$skyShaderReply.reason}
 Add-SkyCurrentObservation 'galactic-native-shader-tool-failure' $skyShaderFailure
 $skyShaderFailure | ConvertTo-Json -Depth 5 -Compress
 throw 'Native same-input shader tool failed; inspect safe error before retry'
}
$skyShaderResult=$skyShaderReply.result.result
Add-SkyCurrentObservation 'galactic-native-production-shader' $skyShaderResult
$skyShaderBinding=Get-Content -LiteralPath (Join-Path $skyCurrentTask 'tmp/galactic-native-production-shader-binding-v2.json') -Raw | ConvertFrom-Json
[IO.File]::WriteAllText($skyShaderEvidence,(@{sdk='3.17.3';ordinaryProject=$skyCurrentProject;binding=$skyShaderBinding;result=$skyShaderResult} | ConvertTo-Json -Depth 16)+"`n",[Text.UTF8Encoding]::new($false))
$skyShaderResult | ConvertTo-Json -Depth 8 -Compress
