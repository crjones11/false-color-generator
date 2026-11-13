# False Color Generator

A browser-based tool that builds false color LUTs for a specific camera and ISO. Warm colors count down the stops left before clipping, cool colors count up the stops above the noise floor, green marks metered middle gray, and the picture shows through in gray around it.

It runs entirely in the browser. Nothing is uploaded.

## Using it

1. Open `index.html` (or the hosted page).
2. Pick a camera system and its native ISO circuit.
3. Check the ISOs to export and press **Export LUT set**.

The zip contains, for each ISO:

- `..._Full_33.cube` for in-camera LUT slots and devices that scale their own output
- `..._Legal_33.cube` with output colors scaled to 64-940, for devices that write LUT output straight to SDI
- `..._OmniScope.tfc4`, a Nobe OmniScope false color preset

plus `report.html` (headroom by ISO, zone legend, range check procedure) and `profile.json`.

### OmniScope setup

The preset only lines up if OmniScope analyses the untouched log signal. In OmniScope's Common settings:

- Color Management Input: **Raw** (Working can stay Rec.709)
- **Preserve working display view in analysis**: off
- **Scale the video/SDI range to the full range**: on

With Input set to a log color space, OmniScope analyses a converted image and red appears far too early. Tested with a Sony VENICE through Livegrade Frontier.

Each LUT is valid for one ISO only. Using a higher-ISO LUT at a lower ISO setting can hide clipping.

## Status

- RED Log3G10 is checked against Nikon ZR frames at four ISOs.
- Sony VENICE (S-Log3) is measured on the legal SDI log output with a null LUT loaded. Those LUTs are only for that setup.
- Sony S-Log3 is checked against Sony's Technical Summary for S-Gamut3/S-Log3 (code values 95, 420 and 598 for 0%, 18% and 90%).
- ARRI LogC3 (EI 800 only), ARRI LogC4 and Blackmagic Film Gen 5 are implemented but **not yet verified** against the manufacturers' documents. The page flags them.
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
