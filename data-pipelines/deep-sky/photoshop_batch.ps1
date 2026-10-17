param(
    [Parameter(Mandatory)][string]$ConfigPath,
    [Parameter(Mandatory)][string]$ResultPath
)
$ErrorActionPreference = 'Stop'
$configFile = Get-Item -LiteralPath $ConfigPath
$taskRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../..'))
$resultFull = [IO.Path]::GetFullPath($ResultPath)
$benchmarkPrefix = [IO.Path]::GetFullPath((Join-Path $taskRoot 'output/image-tool-full-comparison-2026-10-08')) + [IO.Path]::DirectorySeparatorChar
$config = Get-Content -LiteralPath $configFile.FullName -Raw | ConvertFrom-Json -AsHashtable
$scriptFile = Join-Path $PSScriptRoot 'photoshop_batch.jsx'
if ($config.operation -in @('local-original-restoration', 'local-residual-median')) {
    $outputRoot = [IO.Path]::GetFullPath([string]$config.outputDirectory)
    $allowedPrefix = [IO.Path]::GetFullPath((Join-Path $taskRoot 'output')) + [IO.Path]::DirectorySeparatorChar
    if (!$outputRoot.StartsWith($allowedPrefix, [StringComparison]::OrdinalIgnoreCase) -or
        $configFile.Directory.FullName -ne $outputRoot) { throw 'photoshop_restoration_scope_invalid' }
    $benchmarkPrefix = $outputRoot + [IO.Path]::DirectorySeparatorChar
}
if (Test-Path -LiteralPath $resultFull) { throw 'photoshop_result_already_exists' }
if (!$resultFull.StartsWith($benchmarkPrefix, [StringComparison]::OrdinalIgnoreCase)) {
    throw 'photoshop_result_outside_benchmark'
}
if ((Get-FileHash -LiteralPath $scriptFile -Algorithm SHA256).Hash.ToLowerInvariant() -ne $config.jsxSha256) {
    throw 'photoshop_script_changed'
}
if ($config.jobs.Count -lt 1 -or $config.jobs.Count -gt 5) { throw 'photoshop_job_count_outside_bound' }
foreach ($pin in $config.vendorTools) {
    $item = Get-Item -LiteralPath $pin.path
    if ($item.Length -ne $pin.bytes -or (Get-FileHash -LiteralPath $item.FullName -Algorithm SHA256).Hash.ToLowerInvariant() -ne $pin.sha256) {
        throw 'photoshop_vendor_tool_changed'
    }
}
if ($config.ContainsKey('actionPath') -and (Get-FileHash -LiteralPath $config.actionPath -Algorithm SHA256).Hash.ToLowerInvariant() -ne $config.actionSha256) {
    throw 'photoshop_action_changed'
}
foreach ($job in $config.jobs) {
    if (!$job.sample -or $job.sample -notmatch '^[a-z0-9-]+$') { throw 'photoshop_sample_name_invalid' }
    if ($config.operation -eq 'local-residual-median' -and
        (!$job.ContainsKey('protectionMask') -or !$job.ContainsKey('medianRadiusPixels') -or
         ($job.medianRadiusPixels -isnot [long] -and $job.medianRadiusPixels -isnot [int]) -or
         $job.medianRadiusPixels -lt 1 -or $job.medianRadiusPixels -gt 100)) {
        throw 'photoshop_local_median_recipe_invalid'
    }
    if ((Get-FileHash -LiteralPath $job.input -Algorithm SHA256).Hash.ToLowerInvariant() -ne $job.inputSha256) {
        throw 'photoshop_input_changed'
    }
    if ($job.ContainsKey('protectionMask') -and (Get-FileHash -LiteralPath $job.protectionMask -Algorithm SHA256).Hash.ToLowerInvariant() -ne $job.protectionMaskSha256) {
        throw 'photoshop_mask_changed'
    }
    if ($job.ContainsKey('processedCandidate') -and
        (Get-FileHash -LiteralPath $job.processedCandidate -Algorithm SHA256).Hash.ToLowerInvariant() -ne $job.processedCandidateSha256) {
        throw 'photoshop_processed_candidate_changed'
    }
    foreach ($field in @('output', 'psd', 'raw', 'stars')) {
        if (!$job.ContainsKey($field)) { continue }
        $destination = [IO.Path]::GetFullPath($job[$field])
        if (!$destination.StartsWith($benchmarkPrefix, [StringComparison]::OrdinalIgnoreCase) -or (Test-Path -LiteralPath $destination)) {
            throw 'photoshop_destination_not_fresh_benchmark'
        }
    }
}
$timer = [Diagnostics.Stopwatch]::StartNew()
$application = $null
try {
    $application = New-Object -ComObject Photoshop.Application
    $connectionSeconds = $timer.Elapsed.TotalSeconds
    $scriptText = 'var benchmarkConfig=' + ($config | ConvertTo-Json -Depth 30 -Compress) + ';' + [IO.File]::ReadAllText($scriptFile)
    $rawResult = $application.DoJavaScript($scriptText)
    $result = $rawResult | ConvertFrom-Json -AsHashtable
    $result.connectionSeconds = $connectionSeconds
    $result.hostWallSeconds = $timer.Elapsed.TotalSeconds
    $result.comHost = 'Photoshop.Application / DoJavaScript / actual local desktop Photoshop'
    $encoded = $result | ConvertTo-Json -Depth 30
    $stream = [IO.File]::Open($resultFull, [IO.FileMode]::CreateNew)
    try {
        $bytes = [Text.UTF8Encoding]::new($false).GetBytes($encoded)
        $stream.Write($bytes, 0, $bytes.Length)
    } finally { $stream.Dispose() }
    @{status=$result.status; rows=$result.rows.Count; seconds=$result.hostWallSeconds} | ConvertTo-Json -Compress
} catch {
    # External account/license diagnostics must never be copied into evidence.
    @{status='FAILED_HOST'; errorType=$_.Exception.GetType().Name; hresult=$_.Exception.HResult} | ConvertTo-Json -Compress
    exit 1
} finally {
    if ($null -ne $application) { [void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($application) }
}
