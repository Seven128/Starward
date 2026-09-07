$ErrorActionPreference = 'Stop'
$taskRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../../..'))
$taskFixture = Join-Path $taskRoot 'artifacts/miniapp/upload-fixture'
Add-Type -AssemblyName System.Drawing
$taskBitmap = [System.Drawing.Bitmap]::new(32, 24)
$taskGraphics = [System.Drawing.Graphics]::FromImage($taskBitmap)
try {
  $taskGraphics.Clear([System.Drawing.Color]::DarkRed)
  $taskGraphics.FillRectangle([System.Drawing.Brushes]::Gold, 0, 0, 12, 8)
  $taskBitmap.Save((Join-Path $taskFixture 'self-generated-transport-test.jpg'), [System.Drawing.Imaging.ImageFormat]::Jpeg)
} finally { $taskGraphics.Dispose(); $taskBitmap.Dispose() }
Push-Location $taskRoot
try {
  node --import ./apps/wechat-miniapp/node_modules/tsx/dist/loader.mjs .codex/work-items/miniapp-integrated-2026-09-06/verify-jpeg-roundtrip.ts
  if ($LASTEXITCODE -ne 0) { throw 'JPEG sanitizer verification failed' }
  $taskOriginal = [System.Drawing.Bitmap]::new((Join-Path $taskFixture 'self-generated-transport-test.jpg'))
  $taskClean = [System.Drawing.Bitmap]::new((Join-Path $taskFixture 'self-generated-sanitized.jpg'))
  try {
    if ($taskOriginal.Width -ne $taskClean.Width -or $taskOriginal.Height -ne $taskClean.Height) { throw 'Dimension mismatch' }
    for ($taskY = 0; $taskY -lt $taskOriginal.Height; $taskY++) {
      for ($taskX = 0; $taskX -lt $taskOriginal.Width; $taskX++) {
        if ($taskOriginal.GetPixel($taskX, $taskY).ToArgb() -ne $taskClean.GetPixel($taskX, $taskY).ToArgb()) { throw 'Pixel mismatch' }
      }
    }
    [pscustomobject]@{ Width = $taskClean.Width; Height = $taskClean.Height; PixelsIdentical = $true } | ConvertTo-Json
  } finally { $taskOriginal.Dispose(); $taskClean.Dispose() }
} finally { Pop-Location }
