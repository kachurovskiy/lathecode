# lathecode

Text format for lathe parts and other objects with circular symmetry. Defines stock dimensions and subtractions that should be made from it right-to-left just like a part is processed in a typical lathe. Allows to specify tools, pass depths and speeds. Supports conversion to GCode and STL.

**[Try it in the online editor.](https://kachurovskiy.com/lathecode)**

The shape of the object is defined in segments. Each segment can be straight, angled, circular, or a B-spline, and its position is relative to the segment before it. For example, in lathecode, a simple cylinder is defined in one segment. A cylinder with a length of 7mm and a diameter of 6mm is described as:

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

Stock size should be specified in the first line via radius or diameter e.g. `STOCK D10` and `STOCK R5` both declare the stock to have a diameter of 10mm. When stock is not specified, part maximum diameter is taken as stock diameter.

Stock can also specify an existing internal through-hole with `ID` or `IR`. For example, `STOCK D10 ID4` and `STOCK R5 IR2` both declare 10mm stock with a 4mm internal hole.

## Cones

Instead of specifying diameter as `D`, specify diameter-start as `DS` and diameter-end as `DE` - or use radii as `RS` and `RE`.
For a cone with a known taper angle from the centerline, provide either the start or end dimension plus `A<degrees>`. Positive angles increase radius from the segment start to end; negative angles decrease it. Angle-defined cones may end at the centerline, but cannot cross it.

```
; specify start and end diameter or radius
; MT2 to B16 arbor can be specified like
DEPTH CUT1
L80 DS14.9 DE17.78
L2 DS17.78 DE15.733; spacer
L24 DS15.733 DE14.5

; equivalent cones using a centerline angle
L80 DE17.78 A1.031
L2 DS17.78 DE15.733; spacer
L24 DS15.733 A-1.471
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

## B-splines

Use `BSPLINE` when a profile needs a smooth freeform curve instead of a straight taper or circular `CONV` / `CONC` segment. A spline line still has a fixed horizontal `L` length, a start radius or diameter, and an end radius or diameter. Interior control values follow `BSPLINE` and pull the curve between the endpoints:

```
; smooth freeform outside profile
L3 D10
L24 DS10 DE22 BSPLINE D14 D26 D18 D28
L4 D28 CH0.5
```

Control values may be diameters (`D`) or radii (`R`). The curve starts at `DS` / `RS`, ends at `DE` / `RE`, and does not necessarily pass through the interior controls. Lathecode samples the spline into short profile chords for previewing and planning, then the planner emits ordinary linear G-code moves.

Chamfers and fillets are not currently supported for `BSPLINE` segments.

## Fillets and chamfers

A chamfer or fillet can be added to both ends of a straight or tapered segment. Each segment owns its own end features and only uses neighboring segments to determine whether the feature turns up or down.

```
; M10 bolt
L20 D10 FI0.5 ; fillet on the free end and at the shoulder root
L6 D19.6 CH0.5 ; chamfer both head edges
```

Endpoint features can also be specified separately after `DS` and `DE`, or after `RS` and `RE`:

```
; M10 bolt
L20 DS10 FI0.5 DE10 CH1 ; fillet on bolt end, chamfer up between bolt and head
L6 DS19.6 CH0 DE19.6 CH0.5 ; no head chamfer where head touches shank, small chamfer on head top
```

`CH0` and `FI0` mean no feature. Chamfer and fillet sizes are measured along the segment's horizontal `L` distance. Combined start and end features must fit within the segment length and each feature must fit the adjacent radial transition.

Chamfers and fillets are not currently supported for `CONV` or `CONC` segments.

## Tools

Tool is assumed to be zeroed on the centerline, touching the stock from the right.

To use a standard cut-off tool e.g. MGMN200, specify `TOOL RECT R0.2 L2` where R stands for the corner radius and L defines the width of the tool.

If you use a round insert like RPMT10, define that with `TOOL ROUND R5` where R stands for corner radius.

To use a tool with a nose angle e.g. [DCGT 070202](https://www.google.com/search?tbm=isch&q=DCGT+070202), specify the tool radius, edge length, rotation and nose angle as follows:

```
TOOL ANG R0.2 L7.75 A30 NA55
```

The online editor's Tool button can fill these standard `TOOL` lines from known insert presets and show the same rendered tool shape used by the planner.

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

## Axis direction

By default Z increments to the left and X increments up (forward). This matches NanoEls convention but a lot of industry machines use exactly the opposite. To make the generated GCode compatible with those machines, use `AXES` directive:

```
STOCK D4
AXES RIGHT DOWN
L3 D3
```

## Turning vs. facing

If you prefer material removal by turning instead of facing, use `MODE TURN` directive:

```
STOCK D4
MODE TURN
AXES RIGHT DOWN
L3 D3
```

## For developers

If you'd like to edit the online editor code e.g. to modify the online editor, use `npm run dev` for local runs, `npm test` to run tests and `npm run build` to build the `docs/index.html` all-in-one editor webpage.
