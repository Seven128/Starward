$ErrorActionPreference = 'Stop'
$taskOutput = [IO.Path]::GetFullPath((Join-Path (Get-Location).Path 'output/sdss-corrected-m51-1002'))
$taskFieldsRaw = [IO.File]::ReadAllBytes((Join-Path $taskOutput 'center-field-response.csv'))
$taskFieldsReceipt = Get-Content -LiteralPath (Join-Path $taskOutput 'center-field-receipt.json') -Raw | ConvertFrom-Json
$taskFieldsHash = [Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($taskFieldsRaw)).ToLowerInvariant()
if ($taskFieldsReceipt.status -ne 200 -or $taskFieldsReceipt.sha256 -ne $taskFieldsHash -or $taskFieldsReceipt.bytes -ne $taskFieldsRaw.Length) { throw 'field_response_changed' }
$taskFieldRows = @(([Text.Encoding]::UTF8.GetString($taskFieldsRaw) -split '\r?\n' | Where-Object {$_ -and -not $_.StartsWith('#')}) | ConvertFrom-Csv)
if ($taskFieldRows.Count -ne 1) { throw 'one_primary_field_required' }
$taskField = $taskFieldRows[0]
if ($taskField.fieldID -ne '1237661362908561408' -or $taskField.rerun -ne '301' -or $taskField.run -ne '3699' -or $taskField.camcol -ne '6' -or $taskField.field -ne '100') { throw 'bounded_actual_m51_field_changed' }
if (Test-Path -LiteralPath (Join-Path $taskOutput 'frame-acquisition-plan.json')) { throw 'preserve_existing_acquisition_attempt' }
$taskSourceDirectory = Join-Path $taskOutput 'sources'
[IO.Directory]::CreateDirectory($taskSourceDirectory) | Out-Null
$taskInputs = @('g', 'r', 'i') | ForEach-Object {
    $taskName = 'frame-' + $_ + '-003699-6-0100.fits.bz2'
    @{path=$taskName; band=$_; identity=@{run=3699; rerun='301'; camcol=6; field=100; band=$_}; url=('https://data.sdss.org/sas/dr17/eboss/photoObj/frames/301/3699/6/' + $taskName)}
}
@{objectRef='M:51'; scope='Exactly one CAS-returned primary center field, three corrected bands; no full overview coverage/quality claim or publication'; fieldId=$taskField.fieldID; fieldResponseSha256=$taskFieldsHash; sourceFiles=$taskInputs; policyUrl='https://www.sdss.org/collaboration/image-use-policy/'; dataModelUrl='https://data.sdss.org/datamodel/files/BOSS_PHOTOOBJ/frames/RERUN/RUN/CAMCOL/frame.html'; documentationUrl='https://www.sdss4.org/dr17/imaging/images/'; credit='Sloan Digital Sky Survey'; runtimeNetwork='forbidden'; retries=0} | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $taskOutput 'frame-acquisition-plan.json') -Encoding utf8
$taskResults = [Collections.Generic.List[object]]::new()
foreach ($taskInput in $taskInputs) {
    $taskPath = [IO.Path]::GetFullPath((Join-Path $taskSourceDirectory $taskInput.path))
    if (-not $taskPath.StartsWith($taskSourceDirectory + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase) -or (Test-Path -LiteralPath $taskPath)) { throw 'source_path_invalid_or_existing' }
    $taskWatch = [Diagnostics.Stopwatch]::StartNew()
    try {
        $taskResponse = Invoke-WebRequest -Uri $taskInput.url -TimeoutSec 40 -SkipHttpErrorCheck
        $taskWatch.Stop()
        $taskRaw = $taskResponse.RawContentStream.ToArray()
        if ($taskResponse.StatusCode -ne 200 -or $taskRaw.Length -lt 16 -or $taskRaw.Length -gt 16MB -or [Text.Encoding]::ASCII.GetString($taskRaw, 0, 3) -ne 'BZh') { throw 'unaccepted_bzip2_response' }
        [IO.File]::WriteAllBytes($taskPath, $taskRaw)
        $taskRecord = @{path=$taskInput.path; url=$taskInput.url; identity=$taskInput.identity; state='RAW_ACQUIRED_UNCHECKED'; bytes=$taskRaw.Length; sha256=[Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($taskRaw)).ToLowerInvariant(); httpStatus=[int]$taskResponse.StatusCode; contentType=($taskResponse.Headers['Content-Type'] -join ';'); elapsedMs=$taskWatch.ElapsedMilliseconds; acquiredAt=[DateTimeOffset]::UtcNow.ToString('o')}
        $taskResults.Add($taskRecord)
        $taskRecord | ConvertTo-Json -Depth 5 -Compress
    } catch {
        $taskWatch.Stop()
        $taskResults.Add(@{path=$taskInput.path; url=$taskInput.url; identity=$taskInput.identity; state='ACQUISITION_FAILED'; elapsedMs=$taskWatch.ElapsedMilliseconds; exception=$_.Exception.GetType().Name; message=$_.Exception.Message})
        @{objectRef='M:51'; state='INCOMPLETE'; sourceFiles=$taskResults.ToArray()} | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $taskOutput 'frame-acquisition-partial.json') -Encoding utf8
        throw
    }
    @{objectRef='M:51'; state='RAW_ACQUIRED_UNCHECKED'; sourceFiles=$taskResults.ToArray()} | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $taskOutput 'frame-acquisition-progress.json') -Encoding utf8
}
@{objectRef='M:51'; state='RAW_ACQUIRED_UNCHECKED'; scope='Three actual bzip2 payloads only; scientific arrays/identity/WCS/coverage await the shared reader'; fieldId=$taskField.fieldID; sourceFiles=$taskResults.ToArray(); sourceBytes=($taskResults | Measure-Object -Property bytes -Sum).Sum} | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $taskOutput 'frame-acquisition.json') -Encoding utf8
