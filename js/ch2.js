/* ============================================================
 * ch2.js —— 第 2 章：定点加法、减法运算
 * 补码加减法、双符号位判溢出、逐位进位动画
 * ============================================================ */
(function (global) {
  'use strict';
  const C = global.Core;
  const U = global.UI;

  /* ---------- 加法列式显示 ---------- */
  // a, b: 9 位双符号位串; carries: 进位数组(9 项, carries[i]=进到第 i 列); result: 9 位和; cur: 当前高亮列
  function addColumns(a, b, result, carries, cur) {
    const n = a.length;
    const labels = ['进位', 'A  ', 'B  ', '和  '];
    return '<div style="text-align:center">' + labels.map((l, r) =>
      '<div style="display:flex;align-items:center;justify-content:center;gap:6px;margin:1px 0">' +
      '<span style="font-size:11px;font-family:var(--mono);color:var(--muted);width:34px;text-align:right">' + l + '</span>' +
      '<span style="display:flex;gap:3px">' +
      (function () {
        let row = '';
        for (let i = n - 1; i >= 0; i--) {
          let cls = 'bit';
          if (i === cur) cls += ' b-lit';
          else cls += ' b-dim';
          let ch;
          if (r === 0) { ch = (i === 0 ? carries[n] || 0 : carries[i]); cls += ' b-carry'; }
          else if (r === 1) { ch = a[i]; if (i >= n - 2) cls += ' b-sign'; }
          else if (r === 2) { ch = b[i]; if (i >= n - 2) cls += ' b-sign'; }
          else { ch = result[i]; if (i >= n - 2) cls += ' b-sign'; cls += ' b-acc'; }
          row += '<span class="' + cls + '">' + ch + '</span>';
        }
        return row;
      })() +
      '</span></div>').join('') + '</div>';
  }

  /* ---------- 计算步骤 ---------- */
  function buildSteps(a, b, isSub) {
    const r = C.addSubSteps(a, b, 8, isSub);
    const steps = [];
    const opSym = isSub ? '−' : '+';

    // 1. 求 [A]补
    steps.push({
      title: '求 [' + a + ']补',
      body: '<p class="para">' + a + (a >= 0 ? ' 是正数，补码就是它本身' : ' 是负数，先求反码再加 1') + '：</p>' +
        U.bitRow('[' + a + ']补', r.aComp) +
        (a < 0 ? U.callout('info', '🔁', '负数补码 = 原码数值位取反 + 1，符号位保持 1。') : '')
    });
    // 2. 求 [B]补 或 [-B]补
    if (!isSub) {
      steps.push({
        title: '求 [' + b + ']补',
        body: '<p class="para">' + b + ' 的补码：</p>' + U.bitRow('[' + b + ']补', r.bOrig) +
          (b < 0 ? U.callout('info', '🔁', '负数补码 = 取反加 1。') : '')
      });
    } else {
      steps.push({
        title: '减法变加法：求 [-' + b + ']补',
        body: '<p class="para">减法没有专门的电路，一律化成加法：<strong class="hl">A − B = A + (−B)</strong>。<br>' +
          '−B 的补码 = B 的补码<strong>连同符号位取反，再 +1</strong>：</p>' +
          U.bitRow('[' + b + ']补', r.bOrig, { highlight: (b !== -128 ? [0, 1, 2, 3, 4, 5, 6, 7].map(i => ({ i, cls: 'b-lit2' })) : []) }) +
          '<div class="flow-row" style="margin:6px 0"><span class="dash-line"></span><span class="tag tag-shift">取反 + 1</span></div>' +
          U.bitRow('[−' + b + ']补', r.bComp) +
          (r.edgeNote ? U.callout('warn', '⚠️', r.edgeNote) : '')
      });
    }
    // 3. 双符号位扩展
    steps.push({
      title: '扩展为双符号位（变形补码）',
      body: '<p class="para">把两个补码各复制一个符号位，得到 <strong class="hl">9 位</strong>的变形补码。多出的符号位专门用来<strong>检测溢出</strong>：</p>' +
        U.bitRow('A', r.aD, { signN: 2 }) +
        U.bitRow('B', r.bD, { signN: 2 }) +
        U.callout('info', '🪞', '规则：<span class="mono">00</span> = 正，<span class="mono">11</span> = 负。两个符号位都参与运算。')
    });
    // 4-12. 逐位相加
    const n = r.sumBits.length;
    for (let i = 0; i < n; i++) {
      const col = n - 1 - i; // 从最低位开始
      const carryIn = i === 0 ? 0 : r.carries[col];
      const carryOut = i === n - 1 ? r.carryOut : r.carries[col + 1];
      const aBit = r.aD[col], bBit = r.bD[col], sBit = r.sumBits[col];
      const sum = (+aBit) + (+bBit) + carryIn;
      steps.push({
        title: '第 ' + (i + 1) + ' 位相加（从右往左第 ' + (i + 1) + ' 列）',
        body:
          '<div style="text-align:center;margin-bottom:10px">' +
          '<span class="tag ' + (col >= n - 2 ? 'tag-warn' : 'tag-add') + '">' + (col >= n - 2 ? '符号位' : '数值位') + '（' +
          (col >= n - 2 ? '权重 ±2^' + (col - (n - 2)) + ' 或 ±1' : '权重 2^' + (col - 1)) + '）</span></div>' +
          addColumns(r.aD, r.bD, r.sumBits, r.carries, col) +
          '<p class="para small" style="margin-top:10px">' + aBit + ' + ' + bBit + ' + 进位 ' + carryIn +
          ' = <strong>' + sum + '</strong>，本位写 <strong>' + (sum % 2) + '</strong>' +
          (sum >= 2 ? '，向高位进 <strong class="hl2">1</strong>' : '，无进位') + '</p>'
      });
    }
    // 13. 判溢出
    steps.push({
      title: '检查双符号位：判溢出',
      body:
        '<p class="para">结果的双符号位是 <span class="mono">' + r.sSign + '</span>：</p>' +
        U.bitRow('结果', r.sumBits, { signN: 2, highlight: [{ i: 0, cls: 'b-lit' }, { i: 1, cls: 'b-lit' }] }) +
        (r.overflow
          ? U.callout('err', '🚨', '双符号位 = <span class="mono">' + r.sSign + '</span> → <strong>' + r.ovType + '</strong>！' +
            (r.sSign === '01' ? '两个正数相加结果却“溢出到符号位”了。' : '两个负数相加结果“太负”了。') +
            '<br>结果已超出 8 位补码范围，答案无效。')
          : U.callout('ok', '✅', '双符号位 = <span class="mono">' + r.sSign + '</span>（00 或 11），一致 → <strong>无溢出</strong>。'))
    });
    // 14. 结果
    steps.push({
      title: '得出结果',
      body:
        (r.overflow
          ? '<p class="para">发生溢出，8 位结果 <span class="mono">' + r.finalBits + '</span> 无效。改用更多位数（如 16 位）即可正确表示 <span class="mono">' + r.expResult + '</span>。</p>'
          : '<p class="para">去掉一个符号位，得到 8 位结果：</p>' +
            U.bitRow('8 位结果', r.finalBits, { signN: 1 }) +
            '<div class="eqbox">' + a + ' ' + opSym + ' ' + b + ' = <span class="hl">' + r.decResult + '</span></div>') +
        '<p class="para small muted">三种判溢出的方法对照：① 双符号位（本演示）：01=上溢、10=下溢；' +
        '② 单符号位：两加数同号而结果异号即溢出；③ 进位法：最高数值位进位 ⊕ 符号位进位 = 1 即溢出。' +
        '（本例：符号位进位 ' + r.carryOut + '，最高数值位进位 ' + (r.carries[n - 2] || 0) + '，' +
        (r.carryOut !== (r.carries[n - 2] || 0) ? '不同 → 溢出' : '相同 → 无溢出') + '）</p>'
    });
    return steps;
  }

  /* ---------- 主交互模块 ---------- */
  function moduleAddSub(host) {
    host.innerHTML =
      '<p class="para">输入两个数（<strong class="hl">-128 ~ 127</strong>），选择加或减，然后一步步看补码运算全过程。试试“溢出”的例子！</p>' +
      '<div class="field">' +
      '<label>A</label><input type="number" class="input" id="a2a" value="25" min="-128" max="127">' +
      '<label>运算</label>' +
      '<select class="input" id="a2op"><option value="+">＋ 加法</option><option value="-">－ 减法</option></select>' +
      '<label>B</label><input type="number" class="input" id="a2b" value="18" min="-128" max="127">' +
      '<button class="btn btn-primary" id="a2go" type="button">⚡ 开始计算</button>' +
      '</div>' +
      '<div class="field small muted">预设例子：' +
      '<button class="btn btn-ghost btn-sm" data-a="25" data-b="18" data-op="+">25+18</button>' +
      '<button class="btn btn-ghost btn-sm" data-a="64" data-b="64" data-op="+">64+64（上溢）</button>' +
      '<button class="btn btn-ghost btn-sm" data-a="-128" data-b="-1" data-op="+">-128+(-1)（下溢）</button>' +
      '<button class="btn btn-ghost btn-sm" data-a="5" data-b="3" data-op="-">5−3</button>' +
      '<button class="btn btn-ghost btn-sm" data-a="-64" data-b="64" data-op="-">-64−64</button>' +
      '<button class="btn btn-ghost btn-sm" data-a="71" data-b="-128" data-op="-">71−(-128)（边界特例）</button>' +
      '</div>' +
      '<div id="a2player"></div>';

    const aIn = host.querySelector('#a2a');
    const bIn = host.querySelector('#a2b');
    const opIn = host.querySelector('#a2op');
    const player = host.querySelector('#a2player');

    function run() {
      let a = +aIn.value, b = +bIn.value;
      if (isNaN(a) || isNaN(b)) return;
      a = Math.max(-128, Math.min(127, Math.round(a)));
      b = Math.max(-128, Math.min(127, Math.round(b)));
      aIn.value = a; bIn.value = b;
      const isSub = opIn.value === '-';
      U.stepPlayer(player, { getSteps: () => buildSteps(a, b, isSub), interval: 2400 });
    }
    host.querySelector('#a2go').addEventListener('click', run);
    host.querySelectorAll('[data-a]').forEach(btn => btn.addEventListener('click', () => {
      aIn.value = btn.dataset.a; bIn.value = btn.dataset.b;
      opIn.value = btn.dataset.op;
      run();
    }));
    run();
  }

  /* ---------- 溢出判断速查 ---------- */
  function moduleOverflow(host) {
    host.innerHTML =
      '<div class="grid2">' +
      '<div>' +
      '<h3 class="sec-title">🪞 双符号位法（最直观）</h3>' +
      '<div class="steptable" style="overflow:hidden"><table class="steptable">' +
      '<tr><th style="font-family:var(--font)">双符号位</th><th style="font-family:var(--font)">含义</th></tr>' +
      '<tr><td>00</td><td style="font-family:var(--font)">正数，无溢出 ✓</td></tr>' +
      '<tr><td>11</td><td style="font-family:var(--font)">负数，无溢出 ✓</td></tr>' +
      '<tr style="background:#fef2f2"><td style="color:#dc2626;font-weight:800">01</td><td style="font-family:var(--font);color:#991b1b">上溢：正数加“爆”了 🚨</td></tr>' +
      '<tr style="background:#fef2f2"><td style="color:#dc2626;font-weight:800">10</td><td style="font-family:var(--font);color:#991b1b">下溢：负数加“爆”了 🚨</td></tr>' +
      '</table></div>' +
      '<div style="margin-top:12px"><div id="ov1"></div></div>' +
      '</div>' +
      '<div>' +
      '<h3 class="sec-title">🚗 进位法（看两个进位）</h3>' +
      '<p class="para small">最高数值位向符号位产生的进位 C₁，与符号位向外的进位 C₂：<br><strong>C₁ ⊕ C₂ = 1 → 溢出</strong>。</p>' +
      '<div id="ov2"></div>' +
      '<h3 class="sec-title" style="margin-top:16px">🧮 单符号位法</h3>' +
      '<p class="para small">两个加数<strong>符号相同</strong>，但结果的符号<strong>相反</strong> → 溢出。</p>' +
      '<div id="ov3"></div>' +
      '</div></div>';

    // 三个小演示
    U.quiz(host.querySelector('#ov1'), {
      question: '判断：64 + 64（8 位）是否溢出？',
      options: ['不溢出，结果是 128', '上溢！128 超出 8 位补码范围', '下溢'],
      correct: 1,
      explain: '双符号位：00 01000000 + 00 01000000 = 01 00000000 → 01 = 上溢。'
    });
    U.quiz(host.querySelector('#ov2'), {
      question: '判断：-64 + (-64)（8 位）是否溢出？',
      options: ['不溢出，结果是 -128 ✓', '上溢', '下溢'],
      correct: 0,
      explain: '符号位进位 C₂=1，最高数值位进位 C₁=1，C₁⊕C₂=0 → 无溢出。-128 恰好能表示。'
    });
    U.quiz(host.querySelector('#ov3'), {
      question: '判断：100 + 28（8 位）是否溢出？',
      options: ['不溢出，结果是 128', '上溢！128 超出范围', '结果是 -128'],
      correct: 1,
      explain: '两个正数相加，结果 10000000 的符号位却是 1（负数）→ 符号相反 → 上溢。'
    });
  }

  /* ---------- 渲染整章 ---------- */
  function render(container) {
    const body =
      U.chapHero(['#0ea5e9', '#2563eb'], '第 2 章', '定点加法、减法运算',
        '“加法和减法，原来用的是同一套电路！”这一章看补码怎么把减法变成加法，以及如何用双符号位一眼看出溢出。',
        ['补码加减', '减法→加法', '双符号位', '溢出判断']) +

      U.sec('ch2-0', '🧠 先建立直觉：为什么减法要变成加法？',
        '<p class="para">造一个“减法器”需要额外的电路，太浪费。聪明的方法是：<strong class="hl">把减号变成加负号</strong>：</p>' +
        '<div class="eqbox">A − B &nbsp;=&nbsp; A + (−B)<br>而 [−B]<sub>补</sub> = [B]<sub>补</sub> 取反加 1</div>' +
        '<p class="para">所以计算机里只有“加法器”，减法、乘法、除法全都建立在加法之上。这就是补码最重要的价值：<strong>把符号也变成数，统一运算规则</strong>。</p>' +
        '<div class="row">' +
        '<div class="col">' + U.callout('info', '📌', '补码加法的规则只有一条：<span class="mono">[x+y]补 = [x]补 + [y]补</span>（连同符号位一起加，进位丢掉）。') + '</div>' +
        '<div class="col">' + U.callout('warn', '⚠️', '注意：结果超出表示范围就叫<strong>溢出</strong>（比如 8 位存不下 128）。溢出≠进位！溢出时结果是错的，必须检测。') + '</div>' +
        '</div>') +

      U.sec('ch2-1', '🕹️ 交互实验：补码加减法计算器', '<div id="m1"></div>') +

      U.sec('ch2-2', '🚨 溢出判断三方法', '<div id="m2"></div>') +

      U.sec('ch2-3', '🎬 减法动画：取反加 1 的秘密',
        '<p class="para">为什么 −B 的补码要“取反加 1”？用 <span class="mono">5 − 3</span> 感受一下：</p>' +
        '<div id="m3"></div>') +

      U.sec('ch2-4', '🧪 小测验', '<div id="quiz1"></div><div id="quiz2" style="margin-top:16px"></div>');

    container.innerHTML = body;
    moduleAddSub(container.querySelector('#m1'));
    moduleOverflow(container.querySelector('#m2'));
    // 减法动画
    {
      const host = container.querySelector('#m3');
      U.stepPlayer(host, {
        interval: 2800,
        getSteps: () => [
          {
            title: '减法：5 − 3',
            body: '<p class="para">直接算减法很难，换成：</p><div class="eqbox">5 − 3 = 5 + (−3)</div>'
          },
          {
            title: '求 −3 的补码',
            body:
              '<p class="para">[3]<sub>补</sub> = <span class="mono">00000011</span>。把它<strong>连同符号位取反</strong>：</p>' +
              U.bitRow('[3]补', '00000011') +
              '<div class="flow-row" style="margin:6px 0"><span class="dash-line"></span><span class="tag tag-shift">取反</span></div>' +
              U.bitRow('取反后', '11111100', { highlight: [0, 1, 2, 3, 4, 5, 6, 7].map(i => ({ i, cls: 'b-lit2' })) })
          },
          {
            title: '再加 1',
            body:
              '<div class="eqbox">11111100<br>+&nbsp;00000001<br>──────<br><span class="hl">11111101</span></div>' +
              U.bitRow('[−3]补', '11111101', { signN: 1 }) +
              U.callout('ok', '✅', '于是 [−3]<sub>补</sub> = <span class="mono">11111101</span> = -3 ✓')
          },
          {
            title: '相加：5 + (−3)',
            body:
              '<div class="eqbox">00000101&nbsp;（5）<br>+&nbsp;11111101&nbsp;（-3）<br>──────<br>100000010 → 丢掉进位 → <span class="hl">00000010</span></div>' +
              U.bitRow('结果', '00000010', { signN: 1 }) +
              U.callout('ok', '🎉', '<span class="mono">00000010</span> = <strong>2</strong>，5 − 3 = 2 ✓。进位 1 直接丢掉，因为它是 2⁸ 位，超出了 8 位。')
          }
        ]
      });
    }
    U.quiz(container.querySelector('#quiz1'), {
      question: 'Q1. 8 位补码运算：100 + 28 的结果是？',
      options: ['128（正确）', '10000000，即 -128，发生了上溢', '127'],
      correct: 1,
      explain: '01100100 + 00011100 = 10000000，双符号位变 01 → 上溢，结果是无效的 -128。'
    });
    U.quiz(container.querySelector('#quiz2'), {
      question: 'Q2. 减法 8 − 6 在计算机里实际执行的是？',
      options: ['8 + (−6) 的补码加法', '8 − 6 的真值减法', '直接对 8 和 6 的原码做减法'],
      correct: 0,
      explain: '减法一律转换成“加负数补码”。[−6]补 = 11111010，8 + (−6) = 00001000 + 11111010 = 00000010 = 2 ✓'
    });
  }

  global.CH2 = { render };
})(typeof window !== 'undefined' ? window : globalThis);
