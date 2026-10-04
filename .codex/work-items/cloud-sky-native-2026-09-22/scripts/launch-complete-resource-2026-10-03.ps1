param([ValidatePattern('^r[1-9][0-9]*$')][string]$Generation='r1')
$ErrorActionPreference='Stop'
$workspace='E:/dev/worktrees/Starward/remote-main-20260908'
Set-Location -LiteralPath $workspace
$task='.codex/work-items/cloud-sky-native-2026-09-22'
$output="output/playwright/cloud-sky-complete-resource-execution-1003-$Generation"
if(Test-Path -LiteralPath $output){throw "Exclusive execution receipt already exists: $output"}
New-Item -ItemType Directory -Path $output | Out-Null
$sources=@("$task/scripts/experience-complete-resource-journey-2026-10-02.mts","$task/scripts/experience-complete-resource-browser-2026-10-02.ts","$task/scripts/launch-complete-resource-2026-10-03.ps1","$task/evidence/experience-complete-resource-execution-protocol-2026-10-03.md")
$bindings=@();$index=0
foreach($source in $sources){$index++;$resolved=(Resolve-Path -LiteralPath $source).Path;$snapshot="source-$index.txt";Copy-Item -LiteralPath $resolved -Destination "$output/$snapshot";$bindings+=@{path=$source;bytes=(Get-Item -LiteralPath $resolved).Length;sha256=(Get-FileHash -LiteralPath $resolved -Algorithm SHA256).Hash.ToLowerInvariant();snapshot=$snapshot}}
$preserved=Get-Content -LiteralPath "$task/tmp/resume-preserved-hashes-2026-10-01.json" -Raw | ConvertFrom-Json
foreach($row in $preserved){if((Get-FileHash -LiteralPath $row.path -Algorithm SHA256).Hash.ToLowerInvariant() -ne $row.sha256){throw "Preserved input changed: $($row.path)"}}
$nodePath=@(Get-Command node -CommandType Application)[0].Source
$entry="$task/scripts/experience-complete-resource-journey-2026-10-02.mts"
$intent=@{cwd=$workspace;head=(& git rev-parse HEAD);branch=(& git branch --show-current);startedAt=[DateTimeOffset]::UtcNow.ToString('o');nodeExecutable=$nodePath;argv=@('tools/run-node.cjs','--bin','tsx','tsx',$entry);bindings=$bindings;preserved=$preserved;scope='one bounded execution; raw stdout/stderr and original task sources retained before start'}
$intent | ConvertTo-Json -Depth 20 | Set-Content -LiteralPath "$output/launch-intent.json" -Encoding utf8
& $nodePath tools/run-node.cjs --bin tsx tsx $entry 2>&1 | Tee-Object -FilePath "$output/raw.log"
$status=$LASTEXITCODE
@{exitCode=$status;finishedAt=[DateTimeOffset]::UtcNow.ToString('o');launch=$intent;rawLogSha256=(Get-FileHash -LiteralPath "$output/raw.log" -Algorithm SHA256).Hash.ToLowerInvariant()} | ConvertTo-Json -Depth 20 | Set-Content -LiteralPath "$output/result.json" -Encoding utf8
exit $status
