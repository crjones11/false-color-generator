/* False Color Generator engine. Pure functions, no DOM.
   One zone table per camera profile + ISO drives the preview, the report and the LUT. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.FCG = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const log10 = Math.log10, log2 = Math.log2;

  // ---- Log curves. enc: scene linear (0.18 = 18% gray) -> 0..1 full range. lin: inverse. ----
  const logc4 = (() => {
    const a = (Math.pow(2, 18) - 16) / 117.45, b = (1023 - 95) / 1023, c = 95 / 1023;
    const s = (7 * Math.LN2 * Math.pow(2, 7 - 14 * c / b)) / (a * b);
    const t = (Math.pow(2, 14 * (-c / b) + 6) - 64) / a;
    return {
      enc: x => x >= t ? (log2(a * x + 64) - 6) / 14 * b + c : (x - t) / s,
      lin: y => y >= 0 ? (Math.pow(2, 14 * (y - c) / b + 6) - 64) / a : y * s + t
    };
  })();

  // LogC3 is a family of curves, one per EI. ARRI "ALEXA Log C Curve, Usage in VFX" (2017), SUP 3.x, exposure values.
  // [cut, a, b, c, d, e, f]. ARRI: the formula cannot express EIs above 1600.
  const LOGC3_EI = {
    160: [0.005561, 5.555556, 0.080216, 0.269036, 0.381991, 5.842037, 0.092778],
    200: [0.006208, 5.555556, 0.076621, 0.266007, 0.382478, 5.776265, 0.092782],
    250: [0.006871, 5.555556, 0.072941, 0.262978, 0.382966, 5.710494, 0.092786],
    320: [0.007622, 5.555556, 0.068768, 0.259627, 0.383508, 5.637732, 0.092791],
    400: [0.008318, 5.555556, 0.064901, 0.256598, 0.383999, 5.571960, 0.092795],
    500: [0.009031, 5.555556, 0.060939, 0.253569, 0.384493, 5.506188, 0.092800],
    640: [0.009840, 5.555556, 0.056443, 0.250219, 0.385040, 5.433426, 0.092805],
    800: [0.010591, 5.555556, 0.052272, 0.247190, 0.385537, 5.367655, 0.092809],
    1000: [0.011361, 5.555556, 0.047996, 0.244161, 0.386036, 5.301883, 0.092814],
    1280: [0.012235, 5.555556, 0.043137, 0.240810, 0.386590, 5.229121, 0.092819],
    1600: [0.013047, 5.555556, 0.038625, 0.237781, 0.387093, 5.163350, 0.092824]
  };
  const logc3At = ei => {
    const [cut, a, b, c, d, e, f] = LOGC3_EI[ei];
    return {
      enc: x => x > cut ? c * log10(a * x + b) + d : e * x + f,
      lin: y => y > e * cut + f ? (Math.pow(10, (y - d) / c) - b) / a : (y - f) / e
    };
  };
  // Canon Log 2 / 3 v1.2 work in "reflection" where 0.18 is an 18% card; Canon's scene axis is reflection / 0.9.
  const clog2 = {
    enc: x => { x /= 0.9; const k = 0.24136077, m = 87.09937546, o = 0.092864125; return x < 0 ? -(k * log10(-x * m + 1)) + o : k * log10(x * m + 1) + o; },
    lin: y => { const k = 0.24136077, m = 87.09937546, o = 0.092864125; return 0.9 * (y < o ? -(Math.pow(10, (o - y) / k) - 1) / m : (Math.pow(10, (y - o) / k) - 1) / m); }
  };
  const clog3 = (() => {
    const k = 0.36726845, m = 14.98325, s = 1.9754798, so = 0.12512219, hi = 0.12240537, lo = 0.12783901;
    const lin = y => 0.9 * (y < 0.097465473 ? -(Math.pow(10, (lo - y) / k) - 1) / m : y <= 0.15277891 ? (y - so) / s : (Math.pow(10, (y - hi) / k) - 1) / m);
    const xLo = lin(0.097465473) / 0.9, xHi = lin(0.15277891) / 0.9;
    return { lin, enc: x => { x /= 0.9; return x < xLo ? -k * log10(-x * m + 1) + lo : x <= xHi ? s * x + so : k * log10(x * m + 1) + hi; } };
  })();
  const flog = (K) => ({
    enc: x => x < K.cut1 ? K.e * x + K.f : K.c * log10(K.a * x + K.b) + K.d,
    lin: y => y < K.cut2 ? (y - K.f) / K.e : (Math.pow(10, (y - K.d) / K.c) - K.b) / K.a
  });

  const CURVES = {
    log3g10: {
      name: 'RED Log3G10', short: 'Log3G10', verified: true,
      note: 'RED white paper formula. Also checked against Nikon ZR frames at four ISOs.',
      enc: x => { const v = x + 0.01; return v < 0 ? v * 15.1927 : 0.224282 * log10(v * 155.975327 + 1); },
      lin: y => y < 0 ? y / 15.1927 - 0.01 : (Math.pow(10, y / 0.224282) - 1) / 155.975327 - 0.01
    },
    logc3: {
      name: 'ARRI LogC3', short: 'LogC3', verified: true, perEI: true, eis: Object.keys(LOGC3_EI).map(Number),
      note: 'ARRI "ALEXA Log C Curve, Usage in VFX" (2017), SUP 3.x. One curve per EI, EI 160 to 1600. 18% gray = 400 at every EI.',
      at: ei => logc3At(ei),
      ...logc3At(800)
    },
    logc3_800: {
      name: 'ARRI LogC3 (fixed EI 800 curve)', short: 'LogC3EI800', verified: true,
      note: 'The EI 800 LogC3 curve at every ISO, as Panasonic and other non-ARRI cameras record it. 18% gray = 400.',
      ...logc3At(800)
    },
    logc4: {
      name: 'ARRI LogC4', short: 'LogC4', verified: true,
      note: 'ARRI LogC4 Specification. One curve at every EI. 18% gray = 0.2784 (code 285).',
      enc: logc4.enc, lin: logc4.lin
    },
    slog3: {
      name: 'Sony S-Log3', short: 'SLog3', verified: true, note: 'Sony Technical Summary for S-Gamut3/S-Log3 (0%, 18%, 90% code values 95, 420, 598).',
      enc: x => x >= 0.01125 ? (420 + log10((x + 0.01) / 0.19) * 261.5) / 1023 : (x * (171.2102946929 - 95) / 0.01125 + 95) / 1023,
      lin: y => y >= 171.2102946929 / 1023 ? Math.pow(10, (y * 1023 - 420) / 261.5) * 0.19 - 0.01 : (y * 1023 - 95) * 0.01125 / (171.2102946929 - 95)
    },
    clog2: {
      name: 'Canon Log 2', short: 'CLog2', verified: true,
      note: 'Canon Log 2 v1.2. Canon HDR white paper: 18% gray = code 407 (39.8%).', enc: clog2.enc, lin: clog2.lin
    },
    clog3: {
      name: 'Canon Log 3', short: 'CLog3', verified: true,
      note: 'Canon Log 3 v1.2. Canon HDR white paper: 18% gray = code 351 (34.3%).', enc: clog3.enc, lin: clog3.lin
    },
    vlog: {
      name: 'Panasonic V-Log', short: 'VLog', verified: true,
      note: 'Panasonic V-Log/V-Gamut Reference Manual: 0%, 18%, 90% = code 128, 433, 602. Also covers V-Log L.',
      enc: x => x < 0.01 ? 5.6 * x + 0.125 : 0.241514 * log10(x + 0.00873) + 0.598206,
      lin: y => y < 0.181 ? (y - 0.125) / 5.6 : Math.pow(10, (y - 0.598206) / 0.241514) - 0.00873
    },
    flog: {
      name: 'Fujifilm F-Log', short: 'FLog', verified: true,
      note: 'Fujifilm F-Log Data Sheet: 0%, 18%, 90% = code 95, 470, 705.',
      ...flog({ cut1: 0.00089, cut2: 0.100537775223865, a: 0.555556, b: 0.009468, c: 0.344676, d: 0.790453, e: 8.735631, f: 0.092864 })
    },
    flog2: {
      name: 'Fujifilm F-Log2 / F-Log2 C', short: 'FLog2', verified: true,
      note: 'Fujifilm F-Log2 Data Sheet: 0%, 18%, 90% = code 95, 400, 570. F-Log2 C uses the same curve with a different gamut.',
      ...flog({ cut1: 0.000889, cut2: 0.100686685370811, a: 5.555556, b: 0.064829, c: 0.245281, d: 0.384316, e: 8.799461, f: 0.092864 })
    },
    nlog: {
      name: 'Nikon N-Log', short: 'NLog', verified: true,
      note: 'Nikon N-Log Specification 1.0.0. 18% gray = code 372 (Nikon: "around 372").',
      enc: y => (y < 0.328 ? 650 * Math.cbrt(y + 0.0075) : 150 * Math.log(y) + 619) / 1023,
      lin: x => { x *= 1023; return x < 452 ? Math.pow(x / 650, 3) - 0.0075 : Math.exp((x - 619) / 150); }
    },
    dlog: {
      name: 'DJI D-Log', short: 'DLog', verified: true,
      note: 'DJI D-Log/D-Gamut white paper: 0%, 18%, 90% = code 95, 408, 586. Not D-Log M.',
      enc: x => x <= 0.0078 ? 6.025 * x + 0.0929 : log10(x * 0.9892 + 0.0108) * 0.256663 + 0.584555,
      lin: y => y <= 0.14 ? (y - 0.0929) / 6.025 : (Math.pow(10, 3.89616 * y - 2.27752) - 0.0108) / 0.9892
    },
    kinelog3: {
      name: 'Kinefinity KineLOG3', short: 'KineLog3', verified: true,
      note: 'Kinefinity KineLOG3 Technical Specifications (2025): 18% = 0.392, 90% = 0.572.',
      enc: x => x >= -0.008239 ? log10(66.64 * x + 1) * 0.296 * 0.907136 + 0.092864 : (x + 0.008239) / 0.017178,
      lin: y => y >= 0 ? (Math.pow(10, (y - 0.092864) / 0.296 / 0.907136) - 1) / 66.64 : y * 0.017178 - 0.008239
    },
    bmdgen5: {
      name: 'Blackmagic Film Gen 5', short: 'BMDFilmG5', verified: true,
      note: 'Blackmagic Generation 5 Color Science document: 18% gray = 0.38356.',
      enc: x => x >= 0.005 ? 0.08692876065 * Math.log(x + 0.005494072432) + 0.5300133392 : 8.283605932 * x + 0.09246575342,
      lin: y => y >= 8.283605932 * 0.005 + 0.09246575342 ? Math.exp((y - 0.5300133392) / 0.08692876065) - 0.005494072432 : (y - 0.09246575342) / 8.283605932
    }
  };
  // Curves a camera can record that have no published formula. Listed so the camera picker can say why.
  const UNPUBLISHED_CURVES = {
    zlog2: 'Z CAM Z-Log2', dlogm: 'DJI D-Log M', bmdgen4: 'Blackmagic Film Gen 4', slog2: 'Sony S-Log2 (use S-Log3)'
  };
  // The curve to use at one ISO. Per-EI curves (LogC3) need an EI in their table.
  function curveAt(key, iso) {
    const C = CURVES[key];
    if (!C || !C.perEI) return C;
    if (!C.eis.includes(iso)) throw new Error(`${C.name}: no published curve for EI ${iso}`);
    return Object.assign({}, C, C.at(iso));
  }

  // ---- Range helpers (10-bit code values) ----
  const fullToLegalCV = cv => 64 + cv * 876 / 1023;
  const legalToFullCV = cv => (cv - 64) * 1023 / 876;

  // ---- Palette ----
  const PALETTE = {
    clip: '#ff0000',
    hi: ['#ff7a00', '#ffd000', '#fff27a', '#ffcfa8', '#ffa6c9', '#e07aa8', '#c9a27a', '#a8875f'],
    grey: '#00b050',
    lo: ['#1e3fff', '#00a2ff', '#00d5e0', '#5fe0b8', '#8fd3c8', '#b7c9e8', '#c9c0e8', '#d8d0f0'],
    caution: '#7a2cff',
    noise: '#3a0066'
  };
  const hexToRgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255);

  // ---- Profile validation ----
  function validate(p) {
    const e = [];
    const num = (v, name, lo, hi) => { if (!(typeof v === 'number' && isFinite(v)) || v < lo || v > hi) e.push(`${name} must be between ${lo} and ${hi}.`); };
    if (!CURVES[p.curve]) e.push('Unknown log curve.');
    num(p.baseISO, 'Base ISO', 25, 409600);
    num(p.clipCV, 'Clip level', 1, 1023);
    num(p.greyCV, 'Middle gray', 1, 1022);
    const noFloor = p.floorKnown === false;
    if (!noFloor) { num(p.dr2, 'Range at SNR 2', 1, 20); num(p.dr1, 'Range at SNR 1', 1, 20); }
    num(p.greyBand, 'Gray band', 0, 1);
    if (p.pictureStops != null) num(p.pictureStops, 'Picture zone', 0, 4);
    if (p.colorStops != null && !(Number.isInteger(p.colorStops) && p.colorStops >= 0 && p.colorStops <= 8)) e.push('Color stops must be 0 to 8.');
    if (e.length) return e;
    if (p.greyCV >= p.clipCV) e.push('Middle gray must be below the clip level.');
    if (!noFloor && p.dr1 < p.dr2) e.push('Range at SNR 1 must be at least the range at SNR 2.');
    if (!Array.isArray(p.isoList) || !p.isoList.length || p.isoList.some(i => !(i >= 25 && i <= 409600))) e.push('ISO list must contain at least one valid ISO.');
    if (p.isoMode != null && !ISO_MODES[p.isoMode]) e.push('Unknown ISO behavior.');
    const PC = CURVES[p.curve];
    if (PC.perEI) {
      const bad = [p.baseISO].concat(p.isoList || []).filter(i => !PC.eis.includes(i));
      if (bad.length) e.push(`${PC.name} has a published curve only for EI ${PC.eis.join(', ')}. Not available: ${[...new Set(bad)].join(', ')}.`);
      if (isoModeOf(p) !== 'clip') e.push(`${PC.name} bakes the EI into the curve: gray stays at 400 and clip moves. Set ISO behavior to "Clip moves with ISO, metered gray stays".`);
    }
    if (![17, 33, 65].includes(p.lutSize)) e.push('LUT size must be 17, 33 or 65.');
    return e;
  }

  const ISO_MODES = { clip: 'Clip moves with ISO, metered gray stays', gray: 'Metered gray moves with EI, clip stays (Cine EI)', none: 'Base ISO only, no shift' };
  function isoModeOf(p) { return ISO_MODES[p.isoMode] ? p.isoMode : (p.isoShifts === false ? 'none' : 'clip'); }

  // ---- Zone model for one ISO ----
  function buildModel(p, iso) {
    const C = curveAt(p.curve, iso);
    // ISO behavior: 'clip' = clip and floor move with ISO, metered gray stays (Nikon ZR, RED-style ISO).
    // 'gray' = signal stays at base, metered gray moves with EI (Sony Cine EI). 'none' = no shift.
    const mode = isoModeOf(p);
    const shift = mode === 'none' ? 0 : log2(iso / p.baseISO);
    const k = Math.pow(2, shift), kc = mode === 'clip' ? k : 1;
    const Cb = curveAt(p.curve, p.baseISO); // measured values were read on the base-ISO curve
    const baseClipLin = Cb.lin(p.clipCV / 1023);
    const clipLin = baseClipLin * kc;
    const greyLin = Cb.lin(p.greyCV / 1023) / (mode === 'gray' ? k : 1);
    // No noise data: no shadow colors at all; the picture shows in gray all the way down.
    const noFloor = p.floorKnown === false;
    const floor2Lin = noFloor ? -Infinity : baseClipLin / Math.pow(2, p.dr2) * kc;
    const floor1Lin = noFloor ? -Infinity : baseClipLin / Math.pow(2, p.dr1) * kc;
    const clipEnc = C.enc(clipLin);
    const over = log2(clipLin / greyLin);
    const under2 = noFloor ? NaN : log2(greyLin / floor2Lin);
    const under1 = noFloor ? NaN : log2(greyLin / floor1Lin);
    const band = p.greyBand;
    // Keep at least `pic` stops either side of gray as picture (never less than the gray band itself).
    const pic = Math.max(band, p.pictureStops == null ? 1 : p.pictureStops);
    // Optional cap on colored stops at each end (counted down from clip and up from the floor); the rest is picture.
    const cap = p.colorStops == null ? Infinity : p.colorStops;
    const nHi = Math.max(0, Math.min(PALETTE.hi.length, cap, Math.floor(over - pic + 1e-9)));
    const nLo = noFloor ? 0 : Math.max(0, Math.min(PALETTE.lo.length, cap, Math.floor(under2 - pic + 1e-9)));
    const cv = l => C.enc(l) * 1023;
    const zones = [];
    const add = (kind, n, label, loLin, hiLin, color) => zones.push({ kind, n, label, loLin, hiLin, loCV: loLin === -Infinity ? 0 : cv(loLin), hiCV: hiLin === Infinity ? 1023 : cv(hiLin), color });
    add('clip', 0, 'Clipped', clipLin, Infinity, PALETTE.clip);
    for (let i = 1; i <= nHi; i++) add('hi', i, `${i - 1} to ${i} stop${i > 1 ? 's' : ''} below clip`, clipLin / Math.pow(2, i), clipLin / Math.pow(2, i - 1), PALETTE.hi[i - 1]);
    const gUp = greyLin * Math.pow(2, band), gDn = greyLin / Math.pow(2, band);
    const midTop = clipLin / Math.pow(2, nHi), midBot = floor2Lin * Math.pow(2, nLo);
    if (midTop > gUp) add('mid', 0, 'Picture (above gray)', gUp, midTop, null);
    if (band > 0) add('grey', 0, 'Middle gray', Math.max(gDn, midBot), Math.min(gUp, midTop), PALETTE.grey);
    if (gDn > midBot) add('mid', 1, noFloor ? 'Picture (no noise data)' : 'Picture (below gray)', midBot, gDn, null);
    for (let i = nLo; i >= 1; i--) add('lo', i, `${i - 1} to ${i} stop${i > 1 ? 's' : ''} above floor`, floor2Lin * Math.pow(2, i - 1), floor2Lin * Math.pow(2, i), PALETTE.lo[i - 1]);
    if (!noFloor) {
      add('caution', 0, 'Noisy (SNR 1 to 2)', floor1Lin, floor2Lin, PALETTE.caution);
      add('noise', 0, 'Below noise floor', -Infinity, floor1Lin, PALETTE.noise);
    }
    return {
      iso, shift, curve: C, clipLin, greyLin, floor2Lin, floor1Lin, clipEnc,
      clipCV: clipEnc * 1023, clipOutOfRange: clipEnc > 1,
      greyCV: C.enc(greyLin) * 1023, isoMode: mode, floor2CV: cv(floor2Lin), floor1CV: cv(floor1Lin),
      over, under2, under1, band, nHi, nLo, zones, noFloor
    };
  }

  // Clip threshold actually used in a LUT of a given size. Conservative: the lattice point at or below clip.
  function clipThreshold(model, size, conservative) {
    const c = Math.min(model.clipEnc, 1);
    if (!conservative) return c;
    return Math.floor(c * (size - 1) + 1e-9) / (size - 1);
  }

  // Classify one pixel. r,g,b are full-range encoded 0..1. Returns [r,g,b] 0..1 (full-range color).
  function classify(model, r, g, b, clipThreshEnc) {
    const C = model.curve;
    const m = Math.max(r, g, b);
    if (m >= clipThreshEnc) return ZC.clip;
    const mLin = C.lin(m);
    if (model.nHi > 0 && mLin > 0) {
      const h = log2(model.clipLin / mLin);
      if (h < model.nHi) return ZC.hi[Math.max(0, Math.floor(h))];
    }
    const Y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    const yLin = C.lin(Y);
    if (yLin < model.floor1Lin) return ZC.noise;
    if (yLin < model.floor2Lin) return ZC.caution;
    if (model.nLo > 0) {
      const u = log2(yLin / model.floor2Lin);
      if (u < model.nLo) return ZC.lo[Math.max(0, Math.floor(u))];
    }
    if (model.band > 0 && Math.abs(log2(yLin / model.greyLin)) <= model.band) return ZC.grey;
    const v = Math.min(1, Math.max(0, Y));
    return [v, v, v];
  }
  const ZC = {
    clip: hexToRgb(PALETTE.clip), hi: PALETTE.hi.map(hexToRgb), grey: hexToRgb(PALETTE.grey),
    lo: PALETTE.lo.map(hexToRgb), caution: hexToRgb(PALETTE.caution), noise: hexToRgb(PALETTE.noise)
  };

  // ---- .cube writer ----
  // opts: {size, output:'full'|'legal', inputLegal:boolean, conservativeClip:boolean, title, comments:[]}
  function makeCube(model, opts) {
    const N = opts.size, legalOut = opts.output === 'legal';
    const thresh = clipThreshold(model, N, opts.conservativeClip);
    const inMap = opts.inputLegal ? (x => (x * 1023 - 64) / 876) : (x => x);
    const axis = new Float64Array(N);
    for (let i = 0; i < N; i++) axis[i] = inMap(i / (N - 1));
    const out = [];
    (opts.comments || []).forEach(c => out.push('# ' + c));
    out.push(`TITLE "${(opts.title || 'False Color').replace(/"/g, '')}"`);
    out.push(`LUT_3D_SIZE ${N}`);
    const f = v => (legalOut ? (64 + 876 * v) / 1023 : v).toFixed(6);
    for (let bi = 0; bi < N; bi++) for (let gi = 0; gi < N; gi++) for (let ri = 0; ri < N; ri++) {
      const c = classify(model, axis[ri], axis[gi], axis[bi], thresh);
      out.push(f(c[0]) + ' ' + f(c[1]) + ' ' + f(c[2]));
    }
    return out.join('\n') + '\n';
  }


  // ---- Nobe OmniScope false color preset (.tfc4). Luma only; pos is percent of the 0-1023 scale. ----
  function makeTfc4(model) {
    const EPS = 0.001, s = v => String(Math.round(v * 1e7) / 1e7);
    const zs = model.zones.slice().reverse().map(z => ({ lo: Math.max(0, z.loCV) / 1023 * 100, color: z.color ? hexToRgb(z.color) : [0.5, 0.5, 0.5], gs: !z.color }))
      .filter((z, i, a) => i === a.length - 1 || a[i + 1].lo > z.lo + 2 * EPS).filter(z => z.lo < 100 - 2 * EPS);
    const ent = (pos, z, locked) => ({ pos: s(pos), locked: locked ? 'true' : 'false', rgba: { r: s(z.color[0]), g: s(z.color[1]), b: s(z.color[2]), a: '1' }, grayscale_up: String(z.gs && !locked), grayscale_down: String(z.gs && !locked), sharp_up: 'true', sharp_down: 'true' });
    const ranges = [ent(0, zs[0], true)];
    zs.forEach((z, i) => { if (i > 0) { ranges.push(ent(z.lo - EPS, zs[i - 1])); ranges.push(ent(z.lo, z)); } });
    const last = zs[zs.length - 1];
    ranges.push(ent(100 - EPS, last)); ranges.push(ent(100, last, true));
    return JSON.stringify({ mode: '0', opacity: '1', blur: '0', use_custom_range: 'false', custom_min_rgba: { r: '0', g: '0', b: '1', a: '1' }, custom_max_rgba: { r: '1', g: '0.800000012', b: '0.200000003', a: '1' }, custom_min: '40', custom_max: '70', scale_type: '0', ranges }, null, 4);
  }

  // ---- OmniScope export: one preset per distinct zone set, across all bases of a camera ----
  function omniName(p, m) { return `${clean(p.make)}_${clean(p.model)}_${CURVES[p.curve].short}_` + (isoModeOf(p) === 'none' ? `Base${p.baseISO}_AllEI` : `ISO${m.iso}`) + '_OmniScope.tfc4'; }
  function omniSets(profiles) {
    const out = [];
    for (const p of profiles) {
      const errs = validate(p); if (errs.length) throw new Error(errs.join(' '));
      const seen = new Set(), keep = [];
      for (const iso of p.isoList) {
        const m = buildModel(p, iso), key = m.zones.map(z => z.kind + Math.round(z.loCV * 100)).join('|');
        if (seen.has(key)) continue; seen.add(key); keep.push(m);
      }
      out.push({ p, models: keep });
    }
    return out;
  }
  function folderFor(p, tag) { return `${clean(p.make)}_${clean(p.model)}_${CURVES[p.curve].short}_${tag}`; }
  function reportName(sets, p, folder) { return sets.length > 1 ? `${folder}/report_Base${p.baseISO}.html` : `${folder}/report.html`; }
  function exportOmni(profiles, opts) {
    opts = opts || {};
    const sets = omniSets(profiles), folder = folderFor(sets[0].p, 'OmniScope'), files = [];
    for (const { p, models } of sets) {
      for (const m of models) files.push({ name: `${folder}/${omniName(p, m)}`, text: makeTfc4(m) });
      files.push({ name: reportName(sets, p, folder), text: makeReport(p, models, { date: opts.date, conservativeClip: p.conservativeClip !== false, inputLegal: !!p.inputLegal }) });
    }
    return { folder, files, presets: files.filter(f => f.name.endsWith('.tfc4')).length, zip: makeZip(files) };
  }
  function exportLUTs(profiles, opts) {
    const parts = profiles.map(p => exportAll(p, opts)), folder = folderFor(profiles[0], 'LUTs'), files = [];
    parts.forEach((x, i) => x.files.forEach(f => {
      const rest = f.name.slice(f.name.indexOf('/') + 1);
      const name = /^report\.html$|^profile\.json$/.test(rest) && parts.length > 1 ? rest.replace('.', `_Base${profiles[i].baseISO}.`) : rest;
      files.push({ name: `${folder}/${name}`, text: f.text });
    }));
    return { folder, files, zip: makeZip(files) };
  }

  // ---- File naming ----
  const clean = s => String(s || '').trim().replace(/[^A-Za-z0-9.+-]+/g, '_').replace(/^_+|_+$/g, '') || 'Camera';
  function fileBase(p, iso) { return `${clean(p.make)}_${clean(p.model)}_${CURVES[p.curve].short}_ISO${iso}_FalseColor`; }

  // ---- Report ----
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  function makeReport(p, models, opts) {
    const C = CURVES[p.curve]; // name only; per-ISO math uses m.curve
    const f1 = v => v.toFixed(1), f0 = v => Math.round(v);
    const rows = models.map(m => {
      const t = clipThreshold(m, p.lutSize, opts.conservativeClip) * 1023;
      const early = Math.log2(m.clipLin / m.curve.lin(t / 1023));
      const u = v => isFinite(v) ? f1(v) : 'not measured';
      return `<tr><td>${m.iso}</td><td>${m.clipOutOfRange ? 'above 1023' : f0(m.clipCV)}</td><td>${f0(m.greyCV)}</td><td>+${f1(m.over)}</td><td>${u(m.under2)}</td><td>${u(m.under1)}</td><td>${f0(t)} (${early.toFixed(2)} stop early)</td></tr>`;
    }).join('');
    const legend = models.map(m => `<h3>ISO ${m.iso}</h3><table><tr><th></th><th>Zone</th><th>Code values (full)</th><th>On a legal SDI waveform</th></tr>` +
      m.zones.map(z => `<tr><td><span class="sw" style="background:${z.color || 'linear-gradient(#bbb,#555)'}"></span></td><td>${esc(z.label)}</td><td>${f0(Math.max(0, z.loCV))} to ${f0(Math.min(1023, z.hiCV))}</td><td>${f0(fullToLegalCV(Math.max(0, z.loCV)))} to ${f0(fullToLegalCV(Math.min(1023, z.hiCV)))}</td></tr>`).join('') + '</table>').join('');
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>False color report: ${esc(p.make)} ${esc(p.model)}</title>
<style>body{font:14px/1.5 -apple-system,Segoe UI,sans-serif;max-width:860px;margin:32px auto;padding:0 16px;color:#111}table{border-collapse:collapse;margin:8px 0 20px}td,th{border:1px solid #ccc;padding:4px 10px;text-align:left}th{background:#f1f1f1}.sw{display:inline-block;width:28px;height:14px;border:1px solid #888}.w{background:#fff6d6;border:1px solid #e0c060;padding:8px 12px}</style></head><body>
<h1>False color report</h1>
<p><b>${esc(p.make)} ${esc(p.model)}</b>, ${esc(C.name)}, base ISO ${p.baseISO}. Generated ${esc(opts.date || '')}.</p>
${C.verified ? '' : '<p class="w">This log curve formula is not yet checked against the maker\'s document. Verify zones before relying on them.</p>'}
<h2>Profile</h2>
${p.signal ? `<p class="w"><b>Measured on:</b> ${esc(p.signal)}</p>` : ''}
<table><tr><th>Clip at base ISO</th><td>${f0(p.clipCV)} (full range, 10-bit)</td></tr><tr><th>Middle gray at base ISO</th><td>${f0(p.greyCV)}</td></tr>${p.floorKnown === false ? '<tr><th>Noise floor</th><td>Not measured (no shadow colors)</td></tr>' : `<tr><th>Range below clip, SNR 2 / SNR 1</th><td>${p.dr2} / ${p.dr1} stops</td></tr>`}<tr><th>ISO behavior</th><td>${ISO_MODES[isoModeOf(p)]}</td></tr><tr><th>Gray band</th><td>± ${p.greyBand.toFixed(2)} stop</td></tr><tr><th>Picture zone</th><td>± ${(p.pictureStops == null ? 1 : p.pictureStops)} stop</td></tr>${p.colorStops == null ? '' : `<tr><th>Color stops</th><td>${p.colorStops} at each end</td></tr>`}</table>
<h2>Headroom by ISO</h2>
<table><tr><th>ISO</th><th>Clip (CV)</th><th>Gray (CV)</th><th>Over gray</th><th>Under gray to SNR 2</th><th>to SNR 1</th><th>LUT clip color starts (${p.lutSize}-pt)</th></tr>${rows}</table>
<p>Base ISO row measured; others calculated from the ISO behavior.</p>
<h2>Reading it</h2>
<ul><li>Warm counts down from clip (LUT: brightest channel; OmniScope: luma).</li><li>${p.floorKnown === false ? 'No noise data: no shadow colors.' : 'Cool counts up from the SNR 2 noise floor.'}</li><li>Green is middle gray; gray between zones is picture.</li><li>${isoModeOf(p) === 'none' ? `One preset covers every EI on base ${p.baseISO}.` : 'One file per ISO. A higher-ISO file used at a lower ISO can hide clipping.'}</li></ul>
<h2>Files and setup</h2>
<ul><li><b>OmniScope (.tfc4)</b>: Color Management Input <i>Raw</i>, <i>Preserve working display view in analysis</i> off. SDI or Livegrade (legal): <i>Scale the video/SDI range to the full range</i> on. Resolve OFX plugin: Timeline Full; put the node before any look, since bypassing color also bypasses OmniScope. A converted input shows red far too early. Luma only, so a single clipped channel won't turn red.</li><li><b>Full LUT</b>: in-camera LUT slot, or a device that scales its own output.</li><li><b>Legal LUT</b>: output scaled to 64–940, for a device that writes LUT output straight to SDI.</li>${opts.inputLegal ? '<li>Built for a legal-range input the device does not expand.</li>' : ''}</ul>
<h2>Check on set</h2>
<p>Clip a light source in frame. Red should match the camera's clip indicator or 100% zebra. If red never shows or shows far too early, full and legal range disagree: try the other file or setting.</p>
<h2>Zones</h2>${legend}
${p.credit ? `<p>Dynamic range: <a href="${esc(p.credit.url)}">${esc(p.credit.org)} ${esc(p.credit.title)}</a>, tested by ${esc(p.credit.tester)}.</p>` : ''}</body></html>`;
  }

  // ---- Minimal store-only ZIP ----
  const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  function crc32(u8) { let c = 0xFFFFFFFF; for (let i = 0; i < u8.length; i++) c = CRC[(c ^ u8[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
  function makeZip(files) { // files: [{name, text}]
    const te = new TextEncoder(), parts = [], central = []; let offset = 0;
    const u16 = v => [v & 255, (v >>> 8) & 255], u32 = v => [v & 255, (v >>> 8) & 255, (v >>> 16) & 255, (v >>> 24) & 255];
    for (const f of files) {
      const name = te.encode(f.name), data = te.encode(f.text), crc = crc32(data);
      const local = new Uint8Array([0x50, 0x4B, 3, 4, ...u16(20), ...u16(0x0800), ...u16(0), ...u16(0), ...u16(0x21), ...u32(crc), ...u32(data.length), ...u32(data.length), ...u16(name.length), ...u16(0)]);
      parts.push(local, name, data);
      central.push(new Uint8Array([0x50, 0x4B, 1, 2, ...u16(20), ...u16(20), ...u16(0x0800), ...u16(0), ...u16(0), ...u16(0x21), ...u32(crc), ...u32(data.length), ...u32(data.length), ...u16(name.length), ...u16(0), ...u16(0), ...u16(0), ...u16(0), ...u32(0), ...u32(offset)]), name);
      offset += local.length + name.length + data.length;
    }
    const cSize = central.reduce((s, a) => s + a.length, 0);
    const end = new Uint8Array([0x50, 0x4B, 5, 6, ...u16(0), ...u16(0), ...u16(files.length), ...u16(files.length), ...u32(cSize), ...u32(offset), ...u16(0)]);
    const all = [...parts, ...central, end], total = all.reduce((s, a) => s + a.length, 0), out = new Uint8Array(total);
    let o = 0; for (const a of all) { out.set(a, o); o += a.length; }
    return out;
  }

  // ---- Full export: one Full and one Legal LUT per ISO, report, profile ----
  function exportAll(p, opts) {
    opts = opts || {};
    const errs = validate(p); if (errs.length) throw new Error(errs.join(' '));
    const models = p.isoList.map(iso => buildModel(p, iso));
    const files = [], folder = `${clean(p.make)}_${clean(p.model)}_${CURVES[p.curve].short}_FalseColor`;
    for (const m of models) for (const output of ['full', 'legal']) {
      const base = fileBase(p, m.iso), tag = output === 'full' ? 'Full' : 'Legal';
      files.push({
        name: `${folder}/${base}_${tag}_${p.lutSize}.cube`,
        text: makeCube(m, {
          size: p.lutSize, output, inputLegal: !!p.inputLegal, conservativeClip: p.conservativeClip !== false,
          title: `${base}_${tag}`,
          comments: [`False Color Generator`, `${p.make} ${p.model} | ${CURVES[p.curve].name} | ${isoModeOf(p) === 'none' ? `base ISO ${m.iso}, every EI` : `ISO ${m.iso} only`}`,
            `clip ${Math.round(m.clipCV)} gray ${Math.round(m.greyCV)} (10-bit full range) | +${m.over.toFixed(1)} stops over gray`,
            `input ${p.inputLegal ? 'legal (unexpanded)' : 'full'} | output ${output}`, ...(p.signal ? ['measured on: ' + p.signal] : [])]
        })
      });
    }
    files.push({ name: `${folder}/report.html`, text: makeReport(p, models, { date: opts.date, conservativeClip: p.conservativeClip !== false, inputLegal: !!p.inputLegal }) });
    files.push({ name: `${folder}/profile.json`, text: JSON.stringify(p, null, 2) });
    return { folder, files, models, zip: makeZip(files) };
  }

  return { curveAt, UNPUBLISHED_CURVES, exportOmni, exportLUTs, omniName, ISO_MODES, CURVES, PALETTE, validate, buildModel, clipThreshold, classify, makeCube, makeTfc4, makeReport, makeZip, crc32, exportAll, fileBase, fullToLegalCV, legalToFullCV };
});
