param(
  [string]$BaseUrl = 'http://127.0.0.1:18791',
  [ValidateSet('galactic','mercury','jupiter')][string]$Image = 'galactic'
)
$ErrorActionPreference = 'Stop'
$http = [System.Net.Http.HttpClient]::new()
try {
  $manifestResponse = $http.GetAsync("$BaseUrl/v2/sky/$Image/manifest").GetAwaiter().GetResult()
  if ([int]$manifestResponse.StatusCode -ne 200) { throw 'fixed_image_manifest_http_failed' }
  $manifest = ($manifestResponse.Content.ReadAsStringAsync().GetAwaiter().GetResult() | ConvertFrom-Json)
  $imageResponse = $http.GetAsync("$BaseUrl$($manifest.image.downloadUrl)").GetAwaiter().GetResult()
  $bytes = $imageResponse.Content.ReadAsByteArrayAsync().GetAwaiter().GetResult()
  $sha = [Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($bytes)).ToLowerInvariant()
  $staleUrl = "$BaseUrl$($manifest.image.downloadUrl.Replace($manifest.publicationHash,('0' * 64)))"
  $stale = $http.GetAsync($staleUrl).GetAwaiter().GetResult()
  $wrongFileUrl = "$BaseUrl$($manifest.image.downloadUrl.Replace($manifest.image.file,'not-the-published-image.jpg'))"
  $wrongFile = $http.GetAsync($wrongFileUrl).GetAwaiter().GetResult()
  $result = [ordered]@{
    image = $Image
    manifestStatus = [int]$manifestResponse.StatusCode
    manifestCacheControl = $manifestResponse.Headers.CacheControl.ToString()
    publicationHash = $manifest.publicationHash
    imageStatus = [int]$imageResponse.StatusCode
    imageContentType = $imageResponse.Content.Headers.ContentType.ToString()
    imageCacheControl = $imageResponse.Headers.CacheControl.ToString()
    imageBytes = $bytes.Length
    imageSha256 = $sha
    declaredSha256 = $manifest.image.sha256
    staleVersionStatus = [int]$stale.StatusCode
    wrongFileStatus = [int]$wrongFile.StatusCode
    sourceProvider = $manifest.source.provider
    projection = $manifest.projection
  }
  if ($sha -ne $manifest.image.sha256 -or $bytes.Length -ne $manifest.image.bytes -or
      $result.imageStatus -ne 200 -or $result.staleVersionStatus -ne 404 -or
      $result.wrongFileStatus -ne 404 -or
      $result.imageContentType -ne $(if ($Image -eq 'jupiter') { 'image/png' } else { 'image/jpeg' })) {
    throw 'fixed_image_http_contract_failed'
  }
  $result | ConvertTo-Json -Depth 5
} finally { $http.Dispose() }
