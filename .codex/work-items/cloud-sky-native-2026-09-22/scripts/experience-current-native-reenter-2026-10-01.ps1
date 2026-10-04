param([Parameter(Mandatory)][string]$Stage)
$ErrorActionPreference='Stop'
. (Join-Path $PSScriptRoot 'experience-current-native-helpers-2026-10-01.ps1')
if($Stage -notmatch '^[a-z0-9-]+$'){throw 'Invalid observation stage'}
$skyReentryContext=(Get-Content -LiteralPath (Join-Path $skyCurrentTask 'tmp/current-native-context-2026-10-01.json') -Raw | ConvertFrom-Json -DateKind String).data
$skyReentryReport=(Get-Content -LiteralPath (Join-Path $skyCurrentTask 'tmp/current-native-report-2026-10-01.json') -Raw | ConvertFrom-Json -DateKind String).data.context
if($skyReentryContext.privacyClass -ne 'PUBLIC_REFERENCE' -or $skyReentryContext.contextId -ne $skyReentryReport.contextId -or $skyReentryContext.contextFingerprint -ne $skyReentryReport.contextFingerprint){throw 'Owned Context binding changed'}
$skyReentryRoute=(Invoke-SkyCurrentUi 'automation_evaluate' @('--project',$skyCurrentProject,'--fn-source','function(){return {route:getCurrentPages().at(-1).route}}')).result.result
if($skyReentryRoute.route -eq 'pages/map/index'){
 $skyReentryParams=@{spotId=$skyReentryContext.location.spotId;contextId=$skyReentryContext.contextId;date=$skyReentryContext.localDate;selectedAt=$skyReentryReport.at;timezone=$skyReentryContext.timezone;dataRevision=$skyReentryReport.dataRevision;locationName='示例观星点'}
 $skyReentryUrl='/sky/detail/index?'+(($skyReentryParams.GetEnumerator() | ForEach-Object {[uri]::EscapeDataString($_.Key)+'='+[uri]::EscapeDataString([string]$_.Value)}) -join '&')
 Invoke-SkyCurrentUi 'automation_navigate' @('--project',$skyCurrentProject,'--action','navigateTo','--url',$skyReentryUrl) | Out-Null
 Add-SkyCurrentObservation ($Stage+'-reentered-owned-context') @{from=$skyReentryRoute.route;route='sky/detail/index';scope='Existing owned Context after source watch reload; no resolve/PUT, IDE restart or new watch'}
} elseif($skyReentryRoute.route -ne 'sky/detail/index'){throw 'Expected observed Map or Sky route'}
$skyReentryUi=Read-SkyCurrentUi ($Stage+'-entry')
if(@($skyReentryUi.actions | Where-Object text -eq '手动查看').Count -eq 1){Tap-SkyCurrentAction '手动查看' ($Stage+'-manual') | Out-Null}
$skyReentryReady=Read-SkyCurrentUi ($Stage+'-ready')
if(-not $skyReentryReady.canvas.label -or -not $skyReentryReady.canvas.label.Contains('2026-09-30T13:50:33.000Z')){throw 'Current frame does not bind the expected instant'}
@{canvas=$skyReentryReady.canvas;ownedContextReused=$true;scope='Current official SDK development view, not phone acceptance'} | ConvertTo-Json -Depth 5 -Compress
