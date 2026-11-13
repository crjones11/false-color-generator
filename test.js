const F = require('./engine.js');
const assert = require('assert');
let n = 0; const ok = (c, msg) => { n++; assert.ok(c, msg); };
const near = (a, b, tol, msg) => ok(Math.abs(a - b) <= tol, `${msg}: got ${a}, want ${b} +/- ${tol}`);

// 1. Curves: round trip and published anchor points (18% grey, black)
for (const [k, c] of Object.entries(F.CURVES)) {
  for (const x of [-0.005, 0, 0.001, 0.004, 0.006, 0.0105, 0.012, 0.18, 1, 10, 50]) near(c.lin(c.enc(x)), x, 1e-6 * Math.max(1, Math.abs(x)), `${k} round trip at ${x}`);
  for (let i = 1; i < 200; i++) ok(c.enc(i / 50) > c.enc((i - 1) / 50), `${k} monotonic`);
}
near(F.CURVES.log3g10.enc(0.18) * 1023, 341.0, 0.1, 'Log3G10 18% grey');
near(F.CURVES.log3g10.enc(0) * 1023, 93.7, 0.1, 'Log3G10 black');
near(F.CURVES.logc3.enc(0.18), 0.391, 0.001, 'LogC3 18% grey');
near(F.CURVES.slog3.enc(0.18) * 1023, 420, 0.01, 'S-Log3 18% grey');
near(F.CURVES.slog3.enc(0) * 1023, 95, 0.01, 'S-Log3 black');
near(F.CURVES.logc4.enc(0.18), 0.2784, 0.0005, 'LogC4 18% grey');
near(F.CURVES.logc4.enc(0) * 1023, 95, 0.01, 'LogC4 black');
near(F.CURVES.bmdgen5.enc(0.18), 0.3836, 0.0005, 'BMD Gen5 18% grey');

// 2. ZR profile, low circuit, against measurements from the frames
const zr = { make: 'Nikon', model: 'ZR', curve: 'log3g10', baseISO: 800, clipCV: 792, greyCV: 406, dr2: 10.2, dr1: 11.5, isoList: [800, 1600], isoShifts: true, greyBand: 1 / 6, pictureStops: 0, lutSize: 33, conservativeClip: true, inputLegal: false };
ok(F.validate(zr).length === 0, 'ZR profile valid');
const m800 = F.buildModel(zr, 800), m1600 = F.buildModel(zr, 1600);
near(m800.over, 5.65, 0.02, 'ISO 800 stops over grey');
near(m800.under2, 4.55, 0.02, 'ISO 800 stops under grey (SNR2)');
near(m800.floor2CV, 159.7, 0.3, 'ISO 800 SNR2 floor CV');
near(m800.floor1CV, 125.9, 0.3, 'ISO 800 SNR1 floor CV');
near(m1600.clipCV, 861.0, 0.2, 'ISO 1600 clip CV (frame max was 861.9)');
near(m1600.over, 6.65, 0.02, 'ISO 1600 stops over grey');
near(m1600.greyCV, 406, 0, 'grey unchanged by ISO');
const zrHi = Object.assign({}, zr, { baseISO: 6400, greyCV: 399, dr2: 9.16, dr1: 10.9, isoList: [3200, 6400] });
near(F.buildModel(zrHi, 3200).clipCV, 723.0, 0.2, 'ISO 3200 clip CV (frame pile-up was 722.9)');
near(F.buildModel(zrHi, 6400).floor2CV, 200.8, 0.3, 'ISO 6400 SNR2 floor CV');

// 3. Zones: contiguous, ordered, whole stops
for (const m of [m800, m1600]) {
  for (let i = 1; i < m.zones.length; i++) near(m.zones[i].hiLin, m.zones[i - 1].loLin, 1e-12, 'zones contiguous');
  m.zones.filter(z => z.kind === 'hi' || z.kind === 'lo').forEach(z => near(Math.log2(z.hiLin / z.loLin), 1, 1e-9, 'zone is one stop wide'));
  ok(m.zones[0].kind === 'clip' && m.zones[m.zones.length - 1].kind === 'noise', 'ends are clip and noise');
}
ok(m800.nHi === 5 && m800.nLo === 4, `ISO 800 zone counts ${m800.nHi}/${m800.nLo}`);
// hand-calculated: one stop below clip 792 in Log3G10 = 723.0
near(m800.zones[1].loCV, 723.0, 0.2, 'first highlight edge');

{ const w = F.buildModel(Object.assign({}, zr, { pictureStops: 1 }), 800); ok(w.nHi === 4 && w.nLo === 3, `picture 1 stop: ${w.nHi}/${w.nLo}`);
  const mids = w.zones.filter(z => z.kind === 'mid'); ok(Math.log2(mids[0].hiLin / w.greyLin) >= 1 && Math.log2(w.greyLin / mids[1].loLin) >= 1, 'picture reaches at least one stop each side');
  ok(F.buildModel(Object.assign({}, zr, { pictureStops: undefined }), 800).nHi === 4, 'default picture zone is 1 stop'); }
// 4. Classification
const C = F.CURVES.log3g10, e = l => C.enc(l), T = F.clipThreshold(m800, 1024, false);
const grey = v => F.classify(m800, v, v, v, T), same = (a, b) => a.every((x, i) => Math.abs(x - b[i]) < 1e-9);
const rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255), P = F.PALETTE;
ok(same(grey(792.5 / 1023), rgb(P.clip)), 'at clip -> clip colour');
ok(same(grey(780 / 1023), rgb(P.hi[0])), 'just under clip -> first highlight zone');
ok(same(grey(e(m800.clipLin / 2.1)), rgb(P.hi[1])), '1.07 stops under clip -> second zone');
ok(same(grey(406 / 1023), rgb(P.grey)), 'metered grey -> green');
ok(same(grey(e(m800.greyLin * 1.2)), [e(m800.greyLin * 1.2), e(m800.greyLin * 1.2), e(m800.greyLin * 1.2)]), 'just above grey band -> picture passes through');
ok(same(grey(e(m800.floor2Lin * 1.5)), rgb(P.lo[0])), 'half a stop above floor -> first shadow zone');
ok(same(grey(e(m800.floor2Lin * 0.8)), rgb(P.caution)), 'between floors -> caution');
ok(same(grey(100 / 1023), rgb(P.noise)), 'below SNR1 floor -> noise');
// saturated red: red channel clipped, luma well below clip -> still flagged
ok(same(F.classify(m800, 0.78, 0.35, 0.30, T), rgb(P.clip)), 'one clipped channel -> clip colour');
ok(same(F.classify(m800, 0.76, 0.35, 0.30, T), rgb(P.hi[0])), 'one channel near clip -> highlight zone');

// 5. LUT text
const full = F.makeCube(m800, { size: 33, output: 'full', conservativeClip: true, title: 't' });
const legal = F.makeCube(m800, { size: 33, output: 'legal', conservativeClip: true, title: 't' });
const rows = s => s.split('\n').filter(l => /^[0-9.-]/.test(l)).map(l => l.split(' ').map(Number));
const rf = rows(full), rl = rows(legal);
ok(rf.length === 33 ** 3 && rl.length === 33 ** 3, 'row count');
let worst = 0; for (let i = 0; i < rf.length; i++) for (let k = 0; k < 3; k++) worst = Math.max(worst, Math.abs(rl[i][k] - (64 + 876 * rf[i][k]) / 1023));
ok(worst < 2e-6, `legal = 64/1023 + full*876/1023 (worst ${worst})`);
// R varies fastest: row 1 is (1/32, 0, 0)
const close = (a, b) => a.every((x, i) => Math.abs(x - b[i]) < 1e-6), T33 = F.clipThreshold(m800, 33, true);
ok(close(rf[12], F.classify(m800, 12 / 32, 0, 0, T33)) && close(rf[12 * 33], F.classify(m800, 0, 12 / 32, 0, T33)) && !close(rf[12], rf[12 * 33]), 'R varies fastest');
// conservative clip: threshold is the lattice point at or below 792 -> node 24 = CV 767.25
near(F.clipThreshold(m800, 33, true) * 1023, 767.25, 0.01, 'conservative clip node');
const node = i => rf[i * (33 * 33 + 33 + 1)];
ok(same(node(24), rgb(P.clip)) && !same(node(23), rgb(P.clip)), 'grey axis: node 24 red, node 23 not');
// legal (unexpanded) input: legal-coded clip (742.2) lands on the same decision as full 792
const mi = F.makeCube(m800, { size: 65, output: 'full', inputLegal: true, conservativeClip: false, title: 't' });
const ri = rows(mi), nodeI = i => ri[i * (65 * 65 + 65 + 1)];
const legalClipNode = Math.ceil(F.fullToLegalCV(792) / 1023 * 64);
ok(same(nodeI(legalClipNode), rgb(P.clip)) && !same(nodeI(legalClipNode - 1), rgb(P.clip)), 'legal-input LUT clips at the legal-coded clip level');

// 6. Export bundle and zip structure
const ex = F.exportAll(zr, { date: '2026-11-12' });
ok(ex.files.length === 2 * 2 + 2 + 2, 'file count');
const tf = JSON.parse(F.makeTfc4(m800)); ok(tf.ranges[0].pos === '0' && tf.ranges[tf.ranges.length - 1].pos === '100', 'tfc4 ends');
for (let i = 1; i < tf.ranges.length; i++) ok(parseFloat(tf.ranges[i].pos) > parseFloat(tf.ranges[i - 1].pos), 'tfc4 positions increase');
near(parseFloat(tf.ranges.find(r => r.rgba.r === '1' && r.rgba.g === '0' && r.rgba.b === '0').pos), 792 / 1023 * 100, 0.001, 'tfc4 clip position');
ok(ex.files.some(f => f.name.endsWith('Nikon_ZR_Log3G10_ISO1600_FalseColor_Legal_33.cube')), 'file naming');
ok(ex.zip[0] === 0x50 && ex.zip[1] === 0x4B, 'zip signature');
ok(F.crc32(new TextEncoder().encode('123456789')) === 0xCBF43926, 'crc32 check value');
ok(!/<script>/.test(F.makeReport(Object.assign({}, zr, { model: '<script>x</script>' }), [m800], {})), 'report escapes HTML');
ok(/Gunther Machu/.test(F.makeReport(Object.assign({}, zr, { credit: { org: 'CineD', tester: 'Gunther Machu', title: 'Nikon ZR Lab Test', url: 'https://www.cined.com/x' } }), [m800], {})), 'report credits the tester');
// no-floor mode (camera without Imatest data): no shadow colors, picture to the bottom
{ const nf = Object.assign({}, zr, { floorKnown: false, dr2: NaN, dr1: NaN, pictureStops: 1 });
  ok(F.validate(nf).length === 0, 'no-floor profile valid without DR figures');
  const m = F.buildModel(nf, 800);
  ok(m.nLo === 0 && isNaN(m.under2) && !m.zones.some(z => ['lo', 'caution', 'noise'].includes(z.kind)), 'no-floor: no shadow zones');
  const last = m.zones[m.zones.length - 1]; ok(last.kind === 'mid' && last.loCV === 0, 'picture runs to code value 0');
  for (let i = 1; i < m.zones.length; i++) near(m.zones[i].hiLin, m.zones[i - 1].loLin, 1e-12, 'no-floor zones contiguous');
  const T = F.clipThreshold(m, 1024, false), v = 120 / 1023, c = F.classify(m, v, v, v, T);
  ok(c.every(x => Math.abs(x - v) < 1e-9), 'deep shadow passes through as picture');
  ok(/Not measured/.test(F.makeReport(nf, [m], {})), 'report says floor not measured');
  const tf = JSON.parse(F.makeTfc4(m)); ok(tf.ranges[0].grayscale_up === 'false' && tf.ranges.some(r => r.grayscale_up === 'true'), 'tfc4 builds');
  F.makeCube(m, { size: 17, output: 'full', title: 't' }); }
// S-Log3 against Sony's published 90% value
near(F.CURVES.slog3.enc(0.9) * 1023, 598, 0.5, 'S-Log3 90% white');
// validation
ok(F.validate(Object.assign({}, zr, { greyCV: 800 })).length > 0, 'grey above clip rejected');
ok(F.validate(Object.assign({}, zr, { dr1: 9 })).length > 0, 'SNR1 < SNR2 rejected');

console.log(`${n} checks passed`);
