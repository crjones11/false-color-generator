# False Color Generator

A browser-based tool that builds false color LUTs for a specific camera and ISO. Warm colors count down the stops left before clipping, cool colors count up the stops above the noise floor, green marks metered middle gray, and the picture shows through in gray around it.

It runs entirely in the browser. Nothing is uploaded.

## Using it

1. Open `index.html` (or the hosted page).
2. Pick a camera system. The preview's Base buttons switch between its native ISOs.
3. Press **Download OmniScope presets**.

You get a Nobe OmniScope false color preset (`.tfc4`) for every ISO that changes the zones, across all of the camera's bases, plus a report per base. A base where ISO or EI doesn't change the zones (for example the Sony VENICE on its SDI log output) gets one preset labeled `AllEI`.

**Download LUT set** is the secondary output: Full and Legal `.cube` LUTs per ISO with the same zones. Full is for in-camera LUT slots and devices that scale their own output; Legal has the output colors scaled to 64-940, for devices that write LUT output straight to SDI. In a 33-point LUT the clip color starts at the grid point at or below clip, so it can warn slightly early; the OmniScope presets place every edge exactly.

### OmniScope setup

The preset only lines up if OmniScope analyses the untouched log signal. In OmniScope's Common settings:

- Color Management Input: **Raw** (Working can stay Rec.709)
- **Preserve working display view in analysis**: off
- **Scale the video/SDI range to the full range**: on

With Input set to a log color space, OmniScope analyses a converted image and red appears far too early. Tested with a Sony VENICE through Livegrade Frontier.

Each LUT is valid for one ISO only. Using a higher-ISO LUT at a lower ISO setting can hide clipping.

## Status

- Every log curve in the app matches its maker's published document (gray, and black/white where printed) and the open-source colour-science library to within 0.0001 code value: RED Log3G10, ARRI LogC3 (per EI, 160 to 1600), ARRI LogC4, Sony S-Log3, Canon Log 2 and 3, Panasonic V-Log, Fujifilm F-Log and F-Log2, Nikon N-Log, DJI D-Log, Kinefinity KineLOG3 and Blackmagic Film Gen 5.
- No published formula, so not supported yet: Z CAM Z-Log2, DJI D-Log M, Blackmagic Film Gen 4.
- Measured cameras (CineD Imatest data unless noted): ARRI ALEXA 35, ALEXA 35 Xtreme, ALEXA Classic, ALEXA Mini LF; Blackmagic PYXIS 6K, PYXIS 12K, URSA Cine 12K LF; RED V-RAPTOR 8K VV, V-RAPTOR [X] 8K VV; Sony FX2, FX5, VENICE 2 8K; Nikon ZR (plus metered gray); Sony VENICE (clip and gray measured on the legal SDI log output with a null LUT; noise floor from the author's own ND step test in X-OCN, fit to match OmniScope's 1080 analysis, so not directly comparable to the Imatest numbers). Except for the ZR and the VENICE, gray is the log curve's published 18% value until a gray card is metered.
- The Make and Model lists in Camera data cover about 100 cinema and cinema-style bodies, grouped by how much test data exists: measured (clip, gray and noise floor), measured (clip and gray), or curve only. A curve-only camera needs a clip level and a metered gray before it can export.
- The LUTs have been checked in software against real frames, not yet on a camera or monitor.

## Adding a camera

Camera data lives in `cameras.js`. In the app, open **Camera data**, type the numbers from the Imatest sheet and your metered gray reading, and copy the generated entry. Each native ISO circuit needs:

- Imatest "max=" value, and the "0.5 (Medium)" and "1.0 (Low)" dynamic range rows
- metered 18% gray as a 10-bit full-range code value
- the ISOs the circuit covers, and how it behaves at other ISOs: clip moves and gray stays (Nikon ZR), or gray moves and clip stays (Sony Cine EI). Confirm with one frame at a non-base ISO or EI.

To suggest a camera for the built-in list, use **Submit this camera for review** in the same panel. It opens a pre-filled GitHub issue with the data; add where the numbers came from so they can be checked.

For a camera with no Imatest data, enter the clip level as a code value and tick **No noise data**. The LUT then has no shadow colors: below gray the picture shows in gray, since there is no measurement to base them on.

## Development

No dependencies beyond Node for the build and tests.

```
node test.js    # engine checks
node build.js   # inlines engine.js and cameras.js into index.html
```

- `engine.js` curves, zone model, LUT, report and zip writers
- `cameras.js` camera database
- `index.src.html` page source; `index.html` is the built single-file app

## Credits

Dynamic range measurements for the Nikon ZR come from the [CineD Nikon ZR Lab Test](https://www.cined.com/nikon-zr-lab-test-rolling-shutter-dynamic-range-and-exposure-latitude/), tested by Gunther Machu. Middle gray and ISO behavior were measured separately for this app. This project is not affiliated with or endorsed by CineD.

If the tool saves you time, you can [buy me a coffee](https://venmo.com/codyjonescolor).
