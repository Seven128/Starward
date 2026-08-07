param(
  [string]$OutputDirectory = (Join-Path $PSScriptRoot "../../apps/wechat-miniapp/src/assets/icons")
)

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing

$resolvedOutput = [System.IO.Path]::GetFullPath($OutputDirectory)
[System.IO.Directory]::CreateDirectory($resolvedOutput) | Out-Null

function Write-SpotMarker {
  param(
    [Parameter(Mandatory = $true)][string]$Path,
    [Parameter(Mandatory = $true)][bool]$Selected
  )

  $bitmap = [System.Drawing.Bitmap]::new(
    64,
    72,
    [System.Drawing.Imaging.PixelFormat]::Format32bppArgb
  )
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $graphics.Clear([System.Drawing.Color]::Transparent)

  $shape = [System.Drawing.Drawing2D.GraphicsPath]::new()
  $shape.StartFigure()
  $shape.AddBezier(32, 4, 16, 4, 8, 15, 8, 29)
  $shape.AddBezier(8, 29, 8, 44, 21, 55, 32, 68)
  $shape.AddBezier(32, 68, 43, 55, 56, 44, 56, 29)
  $shape.AddBezier(56, 29, 56, 15, 48, 4, 32, 4)
  $shape.CloseFigure()

  $primary = [System.Drawing.ColorTranslator]::FromHtml("#1769D2")
  $surface = [System.Drawing.ColorTranslator]::FromHtml("#FFFFFF")
  $fill = [System.Drawing.SolidBrush]::new($(if ($Selected) { $primary } else { $surface }))
  $outline = [System.Drawing.Pen]::new($primary, $(if ($Selected) { 5 } else { 4 }))
  $outline.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
  $graphics.FillPath($fill, $shape)
  $graphics.DrawPath($outline, $shape)

  if ($Selected) {
    $check = [System.Drawing.Pen]::new($surface, 5)
    $check.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $check.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    $graphics.DrawLines(
      $check,
      [System.Drawing.PointF[]]@(
        [System.Drawing.PointF]::new(21, 29),
        [System.Drawing.PointF]::new(29, 37),
        [System.Drawing.PointF]::new(44, 20)
      )
    )
    $check.Dispose()
  } else {
    $dot = [System.Drawing.SolidBrush]::new($primary)
    $graphics.FillEllipse($dot, 25, 22, 14, 14)
    $dot.Dispose()
  }

  $bitmap.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)
  $outline.Dispose()
  $fill.Dispose()
  $shape.Dispose()
  $graphics.Dispose()
  $bitmap.Dispose()
}

$normalPath = Join-Path $resolvedOutput "spot-marker.png"
$selectedPath = Join-Path $resolvedOutput "spot-marker-selected.png"
Write-SpotMarker -Path $normalPath -Selected $false
Write-SpotMarker -Path $selectedPath -Selected $true

$manifest = [ordered]@{
  schemaVersion = 1
  authorityTarget = "target.system.wechat-miniapp-soft-instruments-2026-08-05"
  designSource = "docs/design-resources/miniapp-selected-source-2026-08-06-v1/artifacts/map-03-component-control-atlas.html#atlas-markers"
  interpretation = "30x34 normal pin and 38x42 selected pin; selected state uses size, fill, outline, check and label rather than color alone"
  generatedAt = "2026-08-06"
  assets = @(
    [ordered]@{
      path = "spot-marker.png"
      sha256 = (Get-FileHash -Algorithm SHA256 -LiteralPath $normalPath).Hash.ToLowerInvariant()
    },
    [ordered]@{
      path = "spot-marker-selected.png"
      sha256 = (Get-FileHash -Algorithm SHA256 -LiteralPath $selectedPath).Hash.ToLowerInvariant()
    }
  )
}
$manifest | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $resolvedOutput "marker-manifest.json") -Encoding utf8NoBOM
