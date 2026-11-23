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
    id: 'arri-alexa35-logc4', make: 'ARRI', model: 'ALEXA 35', mode: 'LogC4 (ARRIRAW or ProRes)', curve: 'logc4',
    credit: { org: 'CineD', tester: 'Gunther Machu (with Florian Milz)', title: 'ARRI ALEXA 35 Lab Test', date: '2022-08-17', url: 'https://www.cined.com/arri-alexa-35-lab-test-rolling-shutter-dynamic-range-and-latitude-plus-video/' },
    circuits: [
      { name: 'EI 800 (single base)', baseISO: 800, isos: [400, 800, 1600, 3200], isoMode: 'clip',
        clipMax: 58432, clipOf: 65535, dr2: 15.1, dr1: 16.3, grayCV: 285, grayNominal: true,
        sources: { range: 'CineD lab test, Imatest sheet, EI 800 ARRIRAW. The EI 800 ProRes 4444 XQ sheet agrees: max=54144 is the same clip read as legal range (845 legal = 912 full), DR 15.3 / 16.1.',
          gray: 'Not metered yet. ARRI LogC4 published 18% gray (0.2784, code 285) used until a metered gray card is added.',
          iso: 'EI is baked into LogC4: gray stays, clip moves with EI. The EI 3200 ARRIRAW sheet tops out at 1022, the LogC4 ceiling, as predicted (clip lands above 1023 at EI 3200).' } }
    ]
  },
  {
    id: 'arri-alexa35xtreme-logc4', make: 'ARRI', model: 'ALEXA 35 Xtreme', mode: 'LogC4 (ARRIRAW or ProRes)', curve: 'logc4',
    credit: { org: 'CineD', tester: 'Gunther Machu (with Florian Milz)', title: 'ARRI ALEXA 35 Xtreme, CineD Lab Database', date: '2026-05-12', url: 'https://www.cined.com/camera-database/' },
    circuits: [
      { name: 'EI 800 (single base)', baseISO: 800, isos: [400, 800, 1600, 3200], isoMode: 'clip',
        clipMax: 57536, clipOf: 65535, dr2: 15.4, dr1: 16.4, grayCV: 285, grayNominal: true,
        sources: { range: 'CineD Imatest sheet, 4.6K OG ARRIRAW EI 800 (dated 2026-05-12). The ProRes 4444 XQ sheet agrees (max=57472, DR 15.5 / 16.9). ARRICORE SO 165p is a separate mode (not included).', gray: 'Not metered yet. ARRI LogC4 published 18% gray (0.2784, code 285) used until a metered gray card is added.', iso: 'EI is baked into the log curve: gray stays, clip moves with EI. The EI 3200 ARRIRAW sheet tops out at 1022, the LogC4 ceiling, as predicted.' } }
    ]
  },
  {
    id: 'arri-alexa-classic-logc3', make: 'ARRI', model: 'ALEXA Classic', mode: 'LogC3 ProRes', curve: 'logc3',
    credit: { org: 'CineD', tester: 'Gunther Machu (with Florian Milz)', title: 'ARRI Alexa Classic & Mini LF Lab Test', date: '2021-04-10', url: 'https://www.cined.com/arri-alexa-classic-mini-lf-lab-test-rolling-shutter-dynamic-range-and-latitude/' },
    circuits: [
      { name: 'EI 800', baseISO: 800, isos: [400, 800, 1600], isoMode: 'clip',
        clipMax: 64832, clipOf: 65535, dr2: 13.8, dr1: 14.8, grayCV: 400, grayNominal: true,
        sources: { range: 'CineD Imatest sheet, ProRes 2K LogC EI 800 (dated 2021-04-10).', gray: 'Not metered yet. ARRI LogC3 published 18% gray (code 400) used until a metered gray card is added.', iso: 'EI is baked into the log curve: gray stays, clip moves with EI. ARRI publishes LogC3 for EI 160 to 1600 only.' } }
    ]
  },
  {
    id: 'arri-alexa-minilf-logc3', make: 'ARRI', model: 'ALEXA Mini LF', mode: 'LogC3 (ARRIRAW or ProRes)', curve: 'logc3',
    credit: { org: 'CineD', tester: 'Gunther Machu (with Florian Milz)', title: 'ARRI Alexa Classic & Mini LF Lab Test', date: '2021-04-18', url: 'https://www.cined.com/arri-alexa-classic-mini-lf-lab-test-rolling-shutter-dynamic-range-and-latitude/' },
    circuits: [
      { name: 'EI 800', baseISO: 800, isos: [400, 800, 1600], isoMode: 'clip',
        clipMax: 64768, clipOf: 65535, dr2: 13.4, dr1: 14.5, grayCV: 400, grayNominal: true,
        sources: { range: 'CineD Imatest sheet, ARRIRAW EI 800 (sheet titled "Alexa LF", dated 2021-04-18). The ProRes 4444 XQ sheet reads close (max=63744, DR 13.5 / 14.7).', gray: 'Not metered yet. ARRI LogC3 published 18% gray (code 400) used until a metered gray card is added.', iso: 'EI is baked into the log curve: gray stays, clip moves with EI. ARRI publishes LogC3 for EI 160 to 1600 only.' } }
    ]
  },
  {
    id: 'red-vraptor-8kvv-log3g10', make: 'RED', model: 'V-RAPTOR 8K VV', mode: 'R3D, Log3G10', curve: 'log3g10',
    credit: { org: 'CineD', tester: 'Gunther Machu (with Florian Milz)', title: 'RED V-RAPTOR 8K VV Lab Test', date: '2022-11-03', url: 'https://www.cined.com/red-v-raptor-8k-vv-lab-test-rolling-shutter-dynamic-range-and-latitude-plus-video/' },
    circuits: [
      { name: 'ISO 800', baseISO: 800, isos: [800, 1280, 2000, 3200], isoMode: 'clip',
        clipMax: 54656, clipOf: 65535, dr2: 13.4, dr1: 14.9, grayCV: 341.3, grayNominal: true,
        sources: { range: 'CineD Imatest sheet, 8K R3D HQ ISO 800 (dated 2022-10-15).', gray: 'Not metered yet. RED Log3G10 published 18% gray (1/3, code 341) used until a metered gray card is added. (The Nikon ZR metered a full stop higher than this.)', iso: 'ISO 1280 and 2000 presets added at the author\'s request. R3D ISO is set in the decode: gray stays, clip moves with ISO. CineD notes the V-RAPTOR has no defined native ISO.' } }
    ]
  },
  {
    id: 'red-vraptorx-8kvv-log3g10', make: 'RED', model: 'V-RAPTOR [X] 8K VV', mode: 'R3D, Log3G10', curve: 'log3g10',
    credit: { org: 'CineD', tester: 'Gunther Machu (with Florian Milz)', title: 'RED V-RAPTOR [X] 8K VV Lab Test', date: '2024-03-14', url: 'https://www.cined.com/red-v-raptor-x-8k-vv-lab-test-dynamic-range-and-exposure-latitude/' },
    circuits: [
      { name: 'ISO 800', baseISO: 800, isos: [800, 1280, 2000, 3200], isoMode: 'clip',
        clipMax: 54784, clipOf: 65535, dr2: 12.8, dr1: 14.5, grayCV: 341.3, grayNominal: true,
        sources: { range: 'CineD Imatest sheet, 8K R3D HQ ISO 800 (dated 2024-03-14). Extended Highlights not tested.', gray: 'Not metered yet. RED Log3G10 published 18% gray (1/3, code 341) used until a metered gray card is added. (The Nikon ZR metered a full stop higher than this.)', iso: 'ISO 1280 and 2000 presets added at the author\'s request, assuming the [X] behaves like the V-RAPTOR 8K VV. R3D ISO is set in the decode: gray stays, clip moves with ISO. CineD notes the V-RAPTOR has no defined native ISO.' } }
    ]
  },
  {
    id: 'bmd-ursacine12klf-gen5', make: 'Blackmagic', model: 'URSA Cine 12K LF', mode: 'BRAW 12K 3:2, Film Gen 5', curve: 'bmdgen5',
    credit: { org: 'CineD', tester: 'Gunther Machu (with Florian Milz)', title: 'Blackmagic URSA Cine 12K LF Lab Test', date: '2024-11-11', url: 'https://www.cined.com/?p=361372' },
    circuits: [
      { name: 'ISO 800', baseISO: 800, isos: [400, 800, 1600], isoMode: 'clip',
        clipMax: 51456, clipOf: 65535, dr2: 13, dr1: 14.5, grayCV: 392.4, grayNominal: true,
        sources: { range: 'CineD Imatest sheet, 12K 3:2 BRAW ISO 800 (dated 2024-11-07). Other sensor modes differ: 9K 13.1 / 14.6, 8K 12.6 / 14.2 (clip 47488), 4K 13.2 / 14.6 (clip 47488), 12K to 4K in Resolve 13.6 / 14.8.', gray: 'Not metered yet. Blackmagic Film Gen 5 published 18% gray (0.3836, code 392) used until a metered gray card is added.', iso: 'BRAW ISO is set in the decode: gray stays, clip moves with ISO.' } }
    ]
  },
  {
    id: 'bmd-pyxis12k-gen5', make: 'Blackmagic', model: 'PYXIS 12K', mode: 'BRAW 12K, Film Gen 5', curve: 'bmdgen5',
    credit: { org: 'CineD', tester: 'Gunther Machu (with Florian Milz)', title: 'Blackmagic PYXIS 12K Lab Test', date: '2025-12-18', url: 'https://www.cined.com/blackmagic-pyxis-12k-lab-test-rolling-shutter-dynamic-range-and-exposure-latitude/' },
    circuits: [
      { name: 'ISO 800', baseISO: 800, isos: [400, 800, 1600], isoMode: 'clip',
        clipMax: 51456, clipOf: 65535, dr2: 12.8, dr1: 14.2, grayCV: 392.4, grayNominal: true,
        sources: { range: 'CineD Imatest sheet, 12K BRAW ISO 800 (dated 2025-10-08). Other sensor modes differ: 9K 12.9 / 14.4, 8K 12.3 / 13.9 (clip 47488), 4K 13.2 / 14.5 (clip 47488), 12K to 4K in Resolve 13.2 / 14.6.', gray: 'Not metered yet. Blackmagic Film Gen 5 published 18% gray (0.3836, code 392) used until a metered gray card is added.', iso: 'BRAW ISO is set in the decode: gray stays, clip moves with ISO.' } }
    ]
  },
  {
    id: 'bmd-pyxis6k-gen5', make: 'Blackmagic', model: 'PYXIS 6K', mode: 'BRAW 6K OG, Film Gen 5', curve: 'bmdgen5',
    credit: { org: 'CineD', tester: 'Gunther Machu (with Florian Milz)', title: 'Blackmagic PYXIS 6K, CineD Lab Database', date: '2025-03-18', url: 'https://www.cined.com/camera-database/?camera=PYXIS-6K' },
    circuits: [
      { name: 'Low base (ISO 400)', baseISO: 400, isos: [400, 800], isoMode: 'clip',
        clipMax: 48320, clipOf: 65535, dr2: 11.5, dr1: 12.8, grayCV: 392.4, grayNominal: true,
        sources: { range: 'CineD Imatest sheet, 6K OG BRAW ISO 400 (dated 2025-03-18). 4K DCI reads the same clip, DR 11.7 / 12.8.', gray: 'Not metered yet. Blackmagic Film Gen 5 published 18% gray (0.3836, code 392) used until a metered gray card is added.', iso: 'BRAW ISO is set in the decode: gray stays, clip moves with ISO.' } },
      { name: 'High base (ISO 3200)', baseISO: 3200, isos: [3200, 6400], isoMode: 'clip',
        clipMax: 52288, clipOf: 65535, dr2: 10.2, dr1: 11.3, grayCV: 392.4, grayNominal: true,
        sources: { range: 'CineD Imatest sheet, 6K OG BRAW ISO 3200 (dated 2025-03-18).', gray: 'Not metered yet. Blackmagic Film Gen 5 published 18% gray (0.3836, code 392) used until a metered gray card is added.', iso: 'BRAW ISO is set in the decode: gray stays, clip moves with ISO.' } }
    ]
  },
  {
    id: 'sony-venice2-8k-xocn', make: 'Sony', model: 'VENICE 2 8K', mode: 'X-OCN XT, S-Log3', curve: 'slog3',
    credit: { org: 'CineD', tester: 'Gunther Machu (with Florian Milz)', title: 'Sony VENICE 2 Lab Test', date: '2022-06-04', url: 'https://www.cined.com/sony-venice-2-lab-test-rolling-shutter-dynamic-range-and-latitude/' },
    circuits: [
      { name: 'Base ISO 800', baseISO: 800, isos: [800], isoMode: 'none',
        clipMax: 57920, clipOf: 65535, dr2: 11.7, dr1: 12.9, grayCV: 420, grayNominal: true,
        sources: { range: 'CineD Imatest sheet, 8.6K X-OCN XT ISO 800 (dated 2022-06-04). The 4K ProRes HQ sheet is a separate mode (13.2 / 14.2, not included).', gray: 'Not metered yet. Sony S-Log3 published 18% gray (code 420) used until a metered gray card is added.', iso: 'Records at base ISO (Cine EI): one preset per base. EI moves only the monitoring LUT.' } },
      { name: 'Base ISO 3200', baseISO: 3200, isos: [3200], isoMode: 'none',
        clipMax: 57536, clipOf: 65535, dr2: 11.1, dr1: 12.9, grayCV: 420, grayNominal: true,
        sources: { range: 'CineD Imatest sheet, 8.6K X-OCN XT ISO 3200 (dated 2022-06-04).', gray: 'Not metered yet. Sony S-Log3 published 18% gray (code 420) used until a metered gray card is added.', iso: 'Records at base ISO (Cine EI): one preset per base. EI moves only the monitoring LUT.' } }
    ]
  },
  {
    id: 'sony-fx5-xocn', make: 'Sony', model: 'FX5', mode: 'X-OCN LT, S-Log3', curve: 'slog3',
    credit: { org: 'CineD', tester: 'Gunther Machu (with Florian Milz)', title: 'Sony FX5 Lab Test', date: '2026-08-25', url: 'https://www.cined.com/sony-fx5-lab-test-rolling-shutter-dynamic-range-and-exposure-latitude/' },
    circuits: [
      { name: 'Base ISO 800 (dual gain ON)', baseISO: 800, isos: [800], isoMode: 'none',
        clipMax: 58688, clipOf: 65535, dr2: 13.4, dr1: 14.4, grayCV: 420, grayNominal: true,
        sources: { range: 'CineD Imatest sheet, 5K X-OCN LT ISO 800, DG ON (dated 2026-08-25). DG OFF at ISO 800 drops to 10.7 / 12.0. XAVC 4K DG ON reads 14.0 / 14.4.', gray: 'Not metered yet. Sony S-Log3 published 18% gray (code 420) used until a metered gray card is added.', iso: 'Records at base ISO (Cine EI): one preset per base. EI moves only the monitoring LUT.' } },
      { name: 'Base ISO 4000 (dual gain OFF)', baseISO: 4000, isos: [4000], isoMode: 'none',
        clipMax: 58560, clipOf: 65535, dr2: 10.1, dr1: 11.6, grayCV: 420, grayNominal: true,
        sources: { range: 'CineD Imatest sheet, 5K X-OCN LT ISO 4000, DG OFF (dated 2026-08-25). ISO 12800 reads 9.1 / 11.2.', gray: 'Not metered yet. Sony S-Log3 published 18% gray (code 420) used until a metered gray card is added.', iso: 'Records at base ISO (Cine EI): one preset per base. EI moves only the monitoring LUT.' } }
    ]
  },
  {
    id: 'sony-fx2-xavc', make: 'Sony', model: 'FX2', mode: 'XAVC 4K full frame, S-Log3', curve: 'slog3',
    credit: { org: 'CineD', tester: 'Gunther Machu (with Florian Milz)', title: 'Sony FX2 Lab Test', date: '2025-08-29', url: 'https://www.cined.com/sony-fx2-lab-test-rolling-shutter-dynamic-range-and-exposure-latitude/' },
    circuits: [
      { name: 'Base ISO 800', baseISO: 800, isos: [800], isoMode: 'none',
        clipCV: 892, dr2: 12.4, dr1: 13.5, grayCV: 420, grayNominal: true,
        sources: { range: "Range: CineD Imatest sheet, FF 4K XAVC ISO 800 (dated 2025-08-29). Clip: read from CineD's Xyla waveform (top patch at about 892). Imatest max=60992 (952) reads high here, likely edge overshoot from in-camera sharpening. Super 35 mode is a separate mode (11.6 / 12.7).", gray: 'Not metered yet. Sony S-Log3 published 18% gray (code 420) used until a metered gray card is added.', iso: 'Records at base ISO (Cine EI): one preset per base. EI moves only the monitoring LUT.' } },
      { name: 'Base ISO 4000', baseISO: 4000, isos: [4000], isoMode: 'none',
        clipCV: 892, dr2: 12.1, dr1: 13.2, grayCV: 420, grayNominal: true,
        sources: { range: "Range: CineD Imatest sheet, FF 4K XAVC ISO 4000 (dated 2025-08-29). Clip: CineD's Xyla waveform shows the same top patch at about 892.", gray: 'Not metered yet. Sony S-Log3 published 18% gray (code 420) used until a metered gray card is added.', iso: 'Records at base ISO (Cine EI): one preset per base. EI moves only the monitoring LUT.' } }
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
    ['ALEXA Mini LF', ['logc3']], ['ALEXA Classic', ['logc3']], ['ALEXA Mini', ['logc3']], ['ALEXA LF', ['logc3']], ['ALEXA SXT', ['logc3']], ['ALEXA 65', ['logc3']], ['AMIRA', ['logc3']] ] },
  { make: 'RED', models: [
    ['V-RAPTOR XL [X]', ['log3g10']], ['V-RAPTOR [X] 8K VV', ['log3g10']], ['V-RAPTOR XL', ['log3g10']], ['V-RAPTOR 8K VV', ['log3g10']], ['V-RAPTOR 8K S35', ['log3g10']], ['V-RAPTOR XE', ['log3g10']],
    ['KOMODO-X', ['log3g10']], ['KOMODO 6K', ['log3g10']] ] },
  { make: 'Sony', models: [
    ['VENICE 2 8K', ['slog3']], ['VENICE 2 6K', ['slog3']], ['VENICE', ['slog3']], ['BURANO', ['slog3']], ['FX5', ['slog3']], ['FX9', ['slog3']], ['FX6', ['slog3']], ['FX3', ['slog3']], ['FX2', ['slog3']], ['FX30', ['slog3']],
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
