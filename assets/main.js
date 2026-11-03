/* Easyfun2 · personal site
   1) 深浅色主题  2) 汇率  3) 导航高亮  4) 热榜数据渲染 */

(function () {
  'use strict';

  var root = document.documentElement;

  /* ---------------- theme ---------------- */

  var mq = window.matchMedia('(prefers-color-scheme: dark)');

  function storedTheme() {
    try { return localStorage.getItem('theme'); } catch (error) { return null; }
  }

  function applyTheme(theme) {
    root.setAttribute('data-theme', theme);
    var toggle = document.querySelector('.theme-toggle');
    if (toggle) toggle.setAttribute('aria-pressed', String(theme === 'dark'));
  }

  applyTheme(storedTheme() || (mq.matches ? 'dark' : 'light'));

  var toggle = document.querySelector('.theme-toggle');
  if (toggle) {
    toggle.addEventListener('click', function () {
      var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      try { localStorage.setItem('theme', next); } catch (error) {}
    });
  }

  mq.addEventListener('change', function (event) {
    if (!storedTheme()) applyTheme(event.matches ? 'dark' : 'light');
  });

  /* ---------------- year ---------------- */

  var year = document.getElementById('year');
  if (year) year.textContent = String(new Date().getFullYear());

  /* ---------------- usd/cny rate ---------------- */

  var fx = document.getElementById('fx');

  if (fx) {
    var fxRate = document.getElementById('fx-rate');
    var fxChange = document.getElementById('fx-change');
    var fxArrow = document.getElementById('fx-arrow');
    var fxChangeText = document.getElementById('fx-change-text');
    var fxUpdated = document.getElementById('fx-updated');

    var pad2 = function (n) { return String(n).padStart(2, '0'); };

    function formatFxTime(value) {
      if (!value) return '';
      var text = String(value);
      // 支持新浪的「2026-11-03 14:06:01」和备用接口的 RFC 时间
      var date = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(text)
        ? new Date(text.replace(' ', 'T'))
        : new Date(text);
      if (isNaN(date.getTime())) return text;
      return pad2(date.getMonth() + 1) + '-' + pad2(date.getDate()) + ' ' + pad2(date.getHours()) + ':' + pad2(date.getMinutes());
    }

    function renderFx(data) {
      if (!data || !Number.isFinite(Number(data.rate))) throw new Error('bad fx payload');

      fxRate.textContent = Number(data.rate).toFixed(4);

      var change = Number(data.change);
      var pct = Number(data.changePct);
      if (data.change === null || data.change === undefined || isNaN(change) || isNaN(pct)) {
        fxChange.hidden = true;
      } else {
        var direction = change > 0 ? 'is-up' : change < 0 ? 'is-down' : '';
        fxChange.hidden = false;
        fxChange.className = 'fx-change' + (direction ? ' ' + direction : '');
        fxArrow.textContent = change > 0 ? '▲' : change < 0 ? '▼' : '·';
        fxChangeText.textContent =
          (change > 0 ? '+' : '') + change.toFixed(4) + ' · ' +
          (pct > 0 ? '+' : '') + pct.toFixed(2) + '%';
      }

      var when = formatFxTime(data.quoteTime || data.updatedAt);
      var source = data.source ? '数据来源：' + data.source : '';
      fxUpdated.textContent = (when ? '更新于 ' + when : '当前汇率') + (source ? ' · ' + source : '');
      fxRate.removeAttribute('title');
      if (data.quoteTime) fxRate.setAttribute('title', '行情时间 ' + data.quoteTime);
    }

    function loadFxFallback() {
      // data/fx.json 获取失败时，直接向免 Key 的公开接口取参考汇率
      fetch('https://open.er-api.com/v6/latest/USD', { cache: 'no-store' })
        .then(function (response) {
          if (!response.ok) throw new Error('HTTP ' + response.status);
          return response.json();
        })
        .then(function (data) {
          renderFx({
            rate: data && data.rates && data.rates.CNY,
            source: 'ExchangeRate-API（参考汇率）',
            quoteTime: data && data.time_last_update_utc
          });
        })
        .catch(function () {
          fxUpdated.textContent = '汇率数据暂时不可用';
        });
    }

    fetch('data/fx.json?t=' + Date.now(), { cache: 'no-store' })
      .then(function (response) {
        if (!response.ok) throw new Error('HTTP ' + response.status);
        return response.json();
      })
      .then(renderFx)
      .catch(loadFxFallback);
  }

  /* ---------------- navigation highlight ---------------- */

  var navLinks = Array.prototype.slice.call(document.querySelectorAll('.nav a[data-section]'));
  var sections = navLinks
    .map(function (link) { return document.getElementById(link.dataset.section); })
    .filter(Boolean);

  if (sections.length && 'IntersectionObserver' in window) {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        navLinks.forEach(function (link) {
          link.classList.toggle('is-active', link.dataset.section === entry.target.id);
        });
      });
    }, { rootMargin: '-40% 0px -52% 0px', threshold: 0 });
    sections.forEach(function (section) { observer.observe(section); });
  }

  /* ---------------- trending ---------------- */

  var list = document.getElementById('trending-list');
  var panel = document.getElementById('trending-panel');
  var updatedEl = document.getElementById('trending-updated');
  var tabs = Array.prototype.slice.call(document.querySelectorAll('.tab'));

  if (!list || !panel || !tabs.length) return;

  var state = { data: null, current: 'zhihu', loading: false };

  function formatHot(value) {
    if (!value) return '';
    if (value >= 100000000) return (value / 100000000).toFixed(1).replace(/\.0$/, '') + ' 亿';
    if (value >= 10000) return Math.round(value / 10000) + ' 万';
    return String(value);
  }

  function formatUpdated(iso) {
    var date = new Date(iso);
    if (isNaN(date.getTime())) return '';
    var pad = function (n) { return String(n).padStart(2, '0'); };
    return pad(date.getMonth() + 1) + '-' + pad(date.getDate()) + ' ' + pad(date.getHours()) + ':' + pad(date.getMinutes());
  }

  function renderEmpty(message) {
    list.innerHTML =
      '<li class="trending-empty">' + message +
      '<button class="retry" type="button">重试</button></li>';
    var retry = list.querySelector('.retry');
    if (retry) retry.addEventListener('click', function () { load(true); });
    if (updatedEl) updatedEl.textContent = '暂时无法获取热榜数据';
  }

  function render() {
    var source = state.data && state.data.sources && state.data.sources[state.current];
    if (!source || !source.items || !source.items.length) {
      renderEmpty('这个榜单暂时没有数据。');
      return;
    }

    list.innerHTML = source.items.map(function (item, index) {
      var rank = String(index + 1).padStart(2, '0');
      var badge = item.label && item.label.length <= 2
        ? '<span class="badge">' + escapeHtml(item.label) + '</span>'
        : '';
      var hot = formatHot(item.hot);
      return '<li class="trending-item">' +
        '<span class="rank">' + rank + '</span>' +
        '<a class="trending-title" href="' + escapeAttr(item.url) + '" target="_blank" rel="noopener noreferrer">' +
        escapeHtml(item.title) + badge + '</a>' +
        (hot ? '<span class="heat">' + hot + '</span>' : '<span class="heat"></span>') +
        '</li>';
    }).join('');

    if (updatedEl) {
      updatedEl.textContent = '更新于 ' + formatUpdated(source.updatedAt || state.data.updatedAt) + ' · 每 20 分钟自动刷新';
    }
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, function (char) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char];
    });
  }

  function escapeAttr(value) {
    return escapeHtml(value).replace(/`/g, '&#96;');
  }

  function selectTab(sourceId) {
    state.current = sourceId;
    tabs.forEach(function (tab) {
      var active = tab.dataset.source === sourceId;
      tab.classList.toggle('is-active', active);
      tab.setAttribute('aria-selected', String(active));
      if (active) panel.setAttribute('aria-labelledby', tab.id);
    });
    if (state.data) render();
  }

  tabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      selectTab(tab.dataset.source);
    });
    tab.addEventListener('keydown', function (event) {
      var index = tabs.indexOf(tab);
      var next = null;
      if (event.key === 'ArrowRight') next = tabs[(index + 1) % tabs.length];
      if (event.key === 'ArrowLeft') next = tabs[(index - 1 + tabs.length) % tabs.length];
      if (event.key === 'Home') next = tabs[0];
      if (event.key === 'End') next = tabs[tabs.length - 1];
      if (!next) return;
      event.preventDefault();
      next.focus();
      selectTab(next.dataset.source);
    });
  });

  function load(manual) {
    if (state.loading) return;
    state.loading = true;
    var controller = new AbortController();
    var timer = setTimeout(function () { controller.abort(); }, 10000);

    fetch('data/hot.json?t=' + Date.now(), { cache: 'no-store', signal: controller.signal })
      .then(function (response) {
        if (!response.ok) throw new Error('HTTP ' + response.status);
        return response.json();
      })
      .then(function (data) {
        if (!data || !data.sources) throw new Error('empty payload');
        state.data = data;
        var available = Object.keys(data.sources);
        if (available.length && !data.sources[state.current]) {
          state.current = available[0];
          selectTab(state.current);
        }
        render();
        loadTick = Date.now();
      })
      .catch(function () {
        if (!state.data) renderEmpty('热榜数据加载失败，请检查网络后重试。');
        else if (updatedEl) updatedEl.textContent = '刷新失败，当前显示的是上次数据';
      })
      .finally(function () {
        clearTimeout(timer);
        state.loading = false;
      });
  }

  var loadTick = Date.now();

  load(false);

  // 页面可见时每 10 分钟静默刷新一次
  setInterval(function () {
    if (document.hidden) return;
    if (Date.now() - loadTick < 9 * 60 * 1000) return;
    load(false);
  }, 60 * 1000);

  document.addEventListener('visibilitychange', function () {
    if (!document.hidden && Date.now() - loadTick > 10 * 60 * 1000) load(false);
  });
})();
