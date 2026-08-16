/* ============================================================
 * ch6.js —— 第 6 章：浮点运算方法和浮点运算器
 * IEEE754、浮点加减五步（对阶/求和/规格化/舍入/判溢出）
 * ============================================================ */
(function (global) {
  'use strict';
  const C = global.Core;
  const U = global.UI;

  /* ---------- IEEE754 转换器 ---------- */
  function moduleIEEE(host) {
    host.innerHTML =
      '<p class="para">输入一个十进制数，看它在 IEEE 754 <strong class="hl">单精度（32 位）</strong>里长什么样（1 符号 + 8 阶码 + 23 尾数）：</p>' +
      '<div class="field">' +
      '<input type="number" class="input" id="ieIn" value="1.5" step="any" style="width:130px">' +
      '<button class="btn btn-primary" id="ieGo" type="button">转换</button>' +
      '<button class="btn btn-ghost btn-sm" data-v="1.5">1.5</button>' +
      '<button class="btn btn-ghost btn-sm" data-v="-0.75">-0.75</button>' +
      '<button class="btn btn-ghost btn-sm" data-v="127.375">127.375</button>' +
      '<button class="btn btn-ghost btn-sm" data-v="0.1">0.1（惊人！）</button>' +
      '<button class="btn btn-ghost btn-sm" data-v="3.14159">3.14159</button>' +
      '</div>' +
      '<div id="ieOut"></div>' +
      '<div style="margin-top:14px"><div id="ieEditor"></div></div>';

    const inp = host.querySelector('#ieIn');
    const out = host.querySelector('#ieOut');
    const editor = host.querySelector('#ieEditor');

    function fmt32(bits, lit) {
      const g = (s, cls, i0) => '<span style="display:inline-flex;gap:2px;flex-wrap:wrap">' + s.split('').map((b, i) => {
        let c = 'bit';
        c += b === '1' ? ' b-data' : ' b-zero';
        if (lit && lit[i0 + i]) c += ' ' + lit[i0 + i];
        return '<span class="' + c + '" style="min-width:20px;height:26px;font-size:12px">' + b + '</span>';
      }).join('') + '</span>';
      return '<div style="display:flex;gap:10px;align-items:flex-start;flex-wrap:wrap;overflow-x:auto;max-width:100%">' +
        '<span style="display:inline-flex;flex-direction:column;align-items:center;gap:2px"><span class="small muted">符号(1)</span>' + g(bits[0], 'b-sign', 0) + '</span>' +
        '<span style="display:inline-flex;flex-direction:column;align-items:center;gap:2px"><span class="small muted">阶码(8)</span>' + g(bits.slice(1, 9), 'b-data', 1) + '</span>' +
        '<span style="display:inline-flex;flex-direction:column;align-items:center;gap:2px"><span class="small muted">尾数(23)</span>' + g(bits.slice(9), 'b-data', 9) + '</span>' +
        '</div>';
    }

    function paint() {
      const v = +inp.value;
      if (isNaN(v)) return;
      const r = C.ieee754Single(v);
      const bits = r.signBit + r.expBits + r.mantBits;
      const mantVal = r.mantFrac;
      const backVal = (r.sign ? -1 : 1) * (1 + mantVal) * Math.pow(2, r.expValue);
      const exact = Math.abs(backVal - v) < 1e-6 * Math.max(1, Math.abs(v));
      out.innerHTML =
        fmt32(bits) +
        '<div class="field" style="margin-top:10px">' +
        '<span class="tag tag-ok">' + bits + '</span>' +
        '<span class="tag tag-warn">' + r.hex + '</span>' +
        '</div>' +
        U.bitRow('符号位', r.signBit, { signN: 1 }) +
        U.bitRow('阶码（移码，偏置 127）', r.expBits, { keepZero: true, highlight: [{ i: 0, cls: 'b-lit' }] }) +
        U.bitRow('尾数（隐含 1. 开头）', r.mantBits) +
        '<div class="eqbox">值 = (−1)<sup>' + r.sign + '</sup> × 1.' + r.mantBits.slice(0, 8) + '… × 2<sup>' + r.expValue + '</sup><br>' +
        '= (−1)<sup>' + r.sign + '</sup> × (1 + ' + mantVal.toPrecision(6) + ') × 2<sup>' + r.expValue + '</sup> ≈ <span class="hl">' + backVal + '</span>' +
        (exact ? ' ✓' : '（近似值，因尾数有限）') + '</div>' +
        (v === 0.1 ? U.callout('warn', '😱',
          '看！<strong>0.1 在二进制里是无限循环小数</strong>（就像 1/3 在十进制里写不完），32 位尾数只能存一个近似值。' +
          '这就是为什么 <span class="mono">0.1 + 0.2 ≠ 0.3</span>（在浮点里是 0.30000000000000004）！') : '') +
        (Math.abs(v) >= 3.4e38 ? U.callout('err', '🚨', '超出单精度最大范围，显示为 Inf（阶码全 1）。') : '');
      // 位编辑器
      let editBits = bits.split('');
      editor.innerHTML = '<div class="small muted" style="margin-bottom:6px">🔧 点任意位翻转，看看数值怎么变：</div>' +
        '<span style="display:inline-flex;gap:2px;flex-wrap:wrap">' +
        editBits.map((b, i) => '<button class="bit ' + (b === '1' ? 'b-data' : 'b-zero') + '" data-i="' + i + '" type="button" style="cursor:pointer;min-width:20px;height:26px;font-size:12px">' + b + '</button>').join('') +
        '</span><div id="ieEditVal" style="margin-top:8px"></div>';
      function paintEdit() {
        const s = editBits.join('');
        const val = C.ieee754FromBits(s);
        document.getElementById('ieEditVal').innerHTML =
          '<span class="tag tag-ok">' + s + '</span> <span class="mono" style="font-size:16px;font-weight:700">= ' + (isNaN(val) ? 'NaN（非数）' : val) + '</span>' +
          (isFinite(val) ? '' : ' <span class="muted small">（阶码全 1 → 无穷/NaN）</span>');
      }
      editor.querySelectorAll('button').forEach(btn => btn.addEventListener('click', () => {
        const i = +btn.dataset.i;
        editBits[i] = editBits[i] === '0' ? '1' : '0';
        editor.querySelectorAll('button').forEach((b2, j) => {
          b2.textContent = editBits[j];
          b2.className = 'bit ' + (editBits[j] === '1' ? 'b-data' : 'b-zero');
        });
        paintEdit();
      }));
      paintEdit();
    }
    host.querySelector('#ieGo').addEventListener('click', paint);
    host.querySelectorAll('[data-v]').forEach(b => b.addEventListener('click', () => { inp.value = b.dataset.v; paint(); }));
    paint();
  }

  /* ---------- 浮点加减五步 ---------- */
  function moduleFloatAdd(host) {
    host.innerHTML =
      '<p class="para">浮点加减分<strong class="hl">五步</strong>：对阶 → 尾数求和 → 规格化 → 舍入 → 判溢出。选一个例子，一步步看：</p>' +
      '<div class="field">' +
      '<select class="input" id="faSel">' +
      '<option value="0">例 1（对阶）：0.1011×2⁻³ + 0.1101×2⁻¹</option>' +
      '<option value="1">例 2（右规）：0.1101×2⁰ + 0.1011×2⁰</option>' +
      '<option value="2">例 3（左规）：0.1100×2⁰ + (−0.0111×2⁰)</option>' +
      '</select>' +
      '<button class="btn btn-primary" id="faGo" type="button">▶ 演示</button>' +
      '</div>' +
      '<div id="faOut"></div>';

    const sel = host.querySelector('#faSel');
    const out = host.querySelector('#faOut');
    const EXAMPLES = [
      { mx: '01011', my: '01101', ex: -3, ey: -1, note: '阶码不同 → 必须对阶' },
      { mx: '01101', my: '01011', ex: 0, ey: 0, note: '阶码相同 → 直接求和，尾数可能 ≥ 1 → 右规' },
      { mx: '01100', my: '11001', ex: 0, ey: 0, note: '一正一负 → 和变小 → 左规' }
    ];

    function fmtM(m) {
      return m[0] + '.' + m.slice(1);
    }

    function run() {
      const ex0 = EXAMPLES[+sel.value];
      const r = C.floatAddSteps(ex0.mx, ex0.my, ex0.ex, ex0.ey, 5);
      const W = 8;

      function mantBox(label, bits, hl) {
        return '<div style="display:flex;align-items:center;gap:8px;margin:4px 0"><span class="reg-label">' + label + '</span>' +
          U.bits(bits, { keepZero: true, signN: 1, highlight: hl || [] }) + '</div>';
      }

      const steps = [];
      // 第 1 步 对阶
      steps.push({
        title: '第 1 步 · 对阶：小阶向大阶看齐',
        body:
          '<p class="para">先看阶码：x 的阶码 = <strong>' + ex0.ex + '</strong>，y 的阶码 = <strong>' + ex0.ey + '</strong>，阶差 Δe = ' + ex0.ex + ' − (' + ex0.ey + ') = <strong>' + r.steps[0].de + '</strong>。</p>' +
          (r.steps[0].de !== 0
            ? '<p class="para">' + (r.steps[0].de > 0 ? 'y 的阶码小，' : 'x 的阶码小，') + '把它的尾数<strong>算术右移</strong> |Δe| 位，阶码统一为 <strong>' + r.steps[0].exA + '</strong>：</p>' +
              (r.steps[0].de > 0
                ? mantBox('x 尾数', ex0.mx + '0'.repeat(W - 5)) + '<div class="flow-row" style="margin:4px 0"><span class="dash-line"></span><span class="tag tag-shift">右移 ' + r.steps[0].de + ' 位</span></div>' +
                  mantBox('y 尾数', r.steps[0].myA, r.steps[0].dropFirst ? [{ i: W - 1, cls: 'b-lit' }] : []) +
                  (r.steps[0].dropBits ? '<p class="para small muted">被移出的位：<span class="mono">' + r.steps[0].dropBits + '</span>' +
                    (r.steps[0].dropFirst === '1' ? '（最高丢弃位是 1，后面舍入要用）' : '（丢弃位为 0，无损失）') + '</p>' : '')
                : mantBox('y 尾数', ex0.my + '0'.repeat(W - 5)) + '<div class="flow-row" style="margin:4px 0"><span class="dash-line"></span><span class="tag tag-shift">右移 ' + (-r.steps[0].de) + ' 位</span></div>' +
                  mantBox('x 尾数', r.steps[0].mxA, r.steps[0].dropFirst ? [{ i: W - 1, cls: 'b-lit' }] : []) +
                  (r.steps[0].dropBits ? '<p class="para small muted">被移出的位：<span class="mono">' + r.steps[0].dropBits + '</span>' +
                    (r.steps[0].dropFirst === '1' ? '（最高丢弃位是 1，后面舍入要用）' : '（丢弃位为 0，无损失）') + '</p>' : ''))
            : '<p class="para">阶码相等，不需要对阶，直接进入下一步。</p>') +
          U.callout('info', '🎯', '对阶原则：<strong>小阶向大阶看齐</strong>（小阶码的尾数右移），因为右移丢的是低位的“零头”，左移则可能把有效数字移丢。')
      });
      // 第 2 步 求和
      steps.push({
        title: '第 2 步 · 尾数求和',
        body:
          mantBox('对齐后 x', r.steps[0].mxA) +
          mantBox('对齐后 y', r.steps[0].myA) +
          '<div class="eqbox">' + r.steps[0].mxA + '<br>+ ' + r.steps[0].myA + '<br>──────<br><span class="hl">' + r.steps[1].sumW1.slice(1) + '</span></div>' +
          '<p class="para small">和的绝对值 = ' + Math.abs(C.fixCompToFrac(r.steps[1].sumW1.slice(1))).toFixed(6) +
          (Math.abs(C.fixCompToFrac(r.steps[1].sumW1.slice(1))) >= 1 ? ' ≥ 1 → 下一步需要<strong>右规</strong>' : ' &lt; 1') + '。</p>'
      });
      // 第 3 步 规格化
      const norm = r.steps[2];
      steps.push({
        title: '第 3 步 · 规格化',
        body:
          '<p class="para">规格化要求尾数形如 <strong>0.1xxx</strong> 或 <strong>1.0xxx</strong>（补码）。</p>' +
          (norm.shiftOp === 'right'
            ? '<p class="para">尾数和 ≥ 1，<strong>右规一位</strong>：</p>' +
              mantBox('右规前', r.steps[1].sumW1.slice(1)) +
              '<div class="flow-row" style="margin:4px 0"><span class="dash-line"></span><span class="tag tag-shift">右移 1 位，阶码 +1</span></div>' +
              mantBox('右规后', norm.mantN)
            : norm.shiftOp === 'left'
              ? '<p class="para">和的最高位和符号位相同（0.0xxx 或 1.1xxx），<strong>左规 ' + norm.shiftCount + ' 位</strong>：</p>' +
                mantBox('左规前', r.steps[1].sumW1.slice(1)) +
                '<div class="flow-row" style="margin:4px 0"><span class="dash-line"></span><span class="tag tag-shift">左移 ' + norm.shiftCount + ' 位，阶码 −' + norm.shiftCount + '</span></div>' +
                mantBox('左规后', norm.mantN)
              : '<p class="para">尾数已经是规格化形式（' + fmtM(norm.mantN.slice(0, 5)) + '…），<strong>无需移位</strong>。</p>') +
          '<p class="para">新阶码 = <strong>' + norm.expN + '</strong>，尾数 = <span class="mono">' + fmtM(norm.mantN) + '</span></p>'
      });
      // 第 4 步 舍入
      const round = r.steps[2];
      steps.push({
        title: '第 4 步 · 舍入',
        body:
          '<p class="para">对阶右移时被丢掉的低位需要处理。常用规则：<strong>0 舍 1 入</strong>（被丢弃的最高位是 1 就向尾数末位加 1）。</p>' +
          (r.steps[2].roundInfo.includes('未丢弃') && !r.steps[2].roundInfo.includes('右规')
            ? U.callout('ok', '😌', '本例没有丢弃有效位，无需舍入。')
            : r.steps[2].roundInfo.includes('截断')
              ? U.callout('info', '✂️', '右规丢掉 1 位低位，本例按截断处理（教学简化）。')
              : U.callout('warn', '🔢', r.steps[2].roundInfo + '。舍入后的尾数：<span class="mono">' + fmtM(r.steps[2].mantN) + '</span>')) +
          '<p class="para small muted">其他舍入法：恒置 1 法（末位永远置 1，简单但误差大）、截断法（直接丢，最省事）。' +
          'IEEE 754 默认用“就近舍入”。</p>'
      });
      // 第 5 步 判溢出
      const ov = r.steps[3];
      steps.push({
        title: '第 5 步 · 判溢出',
        body:
          '<p class="para">最终阶码 = <strong>' + ov.expN + '</strong>（演示用 4 位移码阶码范围 [-8, +7]）。</p>' +
          (ov.ovType === 'overflow' ? U.callout('err', '🚨', ov.ovInfo + '：结果太大，只能表示成 ∞。') :
            ov.ovType === 'underflow' ? U.callout('warn', '⚠️', ov.ovInfo + '：结果太小，趋于 0（下溢不报错，只丢精度）。') :
              U.callout('ok', '✅', ov.ovInfo)) +
          '<div class="eqbox" style="margin-top:12px">结果 = <span class="hl">' + fmtM(r.mantN) + ' × 2<sup>' + r.expN + '</sup></span> = ' + r.resultVal.toFixed(8) + '</div>' +
          '<p class="para small">验证：' + C.fixCompToFrac(ex0.mx) + '×2<sup>' + ex0.ex + '</sup> + ' + C.fixCompToFrac(ex0.my) + '×2<sup>' + ex0.ey + '</sup> = ' +
          (C.fixCompToFrac(ex0.mx) * Math.pow(2, ex0.ex) + C.fixCompToFrac(ex0.my) * Math.pow(2, ex0.ey)).toFixed(8) + ' ✓</p>'
      });

      U.stepPlayer(out, { getSteps: () => steps, interval: 3400 });
    }
    host.querySelector('#faGo').addEventListener('click', run);
    sel.addEventListener('change', run);
    run();
  }

  /* ---------- 浮点运算器组成 ---------- */
  function moduleFpu(host) {
    host.innerHTML =
      '<p class="para">浮点运算器 = <strong class="hl">阶码运算部件</strong> + <strong class="hl">尾数运算部件</strong>，两部分并行工作：</p>' +
      '<div class="schematic"><div style="display:flex;gap:16px;justify-content:center;flex-wrap:wrap;padding:10px 0">' +
      '<div class="reg" style="min-width:210px"><span class="reg-name">阶码运算部件（移码）</span>' +
      '<div style="font-size:13px;text-align:center">阶码加法器 + 对阶控制 + 溢出判断</div>' +
      '<div class="small muted" style="text-align:center">管“×2ⁿ”里的 n</div></div>' +
      '<span class="flow-arrow" style="font-size:28px">⇄</span>' +
      '<div class="reg" style="min-width:210px"><span class="reg-name">尾数运算部件（原码/补码）</span>' +
      '<div style="font-size:13px;text-align:center">尾数加减法 + 规格化移位 + 舍入</div>' +
      '<div class="small muted" style="text-align:center">管“0.xxxx”里的数字</div></div>' +
      '</div></div>' +
      '<div class="flow-row" style="justify-content:center;margin-top:12px">' +
      '<div class="flow-box">取指：读出阶码和尾数</div><span class="flow-arrow">→</span>' +
      '<div class="flow-box">阶码部件：对阶</div><span class="flow-arrow">→</span>' +
      '<div class="flow-box">尾数部件：求和</div><span class="flow-arrow">→</span>' +
      '<div class="flow-box">规格化 + 舍入</div><span class="flow-arrow">→</span>' +
      '<div class="flow-box">判溢出，写回</div>' +
      '</div>' +
      U.callout('info', '🔗', '两个部件<strong>互相配合</strong>：对阶时阶码部件告诉尾数部件“移几位”；规格化时尾数部件告诉阶码部件“阶码加几/减几”。' +
        '现代 CPU 的浮点运算器（FPU）把这一整套做成了硬件流水线。');
  }

  /* ---------- 渲染整章 ---------- */
  function render(container) {
    const body =
      U.chapHero(['#ec4899', '#db2777'], '第 6 章', '浮点运算方法和浮点运算器',
        '整数不够用？让小数点“浮”起来！这一章用 IEEE 754 和五步动画，把浮点数的表示与加减运算彻底讲明白。',
        ['IEEE 754', '对阶', '规格化', '舍入', '溢出判断']) +

      U.sec('ch6-0', '🧠 先建立直觉：浮点数 = 科学计数法',
        '<p class="para">浮点数就像十进制的科学计数法：<span class="mono">1.5 × 10³</span> 里，<strong class="hl">1.5 是尾数</strong>（有效数字），<strong class="hl">3 是指数（阶码）</strong>。' +
        '小数点位置随指数变化而“浮动”，所以叫<strong>浮点</strong>。</p>' +
        '<div class="grid2">' +
        '<div><table class="steptable" style="font-family:var(--font)">' +
        '<tr><th style="font-family:var(--font)">对比</th><th style="font-family:var(--font)">定点数</th><th style="font-family:var(--font)">浮点数</th></tr>' +
        '<tr><td style="font-family:var(--font);font-weight:600">表示</td><td style="font-family:var(--font)">小数点位置固定</td><td style="font-family:var(--font)">阶码 + 尾数</td></tr>' +
        '<tr><td style="font-family:var(--font);font-weight:600">范围</td><td style="font-family:var(--font)">小（8 位仅 -128~127）</td><td style="font-family:var(--font)">极大（32 位可达 ±3.4×10³⁸）</td></tr>' +
        '<tr><td style="font-family:var(--font);font-weight:600">精度</td><td style="font-family:var(--font)">固定</td><td style="font-family:var(--font)">有限（尾数 23/52 位）</td></tr>' +
        '</table></div>' +
        '<div>' + U.callout('ok', '🌍', '为什么需要浮点？<br>科学计算里既有 <span class="mono">6.022×10²³</span> 也有 <span class="mono">1.6×10⁻¹⁹</span>，定点数根本存不下。浮点数用“阶码管大小、尾数管精度”解决了这个问题。') + '</div>' +
        '</div>') +

      U.sec('ch6-1', '🕹️ IEEE 754 转换器（动手玩 32 位）', '<div id="m1"></div>') +

      U.sec('ch6-2', '🎬 浮点加减法五步动画', '<div id="m2"></div>') +

      U.sec('ch6-3', '🏭 浮点运算器的组成', '<div id="m3"></div>') +

      U.sec('ch6-4', '🧪 小测验', '<div id="quiz1"></div><div id="quiz2" style="margin-top:16px"></div><div id="quiz3" style="margin-top:16px"></div>');

    container.innerHTML = body;
    moduleIEEE(container.querySelector('#m1'));
    moduleFloatAdd(container.querySelector('#m2'));
    moduleFpu(container.querySelector('#m3'));

    U.quiz(container.querySelector('#quiz1'), {
      question: 'Q1. IEEE 754 单精度中，阶码用哪种编码？',
      options: ['原码', '补码', '移码（偏置 127）', '格雷码'],
      correct: 2,
      explain: '移码让“阶码越大数越大”，方便直接比较大小。单精度偏置值是 127。'
    });
    U.quiz(container.querySelector('#quiz2'), {
      question: 'Q2. 浮点加减“对阶”的原则是？',
      options: ['大阶向小阶看齐', '小阶向大阶看齐', '随便对齐', '不需要对阶'],
      correct: 1,
      explain: '小阶码的尾数右移（丢低位不心疼），大阶码不能左移（会把有效数字移丢）。'
    });
    U.quiz(container.querySelector('#quiz3'), {
      question: 'Q3. 0.1 + 0.2 在计算机里为什么不是精确的 0.3？',
      options: ['计算机算错了', '0.1 和 0.2 在二进制里是无限循环小数，尾数有限只能近似', '浮点数不能做加法', '0.3 太大'],
      correct: 1,
      explain: '0.1 的二进制展开是 0.0001100110011…（循环），32/64 位尾数存不下，只能存近似值，累加误差就出现了。'
    });
  }

  global.CH6 = { render };
})(typeof window !== 'undefined' ? window : globalThis);
