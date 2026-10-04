$ErrorActionPreference='Stop'
. (Join-Path $PSScriptRoot 'experience-current-native-helpers-2026-10-01.ps1')
$skyGReadyPath=Join-Path $skyCurrentTask 'evidence/experience-current-native-galactic-production-ready-2026-10-01.png'
if(Test-Path -LiteralPath $skyGReadyPath){throw 'Preserve native production capture'}
$skyGC=(Get-Content -LiteralPath (Join-Path $skyCurrentTask 'tmp/current-native-context-2026-10-01.json') -Raw | ConvertFrom-Json -DateKind String).data
$skyGR=(Get-Content -LiteralPath (Join-Path $skyCurrentTask 'tmp/current-native-report-2026-10-01.json') -Raw | ConvertFrom-Json -DateKind String).data.context
if($skyGC.privacyClass -ne 'PUBLIC_REFERENCE' -or $skyGC.contextId -ne $skyGR.contextId -or $skyGC.contextFingerprint -ne $skyGR.contextFingerprint){throw 'Owned Context binding changed'}
$skyGRoute=(Invoke-SkyCurrentUi 'automation_evaluate' @('--project',$skyCurrentProject,'--fn-source','function(){return {route:getCurrentPages().at(-1).route}}')).result.result
$skyGParams=@{
 spotId=$skyGC.location.spotId;contextId=$skyGC.contextId;date=$skyGC.localDate;selectedAt=$skyGR.at
 timezone=$skyGC.timezone;dataRevision=$skyGR.dataRevision;locationName='示例观星点'
}
$skyGUrl='/sky/detail/index?'+(($skyGParams.GetEnumerator() | ForEach-Object { [uri]::EscapeDataString($_.Key)+'='+[uri]::EscapeDataString([string]$_.Value) }) -join '&')
if($skyGRoute.route -eq 'pages/map/index'){
 Invoke-SkyCurrentUi 'automation_navigate' @('--project',$skyCurrentProject,'--action','navigateTo','--url',$skyGUrl) | Out-Null
 Add-SkyCurrentObservation 'galactic-production-reentered-owned-context' @{from=$skyGRoute.route;route='sky/detail/index';scope='Existing owned Context after real watch reload; no Context resolve/PUT or IDE restart'}
}elseif($skyGRoute.route -ne 'sky/detail/index'){throw 'Expected the already observed owned Sky route'}
$skyGEntry=Read-SkyCurrentUi 'galactic-production-entry'
$skyGManual=@($skyGEntry.actions | Where-Object { $_.text -eq '手动查看' })
if($skyGManual.Count -ne 1){throw 'Expected one observed manual entry'}
Tap-SkyCurrentAction $skyGManual[0].text 'galactic-production-manual-entry' | Out-Null
$skyGReady=Read-SkyCurrentUi 'galactic-production-ready'
if(-not $skyGReady.canvas.label -or -not $skyGReady.canvas.label.Contains('2026-09-30T13:50:33.000Z')){throw 'Current native frame is not bound to expected instant'}
Save-SkyCurrentCapture 'galactic-production-ready' | Out-Null
Pinch-SkyCurrentView 200 15 'galactic-production-expand' | Out-Null
$skyGDome=Read-SkyCurrentUi 'galactic-production-dome'
Save-SkyCurrentCapture 'galactic-production-dome' | Out-Null
Pinch-SkyCurrentView 15 200 'galactic-production-return' | Out-Null
$skyGReturn=Read-SkyCurrentUi 'galactic-production-returned'
Save-SkyCurrentCapture 'galactic-production-returned' | Out-Null
$skyGFiles=Read-SkyCurrentFiles 'galactic-production-owned-files'
@{entry=$skyGReady.canvas.label;expanded=$skyGDome.canvas.label;returned=$skyGReturn.canvas.label;files=$skyGFiles;scope='Current ordinary source and official SDK canvas gesture; physical phone and WXML composition remain unverified/failed as recorded'} | ConvertTo-Json -Depth 6 -Compress
