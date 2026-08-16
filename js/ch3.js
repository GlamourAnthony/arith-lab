/* ============================================================
 * ch3.js —— 第 3 章：定点乘法运算
 * 乘法原理、原码一位乘法、Booth 补码一位乘法
 * ============================================================ */
(function (global) {
  'use strict';
  const C = global.Core;
  const U = global.UI;

  /* ---------- 竖式乘法原理动画 ---------- */
  function modulePrinciple(host) {
    host.innerHTML = '<div id="p1"></div>';
    const box = host.querySelector('#p1');
    const rows = [
      ['0.1101', '被乘数 x'],
      ['0.1011', '乘数 y'],
      ['0.1101', 'y₄=1 → 抄被乘数'],
      ['0.0000', 'y₃=0 → 全 0'],
      ['0.1101', 'y₂=1 → 左移 2 位'],
      ['0.1101', 'y₁=1 → 左移 3 位'],
      ['0.10001111', '求和 = x × y']
    ];
    U.stepPlayer(box, {
      interval: 2600,
      getSteps: () => rows.map((r, i) => ({
        title: i === 0 ? '竖式乘法：和小学学的一模一样' : r[1],
        body:
          (i === 0 ? '<p class="para">0.1101 × 0.1011，按小学竖式展开：乘数的每一位去乘被乘数，再按位错开相加：</p>' : '') +
          '<div class="eqbox" style="white-space:pre">' +
          ['  0.1101', '× 0.1011', '──────', ...rows.slice(2, 6).map((r2, j) => (j === i - 2 ? '<span class="hl">' + r2[0] + '</span>' : '<span class="dim">' + r2[0] + '</span>'))].join('\n') +
          '</div>' +
          (i === 6 ? U.callout('ok', '🎉', '结果是 <span class="mono">0.10001111</span>。但问题来了：计算机一次只能看<strong>一位</strong>乘数、做一个加法、移一次位——这就是下面的“一位乘法”算法。') : '')
      }))
    });
  }

  /* ---------- 原码一位乘法走查 ---------- */
  function moduleSignMag(host) {
    host.innerHTML =
      '<div class="field">' +
      '<label>被乘数 x</label>' +
      '<select class="input" id="sxsign"><option value="0">+</option><option value="1">−</option></select>' +
      '<select class="input" id="sxmag">' +
      ['1101', '1011', '1100', '1111', '1001', '1010', '0111', '1110'].map(m =>
        '<option value="' + m + '">0.' + m + '</option>').join('') + '</select>' +
      '<label>乘数 y</label>' +
      '<select class="input" id="sysign"><option value="0">+</option><option value="1">−</option></select>' +
      '<select class="input" id="symag">' +
      ['1011', '1101', '1001', '1110', '1100', '0111', '1010', '1111'].map(m =>
        '<option value="' + m + '">0.' + m + '</option>').join('') + '</select>' +
      '<button class="btn btn-primary" id="sgGo" type="button">▶ 走查</button>' +
      '</div>' +
      '<div id="sgOut"></div>';

    const xsign = host.querySelector('#sxsign'), xmag = host.querySelector('#sxmag');
    const ysign = host.querySelector('#sysign'), ymag = host.querySelector('#symag');
    const out = host.querySelector('#sgOut');

    function run() {
      const xs = xsign.value, ys = ysign.value;
      const r = C.mulSignMag(xmag.value, ymag.value);
      const signBit = (xs === '1') ^ (ys === '1') ? '1' : '0';
      const signNote = '符号位单独处理：xs ⊕ ys = ' + xs + ' ⊕ ' + ys + ' = <strong>' + signBit + '</strong>' +
        (signBit === '1' ? '（结果取负）' : '（结果取正）');
      const prodVal = C.binToFrac(r.product);

      U.walkthrough(out, {
        interval: 2600,
        colLabels: ['步骤', '乘数最低位 q₀', '操作', '部分积（加后）', '右移后 部分积', '右移后 乘数'],
        getSteps: () => r.steps,
        panel: (cur, i) => {
          const left = r.steps.length - cur.i;
          let hiP = [];
          if (cur.action === 'add') hiP.push({ i: 0, cls: 'b-lit2' });
          hiP.push({ i: cur.newP.length - 1, cls: 'b-lit' });
          let hiQ = [];
          if (cur.newQ.length) hiQ.push({ i: cur.newQ.length - 1, cls: 'b-lit3' });
          return '<div style="display:flex;flex-wrap:wrap;gap:14px;justify-content:center;align-items:flex-start">' +
            '<div class="reg"><span class="reg-name">被乘数 A = 0.' + r.xMag + '</span>' +
            U.bitRow('', '0' + r.xMag, { keepZero: true }) + '</div>' +
            '<div class="reg"><span class="reg-name">部分积 P（加后）</span>' +
            U.bitRow('', cur.P, { keepZero: true, highlight: hiP }) + '</div>' +
            '<div class="reg"><span class="reg-name">乘数 Q（加后）</span>' +
            U.bitRow('', cur.Q, { keepZero: true, highlight: hiQ }) + '</div>' +
            '<div class="reg"><span class="reg-name">剩余次数</span>' +
            '<div style="text-align:center;font-family:var(--mono);font-size:26px;color:var(--primary);font-weight:800">' + left + '</div></div>' +
            '</div>' +
            U.callout('info', '🧮', signNote);
        },
        rowCells: (s) => [
          '<b>' + s.i + '</b>',
          '<span class="tag ' + (s.q0 === '1' ? 'tag-add' : 'tag-noop') + '">' + s.q0 + '</span>',
          '<span class="tag ' + (s.action === 'add' ? 'tag-add' : 'tag-noop') + '">' + (s.action === 'add' ? '加被乘数' : '不加（保持）') + '</span>',
          s.P,
          s.newP,
          s.newQ
        ],
        cellHighlight: (s, i, ci) => {
          if (i === 0) return;
          const map = { 1: 'b-lit3', 2: 'b-lit2', 3: 'b-lit2', 4: 'b-lit', 5: 'b-lit' };
          return map[ci];
        },
        explain: (s) => {
          const addTxt = s.action === 'add'
            ? '乘数最低位 = <strong>1</strong> → 部分积 <strong>加被乘数</strong>：' + s.P + '（有进位' + (s.carry ? ' 1' : ' 0') + '）'
            : '乘数最低位 = <strong>0</strong> → 部分积保持不变：' + s.P;
          return '<b>第 ' + s.i + ' 步：</b>' + addTxt +
            '。<br>然后 <strong>逻辑右移一位</strong>：部分积 = ' + s.newP + '，乘数 = ' + s.newQ +
            '（部分积的最低位“流进”了乘数最高位）。重复 4 次后，乘积就藏在两个寄存器里了。';
        }
      });
    }
    host.querySelector('#sgGo').addEventListener('click', run);
    run();
  }

  /* ---------- Booth 算法走查 ---------- */
  function moduleBooth(host) {
    host.innerHTML =
      '<div class="field">' +
      '<label>x（补码）</label>' +
      '<select class="input" id="bx">' +
      '<option value="01101">[0.1101]补</option>' +
      '<option value="01011">[0.1011]补</option>' +
      '<option value="10011">[-0.1101]补</option>' +
      '<option value="10101">[-0.1011]补</option>' +
      '<option value="01100">[0.1100]补</option>' +
      '</select>' +
      '<label>y（补码）</label>' +
      '<select class="input" id="by">' +
      '<option value="10101">[-0.1011]补</option>' +
      '<option value="01101">[0.1101]补</option>' +
      '<option value="10011">[-0.1101]补</option>' +
      '<option value="01011">[0.1011]补</option>' +
      '<option value="10100">[-0.1100]补</option>' +
      '</select>' +
      '<button class="btn btn-primary" id="boGo" type="button">▶ 走查</button>' +
      '</div>' +
      '<div id="boOut"></div>';

    const bx = host.querySelector('#bx'), by = host.querySelector('#by');
    const out = host.querySelector('#boOut');

    function run() {
      const r = C.mulBooth(bx.value, by.value);
      const xv = C.fixCompToFrac(r.xComp), yv = C.fixCompToFrac(r.yComp);
      const prodBits = r.product;
      const prodVal = C.fixCompToFrac(prodBits);

      U.walkthrough(out, {
        interval: 2800,
        colLabels: ['步骤', '(y₀, y₋₁)', '操作', '部分积（加后）', '右移后 部分积', '右移后 乘数', '附加位 y₋₁'],
        getSteps: () => r.steps,
        panel: (cur, i) => {
          let hiP = [{ i: 0, cls: 'b-lit2' }];
          if (cur.action !== 'noop') hiP.push({ i: 0, cls: 'b-lit2' });
          let hiY = [{ i: cur.Y.length - 1, cls: 'b-lit' }];
          let hiE = [];
          if (!cur.last) hiE.push({ i: 0, cls: 'b-lit3' });
          return '<div style="display:flex;flex-wrap:wrap;gap:12px;justify-content:center;align-items:flex-start">' +
            '<div class="reg"><span class="reg-name">[x]补 = ' + r.xComp + '</span>' +
            U.bitRow('', r.xComp, { keepZero: true, signN: 1 }) + '</div>' +
            '<div class="reg"><span class="reg-name">[−x]补 = ' + r.negX + '</span>' +
            U.bitRow('', r.negX, { keepZero: true, signN: 1 }) + '</div>' +
            '<div class="reg"><span class="reg-name">部分积 P（加后）</span>' +
            U.bitRow('', cur.P, { keepZero: true, signN: 1, highlight: hiP }) + '</div>' +
            '<div class="reg"><span class="reg-name">乘数 Y（加后）</span>' +
            U.bitRow('', cur.Y, { keepZero: true, signN: 1, highlight: hiY }) + '</div>' +
            '<div class="reg"><span class="reg-name">附加位 y₋₁</span>' +
            U.bitRow('', cur.yE, { keepZero: true, highlight: hiE }) + '</div>' +
            '</div>' +
            '<div style="text-align:center;margin-top:8px">' +
            '<span class="tag tag-ok">x = ' + xv + '（' + r.xComp + '）</span> ' +
            '<span class="tag tag-warn">y = ' + yv + '（' + r.yComp + '）</span> ' +
            '<span class="tag tag-add">[x·y]补 = ' + prodBits + '（' + prodVal.toFixed(6) + '）</span>' +
            '</div>';
        },
        rowCells: (s) => [
          '<b>' + s.i + '</b>' + (s.last ? '<br><span class="small muted">(最后一步不移位)</span>' : ''),
          '<span class="mono" style="font-weight:700">(' + s.pair[0] + ', ' + s.pair[1] + ')</span>',
          '<span class="tag ' + (s.action === 'noop' ? 'tag-noop' : s.action === 'addX' ? 'tag-add' : 'tag-alert') + '">' +
          (s.action === 'noop' ? '不加' : s.action === 'addX' ? '加 [x]补' : '加 [−x]补') + '</span>',
          s.P,
          s.last ? '<span class="muted">—</span>' : s.newP,
          s.last ? '<span class="muted">—</span>' : s.newY,
          s.last ? '<span class="muted">—</span>' : s.newYE
        ],
        explain: (s) => {
          const pairDesc = s.pair === '00' || s.pair === '11' ? '相邻两位相同 → 部分积不动'
            : s.pair === '01' ? '从 0 变 1（上升沿）→ 加 [x]补'
              : '从 1 变 0（下降沿）→ 加 [−x]补';
          return '<b>第 ' + s.i + ' 步：</b>看乘数最低位 y₀ = <strong>' + s.pair[0] + '</strong> 与附加位 y₋₁ = <strong>' + s.pair[1] + '</strong>：' + pairDesc +
            (s.action !== 'noop' ? ' → 部分积变为 <strong>' + s.P + '</strong>' : '，部分积仍为 <strong>' + s.P + '</strong>') +
            (s.last ? '。<br><strong>最后一步不加移位</strong>，直接把 P 和 Y 拼起来就是乘积：' + r.product + '。'
              : '。<br>然后<strong>算术右移一位</strong>（符号位补 1/0），P 的最低位流入 Y 最高位，Y 最低位流入附加位。');
        }
      });
    }
    host.querySelector('#boGo').addEventListener('click', run);
    run();
  }

  /* ---------- 渲染整章 ---------- */
  function render(container) {
    const body =
      U.chapHero(['#f59e0b', '#ea580c'], '第 3 章', '定点乘法运算',
        '乘法器不会“背九九乘法表”，它只会：加一次、移一位、再看一位。这一章把原码一位乘法和 Booth 算法拆成一步步的动画。',
        ['乘法原理', '原码一位乘法', 'Booth 算法', '部分积', '移位']) +

      U.sec('ch3-0', '🧠 先建立直觉：乘法 = 加 + 移',
        '<p class="para">任何乘法都可以拆成“<strong class="hl">加一次、移一位</strong>”的循环。计算机正是这么干的——它只需要一个加法器。</p>' +
        '<div id="p1"></div>') +

      U.sec('ch3-1', '🎬 原码一位乘法（符号单独处理）',
        '<p class="para"><strong>思路</strong>：数值部分照“加 + 移”做 4 遍；符号位最后用<strong>异或</strong>单独算。<br>' +
        '<strong>规则</strong>：每步看乘数最低位——是 1 就加被乘数，是 0 就跳过；然后部分积和乘数一起<strong>逻辑右移</strong>一位。</p>' +
        '<div id="m1"></div>') +

      U.sec('ch3-2', '🎬 Booth 算法（补码一位乘法）',
        '<p class="para">原码乘法要先判符号、还要处理绝对值，麻烦。Booth 算法让<strong class="hl">符号位直接参与运算</strong>，一步到位。<br>' +
        '<strong>规则</strong>：比较乘数最低位 y₀ 与附加位 y₋₁——<span class="mono">00/11</span> 不加，<span class="mono">01</span> 加 [x]补，<span class="mono">10</span> 加 [−x]补；然后<strong>算术右移</strong>；共做 n+1 步，最后一步不移位。</p>' +
        '<div id="m2"></div>') +

      U.sec('ch3-3', '💡 为什么 Booth 要“看两位”？',
        '<p class="para">看两位其实是看“<strong>变化沿</strong>”：乘数里连续的一段 1（比如 <span class="mono">0111</span>）可以写成 <span class="mono">1000 − 1</span>。' +
        'Booth 把“加一串 1”优化成“加一次、减一次”，还顺带把符号位也处理了——所以它又快又统一。</p>' +
        '<div class="eqbox">0111 = 1000 − 1 &nbsp;⟹&nbsp; 加被乘数×7 = 加×8 再减×1</div>' +
        '<p class="para small muted">这也是为什么 01（0→1，开始一段 1）要“加”，10（1→0，结束一段 1）要“减”。</p>') +

      U.sec('ch3-4', '🧪 小测验', '<div id="quiz1"></div><div id="quiz2" style="margin-top:16px"></div>');

    container.innerHTML = body;
    modulePrinciple(container.querySelector('#p1'));
    moduleSignMag(container.querySelector('#m1'));
    moduleBooth(container.querySelector('#m2'));

    U.quiz(container.querySelector('#quiz1'), {
      question: 'Q1. 原码一位乘法中，每步先看乘数的哪一位？',
      options: ['最高位', '最低位（最右边）', '符号位', '任意一位'],
      correct: 1,
      explain: '从最低位开始逐位处理，处理完右移一位，下一位“滚”到最低位。'
    });
    U.quiz(container.querySelector('#quiz2'), {
      question: 'Q2. Booth 算法中，(y₀, y₋₁) = (1, 0) 时应该？',
      options: ['加 [x]补', '加 [−x]补', '不加', '右移两次'],
      correct: 1,
      explain: '10 表示乘数从 1 变 0（一段连续的 1 结束）→ 加 [−x]补。'
    });
  }

  global.CH3 = { render };
})(typeof window !== 'undefined' ? window : globalThis);
