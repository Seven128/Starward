$ErrorActionPreference='Stop'
$skyScene45Log=Join-Path $PSScriptRoot '../tmp/weapp-scene-v45-build.log'
$skyScene45Build=Join-Path $PSScriptRoot '../../../../apps/wechat-miniapp/dist/weapp-check-sky-scene-v45'
if((Test-Path -LiteralPath $skyScene45Log) -or (Test-Path -LiteralPath $skyScene45Build)){throw 'Preserve existing build evidence and candidate'}
$env:NODE_ENV='production'
$env:TARO_ENV='weapp'
$env:MINIAPP_API_BASE='http://127.0.0.1:60065'
$env:MINIAPP_OPERATOR_PREVIEW_TOKEN=''
$env:MINIAPP_ACCEPTANCE_DIAGNOSTICS='0'
$env:MINIAPP_DEVICE_REQUEST_DIAGNOSTICS='0'
$env:MINIAPP_DEVELOPMENT_FIXTURE_MODE='0'
$env:MINIAPP_ISOLATED_FIXTURE_BUILD='0'
$env:MINIAPP_ISOLATED_CHECK_BUILD='1'
$env:MINIAPP_ISOLATED_CHECK_BUILD_SLOT='sky-scene-v45'
$env:MINIAPP_SKY_FEEDBACK_ID=''
& npm.cmd run build:weapp --workspace '@starward/wechat-miniapp' *> $skyScene45Log
$skyScene45Code=$LASTEXITCODE
Add-Content -LiteralPath $skyScene45Log -Value "exitCode=$skyScene45Code" -Encoding utf8
Get-Content -LiteralPath $skyScene45Log -Tail 22
exit $skyScene45Code
