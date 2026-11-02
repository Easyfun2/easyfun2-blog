/* Easyfun2 · personal site
   1) 深浅色主题  2) 导航高亮  3) 热榜数据渲染 */

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
