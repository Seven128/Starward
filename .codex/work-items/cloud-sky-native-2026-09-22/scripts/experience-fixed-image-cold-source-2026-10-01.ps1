param([Parameter(Mandatory)][ValidatePattern('^[a-z0-9-]+$')][string]$Stage,[switch]$Back)
$ErrorActionPreference='Stop'
. (Join-Path $PSScriptRoot 'experience-current-native-helpers-2026-10-01.ps1')
$source=@'
function(){var pages=getCurrentPages(),p=pages.at(-1),out={route:p.route,stack:pages.map(function(p){return p.route}),text:'',back:[]};
var a=[];function walk(n){if(typeof n.v==='string')a.push(n.v);if(n.ariaLabel==='返回')out.back.push({sid:n.sid,label:n.ariaLabel,cl:n.cl});(n.cn||[]).forEach(walk)}walk(p.data.root);out.text=a.join(' ').slice(0,5000);return out}
'@
$value=(Invoke-SkyCurrentUi 'automation_evaluate' @('--project',$skyCurrentProject,'--fn-source',$source)).result.result
if($value.route -ne 'sky/sources/index' -or $value.text -notmatch '月球'){throw 'Owned Moon source route not observed'}
Add-SkyCurrentObservation ($Stage+'-route') $value
if($Back){
 if($value.back.Count -ne 1){throw 'Expected one observed public source Back control'}
 $selector='#'+$value.back[0].sid
 $found=Invoke-SkyCurrentUi 'automation_page_action' @('--project',$skyCurrentProject,'--action','querySelectorAll','--selector',$selector)
 if($found.elements.Count -ne 1){throw 'Observed public source Back is not unique'}
 Invoke-SkyCurrentUi 'automation_element_action' @('--project',$skyCurrentProject,'--action','tap','--selector',$selector) | Out-Null
 Add-SkyCurrentObservation ($Stage+'-back-input') @{selector=$selector;scope='Current observed source header Back control through official SDK'}
 Read-SkyCurrentUi ($Stage+'-returned-state') | Out-Null
} else {
 Read-SkyCurrentFiles ($Stage+'-hidden-files') | ConvertTo-Json -Compress
 Save-SkyCurrentCapture $Stage | ConvertTo-Json -Compress
}
