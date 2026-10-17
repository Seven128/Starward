import { createHash } from "node:crypto";
export const SKY_OPPORTUNITY_RULES = Object.freeze({
    componentWeights: Object.freeze({
        celestial: 0.48,
        environmental: 0.4,
        siteSky: 0.12,
    }),
    enterThreshold: 0.58,
    remainThreshold: 0.52,
    minimumWindowMinutes: 60,
    maximumSmoothedGapMinutes: 15,
    excellentMinimumScore: 0.75,
    excellentMinimumConfidence: 0.75,
    excellentMinimumMinutes: 90,
    fairMinimumScore: 0.4,
});
function clamp01(value) {
    return Math.max(0, Math.min(1, value));
}
function digest(value) {
    return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}
function weightedGeometricMean(entries) {
    const totalWeight = entries.reduce((sum, entry) => sum + entry.weight, 0);
    if (totalWeight <= 0)
        return 0;
    if (entries.some((entry) => entry.value <= 0))
        return 0;
    return Math.exp(entries.reduce((sum, entry) => sum + (entry.weight / totalWeight) * Math.log(clamp01(entry.value)), 0));
}
function cadenceMinutes(slices) {
    const gaps = slices
        .slice(1)
        .map((slice, index) => (Date.parse(slice.at) - Date.parse(slices[index].at)) / 60_000)
        .filter((gap) => Number.isFinite(gap) && gap > 0)
        .sort((left, right) => left - right);
    return gaps.length ? gaps[Math.floor(gaps.length / 2)] : 15;
}
function isCriticalDataBlocker(code) {
    return (code.startsWith("CRITICAL_DATA_") ||
        code.endsWith("_DATA_UNAVAILABLE") ||
        code.endsWith("_DATA_EXPIRED"));
}
function evaluateSlice(input) {
    if (input.hardBlockers.length)
        return {
            at: input.at,
            score: null,
            confidence: null,
            eligible: false,
            hardBlockers: input.hardBlockers,
        };
    if (input.weatherTransmission === null)
        return {
            at: input.at,
            score: null,
            confidence: null,
            eligible: false,
            hardBlockers: [],
        };
    const celestial = (input.eventActivity === null ? 1 : clamp01(input.eventActivity)) *
        clamp01(input.targetVisibility);
    const environmental = clamp01(input.weatherTransmission) *
        clamp01(input.darkness) *
        (1 - clamp01(input.moonPenalty));
    const siteParts = [input.lightPollution, input.horizonSuitability].filter((value) => value !== null);
    const siteSky = siteParts.length
        ? siteParts.reduce((product, value) => product * clamp01(value), 1)
        : null;
    const components = [
        {
            value: celestial,
            weight: SKY_OPPORTUNITY_RULES.componentWeights.celestial,
        },
        {
            value: environmental,
            weight: SKY_OPPORTUNITY_RULES.componentWeights.environmental,
        },
        ...(siteSky === null
            ? []
            : [
                {
                    value: siteSky,
                    weight: SKY_OPPORTUNITY_RULES.componentWeights.siteSky,
                },
            ]),
    ];
    const completeness = siteParts.length === 2 ? 1 : siteParts.length === 1 ? 0.9 : 0.8;
    return {
        at: input.at,
        score: weightedGeometricMean(components),
        confidence: clamp01(input.dataConfidence) *
            completeness,
        eligible: false,
        hardBlockers: [],
    };
}
function factor(code, label, severity, detail, sourceRevision) {
    return { code, label, severity, detail, sourceIds: [sourceRevision] };
}
function mean(values) {
    return values.reduce((sum, value) => sum + value, 0) / values.length;
}
function windowFactors(windowSlices, sourceRevision) {
    const weather = mean(windowSlices
        .map((slice) => slice.weatherTransmission)
        .filter((value) => value !== null));
    const darkness = mean(windowSlices.map((slice) => slice.darkness));
    const moon = mean(windowSlices.map((slice) => slice.moonPenalty));
    const target = mean(windowSlices.map((slice) => slice.targetVisibility));
    const favorable = [];
    const adverse = [];
    const add = (positive, code, label, detail) => (positive ? favorable : adverse).push(factor(code, label, positive ? "POSITIVE" : "CAUTION", detail, sourceRevision));
    add(weather >= 0.65, "WINDOW_WEATHER", "天气透过率", `窗口天气透过因子约 ${Math.round(weather * 100)}%。`);
    add(darkness >= 0.9, "WINDOW_DARKNESS", "黑暗条件", `窗口黑暗因子约 ${Math.round(darkness * 100)}%。`);
    add(moon <= 0.35, "WINDOW_MOON", "月光影响", `窗口月光惩罚约 ${Math.round(moon * 100)}%。`);
    add(target >= 0.55, "WINDOW_TARGET", "目标可见性", `窗口目标可见因子约 ${Math.round(target * 100)}%。`);
    return { favorableFactors: favorable, adverseFactors: adverse };
}
function buildWindows(inputs, results, sourceRevision) {
    if (!inputs.length)
        return [];
    const cadence = cadenceMinutes(inputs);
    const eligibleIndexes = results
        .map((result, index) => (result.eligible ? index : -1))
        .filter((index) => index >= 0);
    const segments = [];
    for (const index of eligibleIndexes) {
        const current = segments.at(-1);
        if (!current) {
            segments.push([index]);
            continue;
        }
        const prior = current.at(-1);
        const elapsed = (Date.parse(inputs[index].at) - Date.parse(inputs[prior].at)) / 60_000;
        if (elapsed - cadence <=
            SKY_OPPORTUNITY_RULES.maximumSmoothedGapMinutes)
            current.push(index);
        else
            segments.push([index]);
    }
    const windows = segments.flatMap((indexes) => {
        const startIndex = indexes[0];
        const endIndex = indexes.at(-1);
        const durationMinutes = (Date.parse(inputs[endIndex].at) - Date.parse(inputs[startIndex].at)) /
            60_000 +
            cadence;
        if (durationMinutes < SKY_OPPORTUNITY_RULES.minimumWindowMinutes)
            return [];
        const selectedResults = indexes.map((index) => results[index]);
        const scores = selectedResults.map((result) => result.score);
        const confidences = selectedResults.map((result) => result.confidence);
        const selectedInputs = indexes.map((index) => inputs[index]);
        const prior = results[startIndex - 1];
        const next = results[endIndex + 1];
        const startReason = startIndex === 0
            ? "观测夜起点即达到机会进入阈值"
            : prior?.hardBlockers.length
                ? `前一时间片阻断结束：${prior.hardBlockers.join("、")}`
                : "机会分达到进入阈值";
        const endReason = endIndex === results.length - 1
            ? "观测夜边界结束"
            : next?.hardBlockers.length
                ? `下一时间片出现阻断：${next.hardBlockers.join("、")}`
                : "机会分跌破保持阈值";
        return [
            {
                start: inputs[startIndex].at,
                end: new Date(Date.parse(inputs[endIndex].at) + cadence * 60_000).toISOString(),
                durationMinutes: Math.round(durationMinutes),
                averageScore: Math.round(mean(scores) * 100),
                peakScore: Math.round(Math.max(...scores) * 100),
                confidence: Number(mean(confidences).toFixed(3)),
                ...windowFactors(selectedInputs, sourceRevision),
                startReason,
                endReason,
                modelBoundarySpreadMinutes: null,
            },
        ];
    });
    return windows.sort((left, right) => {
        const quality = (window) => window.averageScore * 0.65 +
            window.confidence * 100 * 0.2 +
            Math.min(window.durationMinutes / 180, 1) * 100 * 0.15;
        return quality(right) - quality(left) || left.start.localeCompare(right.start);
    });
}
export class SkyOpportunityEngine {
    compute(input) {
        const ordered = [...input.slices].sort((left, right) => left.at.localeCompare(right.at));
        const evaluated = ordered.map(evaluateSlice);
        let active = false;
        const slices = evaluated.map((result) => {
            const threshold = active
                ? SKY_OPPORTUNITY_RULES.remainThreshold
                : SKY_OPPORTUNITY_RULES.enterThreshold;
            const eligible = result.score !== null &&
                result.confidence !== null &&
                result.score >= threshold &&
                !result.hardBlockers.length;
            active = eligible;
            return { ...result, eligible };
        });
        const windows = buildWindows(ordered, slices, input.sourceRevision);
        const primaryWindow = windows[0] ?? null;
        const backupWindow = windows[1] ?? null;
        const scored = slices.filter((slice) => slice.score !== null && slice.confidence !== null);
        const explicitSkyRisk = ordered.some((slice) => slice.hardBlockers.some((code) => !isCriticalDataBlocker(code)));
        const criticalDataUnavailable = ordered.some((slice) => slice.hardBlockers.some(isCriticalDataBlocker));
        const missingCriticalInputs = slices.some((slice) => slice.score === null &&
            !slice.hardBlockers.some((code) => !isCriticalDataBlocker(code)));
        const confidence = primaryWindow?.confidence ??
            (scored.length ? Number(mean(scored.map((slice) => slice.confidence)).toFixed(3)) : null);
        const status = !scored.length && !explicitSkyRisk
            ? "INSUFFICIENT_DATA"
            : primaryWindow &&
                primaryWindow.averageScore >=
                    SKY_OPPORTUNITY_RULES.excellentMinimumScore * 100 &&
                primaryWindow.confidence >=
                    SKY_OPPORTUNITY_RULES.excellentMinimumConfidence &&
                primaryWindow.durationMinutes >=
                    SKY_OPPORTUNITY_RULES.excellentMinimumMinutes
                ? "EXCELLENT"
                : primaryWindow
                    ? "GOOD"
                    : scored.some((slice) => slice.score >= SKY_OPPORTUNITY_RULES.fairMinimumScore)
                        ? "FAIR"
                        : "POOR";
        const label = {
            EXCELLENT: "天空条件很好，有稳定连续窗口",
            GOOD: "天空条件较好，有连续窗口",
            FAIR: "天空条件一般，仅有短时或边缘机会",
            POOR: explicitSkyRisk
                ? "天空存在明确风险，不适合观测"
                : "没有达到要求的连续观测窗口",
            INSUFFICIENT_DATA: "天空关键数据不足，暂不能判断",
        };
        const factors = [];
        if (primaryWindow)
            factors.push(factor("PRIMARY_CONTINUOUS_WINDOW", "主连续窗口", "POSITIVE", `${primaryWindow.durationMinutes} 分钟，平均机会分 ${primaryWindow.averageScore}，峰值 ${primaryWindow.peakScore}。`, input.sourceRevision));
        else
            factors.push(factor(criticalDataUnavailable || missingCriticalInputs
                ? "SKY_CRITICAL_DATA_UNAVAILABLE"
                : "NO_CONTINUOUS_WINDOW", criticalDataUnavailable || missingCriticalInputs
                ? "天空关键数据不足"
                : "没有连续窗口", criticalDataUnavailable || missingCriticalInputs
                ? "UNKNOWN"
                : "CAUTION", criticalDataUnavailable || missingCriticalInputs
                ? "关键天气时间片不可用或硬过期，缺失不会按 0 或晴天处理。"
                : `没有满足进入/保持阈值和至少 ${SKY_OPPORTUNITY_RULES.minimumWindowMinutes} 分钟时长的窗口。`, input.sourceRevision));
        if (missingCriticalInputs && scored.length)
            factors.push(factor("SKY_PARTIAL_TIME_GRID", "部分时间片资料不足", "CAUTION", "缺失时间片未参与窗口评分，也没有按 0 或晴天补齐。", input.sourceRevision));
        if (explicitSkyRisk)
            factors.push(factor("SKY_HARD_BLOCKER", "天空风险阻断", "BLOCKER", "严重天气时间片先于任何机会评分阻断。", input.sourceRevision));
        if (confidence !== null && confidence < 0.7)
            factors.push(factor("SKY_LOW_CONFIDENCE", "天空结论信心有限", "CAUTION", "证据完整度、时效或单模型一致性限制了结论信心。", input.sourceRevision));
        const opportunity = {
            status,
            label: label[status],
            primaryWindow,
            backupWindow,
            windows,
            suitableFor: status === "INSUFFICIENT_DATA" || status === "POOR" ? [] : input.suitableFor,
            factors,
            confidence,
            freshness: input.freshness,
            ruleVersion: input.ruleVersion,
            inputDigest: digest({
                localDate: input.localDate,
                sourceRevision: input.sourceRevision,
                ruleVersion: input.ruleVersion,
                slices: ordered,
            }),
        };
        return { opportunity, slices };
    }
}
//# sourceMappingURL=sky-opportunity-engine.js.map