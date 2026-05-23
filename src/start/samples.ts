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

L6 D8
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

L2 D8
L5 DS8 DE22 CONV
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

L2 D8
L6 DS8 DE24 CONV
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

L3 D10
L16 DS10 DE24
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

L2 D8
L5 DS8 DE22 CONV
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

L2 D8
L4 DS8 DE18 CONV
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

L2 D8
L6 DS8 DE22 CONV
L6 DS22 DE10 CONV
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
L6 D8
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

L3 D12
L5 DS12 DE24 CONV
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
L5 D8
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

L3 D10
L14 DS10 DE26
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

L3 D8
L6 DS8 DE24 CONV
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
] as const;

export const START_SAMPLE_DEFINITIONS: readonly SampleDefinition[] = SAMPLE_SECTIONS.flatMap(section => section.samples);

export function getStartSampleSections(): readonly SampleSection[] {
  return SAMPLE_SECTIONS;
}

export function getStartSampleDefinitions(): SampleDefinition[] {
  return START_SAMPLE_DEFINITIONS.slice();
}
