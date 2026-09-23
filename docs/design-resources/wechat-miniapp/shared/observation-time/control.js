/* Browser design-resource component. Production uses Taro and ObservationContext. */
(() => {
  const calendarIcon = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 2v6M17 2v6M3 11h18"/></svg>';
  window.StarwardObservationTime = {
    mount(root, { days, dayIndex = 7, index = 6, moonSource, onChange = () => {} }) {
      let selectedDay = dayIndex, selectedIndex = index, drag = null, suppressClick = false;
      let presented = index, motionFrame = 0;
      const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
      const shiftDate = (date, offset) => new Date(Date.parse(date + 'T12:00:00Z') + offset * 86400000).toISOString().slice(0,10);
      const dateOf = (day, row) => row.localDate || shiftDate(day.date, row.next ? 1 : 0);
      const dateLabel = date => date.slice(5,7) + '月' + date.slice(8,10) + '日';
      const samples = days.flatMap((day, dayIndex) => day.hours.map((row, index) => ({date:dateOf(day,row),dayIndex,index,clock:row.at})));
      const dates = [...new Set(samples.map(s => s.date))].sort();
      const listeners = new AbortController();
      const listen = (el, type, fn, options = {}) => el.addEventListener(type, fn, { ...options, signal: listeners.signal });
      const clamp = n => Math.max(0, Math.min(days[selectedDay].hours.length - 1, n));
      root.classList.add('observation-time');
      root.dataset.moon = String(Boolean(moonSource));
      root.innerHTML = '<div class="date-bar"><button id="date-prev" type="button" aria-label="前一天">‹</button><button id="date-open" type="button" aria-haspopup="dialog"><span id="date-label"></span>' + calendarIcon + '</button><button id="date-next" type="button" aria-label="后一天">›</button><button id="date-today" type="button" aria-label="返回今天的日期">今天</button></div><div id="time-ruler" role="slider" tabindex="0" aria-label="观测时间"><div id="time-track"></div><span class="time-center" aria-hidden="true"></span></div><p id="night-time-label" aria-live="polite"></p>';
      const get = id => root.querySelector('#' + id), ruler = get('time-ruler'), track = get('time-track');
      const calendar = document.createElement('dialog');
      calendar.className = 'observation-calendar'; calendar.id = 'date-picker'; calendar.setAttribute('aria-labelledby', 'calendar-title');
      calendar.innerHTML = '<header><h2 id="calendar-title">选择日期</h2><button id="calendar-close" type="button" aria-label="关闭日期选择">×</button></header><p id="calendar-month"></p><div class="calendar-week">' + ['一','二','三','四','五','六','日'].map(t => '<span>' + t + '</span>').join('') + '</div><div id="calendar-days" role="group" aria-label="日期"></div><p class="calendar-note">日期按地点当地时间显示；灰色日期暂无可选时刻。</p>';
      document.body.append(calendar);
      const grid = calendar.querySelector('#calendar-days');
      let shownMonth = '';
      function state() { const day = days[selectedDay], row = day.hours[selectedIndex]; return { dayIndex:selectedDay, index:selectedIndex, day, row, localDate:dateOf(day,row) }; }
      function paint(progress) {
        presented = progress;
        track.style.transform = `translateX(${-33 - progress * 66}px)`;
        [...track.children].forEach((b, j) => {
          const distance = Math.abs(j - progress);
          b.style.transform = `translateY(${Math.min(12, distance * distance * 3)}px)`;
          b.style.opacity = String(Math.max(.25, 1 - distance * .22));
        });
      }
      function stopMotion() { cancelAnimationFrame(motionFrame); motionFrame = 0; root.dataset.settling = 'false'; }
      function settle(target) {
        stopMotion();
        const start = presented, startAt = performance.now();
        if (reducedMotion.matches || Math.abs(target-start) < .001) { paint(target); return; }
        root.dataset.settling = 'true';
        function tick(now) {
          const t = Math.min(1, (now-startAt)/220);
          paint(start + (target-start) * (1-Math.pow(1-t,3)));
          if (t < 1) motionFrame = requestAnimationFrame(tick);
          else { motionFrame = 0; root.dataset.settling = 'false'; }
        }
        motionFrame = requestAnimationFrame(tick);
      }
      function calendarMonth() {
        const month = state().localDate.slice(0, 7);
        if (month === shownMonth) return;
        shownMonth = month;
        const [year, number] = month.split('-').map(Number);
        calendar.querySelector('#calendar-month').textContent = `${year}年${number}月 · 地点当地时间`;
        grid.replaceChildren();
        const weekday = (new Date(Date.UTC(year, number - 1, 1)).getUTCDay() + 6) % 7;
        for (let n = 0; n < weekday; n++) grid.append(document.createElement('span'));
        const total = new Date(Date.UTC(year, number, 0)).getUTCDate();
        for (let n = 1; n <= total; n++) {
          const date = `${month}-${String(n).padStart(2, '0')}`;
          const b = document.createElement('button'); b.type = 'button'; b.textContent = n; b.disabled = !dates.includes(date); b.dataset.date = date;
          b.setAttribute('aria-label', `${number}月${n}日`);
          if (days.some(d => d.date === date && d.offset === 0)) { const today = document.createElement('small'); today.textContent = '今天'; b.append(today); }
          grid.append(b);
        }
      }
      function render() {
        const {day, row, localDate} = state();
        const week = new Intl.DateTimeFormat('zh-CN', {weekday:'short', timeZone:'UTC'}).format(new Date(localDate + 'T12:00:00Z'));
        get('date-label').replaceChildren(document.createTextNode(dateLabel(localDate)), Object.assign(document.createElement('span'), {className:'date-weekday', textContent:' ' + week}));
        get('date-open').setAttribute('aria-label', `${dateLabel(localDate)} ${week}，选择日期`);
        get('date-prev').disabled = localDate === dates[0];
        get('date-next').disabled = localDate === dates[dates.length-1];
        get('date-today').hidden = day.offset === 0;
        get('night-time-label').textContent = row.next ? day.label + '观测夜' : (day.offset < 0 ? '历史时段' : day.offset === 0 ? '今晚' : '观测夜');
        if (track.dataset.date !== day.date) {
          track.dataset.date = day.date; track.replaceChildren();
          day.hours.forEach((r, i) => {
            const b = document.createElement('button'); b.type = 'button'; b.dataset.time = i; b.tabIndex = -1;
            b.innerHTML = '<i aria-hidden="true"></i><span></span>';
            b.querySelector('span').textContent = r.at;
            if (moonSource) { const moon = document.createElement('img'); moon.className = 'tick-moon'; moon.alt = ''; moon.src = moonSource(r); b.append(moon); }
            b.setAttribute('aria-label', (r.next ? '次日 ' : '') + r.at + (moonSource ? '，' + r.phaseName : ''));
            track.append(b);
          });
        }
        ruler.setAttribute('aria-valuemin', '0'); ruler.setAttribute('aria-valuemax', String(day.hours.length - 1)); ruler.setAttribute('aria-valuenow', String(selectedIndex)); ruler.setAttribute('aria-valuetext', dateLabel(localDate) + ' ' + row.at);
        [...track.children].forEach((b, i) => b.setAttribute('aria-pressed', String(i === selectedIndex)));
        calendarMonth();
        grid.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.date === localDate)));
      }
      function setIndex(i, phase) { selectedIndex = clamp(i); render(); onChange(state(), phase); if (phase !== 'preview') settle(selectedIndex); }
      function cancel() {
        if (!drag) { stopMotion(); paint(selectedIndex); return; }
        const old = drag.index; drag = null; suppressClick = true; setIndex(old, 'cancel');
      }
      function chooseDay(i) {
        if (i < 0 || i >= days.length || !days[i].hours.length) return;
        cancel();
        const clock = state().row.at;
        selectedDay = i;
        const sameClock = days[i].hours.findIndex(r => r.at === clock);
        selectedIndex = sameClock >= 0 ? sameClock : 0;
        render(); paint(selectedIndex); onChange(state(), 'commit');
      }
      function chooseDate(date) {
        cancel();
        const candidates = samples.filter(s => s.date === date);
        if (!candidates.length) return;
        const sameClock = candidates.find(s => s.clock === state().row.at), chosen = sameClock || candidates[0];
        selectedDay = chosen.dayIndex; selectedIndex = chosen.index;
        render(); paint(selectedIndex); onChange(state(), 'commit');
        if (!sameClock) get('night-time-label').textContent += ' · 已选可用时刻';
      }
      listen(root, 'click', e => {
        const button = e.target.closest('button'); if (!button) return;
        if (button.dataset.time != null) { if (!suppressClick) setIndex(Number(button.dataset.time), 'commit'); return; }
        if (button.id === 'date-prev') chooseDate(dates[dates.indexOf(state().localDate)-1]);
        if (button.id === 'date-next') chooseDate(dates[dates.indexOf(state().localDate)+1]);
        if (button.id === 'date-today') chooseDay(days.findIndex(d => d.offset === 0));
        if (button.id === 'date-open') { cancel(); calendar.showModal(); grid.querySelector(`[data-date="${state().localDate}"]`)?.focus(); }
      });
      listen(grid, 'click', e => { const b = e.target.closest('button[data-date]'); if (!b || b.disabled) return; chooseDate(b.dataset.date); calendar.close(); });
      listen(calendar.querySelector('#calendar-close'), 'click', () => calendar.close());
      listen(calendar, 'click', e => { const b = calendar.getBoundingClientRect(); if (e.target === calendar && (e.clientX < b.left || e.clientX > b.right || e.clientY < b.top || e.clientY > b.bottom)) calendar.close(); });
      listen(calendar, 'close', () => get('date-open').focus({preventScroll:true}));
      listen(ruler, 'pointerdown', e => {
        if (!e.isPrimary || (e.pointerType === 'mouse' && e.button !== 0)) { cancel(); return; }
        if (drag) cancel();
        stopMotion(); suppressClick = false; drag = { id:e.pointerId, x:e.clientX, y:e.clientY, index:selectedIndex, origin:presented, axis:null, progress:presented };
      });
      listen(ruler, 'pointermove', e => {
        if (!drag || e.pointerId !== drag.id) return;
        const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
        if (!drag.axis && Math.max(Math.abs(dx), Math.abs(dy)) > 6) drag.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
        if (drag.axis === 'y') suppressClick = true;
        if (drag.axis !== 'x') return;
        ruler.setPointerCapture(e.pointerId); suppressClick = true; drag.progress = clamp(drag.origin - dx / 66);
        setIndex(Math.round(drag.progress), 'preview'); paint(drag.progress);
      });
      listen(ruler, 'pointerup', () => { const ended = drag; drag = null; if (ended?.axis === 'x') setIndex(Math.round(ended.progress), 'commit'); else if (ended) settle(selectedIndex); });
      listen(ruler, 'pointercancel', cancel);
      listen(ruler, 'lostpointercapture', () => { if (drag) cancel(); });
      listen(window, 'pointerup', () => { if (drag && drag.axis !== 'x') drag = null; });
      listen(ruler, 'keydown', e => {
        if (e.key === 'Escape') { if (drag) { e.preventDefault(); e.stopPropagation(); cancel(); } return; }
        if (!['ArrowLeft','ArrowRight','Home','End'].includes(e.key)) return;
        e.preventDefault(); if (drag) cancel(); else stopMotion(); suppressClick = false;
        setIndex(e.key === 'Home' ? 0 : e.key === 'End' ? days[selectedDay].hours.length - 1 : selectedIndex + (e.key === 'ArrowRight' ? 1 : -1), 'commit');
      });
      listen(document, 'visibilitychange', () => { if (document.hidden) { cancel(); stopMotion(); paint(selectedIndex); } });
      listen(reducedMotion, 'change', () => { if (reducedMotion.matches) { stopMotion(); paint(selectedIndex); } });
      render(); paint(selectedIndex);
      return { cancel() { cancel(); stopMotion(); paint(selectedIndex); }, getState: state, destroy() { cancel(); stopMotion(); listeners.abort(); calendar.remove(); } };
    }
  };
})();
