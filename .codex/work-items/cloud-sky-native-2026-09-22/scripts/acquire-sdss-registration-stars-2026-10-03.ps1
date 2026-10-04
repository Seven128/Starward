param([ValidateSet('primary','center-supplement')][string]$Scope = 'primary')
$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '../../../..')).Path
$taskOutput = Join-Path $root $(if ($Scope -eq 'primary') { 'output/sdss-registration-stars-1003-r1' } else { 'output/sdss-registration-stars-center-supplement-1003-r1' })
if (Test-Path -LiteralPath $taskOutput) { throw 'preserve_existing_acquisition' }
[IO.Directory]::CreateDirectory($taskOutput) | Out-Null
$taskSql = @'
SELECT TOP 5000 objID,fieldID,run,rerun,camcol,field,mode,type,clean,nChild,ra,dec,
 rowc_g,rowc_r,rowc_i,colc_g,colc_r,colc_i,
 rowcErr_g,rowcErr_r,rowcErr_i,colcErr_g,colcErr_r,colcErr_i,
 psfMag_g,psfMag_r,psfMag_i,psfMagErr_g,psfMagErr_r,psfMagErr_i,flags_g,flags_r,flags_i
FROM PhotoObjAll
WHERE fieldID IN (1237661362908495872,1237661362908561408,1237661362908626944,
 1237661435924054016,1237661435924119552,1237661435924185088)
 AND type=6 AND mode IN (1,2) AND clean=1 AND nChild=0 AND psfMag_r BETWEEN 14 AND 20
ORDER BY run,camcol,field,objID
'@
if ($Scope -eq 'center-supplement') {
    # Primary query returned no qualifying rows in these two actual fields.
    # Fetch only its omitted center detections, preserving clean/nChild/flags.
    $taskSql = $taskSql.Replace('AND type=6 AND mode IN (1,2) AND clean=1 AND nChild=0 AND psfMag_r BETWEEN 14 AND 20',
        'AND type=6 AND mode IN (1,2) AND field IN (100,117) AND NOT (clean=1 AND nChild=0) AND psfMag_r BETWEEN 14 AND 20')
}
[IO.File]::WriteAllText((Join-Path $taskOutput 'query.sql'), $taskSql, [Text.UTF8Encoding]::new($false))
$taskUrl = 'https://skyserver.sdss.org/dr17/SkyServerWS/SearchTools/SqlSearch?cmd=' + [Uri]::EscapeDataString($taskSql) + '&format=csv'
$taskWatch = [Diagnostics.Stopwatch]::StartNew()
try {
    $taskResponse = Invoke-WebRequest -Uri $taskUrl -TimeoutSec 40 -SkipHttpErrorCheck
    $taskRaw = $taskResponse.RawContentStream.ToArray()
    if ($taskRaw.Length -gt 2MB) { throw 'response_exceeds_bounded_acquisition' }
    [IO.File]::WriteAllBytes((Join-Path $taskOutput 'response.csv'), $taskRaw)
    $taskRecord = [ordered]@{state='RESPONSE_UNVERIFIED'; acquiredAt=[DateTimeOffset]::UtcNow.ToString('o'); status=[int]$taskResponse.StatusCode; bytes=$taskRaw.Length; sha256=[Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($taskRaw)).ToLowerInvariant(); elapsedMs=$taskWatch.ElapsedMilliseconds; url=$taskUrl; scope=$Scope; meaning='Bounded measured-star catalog query, no image downloads or runtime adoption'; maximumRows=5000; retries=0}
    [IO.File]::WriteAllText((Join-Path $taskOutput 'receipt.json'), ($taskRecord | ConvertTo-Json -Depth 4) + "`n", [Text.UTF8Encoding]::new($false))
    if ($taskResponse.StatusCode -ne 200) { throw 'catalog_http_failure' }
    [pscustomobject]$taskRecord | Select-Object state,status,bytes,sha256,elapsedMs | ConvertTo-Json
} catch {
    @{state='ACQUISITION_FAILED'; type=$_.Exception.GetType().Name; message=$_.Exception.Message; elapsedMs=$taskWatch.ElapsedMilliseconds; retries=0} | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $taskOutput 'failed.json') -Encoding utf8
    throw
}
