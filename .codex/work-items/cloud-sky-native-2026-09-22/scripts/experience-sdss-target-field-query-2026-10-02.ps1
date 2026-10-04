$ErrorActionPreference = 'Stop'
$taskOutput = [IO.Path]::GetFullPath((Join-Path (Get-Location).Path 'output/sdss-corrected-m51-1002'))
$taskPlan = Get-Content -LiteralPath (Join-Path $taskOutput 'target-field-request.json') -Raw | ConvertFrom-Json
if ($taskPlan.objectRef -ne 'M:51' -or $taskPlan.samples.Count -ne 25 -or -not $taskPlan.requestUrl.StartsWith('https://skyserver.sdss.org/dr17/SkyServerWS/SearchTools/SqlSearch?')) { throw 'bounded_field_plan_invalid' }
$taskReceiptPath = Join-Path $taskOutput 'target-field-receipt.json'
$taskFailurePath = Join-Path $taskOutput 'target-field-failure.json'
if ((Test-Path -LiteralPath $taskReceiptPath) -or (Test-Path -LiteralPath $taskFailurePath)) { throw 'preserve_existing_target_field_attempt' }
$taskWatch = [Diagnostics.Stopwatch]::StartNew()
try {
    $taskResponse = Invoke-WebRequest -Uri $taskPlan.requestUrl -TimeoutSec 40 -SkipHttpErrorCheck
    $taskWatch.Stop()
    $taskRaw = $taskResponse.RawContentStream.ToArray()
    [IO.File]::WriteAllBytes((Join-Path $taskOutput 'target-field-response.csv'), $taskRaw)
    @{status=[int]$taskResponse.StatusCode; bytes=$taskRaw.Length; sha256=[Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($taskRaw)).ToLowerInvariant(); elapsedMs=$taskWatch.ElapsedMilliseconds; contentType=($taskResponse.Headers['Content-Type'] -join ';'); state='RESPONSE_UNVERIFIED'; scope=$taskPlan.scope} | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $taskReceiptPath -Encoding utf8
    if ($taskResponse.StatusCode -ne 200) { throw 'target_field_http_failure' }
    [Text.Encoding]::UTF8.GetString($taskRaw)
} catch {
    $taskWatch.Stop()
    @{state='QUERY_FAILED'; elapsedMs=$taskWatch.ElapsedMilliseconds; exception=$_.Exception.GetType().Name; message=$_.Exception.Message} | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath $taskFailurePath -Encoding utf8
    throw
}
