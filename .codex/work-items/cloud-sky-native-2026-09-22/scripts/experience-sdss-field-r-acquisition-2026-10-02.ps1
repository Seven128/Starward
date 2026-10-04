$ErrorActionPreference = 'Stop'
$taskOutput = [IO.Path]::GetFullPath((Join-Path (Get-Location).Path 'output/sdss-corrected-m51-1002'))
$taskRawFields = [IO.File]::ReadAllBytes((Join-Path $taskOutput 'target-field-response.csv'))
$taskReceipt = Get-Content -LiteralPath (Join-Path $taskOutput 'target-field-receipt.json') -Raw | ConvertFrom-Json
if ($taskReceipt.status -ne 200 -or $taskRawFields.Length -ne $taskReceipt.bytes -or [Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($taskRawFields)).ToLowerInvariant() -ne $taskReceipt.sha256) { throw 'actual_candidate_fields_changed' }
$taskRows = @(([Text.Encoding]::UTF8.GetString($taskRawFields) -split '\r?\n' | Where-Object {$_ -and -not $_.StartsWith('#')}) | ConvertFrom-Csv)
$taskExpectedIds = @('1237661362908495872','1237661362908561408','1237661362908626944','1237661435387248640','1237661435924054016','1237661435924119552','1237661435924185088')
if ($taskRows.Count -ne 7 -or @($taskRows | Where-Object {$_.fieldID -notin $taskExpectedIds -or $_.rerun -ne '301' -or $_.run -notin @('3699','3716') -or $_.camcol -notin @('5','6') -or $_.field -notmatch '^[0-9]{2,3}$'}).Count -ne 0 -or @($taskRows.fieldID | Select-Object -Unique).Count -ne 7) { throw 'bounded_field_set_invalid' }
$taskPlanPath = Join-Path $taskOutput 'field-r-acquisition-plan.json'
if (Test-Path -LiteralPath $taskPlanPath) { throw 'preserve_existing_r_acquisition_attempt' }
$taskExisting = Get-Content -LiteralPath (Join-Path $taskOutput 'frame-acquisition.json') -Raw | ConvertFrom-Json
$taskReused = @($taskExisting.sourceFiles | Where-Object {$_.identity.band -eq 'r'})
if ($taskReused.Count -ne 1) { throw 'existing_r_input_missing' }
$taskSourceDirectory = Join-Path $taskOutput 'sources'
$taskOldPath = Join-Path $taskSourceDirectory $taskReused[0].path
if ((Get-FileHash -LiteralPath $taskOldPath -Algorithm SHA256).Hash.ToLowerInvariant() -ne $taskReused[0].sha256) { throw 'existing_r_input_changed' }
$taskInputs = @($taskRows | Where-Object {$_.fieldID -ne '1237661362908561408'} | ForEach-Object {
    $taskRun = [int]$_.run; $taskCamcol = [int]$_.camcol; $taskField = [int]$_.field
    $taskName = 'frame-r-{0:d6}-{1}-{2:d4}.fits.bz2' -f $taskRun, $taskCamcol, $taskField
    @{path=$taskName; fieldId=$_.fieldID; identity=@{run=$taskRun;rerun='301';camcol=$taskCamcol;field=$taskField;band='r'}; url=('https://data.sdss.org/sas/dr17/eboss/photoObj/frames/301/' + $taskRun + '/' + $taskCamcol + '/' + $taskName)}
})
@{objectRef='M:51'; fieldResponseSha256=$taskReceipt.sha256; scope='Six new primary-field r inputs solely for actual WCS/stencil set-cover discovery; r does not certify gri or full target quality'; newFiles=$taskInputs; reused=$taskReused; retries=0} | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $taskPlanPath -Encoding utf8
$taskResults = [Collections.Generic.List[object]]::new()
foreach ($taskInput in $taskInputs) {
    $taskPath = [IO.Path]::GetFullPath((Join-Path $taskSourceDirectory $taskInput.path))
    if (-not $taskPath.StartsWith($taskSourceDirectory + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase) -or (Test-Path -LiteralPath $taskPath)) { throw 'r_path_invalid_or_existing' }
    $taskWatch = [Diagnostics.Stopwatch]::StartNew()
    try {
        $taskResponse = Invoke-WebRequest -Uri $taskInput.url -TimeoutSec 40 -SkipHttpErrorCheck
        $taskWatch.Stop(); $taskRaw = $taskResponse.RawContentStream.ToArray()
        if ($taskResponse.StatusCode -ne 200 -or $taskRaw.Length -lt 16 -or $taskRaw.Length -gt 16MB -or [Text.Encoding]::ASCII.GetString($taskRaw,0,3) -ne 'BZh') { throw 'r_response_not_accepted' }
        [IO.File]::WriteAllBytes($taskPath,$taskRaw)
        $taskRecord = @{path=$taskInput.path;fieldId=$taskInput.fieldId;identity=$taskInput.identity;url=$taskInput.url;state='RAW_ACQUIRED_UNCHECKED';bytes=$taskRaw.Length;sha256=[Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($taskRaw)).ToLowerInvariant();httpStatus=[int]$taskResponse.StatusCode;elapsedMs=$taskWatch.ElapsedMilliseconds;acquiredAt=[DateTimeOffset]::UtcNow.ToString('o')}
        $taskResults.Add($taskRecord); $taskRecord | ConvertTo-Json -Depth 5 -Compress
    } catch {
        $taskWatch.Stop(); $taskResults.Add(@{path=$taskInput.path;url=$taskInput.url;state='ACQUISITION_FAILED';elapsedMs=$taskWatch.ElapsedMilliseconds;exception=$_.Exception.GetType().Name;message=$_.Exception.Message})
        @{state='INCOMPLETE';sourceFiles=$taskResults.ToArray()} | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $taskOutput 'field-r-acquisition-partial.json') -Encoding utf8
        throw
    }
    @{state='RAW_ACQUIRED_UNCHECKED';sourceFiles=$taskResults.ToArray()} | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $taskOutput 'field-r-acquisition-progress.json') -Encoding utf8
}
@{objectRef='M:51';scope='Actual six new r payloads for geometry; scientific arrays/WCS and target demand await shared reader';state='RAW_ACQUIRED_UNCHECKED';sourceFiles=$taskResults.ToArray();reused=$taskReused;newSourceBytes=($taskResults | Measure-Object -Property bytes -Sum).Sum} | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $taskOutput 'field-r-acquisition.json') -Encoding utf8
