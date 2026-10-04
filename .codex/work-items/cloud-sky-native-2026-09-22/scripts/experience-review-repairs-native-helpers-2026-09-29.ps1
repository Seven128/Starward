$skyProject = 'E:/dev/worktrees/Starward/remote-main-20260908/apps/wechat-miniapp/dist/weapp-check-sky-combined-clean-v25-0929'
$skyEvidence = 'E:/dev/worktrees/Starward/remote-main-20260908/.codex/work-items/cloud-sky-native-2026-09-22/evidence'
$skyTracePath = Join-Path $skyEvidence 'experience-combined-clean-v25-native-events-2026-09-29.jsonl'
function Add-SkyObservation($skyStage, $skyValue) {
 $skyRecord = @{ observedUtc=[DateTime]::UtcNow.ToString('o'); stage=$skyStage; value=$skyValue }
 [IO.File]::AppendAllText($skyTracePath, ($skyRecord | ConvertTo-Json -Depth 12 -Compress) + "`n", [Text.UTF8Encoding]::new($false))
}
function Invoke-SkyUi($skyTool, $skyArgs) {
 $skyReply = (& 'E:/微信web开发者工具/wechatide.cmd' -c codex $skyTool @skyArgs) | ConvertFrom-Json
 if (-not $skyReply.ok -or ($skyReply.result -is [pscustomobject] -and $skyReply.result.success -eq $false)) {
  Add-SkyObservation 'tool-failure' @{ tool=$skyTool; errorType=$skyReply.errorType; reason=$skyReply.reason }
  throw ('Official UI failed: ' + $skyTool + ' / ' + $skyReply.reason)
 }
 return $skyReply.result
}
function Read-SkyFrame($skyStage) {
 $skyLabel = Invoke-SkyUi 'automation_element_action' @('--project',$skyProject,'--action','attribute','--selector','.sky-orientation-canvas','--name','aria-label')
 Add-SkyObservation $skyStage @{ presentedCanvasLabel=$skyLabel }
 return $skyLabel
}
function Save-SkyCapture($skyStage) {
 if ($skyStage -notmatch '^[a-z0-9-]+$') { throw 'Invalid capture stage' }
 $skyPath = Join-Path $skyEvidence ('experience-v25-native-' + $skyStage + '-2026-09-29.png')
 if (Test-Path -LiteralPath $skyPath) { throw 'Refuse to overwrite native screenshot' }
 $skyShot = Invoke-SkyUi 'simulator_screenshot' @('--project',$skyProject,'--optimize','false')
 Copy-Item -LiteralPath $skyShot.path -Destination $skyPath -ErrorAction Stop
 $skyObservation = @{path=$skyPath; width=$skyShot.imageWidth; height=$skyShot.imageHeight; sha256=(Get-FileHash -LiteralPath $skyPath -Algorithm SHA256).Hash.ToLowerInvariant()}
 Add-SkyObservation $skyStage $skyObservation
 return $skyObservation
}
function Invoke-SkyPinch($skyStartDistance, $skyEndDistance) {
 $skyTouches = @(1,2 | ForEach-Object { @{identifier=$_;clientX=195.2 + (($_ * 2 - 3) * $skyStartDistance / 2);clientY=422;pageX=195.2 + (($_ * 2 - 3) * $skyStartDistance / 2);pageY=422} }) | ConvertTo-Json -Compress
 $skyMoved = @(1,2 | ForEach-Object { @{identifier=$_;clientX=195.2 + (($_ * 2 - 3) * $skyEndDistance / 2);clientY=422;pageX=195.2 + (($_ * 2 - 3) * $skyEndDistance / 2);pageY=422} }) | ConvertTo-Json -Compress
 $skyInputs = Join-Path $skyEvidence ('experience-v25-native-inputs/' + [Guid]::NewGuid().ToString('N'))
 [IO.Directory]::CreateDirectory($skyInputs) | Out-Null
 $skyStartFile = Join-Path $skyInputs 'start.json'
 $skyMoveFile = Join-Path $skyInputs 'move.json'
 $skyEmptyFile = Join-Path $skyInputs 'end.json'
 [IO.File]::WriteAllText($skyStartFile,$skyTouches,[Text.UTF8Encoding]::new($false))
 [IO.File]::WriteAllText($skyMoveFile,$skyMoved,[Text.UTF8Encoding]::new($false))
 [IO.File]::WriteAllText($skyEmptyFile,'[]',[Text.UTF8Encoding]::new($false))
 Invoke-SkyUi 'automation_element_action' @('--project',$skyProject,'--action','touchstart','--selector','canvas','--touches-file',$skyStartFile,'--changed-touches-file',$skyStartFile) | Out-Null
 Invoke-SkyUi 'automation_element_action' @('--project',$skyProject,'--action','touchmove','--selector','canvas','--touches-file',$skyMoveFile,'--changed-touches-file',$skyMoveFile) | Out-Null
 Invoke-SkyUi 'automation_element_action' @('--project',$skyProject,'--action','touchend','--selector','canvas','--touches-file',$skyEmptyFile,'--changed-touches-file',$skyMoveFile) | Out-Null
 Add-SkyObservation 'official-sdk-pinch' @{startDistance=$skyStartDistance;endDistance=$skyEndDistance;canvasLogicalCenter=@(195.2,422);inputDirectory=$skyInputs;scope='Official SDK touch events; does not certify real phone multi-touch.'}
}
function Read-SkyContext($skyStage) {
 $skyFn = "function(){var s=wx.getStorageSync('starward.wechat-miniapp.state.current');var c=s&&s.observationContext;return c?{contextId:c.contextId,locationKind:c.location.kind,publicSpotId:c.location.kind==='FORMAL_SPOT'?c.location.spotId:undefined,localDate:c.localDate,selectedAtUtc:c.selectedAtUtc,timezone:c.timezone,revision:c.revision,contextFingerprint:c.contextFingerprint,astronomyVersion:c.algorithmVersions.astronomy}:null;}"
 $skyContext = Invoke-SkyUi 'automation_evaluate' @('--project',$skyProject,'--fn-source',$skyFn)
 while ($skyContext -is [pscustomobject] -and $skyContext.PSObject.Properties.Name -contains 'result') { $skyContext=$skyContext.result }
 if ($skyContext.contextId) {
  $skyHash=[Convert]::ToHexString([Security.Cryptography.SHA256]::HashData([Text.Encoding]::UTF8.GetBytes($skyContext.contextId))).ToLowerInvariant()
  $skyContext.PSObject.Properties.Remove('contextId')
  $skyContext | Add-Member -NotePropertyName 'contextIdSha256' -NotePropertyValue $skyHash
 }
 Add-SkyObservation $skyStage $skyContext
 return $skyContext
}
