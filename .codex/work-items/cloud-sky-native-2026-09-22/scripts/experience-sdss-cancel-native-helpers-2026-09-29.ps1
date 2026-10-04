. (Join-Path $PSScriptRoot 'experience-sdss-v29-native-helpers-2026-09-29.ps1')
# Earlier traces are frozen. Override their inherited default before any action.
$skyTracePath = Join-Path $skyEvidence 'experience-sdss-cancel-native-2026-09-29.jsonl'

function Read-SkyCancelTraffic($skyStage, $skyAfterSequence = 0) {
 $skyTraffic = Read-SkyHttp '/__sky_test/traffic-status'
 $skySelected = @($skyTraffic.records | Where-Object {
  $_.sequence -gt $skyAfterSequence -and $_.resourceKind -eq 'sdss-optical_image'
 })
 $skyActive = @($skyTraffic.active | Where-Object {
  $_.sequence -gt $skyAfterSequence -and $_.resourceKind -eq 'sdss-optical_image'
 })
 $skyValue = @{
  epochStartedAt=$skyTraffic.epochStartedAt; phase=$skyTraffic.phase
  resourceMode=$skyTraffic.resourceMode; heldResourceCount=$skyTraffic.heldResourceCount
  totalObserved=$skyTraffic.totalObserved; activeTotal=@($skyTraffic.active).Count
  afterSequence=$skyAfterSequence; records=$skySelected; active=$skyActive
  scope='Task-local sanitized SDSS image transport; no URLs, Context IDs or payloads'
 }
 Add-SkyObservation $skyStage $skyValue
 return $skyValue
}
