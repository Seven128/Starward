# Runs the real checkpoint script against local synthetic tool responses only.
# Function mocks fail closed: no WeChat, Node process, ADB or phone is contacted.
$ErrorActionPreference = 'Stop'
$taskHelper = Join-Path $PSScriptRoot 'f04-resource-checkpoint.ps1'
$taskTestRoot = Join-Path ([IO.Path]::GetTempPath()) ('starward-f04-checkpoint-test-' + [Guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $taskTestRoot | Out-Null
$taskCandidateFile = Join-Path $taskTestRoot 'candidate.json'
@{ resourceObservation = $true; bundleSha256 = ('b' * 64); sourceSha256 = ('a' * 64); project = 'synthetic-project'; bundle = 'synthetic-bundle' } |
  ConvertTo-Json | Set-Content -LiteralPath $taskCandidateFile -Encoding utf8NoBOM
$global:F04CheckpointFixture = @{
  platform = 'devtools'; processStart = '100'; memoryCalls = 0; cliCalls = 0
  readback = @{
    sourceSha256 = ('a' * 64); armConsumed = $false; droppedRows = 0
    current = @{ mapId = 'spot-map-1'; status = 'ready'; terrainAcknowledged = $true }
    selected = $null; rows = @(@{ atMs = 100 })
    resourceObservation = @{
      schema = 'starward-f04-resource-observation-v1'; droppedGroupObservations = 0; droppedCoordinators = 0
      groups = @(@{ mapId = 'spot-map-1'; label = '地形'; pinBalance = 1 })
    }
  }
}
function node {
  $taskArgs = @($args)
  $global:LASTEXITCODE = 0
  if ($taskArgs[0] -eq '--input-type=module') {
    if ($global:F04CheckpointFixture.preparedSha -and $taskArgs[-3] -ne $global:F04CheckpointFixture.preparedSha) {
      throw 'prepared_project_fingerprint_not_passed_to_guard'
    }
    '{"verified":true,"files":341}'; return
  }
  if ($taskArgs.Count -ne 7 -or $taskArgs[1] -notlike '*r17-sky-memory.mjs' -or $taskArgs[2] -ne 'once') {
    throw 'unexpected_synthetic_node_invocation'
  }
  $global:F04CheckpointFixture.memoryCalls++
  New-Item -ItemType Directory -Path $env:STARWARD_R17_MEMORY_ROOT -Force | Out-Null
  $taskProcessFile = Join-Path $env:STARWARD_R17_MEMORY_ROOT 'synthetic.process.private.ndjson'
  @{ target = @{ pid = '42'; name = 'synthetic-appbrand'; activity = 'synthetic-activity'; startTicks = $global:F04CheckpointFixture.processStart } } |
    ConvertTo-Json -Compress -Depth 6 | Set-Content -LiteralPath $taskProcessFile -Encoding utf8NoBOM
  @{ state = 'miniapp_foreground'; processInstanceVerified = $true } | ConvertTo-Json -Compress
  @{ processInstanceEvidence = $taskProcessFile } | ConvertTo-Json -Compress
}
function wechatide.cmd {
  if (@($args)[2] -ne 'automation_evaluate') { throw 'unexpected_synthetic_wechat_invocation' }
  if ([Console]::OutputEncoding.CodePage -ne 65001 -or $OutputEncoding.CodePage -ne 65001) {
    throw 'official_cli_json_must_be_decoded_as_utf8'
  }
  $taskFnIndex = [Array]::IndexOf(@($args), '--fnSource')
  if ($taskFnIndex -lt 0 -or @($args)[$taskFnIndex + 1] -match '[\r\n]') {
    throw 'windows_cmd_multiline_js_argument_unsupported'
  }
  $global:F04CheckpointFixture.cliCalls++
  $global:LASTEXITCODE = 0
  '[wechatide] synthetic read-only response'
  @{ ok = $true; result = @{ success = $true; result = @{ result = @{
    platform = $global:F04CheckpointFixture.platform; readback = $global:F04CheckpointFixture.readback
  } } } } | ConvertTo-Json -Depth 20
}
function Assert-Task($condition, [string]$message) { if (-not $condition) { throw $message } }
function Expect-TaskFailure([string]$phase, [string]$message) {
  $taskCaught = $false
  try { & $taskHelper -Candidate $taskCandidateFile -Phase $phase | Out-Null }
  catch {
    if (-not $_.Exception.Message.Contains($message)) { throw }
    $taskCaught = $true
  }
  Assert-Task $taskCaught ('expected_failure_' + $message)
}
Assert-Task ((Get-Command node).CommandType -eq 'Function') 'node_mock_missing'
Assert-Task ((Get-Command wechatide.cmd).CommandType -eq 'Function') 'wechat_mock_missing'

$taskSavedConsoleEncoding = [Console]::OutputEncoding
try {
  [Console]::OutputEncoding = [Text.Encoding]::GetEncoding(936)
  Expect-TaskFailure 'before' 'f04_resource_real_android_runtime_required'
  Assert-Task ([Console]::OutputEncoding.CodePage -eq 936) 'console_encoding_must_be_restored_after_readback'
} finally {
  [Console]::OutputEncoding = $taskSavedConsoleEncoding
}
Assert-Task ($global:F04CheckpointFixture.memoryCalls -eq 0) 'simulator_must_not_sample_phone_memory'
Assert-Task (-not (Test-Path -LiteralPath (Join-Path $taskTestRoot 'capture'))) 'simulator_must_not_create_checkpoint'

$global:F04CheckpointFixture.platform = 'android'
$taskPreparedCandidate = Get-Content -LiteralPath $taskCandidateFile -Raw | ConvertFrom-Json
$taskPreparedCandidate | Add-Member -MemberType NoteProperty -Name preparedProject -Value @{
  schema = 'starward-f04-prepared-project-v1'; sha256 = ('c' * 64); compiledBundleSha256 = ('b' * 64)
}
$taskPreparedCandidate | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $taskCandidateFile -Encoding utf8NoBOM
$global:F04CheckpointFixture.preparedSha = ('c' * 64)
& $taskHelper -Candidate $taskCandidateFile -Phase before | Out-Null
$taskCapture = Join-Path $taskTestRoot 'capture'
$taskBefore = Get-Content -LiteralPath (Join-Path $taskCapture 'before.json') -Raw | ConvertFrom-Json
Assert-Task ($taskBefore.readback.current.mapId -eq 'spot-map-1') 'baseline_readback_missing'
Assert-Task ($taskBefore.bundleSha256 -eq ('c' * 64) -and $taskBefore.compiledBundleSha256 -eq ('b' * 64)) 'prepared_and_compiled_fingerprints_mixed'
Assert-Task ((Get-Content -LiteralPath (Join-Path $taskCapture 'before.intent.json') -Raw | ConvertFrom-Json).status -eq 'COMPLETE') 'baseline_not_complete'
$taskCliCount = $global:F04CheckpointFixture.cliCalls
Expect-TaskFailure 'before' 'checkpoint_already_attempted'
Assert-Task ($global:F04CheckpointFixture.cliCalls -eq $taskCliCount) 'duplicate_checkpoint_must_not_invoke_tool'

$global:F04CheckpointFixture.readback.armConsumed = $true
$global:F04CheckpointFixture.readback.selected = @{ mapId = 'spot-map-1' }
$global:F04CheckpointFixture.readback.current.mapId = 'spot-map-2'
$global:F04CheckpointFixture.readback.rows[0].atMs = 101
Expect-TaskFailure 'after' 'f04_resource_runtime_changed_or_no_selected_mutation'
Assert-Task (-not (Test-Path -LiteralPath (Join-Path $taskCapture 'after.json'))) 'changed_runtime_must_not_save_after'
$global:F04CheckpointFixture.readback.rows[0].atMs = 100
& $taskHelper -Candidate $taskCandidateFile -Phase after | Out-Null
Assert-Task ((Get-Content -LiteralPath (Join-Path $taskCapture 'after.intent.json') -Raw | ConvertFrom-Json).status -eq 'COMPLETE') 'after_not_complete'

$global:F04CheckpointFixture.processStart = '101'
Expect-TaskFailure 'settled' 'f04_resource_process_instance_changed'
Assert-Task (Test-Path -LiteralPath (Join-Path $taskCapture 'settled.json')) 'process_mismatch_must_preserve_readback'
Assert-Task ((Get-Content -LiteralPath (Join-Path $taskCapture 'settled.intent.json') -Raw | ConvertFrom-Json).status -eq 'MEMORY_UNQUALIFIED_READBACK_PRESERVED') 'process_mismatch_falsely_qualified'
Write-Output 'PASS: simulator rejection; baseline/after save; duplicate rejection; restarted-runtime rejection; process-start mismatch preserves readback.'
Write-Output 'Synthetic tool responses only. Phone operations: none.'
