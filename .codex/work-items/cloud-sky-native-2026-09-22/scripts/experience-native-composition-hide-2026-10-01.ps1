. (Join-Path $PSScriptRoot 'experience-current-native-helpers-2026-10-01.ps1')
$skyCanvasLocateSource='function(){var p=getCurrentPages().at(-1),a=[];function walk(n,path){if(typeof n.cl==="string"&&n.cl.indexOf("sky-scene__canvas")>=0)a.push({route:p.route,sid:n.sid,path:path,style:n.st});(n.cn||[]).forEach(function(c,i){walk(c,path+".cn["+i+"]")})}walk(p.data.root,"root");return a}'
$skyCanvasLocated=@((Invoke-SkyCurrentUi 'automation_evaluate' @('--project',$skyCurrentProject,'--fn-source',$skyCanvasLocateSource)).result.result)
if($skyCanvasLocated.Count -ne 1 -or $skyCanvasLocated[0].route -ne 'sky/detail/index'){throw 'Expected one current Sky Canvas'}
$skyCanvasLocated=$skyCanvasLocated[0]
$skyCanvasSelector='canvas' # Canvas has its explicit production id, unlike SID-only buttons.
$skyCanvasHidePatch=@{}
$skyCanvasHidePatch[$skyCanvasLocated.path+'.st']=$skyCanvasLocated.style+' visibility: hidden;'
$skyCanvasRestorePatch=@{}
$skyCanvasRestorePatch[$skyCanvasLocated.path+'.st']=$skyCanvasLocated.style
try {
 Invoke-SkyCurrentUi 'automation_page_action' @('--project',$skyCurrentProject,'--action','setData','--patch',($skyCanvasHidePatch | ConvertTo-Json -Compress)) | Out-Null
 $skyCanvasHiddenStyle=Invoke-SkyCurrentUi 'automation_element_action' @('--project',$skyCurrentProject,'--action','style','--selector',$skyCanvasSelector,'--name','visibility')
 Add-SkyCurrentObservation 'composition-canvas-temporarily-hidden' @{canvas=$skyCanvasLocated;visibility=$skyCanvasHiddenStyle;scope='Temporary native render-tree visibility probe; no astronomical or React state change'}
 if($skyCanvasHiddenStyle -ne 'hidden'){throw 'Native Canvas hidden style was not observed'}
 Save-SkyCurrentCapture 'composition-canvas-hidden' | ConvertTo-Json -Compress
} finally {
 $skyCanvasStillLocated=@((Invoke-SkyCurrentUi 'automation_evaluate' @('--project',$skyCurrentProject,'--fn-source',$skyCanvasLocateSource)).result.result)
 if($skyCanvasStillLocated.Count -ne 1 -or $skyCanvasStillLocated[0].sid -ne $skyCanvasLocated.sid -or $skyCanvasStillLocated[0].path -ne $skyCanvasLocated.path){throw 'Canvas changed during probe; original style restoration requires reconciliation'}
 Invoke-SkyCurrentUi 'automation_page_action' @('--project',$skyCurrentProject,'--action','setData','--patch',($skyCanvasRestorePatch | ConvertTo-Json -Compress)) | Out-Null
 $skyCanvasRestoredStyle=Invoke-SkyCurrentUi 'automation_element_action' @('--project',$skyCurrentProject,'--action','style','--selector',$skyCanvasSelector,'--name','visibility')
 Add-SkyCurrentObservation 'composition-canvas-visibility-restored' @{visibility=$skyCanvasRestoredStyle;originalStyle=$skyCanvasLocated.style}
 if($skyCanvasRestoredStyle -ne 'visible'){throw 'Native Canvas visibility restoration was not observed'}
}
Save-SkyCurrentCapture 'composition-canvas-restored' | ConvertTo-Json -Compress
$skyCanvasRestoredUi=Read-SkyCurrentUi 'composition-canvas-restored-ui'
@{canvas=$skyCanvasRestoredUi.canvas;selection=$skyCanvasRestoredUi.selection;modal=$skyCanvasRestoredUi.modal} | ConvertTo-Json -Depth 7 -Compress
