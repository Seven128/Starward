$ErrorActionPreference = 'Stop'
$taskRoot = [IO.Path]::GetFullPath((Get-Location).Path)
$taskOutput = Join-Path $taskRoot 'output/sdss-corrected-m51-1002'
$taskGeometryDirectory = Join-Path $taskRoot 'output/sdss-m51-field-geometry-1002'
$taskPlanBytes = [IO.File]::ReadAllBytes((Join-Path $taskGeometryDirectory 'selected-gi-plan.json'))
$taskPlan = [Text.Encoding]::UTF8.GetString($taskPlanBytes) | ConvertFrom-Json
$taskGeometryBytes = [IO.File]::ReadAllBytes((Join-Path $taskRoot $taskPlan.geometryReport.path))
$taskCasBytes = [IO.File]::ReadAllBytes((Join-Path $taskRoot $taskPlan.casResponse.path))
foreach ($taskCheck in @(@{raw=$taskGeometryBytes;expected=$taskPlan.geometryReport},@{raw=$taskCasBytes;expected=$taskPlan.casResponse})) {
    if ($taskCheck.raw.Length -ne $taskCheck.expected.bytes -or [Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($taskCheck.raw)).ToLowerInvariant() -ne $taskCheck.expected.sha256) { throw 'geometry_or_actual_cas_input_changed' }
}
$taskExpected = @('3699/6/99','3699/6/101','3716/6/116','3716/6/117','3716/6/118')
$taskKeys = [Collections.Generic.List[string]]::new()
if ($taskPlan.objectRef -ne 'M:51' -or $taskPlan.sourceFiles.Count -ne 10 -or $taskPlan.retries -ne 0) { throw 'bounded_gi_plan_invalid' }
foreach ($taskInput in $taskPlan.sourceFiles) {
    $taskIdentity = $taskInput.identity
    $taskFieldKey = '{0}/{1}/{2}' -f $taskIdentity.run,$taskIdentity.camcol,$taskIdentity.field
    $taskName = 'frame-{0}-{1:d6}-{2}-{3:d4}.fits.bz2' -f $taskIdentity.band,[int]$taskIdentity.run,[int]$taskIdentity.camcol,[int]$taskIdentity.field
    $taskUrl = 'https://data.sdss.org/sas/dr17/eboss/photoObj/frames/301/' + $taskIdentity.run + '/' + $taskIdentity.camcol + '/' + $taskName
    if ($taskFieldKey -notin $taskExpected -or $taskIdentity.band -notin @('g','i') -or $taskIdentity.rerun -ne '301' -or $taskInput.path -ne $taskName -or $taskInput.url -ne $taskUrl) { throw 'gri_field_or_canonical_url_invalid' }
    $taskKeys.Add($taskFieldKey + '/' + $taskIdentity.band)
}
if (@($taskKeys | Select-Object -Unique).Count -ne 10) { throw 'gri_plan_contains_duplicate_or_missing_band' }
$taskFinalPlanPath = Join-Path $taskOutput 'field-gi-acquisition-plan.json'
if (Test-Path -LiteralPath $taskFinalPlanPath) { throw 'preserve_existing_gi_acquisition_attempt' }
$taskExisting = Get-Content -LiteralPath (Join-Path $taskOutput 'frame-acquisition.json') -Raw | ConvertFrom-Json
$taskSourceDirectory = [IO.Path]::GetFullPath((Join-Path $taskOutput 'sources'))
foreach ($taskReused in $taskExisting.sourceFiles) {
    $taskOldPath = [IO.Path]::GetFullPath((Join-Path $taskSourceDirectory $taskReused.path))
    if (-not $taskOldPath.StartsWith($taskSourceDirectory + [IO.Path]::DirectorySeparatorChar,[StringComparison]::OrdinalIgnoreCase) -or (Get-Item -LiteralPath $taskOldPath).Length -ne $taskReused.bytes -or (Get-FileHash -LiteralPath $taskOldPath -Algorithm SHA256).Hash.ToLowerInvariant() -ne $taskReused.sha256) { throw 'existing_single_field_input_changed' }
}
@{objectRef='M:51';scope='Only g/i counterparts of actual buffered minimal r field set; each new band still requires actual WCS/stencil union validation';selectedPlanSha256=[Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($taskPlanBytes)).ToLowerInvariant();geometryReport=$taskPlan.geometryReport;newFiles=$taskPlan.sourceFiles;reused=$taskExisting.sourceFiles;retries=0;payloadAdmissionBytes=16MB;streamingTransferLimit=$false} | ConvertTo-Json -Depth 9 | Set-Content -LiteralPath $taskFinalPlanPath -Encoding utf8
$taskResults = [Collections.Generic.List[object]]::new()
foreach ($taskInput in $taskPlan.sourceFiles) {
    $taskPath = [IO.Path]::GetFullPath((Join-Path $taskSourceDirectory $taskInput.path))
    if (-not $taskPath.StartsWith($taskSourceDirectory + [IO.Path]::DirectorySeparatorChar,[StringComparison]::OrdinalIgnoreCase) -or (Test-Path -LiteralPath $taskPath)) { throw 'gi_path_invalid_or_existing' }
    $taskWatch = [Diagnostics.Stopwatch]::StartNew()
    try {
        $taskResponse = Invoke-WebRequest -Uri $taskInput.url -TimeoutSec 40 -SkipHttpErrorCheck
        $taskWatch.Stop(); $taskRaw = $taskResponse.RawContentStream.ToArray()
        if ($taskResponse.StatusCode -ne 200 -or $taskRaw.Length -lt 16 -or $taskRaw.Length -gt 16MB -or [Text.Encoding]::ASCII.GetString($taskRaw,0,3) -ne 'BZh') { throw 'gi_response_not_accepted' }
        $taskStream = [IO.File]::Open($taskPath,[IO.FileMode]::CreateNew,[IO.FileAccess]::Write,[IO.FileShare]::None)
        try { $taskStream.Write($taskRaw,0,$taskRaw.Length) } finally { $taskStream.Dispose() }
        $taskRecord = @{path=$taskInput.path;identity=$taskInput.identity;url=$taskInput.url;state='RAW_ACQUIRED_UNCHECKED';bytes=$taskRaw.Length;sha256=[Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($taskRaw)).ToLowerInvariant();httpStatus=[int]$taskResponse.StatusCode;elapsedMs=$taskWatch.ElapsedMilliseconds;acquiredAt=[DateTimeOffset]::UtcNow.ToString('o')}
        $taskResults.Add($taskRecord); $taskRecord | ConvertTo-Json -Depth 5 -Compress
    } catch {
        $taskWatch.Stop(); $taskResults.Add(@{path=$taskInput.path;url=$taskInput.url;state='ACQUISITION_FAILED';elapsedMs=$taskWatch.ElapsedMilliseconds;exception=$_.Exception.GetType().Name;message=$_.Exception.Message})
        @{state='INCOMPLETE';sourceFiles=$taskResults.ToArray()} | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $taskOutput 'field-gi-acquisition-partial.json') -Encoding utf8
        throw
    }
    @{state='RAW_ACQUIRED_UNCHECKED';sourceFiles=$taskResults.ToArray()} | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $taskOutput 'field-gi-acquisition-progress.json') -Encoding utf8
}
@{objectRef='M:51';scope='Actual ten new g/i payloads solely for shared reader admission, per-band target coverage and offline mosaic trial';state='RAW_ACQUIRED_UNCHECKED';sourceFiles=$taskResults.ToArray();reused=$taskExisting.sourceFiles;newSourceBytes=($taskResults | Measure-Object -Property bytes -Sum).Sum} | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $taskOutput 'field-gi-acquisition.json') -Encoding utf8
