"use strict";
function getObservationContext(contextId, signal) {
    return requestOperation("observation-context:" + contextId, "observationContextGet", {
        pathParams: { contextId },
        ...(signal ? { signal } : {}),
    });
}
async function restoreObservationContext(context, signal) {
    try {
        return await getObservationContext(context.contextId, signal);
    }
    catch (error) {
        if (!(error instanceof MiniappApiError) ||
            (error.code !== "NOT_FOUND" && error.code !== "STALE_REJECTED"))
            throw error;
        let routeOriginContextId = null;
        let recoveredRouteOrigin = null;
        if (context.routeOrigin) {
            recoveredRouteOrigin = await resolveObservationContext({
                location: {
                    kind: "MAP_POINT",
                    displayName: context.routeOrigin.displayName,
                    wgs84: context.routeOrigin.wgs84,
                    source: context.routeOrigin.source,
                    ...(context.timezone === "Asia/Hong_Kong" ||
                        context.timezone === "Asia/Shanghai"
                        ? { timezoneHint: context.timezone }
                        : {}),
                },
                localDate: context.localDate,
                selectedAt: context.selectedAtUtc,
                eventInstanceId: context.eventInstanceId,
                targetProfile: context.targetProfile,
            }, signal);
            routeOriginContextId = recoveredRouteOrigin.data.contextId;
        }
        try {
            return await resolveObservationContext(observationContextRecoveryInput(context, routeOriginContextId), signal);
        }
        catch (recoveryError) {
            if (context.location.kind === "FORMAL_SPOT" && recoveredRouteOrigin &&
                recoveryError instanceof MiniappApiError && recoveryError.code === "NOT_FOUND")
                return recoveredRouteOrigin;
            throw recoveryError;
        }
    }
}
async function updateObservationContext(context, input, signal) {
    const update = async (current) => {
        try {
            const response = await requestOperation("observation-context:" + current.contextId, "observationContextPut", {
                pathParams: { contextId: current.contextId },
                body: { ...input, expectedRevision: current.revision },
                idempotencyKey: idempotencyKey("observation-context"),
                ...(signal ? { signal } : {}),
            });
            // A successful status cannot acknowledge a different place/time or an
            // unchanged revision. Normal and uncertain replies share one validator.
            if (!confirmedObservationContextEdit(current, input, response))
                throw new Error("bff_observation_context_update_invalid");
            return response;
        }
        catch (error) {
            if (error instanceof MiniappRequestCancelled || signal?.aborted ||
                (error instanceof MiniappApiError && error.code !== "CONFLICT" && error.statusCode !== 408 && error.statusCode < 500))
                throw error;
            // A PUT may be durable even when its reply is lost. Context PUT does
            // not consume the idempotency header, so never replay it speculatively.
            let readback;
            try {
                readback = await requestOperation("observation-context:" + current.contextId, "observationContextGet", {
                    pathParams: { contextId: current.contextId }, cache: false, ...(signal ? { signal } : {}),
                });
            }
            catch (readError) {
                if (readError instanceof MiniappRequestCancelled || signal?.aborted)
                    throw readError;
                throw error;
            }
            if (!confirmedObservationContextEdit(current, input, readback))
                throw error;
            return readback;
        }
    };
    let result;
    try {
        result = await update(context);
    }
    catch (error) {
        if (!(error instanceof MiniappApiError) ||
            (error.code !== "NOT_FOUND" && error.code !== "STALE_REJECTED"))
            throw error;
        // A persisted context ID is only a recovery hint. The server may have
        // restarted or the context may have expired between the page restore and
        // this user action, so rebuild the same context and apply the edit once.
        const recovered = await restoreObservationContext(context, signal);
        result = await update(recovered.data);
    }
    invalidateApiCache("map-scene");
    invalidateApiCache("spot-overview");
    invalidateApiCache("spot-sky");
    return result;
}
({ getObservationContext, updateObservationContext });
