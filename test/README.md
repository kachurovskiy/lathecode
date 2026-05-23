# Test Layout

The root `test/` folder is organized by fixture ownership:

- `planner-fixtures/` stores checked-in lathecode fixture inputs plus generated GCode and planner PNGs.
- `integration/` stores browser integration cases, including the STL import fixture and generated outputs.
- `tool-inserts/` stores known-insert screenshot fixtures generated from `src/common/toolpresets.ts`.
- `sample-toolpaths/` stores the opt-in full sample catalog artifact runner and its README.

Normal `npm test -- --run` updates the generated artifacts in the first three folders. `npm run test:sample-toolpaths` writes sample catalog artifacts under `test/sample-toolpaths/artifacts/`.
