param([Parameter(Mandatory=$true)][string]$OutputDirectory,[switch]$IncludeAllFieldMetadata)
$ErrorActionPreference = 'Stop'
$taskRoot = [IO.Path]::GetFullPath((Get-Location).Path)
$taskCandidatePath = Join-Path $taskRoot 'output/sdss-m51-gri-mosaic-candidate-1002-r2/candidate.json'
$taskCandidateRaw = [IO.File]::ReadAllBytes($taskCandidatePath)
$taskCandidateHash = [Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($taskCandidateRaw)).ToLowerInvariant()
if ($taskCandidateHash -ne '73e65a693216b40079b512acdf17b32742be5db7091fb9bcf1db9de152650b52') { throw 'preserve_bound_mosaic_input' }
$taskCandidate = [Text.Encoding]::UTF8.GetString($taskCandidateRaw) | ConvertFrom-Json
$taskDiscoveryPath = Join-Path $taskRoot 'output/sdss-corrected-m51-1002/target-field-response.csv'
$taskDiscoveryRaw = [IO.File]::ReadAllBytes($taskDiscoveryPath)
$taskDiscoveryHash = [Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($taskDiscoveryRaw)).ToLowerInvariant()
if ($taskDiscoveryHash -ne 'fc31de1a78b3f950c9702e91274bc1ef757487bf94c22b948bb9cbaa8b99d4b0') { throw 'preserve_bound_cas_field_identity' }
$taskDiscovered = @(([Text.Encoding]::UTF8.GetString($taskDiscoveryRaw) -split '\r?\n' | Where-Object { $_ -and -not $_.StartsWith('#') }) | ConvertFrom-Csv)
$taskSelected = @($taskCandidate.mosaic.fields | ForEach-Object {
    $taskIdentity = $_.identity
    $taskRows = @($taskDiscovered | Where-Object { $_.rerun -eq $taskIdentity.rerun -and $_.run -eq $taskIdentity.run -and $_.camcol -eq $taskIdentity.camcol -and $_.field -eq $taskIdentity.field })
    if ($taskRows.Count -ne 1 -or $taskRows[0].fieldID -notmatch '^\d{19}$') { throw 'six_selected_field_ids_required' }
    $taskRows[0]
})
if ($taskSelected.Count -ne 6 -or @($taskSelected.fieldID | Sort-Object -Unique).Count -ne 6) { throw 'six_unique_field_ids_required' }
$taskOutput = [IO.Path]::GetFullPath((Join-Path $taskRoot $OutputDirectory))
if (-not $taskOutput.StartsWith((Join-Path $taskRoot 'output') + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase) -or (Test-Path -LiteralPath $taskOutput)) { throw 'preserve_existing_quality_attempt' }
[IO.Directory]::CreateDirectory($taskOutput) | Out-Null
$taskSql = 'SELECT CAST(fieldID AS varchar(20)) AS fieldID,rerun,run,camcol,field,quality,score,psfWidth_g,psfWidth_r,psfWidth_i FROM Field WHERE fieldID IN (' + ($taskSelected.fieldID -join ',') + ') ORDER BY run,camcol,field'
if ($IncludeAllFieldMetadata) { $taskSql = 'SELECT * FROM Field WHERE fieldID IN (' + ($taskSelected.fieldID -join ',') + ') ORDER BY run,camcol,field' }
$taskUrl = 'https://skyserver.sdss.org/dr17/SkyServerWS/SearchTools/SqlSearch?cmd=' + [Uri]::EscapeDataString($taskSql) + '&format=csv'
$taskScriptRaw = [IO.File]::ReadAllBytes($PSCommandPath)
$taskFlagScope = if ($IncludeAllFieldMetadata) { 'Raw per-band imageStatus/calibStatus and field PSP/PHOTO statuses fetched by SELECT *; interpretation/admission is separate from acquisition' } else { 'imageStatus is a per-band column in this live CAS schema; PSP/PHOTO/CALIB statuses not fetched or admitted in the minimal query' }
$taskPlan = @{ scope='Exactly six already acquired mosaic fields; new field-level quality/PSF metadata only, no image/source refetch or automatic quality admission'; script=@{path=$PSCommandPath; bytes=$taskScriptRaw.Length; sha256=[Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($taskScriptRaw)).ToLowerInvariant()}; candidateSha256=$taskCandidateHash; discoverySha256=$taskDiscoveryHash; selectedFields=$taskSelected; sql=$taskSql; url=$taskUrl; retries=0; timeoutSeconds=40; payloadLimit='1 MiB post-read admission; not a streaming transport bound'; policyUrl='https://www.sdss.org/collaboration/image-use-policy/'; qualityDocumentation='https://www.sdss4.org/dr17/algorithms/image_quality/'; psfDocumentation='https://www.sdss4.org/dr17/imaging/other_info/'; flagScope=$taskFlagScope; meaning='Field-averaged psfWidth/quality/score do not supply a spatial PSF, fpM pixel artifact mask, absolute astrometry or a deconvolution/quality certificate.' }
$taskPlan | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $taskOutput 'plan.json') -Encoding utf8
$taskWatch = [Diagnostics.Stopwatch]::StartNew()
try {
    $taskResponse = Invoke-WebRequest -Uri $taskUrl -TimeoutSec 40 -SkipHttpErrorCheck
    $taskWatch.Stop()
    $taskRaw = $taskResponse.RawContentStream.ToArray()
    $taskRawPath = Join-Path $taskOutput 'response.csv'
    $taskStream = [IO.File]::Open($taskRawPath,[IO.FileMode]::CreateNew,[IO.FileAccess]::Write)
    try { $taskStream.Write($taskRaw) } finally { $taskStream.Dispose() }
    $taskReceipt = @{ status=[int]$taskResponse.StatusCode; contentType=($taskResponse.Headers['Content-Type'] -join ';'); bytes=$taskRaw.Length; sha256=[Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($taskRaw)).ToLowerInvariant(); elapsedMs=$taskWatch.ElapsedMilliseconds; acquiredAt=[DateTimeOffset]::UtcNow.ToString('o'); state='RESPONSE_UNVERIFIED'; url=$taskUrl }
    $taskReceipt | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath (Join-Path $taskOutput 'receipt.json') -Encoding utf8
    if ($taskResponse.StatusCode -ne 200 -or $taskRaw.Length -gt 1MB -or $taskRaw.Length -eq 0) { throw 'quality_response_unaccepted' }
    $taskRows = @(([Text.Encoding]::UTF8.GetString($taskRaw) -split '\r?\n' | Where-Object { $_ -and -not $_.StartsWith('#') }) | ConvertFrom-Csv)
    if ($taskRows.Count -ne 6) { throw 'quality_response_not_six_rows' }
    foreach ($taskRow in $taskRows) {
        $taskExpected = @($taskSelected | Where-Object { $_.fieldID -ceq $taskRow.fieldID })
        if ($taskExpected.Count -ne 1) { throw 'quality_response_field_id_changed' }
        foreach ($taskKey in @('rerun','run','camcol','field')) { if ($taskRow.$taskKey -ne $taskExpected[0].$taskKey) { throw 'quality_response_field_identity_changed' } }
        foreach ($taskBand in @('g','r','i')) {
            $taskValue = 0.0
            if (-not [double]::TryParse($taskRow.('psfWidth_' + $taskBand),[Globalization.NumberStyles]::Float,[Globalization.CultureInfo]::InvariantCulture,[ref]$taskValue) -or -not [double]::IsFinite($taskValue) -or $taskValue -le 0) { throw 'quality_response_psf_width_unavailable' }
        }
    }
    if (@($taskRows.fieldID | Sort-Object -Unique).Count -ne 6) { throw 'quality_response_duplicate_field' }
    @{ scope=$taskPlan.scope; state='FIELD_IDENTITY_AND_POSITIVE_PSF_METADATA_ACCEPTED_QUALITY_UNVERIFIED'; inputCandidateSha256=$taskCandidateHash; response=$taskReceipt; rows=$taskRows; psfWidthUnit='arcsec'; meaning=$taskPlan.meaning } | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $taskOutput 'field-quality.json') -Encoding utf8
    @{ output=$taskOutput; rows=@($taskRows | Select-Object fieldID,rerun,run,camcol,field,quality,score,psfWidth_g,psfWidth_r,psfWidth_i); responseBytes=$taskRaw.Length; responseSha256=$taskReceipt.sha256; qualityAcceptance='UNVERIFIED' } | ConvertTo-Json -Depth 5 -Compress
} catch {
    $taskWatch.Stop()
    @{ state='FAILED_NO_RETRY'; elapsedMs=$taskWatch.ElapsedMilliseconds; exception=$_.Exception.GetType().Name; message=$_.Exception.Message; scope=$taskPlan.scope } | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $taskOutput 'failure.json') -Encoding utf8
    throw
}
