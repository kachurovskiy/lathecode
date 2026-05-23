# Sample Toolpath Fixtures

This folder contains the opt-in fixture suite for planning every start sample and writing GCode plus planner PNGs.

Run:

```sh
npm run test:sample-toolpaths
```

Artifacts are written to `artifacts/` using this naming pattern:

```text
index.html
<sample-id>.<profile-side>.gcode.txt
<sample-id>.<profile-side>.part.png
<sample-id>.<profile-side>.tool.png
<sample-id>.<profile-side>.moves.png
```

Open `artifacts/index.html` in a browser to inspect all generated profile artifacts in one page.
Each sample card includes a `Copy Codex Prompt` button with a prefilled investigation prompt for that sample and profile.

Samples with both outside and inside profiles generate one artifact set for each side. This suite is intentionally excluded from normal `npm test` because it plans the full sample catalog.

Useful environment variables:

```sh
SAMPLE_TOOLPATH_FILTER=hello-cylinder npm run test:sample-toolpaths
SAMPLE_TOOLPATH_PX_PER_MM=25 npm run test:sample-toolpaths
SAMPLE_TOOLPATH_OUTPUT_DIR=.smoke npm run test:sample-toolpaths
```
