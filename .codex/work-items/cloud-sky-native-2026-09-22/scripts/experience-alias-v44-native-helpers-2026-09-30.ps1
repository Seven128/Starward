$skyAliasProject='E:/dev/worktrees/Starward/remote-main-20260908/apps/wechat-miniapp/dist/weapp-check-sky-alias-v44'
$skyAliasTask=Split-Path -Parent $PSScriptRoot
$skyAliasTrace=Join-Path $skyAliasTask 'evidence/experience-alias-v44-native-events-2026-09-30.jsonl'
if (Test-Path -LiteralPath (Join-Path $skyAliasTask 'evidence/experience-alias-v44-binding-2026-09-30.json')) { throw 'This native alias journey is frozen; start a new trace.' }
function Add-SkyAliasObservation($stage,$value) {
  [IO.File]::AppendAllText($skyAliasTrace,(@{observedUtc=[DateTime]::UtcNow.ToString('o');stage=$stage;value=$value}|ConvertTo-Json -Depth 16 -Compress)+"`n",[Text.UTF8Encoding]::new($false))
}
function Invoke-SkyAliasUi($tool,$arguments) {
  $reply=(& 'E:/微信web开发者工具/wechatide.cmd' -c Codex $tool @arguments)|ConvertFrom-Json
  if (-not $reply.ok -or $reply.result.success -eq $false) {
    Add-SkyAliasObservation 'tool-failure' @{tool=$tool;reason=$reply.reason;errorType=$reply.errorType}
    throw ('Official UI failed: '+$tool+' / '+$reply.reason)
  }
  return $reply.result
}
function Read-SkyAliasUi($stage) {
  $fn="function(){var out={route:null,canvas:null,sdk:wx.getAppBaseInfo().SDKVersion,selection:[],modal:[],search:[],actions:[]};var p=getCurrentPages()[getCurrentPages().length-1];out.route=p.route;function text(n){var a=[];function r(x){if(typeof x.v==='string')a.push(x.v);(x.cn||[]).forEach(r)}r(n);return a.join(' ')}function walk(n){var cl=n.cl||'',t=text(n);if((n.ariaLabel||'').indexOf('方位高度天空图')>=0)out.canvas=n.ariaLabel;if(cl.indexOf('sky-selected')>=0||cl.indexOf('sky-selection')>=0||cl.indexOf('sky-object-tracking')>=0)out.selection.push({sid:n.sid,cl:cl,label:n.ariaLabel,text:t});if(cl==='liquid-glass-surface sky-object-modal__panel')out.modal.push({label:n.ariaLabel,text:t.slice(0,2800)});if(cl.indexOf('sky-object-search')>=0)out.search.push({sid:n.sid,cl:cl,label:n.ariaLabel,text:t.slice(0,600)});if(n.nn==='button')out.actions.push({sid:n.sid,cl:cl,label:n.ariaLabel,text:t.slice(0,140)});(n.cn||[]).forEach(walk)}walk(p.data.root);return out}"
  $result=Invoke-SkyAliasUi 'automation_evaluate' @('--project',$skyAliasProject,'--fn-source',$fn)
  $value=$result.result.result
  if (-not $value.route) { throw 'Missing native observation' }
  $native=Invoke-SkyAliasUi 'automation_element_action' @('--project',$skyAliasProject,'--action','attribute','--selector','.sky-orientation-canvas','--name','aria-label')
  Add-SkyAliasObservation $stage @{shadowUi=$value;nativeCanvas=$native}
  return $value
}
function Save-SkyAliasCapture($stage) {
  if ($stage -notmatch '^[a-z0-9-]+$') { throw 'Invalid stage' }
  $target=Join-Path $skyAliasTask ('evidence/experience-alias-v44-'+$stage+'-2026-09-30.png')
  if (Test-Path -LiteralPath $target) { throw 'Refuse capture overwrite' }
  $shot=Invoke-SkyAliasUi 'simulator_screenshot' @('--project',$skyAliasProject,'--optimize','false','--path',$target)
  $value=@{path=$target;width=$shot.imageWidth;height=$shot.imageHeight;sha256=(Get-FileHash -LiteralPath $target).Hash.ToLowerInvariant()}
  Add-SkyAliasObservation $stage $value
  return $value
}
function Invoke-SkyAliasModalAction($label) {
  $wxml=Invoke-SkyAliasUi 'automation_element_action' @('--project',$skyAliasProject,'--action','outerWxml','--selector','.sky-object-modal__panel')
  $match=[regex]::Match($wxml,'<button id="([^"]+)"[^>]*aria-label="'+[regex]::Escape($label)+'"[^>]*>')
  if (-not $match.Success -or $match.Value -notmatch 'disabled="false"') { throw 'Public modal action unavailable' }
  Add-SkyAliasObservation 'public-modal-action' @{label=$label;nativeButton=$match.Value}
  Invoke-SkyAliasUi 'automation_element_action' @('--project',$skyAliasProject,'--action','tap','--selector',('#'+$match.Groups[1].Value))|Out-Null
}
