(() => {
  const qs = (selector, root = document) => root.querySelector(selector);
  const qsa = (selector, root = document) => [...root.querySelectorAll(selector)];

  const params = new URLSearchParams(window.location.search);
  const focusId = params.get("focus");
  const focusWidth = params.get("width");

  if (params.has("capture")) {
    document.body.classList.add("capture-mode");
  }

  if (params.has("largeText")) {
    document.body.classList.add("large-text");
  }

  if (focusId) {
    const target = document.getElementById(focusId);
    if (target) {
      document.body.classList.add("focus-mode");
      const cell = target.closest(".frame-cell");
      if (cell) cell.classList.add("focus-target");
      if (focusWidth && /^\d{3}$/.test(focusWidth)) {
        target.style.setProperty("--focus-width", `${focusWidth}px`);
      }
    }
  }

  qsa("[data-toggle-pressed]").forEach((button) => {
    button.addEventListener("click", () => {
      const next = button.getAttribute("aria-pressed") !== "true";
      button.setAttribute("aria-pressed", String(next));
    });
  });

  qsa("[role='switch']").forEach((button) => {
    button.addEventListener("click", () => {
      const next = button.getAttribute("aria-checked") !== "true";
      button.setAttribute("aria-checked", String(next));
      const label = button.dataset.onLabel || "已开启";
      const offLabel = button.dataset.offLabel || "已关闭";
      button.setAttribute("aria-label", next ? label : offLabel);
    });
  });

  qsa("[data-check-toggle]").forEach((button) => {
    button.addEventListener("click", () => {
      const next = !button.classList.contains("done");
      button.classList.toggle("done", next);
      button.setAttribute("aria-pressed", String(next));
    });
  });

  qsa("[data-kind-group]").forEach((group) => {
    const buttons = qsa("[data-kind]", group);
    buttons.forEach((button) => {
      button.addEventListener("click", () => {
        buttons.forEach((item) => item.setAttribute("aria-pressed", String(item === button)));
        const kind = button.dataset.kind;
        qsa("[data-kind-copy]", group.closest(".phone-frame") || document).forEach((node) => {
          node.hidden = node.dataset.kindCopy !== kind;
        });
      });
    });
  });

  qsa("[data-mode-strip]").forEach((strip) => {
    const buttons = qsa("button[data-mode]", strip);
    buttons.forEach((button) => {
      button.addEventListener("click", () => {
        buttons.forEach((item) => {
          item.classList.toggle("active", item === button);
          item.setAttribute("aria-pressed", String(item === button));
        });
        const output = qs("[data-mode-output]", strip.parentElement);
        if (output) output.textContent = button.dataset.modeLabel;
      });
    });
  });

  qsa("[data-sheet-demo]").forEach((demo) => {
    const handle = qs("[data-sheet-handle]", demo);
    const states = ["closed", "peek", "expanded"];
    const labels = { closed: "已收起", peek: "半展开", expanded: "已展开" };
    const setState = (state) => {
      demo.dataset.extent = state;
      handle?.setAttribute("aria-expanded", String(state !== "closed"));
      handle?.setAttribute("aria-label", `Finder 筛选面板：${labels[state]}，点击切换`);
      const output = qs("[data-sheet-state]", demo);
      if (output) output.textContent = labels[state];
    };
    handle?.addEventListener("click", () => {
      const index = states.indexOf(demo.dataset.extent || "closed");
      setState(states[(index + 1) % states.length]);
    });
  });

  const showTransientFeedback = (frame, message, tone = "success") => {
    const output = qs("[data-live-feedback]", frame || document);
    if (!output) return;
    output.hidden = false;
    output.dataset.tone = tone;
    const text = qs("[data-live-feedback-text]", output);
    if (text) text.textContent = message;
    window.clearTimeout(output._hideTimer);
    output._hideTimer = window.setTimeout(() => {
      output.hidden = true;
    }, 2600);
  };

  qsa("[data-save-draft]").forEach((button) => {
    button.addEventListener("click", () => {
      const frame = button.closest(".phone-frame");
      showTransientFeedback(frame, "草稿已安全保存，可从这台设备继续");
    });
  });

  qsa("[data-upload-retry]").forEach((button) => {
    button.addEventListener("click", () => {
      const item = button.closest(".upload-item");
      const bar = qs(".progress-track > span", item);
      const meta = qs("[data-upload-meta]", item);
      const pill = qs(".status-pill", item);
      button.disabled = true;
      if (pill) {
        pill.className = "status-pill violet";
        pill.textContent = "续传中";
      }
      if (bar) bar.style.width = "76%";
      if (meta) meta.textContent = "从 62% 继续 · 已移除定位元数据";
      window.setTimeout(() => {
        if (bar) bar.style.width = "100%";
        if (pill) {
          pill.className = "status-pill success";
          pill.textContent = "已就绪";
        }
        if (meta) meta.textContent = "2.4 MB · JPEG · 元数据已净化";
        button.hidden = true;
        showTransientFeedback(button.closest(".phone-frame"), "上传已恢复，不会重复创建媒体记录");
      }, 650);
    });
  });

  qsa("[data-status-demo]").forEach((button) => {
    button.addEventListener("click", () => {
      const card = button.closest(".state-card");
      const submission = qs("[data-axis='submission'] strong", card);
      const merge = qs("[data-axis='merge'] strong", card);
      const publication = qs("[data-axis='publication'] strong", card);
      if (submission) submission.textContent = "已接收 · 等待证据合并";
      if (merge) merge.textContent = "准备合并";
      if (publication) publication.textContent = "尚未影响公开地点";
      button.textContent = "状态已更新";
      button.disabled = true;
      showTransientFeedback(button.closest(".phone-frame"), "审核通过不等于发布；状态轴已分别更新");
    });
  });

  const activateOpsView = (target) => {
    qsa("[data-ops-target]").forEach((button) => {
      const active = button.dataset.opsTarget === target;
      button.setAttribute("aria-selected", String(active));
      button.tabIndex = active ? 0 : -1;
    });
    qsa("[data-ops-view]").forEach((view) => {
      view.hidden = view.dataset.opsView !== target;
    });
    const activeView = qs(`[data-ops-view='${target}']`);
    qs(".ops-main")?.scrollTo({ top: 0, behavior: "smooth" });
    qs("h2", activeView)?.focus({ preventScroll: true });
    window.history.replaceState(null, "", `#${target}`);
  };

  qsa("[data-ops-target]").forEach((button) => {
    button.addEventListener("click", () => activateOpsView(button.dataset.opsTarget));
  });

  qsa("[data-open-ops-view]").forEach((button) => {
    button.addEventListener("click", () => activateOpsView(button.dataset.openOpsView));
  });

  const initialOps = window.location.hash.slice(1);
  if (initialOps && qs(`[data-ops-view='${initialOps}']`)) activateOpsView(initialOps);

  qsa("[data-media-decision]").forEach((button) => {
    button.addEventListener("click", () => {
      const card = button.closest(".media-card");
      const decision = button.dataset.mediaDecision;
      qsa("[data-media-decision]", card).forEach((item) => {
        item.classList.toggle("leaf", item === button && decision === "accept");
        item.classList.toggle("danger", item === button && decision === "reject");
        item.classList.toggle("secondary", item !== button);
        item.setAttribute("aria-pressed", String(item === button));
      });
      card.dataset.mediaState = decision;
      const output = qs("[data-media-state]", card);
      if (output) output.textContent = decision === "accept" ? "可用于证据" : "不采用";
      const mediaReady = qsa(".media-card[data-media-state]").length === qsa(".media-card").length;
      const gate = qs("[data-media-gate]");
      if (gate) {
        gate.textContent = mediaReady ? "媒体已逐项处理" : "仍有媒体待处理";
        gate.className = mediaReady ? "status-pill success" : "status-pill warning";
      }
    });
  });

  qsa("[data-merge-choice]").forEach((button) => {
    button.addEventListener("click", () => {
      const owner = button.closest("[data-merge-field]");
      qsa("[data-merge-choice]", owner).forEach((item) => {
        item.classList.toggle("selected", item === button);
        item.setAttribute("aria-pressed", String(item === button));
      });
      owner.dataset.resolved = "true";
      const fieldState = qs(".ops-card-head .status-pill", owner);
      if (fieldState) {
        fieldState.textContent = "已选择";
        fieldState.className = "status-pill success";
      }
      const allFields = qsa("[data-merge-field]");
      const complete = allFields.every((field) => field.dataset.resolved === "true");
      const commit = qs("[data-merge-commit]");
      if (commit) {
        commit.disabled = !complete;
        commit.setAttribute("aria-disabled", String(!complete));
      }
    });
  });

  qs("[data-merge-commit]")?.addEventListener("click", (event) => {
    const button = event.currentTarget;
    button.textContent = "已合并 · 生成新 revision";
    button.disabled = true;
    const feedback = qs("[data-merge-feedback]");
    if (feedback) feedback.hidden = false;
  });

  qsa("[data-publication-action]").forEach((button) => {
    button.addEventListener("click", () => {
      const action = button.dataset.publicationAction;
      const state = qs("[data-publication-state]");
      const notice = qs("[data-publication-feedback]");
      const labels = {
        publish: ["已上架", "正式地点读模型将通过受审 revision 更新"],
        suspend: ["已暂停", "地图与搜索停止新增曝光，保留审计与恢复入口"],
        unpublish: ["已下架", "公开读取已切断，历史 revision 仍可追溯"]
      };
      if (state && labels[action]) state.textContent = labels[action][0];
      if (notice && labels[action]) {
        notice.hidden = false;
        qs("[data-publication-feedback-text]", notice).textContent = labels[action][1];
      }
    });
  });

  qsa("[data-replacement-action]").forEach((button) => {
    button.addEventListener("click", () => {
      const action = button.dataset.replacementAction;
      const output = qs("[data-replacement-state]");
      if (output) {
        output.textContent = action === "preview" ? "影响预览已生成：2 个计划需迁移，18 个想去关系保留" : "替换已排队，等待双人复核";
      }
    });
  });
})();
