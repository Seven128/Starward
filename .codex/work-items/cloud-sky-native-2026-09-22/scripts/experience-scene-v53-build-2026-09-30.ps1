$ErrorActionPreference='Stop'
$skyEnvironment53Log=Join-Path $PSScriptRoot '../tmp/weapp-scene-v53-build.log'
$skyEnvironment53Build=Join-Path $PSScriptRoot '../../../../apps/wechat-miniapp/dist/weapp-check-sky-scene-v53-final'
if((Test-Path -LiteralPath $skyEnvironment53Log) -or (Test-Path -LiteralPath $skyEnvironment53Build)){throw 'Preserve existing evidence and candidates'}
$env:NODE_ENV='production'
$env:TARO_ENV='weapp'
$env:MINIAPP_API_BASE='http://127.0.0.1:60065'
$env:MINIAPP_OPERATOR_PREVIEW_TOKEN=''
$env:MINIAPP_ACCEPTANCE_DIAGNOSTICS='0'
$env:MINIAPP_DEVICE_REQUEST_DIAGNOSTICS='0'
$env:MINIAPP_DEVELOPMENT_FIXTURE_MODE='0'
$env:MINIAPP_ISOLATED_FIXTURE_BUILD='0'
$env:MINIAPP_ISOLATED_CHECK_BUILD='1'
$env:MINIAPP_ISOLATED_CHECK_BUILD_SLOT='sky-scene-v53-final'
$env:MINIAPP_SKY_FEEDBACK_ID=''
& npm.cmd run build:weapp --workspace '@starward/wechat-miniapp' *> $skyEnvironment53Log
$skyEnvironment53Exit=$LASTEXITCODE
Add-Content -LiteralPath $skyEnvironment53Log -Value "exitCode=$skyEnvironment53Exit" -Encoding utf8
Get-Content -LiteralPath $skyEnvironment53Log -Tail 12
exit $skyEnvironment53Exit
