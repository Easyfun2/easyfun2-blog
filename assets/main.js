/* 主题切换 + 年份 */
(function () {
  var root = document.documentElement;
  var mq = window.matchMedia('(prefers-color-scheme: dark)');

  function stored() {
    try { return localStorage.getItem('theme'); } catch (e) { return null; }
  }

  // 首次访问跟随系统；之后记住用户的选择
  root.setAttribute('data-theme', stored() || (mq.matches ? 'dark' : 'light'));

  var toggle = document.querySelector('.theme-toggle');
  if (toggle) {
    toggle.addEventListener('click', function () {
      var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      try { localStorage.setItem('theme', next); } catch (e) {}
    });
  }

  // 没手动选过时，跟随系统切换
  mq.addEventListener('change', function (e) {
    if (!stored()) root.setAttribute('data-theme', e.matches ? 'dark' : 'light');
  });

  var year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();
})();
