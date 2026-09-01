(function () {
  function each(selector, fn) { Array.prototype.forEach.call(document.querySelectorAll(selector), fn); }

  each('[data-theme-target]', function (button) {
    button.addEventListener('click', function () {
      var target = document.querySelector(button.getAttribute('data-theme-target'));
      if (!target) return;
      var theme = button.getAttribute('data-theme-value');
      var current = target.getAttribute('data-theme');
      var crossesObservation = current === 'observation' || theme === 'observation';
      if (crossesObservation) target.classList.add('theme-switching-observation');
      target.setAttribute('data-theme', theme);
      each('[data-theme-target="' + button.getAttribute('data-theme-target') + '"]', function (peer) {
        peer.setAttribute('aria-pressed', String(peer === button));
      });
      var label = target.querySelector('[data-current-theme]');
      if (label) label.textContent = theme === 'day' ? '日间' : theme === 'night' ? '夜间' : '观测';
      if (crossesObservation) {
        requestAnimationFrame(function () {
          requestAnimationFrame(function () { target.classList.remove('theme-switching-observation'); });
        });
      }
    });
  });

  each('[data-disclosure-button]', function (button) {
    button.addEventListener('click', function () {
      var wrap = button.closest('.disclosure');
      var open = wrap.getAttribute('data-open') === 'true';
      wrap.setAttribute('data-open', String(!open));
      button.setAttribute('aria-expanded', String(!open));
    });
  });

  each('[data-state-value]', function (button) {
    button.addEventListener('click', function () {
      var state = button.getAttribute('data-state-value');
      var group = button.closest('[data-state-controller]');
      var target = document.querySelector(group.getAttribute('data-state-target'));
      if (!target) return;
      each('[data-state-value]', function (peer) {
        if (peer.closest('[data-state-controller]') === group) {
          peer.setAttribute('aria-selected', String(peer === button));
          peer.setAttribute('tabindex', peer === button ? '0' : '-1');
        }
      });
      target.setAttribute('data-state', state);
      if (button.id) target.setAttribute('aria-labelledby', button.id);
      var copy = {
        live: ['实时', '核心数据已更新 · 演示时间 20:18'],
        partial: ['部分数据', '透明度后两小时缺失；其余结论仍可查看'],
        stale: ['数据较旧', '演示数据更新时间较早，出发前请刷新'],
        offline: ['离线缓存', '当前无网络，显示上次保存的数据']
      }[state];
      target.querySelector('strong').textContent = copy[0];
      target.querySelector('p').textContent = copy[1];
      var scope = group.closest('[data-state-scope]') || group.closest('.phone') || document;
      Array.prototype.forEach.call(scope.querySelectorAll('[data-status-copy]'), function (node) { node.textContent = copy[0]; });
      Array.prototype.forEach.call(scope.querySelectorAll('[data-conditional-cell]'), function (cell) {
        cell.classList.toggle('missing', state === 'partial' || state === 'offline');
        if (state === 'partial' || state === 'offline') cell.textContent = '缺';
        else cell.textContent = cell.getAttribute('data-value');
      });
    });
  });

  each('[role="tablist"]', function (tablist) {
    tablist.addEventListener('keydown', function (event) {
      var tabs = Array.prototype.slice.call(tablist.querySelectorAll('[role="tab"]'));
      var current = tabs.indexOf(document.activeElement);
      if (current < 0) return;
      var next = current;
      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (current + 1) % tabs.length;
      else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = (current - 1 + tabs.length) % tabs.length;
      else if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = tabs.length - 1;
      else return;
      event.preventDefault();
      tabs[next].focus();
      tabs[next].click();
    });
  });

  each('[data-choice-bar]', function (group) {
    var buttons = Array.prototype.slice.call(group.querySelectorAll('[role="tab"]'));
    function select(button) {
      var selectedIndex = buttons.indexOf(button);
      group.style.setProperty('--choice-index', String(selectedIndex));
      buttons.forEach(function (peer) {
        peer.setAttribute('aria-selected', String(peer === button));
        peer.setAttribute('tabindex', peer === button ? '0' : '-1');
        var panelId = peer.getAttribute('aria-controls');
        if (panelId) {
          var panel = document.getElementById(panelId);
          if (panel) panel.hidden = peer !== button;
        }
      });
    }
    buttons.forEach(function (button) {
      button.addEventListener('click', function () { select(button); });
    });
    var initial = buttons.find(function (button) { return button.getAttribute('aria-selected') === 'true'; }) || buttons[0];
    if (initial) select(initial);
  });

  each('[data-clear-target]', function (button) {
    button.addEventListener('click', function () {
      var target = document.querySelector(button.getAttribute('data-clear-target'));
      if (!target) return;
      target.value = '';
      target.focus();
      target.dispatchEvent(new Event('input', { bubbles: true }));
    });
  });

  each('[data-search-demo]', function (demo) {
    var input = demo.querySelector('[data-search-input]');
    var status = demo.querySelector('[role="status"]');
    var suggestions = demo.querySelector('.suggestion-list');
    if (!input || !status) return;
    function updateSearchState() {
      var query = input.value.trim();
      if (!query) {
        status.querySelector('strong').textContent = '等待输入范围内关键词';
        status.querySelector('small').textContent = '范围保持为已收录观测点';
        if (suggestions) suggestions.hidden = true;
        return;
      }
      status.querySelector('strong').textContent = '找到 2 个演示地点';
      status.querySelector('small').textContent = '结果按相关性优先';
      if (suggestions) suggestions.hidden = false;
    }
    input.addEventListener('input', updateSearchState);
    updateSearchState();
  });

  each('[data-indeterminate]', function (checkbox) {
    checkbox.indeterminate = true;
    checkbox.setAttribute('aria-checked', 'mixed');
  });

  each('[data-sheet-toggle]', function (button) {
    button.addEventListener('click', function () {
      var selector = button.getAttribute('data-sheet-toggle');
      var target = document.querySelector(selector);
      if (!target) return;
      var open = target.getAttribute('data-open') === 'true';
      target.setAttribute('data-open', String(!open));
      each('[data-sheet-toggle="' + selector + '"]', function (peer) {
        peer.setAttribute('aria-expanded', String(!open));
        peer.textContent = open ? '打开浮层' : '关闭浮层';
      });
    });
  });

  each('[data-time-sync]', function (input) {
    var output = input.parentElement.querySelector('[data-time-sync-output]');
    var times = ['21:00', '22:00', '23:00', '00:00', '01:00', '02:00'];
    function paint() { if (output) output.textContent = times[Number(input.value)] || times[0]; }
    input.addEventListener('input', paint);
    paint();
  });

  each('[data-arrival-toggle]', function (button) {
    button.addEventListener('click', function () {
      var target = document.querySelector(button.getAttribute('data-arrival-toggle'));
      if (!target) return;
      var loaded = target.getAttribute('data-loaded') === 'true';
      if (loaded) {
        target.setAttribute('data-loaded', 'false');
        target.setAttribute('aria-busy', 'false');
        button.textContent = '模拟数据到达';
        return;
      }
      target.setAttribute('aria-busy', 'true');
      button.disabled = true;
      button.textContent = '正在更新';
      var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      window.setTimeout(function () {
        target.setAttribute('data-loaded', 'true');
        target.setAttribute('aria-busy', 'false');
        button.disabled = false;
        button.textContent = '重置演示';
      }, reduced ? 0 : 160);
    });
  });

  var navToggle = document.querySelector('[data-handbook-nav-toggle]');
  var handbookNav = document.querySelector('.handbook-nav');
  if (navToggle && handbookNav) {
    navToggle.addEventListener('click', function () {
      var open = handbookNav.getAttribute('data-open') === 'true';
      handbookNav.setAttribute('data-open', String(!open));
      navToggle.setAttribute('aria-expanded', String(!open));
      var mark = navToggle.querySelector('[aria-hidden="true"]');
      if (mark) mark.textContent = open ? '＋' : '−';
    });
    each('.handbook-nav a', function (link) {
      link.addEventListener('click', function () {
        handbookNav.setAttribute('data-open', 'false');
        navToggle.setAttribute('aria-expanded', 'false');
        var mark = navToggle.querySelector('[aria-hidden="true"]');
        if (mark) mark.textContent = '＋';
      });
    });
  }

  var handbookSections = Array.prototype.slice.call(document.querySelectorAll('[data-handbook-section]'));
  var handbookLinks = Array.prototype.slice.call(document.querySelectorAll('.handbook-nav a'));
  if (handbookSections.length && handbookLinks.length && 'IntersectionObserver' in window) {
    var observer = new IntersectionObserver(function (entries) {
      var visible = entries.filter(function (entry) { return entry.isIntersecting; }).sort(function (a, b) { return b.intersectionRatio - a.intersectionRatio; })[0];
      if (!visible) return;
      handbookLinks.forEach(function (link) {
        if (link.getAttribute('href') === '#' + visible.target.id) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      });
    }, { rootMargin: '-18% 0px -68% 0px', threshold: [0, .1, .4] });
    handbookSections.forEach(function (section) { observer.observe(section); });
  }

  each('.toggle:not([data-reduced-toggle])', function (button) {
    button.addEventListener('click', function () {
      var stateName = button.getAttribute('role') === 'switch' ? 'aria-checked' : 'aria-pressed';
      var next = button.getAttribute(stateName) !== 'true';
      button.setAttribute(stateName, String(next));
    });
  });

  each('[data-motion-toggle]', function (button) {
    button.addEventListener('click', function () {
      var target = document.querySelector(button.getAttribute('data-motion-toggle'));
      var active = target.getAttribute('data-active') === 'true';
      target.setAttribute('data-active', String(!active));
    });
  });

  each('[data-reduced-toggle]', function (button) {
    button.addEventListener('click', function () {
      var target = document.querySelector(button.getAttribute('data-reduced-toggle'));
      var reduced = target.getAttribute('data-reduced') === 'true';
      target.setAttribute('data-reduced', String(!reduced));
      button.setAttribute(button.getAttribute('role') === 'switch' ? 'aria-checked' : 'aria-pressed', String(!reduced));
    });
  });
})();
