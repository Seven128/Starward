$ErrorActionPreference='Stop'
$skyPressure51Log=Join-Path $PSScriptRoot '../tmp/weapp-scene-v51-build.log'
$skyPressure51Build=Join-Path $PSScriptRoot '../../../../apps/wechat-miniapp/dist/weapp-check-sky-scene-v51-final'
if((Test-Path -LiteralPath $skyPressure51Log) -or (Test-Path -LiteralPath $skyPressure51Build)){throw 'Preserve existing evidence and candidates'}
$env:NODE_ENV='production'
$env:TARO_ENV='weapp'
$env:MINIAPP_API_BASE='http://127.0.0.1:60065'
$env:MINIAPP_OPERATOR_PREVIEW_TOKEN=''
$env:MINIAPP_ACCEPTANCE_DIAGNOSTICS='0'
$env:MINIAPP_DEVICE_REQUEST_DIAGNOSTICS='0'
$env:MINIAPP_DEVELOPMENT_FIXTURE_MODE='0'
$env:MINIAPP_ISOLATED_FIXTURE_BUILD='0'
$env:MINIAPP_ISOLATED_CHECK_BUILD='1'
$env:MINIAPP_ISOLATED_CHECK_BUILD_SLOT='sky-scene-v51-final'
$env:MINIAPP_SKY_FEEDBACK_ID=''
& npm.cmd run build:weapp --workspace '@starward/wechat-miniapp' *> $skyPressure51Log
$skyPressure51Exit=$LASTEXITCODE
Add-Content -LiteralPath $skyPressure51Log -Value "exitCode=$skyPressure51Exit" -Encoding utf8
Get-Content -LiteralPath $skyPressure51Log -Tail 12
exit $skyPressure51Exit
