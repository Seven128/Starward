param([Parameter(Mandatory)][ValidateSet('dispatch','capture')][string]$Action)
$ErrorActionPreference='Stop'
. (Join-Path $PSScriptRoot 'experience-current-native-helpers-2026-10-01.ps1')
$stage='conditional-cache'
if($Action -eq 'capture'){
 Save-SkyCurrentCapture ($stage+'-observed') | ConvertTo-Json -Depth 4 -Compress
 exit
}
$events=Get-Content -LiteralPath $skyCurrentTrace | ForEach-Object {$_ | ConvertFrom-Json -AsHashtable -DateKind String}
if($events | Where-Object stage -eq ($stage+'-compiler-requested')){throw 'Do not redispatch the source-change compilation'}
Add-SkyCurrentObservation ($stage+'-compiler-requested') @{scope='Production conditional-response request fence repair; one source compile on the same project/watch/session. Actual application screenshot gates SDK reads.'}
Invoke-SkyCurrentUi 'simulator_refresh' @('--project',$skyCurrentProject) | Out-Null
Add-SkyCurrentObservation ($stage+'-compiler-dispatched') @{success=$true}
Save-SkyCurrentCapture ($stage+'-dispatched') | ConvertTo-Json -Depth 4 -Compress
