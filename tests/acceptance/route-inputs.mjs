function preparedSpotId(spotId) {
  if (typeof spotId !== "string" || !/^[A-Za-z0-9][A-Za-z0-9._:-]*$/u.test(spotId)) {
    throw new Error("acceptance_spot_id_required");
  }
  return spotId;
}

/** Real route identities are supplied with the prepared acceptance environment. */
export function resolveAcceptanceRoute(route, spotId = process.env.STARWARD_ACCEPTANCE_SPOT_ID) {
  return route === "/spot/[spotId]" ? `/spot/${encodeURIComponent(preparedSpotId(spotId))}` : route;
}

export function resolveAcceptanceControl(testId, spotId = process.env.STARWARD_ACCEPTANCE_SPOT_ID) {
  return testId === "map-spot-[spotId]" ? `map-spot-${preparedSpotId(spotId)}` : testId;
}

/** Both platform collectors receive concrete case inputs, never route templates. */
export function resolveAcceptanceCase(definition, spotId = process.env.STARWARD_ACCEPTANCE_SPOT_ID) {
  return {
    ...definition,
    route: resolveAcceptanceRoute(definition.route, spotId),
    ...(definition.root_journey ? { root_journey: definition.root_journey.map(id => resolveAcceptanceControl(id, spotId)) } : {}),
    ...(definition.cross_surfaces ? { cross_surfaces: definition.cross_surfaces.map(surface => surface.ops_route ? surface
      : { ...surface, route: resolveAcceptanceRoute(surface.route, spotId) }) } : {}),
  };
}
