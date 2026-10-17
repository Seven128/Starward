param([Parameter(Mandatory)][string]$ConfigPath,[Parameter(Mandatory)][string]$ResultPath)
# Compatibility entry; native host ownership lives with the shared pipeline.
& (Join-Path $PSScriptRoot "../../../../data-pipelines/deep-sky/photoshop_batch.ps1") -ConfigPath $ConfigPath -ResultPath $ResultPath
