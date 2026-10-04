# The caller explicitly selects safe result fields. Never pipe the complete
# returned object to a log: runtime/page/network values can include private data.
function Invoke-StarwardWechatTool {
  param([Parameter(Mandatory)][string]$Tool, [string[]]$ToolArguments = @())
  $configText = Get-Content -LiteralPath 'C:/Users/777/.codex/config.toml' -Raw
  $section = [regex]::Match($configText, '(?ms)^\[mcp_servers\.wechatide\]\s*\r?\n(.*?)(?=^\[|\z)').Groups[1].Value
  $literal = [regex]::Match($section, '(?ms)^args\s*=\s*(\[.*?\])').Groups[1].Value
  $clientArgs = @($literal | ConvertFrom-Json)
  $tokenIndex = [array]::IndexOf($clientArgs, '--token')
  if ($tokenIndex -lt 0 -or $tokenIndex + 1 -ge $clientArgs.Count) { throw 'Configured MCP credential unavailable' }
  $credential = $clientArgs[$tokenIndex + 1]
  # The installed .cmd wrapper expands %* and loses JSON quote characters.
  # Invoke the same official entry as tools/miniapp/development-official.mjs.
  $installRoot = 'E:/微信web开发者工具'
  $executable = Join-Path $installRoot '微信开发者工具.exe'
  $entry = Join-Path $installRoot 'resources/app.asar.unpacked/js/common/cli/skill-index.js'
  $bootstrap = "const e=process.argv[1],a=process.argv.slice(2);process.argv=[process.execPath,e,'--electron'].concat(a);require(e)"
  $startInfo = [System.Diagnostics.ProcessStartInfo]::new($executable)
  $startInfo.WorkingDirectory = $installRoot
  $startInfo.UseShellExecute = $false
  $startInfo.CreateNoWindow = $true
  $startInfo.RedirectStandardOutput = $true
  $startInfo.RedirectStandardError = $true
  $startInfo.Environment['cwd'] = (Get-Location).Path
  $startInfo.Environment['ELECTRON'] = $executable
  $startInfo.Environment['ELECTRON_RUN_AS_NODE'] = '1'
  foreach ($argument in @('-e', $bootstrap, $entry, '-c', 'Codex', $Tool) + $ToolArguments + @('--token=' + $credential)) {
    $startInfo.ArgumentList.Add($argument)
  }
  $process = [System.Diagnostics.Process]::Start($startInfo)
  $stdoutTask = $process.StandardOutput.ReadToEndAsync()
  $stderrTask = $process.StandardError.ReadToEndAsync()
  try {
    if (-not $process.WaitForExit(45000)) {
      $process.Kill()
      throw 'Official CLI timed out; response withheld; do not replay a mutation'
    }
    $sanitized = $stdoutTask.GetAwaiter().GetResult().Replace($credential, '[REDACTED]')
    $null = $stderrTask.GetAwaiter().GetResult()
  } finally {
    $process.Dispose()
  }
  $jsonStart = $sanitized.IndexOf('{')
  if ($jsonStart -lt 0) { throw 'Tool did not return JSON; raw output withheld' }
  # Preserve JSON timestamps as contract strings; implicit DateTime conversion
  # breaks exact frame/context guards in task callers.
  return ($sanitized.Substring($jsonStart) | ConvertFrom-Json -AsHashtable -DateKind String)
}
