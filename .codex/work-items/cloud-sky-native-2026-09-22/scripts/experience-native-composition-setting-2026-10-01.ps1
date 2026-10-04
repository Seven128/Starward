$ErrorActionPreference='Stop'
. (Join-Path $PSScriptRoot 'experience-current-native-helpers-2026-10-01.ps1')
$configs=@(
  @{path=(Join-Path $skyCurrentProject 'project.config.json');name='root'},
  @{path=(Join-Path $skyCurrentProject 'dist/weapp/project.config.json');name='built'}
)
foreach($config in $configs){
  $config.bytes=[IO.File]::ReadAllBytes($config.path)
  $config.sha256=(Get-FileHash -LiteralPath $config.path).Hash.ToLowerInvariant()
  $text=[Text.Encoding]::UTF8.GetString($config.bytes)
  $parsed=$text|ConvertFrom-Json -DateKind String
  if($parsed.setting.PSObject.Properties.Name -contains 'coverView'){throw 'Declared coverView changed; reconcile before a probe'}
  $private=Join-Path (Split-Path -Parent $config.path) 'project.private.config.json'
  if(Test-Path -LiteralPath $private){throw 'Private overrides must be inspected before this probe'}
  $config.trial=$text.Replace('"urlCheck": false,','"urlCheck": false,'+"`n"+'    "coverView": true,')
  if($config.trial -eq $text){throw 'Expected one common urlCheck insertion anchor'}
  if(($config.trial|ConvertFrom-Json -DateKind String).setting.coverView -ne $true){throw 'Probe JSON did not declare true'}
  $backup=Join-Path $skyCurrentTask ('tmp/composition-cover-setting-before-'+$config.name+'-2026-10-01.bin')
  if(Test-Path -LiteralPath $backup){throw 'Preserve prior config backup'}
  [IO.File]::WriteAllBytes($backup,$config.bytes)
}
function Sync-SkyCompositionConfig($stage){
  Invoke-SkyCurrentUi 'simulator_refresh' @('--project',$skyCurrentProject) | Out-Null
  Add-SkyCurrentObservation ($stage+'-compiler-dispatched') @{project=$skyCurrentProject;scope='One compile dispatch for this changed/restored existing configuration; not IDE/watch/BFF restart';success=$true}
  Save-SkyCurrentCapture ($stage+'-dispatched') | Out-Null
  $runtime=Invoke-SkyCurrentUi 'automation_runtime_info' @('--project',$skyCurrentProject,'--action','currentPage')
  Add-SkyCurrentObservation ($stage+'-runtime-read') @{action='currentPage';success=$true;scope='Raw current-page query withheld'}
  & (Join-Path $PSScriptRoot 'experience-current-native-reenter-2026-10-01.ps1') -Stage $stage
  Read-SkyCurrentFiles ($stage+'-files') | Out-Null
  Save-SkyCurrentCapture $stage | Out-Null
}
$changed=$false
try{
  $changed=$true
  foreach($config in $configs){[IO.File]::WriteAllText($config.path,$config.trial,[Text.UTF8Encoding]::new($false))}
  Add-SkyCurrentObservation 'composition-cover-setting-declared' @{field='setting.coverView';value=$true;scope='One temporary declared flag at existing source/build common configs; no default/effective engine behavior asserted';configs=@($configs|ForEach-Object{@{name=$_.name;beforeSha256=$_.sha256;trialSha256=(Get-FileHash -LiteralPath $_.path).Hash.ToLowerInvariant()}})}
  Sync-SkyCompositionConfig 'composition-cover-setting-trial'
} finally {
  if($changed){
    foreach($config in $configs){[IO.File]::WriteAllBytes($config.path,$config.bytes);if((Get-FileHash -LiteralPath $config.path).Hash.ToLowerInvariant() -ne $config.sha256){throw 'Original common config byte restoration failed'}}
    Add-SkyCurrentObservation 'composition-cover-setting-config-restored' @{configs=@($configs|ForEach-Object{@{name=$_.name;sha256=$_.sha256;byteExact=$true}})}
    Sync-SkyCompositionConfig 'composition-cover-setting-final-restored'
  }
}
& (Join-Path $PSScriptRoot 'experience-cold-image-native-2026-10-01.ps1') -ReadbackOnly
