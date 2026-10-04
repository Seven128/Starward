$ErrorActionPreference='Stop'
$skyScene49Log=Join-Path $PSScriptRoot '../tmp/weapp-scene-v49-final-build.log'
$skyScene49Build=Join-Path $PSScriptRoot '../../../../apps/wechat-miniapp/dist/weapp-check-sky-scene-v49-final'
if((Test-Path -LiteralPath $skyScene49Log) -or (Test-Path -LiteralPath $skyScene49Build)){throw 'Preserve existing build evidence and candidate'}
$env:NODE_ENV='production'
$env:TARO_ENV='weapp'
$env:MINIAPP_API_BASE='http://127.0.0.1:60065'
$env:MINIAPP_OPERATOR_PREVIEW_TOKEN=''
$env:MINIAPP_ACCEPTANCE_DIAGNOSTICS='0'
$env:MINIAPP_DEVICE_REQUEST_DIAGNOSTICS='0'
$env:MINIAPP_DEVELOPMENT_FIXTURE_MODE='0'
$env:MINIAPP_ISOLATED_FIXTURE_BUILD='0'
$env:MINIAPP_ISOLATED_CHECK_BUILD='1'
$env:MINIAPP_ISOLATED_CHECK_BUILD_SLOT='sky-scene-v49-final'
$env:MINIAPP_SKY_FEEDBACK_ID=''
& npm.cmd run build:weapp --workspace '@starward/wechat-miniapp' *> $skyScene49Log
$skyScene49Code=$LASTEXITCODE
Add-Content -LiteralPath $skyScene49Log -Value "exitCode=$skyScene49Code" -Encoding utf8
Get-Content -LiteralPath $skyScene49Log -Tail 22
exit $skyScene49Code
