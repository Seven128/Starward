param([Parameter(Mandatory)][ValidatePattern('^[a-z0-9-]+$')][string]$Stage,
  [switch]$Local, [switch]$Return, [switch]$MatchedLocal, [switch]$MatchedReturn, [switch]$ReadbackOnly)
$ErrorActionPreference='Stop'
. (Join-Path $PSScriptRoot 'experience-current-native-helpers-2026-10-01.ps1')
if(@($Local,$Return,$MatchedLocal,$MatchedReturn).Where({[bool]$_}).Count -gt 1){throw 'Choose one public gesture'}
if($Local){Pinch-SkyCurrentView 40 380 ($Stage+'-input')}
if($Return){Pinch-SkyCurrentView 340 (340*40/380) ($Stage+'-input')}
if($MatchedLocal){Pinch-SkyCurrentView 40 340 ($Stage+'-input')}
if($MatchedReturn){Pinch-SkyCurrentView 340 40 ($Stage+'-input')}
$state=Read-SkyCurrentUi ($Stage+'-state')
$source=@'
function(){var p=getCurrentPages().at(-1),out={route:p.route,view:null,serializedCameraPresent:false};function walk(n){if(n.cl==='sky-orientation-canvas'){out.serializedCameraPresent=Object.prototype.hasOwnProperty.call(n,'dataSkyPresentedView');var raw=n.dataSkyPresentedView;if(typeof raw==='string'&&raw){var v=JSON.parse(raw);if(v)out.view={frameAt:v.frameAt,width:v.width,height:v.height,verticalFovDeg:v.verticalFovDeg,basis:{right:v.basis.right,up:v.basis.up,forward:v.basis.forward},center:{x:v.center.x,y:v.center.y},scale:v.scale}}}(n.cn||[]).forEach(walk)}walk(p.data.root);return out}
'@
$value=(Invoke-SkyCurrentUi 'automation_evaluate' @('--project',$skyCurrentProject,'--fn-source',$source)).result.result
if($value.route -ne 'sky/detail/index' -or -not $value.view){throw 'Current completed view was not available'}
Add-SkyCurrentObservation ($Stage+'-view') $value
$value | ConvertTo-Json -Depth 10 -Compress
if(-not $ReadbackOnly){Save-SkyCurrentCapture $Stage | ConvertTo-Json -Depth 4 -Compress}
