/* ============================================================
 * ch4.js —— 第 4 章：定点除法运算
 * 恢复余数法、加减交替法（不恢复余数法）
 * ============================================================ */
(function (global) {
  'use strict';
  const C = global.Core;
  const U = global.UI;

  /* ---------- 恢复余数法走查 ---------- */
  function moduleRestore(host) {
    host.innerHTML =
      '<div class="field">' +
      '<label>被除数 x</label><select class="input" id="rx">' +
      ['1011', '1101', '1001', '1010', '1110', '1100'].map(m => '<option value="' + m + '">0.' + m + '</option>').join('') + '</select>' +
      '<label>除数 y</label><select class="input" id="ry">' +
      ['1101', '1011', '1110', '1100', '1010', '1111'].map(m => '<option value="' + m + '">0.' + m + '</option>').join('') + '</select>' +
      '<button class="btn btn-primary" id="rGo" type="button">▶ 走查</button>' +
      '</div><div id="rOut"></div>';

    const rx = host.querySelector('#rx'), ry = host.querySelector('#ry');
    const out = host.querySelector('#rOut');

    function run() {
      const xm = rx.value, ym = ry.value;
      const xv = C.binToFrac(xm), yv = C.binToFrac(ym);
      if (xv >= yv) {
        out.innerHTML = U.callout('err', '🚨',
          '定点小数除法要求 <strong>被除数 &lt; 除数</strong>（否则商 ≥ 1，溢出）。' +
          xv + ' ÷ ' + yv + ' 不满足条件，请换一组数。');
        return;
      }
      const r = C.divRestore(xm, ym);

      U.walkthrough(out, {
        interval: 3000,
        colLabels: ['步骤', '余数 R（步前）', '左移后 2R', '2R − y', '够减?', '商位 q', '操作', '余数 R（步后）'],
        getSteps: () => r.steps,
        panel: (cur, i) => {
          const qSoFar = r.qBits.slice(0, cur.i);
          const qRest = '·'.repeat(r.qBits.length - cur.i);
          const hi = cur.negative
            ? [{ i: 0, cls: 'b-lit' }]
            : [{ i: cur.diff.length - 1, cls: 'b-lit3' }];
          return '<div style="display:flex;flex-wrap:wrap;gap:12px;justify-content:center;align-items:flex-start">' +
            '<div class="reg"><span class="reg-name">除数 y = 0.' + r.yMag + '</span>' +
            U.bitRow('', '0' + r.yMag, { keepZero: true }) + '</div>' +
            '<div class="reg"><span class="reg-name">余数寄存器 R</span>' +
            U.bitRow('', cur.Rafter, { keepZero: true, signN: 1, highlight: cur.negative ? [{ i: 0, cls: 'b-lit' }] : [] }) + '</div>' +
            '<div class="reg"><span class="reg-name">商寄存器</span>' +
            '<div style="text-align:center;font-family:var(--mono);font-size:17px;letter-spacing:2px">' + qSoFar + '<span style="color:#c3cad6">' + qRest + '</span></div>' +
            '<div style="text-align:center;font-size:11.5px;color:var(--muted)">当前写入第 ' + cur.i + ' 位：<b style="color:' + (cur.qi === '1' ? '#059669' : '#dc2626') + '">' + cur.qi + '</b></div>' +
            '</div>' +
            '<div class="reg"><span class="reg-name">本次判断</span>' +
            '<div style="text-align:center;font-size:13px">' +
            (cur.negative
              ? '<span style="color:#dc2626;font-weight:700">不够减！<br>恢复余数</span>'
              : '<span style="color:#059669;font-weight:700">够减！<br>商上 1</span>') +
            '</div></div></div>';
        },
        rowCells: (s) => [
          '<b>' + s.i + '</b>',
          s.Rbefore,
          s.Rshift,
          s.diff,
          s.negative ? '<span class="tag tag-alert">不够（负）</span>' : '<span class="tag tag-ok">够（≥0）</span>',
          '<span class="tag ' + (s.qi === '1' ? 'tag-add' : 'tag-warn') + '">' + s.qi + '</span>',
          s.negative ? '<span class="tag tag-warn">恢复：加除数</span>' : '<span class="tag tag-noop">保持</span>',
          s.Rafter
        ],
        explain: (s) => {
          return '<b>第 ' + s.i + ' 步：</b>先把余数<strong>左移一位</strong>（×2）：' + s.Rbefore + ' → <strong>' + s.Rshift + '</strong>' +
            '，再<strong>减去除数</strong>：' + s.Rshift + ' − 0.' + s.yMag + ' = <strong>' + s.diff + '</strong>' +
            (s.negative
              ? '，结果是负的 → <strong>不够减</strong>，商写 <strong>0</strong>，并把除数加回去“恢复”：' + s.diff + ' + 0.' + s.yMag + ' = <strong>' + s.Rafter + '</strong>'
              : '，够减 → 商写 <strong>1</strong>，余数就是 <strong>' + s.Rafter + '</strong>');
        }
      });
    }
    host.querySelector('#rGo').addEventListener('click', run);
    run();
  }

  /* ---------- 加减交替法走查 ---------- */
  function moduleAlternate(host) {
    host.innerHTML =
      '<div class="field">' +
      '<label>被除数 x</label><select class="input" id="ax">' +
      ['1011', '1101', '1001', '1010', '1110', '1100'].map(m => '<option value="' + m + '">0.' + m + '</option>').join('') + '</select>' +
      '<label>除数 y</label><select class="input" id="ay">' +
      ['1101', '1011', '1110', '1100', '1010', '1111'].map(m => '<option value="' + m + '">0.' + m + '</option>').join('') + '</select>' +
      '<button class="btn btn-primary" id="aGo" type="button">▶ 走查</button>' +
      '</div><div id="aOut"></div>';

    const ax = host.querySelector('#ax'), ay = host.querySelector('#ay');
    const out = host.querySelector('#aOut');

    function run() {
      const xm = ax.value, ym = ay.value;
      const xv = C.binToFrac(xm), yv = C.binToFrac(ym);
      if (xv >= yv) {
        out.innerHTML = U.callout('err', '🚨', '定点小数除法要求 <strong>被除数 &lt; 除数</strong>（否则商 ≥ 1，溢出）。');
        return;
      }
      const r = C.divAlternate(xm, ym);

      U.walkthrough(out, {
        interval: 3000,
        colLabels: ['步骤', '左移后 R', '运算', '结果 R', '符号', '商位 q'],
        getSteps: () => r.steps,
        panel: (cur, i) => {
          const qSoFar = r.qBits.slice(0, cur.i);
          const qRest = '·'.repeat(r.qBits.length - cur.i);
          return '<div style="display:flex;flex-wrap:wrap;gap:12px;justify-content:center;align-items:flex-start">' +
            '<div class="reg"><span class="reg-name">除数 y = 0.' + r.yMag + '</span>' +
            U.bitRow('', '0' + r.yMag, { keepZero: true }) + '</div>' +
            '<div class="reg"><span class="reg-name">本次结果 R</span>' +
            U.bitRow('', cur.Rafter, { keepZero: true, signN: 1, highlight: cur.negative ? [{ i: 0, cls: 'b-lit' }] : [{ i: cur.Rafter.length - 1, cls: 'b-lit3' }] }) + '</div>' +
            '<div class="reg"><span class="reg-name">商寄存器</span>' +
            '<div style="text-align:center;font-family:var(--mono);font-size:17px;letter-spacing:2px">' + qSoFar + '<span style="color:#c3cad6">' + qRest + '</span></div>' +
            '<div style="text-align:center;font-size:11.5px;color:var(--muted)">当前写入第 ' + cur.i + ' 位：<b style="color:' + (cur.qi === '1' ? '#059669' : '#dc2626') + '">' + cur.qi + '</b></div>' +
            '</div></div>';
        },
        rowCells: (s) => [
          '<b>' + s.i + '</b>',
          s.Rshift,
          '<span class="tag ' + (s.op === '-' ? 'tag-alert' : 'tag-add') + '">' + s.op + ' 除数</span>',
          s.Rafter,
          s.negative ? '<span class="tag tag-alert">负</span>' : '<span class="tag tag-ok">正</span>',
          '<span class="tag ' + (s.qi === '1' ? 'tag-add' : 'tag-warn') + '">' + s.qi + '</span>'
        ],
        explain: (s) => {
          if (s.i === 1) {
            return '<b>第 1 步（特殊）：</b>先左移一位：2x = <strong>' + s.Rshift + '</strong>，然后<strong>减去除数</strong>：' + s.Rshift + ' − 0.' + r.yMag + ' = <strong>' + s.Rafter + '</strong>' +
              (s.negative ? '，结果为负 → 商写 <strong>0</strong>（<strong>不恢复</strong>！）' : '，结果为正 → 商写 <strong>1</strong>');
          }
          const reason = s.op === '-' ? '上一步商 1 → 继续<strong>减</strong>除数' : '上一步商 0 → 改为<strong>加</strong>除数';
          return '<b>第 ' + s.i + ' 步：</b>余数<strong>左移一位</strong>：' + s.Rshift + '；因为' + reason +
            '：' + s.Rshift + ' ' + s.op + ' 0.' + r.yMag + ' = <strong>' + s.Rafter + '</strong>' +
            (s.negative ? '，结果为负 → 商写 <strong>0</strong>' : '，结果为正 → 商写 <strong>1</strong>') +
            (s.last && s.negative ? '。<br>⚠️ 最后一步余数为负，需要<strong>加一次除数恢复</strong>。' : '');
        }
      });
    }
    host.querySelector('#aGo').addEventListener('click', run);
    run();
  }

  /* ---------- 渲染整章 ---------- */
  function render(container) {
    const body =
      U.chapHero(['#10b981', '#059669'], '第 4 章', '定点除法运算',
        '除法就是“反复试减”：够减就商 1，不够减就商 0。这一章把恢复余数法和加减交替法一步一步演给你看。',
        ['恢复余数法', '加减交替法', '商寄存器', '余数']) +

      U.sec('ch4-0', '🧠 先建立直觉：除法 = 反复试减',
        '<p class="para">小学竖式除法怎么做？——“<strong class="hl">够减就上 1，不够减就上 0</strong>”。计算机的除法一模一样，只不过一次只处理一位：</p>' +
        '<div class="flow-row" style="justify-content:center;flex-wrap:wrap">' +
        '<div class="flow-box">余数左移一位<br><span class="muted small">×2</span></div>' +
        '<span class="flow-arrow">→</span>' +
        '<div class="flow-box">减去除数<br><span class="muted small">−y</span></div>' +
        '<span class="flow-arrow">→</span>' +
        '<div class="flow-box">够减？<br><span class="muted small">结果 ≥ 0？</span></div>' +
        '<span class="flow-arrow">→</span>' +
        '<div class="flow-box">商 1 或 0<br><span class="muted small">写入商寄存器</span></div>' +
        '</div>' +
        U.callout('info', '📌', '定点小数除法要求 <strong>|被除数| &lt; |除数|</strong>，这样商才小于 1。例：<span class="mono">0.1011 ÷ 0.1101 = 0.1101</span>，余 <span class="mono">0.0111×2⁻⁴</span>。')) +

      U.sec('ch4-1', '🎬 恢复余数法：不够减就“退回去”',
        '<p class="para"><strong>口诀</strong>：左移 → 减除数 → <strong>够减商 1</strong>；<strong>不够减就加回除数（恢复），商 0</strong>。</p>' +
        '<div id="m1"></div>') +

      U.sec('ch4-2', '🎬 加减交替法：不恢复，更省事',
        '<p class="para"><strong>优化</strong>：不够减时<strong>不恢复</strong>，让余数“欠着”，下一步自动<strong>改为加法</strong>补回来——省一次加法，速度更快。</p>' +
        '<div id="m2"></div>') +

      U.sec('ch4-3', '⚖️ 两种方法对比',
        '<table class="steptable" style="font-family:var(--font)">' +
        '<tr><th style="font-family:var(--font)">对比项</th><th style="font-family:var(--font)">恢复余数法</th><th style="font-family:var(--font)">加减交替法</th></tr>' +
        '<tr><td style="font-family:var(--font);font-weight:600">不够减时</td><td style="font-family:var(--font)">加回除数“恢复”，商 0</td><td style="font-family:var(--font)">不恢复，下一步反过来加</td></tr>' +
        '<tr><td style="font-family:var(--font);font-weight:600">每步操作</td><td style="font-family:var(--font)">最多 2 次加法（减+恢复）</td><td style="font-family:var(--font)">固定 1 次加或减</td></tr>' +
        '<tr><td style="font-family:var(--font);font-weight:600">速度</td><td style="font-family:var(--font)">慢（最坏多一倍操作）</td><td style="font-family:var(--font)">快（常用）</td></tr>' +
        '<tr><td style="font-family:var(--font);font-weight:600">最后一步</td><td style="font-family:var(--font)">余数天然正确</td><td style="font-family:var(--font)">若余数为负需加除数恢复一次</td></tr>' +
        '</table>') +

      U.sec('ch4-4', '🧪 小测验', '<div id="quiz1"></div><div id="quiz2" style="margin-top:16px"></div>');

    container.innerHTML = body;
    moduleRestore(container.querySelector('#m1'));
    moduleAlternate(container.querySelector('#m2'));

    U.quiz(container.querySelector('#quiz1'), {
      question: 'Q1. 恢复余数法中，“恢复”是什么意思？',
      options: ['把余数清零', '不够减时把除数加回去，退回减之前的状态', '重新开始除法', '把商加 1'],
      correct: 1,
      explain: '减过头了（余数为负），就把除数加回去“反悔”，商记 0。'
    });
    U.quiz(container.querySelector('#quiz2'), {
      question: 'Q2. 加减交替法中，上一步商 0，下一步应该？',
      options: ['继续减除数', '改为加除数', '左移两次', '直接结束'],
      correct: 1,
      explain: '商 0 说明余数“欠了账”（为负），下一步用加法把它补回来。'
    });
  }

  global.CH4 = { render };
})(typeof window !== 'undefined' ? window : globalThis);
