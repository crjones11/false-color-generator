/* Camera database. One entry per camera and recording mode; one circuit per native gain.
   Numbers are typed as printed on the source documents; the app does the math.
   clipMax/clipOf: Imatest "max=N of M".  dr2/dr1: Imatest "0.5 (Medium)" and "1.0 (Low)" rows.
   credit: who measured the dynamic range figures (shown at the bottom of the page and in the report).
   grayCV: metered 18% gray, 10-bit full-range code value.  isoMode: 'clip' (clip moves with ISO, gray stays), 'gray' (Cine EI: gray moves, clip stays) or 'none'. */
var FCG_CAMERAS = [
  {
    id: 'nikon-zr-r3d', make: 'Nikon', model: 'ZR', mode: 'R3D NE, RED log', curve: 'log3g10',
    credit: { org: 'CineD', tester: 'Gunther Machu', title: 'Nikon ZR Lab Test', date: '2025-10-23', url: 'https://www.cined.com/nikon-zr-lab-test-rolling-shutter-dynamic-range-and-exposure-latitude/' },
    circuits: [
      { name: 'Low base (ISO 800)', baseISO: 800, isos: [800, 1600], isoMode: 'clip',
        clipMax: 50880, clipOf: 65535, dr2: 10.2, dr1: 11.5, grayCV: 406,
        sources: { range: 'CineD lab test, Imatest sheet, ISO 800', gray: 'Metered gray card, R3D frame, 2026-11-12', iso: 'Clip shift confirmed with an ISO 1600 frame' } },
      { name: 'High base (ISO 6400)', baseISO: 6400, isos: [3200, 6400], isoMode: 'clip',
        clipMax: 50880, clipOf: 65535, dr2: 9.16, dr1: 10.9, grayCV: 399,
        sources: { range: 'CineD lab test, Imatest sheet, ISO 6400', gray: 'Metered gray card, R3D frame, 2026-11-12', iso: 'Clip shift confirmed with an ISO 3200 frame' } }
    ]
  },
  {
    id: 'sony-venice-slog3-sdi', make: 'Sony', model: 'VENICE', mode: 'S-Log3 SDI out, null LUT (legal)', curve: 'slog3',
    signal: 'Legal-range S-Log3 on the camera SDI output with a null LUT loaded (captured in Livegrade, legal input). Without a LUT the SDI output is full range and does not change with ISO, so these LUTs are only for the null-LUT setup.',
    circuits: [
      { name: 'Base ISO 500', baseISO: 500, isos: [500], isoMode: 'none',
        clipCV: 887, grayCV: 445,
        sources: { range: 'Clip measured on this output (hard pile-up at 887 full range, about 824 on a legal waveform). No noise data.', gray: 'Metered 18% gray card at EI 500, 2026-11-13', iso: 'Records at base ISO; EI is not baked in. Clip and gray did not change with EI on this output, so one LUT covers EI 125 to 2000.' } },
      { name: 'Base ISO 2500', baseISO: 2500, isos: [2500], isoMode: 'none',
        clipCV: 887, grayCV: 426,
        sources: { range: 'Clip measured on this output (hard pile-up at 887 full range, about 824 on a legal waveform). No noise data.', gray: 'Metered 18% gray card at EI 2500, 2026-11-13', iso: 'Records at base ISO; EI is not baked in. Checked at EI 2500 and 4000: clip stayed at 887 and gray barely moved, so one LUT covers EI 640 to 10000.' } }
    ]
  }
];
if (typeof module === 'object' && module.exports) module.exports = FCG_CAMERAS;

/* Camera catalog for the Make / Model pickers in Camera data. This is only a list of bodies and the log curves
   each one records. It holds no measurements. Curve keys match FCG.CURVES; keys in FCG.UNPUBLISHED_CURVES have no
   published formula, so the app can't build zones for them. Checked against maker pages and spec sheets, 2026-11-22:
   ARRI LUT naming guideline (LogC3 vs LogC4 bodies); RED / Nikon ZR pages (Log3G10, R3D NE); Sony spec pages (S-Log3);
   Canon Cinema EOS manuals (Canon Log 2 / 3); Panasonic DMW-SFU3A page (LogC3 bodies, fixed EI 800 curve per GH7 manual);
   Nikon N-Log LUT and spec pages; Fujifilm F-Log / F-Log2 / F-Log2 C LUT page; DJI LUT page; Z CAM and Kinefinity spec pages.
   The Log curve list still offers every verified curve, so a body that gains a curve by firmware can still be built. */
var FCG_CATALOG = [
  { make: 'ARRI', models: [
    ['ALEXA 35', ['logc4']], ['ALEXA 35 Xtreme', ['logc4']], ['ALEXA 35 Live', ['logc4']], ['ALEXA 265', ['logc4']],
    ['ALEXA Mini LF', ['logc3']], ['ALEXA Mini', ['logc3']], ['ALEXA LF', ['logc3']], ['ALEXA SXT', ['logc3']], ['ALEXA 65', ['logc3']], ['AMIRA', ['logc3']] ] },
  { make: 'RED', models: [
    ['V-RAPTOR XL [X]', ['log3g10']], ['V-RAPTOR [X]', ['log3g10']], ['V-RAPTOR XL', ['log3g10']], ['V-RAPTOR', ['log3g10']], ['V-RAPTOR XE', ['log3g10']],
    ['KOMODO-X', ['log3g10']], ['KOMODO 6K', ['log3g10']] ] },
  { make: 'Sony', models: [
    ['VENICE 2', ['slog3']], ['VENICE', ['slog3']], ['BURANO', ['slog3']], ['FX9', ['slog3']], ['FX6', ['slog3']], ['FX3', ['slog3']], ['FX2', ['slog3']], ['FX30', ['slog3']],
    ['a7S III', ['slog3']], ['a7 V', ['slog3']], ['a7 IV', ['slog3']], ['a7R V', ['slog3']], ['a1 II', ['slog3']], ['ZV-E1', ['slog3']] ] },
  { make: 'Canon', models: [
    ['EOS C400', ['clog2', 'clog3']], ['EOS C300 Mark III', ['clog2', 'clog3']], ['EOS C500 Mark II', ['clog2', 'clog3']], ['EOS C700 / C700 FF', ['clog2', 'clog3']],
    ['EOS C80', ['clog2', 'clog3']], ['EOS C70', ['clog2', 'clog3']], ['EOS C50', ['clog2', 'clog3']],
    ['EOS R5 C', ['clog3']], ['EOS R5 Mark II', ['clog3']], ['EOS R6 Mark III', ['clog3']] ] },
  { make: 'Blackmagic', models: [
    ['URSA Cine 12K LF', ['bmdgen5']], ['URSA Cine 17K 65', ['bmdgen5']], ['URSA Cine Immersive', ['bmdgen5']], ['PYXIS 6K', ['bmdgen5']], ['PYXIS 12K', ['bmdgen5']],
    ['Cinema Camera 6K', ['bmdgen5']], ['URSA Mini Pro 12K', ['bmdgen5']], ['Pocket Cinema Camera 6K Pro / G2', ['bmdgen5']], ['Pocket Cinema Camera 6K', ['bmdgen5', 'bmdgen4']], ['Pocket Cinema Camera 4K', ['bmdgen5', 'bmdgen4']] ] },
  { make: 'Panasonic', models: [
    ['LUMIX SHX1', ['vlog', 'logc3_800']], ['LUMIX S1RII', ['vlog', 'logc3_800']], ['LUMIX S1II', ['vlog', 'logc3_800']], ['LUMIX S1IIE', ['vlog', 'logc3_800']],
    ['LUMIX GH7', ['vlog', 'logc3_800']], ['LUMIX GH6', ['vlog', 'logc3_800']], ['LUMIX S5II', ['vlog']], ['LUMIX S5IIX', ['vlog']], ['LUMIX G9II', ['vlog']],
    ['LUMIX S1H', ['vlog']], ['LUMIX BS1H', ['vlog']], ['LUMIX BGH1', ['vlog']], ['AU-EVA1', ['vlog']] ] },
  { make: 'Nikon', models: [
    ['ZR', ['log3g10', 'nlog']], ['Z9', ['nlog']], ['Z8', ['nlog']], ['Z6III', ['nlog']], ['Zf', ['nlog']], ['Z5II', ['nlog']], ['Z50II', ['nlog']], ['Z7II', ['nlog']], ['Z6II', ['nlog']] ] },
  { make: 'Fujifilm', models: [
    ['GFX ETERNA 55', ['flog2', 'flog']], ['GFX100 II', ['flog2', 'flog']], ['GFX100S II', ['flog2', 'flog']], ['X-H2S', ['flog2', 'flog']], ['X-H2', ['flog2', 'flog']],
    ['X-T5', ['flog2', 'flog']], ['X-S20', ['flog2', 'flog']], ['X-M5', ['flog2']] ] },
  { make: 'DJI', models: [
    ['Ronin 4D (Zenmuse X9-8K)', ['dlog']], ['Ronin 4D (Zenmuse X9-6K)', ['dlog']], ['Inspire 3 (Zenmuse X9-8K Air)', ['dlog']], ['Mavic 3 Pro / Cine', ['dlog', 'dlogm']],
    ['Osmo Pocket 3', ['dlogm']] ] },
  { make: 'Z CAM', models: [
    ['E2-F8 Mark II', ['zlog2']], ['E2-F6 Mark II', ['zlog2']], ['E2-S6 Mark II', ['zlog2']], ['E2-M4 Mark II', ['zlog2']], ['E2-M4G Mark II', ['zlog2']],
    ['E2-F6', ['zlog2']], ['E2-S6', ['zlog2']], ['E2-F8', ['zlog2']], ['E2-M4', ['zlog2']] ] },
  { make: 'Kinefinity', models: [
    ['MAVO Edge 8K', ['kinelog3']], ['MAVO Edge 6K', ['kinelog3']], ['MAVO mark2 LF', ['kinelog3']], ['MAVO mark2 S35', ['kinelog3']] ] }
];
