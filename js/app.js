/* ============================================================
 * app.js —— 应用外壳：导航、首页、章节切换、进度追踪
 * ============================================================ */
(function () {
  'use strict';
  const U = globalThis.UI;

  const CHAPTERS = [
    { id: 'ch1', num: 1, title: '数据与文字的表示', icon: '🔢', color: ['#4f46e5', '#7c3aed'], tag: '码制 · ASCII · 汉字', render: globalThis.CH1.render },
    { id: 'ch2', num: 2, title: '定点加法与减法', icon: '➕', color: ['#0ea5e9', '#2563eb'], tag: '补码 · 溢出', render: globalThis.CH2.render },
    { id: 'ch3', num: 3, title: '定点乘法运算', icon: '✖️', color: ['#f59e0b', '#ea580c'], tag: '一位乘法 · Booth', render: globalThis.CH3.render },
    { id: 'ch4', num: 4, title: '定点除法运算', icon: '➗', color: ['#10b981', '#059669'], tag: '恢复余数 · 加减交替', render: globalThis.CH4.render },
    { id: 'ch5', num: 5, title: '定点运算器的组成', icon: '🧩', color: ['#8b5cf6', '#6d28d9'], tag: 'ALU · 74181 · 总线', render: globalThis.CH5.render },
    { id: 'ch6', num: 6, title: '浮点运算方法与运算器', icon: '🛰️', color: ['#ec4899', '#db2777'], tag: 'IEEE754 · 浮点加减', render: globalThis.CH6.render }
  ];

  const $ = s => document.querySelector(s);
  const LS_KEY = 'arithlab-progress-v1';

  let visited = [];
  try { visited = JSON.parse(localStorage.getItem(LS_KEY) || '[]'); } catch (e) { visited = []; }

  function saveProgress() {
    try { localStorage.setItem(LS_KEY, JSON.stringify(visited)); } catch (e) { /* ignore */ }
    renderProgress();
  }
  function markVisited(id) {
    if (!visited.includes(id)) { visited.push(id); saveProgress(); }
  }
  function renderProgress() {
    const pct = Math.round(visited.length / CHAPTERS.length * 100);
    $('#progressFill').style.width = pct + '%';
    $('#progressNum').textContent = visited.length + ' / ' + CHAPTERS.length + ' 章';
  }

  /* ---------- 侧边栏 ---------- */
  function renderNav() {
    const nav = $('#nav');
    nav.innerHTML = '';
    const home = document.createElement('button');
    home.className = 'nav-item' + (current === 'home' ? ' active' : '');
    home.type = 'button';
    home.innerHTML = '<span class="nav-ico">🏠</span><span>学习地图</span><span class="nav-num">HOME</span>';
    home.addEventListener('click', () => go('home'));
    nav.appendChild(home);
    CHAPTERS.forEach(ch => {
      const b = document.createElement('button');
      b.className = 'nav-item' + (current === ch.id ? ' active' : '');
      b.type = 'button';
      b.innerHTML = '<span class="nav-ico">' + ch.icon + '</span><span>' + ch.title + '</span><span class="nav-num">' + ch.num + '</span>';
      b.addEventListener('click', () => go(ch.id));
      nav.appendChild(b);
    });
  }

  /* ---------- 首页 ---------- */
  function renderHome() {
    current = 'home';
    document.title = '运算方法与运算器 · 交互式动画课堂';
    $('#topbarChap').textContent = '学习地图';
    $('#topbarSec').textContent = '';
    const c = $('#content');
    const nodes = CHAPTERS.map(ch => {
      const done = visited.includes(ch.id);
      return '<div class="road-node' + (done ? ' done' : '') + '" data-go="' + ch.id + '" style="border-top:4px solid ' + ch.color[0] + '">' +
        '<span class="rn-no">' + ch.num + '</span>' +
        '<div class="rn-ico">' + ch.icon + '</div>' +
        '<h3>' + ch.title + '</h3>' +
        '<p>' + ch.tag + '</p>' +
        '<div style="margin-top:10px"><span class="tag ' + (done ? 'tag-ok' : 'tag-noop') + '">' + (done ? '✓ 已学习' : '未开始') + '</span></div>' +
        '</div>';
    }).join('');
    c.innerHTML =
      '<div class="home-hero">' +
      '<h1>🧮 运算方法与运算器<br><span class="grad">交互式动画课堂</span></h1>' +
      '<p>计算机组成原理第 2 章，6 个知识模块、20+ 个动画与动手实验：不用背公式，点一点、拖一拖、跟着步骤走，傻子也能看懂。</p>' +
      '<div class="home-stats">' +
      '<div class="home-stat"><b>6</b><span>章知识模块</span></div>' +
      '<div class="home-stat"><b>20+</b><span>交互式动画</span></div>' +
      '<div class="home-stat"><b>13</b><span>个动手实验</span></div>' +
      '<div class="home-stat"><b>15</b><span>道随堂测验</span></div>' +
      '</div></div>' +
      '<div class="card"><h2 class="sec-title">🗺️ 学习路线（建议按顺序）</h2>' +
      '<p class="para small muted">先学会“数怎么表示”，再看“怎么算加减乘除”，然后看“硬件长什么样”，最后学“小数怎么算”。</p>' +
      '<div class="roadmap">' + nodes + '</div></div>' +
      '<div class="card">' +
      '<h2 class="sec-title">💡 怎么学效果最好？</h2>' +
      '<div class="grid2">' +
      '<div>' + U.callout('info', '1️⃣', '先看每章开头的<strong>大白话直觉</strong>，不追求看懂公式，先建立“它在干什么”的感觉。') + '</div>' +
      '<div>' + U.callout('info', '2️⃣', '然后打开<strong>动画演示</strong>，点“自动播放”，让算法自己跑一遍；再用“上一步/下一步”反复看卡住的地方。') + '</div>' +
      '<div>' + U.callout('info', '3️⃣', '接着用<strong>交互实验</strong>换几个数自己试——看步骤表的变化，直到你能预测下一步。') + '</div>' +
      '<div>' + U.callout('ok', '4️⃣', '最后做<strong>小测验</strong>。全对就过关！错了就回去再看一遍动画。') + '</div>' +
      '</div></div>' +
      '<div class="card center"><button class="btn btn-primary" id="startBtn" type="button">🚀 从第 1 章开始学习</button></div>';
    c.querySelectorAll('.road-node').forEach(n => n.addEventListener('click', () => go(n.dataset.go)));
    c.querySelector('#startBtn').addEventListener('click', () => go('ch1'));
    c.scrollTop = 0;
    window.scrollTo(0, 0);
    renderNav();
  }

  /* ---------- 章节页 ---------- */
  function renderChapter(id) {
    const ch = CHAPTERS.find(x => x.id === id);
    if (!ch) { renderHome(); return; }
    current = ch.id;
    markVisited(ch.id);
    document.title = ch.title + ' · 运算方法与运算器';
    $('#topbarChap').textContent = '第 ' + ch.num + ' 章 · ' + ch.title;
    $('#topbarSec').textContent = '';
    const c = $('#content');
    c.innerHTML = '<div id="chapRoot"></div>';
    ch.render(c.querySelector('#chapRoot'));
    window.scrollTo(0, 0);
    renderNav();
    renderProgress();
  }

  /* ---------- 路由 ---------- */
  let current = 'home';
  function go(id) {
    if (id === 'home') renderHome();
    else renderChapter(id);
    closeSidebar();
    if (location.hash !== '#/' + id) {
      try { history.replaceState(null, '', '#/' + id); } catch (e) { /* ignore */ }
    }
  }
  // 支持浏览器前进/后退与 hash 直达（纯 hash 变化不触发页面重载）
  window.addEventListener('hashchange', () => {
    const id = location.hash.replace('#/', '');
    if ((id || 'home') === current) return;
    if (id && CHAPTERS.some(c => c.id === id)) renderChapter(id);
    else renderHome();
    closeSidebar();
  });

  /* ---------- 移动端侧栏 ---------- */
  function openSidebar() {
    $('#sidebar').classList.add('open');
    $('#overlay').classList.add('show');
  }
  function closeSidebar() {
    $('#sidebar').classList.remove('open');
    $('#overlay').classList.remove('show');
  }
  $('#menuBtn').addEventListener('click', openSidebar);
  $('#overlay').addEventListener('click', closeSidebar);
  $('#resetProgress').addEventListener('click', () => {
    if (confirm('确定要重置学习进度吗？')) {
      visited = [];
      saveProgress();
      renderNav();
      if (current === 'home') renderHome();
    }
  });

  /* ---------- 启动 ---------- */
  const init = location.hash.replace('#/', '');
  if (init && CHAPTERS.some(c => c.id === init)) go(init);
  else renderHome();
})();
