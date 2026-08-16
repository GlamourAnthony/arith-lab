/* ============================================================
 * ch5.js —— 第 5 章：定点运算器的组成
 * 全加器、串行/并行进位、74181、运算器数据流、标志位
 * ============================================================ */
(function (global) {
  'use strict';
  const C = global.Core;
  const U = global.UI;

  /* ---------- 全加器交互 ---------- */
  function moduleFullAdder(host) {
    host.innerHTML =
      '<div class="grid2">' +
      '<div>' +
      '<p class="para">全加器是运算器的“原子”。点三位输入，看输出：</p>' +
      '<div class="field">' +
      '<label>a</label><button class="icon-btn" id="faA" type="button">0</button>' +
      '<label>b</label><button class="icon-btn" id="faB" type="button">0</button>' +
      '<label>进位 c<sub>in</sub></label><button class="icon-btn" id="faC" type="button">0</button>' +
      '</div>' +
      '<div class="eqbox" id="faOut">0 + 0 + 0 = 0<br>进位输出 = 0</div>' +
      '</div>' +
      '<div>' +
      '<h3 class="sec-title">全加器真值表</h3>' +
      '<table class="steptable" style="font-family:var(--font)">' +
      '<tr><th>a</th><th>b</th><th>c<sub>in</sub></th><th>和 s</th><th>c<sub>out</sub></th></tr>' +
      [[0, 0, 0, 0, 0], [0, 0, 1, 1, 0], [0, 1, 0, 1, 0], [0, 1, 1, 0, 1],
      [1, 0, 0, 1, 0], [1, 0, 1, 0, 1], [1, 1, 0, 0, 1], [1, 1, 1, 1, 1]]
        .map(r => '<tr>' + r.map(x => '<td>' + x + '</td>').join('') + '</tr>').join('') +
      '</table>' +
      U.callout('info', '🧱', 's = a⊕b⊕c<sub>in</sub>，c<sub>out</sub> = ab + (a⊕b)·c<sub>in</sub>。多个全加器串起来就是 n 位加法器。')
      + '</div></div>';

    const ba = host.querySelector('#faA'), bb = host.querySelector('#faB'), bc = host.querySelector('#faC');
    const out = host.querySelector('#faOut');
    function paint() {
      const a = +ba.textContent, b = +bb.textContent, cin = +bc.textContent;
      const s = a ^ b ^ cin;
      const cout = (a & b) | ((a ^ b) & cin);
      out.innerHTML = a + ' + ' + b + ' + 进位' + cin + ' = <span class="hl">' + s + '</span><br>进位输出 c<sub>out</sub> = <span class="hl">' + cout + '</span>';
    }
    [ba, bb, bc].forEach(btn => btn.addEventListener('click', () => {
      btn.textContent = btn.textContent === '0' ? '1' : '0';
      btn.classList.toggle('b-lit', btn.textContent === '1');
      paint();
    }));
    paint();
  }

  /* ---------- 进位方式动画 ---------- */
  function moduleCarry(host) {
    host.innerHTML =
      '<p class="para">4 位加法器怎么算 <span class="mono">1010 + 0011</span>？关键在<strong class="hl">进位</strong>怎么传：</p>' +
      '<div id="carryTabs"></div>';

    U.tabs(host.querySelector('#carryTabs'), [
      {
        label: '🪜 串行进位（慢）',
        render(panel) {
          panel.innerHTML =
            '<p class="para small">进位像接力棒，必须从第 0 位<strong>一位一位传</strong>到最高位：总时间 = 位数 × 每级延迟。</p>' +
            '<div id="rippleBox"></div>';
          const box = panel.querySelector('#rippleBox');
          const bits = ['1010', '0011'];
          const sum = C.binAdd('1010', '0011');
          let html = '<div style="display:flex;gap:6px;justify-content:center;align-items:flex-end;flex-wrap:wrap">';
          for (let i = 3; i >= 0; i--) {
            html += '<div style="text-align:center">' +
              '<div class="tag ' + (i === 0 ? 'tag-alert' : 'tag-noop') + '" id="car' + i + '" style="display:block;margin-bottom:4px">' + (i === 0 ? 'C₀ 进' : '') + '</div>' +
              '<div class="reg" style="min-width:52px"><span class="reg-name">位' + i + '</span>' +
              '<div style="font-family:var(--mono);font-size:18px;font-weight:700" id="add' + i + '">' + bits[0][3 - i] + '+' + bits[1][3 - i] + '</div>' +
              '<div style="font-family:var(--mono);font-size:15px;color:#059669" id="sum' + i + '">=·</div>' +
              '</div>' +
              (i > 0 ? '<div style="height:14px;width:2px;background:var(--line-2);margin:0 auto"></div>' : '') +
              '</div>';
          }
          html += '</div>';
          box.innerHTML = html;
          const rows = ['C', 'A', 'B', 'S'];
          const carries = sum.carries, sumBits = sum.sum;
          // 逐位脉冲动画
          const els = [0, 1, 2, 3].map(i => ({
            carry: box.querySelector('#car' + i),
            sum: box.querySelector('#sum' + i),
            add: box.querySelector('#add' + i)
          }));
          let t = 0;
          for (let i = 0; i < 4; i++) {
            const cin = i === 0 ? 0 : carries[3 - i + 1]; // 进到这一位的进位
            (function (i, cin) {
              setTimeout(() => {
                els[i].add.style.color = '#4f46e5';
                els[i].add.style.fontWeight = '800';
                els[i].carry.textContent = 'C' + (cin ? '₀=1' : '₀=0');
                els[i].carry.className = 'tag tag-warn';
                els[i].sum.textContent = '=' + sumBits[3 - i];
                els[i].sum.style.fontSize = '18px';
                els[i].sum.style.fontWeight = '800';
                setTimeout(() => {
                  if (i < 3) {
                    const cout = carries[3 - i];
                    els[i + 1].carry.textContent = 'C' + (cout ? '₀=1↑' : '₀=0');
                    els[i + 1].carry.className = 'tag tag-alert';
                  }
                }, 500);
              }, t);
            })(i, cin);
            t += 700;
          }
        }
      },
      {
        label: '⚡ 先行进位（快）',
        render(panel) {
          panel.innerHTML =
            '<p class="para small">进位<strong>不用等</strong>，每一位的进位直接用公式算出来（Cₙ 只由输入决定）：</p>' +
            '<div class="eqbox">C₁ = G₀ + P₀C₀<br>C₂ = G₁ + P₁G₀ + P₁P₀C₀<br>C₃ = G₂ + P₂G₁ + P₂P₁G₀ + P₂P₁P₀C₀<br>C₄ = G₃ + P₃G₂ + P₃P₂G₁ + P₃P₂P₁G₀ + P₃P₂P₁P₀C₀</div>' +
            '<p class="para small">其中 Gᵢ = aᵢbᵢ（生成进位），Pᵢ = aᵢ⊕bᵢ（传递进位）。所有进位<strong>同时</strong>算好，总时间 ≈ 常数。</p>' +
            '<div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin-top:8px">' +
            [0, 1, 2, 3].map(i =>
              '<div class="reg" style="min-width:70px"><span class="reg-name">位 ' + i + '</span>' +
              '<div class="small" style="text-align:center">G=' + (bits(i)) + '</div>' +
              '<div class="small" style="text-align:center">P=' + (bits2(i)) + '</div>' +
              '<div style="text-align:center;font-family:var(--mono);font-weight:800;color:#7c3aed">C=' + (Cout(i)) + '</div></div>').join('') +
            '</div>' +
            U.callout('ok', '🚀', '74181 内部用的就是这种先行进位（CLA），所以它能在极短时间里算完 4 位加/减。');
          function bits(i) {
            const a = 3, b = 2;
            const ai = (a >> i) & 1, bi = (b >> i) & 1;
            return (ai & bi);
          }
          function bits2(i) {
            const a = 3, b = 2;
            const ai = (a >> i) & 1, bi = (b >> i) & 1;
            return (ai ^ bi);
          }
          function Cout(i) {
            const r = C.binAdd('1010', '0011');
            return i === 3 ? r.carryOut : r.carries[3 - i];
          }
        }
      }
    ]);
  }

  /* ---------- 74181 ALU 交互 ---------- */
  function module74181(host) {
    host.innerHTML =
      '<p class="para">74181 是一颗经典的 4 位 ALU 芯片：选 <strong>S₃S₂S₁S₀</strong>（功能码）、<strong>M</strong>（逻辑/算术）和进位，它就输出结果 F。</p>' +
      '<div class="grid2">' +
      '<div>' +
      '<div class="field"><label>A</label><span id="alA"></span></div>' +
      '<div class="field"><label>B</label><span id="alB"></span></div>' +
      '<div class="field"><label>M</label><select class="input" id="alM"><option value="0">0 = 算术运算</option><option value="1">1 = 逻辑运算</option></select>' +
      '<label>进位 C<sub>n</sub></label><select class="input" id="alCn"><option value="0">0 = 无进位</option><option value="1">1 = 有进位</option></select></div>' +
      '<div class="field"><label>S =</label><span id="alS"></span></div>' +
      '<div class="field"><label>F</label><span id="alF"></span></div>' +
      '<div id="alInfo"></div>' +
      '</div>' +
      '<div>' +
      '<h3 class="sec-title">常用功能快捷按钮</h3>' +
      '<div class="field" style="gap:6px" id="alPresets"></div>' +
      '<h3 class="sec-title" style="margin-top:14px">功能码表（节选）</h3>' +
      '<div style="max-height:260px;overflow:auto"><table class="steptable" id="alTable" style="font-family:var(--font)"></table></div>' +
      '</div></div>';

    const A = host.querySelector('#alA'), B = host.querySelector('#alB');
    const S = host.querySelector('#alS'), F = host.querySelector('#alF');
    const M = host.querySelector('#alM'), Cn = host.querySelector('#alCn');
    const info = host.querySelector('#alInfo');
    const presets = host.querySelector('#alPresets');
    const table = host.querySelector('#alTable');

    let aBits = '1010', bBits = '0011', sBits = '1001';

    function makeBitBtns(hostEl, get, set, cb) {
      function paint() {
        const s = get();
        hostEl.innerHTML = s.split('').map((b, i) =>
          '<button class="bit ' + (b === '1' ? 'b-data' : 'b-zero') + '" data-i="' + i + '" type="button" style="cursor:pointer">' + b + '</button>').join('');
        hostEl.querySelectorAll('button').forEach(btn => btn.addEventListener('click', () => {
          const arr = get().split('');
          arr[+btn.dataset.i] = arr[+btn.dataset.i] === '0' ? '1' : '0';
          set(arr.join(''));
          paint();
          if (cb) cb();
        }));
      }
      paint();
    }
    makeBitBtns(A, () => aBits, v => { aBits = v; }, paint);
    makeBitBtns(B, () => bBits, v => { bBits = v; }, paint);
    makeBitBtns(S, () => sBits, v => { sBits = v; }, paint);

    function fmt(bitsStr) {
      return '<span style="display:inline-flex;gap:2px">' + bitsStr.split('').map(b =>
        '<span class="bit ' + (b === '1' ? 'b-data' : 'b-zero') + '" style="min-width:22px;height:26px;font-size:12px">' + b + '</span>').join('') + '</span>';
    }

    function paint() {
      const r = C.alu74181(sBits, +M.value, +Cn.value, aBits, bBits);
      F.innerHTML = fmt(r.f) + ' &nbsp; <span class="tag ' + (M.value === '1' ? 'tag-add' : 'tag-warn') + '">' + r.name + '</span>' +
        ' <span class="mono small">F = 0x' + r.fHex + ' = ' + r.fDec + '</span>';
      info.innerHTML = U.callout('info', '🔬', '当前功能码 <span class="mono">S=' + sBits + '</span>，' + (M.value === '1' ? '逻辑运算' : '算术运算' + (Cn.value === '1' ? '（有进位）' : '（无进位）')) +
        '：<br><strong>' + r.formula + '</strong>');
      // 功能表
      const rows = (M.value === '1' ? C.T74181_LOGIC : C.T74181_ARITH).map(row => {
        const s = row[0];
        const formula = M.value === '1' ? row[1] : (Cn.value === '1' ? row[2] : row[1]);
        return '<tr' + (s === sBits ? ' class="cur"' : '') + '><td>' + s + '</td><td style="font-family:var(--font)">' + formula + '</td></tr>';
      }).join('');
      table.innerHTML = '<tr><th>S₃S₂S₁S₀</th><th style="font-family:var(--font)">' + (M.value === '1' ? '逻辑功能（M=1）' : '算术功能（M=0' + (Cn.value === '1' ? '，有进位' : '，无进位') + '）') + '</th></tr>' + rows;
    }
    M.addEventListener('change', paint);
    Cn.addEventListener('change', paint);

    const presetsList = [
      ['1001', 0, 0, '加法 F = A + B'],
      ['0110', 0, 1, '减法 F = A − B'],
      ['0110', 1, 0, '异或 F = A⊕B'],
      ['1011', 1, 0, '与 F = A·B'],
      ['1110', 1, 0, '或 F = A+B'],
      ['0000', 1, 0, '非 F = ¬A'],
      ['1100', 0, 0, '左移一位 F = A+A'],
      ['1111', 0, 0, '减一 F = A−1']
    ];
    presetsList.forEach(p => {
      const btn = U.el('button', { class: 'btn btn-ghost btn-sm', type: 'button' }, p[3]);
      btn.addEventListener('click', () => {
        sBits = p[0]; M.value = p[1]; Cn.value = p[2];
        makeBitBtns(S, () => sBits, v => { sBits = v; }, paint);
        paint();
      });
      presets.appendChild(btn);
    });
    paint();
  }

  /* ---------- 运算器数据流动画 ---------- */
  function moduleDataflow(host) {
    host.innerHTML =
      '<p class="para">运算器 = <strong class="hl">ALU（算逻单元）</strong> + <strong class="hl">寄存器组</strong> + <strong class="hl">内部总线</strong>。' +
      '打个比方：ALU 是“厨房”，寄存器是“冰箱”，总线是“传送带”。点下面的操作按钮，看数据怎么流动：</p>' +
      '<div id="dfBox" style="text-align:center"></div>' +
      '<div class="field" style="justify-content:center" id="dfBtns"></div>' +
      '<div id="dfLog"></div>';

    const box = host.querySelector('#dfBox');
    const btns = host.querySelector('#dfBtns');
    const log = host.querySelector('#dfLog');

    const regs = {
      ACC: { bits: '00001100', desc: '累加器（放加数/结果）' },
      MQ: { bits: '10110000', desc: '乘商寄存器' },
      X: { bits: '00000101', desc: '操作数寄存器' },
      DR: { bits: '11111111', desc: '数据缓冲寄存器（接内存）' }
    };

    function renderRegs(active, val) {
      let html = '<div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">';
      for (const name in regs) {
        const bits = name === 'ACC' && val != null ? val : regs[name].bits;
        const hot = active === name;
        html += '<div class="reg" style="' + (hot ? 'border-color:#f59e0b;box-shadow:0 0 0 3px rgba(245,158,11,.25)' : '') + '">' +
          '<span class="reg-name">' + name + '</span>' +
          U.bitRow('', bits, { keepZero: true, signN: 1 }) +
          '<span class="small muted" style="text-align:center">' + regs[name].desc + '</span></div>';
      }
      html += '</div>';
      return html;
    }
    function aluBox(hot) {
      return '<div class="reg" style="min-width:180px;' + (hot ? 'border-color:#4f46e5;box-shadow:0 0 0 3px rgba(99,102,241,.3)' : '') + '">' +
        '<span class="reg-name">ALU 算逻单元</span>' +
        '<div style="text-align:center;font-size:13px">运算：<b>加 / 减 / 与 / 或 / 异或</b></div>' +
        '<div style="text-align:center;font-size:12px;color:var(--muted)">+ 标志寄存器（ZF SF CF OF）</div></div>';
    }

    const ops = [
      { label: '加法：ACC + X → ACC', run: ['ACC', 'X', 'ALU', 'ACC'], do: () => (C.twoCompToInt('00001100') + C.twoCompToInt('00000101')) & 0xff, log: 'ACC(12) + X(5) = 17 → 结果写回 ACC' },
      { label: '取数：DR → ACC', run: ['DR', 'ACC'], do: () => 0, log: '从内存读出的数经总线送入 ACC' },
      { label: '传送：X → MQ', run: ['X', 'MQ'], do: () => 0, log: '寄存器间直接传送' },
      { label: '减一：ACC − 1', run: ['ACC', 'ALU', 'ACC'], do: () => (C.twoCompToInt('00001100') - 1) & 0xff, log: 'ACC(12) − 1 = 11 → 写回 ACC' }
    ];

    function playOp(op) {
      const seq = op.run;
      let html = renderRegs(null) + '<div style="margin:10px 0">' + aluBox(false) + '</div>' +
        '<div style="display:flex;justify-content:center;gap:8px;margin-top:8px">' +
        '<span class="tag tag-noop">内部总线（传送带）</span><span class="tag tag-warn">控制信号（谁读谁写）</span></div>';
      box.innerHTML = html;
      log.innerHTML = '';
      const boxes = box.querySelectorAll('.reg');
      // 依次高亮路径
      let t = 0;
      seq.forEach((node, i) => {
        setTimeout(() => {
          box.innerHTML = renderRegs(node === 'ALU' ? null : node) +
            '<div style="margin:10px 0">' + aluBox(node === 'ALU') + '</div>' +
            '<div style="display:flex;justify-content:center;gap:8px;margin-top:8px">' +
            '<span class="tag ' + (i < seq.length - 1 ? 'tag-warn' : 'tag-noop') + '">' + (i < seq.length - 1 ? '➜ 数据流经总线' : '✔ 写入完成') + '</span></div>';
        }, t);
        t += 800;
      });
      setTimeout(() => {
        if (op.do) {
          const val = op.do();
          box.innerHTML = renderRegs('ACC', C.intToTwoComp(val, 8)) +
            '<div style="margin:10px 0">' + aluBox(true) + '</div>' +
            '<div style="display:flex;justify-content:center"><span class="tag tag-ok">运算完成：ACC = ' + val + '（' + C.intToTwoComp(val, 8) + '）</span></div>';
        }
        log.innerHTML = U.callout('ok', '⚙️', op.log);
      }, t + 400);
    }
    ops.forEach(op => {
      const b = U.el('button', { class: 'btn btn-ghost btn-sm', type: 'button' }, op.label);
      b.addEventListener('click', () => playOp(op));
      btns.appendChild(b);
    });
    playOp(ops[0]);
  }

  /* ---------- 标志位 ---------- */
  function moduleFlags(host) {
    host.innerHTML =
      '<p class="para">ALU 算完还会“顺手”更新 4 个标志位，供条件跳转使用：</p>' +
      '<div class="grid2">' +
      '<div><div id="flQuiz"></div></div>' +
      '<div>' +
      '<table class="steptable" style="font-family:var(--font)">' +
      '<tr><th style="font-family:var(--font)">标志</th><th style="font-family:var(--font)">含义</th><th style="font-family:var(--font)">举例（8 位）</th></tr>' +
      '<tr><td><b>ZF</b></td><td style="font-family:var(--font)">结果为零</td><td style="font-family:var(--font)">5 − 5 → ZF=1</td></tr>' +
      '<tr><td><b>SF</b></td><td style="font-family:var(--font)">结果为负（最高位）</td><td style="font-family:var(--font)">−3 → SF=1</td></tr>' +
      '<tr><td><b>CF</b></td><td style="font-family:var(--font)">最高位进位/借位</td><td style="font-family:var(--font)">255+1 → CF=1</td></tr>' +
      '<tr><td><b>OF</b></td><td style="font-family:var(--font)">有符号溢出</td><td style="font-family:var(--font)">64+64 → OF=1</td></tr>' +
      '</table>' +
      '</div></div>';
    U.quiz(host.querySelector('#flQuiz'), {
      question: 'Q. 8 位运算 127 + 1 后，CF 和 OF 分别是？',
      options: ['CF=0, OF=1', 'CF=1, OF=1', 'CF=1, OF=0', 'CF=0, OF=0'],
      correct: 0,
      explain: '01111111 + 00000001 = 10000000，符号位没有向外进位（CF=0），但两个正数相加结果是负 → 有符号溢出（OF=1）。'
    });
  }

  /* ---------- 渲染整章 ---------- */
  function render(container) {
    const body =
      U.chapHero(['#8b5cf6', '#6d28d9'], '第 5 章', '定点运算器的组成',
        '把前四章的“算法”装进硬件：全加器、74181、寄存器组和总线是怎么拼成一台运算器的？',
        ['全加器', '74181', '寄存器组', '内部总线', '标志位']) +

      U.sec('ch5-0', '🧠 先建立直觉：运算器的“厨房比喻”',
        '<div class="row">' +
        '<div class="col">' + U.callout('info', '🍳', '<strong>ALU</strong> 是厨房：负责“加工”（加减乘除、与或非）。<br><strong>寄存器</strong> 是冰箱：暂存食材（操作数和结果）。<br><strong>总线</strong> 是传送带：把食材在厨房和冰箱间搬来搬去。') + '</div>' +
        '<div class="col">' + U.callout('ok', '🧩', '运算器的组成公式：<strong>运算器 = ALU + 寄存器组 + 内部总线 + 标志寄存器</strong>。本章把每块零件都拆开看。') + '</div>' +
        '</div>') +

      U.sec('ch5-1', '🔬 全加器：一切运算的地基', '<div id="m1"></div>') +

      U.sec('ch5-2', '🚄 进位方式：串行 vs 先行', '<div id="m2"></div>') +

      U.sec('ch5-3', '🔌 74181：一颗 ALU 芯片', '<div id="m3"></div>') +

      U.sec('ch5-4', '⚙️ 运算器数据流演示', '<div id="m4"></div>') +

      U.sec('ch5-5', '🚩 标志寄存器', '<div id="m5"></div>') +

      U.sec('ch5-6', '🧪 小测验', '<div id="quiz1"></div><div id="quiz2" style="margin-top:16px"></div>');

    container.innerHTML = body;
    moduleFullAdder(container.querySelector('#m1'));
    moduleCarry(container.querySelector('#m2'));
    module74181(container.querySelector('#m3'));
    moduleDataflow(container.querySelector('#m4'));
    moduleFlags(container.querySelector('#m5'));

    U.quiz(container.querySelector('#quiz1'), {
      question: 'Q1. 74181 中 M=1 时执行的是？',
      options: ['算术运算', '逻辑运算', '移位运算', '浮点运算'],
      correct: 1,
      explain: 'M 是“模式”脚：M=1 逻辑运算（与或非异或），M=0 算术运算（加减）。'
    });
    U.quiz(container.querySelector('#quiz2'), {
      question: 'Q2. 串行进位加法器慢的原因是？',
      options: ['加法本身慢', '进位必须逐位传递，延迟累加', '寄存器太少', '总线太窄'],
      correct: 1,
      explain: '每位的进位要等前一位算完，4 位就要等 4 级延迟。先行进位（CLA）同时算好所有进位，所以快。'
    });
  }

  global.CH5 = { render };
})(typeof window !== 'undefined' ? window : globalThis);
