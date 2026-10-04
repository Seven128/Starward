$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '../../../..')).Path
Set-Location -LiteralPath $root
$taskOutput = Join-Path $root 'output/sdss-m82-registration-stars-1004-r1'
if (Test-Path -LiteralPath $taskOutput) { throw 'preserve_existing_acquisition' }
$parametersPath = 'output/sdss-m82-quality-inputs-1004-r1/camera-noise-parameters.json'
$parameters = Get-Content -LiteralPath $parametersPath -Raw | ConvertFrom-Json
$fields = @($parameters.parameters.field_id | Sort-Object -Unique)
if ($fields.Count -ne 6 -or @($fields | Where-Object { $_ -notmatch '^\d{19}$' }).Count) { throw 'actual_six_fields_required' }
# Fetch all stellar detections in the participating fields, without the old
# magnitude/clean/child filter. Those qualities are preserved for consumers.
# TOP is an acquisition guard: reaching it is incomplete, never a scope cap.
$taskSql = @"
SELECT TOP 5001 objID,fieldID,run,rerun,camcol,field,mode,type,clean,nChild,ra,dec,
 rowc_g,rowc_r,rowc_i,colc_g,colc_r,colc_i,
 rowcErr_g,rowcErr_r,rowcErr_i,colcErr_g,colcErr_r,colcErr_i,
 psfMag_g,psfMag_r,psfMag_i,psfMagErr_g,psfMagErr_r,psfMagErr_i,flags_g,flags_r,flags_i
FROM PhotoObjAll
WHERE fieldID IN ($($fields -join ',')) AND type=6 AND mode IN (1,2)
ORDER BY run,camcol,field,objID
"@
[IO.Directory]::CreateDirectory($taskOutput) | Out-Null
[IO.File]::WriteAllText((Join-Path $taskOutput 'query.sql'), $taskSql, [Text.UTF8Encoding]::new($false))
[IO.File]::WriteAllBytes((Join-Path $taskOutput 'executed-script.ps1'), [IO.File]::ReadAllBytes($PSCommandPath))
$parameterPin = [ordered]@{path=$parametersPath; bytes=(Get-Item -LiteralPath $parametersPath).Length; sha256=(Get-FileHash -LiteralPath $parametersPath -Algorithm SHA256).Hash.ToLowerInvariant()}
$taskUrl = 'https://skyserver.sdss.org/dr17/SkyServerWS/SearchTools/SqlSearch?cmd=' + [Uri]::EscapeDataString($taskSql) + '&format=csv'
$taskWatch = [Diagnostics.Stopwatch]::StartNew()
try {
    $taskResponse = Invoke-WebRequest -Uri $taskUrl -TimeoutSec 40 -SkipHttpErrorCheck
    $taskRaw = $taskResponse.RawContentStream.ToArray()
    if ($taskRaw.Length -gt 2MB) { throw 'response_exceeds_bounded_acquisition' }
    [IO.File]::WriteAllBytes((Join-Path $taskOutput 'response.csv'), $taskRaw)
    $taskRecord = [ordered]@{state='RESPONSE_UNVERIFIED'; acquiredAt=[DateTimeOffset]::UtcNow.ToString('o'); status=[int]$taskResponse.StatusCode; bytes=$taskRaw.Length; sha256=[Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($taskRaw)).ToLowerInvariant(); elapsedMs=$taskWatch.ElapsedMilliseconds; url=$taskUrl; meaning='Actual M82 six-field stellar detection metadata; no image download or runtime adoption'; fieldSource=$parameterPin; fields=$fields; maximumRows=5001; retries=0}
    [IO.File]::WriteAllText((Join-Path $taskOutput 'receipt.json'), ($taskRecord | ConvertTo-Json -Depth 5) + "`n", [Text.UTF8Encoding]::new($false))
    if ($taskResponse.StatusCode -ne 200) { throw 'catalog_http_failure' }
    [pscustomobject]$taskRecord | Select-Object state,status,bytes,sha256,elapsedMs | ConvertTo-Json
} catch {
    @{state='ACQUISITION_FAILED'; type=$_.Exception.GetType().Name; message=$_.Exception.Message; elapsedMs=$taskWatch.ElapsedMilliseconds; retries=0} | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $taskOutput 'failed.json') -Encoding utf8
    throw
}
