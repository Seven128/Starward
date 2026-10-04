$ErrorActionPreference='Stop'
. (Join-Path $PSScriptRoot 'experience-current-native-helpers-2026-10-01.ps1')
$skyPresentationProbePath=Join-Path $skyCurrentTask 'evidence/experience-native-presentation-copy-2026-10-01.json'
if(Test-Path -LiteralPath $skyPresentationProbePath){throw 'Preserve the existing native capability trial'}
$skyPresentationProbeSource=@'
function(){
 var source=null,target=null,gl=null,out={route:getCurrentPages().at(-1).route,width:32,height:32,scope:"Native offscreen WebGL to native offscreen 2D copy capability only; not visible page composition or target performance"};
 try{
  source=wx.createOffscreenCanvas({type:"webgl",width:32,height:32});
  gl=source.getContext("webgl",{alpha:true,preserveDrawingBuffer:true});
  if(!gl)throw new Error("Native offscreen WebGL context unavailable");
  gl.viewport(0,0,32,32);gl.clearColor(1,0,1,1);gl.clear(gl.COLOR_BUFFER_BIT);gl.finish();
  target=wx.createOffscreenCanvas({type:"2d",width:32,height:32});
  var ctx=target.getContext("2d");
  if(!ctx)throw new Error("Native offscreen 2D context unavailable");
  ctx.drawImage(source,0,0,32,32);
  var data=ctx.getImageData(0,0,32,32).data;
  out.channels=data.length;out.firstPixel=Array.prototype.slice.call(data,0,4);out.mismatchedChannels=0;
  for(var i=0;i<data.length;i++)if(data[i]!==[255,0,255,255][i%4])out.mismatchedChannels++;
  out.glError=gl.getError();out.copied=data.length===4096&&out.mismatchedChannels===0&&out.glError===0;
 }catch(e){out.copied=false;out.error={name:String(e&&e.name),message:String(e&&e.message).slice(0,240)}}
 finally{
  out.cleanup={sourceReset:false,targetReset:false,contextLossRequested:false};
  try{if(target){target.width=0;target.height=0;out.cleanup.targetReset=true}}catch(e){out.cleanup.targetReset=false}
  try{if(source){source.width=0;source.height=0;out.cleanup.sourceReset=true}}catch(e){out.cleanup.sourceReset=false}
  try{if(gl){var loss=gl.getExtension("WEBGL_lose_context");if(loss){loss.loseContext();out.cleanup.contextLossRequested=true}}}catch(e){out.cleanup.contextLossRequested=false}
 }
 return out;
}
'@
$skyPresentationProbe=(Invoke-SkyCurrentUi 'automation_evaluate' @('--project',$skyCurrentProject,'--fn-source',$skyPresentationProbeSource)).result.result
if(-not $skyPresentationProbe -or $skyPresentationProbe.route -ne 'sky/detail/index'){throw 'Native copy probe did not return the current route'}
[IO.File]::WriteAllText($skyPresentationProbePath,($skyPresentationProbe | ConvertTo-Json -Depth 9),[Text.UTF8Encoding]::new($false))
Add-SkyCurrentObservation 'composition-native-offscreen-presentation-copy' $skyPresentationProbe
$skyPresentationProbe | ConvertTo-Json -Depth 9 -Compress
$skyPresentationUi=Read-SkyCurrentUi 'composition-native-offscreen-presentation-copy-after'
@{canvas=$skyPresentationUi.canvas;scope='Current production view remains responsive after the bounded independent capability trial'} | ConvertTo-Json -Depth 5 -Compress
