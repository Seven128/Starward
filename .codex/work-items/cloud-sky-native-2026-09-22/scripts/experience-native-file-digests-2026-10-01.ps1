param([Parameter(Mandatory=$true)][string]$Stage)
$ErrorActionPreference='Stop'
if($Stage -notmatch '^[a-z0-9-]+$'){throw 'Invalid observation stage'}
. (Join-Path $PSScriptRoot 'experience-current-native-helpers-2026-10-01.ps1')
$current=Read-SkyCurrentUi ($Stage+'-scene')
$source=@'
function(){return new Promise(function(resolve){
 var fs=wx.getFileSystemManager(),root=wx.env.USER_DATA_PATH;
 fs.readdir({dirPath:root,success:function(result){
  var names=result.files.filter(function(n){return /^sky-art-([a-z0-9]+(?:_[a-z0-9]+)?)-[1-9]\d*\.(png|jpg)$/.test(n)||/^deep-sky-M-(?:[1-9]|[1-9]\d|10\d|110)-(?:OVERVIEW|MEDIUM|DETAIL)(?:-([a-z0-9]+(?:_[a-z0-9]+)?)-[1-9]\d*)?\.(jpg|png)$/.test(n)});
  var rows=[],failed=0,index=0;
  function next(){
   if(index>=names.length){rows.sort(function(a,b){return a.sha1.localeCompare(b.sha1)});resolve({files:rows,failed:failed,scope:'Read-only encoded native file SHA1 and byte size; no file paths/session IDs, no live decoded/GPU/OS memory measurement'});return}
   var name=names[index++];
   fs.getFileInfo({filePath:root+'/'+name,digestAlgorithm:'sha1',success:function(r){var suffix=/-([1-9]\d*)\.(?:png|jpg)$/.exec(name);rows.push({sha1:r.digest,encodedBytes:r.size,requestSequence:suffix?Number(suffix[1]):null});next()},fail:function(){failed++;next()}});
  }
  next();
 },fail:function(){resolve({unavailable:true})}});
})}
'@
$value=(Invoke-SkyCurrentUi 'automation_evaluate' @('--project',$skyCurrentProject,'--fn-source',$source)).result.result
if($value.unavailable -or $value.failed -gt 0){throw 'Current native file digests unavailable'}
Add-SkyCurrentObservation ($Stage+'-encoded-digests') $value
$value | ConvertTo-Json -Depth 5 -Compress
