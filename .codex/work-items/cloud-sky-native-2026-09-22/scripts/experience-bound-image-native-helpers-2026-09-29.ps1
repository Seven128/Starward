. (Join-Path $PSScriptRoot 'experience-mode-layer-native-helpers-2026-09-29.ps1')
$skyTracePath = Join-Path $skyEvidence 'experience-bound-source-native-2026-09-29.jsonl'

function Read-SkyM82Files($skyStage) {
 $skyFn = "function(){var fs=wx.getFileSystemManager(),root=wx.env.USER_DATA_PATH,pattern=/^deep-sky-M-82-(OVERVIEW|MEDIUM|DETAIL)(?:-[a-z0-9_]+-[1-9][0-9]*)?\.(?:jpg|png)$/;var names=fs.readdirSync(root).filter(function(n){return pattern.test(n);});return Promise.all(names.map(function(n){return new Promise(function(resolve){wx.getFileInfo({filePath:root+'/'+n,digestAlgorithm:'md5',success:function(r){resolve({level:pattern.exec(n)[1],bytes:r.size,md5:r.digest});},fail:function(){resolve({level:pattern.exec(n)[1],unavailable:true});}});});}));}"
 $skyFiles = Invoke-SkyUi 'automation_evaluate' @('--project',$skyProject,'--fn-source',$skyFn)
 while ($skyFiles -is [pscustomobject] -and $skyFiles.PSObject.Properties.Name -contains 'result') { $skyFiles=$skyFiles.result }
 Add-SkyObservation $skyStage @{files=@($skyFiles);scope='Only task sky-owner M82 encoded files; no paths or unrelated names returned. Encoded bytes are not GPU/native memory.'}
 return @($skyFiles)
}

function Read-SkyImageTraffic($skyStage, $skyAfterSequence) {
 $skyStatus = Invoke-RestMethod -Uri 'http://127.0.0.1:8791/__sky_test/traffic-status'
 $skyValue = @{epochStartedAt=$skyStatus.epochStartedAt;totalObserved=$skyStatus.totalObserved;phase=$skyStatus.phase;resourceMode=$skyStatus.resourceMode;held=$skyStatus.heldResourceCount;active=@($skyStatus.active).Count;records=@($skyStatus.records | Where-Object sequence -gt $skyAfterSequence)}
 Add-SkyObservation $skyStage $skyValue
 return $skyValue
}
