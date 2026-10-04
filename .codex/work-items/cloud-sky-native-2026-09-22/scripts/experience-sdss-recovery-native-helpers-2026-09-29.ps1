. (Join-Path $PSScriptRoot 'experience-galactic-native-helpers-2026-09-29.ps1')
# The earlier galactic trace is frozen. All new actions use this separate trace.
$skyTracePath = Join-Path $skyEvidence 'experience-sdss-recovery-native-2026-09-29.jsonl'
function Read-SkyHttp($skyPath) {
 return Invoke-RestMethod -Uri ('http://127.0.0.1:8791' + $skyPath) -Headers @{'x-starward-measurement-probe'='1'} -TimeoutSec 10
}
function Set-SkyHttp($skyPath, $skyValue) {
 $skyResult = Invoke-RestMethod -Uri ('http://127.0.0.1:8791' + $skyPath) -Method Post -Headers @{'x-starward-measurement-probe'='1'} -ContentType 'application/json' -Body ($skyValue | ConvertTo-Json -Compress) -TimeoutSec 10
 Add-SkyObservation 'task-http-control' @{control=$skyPath;requested=$skyValue;result=$skyResult}
 return $skyResult
}
function Read-SkyImageStatus($skyStage) {
 $skyStatus = Invoke-SkyUi 'automation_element_action' @('--project',$skyProject,'--action','outerWxml','--selector','.sky-image-status-group')
 Add-SkyObservation $skyStage @{imageStatusWxml=$skyStatus}
 return $skyStatus
}
function Read-SkyEncodedFiles($skyStage) {
 $skyFn="function(){var fs=wx.getFileSystemManager(),root=wx.env.USER_DATA_PATH;var names=fs.readdirSync(root).filter(function(n){return /^sky-art-.*[.](jpg|png)$/.test(n);});return Promise.all(names.map(function(n){return new Promise(function(resolve){wx.getFileInfo({filePath:root+'/'+n,digestAlgorithm:'md5',success:function(r){resolve({format:n.slice(-3),bytes:r.size,md5:r.digest});},fail:function(){resolve({unavailable:true});}});});}));}"
 $skyFiles=Invoke-SkyUi 'automation_evaluate' @('--project',$skyProject,'--fn-source',$skyFn)
 while($skyFiles -is [pscustomobject] -and $skyFiles.PSObject.Properties.Name -contains 'result'){$skyFiles=$skyFiles.result}
 Add-SkyObservation $skyStage @{files=$skyFiles;scope='Read-only encoded native files, digest only; not decoded/GPU memory'}
 return $skyFiles
}
