param([Parameter(Mandatory)][string]$Stage)
$ErrorActionPreference='Stop'
if($Stage -notmatch '^[a-z0-9-]+$'){throw 'Invalid observation stage'}
. (Join-Path $PSScriptRoot 'experience-current-native-helpers-2026-10-01.ps1')
$source=@'
function(){var p=getCurrentPages().at(-1);if(p.route!=='pages/map/index')throw Error('retired_sky_map_route_required');
 return new Promise(function(resolve){var fs=wx.getFileSystemManager();fs.readdir({dirPath:wx.env.USER_DATA_PATH,
 success:function(r){var names=r.files.filter(function(n){return /^sky-art-([a-z0-9]+(?:_[a-z0-9]+)?)-[1-9]\d*\.(png|jpg)$/.test(n)||/^deep-sky-M-(?:[1-9]|[1-9]\d|10\d|110)-(?:OVERVIEW|MEDIUM|DETAIL)(?:-([a-z0-9]+(?:_[a-z0-9]+)?)-[1-9]\d*)?\.(jpg|png)$/.test(n)});
 resolve({route:p.route,count:names.length,encodedBytes:names.length===0?0:null,scope:'Retired Sky encoded files only; no paths/session IDs or decoded/GPU/OS memory inference'});},
 fail:function(){resolve({route:p.route,unavailable:true})}});})}
'@
$value=(Invoke-SkyCurrentUi 'automation_evaluate' @('--project',$skyCurrentProject,'--fn-source',$source)).result.result
if($value.unavailable){throw 'Retired encoded files unavailable'}
Add-SkyCurrentObservation $Stage $value
$value | ConvertTo-Json -Depth 4 -Compress
if($value.count -ne 0){throw 'Sky retained encoded files after public exit'}
