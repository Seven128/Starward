import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { createRequire } from "node:module";
import { validMoonBodyFrame, validSkyBodyFrame } from "@starward/miniapp-contracts";
const { Libration } = createRequire(import.meta.url)("astronomy-engine") as typeof import("astronomy-engine");
import {
  calculateMiniappNightSky,
  calculateEquatorialHorizontalAt,
  calculateSolarLongitudeJ2000,
  calculateTargetHorizontalAt,
  moonPhaseKey,
  type MiniappAstronomyTarget,
} from "./astronomy-engine-adapter.ts";

test("rounding either side of the north meridian preserves a valid zero-degree bearing", () => {
  // At this instant these two equatorial directions straddle the local meridian
  // by 1e-8 degrees. Dec 70 at latitude 30 is due north at altitude 50.
  for (const rightAscensionDeg of [181.36684371498643, 181.36684373498645]) {
    const position = calculateEquatorialHorizontalAt({
      at: "2026-09-22T12:00:00.000Z", latitude: 30, longitude: 0, elevationM: 0,
      rightAscensionDeg, declinationDeg: 70,
    });
    assert.equal(position.azimuthDeg, 0);
    assert.equal(position.altitudeDeg, 50);
  }
});

test("requested daytime positions remain available when no astronomical dusk exists", () => {
  const at = "2026-06-21T12:00:00.000Z";
  const result = calculateMiniappNightSky({ latitude: 70, longitude: 20, elevationM: 0, timezone: "Europe/Oslo",
    nightDate: "2026-06-21", target: "jupiter", additionalTimes: [at, at] });
  assert.equal(result.astronomicalDusk, null);
  const rows = result.samples.filter(row => row.at === at);
  assert.equal(rows.length, 1);
  assert.ok(rows[0]!.sunAltitudeDeg > 0);
  assert.ok(Number.isFinite(rows[0]!.moonAltitudeDeg));
});

test("the exact topocentric Moon moves and changes apparent diameter with the report instant", () => {
  const times = ["2026-09-23T12:00:00.000Z", "2026-10-07T12:00:00.000Z"];
  const input = { latitude: 23.1291, longitude: 113.2644, elevationM: 20,
    timezone: "Asia/Shanghai", nightDate: "2026-09-23", target: "moon" as const,
    additionalTimes: times };
  const rows = calculateMiniappNightSky(input).samples.filter(row => times.includes(row.at));
  assert.equal(rows.length,2);
  assert.ok(rows.every(row => row.moonAzimuthDeg >= 0 && row.moonAzimuthDeg < 360 &&
    row.moonAngularDiameterDeg > .45 && row.moonAngularDiameterDeg < .6));
  assert.ok(Math.abs(rows[0]!.moonAzimuthDeg-rows[1]!.moonAzimuthDeg) > 100);
  assert.ok(Math.abs(rows[0]!.moonAngularDiameterDeg-rows[1]!.moonAngularDiameterDeg) > .005,
    "a fixed-size Moon icon or stale distance cannot pass");
  assert.ok(rows[0]!.moonIllumination > .8 && rows[1]!.moonIllumination < .2);
});

test("lunar body axes match the independent geocentric libration convention and change with the observer", () => {
  const at="2026-09-22T13:00:00.000Z";
  const atSite=(latitude:number,longitude:number)=>calculateMiniappNightSky({
    latitude,longitude,elevationM:20,timezone:"Asia/Shanghai",nightDate:"2026-09-22",
    target:"moon",additionalTimes:[at],
  }).samples.find(row=>row.at===at)!;
  const row=atSite(22.5,114.5),farSite=atSite(-33.9,151.2);
  for(const sample of [row,farSite]){
    const body=sample.moonBodyFrame;
    assert.ok(validMoonBodyFrame(body));
    const pole=body.poleEnu,prime=body.primeMeridianEnu;
    const east:[number,number,number]=[
      pole[1]*prime[2]-pole[2]*prime[1],
      pole[2]*prime[0]-pole[0]*prime[2],
      pole[0]*prime[1]-pole[1]*prime[0],
    ];
    const az=sample.moonAzimuthDeg*Math.PI/180,alt=sample.moonAltitudeDeg*Math.PI/180;
    const observer:[number,number,number]=[-Math.cos(alt)*Math.sin(az),-Math.cos(alt)*Math.cos(az),-Math.sin(alt)];
    const dot=(a:readonly number[],b:readonly number[])=>a.reduce((sum,v,i)=>sum+v*b[i]!,0);
    const longitude=Math.atan2(dot(observer,east),dot(observer,prime))*180/Math.PI;
    const latitude=Math.asin(dot(observer,pole))*180/Math.PI;
    const libration=Libration(new Date(at));
    assert.ok(Math.abs(longitude-libration.elon)<1.2,`wrong prime meridian: ${longitude} vs ${libration.elon}`);
    assert.ok(Math.abs(latitude-libration.elat)<1.2,`wrong lunar north: ${latitude} vs ${libration.elat}`);
  }
  assert.notDeepEqual(row.moonBodyFrame,farSite.moonBodyFrame,
    "two observer locations must not receive one cached ENU body orientation");
});

test("the solar photosphere diameter follows the exact observer distance", () => {
  const times=["2026-01-03T12:00:00.000Z","2026-07-04T12:00:00.000Z"];
  const rows=calculateMiniappNightSky({latitude:23.1291,longitude:113.2644,elevationM:20,
    timezone:"Asia/Shanghai",nightDate:"2026-01-03",target:"moon",additionalTimes:times})
    .samples.filter(row=>times.includes(row.at));
  assert.equal(rows.length,2);
  assert.ok(rows.every(row=>row.sunAngularDiameterDeg>.5&&row.sunAngularDiameterDeg<.55));
  assert.ok(rows[0]!.sunAngularDiameterDeg>rows[1]!.sunAngularDiameterDeg+.01,
    "a fixed icon size cannot reproduce the near/far Earth-Sun distance relationship");
});

test("seven physical planetary globes have time-dependent topocentric size and phase", () => {
  const times = ["2026-09-22T10:00:00.000Z", "2027-01-22T10:00:00.000Z"];
  const rows = calculateMiniappNightSky({latitude:23.1291,longitude:113.2644,elevationM:20,
    timezone:"Asia/Shanghai",nightDate:"2026-09-22",target:"jupiter",additionalTimes:times})
    .samples.filter(row=>times.includes(row.at));
  assert.equal(rows.length,2);
  assert.deepEqual(rows[0]!.planets.map(p=>p.body),["MERCURY","VENUS","MARS","JUPITER","SATURN","URANUS","NEPTUNE"]);
  for (const row of rows) {
    assert.ok(row.planets.every(p=>p.azimuthDeg>=0&&p.azimuthDeg<360&&p.altitudeDeg>=-90&&p.altitudeDeg<=90&&
      p.angularDiameterDeg>0&&p.angularDiameterDeg<.1&&p.illuminatedFraction>=0&&p.illuminatedFraction<=1&&
      Number.isFinite(p.visualMagnitude)));
    assert.ok(row.planets[1]!.angularDiameterDeg > row.planets[0]!.angularDiameterDeg,
      "Venus globe is angularly larger than Mercury for this fixture");
    assert.ok(row.planets[3]!.illuminatedFraction > .9,"outer Jupiter remains nearly fully lit");
    assert.ok(typeof row.planets[4]!.ringTiltDeg === "number");
  }
  const saturn=rows[0]!.planets[4]!;
  assert.ok(saturn.ringPoleEnu && Math.abs(Math.hypot(...saturn.ringPoleEnu)-1)<.00001);
  assert.ok(rows[1]!.planets[4]!.ringPoleEnu,
    "the orientation is part of every exact planetary sample, not a UI icon rotation");
  const mars0=rows[0]!.planets[2]!,mars1=rows[1]!.planets[2]!;
  assert.ok(validSkyBodyFrame(mars0.bodyFrame)&&validSkyBodyFrame(mars1.bodyFrame));
  assert.notDeepEqual(mars0.bodyFrame,mars1.bodyFrame,"the Mars surface cannot keep an old instant's rotation");
  const mercury0=rows[0]!.planets[0]!,mercury1=rows[1]!.planets[0]!;
  assert.ok(validSkyBodyFrame(mercury0.bodyFrame)&&validSkyBodyFrame(mercury1.bodyFrame));
  assert.notDeepEqual(mercury0.bodyFrame,mercury1.bodyFrame,"Mercury's surface must use each report instant");
  const jupiter0=rows[0]!.planets[3]!,jupiter1=rows[1]!.planets[3]!;
  assert.ok(validSkyBodyFrame(jupiter0.bodyFrame)&&validSkyBodyFrame(jupiter1.bodyFrame));
  assert.notDeepEqual(jupiter0.bodyFrame?.poleEnu,jupiter1.bodyFrame?.poleEnu,
    "Jupiter's observed axis belongs to each exact observer/time frame");
  for (const index of [5,6]) {
    const first=rows[0]!.planets[index]!,later=rows[1]!.planets[index]!;
    assert.ok(validSkyBodyFrame(first.bodyFrame)&&validSkyBodyFrame(later.bodyFrame));
    assert.notDeepEqual(first.bodyFrame,later.bodyFrame,
      `${first.body} historical latitude bands require the exact observation frame`);
    assert.ok(Math.abs(Math.hypot(...first.bodyFrame.poleEnu)-1)<1e-6);
    assert.ok(Math.abs(Math.hypot(...first.bodyFrame.primeMeridianEnu)-1)<1e-6);
    assert.ok(Math.abs(first.bodyFrame.poleEnu.reduce((sum,value,i)=>
      sum+value*first.bodyFrame!.primeMeridianEnu[i]!,0))<1e-6);
  }
  assert.equal(rows[0]!.planets[1]!.bodyFrame,null);
  const venus0=rows[0]!.planets[1]!,venus1=rows[1]!.planets[1]!;
  assert.ok(Math.abs(venus0.angularDiameterDeg-venus1.angularDiameterDeg)>1e-5,
    "a fixed visual icon cannot pass");
  assert.ok(Math.abs(venus0.illuminatedFraction-venus1.illuminatedFraction)>.05,
    "the terminator must follow its own report instant");
});

test("Saturn ring pole and emitted sunlight match independent PDS season angles",()=>{
  // PDS Rings Saturn Viewer 3.1, Earth-centre, SAT415+SAT441+DE440,
  // https://pds-rings.seti.org/tools/viewer3_sat.shtml ; the small terrestrial
  // parallax and different ephemerides are covered by the stated tolerance.
  const cases=[
    {at:"2017-06-15T12:00:00.000Z",observer:26.59396,solar:26.73010},
    {at:"2026-09-22T13:00:00.000Z",observer:-7.86528,solar:-7.52651},
  ];
  for(const {at,observer,solar} of cases){
    const row=calculateMiniappNightSky({latitude:22.5,longitude:114.5,elevationM:20,
      timezone:"Asia/Shanghai",nightDate:at.slice(0,10),target:"saturn",additionalTimes:[at]})
      .samples.find(sample=>sample.at===at)!;
    const saturn=row.planets.find(planet=>planet.body==="SATURN")!;
    assert.ok(saturn.ringPoleEnu&&saturn.ringSunEnu);
    const {ringPoleEnu:p,ringSunEnu:s}=saturn;
    assert.ok(Math.abs(Math.hypot(...s)-1)<1e-5);
    const az=saturn.azimuthDeg*Math.PI/180,alt=saturn.altitudeDeg*Math.PI/180;
    const toObserver=[-Math.sin(az)*Math.cos(alt),-Math.cos(az)*Math.cos(alt),-Math.sin(alt)];
    const dot=(a:readonly number[],b:readonly number[])=>a.reduce((sum,x,i)=>sum+x*b[i]!,0);
    const degrees=180/Math.PI;
    assert.ok(Math.abs(Math.asin(dot(p,toObserver))*degrees-observer)<.02,
      "the signed Earth-side ring opening must agree with PDS");
    assert.ok(Math.abs(Math.asin(dot(p,s))*degrees-solar)<.02,
      "the emitted Sun direction must reproduce the opposite-season PDS values");
  }
});

test("Mars body longitude matches independent Horizons light-time-corrected sub-observer longitude",()=>{
  // JPL Horizons Mars 499, geocentric 500@399, 2026-09-22 13:00 UT,
  // observer quantity 14: west-positive sub-observer longitude 312.947734°.
  // USGS MDIM 2.1 uses positive-east planetocentric longitude, so 47.052266°.
  // https://ssd.jpl.nasa.gov/api/horizons.api (QUANTITIES='14')
  const at="2026-09-22T13:00:00.000Z";
  const row=calculateMiniappNightSky({latitude:22.5,longitude:114.5,elevationM:20,
    timezone:"Asia/Shanghai",nightDate:"2026-09-22",target:"mars",additionalTimes:[at]})
    .samples.find(sample=>sample.at===at)!;
  const mars=row.planets.find(planet=>planet.body==="MARS")!;
  assert.ok(validSkyBodyFrame(mars.bodyFrame));
  const {poleEnu:p,primeMeridianEnu:z}=mars.bodyFrame;
  const east:[number,number,number]=[
    p[1]*z[2]-p[2]*z[1],p[2]*z[0]-p[0]*z[2],p[0]*z[1]-p[1]*z[0],
  ];
  const az=mars.azimuthDeg*Math.PI/180,alt=mars.altitudeDeg*Math.PI/180;
  const observer=[-Math.cos(alt)*Math.sin(az),-Math.cos(alt)*Math.cos(az),-Math.sin(alt)];
  const dot=(a:readonly number[],b:readonly number[])=>a.reduce((sum,x,i)=>sum+x*b[i]!,0);
  const eastLongitude=(Math.atan2(dot(observer,east),dot(observer,z))*180/Math.PI+360)%360;
  assert.ok(Math.abs(eastLongitude-47.052266)<.1,
    `Mars map centre ${eastLongitude}° E must not use reception-time spin`);
});

test("Mercury body longitude matches independent Horizons sub-observer longitude",()=>{
  // JPL Horizons Mercury 199, geocentric 500@399, 2026-10-08 10:00/11:00 UT,
  // observer quantity 14: west-positive 195.312673°/195.521008°.
  // The source USGS MESSENGER WMS uses east-positive -180..180 longitude.
  // https://ssd.jpl.nasa.gov/api/horizons.api (QUANTITIES='14')
  const dot=(a:readonly number[],b:readonly number[])=>a.reduce((sum,x,i)=>sum+x*b[i]!,0);
  const times=["2026-10-08T10:00:00.000Z","2026-10-08T11:00:00.000Z"];
  const rows=calculateMiniappNightSky({latitude:22.5,longitude:114.5,elevationM:20,
    timezone:"Asia/Shanghai",nightDate:"2026-10-08",target:"mercury",additionalTimes:times}).samples;
  for(const [index,at] of times.entries()){
    const mercury=rows.find(sample=>sample.at===at)?.planets.find(planet=>planet.body==="MERCURY");
    assert.ok(mercury&&validSkyBodyFrame(mercury.bodyFrame));
    const {poleEnu:p,primeMeridianEnu:z}=mercury.bodyFrame;
    const east:[number,number,number]=[
      p[1]*z[2]-p[2]*z[1],p[2]*z[0]-p[0]*z[2],p[0]*z[1]-p[1]*z[0],
    ];
    const az=mercury.azimuthDeg*Math.PI/180,alt=mercury.altitudeDeg*Math.PI/180;
    const observer=[-Math.cos(alt)*Math.sin(az),-Math.cos(alt)*Math.cos(az),-Math.sin(alt)];
    const eastLongitude=(Math.atan2(dot(observer,east),dot(observer,z))*180/Math.PI+360)%360;
    const horizonsEastLongitude=(360-[195.312673,195.521008][index]!)%360;
    assert.ok(Math.abs(eastLongitude-horizonsEastLongitude)<.1,
      `Mercury map centre at ${at}: ${eastLongitude}° E must match the independent sub-observer direction`);
  }
});

test("ice-giant axes match independent Horizons sub-observer latitude and longitude",()=>{
  // JPL Horizons observer quantity 14, 500@399, 2026-09-22 13:00 UT.
  // Uranus 799: east-positive 111.972918, planetodetic +76.149715.
  // Neptune 899: west-positive 166.852223, planetodetic -19.473955.
  // https://ssd-api.jpl.nasa.gov/doc/horizons.html
  const at="2026-09-22T13:00:00.000Z";
  const sample=calculateMiniappNightSky({latitude:22.5,longitude:114.5,elevationM:20,
    timezone:"Asia/Shanghai",nightDate:"2026-09-22",target:"jupiter",additionalTimes:[at]})
    .samples.find(row=>row.at===at)!;
  const dot=(a:readonly number[],b:readonly number[])=>a.reduce((sum,x,i)=>sum+x*b[i]!,0);
  for(const [body,expectedLongitude,expectedLatitude,polarRatio,westPositive] of [
    ["URANUS",111.972918,76.149715,24973/25559,false],
    ["NEPTUNE",166.852223,-19.473955,24341/24764,true],
  ] as const){
    const planet=sample.planets.find(row=>row.body===body)!;
    assert.ok(validSkyBodyFrame(planet.bodyFrame));
    const {poleEnu:p,primeMeridianEnu:z}=planet.bodyFrame;
    const east:[number,number,number]=[
      p[1]*z[2]-p[2]*z[1],p[2]*z[0]-p[0]*z[2],p[0]*z[1]-p[1]*z[0],
    ];
    const az=planet.azimuthDeg*Math.PI/180,alt=planet.altitudeDeg*Math.PI/180;
    const observer=[-Math.cos(alt)*Math.sin(az),-Math.cos(alt)*Math.cos(az),-Math.sin(alt)];
    const eastLongitude=(Math.atan2(dot(observer,east),dot(observer,z))*180/Math.PI+360)%360;
    const longitude=westPositive?(360-eastLongitude)%360:eastLongitude;
    const centricLatitude=Math.asin(dot(observer,p));
    const deticLatitude=Math.atan(Math.tan(centricLatitude)/(polarRatio*polarRatio))*180/Math.PI;
    assert.ok(Math.abs(((longitude-expectedLongitude+540)%360)-180)<.2,
      `${body} sub-observer longitude ${longitude}° must match Horizons`);
    assert.ok(Math.abs(deticLatitude-expectedLatitude)<.2,
      `${body} planetodetic latitude ${deticLatitude}° must match Horizons`);
  }
});

test("continuous phase angles map to all eight semantic lunar states", () => {
  assert.deepEqual(
    [0, 45, 90, 135, 180, 225, 270, 315].map(moonPhaseKey),
    [
      "NEW",
      "WAXING_CRESCENT",
      "FIRST_QUARTER",
      "WAXING_GIBBOUS",
      "FULL",
      "WANING_GIBBOUS",
      "LAST_QUARTER",
      "WANING_CRESCENT",
    ],
  );
  assert.equal(moonPhaseKey(337.49), "WANING_CRESCENT");
  assert.equal(moonPhaseKey(337.5), "NEW");
  assert.equal(moonPhaseKey(-45), "WANING_CRESCENT");
  assert.throws(() => moonPhaseKey(Number.NaN), /moon_phase_angle_invalid/u);
});

function angularDistance(left: number, right: number) {
  return Math.abs(((left - right + 540) % 360) - 180);
}

test("solar longitude is calculated on the J2000 ecliptic axis", () => {
  assert.ok(
    angularDistance(
      calculateSolarLongitudeJ2000("2026-03-20T14:46:00.000Z"),
      0,
    ) < 0.5,
  );
  assert.ok(
    angularDistance(
      calculateSolarLongitudeJ2000("2026-06-21T08:25:00.000Z"),
      90,
    ) < 0.5,
  );
  assert.throws(
    () => calculateSolarLongitudeJ2000("not-a-time"),
    /valid_iso_time_required/u,
  );
});

interface GoldenFixture {
  datasetId: string;
  source: { provider: string; apiVersion: string; usage: string };
  toleranceDeg: { azimuth: number; altitude: number };
  pointCases: Array<{
    id: string;
    target: MiniappAstronomyTarget;
    observer: { latitude: number; longitude: number; elevationM: number };
    at: string;
    expected: { azimuthDeg: number; altitudeDeg: number };
  }>;
  rangeCases: Array<{
    id: string;
    observer: { latitude: number; longitude: number; elevationM: number };
    minimumAltitudeDeg: number;
    expected: {
      moonRise?: null;
      moonSet?: null;
      astronomicalDusk?: null;
      astronomicalDawn?: null;
      sampleCount?: number;
    };
  }>;
}

const fixture = JSON.parse(
  await readFile(
    new URL("../testdata/jpl-horizons-observer-airless-v1.json", import.meta.url),
    "utf8",
  ),
) as GoldenFixture;

function circularDifferenceDegrees(left: number, right: number): number {
  const raw = Math.abs(left - right) % 360;
  return Math.min(raw, 360 - raw);
}

test("airless topocentric positions stay within the frozen JPL Horizons tolerance", () => {
  assert.equal(fixture.datasetId, "jpl-horizons-observer-airless-v1");
  assert.equal(fixture.source.provider, "NASA/JPL Horizons API");
  assert.equal(fixture.source.apiVersion, "1.2");
  assert.match(fixture.source.usage, /never called by the Mini Program runtime/u);

  for (const golden of fixture.pointCases) {
    const actual = calculateTargetHorizontalAt({
      ...golden.observer,
      at: golden.at,
      target: golden.target,
    });
    assert.ok(
      circularDifferenceDegrees(
        actual.azimuthDeg,
        golden.expected.azimuthDeg,
      ) <= fixture.toleranceDeg.azimuth,
      `${golden.id}: azimuth ${actual.azimuthDeg} differs from ${golden.expected.azimuthDeg}`,
    );
    assert.ok(
      Math.abs(actual.altitudeDeg - golden.expected.altitudeDeg) <=
        fixture.toleranceDeg.altitude,
      `${golden.id}: altitude ${actual.altitudeDeg} differs from ${golden.expected.altitudeDeg}`,
    );
  }
});

test("the same observation night spans UTC and local midnight without changing ownership", () => {
  const result = calculateMiniappNightSky({
    latitude: 40.7128,
    longitude: -74.006,
    elevationM: 10,
    timezone: "America/New_York",
    nightDate: "2026-11-01",
    target: "moon",
    cadenceMinutes: 30,
  });
  assert.equal(result.nightDate, "2026-11-01");
  assert.ok(result.astronomicalDusk?.startsWith("2026-11-01T"));
  assert.ok(result.astronomicalDawn?.startsWith("2026-11-02T"));
  assert.ok(result.samples.some((sample) => sample.at.startsWith("2026-11-02T")));
});

test("an exact off-grid or daylight instant is calculated without replacing regular samples", () => {
  const regular = calculateMiniappNightSky({
    latitude: 23.1291,
    longitude: 113.2644,
    elevationM: 20,
    timezone: "Asia/Shanghai",
    nightDate: "2026-08-06",
    target: "moon",
    cadenceMinutes: 30,
  });
  const selectedAt = "2026-08-06T13:00:00.000Z";
  const daylightAt = "2026-08-06T05:00:00.000Z";
  const exact = calculateMiniappNightSky({
    latitude: 23.1291,
    longitude: 113.2644,
    elevationM: 20,
    timezone: "Asia/Shanghai",
    nightDate: "2026-08-06",
    target: "moon",
    cadenceMinutes: 30,
    additionalTimes: [selectedAt, selectedAt, daylightAt],
  });
  assert.ok(
    regular.samples.every((sample) =>
      exact.samples.some((candidate) => candidate.at === sample.at),
    ),
    "regular cadence samples remain present",
  );
  assert.equal(
    exact.samples.filter((sample) => sample.at === selectedAt).length,
    1,
  );
  assert.equal(
    exact.samples.filter((sample) => sample.at === daylightAt).length,
    1,
  );
  const selected = exact.samples.find((sample) => sample.at === selectedAt)!;
  assert.ok(selected.moonPhaseAngleDeg >= 0 && selected.moonPhaseAngleDeg < 360);
  assert.equal(selected.moonPhase, moonPhaseKey(selected.moonPhaseAngleDeg));
  const selectedMoon = calculateTargetHorizontalAt({
    latitude: 23.1291,
    longitude: 113.2644,
    elevationM: 20,
    at: selectedAt,
    target: "moon",
  });
  assert.equal(selected.at, selectedMoon.at);
  // The single-instant adapter publishes six decimals; timeline samples retain
  // the unrounded calculation so high-zoom rendering does not parse UI copy.
  assert.ok(Math.abs(selected.targetAzimuthDeg - selectedMoon.azimuthDeg) < 0.000001);
  assert.ok(Math.abs(selected.targetAltitudeDeg - selectedMoon.altitudeDeg) < 0.000001);
  const daylight = exact.samples.find((sample) => sample.at === daylightAt)!;
  assert.ok(
    daylight.sunAltitudeDeg > 0,
    "daylight sample is calculated at its exact instant",
  );
});

test("observer elevation participates in lunar parallax", () => {
  const seaLevel = fixture.pointCases.find(
    (item) => item.id === "altitude-parallax-sea-level-moon",
  )!;
  const summit = fixture.pointCases.find(
    (item) => item.id === "altitude-parallax-summit-moon",
  )!;
  const actualSea = calculateTargetHorizontalAt({
    ...seaLevel.observer,
    at: seaLevel.at,
    target: seaLevel.target,
  });
  const actualSummit = calculateTargetHorizontalAt({
    ...summit.observer,
    at: summit.at,
    target: summit.target,
  });
  const expectedDelta =
    summit.expected.altitudeDeg - seaLevel.expected.altitudeDeg;
  const actualDelta = actualSummit.altitudeDeg - actualSea.altitudeDeg;
  assert.ok(Math.abs(actualDelta - expectedDelta) <= 0.00001);
  assert.notEqual(actualSummit.altitudeDeg, actualSea.altitudeDeg);
});

test("no-rise/set and extreme-latitude cases fail closed without invented samples", () => {
  const noRise = fixture.rangeCases.find(
    (item) => item.id === "no-moon-rise-or-set-within-search-window",
  )!;
  assert.ok(noRise.minimumAltitudeDeg > 3);
  const circumpolarMoon = calculateMiniappNightSky({
    ...noRise.observer,
    timezone: "UTC",
    nightDate: "2026-01-01",
    target: "moon",
    cadenceMinutes: 60,
  });
  assert.equal(circumpolarMoon.moonRise, noRise.expected.moonRise);
  assert.equal(circumpolarMoon.moonSet, noRise.expected.moonSet);

  const polar = fixture.rangeCases.find(
    (item) =>
      item.id === "extreme-latitude-midnight-sun-no-astronomical-night",
  )!;
  assert.ok(polar.minimumAltitudeDeg > 3);
  const midnightSun = calculateMiniappNightSky({
    ...polar.observer,
    timezone: "Europe/Oslo",
    nightDate: "2026-06-21",
    target: "moon",
    cadenceMinutes: 60,
    additionalTimes: ["2026-06-21T12:00:00.000Z"],
  });
  assert.equal(midnightSun.astronomicalDusk, polar.expected.astronomicalDusk);
  assert.equal(midnightSun.astronomicalDawn, polar.expected.astronomicalDawn);
  assert.equal(midnightSun.samples.length, 1, "requested positions do not require an astronomical-night window");
  assert.equal(midnightSun.samples[0]!.at, "2026-06-21T12:00:00.000Z");
  const withoutRequestedPosition = calculateMiniappNightSky({ ...polar.observer, timezone: "Europe/Oslo", nightDate: "2026-06-21", target: "moon", cadenceMinutes: 60 });
  assert.equal(withoutRequestedPosition.samples.length, polar.expected.sampleCount);
});
