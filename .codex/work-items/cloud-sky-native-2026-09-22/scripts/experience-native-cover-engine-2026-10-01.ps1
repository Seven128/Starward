param([Parameter(Mandatory)][ValidateSet('declare','dispatch','capture','restore','dispatch-restored')][string]$Action)
$ErrorActionPreference='Stop'
. (Join-Path $PSScriptRoot 'experience-current-native-helpers-2026-10-01.ps1')
$metadataPath=Join-Path $skyCurrentTask 'tmp/cover-engine-configs-2026-10-01.json'
if($Action -eq 'declare'){
  if(Test-Path -LiteralPath $metadataPath){throw 'Preserve this one configuration trial'}
  $configs=@()
  foreach($pair in @(@('root','project.config.json'),@('built','dist/weapp/project.config.json'))){
    $file=Join-Path $skyCurrentProject $pair[1]
    $bytes=[IO.File]::ReadAllBytes($file);$original=[Text.Encoding]::UTF8.GetString($bytes)
    $parsed=$original|ConvertFrom-Json -DateKind String
    if($parsed.setting.PSObject.Properties.Name -contains 'coverView'){throw 'Reconcile existing coverView declaration'}
    if(Test-Path -LiteralPath (Join-Path (Split-Path -Parent $file) 'project.private.config.json')){throw 'Reconcile private overrides'}
    $trial=$original.Replace('"urlCheck": false,','"urlCheck": false,'+"`n"+'    "coverView": true,')
    if(($trial|ConvertFrom-Json -DateKind String).setting.coverView -ne $true){throw 'Field insertion was not confirmed'}
    $backup=Join-Path $skyCurrentTask ('tmp/cover-engine-before-'+$pair[0]+'-2026-10-01.bin')
    if(Test-Path -LiteralPath $backup){throw 'Preserve existing byte backup'}
    [IO.File]::WriteAllBytes($backup,$bytes)
    $configs+=@{name=$pair[0];path=$file;backup=$backup;beforeSha256=(Get-FileHash -LiteralPath $file).Hash.ToLowerInvariant();trial=$trial}
  }
  foreach($config in $configs){
    [IO.File]::WriteAllText($config.path,$config.trial,[Text.UTF8Encoding]::new($false))
    $config.Remove('trial');$config.trialSha256=(Get-FileHash -LiteralPath $config.path).Hash.ToLowerInvariant()
  }
  [IO.File]::WriteAllText($metadataPath,($configs | ConvertTo-Json -Depth 5),[Text.UTF8Encoding]::new($false))
  Add-SkyCurrentObservation 'cover-engine-true-declared' @{field='setting.coverView';value=$true;configs=$configs;scope='Installed parser evidence supports this distinct tool-renderer probe; live effective value still unverified'}
  exit
}
$configs=Get-Content -LiteralPath $metadataPath -Raw | ConvertFrom-Json -AsHashtable -DateKind String
if($Action -eq 'capture'){Save-SkyCurrentCapture 'cover-engine-true-observed' | ConvertTo-Json -Depth 4 -Compress;exit}
if($Action -eq 'restore'){
  foreach($config in $configs){
    if((Get-FileHash -LiteralPath $config.path).Hash.ToLowerInvariant() -ne $config.trialSha256){throw 'Configuration changed during this trial'}
    if((Get-FileHash -LiteralPath $config.backup).Hash.ToLowerInvariant() -ne $config.beforeSha256){throw 'Original backup changed'}
  }
  foreach($config in $configs){[IO.File]::WriteAllBytes($config.path,[IO.File]::ReadAllBytes($config.backup))}
  Add-SkyCurrentObservation 'cover-engine-configs-byte-restored' @{configs=@($configs | ForEach-Object {@{name=$_.name;sha256=(Get-FileHash -LiteralPath $_.path).Hash.ToLowerInvariant();byteExact=((Get-FileHash -LiteralPath $_.path).Hash.ToLowerInvariant() -eq $_.beforeSha256)}})}
  exit
}
$stage=if($Action -eq 'dispatch'){'cover-engine-true'}else{'cover-engine-restored'}
foreach($config in $configs){
  $expected=if($Action -eq 'dispatch'){$config.trialSha256}else{$config.beforeSha256}
  if((Get-FileHash -LiteralPath $config.path).Hash.ToLowerInvariant() -ne $expected){throw 'Expected configuration bytes were not confirmed'}
}
$events=Get-Content -LiteralPath $skyCurrentTrace | ForEach-Object {$_ | ConvertFrom-Json -AsHashtable -DateKind String}
if($events | Where-Object stage -eq ($stage+'-compiler-requested')){throw 'Do not redispatch this compilation'}
if($Action -eq 'dispatch-restored' -and -not ($events | Where-Object stage -eq 'cover-engine-true-app-running')){throw 'Do not compile restoration before the actual trial application was observed'}
Add-SkyCurrentObservation ($stage+'-compiler-requested') @{scope='One dispatch only; actual application screenshot gates subsequent SDK reads; no automatic SDK/finally/retry'}
Invoke-SkyCurrentUi 'simulator_refresh' @('--project',$skyCurrentProject) | Out-Null
Add-SkyCurrentObservation ($stage+'-compiler-dispatched') @{success=$true}
Save-SkyCurrentCapture ($stage+'-dispatched') | ConvertTo-Json -Depth 4 -Compress
