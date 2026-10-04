# Targeted DevTools interaction evidence; not physical-device or pixel acceptance.
# Run from repository root when the warm project is on pages/map/index.
. "$PSScriptRoot/wechatide-client.ps1"
$trackingProject = 'E:/dev/worktrees/Starward/remote-main-20260908/apps/wechat-miniapp'
$observations = [ordered]@{}
function Invoke-TrackingUI([string]$Selector, [string]$Action, [string[]]$Extra = @()) {
  $response = Invoke-StarwardWechatTool -Tool automation_element_action -ToolArguments (@('--project', $trackingProject, '--selector', $Selector, '--action', $Action) + $Extra)
  if (!$response.ok) { throw "UI action failed: $Action $Selector $($response.message)" }
  return $response.result
}
function Open-TrackingControl([string]$Label) {
  $markup = Invoke-TrackingUI '.sky-control-dock' 'wxml'
  $match = [regex]::Match($markup, '<button id="([^"]+)"[^>]*>' + [regex]::Escape($Label) + '</button>')
  if (!$match.Success) { throw "Control missing: $Label" }
  Invoke-TrackingUI ('#' + $match.Groups[1].Value) 'tap' | Out-Null
}
function Select-TrackingTime([string]$Time) {
  $markup = Invoke-TrackingUI '#sky-orientation-time-ruler-scroll' 'wxml'
  $match = [regex]::Match($markup, '<button id="([^"]+)"[^>]*aria-label="' + [regex]::Escape($Time) + '，[^>]*>')
  if (!$match.Success) { throw "Time missing: $Time" }
  Invoke-TrackingUI ('#' + $match.Groups[1].Value) 'tap' | Out-Null
  $actual = Invoke-TrackingUI '.sky-orientation-time-ruler__current' 'text' @('--wait','1')
  if ($actual -ne $Time) { throw "Time not committed: $actual" }
}
function Pinch-TrackingSky([bool]$Widen) {
  $far = '[{"identifier":1,"clientX":60,"clientY":400},{"identifier":2,"clientX":330,"clientY":400}]'
  $near = '[{"identifier":1,"clientX":170,"clientY":400},{"identifier":2,"clientX":220,"clientY":400}]'
  $start = if ($Widen) { $far } else { $near }
  $end = if ($Widen) { $near } else { $far }
  Invoke-TrackingUI '.sky-orientation-canvas__surface' 'touchstart' @('--touches',$start) | Out-Null
  Invoke-TrackingUI '.sky-orientation-canvas__surface' 'touchmove' @('--touches',$end) | Out-Null
  Invoke-TrackingUI '.sky-orientation-canvas__surface' 'touchend' @('--touches','[]','--changed-touches',$end) | Out-Null
}
Invoke-TrackingUI '.map-search-entry' 'tap' | Out-Null
Invoke-TrackingUI 'input' 'input' @('--value','示例') | Out-Null
$card = Invoke-TrackingUI '.spot-identity-card' 'text' @('--wait','1')
if ($card -notmatch '示例观星点') { throw 'Unexpected spot' }
Invoke-TrackingUI '.spot-identity-card' 'tap' | Out-Null
Invoke-TrackingUI '.spot-panel__action--cloud' 'tap' @('--wait-for-selector','.spot-panel__action--cloud') | Out-Null
Invoke-TrackingUI '.sky-control-dock' 'text' @('--wait-for-selector','.sky-control-dock') | Out-Null
Open-TrackingControl '天体列表'
Invoke-TrackingUI '.sky-object-search__input' 'input' @('--value','织女星') | Out-Null
$observations.search = Invoke-TrackingUI '.sky-object-search__result' 'text' @('--wait','1')
if ($observations.search -notmatch 'HR 7001') { throw 'Unexpected celestial identity' }
Invoke-TrackingUI '.sky-object-search__result' 'tap' | Out-Null
$observations.initialPosition = Invoke-TrackingUI '.sky-object-position-action' 'text' @('--wait-for-selector','.sky-object-track')
Invoke-TrackingUI '.sky-object-track' 'tap' | Out-Null
$observations.started = Invoke-TrackingUI '.sky-object-tracking-status' 'text'
Open-TrackingControl '时间轴'
Select-TrackingTime '22:00'
Open-TrackingControl '收起时间轴'
Pinch-TrackingSky $true
$observations.overview = Invoke-TrackingUI '.sky-object-tracking-status' 'text'
$observations.cardinalBefore = Invoke-TrackingUI '.sky-cardinal-label' 'outerWxml'
Open-TrackingControl '时间轴'
Select-TrackingTime '23:00'
Open-TrackingControl '收起时间轴'
$observations.cardinalAfter = Invoke-TrackingUI '.sky-cardinal-label' 'outerWxml'
Pinch-TrackingSky $false
$observations.returnStatus = Invoke-TrackingUI '.sky-object-tracking-status' 'text' @('--wait','1')
$observations.returnCamera = Invoke-TrackingUI '.sky-orientation-canvas' 'attribute' @('--name','aria-label')
$observations.returnMarker = Invoke-TrackingUI '.sky-located-object' 'outerWxml'
Invoke-TrackingUI '.sky-located-object' 'tap' | Out-Null
$observations.latestPosition = Invoke-TrackingUI '.sky-object-position-action' 'text'
Invoke-TrackingUI '.sky-object-modal__close' 'tap' | Out-Null
$observations | ConvertTo-Json -Depth 4 | Set-Content "$PSScriptRoot/evidence/celestial-tracking-ui-final-return.json"
$observations | ConvertTo-Json -Depth 4
