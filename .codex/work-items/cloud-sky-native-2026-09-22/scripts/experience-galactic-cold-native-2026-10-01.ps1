param([Parameter(Mandatory)][ValidateSet('dispatch')][string]$Action)
$ErrorActionPreference='Stop'
. (Join-Path $PSScriptRoot 'experience-current-native-helpers-2026-10-01.ps1')
$stage='galactic-cold'
$events=Get-Content -LiteralPath $skyCurrentTrace | ForEach-Object {$_ | ConvertFrom-Json -AsHashtable -DateKind String}
if($events | Where-Object stage -eq ($stage+'-compiler-requested')){throw 'Preserve the single galaxy source-owner batch dispatch'}
Add-SkyCurrentObservation ($stage+'-compiler-requested') @{scope='Separate frame visibility from live Canvas ownership, using the existing bounded native file loader. Same ordinary watch/project/session; actual PNG gates SDK reads.'}
Invoke-SkyCurrentUi 'simulator_refresh' @('--project',$skyCurrentProject) | Out-Null
Add-SkyCurrentObservation ($stage+'-compiler-dispatched') @{success=$true}
Save-SkyCurrentCapture ($stage+'-dispatched') | ConvertTo-Json -Depth 4 -Compress
