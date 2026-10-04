param([Parameter(Mandatory)][ValidatePattern('^[a-z0-9-]+$')][string]$Stage,
 [ValidateSet('start','wide','return')][string]$Flow='start')
$ErrorActionPreference='Stop'
. (Join-Path $PSScriptRoot 'experience-current-native-helpers-2026-10-01.ps1')
if($Flow -eq 'start'){
 Tap-SkyCurrentAction '天体列表' ($Stage+'-list-open')
 Tap-SkyCurrentAction '月球 月球  ·  SOLAR MOON' ($Stage+'-moon-select')
 Tap-SkyCurrentAction '跟踪天体' ($Stage+'-moon-track')
 Pinch-SkyCurrentView 40 340 ($Stage+'-local-input')
} elseif($Flow -eq 'wide'){
 Pinch-SkyCurrentView 340 40 ($Stage+'-to45-input')
 Pinch-SkyCurrentView 300 100 ($Stage+'-wide-input')
} else {
 Pinch-SkyCurrentView 100 300 ($Stage+'-to45-input')
 Pinch-SkyCurrentView 40 340 ($Stage+'-local-input')
}
& (Join-Path $PSScriptRoot 'experience-zoom-camera-native-2026-10-01.ps1') -Stage $Stage -ReadbackOnly
& (Join-Path $PSScriptRoot 'experience-native-file-digests-2026-10-01.ps1') -Stage ($Stage+'-files')
Save-SkyCurrentCapture $Stage | ConvertTo-Json -Compress
