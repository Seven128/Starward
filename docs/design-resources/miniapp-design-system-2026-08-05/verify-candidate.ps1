[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$candidateRoot = $PSScriptRoot
$briefPath = Join-Path $candidateRoot 'candidate-design-brief.md'
$referenceRoot = Join-Path $candidateRoot 'references'

$expectedHashes = [ordered]@{
    '01-card-and-bottom-nav.png' = 'b156309394810256f799cb7c146840f6a0cf37ecdcfbbf0653d4c9d0d3b00f54'
    '02-3d-icon-prompt-and-grid.png' = '4473f5147bc70f1cd39187192954018298ab5b8f2d10230d0901abf0ee2ec8e7'
    '03-3d-telescope.png' = '51eb5f517273b65d972d2f6c49ee6638855f3e49f81dbafd01c2f103b48c8b36'
    '04-3d-four-point-star.png' = '712566bd533556a5ab711fa8085e82e49a77dc97300241c21e299d30b163e80d'
    '05-3d-five-point-star.png' = 'f38d4fcb147f6dc4a10925c6c56529ca089b496b3a1d589b3846014801cdc1ea'
    '06-day-mode-reference.png' = '62d286b330ce48cac73e1b1351e6c35502aac46989af971ee502466842d49fe0'
    '07-night-mode-reference.png' = '5d5ec492c02e8d67b502ed7f672f1b8976da61d56f2702fbd7a59bbcb1ee3b5d'
    '08-observation-red-mode-reference.png' = 'd8de918d08dab0f8d6f84bb097076671186a61a1494637f1e40b2fc7b97b8150'
}

foreach ($entry in $expectedHashes.GetEnumerator()) {
    $path = Join-Path $referenceRoot $entry.Key
    if (-not (Test-Path -LiteralPath $path -PathType Leaf)) {
        throw "Missing reference: $($entry.Key)"
    }

    $actual = (Get-FileHash -LiteralPath $path -Algorithm SHA256).Hash.ToLowerInvariant()
    if ($actual -ne $entry.Value) {
        throw "Reference hash mismatch: $($entry.Key)"
    }
}

if (-not (Test-Path -LiteralPath $briefPath -PathType Leaf)) {
    throw 'Missing candidate-design-brief.md'
}

$brief = Get-Content -LiteralPath $briefPath -Raw
$lines = Get-Content -LiteralPath $briefPath
$modeNames = @('Day', 'Night', 'Observation red')
$modeTokens = @{}
$currentMode = $null

foreach ($line in $lines) {
    if ($line -match '^###\s+(Day|Night|Observation red)\s*$') {
        $currentMode = $Matches[1]
        $modeTokens[$currentMode] = [ordered]@{}
        continue
    }

    if ($line -match '^##\s+' -or ($line -match '^###\s+' -and $line -notmatch '^###\s+(Day|Night|Observation red)\s*$')) {
        $currentMode = $null
        continue
    }

    if ($null -ne $currentMode -and $line -match '^\|\s*`(?<role>[^`]+)`\s*\|\s*`(?<value>#[0-9A-Fa-f]{6})`\s*\|$') {
        $modeTokens[$currentMode][$Matches.role] = $Matches.value.ToUpperInvariant()
    }
}

foreach ($modeName in $modeNames) {
    if (-not $modeTokens.ContainsKey($modeName) -or $modeTokens[$modeName].Count -eq 0) {
        throw "Missing color tokens for mode: $modeName"
    }
}

$canonicalRoles = @($modeTokens['Day'].Keys | Sort-Object)
$expectedRoles = @(
    'accent-cyan', 'accent-violet', 'accent-warm', 'border', 'canvas', 'danger',
    'focus', 'on-primary', 'primary', 'primary-pressed', 'success', 'surface',
    'surface-elevated', 'surface-subtle', 'text-primary', 'text-secondary',
    'text-tertiary', 'warning'
) | Sort-Object
$expectedRoleDelta = @(Compare-Object -ReferenceObject $expectedRoles -DifferenceObject $canonicalRoles)
if ($expectedRoleDelta.Count -gt 0) {
    throw 'The candidate does not expose the complete expected semantic color-role set.'
}

foreach ($modeName in @('Night', 'Observation red')) {
    $modeRoles = @($modeTokens[$modeName].Keys | Sort-Object)
    $delta = @(Compare-Object -ReferenceObject $canonicalRoles -DifferenceObject $modeRoles)
    if ($delta.Count -gt 0) {
        throw "Semantic color roles differ between Day and $modeName"
    }
}

foreach ($entry in $modeTokens['Observation red'].GetEnumerator()) {
    $digits = $entry.Value.TrimStart('#')
    $red = [Convert]::ToInt32($digits.Substring(0, 2), 16)
    $green = [Convert]::ToInt32($digits.Substring(2, 2), 16)
    $blue = [Convert]::ToInt32($digits.Substring(4, 2), 16)
    if ($red -eq 0) {
        if ($green -ne 0 -or $blue -ne 0) {
            throw "Observation token is not black/warm-red: $($entry.Key)"
        }
        continue
    }
    if (($green / $red) -gt 0.5 -or ($blue / $red) -gt 0.5) {
        throw "Observation token escapes the closed warm-red palette: $($entry.Key)"
    }
}

function Get-RelativeLuminance {
    param([Parameter(Mandatory)][string]$Hex)

    $digits = $Hex.TrimStart('#')
    $channels = @(0, 2, 4 | ForEach-Object {
        [Convert]::ToInt32($digits.Substring($_, 2), 16) / 255.0
    })
    $linear = @($channels | ForEach-Object {
        if ($_ -le 0.04045) { $_ / 12.92 }
        else { [Math]::Pow(($_ + 0.055) / 1.055, 2.4) }
    })

    return 0.2126 * $linear[0] + 0.7152 * $linear[1] + 0.0722 * $linear[2]
}

function Get-ContrastRatio {
    param(
        [Parameter(Mandatory)][string]$Foreground,
        [Parameter(Mandatory)][string]$Background
    )

    $foregroundLuminance = Get-RelativeLuminance -Hex $Foreground
    $backgroundLuminance = Get-RelativeLuminance -Hex $Background
    return ([Math]::Max($foregroundLuminance, $backgroundLuminance) + 0.05) /
        ([Math]::Min($foregroundLuminance, $backgroundLuminance) + 0.05)
}

$contrastChecks = @()
$textRoles = @('text-primary', 'text-secondary', 'text-tertiary')
$surfaceRoles = @('canvas', 'surface', 'surface-subtle', 'surface-elevated')
foreach ($modeName in $modeNames) {
    foreach ($textRole in $textRoles) {
        foreach ($surfaceRole in $surfaceRoles) {
            $contrastChecks += ,@($modeName, $textRole, $surfaceRole, 4.5)
        }
    }
    $contrastChecks += ,@($modeName, 'on-primary', 'primary', 4.5)
    $contrastChecks += ,@($modeName, 'focus', 'surface', 3.0)
    foreach ($statusRole in @('success', 'warning', 'danger')) {
        $contrastChecks += ,@($modeName, $statusRole, 'surface', 3.0)
    }
}

$contrastResults = foreach ($check in $contrastChecks) {
    $modeName, $foregroundRole, $backgroundRole, $minimum = $check
    $ratio = Get-ContrastRatio `
        -Foreground $modeTokens[$modeName][$foregroundRole] `
        -Background $modeTokens[$modeName][$backgroundRole]
    if ($ratio -lt $minimum) {
        throw "Contrast failed: $modeName $foregroundRole/$backgroundRole = $([Math]::Round($ratio, 2)):1"
    }

    [pscustomobject]@{
        Mode = $modeName
        Pair = "$foregroundRole/$backgroundRole"
        Ratio = [Math]::Round($ratio, 2)
        Minimum = $minimum
    }
}

$requiredPhrases = @(
    'Candidate version: `0.2`.',
    'four-point star, five-point star, tent, telescope, binoculars, camera, hiking backpack, and a gender-neutral avatar',
    'Copying or adapting the existing App design system',
    '### Component contract matrix',
    '### Motion contract',
    '### Accessibility contract',
    '### Asset naming and validation',
    'Explicit user selection is still required before authority adoption.'
)
foreach ($phrase in $requiredPhrases) {
    if (-not $brief.Contains($phrase)) {
        throw "Required candidate constraint is missing: $phrase"
    }
}

foreach ($forbiddenPhrase in @('Ghibli', '吉卜力')) {
    if ($brief.Contains($forbiddenPhrase)) {
        throw "Named protected-style imitation leaked into the candidate: $forbiddenPhrase"
    }
}

Write-Host "Verified $($expectedHashes.Count) immutable references."
Write-Host "Verified $($canonicalRoles.Count) role-isomorphic color tokens across three modes."
$contrastSummary = $contrastResults | Group-Object Mode | ForEach-Object {
    $minimumResult = $_.Group | Sort-Object Ratio | Select-Object -First 1
    [pscustomobject]@{
        Mode = $_.Name
        CheckedPairs = $_.Count
        MinimumPair = $minimumResult.Pair
        MinimumRatio = "$($minimumResult.Ratio):1"
    }
}
$contrastSummary | Format-Table -AutoSize
Write-Host "Verified $($contrastResults.Count) required text, action, focus, and status contrast pairs."
Write-Host 'Candidate verification passed.'
