const token = document.querySelector("#token");
const actor = document.querySelector("#actor");
const status = document.querySelector("#status");
token.value = sessionStorage.getItem("miniapp-admin-token") || "";

async function request(path, options = {}) {
  sessionStorage.setItem("miniapp-admin-token", token.value);
  const response = await fetch(path, {
    ...options,
    headers: {
      "content-type": "application/json",
      "x-admin-token": token.value,
      "x-admin-actor": actor.value,
      ...(options.headers || {}),
    },
  });
  const body = await response.json();
  if (!response.ok) throw new Error(`${body.code}:${body.requestId}`);
  return body.data;
}

function show(id, value) {
  document.querySelector(`#${id}`).textContent = JSON.stringify(value, null, 2);
}

function spotRows(spots) {
  const root = document.querySelector("#spots");
  root.replaceChildren();
  for (const spot of spots) {
    const row = document.createElement("div");
    row.className = "row";
    const summary = document.createElement("span");
    summary.textContent = `${spot.name} · ${spot.status} · ${spot.latitude.toFixed(5)}, ${spot.longitude.toFixed(5)} · v${spot.version}`;
    const publish = document.createElement("button");
    publish.textContent = "发布";
    publish.onclick = () => mutateSpot(spot.spot_id, "publish");
    const suspend = document.createElement("button");
    suspend.textContent = "暂停推荐";
    suspend.onclick = () => mutateSpot(spot.spot_id, "suspend");
    const inspect = document.createElement("button");
    inspect.textContent = "查看场地/媒体 JSON";
    inspect.onclick = () => {
      summary.textContent = JSON.stringify(spot.payload, null, 2);
      summary.style.whiteSpace = "pre-wrap";
    };
    row.append(summary, publish, suspend, inspect);
    root.append(row);
  }
}

async function mutateSpot(spotId, action) {
  const reason = prompt("填写操作原因（进入审计）");
  if (!reason) return;
  await request(`/v1/admin/spots/${encodeURIComponent(spotId)}/${action}`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
  await load();
}

function moderationRows(cases) {
  const root = document.querySelector("#moderation");
  root.replaceChildren();
  if (!cases.length) root.textContent = "当前无待处理审核。";
  for (const item of cases) {
    const row = document.createElement("div");
    row.className = "row";
    const summary = document.createElement("span");
    summary.textContent = `${item.case_id} · ${item.state}`;
    for (const resolution of ["APPROVED", "REJECTED"]) {
      const button = document.createElement("button");
      button.textContent = resolution === "APPROVED" ? "通过" : "拒绝";
      button.onclick = async () => {
        const reason = prompt("填写审核理由");
        if (!reason) return;
        await request(
          `/v1/admin/moderation/cases/${encodeURIComponent(item.case_id)}/resolve`,
          { method: "POST", body: JSON.stringify({ resolution, reason }) },
        );
        await load();
      };
      row.append(button);
    }
    row.prepend(summary);
    root.append(row);
  }
}

async function load() {
  status.textContent = "加载中…";
  try {
    const data = await request("/v1/admin/dashboard");
    spotRows(data.spots);
    moderationRows(data.moderation);
    show("articles", data.articles);
    show("sources", data.dataSources);
    show("health", data.providerHealth);
    show("decisions", data.decisions);
    show("costs", data.costs);
    show("jobs", data.jobs);
    show("audits", data.audits);
    status.textContent = `已刷新 ${new Date().toLocaleTimeString()}`;
  } catch (error) {
    status.textContent = `加载失败：${error.message}`;
  }
}

document.querySelector("#load").addEventListener("click", load);
