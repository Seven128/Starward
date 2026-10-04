param([Parameter(Mandatory)][ValidateSet('dispatch')][string]$Action)
$ErrorActionPreference='Stop'
. (Join-Path $PSScriptRoot 'experience-current-native-helpers-2026-10-01.ps1')
$stage='landscape-empty-view-mask-owner'
$events=Get-Content -LiteralPath $skyCurrentTrace | ForEach-Object {$_ | ConvertFrom-Json -AsHashtable -DateKind String}
if($events | Where-Object stage -eq ($stage+'-compiler-requested')){throw 'Preserve the single source-owner correction dispatch'}
Add-SkyCurrentObservation ($stage+'-compiler-requested') @{scope='Correct mask identity while a coarse bitmap remains usable. Same ordinary watch/project/session; actual application PNG gates SDK reads.'}
Invoke-SkyCurrentUi 'simulator_refresh' @('--project',$skyCurrentProject) | Out-Null
Add-SkyCurrentObservation ($stage+'-compiler-dispatched') @{success=$true}
Save-SkyCurrentCapture ($stage+'-dispatched') | ConvertTo-Json -Depth 4 -Compress
