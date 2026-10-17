function placeSource(input) {
    return {
        id: `place:retired:${input.retrievedAt}`,
        kind: "THIRD_PARTY_PLACE",
        provider: "Starward 地点能力说明",
        title: "地点搜索服务",
        sourceUrl: "",
        license: "应用能力说明，不含第三方地点数据",
        licenseUrl: "",
        publishedAt: null,
        retrievedAt: input.retrievedAt,
        validFrom: input.retrievedAt,
        validTo: input.state === "FRESH"
            ? new Date(Date.parse(input.retrievedAt) + 10 * 60_000).toISOString()
            : null,
        state: input.state,
        confidence: null,
        precision: "普通地点由用户通过微信平台选点，不属于正式观星点搜索",
        limitations: input.limitations,
    };
}
function unavailable(errorCode) {
    const retrievedAt = new Date().toISOString();
    const source = placeSource({
        retrievedAt,
        state: "UNAVAILABLE",
        limitations: [
            "当前方案不提供独立的普通地点搜索服务",
            "地点搜索不可用时不会生成伪地点，也不会把普通地点提升为正式观星点",
        ],
    });
    return {
        value: null,
        state: "UNAVAILABLE",
        source,
        errorCode,
    };
}
/** Ordinary locations are chosen by WeChat on the client, never a server POI feed. */
export class DisabledPlaceSearchAdapter {
    key = "place-search-retired";
    async search() {
        return unavailable("place_search_provider_retired");
    }
}
export function createPlaceSearchPort(_config, _transport = fetch) {
    return new DisabledPlaceSearchAdapter();
}
//# sourceMappingURL=place-provider.js.map