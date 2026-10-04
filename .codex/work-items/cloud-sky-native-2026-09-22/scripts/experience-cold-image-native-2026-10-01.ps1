param([switch]$ReadbackOnly,[string]$CapturePrefix='cold-image')
$ErrorActionPreference='Stop'
. (Join-Path $PSScriptRoot 'experience-current-native-helpers-2026-10-01.ps1')
if($CapturePrefix -notmatch '^[a-z0-9-]+$'){throw 'Invalid capture prefix'}
if(-not $ReadbackOnly){
& (Join-Path $PSScriptRoot 'experience-current-native-reenter-2026-10-01.ps1') -Stage cold-image-current-watch
$ui=Read-SkyCurrentUi 'cold-image-native-before-scene'
if($ui.canvas.scene -ne 'READY' -or -not $ui.canvas.label.Contains('45.0')){throw 'Expected live45 native baseline'}
& (Join-Path $PSScriptRoot 'experience-native-file-digests-2026-10-01.ps1') -Stage resource-source-cold-image-baseline
Save-SkyCurrentCapture ($CapturePrefix+'-before') | Out-Null
Pinch-SkyCurrentView 40 380 'cold-image-native-local-input'
$local=Read-SkyCurrentUi 'cold-image-native-local-scene'
$fov=[double]([regex]::Match($local.canvas.label,'垂直视场 ([0-9.]+) 度').Groups[1].Value)
if($local.canvas.scene -ne 'READY' -or -not($fov -gt 0 -and $fov -lt 10)){throw 'Expected illustration-free local view'}
& (Join-Path $PSScriptRoot 'experience-native-file-digests-2026-10-01.ps1') -Stage resource-source-cold-image-local
Save-SkyCurrentCapture ($CapturePrefix+'-local') | Out-Null
Pinch-SkyCurrentView 340 (340*40/380) 'cold-image-native-return-input'
$return=Read-SkyCurrentUi 'cold-image-native-return-scene'
if($return.canvas.scene -ne 'READY' -or -not $return.canvas.label.Contains('45.0')){throw 'Expected native common-view return'}
& (Join-Path $PSScriptRoot 'experience-native-file-digests-2026-10-01.ps1') -Stage resource-source-cold-image-return
Save-SkyCurrentCapture ($CapturePrefix+'-return') | Out-Null
# Retire the owner while illustration files are cold, not only when all bitmaps
# are wanted again. The ordinary watch, IDE and BFF remain the same sessions.
Pinch-SkyCurrentView 40 380 'cold-image-native-cold-exit-input'
Read-SkyCurrentUi 'cold-image-native-cold-exit-scene' | Out-Null
Tap-SkyCurrentAction '返回' 'cold-image-native-public-exit'
$retired=Read-SkyCurrentFiles 'cold-image-native-public-exit-files'
if($retired.count -ne 0){throw 'Cold files survived their native owner exit'}
& (Join-Path $PSScriptRoot 'experience-current-native-reenter-2026-10-01.ps1') -Stage cold-image-final-restored
Read-SkyCurrentUi 'cold-image-final-restored-scene' | Out-Null
Read-SkyCurrentFiles 'cold-image-final-restored-files' | Out-Null
Save-SkyCurrentCapture ($CapturePrefix+'-final-restored') | Out-Null
}
$expected=(Get-Content -LiteralPath (Join-Path $skyCurrentTask 'tmp/current-native-context-2026-10-01.json') -Raw | ConvertFrom-Json -DateKind String).data
$actual=(Invoke-WebRequest -Uri ('http://127.0.0.1:60065/v2/observation-contexts/'+[uri]::EscapeDataString($expected.contextId))).Content | ConvertFrom-Json -DateKind String
$alias=(Invoke-WebRequest -Uri 'http://127.0.0.1:60065/__task/alias-state').Content | ConvertFrom-Json -DateKind String
if(-not ($expected.revision -ge 1 -and $actual.data.revision -ge 1) -or -not ($expected.selectedAtUtc -is [string] -and $actual.data.selectedAtUtc -is [string]) -or -not $expected.contextFingerprint){throw 'Required producer Context fields missing'}
$readback=@{revision=$actual.data.revision;revisionUnchanged=$actual.data.revision -eq $expected.revision;instantUnchanged=[DateTimeOffset]::Parse($actual.data.selectedAtUtc) -eq [DateTimeOffset]::Parse($expected.selectedAtUtc);fingerprintUnchanged=$actual.data.contextFingerprint -eq $expected.contextFingerprint;contextPuts=$alias.counts.contextPuts;moduleSha256=$alias.moduleSha256}
Add-SkyCurrentObservation 'cold-image-durable-context-readback' $readback
if(-not $readback.revisionUnchanged -or -not $readback.instantUnchanged -or -not $readback.fingerprintUnchanged -or $readback.contextPuts -ne 0){throw 'Owned durable Context changed'}
$readback | ConvertTo-Json -Compress
