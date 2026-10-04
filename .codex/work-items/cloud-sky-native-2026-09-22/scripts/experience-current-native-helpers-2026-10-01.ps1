. (Join-Path $PSScriptRoot '../wechatide-client.ps1')
$skyCurrentProject='E:/dev/worktrees/Starward/remote-main-20260908/apps/wechat-miniapp'
$skyCurrentTask=Split-Path -Parent $PSScriptRoot
$skyCurrentTrace=Join-Path $skyCurrentTask 'evidence/experience-current-native-events-2026-10-01.jsonl'
function Add-SkyCurrentObservation($stage,$value){
 [IO.File]::AppendAllText($skyCurrentTrace,(@{at=[DateTime]::UtcNow.ToString('o');stage=$stage;value=$value} | ConvertTo-Json -Depth 16 -Compress)+"`n",[Text.UTF8Encoding]::new($false))
}
function Invoke-SkyCurrentUi($tool,$toolArguments){
 $reply=Invoke-StarwardWechatTool -Tool $tool -ToolArguments $toolArguments
 if(-not $reply.ok -or $reply.result.success -eq $false){
  Add-SkyCurrentObservation 'tool-failure' @{tool=$tool;error=$reply.result.error}
  throw ('Current official UI operation failed: '+$tool)
 }
 return $reply.result
}
function Read-SkyCurrentUi($stage){
 $source='function(){var out={route:null,canvas:null,rootSid:null,status:[],selection:[],modal:[],actions:[],time:[]};var p=getCurrentPages().at(-1);out.route=p.route;out.rootSid=p.data.root.sid;function text(n){var a=[];function r(x){if(typeof x.v==="string")a.push(x.v);(x.cn||[]).forEach(r)}r(n);return a.join(" ")}function walk(n){var cl=n.cl||"",t=text(n);if(cl==="sky-orientation-canvas")out.canvas={sid:n.sid,label:n.ariaLabel,state:n.dataCanvasState,scene:n.dataSkySceneState,count:n.dataSkyStarCount,starState:n.dataSkyStarState,catalogVersion:n.dataSkyCatalogVersion,frameAt:n.dataSkySceneFrameAt,serializedFactsPresent:Object.prototype.hasOwnProperty.call(n,"dataSkySceneState"),labelFacts:(function(label){var at=/场景时刻 ([0-9T:.Z-]+)/.exec(label),count=/，(\d+) 颗真实亮星目录对象/.exec(label),fov=/已呈现垂直视场 ([0-9.]+) 度/.exec(label);return {presented:!!fov,frameAt:at?at[1]:null,starCount:count?Number(count[1]):null,starState:count?"AVAILABLE":label.indexOf("亮星目录当前不可用")>=0?"UNAVAILABLE":null,verticalFovDeg:fov?Number(fov[1]):null}})(n.ariaLabel||"")};if(cl.indexOf("sky-selected")>=0||cl.indexOf("sky-selection")>=0||cl.indexOf("sky-object-tracking")>=0)out.selection.push({sid:n.sid,cl:cl,label:n.ariaLabel,text:t});if(cl.indexOf("sky-object-modal__panel")>=0)out.modal.push({label:n.ariaLabel,text:t.slice(0,1600)});if(n.nn==="button"||n.nn==="14"||cl.indexOf("sky-object-position__")>=0||cl.indexOf("sky-object-modal__source")>=0||cl==="sky-object-search"||cl.indexOf("sky-catalog-row__title")>=0||cl.indexOf("sky-orientation-fov")>=0)out.actions.push({sid:n.sid,cl:cl,label:n.ariaLabel,text:t.slice(0,500)});if(cl.indexOf("sky-float")>=0||cl.indexOf("sky-view-mode__status")>=0||cl.indexOf("status-panel")>=0||cl.indexOf("sky-orientation-context")>=0)out.status.push({sid:n.sid,cl:cl,text:t.slice(0,600)});if(cl==="sky-orientation-time-ruler__current"||cl.indexOf("sky-time-playback__button")>=0)out.time.push({sid:n.sid,cl:cl,label:n.ariaLabel,text:t});(n.cn||[]).forEach(walk)}walk(p.data.root);return out}'
 $reply=Invoke-SkyCurrentUi 'automation_evaluate' @('--project',$skyCurrentProject,'--fn-source',$source)
 $value=$reply.result.result
 if($value.route -ne 'sky/detail/index'){throw 'Current Sky route was not observed'}
 Add-SkyCurrentObservation $stage $value
 return $value
}
function Save-SkyCurrentCapture($stage){
 if($stage -notmatch '^[a-z0-9-]+$'){throw 'Invalid capture stage'}
 $target=Join-Path $skyCurrentTask ('evidence/experience-current-native-'+$stage+'-2026-10-01.png')
 if(Test-Path -LiteralPath $target){throw 'Preserve prior native capture'}
 $shot=Invoke-SkyCurrentUi 'simulator_screenshot' @('--project',$skyCurrentProject,'--optimize','false','--path',$target)
 $value=@{path=$target;width=$shot.imageWidth;height=$shot.imageHeight;sha256=(Get-FileHash -LiteralPath $target).Hash.ToLowerInvariant()}
 Add-SkyCurrentObservation $stage $value
 return $value
}
function Tap-SkyCurrentAction($text,$stage){
 $current=Read-SkyCurrentUi ($stage+'-before')
 $actions=@($current.actions | Where-Object text -eq $text)
 if($actions.Count -ne 1){throw ('Expected one current native action: '+$text)}
 $selector='#'+$actions[0].sid
 $matched=Invoke-SkyCurrentUi 'automation_page_action' @('--project',$skyCurrentProject,'--action','querySelectorAll','--selector',$selector)
 if($matched.elements.Count -ne 1){throw 'Native action did not match uniquely'}
 Invoke-SkyCurrentUi 'automation_element_action' @('--project',$skyCurrentProject,'--action','tap','--selector',$selector) | Out-Null
 Add-SkyCurrentObservation $stage @{selector=$selector;text=$text;scope='Official SDK native public tap; no direct React handler or state mutation'}
}
function Read-SkyCurrentFiles($stage){
 $source='function(){return new Promise(function(resolve){var fs=wx.getFileSystemManager(),root=wx.env.USER_DATA_PATH;fs.readdir({dirPath:root,success:function(r){var names=r.files.filter(function(n){return /^sky-art-([a-z0-9]+(?:_[a-z0-9]+)?)-[1-9]\d*\.(png|jpg)$/.test(n)||/^deep-sky-M-(?:[1-9]|[1-9]\d|10\d|110)-(?:OVERVIEW|MEDIUM|DETAIL)(?:-([a-z0-9]+(?:_[a-z0-9]+)?)-[1-9]\d*)?\.(jpg|png)$/.test(n)});var bytes=0,known=true;names.forEach(function(n){try{bytes+=fs.statSync(root+"/"+n).size}catch(e){known=false}});resolve({count:names.length,encodedBytes:known?bytes:null,scope:"Current Sky-owned encoded native files, not decoded/GPU/OS memory"})},fail:function(){resolve({unavailable:true})}})})}'
 $value=(Invoke-SkyCurrentUi 'automation_evaluate' @('--project',$skyCurrentProject,'--fn-source',$source)).result.result
 Add-SkyCurrentObservation $stage $value
 return $value
}
function Pinch-SkyCurrentView($startDistance,$endDistance,$stage){
 $size=Invoke-SkyCurrentUi 'automation_element_action' @('--project',$skyCurrentProject,'--action','size','--selector','canvas')
 $offset=Invoke-SkyCurrentUi 'automation_element_action' @('--project',$skyCurrentProject,'--action','offset','--selector','canvas')
 if(-not ($size.width -gt 0 -and $size.height -gt 0)){throw 'Current native canvas size is unavailable'}
 if(-not ($startDistance -gt 0 -and $endDistance -gt 0) -or $startDistance -gt ($size.width-32)){
  throw 'SDK pinch start must stay outside the production 16px edge exclusion band'
 }
 $cx=$offset.left+$size.width/2; $cy=$offset.top+$size.height/2
 $start=@(1,2 | ForEach-Object {@{identifier=$_;clientX=$cx+(($_*2-3)*$startDistance/2);clientY=$cy;pageX=$cx+(($_*2-3)*$startDistance/2);pageY=$cy}})
 $move=@(1,2 | ForEach-Object {@{identifier=$_;clientX=$cx+(($_*2-3)*$endDistance/2);clientY=$cy;pageX=$cx+(($_*2-3)*$endDistance/2);pageY=$cy}})
 $directory=Join-Path $skyCurrentTask ('tmp/current-native-inputs/'+[Guid]::NewGuid().ToString('N'))
 [IO.Directory]::CreateDirectory($directory) | Out-Null
 $startFile=Join-Path $directory 'start.json'; $moveFile=Join-Path $directory 'move.json'; $endFile=Join-Path $directory 'end.json'
 [IO.File]::WriteAllText($startFile,(ConvertTo-Json -InputObject @($start) -Compress),[Text.UTF8Encoding]::new($false))
 [IO.File]::WriteAllText($moveFile,(ConvertTo-Json -InputObject @($move) -Compress),[Text.UTF8Encoding]::new($false))
 [IO.File]::WriteAllText($endFile,'[]',[Text.UTF8Encoding]::new($false))
 Invoke-SkyCurrentUi 'automation_element_action' @('--project',$skyCurrentProject,'--action','touchstart','--selector','canvas','--touches-file',$startFile,'--changed-touches-file',$startFile) | Out-Null
 Invoke-SkyCurrentUi 'automation_element_action' @('--project',$skyCurrentProject,'--action','touchmove','--selector','canvas','--touches-file',$moveFile,'--changed-touches-file',$moveFile) | Out-Null
 Invoke-SkyCurrentUi 'automation_element_action' @('--project',$skyCurrentProject,'--action','touchend','--selector','canvas','--touches-file',$endFile,'--changed-touches-file',$moveFile) | Out-Null
 Add-SkyCurrentObservation $stage @{size=$size;offset=$offset;startDistance=$startDistance;endDistance=$endDistance;scope='Official SDK native canvas touch stream; not physical multi-touch acceptance'}
}
