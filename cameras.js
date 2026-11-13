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
