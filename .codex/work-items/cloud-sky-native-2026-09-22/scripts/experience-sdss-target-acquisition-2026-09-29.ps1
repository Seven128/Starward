$ErrorActionPreference = 'Stop'
$taskRoot = (Get-Location).Path
$taskDataRoot = [IO.Path]::GetFullPath((Join-Path $taskRoot '.codex/work-items/cloud-sky-native-2026-09-22/evidence/sdss-target-admission-0929'))
$taskInput = Get-Content -LiteralPath (Join-Path $taskDataRoot 'request.json') -Raw | ConvertFrom-Json
$taskFootprint = Get-Content -LiteralPath (Join-Path $taskDataRoot 'footprint-column-response.json') -Raw | ConvertFrom-Json
$taskFootprintRow = @($taskFootprint | Where-Object TableName -eq 'Table1')[0].Rows[0]
$taskResults = [Collections.Generic.List[object]]::new()
foreach ($taskTarget in $taskInput.targets) {
    if ($taskTarget.reference -notmatch '^M:(63|64|81|82|87)$') { throw 'target_outside_bounded_admission' }
    $taskNumber = $taskTarget.reference.Split(':')[1]
    if ($taskFootprintRow."M_$taskNumber" -ne $true) { throw 'footprint_not_confirmed' }
    foreach ($taskLevel in @('OVERVIEW', 'MEDIUM', 'DETAIL')) {
        $taskScale = $taskTarget.levels.$taskLevel
        $taskQuery = 'ra=' + [Uri]::EscapeDataString([string]$taskTarget.center.raDeg) + '&dec=' + [Uri]::EscapeDataString([string]$taskTarget.center.decDeg) + '&scale=' + [string]$taskScale + '&width=512&height=512'
        $taskUrl = 'https://skyserver.sdss.org/dr17/SkyServerWS/ImgCutout/getjpeg?' + $taskQuery
        $taskFile = 'M-' + $taskNumber + '-' + $taskLevel.ToLowerInvariant() + '.jpg'
        $taskPath = [IO.Path]::GetFullPath((Join-Path $taskDataRoot $taskFile))
        if (-not $taskPath.StartsWith($taskDataRoot + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) { throw 'candidate_path_escaped' }
        if (Test-Path -LiteralPath $taskPath) { throw 'candidate_already_acquired' }
        $taskWatch = [Diagnostics.Stopwatch]::StartNew()
        try {
            $taskResponse = Invoke-WebRequest -Uri $taskUrl -TimeoutSec 25 -SkipHttpErrorCheck
            $taskWatch.Stop()
            $taskBytes = $taskResponse.RawContentStream.ToArray()
            $taskMime = ($taskResponse.Headers['Content-Type'] -join ';').Split(';')[0]
            if ($taskResponse.StatusCode -ne 200 -or $taskMime -ne 'image/jpeg' -or $taskBytes.Length -lt 4 -or $taskBytes[0] -ne 255 -or $taskBytes[1] -ne 216) { throw 'not_an_accepted_jpeg_response' }
            [IO.File]::WriteAllBytes($taskPath, $taskBytes)
            $taskHash = [Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($taskBytes)).ToLowerInvariant()
            $taskResults.Add(@{ reference = $taskTarget.reference; level = $taskLevel; file = $taskFile; requestUrl = $taskUrl; scaleArcsecPerPixel = $taskScale; pixels = 512; fieldDegrees = 512 * $taskScale / 3600; bytes = $taskBytes.Length; sha256 = $taskHash; status = 200; elapsedMs = $taskWatch.ElapsedMilliseconds; state = 'candidate_not_published' })
            @{ target = $taskTarget.reference; level = $taskLevel; bytes = $taskBytes.Length; elapsedMs = $taskWatch.ElapsedMilliseconds } | ConvertTo-Json -Compress
        } catch {
            $taskWatch.Stop()
            $taskResults.Add(@{ reference = $taskTarget.reference; level = $taskLevel; requestUrl = $taskUrl; elapsedMs = $taskWatch.ElapsedMilliseconds; state = 'unavailable'; exception = $_.Exception.GetType().Name; message = $_.Exception.Message })
            $taskResults | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $taskDataRoot 'acquisition-partial.json') -Encoding utf8
            throw
        }
    }
}
$taskOutput = Join-Path $taskDataRoot 'acquisition.json'
if (Test-Path -LiteralPath $taskOutput) { throw 'acquisition_record_already_exists' }
@{ scope = 'Bounded original SDSS candidate images; center footprint only, no complete quality/coverage or publication/native acceptance'; credit = $taskInput.credit; license = $taskInput.license; licenseUrl = $taskInput.licenseUrl; imageUsePolicy = $taskInput.sourcePolicy; runtimeNetwork = 'forbidden'; pixelModification = 'none'; targets = $taskInput.targets; images = $taskResults.ToArray() } | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $taskOutput -Encoding utf8
