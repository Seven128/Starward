$ErrorActionPreference='Stop'
. (Join-Path $PSScriptRoot 'experience-current-native-helpers-2026-10-01.ps1')
$before=Read-SkyCurrentFiles 'resource-file-redecode-before'
$source=@'
function(){return new Promise(function(resolve){
 var fs=wx.getFileSystemManager(),root=wx.env.USER_DATA_PATH,finished=false,canvas=null,image=null,timer=null;
 var expected='fed3e44d011044225ed286bdd359ff5b1bcd044e',sizes=[],elapsed=[];
 function detach(){if(image){image.onload=null;image.onerror=null;image=null}}
 function done(value){if(finished)return;finished=true;detach();if(timer)clearTimeout(timer);canvas=null;resolve(value)}
 timer=setTimeout(function(){done({unavailable:true,reason:'bounded_native_decode_timeout'})},15000);
 fs.readdir({dirPath:root,success:function(result){
  var names=result.files.filter(function(n){return /^sky-art-([a-z0-9]+(?:_[a-z0-9]+)?)-[1-9]\d*\.(png|jpg)$/.test(n)}),index=0;
  function next(){
   if(finished)return;
   if(index>=names.length){done({unavailable:true,reason:'published_file_not_found'});return}
   var name=names[index++];
   fs.getFileInfo({filePath:root+'/'+name,digestAlgorithm:'sha1',success:function(info){
    if(finished)return;
    if(info.digest!==expected){next();return}
    wx.createSelectorQuery().select('.sky-orientation-canvas__surface').fields({node:true}).exec(function(rows){
     if(finished)return;
     canvas=rows&&rows[0]&&rows[0].node;
     if(!canvas||typeof canvas.createImage!=='function'){done({unavailable:true,reason:'native_canvas_unavailable'});return}
     function decode(){
      if(finished)return;
      detach();var start=Date.now();
      try{
       image=canvas.createImage();
       image.onerror=function(){done({unavailable:true,reason:'native_cached_file_decode_failed'})};
       image.onload=function(){
        sizes.push({width:image.width,height:image.height});elapsed.push(Date.now()-start);detach();
        if(sizes.length<2)decode();else done({source:'galactic:2mass',sha1:expected,encodedBytes:info.size,decodes:sizes,callbackElapsedMs:elapsed,scope:'Two sequential native createImage decodes from one existing immutable file, no request/file mutation/texture upload. Dropped JS handles are not proof of native GC or OS memory release'});
       };
       image.src=root+'/'+name;
      }catch(e){done({unavailable:true,reason:'native_image_factory_failed'})}
     }
     decode();
    });
   },fail:function(){next()}});
  }
  next();
 },fail:function(){done({unavailable:true,reason:'native_directory_unavailable'})}});
})}
'@
$result=(Invoke-SkyCurrentUi 'automation_evaluate' @('--project',$skyCurrentProject,'--fn-source',$source)).result.result
Add-SkyCurrentObservation 'resource-file-redecode-result' $result
if($result.unavailable){throw ('Native file-backed decode unavailable: '+$result.reason)}
if($result.decodes.Count -ne 2 -or @($result.decodes | Where-Object { $_.width -ne 2048 -or $_.height -ne 1024 }).Count -gt 0){throw 'Unexpected native cached-image dimensions'}
$after=Read-SkyCurrentFiles 'resource-file-redecode-after'
if($before.count -ne $after.count -or $before.encodedBytes -ne $after.encodedBytes){throw 'Native encoded files changed during file-backed decode'}
Read-SkyCurrentUi 'resource-file-redecode-restored-scene' | Out-Null
$result | ConvertTo-Json -Depth 5 -Compress
