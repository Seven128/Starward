$skyScene45Project='E:/dev/worktrees/Starward/remote-main-20260908/apps/wechat-miniapp/dist/weapp-check-sky-scene-v45'
$skyScene45Task=Split-Path -Parent $PSScriptRoot
$skyScene45Trace=Join-Path $skyScene45Task 'evidence/experience-scene-v45-native-events-2026-09-30.jsonl'
if (Test-Path -LiteralPath (Join-Path $skyScene45Task 'evidence/experience-scene-v45-binding-2026-09-30.json')) { throw 'This scene journey is frozen; start a new trace.' }
function Add-SkyScene45Observation($stage,$value) {
  [IO.File]::AppendAllText($skyScene45Trace,(@{observedUtc=[DateTime]::UtcNow.ToString('o');stage=$stage;value=$value}|ConvertTo-Json -Depth 16 -Compress)+"`n",[Text.UTF8Encoding]::new($false))
}
function Invoke-SkyScene45Ui($tool,$arguments) {
  $reply=(& 'E:/微信web开发者工具/wechatide.cmd' -c Codex $tool @arguments)|ConvertFrom-Json
  if (-not $reply.ok -or $reply.result.success -eq $false) {
    Add-SkyScene45Observation 'tool-failure' @{tool=$tool;reason=$reply.reason;errorType=$reply.errorType}
    throw ('Official UI failed: '+$tool+' / '+$reply.reason)
  }
  return $reply.result
}
function Read-SkyScene45Ui($stage) {
  $fn="function(){var out={route:null,canvas:null,sdk:wx.getAppBaseInfo().SDKVersion,selection:[],modal:[],search:[],actions:[],layers:[]};var p=getCurrentPages()[getCurrentPages().length-1];out.route=p.route;var s=wx.getStorageSync('starward.wechat-miniapp.state.current');var c=s&&s.observationContext;out.context=c?{contextId:c.contextId,contextFingerprint:c.contextFingerprint,revision:c.revision,selectedAtUtc:c.selectedAtUtc,localDate:c.localDate,timezone:c.timezone}:null;function text(n){var a=[];function r(x){if(typeof x.v==='string')a.push(x.v);(x.cn||[]).forEach(r)}r(n);return a.join(' ')}function walk(n){var cl=n.cl||'',t=text(n);if((n.ariaLabel||'').indexOf('方位高度天空图')>=0)out.canvas=n.ariaLabel;if(cl.indexOf('sky-selected')>=0||cl.indexOf('sky-selection')>=0||cl.indexOf('sky-object-tracking')>=0)out.selection.push({sid:n.sid,cl:cl,label:n.ariaLabel,text:t});if(cl==='liquid-glass-surface sky-object-modal__panel')out.modal.push({label:n.ariaLabel,text:t.slice(0,2600)});if(cl.indexOf('sky-object-search')>=0)out.search.push({sid:n.sid,cl:cl,label:n.ariaLabel,text:t.slice(0,600)});if(cl.indexOf('sky-constellation')>=0)out.layers.push({sid:n.sid,cl:cl,label:n.ariaLabel,text:t});if(n.nn==='button')out.actions.push({sid:n.sid,cl:cl,label:n.ariaLabel,text:t.slice(0,140)});(n.cn||[]).forEach(walk)}walk(p.data.root);return out}"
  $result=Invoke-SkyScene45Ui 'automation_evaluate' @('--project',$skyScene45Project,'--fn-source',$fn)
  $value=$result.result.result
  if (-not $value.route) { throw 'Missing native observation' }
  $native=Invoke-SkyScene45Ui 'automation_element_action' @('--project',$skyScene45Project,'--action','attribute','--selector','.sky-orientation-canvas','--name','aria-label')
  Add-SkyScene45Observation $stage @{project=$skyScene45Project;shadowUi=$value;nativeCanvas=$native}
  return $value
}
function Save-SkyScene45Capture($stage) {
  if ($stage -notmatch '^[a-z0-9-]+$') { throw 'Invalid stage' }
  $target=Join-Path $skyScene45Task ('evidence/experience-scene-v45-'+$stage+'-2026-09-30.png')
  if (Test-Path -LiteralPath $target) { throw 'Refuse capture overwrite' }
  $shot=Invoke-SkyScene45Ui 'simulator_screenshot' @('--project',$skyScene45Project,'--optimize','false','--path',$target)
  $value=@{project=$skyScene45Project;path=$target;width=$shot.imageWidth;height=$shot.imageHeight;sha256=(Get-FileHash -LiteralPath $target).Hash.ToLowerInvariant()}
  Add-SkyScene45Observation $stage $value
  return $value
}
function Invoke-SkyScene45PublicButton($parentSelector,$text) {
  $wxml=Invoke-SkyScene45Ui 'automation_element_action' @('--project',$skyScene45Project,'--action','outerWxml','--selector',$parentSelector)
  $buttons=@([regex]::Matches($wxml,'(?s)<button\b(?<attrs>[^>]*)>(?<content>.*?)</button>')|Where-Object {
    [Net.WebUtility]::HtmlDecode([regex]::Replace($_.Groups['content'].Value,'<[^>]+>','')).Trim() -eq $text
  })
  if($buttons.Count -ne 1 -or $buttons[0].Groups['attrs'].Value -notmatch 'disabled="false"'){throw 'Expected one enabled public button'}
  $id=[regex]::Match($buttons[0].Groups['attrs'].Value,'\bid="([^"]+)"').Groups[1].Value
  if(-not $id){throw 'Missing native button identity'}
  Add-SkyScene45Observation 'public-button' @{project=$skyScene45Project;container=$parentSelector;text=$text;nativeButton=$buttons[0].Value}
  Invoke-SkyScene45Ui 'automation_element_action' @('--project',$skyScene45Project,'--action','tap','--selector',('#'+$id))|Out-Null
}
function Invoke-SkyScene45Pinch($startDistance,$endDistance) {
  $size=Invoke-SkyScene45Ui 'automation_element_action' @('--project',$skyScene45Project,'--action','size','--selector','canvas')
  $offset=Invoke-SkyScene45Ui 'automation_element_action' @('--project',$skyScene45Project,'--action','offset','--selector','canvas')
  $cx=$offset.left+$size.width/2; $cy=$offset.top+$size.height/2
  function touches($distance) { return @(@{identifier=1;pageX=$cx-$distance/2;pageY=$cy;clientX=$cx-$distance/2;clientY=$cy},@{identifier=2;pageX=$cx+$distance/2;pageY=$cy;clientX=$cx+$distance/2;clientY=$cy}) }
  $folder=Join-Path $skyScene45Task ('tmp/v45-touch-'+[guid]::NewGuid().ToString('N'))
  [IO.Directory]::CreateDirectory($folder)|Out-Null
  $start=Join-Path $folder 'start.json'; $move=Join-Path $folder 'move.json'; $end=Join-Path $folder 'end.json'
  [IO.File]::WriteAllText($start,(touches $startDistance|ConvertTo-Json -Depth 4 -Compress),[Text.UTF8Encoding]::new($false))
  [IO.File]::WriteAllText($move,(touches $endDistance|ConvertTo-Json -Depth 4 -Compress),[Text.UTF8Encoding]::new($false))
  [IO.File]::WriteAllText($end,'[]',[Text.UTF8Encoding]::new($false))
  Invoke-SkyScene45Ui 'automation_element_action' @('--project',$skyScene45Project,'--action','touchstart','--selector','canvas','--touches-file',$start,'--changed-touches-file',$start)|Out-Null
  Invoke-SkyScene45Ui 'automation_element_action' @('--project',$skyScene45Project,'--action','touchmove','--selector','canvas','--touches-file',$move,'--changed-touches-file',$move)|Out-Null
  Invoke-SkyScene45Ui 'automation_element_action' @('--project',$skyScene45Project,'--action','touchend','--selector','canvas','--touches-file',$end,'--changed-touches-file',$move)|Out-Null
  Add-SkyScene45Observation 'official-pinch' @{size=$size;offset=$offset;startDistance=$startDistance;endDistance=$endDistance;inputDirectory=$folder;scope='Official native SDK events, not phone multi-touch acceptance'}
}
