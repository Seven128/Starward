import { createRequire } from "node:module";

type AstronomyEngine = typeof import("astronomy-engine");
export type Body = import("astronomy-engine").Body;
export type Observer = import("astronomy-engine").Observer;

// astronomy-engine@2.1.19 publishes an `import` path ending in `.js` without
// declaring `type: module`. Node 24 therefore cannot reliably expose its ESM
// named exports when this workspace is consumed through package resolution.
// Load the package's supported CommonJS entry at this one dependency boundary.
const require = createRequire(import.meta.url);
const engine = require("astronomy-engine") as AstronomyEngine;

export const Body: AstronomyEngine["Body"] = engine.Body;
export const Equator: AstronomyEngine["Equator"] = engine.Equator;
export const Horizon: AstronomyEngine["Horizon"] = engine.Horizon;
export const Illumination: AstronomyEngine["Illumination"] =
  engine.Illumination;
export const Observer: AstronomyEngine["Observer"] = engine.Observer;
export const SearchAltitude: AstronomyEngine["SearchAltitude"] =
  engine.SearchAltitude;
export const SearchRiseSet: AstronomyEngine["SearchRiseSet"] =
  engine.SearchRiseSet;
