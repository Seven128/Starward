param()

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.Drawing

$assetRoot = [System.IO.Path]::GetFullPath(
  (Join-Path $PSScriptRoot "..\..\apps\wechat-miniapp\src\assets\icons")
)
[System.IO.Directory]::CreateDirectory($assetRoot) | Out-Null

function Convert-Point {
  param([double]$X, [double]$Y)
  $scale = 2.25
  $offset = 13.5
  return [System.Drawing.PointF]::new(
    [single]($offset + $X * $scale),
    [single]($offset + $Y * $scale)
  )
}

function New-TabIcon {
  param(
    [ValidateSet("map", "my")][string]$Kind,
    [string]$Color,
    [string]$FileName
  )

  $bitmap = [System.Drawing.Bitmap]::new(
    81,
    81,
    [System.Drawing.Imaging.PixelFormat]::Format32bppArgb
  )
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $pen = [System.Drawing.Pen]::new(
    [System.Drawing.ColorTranslator]::FromHtml($Color),
    [single]4.5
  )
  try {
    $graphics.Clear([System.Drawing.Color]::Transparent)
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    $pen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round

    if ($Kind -eq "map") {
      [System.Drawing.PointF[]]$outline = @(
        (Convert-Point 3.5 5.5),
        (Convert-Point 8.5 3.5),
        (Convert-Point 15.5 5.5),
        (Convert-Point 20.5 3.5),
        (Convert-Point 20.5 18.5),
        (Convert-Point 15.5 20.5),
        (Convert-Point 8.5 18.5),
        (Convert-Point 3.5 20.5),
        (Convert-Point 3.5 5.5)
      )
      $graphics.DrawLines($pen, $outline)
      $graphics.DrawLine($pen, (Convert-Point 8.5 3.5), (Convert-Point 8.5 18.5))
      $graphics.DrawLine($pen, (Convert-Point 15.5 5.5), (Convert-Point 15.5 20.5))
    } else {
      $circleTopLeft = Convert-Point 8.5 4.5
      $scale = 2.25
      $graphics.DrawEllipse(
        $pen,
        $circleTopLeft.X,
        $circleTopLeft.Y,
        [single](7 * $scale),
        [single](7 * $scale)
      )
      $profile = [System.Drawing.Drawing2D.GraphicsPath]::new()
      try {
        $profile.AddBezier(
          (Convert-Point 5 20),
          (Convert-Point 5.7 15.9),
          (Convert-Point 8.1 13.8),
          (Convert-Point 12 13.8)
        )
        $profile.AddBezier(
          (Convert-Point 12 13.8),
          (Convert-Point 15.9 13.8),
          (Convert-Point 18.3 15.9),
          (Convert-Point 19 20)
        )
        $graphics.DrawPath($pen, $profile)
      } finally {
        $profile.Dispose()
      }
    }

    $destination = Join-Path $assetRoot $FileName
    $bitmap.Save($destination, [System.Drawing.Imaging.ImageFormat]::Png)
    Write-Output $destination
  } finally {
    $pen.Dispose()
    $graphics.Dispose()
    $bitmap.Dispose()
  }
}

# Geometry is projected directly from frozen APP-08 symbols i-nav-map/i-nav-my.
New-TabIcon -Kind map -Color "#5C7186" -FileName "tab-map.png"
New-TabIcon -Kind map -Color "#1769D2" -FileName "tab-map-selected.png"
New-TabIcon -Kind my -Color "#5C7186" -FileName "tab-my.png"
New-TabIcon -Kind my -Color "#1769D2" -FileName "tab-my-selected.png"
