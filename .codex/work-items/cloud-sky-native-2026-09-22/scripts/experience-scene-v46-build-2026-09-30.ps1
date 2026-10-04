$ErrorActionPreference='Stop'
$skyScene46Log=Join-Path $PSScriptRoot '../tmp/weapp-scene-v46-build.log'
$skyScene46Build=Join-Path $PSScriptRoot '../../../../apps/wechat-miniapp/dist/weapp-check-sky-scene-v46'
if((Test-Path -LiteralPath $skyScene46Log) -or (Test-Path -LiteralPath $skyScene46Build)){throw 'Preserve existing build evidence and candidate'}
$env:NODE_ENV='production'
$env:TARO_ENV='weapp'
$env:MINIAPP_API_BASE='http://127.0.0.1:60065'
$env:MINIAPP_OPERATOR_PREVIEW_TOKEN=''
$env:MINIAPP_ACCEPTANCE_DIAGNOSTICS='0'
$env:MINIAPP_DEVICE_REQUEST_DIAGNOSTICS='0'
$env:MINIAPP_DEVELOPMENT_FIXTURE_MODE='0'
$env:MINIAPP_ISOLATED_FIXTURE_BUILD='0'
$env:MINIAPP_ISOLATED_CHECK_BUILD='1'
$env:MINIAPP_ISOLATED_CHECK_BUILD_SLOT='sky-scene-v46'
$env:MINIAPP_SKY_FEEDBACK_ID=''
& npm.cmd run build:weapp --workspace '@starward/wechat-miniapp' *> $skyScene46Log
$skyScene46Code=$LASTEXITCODE
Add-Content -LiteralPath $skyScene46Log -Value "exitCode=$skyScene46Code" -Encoding utf8
Get-Content -LiteralPath $skyScene46Log -Tail 22
exit $skyScene46Code
