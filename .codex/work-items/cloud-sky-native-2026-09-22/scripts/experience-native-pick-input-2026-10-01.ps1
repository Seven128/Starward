param([switch]$UseViewportTap)
. (Join-Path $PSScriptRoot 'experience-current-native-helpers-2026-10-01.ps1')

# Bounded development trace of the official SDK event stream. The temporary
# dispatcher wrapper forwards every event unchanged and is restored in finally.
# No React handler, selection, astronomical state, or Context is injected.
$skyPickProbeInstalled=$false
$skyPickProbeInstall='function(){var p=getCurrentPages().at(-1);if(p.route!=="sky/detail/index"||typeof p.eh!=="function"||p.__skyTaskPickTrace)throw new Error("Unexpected current page");var labels=[];function walk(n){if(n.cl==="sky-orientation-catalog-label")labels.push({label:n.ariaLabel,style:n.st});(n.cn||[]).forEach(walk)}walk(p.data.root);var s={original:p.eh,events:[]};p.__skyTaskPickTrace=s;p.eh=function(){var e=arguments[0];function points(a){return Array.isArray(a)?a.slice(0,4).map(function(t){return {x:t.x,y:t.y,clientX:t.clientX,clientY:t.clientY,pageX:t.pageX,pageY:t.pageY,keys:Object.keys(t)}}):null}if(s.events.length<8)s.events.push({argumentCount:arguments.length,type:e&&e.type,keys:e&&typeof e==="object"?Object.keys(e):[],touches:points(e&&e.touches),changedTouches:points(e&&e.changedTouches)});return s.original.apply(this,arguments)};return {route:p.route,installed:p.eh!==s.original,labels:labels}}'
$skyPickProbeRestore='function(){var p=getCurrentPages().at(-1),s=p.__skyTaskPickTrace;if(!s)return {route:p.route,installed:false,events:[]};p.eh=s.original;delete p.__skyTaskPickTrace;return {route:p.route,restored:p.eh===s.original,events:s.events}}'
try {
 $skyPickProbe=(Invoke-SkyCurrentUi 'automation_evaluate' @('--project',$skyCurrentProject,'--fn-source',$skyPickProbeInstall)).result.result
 $skyPickProbeInstalled=$skyPickProbe.installed -eq $true
 Add-SkyCurrentObservation 'composition-pick-input-trace-installed' $skyPickProbe
 if(-not $skyPickProbeInstalled){throw 'Dispatcher trace installation was not observed'}
 $skyPickProbeLabel=@($skyPickProbe.labels | Where-Object label -Match 'HR\s*8162')
 if($skyPickProbeLabel.Count -ne 1 -or $skyPickProbeLabel[0].style -notmatch 'left:\s*([\d.]+)px;\s*top:\s*([\d.]+)px'){throw 'Expected one currently painted named star'}
 $skyPickProbeX=[double]::Parse($Matches[1],[Globalization.CultureInfo]::InvariantCulture)
 $skyPickProbeY=[double]::Parse($Matches[2],[Globalization.CultureInfo]::InvariantCulture)
 $skyPickProbeDirectory=Join-Path $skyCurrentTask ('tmp/current-native-inputs/'+[Guid]::NewGuid().ToString('N'))
 [IO.Directory]::CreateDirectory($skyPickProbeDirectory) | Out-Null
 $skyPickProbePointFile=Join-Path $skyPickProbeDirectory 'point.json'
 $skyPickProbeEmptyFile=Join-Path $skyPickProbeDirectory 'empty.json'
 $skyPickProbePoint=@{identifier=1;x=$skyPickProbeX;y=$skyPickProbeY;clientX=$skyPickProbeX;clientY=$skyPickProbeY;pageX=$skyPickProbeX;pageY=$skyPickProbeY}
 [IO.File]::WriteAllText($skyPickProbePointFile,(ConvertTo-Json -InputObject @($skyPickProbePoint) -Compress),[Text.UTF8Encoding]::new($false))
 [IO.File]::WriteAllText($skyPickProbeEmptyFile,'[]',[Text.UTF8Encoding]::new($false))
 if($UseViewportTap){
  Invoke-SkyCurrentUi 'automation_element_action' @('--project',$skyCurrentProject,'--action','tap','--x',$skyPickProbeX.ToString('R',[Globalization.CultureInfo]::InvariantCulture),'--y',$skyPickProbeY.ToString('R',[Globalization.CultureInfo]::InvariantCulture)) | Out-Null
 } else {
  Invoke-SkyCurrentUi 'automation_element_action' @('--project',$skyCurrentProject,'--action','touchstart','--selector','canvas','--touches-file',$skyPickProbePointFile,'--changed-touches-file',$skyPickProbePointFile) | Out-Null
  Invoke-SkyCurrentUi 'automation_element_action' @('--project',$skyCurrentProject,'--action','touchend','--selector','canvas','--touches-file',$skyPickProbeEmptyFile,'--changed-touches-file',$skyPickProbePointFile) | Out-Null
 }
 Add-SkyCurrentObservation 'composition-pick-input-traced-touch' @{reference='HR 8162';x=$skyPickProbeX;y=$skyPickProbeY;input=if($UseViewportTap){'viewport tap'}else{'selector touch stream'};scope='Official SDK native input, not physical gesture acceptance'}
} finally {
 $skyPickProbeResult=(Invoke-SkyCurrentUi 'automation_evaluate' @('--project',$skyCurrentProject,'--fn-source',$skyPickProbeRestore)).result.result
 Add-SkyCurrentObservation 'composition-pick-input-trace-restored' $skyPickProbeResult
 $skyPickProbeResult | ConvertTo-Json -Depth 9 -Compress
 if($skyPickProbeInstalled -and -not $skyPickProbeResult.restored){throw 'Dispatcher restoration was not observed'}
}
$skyPickProbeAfter=Read-SkyCurrentUi 'composition-pick-input-trace-after'
@{canvas=$skyPickProbeAfter.canvas;selection=$skyPickProbeAfter.selection;modal=$skyPickProbeAfter.modal;actions=$skyPickProbeAfter.actions} | ConvertTo-Json -Depth 8 -Compress
