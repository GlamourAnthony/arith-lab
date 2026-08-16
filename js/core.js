/* ============================================================
 * core.js —— 纯算法核心（无 DOM 依赖，可在 Node 中直接测试）
 * 涵盖：码制转换、补码加减、原码一位乘法、Booth 补码一位乘法、
 *       恢复余数除法、加减交替除法、IEEE754、浮点加减五步、74181
 * ============================================================ */
(function (global) {
  'use strict';

  const Core = {};

  /* ---------------- 位串工具 ---------------- */
  function pad(s, n) { s = String(s); while (s.length < n) s = '0' + s; return s; }

  // 整数 → n 位补码
  Core.intToTwoComp = function (dec, n) {
    let v = ((dec % (1 << n)) + (1 << n)) % (1 << n);
    return pad(v.toString(2), n);
  };
  // n 位补码 → 整数
  Core.twoCompToInt = function (bits) {
    let v = parseInt(bits, 2);
    if (bits[0] === '1') v -= (1 << bits.length);
    return v;
  };
  // 整数 → n 位原码（1 符号位 + n-1 数值位）
  Core.intToSignMag = function (dec, n) {
    const sign = dec < 0 ? '1' : '0';
    return sign + pad(Math.abs(dec).toString(2), n - 1);
  };
  // 原码 → 整数
  Core.signMagToInt = function (bits) {
    const neg = bits[0] === '1';
    return neg ? -parseInt(bits.slice(1) || '0', 2) : parseInt(bits.slice(1) || '0', 2);
  };
  // 整数 → n 位反码
  Core.intToOnesComp = function (dec, n) {
    if (dec >= 0) return pad(dec.toString(2), n);
    const mag = pad(Math.abs(dec).toString(2), n - 1);
    return '1' + mag.split('').map(c => (c === '0' ? '1' : '0')).join('');
  };
  // 整数 → n 位移码（教材约定：偏置 2^(n-1)，可自定义）
  Core.intToBias = function (dec, n, bias) {
    const b = bias !== undefined ? bias : (1 << (n - 1));
    const v = ((dec + b) % (1 << n) + (1 << n)) % (1 << n);
    return pad(v.toString(2), n);
  };
  Core.biasToInt = function (bits, bias) {
    const b = bias !== undefined ? bias : (1 << (bits.length - 1));
    return parseInt(bits, 2) - b;
  };

  // 二进制串加法（等长），返回 {sum, carryOut, carries}
  Core.binAdd = function (a, b) {
    const n = Math.max(a.length, b.length);
    a = pad(a, n); b = pad(b, n);
    let carry = 0, out = '', carries = [];
    for (let i = n - 1; i >= 0; i--) {
      const s = (+a[i]) + (+b[i]) + carry;
      out = (s % 2) + out;
      carries[i] = carry;
      carry = s >= 2 ? 1 : 0;
    }
    return { sum: out, carryOut: carry, carries };
  };
  // 补码取负（连同符号位取反加 1）
  Core.negTwoComp = function (bits) {
    const inv = bits.split('').map(c => (c === '0' ? '1' : '0')).join('');
    return Core.binAdd(inv, pad('1', bits.length)).sum;
  };
  // 算术右移（按符号位填充）
  Core.arithShiftRight = function (bits, k) {
    return bits[0].repeat(k) + bits.slice(0, bits.length - k);
  };
  // 左移一位（低位补 0，丢掉最高位）
  Core.shiftLeft1 = function (bits) {
    return bits.slice(1) + '0';
  };

  /* ---------------- 定点小数 ---------------- */
  // 十进制小数 0 ≤ x < 1 → n 位二进制小数
  Core.fracToBin = function (x, n) {
    let out = '';
    for (let i = 0; i < n; i++) {
      x *= 2;
      const b = Math.floor(x + 1e-12);
      out += b;
      x -= b;
    }
    return out;
  };
  Core.binToFrac = function (bits) {
    let v = 0;
    for (let i = 0; i < bits.length; i++) v += (+bits[i]) * Math.pow(2, -(i + 1));
    return v;
  };
  // n 位补码定点小数串（x0.x1...）→ 十进制值
  Core.fixCompToFrac = function (bits) {
    if (bits[0] === '0') return Core.binToFrac(bits.slice(1));
    return -1 + Core.binToFrac(bits.slice(1));
  };

  /* ============================================================
   * 1. 补码加减法（整数，n 位）—— 双符号位（变形补码）判溢出
   * 双符号位版本宽度 = n + 1（重复符号位一次）
   * ============================================================ */
  Core.addSubSteps = function (decA, decB, n, isSub) {
    const aComp = Core.intToTwoComp(decA, n);
    const bOrig = Core.intToTwoComp(decB, n);
    // 边界特例：-2^(n-1) 的相反数超出范围，双符号位法失效，需单独说明
    const edgeCase = isSub && decB === -(1 << (n - 1));
    const bComp = isSub ? Core.negTwoComp(bOrig) : bOrig;
    const aD = aComp[0] + aComp;      // 双符号位
    const bD = bComp[0] + bComp;
    const res = Core.binAdd(aD, bD);
    const sumBits = res.sum;
    const sSign = sumBits.slice(0, 2);
    let overflow = false, ovType = '';
    if (sSign === '01') { overflow = true; ovType = '上溢（正溢出）'; }
    else if (sSign === '10') { overflow = true; ovType = '下溢（负溢出）'; }
    const finalBits = sumBits.slice(1); // 去掉一个符号位 → n 位
    let decResult = Core.twoCompToInt(finalBits);
    const expResult = isSub ? decA - decB : decA + decB;
    let edgeNote = '';
    if (edgeCase) {
      // 精确判定：A - (-2^(n-1)) = A + 2^(n-1)，当 A ≥ 0 时必然上溢
      overflow = decA >= 0;
      ovType = '上溢（正溢出）';
      decResult = decA + (1 << (n - 1));
      edgeNote = '边界特例：' + (-(1 << (n - 1))) + ' 的相反数 +' + (1 << (n - 1)) +
        ' 无法用 ' + n + ' 位补码表示，[-B]补 只能取回绕值（' + Core.twoCompToInt(bComp) + '）。按精确结果判定溢出。';
    } else if (isSub) {
      // 一般情况也按精确值复核（防止双符号位在边界附近的歧义）
      const exact = decA - decB;
      const inRange = exact >= -(1 << (n - 1)) && exact <= (1 << (n - 1)) - 1;
      if (overflow !== !inRange) {
        overflow = !inRange;
        ovType = exact > 0 ? '上溢（正溢出）' : '下溢（负溢出）';
      }
    }
    return {
      aComp, bOrig, bComp, isSub, n, overflow, ovType,
      aD, bD, sumBits, sSign, finalBits, decResult, expResult,
      decA, decB, carries: res.carries, carryOut: res.carryOut, edgeNote
    };
  };

  /* ============================================================
   * 2. 原码一位乘法（定点小数，n 位数值位）
   * 乘积 = 2n 位（不含符号），符号单独处理
   * ============================================================ */
  Core.mulSignMag = function (xMag, yMag) {
    const n = xMag.length;
    const A = xMag;
    let P = '0'.repeat(n + 1);   // n+1 位（含进位保护位）
    let Q = yMag;
    const steps = [];
    for (let i = 0; i < n; i++) {
      const q0 = Q[Q.length - 1];
      let action = 'noop', addResult = null;
      if (q0 === '1') {
        addResult = Core.binAdd(P, '0' + A);
        P = addResult.sum;
        action = 'add';
      }
      const pq = P + Q;
      const shifted = '0' + pq.slice(0, pq.length - 1); // 逻辑右移
      const newP = shifted.slice(0, n + 1);
      const newQ = shifted.slice(n + 1);
      steps.push({
        i: i + 1, q0, action, carry: addResult ? addResult.carryOut : 0,
        P: P.slice(), Q: Q.slice(), newP, newQ
      });
      P = newP; Q = newQ;
    }
    const product = P.slice(1) + Q; // 2n 位
    return { steps, product, xMag, yMag };
  };

  /* ============================================================
   * 3. Booth 补码一位乘法（定点小数，N = n+1 位补码）
   * 做 N 步，最后一步不移位；精确乘积取 P||Y 前 2N-1 位
   * ============================================================ */
  Core.mulBooth = function (xComp, yComp) {
    const N = xComp.length;
    const negX = Core.negTwoComp(xComp);
    let P = '0'.repeat(N);
    let Y = yComp;
    let yE = '0';
    const steps = [];
    for (let i = 0; i < N; i++) {
      const yn = Y[Y.length - 1];
      const pair = yn + yE;
      let action = 'noop', addResult = null, added = null;
      if (pair === '01') { added = xComp; addResult = Core.binAdd(P, xComp); P = addResult.sum; action = 'addX'; }
      else if (pair === '10') { added = negX; addResult = Core.binAdd(P, negX); P = addResult.sum; action = 'addNegX'; }
      let newP = P, newY = Y, newYE = yE;
      if (i < N - 1) {
        const pys = P + Y + yE;
        const shifted = pys[0] + pys.slice(0, pys.length - 1); // 算术右移
        newP = shifted.slice(0, N);
        newY = shifted.slice(N, 2 * N);
        newYE = shifted.slice(2 * N);
      }
      steps.push({
        i: i + 1, pair, action, added,
        carry: addResult ? addResult.carryOut : 0,
        P: P.slice(), Y: Y.slice(), yE: yE.slice(),
        newP, newY, newYE, last: i === N - 1
      });
      P = newP; Y = newY; yE = newYE;
    }
    const full = P + Y;
    const product = full.slice(0, 2 * N - 1); // 精确乘积位
    return { steps, full, product, xComp, yComp, negX };
  };

  /* ============================================================
   * 4. 原码除法（定点小数，n 位数值位；要求 x < y）
   * 寄存器宽度 n+1 位，R 按无符号数值处理
   * 4.1 恢复余数法：每步先左移再减，不够减恢复
   * ============================================================ */
  Core.divRestore = function (xMag, yMag) {
    const n = xMag.length;
    const y5 = '0' + yMag;
    const negY5 = Core.negTwoComp(y5);
    let R = '0' + xMag;
    let q = '';
    const steps = [];
    for (let i = 0; i < n; i++) {
      const Rbefore = R;
      const Rshift = Core.shiftLeft1(R);
      const sub = Core.binAdd(Rshift, negY5);
      const negative = sub.sum[0] === '1'; // 借位 → 不够减
      let qi, Rafter;
      if (negative) { Rafter = Core.binAdd(sub.sum, y5).sum; qi = '0'; }
      else { Rafter = sub.sum; qi = '1'; }
      q += qi;
      steps.push({ i: i + 1, Rbefore, Rshift, diff: sub.sum, negative, qi, Rafter });
      R = Rafter;
    }
    return { steps, quotient: '0.' + q, qBits: q, remainder: R, xMag, yMag };
  };

  /* 4.2 加减交替法（不恢复余数法） */
  Core.divAlternate = function (xMag, yMag) {
    const n = xMag.length;
    const y5 = '0' + yMag;
    const negY5 = Core.negTwoComp(y5);
    const steps = [];
    let R;
    let prevQi = null;
    for (let i = 1; i <= n; i++) {
      let Rshift, op, operand, Rafter;
      if (i === 1) {
        Rshift = Core.shiftLeft1('0' + xMag);
        op = '-';
        operand = negY5;
        Rafter = Core.binAdd(Rshift, operand).sum;
      } else {
        Rshift = Core.shiftLeft1(R);
        op = prevQi === '1' ? '-' : '+';
        operand = op === '-' ? negY5 : y5;
        Rafter = Core.binAdd(Rshift, operand).sum;
      }
      const negative = Rafter[0] === '1';
      const qi = negative ? '0' : '1';
      steps.push({ i, Rshift, op, operand, Rafter, negative, qi, last: i === n });
      R = Rafter;
      prevQi = qi;
    }
    const needRestore = R[0] === '1';
    if (needRestore) R = Core.binAdd(R, y5).sum;
    return {
      steps,
      quotient: '0.' + steps.map(s => s.qi).join(''),
      qBits: steps.map(s => s.qi).join(''),
      remainder: R, needRestore, xMag, yMag
    };
  };

  /* ============================================================
   * 5. IEEE754 单精度 / 双精度
   * ============================================================ */
  Core.ieee754Single = function (dec) {
    const buf = new ArrayBuffer(4);
    const dv = new DataView(buf);
    dv.setFloat32(0, dec, false);
    const u32 = dv.getUint32(0, false);
    const sign = (u32 >>> 31) & 1;
    const exp = (u32 >>> 23) & 0xff;
    const mant = u32 & 0x7fffff;
    return {
      dec, sign, signBit: String(sign),
      expBits: pad(exp.toString(2), 8),
      expValue: exp - 127,
      mantBits: pad(mant.toString(2), 23),
      mantFrac: Core.binToFrac(pad(mant.toString(2), 23)),
      hex: '0x' + u32.toString(16).toUpperCase().padStart(8, '0'), u32
    };
  };

  Core.ieee754FromBits = function (bits32) {
    const u32 = parseInt(bits32, 2);
    const buf = new ArrayBuffer(4);
    new DataView(buf).setUint32(0, u32, false);
    return new DataView(buf).getFloat32(0, false);
  };

  /* ============================================================
   * 6. 浮点加减运算（教材风格：尾数 n 位补码 + 十进制阶码）
   * 五步：对阶 → 尾数求和 → 规格化 → 舍入 → 判溢出
   * ============================================================ */
  Core.floatAddSteps = function (mx, my, ex, ey, n) {
    const steps = [];
    const W = n + 3; // 工作精度（含 2 位保护位）
    const padW = s => s + '0'.repeat(Math.max(0, W - s.length));
    const mask = (1 << W) - 1;
    const half = 1 << (W - 1); // 1.0 对应的整数刻度

    // —— 第 1 步：对阶 ——
    const de = ex - ey;
    let mxA = padW(mx), myA = padW(my);
    let exA = ex, eyA = ey;
    let alignInfo = '';
    let dropBits = '', dropFirst = '';
    if (de > 0) {
      const k = Math.min(de, W);
      if (k >= W) {
        myA = '0'.repeat(W); // 数值小到可忽略，按 0 处理
        alignInfo = 'y 的阶码小，且相差 ≥ ' + W + ' 位，y 的尾数全部移出（贡献可忽略，按 0 处理）';
      } else {
        dropBits = myA.slice(W - k);
        dropFirst = dropBits[0];
        myA = Core.arithShiftRight(myA, k).slice(0, W);
        alignInfo = 'y 的阶码小，y 的尾数右移 ' + de + ' 位对齐';
      }
      eyA = ex;
    } else if (de < 0) {
      const k = Math.min(-de, W);
      if (k >= W) {
        mxA = '0'.repeat(W);
        alignInfo = 'x 的阶码小，且相差 ≥ ' + W + ' 位，x 的尾数全部移出（贡献可忽略，按 0 处理）';
      } else {
        dropBits = mxA.slice(W - k);
        dropFirst = dropBits[0];
        mxA = Core.arithShiftRight(mxA, k).slice(0, W);
        alignInfo = 'x 的阶码小，x 的尾数右移 ' + (-de) + ' 位对齐';
      }
      exA = ey;
    } else {
      alignInfo = '阶码相等，无需对阶';
    }
    steps.push({ type: 'align', de, alignInfo, mxA, myA, exA, eyA, dropBits, dropFirst });

    // —— 第 2 步：尾数求和（W+1 位，含溢出判断位）——
    const sx = mxA[0] + mxA, sy = myA[0] + myA;
    const sum = Core.binAdd(sx, sy);
    const sumW1 = sum.sum;
    const sumInt = Core.twoCompToInt(sumW1);
    steps.push({ type: 'sum', sx, sy, sumW1, sumInt });

    // —— 第 3 步：规格化（含舍入）——
    let mantN, expN = exA, shiftOp = 'none', shiftCount = 0, normInfo = '';
    let roundInfo = '对阶时未丢弃有效位，无需舍入';
    let applied = false;
    let needRight = sumInt >= half || sumInt <= -half;
    if (needRight) {
      // 右规：对缩放整数算术右移 1 位（值 ÷2），阶码 +1
      mantN = pad(((sumInt >> 1) & mask).toString(2), W);
      expN = exA + 1;
      shiftOp = 'right'; shiftCount = 1;
      normInfo = '尾数和的绝对值 ≥ 1，右规一位（阶码 +1）';
      if (dropFirst !== '') roundInfo = '右规丢弃 1 位低位（保护位），本演示按截断处理';
    } else {
      mantN = sumW1.slice(1); // 去掉冗余符号位 → W 位
      // 舍入（0 舍 1 入）——必须在左规之前进行
      if (dropFirst === '1') {
        mantN = Core.binAdd(mantN, pad('1', W)).sum;
        applied = true;
        roundInfo = '对阶丢弃位的最高位为 1，按 0 舍 1 入：尾数末位 +1';
        if (mantN === '1' + '0'.repeat(W - 1)) {
          // 舍入进位使尾数上溢（+1.0）→ 右规一位
          mantN = pad((1 << (W - 2)).toString(2), W);
          expN += 1;
          shiftOp = 'right'; shiftCount = 1;
          normInfo = '舍入进位使尾数上溢，右规一位（阶码 +1）';
          roundInfo += '；舍入进位使尾数上溢，右规一位、阶码 +1';
        }
      } else if (dropFirst === '0') {
        roundInfo = '对阶丢弃位的最高位为 0，直接舍去（0 舍）';
      }
      // 左规：直到规格化（符号位与次高位不同）
      if (mantN !== '0'.repeat(W)) {
        let guard = 0;
        while (mantN.length > 2 && mantN[0] === mantN[1] && mantN.slice(1).indexOf('1') >= 0 && guard < W) {
          mantN = Core.shiftLeft1(mantN);
          expN -= 1;
          guard++;
        }
        if (guard > 0) {
          shiftOp = 'left'; shiftCount = guard;
          normInfo = '尾数非规格化，左规 ' + guard + ' 位（阶码 -' + guard + '）';
        } else if (shiftOp === 'none') {
          normInfo = '尾数已规格化（0.1xxx 或 1.0xxx），无需移位';
        }
      } else {
        normInfo = '尾数和为 0，结果为 0';
        roundInfo = '尾数和恰为 0';
      }
    }
    const mantVal = Core.fixCompToFrac(mantN);
    steps.push({ type: 'norm', mantN, expN, shiftOp, shiftCount, normInfo, mantVal, roundInfo, applied });

    // —— 第 4 步：溢出判断（演示用 4 位阶码范围）——
    const maxExp = 7, minExp = -8;
    let ovInfo = '', ovType = 'none';
    if (expN > maxExp) { ovType = 'overflow'; ovInfo = '阶码 ' + expN + ' 上溢（超过 +' + maxExp + '）→ 结果溢出'; }
    else if (expN < minExp) { ovType = 'underflow'; ovInfo = '阶码 ' + expN + ' 下溢（小于 ' + minExp + '）→ 结果趋于 0'; }
    else ovInfo = '阶码 ' + expN + ' 在 [' + minExp + ', ' + maxExp + '] 内，无溢出 ✓';
    steps.push({ type: 'overflow', ovInfo, ovType, expN });

    const resultVal = Core.fixCompToFrac(mantN) * Math.pow(2, expN);
    return { steps, mx, my, ex, ey, n, mantN, expN, resultVal };
  };

  /* ============================================================
   * 7. 74181 功能表（正逻辑 / Active High）
   * ============================================================ */
  const T74181_LOGIC = [
    ['0000', 'F = ¬A', '取反（非 A）'],
    ['0001', 'F = ¬(A+B)', '或非'],
    ['0010', 'F = (¬A)·B', 'A 非 与 B'],
    ['0011', 'F = 0', '清零'],
    ['0100', 'F = ¬(A·B)', '与非'],
    ['0101', 'F = ¬B', '取反（非 B）'],
    ['0110', 'F = A⊕B', '异或'],
    ['0111', 'F = A·¬B', 'A 与 B 非'],
    ['1000', 'F = ¬A+B', 'A 非 或 B'],
    ['1001', 'F = ¬(A⊕B)', '同或'],
    ['1010', 'F = B', '传送 B'],
    ['1011', 'F = A·B', '与'],
    ['1100', 'F = 1', '置 1'],
    ['1101', 'F = A+¬B', 'A 或 B 非'],
    ['1110', 'F = A+B', '或'],
    ['1111', 'F = A', '传送 A']
  ];
  const T74181_ARITH = [
    ['0000', 'F = A', 'F = A + 1'],
    ['0001', 'F = A + B', 'F = (A+B) + 1'],
    ['0010', 'F = A + ¬B', 'F = (A+¬B) + 1'],
    ['0011', 'F = -1', 'F = 0'],
    ['0100', 'F = A + A·¬B', 'F = A + A·¬B + 1'],
    ['0101', 'F = (A+B) + A·¬B', 'F = (A+B) + A·¬B + 1'],
    ['0110', 'F = A - B - 1', 'F = A - B'],
    ['0111', 'F = A·¬B - 1', 'F = A·¬B'],
    ['1000', 'F = A + A·B', 'F = A + A·B + 1'],
    ['1001', 'F = A + B', 'F = A + B + 1'],
    ['1010', 'F = (A+¬B) + A·B', 'F = (A+¬B) + A·B + 1'],
    ['1011', 'F = A·B - 1', 'F = A·B'],
    ['1100', 'F = A + A（×2）', 'F = A + A + 1'],
    ['1101', 'F = (A+B) + A', 'F = (A+B) + A + 1'],
    ['1110', 'F = (A+¬B) + A', 'F = (A+¬B) + A + 1'],
    ['1111', 'F = A - 1', 'F = A']
  ];
  Core.T74181_LOGIC = T74181_LOGIC;
  Core.T74181_ARITH = T74181_ARITH;

  Core.alu74181 = function (S, M, Cn, A, B) {
    const idx = parseInt(S, 2);
    const a = parseInt(A, 2), b = parseInt(B, 2);
    const not = x => (~x) & 0xf;
    const and = (x, y) => (x & y) & 0xf;
    const or = (x, y) => (x | y) & 0xf;
    const xor = (x, y) => (x ^ y) & 0xf;
    const plus = (x, y) => (x + y) & 0xf;
    let f, name, formula;
    if (M === 1) {
      name = T74181_LOGIC[idx][2];
      formula = T74181_LOGIC[idx][1];
      switch (S) {
        case '0000': f = not(a); break;
        case '0001': f = not(or(a, b)); break;
        case '0010': f = and(not(a), b); break;
        case '0011': f = 0; break;
        case '0100': f = not(and(a, b)); break;
        case '0101': f = not(b); break;
        case '0110': f = xor(a, b); break;
        case '0111': f = and(a, not(b)); break;
        case '1000': f = or(not(a), b); break;
        case '1001': f = not(xor(a, b)); break;
        case '1010': f = b; break;
        case '1011': f = and(a, b); break;
        case '1100': f = 15; break;
        case '1101': f = or(a, not(b)); break;
        case '1110': f = or(a, b); break;
        case '1111': f = a; break;
      }
    } else {
      const row = T74181_ARITH[idx];
      // Cn（进位输入）：0 = 无进位（/Cn=H），1 = 有进位（/Cn=L）
      name = Cn === 1 ? row[2] : row[1];
      formula = Cn === 1 ? row[2] : row[1];
      let base;
      switch (S) {
        case '0000': base = a; break;
        case '0001': base = plus(a, b); break;
        case '0010': base = plus(a, not(b)); break;
        case '0011': base = 15; break; // -1
        case '0100': base = plus(a, and(a, not(b))); break;
        case '0101': base = plus(or(a, b), and(a, not(b))); break;
        case '0110': base = plus(a, not(b)); break; // A - B - 1 = A + ¬B (mod 16)
        case '0111': base = plus(and(a, not(b)), 15); break;
        case '1000': base = plus(a, and(a, b)); break;
        case '1001': base = plus(a, b); break;
        case '1010': base = plus(or(a, not(b)), and(a, b)); break;
        case '1011': base = plus(and(a, b), 15); break;
        case '1100': base = plus(a, a); break;
        case '1101': base = plus(or(a, b), a); break;
        case '1110': base = plus(or(a, not(b)), a); break;
        case '1111': base = plus(a, 15); break;
      }
      f = Cn === 1 ? plus(base, 1) : base;
    }
    return {
      f: pad(f.toString(2), 4), fHex: f.toString(16).toUpperCase(),
      fDec: f, name, formula
    };
  };

  global.Core = Core;
  if (typeof module !== 'undefined' && module.exports) module.exports = Core;
})(typeof window !== 'undefined' ? window : globalThis);
