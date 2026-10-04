$ErrorActionPreference = 'Stop'
$taskOutput = [IO.Path]::GetFullPath((Join-Path (Get-Location).Path 'output/sdss-corrected-m51-1002'))
if (Test-Path -LiteralPath (Join-Path $taskOutput 'center-field-request.json')) { throw 'preserve_existing_field_attempt' }
[IO.Directory]::CreateDirectory($taskOutput) | Out-Null
$taskSql = 'SELECT DISTINCT f.fieldID, f.rerun, f.run, f.camcol, f.field FROM dbo.fPolygonsContainingPointEq(202.469625,47.1951666667,0.01) AS p JOIN Region AS r ON r.regionID=p.regionID JOIN sdssPolygons AS s ON r.id=s.sdssPolygonID JOIN Field AS f ON f.fieldID=s.primaryFieldID'
$taskUrl = 'https://skyserver.sdss.org/dr17/SkyServerWS/SearchTools/SqlSearch?cmd=' + [Uri]::EscapeDataString($taskSql) + '&format=csv'
@{
    objectRef = 'M:51'; center = @{raDeg=202.469625; decDeg=47.1951666667; frame='ICRS J2000'}
    query = $taskSql; requestUrl = $taskUrl
    scope = 'One read-only official primary-field query for the target center; not complete square/per-band/quality coverage'
    policyUrl = 'https://www.sdss.org/collaboration/image-use-policy/'
    fieldsDocumentationUrl = 'https://www.sdss.org/dr18/imaging/tools/'
    source = 'SDSS DR17 CAS'; acquiredAt = [DateTimeOffset]::UtcNow.ToString('o')
} | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath (Join-Path $taskOutput 'center-field-request.json') -Encoding utf8
$taskWatch = [Diagnostics.Stopwatch]::StartNew()
try {
    $taskResponse = Invoke-WebRequest -Uri $taskUrl -TimeoutSec 35 -SkipHttpErrorCheck
    $taskWatch.Stop()
    $taskRaw = $taskResponse.RawContentStream.ToArray()
    [IO.File]::WriteAllBytes((Join-Path $taskOutput 'center-field-response.csv'), $taskRaw)
    $taskReceipt = @{status=[int]$taskResponse.StatusCode; bytes=$taskRaw.Length; sha256=[Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($taskRaw)).ToLowerInvariant(); elapsedMs=$taskWatch.ElapsedMilliseconds; contentType=($taskResponse.Headers['Content-Type'] -join ';'); state='RESPONSE_UNVERIFIED'}
    $taskReceipt | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath (Join-Path $taskOutput 'center-field-receipt.json') -Encoding utf8
    $taskReceipt | ConvertTo-Json -Compress
    if ($taskResponse.StatusCode -ne 200) { throw 'field_query_http_failure' }
    [Text.Encoding]::UTF8.GetString($taskRaw)
} catch {
    $taskWatch.Stop()
    @{state='QUERY_FAILED'; elapsedMs=$taskWatch.ElapsedMilliseconds; exception=$_.Exception.GetType().Name; message=$_.Exception.Message} | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath (Join-Path $taskOutput 'center-field-failure.json') -Encoding utf8
    throw
}
