param([Parameter(Mandatory)][ValidatePattern('^[a-z0-9-]+$')][string]$Stage,
  [ValidateSet('paused-close','playing-close','playing-list')][string]$Flow='paused-close')
$ErrorActionPreference='Stop'
. (Join-Path $PSScriptRoot 'experience-current-native-helpers-2026-10-01.ps1')
$before=Read-SkyCurrentUi ($Stage+'-baseline')
if($before.canvas.labelFacts.frameAt -ne '2026-09-30T13:50:33.000Z' -or $before.time.Count){throw 'Start with the original committed instant and closed time disclosure'}
Tap-SkyCurrentAction '时间轴' ($Stage+'-open')
Tap-SkyCurrentAction '播放 1×' ($Stage+'-play')
$playing=Read-SkyCurrentUi ($Stage+'-playing')
if(-not ($playing.time | Where-Object text -eq '暂停') -or
  [DateTime]::Parse($playing.canvas.labelFacts.frameAt) -le [DateTime]::Parse($before.canvas.labelFacts.frameAt)){throw 'Actual public playback did not advance the painted instant'}
if($Flow -eq 'paused-close'){
  Tap-SkyCurrentAction '暂停' ($Stage+'-pause')
  $paused=Read-SkyCurrentUi ($Stage+'-paused')
  if(-not ($paused.time | Where-Object text -eq '设为观测时间')){throw 'Paused uncommitted time was not observed'}
}
if($Flow -eq 'playing-list'){Tap-SkyCurrentAction '天体列表' ($Stage+'-list')}
else{Tap-SkyCurrentAction '收起时间轴' ($Stage+'-close')}
$after=Read-SkyCurrentUi ($Stage+'-returned')
if($after.canvas.labelFacts.frameAt -ne $before.canvas.labelFacts.frameAt -or $after.time.Count){throw 'Closing the disclosure did not restore the actual painted committed instant'}
Add-SkyCurrentObservation ($Stage+'-assertion') @{
  flow=$Flow;beforeFrameAt=$before.canvas.labelFacts.frameAt;playingFrameAt=$playing.canvas.labelFacts.frameAt;
  returnedFrameAt=$after.canvas.labelFacts.frameAt;noTimeDisclosure=($after.time.Count -eq 0);
  scope='Public official SDK actions and completed Canvas accessibility facts; no physical/visible WXML acceptance'
}
Save-SkyCurrentCapture $Stage | ConvertTo-Json -Depth 4 -Compress
$after.canvas.labelFacts | ConvertTo-Json -Depth 4 -Compress
