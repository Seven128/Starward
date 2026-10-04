$skySaoFrozen=Join-Path $PSScriptRoot '../evidence/experience-sao-v43-binding-2026-09-30.json'
if (Test-Path -LiteralPath $skySaoFrozen) { throw 'This SAO native journey is frozen; use a new trace for later actions.' }
$skySaoProject = 'E:/dev/worktrees/Starward/remote-main-20260908/apps/wechat-miniapp/dist/weapp-check-sky-sao-v43'
$skySaoTask = Split-Path -Parent $PSScriptRoot
$skySaoTrace = Join-Path $skySaoTask 'evidence/experience-sao-v43-native-events-2026-09-30.jsonl'
function Add-SkySaoObservation($stage, $value) {
  $record = @{ observedUtc=[DateTime]::UtcNow.ToString('o'); stage=$stage; value=$value }
  [IO.File]::AppendAllText($skySaoTrace, ($record | ConvertTo-Json -Depth 16 -Compress)+"`n", [Text.UTF8Encoding]::new($false))
}
function Invoke-SkySaoUi($tool, $arguments) {
  $reply = (& 'E:/微信web开发者工具/wechatide.cmd' -c Codex $tool @arguments) | ConvertFrom-Json
  if (-not $reply.ok -or $reply.result.success -eq $false) {
    Add-SkySaoObservation 'tool-failure' @{tool=$tool;errorType=$reply.errorType;reason=$reply.reason}
    throw ('Official UI failed: '+$tool+' / '+$reply.reason)
  }
  return $reply.result
}
function Read-SkySaoUi($stage) {
  $source="function(){var out={route:null,canvas:null,rootSid:null,status:[],selection:[],modal:[],actions:[],time:[]};var p=getCurrentPages()[getCurrentPages().length-1];out.route=p.route;out.rootSid=p.data.root.sid;function text(n){var a=[];function r(x){if(typeof x.v==='string')a.push(x.v);(x.cn||[]).forEach(r)}r(n);return a.join(' ')}function walk(n){var cl=n.cl||'',t=text(n);if((n.ariaLabel||'').indexOf('方位高度天空图')>=0)out.canvas=n.ariaLabel;if(cl.indexOf('sky-selected')>=0||cl.indexOf('sky-selection')>=0||cl.indexOf('sky-object-tracking')>=0)out.selection.push({sid:n.sid,cl:cl,label:n.ariaLabel,text:t});if(cl==='liquid-glass-surface sky-object-modal__panel')out.modal.push({label:n.ariaLabel,text:t.slice(0,2400)});if(cl.indexOf('sky-object-position__')>=0||cl.indexOf('sky-object-modal__close')>=0||cl.indexOf('sky-object-modal__source')>=0||cl.indexOf('sky-orientation-dock__')>=0||n.nn==='button'&&t==='重试暗星')out.actions.push({sid:n.sid,cl:cl,label:n.ariaLabel,text:t});if(cl.indexOf('sky-float')>=0||cl.indexOf('sky-view-mode__status')>=0||cl.indexOf('status-panel')>=0)out.status.push({sid:n.sid,cl:cl,text:t.slice(0,600)});if(cl==='sky-orientation-time-ruler__current'||cl.indexOf('sky-time-playback__button')>=0)out.time.push({sid:n.sid,cl:cl,label:n.ariaLabel,text:t});(n.cn||[]).forEach(walk)}walk(p.data.root);return out}"
  $reply = Invoke-SkySaoUi 'automation_evaluate' @('--project',$skySaoProject,'--fn-source',$source)
  $value = $reply.result.result
  if (-not $value.route) { throw 'Missing synchronous native page observation' }
  $nativeCanvas = Invoke-SkySaoUi 'automation_element_action' @('--project',$skySaoProject,'--action','attribute','--selector','.sky-orientation-canvas','--name','aria-label')
  Add-SkySaoObservation $stage @{shadowUi=$value;nativeCanvas=$nativeCanvas}
  return $value
}
function Save-SkySaoCapture($stage) {
  if ($stage -notmatch '^[a-z0-9-]+$') { throw 'Invalid stage' }
  $target = Join-Path $skySaoTask ('evidence/experience-sao-v43-'+$stage+'-2026-09-30.png')
  if (Test-Path -LiteralPath $target) { throw 'Refuse to overwrite native capture' }
  $shot = Invoke-SkySaoUi 'simulator_screenshot' @('--project',$skySaoProject,'--optimize','false','--path',$target)
  $value=@{path=$target;width=$shot.imageWidth;height=$shot.imageHeight;sha256=(Get-FileHash -LiteralPath $target).Hash.ToLowerInvariant()}
  Add-SkySaoObservation $stage $value
  return $value
}
function Invoke-SkySaoTouch($startPoints, $movePoints, $stage) {
  $directory=Join-Path $skySaoTask ('tmp/sao-v43-inputs/'+[Guid]::NewGuid().ToString('N'))
  [IO.Directory]::CreateDirectory($directory) | Out-Null
  $startFile=Join-Path $directory 'start.json'; $moveFile=Join-Path $directory 'move.json'; $endFile=Join-Path $directory 'end.json'
  [IO.File]::WriteAllText($startFile,(ConvertTo-Json -InputObject @($startPoints) -Compress),[Text.UTF8Encoding]::new($false))
  [IO.File]::WriteAllText($moveFile,(ConvertTo-Json -InputObject @($movePoints) -Compress),[Text.UTF8Encoding]::new($false))
  [IO.File]::WriteAllText($endFile,'[]',[Text.UTF8Encoding]::new($false))
  Invoke-SkySaoUi 'automation_element_action' @('--project',$skySaoProject,'--action','touchstart','--selector','canvas','--touches-file',$startFile,'--changed-touches-file',$startFile) | Out-Null
  Invoke-SkySaoUi 'automation_element_action' @('--project',$skySaoProject,'--action','touchmove','--selector','canvas','--touches-file',$moveFile,'--changed-touches-file',$moveFile) | Out-Null
  Invoke-SkySaoUi 'automation_element_action' @('--project',$skySaoProject,'--action','touchend','--selector','canvas','--touches-file',$endFile,'--changed-touches-file',$moveFile) | Out-Null
  Add-SkySaoObservation $stage @{start=$startPoints;move=$movePoints;inputDirectory=$directory;scope='Official SDK public canvas touch events, not phone multi-touch acceptance'}
}
function Invoke-SkySaoPinch($startDistance,$endDistance) {
  $size=Invoke-SkySaoUi 'automation_element_action' @('--project',$skySaoProject,'--action','size','--selector','canvas')
  $offset=Invoke-SkySaoUi 'automation_element_action' @('--project',$skySaoProject,'--action','offset','--selector','canvas')
  if (-not ($size.width -gt 0 -and $size.height -gt 0)) { throw 'Canvas size unavailable' }
  $cx=$offset.left+$size.width/2; $cy=$offset.top+$size.height/2
  $start=@(1,2 | ForEach-Object {@{identifier=$_;clientX=$cx+(($_*2-3)*$startDistance/2);clientY=$cy;pageX=$cx+(($_*2-3)*$startDistance/2);pageY=$cy}})
  $move=@(1,2 | ForEach-Object {@{identifier=$_;clientX=$cx+(($_*2-3)*$endDistance/2);clientY=$cy;pageX=$cx+(($_*2-3)*$endDistance/2);pageY=$cy}})
  Invoke-SkySaoTouch $start $move 'official-pinch'
  Add-SkySaoObservation 'pinch-geometry' @{size=$size;offset=$offset;startDistance=$startDistance;endDistance=$endDistance}
}
function Set-SkySaoMode($mode,$tileId='*',$delayMs=8000) {
  $uri='http://127.0.0.1:60063/__task/sao-state?mode='+[Uri]::EscapeDataString($mode)+'&tileId='+[Uri]::EscapeDataString($tileId)+'&delayMs='+$delayMs
  $state=Invoke-RestMethod -Method Post -Uri $uri
  Add-SkySaoObservation ('proxy-mode-'+$mode) $state
  return $state
}
function Save-SkySaoState($stage) {
  $state=Invoke-RestMethod -Uri 'http://127.0.0.1:60063/__task/sao-state'
  Add-SkySaoObservation $stage $state
  return $state
}
function Invoke-SkySaoModalAction($label) {
  $wxml=Invoke-SkySaoUi 'automation_element_action' @('--project',$skySaoProject,'--action','outerWxml','--selector','.sky-object-modal__panel')
  $match=[regex]::Match($wxml,'<button id="([^"]+)"[^>]*aria-label="'+[regex]::Escape($label)+'"[^>]*>')
  if (-not $match.Success -or $match.Value -notmatch 'disabled="false"') { throw 'Requested public modal action is absent or disabled' }
  Add-SkySaoObservation 'public-modal-action' @{label=$label;nativeButton=$match.Value}
  Invoke-SkySaoUi 'automation_element_action' @('--project',$skySaoProject,'--action','tap','--selector',('#'+$match.Groups[1].Value)) | Out-Null
}
