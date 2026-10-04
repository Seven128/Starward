$ErrorActionPreference='Stop'
$skyRuntimeTask=Split-Path -Parent $PSScriptRoot
$skyRuntimeProject='E:/dev/worktrees/Starward/remote-main-20260908/apps/wechat-miniapp/dist/weapp-check-sky-scene-v47'
$skyRuntimeLog=Join-Path $skyRuntimeTask 'tmp/v47-official-auto-cli.log'
$skyRuntimeSettings=Join-Path $skyRuntimeTask 'tmp/v47-official-auto-settings.json'
if((Test-Path -LiteralPath $skyRuntimeLog) -or (Test-Path -LiteralPath $skyRuntimeSettings)){throw 'Preserve prior official launch evidence; do not blindly relaunch'}
if(-not (Get-NetTCPConnection -State Listen -LocalPort 23977 -ErrorAction SilentlyContinue)){throw 'Existing IDE HTTP listener not confirmed; do not launch another IDE'}
$skyRuntimeAllocator=[Net.Sockets.TcpListener]::new([Net.IPAddress]::Loopback,0)
try{
  $skyRuntimeAllocator.Start()
  $skyRuntimePort=$skyRuntimeAllocator.LocalEndpoint.Port
}finally{$skyRuntimeAllocator.Stop()}
$skyRuntimeMetadata=@{
  recordedAtUtc=[DateTime]::UtcNow.ToString('o')
  project=$skyRuntimeProject
  ideHttpPort=23977
  automationPort=$skyRuntimePort
  intent='Official CLI auto on the same project; logged-in account, no test ticket or account substitution; no projectConfig override'
  publicApiPort=60065
  sourceAndService='Frozen v47 candidate and existing backend epoch preserved'
}
[IO.File]::WriteAllText($skyRuntimeSettings,($skyRuntimeMetadata|ConvertTo-Json -Depth 5),[Text.UTF8Encoding]::new($false))
& 'E:/微信web开发者工具/cli.bat' auto --project $skyRuntimeProject --auto-port $skyRuntimePort --port 23977 --trust-project *> $skyRuntimeLog
$skyRuntimeExitCode=$LASTEXITCODE
Add-Content -LiteralPath $skyRuntimeLog -Value "exitCode=$skyRuntimeExitCode" -Encoding utf8
Get-Content -LiteralPath $skyRuntimeLog -Tail 12
@{automationPort=$skyRuntimePort;cliExitCode=$skyRuntimeExitCode}|ConvertTo-Json -Compress
exit $skyRuntimeExitCode
