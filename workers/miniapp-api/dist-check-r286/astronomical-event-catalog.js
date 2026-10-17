import { METEOR_EVENT_CATALOG_VERSION, METEOR_EVENTS_2026, meteorCatalogSource, meteorReferenceOverlapsLocalDate, } from "./meteor-event-catalog.js";
import { MINIAPP_EVENT_PROJECTION_ALGORITHM, calculateEclipseOccurrences, } from "./astronomy-engine-adapter.js";
export const ECLIPSE_EVENT_CATALOG_VERSION = "astronomy-engine-2.1.19-eclipses-2026.1";
export const ASTRONOMICAL_EVENT_CATALOG_VERSION = `${METEOR_EVENT_CATALOG_VERSION}+${ECLIPSE_EVENT_CATALOG_VERSION}`;
const METEORS = METEOR_EVENTS_2026.map(event => ({
    ...event,
    kind: "METEOR_SHOWER",
    peakAtUtc: null,
}));
const ECLIPSES = calculateEclipseOccurrences(2026);
export const ASTRONOMICAL_EVENTS_2026 = Object.freeze([...METEORS, ...ECLIPSES].sort((left, right) => left.peakDate.localeCompare(right.peakDate) || left.occurrenceId.localeCompare(right.occurrenceId)));
export function astronomicalEventByOccurrenceId(occurrenceId) {
    return ASTRONOMICAL_EVENTS_2026.find(event => event.occurrenceId === occurrenceId) ?? null;
}
export function activeAstronomicalEvents(localDate) {
    return ASTRONOMICAL_EVENTS_2026.filter(event => event.kind === "METEOR_SHOWER" ? meteorReferenceOverlapsLocalDate(event, localDate) : localDate >= event.activeStartDate && localDate <= event.activeEndDate);
}
export function eclipseCatalogSource(localDate) {
    return {
        id: `eclipse-catalog:${ECLIPSE_EVENT_CATALOG_VERSION}`,
        kind: "PRODUCT_CALCULATION",
        provider: "Astronomy Engine",
        title: "2026 solar and lunar eclipse calculations",
        sourceUrl: "https://github.com/cosinekitty/astronomy",
        license: "MIT License",
        licenseUrl: "https://github.com/cosinekitty/astronomy/blob/master/LICENSE",
        publishedAt: null,
        retrievedAt: new Date().toISOString(),
        validFrom: `${localDate.slice(0, 4)}-01-01T00:00:00.000Z`,
        validTo: `${localDate.slice(0, 4)}-12-31T23:59:59.999Z`,
        state: "FRESH",
        confidence: 0.99,
        precision: `食甚与食相由 ${MINIAPP_EVENT_PROJECTION_ALGORITHM} 按 UTC 计算；目录日期采用北京时间，所在地时刻单独换算并显示到分钟`,
        limitations: [
            "全球食事件目录是锁定算法的计算结果，不是实时观测公告",
            "地点可见性必须另行结合观察者坐标、太阳或月球高度计算",
            "天气和真实地平遮挡不属于该算法目录",
        ],
    };
}
export function astronomicalEventSources(localDate) {
    return [meteorCatalogSource(localDate), eclipseCatalogSource(localDate)];
}
export function astronomicalEventSource(event) {
    return event.kind === "METEOR_SHOWER"
        ? meteorCatalogSource(event.peakDate)
        : eclipseCatalogSource(event.peakDate);
}
//# sourceMappingURL=astronomical-event-catalog.js.map