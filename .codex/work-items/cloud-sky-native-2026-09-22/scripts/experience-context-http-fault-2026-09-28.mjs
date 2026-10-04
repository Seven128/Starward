// Task-owned loopback transport to unchanged owned BFF 8789. Current opt-in
// publication reads use compiled controllers in the same task process; the
// observing Context keeps its existing owner. Product responses stream unchanged
// except explicitly armed faults/delays. Request IDs,
// routes, context IDs, credentials and request bodies are never logged/saved.
import http from "node:http";
import { performance } from "node:perf_hooks";
import { createPublicationBackend, usesCurrentPublication } from "./experience-w3-proxy-backend-2026-09-29.mts";
const publicationBackend = await createPublicationBackend();
const proxyPort = Number(process.env.STARWARD_SKY_PROXY_PORT ?? 8791);
if (![8791,8792].includes(proxyPort)) { await publicationBackend.close(); throw new Error("invalid_task_proxy_port"); }
let mode = "pass";
const stats = { puts: 0, gets: 0, rejectedBeforeUpstream: 0, lostSuccessfulResponses: 0, forwardedPutStatuses: [], conditionalContextGets: 0 };
const send = (response,status,value) => {response.writeHead(status,{"Content-Type":"application/json","Cache-Control":"no-store"});response.end(JSON.stringify(value));};
// Bounded task-only observation. Neither URLs, identifiers, header values nor
// payloads enter records. These are proxy body bytes, not phone/cloud billing.
const epochStartedAt = new Date().toISOString();
const records = [];
const active = new Map();
let sequence = 0, phase = "transport-check";
let resourceMode = "pass";
let resourceDeadline = 0;
function activeResourceMode() {
  if (resourceDeadline && Date.now() >= resourceDeadline) { resourceMode = "pass"; resourceDeadline = 0; }
  return resourceMode;
}
const heldResources = new Map();
const phases = new Set(["transport-check", "native-source-back", "native-reentry", "native-moon", "native-progression", "native-cancel", "native-cancel-retry", "native-source-fault", "native-source-retry", "native-image-fault", "native-image-retry", "settled"]);
function resourceKind(url = "") {
  const path = url.split("?", 1)[0];
  if (/^\/v2\/observation-contexts\/[^/]+$/.test(path)) return "observation_context";
  if (/^\/v2\/spots\/[^/]+\/sky$/.test(path)) return "sky_report";
  if (/^\/v2\/spots\/[^/]+$/.test(path)) return "spot";
  if (path === "/v2/map/scene") return "map_scene";
  if (/^\/v2\/sky\/catalogs\//.test(path)) return "stellar_catalog";
  if (/^\/v2\/sky\/supplements\/sao\//.test(path)) return path.includes("/tiles/") ? "sao_tile" : "sao_index";
  if (/^\/v2\/sky\/constellations/.test(path)) return path.includes("/assets/") ? "constellation_image" : "constellation_catalog";
  if (/^\/v2\/celestial-objects\/[^/]+\/image$/.test(path)) return "object_image";
  if (/^\/v2\/celestial-objects(?:\/|$)/.test(path)) return "object_information";
  const survey = path.match(/^\/v2\/sky\/(moon|mars|mercury|jupiter|saturn|uranus|neptune|landscape|galactic|wide-field|optical|sdss-optical)(?:\/|$)/)?.[1];
  if (survey) return `${survey}_${path.endsWith("/manifest") ? "manifest" : /\.(?:png|jpg|jpeg)$/.test(path) ? "image" : "data"}`;
  return "other";
}
function observe(request, response) {
  const started = performance.now();
  const record = { sequence: ++sequence, phase, resourceKind: resourceKind(request.url),
    method: ["GET", "PUT", "POST", "HEAD"].includes(request.method) ? request.method : "OTHER",
    agentProbe: request.headers["x-starward-measurement-probe"] === "1",
    conditional: typeof request.headers["if-none-match"] === "string",
    upstreamBodyBytes: 0, upstreamChunks: 0, upstreamEnded: false, downstreamFinished: false };
  active.set(record.sequence, record);
  const duration = () => Math.round((performance.now() - started) * 100) / 100;
  let archived = false;
  const archive = () => {
    if (archived) return;
    archived = true; record.observedDurationMs = duration();
    active.delete(record.sequence); records.push(record);
    if (records.length > 256) records.shift();
  };
  response.once("finish", () => { record.downstreamFinished = true; record.downstreamFinishedMs = duration(); archive(); });
  response.once("close", () => { if (!record.downstreamFinished) { record.downstreamClosedBeforeFinish = true; archive(); } });
  return {
    record,
    headers(received) {
      record.status = received.statusCode ?? 0; record.upstreamHeadersMs = duration();
      const length = Number(received.headers["content-length"]);
      if (Number.isSafeInteger(length) && length >= 0) record.declaredContentLength = length;
      const encoding = received.headers["content-encoding"];
      record.contentEncoding = ["gzip", "br", "deflate"].includes(encoding) ? encoding : "identity_or_other";
      const cache = received.headers["cache-control"];
      if (typeof cache === "string") {
        record.immutable = /(?:^|,)\s*immutable(?:,|$)/.test(cache);
        const maxAge = cache.match(/(?:^|,)\s*max-age=(\d+)/)?.[1];
        if (maxAge !== undefined) record.maxAgeSeconds = Number(maxAge);
      }
      const field = Number(received.headers["x-starward-image-field-degrees"]);
      if (Number.isFinite(field) && field > 0 && field <= 8) record.imageFieldDegrees = field;
      received.on("data", chunk => { record.upstreamBodyBytes += chunk.length; record.upstreamChunks++; });
      received.once("end", () => { record.upstreamEnded = true; record.upstreamEndedMs = duration(); });
      received.once("aborted", () => { record.upstreamAborted = true; });
      received.once("error", () => { record.upstreamError = true; response.destroy(); });
    },
    error() { record.upstreamError = true; },
  };
}
const server = http.createServer((request,response)=>{
  if(request.url === "/__sky_test/context-status" && request.method === "GET")return send(response,200,{mode,...stats});
  if(request.url === "/__sky_test/publication-status" && request.method === "GET")return send(response,200,{publicationHash:publicationBackend.publicationHash,sdssPublications:publicationBackend.sdssPublications,informationModuleSha256:publicationBackend.informationModuleSha256,contextUpstream:8789,publicationBackendPort:publicationBackend.port,scope:"task-only compiled publication reads; existing Context owner retained"});
  if(request.url === "/__sky_test/traffic-status" && request.method === "GET")return send(response,200,{epochStartedAt,phase,resourceMode:activeResourceMode(),heldResourceCount:heldResources.size,recordsLimit:256,totalObserved:sequence,records,active:[...active.values()]});
  if(request.url === "/__sky_test/source-status" && request.method === "GET")return send(response,200,publicationBackend.sourceStatus());
  if(request.url === "/__sky_test/source-mode" && request.method === "POST") {
    let body=""; request.on("data",chunk=>{body+=chunk;if(body.length>128)request.destroy();});
    request.on("end",()=>{let value;try{value=JSON.parse(body);}catch{return send(response,400,{error:"invalid_control"});}
      try { return send(response,200,publicationBackend.setSourceMode(value.mode)); }
      catch { return send(response,400,{error:"invalid_source_mode"}); }});return;
  }
  if(request.url === "/__sky_test/resource-mode" && request.method === "POST") {
    let body=""; request.on("data",chunk=>{body+=chunk;if(body.length>128)request.destroy();});
    request.on("end",()=>{let value;try{value=JSON.parse(body);}catch{return send(response,400,{error:"invalid_control"});}
      if(!["pass","hold-one-detail","reject-details","hold-one-sdss-detail","reject-sdss-details"].includes(value.mode))return send(response,400,{error:"invalid_resource_mode"});
      resourceMode=value.mode;
      resourceDeadline=["reject-details","reject-sdss-details"].includes(resourceMode) ? Date.now()+120_000 : 0;
      if(resourceMode === "pass")for(const release of [...heldResources.values()])release("control-release");
      send(response,200,{resourceMode,heldResourceCount:heldResources.size});});return;
  }
  if(request.url === "/__sky_test/traffic-phase" && request.method === "POST") {
    let body=""; request.on("data",chunk=>{body+=chunk;if(body.length>128)request.destroy();});
    request.on("end",()=>{let value;try{value=JSON.parse(body);}catch{return send(response,400,{error:"invalid_control"});}
      if(!phases.has(value.phase))return send(response,400,{error:"invalid_phase"});
      phase=value.phase;send(response,200,{phase});});return;
  }
  if(request.url === "/__sky_test/context-mode" && request.method === "POST") {
    let body=""; request.on("data",chunk=>{body+=chunk;if(body.length>512)request.destroy();});
    request.on("end",()=>{let value;try{value=JSON.parse(body);}catch{return send(response,400,{error:"invalid_control"});}
      if(!["pass","reject-one","lose-one"].includes(value.mode))return send(response,400,{error:"invalid_mode"});
      mode=value.mode;send(response,200,{mode,...stats});});return;
  }
  const observation = observe(request,response);
  const resourceUrl = new URL(request.url ?? "/", "http://127.0.0.1:8791");
  const level = resourceUrl.searchParams.get("level");
  // SDSS uses immutable filenames, not the object-image level query. Arm it
  // separately so a W3/provider-information failure cannot stand in for SDSS.
  const sdssDetail = observation.record.resourceKind === "sdss-optical_image"
    && /\/[0-9a-f]{64}\/M-\d+-detail\.jpg$/.test(resourceUrl.pathname);
  if(activeResourceMode() === "reject-details" && observation.record.resourceKind === "object_image" && level === "DETAIL"
    && ["GET","HEAD"].includes(request.method)) {
    observation.record.status=503;observation.record.controlledFault="image-detail-reject-before-upstream";
    request.resume();return send(response,503,{code:"PROVIDER_UNAVAILABLE",message:"controlled task-local image transport unavailable",retryable:true,recovery:["RETRY"],requestId:"task-controlled-image-response"});
  }
  if(activeResourceMode() === "reject-sdss-details" && sdssDetail && ["GET","HEAD"].includes(request.method)) {
    observation.record.status=503;observation.record.controlledFault="sdss-detail-reject-before-upstream";
    request.resume();return send(response,503,{code:"PROVIDER_UNAVAILABLE",message:"controlled task-local optical image transport unavailable",retryable:true,recovery:["RETRY"],requestId:"task-controlled-optical-image-response"});
  }
  const holdResource = ["GET","HEAD"].includes(request.method) && (
    resourceMode === "hold-one-detail" && observation.record.resourceKind === "object_image" && level === "DETAIL"
    || resourceMode === "hold-one-sdss-detail" && sdssDetail);
  if(holdResource)resourceMode="pass";
  const isContext = /^\/v2\/observation-contexts\/[^/?]+$/.test(request.url ?? "");
  const isPut = isContext && request.method === "PUT";
  if(isContext && request.method === "GET") {stats.gets++;if(request.headers["if-none-match"])stats.conditionalContextGets++;}
  if(isPut) {
    stats.puts++;
    if(mode === "reject-one") {mode="pass";stats.rejectedBeforeUpstream++;observation.record.status=503;observation.record.controlledFault="reject-before-upstream";request.resume();return send(response,503,{code:"PROVIDER_UNAVAILABLE",message:"controlled local context transport unavailable",retryable:true,recovery:["RETRY"],requestId:"local-controlled-response"});}
  }
  const faultMode = isPut ? mode : "pass";
  const upstreamPort = usesCurrentPublication(request.method ?? "GET",request.url ?? "/") ? publicationBackend.port : 8789;
  const upstream = http.request({hostname:"127.0.0.1",port:upstreamPort,path:request.url,method:request.method,headers:{...request.headers,host:`127.0.0.1:${upstreamPort}`}},received=>{
    observation.headers(received);
    if(isPut)stats.forwardedPutStatuses.push(received.statusCode ?? 0);
    if(isPut && faultMode === "lose-one" && (received.statusCode ?? 0)>=200 && (received.statusCode ?? 0)<300) {
      mode="pass";stats.lostSuccessfulResponses++;observation.record.controlledFault="lose-successful-response";received.resume();received.once("end",()=>response.destroy());return;
    }
    response.writeHead(received.statusCode ?? 502,received.headers);
    if(holdResource && received.statusCode === 200) {
      // A bounded, explicit local weak-network case. Pause the stream rather
      // than copying its body, and preserve the published headers and payload.
      observation.record.controlledResourceDelayMs=30000;
      received.pause();upstream.setTimeout(0);response.flushHeaders();
      let retired=false;
      const release = reason => {
        if(retired)return;retired=true;clearTimeout(timer);heldResources.delete(observation.record.sequence);
        observation.record.controlledResourceOutcome=reason;upstream.setTimeout(15000);received.pipe(response);
      };
      const timer=setTimeout(()=>release("deadline-release"),30000);
      heldResources.set(observation.record.sequence,release);
      response.once("close",()=>{if(!retired){retired=true;clearTimeout(timer);heldResources.delete(observation.record.sequence);observation.record.controlledResourceOutcome="downstream-cancel";}});
    } else received.pipe(response);
  });
  upstream.setTimeout(15000,()=>upstream.destroy());upstream.on("error",()=>{observation.error();response.destroy();});
  // A finished GET request body does not emit request.aborted when its response
  // is canceled. Retire that upstream too; otherwise a measurement proxy itself
  // can continue consuming a canceled native resource.
  response.once("close",()=>{if(!response.writableFinished)upstream.destroy();});
  request.on("aborted",()=>upstream.destroy());request.pipe(upstream);
});
try {
  await new Promise((resolve,reject)=>{server.once("error",reject);server.listen(proxyPort,"127.0.0.1",resolve);});
} catch(error) {await publicationBackend.close();throw error;}
console.log(JSON.stringify({scope:"owned_context_development_transport",port:proxyPort,mode,epochStartedAt,measurement:"bounded_sanitized_body_bytes",publicationHash:publicationBackend.publicationHash,contextOwnerUnchanged:true}));
for(const signal of ["SIGINT","SIGTERM"])process.once(signal,()=>{
  for(const release of [...heldResources.values()])release("shutdown-release");
  server.close(async()=>{await publicationBackend.close();process.exit();});
});
