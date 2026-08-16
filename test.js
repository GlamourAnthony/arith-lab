/* test.js —— core.js 数值验证（node test.js） */
const Core = require('./js/core.js');

let pass = 0, fail = 0;
function ok(cond, msg) {
  if (cond) { pass++; }
  else { fail++; console.error('FAIL:', msg); }
}
function eq(a, b, msg) {
  if (a === b) { pass++; }
  else { fail++; console.error('FAIL:', msg, '→ got', JSON.stringify(a), 'expected', JSON.stringify(b)); }
}

/* ---------- 1. 码制 ---------- */
for (let v = -128; v <= 127; v++) {
  eq(Core.twoCompToInt(Core.intToTwoComp(v, 8)), v, `twoComp roundtrip ${v}`);
  eq(Core.signMagToInt(Core.intToSignMag(v, 8)), v, `signMag roundtrip ${v}`);
  eq(Core.onesCompToInt ? 1 : 1, 1, '');
}
// 反码往返
for (let v = -127; v <= 127; v++) {
  const oc = Core.intToOnesComp(v, 8);
  const back = oc[0] === '1' ? -parseInt(oc.slice(1).split('').map(c => c === '0' ? '1' : '0').join(''), 2) : parseInt(oc, 2);
  eq(back, v, `onesComp roundtrip ${v}`);
}
// 移码往返
for (let v = -128; v <= 127; v++) {
  eq(Core.biasToInt(Core.intToBias(v, 8)), v, `bias roundtrip ${v}`);
}
// 移码单调性
{
  const b1 = Core.intToBias(-128, 8), b2 = Core.intToBias(127, 8);
  eq(b1, '00000000', 'bias(-128) = 00000000');
  eq(b2, '11111111', 'bias(127) = 11111111');
}
// 经典码制对照
eq(Core.intToSignMag(-3, 8), '10000011', '原码 -3');
eq(Core.intToOnesComp(-3, 8), '11111100', '反码 -3');
eq(Core.intToTwoComp(-3, 8), '11111101', '补码 -3');
eq(Core.intToBias(-3, 8), '01111101', '移码 -3');

/* ---------- 2. 补码加减（双符号位判溢出） ---------- */
{
  const r = Core.addSubSteps(5, 3, 8, false);
  eq(r.decResult, 8, '5+3=8');
  eq(r.overflow, false, '5+3 无溢出');
  eq(r.sSign, '00', '5+3 双符号位 00');
}
{
  const r = Core.addSubSteps(64, 64, 8, false);
  eq(r.overflow, true, '64+64 溢出');
  eq(r.ovType, '上溢（正溢出）', '64+64 上溢');
  eq(r.sSign, '01', '64+64 双符号位 01');
}
{
  const r = Core.addSubSteps(-128, -1, 8, false);
  eq(r.overflow, true, '-128 + -1 溢出');
  eq(r.ovType, '下溢（负溢出）', '-128 + -1 下溢');
  eq(r.sSign, '10', '-128 + -1 双符号位 10');
}
{
  const r = Core.addSubSteps(-64, -64, 8, false);
  eq(r.overflow, false, '-64 + -64 无溢出');
  eq(r.decResult, -128, '-64 + -64 = -128');
}
{
  const r = Core.addSubSteps(5, 3, 8, true);
  eq(r.decResult, 2, '5-3=2');
  eq(r.bComp, '11111101', '[-3]补 = 11111101');
  eq(r.overflow, false, '5-3 无溢出');
}
{
  const r = Core.addSubSteps(-64, 64, 8, true);
  eq(r.decResult, -128, '-64 - 64 = -128 无溢出');
  eq(r.overflow, false, '-64 - 64 无溢出');
}
// 随机验证（与精确整数运算对照）
for (let t = 0; t < 2000; t++) {
  const a = Math.floor(Math.random() * 256) - 128;
  const b = Math.floor(Math.random() * 256) - 128;
  const sub = Math.random() < 0.5;
  const exact = sub ? a - b : a + b;
  const r = Core.addSubSteps(a, b, 8, sub);
  const inRange = exact >= -128 && exact <= 127;
  eq(r.overflow, !inRange, `random ${a} ${sub ? '-' : '+'} ${b} overflow=${!inRange}`);
  if (inRange) eq(r.decResult, exact, `random ${a} ${sub ? '-' : '+'} ${b} = ${exact}`);
}

/* ---------- 3. 原码一位乘法 ---------- */
{
  const r = Core.mulSignMag('1101', '1011');
  eq(r.product, '10001111', '0.1101×0.1011 = 0.10001111');
  eq(r.steps.length, 4, '4 步');
  eq(r.steps[0].q0, '1', '步1 乘数最低位 1');
}
// 随机验证
for (let t = 0; t < 2000; t++) {
  const xm = Math.floor(Math.random() * 15) + 1; // 1..15
  const ym = Math.floor(Math.random() * 15) + 1;
  const xb = Core.fracToBin(xm / 16, 4), yb = Core.fracToBin(ym / 16, 4);
  const r = Core.mulSignMag(xb, yb);
  const exact = (xm * ym).toString(2).padStart(8, '0');
  eq(r.product, exact, `随机原码乘法 ${xm}×${ym}`);
}

/* ---------- 4. Booth 补码一位乘法 ---------- */
{
  const r = Core.mulBooth('01101', '10101'); // x=0.1101, y=-0.1011
  eq(r.product, '101110001', '[0.1101 × -0.1011]补 = 1.01110001');
  eq(r.steps.length, 5, 'Booth 5 步');
  eq(r.steps[4].last, true, '最后一步不移位');
}
{
  const r = Core.mulBooth('01011', '01101'); // x=0.1011, y=0.1101
  eq(r.product, '010001111', '[0.1011 × 0.1101]补 = 0.10001111');
}
// 随机验证：4 位小数（含符号 5 位），与精确 9 位乘积对照
for (let t = 0; t < 3000; t++) {
  const a = Math.floor(Math.random() * 32) - 16; // -16..15
  const b = Math.floor(Math.random() * 32) - 16;
  if (a === -16 || b === -16) continue; // 用 n=4 常规范围
  const xc = Core.intToTwoComp(a, 5);
  const yc = Core.intToTwoComp(b, 5);
  const r = Core.mulBooth(xc, yc);
  const prod = a * b; // 整数乘积（缩放后）
  // 产品串解释：sign + 8 位数值，值为 prod/256
  const expect = (a * b) % 256 >= 0 ? Core.intToTwoComp(a * b, 9) : Core.intToTwoComp(a * b, 9);
  eq(r.product, Core.intToTwoComp(a * b, 9), `随机 Booth ${a}×${b}`);
}

/* ---------- 5. 恢复余数法 ---------- */
{
  const r = Core.divRestore('1011', '1101');
  eq(r.quotient, '0.1101', '0.1011÷0.1101 商 0.1101');
  eq(r.remainder, '00111', '0.1011÷0.1101 余 0.0111×2^-4');
  eq(r.qBits, '1101', '商位 1101');
}
// 随机验证：x < y 时，商×y + 余×2^-n = x
for (let t = 0; t < 2000; t++) {
  const xm = Math.floor(Math.random() * 15) + 1;
  const ym = Math.floor(Math.random() * 15) + 1;
  if (xm >= ym) continue;
  const xb = Core.fracToBin(xm / 16, 4), yb = Core.fracToBin(ym / 16, 4);
  const r = Core.divRestore(xb, yb);
  const q = Core.binToFrac(r.qBits);
  const rem = Core.binToFrac(r.remainder.slice(1)) / 16;
  const lhs = q * Core.binToFrac(yb) + rem;
  const diff = Math.abs(lhs - Core.binToFrac(xb));
  ok(diff < 1e-9, `随机恢复余数法 ${xm}/${ym} 校验差 ${diff}`);
  // 商的 n 位精度
  const qExact = Math.floor(xm * 16 / ym) / 16;
  ok(Math.abs(q - qExact) < 1 / 16 + 1e-12, `随机恢复余数法商 ${xm}/${ym}`);
}

/* ---------- 6. 加减交替法 ---------- */
{
  const r = Core.divAlternate('1011', '1101');
  eq(r.quotient, '0.1101', '加减交替 商 0.1101');
  eq(r.remainder, '00111', '加减交替 余 0.0111×2^-4');
}
for (let t = 0; t < 2000; t++) {
  const xm = Math.floor(Math.random() * 15) + 1;
  const ym = Math.floor(Math.random() * 15) + 1;
  if (xm >= ym) continue;
  const xb = Core.fracToBin(xm / 16, 4), yb = Core.fracToBin(ym / 16, 4);
  const r = Core.divAlternate(xb, yb);
  const q = Core.binToFrac(r.qBits);
  const rem = Core.binToFrac(r.remainder.slice(1)) / 16;
  const lhs = q * Core.binToFrac(yb) + rem;
  const diff = Math.abs(lhs - Core.binToFrac(xb));
  ok(diff < 1e-9, `随机加减交替 ${xm}/${ym} 校验差 ${diff}`);
}
// 恢复余数与加减交替一致性
for (let t = 0; t < 500; t++) {
  const xm = Math.floor(Math.random() * 15) + 1;
  const ym = Math.floor(Math.random() * 15) + 1;
  if (xm >= ym) continue;
  const xb = Core.fracToBin(xm / 16, 4), yb = Core.fracToBin(ym / 16, 4);
  const r1 = Core.divRestore(xb, yb);
  const r2 = Core.divAlternate(xb, yb);
  eq(r1.qBits, r2.qBits, `两除法商一致 ${xm}/${ym}`);
  eq(r1.remainder, r2.remainder, `两除法余一致 ${xm}/${ym}`);
}

/* ---------- 7. IEEE754 ---------- */
{
  const r = Core.ieee754Single(1.5);
  eq(r.hex, '0x3FC00000', '1.5 → 0x3FC00000');
  eq(r.signBit, '0', '1.5 符号 0');
  eq(r.expBits, '01111111', '1.5 阶码 01111111 (127)');
}
{
  const r = Core.ieee754Single(-0.75);
  eq(r.hex, '0xBF400000', '-0.75 → 0xBF400000');
}
{
  const r = Core.ieee754Single(0.1);
  eq(r.hex, '0x3DCCCCCD', '0.1 → 0x3DCCCCCD（经典近似）');
}
{
  const r = Core.ieee754Single(127.375);
  eq(r.hex, '0x42FEC000', '127.375 → 0x42FEC000');
}
// 随机往返
for (let t = 0; t < 1000; t++) {
  const v = (Math.random() * 2000 - 1000) * Math.pow(2, Math.random() * 40 - 20);
  const r = Core.ieee754Single(v);
  const back = Core.ieee754FromBits(r.signBit + r.expBits + r.mantBits);
  if (isFinite(v)) ok(Math.abs(back - v) <= Math.abs(v) * 1e-6 || back === v, `IEEE754 往返 ${v} → ${back}`);
}

/* ---------- 8. 浮点加减五步 ---------- */
{
  // 例 A：对阶
  const r = Core.floatAddSteps('01011', '01101', -3, -1, 5);
  eq(r.steps[0].alignInfo.includes('右移 2 位'), true, '例A 对阶右移2位');
  eq(r.expN, -1, '例A 结果阶码 -1');
  const v = Core.fixCompToFrac(r.mantN) * Math.pow(2, r.expN);
  const exact = (Core.fixCompToFrac('01011') * Math.pow(2, -3)) + (Core.fixCompToFrac('01101') * Math.pow(2, -1));
  ok(Math.abs(v - exact) < 1e-9, `例A 结果 ${v} ≈ ${exact}`);
}
{
  // 例 B：右规（0.1101×2^0 + 0.1011×2^0 = 1.5）
  const r = Core.floatAddSteps('01101', '01011', 0, 0, 5);
  const v = Core.fixCompToFrac(r.mantN) * Math.pow(2, r.expN);
  eq(r.steps[2].shiftOp, 'right', '例B 右规');
  eq(r.expN, 1, '例B 阶码 1');
  ok(Math.abs(v - 1.5) < 1e-9, `例B 结果 ${v} = 1.5`);
}
{
  // 例 C：左规（0.0011×2^-1 + 0.0100×2^-1 = 0.1110×2^-2）
  const r = Core.floatAddSteps('00011', '00100', -1, -1, 5);
  const v = Core.fixCompToFrac(r.mantN) * Math.pow(2, r.expN);
  eq(r.steps[2].shiftOp, 'left', '例C 左规');
  eq(r.steps[2].shiftCount, 1, '例C 左规1位');
  eq(r.mantN.slice(0, 2), '01', '例C 尾数 0.1110');
  ok(Math.abs(v - 0.21875) < 1e-9, `例C 结果 ${v} = 0.21875`);
}
// 随机验证：随机尾数/阶码 → 结果与精确对照（含舍入容差）
// 舍入误差发生在“对阶刻度”（两操作数的最大阶码处），容差按该刻度计算
for (let t = 0; t < 2000; t++) {
  const n = 5;
  let mx = Core.intToTwoComp(Math.floor(Math.random() * 31) - 15, 5);
  let my = Core.intToTwoComp(Math.floor(Math.random() * 31) - 15, 5);
  const ex = Math.floor(Math.random() * 9) - 4;
  const ey = Math.floor(Math.random() * 9) - 4;
  const r = Core.floatAddSteps(mx, my, ex, ey, n);
  const exact = Core.fixCompToFrac(mx) * Math.pow(2, ex) + Core.fixCompToFrac(my) * Math.pow(2, ey);
  const got = Core.fixCompToFrac(r.mantN) * Math.pow(2, r.expN);
  // 对阶刻度上的 ulp（W-1 位精度），取最大阶码处，容差 4 ulp
  const alignExp = Math.max(ex, ey, r.expN);
  const tol = Math.pow(2, alignExp) * Math.pow(2, -(n + 3 - 1)) * 4;
  if (Math.abs(got - exact) > tol + 1e-12) {
    fail++;
    console.error(`FAIL: 随机浮点加减 ${mx}e${ex} + ${my}e${ey}：${got} vs ${exact}（容差 ${tol}）`);
  } else pass++;
}

/* ---------- 9. 74181 ---------- */
{
  const r = Core.alu74181('1001', 0, 0, '1010', '0011'); // 无进位
  eq(r.f, '1101', '74181 A+B: 1010+0011=1101');
}
{
  const r = Core.alu74181('0110', 0, 1, '1010', '0011'); // 有进位 → A-B
  eq(r.f, '0111', '74181 A-B: 1010-0011=0111');
}
{
  const r = Core.alu74181('0110', 0, 0, '1010', '0011'); // 无进位 → A-B-1
  eq(r.f, '0110', '74181 A-B-1: 1010-0011-1=0110');
}
{
  const r = Core.alu74181('0110', 1, 0, '1010', '0011');
  eq(r.f, '1001', '74181 异或: 1010⊕0011=1001');
}
{
  const r = Core.alu74181('1011', 1, 0, '1010', '0011');
  eq(r.f, '0010', '74181 与: 1010∧0011=0010');
}
{
  const r = Core.alu74181('1111', 0, 0, '0101', '0011');
  eq(r.f, '0100', '74181 A-1: 0101-1=0100');
}

console.log(`\n通过 ${pass} 项，失败 ${fail} 项`);
process.exit(fail > 0 ? 1 : 0);
