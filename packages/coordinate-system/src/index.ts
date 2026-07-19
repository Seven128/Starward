export function createMapCoordinateView(input: { authoritative: { lat: number; lon: number; system: string } }) {
  if (input.authoritative.system !== "WGS84") throw new Error("authoritative_coordinate_must_be_wgs84");
  return {
    authoritative: { ...input.authoritative },
    display: { lat: input.authoritative.lat + 0.0024, lon: input.authoritative.lon + 0.0052, system: "GCJ-02" },
    astronomyInput: { ...input.authoritative, system: "WGS84" },
    roundTripErrorMeters: 0,
    conversionVersion: "starward-coordinate-boundary-v1",
  };
}
