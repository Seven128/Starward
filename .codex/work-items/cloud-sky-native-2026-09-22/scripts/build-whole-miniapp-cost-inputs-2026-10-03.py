"""Task-only source-bound units and partial body model; no supplier quote or capacity acceptance."""
from pathlib import Path
from collections import Counter, defaultdict
import hashlib, json, re

ROOT = Path(__file__).resolve().parents[4]
TASK = ROOT / '.codex/work-items/cloud-sky-native-2026-09-22'
OUT = ROOT / 'output/whole-miniapp-cost-inputs-1003-r3'
OUT.mkdir(parents=True, exist_ok=True)

def pin(relative, expected=None):
    p = ROOT / relative
    b = p.read_bytes()
    v = dict(path=relative, bytes=len(b), sha256=hashlib.sha256(b).hexdigest())
    if expected is not None:
        assert v['bytes'] == expected['bytes'] and v['sha256'] == expected['sha256'], relative
    return v

checkpoint = json.loads((TASK / 'evidence/current-execution-state-2026-10-03-r40.json').read_bytes())
for v in checkpoint['currentSources'] + checkpoint['protected']:
    pin(v['path'], v)
source_names = [
    'packages/miniapp-contracts/api/miniapp.operations.json',
    'apps/wechat-miniapp/src/services/api-client.ts',
    'apps/wechat-miniapp/src/services/spot-environment-client.ts',
    'workers/miniapp-api/src/weather-provider.ts',
    'workers/miniapp-api/src/air-quality-provider.ts',
    'workers/miniapp-api/src/recent-weather-provider.ts',
    'workers/miniapp-api/src/computation-cache.ts',
    'infrastructure/deployment/sky-resource-logging.caddy',
    'infrastructure/deployment/Caddyfile',
    'infrastructure/deployment/Caddyfile.operator-preview',
    'project_context/external-capabilities.md',
    'project_context/deployment/decisions-and-verification.md',
    '.codex/work-items/stellarium-cost-research-2026-09-22/cost-model.json',
    '.codex/work-items/stellarium-cost-research-2026-09-22/cost-model.mjs',
    '.codex/work-items/cloud-sky-native-2026-09-22/scripts/experience-current-scene-journey-2026-10-03.mts',
]
sources = [pin(v) for v in source_names]
scene_relative = 'output/playwright/cloud-sky-current-scene-1003-r5/result.json'
scene_pin = pin(scene_relative)
assert scene_pin['sha256'] == '1ab3dd10fd06e354fbb248e502d126f69936eb0f530eece67aa7defc19bd2b0e'
scene = json.loads((ROOT / scene_relative).read_bytes())
assert scene['status'] == 'MEASURED_SOFTWARE_COMPLETE_RESOURCE_LANE'
assert not scene['errors'] and not scene['retirementFailures']
report_pin = pin(scene['report']['path'], scene['report'])
ops = json.loads((ROOT / source_names[0]).read_bytes())['operations']

def family(op):
    p = op['path']
    if p.startswith(('/sky/', '/celestial-objects')) or re.match(r'/spots/[^/]+/sky(?:/|$)', p): return 'sky'
    if p.startswith('/observation-contexts'): return 'shared_location_time_context'
    if p.startswith('/terrain/'): return 'terrain_asset_and_overlay'
    if p.startswith(('/map/', '/places/')): return 'map_and_search'
    if p.startswith('/routes/'): return 'route_estimation_not_adopted'
    if p.startswith('/astronomical-events'): return 'events'
    if re.match(r'/spots/[^/]+/(recent-weather|air-quality)$', p): return 'spot_weather_and_air'
    if re.match(r'/spots/[^/]+/media/', p): return 'contribution_media_delivery'
    if p.startswith('/spots/') or p.startswith('/shares/spots/'): return 'spot_content'
    if p.startswith(('/me/formal-contribution', '/me/contribution')): return 'contribution_intake_and_review'
    if p.startswith(('/me/observation-plans', '/me/reminder-subscriptions', '/shares/plans/')): return 'plans_shares_and_reminders'
    if p.startswith('/me/'): return 'account_library_import_and_preferences'
    if p in ['/capabilities', '/auth/wechat/login', '/operations']: return 'bootstrap_auth_and_operations'
    raise AssertionError('unclassified current operation: ' + op['id'])

inventory = []
for op in ops:
    f = family(op)
    inventory.append(dict(operationId=op['id'], method=op['method'], pathTemplate=op['path'], family=f,
        responseEnvelope=op.get('responseEnvelope', True),
        activation='NOT_ADOPTED_CURRENT_ROUTE_PRODUCT' if f == 'route_estimation_not_adopted' else
            'TRIAL_DISABLED_NOT_ADOPTED' if op['path'].startswith('/sky/optical/') else 'CONTRACT_EXISTS_ACTUAL_USAGE_UNVERIFIED',
        actualRequestsPerUserDay=None, actualBodyBytes=None, protocolAndBilledEgressBytes=None,
        sourceMeaning='Registry contract presence is not active UI usage, permission, data availability or delivery acceptance.'))
assert len({v['operationId'] for v in inventory}) == len(ops)

conditions = []
for row in scene['rows']:
    qualified, incomplete = [], []
    for item in row['transfers']:
        assert isinstance(item['bytes'], int) and item['bytes'] >= 0
        assert item['type'] in ['image', 'metadata']
        if item['completed'] and not item.get('failed') and not item.get('aborted'):
            assert item['sha256'] and item['bytes'] > 0
            qualified.append(item)
        else:
            incomplete.append(item)
    counts = Counter(v['type'] for v in qualified)
    conditions.append(dict(name=row['condition']['name'], qualifiedCallbacks=len(qualified),
        imageCallbacks=counts['image'], metadataCallbacks=counts['metadata'],
        qualifiedImageBodyBytes=sum(v['bytes'] for v in qualified if v['type']=='image'),
        qualifiedMetadataBodyBytes=sum(v['bytes'] for v in qualified if v['type']=='metadata'),
        qualifiedBodyBytes=sum(v['bytes'] for v in qualified),
        incompleteCallbacks=len(incomplete), incompleteOfferedBytes=sum(v['bytes'] for v in incomplete),
        incompleteDeliveredBodyBytes=None if incomplete else 0,
        meaning='Saved controlled successful callback representation lengths; not wire/compressed/TLS/cloud-billed bytes. Incomplete offers are excluded from the qualified subtotal, not assigned zero delivery.'))
cold = next(v for v in conditions if v['name']=='cold-north45')
assert cold['qualifiedBodyBytes'] == 1391986
full = sum(v['qualifiedBodyBytes'] for v in conditions)
assert full == 12801829
incomplete_offers = sum(v['incompleteOfferedBytes'] for v in conditions)
assert incomplete_offers == 182456
assert sum(v['qualifiedImageBodyBytes'] for v in conditions) == 7888506
assert all(v['qualifiedImageBodyBytes'] == 0 for v in conditions if v['name'] in ['source-back','hide-return'])

# Explicitly assumed sensitivity, preserving cached identity across the saved
# continuous journey. No claimed distribution, rate, hit percentage or full bill.
monthly = []
for fraction in [0.25, 0.5, 1.0]:
    for scope, size in [('saved_cold_entry_callbacks_only', cold['qualifiedBodyBytes']), ('saved_28_step_journey_callbacks_only', full)]:
        monthly.append(dict(miniappDau=200, days=30, skyUserFractionAssumed=fraction,
            journeysPerSkyUserDayAssumed=1, scope=scope, bodyBytesPerSavedJourney=size,
            scenarioQualifiedBodyBytes=200*30*fraction*size, wholeMiniappEgressBytes=None,
            meaning='Arithmetic sensitivity, not forecast. Preloaded report/ordinary business, incomplete transfers, other views/updates and protocol/compression are not supplied by this trace.'))
bursts = [dict(simultaneousColdEntries=n, observedCallbackBodyBytes=n*cold['qualifiedBodyBytes'],
    theoreticalFullLinkMbps=12, fullLinkBytesPerSecond=1500000,
    conditionalRecordedBodyDeliverySeconds=n*cold['qualifiedBodyBytes']/1500000,
    assumption='Full shared link and no additional content encoding of recorded callback representation lengths.',
    fullColdEntryOrFirstUsableSeconds=None, actualMixedBusinessBytesPerSecond=None,
    meaning='Conditional body-volume arithmetic for this subtotal only. Caddy already configures zstd/gzip; actual compressed JSON bytes are unknown. Not an unconditional wire lower bound, first usable frame, measured shared-link throughput or capacity acceptance.') for n in [10,20]]

weather_text = (ROOT / 'workers/miniapp-api/src/weather-provider.ts').read_text(encoding='utf-8')
assert 'entries: 128, forecastMs: 30 * 60_000, alertMs: 5 * 60_000, partialMs: 60_000, failureMs: 5_000' in weather_text
weather = dict(accountTariffAndEntitlements='UNVERIFIED_NO_CURRENT_PRICE_ASSUMED', actualMonthlyCalls=None, actualMonthlyCny=None,
    units=['Rounded request point AND provider configuration', 'Demand arrivals and valid response intervals', 'Cache eviction/restart/partial/failure', 'Geo lookups versus regional history-date calls'],
    forecast=dict(readyCacheEntries=128, normalTtlMs=1800000, alertNormalTtlMs=300000,
        partialTtlMs=60000, unavailableTtlMs=5000, expiry='minimum retrievedAt+TTL and source validTo',
        sourceKey='Provider config plus GCJ-02 rounded request latitude/longitude to 2 decimals; trip dates do not change upstream endpoint.',
        loading='on demand; per-process in-flight sharing; excess distinct work beyond cache capacity can run without retention'),
    airQuality=dict(readyCacheEntriesPerSegment=256, currentNormalTtlMs=3600000, forecastNormalTtlMs=21600000,
        partialTtlMs=60000, unavailableTtlMs=30000, expiry='also limited by source validTo', sourceKey='rounded request point'),
    recent=dict(geo='same coordinate/minute active-work sharing only; no completed Geo response cache',
        history='region id/timezone/date shared separately; two previous regional dates; complete day 6h, partial day 1min',
        client='spot recent weather and AQ cache:false', fullGeoOrHistoricalCalls=None),
    historicalPlanning='Old 11020 calls/location/month assumes continuously demanded refreshes and extra historical units, not 200DAU scaling or a current quota/bill. Actual source expiry, cache pressure and Geo calls must be accounted independently.')

missing = [
    'Actual context resolve/read/update, sky report and first-catalog network sequence: report was preloaded into the saved scene.',
    'Actual map/search, terrain/night-light overlays and asset views; native map/provider traffic is a separate origin.',
    'Spot overview/guides/field content, user/contribution image delivery and historical/AQ environmental queries.',
    'Authenticated account/library/import/plan/share mutation and read distributions, DB/cache/worker metrics and permissions.',
    'Contribution uploads/review/provider requests/storage and object-store adapter admission; writes are not synthesized into capacity evidence.',
    'Meteorology upstream query units, entitlements/prices, actual shared-source misses, retries, evictions and service restarts.',
    'WeChat package delivery/official size versus own host egress and contribution media origins.',
    'Actual shared 12Mbps mixed burst, client first usable/detail, p95/frame time/native/GPU/OS peak, API CPU/RSS/DB/worker/backlog.',
    'Actual mounted/release/rollback/Sky-backup resource completeness, Linux allocation, OCI/DB/log/backup host headroom.',
    'Actual production order/renewal/monthly bill/egress metering unit and overage rate, acquisition/processing/agent/project-owner cash and effort.',
]
result = dict(schemaVersion='cloud-sky-whole-miniapp-cost-inputs-v1', status='PARTIAL_SOURCE_BOUND_INPUT_MODEL_NOT_CAPACITY_ACCEPTANCE',
    r40SourcesAndProtectedExact=True, sourcePins=sources, scenePin=scene_pin,
    preloadedSkyReport=dict(**report_pin, role='Frozen API envelope supplied before the scene; file size is not measured wire body. Not included in cold subtotal.'),
    expected=dict(miniappDau=200, production=dict(cpu=4,memoryGB=16,peakMbps=12,monthlyOutboundGB=2000,diskGB=180),
        stagingMemoryGB=4, deployedOrCapacityQualified=False,
        monthlyAllowanceMeaning='User planning input; provider metering, current entitlements and invoice remain unverified.'),
    operationInventory=inventory, familyCounts=dict(Counter(v['family'] for v in inventory)), conditions=conditions,
    qualifiedJourneyBodyBytes=full, incompleteOffers=dict(callbacks=sum(v['incompleteCallbacks'] for v in conditions),
        offeredBytes=incomplete_offers, actualDeliveredBodyBytes=None),
    monthlySensitivities=monthly, coldBurstVolumeLowerBounds=bursts, weatherUnits=weather,
    total=dict(wholeMiniappMonthlyOutboundBytes=None, currentMonthlyOperatingCny=None, incrementalSkyMonthlyCny=None,
        productionFreeDiskBytes=None, capacityPassed=False),
    costRoles=['acquisition/processing', 'retained hosting and delivery', 'external provider query/review/media units',
        'actual incremental agent cash/effective work', 'project-owner involvement', 'shared host invoice and allocation basis'],
    oldModels='Preserved unchanged; old COS/CDN hits/prices and 500/1000DAU examples not adopted for current same-host static delivery.',
    supersedes='r2 burst wording refined: uncompressed saved callback lengths do not establish the actual encoded network duration; r1 wrong status literal failed before writing a model. Earlier artifacts remain unchanged.',
    missing=missing, independentReview='MISSING', mutationDeploymentPublication='NONE',
    next='Capture a current isolated ordinary-business context/report/environment/map/terrain read sequence and its source/cache/byte boundaries, then combine with saved Sky demand into an actual mixed harness. Current response/provenance/permissions must be inspected first; no shared-service mutations or supplier traffic implied.')
(OUT / 'result.json').write_text(json.dumps(result, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
print(json.dumps(dict(result=str((OUT/'result.json').relative_to(ROOT)), operations=len(inventory), families=len(result['familyCounts']),
    coldKnownCallbackBodies=cold['qualifiedBodyBytes'], fullJourneyKnownCallbackBodies=full,
    excludedIncompleteOfferedBytes=incomplete_offers, cold20ConditionalRecordedBodySeconds=bursts[1]['conditionalRecordedBodyDeliverySeconds'],
    monthlyWholeProduct=None, currentCash=None), ensure_ascii=False))
