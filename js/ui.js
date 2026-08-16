/* ============================================================
 * ui.js —— 共享 UI 组件：位块、步骤播放器、算法走查器、测验
 * ============================================================ */
(function (global) {
  'use strict';
  const UI = {};

  /* ---------- DOM 工具 ---------- */
  UI.esc = function (s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  };
  UI.clear = function (el) { while (el.firstChild) el.removeChild(el.firstChild); return el; };
  UI.el = function (tag, attrs, ...children) {
    const e = document.createElement(tag);
    if (attrs) for (const k in attrs) {
      if (k === 'class') e.className = attrs[k];
      else if (k === 'html') e.innerHTML = attrs[k];
      else if (k.startsWith('on')) e.addEventListener(k.slice(2), attrs[k]);
      else e.setAttribute(k, attrs[k]);
    }
    for (const c of children) {
      if (c == null) continue;
      e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    }
    return e;
  };
  UI.html = function (s) { const d = document.createElement('div'); d.innerHTML = s; return d; };

  /* ---------- 位块 ---------- */
  // bits: 字符串; opts: {role: 'sign'|'data'|'auto', signN: 前几位为符号位, highlight: [{i, cls}], size: 'sm'|'md'}
  UI.bits = function (bits, opts) {
    opts = opts || {};
    const arr = String(bits).split('');
    const signN = opts.signN || 0;
    const hl = opts.highlight || [];
    return arr.map((b, i) => {
      let cls = 'bit';
      if (opts.zero !== false && b === '0' && !opts.keepZero) cls += ' b-zero';
      else cls += ' b-data';
      if (i < signN) cls = 'bit b-sign';
      if (opts.role === 'sign' && i === 0) cls = 'bit b-sign';
      for (const h of hl) if (h.i === i) cls += ' ' + (h.cls || 'b-lit');
      if (opts.big) cls += ' big';
      return '<span class="' + cls + '">' + b + '</span>';
    }).join('');
  };
  UI.bitRow = function (label, bits, opts) {
    opts = opts || {};
    const sub = opts.sub ? '<span class="l">' + opts.sub + '</span>' : '';
    return '<div class="bitrow" style="margin:4px 0">' +
      (label ? '<span class="bitrow-label">' + label + sub + '</span>' : '') +
      UI.bits(bits, opts) + '</div>';
  };

  /* ---------- 提示框 ---------- */
  UI.callout = function (type, ico, text) {
    return '<div class="callout callout-' + type + '"><span class="ico">' + ico + '</span><div>' + text + '</div></div>';
  };

  /* ---------- 选项卡 ---------- */
  UI.tabs = function (container, tabs) {
    // tabs: [{label, render(panel)}]
    const bar = UI.el('div', { class: 'tab-bar' });
    const panel = UI.el('div', { class: 'fade-in' });
    let cur = 0;
    function show(i) {
      cur = i;
      [...bar.children].forEach((b, j) => b.classList.toggle('active', j === i));
      UI.clear(panel);
      tabs[i].render(panel);
    }
    tabs.forEach((t, i) => {
      const b = UI.el('button', { class: 'tab-btn' + (i === 0 ? ' active' : ''), type: 'button' }, t.label);
      b.addEventListener('click', () => show(i));
      bar.appendChild(b);
    });
    UI.clear(container);
    container.appendChild(bar);
    container.appendChild(panel);
    show(0);
    return { show, get: () => cur };
  };

  /* ---------- 测验 ---------- */
  UI.quiz = function (container, opts) {
    const { question, options, correct, explain } = opts;
    const q = UI.el('div', { class: 'quiz-q' }, question);
    const list = UI.el('div');
    const fb = UI.el('div', { class: 'quiz-fb' });
    let done = false;
    options.forEach((opt, i) => {
      const b = UI.el('button', { class: 'quiz-opt', type: 'button' }, String.fromCharCode(65 + i) + '. ' + opt);
      b.addEventListener('click', () => {
        if (done) return;
        done = true;
        [...list.children].forEach(c => c.disabled = true);
        if (i === correct) {
          b.classList.add('correct');
          fb.innerHTML = '<span class="fb-ok">✓ 答对了！</span> ' + (explain || '');
        } else {
          b.classList.add('wrong');
          list.children[correct].classList.add('correct');
          fb.innerHTML = '<span class="fb-no">✗ 再想想～</span> ' + (explain || '');
        }
        if (opts.onDone) opts.onDone(i === correct);
      });
      list.appendChild(b);
    });
    UI.clear(container);
    container.appendChild(q);
    container.appendChild(list);
    container.appendChild(fb);
  };

  /* ---------- 步骤播放器（脚本化步骤） ---------- */
  // opts: { getSteps: () => [{title, body}], interval, onStep }
  UI.stepPlayer = function (container, opts) {
    let steps = [];
    let idx = -1;
    let timer = null;

    function renderSteps() { steps = opts.getSteps(); idx = 0; render(); }
    function render() {
      UI.clear(container);
      const cur = steps[idx];
      // 控制条
      const ctl = UI.el('div', { class: 'stepctl' });
      const btnReset = UI.el('button', { class: 'icon-btn', type: 'button', title: '从头开始' }, '⏮');
      const btnPrev = UI.el('button', { class: 'icon-btn', type: 'button', title: '上一步' }, '◀');
      const btnPlay = UI.el('button', { class: 'icon-btn', type: 'button', title: '自动播放/暂停' }, '▶');
      const btnNext = UI.el('button', { class: 'icon-btn', type: 'button', title: '下一步' }, '▶');
      const btnLast = UI.el('button', { class: 'icon-btn', type: 'button', title: '跳到最后' }, '⏭');
      const cnt = UI.el('span', { class: 'count', html: '第 <b>' + (idx + 1) + '</b> / ' + steps.length + ' 步' });
      const prog = UI.el('div', { class: 'progress' });
      const fill = UI.el('i');
      prog.appendChild(fill);
      fill.style.width = ((idx + 1) / steps.length * 100) + '%';
      function sync() {
        btnPrev.disabled = idx <= 0;
        btnNext.disabled = idx >= steps.length - 1;
        btnReset.disabled = idx <= 0;
        btnLast.disabled = idx >= steps.length - 1;
        cnt.innerHTML = '第 <b>' + (idx + 1) + '</b> / ' + steps.length + ' 步';
        fill.style.width = ((idx + 1) / steps.length * 100) + '%';
        if (opts.onStep) opts.onStep(idx, steps[idx]);
      }
      function stop() { if (timer) { clearInterval(timer); timer = null; btnPlay.textContent = '▶'; } }
      function play() {
        if (timer) { stop(); return; }
        btnPlay.textContent = '⏸';
        timer = setInterval(() => {
          if (idx >= steps.length - 1) { stop(); return; }
          idx++; render();
        }, opts.interval || 2000);
      }
      btnReset.onclick = () => { stop(); renderSteps(); };
      btnPrev.onclick = () => { stop(); if (idx > 0) { idx--; render(); } };
      btnNext.onclick = () => { stop(); if (idx < steps.length - 1) { idx++; render(); } };
      btnLast.onclick = () => { stop(); idx = steps.length - 1; render(); };
      btnPlay.onclick = play;
      ctl.append(btnReset, btnPrev, btnPlay, btnNext, btnLast, cnt, prog);
      container.appendChild(ctl);
      // 标题与内容
      const title = UI.el('div', { class: 'step-title', html: '<span class="idx">' + (idx + 1) + '.</span> ' + UI.esc(cur.title) });
      container.appendChild(title);
      const body = UI.el('div', { class: 'fade-in' });
      body.innerHTML = cur.body;
      container.appendChild(body);
      sync();
    }
    renderSteps();
    return {
      reset: renderSteps,
      goTo: i => { stop(); idx = Math.max(0, Math.min(steps.length - 1, i)); render(); },
      destroy: stop
    };
  };

  /* ---------- 算法走查器（步骤表 + 状态面板） ---------- */
  // opts: {
  //   getSteps: () => data[],
  //   panel: (cur, i) => html —— 寄存器状态面板（随步骤更新）
  //   colLabels: [..] —— 表头
  //   rowCells: (step, i) => [..] 单元格 html（同 colLabels 长度）
  //   explain: (step, i) => html 说明
  //   cellHighlight: (step, i, colIdx) => cls
  //   interval
  // }
  UI.walkthrough = function (container, opts) {
    let steps = [];
    let idx = 0;
    let timer = null;

    function render() {
      UI.clear(container);
      const cur = steps[idx];
      // 控制条
      const ctl = UI.el('div', { class: 'stepctl' });
      const btnReset = UI.el('button', { class: 'icon-btn', type: 'button', title: '从头开始' }, '⏮');
      const btnPrev = UI.el('button', { class: 'icon-btn', type: 'button', title: '上一步' }, '◀');
      const btnPlay = UI.el('button', { class: 'icon-btn', type: 'button', title: '自动播放/暂停' }, '▶');
      const btnNext = UI.el('button', { class: 'icon-btn', type: 'button', title: '下一步' }, '▶');
      const cnt = UI.el('span', { class: 'count', html: '第 <b>' + (idx + 1) + '</b> / ' + steps.length + ' 步' });
      const prog = UI.el('div', { class: 'progress' });
      const fill = UI.el('i');
      prog.appendChild(fill);
      fill.style.width = ((idx + 1) / steps.length * 100) + '%';
      function sync() {
        btnPrev.disabled = idx <= 0;
        btnNext.disabled = idx >= steps.length - 1;
        btnReset.disabled = idx <= 0;
        cnt.innerHTML = '第 <b>' + (idx + 1) + '</b> / ' + steps.length + ' 步';
        fill.style.width = ((idx + 1) / steps.length * 100) + '%';
      }
      function stop() { if (timer) { clearInterval(timer); timer = null; btnPlay.textContent = '▶'; } }
      function play() {
        if (timer) { stop(); return; }
        btnPlay.textContent = '⏸';
        timer = setInterval(() => {
          if (idx >= steps.length - 1) { stop(); return; }
          idx++; render();
        }, opts.interval || 2200);
      }
      btnReset.onclick = () => { stop(); idx = 0; render(); };
      btnPrev.onclick = () => { stop(); if (idx > 0) { idx--; render(); } };
      btnNext.onclick = () => { stop(); if (idx < steps.length - 1) { idx++; render(); } };
      btnPlay.onclick = play;
      ctl.append(btnReset, btnPrev, btnPlay, btnNext, cnt, prog);
      container.appendChild(ctl);

      // 状态面板
      const panel = UI.el('div', { class: 'fade-in' });
      panel.innerHTML = opts.panel(cur, idx);
      container.appendChild(panel);

      // 步骤表（窄屏可横向滚动）
      const tableWrap = UI.el('div', { style: 'overflow-x:auto;margin:8px 0;max-width:100%' });
      const table = UI.el('table', { class: 'steptable' });
      const thead = UI.el('tr');
      (opts.colLabels || []).forEach(l => thead.appendChild(UI.el('th', {}, l)));
      table.appendChild(thead);
      steps.forEach((s, i) => {
        const tr = UI.el('tr', { class: i === idx ? 'cur' : '' });
        opts.rowCells(s, i).forEach((c, ci) => {
          const td = UI.el('td', {});
          if (opts.cellHighlight) {
            const cls = opts.cellHighlight(s, i, ci);
            if (cls) td.className = cls;
          }
          td.innerHTML = c;
          tr.appendChild(td);
        });
        table.appendChild(tr);
      });
      tableWrap.appendChild(table);
      container.appendChild(tableWrap);

      // 说明
      if (opts.explain) {
        const ex = UI.el('div', { class: 'step-explain' });
        ex.innerHTML = opts.explain(cur, idx);
        container.appendChild(ex);
      }
      sync();
    }
    steps = opts.getSteps();
    render();
    return {
      reset: () => { stop(); idx = 0; render(); },
      goTo: i => { stop(); idx = Math.max(0, Math.min(steps.length - 1, i)); render(); },
      destroy: stop
    };
  };

  /* ---------- 章节头 ---------- */
  UI.chapHero = function (color, badge, title, desc, goals) {
    const g = (goals || []).map(x => '<span class="goal-chip">' + x + '</span>').join('');
    return '<div class="chap-hero" style="background:linear-gradient(135deg,' + color[0] + ',' + color[1] + ')">' +
      '<div class="hero-badge">' + badge + '</div>' +
      '<h1>' + title + '</h1><p>' + desc + '</p>' +
      '<div class="hero-goals">' + g + '</div></div>';
  };

  /* ---------- 章节小节 ---------- */
  UI.sec = function (id, title, body, opts) {
    opts = opts || {};
    return '<section id="' + id + '" class="card" style="' + (opts.style || '') + '">' +
      (title ? '<h2 class="sec-title">' + title + '</h2>' : '') +
      body + '</section>';
  };

  global.UI = UI;
})(typeof window !== 'undefined' ? window : globalThis);
