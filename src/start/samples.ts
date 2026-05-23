export type SampleDefinition = {
  id: string;
  title: string;
  description: string;
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
        description: 'Smaller round bead on a longer fine stem, with a modest chuck-side base for support.',
        text: `; Ball-on-a-Stick

STOCK D20
TOOL ANG R0.2 L7.8 A32.5 NA55
DEPTH CUT0.45 FINISH0.1
FEED MOVE180 PASS36 PART9

L1.5 D5
L4.5 DS5 DE14 CONV
L4.5 DS14 DE5 CONV
L9 D5
L3 DS5 DE11
L3 D15
L1.5 D17`,
      },
      {
        id: 'three-part-batch',
        title: 'Three-Part Batch',
        description: 'Three small solid spacers in one setup, with parting gaps and increasing chuck-side mass.',
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
        description: 'Elegant pawn silhouette with a small ball head, slender neck, collar, and a modest chuck-side foot.',
        text: `; Classic Chess Pawn

STOCK D28
TOOL ANG R0.2 L7.8 A32.5 NA55
DEPTH CUT0.45 FINISH0.1
FEED MOVE180 PASS36 PART9

L1.5 D7
L4.5 DS7 DE16 CONV
L3.5 DS16 DE8 CONV
L5 D7
L2 D12
L2 D17
L4 DS17 DE24 CONV
L3 D24
L1.5 D26`,
      },
      {
        id: 'bishop-ish-finial',
        title: 'Bishop-ish Finial',
        description: 'A chess-piece silhouette with stacked curved features, intentionally without an off-axis slot.',
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
L7 D10
L21 D12
L18 DS12 DE22`,
      },
      {
        id: 'miniature-morse-taper-teaching-set',
        title: 'Miniature Morse Taper Teaching Set',
        description: 'MT0 through MT3 comparison set in one bar, with tool-width gaps between the taper references.',
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
    id: 'metric-hex-bolts-din-933',
    title: 'Metric Hex Bolts - DIN 933',
    description: 'Metric hex bolt blanks using DIN 933 head height k, across-corners e, and across-flats s dimensions, with small head chamfers and a thread-start taper.',
    samples: [
      {
        id: 'm3-x-12-hex-bolt',
        title: 'M3 x 12 Hex Bolt',
        description: 'DIN 933 M3 bolt blank with k2, e6.01, s5.5 head geometry.',
        text: `; M3 x 12 Hex Bolt

STOCK D6.01
TOOL ANG R0.2 L7.8 A32.5 NA55
DEPTH CUT0.35 FINISH0.1
FEED MOVE190 PASS40 PART10

L0.8 DS2.4 DE3
L10.7 D3
L0.5 D2.7
L0.4 DS5.5 DE6.01
L1.2 D6.01
L0.4 DS6.01 DE5.5`,
      },
      {
        id: 'm4-x-16-hex-bolt',
        title: 'M4 x 16 Hex Bolt',
        description: 'DIN 933 M4 bolt blank with k2.8, e7.66, s7 head geometry.',
        text: `; M4 x 16 Hex Bolt

STOCK D7.66
TOOL ANG R0.2 L7.8 A32.5 NA55
DEPTH CUT0.4 FINISH0.1
FEED MOVE190 PASS40 PART10

L1 DS3.2 DE4
L14.4 D4
L0.6 D3.6
L0.5 DS7 DE7.66
L1.8 D7.66
L0.5 DS7.66 DE7`,
      },
      {
        id: 'm5-x-20-hex-bolt',
        title: 'M5 x 20 Hex Bolt',
        description: 'DIN 933 M5 bolt blank with k3.5, e8.79, s8 head geometry.',
        text: `; M5 x 20 Hex Bolt

STOCK D8.79
TOOL ANG R0.2 L7.8 A32.5 NA55
DEPTH CUT0.4 FINISH0.1
FEED MOVE190 PASS40 PART10

L1.2 DS4 DE5
L18.1 D5
L0.7 D4.5
L0.6 DS8 DE8.79
L2.3 D8.79
L0.6 DS8.79 DE8`,
      },
      {
        id: 'm6-x-25-hex-bolt',
        title: 'M6 x 25 Hex Bolt',
        description: 'DIN 933 M6 bolt blank with k4, e11.05, s10 head geometry.',
        text: `; M6 x 25 Hex Bolt

STOCK D11.05
TOOL ANG R0.2 L7.8 A32.5 NA55
DEPTH CUT0.45 FINISH0.1
FEED MOVE190 PASS40 PART10

L1.5 DS4.8 DE6
L22.7 D6
L0.8 D5.4
L0.7 DS10 DE11.05
L2.6 D11.05
L0.7 DS11.05 DE10`,
      },
      {
        id: 'm8-x-40-hex-bolt',
        title: 'M8 x 40 Hex Bolt',
        description: 'DIN 933 M8 bolt blank with k5.3, e14.38, s13 head geometry.',
        text: `; M8 x 40 Hex Bolt

STOCK D14.38
TOOL ANG R0.2 L7.8 A32.5 NA55
DEPTH CUT0.5 FINISH0.1
FEED MOVE190 PASS40 PART10

L2 DS6.4 DE8
L36.8 D8
L1.2 D7.2
L0.9 DS13 DE14.38
L3.5 D14.38
L0.9 DS14.38 DE13`,
      },
      {
        id: 'm10-x-50-hex-bolt',
        title: 'M10 x 50 Hex Bolt',
        description: 'DIN 933 M10 bolt blank with k6.4, e18.9, s17 head geometry.',
        text: `; M10 x 50 Hex Bolt

STOCK D18.9
TOOL ANG R0.2 L7.8 A32.5 NA55
DEPTH CUT0.55 FINISH0.1
FEED MOVE190 PASS40 PART10

L2.5 DS8 DE10
L46 D10
L1.5 D9
L1 DS17 DE18.9
L4.4 D18.9
L1 DS18.9 DE17`,
      },
      {
        id: 'm12-x-60-hex-bolt',
        title: 'M12 x 60 Hex Bolt',
        description: 'DIN 933 M12 bolt blank with k7.5, e21.1, s19 head geometry.',
        text: `; M12 x 60 Hex Bolt

STOCK D21.1
TOOL ANG R0.4 L12 A32.5 NA55
DEPTH CUT0.6 FINISH0.1
FEED MOVE190 PASS40 PART10

L3 DS9.6 DE12
L55.2 D12
L1.8 D10.8
L1.2 DS19 DE21.1
L5.1 D21.1
L1.2 DS21.1 DE19`,
      },
      {
        id: 'm14-x-70-hex-bolt',
        title: 'M14 x 70 Hex Bolt',
        description: 'DIN 933 M14 bolt blank with k8.8, e24.49, s22 head geometry.',
        text: `; M14 x 70 Hex Bolt

STOCK D24.49
TOOL ANG R0.4 L12 A32.5 NA55
DEPTH CUT0.65 FINISH0.1
FEED MOVE190 PASS40 PART10

L3.5 DS11.2 DE14
L64.4 D14
L2.1 D12.6
L1.4 DS22 DE24.49
L6 D24.49
L1.4 DS24.49 DE22`,
      },
      {
        id: 'm16-x-80-hex-bolt',
        title: 'M16 x 80 Hex Bolt',
        description: 'DIN 933 M16 bolt blank with k10, e26.75, s24 head geometry.',
        text: `; M16 x 80 Hex Bolt

STOCK D26.75
TOOL ANG R0.4 L12 A32.5 NA55
DEPTH CUT0.7 FINISH0.1
FEED MOVE190 PASS40 PART10

L4 DS12.8 DE16
L73.6 D16
L2.4 D14.4
L1.6 DS24 DE26.75
L6.8 D26.75
L1.6 DS26.75 DE24`,
      },
      {
        id: 'm18-x-90-hex-bolt',
        title: 'M18 x 90 Hex Bolt',
        description: 'DIN 933 M18 bolt blank with k11.5, e30.14, s27 head geometry.',
        text: `; M18 x 90 Hex Bolt

STOCK D30.14
TOOL ANG R0.4 L12 A32.5 NA55
DEPTH CUT0.75 FINISH0.1
FEED MOVE190 PASS40 PART10

L4.5 DS14.4 DE18
L82.8 D18
L2.7 D16.2
L1.8 DS27 DE30.14
L7.9 D30.14
L1.8 DS30.14 DE27`,
      },
      {
        id: 'm20-x-100-hex-bolt',
        title: 'M20 x 100 Hex Bolt',
        description: 'DIN 933 M20 bolt blank with k12.5, e33.53, s30 head geometry.',
        text: `; M20 x 100 Hex Bolt

STOCK D33.53
TOOL ANG R0.4 L12 A32.5 NA55
DEPTH CUT0.8 FINISH0.1
FEED MOVE190 PASS40 PART10

L5 DS16 DE20
L92 D20
L3 D18
L2 DS30 DE33.53
L8.5 D33.53
L2 DS33.53 DE30`,
      },
      {
        id: 'm22-x-110-hex-bolt',
        title: 'M22 x 110 Hex Bolt',
        description: 'DIN 933 M22 bolt blank with k14, e35.72, s32 head geometry.',
        text: `; M22 x 110 Hex Bolt

STOCK D35.72
TOOL ANG R0.4 L12 A32.5 NA55
DEPTH CUT0.85 FINISH0.1
FEED MOVE190 PASS40 PART10

L5.5 DS17.6 DE22
L101.2 D22
L3.3 D19.8
L2.2 DS32 DE35.72
L9.6 D35.72
L2.2 DS35.72 DE32`,
      },
      {
        id: 'm24-x-120-hex-bolt',
        title: 'M24 x 120 Hex Bolt',
        description: 'DIN 933 M24 bolt blank with k15, e39.98, s36 head geometry.',
        text: `; M24 x 120 Hex Bolt

STOCK D39.98
TOOL ANG R0.4 L12 A32.5 NA55
DEPTH CUT0.9 FINISH0.1
FEED MOVE190 PASS40 PART10

L6 DS19.2 DE24
L110.4 D24
L3.6 D21.6
L2.4 DS36 DE39.98
L10.2 D39.98
L2.4 DS39.98 DE36`,
      },
      {
        id: 'm27-x-140-hex-bolt',
        title: 'M27 x 140 Hex Bolt',
        description: 'DIN 933 M27 bolt blank with k17, e45.2, s41 head geometry.',
        text: `; M27 x 140 Hex Bolt

STOCK D45.2
TOOL ANG R0.4 L12 A32.5 NA55
DEPTH CUT1 FINISH0.1
FEED MOVE190 PASS40 PART10

L6.8 DS21.6 DE27
L129.1 D27
L4.1 D24.3
L2.7 DS41 DE45.2
L11.6 D45.2
L2.7 DS45.2 DE41`,
      },
      {
        id: 'm30-x-150-hex-bolt',
        title: 'M30 x 150 Hex Bolt',
        description: 'DIN 933 M30 bolt blank with k18.7, e50.85, s46 head geometry.',
        text: `; M30 x 150 Hex Bolt

STOCK D50.85
TOOL ANG R0.4 L12 A32.5 NA55
DEPTH CUT1.1 FINISH0.1
FEED MOVE190 PASS40 PART10

L7.5 DS24 DE30
L138 D30
L4.5 D27
L3 DS46 DE50.85
L12.7 D50.85
L3 DS50.85 DE46`,
      },
      {
        id: 'm33-x-160-hex-bolt',
        title: 'M33 x 160 Hex Bolt',
        description: 'DIN 933 M33 bolt blank with k21, e55.37, s50 head geometry.',
        text: `; M33 x 160 Hex Bolt

STOCK D55.37
TOOL ANG R0.4 L12 A32.5 NA55
DEPTH CUT1.2 FINISH0.1
FEED MOVE190 PASS40 PART10

L8.3 DS26.4 DE33
L146.7 D33
L5 D29.7
L3.3 DS50 DE55.37
L14.4 D55.37
L3.3 DS55.37 DE50`,
      },
      {
        id: 'm36-x-180-hex-bolt',
        title: 'M36 x 180 Hex Bolt',
        description: 'DIN 933 M36 bolt blank with k22.5, e60.79, s55 head geometry.',
        text: `; M36 x 180 Hex Bolt

STOCK D60.79
TOOL ANG R0.4 L12 A32.5 NA55
DEPTH CUT1.3 FINISH0.1
FEED MOVE190 PASS40 PART10

L9 DS28.8 DE36
L165.6 D36
L5.4 D32.4
L3.6 DS55 DE60.79
L15.3 D60.79
L3.6 DS60.79 DE55`,
      },
      {
        id: 'm42-x-200-hex-bolt',
        title: 'M42 x 200 Hex Bolt',
        description: 'DIN 933 M42 bolt blank with k26, e71.3, s65 head geometry.',
        text: `; M42 x 200 Hex Bolt

STOCK D71.3
TOOL ANG R0.4 L12 A32.5 NA55
DEPTH CUT1.5 FINISH0.1
FEED MOVE190 PASS40 PART10

L10.5 DS33.6 DE42
L183.2 D42
L6.3 D37.8
L4.2 DS65 DE71.3
L17.6 D71.3
L4.2 DS71.3 DE65`,
      },
      {
        id: 'm48-x-240-hex-bolt',
        title: 'M48 x 240 Hex Bolt',
        description: 'DIN 933 M48 bolt blank with k30, e82.6, s75 head geometry.',
        text: `; M48 x 240 Hex Bolt

STOCK D82.6
TOOL ANG R0.4 L12 A32.5 NA55
DEPTH CUT1.7 FINISH0.1
FEED MOVE190 PASS40 PART10

L12 DS38.4 DE48
L220.8 D48
L7.2 D43.2
L4.8 DS75 DE82.6
L20.4 D82.6
L4.8 DS82.6 DE75`,
      },
    ],
  },
  {
    id: 'imperial-hex-bolts',
    title: 'Imperial Hex Bolts',
    description: 'Imperial UNC hex bolt blanks using ASME B18.2.1 T-6 body, across-flats, across-corners, and head-height dimensions, with small chamfers on both sides of the head.',
    samples: [
      {
        id: 'half-13-x-2-hex-bolt',
        title: '1/2-13 x 2 in Hex Bolt',
        description: 'ASME B18.2.1 T-6 1/2-13 blank with Hmax 0.323, Gmax 0.866, Fmax 0.750, and Dmax 0.499.',
        text: `; 1/2-13 x 2 in Hex Bolt

UNITS IN
STOCK D0.866
TOOL ANG R0.008 L0.31 A32.5 NA55
DEPTH CUT0.025 FINISH0.004
FEED MOVE8 PASS2 PART0.4

L0.1 DS0.4 DE0.499
L1.83 D0.499
L0.07 D0.459
L0.025 DS0.75 DE0.866
L0.273 D0.866
L0.025 DS0.866 DE0.75`,
      },
      {
        id: 'nine-sixteenths-12-x-2-25-hex-bolt',
        title: '9/16-12 x 2.25 in Hex Bolt',
        description: 'ASME B18.2.1 T-6 9/16-12 blank with Hmax 0.371, Gmax 0.938, Fmax 0.812, and Dmax 0.561.',
        text: `; 9/16-12 x 2.25 in Hex Bolt

UNITS IN
STOCK D0.938
TOOL ANG R0.008 L0.31 A32.5 NA55
DEPTH CUT0.025 FINISH0.004
FEED MOVE8 PASS2 PART0.4

L0.11 DS0.45 DE0.561
L2.06 D0.561
L0.08 D0.516
L0.025 DS0.812 DE0.938
L0.321 D0.938
L0.025 DS0.938 DE0.812`,
      },
      {
        id: 'five-eighths-11-x-2-5-hex-bolt',
        title: '5/8-11 x 2.5 in Hex Bolt',
        description: 'ASME B18.2.1 T-6 5/8-11 blank with Hmax 0.403, Gmax 1.083, Fmax 0.938, and Dmax 0.623.',
        text: `; 5/8-11 x 2.5 in Hex Bolt

UNITS IN
STOCK D1.083
TOOL ANG R0.008 L0.31 A32.5 NA55
DEPTH CUT0.03 FINISH0.004
FEED MOVE8 PASS2 PART0.4

L0.13 DS0.5 DE0.623
L2.28 D0.623
L0.09 D0.573
L0.025 DS0.938 DE1.083
L0.353 D1.083
L0.025 DS1.083 DE0.938`,
      },
      {
        id: 'three-quarters-10-x-3-hex-bolt',
        title: '3/4-10 x 3 in Hex Bolt',
        description: 'ASME B18.2.1 T-6 3/4-10 blank with Hmax 0.483, Gmax 1.299, Fmax 1.125, and Dmax 0.748.',
        text: `; 3/4-10 x 3 in Hex Bolt

UNITS IN
STOCK D1.299
TOOL ANG R0.008 L0.31 A32.5 NA55
DEPTH CUT0.035 FINISH0.004
FEED MOVE8 PASS2 PART0.4

L0.15 DS0.6 DE0.748
L2.74 D0.748
L0.11 D0.688
L0.025 DS1.125 DE1.299
L0.433 D1.299
L0.025 DS1.299 DE1.125`,
      },
      {
        id: 'seven-eighths-9-x-3-5-hex-bolt',
        title: '7/8-9 x 3.5 in Hex Bolt',
        description: 'ASME B18.2.1 T-6 7/8-9 blank with Hmax 0.563, Gmax 1.516, Fmax 1.312, and Dmax 0.873.',
        text: `; 7/8-9 x 3.5 in Hex Bolt

UNITS IN
STOCK D1.516
TOOL ANG R0.008 L0.31 A32.5 NA55
DEPTH CUT0.04 FINISH0.004
FEED MOVE8 PASS2 PART0.4

L0.18 DS0.7 DE0.873
L3.2 D0.873
L0.12 D0.803
L0.035 DS1.312 DE1.516
L0.493 D1.516
L0.035 DS1.516 DE1.312`,
      },
      {
        id: 'one-8-x-4-hex-bolt',
        title: '1-8 x 4 in Hex Bolt',
        description: 'ASME B18.2.1 T-6 1-8 blank with Hmax 0.627, Gmax 1.732, Fmax 1.500, and Dmax 0.998.',
        text: `; 1-8 x 4 in Hex Bolt

UNITS IN
STOCK D1.732
TOOL ANG R0.016 L0.47 A32.5 NA55
DEPTH CUT0.045 FINISH0.004
FEED MOVE8 PASS2 PART0.4

L0.2 DS0.8 DE0.998
L3.66 D0.998
L0.14 D0.918
L0.035 DS1.5 DE1.732
L0.557 D1.732
L0.035 DS1.732 DE1.5`,
      },
      {
        id: 'one-and-one-eighth-8-x-4-5-hex-bolt',
        title: '1-1/8-8 x 4.5 in Hex Bolt',
        description: 'ASME B18.2.1 T-6 1-1/8-8 blank with Hmax 0.718, Gmax 1.949, Fmax 1.688, and Dmax 1.123.',
        text: `; 1-1/8-8 x 4.5 in Hex Bolt

UNITS IN
STOCK D1.949
TOOL ANG R0.016 L0.47 A32.5 NA55
DEPTH CUT0.05 FINISH0.004
FEED MOVE8 PASS2 PART0.4

L0.23 DS0.9 DE1.123
L4.11 D1.123
L0.16 D1.033
L0.035 DS1.688 DE1.949
L0.648 D1.949
L0.035 DS1.949 DE1.688`,
      },
      {
        id: 'one-and-one-quarter-8-x-5-hex-bolt',
        title: '1-1/4-8 x 5 in Hex Bolt',
        description: 'ASME B18.2.1 T-6 1-1/4-8 blank with Hmax 0.813, Gmax 2.165, Fmax 1.875, and Dmax 1.248.',
        text: `; 1-1/4-8 x 5 in Hex Bolt

UNITS IN
STOCK D2.165
TOOL ANG R0.016 L0.47 A32.5 NA55
DEPTH CUT0.055 FINISH0.004
FEED MOVE8 PASS2 PART0.4

L0.25 DS1 DE1.248
L4.57 D1.248
L0.18 D1.148
L0.035 DS1.875 DE2.165
L0.743 D2.165
L0.035 DS2.165 DE1.875`,
      },
      {
        id: 'one-and-three-eighths-8-x-5-5-hex-bolt',
        title: '1-3/8-8 x 5.5 in Hex Bolt',
        description: 'ASME B18.2.1 T-6 1-3/8-8 blank with Hmax 0.878, Gmax 2.382, Fmax 2.062, and Dmax 1.373.',
        text: `; 1-3/8-8 x 5.5 in Hex Bolt

UNITS IN
STOCK D2.382
TOOL ANG R0.016 L0.47 A32.5 NA55
DEPTH CUT0.06 FINISH0.004
FEED MOVE8 PASS2 PART0.4

L0.28 DS1.1 DE1.373
L5.03 D1.373
L0.19 D1.263
L0.035 DS2.062 DE2.382
L0.808 D2.382
L0.035 DS2.382 DE2.062`,
      },
      {
        id: 'one-and-one-half-8-x-6-hex-bolt',
        title: '1-1/2-8 x 6 in Hex Bolt',
        description: 'ASME B18.2.1 T-6 1-1/2-8 blank with Hmax 0.974, Gmax 2.598, Fmax 2.250, and Dmax 1.498.',
        text: `; 1-1/2-8 x 6 in Hex Bolt

UNITS IN
STOCK D2.598
TOOL ANG R0.016 L0.47 A32.5 NA55
DEPTH CUT0.065 FINISH0.004
FEED MOVE8 PASS2 PART0.4

L0.3 DS1.2 DE1.498
L5.49 D1.498
L0.21 D1.378
L0.035 DS2.25 DE2.598
L0.904 D2.598
L0.035 DS2.598 DE2.25`,
      },
      {
        id: 'one-and-five-eighths-8-x-6-5-hex-bolt',
        title: '1-5/8-8 x 6.5 in Hex Bolt',
        description: 'ASME B18.2.1 T-6 1-5/8-8 blank with Hmax 1.038, Gmax 2.815, Fmax 2.438, and Dmax 1.623.',
        text: `; 1-5/8-8 x 6.5 in Hex Bolt

UNITS IN
STOCK D2.815
TOOL ANG R0.016 L0.47 A32.5 NA55
DEPTH CUT0.07 FINISH0.004
FEED MOVE8 PASS2 PART0.4

L0.33 DS1.3 DE1.623
L5.94 D1.623
L0.23 D1.493
L0.035 DS2.438 DE2.815
L0.968 D2.815
L0.035 DS2.815 DE2.438`,
      },
      {
        id: 'one-and-three-quarters-8-x-7-hex-bolt',
        title: '1-3/4-8 x 7 in Hex Bolt',
        description: 'ASME B18.2.1 T-6 1-3/4-8 blank with Hmax 1.134, Gmax 3.031, Fmax 2.625, and Dmax 1.748.',
        text: `; 1-3/4-8 x 7 in Hex Bolt

UNITS IN
STOCK D3.031
TOOL ANG R0.016 L0.47 A32.5 NA55
DEPTH CUT0.075 FINISH0.004
FEED MOVE8 PASS2 PART0.4

L0.35 DS1.4 DE1.748
L6.4 D1.748
L0.25 D1.608
L0.035 DS2.625 DE3.031
L1.064 D3.031
L0.035 DS3.031 DE2.625`,
      },
      {
        id: 'one-and-seven-eighths-8-x-7-5-hex-bolt',
        title: '1-7/8-8 x 7.5 in Hex Bolt',
        description: 'ASME B18.2.1 T-6 1-7/8-8 blank with Hmax 1.198, Gmax 3.248, Fmax 2.812, and Dmax 1.873.',
        text: `; 1-7/8-8 x 7.5 in Hex Bolt

UNITS IN
STOCK D3.248
TOOL ANG R0.016 L0.47 A32.5 NA55
DEPTH CUT0.08 FINISH0.004
FEED MOVE8 PASS2 PART0.4

L0.38 DS1.5 DE1.873
L6.86 D1.873
L0.26 D1.723
L0.035 DS2.812 DE3.248
L1.128 D3.248
L0.035 DS3.248 DE2.812`,
      },
      {
        id: 'two-8-x-8-hex-bolt',
        title: '2-8 x 8 in Hex Bolt',
        description: 'ASME B18.2.1 T-6 2-8 blank with Hmax 1.263, Gmax 3.464, Fmax 3.000, and Dmax 1.998.',
        text: `; 2-8 x 8 in Hex Bolt

UNITS IN
STOCK D3.464
TOOL ANG R0.016 L0.47 A32.5 NA55
DEPTH CUT0.085 FINISH0.004
FEED MOVE8 PASS2 PART0.4

L0.4 DS1.6 DE1.998
L7.32 D1.998
L0.28 D1.838
L0.035 DS3 DE3.464
L1.193 D3.464
L0.035 DS3.464 DE3`,
      },
      {
        id: 'two-and-one-quarter-8-x-9-hex-bolt',
        title: '2-1/4-8 x 9 in Hex Bolt',
        description: 'ASME B18.2.1 T-6 2-1/4-8 blank with Hmax 1.423, Gmax 3.897, Fmax 3.375, and Dmax 2.248.',
        text: `; 2-1/4-8 x 9 in Hex Bolt

UNITS IN
STOCK D3.897
TOOL ANG R0.016 L0.47 A32.5 NA55
DEPTH CUT0.09 FINISH0.004
FEED MOVE8 PASS2 PART0.4

L0.45 DS1.8 DE2.248
L8.23 D2.248
L0.32 D2.068
L0.035 DS3.375 DE3.897
L1.353 D3.897
L0.035 DS3.897 DE3.375`,
      },
      {
        id: 'two-and-one-half-8-x-10-hex-bolt',
        title: '2-1/2-8 x 10 in Hex Bolt',
        description: 'ASME B18.2.1 T-6 2-1/2-8 blank with Hmax 1.583, Gmax 4.330, Fmax 3.750, and Dmax 2.498.',
        text: `; 2-1/2-8 x 10 in Hex Bolt

UNITS IN
STOCK D4.33
TOOL ANG R0.016 L0.47 A32.5 NA55
DEPTH CUT0.095 FINISH0.004
FEED MOVE8 PASS2 PART0.4

L0.5 DS2 DE2.498
L9.15 D2.498
L0.35 D2.298
L0.035 DS3.75 DE4.33
L1.513 D4.33
L0.035 DS4.33 DE3.75`,
      },
      {
        id: 'two-and-three-quarters-8-x-11-hex-bolt',
        title: '2-3/4-8 x 11 in Hex Bolt',
        description: 'ASME B18.2.1 T-6 2-3/4-8 blank with Hmax 1.744, Gmax 4.763, Fmax 4.125, and Dmax 2.748.',
        text: `; 2-3/4-8 x 11 in Hex Bolt

UNITS IN
STOCK D4.763
TOOL ANG R0.016 L0.47 A32.5 NA55
DEPTH CUT0.1 FINISH0.004
FEED MOVE8 PASS2 PART0.4

L0.55 DS2.2 DE2.748
L10.06 D2.748
L0.39 D2.528
L0.035 DS4.125 DE4.763
L1.674 D4.763
L0.035 DS4.763 DE4.125`,
      },
      {
        id: 'three-8-x-12-hex-bolt',
        title: '3-8 x 12 in Hex Bolt',
        description: 'ASME B18.2.1 T-6 3-8 blank with Hmax 1.935, Gmax 5.196, Fmax 4.500, and Dmax 2.997.',
        text: `; 3-8 x 12 in Hex Bolt

UNITS IN
STOCK D5.196
TOOL ANG R0.016 L0.47 A32.5 NA55
DEPTH CUT0.11 FINISH0.004
FEED MOVE8 PASS2 PART0.4

L0.6 DS2.4 DE2.997
L10.98 D2.997
L0.42 D2.757
L0.035 DS4.5 DE5.196
L1.865 D5.196
L0.035 DS5.196 DE4.5`,
      },
    ],
  },
  {
    id: 'screw-fastener-blanks',
    title: 'Screw & Fastener Blanks',
    description: 'Screw-head silhouettes, studs, pins, rivets, nuts, and thread placeholders sized for reachable tool geometry.',
    samples: [
      {
        id: 'shoulder-bolt-blank',
        title: 'Shoulder Bolt Blank',
        description: 'Smaller thread land, larger precision shoulder, and a broad round head at the chuck side.',
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
L3 D16
L2.2 D12
L7 D16`,
      },
      {
        id: 'bearing-stack-kit',
        title: 'Bearing Stack Kit',
        description: 'Several spacer lengths with the same bore and OD for stack-height experiments.',
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
L3 D16
L2.2 D12
L5 D16
L2.2 D12
L11 D16`,
      },
      {
        id: 'press-fit-bushing',
        title: 'Press-Fit Bushing',
        description: 'Slight lead-in taper, straight press body, and central bore for a simple bushing blank.',
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
L2.2 D10
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
L2.2 D10
L6 D16
L4 D16`,
      },
      {
        id: 'morse-taper-plug-gauge',
        title: 'Morse Taper Plug Gauge',
        description: 'External taper plug with a chuck-side shoulder for contact checks.',
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
L2.2 D10
L8 DS14 DE22
L4 D22`,
      },
      {
        id: 'thin-wall-tube-demo',
        title: 'Thin-Wall Tube Demo',
        description: 'Constant-wall sleeve with a small chuck-side allowance for checking wall thickness.',
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
        id: 'multi-groove-belt-pulley',
        title: 'Multi-Groove Belt Pulley',
        description: 'Single pulley blank with three V belt grooves, raised lands, and a heavier chuck-side hub.',
        text: `; Multi-Groove Belt Pulley

STOCK D42
TOOL ANG R0.2 L7.8 A32.5 NA55
DEPTH CUT0.5 FINISH0.1
FEED MOVE190 PASS40 PART10

L3 D34
L2 DS34 DE28
L2 DS28 DE34
L2 D34
L2 DS34 DE28
L2 DS28 DE34
L2 D34
L2 DS34 DE28
L2 DS28 DE34
L3 D36
L3 D40`,
      },
      {
        id: 'toy-wheel-blank',
        title: 'Toy Wheel Blank',
        description: 'Rounded tire-like outside profile with a simple hub bore.',
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
