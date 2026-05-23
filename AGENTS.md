# AGENTS.md

Project guidance for future coding agents working in this repository.

## Fixture Handling

- Do not revert generated fixture changes unless explicitly asked.
- `npm test -- --run` intentionally updates `.gcode.txt`, `.moves.png`, `.part.png`, and `.tool.png` files based on the latest code. These diffs are useful evidence of planner behavior.
- Inspect generated fixtures when debugging CAM changes. Examples from prior issues: `medium.moves.png`, `rect-cone.part.png`, `multi-part-turn.gcode.txt`, and `partial-pass.part.png` exposed real planning or visualization defects.

## Vector Planner Rules

- Always plan with the whole tool footprint. Never approximate planning, collision checks, or swept removal using only the nose radius, a corner, the tool tip, or another partial feature.
- Treat tool motion as a configuration-space / swept-area problem:
  - Tool keepout for the control point is `finalPart + reflectedTool`.
  - Removed material for a move is `toolPath + tool`.
  - Use the same swept-tool simulation for verification and visualization.
- Do not solve polygon motion by stepping one pixel or one small distance at a time. Use robust polygon operations and swept geometry.
- Keep lathe geometry in radius units internally. Be careful not to mix diameter-mode `X` values with radius geometry.
- The tool polygon must be defined around the same control point that G-code commands.
- Avoid hacky clipping of generated G-code to hide geometry errors. Fix the underlying stock/tool/keepout/swept-area logic.
- Roughing must update remaining stock by subtracting swept whole-tool geometry after each cut.
- Finishing should be evaluated against material left after roughing, not the original stock.
- Finish and rough previews should distinguish true cutting from air moves through already-removed material.
- Cross-centerline or past-boundary cleanup should be justified by the whole tool footprint, for example corner-radius cleanup, not by arbitrary overtravel.
- Parting and cutoff moves may need controlled overtravel to clean the boundary, but should not extend by an unrelated part radius or stock radius.
- Internal diameter / bore visualization should preserve the distinction between actual stock material and empty bore space.

## Tests And Validation

- Run `npm run build` after TypeScript changes.
- Run targeted Vitest suites for planner changes, then run `npm test -- --run` to regenerate and validate fixtures.
- When a fixture changes unexpectedly, inspect both the `.gcode.txt` and the corresponding `.moves.png` / `.part.png` especially if runtime or move area are much increased
