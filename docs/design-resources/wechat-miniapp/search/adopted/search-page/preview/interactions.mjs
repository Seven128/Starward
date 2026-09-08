import {mountSpotCards} from '/shared/spot-card/card.mjs';
/* Browser-only candidate interaction adapter. No production store, API or map commands. */
(() => {
  "use strict";

  const FILTERS = ["今晚推荐", "最佳窗口时长", "距离/驾车时间", "光害", "少云", "停车", "厕所", "可驾车直达", "摄影前景", "可露营/驻车", "特定天象", "低云阈值", "月亮影响", "徒步难度", "信号", "充电", "天空开阔方向", "最近核验时间"];
  const CATEGORIES = [
    { id: "observing", label: "观测条件", options: ["今晚推荐", "最佳窗口时长", "光害", "少云", "特定天象", "低云阈值", "月亮影响", "天空开阔方向"] },
    { id: "arrival", label: "到达方式", options: ["距离/驾车时间", "可驾车直达", "徒步难度"] },
    { id: "facilities", label: "设施配套", options: ["停车", "厕所", "信号", "充电"] },
    { id: "place", label: "场地偏好", options: ["摄影前景", "可露营/驻车"] },
    { id: "freshness", label: "资料更新", options: ["最近核验时间"] },
  ];
  let nextId = 0;
  const uniqueId = (prefix) => `${prefix}-${++nextId}`;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const button = (label, className) => {
    const node = document.createElement("button");
    node.type = "button";
    node.className = className;
    node.textContent = label;
    return node;
  };
  const focus = (node) => node?.focus({ preventScroll: true });

  function setup(root) {
    if (root.dataset.interactionsReady === "true") return;
    const one = (selector, context = root) => context.querySelector(selector);
    const all = (selector, context = root) => [...context.querySelectorAll(selector)];
    const input = one("[data-search-input]");
    const frame = one("[data-search-frame]");
    const leading = one("[data-search-leading]");
    const searchSurface = one("[data-search-surface]");
    if (!input || !frame || !leading || !searchSurface) return;
    root.dataset.interactionsReady = "true";

    const mapSurface = one("[data-map-surface]");
    const scrollOwner = one("[data-results-scroll]") || searchSurface;
    const strip = one("[data-filter-scroll]");
    const dialog = one("[data-filter-dialog]");
    const suggestions = one("[data-search-suggestions]");
    const status = one("[data-search-status]");
    mountSpotCards(root);
    const cards = all("[data-result-card]");
    const groups = [];
    const state = {
      route: root.dataset.route === "map" ? "map" : "search",
      query: input.value,
      selected: new Set(all("[data-filter-scroll] [data-filter-option]")
        .filter((item) => item.dataset.selected === "true" || item.getAttribute("aria-checked") === "true" || item.getAttribute("aria-pressed") === "true")
        .map((item) => item.dataset.filterOption).filter((label) => FILTERS.includes(label))),
      draft: null,
      category: CATEGORIES[0].id,
      scrollTop: scrollOwner.scrollTop,
    };
    let routeAnimation = null;
    let filterOpener = null;
    let suppressSuggestions = false;
    let isComposing = false;
    let announceTimer;
    const announce = (message) => {
      if (!status) return;
      clearTimeout(announceTimer);
      announceTimer = setTimeout(() => { status.textContent = message; }, 120);
    };
    if (status) {
      status.setAttribute("role", "status");
      status.setAttribute("aria-live", "polite");
      status.setAttribute("aria-atomic", "true");
    }
    input.removeAttribute("disabled");
    input.setAttribute("autocomplete", "off");
    input.setAttribute("enterkeyhint", "search");
    if (!input.hasAttribute("aria-label")) input.setAttribute("aria-label", "搜索地点、区域或观星点");
    if (suggestions) {
      suggestions.id ||= uniqueId("search-suggestions");
      suggestions.setAttribute("role", "listbox");
      suggestions.setAttribute("aria-label", "地点输入建议");
      input.setAttribute("role", "combobox");
      input.setAttribute("aria-autocomplete", "list");
      input.setAttribute("aria-haspopup", "listbox");
      input.setAttribute("aria-controls", suggestions.id);
    }

    // One retained body per partition. Reverse from the measured presentation,
    // and make it inert only after its last closing animation has completed.
    all("[data-result-group]").forEach((section) => {
      const toggle = one("[data-group-toggle]", section);
      const body = one("[data-group-body]", section);
      if (!toggle || !body) return;
      body.id ||= uniqueId("search-group");
      toggle.setAttribute("aria-controls", body.id);
      let expanded = toggle.getAttribute("aria-expanded") !== "false";
      let animation = null;
      body.hidden = false;
      body.style.overflow = "hidden";
      body.style.display = "flow-root";
      function finish() {
        body.style.height = expanded ? "auto" : "0px";
        body.style.opacity = expanded ? "1" : "0";
        body.style.visibility = expanded ? "visible" : "hidden";
        if (!expanded && body.contains(document.activeElement)) focus(toggle);
        body.inert = !expanded;
        body.setAttribute("aria-hidden", String(!expanded));
      }
      function setExpanded(next, animate = true) {
        const height = body.getBoundingClientRect().height;
        const opacity = getComputedStyle(body).opacity;
        animation?.cancel();
        animation = null;
        expanded = next;
        toggle.setAttribute("aria-expanded", String(next));
        section.dataset.expanded = String(next);
        body.style.height = `${height}px`;
        body.style.opacity = opacity;
        body.style.visibility = "visible";
        body.inert = false;
        body.removeAttribute("aria-hidden");
        const targetHeight = next ? body.scrollHeight : 0;
        if (!animate || reducedMotion.matches || typeof body.animate !== "function") {
          finish();
          return;
        }
        const current = body.animate([
          { height: `${height}px`, opacity },
          { height: `${targetHeight}px`, opacity: next ? 1 : 0 },
        ], { duration: 160, easing: "cubic-bezier(.2,.8,.2,1)", fill: "both" });
        animation = current;
        current.finished.then(() => {
          if (animation !== current) return;
          finish();
          current.cancel();
          animation = null;
        }).catch(() => {});
      }
      toggle.addEventListener("click", () => setExpanded(!expanded));
      setExpanded(expanded, false);
      groups.push({ section, body, toggle, refresh: () => {
        if (animation) setExpanded(expanded);
        else if (expanded) body.style.height = "auto";
      } });
    });

    if (strip && !one("[data-filter-option]", strip)) {
      FILTERS.forEach((label) => {
        const item = button(label, "filter-chip");
        item.dataset.filterOption = label;
        strip.append(item);
      });
    }
    if (dialog) {
      dialog.id ||= uniqueId("filter-dialog");
      if (!dialog.hasAttribute("aria-label") && !dialog.hasAttribute("aria-labelledby")) dialog.setAttribute("aria-label", "全部筛选");
      const categoryList = one("[data-filter-categories]", dialog);
      const optionList = one("[data-filter-options]", dialog);
      if (categoryList) {
        categoryList.setAttribute("role", "tablist");
        categoryList.setAttribute("aria-label", "筛选分类");
        categoryList.setAttribute("aria-orientation", "vertical");
        if (!one("[data-filter-category]", categoryList)) {
          CATEGORIES.forEach((category) => {
            const item = button(category.label, "filter-category");
            item.dataset.filterCategory = category.id;
            categoryList.append(item);
          });
        }
      }
      if (optionList && !one("[data-filter-panel]", optionList)) {
        CATEGORIES.forEach((category) => {
          const panel = document.createElement("section");
          panel.className = "filter-panel";
          panel.dataset.filterPanel = category.id;
          const title = document.createElement("h3");
          title.className = "filter-panel-title";
          title.textContent = category.label;
          const choices = document.createElement("div");
          choices.className = "filter-option-grid";
          category.options.forEach((label) => {
            const item = button(label, "filter-option");
            item.dataset.filterOption = label;
            choices.append(item);
          });
          panel.append(title, choices);
          optionList.append(panel);
        });
      }
      all("[data-filter-category]", dialog).forEach((item) => {
        item.id ||= uniqueId("filter-category");
        item.setAttribute("role", "tab");
        const panel = all("[data-filter-panel]", dialog).find((node) => node.dataset.filterPanel === item.dataset.filterCategory);
        if (panel) {
          panel.id ||= uniqueId("filter-panel");
          panel.setAttribute("role", "tabpanel");
          panel.setAttribute("aria-labelledby", item.id);
          item.setAttribute("aria-controls", panel.id);
        }
      });
      all("[data-filter-open]").forEach((item) => {
        item.setAttribute("aria-haspopup", "dialog");
        item.setAttribute("aria-controls", dialog.id);
      });
    }

    function renderFilters() {
      all("[data-filter-option]").forEach((item) => {
        const source = dialog?.contains(item) && state.draft ? state.draft : state.selected;
        const selected = source.has(item.dataset.filterOption);
        item.setAttribute("role", "checkbox");
        item.removeAttribute("aria-pressed");
        item.setAttribute("aria-checked", String(selected));
        item.dataset.selected = String(selected);
        item.classList.toggle("is-selected", selected);
      });
      const categorySelection = state.draft ?? state.selected;
      all("[data-filter-category]").forEach((item) => {
        const category = CATEGORIES.find((entry) => entry.id === item.dataset.filterCategory);
        const count = category?.options.filter((label) => categorySelection.has(label)).length ?? 0;
        item.dataset.hasSelection = String(count > 0);
        item.dataset.selectedCount = String(count);
      });
      all("[data-filter-count]").forEach((item) => {
        const source = dialog?.contains(item) && state.draft ? state.draft : state.selected;
        item.textContent = source.size ? String(source.size) : "";
        item.hidden = source.size === 0;
      });
      all("[data-filter-open]").forEach((item) => {
        item.setAttribute("aria-label", state.selected.size ? `全部筛选，已选${state.selected.size}项` : "全部筛选");
        item.setAttribute("aria-expanded", String(Boolean(dialog?.open)));
      });
      root.dataset.filterCount = String(state.selected.size);
    }
    function setCategory(id, focusTab = false) {
      if (!CATEGORIES.some((category) => category.id === id)) return;
      state.category = id;
      if (!dialog) return;
      dialog.dataset.activeCategory = id;
      all("[data-filter-category]", dialog).forEach((item) => {
        const active = item.dataset.filterCategory === id;
        item.classList.toggle("is-active", active);
        item.setAttribute("aria-selected", String(active));
        item.tabIndex = active ? 0 : -1;
        if (active && focusTab) focus(item);
      });
      all("[data-filter-panel]", dialog).forEach((panel) => {
        panel.hidden = panel.dataset.filterPanel !== id;
        panel.inert = panel.hidden;
      });
    }
    function closeSuggestions() {
      root.dataset.suggestionsOpen = "false";
      input.setAttribute("aria-expanded", "false");
      if (suggestions) suggestions.hidden = true;
    }
    function openFilters(opener) {
      if (!dialog || dialog.open) return;
      filterOpener = opener;
      state.draft = new Set(state.selected);
      closeSuggestions();
      input.blur();
      setCategory(state.category);
      dialog.showModal();
      renderFilters();
      focus(one('[data-filter-category][aria-selected="true"]', dialog));
    }
    function closeFilters(commit = false) {
      if (!dialog?.open) return;
      if (commit && state.draft) state.selected = new Set(state.draft);
      state.draft = null;
      dialog.close();
      renderFilters();
      if (commit) announce(`已选择${state.selected.size}项筛选`);
      const opener = filterOpener;
      requestAnimationFrame(() => { if (!dialog.open && state.route === "search") focus(opener); });
    }
    root.addEventListener("click", (event) => {
      const target = event.target.closest("button, [data-filter-option]");
      if (!target) return;
      if (target.matches("[data-filter-open]")) openFilters(target);
      else if (target.matches("[data-filter-close]")) closeFilters();
      else if (target.matches("[data-filter-apply]")) closeFilters(true);
      else if (target.matches("[data-filter-clear]") && state.draft) {
        state.draft.clear();
        renderFilters();
      } else if (target.matches("[data-filter-category]")) setCategory(target.dataset.filterCategory);
      else if (target.matches("[data-filter-option]") && FILTERS.includes(target.dataset.filterOption)) {
        const values = dialog?.contains(target) && state.draft ? state.draft : state.selected;
        const label = target.dataset.filterOption;
        if (values.has(label)) values.delete(label);
        else values.add(label);
        renderFilters();
        if (values === state.selected) announce(`已选择${values.size}项筛选`);
      }
    });
    if (dialog) {
      dialog.addEventListener("cancel", (event) => { event.preventDefault(); closeFilters(); });
      dialog.addEventListener("close", () => {
        if (!dialog.open) { state.draft = null; renderFilters(); }
      });
      let beganOnBackdrop = false;
      const outsideDialog = (event) => {
        const rect = dialog.getBoundingClientRect();
        return event.target === dialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom);
      };
      dialog.addEventListener("pointerdown", (event) => { beganOnBackdrop = outsideDialog(event); });
      dialog.addEventListener("click", (event) => {
        if (beganOnBackdrop && outsideDialog(event)) closeFilters();
        beganOnBackdrop = false;
      });
      dialog.addEventListener("keydown", (event) => {
        const tab = event.target.closest("[data-filter-category]");
        if (!tab || !["ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) return;
        event.preventDefault();
        const index = CATEGORIES.findIndex((category) => category.id === tab.dataset.filterCategory);
        const next = event.key === "Home" ? 0 : event.key === "End" ? CATEGORIES.length - 1 : (index + (event.key === "ArrowDown" ? 1 : -1) + CATEGORIES.length) % CATEGORIES.length;
        setCategory(CATEGORIES[next].id, true);
      });
    }

    function matchingCards() {
      const words = state.query.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
      return cards.filter((card) => {
        const text = (card.dataset.searchText || card.textContent).toLocaleLowerCase();
        return words.every((word) => text.includes(word));
      });
    }
    function renderResults() {
      const matching = new Set(matchingCards());
      cards.forEach((card) => { card.hidden = !matching.has(card); });
      groups.forEach((group) => {
        const count = all("[data-result-card]", group.body).filter((card) => matching.has(card)).length;
        const badge = one("[data-group-count]", group.section);
        if (badge) badge.textContent = String(count);
        const empty = one("[data-group-empty]", group.section);
        if (empty) empty.hidden = count !== 0;
        group.refresh();
      });
      const empty = one("[data-no-results]");
      if (empty) empty.hidden = matching.size !== 0;
      root.dataset.resultCount = String(matching.size);
      announce(`${matching.size}个匹配的观星点`);
    }
    function renderSuggestions() {
      if (!suggestions || suppressSuggestions || state.route !== "search" || document.activeElement !== input || !state.query.trim()) {
        closeSuggestions();
        return;
      }
      const matches = matchingCards().slice(0, 5);
      suggestions.replaceChildren();
      matches.forEach((card) => {
        const name = card.dataset.searchName || one("h3", card)?.textContent.trim() || card.dataset.searchText;
        const item = button(name, "search-suggestion");
        item.setAttribute("role", "option");
        item.setAttribute("aria-selected", "false");
        item.addEventListener("focus", () => {
          all("[data-search-suggestion]", suggestions).forEach((option) => option.setAttribute("aria-selected", String(option === item)));
        });
        item.dataset.searchSuggestion = name;
        suggestions.append(item);
      });
      suggestions.hidden = matches.length === 0;
      root.dataset.suggestionsOpen = String(matches.length > 0);
      input.setAttribute("aria-expanded", String(matches.length > 0));
    }
    function updateQuery() {
      state.query = input.value;
      renderResults();
      renderSuggestions();
    }
    function finishRoute() {
      const searching = state.route === "search";
      if (!searching && searchSurface.contains(document.activeElement)) focus(leading);
      searchSurface.style.visibility = searching ? "visible" : "hidden";
      searchSurface.inert = !searching;
      searchSurface.setAttribute("aria-hidden", String(!searching));
      root.dataset.routeTransition = "idle";
    }
    function setRoute(next, animate = true, autofocus = true) {
      const previousStyle = getComputedStyle(searchSurface);
      const presentation = { opacity: previousStyle.opacity, transform: previousStyle.transform, clipPath: previousStyle.clipPath };
      routeAnimation?.cancel();
      routeAnimation = null;
      if (state.route === "search" && next === "map") state.scrollTop = scrollOwner.scrollTop;
      state.route = next;
      root.dataset.route = next;
      input.readOnly = next === "map";
      leading.setAttribute("aria-label", next === "search" ? "返回地图" : "搜索观星点");
      if (mapSurface) {
        mapSurface.inert = next === "search";
        mapSurface.setAttribute("aria-hidden", String(next === "search"));
      }
      searchSurface.hidden = false;
      searchSurface.style.visibility = "visible";
      searchSurface.inert = false;
      searchSurface.removeAttribute("aria-hidden");
      if (next === "map") {
        closeFilters();
        closeSuggestions();
        input.blur();
        if (autofocus) focus(leading);
      } else {
        scrollOwner.scrollTop = state.scrollTop;
        if (autofocus) focus(input);
      }
      if (!animate || reducedMotion.matches || typeof searchSurface.animate !== "function") {
        finishRoute();
        return;
      }
      root.dataset.routeTransition = next === "search" ? "opening" : "closing";
      const entering = next === "search";
      const destination = { opacity: entering ? 1 : 0, transform: entering ? "translateY(0px)" : "translateY(-12px)", clipPath: entering ? "inset(0 0 0 0)" : "inset(0 0 100% 0)" };
      const current = searchSurface.animate([presentation, destination], {
        duration: entering ? 180 : 160, easing: "cubic-bezier(.2,.8,.2,1)", fill: "both",
      });
      routeAnimation = current;
      current.finished.then(() => {
        if (routeAnimation !== current) return;
        finishRoute();
        current.cancel();
        routeAnimation = null;
      }).catch(() => {});
    }
    leading.addEventListener("click", () => setRoute(state.route === "map" ? "search" : "map"));
    frame.addEventListener("click", (event) => {
      if (leading.contains(event.target)) return;
      if (state.route === "map") setRoute("search");
      else focus(input);
    });
    input.addEventListener("focus", () => {
      if (state.route === "map") setRoute("search");
      renderSuggestions();
    });
    input.addEventListener("compositionstart", () => { isComposing = true; });
    input.addEventListener("compositionend", () => { isComposing = false; updateQuery(); });
    input.addEventListener("input", () => { if (!isComposing) updateQuery(); });
    input.addEventListener("keydown", (event) => {
      if (event.isComposing) return;
      if (event.key === "ArrowDown" && suggestions && !suggestions.hidden) {
        event.preventDefault();
        focus(one("[data-search-suggestion]", suggestions));
      } else if (event.key === "Enter") {
        event.preventDefault();
        updateQuery();
        closeSuggestions();
        input.blur();
        focus(leading);
      }
    });
    if (suggestions) {
      suggestions.addEventListener("click", (event) => {
        const item = event.target.closest("[data-search-suggestion]");
        if (!item) return;
        input.value = item.dataset.searchSuggestion;
        state.query = input.value;
        renderResults();
        closeSuggestions();
        focus(leading);
      });
      suggestions.addEventListener("keydown", (event) => {
        if (!["ArrowUp", "ArrowDown"].includes(event.key)) return;
        event.preventDefault();
        const items = all("[data-search-suggestion]", suggestions);
        const index = items.indexOf(document.activeElement);
        if (event.key === "ArrowUp" && index <= 0) focus(input);
        else focus(items[Math.min(items.length - 1, index + (event.key === "ArrowDown" ? 1 : -1))]);
      });
    }
    root.addEventListener("pointerdown", (event) => {
      if (frame.contains(event.target) || suggestions?.contains(event.target)) return;
      closeSuggestions();
      input.blur();
    });
    root.addEventListener("focusout", () => {
      queueMicrotask(() => {
        if (document.activeElement !== input && !suggestions?.contains(document.activeElement)) closeSuggestions();
      });
    });
    document.addEventListener("keydown", (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        if (dialog?.open) return;
        event.preventDefault();
        if (state.route === "map") setRoute("search");
        else focus(input);
        return;
      }
      if (event.key !== "Escape" || event.isComposing) return;
      if (dialog?.open) { event.preventDefault(); closeFilters(); }
      else if (suggestions && !suggestions.hidden) {
        event.preventDefault();
        suppressSuggestions = true;
        closeSuggestions();
        focus(input);
        suppressSuggestions = false;
      } else if (state.route === "search") { event.preventDefault(); setRoute("map"); }
    });
    if (strip) setupStrip(strip);
    setCategory(state.category);
    renderFilters();
    renderResults();
    closeSuggestions();
    setRoute(state.route, false, false);
  }

  function setupStrip(strip) {
    strip.setAttribute("aria-label", "观星点筛选，可横向滚动");
    strip.setAttribute("role", "group");
    strip.style.overflowX = "auto";
    let suppressClickUntil = 0;
    strip.addEventListener("click", (event) => {
      if (event.detail !== 0 && performance.now() < suppressClickUntil) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    }, true);
    strip.addEventListener("pointerdown", (event) => {
      suppressClickUntil = 0;
      if (event.pointerType !== "mouse" || event.button !== 0 || event.ctrlKey || event.metaKey || event.altKey) return;
      const start = { x: event.clientX, y: event.clientY, scrollLeft: strip.scrollLeft, id: event.pointerId };
      let horizontal = false;
      function clean() {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", end);
        window.removeEventListener("pointercancel", end);
        window.removeEventListener("blur", cancel);
        if (strip.hasPointerCapture(start.id)) strip.releasePointerCapture(start.id);
        delete strip.dataset.dragging;
      }
      function cancel() {
        if (horizontal) suppressClickUntil = performance.now() + 250;
        clean();
      }
      function move(moveEvent) {
        if (moveEvent.pointerId !== start.id) return;
        const dx = moveEvent.clientX - start.x;
        const dy = moveEvent.clientY - start.y;
        if (!horizontal) {
          if (Math.abs(dy) > 7 && Math.abs(dy) > Math.abs(dx)) { clean(); return; }
          if (Math.abs(dx) <= 7 || Math.abs(dx) <= Math.abs(dy) * 1.25) return;
          horizontal = true;
          strip.setPointerCapture(start.id);
          strip.dataset.dragging = "true";
        }
        moveEvent.preventDefault();
        strip.scrollLeft = start.scrollLeft - dx;
      }
      function end(endEvent) {
        if (endEvent.pointerId !== start.id) return;
        if (horizontal) suppressClickUntil = performance.now() + 250;
        clean();
      }
      window.addEventListener("pointermove", move, { passive: false });
      window.addEventListener("pointerup", end);
      window.addEventListener("pointercancel", end);
      window.addEventListener("blur", cancel);
    });
    strip.addEventListener("keydown", (event) => {
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key) || event.altKey || event.metaKey) return;
      event.preventDefault();
      const items = [...strip.querySelectorAll("[data-filter-option]")];
      if (event.ctrlKey && event.key.startsWith("Arrow")) {
        strip.scrollBy({ left: strip.clientWidth * .75 * (event.key === "ArrowRight" ? 1 : -1), behavior: reducedMotion.matches ? "instant" : "smooth" });
        return;
      }
      const index = items.indexOf(document.activeElement);
      const next = event.key === "Home" ? 0 : event.key === "End" ? items.length - 1 : Math.max(0, Math.min(items.length - 1, index + (event.key === "ArrowRight" ? 1 : -1)));
      focus(items[next]);
      items[next]?.scrollIntoView({ block: "nearest", inline: "nearest", behavior: reducedMotion.matches ? "instant" : "smooth" });
    });
  }

  const start = () => document.querySelectorAll("[data-search-prototype]").forEach(setup);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
})();
