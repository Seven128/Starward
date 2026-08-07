[CmdletBinding()]
param(
    [Parameter(Mandatory = $true, Position = 0)]
    [ValidateSet('verify', 'diagnose-revision', 'final-gate')]
    [string]$Command,

    [Parameter(Mandatory = $true, Position = 1)]
    [string]$Workdir,

    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$AdditionalArguments
)

$ErrorActionPreference = 'Stop'

$repositoryRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..\..')).Path
$resolvedWorkdir = (Resolve-Path -LiteralPath (Join-Path $repositoryRoot $Workdir)).Path
$compatibilityScript = Join-Path $repositoryRoot 'tools\miniapp\apply-ty-context-harness-compatibility.mjs'
& node $compatibilityScript
if ($LASTEXITCODE -ne 0) {
    throw "wechat_long_task_harness_compatibility_failed:$LASTEXITCODE"
}
$runtimeBase = 'C:\Dev\.starward-tmp'
$runtimeBaseItem = Get-Item -LiteralPath $runtimeBase -ErrorAction SilentlyContinue
if ($null -eq $runtimeBaseItem) {
    $runtimeBaseItem = New-Item -ItemType Directory -Path $runtimeBase
}
if (-not $runtimeBaseItem.PSIsContainer) {
    throw 'wechat_long_task_temp_root_not_directory'
}
if (($runtimeBaseItem.Attributes -band [System.IO.FileAttributes]::ReparsePoint) -ne 0) {
    throw 'wechat_long_task_temp_root_must_be_physical'
}
$resolvedRuntimeBase = (Resolve-Path -LiteralPath $runtimeBase).Path
if ($resolvedRuntimeBase -cne $runtimeBase) {
    throw 'wechat_long_task_temp_root_identity_mismatch'
}

$invocationName = 'run-' + [guid]::NewGuid().ToString('N').Substring(0, 12)
$invocationRoot = Join-Path $runtimeBase $invocationName
$invocationRootItem = New-Item -ItemType Directory -Path $invocationRoot
if (($invocationRootItem.Attributes -band [System.IO.FileAttributes]::ReparsePoint) -ne 0) {
    throw 'wechat_long_task_invocation_root_must_be_physical'
}
$priorTemp = $env:TEMP
$priorTmp = $env:TMP
$exitCode = 1
$commandError = $null
try {
    $env:TEMP = $invocationRoot
    $env:TMP = $invocationRoot
    $cli = Join-Path $repositoryRoot 'node_modules\.bin\ty-context.cmd'
    & $cli long-task $Command $resolvedWorkdir @AdditionalArguments
    $exitCode = $LASTEXITCODE
}
catch {
    $commandError = $_
}
finally {
    $env:TEMP = $priorTemp
    $env:TMP = $priorTmp
}

$leakedSnapshots = @(
    Get-ChildItem -LiteralPath $invocationRoot -Directory -Force |
        Where-Object { $_.Name -like 'ty-context-*' }
)
$resolvedInvocationRoot = (Resolve-Path -LiteralPath $invocationRoot).Path
if (
    (Split-Path -Parent $resolvedInvocationRoot) -cne $runtimeBase -or
    (Split-Path -Leaf $resolvedInvocationRoot) -notmatch '^run-[0-9a-f]{12}$'
) {
    throw 'wechat_long_task_invocation_cleanup_target_invalid'
}
$cleanupError = $null
for ($attempt = 1; $attempt -le 20; $attempt += 1) {
    try {
        Remove-Item -LiteralPath $resolvedInvocationRoot -Recurse -Force
        $cleanupError = $null
        break
    }
    catch {
        $cleanupError = $_
        if ($attempt -lt 20) {
            Start-Sleep -Milliseconds 250
        }
    }
}
if (Test-Path -LiteralPath $resolvedInvocationRoot) {
    $cleanupDigest = [System.Convert]::ToHexString(
        [System.Security.Cryptography.SHA256]::HashData(
            [System.Text.Encoding]::UTF8.GetBytes([string]$cleanupError)
        )
    ).ToLowerInvariant()
    throw "wechat_long_task_invocation_cleanup_failed:$cleanupDigest"
}
if ($null -ne $commandError) {
    throw $commandError
}
if ($leakedSnapshots.Count -gt 0) {
    Write-Error "wechat_long_task_snapshot_cleanup_incomplete:$($leakedSnapshots.Count)"
    exit 1
}
exit $exitCode
