# lathecode

Text format for lathe parts and other objects with circular symmetry. Defines stock dimensions and substractions that should be made from it right-to-left just like a part is processed in a typical lathe. Allows to specify tools, pass depths and speeds. Supports conversion to GCode and STL.

**[Try it in the online editor.](https://kachurovskiy.com/lathecode)**

The shape of the object is defined in segments. Each segment can be straight, angled, or circular, and its position is relative to the segment before it. For example, in lathecode, a simple cylinder is defined in one segment. A cylinder with a length of 7mm and a diameter of 6mm is described as:

```
L7 D6
```
<img width="1222" alt="L7 D6" src="https://github.com/kachurovskiy/lathecode/assets/122809499/f3feb30f-e1c1-4a81-a50c-1ae85a3fd259">

A cylinder with a shoulder would be described in two segments, essentially defining two cylinders one after the other. For example:

```
L2 D4
L7 D6
```
This description represents an object with an outer diameter of 6mm, a total length of 2 + 7 = 9mm, and a shoulder on the right side 2mm wide and 1mm deep.

<img width="1551" alt="L2 D4 L7 D6" src="https://github.com/kachurovskiy/lathecode/assets/122809499/79b6ff26-613e-4489-8d78-1d7e0e6f6661">

## Stock

Stock size should be specified in the first line via radius or diameter e.g. `STOCK D10` and `STOCK R5` both declare the stock do have a diameter of 10mm. When stock is not specified, part maximum diameter is taken as stock diameter.

## Cones

Instead of specifying diameter as `D`, specify diameter-start as `DS` and diameter-end as `DE` - or use radiuses as `RS` and `RE`.

```
; specify start and end diameter or radius
; MT2 to B16 arbor can be specified like
DEPTH CUT1
L80 DS14.9 DE17.78
L2 DS17.78 DE15.733; spacer
L24 DS15.733 DE14.5
```

![image](https://github.com/kachurovskiy/lathecode/assets/517919/b9e57828-3540-491a-b26c-f3c4e6b78e6f)

## Spheres

```
; sphere with a diameter of 10mm
L5 DS0 DE10 CONV
L5 DS10 DE0 CONV
```

![image](https://github.com/kachurovskiy/lathecode/assets/517919/3b43998a-8419-4e48-947c-fe7a2c475fa0)

## Ellipses

```
; whirlgig
L1 DS0 DE2 CONV
L14 DS2 DE20 CONC
L0.5 DS20 DE21 CONV
L0.5 DS21 DE20 CONV
L8 DS20 DE2 CONC
L3.1 D2
```

![image](https://github.com/kachurovskiy/lathecode/assets/517919/11b07d65-7ecc-411c-843d-ebd269759ca6)

## Tools

Tool is assumed to be zeroed on the centerline, touching the stock from the right.

To use a standard cut-off tool e.g. MGMN200, specify `TOOL RECT R0.2 L2` where R stands for the corner radius and L defines the width of the tool.

If you use a round insert like RPMT10, define that with `TOOL ROUND R5` where R stands for corner radius.

To use a tool with a nose angle e.g. [DCGT 070202](https://www.google.com/search?tbm=isch&q=DCGT+070202), specify the tool radius, edge length, rotation and nose angle as follows:

```
TOOL ANG R0.2 L7.75 A30 NA55
```

[**See this tool table**](https://docs.google.com/spreadsheets/d/1Tj3v0c-DxfOColeAaKtqCuPuzpS3YvOxvTCyOrsoGRw/edit#gid=0) for common inserts and ready-to-use lathecode TOOL lines.

## Depth of cut and finish pass

Default pass depth is 0.5mm and can be changed to e.g. 1mm. Default finish pass is 0.1mm.

```
DEPTH CUT1 FINISH0.2
```

## Feeds and speeds

Default cutting speed is 50mm/min, parting speed 10mm/min, move speed 200mm/min. This can be adjusted with a FEED line:

```
FEED MOVE200 PASS50 PART10 ; speeds mm/min
```

## Batch processing

You can define and cut more than one part:

```
STOCK D20

L5 R5
L3 R9
L3

L5 R5
L3 R9
L3

L5 R5
L3 R9
L3
```

![image](https://github.com/kachurovskiy/lathecode/assets/517919/103f353a-4fa6-4354-9539-c0a814f7df25)

## For developers

If you'd like to edit the online editor code e.g. to modify the online editor, use `npm run dev` for local runs, `npm test` to run tests and `npm run build` to build the `docs/index.html` all-in-one editor webpage.

### PEG.js grammar

Use [this parser generator](https://web.archive.org/web/20231228201451/https://pegjs.org/online) to convert the grammar below into `src/common/parser.js` file. Make sure to replace `module.exports = ` in the generated file with `export const parser = `.

```
start =
comment* units?
comment* stock?
comment* tool?
comment* depth?
comment* feed?
comment* mode?
comment* axes?
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

mode = "MODE" spaces modeParams comment
modeParams = "FACE" / "TURN"

axes = "AXES" spaces axesParams comment
axesParams = ("LEFT" / "RIGHT") spaces ("UP" / "DOWN")

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
