# Read the already-authorized client credential only in memory. Never log raw CLI
# output: status can contain account data. Auth starts only the official client
# authorization flow; pending is never considered success.
param(
  [ValidateSet('status', 'auth', 'poll')][string]$Operation = 'status',
  [string]$TaskId
)
$ErrorActionPreference = 'Stop'
$configText = Get-Content -LiteralPath 'C:/Users/777/.codex/config.toml' -Raw
$section = [regex]::Match($configText, '(?ms)^\[mcp_servers\.wechatide\]\s*\r?\n(.*?)(?=^\[|\z)').Groups[1].Value
$literal = [regex]::Match($section, '(?ms)^args\s*=\s*(\[.*?\])').Groups[1].Value
$clientArgs = @($literal | ConvertFrom-Json)
$tokenIndex = [array]::IndexOf($clientArgs, '--token')
if ($tokenIndex -lt 0 -or $tokenIndex + 1 -ge $clientArgs.Count) { throw 'Configured MCP credential unavailable' }
$credential = $clientArgs[$tokenIndex + 1]
$raw = switch ($Operation) {
  'status' { & wechatide -c Codex check_wechatide_status --skill-version 0.3.10 ('--token=' + $credential) 2>&1 }
  'auth' { & wechatide auth -c Codex 2>&1 }
  'poll' {
    if (-not $TaskId) { throw 'A returned pending task ID is required' }
    & wechatide -c Codex polling_task_result --task-id $TaskId ('--token=' + $credential) 2>&1
  }
}
$invocationExit = $LASTEXITCODE
$sanitized = ($raw -join "`n").Replace($credential, '[REDACTED]')
$jsonStart = $sanitized.IndexOf('{')
if ($jsonStart -lt 0) { throw 'Status did not return a JSON result; raw output withheld' }
$response = $sanitized.Substring($jsonStart) | ConvertFrom-Json -AsHashtable
$observed = [ordered]@{}
function Read-StatusFields($node, $path) {
  if ($node -isnot [System.Collections.IDictionary]) { return }
  foreach ($key in $node.Keys) {
    $value = $node[$key]
    $fieldPath = if ($path) { "$path.$key" } else { $key }
    if ($key -in @('ok', 'success', 'code', 'message', 'status', 'taskId', 'errorType', 'reason', 'versionRelation', 'loginExpired', 'cliTokenRequired', 'tokenRequired', 'mcpTokenRequired', 'skillVersion', 'version')) {
      if ($value -is [string] -and $value.Length -gt 400) { $value = '[long status text withheld]' }
      if ($value -isnot [System.Collections.IDictionary] -and $value -isnot [array]) { $observed[$fieldPath] = $value }
    }
    if ($value -is [System.Collections.IDictionary]) { Read-StatusFields $value $fieldPath }
  }
}
Read-StatusFields $response ''
$record = [ordered]@{ at = [DateTime]::UtcNow.ToString('o'); operation = $Operation; invocationExit = $invocationExit; credentialProvided = $Operation -ne 'auth'; status = $observed }
$record | ConvertTo-Json -Depth 8 | Tee-Object -FilePath (Join-Path $PSScriptRoot "evidence/wechatide-$Operation-latest.json")
exit $invocationExit
