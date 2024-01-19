# lathecode

Text format for lathe parts and other objects with circular symmetry. Defines stock dimensions and substractions that should be made from it right-to-left just like a part is processed in a typical lathe. Allows to specify tools, pass depths and speeds.

Supports conversion to STL. When stock size and tool is specified, supports conversion to GCode. **[Try it in the online editor.](https://kachurovskiy.com/lathecode)**

## Examples

Smallest possible lathecode file describing 7mm long ø6mm pin can be read as "Length 7mm, Diameter 6mm":

```
L7 D6
```

Smallest possible lathecode to cut same pin from ø10mm stock with a 3mm wide parting blade:

```
STOCK R5
TOOL RECT R0.2 L3
L7 R3
L3
```

Default pass depth is 0.5mm, cutting speed 50mm/min, parting speed 10mm/min, move speed 200mm/min. This can be adjusted with a FEED line.

### Cones

```
; specify start and end diameter or radius
; MT2 to B16 arbor can be specified like
L80 DS14.9 DE17.78
L2 D15.733 ; spacer
L24 DS15.733 DE14.5
```

### Spheres and ellipses

```
; sphere with a diameter of 10mm
L5 DS0 DE10 CONV
L5 DS10 DE0 CONV
```

![image](https://github.com/kachurovskiy/lathecode/assets/517919/a0ace85f-81df-4ee5-be49-9a9481701589)

```
; whirlgig
L0.5 DS0 DE1 CONV
L7 DS1 DE10 CONC
L0.3 D10
L4 DS10 DE0.5 CONC
L0.25 DS0.5 DE0
```

![image](https://github.com/kachurovskiy/lathecode/assets/517919/dc3608e5-b3d2-4b6e-9a75-961dea5f71e4)


### Tools

Tool is assumed to be zeroed on the centerline, touching the stock from the right.

To use a standard cut-off tool e.g. MGMN200, specify `TOOL RECT R0.2 L2` where R stands for the corner radius and L defines the width of the tool.

If you use a round insert like RPMT10, define that with `TOOL ROUND R5` where R stands for corner radius.

To use a tool with a nose angle e.g. [DCGT 070202](https://www.google.com/search?tbm=isch&q=DCGT+070202), specify the tool radius, edge length, rotation and nose angle as follows:

```
TOOL ANG R0.2 L7.75 A30 NA55
```

## PEG.js grammar

```
start =
comment* units?
comment* stock?
comment* tool?
comment* depth?
comment* feed?
(comment* lathe)*
(comment* inside (comment* lathe)+)?
comment*

units = "UNITS" spaces unitType comment
unitType = "MM" / "CM" / "M" / "FT" / "IN"

stock = "STOCK" spaces stockParams comment
stockParams = ("R" / "D") float ("A" float)?

tool = "TOOL" spaces toolType spaces toolParams comment
toolType = "RECT" / "ROUND" / "ANG"
toolParams =
("R" float)?
("L" float)? // length
("H" float)? // height
("A" float)? // angle at which the tool is rotated CCW, default 0
("NA" float)? // nose angle for ANG tools

depth = "DEPTH" spaces depthParams comment
depthParams = ("CUT" float)? ("FINISH" float)?

feed = "FEED" spaces feedParams comment
feedParams = ("MOVE" float)? ("PASS" float)? ("PART" float)?

inside = "INSIDE" comment

lathe =
"L" float comment /
"L" float ("D" / "R") float comment /
"L" float ("DS" / "RS") float ("DE" / "RE") float curveType? comment
curveType = "CONV" / "CONC"

comment = spaces a:(";" (!eol .)*)? eol { return text().substring(1).trim() }
float = digits ("." digits)? spaces { return parseFloat(text()); }
digits = digit+
digit = [0-9]
spaces = space* { return null }
space = " "
eol = ("\r")? "\n"
```

## Development

If you'd like to edit the online editor code e.g. to modify the online editor, use `npm run dev` for local runs, `npm test` to run tests and `npm run build` to build the `docs/index.html` all-in-one editor webpage.
