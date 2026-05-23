export type SampleDefinition = {
  id: string;
  title: string;
  description: string;
  meta: string;
  text: string;
};

export type SampleSection = {
  id: string;
  title: string;
  description: string;
  samples: readonly SampleDefinition[];
};

export const SAMPLE_SECTIONS: readonly SampleSection[] = [
  {
    id: 'start-here-tiny-wins',
    title: 'Start Here: Tiny Wins',
    description: 'Small first parts that demonstrate the core lathecode shapes without needing setup decisions first.',
    samples: [
      {
        id: 'hello-cylinder',
        title: 'Hello Cylinder',
        description: 'The smallest useful part: one clean cylinder with conservative stock, tool, depth, and feed.',
        meta: 'Basic',
        text: `; Hello Cylinder

STOCK D16
TOOL ANG R0.2 L7.8 A32.5 NA55
DEPTH CUT0.5 FINISH0.1
FEED MOVE200 PASS45 PART10

L24 D12`,
      },
      {
        id: 'two-step-shoulder',
        title: 'Two-Step Shoulder',
        description: 'A first shoulder part with a slim nose, a locating land, and a larger chuck-side body.',
        meta: 'Basic',
        text: `; Two-Step Shoulder

STOCK D22
TOOL ANG R0.2 L7.8 A32.5 NA55
DEPTH CUT0.55 FINISH0.1
FEED MOVE200 PASS45 PART10

L6 D12
L7 D12
L2 D10
L7 D18
L4 D20`,
      },
      {
        id: 'taper',
        title: 'Tapered Peg',
        description: 'A simple cone/frustum profile with a small working end and a stout chuck-side shoulder.',
        meta: 'Taper',
        text: `; Tapered Peg

STOCK D24
TOOL ANG R0.2 L7.8 A32.5 NA55
DEPTH CUT0.6 FINISH0.1
FEED MOVE190 PASS42 PART10

L3 D7
L18 DS7 DE18
L4 D22
L2 D22`,
      },
      {
        id: 'ball-on-a-stick',
        title: 'Ball-on-a-Stick',
        description: 'Two convex arcs form a round bead, followed by a narrow stem and a stable chuck-side base.',
        meta: 'Curve',
        text: `; Ball-on-a-Stick

STOCK D24
TOOL ANG R0.2 L7.8 A32.5 NA55
DEPTH CUT0.45 FINISH0.1
FEED MOVE180 PASS36 PART9

L2 D6
L5 DS6 DE18 CONV
L5 DS18 DE6 CONV
L7 D6
L5 D16
L3 D20`,
      },
      {
        id: 'lens-button',
        title: 'Lens Button',
        description: 'A shallow double-convex button face with a short locating boss behind it.',
        meta: 'Curve',
        text: `; Lens Button

STOCK D26
TOOL ANG R0.2 L7.8 A32.5 NA55
DEPTH CUT0.45 FINISH0.1
FEED MOVE180 PASS36 PART9

L2 D20
L5 DS20 DE22 CONV
L5 DS22 DE12 CONV
L4 D14
L4 D22
L2 D22`,
      },
      {
        id: 'three-part-batch',
        title: 'Three-Part Batch',
        description: 'Three small solid spacers in one setup, with parting gaps and increasing chuck-side mass.',
        meta: 'Batch',
        text: `; Three-Part Batch

STOCK D22
TOOL RECT R0.15 L1.5 H4
DEPTH CUT0.45 FINISH0.1
FEED MOVE220 PASS50 PART12

L2 D12
L4 D14
L1.5
L2 D10
L5 D16
L1.5
L2 D12
L7 D18
L3 D20`,
      },
    ],
  },
  {
    id: 'standard-shop-parts',
    title: 'Standard Shop Parts',
    description: 'Common spacer, bushing, pin, plug, collar, ring, and adapter shapes sized as practical first workshop parts.',
    samples: [
      {
        id: 'plain-spacer-tube',
        title: 'Plain Spacer Tube',
        description: 'Straight OD with through-hole stock; a minimal bored sleeve with no decorative steps.',
        meta: 'Spacers & Washers - Inside',
        text: `; Plain Spacer Tube

STOCK D24 ID10
TOOL ANG R0.15 L2.2 A120 NA55
DEPTH CUT0.45 FINISH0.1
FEED MOVE190 PASS38 PART9

L24 D18

INSIDE
L24 D12`,
      },
      {
        id: 'shoulder-spacer',
        title: 'Shoulder Spacer',
        description: 'Spacer with one raised locating shoulder and a stronger chuck-side register.',
        meta: 'Spacers & Washers - Basic',
        text: `; Shoulder Spacer

STOCK D24
TOOL ANG R0.2 L7.8 A32.5 NA55
DEPTH CUT0.55 FINISH0.1
FEED MOVE200 PASS45 PART10

L5 D14
L11 D16
L3 D20
L7 D22`,
      },
      {
        id: 'thick-washer',
        title: 'Thick Washer',
        description: 'Short, wide ring with a central hole and enough wall to show as a real washer blank.',
        meta: 'Spacers & Washers - Inside',
        text: `; Thick Washer

STOCK D30 ID10
TOOL ANG R0.15 L2.2 A120 NA55
DEPTH CUT0.45 FINISH0.1
FEED MOVE190 PASS38 PART9

L3 D26
L8 D26
L3 D28

INSIDE
L14 D14`,
      },
      {
        id: 'counterbored-washer',
        title: 'Counterbored Washer',
        description: 'A wide washer with a shallow entry counterbore and smaller through bore.',
        meta: 'Spacers & Washers - Inside',
        text: `; Counterbored Washer

STOCK D30 ID10
TOOL ANG R0.15 L2.2 A120 NA55
DEPTH CUT0.45 FINISH0.1
FEED MOVE190 PASS38 PART9

L4 D26
L7 D26
L3 D28

INSIDE
L4 D18
L2 DS18 DE12
L8 D12`,
      },
      {
        id: 'taper-washer',
        title: 'Taper Washer',
        description: 'Conical washer or cone shim with a broad chuck-side end for holding and parting.',
        meta: 'Spacers & Washers - Taper',
        text: `; Taper Washer

STOCK D26
TOOL ANG R0.2 L7.8 A32.5 NA55
DEPTH CUT0.5 FINISH0.1
FEED MOVE190 PASS40 PART10

L3 D12
L10 DS12 DE22
L3 D24`,
      },
      {
        id: 'spacer-kit-2-4-6-8-mm',
        title: 'Spacer Kit: 2/4/6/8 mm',
        description: 'Batch of same-OD spacers with visible parting gaps and increasing chuck-side support.',
        meta: 'Spacers & Washers - Batch',
        text: `; Spacer Kit: 2/4/6/8 mm

STOCK D22
TOOL RECT R0.15 L1.5 H4
DEPTH CUT0.45 FINISH0.1
FEED MOVE220 PASS50 PART12

L2 D16
L1.5
L4 D16
L1.5
L6 D16
L1.5
L8 D16
L3 D20`,
      },
      {
        id: 'plain-sleeve-bushing',
        title: 'Plain Sleeve Bushing',
        description: 'Long tube with constant OD and ID, intended as a plain sleeve bushing blank.',
        meta: 'Bushings & Sleeves - Inside',
        text: `; Plain Sleeve Bushing

STOCK D26 ID10
TOOL ANG R0.15 L2.2 A120 NA55
DEPTH CUT0.45 FINISH0.1
FEED MOVE190 PASS38 PART9

L30 D22

INSIDE
L30 D12`,
      },
      {
        id: 'flanged-bushing',
        title: 'Flanged Bushing',
        description: 'Top-hat bushing with a locating flange and a through bore sized for the boring tool.',
        meta: 'Bushings & Sleeves - Basic, Inside',
        text: `; Flanged Bushing

STOCK D30 ID10
TOOL ANG R0.15 L2.2 A120 NA55
DEPTH CUT0.5 FINISH0.1
FEED MOVE190 PASS38 PART9

L5 D16
L12 D20
L4 DS20 DE28
L5 D28

INSIDE
L7 D14
L19 D12`,
      },
      {
        id: 'reducer-sleeve',
        title: 'Reducer Sleeve',
        description: 'Large bore on the free end, smaller bore toward the chuck, with a constant outside sleeve.',
        meta: 'Bushings & Sleeves - Inside',
        text: `; Reducer Sleeve

STOCK D28 ID10
TOOL ANG R0.15 L2.2 A120 NA55
DEPTH CUT0.45 FINISH0.1
FEED MOVE190 PASS38 PART9

L26 D24

INSIDE
L8 D18
L4 DS18 DE12
L14 D12`,
      },
      {
        id: 'barrel-sleeve',
        title: 'Barrel Sleeve',
        description: 'Gently rounded outside sleeve with a straight bore and a small chuck-side holding band.',
        meta: 'Bushings & Sleeves - Curve, Inside',
        text: `; Barrel Sleeve

STOCK D30 ID10
TOOL ANG R0.15 L2.2 A120 NA55
DEPTH CUT0.45 FINISH0.1
FEED MOVE180 PASS36 PART9

L4 D18
L7 DS18 DE26 CONV
L7 DS26 DE20 CONV
L6 D26
L3 D28

INSIDE
L27 D12`,
      },
      {
        id: 'external-relief-bushing',
        title: 'External Relief Bushing',
        description: 'A bushing outside profile with shallow relief grooves near each end.',
        meta: 'Bushings & Sleeves - Basic',
        text: `; External Relief Bushing

STOCK D26
TOOL RECT R0.15 L1.5 H4
DEPTH CUT0.45 FINISH0.1
FEED MOVE210 PASS45 PART11

L4 D20
L1.5 D16
L9 D22
L1.5 D17
L7 D24
L3 D24`,
      },
      {
        id: 'funnel-bore-sleeve',
        title: 'Funnel Bore Sleeve',
        description: 'Straight outside sleeve with an internal taper that funnels down toward the chuck side.',
        meta: 'Bushings & Sleeves - Taper, Inside',
        text: `; Funnel Bore Sleeve

STOCK D30 ID10
TOOL ANG R0.15 L2.2 A120 NA55
DEPTH CUT0.45 FINISH0.1
FEED MOVE190 PASS38 PART9

L26 D24

INSIDE
L5 D18
L13 DS18 DE10
L8 D10`,
      },
      {
        id: 'dowel-pin-blank',
        title: 'Dowel Pin Blank',
        description: 'Straight pin blank with eased ends and a slightly larger chuck-side grip land.',
        meta: 'Pins, Plugs & Stops - Basic, Curve',
        text: `; Dowel Pin Blank

STOCK D18
TOOL ANG R0.2 L7.8 A32.5 NA55
DEPTH CUT0.4 FINISH0.1
FEED MOVE180 PASS36 PART9

L2 D8
L3 DS8 DE12 CONV
L16 D12
L3 DS12 DE14 CONV
L4 D14`,
      },
      {
        id: 'taper-alignment-pin',
        title: 'Taper Alignment Pin',
        description: 'Short precision-looking taper pin with a larger shoulder for holding and cutoff.',
        meta: 'Pins, Plugs & Stops - Taper',
        text: `; Taper Alignment Pin

STOCK D20
TOOL ANG R0.2 L7.8 A32.5 NA55
DEPTH CUT0.45 FINISH0.1
FEED MOVE190 PASS40 PART10

L3 D7
L15 DS7 DE15
L4 D18
L2 D18`,
      },
      {
        id: 'centering-plug',
        title: 'Centering Plug',
        description: 'Stepped plug with a small pilot, main locating diameter, and a chuck-side stop flange.',
        meta: 'Pins, Plugs & Stops - Basic',
        text: `; Centering Plug

STOCK D26
TOOL ANG R0.2 L7.8 A32.5 NA55
DEPTH CUT0.5 FINISH0.1
FEED MOVE200 PASS45 PART10

L5 D10
L8 D16
L3 D14
L5 D22
L3 D24`,
      },
      {
        id: 'domed-end-cap',
        title: 'Domed End Cap',
        description: 'Hollow cap with a rounded outside nose, straight skirt, and internal relief.',
        meta: 'Pins, Plugs & Stops - Curve, Inside',
        text: `; Domed End Cap

STOCK D30 ID10
TOOL ANG R0.15 L2.2 A120 NA55
DEPTH CUT0.45 FINISH0.1
FEED MOVE180 PASS36 PART9

L2 D20
L6 DS20 DE24 CONV
L8 D24
L4 D28

INSIDE
L4 D18
L8 D14
L8 D10`,
      },
      {
        id: 'soft-dead-stop-puck',
        title: 'Soft Dead Stop Puck',
        description: 'Chunky lathe stop with a small locating boss and broad chuck-side puck face.',
        meta: 'Pins, Plugs & Stops - Basic',
        text: `; Soft Dead Stop Puck

STOCK D32
TOOL ANG R0.2 L7.8 A32.5 NA55
DEPTH CUT0.55 FINISH0.1
FEED MOVE200 PASS45 PART10

L5 D12
L3 D18
L9 D28
L3 D30`,
      },
      {
        id: 'bottle-stopper-blank',
        title: 'Bottle-Stopper Blank',
        description: 'Tapered plug body with soft curves and a broad chuck-side cap, without threads.',
        meta: 'Pins, Plugs & Stops - Taper, Curve',
        text: `; Bottle-Stopper Blank

STOCK D30
TOOL ANG R0.2 L7.8 A32.5 NA55
DEPTH CUT0.45 FINISH0.1
FEED MOVE180 PASS36 PART9

L3 D8
L10 DS8 DE20
L5 DS20 DE18 CONV
L5 D26
L3 D28`,
      },
      {
        id: 'plain-collar',
        title: 'Plain Collar',
        description: 'Short ring with a large through-bore and simple constant outside diameter.',
        meta: 'Collars, Rings & Adapters - Inside',
        text: `; Plain Collar

STOCK D30 ID12
TOOL ANG R0.15 L2.2 A120 NA55
DEPTH CUT0.45 FINISH0.1
FEED MOVE190 PASS38 PART9

L14 D26

INSIDE
L14 D18`,
      },
      {
        id: 'raised-rib-collar',
        title: 'Raised-Rib Collar',
        description: 'Ring-like collar with recessed ends and a proud center rib for visual orientation.',
        meta: 'Collars, Rings & Adapters - Basic',
        text: `; Raised-Rib Collar

STOCK D30
TOOL ANG R0.2 L7.8 A32.5 NA55
DEPTH CUT0.5 FINISH0.1
FEED MOVE200 PASS45 PART10

L4 D20
L3 D26
L5 D22
L4 D28
L3 D28`,
      },
      {
        id: 'taper-adapter',
        title: 'Taper Adapter',
        description: 'Outside taper leading from a small pilot into a larger chuck-side adapter body.',
        meta: 'Collars, Rings & Adapters - Taper, Basic',
        text: `; Taper Adapter

STOCK D28
TOOL ANG R0.2 L7.8 A32.5 NA55
DEPTH CUT0.55 FINISH0.1
FEED MOVE190 PASS40 PART10

L4 D10
L12 DS10 DE20
L4 D22
L5 D26`,
      },
      {
        id: 'nozzle-adapter',
        title: 'Nozzle Adapter',
        description: 'Outside cone with an internal cone bore, suitable for previewing nested taper shapes.',
        meta: 'Collars, Rings & Adapters - Taper, Inside',
        text: `; Nozzle Adapter

STOCK D30 ID10
TOOL ANG R0.15 L2.2 A120 NA55
DEPTH CUT0.45 FINISH0.1
FEED MOVE190 PASS38 PART9

L3 D20
L16 DS20 DE24
L5 D28

INSIDE
L5 D16
L12 DS16 DE10
L7 D10`,
      },
      {
        id: 'pulley-blank',
        title: 'Pulley Blank',
        description: 'Wide disk with two raised lips and a plain middle, intentionally without belt-groove helix.',
        meta: 'Collars, Rings & Adapters - Basic',
        text: `; Pulley Blank

STOCK D32
TOOL ANG R0.2 L7.8 A32.5 NA55
DEPTH CUT0.55 FINISH0.1
FEED MOVE200 PASS45 PART10

L3 D28
L4 D22
L8 D22
L4 D30
L3 D30`,
      },
      {
        id: 'small-flywheel-blank',
        title: 'Small Flywheel Blank',
        description: 'Heavy disk with hub and rim features kept axisymmetric for a small flywheel blank.',
        meta: 'Collars, Rings & Adapters - Basic',
        text: `; Small Flywheel Blank

STOCK D34
TOOL ANG R0.2 L7.8 A32.5 NA55
DEPTH CUT0.55 FINISH0.1
FEED MOVE200 PASS45 PART10

L3 D18
L4 D28
L8 D30
L4 D24
L5 D32`,
      },
    ],
  },
  {
    id: 'lathe-technique-demonstrators',
    title: 'Lathe Technique Demonstrators',
    description: 'Purpose-built samples for learning how steps, shoulders, tapers, radii, bores, grooves, parting reliefs, and units appear in lathecode.',
    samples: [
      {
        id: 'diameter-ladder',
        title: 'Diameter Ladder',
        description: 'Five increasing diameters in one part, with each land long enough to read clearly in 2D and 3D.',
        meta: 'Basic',
        text: `; Diameter Ladder

STOCK D30
TOOL ANG R0.2 L7.8 A32.5 NA55
DEPTH CUT0.55 FINISH0.1
FEED MOVE200 PASS45 PART10

L4 D8
L4 D12
L4 D16
L4 D20
L4 D24
L4 D28`,
      },
      {
        id: 'shoulder-sampler',
        title: 'Shoulder Sampler',
        description: 'Square shoulders, narrow lands, and relief grooves arranged from small nose to large chuck side.',
        meta: 'Basic',
        text: `; Shoulder Sampler

STOCK D30
TOOL RECT R0.15 L1.5 H4
DEPTH CUT0.45 FINISH0.1
FEED MOVE210 PASS45 PART11

L4 D10
L1.5 D8
L5 D14
L1.5 D10
L4 D18
L1.5 D14
L5 D24
L3 D28`,
      },
      {
        id: 'taper-sampler',
        title: 'Taper Sampler',
        description: 'Shallow, medium, and steep tapers in sequence, ending with a broad chuck-side shoulder.',
        meta: 'Taper',
        text: `; Taper Sampler

STOCK D32
TOOL ANG R0.2 L7.8 A32.5 NA55
DEPTH CUT0.55 FINISH0.1
FEED MOVE190 PASS40 PART10

L3 D8
L8 DS8 DE12
L6 DS12 DE20
L4 DS20 DE28
L4 D30`,
      },
      {
        id: 'radius-sampler',
        title: 'Radius Sampler',
        description: 'Small, medium, and large convex radii, each stepping up toward the chuck.',
        meta: 'Curve',
text: `; Radius Sampler

STOCK D32
TOOL ANG R0.2 L7.8 A32.5 NA55
DEPTH CUT0.45 FINISH0.1
FEED MOVE180 PASS36 PART9

L3 D8
L3 DS8 DE14 CONV
L5 DS14 DE22 CONV
L7 DS22 DE28 CONV
L4 D30`,
      },
      {
        id: 'concave-convex-wave',
        title: 'Concave/Convex Wave',
        description: 'Alternating inward and outward arcs that make curve direction differences obvious.',
        meta: 'Curve',
text: `; Concave/Convex Wave

STOCK D32
TOOL ROUND R1.5
DEPTH CUT0.45 FINISH0.1
FEED MOVE180 PASS36 PART9

L3 D10
L4 DS10 DE22 CONV
L4 DS22 DE14 CONC
L4 DS14 DE26 CONV
L4 DS26 DE18 CONC
L4 DS18 DE30 CONV
L3 D30`,
      },
      {
        id: 'bore-sampler',
        title: 'Bore Sampler',
        description: 'Through-bore, counterbore, and internal taper in one simple outside sleeve.',
        meta: 'Inside',
        text: `; Bore Sampler

STOCK D32 ID10
TOOL ANG R0.15 L2.2 A120 NA55
DEPTH CUT0.45 FINISH0.1
FEED MOVE190 PASS38 PART9

L26 D28

INSIDE
L5 D18
L5 D16
L7 DS16 DE10
L9 D10`,
      },
      {
        id: 'tool-clearance-puzzle',
        title: 'Tool Clearance Puzzle',
        description: 'Tight grooves and narrow steps for seeing where a real-width tool can and cannot fit.',
        meta: 'Basic',
        text: `; Tool Clearance Puzzle

STOCK D28
TOOL RECT R0.1 L1.2 H3
DEPTH CUT0.35 FINISH0.1
FEED MOVE190 PASS38 PART9

L3 D12
L1.2 D9
L2.2 D16
L1.2 D11
L2.2 D18
L1.2 D13
L4 D22
L1.2 D17
L6 D26`,
      },
      {
        id: 'parting-relief-demo',
        title: 'Parting Relief Demo',
        description: 'A narrow relief groove before final cutoff, with a heavier chuck-side section behind it.',
        meta: 'Basic',
        text: `; Parting Relief Demo

STOCK D26
TOOL RECT R0.15 L1.5 H4
DEPTH CUT0.4 FINISH0.1
FEED MOVE210 PASS45 PART11

L5 D12
L8 D16
L1.5 D10
L6 D22
L3 D24
L1.5`,
      },
      {
        id: 'units-demo-pair',
        title: 'Units Demo Pair',
        description: 'An inch-unit companion shape using the same stepped-part idea as the metric samples.',
        meta: 'Basic',
        text: `; Units Demo Pair

UNITS IN
STOCK D1.1
TOOL ANG R0.01 L0.28 A32.5 NA55
DEPTH CUT0.025 FINISH0.004
FEED MOVE8 PASS2 PART0.5

L0.12 D0.32
L0.18 D0.45
L0.08 D0.36
L0.24 D0.68
L0.16 D0.88
L0.08 D0.88`,
      },
    ],
  },
  {
    id: 'machine-workshop-accessories',
    title: 'Machine & Workshop Accessories',
    description: 'Useful shop fixtures and machine-adjacent blanks that show arbors, collars, caps, spacers, and backplate-style geometry.',
    samples: [
      {
        id: 'mini-test-arbor',
        title: 'Mini Test Arbor',
        description: 'A generic long taper with a short pilot nose and a larger chuck-side shoulder.',
        meta: 'Taper',
        text: `; Mini Test Arbor

STOCK D28
TOOL ANG R0.2 L7.8 A32.5 NA55
DEPTH CUT0.55 FINISH0.1
FEED MOVE190 PASS40 PART10

L4 D8
L20 DS8 DE20
L4 D24
L3 D26`,
      },
      {
        id: 'drill-chuck-arbor-silhouette',
        title: 'Drill-Chuck Arbor Silhouette',
        description: 'Two different tapers separated by a shoulder, reading like a small drill-chuck arbor blank.',
        meta: 'Taper',
        text: `; Drill-Chuck Arbor Silhouette

STOCK D32
TOOL ANG R0.2 L7.8 A32.5 NA55
DEPTH CUT0.55 FINISH0.1
FEED MOVE190 PASS40 PART10

L3 D7
L8 DS7 DE14
L3 D18
L14 DS18 DE26
L4 D30`,
      },
      {
        id: 'mandrel-with-reliefs',
        title: 'Mandrel with Reliefs',
        description: 'Shaft lands, relief grooves, and locating shoulders arranged as a practical mandrel blank.',
        meta: 'Basic',
        text: `; Mandrel with Reliefs

STOCK D28
TOOL RECT R0.15 L1.5 H4
DEPTH CUT0.45 FINISH0.1
FEED MOVE210 PASS45 PART11

L5 D12
L1.5 D9
L8 D16
L1.5 D12
L6 D20
L1.5 D15
L6 D24
L3 D26`,
      },
      {
        id: 'tailstock-ram-stop-collar',
        title: 'Tailstock Ram Stop Collar',
        description: 'A collar-style ring with stepped bore and raised outside body, without modeling a set screw.',
        meta: 'Inside',
        text: `; Tailstock Ram Stop Collar

STOCK D34 ID12
TOOL ANG R0.15 L2.2 A120 NA55
DEPTH CUT0.45 FINISH0.1
FEED MOVE190 PASS38 PART9

L4 D28
L6 D30
L4 D28
L4 D32

INSIDE
L6 D20
L6 D18
L6 D16`,
      },
      {
        id: 'spindle-bore-dust-plug',
        title: 'Spindle Bore Dust Plug',
        description: 'A stepped plug with a rounded pull knob and a broad shoulder for covering a spindle bore.',
        meta: 'Curve, Basic',
        text: `; Spindle Bore Dust Plug

STOCK D30
TOOL ANG R0.2 L7.8 A32.5 NA55
DEPTH CUT0.45 FINISH0.1
FEED MOVE180 PASS36 PART9

L5 D12
L4 D18
L4 D16
L4 DS16 DE26 CONV
L4 DS26 DE20 CONV
L3 D28`,
      },
      {
        id: 'center-protector-cap',
        title: 'Center Protector Cap',
        description: 'A hollow cap for a live or dead center tip, with a rounded nose and internal taper.',
        meta: 'Inside, Curve',
        text: `; Center Protector Cap

STOCK D30 ID10
TOOL ANG R0.15 L2.2 A120 NA55
DEPTH CUT0.45 FINISH0.1
FEED MOVE180 PASS36 PART9

L2 D20
L5 DS20 DE22 CONV
L8 D24
L4 D28

INSIDE
L5 D18
L6 DS18 DE10
L8 D10`,
      },
      {
        id: 'oil-cup-button-cap',
        title: 'Oil-Cup Button Cap',
        description: 'A tiny domed cap with a locating skirt and a small internal relief.',
        meta: 'Curve, Inside',
        text: `; Oil-Cup Button Cap

STOCK D24 ID10
TOOL ANG R0.15 L2.2 A120 NA55
DEPTH CUT0.4 FINISH0.1
FEED MOVE180 PASS36 PART9

L2 D16
L4 DS16 DE18 CONV
L4 D18
L4 D22

INSIDE
L4 D14
L4 D12
L6 D10`,
      },
      {
        id: 'drawbar-spacer-stack',
        title: 'Drawbar Spacer Stack',
        description: 'A batch of matching drawbar spacers separated by parting gaps and a chuck-side holding shoulder.',
        meta: 'Batch',
        text: `; Drawbar Spacer Stack

STOCK D24
TOOL RECT R0.15 L1.5 H4
DEPTH CUT0.45 FINISH0.1
FEED MOVE220 PASS50 PART12

L3 D18
L1.5
L3 D18
L1.5
L3 D18
L1.5
L3 D18
L4 D22`,
      },
      {
        id: 'chuck-backplate-profile-demo',
        title: 'Chuck-Backplate Profile Demo',
        description: 'Hub, broad face, shallow recess, and center bore in a compact backplate-style profile.',
        meta: 'Inside',
        text: `; Chuck-Backplate Profile Demo

STOCK D42 ID12
TOOL ANG R0.15 L2.2 A120 NA55
DEPTH CUT0.55 FINISH0.1
FEED MOVE190 PASS38 PART9

L5 D24
L4 D34
L4 D28
L8 D40
L4 D40

INSIDE
L6 D20
L6 D18
L13 D14`,
      },
    ],
  },
  {
    id: 'everyday-useful-objects',
    title: 'Everyday Useful Objects',
    description: 'Small practical objects and household blanks that demonstrate rounded faces, plugs, sleeves, beads, feet, and knobs.',
    samples: [
      {
        id: 'cabinet-pull-knob',
        title: 'Cabinet Pull Knob',
        description: 'Rounded face, narrow neck, and broad base flange for a simple cabinet pull blank.',
        meta: 'Curve',
        text: `; Cabinet Pull Knob

STOCK D30
TOOL ANG R0.2 L7.8 A32.5 NA55
DEPTH CUT0.45 FINISH0.1
FEED MOVE180 PASS36 PART9

L2 D8
L5 DS8 DE24 CONV
L4 DS24 DE14 CONV
L5 D12
L4 D24
L3 D28`,
      },
      {
        id: 'lamp-finial',
        title: 'Lamp Finial',
        description: 'Decorative onion, ball, and cone finial profile without threads.',
        meta: 'Curve, Taper',
        text: `; Lamp Finial

STOCK D30
TOOL ANG R0.2 L7.8 A32.5 NA55
DEPTH CUT0.45 FINISH0.1
FEED MOVE180 PASS36 PART9

L2 D6
L4 DS6 DE16 CONV
L4 DS16 DE12 CONV
L5 DS12 DE22 CONV
L4 DS22 DE28
L3 D28`,
      },
      {
        id: 'furniture-foot',
        title: 'Furniture Foot',
        description: 'Wide foot with rounded floor-contact form and a stronger chuck-side mounting shoulder.',
        meta: 'Curve',
        text: `; Furniture Foot

STOCK D34
TOOL ANG R0.2 L7.8 A32.5 NA55
DEPTH CUT0.5 FINISH0.1
FEED MOVE180 PASS36 PART9

L2 D12
L5 DS12 DE28 CONV
L4 DS28 DE22 CONV
L5 D24
L4 D32
L3 D32`,
      },
      {
        id: 'cable-grommet-insert',
        title: 'Cable Grommet Insert',
        description: 'Flanged sleeve with a center hole for routing a cable through a panel.',
        meta: 'Inside',
        text: `; Cable Grommet Insert

STOCK D30 ID10
TOOL ANG R0.15 L2.2 A120 NA55
DEPTH CUT0.45 FINISH0.1
FEED MOVE190 PASS38 PART9

L4 D18
L8 D20
L3 D28
L3 D28

INSIDE
L18 D12`,
      },
      {
        id: 'shelf-peg-spacer',
        title: 'Shelf Peg Spacer',
        description: 'Simple shoulder peg with a small locating nose and larger spacer body.',
        meta: 'Basic',
        text: `; Shelf Peg Spacer

STOCK D24
TOOL ANG R0.2 L7.8 A32.5 NA55
DEPTH CUT0.5 FINISH0.1
FEED MOVE200 PASS45 PART10

L6 D8
L5 D12
L3 D10
L8 D20
L3 D22`,
      },
      {
        id: 'pen-end-plug',
        title: 'Pen End Plug',
        description: 'Small stepped plug with a domed end and a chuck-side shoulder for trimming.',
        meta: 'Curve',
        text: `; Pen End Plug

STOCK D22
TOOL ANG R0.2 L7.8 A32.5 NA55
DEPTH CUT0.4 FINISH0.1
FEED MOVE180 PASS36 PART9

L2 D6
L4 DS6 DE14 CONV
L4 DS14 DE10 CONV
L4 D12
L4 D18
L3 D20`,
      },
      {
        id: 'cord-pull-bead',
        title: 'Cord Pull Bead',
        description: 'Smooth bead with a through-hole and a small chuck-side land for workholding.',
        meta: 'Curve, Inside',
        text: `; Cord Pull Bead

STOCK D28 ID10
TOOL ANG R0.15 L2.2 A120 NA55
DEPTH CUT0.45 FINISH0.1
FEED MOVE180 PASS36 PART9

L2 D14
L6 DS14 DE22 CONV
L6 DS22 DE14 CONV
L4 D24
L2 D24

INSIDE
L20 D12`,
      },
      {
        id: 'drawer-bumper-button',
        title: 'Drawer Bumper Button',
        description: 'Shallow rubber-bumper-like button with a low dome and broad base flange.',
        meta: 'Curve',
        text: `; Drawer Bumper Button

STOCK D28
TOOL ANG R0.2 L7.8 A32.5 NA55
DEPTH CUT0.4 FINISH0.1
FEED MOVE180 PASS36 PART9

L2 D10
L4 DS10 DE22 CONV
L4 DS22 DE16 CONV
L3 D20
L3 D26
L2 D26`,
      },
      {
        id: 'tiny-handle-knob',
        title: 'Tiny Handle Knob',
        description: 'Mushroom knob profile with a screw-on-style neck and wide chuck-side base.',
        meta: 'Curve',
        text: `; Tiny Handle Knob

STOCK D30
TOOL ANG R0.2 L7.8 A32.5 NA55
DEPTH CUT0.45 FINISH0.1
FEED MOVE180 PASS36 PART9

L3 D8
L5 DS8 DE24 CONV
L5 DS24 DE12 CONV
L4 D12
L4 D26
L3 D28`,
      },
    ],
  },
  {
    id: 'curvy-showpieces',
    title: 'Curvy Showpieces',
    description: 'Decorative axisymmetric forms for exercising convex arcs, concave waists, bead-and-cove details, and hollow showpiece profiles.',
    samples: [
      {
        id: 'classic-chess-pawn',
        title: 'Classic Chess Pawn',
        description: 'Pawn-like base, neck, collar, and ball head with a broad chuck-side foot.',
        meta: 'Curve, Basic',
        text: `; Classic Chess Pawn

STOCK D32
TOOL ANG R0.2 L7.8 A32.5 NA55
DEPTH CUT0.45 FINISH0.1
FEED MOVE180 PASS36 PART9

L2 D8
L5 DS8 DE18 CONV
L4 DS18 DE10 CONV
L4 D8
L3 D18
L4 D22
L5 D30
L2 D30`,
      },
      {
        id: 'bishop-ish-finial',
        title: 'Bishop-ish Finial',
        description: 'A chess-piece silhouette with stacked curved features, intentionally without an off-axis slot.',
        meta: 'Curve',
        text: `; Bishop-ish Finial

STOCK D34
TOOL ROUND R1.5
DEPTH CUT0.45 FINISH0.1
FEED MOVE180 PASS36 PART9

L2 D6
L4 DS6 DE18 CONV
L5 DS18 DE12 CONV
L5 DS12 DE24 CONV
L4 DS24 DE16 CONC
L4 D28
L3 D32`,
      },
      {
        id: 'hourglass-standoff',
        title: 'Hourglass Standoff',
        description: 'Two collars connected by a concave waist for a decorative standoff body.',
        meta: 'Curve',
        text: `; Hourglass Standoff

STOCK D30
TOOL ROUND R1.5
DEPTH CUT0.45 FINISH0.1
FEED MOVE180 PASS36 PART9

L4 D22
L5 DS22 DE12 CONC
L5 DS12 DE24 CONC
L4 D24
L3 D28`,
      },
      {
        id: 'onion-dome',
        title: 'Onion Dome',
        description: 'Stacked convex curves rising from a small point into a larger onion dome base.',
        meta: 'Curve',
        text: `; Onion Dome

STOCK D34
TOOL ANG R0.2 L7.8 A32.5 NA55
DEPTH CUT0.45 FINISH0.1
FEED MOVE180 PASS36 PART9

L2 D5
L4 DS5 DE14 CONV
L5 DS14 DE24 CONV
L5 DS24 DE18 CONV
L5 DS18 DE30 CONV
L3 D32`,
      },
      {
        id: 'goblet-profile',
        title: 'Goblet Profile',
        description: 'Hollow cup, slender stem, and foot, with no handles or off-axis details.',
        meta: 'Inside, Curve',
        text: `; Goblet Profile

STOCK D34 ID10
TOOL ANG R0.15 L2.2 A120 NA55
DEPTH CUT0.45 FINISH0.1
FEED MOVE180 PASS36 PART9

L3 D22
L5 DS22 DE28 CONV
L5 DS28 DE16 CONV
L6 D12
L4 D20
L5 D32

INSIDE
L5 D20
L5 DS20 DE14
L13 D10`,
      },
      {
        id: 'mini-vase',
        title: 'Mini Vase',
        description: 'Bulbous hollow outside with a narrow mouth and stepped internal cavity.',
        meta: 'Inside, Curve',
        text: `; Mini Vase

STOCK D34 ID10
TOOL ANG R0.15 L2.2 A120 NA55
DEPTH CUT0.45 FINISH0.1
FEED MOVE180 PASS36 PART9

L3 D16
L5 DS16 DE24 CONV
L6 DS24 DE30 CONV
L5 DS30 DE18 CONV
L5 D28
L3 D32

INSIDE
L4 D14
L6 DS14 DE18
L7 D14
L10 D10`,
      },
      {
        id: 'bead-stack',
        title: 'Bead Stack',
        description: 'Ornamental bead-and-cove turning sample with multiple rounded beads before the base.',
        meta: 'Curve',
        text: `; Bead Stack

STOCK D30
TOOL ANG R0.2 L7.8 A32.5 NA55
DEPTH CUT0.4 FINISH0.1
FEED MOVE180 PASS36 PART9

L2 D8
L3 DS8 DE18 CONV
L3 DS18 DE10 CONV
L3 DS10 DE20 CONV
L3 DS20 DE12 CONV
L3 DS12 DE22 CONV
L3 DS22 DE14 CONV
L5 D28`,
      },
      {
        id: 'spool-bobbin',
        title: 'Spool Bobbin',
        description: 'Two flanges with a concave winding valley between them.',
        meta: 'Curve',
        text: `; Spool Bobbin

STOCK D30
TOOL ROUND R1.5
DEPTH CUT0.45 FINISH0.1
FEED MOVE180 PASS36 PART9

L4 D26
L4 DS26 DE14 CONC
L8 D14
L4 DS14 DE28 CONC
L4 D28
L2 D28`,
      },
      {
        id: 'trophy-without-handles',
        title: 'Trophy Without Handles',
        description: 'Hollow cup, stem, base, and raised lip without any non-lathe handle geometry.',
        meta: 'Inside, Curve',
        text: `; Trophy Without Handles

STOCK D36 ID10
TOOL ANG R0.15 L2.2 A120 NA55
DEPTH CUT0.45 FINISH0.1
FEED MOVE180 PASS36 PART9

L3 D24
L5 DS24 DE30 CONV
L5 DS30 DE18 CONV
L5 D14
L4 D18
L5 D32
L3 D34

INSIDE
L5 D22
L5 DS22 DE16
L8 D12
L12 D10`,
      },
    ],
  },
  {
    id: 'toys-desk-trinkets-funny-shapes',
    title: 'Toys, Desk Trinkets & Funny Shapes',
    description: 'Playful axisymmetric silhouettes that still demonstrate practical lathecode moves: tapers, beads, grooves, domes, rings, and stacked rounded forms.',
    samples: [
      {
        id: 'spinning-top',
        title: 'Spinning Top',
        description: 'Pointed tip, thin stem, and fat body with the largest mass toward the chuck.',
        meta: 'Taper, Curve',
        text: `; Spinning Top

STOCK D32
TOOL ANG R0.2 L7.8 A32.5 NA55
DEPTH CUT0.45 FINISH0.1
FEED MOVE180 PASS36 PART9

L2 D4
L5 DS4 DE10
L5 D8
L6 DS8 DE28 CONV
L4 D30
L2 D30`,
      },
      {
        id: 'ufo-saucer',
        title: 'UFO Saucer',
        description: 'Flat rim with domed top and bottom, expressed as a symmetric saucer-like turning.',
        meta: 'Curve',
        text: `; UFO Saucer

STOCK D34
TOOL ANG R0.2 L7.8 A32.5 NA55
DEPTH CUT0.45 FINISH0.1
FEED MOVE180 PASS36 PART9

L3 D10
L4 DS10 DE24 CONV
L3 D30
L4 DS30 DE18 CONV
L4 D28
L3 D32`,
      },
      {
        id: 'tiny-rocket',
        title: 'Tiny Rocket',
        description: 'Cone nose, cylinder body, nozzle tail, and a chuck-side launch-base shoulder.',
        meta: 'Taper, Basic',
        text: `; Tiny Rocket

STOCK D28
TOOL ANG R0.2 L7.8 A32.5 NA55
DEPTH CUT0.5 FINISH0.1
FEED MOVE190 PASS40 PART10

L5 DS4 DE16
L9 D16
L3 D12
L4 D22
L2 D24`,
      },
      {
        id: 'snowman-totem',
        title: 'Snowman Totem',
        description: 'Three stacked rounded forms with a tiny hat, increasing toward the chuck-side base.',
        meta: 'Curve, Basic',
        text: `; Snowman Totem

STOCK D34
TOOL ANG R0.2 L7.8 A32.5 NA55
DEPTH CUT0.45 FINISH0.1
FEED MOVE180 PASS36 PART9

L3 DS6 DE14 CONV
L3 DS14 DE8 CONV
L4 DS8 DE22 CONV
L4 DS22 DE12 CONV
L5 DS12 DE28 CONV
L5 DS28 DE18 CONV
L3 D30`,
      },
      {
        id: 'mushroom',
        title: 'Mushroom',
        description: 'Short stem leading into a rounded cap, with the cap held toward the chuck.',
        meta: 'Curve',
        text: `; Mushroom

STOCK D32
TOOL ANG R0.2 L7.8 A32.5 NA55
DEPTH CUT0.45 FINISH0.1
FEED MOVE180 PASS36 PART9

L5 D10
L4 DS10 DE24 CONV
L4 DS24 DE30 CONV
L4 DS30 DE18 CONV
L3 D30`,
      },
      {
        id: 'acorn',
        title: 'Acorn',
        description: 'Small point, rounded nut body, and a little cap band near the chuck side.',
        meta: 'Curve',
        text: `; Acorn

STOCK D30
TOOL ANG R0.2 L7.8 A32.5 NA55
DEPTH CUT0.45 FINISH0.1
FEED MOVE180 PASS36 PART9

L2 D5
L5 DS5 DE20 CONV
L5 DS20 DE16 CONV
L4 D22
L3 D28
L2 D28`,
      },
      {
        id: 'lighthouse',
        title: 'Lighthouse',
        description: 'Tapered tower, ring bands, and domed lamp top on a broad base.',
        meta: 'Taper, Curve',
        text: `; Lighthouse

STOCK D34
TOOL ANG R0.2 L7.8 A32.5 NA55
DEPTH CUT0.45 FINISH0.1
FEED MOVE180 PASS36 PART9

L3 D8
L4 DS8 DE14 CONV
L10 DS14 DE22
L1.5 D26
L5 D22
L1.5 D28
L4 D32`,
      },
      {
        id: 'honey-dipper',
        title: 'Honey Dipper',
        description: 'Handle plus repeated ring grooves for a compact ribbed dipper head.',
        meta: 'Basic',
        text: `; Honey Dipper

STOCK D26
TOOL RECT R0.15 L1.5 H4
DEPTH CUT0.4 FINISH0.1
FEED MOVE210 PASS45 PART11

L10 D8
L1.5 D18
L1.5 D12
L1.5 D20
L1.5 D12
L1.5 D22
L1.5 D12
L5 D24`,
      },
      {
        id: 'saturn-bead',
        title: 'Saturn Bead',
        description: 'Rounded bead with a proud equatorial ring, kept axisymmetric for lathe previewing.',
        meta: 'Curve, Basic',
        text: `; Saturn Bead

STOCK D34
TOOL ANG R0.2 L7.8 A32.5 NA55
DEPTH CUT0.45 FINISH0.1
FEED MOVE180 PASS36 PART9

L3 D8
L5 DS8 DE24 CONV
L2 D32
L5 DS24 DE10 CONV
L4 D28
L2 D32`,
      },
      {
        id: 'cartoon-bomb',
        title: 'Cartoon Bomb',
        description: 'Sphere-like body with a short fuse-like stem, without any off-axis fuse geometry.',
        meta: 'Curve',
        text: `; Cartoon Bomb

STOCK D34
TOOL ANG R0.2 L7.8 A32.5 NA55
DEPTH CUT0.45 FINISH0.1
FEED MOVE180 PASS36 PART9

L4 D6
L6 DS6 DE28 CONV
L6 DS28 DE14 CONV
L4 D30
L2 D32`,
      },
      {
        id: 'tiny-traffic-cone',
        title: 'Tiny Traffic Cone',
        description: 'Stacked cone and base, with a small tip and a wide chuck-side foot.',
        meta: 'Taper, Basic',
        text: `; Tiny Traffic Cone

STOCK D30
TOOL ANG R0.2 L7.8 A32.5 NA55
DEPTH CUT0.5 FINISH0.1
FEED MOVE190 PASS40 PART10

L2 D4
L12 DS4 DE20
L3 D22
L4 D28
L2 D28`,
      },
      {
        id: 'rubber-duck-silhouette-lathe-edition',
        title: 'Rubber Duck Silhouette, Lathe Edition',
        description: 'Rounded body and head interpreted as a stacked totem that can be made on a lathe.',
        meta: 'Curve',
        text: `; Rubber Duck Silhouette, Lathe Edition

STOCK D34
TOOL ANG R0.2 L7.8 A32.5 NA55
DEPTH CUT0.45 FINISH0.1
FEED MOVE180 PASS36 PART9

L3 D8
L4 DS8 DE18 CONV
L4 DS18 DE12 CONV
L3 D14
L6 DS14 DE28 CONV
L5 DS28 DE20 CONV
L3 D32`,
      },
    ],
  },
  {
    id: 'curious-can-a-lathe-do-that-designs',
    title: 'Curious / "Can a Lathe Do That?" Designs',
    description: 'Odd but still lathe-friendly designs that show how far axisymmetric steps, grooves, waves, tapers, and hollow profiles can go.',
    samples: [
      {
        id: 'fake-thread-bolt',
        title: 'Fake Thread Bolt',
        description: 'Repeated annular grooves that read like thread pitch in profile, explicitly without a real helix.',
        meta: 'Basic',
        text: `; Fake Thread Bolt

STOCK D28
TOOL RECT R0.15 L1.5 H4
DEPTH CUT0.4 FINISH0.1
FEED MOVE210 PASS45 PART11

L3 D12
L1.5 D16
L1.5 D12
L1.5 D16
L1.5 D12
L1.5 D16
L1.5 D12
L5 D16
L5 D24
L3 D26`,
      },
      {
        id: 'morse-code-bead-sos',
        title: 'Morse-Code Bead: SOS',
        description: 'Long and short raised rings encode SOS as a tactile turned bead pattern.',
        meta: 'Basic',
        text: `; Morse-Code Bead: SOS

STOCK D28
TOOL RECT R0.15 L1.5 H4
DEPTH CUT0.4 FINISH0.1
FEED MOVE210 PASS45 PART11

L2 D12
L1.5 D18
L1.5 D12
L1.5 D18
L1.5 D12
L1.5 D18
L1.5 D12
L3 D20
L1.5 D12
L3 D20
L1.5 D12
L3 D20
L1.5 D12
L1.5 D18
L1.5 D12
L1.5 D18
L1.5 D12
L1.5 D18
L4 D24`,
      },
      {
        id: 'sound-wave-totem',
        title: 'Sound-Wave Totem',
        description: 'Stepped diameters approximate a waveform while staying completely axisymmetric.',
        meta: 'Basic',
        text: `; Sound-Wave Totem

STOCK D32
TOOL ANG R0.2 L7.8 A32.5 NA55
DEPTH CUT0.5 FINISH0.1
FEED MOVE200 PASS45 PART10

L2 D10
L2 D18
L2 D12
L2 D22
L2 D14
L2 D20
L2 D16
L2 D24
L2 D18
L4 D30`,
      },
      {
        id: 'alien-chess-pawn',
        title: 'Alien Chess Pawn',
        description: 'Pawn base with an oversized smooth head and an exaggerated little neck.',
        meta: 'Curve',
text: `; Alien Chess Pawn

STOCK D36
TOOL ANG R0.2 L7.8 A32.5 NA55
DEPTH CUT0.45 FINISH0.1
FEED MOVE180 PASS36 PART9

L2 D8
L6 DS8 DE30 CONV
L6 DS30 DE12 CONV
L4 D10
L4 D22
L5 D34`,
      },
      {
        id: 'matryoshka-silhouette',
        title: 'Matryoshka Silhouette',
        description: 'Nested-doll outline as one solid turning, with a small head and large rounded body.',
        meta: 'Curve',
        text: `; Matryoshka Silhouette

STOCK D38
TOOL ANG R0.2 L7.8 A32.5 NA55
DEPTH CUT0.45 FINISH0.1
FEED MOVE180 PASS36 PART9

L3 D10
L5 DS10 DE20 CONV
L4 DS20 DE16 CONV
L6 DS16 DE32 CONV
L6 DS32 DE24 CONV
L4 D36`,
      },
      {
        id: 'lava-lamp-capsule',
        title: 'Lava Lamp Capsule',
        description: 'A stretched capsule with a bulbous center and heavier chuck-side end cap.',
        meta: 'Curve',
        text: `; Lava Lamp Capsule

STOCK D38
TOOL ANG R0.2 L7.8 A32.5 NA55
DEPTH CUT0.45 FINISH0.1
FEED MOVE180 PASS36 PART9

L3 D10
L8 DS10 DE28 CONV
L6 DS28 DE34 CONV
L8 DS34 DE16 CONV
L4 D36`,
      },
      {
        id: 'rocket-nozzle-cross-section',
        title: 'Rocket Nozzle Cross-Section',
        description: 'Outside cone with a converging throat and diverging internal nozzle profile.',
        meta: 'Inside, Taper',
        text: `; Rocket Nozzle Cross-Section

STOCK D36 ID10
TOOL ANG R0.15 L2.2 A120 NA55
DEPTH CUT0.45 FINISH0.1
FEED MOVE190 PASS38 PART9

L3 D20
L14 DS20 DE30
L5 D32
L3 D34

INSIDE
L5 D18
L6 DS18 DE10
L6 DS10 DE16
L8 D16`,
      },
      {
        id: 'wobbly-looking-but-symmetric',
        title: 'Wobbly Looking but Symmetric',
        description: 'Alternating concave and convex bulges that look playful but remain perfectly rotational.',
        meta: 'Curve',
text: `; Wobbly Looking but Symmetric

STOCK D36
TOOL ROUND R1.5
DEPTH CUT0.45 FINISH0.1
FEED MOVE180 PASS36 PART9

L3 D10
L4 DS10 DE24 CONV
L4 DS24 DE14 CONC
L4 DS14 DE28 CONV
L4 DS28 DE18 CONC
L4 DS18 DE30 CONV
L4 D34`,
      },
      {
        id: 'not-a-vase-vase',
        title: '"Not a Vase" Vase',
        description: 'Absurdly tiny mouth, huge belly, and hollow interior, built as a lathe-only vase joke.',
        meta: 'Inside, Curve',
        text: `; "Not a Vase" Vase

STOCK D40 ID10
TOOL ANG R0.15 L2.2 A120 NA55
DEPTH CUT0.45 FINISH0.1
FEED MOVE180 PASS36 PART9

L3 D16
L6 DS16 DE24 CONV
L7 DS24 DE34 CONV
L6 DS34 DE18 CONV
L5 D36
L3 D38

INSIDE
L4 D12
L7 DS12 DE22
L7 D18
L12 D10`,
      },
    ],
  },
  {
    id: 'multi-part-sets',
    title: 'Multi-Part Sets',
    description: 'Batch-oriented lathecode samples with multiple related parts separated by tool-width cutoff gaps and a heavier chuck-side section.',
    samples: [
      {
        id: 'washer-assortment',
        title: 'Washer Assortment',
        description: 'Five washers cut from tube stock, keeping the same bore while increasing the outside diameter.',
        meta: 'Batch, Inside',
        text: `; Washer Assortment

STOCK D32 ID10
TOOL RECT R0.15 L1.5 H4
DEPTH CUT0.45 FINISH0.1
FEED MOVE220 PASS50 PART12

L2 D16
L1.5
L2.5 D18
L1.5
L3 D22
L1.5
L3.5 D26
L1.5
L4 D30
L3 D30`,
      },
      {
        id: 'spacer-assortment',
        title: 'Spacer Assortment',
        description: 'Same-diameter spacers in several lengths, separated by realistic parting-tool-width gaps.',
        meta: 'Batch',
        text: `; Spacer Assortment

STOCK D24
TOOL RECT R0.15 L1.5 H4
DEPTH CUT0.45 FINISH0.1
FEED MOVE220 PASS50 PART12

L2 D16
L1.5
L4 D16
L1.5
L6 D16
L1.5
L9 D16
L4 D22`,
      },
      {
        id: 'bead-bracelet-set',
        title: 'Bead Bracelet Set',
        description: 'A small run of rounded beads, each with a different diameter, cut with a round form tool.',
        meta: 'Batch, Curve',
        text: `; Bead Bracelet Set

STOCK D30
TOOL ROUND R1.5
DEPTH CUT0.4 FINISH0.1
FEED MOVE180 PASS36 PART9

L2 D8
L3 DS8 DE16 CONV
L3 DS16 DE8 CONV
L3
L2 D10
L3.5 DS10 DE20 CONV
L3.5 DS20 DE10 CONV
L3
L2 D12
L4 DS12 DE24 CONV
L4 DS24 DE12 CONV
L3
L2 D14
L4 DS14 DE26 CONV
L4 DS26 DE14 CONV
L4 D28`,
      },
      {
        id: 'chess-pawns-x4',
        title: 'Chess Pawns x4',
        description: 'Four repeated pawn blanks in one setup, with enough clearance between pieces for the form tool.',
        meta: 'Batch, Curve',
        text: `; Chess Pawns x4

STOCK D28
TOOL ROUND R1.5
DEPTH CUT0.4 FINISH0.1
FEED MOVE180 PASS36 PART9

L2 D8
L2.5 DS8 DE16 CONV
L2.5 DS16 DE10 CONV
L2 D12
L3
L2 D8
L2.5 DS8 DE16 CONV
L2.5 DS16 DE10 CONV
L2 D12
L3
L2 D8
L2.5 DS8 DE16 CONV
L2.5 DS16 DE10 CONV
L2 D12
L3
L2 D8
L2.5 DS8 DE16 CONV
L2.5 DS16 DE10 CONV
L2 D12
L4 D24`,
      },
      {
        id: 'stacking-toy-rings',
        title: 'Stacking Toy Rings',
        description: 'Graduated ring blanks from tube stock, arranged from smallest free-end ring to largest chuck-side ring.',
        meta: 'Batch, Inside',
        text: `; Stacking Toy Rings

STOCK D36 ID10
TOOL RECT R0.15 L1.5 H4
DEPTH CUT0.45 FINISH0.1
FEED MOVE220 PASS50 PART12

L2 D14
L1.5
L2.5 D18
L1.5
L3 D22
L1.5
L3.5 D26
L1.5
L4 D32
L3 D34`,
      },
      {
        id: 'rocket-fleet',
        title: 'Rocket Fleet',
        description: 'Three tiny rocket silhouettes with different tapered noses and a broad chuck-side holder.',
        meta: 'Batch, Taper',
        text: `; Rocket Fleet

STOCK D32
TOOL ANG R0.15 L3 A32.5 NA55
DEPTH CUT0.45 FINISH0.1
FEED MOVE190 PASS40 PART10

L2 D6
L4 DS6 DE16
L3 D18
L3
L2 D7
L5 DS7 DE20
L3 D22
L3
L2 D8
L6 DS8 DE24
L3 D26
L4 D30`,
      },
      {
        id: 'calibration-rod-set',
        title: 'Calibration Rod Set',
        description: 'Three short stepped rods for checking diameter recognition, each larger toward the chuck side.',
        meta: 'Batch',
        text: `; Calibration Rod Set

STOCK D32
TOOL RECT R0.15 L1.5 H4
DEPTH CUT0.45 FINISH0.1
FEED MOVE220 PASS50 PART12

L2 D8
L2 D12
L2 D16
L1.5
L2 D10
L2 D14
L2 D20
L1.5
L2 D12
L2 D18
L3 D24
L4 D30`,
      },
      {
        id: 'desk-totem-kit',
        title: 'Desk Totem Kit',
        description: 'Separate base, column, bead, and finial blanks in one bar, with curved parts cut by a round form tool.',
        meta: 'Batch, Curve',
        text: `; Desk Totem Kit

STOCK D34
TOOL ROUND R1.5
DEPTH CUT0.4 FINISH0.1
FEED MOVE180 PASS36 PART9

L3 D20
L3 D24
L3
L8 D12
L3
L2 D10
L4 DS10 DE24 CONV
L4 DS24 DE10 CONV
L3
L2 D8
L4 DS8 DE20 CONV
L4 D28
L4 D32`,
      },
    ],
  },
  {
    id: 'morse-taper-arbor-adapters',
    title: 'Morse Taper & Arbor Adapters',
    description: 'Reference taper plugs, sockets, sleeves, arbors, and teaching pieces using shallow taper silhouettes and suitable outside or boring tools.',
    samples: [
      {
        id: 'mt0-external-taper-plug',
        title: 'MT0 External Taper Plug',
        description: 'Tiny external Morse taper reference plug with a slim free-end tip and a short chuck-side grip.',
        meta: 'Taper',
        text: `; MT0 External Taper Plug

STOCK D18
TOOL ANG R0.2 L7.8 A32.5 NA55
DEPTH CUT0.35 FINISH0.1
FEED MOVE190 PASS40 PART10

L3 D6
L14 DS6 DE9
L4 D14
L3 D16`,
      },
      {
        id: 'mt2-external-taper-plug',
        title: 'MT2 External Taper Plug',
        description: 'Common tailstock-size taper silhouette with a heavier chuck-side register.',
        meta: 'Taper',
        text: `; MT2 External Taper Plug

STOCK D26
TOOL ANG R0.2 L7.8 A32.5 NA55
DEPTH CUT0.45 FINISH0.1
FEED MOVE190 PASS40 PART10

L4 D10
L24 DS10 DE18
L5 D22
L3 D24`,
      },
      {
        id: 'mt5-stub-taper',
        title: 'MT5 Stub Taper',
        description: 'Short large taper section for comparing scale without requiring a long blank.',
        meta: 'Taper',
        text: `; MT5 Stub Taper

STOCK D46
TOOL ANG R0.2 L7.8 A32.5 NA55
DEPTH CUT0.6 FINISH0.1
FEED MOVE190 PASS40 PART10

L5 D24
L22 DS24 DE38
L6 D42
L3 D44`,
      },
      {
        id: 'mt2-internal-socket-blank',
        title: 'MT2 Internal Socket Blank',
        description: 'Hollow adapter body with a longer internal taper and a stronger rear wall.',
        meta: 'Inside, Taper',
        text: `; MT2 Internal Socket Blank

STOCK D34 ID12
TOOL ANG R0.15 L2.2 A120 NA55
DEPTH CUT0.45 FINISH0.1
FEED MOVE190 PASS38 PART9

L28 D28
L5 D32

INSIDE
L4 D13
L22 DS13 DE22
L7 D22`,
      },
      {
        id: 'deep-mt2-test-socket',
        title: 'Deep MT2 Test Socket',
        description: 'Long internal taper test socket for fit visualization and bore-depth practice.',
        meta: 'Inside, Taper',
        text: `; Deep MT2 Test Socket

STOCK D34 ID12
TOOL ANG R0.15 L2.2 A120 NA55
DEPTH CUT0.45 FINISH0.1
FEED MOVE190 PASS38 PART9

L38 D28
L5 D32

INSIDE
L5 D13
L34 DS13 DE22
L4 D22`,
      },
      {
        id: 'mt3-outside-to-mt2-inside',
        title: 'MT3 Outside to MT2 Inside',
        description: 'Drill-sleeve style reducer with a larger external taper and MT2-scale internal taper.',
        meta: 'Inside, Taper',
        text: `; MT3 Outside to MT2 Inside

STOCK D42 ID12
TOOL ANG R0.15 L2.2 A120 NA55
DEPTH CUT0.5 FINISH0.1
FEED MOVE190 PASS38 PART9

L5 D18
L30 DS18 DE34
L6 D38

INSIDE
L5 D13
L26 DS13 DE22
L10 D24`,
      },
      {
        id: 'mt2-drill-chuck-arbor-blank',
        title: 'MT2 Drill-Chuck Arbor Blank',
        description: 'Larger drill-chuck arbor blank with a shoulder between the nose taper and Morse shank.',
        meta: 'Taper',
        text: `; MT2 Drill-Chuck Arbor Blank

STOCK D30
TOOL ANG R0.2 L7.8 A32.5 NA55
DEPTH CUT0.45 FINISH0.1
FEED MOVE190 PASS40 PART10

L5 DS8 DE13
L3 D16
L24 DS16 DE24
L4 D28`,
      },
      {
        id: 'mt2-faceplate-arbor-blank',
        title: 'MT2 Faceplate Arbor Blank',
        description: 'Taper shank with a wide mounting flange and short rear register.',
        meta: 'Taper, Basic',
        text: `; MT2 Faceplate Arbor Blank

STOCK D44
TOOL ANG R0.2 L7.8 A32.5 NA55
DEPTH CUT0.5 FINISH0.1
FEED MOVE190 PASS40 PART10

L4 D12
L24 DS12 DE26
L4 D34
L8 D42
L3 D42`,
      },
      {
        id: 'drawbar-mt2-blank',
        title: 'Drawbar MT2 Blank',
        description: 'MT2-style taper shank with a through-hole suitable for drawbar-style sketches.',
        meta: 'Inside, Taper',
        text: `; Drawbar MT2 Blank

STOCK D34 ID8
TOOL ANG R0.15 L2.2 A120 NA55
DEPTH CUT0.45 FINISH0.1
FEED MOVE190 PASS38 PART9

L4 D12
L26 DS12 DE26
L5 D30

INSIDE
L35 D10`,
      },
      {
        id: 'taper-gauge-male-female-pair',
        title: 'Taper Gauge Male/Female Pair',
        description: 'Matching plug and socket silhouettes in one sample, using the boring tool for the internal taper.',
        meta: 'Inside, Taper, Batch',
        text: `; Taper Gauge Male/Female Pair

STOCK D34 ID10
TOOL ANG R0.15 L2.2 A120 NA55
DEPTH CUT0.45 FINISH0.1
FEED MOVE190 PASS38 PART9

L3 D10
L18 DS10 DE22
L3 D26
L4 D30
L20 D30

INSIDE
L28 D12
L18 DS12 DE22`,
      },
      {
        id: 'miniature-morse-taper-teaching-set',
        title: 'Miniature Morse Taper Teaching Set',
        description: 'MT0 through MT3 comparison set in one bar, with tool-width gaps between the taper references.',
        meta: 'Batch, Taper',
        text: `; Miniature Morse Taper Teaching Set

STOCK D34
TOOL ANG R0.15 L3 A32.5 NA55
DEPTH CUT0.45 FINISH0.1
FEED MOVE190 PASS40 PART10

L2 D6
L10 DS6 DE10
L3
L2 D8
L12 DS8 DE14
L3
L2 D10
L14 DS10 DE18
L3
L2 D12
L16 DS12 DE24
L4 D30`,
      },
    ],
  },
  {
    id: 'bolt-screw-fastener-blanks',
    title: 'Bolt, Screw & Fastener Blanks',
    description: 'Standard metric and imperial hex-stock bolt blanks plus screw-head silhouettes, studs, pins, rivets, nuts, and thread placeholders sized for reachable tool geometry.',
    samples: [
      {
        id: 'm3-x-12-hex-bolt',
        title: 'M3 x 12 Hex Bolt',
        description: 'M3 bolt blank from hex stock; the head is left at stock size, with a small under-head hint and chamfered thread-start taper.',
        meta: 'Metric, Hex stock',
        text: `; M3 x 12 Hex Bolt

STOCK D7
TOOL ANG R0.2 L7.8 A32.5 NA55
DEPTH CUT0.35 FINISH0.1
FEED MOVE190 PASS40 PART10

L0.8 DS2.4 DE3
L10.7 D3
L0.5 D2.7
L2 D7`,
      },
      {
        id: 'm4-x-16-hex-bolt',
        title: 'M4 x 16 Hex Bolt',
        description: 'Common M4 bolt blank from hex stock, with only a narrow under-head hint instead of a cutoff section.',
        meta: 'Metric, Hex stock',
        text: `; M4 x 16 Hex Bolt

STOCK D9
TOOL ANG R0.2 L7.8 A32.5 NA55
DEPTH CUT0.4 FINISH0.1
FEED MOVE190 PASS40 PART10

L1 DS3.2 DE4
L14.4 D4
L0.6 D3.6
L2.8 D9`,
      },
      {
        id: 'm5-x-20-hex-bolt',
        title: 'M5 x 20 Hex Bolt',
        description: 'M5 hex-stock bolt blank with thread-start taper, straight shank, under-head hint, and untouched hex head stock.',
        meta: 'Metric, Hex stock',
        text: `; M5 x 20 Hex Bolt

STOCK D10
TOOL ANG R0.2 L7.8 A32.5 NA55
DEPTH CUT0.4 FINISH0.1
FEED MOVE190 PASS40 PART10

L1.2 DS4 DE5
L18.1 D5
L0.7 D4.5
L3.5 D10`,
      },
      {
        id: 'm6-x-25-hex-bolt',
        title: 'M6 x 25 Hex Bolt',
        description: 'M6 standard-length bolt blank using hex stock across-corners as the stock diameter.',
        meta: 'Metric, Hex stock',
        text: `; M6 x 25 Hex Bolt

STOCK D12
TOOL ANG R0.2 L7.8 A32.5 NA55
DEPTH CUT0.45 FINISH0.1
FEED MOVE190 PASS40 PART10

L1.5 DS4.8 DE6
L22.7 D6
L0.8 D5.4
L4 D12`,
      },
      {
        id: 'm8-x-40-hex-bolt',
        title: 'M8 x 40 Hex Bolt',
        description: 'M8 hex-stock bolt blank with a chamfered thread lead-in and no extra parting stock after the head.',
        meta: 'Metric, Hex stock',
        text: `; M8 x 40 Hex Bolt

STOCK D16
TOOL ANG R0.2 L7.8 A32.5 NA55
DEPTH CUT0.5 FINISH0.1
FEED MOVE190 PASS40 PART10

L2 DS6.4 DE8
L36.8 D8
L1.2 D7.2
L5.3 D16`,
      },
      {
        id: 'm10-x-50-hex-bolt',
        title: 'M10 x 50 Hex Bolt',
        description: 'M10 hex bolt blank sized for a typical head and a 50 mm under-head length.',
        meta: 'Metric, Hex stock',
        text: `; M10 x 50 Hex Bolt

STOCK D21
TOOL ANG R0.2 L7.8 A32.5 NA55
DEPTH CUT0.55 FINISH0.1
FEED MOVE190 PASS40 PART10

L2.5 DS8 DE10
L46 D10
L1.5 D9
L6.4 D21`,
      },
      {
        id: 'quarter-20-x-1-hex-bolt',
        title: '1/4-20 x 1 in Hex Bolt',
        description: 'Imperial 1/4-20 bolt blank in inch units, with hex head left at stock size and a tapered thread start.',
        meta: 'Imperial, Hex stock',
        text: `; 1/4-20 x 1 in Hex Bolt

UNITS IN
STOCK D0.54
TOOL ANG R0.008 L0.31 A32.5 NA55
DEPTH CUT0.02 FINISH0.004
FEED MOVE8 PASS2 PART0.4

L0.06 DS0.19 DE0.25
L0.91 D0.25
L0.03 D0.23
L0.16 D0.54`,
      },
      {
        id: 'five-sixteenths-18-x-1-25-hex-bolt',
        title: '5/16-18 x 1.25 in Hex Bolt',
        description: 'Imperial 5/16-18 bolt blank with only a small under-head relief hint before the hex head.',
        meta: 'Imperial, Hex stock',
        text: `; 5/16-18 x 1.25 in Hex Bolt

UNITS IN
STOCK D0.62
TOOL ANG R0.008 L0.31 A32.5 NA55
DEPTH CUT0.02 FINISH0.004
FEED MOVE8 PASS2 PART0.4

L0.07 DS0.24 DE0.3125
L1.14 D0.3125
L0.04 D0.29
L0.2 D0.62`,
      },
      {
        id: 'three-eighths-16-x-1-5-hex-bolt',
        title: '3/8-16 x 1.5 in Hex Bolt',
        description: 'Imperial 3/8-16 bolt blank from hex stock, with a thread-start chamfer and stock-size head.',
        meta: 'Imperial, Hex stock',
        text: `; 3/8-16 x 1.5 in Hex Bolt

UNITS IN
STOCK D0.7
TOOL ANG R0.008 L0.31 A32.5 NA55
DEPTH CUT0.02 FINISH0.004
FEED MOVE8 PASS2 PART0.4

L0.08 DS0.29 DE0.375
L1.37 D0.375
L0.05 D0.34
L0.24 D0.7`,
      },
      {
        id: 'half-13-x-2-hex-bolt',
        title: '1/2-13 x 2 in Hex Bolt',
        description: 'Imperial 1/2-13 bolt blank with a full 2 inch under-head length and no extra parting section after the head.',
        meta: 'Imperial, Hex stock',
        text: `; 1/2-13 x 2 in Hex Bolt

UNITS IN
STOCK D0.94
TOOL ANG R0.008 L0.31 A32.5 NA55
DEPTH CUT0.025 FINISH0.004
FEED MOVE8 PASS2 PART0.4

L0.1 DS0.38 DE0.5
L1.83 D0.5
L0.07 D0.46
L0.31 D0.94`,
      },
      {
        id: 'shoulder-bolt-blank',
        title: 'Shoulder Bolt Blank',
        description: 'Smaller thread land, larger precision shoulder, and a broad round head at the chuck side.',
        meta: 'Basic',
        text: `; Shoulder Bolt Blank

STOCK D30
TOOL RECT R0.15 L1.5 H4
DEPTH CUT0.45 FINISH0.1
FEED MOVE220 PASS50 PART12

L7 D8
L12 D16
L2 D14
L6 D26
L3 D28`,
      },
      {
        id: 'fully-threaded-rod-blank',
        title: 'Fully Threaded Rod Blank',
        description: 'Straight cylinder with repeated reachable annular grooves standing in for thread pitch.',
        meta: 'Basic',
        text: `; Fully Threaded Rod Blank

STOCK D22
TOOL RECT R0.15 L1.5 H4
DEPTH CUT0.4 FINISH0.1
FEED MOVE220 PASS50 PART12

L3 D10
L1.5 D13
L1.5 D10
L1.5 D13
L1.5 D10
L1.5 D13
L1.5 D10
L8 D14
L4 D20`,
      },
      {
        id: 'pan-head-screw-blank',
        title: 'Pan-Head Screw Blank',
        description: 'Domed pan head and straight screw land, cut with a round form tool for the head radius.',
        meta: 'Curve, Basic',
        text: `; Pan-Head Screw Blank

STOCK D24
TOOL ROUND R1.5
DEPTH CUT0.4 FINISH0.1
FEED MOVE180 PASS36 PART9

L8 D7
L5 D10
L3 DS10 DE20 CONV
L4 D22
L3 D22`,
      },
      {
        id: 'countersunk-screw-blank',
        title: 'Countersunk Screw Blank',
        description: 'Conical screw head and narrow shaft, with the larger head oriented toward the chuck.',
        meta: 'Taper, Basic',
        text: `; Countersunk Screw Blank

STOCK D26
TOOL ANG R0.2 L7.8 A32.5 NA55
DEPTH CUT0.45 FINISH0.1
FEED MOVE190 PASS40 PART10

L9 D7
L3 D10
L7 DS10 DE24
L3 D24`,
      },
      {
        id: 'thumb-screw-blank',
        title: 'Thumb-Screw Blank',
        description: 'Large rounded thumb head with a narrow screw stem, ready for later knurling outside lathecode.',
        meta: 'Basic, Curve',
        text: `; Thumb-Screw Blank

STOCK D32
TOOL ROUND R1.5
DEPTH CUT0.45 FINISH0.1
FEED MOVE180 PASS36 PART9

L10 D8
L5 D12
L5 DS12 DE28 CONV
L4 D30`,
      },
      {
        id: 'threaded-spacer-stud',
        title: 'Threaded Spacer Stud',
        description: 'Hollow standoff-like stud with a through bore and larger chuck-side shoulder.',
        meta: 'Inside, Basic',
        text: `; Threaded Spacer Stud

STOCK D28 ID8
TOOL ANG R0.15 L2.2 A120 NA55
DEPTH CUT0.45 FINISH0.1
FEED MOVE190 PASS38 PART9

L8 D14
L10 D18
L5 D24

INSIDE
L23 D10`,
      },
      {
        id: 'fake-thread-pitch-sampler',
        title: 'Fake Thread Pitch Sampler',
        description: 'Several grooved rods in one stock setup, with different visual pitch groups.',
        meta: 'Batch',
        text: `; Fake Thread Pitch Sampler

STOCK D24
TOOL RECT R0.15 L1.5 H4
DEPTH CUT0.4 FINISH0.1
FEED MOVE220 PASS50 PART12

L2 D10
L1.5 D14
L1.5 D10
L1.5 D14
L1.5
L3 D12
L1.5 D16
L3 D12
L1.5
L4 D14
L1.5 D18
L4 D14
L4 D22`,
      },
      {
        id: 'solid-rivet-blank',
        title: 'Solid Rivet Blank',
        description: 'Domed rivet head and straight shank, using a round tool for the head radius.',
        meta: 'Curve, Basic',
        text: `; Solid Rivet Blank

STOCK D24
TOOL ROUND R1.5
DEPTH CUT0.4 FINISH0.1
FEED MOVE180 PASS36 PART9

L10 D8
L4 D10
L4 DS10 DE22 CONV
L3 D22`,
      },
      {
        id: 'grooved-pin-blank',
        title: 'Grooved Pin Blank',
        description: 'Pin with a reachable retaining-ring groove and a larger chuck-side button.',
        meta: 'Basic',
        text: `; Grooved Pin Blank

STOCK D24
TOOL RECT R0.15 L1.5 H4
DEPTH CUT0.4 FINISH0.1
FEED MOVE220 PASS50 PART12

L8 D10
L1.5 D8
L8 D12
L4 D18
L3 D22`,
      },
      {
        id: 'round-nut-blank',
        title: 'Round Nut Blank',
        description: 'Cylindrical round nut body with a through bore in tube stock.',
        meta: 'Inside',
        text: `; Round Nut Blank

STOCK D28 ID10
TOOL ANG R0.15 L2.2 A120 NA55
DEPTH CUT0.45 FINISH0.1
FEED MOVE190 PASS38 PART9

L6 D22
L6 D24

INSIDE
L12 D14`,
      },
      {
        id: 'acorn-nut-blank',
        title: 'Acorn Nut Blank',
        description: 'Domed closed-end nut body with an internal bore and rounded exterior cap.',
        meta: 'Inside, Curve',
        text: `; Acorn Nut Blank

STOCK D32 ID10
TOOL ANG R0.15 L2.2 A120 NA55
DEPTH CUT0.45 FINISH0.1
FEED MOVE180 PASS36 PART9

L3 D16
L5 DS16 DE26 CONV
L5 D30

INSIDE
L8 D14
L5 D12`,
      },
      {
        id: 'decorative-screw-cap',
        title: 'Decorative Screw Cap',
        description: 'Shallow domed cap with an internal recess represented by a short bore profile.',
        meta: 'Inside, Curve',
        text: `; Decorative Screw Cap

STOCK D30 ID10
TOOL ANG R0.15 L2.2 A120 NA55
DEPTH CUT0.4 FINISH0.1
FEED MOVE180 PASS36 PART9

L3 D20
L5 DS20 DE26 CONV
L3 D28

INSIDE
L4 D18
L7 D12`,
      },
    ],
  },
  {
    id: 'shafts-axles-journals',
    title: 'Shafts, Axles & Journals',
    description: 'Straight shafts, stepped journals, axles, bearing seats, grooves, and rounded end samples with tool-width reliefs and chuck-side support.',
    samples: [
      {
        id: 'straight-shaft-blank',
        title: 'Straight Shaft Blank',
        description: 'Long plain cylinder for checking scale, straightness, and basic finishing.',
        meta: 'Basic',
        text: `; Straight Shaft Blank

STOCK D18
TOOL RECT R0.15 L1.5 H4
DEPTH CUT0.4 FINISH0.1
FEED MOVE220 PASS50 PART12

L36 D12
L4 D16`,
      },
      {
        id: 'shaft-with-center-relief',
        title: 'Shaft with Center Relief',
        description: 'Two larger bearing lands separated by a reduced center relief section.',
        meta: 'Basic',
        text: `; Shaft with Center Relief

STOCK D26
TOOL RECT R0.15 L1.5 H4
DEPTH CUT0.45 FINISH0.1
FEED MOVE220 PASS50 PART12

L8 D18
L12 D12
L10 D20
L4 D24`,
      },
      {
        id: 'shaft-with-parting-grooves',
        title: 'Shaft with Parting Grooves',
        description: 'Straight shaft with reachable grooves at each end for cutoff or retaining features.',
        meta: 'Basic',
        text: `; Shaft with Parting Grooves

STOCK D24
TOOL RECT R0.15 L1.5 H4
DEPTH CUT0.4 FINISH0.1
FEED MOVE220 PASS50 PART12

L5 D12
L1.5 D9
L18 D14
L1.5 D10
L6 D18
L4 D22`,
      },
      {
        id: 'two-diameter-motor-shaft',
        title: 'Two-Diameter Motor Shaft',
        description: 'Small output end, larger main shaft, and a sturdy rear shoulder.',
        meta: 'Basic',
        text: `; Two-Diameter Motor Shaft

STOCK D26
TOOL RECT R0.15 L1.5 H4
DEPTH CUT0.45 FINISH0.1
FEED MOVE220 PASS50 PART12

L14 D8
L18 D16
L5 D24`,
      },
      {
        id: 'eccentric-free-cam-blank',
        title: 'Eccentric-Free Cam Blank',
        description: 'Round cam-like axisymmetric lobed silhouette without any true eccentric offset.',
        meta: 'Curve',
        text: `; Eccentric-Free Cam Blank

STOCK D32
TOOL ROUND R1.5
DEPTH CUT0.4 FINISH0.1
FEED MOVE180 PASS36 PART9

L5 D12
L5 DS12 DE24 CONV
L6 D28
L5 DS28 DE18 CONV
L4 D30`,
      },
      {
        id: 'toy-wheel-axle',
        title: 'Toy Wheel Axle',
        description: 'Small axle with rounded end buttons for toy wheels, still fully axisymmetric.',
        meta: 'Curve, Basic',
        text: `; Toy Wheel Axle

STOCK D24
TOOL ROUND R1.5
DEPTH CUT0.4 FINISH0.1
FEED MOVE180 PASS36 PART9

L3 DS8 DE16 CONV
L18 D10
L4 D18
L3 D22`,
      },
      {
        id: 'miniature-train-axle-blank',
        title: 'Miniature Train Axle Blank',
        description: 'Central shaft with two wheel-seat lands and a chuck-side holding shoulder.',
        meta: 'Basic',
        text: `; Miniature Train Axle Blank

STOCK D28
TOOL RECT R0.15 L1.5 H4
DEPTH CUT0.45 FINISH0.1
FEED MOVE220 PASS50 PART12

L6 D10
L5 D18
L12 D12
L5 D20
L4 D26`,
      },
      {
        id: 'dual-bearing-seat',
        title: 'Dual Bearing Seat',
        description: 'Two raised bearing lands separated by a reachable center relief.',
        meta: 'Basic',
        text: `; Dual Bearing Seat

STOCK D30
TOOL RECT R0.15 L1.5 H4
DEPTH CUT0.45 FINISH0.1
FEED MOVE220 PASS50 PART12

L7 D18
L8 D12
L8 D20
L5 D26
L3 D28`,
      },
      {
        id: 'retaining-ring-groove-shaft',
        title: 'Retaining-Ring Groove Shaft',
        description: 'Shaft with multiple snap-ring-style grooves wide enough for the tool.',
        meta: 'Basic',
        text: `; Retaining-Ring Groove Shaft

STOCK D26
TOOL RECT R0.15 L1.5 H4
DEPTH CUT0.4 FINISH0.1
FEED MOVE220 PASS50 PART12

L6 D12
L1.5 D9
L8 D14
L1.5 D10
L8 D18
L4 D24`,
      },
      {
        id: 'end-capped-journal',
        title: 'End-Capped Journal',
        description: 'Rounded end journal with a smooth cap and larger rear land for a finished-looking shaft end.',
        meta: 'Curve',
        text: `; End-Capped Journal

STOCK D28
TOOL ROUND R1.5
DEPTH CUT0.4 FINISH0.1
FEED MOVE180 PASS36 PART9

L4 DS8 DE14 CONV
L14 D14
L5 D22
L4 D26`,
      },
    ],
  },
  {
    id: 'mandrels-expanding-blanks-workholding',
    title: 'Mandrels, Expanding Blanks & Workholding',
    description: 'Mandrels, arbors, workholding plugs, centers, and center accessories with practical shoulders, tapers, bores, and tool-width grooves.',
    samples: [
      {
        id: 'plain-mandrel',
        title: 'Plain Mandrel',
        description: 'Long straight holding cylinder with a larger chuck-side register.',
        meta: 'Basic',
        text: `; Plain Mandrel

STOCK D26
TOOL RECT R0.15 L1.5 H4
DEPTH CUT0.45 FINISH0.1
FEED MOVE220 PASS50 PART12

L40 D14
L6 D24`,
      },
      {
        id: 'stepped-mandrel',
        title: 'Stepped Mandrel',
        description: 'Several mounting diameters on one shaft, increasing toward the chuck side.',
        meta: 'Basic',
        text: `; Stepped Mandrel

STOCK D32
TOOL RECT R0.15 L1.5 H4
DEPTH CUT0.45 FINISH0.1
FEED MOVE220 PASS50 PART12

L10 D10
L10 D14
L10 D18
L8 D24
L4 D30`,
      },
      {
        id: 'taper-mandrel',
        title: 'Taper Mandrel',
        description: 'Long gentle taper for press-fitting rings or checking taper contact.',
        meta: 'Taper',
        text: `; Taper Mandrel

STOCK D34
TOOL ANG R0.2 L7.8 A32.5 NA55
DEPTH CUT0.5 FINISH0.1
FEED MOVE190 PASS40 PART10

L5 D10
L34 DS10 DE28
L4 D32`,
      },
      {
        id: 'ring-mandrel',
        title: 'Ring Mandrel',
        description: 'Long conical mandrel for rings or bushings, with a stout rear shoulder.',
        meta: 'Taper',
        text: `; Ring Mandrel

STOCK D38
TOOL ANG R0.2 L7.8 A32.5 NA55
DEPTH CUT0.5 FINISH0.1
FEED MOVE190 PASS40 PART10

L4 D10
L40 DS10 DE32
L5 D36`,
      },
      {
        id: 'saw-arbor-blank',
        title: 'Saw Arbor Blank',
        description: 'Shaft, flange, blade seat, and nut land as a practical arbor blank.',
        meta: 'Basic',
        text: `; Saw Arbor Blank

STOCK D36
TOOL RECT R0.15 L1.5 H4
DEPTH CUT0.45 FINISH0.1
FEED MOVE220 PASS50 PART12

L8 D12
L8 D18
L6 D30
L5 D20
L4 D34`,
      },
      {
        id: 'faceplate-stub-arbor',
        title: 'Faceplate Stub Arbor',
        description: 'Flange, pilot, and through-bore for a compact faceplate stub arbor.',
        meta: 'Inside, Basic',
        text: `; Faceplate Stub Arbor

STOCK D38 ID10
TOOL ANG R0.15 L2.2 A120 NA55
DEPTH CUT0.45 FINISH0.1
FEED MOVE190 PASS38 PART9

L6 D16
L7 D30
L5 D36

INSIDE
L18 D14`,
      },
      {
        id: 'collet-arbor-blank',
        title: 'Collet Arbor Blank',
        description: 'Taper nose and straight shank placeholder without collet slots.',
        meta: 'Taper',
        text: `; Collet Arbor Blank

STOCK D32
TOOL ANG R0.2 L7.8 A32.5 NA55
DEPTH CUT0.45 FINISH0.1
FEED MOVE190 PASS40 PART10

L8 DS8 DE18
L18 D18
L6 D28
L3 D30`,
      },
      {
        id: 'soft-jaw-button',
        title: 'Soft Jaw Button',
        description: 'Round stepped button for soft-jaw setup and repeatable clamping practice.',
        meta: 'Basic',
        text: `; Soft Jaw Button

STOCK D32
TOOL RECT R0.15 L1.5 H4
DEPTH CUT0.45 FINISH0.1
FEED MOVE220 PASS50 PART12

L4 D14
L5 D24
L5 D30
L3 D30`,
      },
      {
        id: 'expanding-plug-blank',
        title: 'Expanding Plug Blank',
        description: 'Tapered cone and matching sleeve silhouette separated by a compact tool-width gap.',
        meta: 'Taper, Batch',
        text: `; Expanding Plug Blank

STOCK D34
TOOL ANG R0.15 L3 A32.5 NA55
DEPTH CUT0.45 FINISH0.1
FEED MOVE190 PASS40 PART10

L3 D10
L12 DS10 DE24
L3
L4 D18
L10 DS18 DE28
L5 D32`,
      },
      {
        id: 'threaded-workholding-plug-placeholder',
        title: 'Threaded Workholding Plug Placeholder',
        description: 'Round workholding plug with reachable fake thread grooves and rear shoulder.',
        meta: 'Basic',
        text: `; Threaded Workholding Plug Placeholder

STOCK D30
TOOL RECT R0.15 L1.5 H4
DEPTH CUT0.4 FINISH0.1
FEED MOVE220 PASS50 PART12

L2 D12
L1.5 D16
L1.5 D12
L1.5 D16
L1.5 D12
L8 D18
L5 D26
L3 D28`,
      },
      {
        id: 'dead-center-blank',
        title: 'Dead Center Blank',
        description: 'Sixty-degree-style point, body, and tail shank represented as lathe-friendly tapers.',
        meta: 'Taper',
        text: `; Dead Center Blank

STOCK D34
TOOL ANG R0.2 L7.8 A32.5 NA55
DEPTH CUT0.45 FINISH0.1
FEED MOVE190 PASS40 PART10

L7 DS2 DE18
L10 D20
L8 DS20 DE30
L4 D32`,
      },
      {
        id: 'center-adapter-sleeve',
        title: 'Center Adapter Sleeve',
        description: 'Tapered outside and bored inside for a center adapter sleeve sketch.',
        meta: 'Inside, Taper',
        text: `; Center Adapter Sleeve

STOCK D40 ID12
TOOL ANG R0.15 L2.2 A120 NA55
DEPTH CUT0.45 FINISH0.1
FEED MOVE190 PASS38 PART9

L4 D18
L22 DS18 DE34
L5 D38

INSIDE
L5 D14
L21 DS14 DE24
L5 D24`,
      },
      {
        id: 'mini-center-set',
        title: 'Mini Center Set',
        description: 'Thirty-, forty-five-, sixty-, and ninety-degree-style point examples in one batch.',
        meta: 'Batch, Taper',
        text: `; Mini Center Set

STOCK D34
TOOL ANG R0.15 L3 A32.5 NA55
DEPTH CUT0.45 FINISH0.1
FEED MOVE190 PASS40 PART10

L4 DS2 DE14
L3
L4 DS3 DE18
L3
L4 DS4 DE22
L3
L4 DS5 DE28
L5 D32`,
      },
    ],
  },
  {
    id: 'bushings-bearings-spacers-practical-set',
    title: 'Bushings, Bearings & Spacers - Practical Set',
    description: 'Practical spacers, bushings, rollers, and seal-seat blanks with through-bores, shoulders, grooves, tapers, and repeatable tool-width details.',
    samples: [
      {
        id: 'inner-race-spacer',
        title: 'Inner Race Spacer',
        description: 'Long narrow spacer tube with a through-bore and a thicker chuck-side grip land.',
        meta: 'Inside',
        text: `; Inner Race Spacer

STOCK D24 ID10
TOOL ANG R0.15 L2.2 A120 NA55
DEPTH CUT0.45 FINISH0.1
FEED MOVE190 PASS38 PART9

L24 D18
L3 D22

INSIDE
L27 D12`,
      },
      {
        id: 'stepped-bearing-spacer',
        title: 'Stepped Bearing Spacer',
        description: 'Two bearing-seat diameters on the outside with one continuous through-bore.',
        meta: 'Inside, Basic',
        text: `; Stepped Bearing Spacer

STOCK D32 ID12
TOOL ANG R0.15 L2.2 A120 NA55
DEPTH CUT0.45 FINISH0.1
FEED MOVE190 PASS38 PART9

L10 D22
L8 D26
L4 D30

INSIDE
L22 D16`,
      },
      {
        id: 'preload-spacer-pair',
        title: 'Preload Spacer Pair',
        description: 'Two matched thin bearing spacers separated by a tool-width parting slot.',
        meta: 'Batch, Inside',
        text: `; Preload Spacer Pair

STOCK D30 ID12
TOOL ANG R0.15 L2.2 A120 NA55
DEPTH CUT0.4 FINISH0.1
FEED MOVE190 PASS38 PART9

L3 D24
L2.2
L3 D24
L4 D28

INSIDE
L12.2 D16`,
      },
      {
        id: 'bearing-stack-kit',
        title: 'Bearing Stack Kit',
        description: 'Several spacer lengths with the same bore and OD for stack-height experiments.',
        meta: 'Batch, Inside',
        text: `; Bearing Stack Kit

STOCK D30 ID12
TOOL ANG R0.15 L2.2 A120 NA55
DEPTH CUT0.4 FINISH0.1
FEED MOVE190 PASS38 PART9

L3 D22
L2.2
L5 D22
L2.2
L7 D22
L4 D28

INSIDE
L23.4 D16`,
      },
      {
        id: 'press-fit-bushing',
        title: 'Press-Fit Bushing',
        description: 'Slight lead-in taper, straight press body, and central bore for a simple bushing blank.',
        meta: 'Inside, Taper',
        text: `; Press-Fit Bushing

STOCK D30 ID10
TOOL ANG R0.15 L2.2 A120 NA55
DEPTH CUT0.45 FINISH0.1
FEED MOVE190 PASS38 PART9

L3 DS18 DE22
L14 D24
L4 D28

INSIDE
L21 D14`,
      },
      {
        id: 'oilite-style-bushing-blank',
        title: 'Oilite-Style Bushing Blank',
        description: 'Rounded sleeve silhouette with a through-bore and stocky chuck-side shoulder.',
        meta: 'Inside, Curve',
        text: `; Oilite-Style Bushing Blank

STOCK D30 ID10
TOOL ANG R0.15 L2.2 A120 NA55
DEPTH CUT0.4 FINISH0.1
FEED MOVE180 PASS36 PART9

L3 D16
L4 DS16 DE24 CONV
L9 D24
L4 DS24 DE20 CONV
L3 D28

INSIDE
L23 D14`,
      },
      {
        id: 'v-groove-roller',
        title: 'V-Groove Roller',
        description: 'Bored roller with a broad V groove wide enough for the angled tool to clear.',
        meta: 'Inside, Taper',
        text: `; V-Groove Roller

STOCK D36 ID12
TOOL ANG R0.15 L2.2 A120 NA55
DEPTH CUT0.45 FINISH0.1
FEED MOVE190 PASS38 PART9

L5 D30
L4 DS30 DE20
L4 D20
L4 DS20 DE30
L5 D34

INSIDE
L22 D16`,
      },
      {
        id: 'cable-roller',
        title: 'Cable Roller',
        description: 'Wide center groove for cord or cable guidance, with a through-bore for an axle.',
        meta: 'Inside, Curve',
        text: `; Cable Roller

STOCK D36 ID12
TOOL ANG R0.15 L2.2 A120 NA55
DEPTH CUT0.45 FINISH0.1
FEED MOVE190 PASS38 PART9

L5 D32
L4 DS32 DE22
L6 D22
L4 DS22 DE32
L5 D34

INSIDE
L24 D16`,
      },
      {
        id: 'o-ring-groove-shaft',
        title: 'O-Ring Groove Shaft',
        description: 'Straight shaft with one reachable seal groove and a larger rear drive shoulder.',
        meta: 'Basic',
        text: `; O-Ring Groove Shaft

STOCK D28
TOOL RECT R0.15 L1.5 H4
DEPTH CUT0.4 FINISH0.1
FEED MOVE220 PASS50 PART12

L10 D18
L1.5 D12
L8 D20
L4 D26`,
      },
      {
        id: 'seal-driver-cup',
        title: 'Seal Driver Cup',
        description: 'Hollow cup-shaped driver with a broad pushing face and relieved internal bore.',
        meta: 'Inside, Basic',
        text: `; Seal Driver Cup

STOCK D38 ID14
TOOL ANG R0.15 L2.2 A120 NA55
DEPTH CUT0.45 FINISH0.1
FEED MOVE190 PASS38 PART9

L6 D30
L8 D34
L4 D36

INSIDE
L10 D22
L8 D16`,
      },
      {
        id: 'labyrinth-seal-demo',
        title: 'Labyrinth Seal Demo',
        description: 'Nested outside and inside steps showing the idea of a simple labyrinth path.',
        meta: 'Inside, Basic',
        text: `; Labyrinth Seal Demo

STOCK D36 ID12
TOOL ANG R0.15 L2.2 A120 NA55
DEPTH CUT0.45 FINISH0.1
FEED MOVE190 PASS38 PART9

L5 D26
L5 D30
L5 D28
L4 D34

INSIDE
L5 D16
L5 D22
L5 D18
L4 D24`,
      },
    ],
  },
  {
    id: 'plumbing-fluid-nozzle-shapes',
    title: 'Plumbing, Fluid & Nozzle Shapes',
    description: 'Hose-barb blanks, nozzles, caps, ferrules, and tube fittings with practical tapers, bores, grooves, and chuck-side holding mass.',
    samples: [
      {
        id: 'single-hose-barb-blank',
        title: 'Single Hose Barb Blank',
        description: 'One cone barb, neck, and stop flange for a simple hose fitting blank.',
        meta: 'Taper, Basic',
        text: `; Single Hose Barb Blank

STOCK D32
TOOL ANG R0.2 L7.8 A32.5 NA55
DEPTH CUT0.45 FINISH0.1
FEED MOVE190 PASS40 PART10

L4 D12
L6 DS12 DE22
L3 D18
L4 D28
L3 D30`,
      },
      {
        id: 'double-hose-barb-blank',
        title: 'Double Hose Barb Blank',
        description: 'Two barb forms with a center stop and a heavier chuck-side land.',
        meta: 'Taper, Basic',
        text: `; Double Hose Barb Blank

STOCK D34
TOOL ANG R0.15 L3 A32.5 NA55
DEPTH CUT0.45 FINISH0.1
FEED MOVE190 PASS40 PART10

L3 D14
L5 DS14 DE24
L3 D18
L4 D30
L3 D18
L5 DS18 DE26
L3 D32`,
      },
      {
        id: 'reducing-hose-nipple',
        title: 'Reducing Hose Nipple',
        description: 'Tapered outside and stepped internal bore for adapting between hose sizes.',
        meta: 'Inside, Taper',
        text: `; Reducing Hose Nipple

STOCK D34 ID10
TOOL ANG R0.15 L2.2 A120 NA55
DEPTH CUT0.45 FINISH0.1
FEED MOVE190 PASS38 PART9

L5 D16
L10 DS16 DE26
L5 D30

INSIDE
L6 D12
L8 DS12 DE18
L6 D18`,
      },
      {
        id: 'beaded-tube-end',
        title: 'Beaded Tube End',
        description: 'Tube end with a raised bead and rear flange for hose-retention practice.',
        meta: 'Inside, Basic',
        text: `; Beaded Tube End

STOCK D32 ID10
TOOL ANG R0.15 L2.2 A120 NA55
DEPTH CUT0.45 FINISH0.1
FEED MOVE190 PASS38 PART9

L5 D20
L3 D28
L10 D20
L4 D30

INSIDE
L22 D14`,
      },
      {
        id: 'hose-barb-pitch-sampler',
        title: 'Hose Barb Pitch Sampler',
        description: 'Three short barb tapers separated by tool-width slots for comparing barb pitch.',
        meta: 'Batch, Taper',
        text: `; Hose Barb Pitch Sampler

STOCK D34
TOOL ANG R0.15 L3 A32.5 NA55
DEPTH CUT0.45 FINISH0.1
FEED MOVE190 PASS40 PART10

L3 D12
L4 DS12 DE20
L3
L3 D14
L5 DS14 DE24
L3
L3 D16
L6 DS16 DE28
L4 D32`,
      },
      {
        id: 'converging-nozzle',
        title: 'Converging Nozzle',
        description: 'Outer body and internal taper narrowing toward the outlet.',
        meta: 'Inside, Taper',
        text: `; Converging Nozzle

STOCK D36 ID10
TOOL ANG R0.15 L2.2 A120 NA55
DEPTH CUT0.45 FINISH0.1
FEED MOVE190 PASS38 PART9

L5 D18
L12 DS18 DE30
L5 D34

INSIDE
L5 D12
L12 DS12 DE20
L5 D20`,
      },
      {
        id: 'rocket-nozzle-demo',
        title: 'Rocket Nozzle Demo',
        description: 'A visible converging throat and diverging exit inside a tapered nozzle body.',
        meta: 'Inside, Taper',
        text: `; Rocket Nozzle Demo

STOCK D40 ID10
TOOL ANG R0.15 L2.2 A120 NA55
DEPTH CUT0.5 FINISH0.1
FEED MOVE190 PASS38 PART9

L4 D24
L8 DS24 DE34
L8 D34
L4 D38

INSIDE
L5 D16
L5 DS16 DE12
L6 DS12 DE22
L8 D22`,
      },
      {
        id: 'spray-nozzle-blank',
        title: 'Spray Nozzle Blank',
        description: 'Rounded nozzle body with a smaller outlet and larger rear bore.',
        meta: 'Inside, Curve',
        text: `; Spray Nozzle Blank

STOCK D34 ID10
TOOL ANG R0.15 L2.2 A120 NA55
DEPTH CUT0.4 FINISH0.1
FEED MOVE180 PASS36 PART9

L3 D14
L5 DS14 DE28 CONV
L8 D30
L4 D32

INSIDE
L6 D12
L6 DS12 DE18
L8 D18`,
      },
      {
        id: 'funnel-adapter',
        title: 'Funnel Adapter',
        description: 'Wide-mouth adapter with matching inside and outside tapers.',
        meta: 'Inside, Taper',
        text: `; Funnel Adapter

STOCK D40 ID10
TOOL ANG R0.15 L2.2 A120 NA55
DEPTH CUT0.5 FINISH0.1
FEED MOVE190 PASS38 PART9

L4 D18
L16 DS18 DE34
L4 D38

INSIDE
L4 D12
L16 DS12 DE24
L4 D24`,
      },
      {
        id: 'pipe-plug-blank',
        title: 'Pipe Plug Blank',
        description: 'Tapered plug body with broad thread-like lands and a rear head.',
        meta: 'Taper, Basic',
        text: `; Pipe Plug Blank

STOCK D30
TOOL ANG R0.15 L3 A32.5 NA55
DEPTH CUT0.45 FINISH0.1
FEED MOVE190 PASS40 PART10

L3 D12
L3 D15
L3 D13
L3 D17
L3 D15
L5 DS18 DE24
L4 D28`,
      },
      {
        id: 'blank-off-button',
        title: 'Blank-Off Button',
        description: 'Domed button plug with a short stem and larger chuck-side base.',
        meta: 'Curve, Basic',
        text: `; Blank-Off Button

STOCK D30
TOOL ROUND R1.5
DEPTH CUT0.4 FINISH0.1
FEED MOVE180 PASS36 PART9

L4 D12
L5 DS12 DE26 CONV
L4 D28
L3 D28`,
      },
      {
        id: 'compression-ferrule',
        title: 'Compression Ferrule',
        description: 'Small double-cone ferrule with a continuous through-bore.',
        meta: 'Inside, Taper',
        text: `; Compression Ferrule

STOCK D28 ID10
TOOL ANG R0.15 L2.2 A120 NA55
DEPTH CUT0.4 FINISH0.1
FEED MOVE190 PASS38 PART9

L4 DS14 DE22
L4 DS22 DE16
L4 DS16 DE24
L3 D26

INSIDE
L15 D12`,
      },
      {
        id: 'olive-ferrule',
        title: 'Olive Ferrule',
        description: 'Rounded barrel ferrule with a small bore through the center.',
        meta: 'Inside, Curve',
        text: `; Olive Ferrule

STOCK D30 ID10
TOOL ANG R0.15 L2.2 A120 NA55
DEPTH CUT0.4 FINISH0.1
FEED MOVE180 PASS36 PART9

L3 D16
L5 DS16 DE26 CONV
L5 DS26 DE18 CONV
L3 D28

INSIDE
L16 D12`,
      },
      {
        id: 'flared-tube-seat',
        title: 'Flared Tube Seat',
        description: 'Outer sleeve with a flared internal cone seat.',
        meta: 'Inside, Taper',
        text: `; Flared Tube Seat

STOCK D32 ID10
TOOL ANG R0.15 L2.2 A120 NA55
DEPTH CUT0.45 FINISH0.1
FEED MOVE190 PASS38 PART9

L8 D24
L8 DS24 DE28
L4 D30

INSIDE
L8 D16
L8 DS16 DE24
L4 D24`,
      },
      {
        id: 'cone-washer-pair',
        title: 'Cone Washer Pair',
        description: 'Male and female cone washer blanks separated by a tool-width parting slot.',
        meta: 'Batch, Inside, Taper',
        text: `; Cone Washer Pair

STOCK D34 ID10
TOOL ANG R0.15 L2.2 A120 NA55
DEPTH CUT0.4 FINISH0.1
FEED MOVE190 PASS38 PART9

L3 D16
L4 DS16 DE24
L2.2
L4 DS18 DE28
L5 D30

INSIDE
L7 D12
L2.2 D12
L4 DS12 DE18
L5 D18`,
      },
    ],
  },
  {
    id: 'measurement-gauges-calibration',
    title: 'Measurement, Gauges & Calibration',
    description: 'Gauge blanks and calibration shapes for diameters, tapers, bores, wall thickness, finish comparison, and repeatable machine test pieces.',
    samples: [
      {
        id: 'diameter-step-gauge',
        title: 'Diameter Step Gauge',
        description: 'Known-diameter ladder with steps increasing toward the chuck side.',
        meta: 'Basic',
        text: `; Diameter Step Gauge

STOCK D28
TOOL RECT R0.15 L1.5 H4
DEPTH CUT0.4 FINISH0.1
FEED MOVE220 PASS50 PART12

L5 D6
L5 D8
L5 D10
L5 D12
L5 D16
L4 D24`,
      },
      {
        id: 'go-no-go-plug-gauge',
        title: 'Go/No-Go Plug Gauge',
        description: 'Two close plug diameters on one handle for fit-check demonstrations.',
        meta: 'Basic',
        text: `; Go/No-Go Plug Gauge

STOCK D28
TOOL RECT R0.15 L1.5 H4
DEPTH CUT0.35 FINISH0.1
FEED MOVE220 PASS48 PART12

L8 D10
L8 D11
L6 D18
L4 D24`,
      },
      {
        id: 'go-no-go-ring-gauge',
        title: 'Go/No-Go Ring Gauge',
        description: 'Two ring-gauge blanks with slightly different bores and a tool-width gap.',
        meta: 'Batch, Inside',
        text: `; Go/No-Go Ring Gauge

STOCK D34 ID10
TOOL ANG R0.15 L2.2 A120 NA55
DEPTH CUT0.4 FINISH0.1
FEED MOVE190 PASS38 PART9

L6 D28
L2.2
L6 D30
L4 D32

INSIDE
L6 D14
L2.2 D14
L6 D16
L4 D16`,
      },
      {
        id: 'morse-taper-plug-gauge',
        title: 'Morse Taper Plug Gauge',
        description: 'External taper plug with a chuck-side shoulder for contact checks.',
        meta: 'Taper',
        text: `; Morse Taper Plug Gauge

STOCK D34
TOOL ANG R0.2 L7.8 A32.5 NA55
DEPTH CUT0.45 FINISH0.1
FEED MOVE190 PASS40 PART10

L4 D10
L28 DS10 DE24
L5 D32`,
      },
      {
        id: 'morse-taper-ring-gauge',
        title: 'Morse Taper Ring Gauge',
        description: 'Short ring gauge blank with a gentle internal taper.',
        meta: 'Inside, Taper',
        text: `; Morse Taper Ring Gauge

STOCK D34 ID12
TOOL ANG R0.15 L2.2 A120 NA55
DEPTH CUT0.45 FINISH0.1
FEED MOVE190 PASS38 PART9

L4 D24
L20 D28
L4 D32

INSIDE
L4 D14
L20 DS14 DE20
L4 D20`,
      },
      {
        id: 'sixty-degree-cone-gauge',
        title: '60-Degree Cone Gauge',
        description: 'Simple cone reference with a rear holding shoulder.',
        meta: 'Taper',
        text: `; 60-Degree Cone Gauge

STOCK D36
TOOL ANG R0.2 L7.8 A32.5 NA55
DEPTH CUT0.45 FINISH0.1
FEED MOVE190 PASS40 PART10

L14 DS2 DE28
L5 D34`,
      },
      {
        id: 'pipe-taper-visual-gauge',
        title: 'Pipe-Taper Visual Gauge',
        description: 'Short tapered plug with broad thread-like lands for visual pipe-taper checks.',
        meta: 'Taper, Basic',
        text: `; Pipe-Taper Visual Gauge

STOCK D32
TOOL ANG R0.15 L3 A32.5 NA55
DEPTH CUT0.45 FINISH0.1
FEED MOVE190 PASS40 PART10

L3 D12
L3 D15
L3 D13
L3 D17
L3 D15
L6 DS18 DE26
L4 D30`,
      },
      {
        id: 'chamfer-angle-sampler',
        title: 'Chamfer Angle Sampler',
        description: 'Several short chamfer cones in one batch, each separated by a tool-width slot.',
        meta: 'Batch, Taper',
        text: `; Chamfer Angle Sampler

STOCK D34
TOOL ANG R0.15 L3 A32.5 NA55
DEPTH CUT0.4 FINISH0.1
FEED MOVE190 PASS40 PART10

L3 DS4 DE14
L3
L4 DS5 DE18
L3
L5 DS6 DE22
L3
L6 DS8 DE28
L5 D32`,
      },
      {
        id: 'matched-taper-fit-demo',
        title: 'Matched Taper Fit Demo',
        description: 'External taper plug and matching tapered socket blank in one stock length.',
        meta: 'Batch, Inside, Taper',
        text: `; Matched Taper Fit Demo

STOCK D34 ID10
TOOL ANG R0.15 L2.2 A120 NA55
DEPTH CUT0.45 FINISH0.1
FEED MOVE190 PASS38 PART9

L8 DS10 DE20
L2.2
L8 D28
L4 D32

INSIDE
L8 D12
L2.2 D12
L8 DS14 DE22
L4 D22`,
      },
      {
        id: 'thin-wall-tube-demo',
        title: 'Thin-Wall Tube Demo',
        description: 'Constant-wall sleeve with a small chuck-side allowance for checking wall thickness.',
        meta: 'Inside',
        text: `; Thin-Wall Tube Demo

STOCK D24 ID14
TOOL ANG R0.15 L2.2 A120 NA55
DEPTH CUT0.3 FINISH0.1
FEED MOVE190 PASS34 PART8

L22 D20
L4 D22

INSIDE
L26 D16`,
      },
      {
        id: 'counterbore-depth-demo',
        title: 'Counterbore Depth Demo',
        description: 'Stepped internal bores that make counterbore depth visible in the cross-section.',
        meta: 'Inside',
        text: `; Counterbore Depth Demo

STOCK D34 ID10
TOOL ANG R0.15 L2.2 A120 NA55
DEPTH CUT0.4 FINISH0.1
FEED MOVE190 PASS38 PART9

L8 D24
L8 D28
L4 D32

INSIDE
L8 D14
L6 D20
L6 D24`,
      },
      {
        id: 'internal-chamfer-demo',
        title: 'Internal Chamfer Demo',
        description: 'Bore with a clear entry chamfer and rear shoulder.',
        meta: 'Inside, Taper',
        text: `; Internal Chamfer Demo

STOCK D32 ID10
TOOL ANG R0.15 L2.2 A120 NA55
DEPTH CUT0.4 FINISH0.1
FEED MOVE190 PASS38 PART9

L12 D22
L4 D28
L3 D30

INSIDE
L5 DS12 DE18
L10 D18
L4 D18`,
      },
      {
        id: 'bore-relief-demo',
        title: 'Bore Relief Demo',
        description: 'Internal relief pocket with straight entry and exit bores.',
        meta: 'Inside',
        text: `; Bore Relief Demo

STOCK D34 ID10
TOOL ANG R0.15 L2.2 A120 NA55
DEPTH CUT0.4 FINISH0.1
FEED MOVE190 PASS38 PART9

L8 D24
L8 D28
L4 D32

INSIDE
L6 D14
L5 D22
L9 D14`,
      },
      {
        id: 'sectioned-nozzle-profile',
        title: 'Sectioned Nozzle Profile',
        description: 'Nozzle-style internal profile with visible bore changes for preview inspection.',
        meta: 'Inside, Taper',
        text: `; Sectioned Nozzle Profile

STOCK D38 ID10
TOOL ANG R0.15 L2.2 A120 NA55
DEPTH CUT0.45 FINISH0.1
FEED MOVE190 PASS38 PART9

L4 D18
L10 DS18 DE30
L8 D34
L4 D36

INSIDE
L4 D12
L6 DS12 DE18
L6 DS18 DE14
L10 D22`,
      },
      {
        id: 'facing-test-puck',
        title: 'Facing Test Puck',
        description: 'Short puck with a larger chuck-side land for facing and diameter checks.',
        meta: 'Basic',
        text: `; Facing Test Puck

STOCK D34
TOOL RECT R0.15 L1.5 H4
DEPTH CUT0.45 FINISH0.1
FEED MOVE220 PASS50 PART12

L4 D28
L6 D32`,
      },
      {
        id: 'turning-test-bar',
        title: 'Turning Test Bar',
        description: 'Long straight bar with a rear shoulder for straightness and finish checks.',
        meta: 'Basic',
        text: `; Turning Test Bar

STOCK D28
TOOL RECT R0.15 L1.5 H4
DEPTH CUT0.45 FINISH0.1
FEED MOVE220 PASS50 PART12

L40 D18
L5 D26`,
      },
      {
        id: 'taper-test-bar',
        title: 'Taper Test Bar',
        description: 'Long shallow taper with a rear reference shoulder.',
        meta: 'Taper',
        text: `; Taper Test Bar

STOCK D32
TOOL ANG R0.2 L7.8 A32.5 NA55
DEPTH CUT0.45 FINISH0.1
FEED MOVE190 PASS40 PART10

L4 D12
L36 DS12 DE24
L5 D30`,
      },
      {
        id: 'radius-test-button',
        title: 'Radius Test Button',
        description: 'Several convex radius transitions on one button-like test shape.',
        meta: 'Curve',
        text: `; Radius Test Button

STOCK D30
TOOL ROUND R1.5
DEPTH CUT0.4 FINISH0.1
FEED MOVE180 PASS36 PART9

L4 D12
L5 DS12 DE24 CONV
L4 DS24 DE18 CONV
L4 D28`,
      },
      {
        id: 'groove-width-test',
        title: 'Groove Width Test',
        description: 'Multiple reachable groove widths for checking parting and groove behavior.',
        meta: 'Basic',
        text: `; Groove Width Test

STOCK D30
TOOL RECT R0.15 L1.5 H4
DEPTH CUT0.4 FINISH0.1
FEED MOVE220 PASS50 PART12

L5 D20
L1.5 D12
L5 D20
L2 D14
L5 D22
L3 D16
L5 D26`,
      },
      {
        id: 'parting-test-rod',
        title: 'Parting Test Rod',
        description: 'Repeated cutoff sections, each separated by a tool-width parting slot.',
        meta: 'Batch, Basic',
        text: `; Parting Test Rod

STOCK D30
TOOL RECT R0.15 L1.5 H4
DEPTH CUT0.4 FINISH0.1
FEED MOVE220 PASS50 PART12

L5 D14
L1.5
L5 D16
L1.5
L5 D18
L1.5
L5 D22
L4 D26`,
      },
      {
        id: 'finish-comparator-rod',
        title: 'Finish Comparator Rod',
        description: 'Several lands separated by grooves for comparing finishing settings.',
        meta: 'Basic',
        text: `; Finish Comparator Rod

STOCK D30
TOOL RECT R0.15 L1.5 H4
DEPTH CUT0.4 FINISH0.1
FEED MOVE220 PASS50 PART12

L6 D14
L1.5 D10
L6 D16
L1.5 D12
L6 D18
L1.5 D14
L6 D24`,
      },
    ],
  },
  {
    id: 'pulleys-wheels-rotating-blanks',
    title: 'Pulleys, Wheels & Rotating Blanks',
    description: 'Pulley, wheel, roller, spool, and reel blanks with realistic bores, flanges, crowns, tapers, and groove widths suitable for the selected tool.',
    samples: [
      {
        id: 'flat-belt-pulley-blank',
        title: 'Flat Belt Pulley Blank',
        description: 'Crowned belt face with a central through-bore and a larger chuck-side holding land.',
        meta: 'Inside, Curve',
        text: `; Flat Belt Pulley Blank

STOCK D38 ID12
TOOL ANG R0.15 L2.2 A120 NA55
DEPTH CUT0.45 FINISH0.1
FEED MOVE180 PASS36 PART9

L4 D28
L6 DS28 DE34 CONV
L6 DS34 DE30 CONV
L4 D36

INSIDE
L20 D16`,
      },
      {
        id: 'v-belt-pulley-blank',
        title: 'V-Belt Pulley Blank',
        description: 'Pulley blank with broad angled belt groove and raised flanges.',
        meta: 'Inside, Taper',
        text: `; V-Belt Pulley Blank

STOCK D40 ID12
TOOL ANG R0.15 L2.2 A120 NA55
DEPTH CUT0.45 FINISH0.1
FEED MOVE190 PASS38 PART9

L4 D34
L5 DS34 DE22
L4 D22
L5 DS22 DE34
L4 D36

INSIDE
L22 D16`,
      },
      {
        id: 'round-belt-pulley',
        title: 'Round-Belt Pulley',
        description: 'Rounded belt groove cut with a small round form tool and a through-bore.',
        meta: 'Inside, Curve',
        text: `; Round-Belt Pulley

STOCK D40 ID12
TOOL ROUND R1.5
DEPTH CUT0.4 FINISH0.1
FEED MOVE180 PASS36 PART9

L4 D34
L6 DS34 DE22 CONC
L4 D22
L6 DS22 DE34 CONC
L4 D36

INSIDE
L24 D16`,
      },
      {
        id: 'mini-pulley-set',
        title: 'Mini Pulley Set',
        description: 'Three small pulley blanks with matching bores and tool-width parting slots.',
        meta: 'Batch, Inside',
        text: `; Mini Pulley Set

STOCK D36 ID10
TOOL ANG R0.15 L2.2 A120 NA55
DEPTH CUT0.4 FINISH0.1
FEED MOVE190 PASS38 PART9

L4 D22
L2.2
L4 D26
L2.2
L4 D30
L4 D34

INSIDE
L4 D14
L2.2 D14
L4 D16
L2.2 D16
L4 D18
L4 D18`,
      },
      {
        id: 'toy-wheel-blank',
        title: 'Toy Wheel Blank',
        description: 'Rounded tire-like outside profile with a simple hub bore.',
        meta: 'Inside, Curve',
        text: `; Toy Wheel Blank

STOCK D38 ID10
TOOL ANG R0.15 L2.2 A120 NA55
DEPTH CUT0.4 FINISH0.1
FEED MOVE180 PASS36 PART9

L3 D24
L5 DS24 DE34 CONV
L5 DS34 DE26 CONV
L4 D36

INSIDE
L17 D14`,
      },
      {
        id: 'model-train-wheel-blank',
        title: 'Model Train Wheel Blank',
        description: 'Train-wheel-style flange, tapered tread, hub, and bore in a round-only blank.',
        meta: 'Inside, Taper',
        text: `; Model Train Wheel Blank

STOCK D38 ID10
TOOL ANG R0.15 L2.2 A120 NA55
DEPTH CUT0.45 FINISH0.1
FEED MOVE190 PASS38 PART9

L3 D32
L8 DS30 DE24
L4 D26
L4 D36

INSIDE
L19 D14`,
      },
      {
        id: 'flywheel-blank',
        title: 'Flywheel Blank',
        description: 'Heavy rim, thinner web impression, central hub, and through-bore.',
        meta: 'Inside, Basic',
        text: `; Flywheel Blank

STOCK D38 ID10
TOOL ANG R0.15 L2.2 A120 NA55
DEPTH CUT0.45 FINISH0.1
FEED MOVE190 PASS38 PART9

L4 D34
L8 D22
L4 D28
L4 D36

INSIDE
L20 D14`,
      },
      {
        id: 'handwheel-blank-round-only',
        title: 'Handwheel Blank, Round Only',
        description: 'Round handwheel outline with raised rim and hub but no spokes.',
        meta: 'Inside, Basic',
        text: `; Handwheel Blank, Round Only

STOCK D40 ID12
TOOL ANG R0.15 L2.2 A120 NA55
DEPTH CUT0.45 FINISH0.1
FEED MOVE190 PASS38 PART9

L4 D34
L8 D24
L4 D30
L4 D38

INSIDE
L20 D16`,
      },
      {
        id: 'wire-spool',
        title: 'Wire Spool',
        description: 'Two-flange wire spool blank with a narrow center waist and bore.',
        meta: 'Inside, Basic',
        text: `; Wire Spool

STOCK D38 ID10
TOOL ANG R0.15 L2.2 A120 NA55
DEPTH CUT0.45 FINISH0.1
FEED MOVE190 PASS38 PART9

L4 D34
L14 D22
L4 D36
L3 D36

INSIDE
L25 D14`,
      },
      {
        id: 'cable-drum',
        title: 'Cable Drum',
        description: 'Large flanged drum with a rounded winding valley and central bore.',
        meta: 'Inside, Curve',
        text: `; Cable Drum

STOCK D44 ID12
TOOL ROUND R1.5
DEPTH CUT0.45 FINISH0.1
FEED MOVE180 PASS36 PART9

L5 D40
L6 DS40 DE26 CONC
L6 D26
L6 DS26 DE40 CONC
L5 D42

INSIDE
L28 D16`,
      },
      {
        id: 'fishing-reel-spool-blank',
        title: 'Fishing-Reel Spool Blank',
        description: 'Tapered spool body between flanges with a clean center bore.',
        meta: 'Inside, Taper',
        text: `; Fishing-Reel Spool Blank

STOCK D42 ID12
TOOL ANG R0.15 L2.2 A120 NA55
DEPTH CUT0.45 FINISH0.1
FEED MOVE190 PASS38 PART9

L4 D36
L6 DS36 DE24
L8 D24
L6 DS24 DE38
L4 D40

INSIDE
L28 D16`,
      },
      {
        id: 'miniature-winch-drum',
        title: 'Miniature Winch Drum',
        description: 'Grooved winch drum with flanges, through-bore, and tool-width winding grooves.',
        meta: 'Inside, Basic',
        text: `; Miniature Winch Drum

STOCK D38 ID10
TOOL ANG R0.15 L2.2 A120 NA55
DEPTH CUT0.4 FINISH0.1
FEED MOVE190 PASS38 PART9

L4 D34
L5 D24
L2.2 D20
L5 D24
L2.2 D20
L5 D24
L4 D36

INSIDE
L27.4 D14`,
      },
    ],
  },
  {
    id: 'handles-knobs-control-parts',
    title: 'Handles, Knobs & Control Parts',
    description: 'Knobs, handles, ferrules, caps, and end pieces with rounded profiles, practical shoulders, bores, and batch standoffs.',
    samples: [
      {
        id: 'mushroom-knob',
        title: 'Mushroom Knob',
        description: 'Short neck, rounded head, and a chuck-side base for a small control knob.',
        meta: 'Curve',
        text: `; Mushroom Knob

STOCK D34
TOOL ROUND R1.5
DEPTH CUT0.4 FINISH0.1
FEED MOVE180 PASS36 PART9

L5 D10
L4 DS10 DE24 CONV
L4 D28
L4 DS28 DE20 CONV
L3 D30`,
      },
      {
        id: 'ball-knob',
        title: 'Ball Knob',
        description: 'Ball-like knob on a short stem with extra chuck-side holding stock.',
        meta: 'Curve',
        text: `; Ball Knob

STOCK D36
TOOL ROUND R1.5
DEPTH CUT0.4 FINISH0.1
FEED MOVE180 PASS36 PART9

L4 D8
L6 DS8 DE30 CONV
L6 DS30 DE12 CONV
L4 D34`,
      },
      {
        id: 'tapered-control-knob',
        title: 'Tapered Control Knob',
        description: 'Conical control knob blank with a flat nose and rear shoulder.',
        meta: 'Taper, Basic',
        text: `; Tapered Control Knob

STOCK D36
TOOL ANG R0.2 L7.8 A32.5 NA55
DEPTH CUT0.45 FINISH0.1
FEED MOVE190 PASS40 PART10

L4 D16
L14 DS16 DE30
L4 D34`,
      },
      {
        id: 'pointerless-dial-knob',
        title: 'Pointerless Dial Knob',
        description: 'Round dial blank with a raised rim and no pointer detail.',
        meta: 'Basic',
        text: `; Pointerless Dial Knob

STOCK D38
TOOL RECT R0.15 L1.5 H4
DEPTH CUT0.45 FINISH0.1
FEED MOVE220 PASS50 PART12

L3 D30
L8 D24
L3 D34
L4 D36`,
      },
      {
        id: 'thumb-nut-blank',
        title: 'Thumb Nut Blank',
        description: 'Large round thumb nut blank with a central bore and raised outer faces.',
        meta: 'Inside, Basic',
        text: `; Thumb Nut Blank

STOCK D40 ID12
TOOL ANG R0.15 L2.2 A120 NA55
DEPTH CUT0.45 FINISH0.1
FEED MOVE190 PASS38 PART9

L4 D36
L6 D28
L4 D36
L4 D38

INSIDE
L18 D16`,
      },
      {
        id: 'decorative-bead-knob',
        title: 'Decorative Bead Knob',
        description: 'Ornamental bead-and-cove knob profile cut with a small round form tool.',
        meta: 'Curve',
        text: `; Decorative Bead Knob

STOCK D34
TOOL ROUND R1.5
DEPTH CUT0.4 FINISH0.1
FEED MOVE180 PASS36 PART9

L3 D10
L4 DS10 DE24 CONV
L3 DS24 DE16 CONC
L4 DS16 DE28 CONV
L3 D32`,
      },
      {
        id: 'file-handle-blank',
        title: 'File Handle Blank',
        description: 'Tapered handle body with a smaller front ferrule seat and softened rear end.',
        meta: 'Taper, Curve',
        text: `; File Handle Blank

STOCK D36
TOOL ROUND R1.5
DEPTH CUT0.45 FINISH0.1
FEED MOVE180 PASS36 PART9

L4 D12
L20 DS12 DE30
L5 DS30 DE24 CONV
L4 D34`,
      },
      {
        id: 'tool-handle-ferrule',
        title: 'Tool Handle Ferrule',
        description: 'Short metal ferrule with tapered outside and tapered bore.',
        meta: 'Inside, Taper',
        text: `; Tool Handle Ferrule

STOCK D30 ID10
TOOL ANG R0.15 L2.2 A120 NA55
DEPTH CUT0.45 FINISH0.1
FEED MOVE190 PASS38 PART9

L4 D20
L12 DS20 DE26
L4 D28

INSIDE
L4 D12
L12 DS12 DE18
L4 D18`,
      },
      {
        id: 'screwdriver-handle-blank',
        title: 'Screwdriver Handle Blank',
        description: 'Rounded screwdriver handle silhouette without grip flutes.',
        meta: 'Curve',
        text: `; Screwdriver Handle Blank

STOCK D38
TOOL ROUND R1.5
DEPTH CUT0.45 FINISH0.1
FEED MOVE180 PASS36 PART9

L4 D14
L6 DS14 DE30 CONV
L12 D30
L5 DS30 DE24 CONV
L4 D36`,
      },
      {
        id: 'crank-handle-roller',
        title: 'Crank Handle Roller',
        description: 'Rotating handle sleeve with rounded outside profile and through-bore.',
        meta: 'Inside, Curve',
        text: `; Crank Handle Roller

STOCK D34 ID10
TOOL ANG R0.15 L2.2 A120 NA55
DEPTH CUT0.4 FINISH0.1
FEED MOVE180 PASS36 PART9

L4 D20
L6 DS20 DE30 CONV
L10 D30
L4 D32

INSIDE
L24 D14`,
      },
      {
        id: 'pull-handle-standoff',
        title: 'Pull Handle Standoff',
        description: 'Two matching turned posts for a drawer pull, separated by a tool-width slot.',
        meta: 'Batch, Basic',
        text: `; Pull Handle Standoff

STOCK D30
TOOL RECT R0.15 L1.5 H4
DEPTH CUT0.4 FINISH0.1
FEED MOVE220 PASS50 PART12

L5 D12
L5 D22
L1.5
L5 D12
L5 D24
L4 D28`,
      },
      {
        id: 'rod-end-cap',
        title: 'Rod End Cap',
        description: 'Hollow cap blank with a rounded nose and straight internal pocket.',
        meta: 'Inside, Curve',
        text: `; Rod End Cap

STOCK D34 ID10
TOOL ANG R0.15 L2.2 A120 NA55
DEPTH CUT0.4 FINISH0.1
FEED MOVE180 PASS36 PART9

L4 DS14 DE28 CONV
L8 D30
L4 D32

INSIDE
L4 D12
L8 D20
L4 D20`,
      },
      {
        id: 'furniture-glide-foot',
        title: 'Furniture Glide Foot',
        description: 'Soft-looking rounded foot with a broad base and chuck-side holding mass.',
        meta: 'Curve',
        text: `; Furniture Glide Foot

STOCK D36
TOOL ROUND R1.5
DEPTH CUT0.4 FINISH0.1
FEED MOVE180 PASS36 PART9

L3 D24
L5 DS24 DE34 CONV
L4 D30
L4 D36`,
      },
      {
        id: 'domed-screw-cover',
        title: 'Domed Screw Cover',
        description: 'Hollow decorative cap for hiding a screw head, with a rounded outside dome.',
        meta: 'Inside, Curve',
        text: `; Domed Screw Cover

STOCK D34 ID10
TOOL ANG R0.15 L2.2 A120 NA55
DEPTH CUT0.4 FINISH0.1
FEED MOVE180 PASS36 PART9

L3 D16
L5 DS16 DE28 CONV
L4 D30
L4 D32

INSIDE
L4 D12
L8 D20
L4 D20`,
      },
      {
        id: 'rubber-bumper-shape',
        title: 'Rubber-Bumper Shape',
        description: 'Shallow bumper dome with a wide base flange.',
        meta: 'Curve',
        text: `; Rubber-Bumper Shape

STOCK D36
TOOL ROUND R1.5
DEPTH CUT0.4 FINISH0.1
FEED MOVE180 PASS36 PART9

L4 D20
L6 DS20 DE32 CONV
L4 D34
L4 D34`,
      },
      {
        id: 'ferrule-cap',
        title: 'Ferrule Cap',
        description: 'Tapered cap for cane or tool ends with a simple tapered bore.',
        meta: 'Inside, Taper',
        text: `; Ferrule Cap

STOCK D30 ID10
TOOL ANG R0.15 L2.2 A120 NA55
DEPTH CUT0.45 FINISH0.1
FEED MOVE190 PASS38 PART9

L4 D16
L12 DS16 DE26
L4 D28

INSIDE
L5 D12
L10 DS12 DE18
L5 D18`,
      },
    ],
  },
] as const;

export const START_SAMPLE_DEFINITIONS: readonly SampleDefinition[] = SAMPLE_SECTIONS.flatMap(section => section.samples);

export function getStartSampleSections(): readonly SampleSection[] {
  return SAMPLE_SECTIONS;
}

export function getStartSampleDefinitions(): SampleDefinition[] {
  return START_SAMPLE_DEFINITIONS.slice();
}
