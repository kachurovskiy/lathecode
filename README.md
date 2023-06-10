# lathecode

Text format for lathe parts and other objects with circular symmetry. Defines stock dimensions and substractions that should be made from it right-to-left just like a part is processed in a typical lathe. Allows to specify tools, pass depths and speeds.

Supports conversion to STL. When stock size and tool is specified, supports conversion to GCode. **[Try it in the online editor.](https://kachurovskiy.com/pages/lathecode)**

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

Tool is assumed to be zeroed on the centerline, right corner of the stock. Default pass depth is 0.5mm, finish 0.1mm, cutting speed 50mm/min, parting speed 10mm/min, move speed 200mm/min. This can be adjusted with a FEED line.

To make a cone, specify start and end diameter or radius. MT2 to B16 arbor can be specified like:

```
L80 DS14.9 DE17.78
L2 D15.733 ; spacer
L24 DS15.733 DE14.5
```

Adding INSIDE line makes all the following lines describe inner material removal.

Here's the full expressive power of the format, X stands for a number:

```
; part name / title
; other description lines
UNITS MM|CM|M|FT|IN ; default mm
TIME MIN|SEC|REV ; default min
STOCK RX[ AX] ; radius and optional #angles for rectangular or hex stock
TOOL RECT|ROUND|ANG RX[ LX][ HX][ AX][ ACX][ SAFEX] ; lathe cutting tool radius, width, height, safe distance
FEED[ MOVEX][ PASSX][ PARTX]

LX
LX RX|DX[ TPX][ TDX][ TAX][ TSX] ; thread pitch, depth, angle, starts
LX RSX|DSX REX|DEX ; cones and chamfers
LX RSX|DSX REX|DEX CONV|CONC ; for concave or convex arcs (quarter-circle)

INSIDE
LX ...
```

## PEG.js grammar

```
start =
comment* units?
comment* time?
comment* stock?
comment* tool?
comment* feed?
(comment* lathe)*
(comment* inside (comment* lathe)+)?
comment*

units = "UNITS" spaces unitType comment
unitType = "MM" / "CM" / "M" / "FT" / "IN"

time = "TIME" spaces timeType comment
timeType = "MIN" / "SEC" / "REV"

stock = "STOCK" spaces stockParams comment
stockParams = ("R" / "D") float ("A" float)?

tool = "TOOL" spaces toolType spaces toolParams comment
toolType = "RECT" / "ROUND" / "ANG"
toolParams =
("R" float)?
("L" float)? // length
("H" float)? // height
("A" float)? // angle
("AC" float)? // angle of tool centerline
("SAFE" float)?

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
