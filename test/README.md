# Test Layout

The root `test/` folder is organized by fixture ownership:

- `planner-fixtures/` stores checked-in lathecode fixture inputs plus generated GCode and planner PNGs.
- `integration/` stores browser integration cases, including STL and STEP import fixtures and generated outputs.
- `tool-inserts/` stores known-insert screenshot fixtures generated from `src/common/toolpresets.ts`.
- `sample-toolpaths/` stores the opt-in full sample catalog artifact runner and its README.

Normal `npm test -- --run` updates the generated artifacts in the first three folders. `npm run test:sample-toolpaths` writes sample catalog artifacts under `test/sample-toolpaths/artifacts/`.

STEP import tests exercise the real OpenCascade reader, including millimetre/inch units, bores, invalid data, and multiple bodies. Browser tests also import a STEP file from the standalone offline build; run `npm run build` before running them after source changes. The `integration/pipe.step` fixture is a handwritten cylindrical solid with a through-hole (length 10 mm, OD 6 mm, ID 2 mm).
