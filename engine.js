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

  const CURVES = {
    log3g10: {
      name: 'RED Log3G10', short: 'Log3G10', verified: true,
      note: 'Checked against Nikon ZR frames at four ISOs.',
      enc: x => { const v = x + 0.01; return v < 0 ? v * 15.1927 : 0.224282 * log10(v * 155.975327 + 1); },
      lin: y => y < 0 ? y / 15.1927 - 0.01 : (Math.pow(10, y / 0.224282) - 1) / 155.975327 - 0.01
    },
    logc3: {
      name: 'ARRI LogC3 (EI 800)', short: 'LogC3', verified: false,
      note: 'EI 800 constants only. LogC3 uses different constants at other EIs.',
      enc: x => x > 0.010591 ? 0.247190 * log10(5.555556 * x + 0.052272) + 0.385537 : 5.367655 * x + 0.092809,
      lin: y => y > 5.367655 * 0.010591 + 0.092809 ? (Math.pow(10, (y - 0.385537) / 0.247190) - 0.052272) / 5.555556 : (y - 0.092809) / 5.367655
    },
    logc4: { name: 'ARRI LogC4', short: 'LogC4', verified: false, note: '', enc: logc4.enc, lin: logc4.lin },
    slog3: {
      name: 'Sony S-Log3', short: 'SLog3', verified: true, note: 'Checked against Sony\'s Technical Summary for S-Gamut3/S-Log3 (0%, 18%, 90% code values 95, 420, 598).',
      enc: x => x >= 0.01125 ? (420 + log10((x + 0.01) / 0.19) * 261.5) / 1023 : (x * (171.2102946929 - 95) / 0.01125 + 95) / 1023,
      lin: y => y >= 171.2102946929 / 1023 ? Math.pow(10, (y * 1023 - 420) / 261.5) * 0.19 - 0.01 : (y * 1023 - 95) * 0.01125 / (171.2102946929 - 95)
    },
    bmdgen5: {
      name: 'Blackmagic Film Gen 5', short: 'BMDFilmG5', verified: false, note: '',
      enc: x => x >= 0.005 ? 0.08692876065 * Math.log(x + 0.005494072432) + 0.5300133392 : 8.283605932 * x + 0.09246575342,
      lin: y => y >= 8.283605932 * 0.005 + 0.09246575342 ? Math.exp((y - 0.5300133392) / 0.08692876065) - 0.005494072432 : (y - 0.09246575342) / 8.283605932
    }
  };

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
    num(p.greyBand, 'Gray band half-width', 0.02, 1);
    if (p.pictureStops != null) num(p.pictureStops, 'Picture zone', 0, 4);
    if (e.length) return e;
    if (p.greyCV >= p.clipCV) e.push('Middle gray must be below the clip level.');
    if (!noFloor && p.dr1 < p.dr2) e.push('Range at SNR 1 must be at least the range at SNR 2.');
    if (!Array.isArray(p.isoList) || !p.isoList.length || p.isoList.some(i => !(i >= 25 && i <= 409600))) e.push('ISO list must contain at least one valid ISO.');
    if (![17, 33, 65].includes(p.lutSize)) e.push('LUT size must be 17, 33 or 65.');
    return e;
  }

  // ---- Zone model for one ISO ----
  function buildModel(p, iso) {
    const C = CURVES[p.curve];
    const shift = p.isoShifts ? log2(iso / p.baseISO) : 0;
    const k = Math.pow(2, shift);
    const baseClipLin = C.lin(p.clipCV / 1023);
    const clipLin = baseClipLin * k;
    const greyLin = C.lin(p.greyCV / 1023);
    const noFloor = p.floorKnown === false, NO_FLOOR_ZONES = 4;
    const picPre = Math.max(p.greyBand, p.pictureStops == null ? 1 : p.pictureStops);
    // No noise data: cool colors count whole stops down from gray instead of up from a measured floor.
    const floor2Lin = noFloor ? greyLin / Math.pow(2, picPre + NO_FLOOR_ZONES) : baseClipLin / Math.pow(2, p.dr2) * k;
    const floor1Lin = noFloor ? floor2Lin : baseClipLin / Math.pow(2, p.dr1) * k;
    const clipEnc = C.enc(clipLin);
    const over = log2(clipLin / greyLin);
    const under2 = noFloor ? NaN : log2(greyLin / floor2Lin);
    const under1 = noFloor ? NaN : log2(greyLin / floor1Lin);
    const band = p.greyBand;
    // Keep at least `pic` stops either side of gray as picture (never less than the gray band itself).
    const pic = Math.max(band, p.pictureStops == null ? 1 : p.pictureStops);
    const nHi = Math.max(0, Math.min(PALETTE.hi.length, Math.floor(over - pic + 1e-9)));
    const nLo = noFloor ? NO_FLOOR_ZONES : Math.max(0, Math.min(PALETTE.lo.length, Math.floor(under2 - pic + 1e-9)));
    const cv = l => C.enc(l) * 1023;
    const zones = [];
    const add = (kind, n, label, loLin, hiLin, color) => zones.push({ kind, n, label, loLin, hiLin, loCV: loLin === -Infinity ? 0 : cv(loLin), hiCV: hiLin === Infinity ? 1023 : cv(hiLin), color });
    add('clip', 0, 'Clipped', clipLin, Infinity, PALETTE.clip);
    for (let i = 1; i <= nHi; i++) add('hi', i, `${i - 1} to ${i} stop${i > 1 ? 's' : ''} below clip`, clipLin / Math.pow(2, i), clipLin / Math.pow(2, i - 1), PALETTE.hi[i - 1]);
    const gUp = greyLin * Math.pow(2, band), gDn = greyLin / Math.pow(2, band);
    const midTop = clipLin / Math.pow(2, nHi), midBot = floor2Lin * Math.pow(2, nLo);
    if (midTop > gUp) add('mid', 0, 'Picture (above gray)', gUp, midTop, null);
    add('grey', 0, 'Middle gray', Math.max(gDn, midBot), Math.min(gUp, midTop), PALETTE.grey);
    if (gDn > midBot) add('mid', 1, 'Picture (below gray)', midBot, gDn, null);
    const fs = v => (Math.round(v * 10) / 10).toString();
    for (let i = nLo; i >= 1; i--) add('lo', i, noFloor ? `${fs(pic + nLo - i)} to ${fs(pic + nLo - i + 1)} stops under gray` : `${i - 1} to ${i} stop${i > 1 ? 's' : ''} above floor`, floor2Lin * Math.pow(2, i - 1), floor2Lin * Math.pow(2, i), PALETTE.lo[i - 1]);
    if (!noFloor) add('caution', 0, 'Noisy (SNR 1 to 2)', floor1Lin, floor2Lin, PALETTE.caution);
    add('noise', 0, noFloor ? `More than ${fs(pic + nLo)} stops under gray` : 'Below noise floor', -Infinity, floor1Lin, PALETTE.noise);
    return {
      iso, shift, curve: C, clipLin, greyLin, floor2Lin, floor1Lin, clipEnc,
      clipCV: clipEnc * 1023, clipOutOfRange: clipEnc > 1,
      greyCV: p.greyCV, floor2CV: cv(floor2Lin), floor1CV: cv(floor1Lin),
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
    const u = log2(yLin / model.floor2Lin);
    if (u < model.nLo) return ZC.lo[Math.floor(u)];
    if (Math.abs(log2(yLin / model.greyLin)) <= model.band) return ZC.grey;
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

  // ---- File naming ----
  const clean = s => String(s || '').trim().replace(/[^A-Za-z0-9.+-]+/g, '_').replace(/^_+|_+$/g, '') || 'Camera';
  function fileBase(p, iso) { return `${clean(p.make)}_${clean(p.model)}_${CURVES[p.curve].short}_ISO${iso}_FalseColor`; }

  // ---- Report ----
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  function makeReport(p, models, opts) {
    const C = CURVES[p.curve], f1 = v => v.toFixed(1), f0 = v => Math.round(v);
    const rows = models.map(m => {
      const t = clipThreshold(m, p.lutSize, opts.conservativeClip) * 1023;
      const early = Math.log2(m.clipLin / C.lin(t / 1023));
      const u = v => isFinite(v) ? f1(v) : 'not measured';
      return `<tr><td>${m.iso}</td><td>${m.clipOutOfRange ? 'above 1023' : f0(m.clipCV)}</td><td>+${f1(m.over)}</td><td>${u(m.under2)}</td><td>${u(m.under1)}</td><td>${f0(t)} (${early.toFixed(2)} stop early)</td></tr>`;
    }).join('');
    const legend = models.map(m => `<h3>ISO ${m.iso}</h3><table><tr><th></th><th>Zone</th><th>Code values (full)</th><th>On a legal SDI waveform</th></tr>` +
      m.zones.map(z => `<tr><td><span class="sw" style="background:${z.color || 'linear-gradient(#bbb,#555)'}"></span></td><td>${esc(z.label)}</td><td>${f0(Math.max(0, z.loCV))} to ${f0(Math.min(1023, z.hiCV))}</td><td>${f0(fullToLegalCV(Math.max(0, z.loCV)))} to ${f0(fullToLegalCV(Math.min(1023, z.hiCV)))}</td></tr>`).join('') + '</table>').join('');
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>False color report: ${esc(p.make)} ${esc(p.model)}</title>
<style>body{font:14px/1.5 -apple-system,Segoe UI,sans-serif;max-width:860px;margin:32px auto;padding:0 16px;color:#111}table{border-collapse:collapse;margin:8px 0 20px}td,th{border:1px solid #ccc;padding:4px 10px;text-align:left}th{background:#f1f1f1}.sw{display:inline-block;width:28px;height:14px;border:1px solid #888}.w{background:#fff6d6;border:1px solid #e0c060;padding:8px 12px}</style></head><body>
<h1>False color report</h1>
<p><b>${esc(p.make)} ${esc(p.model)}</b>, ${esc(C.name)}, base ISO ${p.baseISO}. Generated ${esc(opts.date || '')}.</p>
${C.verified ? '' : '<p class="w">The formula for this log curve has not yet been checked against the manufacturer\'s document. Verify zone positions before relying on these LUTs.</p>'}
<h2>Profile</h2>
<table><tr><th>Clip level at base ISO</th><td>${f0(p.clipCV)} (full range, 10-bit)</td></tr><tr><th>Metered middle gray</th><td>${f0(p.greyCV)}</td></tr>${p.floorKnown === false ? '<tr><th>Noise floor</th><td>Not measured. Cool colors count stops under gray.</td></tr>' : `<tr><th>Range below clip at SNR 2</th><td>${p.dr2} stops</td></tr><tr><th>Range below clip at SNR 1</th><td>${p.dr1} stops</td></tr>`}<tr><th>Clip moves with ISO</th><td>${p.isoShifts ? 'Yes' : 'No'}</td></tr><tr><th>Gray band</th><td>plus or minus ${p.greyBand.toFixed(2)} stop</td></tr><tr><th>Picture zone</th><td>at least ${(p.pictureStops == null ? 1 : p.pictureStops)} stop(s) either side of gray</td></tr></table>
<h2>Headroom by ISO</h2>
<table><tr><th>ISO</th><th>Clip (code value)</th><th>Stops over gray</th><th>Stops under gray to SNR 2</th><th>to SNR 1</th><th>Clip color starts at (${p.lutSize}-point LUT)</th></tr>${rows}</table>
<p>Only the base ISO row uses measured values. Other ISOs are calculated by shifting clip and floor by the ISO difference in stops.</p>
<h2>How to read the LUT</h2>
<ul><li>Warm colors count down from clip, judged on the brightest of the three channels.</li><li>${p.floorKnown === false ? 'Cool colors count whole stops down from gray, judged on luma (no noise floor data for this camera).' : 'Cool colors count up from the SNR 2 noise floor, judged on luma.'}</li><li>Green is metered middle gray. Between the colored zones the picture shows in gray.</li><li>Each LUT is valid for one ISO only. Using a higher-ISO LUT at a lower ISO setting can hide clipping.</li></ul>
<h2>Files</h2>
<ul><li><b>Full</b>: for an in-camera LUT slot, or any device that scales its own output.</li><li><b>OmniScope (.tfc4)</b>: preset for the Nobe OmniScope false color scope. It works on luma only, so it cannot flag a single clipped channel the way the LUT does.</li><li><b>Legal</b>: same LUT with output colors scaled to 64-940, for a device that writes LUT output straight to SDI.</li>${opts.inputLegal ? '<li>These LUTs were built for a legal-scaled input signal that the device does not expand.</li>' : ''}</ul>
<h2>Range check before trusting it on set</h2>
<ol><li>Load the LUT and point the camera at a light source so part of the frame clips.</li><li>The red clip color should cover the same area as the camera's own clip indicator or 100% zebra.</li><li>If red never appears, or appears far too early, the device and the LUT disagree on full versus legal range. Try the other file.</li></ol>
<h2>Zones</h2>${legend}
${p.credit ? `<p>Dynamic range measurements from the <a href="${esc(p.credit.url)}">${esc(p.credit.org)} ${esc(p.credit.title)}</a>, tested by ${esc(p.credit.tester)}. Middle gray and ISO behavior measured separately.</p>` : ''}</body></html>`;
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
          comments: [`False Color Generator`, `${p.make} ${p.model} | ${CURVES[p.curve].name} | ISO ${m.iso} only`,
            `clip ${Math.round(m.clipCV)} gray ${Math.round(m.greyCV)} (10-bit full range) | +${m.over.toFixed(1)} stops over gray`,
            `input ${p.inputLegal ? 'legal (unexpanded)' : 'full'} | output ${output}`]
        })
      });
    }
    for (const m of models) files.push({ name: `${folder}/${fileBase(p, m.iso)}_OmniScope.tfc4`, text: makeTfc4(m) });
    files.push({ name: `${folder}/report.html`, text: makeReport(p, models, { date: opts.date, conservativeClip: p.conservativeClip !== false, inputLegal: !!p.inputLegal }) });
    files.push({ name: `${folder}/profile.json`, text: JSON.stringify(p, null, 2) });
    return { folder, files, models, zip: makeZip(files) };
  }

  return { CURVES, PALETTE, validate, buildModel, clipThreshold, classify, makeCube, makeTfc4, makeReport, makeZip, crc32, exportAll, fileBase, fullToLegalCV, legalToFullCV };
});
