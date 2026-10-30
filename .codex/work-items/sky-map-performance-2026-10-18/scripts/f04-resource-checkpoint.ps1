param(
  [Parameter(Mandatory = $true)][string]$Candidate,
  [Parameter(Mandatory = $true)][ValidateSet('before', 'after', 'settled')][string]$Phase
)

# User-invoked, read-only phone observation. Never arms, reloads or changes input.
# Three explicit checkpoints reuse the existing guarded process-memory owner.
$ErrorActionPreference = 'Stop'
# A user may invoke the entry from the legacy Windows PowerShell shortcut.
# Re-enter before reading UTF-8 JSON or executing any phone observation.
if ($PSVersionTable.PSVersion.Major -lt 7) {
  $taskPowerShell7 = @(Get-Command pwsh -CommandType Application -ErrorAction Stop)[0].Source
  & $taskPowerShell7 -NoProfile -File $PSCommandPath -Candidate $Candidate -Phase $Phase
  if ($LASTEXITCODE -ne 0) { throw 'f04_resource_checkpoint_failed_in_pwsh7_see_previous_error' }
  return
}
$taskRepo = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../../../..'))
$taskCandidatePath = (Resolve-Path -LiteralPath $Candidate).Path
$taskCandidate = Get-Content -LiteralPath $taskCandidatePath -Raw -Encoding utf8 | ConvertFrom-Json
if ($taskCandidate.resourceObservation -ne $true -or
    $taskCandidate.bundleSha256 -notmatch '^[a-f0-9]{64}$' -or
    $taskCandidate.sourceSha256 -notmatch '^[a-f0-9]{64}$') { throw 'f04_resource_candidate_required' }
$taskExpectedProjectSha = $taskCandidate.bundleSha256
if ($null -ne $taskCandidate.preparedProject) {
  if ($taskCandidate.preparedProject.schema -ne 'starward-f04-prepared-project-v1' -or
      $taskCandidate.preparedProject.sha256 -notmatch '^[a-f0-9]{64}$' -or
      $taskCandidate.preparedProject.compiledBundleSha256 -ne $taskCandidate.bundleSha256) {
    throw 'f04_resource_prepared_project_binding_invalid'
  }
  $taskExpectedProjectSha = $taskCandidate.preparedProject.sha256
}
$taskPrivateRoot = Split-Path -Parent $taskCandidatePath
$taskCaptureRoot = Join-Path $taskPrivateRoot 'capture'
$taskCheckpoint = Join-Path $taskCaptureRoot ($Phase + '.json')
$taskIntent = Join-Path $taskCaptureRoot ($Phase + '.intent.json')
if ((Test-Path -LiteralPath $taskCheckpoint) -or (Test-Path -LiteralPath $taskIntent)) {
  throw 'checkpoint_already_attempted_inspect_result_do_not_repeat'
}

$taskVerifySource = @'
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { readFile } from 'node:fs/promises';
const [root, project, expected, compiledPath, compiledSha] = process.argv.slice(1);
const { projectBinding } = await import(pathToFileURL(path.join(root, 'tools/miniapp/device-session.mjs')));
const { fingerprintBundle } = await import(pathToFileURL(path.join(root, 'tools/miniapp/release-bundle-artifact.mjs')));
const compiled = await fingerprintBundle(compiledPath);
if (compiled.sha256 !== compiledSha) throw Error('f04_resource_compiled_bundle_changed');
const binding = await projectBinding(project);
if (binding.sha256 !== expected) throw Error('f04_resource_candidate_bytes_changed');
if (expected !== compiledSha) {
  const prepared = await fingerprintBundle(binding.bundle);
  const byPath = new Map(prepared.files.map(file => [file.path, file]));
  for (const file of compiled.files) {
    const actual = byPath.get(file.path);
    if (!actual || actual.sha256 !== file.sha256 || actual.bytes !== file.bytes) throw Error('f04_resource_compiled_file_changed');
    byPath.delete(file.path);
  }
  // The only qualified IDE addition is an inert comment stylesheet. The full
  // prepared SHA still applies; no path or arbitrary content is ignored.
  const extra = [...byPath.values()];
  if (extra.length !== 1 || extra[0].path !== 'pages/my/index.wxss' || extra[0].bytes !== 25 ||
      (await readFile(path.join(binding.bundle, extra[0].path), 'utf8')).trim() !== '/* pages/my/index.wxss */') {
    throw Error('f04_resource_unqualified_prepared_addition');
  }
}
console.log(JSON.stringify({ verified: true, files: binding.fileCount }));
'@
$taskVerify = & node --input-type=module -e $taskVerifySource $taskRepo $taskCandidate.project $taskExpectedProjectSha $taskCandidate.bundle $taskCandidate.bundleSha256
if ($LASTEXITCODE -ne 0) { throw 'f04_resource_host_candidate_verification_failed' }

$taskReadbackSource = @'
function() {
  const probe = globalThis.__STARWARD_F04__;
  if (!probe) return { platform: wx.getSystemInfoSync().platform, readback: null };
  return { platform: wx.getSystemInfoSync().platform, readback: probe.readback() };
}
'@
# The official Windows .cmd entry does not preserve a multiline JS argument.
# This function has no line comments, so normalize it before crossing that boundary.
$taskReadbackSource = $taskReadbackSource -replace '\r?\n', ' '
$taskStarted = [DateTime]::UtcNow.ToString('o')
$taskPriorConsoleEncoding = [Console]::OutputEncoding
$taskPriorOutputEncoding = $OutputEncoding
try {
  [Console]::OutputEncoding = [Text.UTF8Encoding]::new($false)
  $OutputEncoding = [Console]::OutputEncoding
  $taskCliLines = & wechatide.cmd -c Codex automation_evaluate --project $taskCandidate.project --fnSource $taskReadbackSource
  if ($LASTEXITCODE -ne 0) { throw 'f04_resource_official_readback_failed' }
} finally {
  [Console]::OutputEncoding = $taskPriorConsoleEncoding
  $OutputEncoding = $taskPriorOutputEncoding
}
$taskCliText = $taskCliLines -join "`n"
if ($taskCliText.Length -gt 500000) { throw 'f04_resource_readback_unbounded' }
$taskJsonStart = $taskCliText.IndexOf('{')
if ($taskJsonStart -lt 0) { throw 'f04_resource_readback_missing' }
$taskEnvelope = $taskCliText.Substring($taskJsonStart) | ConvertFrom-Json
if ($taskEnvelope.ok -ne $true -or $taskEnvelope.result.success -ne $true) { throw 'f04_resource_official_readback_rejected' }
$taskRuntime = $taskEnvelope.result
for ($taskDepth = 0; $taskDepth -lt 4 -and -not ($taskRuntime.PSObject.Properties.Name -contains 'platform'); $taskDepth++) {
  $taskRuntime = $taskRuntime.result
  if ($null -eq $taskRuntime) { throw 'f04_resource_readback_shape_changed' }
}
$taskReadback = $taskRuntime.readback
if ($taskRuntime.platform -ne 'android') { throw 'f04_resource_real_android_runtime_required' }
if ($null -eq $taskReadback -or $taskReadback.sourceSha256 -ne $taskCandidate.sourceSha256 -or
    $taskReadback.resourceObservation.schema -ne 'starward-f04-resource-observation-v1') { throw 'f04_resource_phone_candidate_mismatch' }
if ($taskReadback.droppedRows -ne 0 -or $taskReadback.resourceObservation.droppedGroupObservations -ne 0 -or
    $taskReadback.resourceObservation.droppedCoordinators -ne 0 -or @($taskReadback.rows).Count -eq 0) { throw 'f04_resource_observation_incomplete' }

$taskBaselinePath = Join-Path $taskCaptureRoot 'before.json'
if ($Phase -eq 'before') {
  if ($taskReadback.armConsumed -ne $false -or $taskReadback.current.status -ne 'ready' -or
      $taskReadback.current.terrainAcknowledged -ne $true -or
      @($taskReadback.resourceObservation.groups | Where-Object { $_.mapId -eq $taskReadback.current.mapId -and $_.label -eq '地形' -and $_.pinBalance -gt 0 }).Count -ne 1) {
    throw 'f04_resource_baseline_requires_ready_terrain_and_unused_arm'
  }
} else {
  $taskBaseline = Get-Content -LiteralPath $taskBaselinePath -Raw -Encoding utf8 | ConvertFrom-Json
  if ($taskBaseline.bundleSha256 -ne $taskExpectedProjectSha -or
      $taskBaseline.readback.rows[0].atMs -ne $taskReadback.rows[0].atMs -or
      $taskBaseline.readback.current.mapId -ne $taskReadback.selected.mapId -or
      $taskReadback.armConsumed -ne $true) { throw 'f04_resource_runtime_changed_or_no_selected_mutation' }
  if ($Phase -eq 'settled' -and -not (Test-Path -LiteralPath (Join-Path $taskCaptureRoot 'after.json'))) {
    throw 'f04_resource_after_checkpoint_required'
  }
}

New-Item -ItemType Directory -Path $taskCaptureRoot -Force | Out-Null
$taskOperation = [ordered]@{ phase = $Phase; startedAt = $taskStarted; status = 'READBACK_SAVED_MEMORY_PENDING';
  candidateSha256 = $taskExpectedProjectSha; compiledBundleSha256 = $taskCandidate.bundleSha256; phoneInputSent = $false }
$taskOperation | ConvertTo-Json | Set-Content -LiteralPath $taskIntent -Encoding utf8NoBOM
[ordered]@{ schema = 'starward-f04-resource-checkpoint-v1'; phase = $Phase; startedAt = $taskStarted;
  readbackCompletedAt = [DateTime]::UtcNow.ToString('o'); bundleSha256 = $taskExpectedProjectSha; compiledBundleSha256 = $taskCandidate.bundleSha256;
  platform = $taskRuntime.platform; readback = $taskReadback; inputSent = $false
} | ConvertTo-Json -Depth 16 | Set-Content -LiteralPath $taskCheckpoint -Encoding utf8NoBOM

$taskPriorMemoryRoot = $env:STARWARD_R17_MEMORY_ROOT
try {
  $env:STARWARD_R17_MEMORY_ROOT = Join-Path $taskCaptureRoot ('memory-' + $Phase)
  $taskMemoryLines = & node (Join-Path $taskRepo 'tools/run-node.cjs') (Join-Path $PSScriptRoot 'r17-sky-memory.mjs') once ('f04-' + $Phase) 1 2000 wireless
  $taskMemoryExit = $LASTEXITCODE
  $taskMemoryText = $taskMemoryLines -join "`n"
  $taskMemoryText | Set-Content -LiteralPath (Join-Path $taskCaptureRoot ($Phase + '.memory-output.txt')) -Encoding utf8NoBOM
  $taskMemoryRows = @($taskMemoryLines | ForEach-Object { $_ | ConvertFrom-Json })
  $taskVerifiedRows = @($taskMemoryRows | Where-Object { $_.state -eq 'miniapp_foreground' -and $_.processInstanceVerified -eq $true })
  if ($taskMemoryExit -ne 0 -or $taskVerifiedRows.Count -ne 1) { throw 'f04_resource_memory_point_unavailable_readback_preserved' }
  $taskProcessFile = @($taskMemoryRows | Where-Object { $_.processInstanceEvidence })[0].processInstanceEvidence
  $taskInstance = Get-Content -LiteralPath $taskProcessFile -Raw -Encoding utf8 | ConvertFrom-Json
  # Exact process/start identity is retained only in the existing private owner.
  $taskProcessBindingPath = Join-Path $taskCaptureRoot 'process-binding.private.json'
  if ($Phase -eq 'before') {
    $taskInstance.target | ConvertTo-Json | Set-Content -LiteralPath $taskProcessBindingPath -Encoding utf8NoBOM
  } else {
    $taskBoundProcess = Get-Content -LiteralPath $taskProcessBindingPath -Raw -Encoding utf8 | ConvertFrom-Json
    foreach ($taskProperty in @('pid', 'name', 'activity', 'startTicks')) {
      if ($taskBoundProcess.$taskProperty -ne $taskInstance.target.$taskProperty) { throw 'f04_resource_process_instance_changed' }
    }
  }
  $taskOperation.status = 'COMPLETE'
  Write-Output ($Phase + ': saved; candidate and foreground process verified. Phone input sent: false.')
  Write-Output ('Files: ' + $taskCaptureRoot)
} catch {
  $taskOperation.status = 'MEMORY_UNQUALIFIED_READBACK_PRESERVED'
  $taskOperation.error = $_.Exception.Message
  throw
} finally {
  $env:STARWARD_R17_MEMORY_ROOT = $taskPriorMemoryRoot
  $taskOperation.endedAt = [DateTime]::UtcNow.ToString('o')
  $taskOperation | ConvertTo-Json | Set-Content -LiteralPath $taskIntent -Encoding utf8NoBOM
}
