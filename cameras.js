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
  }
];
if (typeof module === 'object' && module.exports) module.exports = FCG_CAMERAS;
