$ErrorActionPreference='Stop'
$skyLog=Join-Path $PSScriptRoot '../evidence/experience-stellar-glare-v33-build-2026-09-29.txt'
$skyBuild=Join-Path $PSScriptRoot '../../../../apps/wechat-miniapp/dist/weapp-check-sky-combined-clean-v33-0929'
if((Test-Path -LiteralPath $skyLog) -or (Test-Path -LiteralPath $skyBuild)){throw 'Preserve existing build evidence and candidate'}
$env:NODE_ENV='production'
$env:TARO_ENV='weapp'
$env:MINIAPP_API_BASE='http://127.0.0.1:8791'
$env:MINIAPP_OPERATOR_PREVIEW_TOKEN=''
$env:MINIAPP_ACCEPTANCE_DIAGNOSTICS='0'
$env:MINIAPP_DEVICE_REQUEST_DIAGNOSTICS='0'
$env:MINIAPP_DEVELOPMENT_FIXTURE_MODE='0'
$env:MINIAPP_ISOLATED_FIXTURE_BUILD='0'
$env:MINIAPP_ISOLATED_CHECK_BUILD='1'
$env:MINIAPP_ISOLATED_CHECK_BUILD_SLOT='sky-combined-clean-v33-0929'
$env:MINIAPP_SKY_FEEDBACK_ID=''
& npm.cmd run build:weapp --workspace '@starward/wechat-miniapp' *> $skyLog
$skyCode=$LASTEXITCODE
Add-Content -LiteralPath $skyLog -Value "exitCode=$skyCode" -Encoding utf8
Get-Content -LiteralPath $skyLog -Tail 22
exit $skyCode
