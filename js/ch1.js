/* ============================================================
 * ch1.js —— 第 1 章：数据与文字的表示方法
 * 原码 / 反码 / 补码 / 移码 / ASCII / 汉字编码
 * ============================================================ */
(function (global) {
  'use strict';
  const C = global.Core;
  const U = global.UI;

  /* ---------- 工具：码制对照表 ---------- */
  function codeTable(dec) {
    const rows = [
      ['真值', String(dec), '就是这个数本身'],
      ['原码', C.intToSignMag(dec, 8), '符号位 + 绝对值'],
      ['反码', C.intToOnesComp(dec, 8), '负数：数值位全部取反'],
      ['补码', C.intToTwoComp(dec, 8), '负数：反码 + 1'],
      ['移码', C.intToBias(dec, 8), '补码符号位取反']
    ];
    return rows.map(r =>
      '<tr><td style="text-align:left;font-weight:700;font-family:var(--font)">' + r[0] + '</td>' +
      '<td>' + U.bits(r[1], { signN: 1 }) + '</td>' +
      '<td style="text-align:left;font-family:var(--font);font-size:12.5px;color:var(--muted)">' + r[2] + '</td></tr>'
    ).join('');
  }

  /* ---------- 模块 A：码制转换器 ---------- */
  function moduleConverter(host) {
    host.innerHTML =
      '<p class="para">拖动滑块或直接输入一个 <strong class="hl">-128 ~ 127</strong> 的整数，看看它在 8 位机器里长什么样：</p>' +
      '<div class="field">' +
      '<label>数值</label>' +
      '<input type="range" class="slider" id="m1slider" min="-128" max="127" value="-6">' +
      '<input type="number" class="input" id="m1num" value="-6" min="-128" max="127">' +
      '</div>' +
      '<div class="table-wrap" style="overflow-x:auto"><table class="steptable" id="m1table" style="min-width:480px">' +
      '<tr><th style="font-family:var(--font)">表示方法</th><th>8 位编码</th><th style="font-family:var(--font)">一句话解释</th></tr>' +
      '</table></div>' +
      '<div id="m1note"></div>';

    const slider = host.querySelector('#m1slider');
    const num = host.querySelector('#m1num');
    const table = host.querySelector('#m1table');
    const note = host.querySelector('#m1note');

    function paint(v) {
      v = Math.max(-128, Math.min(127, Math.round(v)));
      table.innerHTML = '<tr><th style="font-family:var(--font)">表示方法</th><th>8 位编码</th><th style="font-family:var(--font)">一句话解释</th></tr>' + codeTable(v);
      const two = C.intToTwoComp(v, 8);
      const vHex = (v & 0xff).toString(16).toUpperCase().padStart(2, '0');
      let noteHtml;
      if (v >= 0) {
        noteHtml = U.callout('info', '💡',
          '正数的原码、反码、补码<strong>完全一样</strong>（都是 <span class="mono">0' + C.intToSignMag(v, 8).slice(1) + '</span>），只有负数才需要“取反加 1”的特殊处理。' +
          '所以计算机处理正数时什么都不用做，非常省事！');
      } else {
        const mag = (-v).toString(2).padStart(7, '0');
        const inv = mag.split('').map(c => c === '0' ? '1' : '0').join('');
        noteHtml = U.callout('info', '🧠',
          '负数 <span class="mono">' + v + '</span> 的转换口诀：<strong>原码</strong> = 符号位 1 + 绝对值 <span class="mono">' + mag + '</span>；' +
          '<strong>反码</strong> = 数值位取反 <span class="mono">' + inv + '</span>；' +
          '<strong>补码</strong> = 反码 + 1 = <span class="mono">' + two + '</span>；' +
          '<strong>移码</strong> = 补码符号位取反 = <span class="mono">' + C.intToBias(v, 8) + '</span>。' +
          '（十六进制：<span class="mono">0x' + vHex + '</span>）');
      }
      note.innerHTML = noteHtml;
    }
    slider.addEventListener('input', () => { num.value = slider.value; paint(+slider.value); });
    num.addEventListener('input', () => {
      let v = +num.value;
      if (isNaN(v)) return;
      v = Math.max(-128, Math.min(127, Math.round(v)));
      slider.value = v; num.value = v;
      paint(v);
    });
    paint(-6);
  }

  /* ---------- 模块 B：逐步转换动画 ---------- */
  function moduleStepConversion(host) {
    host.innerHTML =
      '<p class="para">选一个<strong class="hl">负数</strong>，点“自动播放”，一步步看它怎么变成补码：</p>' +
      '<div class="field"><label>示例</label>' +
      '<select class="input" id="m2sel">' +
      '<option value="-6">-6</option><option value="-13">-13</option><option value="-64">-64</option>' +
      '<option value="-1">-1</option><option value="-128">-128（补码特例）</option>' +
      '</select>' +
      '<button class="btn btn-primary btn-sm" id="m2run" type="button">▶ 开始演示</button></div>' +
      '<div id="m2player"></div>';

    const player = host.querySelector('#m2player');
    const sel = host.querySelector('#m2sel');

    function buildSteps(v) {
      const mag = Math.abs(v).toString(2).padStart(7, '0');
      const inv = mag.split('').map(c => c === '0' ? '1' : '0').join('');
      const ones = C.intToOnesComp(v, 8);
      const two = C.intToTwoComp(v, 8);
      const steps = [
        {
          title: '第 1 步：先写绝对值',
          body:
            '<p class="para">把 ' + v + ' 的<strong>绝对值</strong> ' + Math.abs(v) + ' 写成 7 位二进制：</p>' +
            U.bitRow('绝对值', '0' + mag, { keepZero: true }) +
            '<p class="para muted small">注意：8 位原码用 1 位表示正负，剩下 7 位表示大小，所以这里先准备 7 位。</p>'
        },
        {
          title: '第 2 步：得到原码',
          body:
            '<p class="para">最前面加上<strong>符号位</strong>（负数填 <span class="mono">1</span>，正数填 <span class="mono">0</span>）：</p>' +
            U.bitRow('原码', '1' + mag, { signN: 1 }) +
            U.callout('info', '🎯', '原码 = <strong>符号位 + 绝对值</strong>。就像给数字贴一个“+/-”标签。')
        },
        {
          title: '第 3 步：数值位取反 → 反码',
          body:
            '<p class="para">符号位<strong>不变</strong>，7 位数值全部取反（0↔1）：</p>' +
            U.bitRow('原码', '1' + mag, { signN: 1 }) +
            '<div class="flow-row" style="margin:6px 0"><span class="dash-line"></span><span class="tag tag-shift">取反</span></div>' +
            U.bitRow('反码', ones, { signN: 1, highlight: [{ i: 0, cls: 'b-lit2' }] })
        },
        {
          title: '第 4 步：反码 + 1 → 补码 🎉',
          body:
            '<p class="para">在反码的<strong>最低位加 1</strong>（注意进位会一路传上去）：</p>' +
            '<div class="eqbox">' + ones + '<br>+ 00000001<hr>' + two + '</div>' +
            U.bitRow('补码', two, { signN: 1 }) +
            U.callout('ok', '✅', '补码 = <strong>反码 + 1</strong>。' + v + ' 的 8 位补码就是 <span class="mono">' + two + '</span>，' +
              '换算回十进制：-' + Math.abs(C.twoCompToInt(two)) + ' ✓')
        },
        {
          title: '第 5 步（选做）：补码符号位取反 → 移码',
          body:
            '<p class="para">把补码的符号位反过来（1→0），就得到<strong>移码</strong>：</p>' +
            U.bitRow('补码', two, { signN: 1, highlight: [{ i: 0, cls: 'b-lit' }] }) +
            '<div class="flow-row" style="margin:6px 0"><span class="dash-line"></span><span class="tag tag-shift">符号位取反</span></div>' +
            U.bitRow('移码', C.intToBias(v, 8), { signN: 1 }) +
            U.callout('info', '🧭', '移码也叫“偏置码”，好处是<strong>大小顺序和二进制一致</strong>：移码大的数一定大。所以浮点数的阶码都用移码，方便直接比较。')
        }
      ];
      if (v === -128) {
        steps[1].body += U.callout('warn', '⚠️',
          '注意：-128 的绝对值 128 需要 8 位（<span class="mono">10000000</span>），7 位放不下。它的补码恰好还是 <span class="mono">10000000</span>——' +
          '这正是补码比原码多表示一个数（-128）的原因！');
      }
      return steps;
    }

    function run() {
      const v = +sel.value;
      U.stepPlayer(player, { getSteps: () => buildSteps(v), interval: 2600 });
    }
    host.querySelector('#m2run').addEventListener('click', run);
    run();
  }

  /* ---------- 模块 C：数轴与取值范围 ---------- */
  function moduleRange(host) {
    host.innerHTML =
      '<p class="para">8 位补码能表示 <strong class="hl">-128 ~ 127</strong>，比原码/反码<strong>多一个 -128</strong>。拖动看不同码制的取值范围：</p>' +
      '<div class="field"><label>当前值</label><input type="range" class="slider" id="m3slider" min="-128" max="127" value="0">' +
      '<span class="mono" id="m3val">0</span></div>' +
      '<div class="numline" id="m3line"></div>' +
      '<div id="m3note" style="margin-top:12px"></div>';

    const line = host.querySelector('#m3line');
    const slider = host.querySelector('#m3slider');
    const valEl = host.querySelector('#m3val');
    const note = host.querySelector('#m3note');

    function paint(v) {
      valEl.textContent = v;
      let html = '';
      for (let x = -128; x <= 127; x++) {
        const hit = x === v;
        const inSm = x >= -127; // 原码/反码范围
        html += '<span class="nl' + (hit ? ' hit' : '') + '" title="' + x + '">' + (x < 0 || x > 9 ? x : x) + '</span>';
      }
      line.innerHTML = html;
      note.innerHTML =
        U.callout('info', '📏', '原码/反码的范围是 <strong>-127 ~ 127</strong>（因为 <span class="mono">10000000</span> 被浪费来表示 -0 了）；' +
          '补码把 <span class="mono">10000000</span> 用来表示 <strong>-128</strong>，所以范围更大。<br>' +
          '当前值 ' + v + '：补码 = <span class="mono">' + C.intToTwoComp(v, 8) + '</span>' +
          (v === -128 ? '，这个数只有补码能表示！' : ''));
    }
    slider.addEventListener('input', () => paint(+slider.value));
    paint(0);
  }

  /* ---------- 模块 D：ASCII ---------- */
  function moduleAscii(host) {
    host.innerHTML =
      '<div class="row"><div class="col">' +
      '<p class="para">计算机里<strong class="hl">文字也是数字</strong>。输入一个字符，看看它被编成了什么：</p>' +
      '<div class="field"><label>字符</label><input class="input" id="m4char" maxlength="1" value="A" style="width:64px;text-align:center"></div>' +
      '<div id="m4out"></div></div>' +
      '<div class="col"><p class="para small muted">常用 ASCII 对照（十进制）：</p>' +
      '<div class="table-wrap" style="overflow-x:auto"><table class="steptable" id="m4table"></table></div></div></div>';

    const charIn = host.querySelector('#m4char');
    const out = host.querySelector('#m4out');
    const table = host.querySelector('#m4table');

    const showcase = [
      ['0', 48, '数字零'], ['9', 57, '数字九'],
      ['A', 65, '大写 A'], ['Z', 90, '大写 Z'],
      ['a', 97, '小写 a'], ['z', 122, '小写 z'],
      [' ', 32, '空格'], ['?', 63, '问号']
    ];
    table.innerHTML = '<tr><th style="font-family:var(--font)">字符</th><th>十进制</th><th>十六进制</th><th>二进制</th><th style="font-family:var(--font)">说明</th></tr>' +
      showcase.map(r =>
        '<tr><td style="font-family:var(--font);font-weight:700">' + (r[0] === ' ' ? '␣(空格)' : r[0]) + '</td>' +
        '<td>' + r[1] + '</td><td>0x' + r[1].toString(16).toUpperCase() + '</td>' +
        '<td style="font-size:12px">' + r[1].toString(2).padStart(8, '0') + '</td>' +
        '<td style="font-family:var(--font);font-size:12.5px;color:var(--muted)">' + r[2] + '</td></tr>').join('');

    function paint() {
      const ch = charIn.value || ' ';
      const code = ch.charCodeAt(0);
      out.innerHTML =
        U.bitRow('ASCII 码', code.toString(2).padStart(8, '0'), { signN: 0 }) +
        '<div class="field" style="margin-top:10px">' +
        '<span class="tag tag-ok">十进制 ' + code + '</span>' +
        '<span class="tag tag-warn">十六进制 0x' + code.toString(16).toUpperCase().padStart(2, '0') + '</span>' +
        (code >= 48 && code <= 57 ? '<span class="tag tag-add">数字</span>' :
          code >= 65 && code <= 90 ? '<span class="tag tag-add">大写字母</span>' :
            code >= 97 && code <= 122 ? '<span class="tag tag-add">小写字母</span>' : '') +
        '</div>' +
        U.callout('info', '🔤', '小知识：大写 <span class="mono">A=65</span>、小写 <span class="mono">a=97</span>，大小写之间正好相差 32。' +
          '7 位 ASCII 只能表示 128 个字符；中文用 <strong>GB2312 / GBK / UTF-8</strong> 等编码（每个汉字占 2~4 字节）。');
    }
    charIn.addEventListener('input', paint);
    paint();
  }

  /* ---------- 模块 E：汉字编码流程 ---------- */
  function moduleChinese(host) {
    host.innerHTML =
      '<p class="para">汉字“<strong class="hl">中</strong>”在 GB2312 编码里的完整旅程：</p>' +
      '<div class="schematic"><div class="flow-row" style="justify-content:center" id="m5flow"></div></div>' +
      '<div id="m5player" style="margin-top:14px"></div>';

    const flow = host.querySelector('#m5flow');
    flow.innerHTML =
      '<div class="flow-box">输入码<br><span class="muted small">zhong（拼音）</span></div>' +
      '<span class="flow-arrow">→</span>' +
      '<div class="flow-box">区位码<br><span class="muted small">54 48</span></div>' +
      '<span class="flow-arrow">→</span>' +
      '<div class="flow-box">国标码<br><span class="muted small">D6 D0</span></div>' +
      '<span class="flow-arrow">→</span>' +
      '<div class="flow-box">机内码<br><span class="muted small">D6 D0</span></div>' +
      '<span class="flow-arrow">→</span>' +
      '<div class="flow-box">字形码<br><span class="muted small">16×16 点阵</span></div>';

    const player = host.querySelector('#m5player');
    U.stepPlayer(player, {
      interval: 3000,
      getSteps: () => [
        {
          title: '输入码：你敲的是什么',
          body: '<p class="para">你在键盘上敲 <span class="mono">zhong</span>，输入法把它翻译成一个“<strong>中</strong>”。这一步是<strong>人和计算机的接口</strong>，跟编码无关。</p>' +
            '<div class="field"><span class="tag tag-ok">输入码（拼音/五笔）</span> <span class="tag">目的：方便人</span></div>'
        },
        {
          title: '国标码：查表编号',
          body: '<p class="para">GB2312 给每个汉字发了一个“身份证号”。查表得知：“中”在 <strong>区位 5448</strong>，转换成十六进制就是 <span class="mono">D6D0</span>。</p>' +
            '<div class="eqbox">“中” → 区位码 <span class="hl">54 48</span> → 国标码 <span class="hl">D6 D0</span></div>' +
            U.callout('info', '🗂️', '国标码 = 区位码（十进制）+ 32（十六进制 20H）后的结果，目的是避开 ASCII 控制字符。')
        },
        {
          title: '机内码：计算机里真正存的值',
          body: '<p class="para">为了和 ASCII（最高位 0）区分开，把国标码的<strong>两个字节最高位都置 1</strong>（+80H），得到机内码：</p>' +
            '<div class="eqbox"><span class="dim">国标码</span> D6 D0<br><span class="dim">机内码</span> <span class="hl">D6 D0</span>（最高位置 1）</div>' +
            '<p class="para">所以“中”在内存里就是两个字节：<span class="mono">0xD6 0xD0</span>。</p>'
        },
        {
          title: '字形码：显示出来',
          body: '<p class="para">最后，显卡根据字库里的<strong>点阵数据</strong>把“中”画出来——16×16 点阵 = 32 字节：</p>' +
            '<div style="display:grid;grid-template-columns:repeat(16,10px);gap:1px;width:176px;margin:8px auto" id="m5dots"></div>' +
            '<p class="para small muted">1 表示“这个点要涂黑”，0 表示“留白”。字体、字号不同，字形码就不同。</p>'
        }
      ],
      onStep: (i) => {
        if (i === 3) {
          const box = document.getElementById('m5dots');
          if (!box) return;
          const glyph = [
            0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
            0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0,
            0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0,
            0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0,
            0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0,
            0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0,
            0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0,
            0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0,
            0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0,
            0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0,
            0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0,
            0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0,
            0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0,
            0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0,
            0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0,
            0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
          ];
          box.innerHTML = glyph.map(g => '<span style="width:10px;height:10px;background:' + (g ? '#4f46e5' : '#eef2f7') + ';border-radius:2px"></span>').join('');
        }
      }
    });
  }

  /* ---------- 渲染整章 ---------- */
  function render(container) {
    const body =
      U.chapHero(['#4f46e5', '#7c3aed'], '第 1 章', '数据与文字的表示方法',
        '计算机只认识 0 和 1。那么，一个“-6”、一个“中”字，是怎么变成 0101 0101 的？这一章把 4 种常用编码一次讲透。',
        ['原码', '反码', '补码', '移码', 'ASCII', '汉字编码']) +

      U.sec('ch1-0', '🧠 先建立直觉：机器数 vs 真值',
        '<p class="para">在纸上写 <span class="mono">-6</span>，你看到的是“负号 + 6”。但计算机的电路里<strong>没有负号</strong>，只有高电平（1）和低电平（0）。' +
        '于是人们发明了不同的“<strong class="hl">机器数</strong>”约定，把符号也编成 0/1。真值就是真实数值，机器数就是它在计算机里的 0/1 样子。</p>' +
        '<div class="row">' +
        '<div class="col">' + U.callout('info', '📌', '四种常见约定：<strong>原码</strong>（直观但有 -0）、<strong>反码</strong>（过渡品）、<strong>补码</strong>（加减法统一、最常用）、<strong>移码</strong>（比大小方便，浮点阶码用它）。') + '</div>' +
        '<div class="col">' + U.callout('ok', '🎯', '本章目标：看到任意 <span class="mono">8 位 0/1</span>，能立刻说出它按每种约定代表几；反过来，给你一个数，能写出四种编码。') + '</div>' +
        '</div>' +
        '<div id="m1host"></div>') +

      U.sec('ch1-1', '🕹️ 试试看：码制转换器', '<div id="m1"></div>') +

      U.sec('ch1-2', '🎬 动画：负数怎么变成补码', '<div id="m2"></div>') +

      U.sec('ch1-3', '📏 取值范围：为什么补码多一个 -128',
        '<p class="para">8 位一共 256 种组合。原码把 <span class="mono">10000000</span> 浪费给了“-0”，所以少一个数；补码把它回收用于 <span class="mono">-128</span>。</p>' +
        '<div id="m3"></div>') +

      U.sec('ch1-4', '🔤 文字的表示：ASCII 与汉字编码', '<div id="m4"></div><div style="height:14px"></div><div id="m5"></div>') +

      U.sec('ch1-5', '🧪 小测验',
        '<div id="quiz1"></div><div id="quiz2" style="margin-top:16px"></div><div id="quiz3" style="margin-top:16px"></div>');

    container.innerHTML = body;
    moduleConverter(container.querySelector('#m1'));
    moduleStepConversion(container.querySelector('#m2'));
    moduleRange(container.querySelector('#m3'));
    moduleAscii(container.querySelector('#m4'));
    moduleChinese(container.querySelector('#m5'));

    U.quiz(container.querySelector('#quiz1'), {
      question: 'Q1. 8 位补码 11111010 表示哪个十进制数？',
      options: ['-5', '-6', '-122', '250'],
      correct: 1,
      explain: '符号位 1 是负数。数值位 1111010 取反加 1 得 0000110 = 6，所以是 -6。'
    });
    U.quiz(container.querySelector('#quiz2'), {
      question: 'Q2. -1 的 8 位补码是？',
      options: ['10000001', '11111110', '11111111', '00000001'],
      correct: 2,
      explain: '反码 11111110 + 1 = 11111111。补码 -1 全 1，记牢它！'
    });
    U.quiz(container.querySelector('#quiz3'), {
      question: 'Q3. 大写字母 A 的 ASCII 是 65，那么小写 a 是？',
      options: ['66', '97', '96', '100'],
      correct: 1,
      explain: '大小写相差 32：a = 65 + 32 = 97 = 0x61。'
    });
  }

  global.CH1 = { render };
})(typeof window !== 'undefined' ? window : globalThis);
