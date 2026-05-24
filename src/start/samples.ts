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

type MorseTaperSize = 1 | 2 | 3 | 4 | 5 | 6 | 7;

type MorseTaperExtensionRow = {
  outerMt: MorseTaperSize;
  innerMt: MorseTaperSize;
  bodyDiameterMm: number;
  taperDiameterMm: number;
  taperLengthMm: number;
  bodyLengthMm: number;
};

const TAPER_ANGLE_TABLE = {
  morse: {
    MT0: {taperPerFootIn: 0.6246, angleFromCenterlineDeg: 1.4908, includedAngleDeg: 2.9816},
    MT1: {taperPerFootIn: 0.5986, angleFromCenterlineDeg: 1.4287, includedAngleDeg: 2.8574},
    MT2: {taperPerFootIn: 0.5994, angleFromCenterlineDeg: 1.4307, includedAngleDeg: 2.8614},
    MT3: {taperPerFootIn: 0.6024, angleFromCenterlineDeg: 1.4377, includedAngleDeg: 2.8754},
    MT4: {taperPerFootIn: 0.6233, angleFromCenterlineDeg: 1.4876, includedAngleDeg: 2.9752},
    MT4_5: {taperPerFootIn: 0.6240, angleFromCenterlineDeg: 1.4894, includedAngleDeg: 2.9788},
    MT5: {taperPerFootIn: 0.6315, angleFromCenterlineDeg: 1.5073, includedAngleDeg: 3.0146},
    MT6: {taperPerFootIn: 0.6257, angleFromCenterlineDeg: 1.4933, includedAngleDeg: 2.9866},
    MT7: {taperPerFootIn: 0.6240, angleFromCenterlineDeg: 1.4894, includedAngleDeg: 2.9788},
  },
  jarno: {
    allSizes: {taperPerFootIn: 0.6000, angleFromCenterlineDeg: 1.4321, includedAngleDeg: 2.8642},
  },
  brownSharpe: {
    mostSizes: {taperPerFootIn: 0.5000, angleFromCenterlineDeg: 1.1935, includedAngleDeg: 2.3870},
    number10: {taperPerFootIn: 0.5161, angleFromCenterlineDeg: 1.2320, includedAngleDeg: 2.4640},
  },
  jacobs: {
    JT0: {taperPerFootIn: 0.5915, angleFromCenterlineDeg: 1.4117, includedAngleDeg: 2.8234},
    JT1: {taperPerFootIn: 0.9251, angleFromCenterlineDeg: 2.2074, includedAngleDeg: 4.4148},
    JT2: {taperPerFootIn: 0.9786, angleFromCenterlineDeg: 2.3350, includedAngleDeg: 4.6700},
    JT3: {taperPerFootIn: 0.6390, angleFromCenterlineDeg: 1.5251, includedAngleDeg: 3.0502},
    JT4: {taperPerFootIn: 0.6289, angleFromCenterlineDeg: 1.5009, includedAngleDeg: 3.0018},
    JT5: {taperPerFootIn: 0.6201, angleFromCenterlineDeg: 1.4801, includedAngleDeg: 2.9602},
    JT6: {taperPerFootIn: 0.6229, angleFromCenterlineDeg: 1.4868, includedAngleDeg: 2.9736},
    JT33: {taperPerFootIn: 0.7619, angleFromCenterlineDeg: 1.8184, includedAngleDeg: 3.6368},
  },
  steep724: {
    ansiNmtbCatBt: {taperPerFootIn: 3.5000, angleFromCenterlineDeg: 8.2971, includedAngleDeg: 16.5943},
  },
  r8: {
    standard: {taperPerFootIn: 3.5547, angleFromCenterlineDeg: 8.4250, includedAngleDeg: 16.8500},
  },
  spindleNose: {
    shortA1A2B1B2D1: {taperPerFootIn: 3.0000, angleFromCenterlineDeg: 7.1250, includedAngleDeg: 14.2500},
    longL: {taperPerFootIn: 3.5000, angleFromCenterlineDeg: 8.2972, includedAngleDeg: 16.5944},
  },
} as const;

const MORSE_TAPER_ANGLE_DEGREES: Record<MorseTaperSize, number> = {
  1: TAPER_ANGLE_TABLE.morse.MT1.angleFromCenterlineDeg,
  2: TAPER_ANGLE_TABLE.morse.MT2.angleFromCenterlineDeg,
  3: TAPER_ANGLE_TABLE.morse.MT3.angleFromCenterlineDeg,
  4: TAPER_ANGLE_TABLE.morse.MT4.angleFromCenterlineDeg,
  5: TAPER_ANGLE_TABLE.morse.MT5.angleFromCenterlineDeg,
  6: TAPER_ANGLE_TABLE.morse.MT6.angleFromCenterlineDeg,
  7: TAPER_ANGLE_TABLE.morse.MT7.angleFromCenterlineDeg,
};

const MORSE_TAPER_LARGE_DIAMETERS_MM: Record<MorseTaperSize, number> = {
  1: 12.065,
  2: 17.78,
  3: 23.825,
  4: 31.267,
  5: 44.399,
  6: 63.348,
  7: 83.058,
};

const MORSE_EXTENSION_THROUGH_BORE_DIAMETER_MM = 8.4;

const MORSE_TAPER_EXTENSION_ROWS: readonly MorseTaperExtensionRow[] = [
  {outerMt: 1, innerMt: 1, bodyDiameterMm: 20, taperDiameterMm: 12.065, taperLengthMm: 62, bodyLengthMm: 83},
  {outerMt: 1, innerMt: 2, bodyDiameterMm: 30, taperDiameterMm: 12.065, taperLengthMm: 62, bodyLengthMm: 98},
  {outerMt: 2, innerMt: 1, bodyDiameterMm: 20, taperDiameterMm: 17.78, taperLengthMm: 75, bodyLengthMm: 85},
  {outerMt: 2, innerMt: 2, bodyDiameterMm: 30, taperDiameterMm: 17.78, taperLengthMm: 75, bodyLengthMm: 100},
  {outerMt: 2, innerMt: 3, bodyDiameterMm: 36, taperDiameterMm: 17.78, taperLengthMm: 75, bodyLengthMm: 121},
  {outerMt: 2, innerMt: 4, bodyDiameterMm: 48, taperDiameterMm: 17.78, taperLengthMm: 75, bodyLengthMm: 140},
  {outerMt: 3, innerMt: 1, bodyDiameterMm: 20, taperDiameterMm: 23.825, taperLengthMm: 94, bodyLengthMm: 79},
  {outerMt: 3, innerMt: 2, bodyDiameterMm: 30, taperDiameterMm: 23.825, taperLengthMm: 94, bodyLengthMm: 100},
  {outerMt: 3, innerMt: 3, bodyDiameterMm: 36, taperDiameterMm: 23.825, taperLengthMm: 94, bodyLengthMm: 121},
  {outerMt: 3, innerMt: 4, bodyDiameterMm: 48, taperDiameterMm: 23.825, taperLengthMm: 94, bodyLengthMm: 146},
  {outerMt: 3, innerMt: 5, bodyDiameterMm: 63, taperDiameterMm: 23.825, taperLengthMm: 94, bodyLengthMm: 174},
  {outerMt: 4, innerMt: 1, bodyDiameterMm: 20, taperDiameterMm: 31.267, taperLengthMm: 117.5, bodyLengthMm: 82.5},
  {outerMt: 4, innerMt: 2, bodyDiameterMm: 30, taperDiameterMm: 31.267, taperLengthMm: 117.5, bodyLengthMm: 97.5},
  {outerMt: 4, innerMt: 3, bodyDiameterMm: 36, taperDiameterMm: 31.267, taperLengthMm: 117.5, bodyLengthMm: 122.5},
  {outerMt: 4, innerMt: 4, bodyDiameterMm: 48, taperDiameterMm: 31.267, taperLengthMm: 117.5, bodyLengthMm: 147.5},
  {outerMt: 4, innerMt: 5, bodyDiameterMm: 63, taperDiameterMm: 31.267, taperLengthMm: 117.5, bodyLengthMm: 182.5},
  {outerMt: 5, innerMt: 1, bodyDiameterMm: 20, taperDiameterMm: 44.399, taperLengthMm: 149.5, bodyLengthMm: 82.5},
  {outerMt: 5, innerMt: 2, bodyDiameterMm: 30, taperDiameterMm: 44.399, taperLengthMm: 149.5, bodyLengthMm: 97.5},
  {outerMt: 5, innerMt: 3, bodyDiameterMm: 36, taperDiameterMm: 44.399, taperLengthMm: 149.5, bodyLengthMm: 118.5},
  {outerMt: 5, innerMt: 4, bodyDiameterMm: 48, taperDiameterMm: 44.399, taperLengthMm: 149.5, bodyLengthMm: 150.5},
  {outerMt: 5, innerMt: 5, bodyDiameterMm: 63, taperDiameterMm: 44.399, taperLengthMm: 149.5, bodyLengthMm: 185.5},
  {outerMt: 5, innerMt: 6, bodyDiameterMm: 83, taperDiameterMm: 44.399, taperLengthMm: 149.5, bodyLengthMm: 247.5},
  {outerMt: 6, innerMt: 2, bodyDiameterMm: 30, taperDiameterMm: 63.348, taperLengthMm: 210, bodyLengthMm: 99},
  {outerMt: 6, innerMt: 3, bodyDiameterMm: 36, taperDiameterMm: 63.348, taperLengthMm: 210, bodyLengthMm: 120},
  {outerMt: 6, innerMt: 4, bodyDiameterMm: 48, taperDiameterMm: 63.348, taperLengthMm: 210, bodyLengthMm: 145},
  {outerMt: 6, innerMt: 5, bodyDiameterMm: 61, taperDiameterMm: 63.348, taperLengthMm: 210, bodyLengthMm: 180},
  {outerMt: 6, innerMt: 6, bodyDiameterMm: 83, taperDiameterMm: 63.348, taperLengthMm: 210, bodyLengthMm: 242},
  {outerMt: 6, innerMt: 7, bodyDiameterMm: 105, taperDiameterMm: 63.348, taperLengthMm: 210, bodyLengthMm: 328},
];

function createMorseTaperExtensionSample(row: MorseTaperExtensionRow): SampleDefinition {
  const title = `MT${row.outerMt} to MT${row.innerMt} Extension`;
  const maxDiameter = Math.max(row.bodyDiameterMm, row.taperDiameterMm);
  const stockDiameter = Math.ceil(maxDiameter + 4);
  const cutDepth = maxDiameter >= 80 ? 1 : maxDiameter >= 50 ? 0.75 : 0.5;
  const bodyOnChuckSide = row.bodyDiameterMm >= row.taperDiameterMm;
  const socketReliefLength = Math.min(8, Math.max(4, row.bodyLengthMm * 0.06));
  const socketLength = row.bodyLengthMm - socketReliefLength;
  const innerLargeDiameter = MORSE_TAPER_LARGE_DIAMETERS_MM[row.innerMt];
  const outsideProfile = bodyOnChuckSide
    ? [
      `L${formatSampleNumber(row.taperLengthMm)} DE${formatSampleNumber(row.taperDiameterMm)} A${formatSampleTaperAngle(getMorseTaperAngle(row.outerMt))}`,
      `L${formatSampleNumber(row.bodyLengthMm)} D${formatSampleNumber(row.bodyDiameterMm)}`,
    ]
    : [
      `L${formatSampleNumber(row.bodyLengthMm)} D${formatSampleNumber(row.bodyDiameterMm)}`,
      `L${formatSampleNumber(row.taperLengthMm)} DE${formatSampleNumber(row.taperDiameterMm)} A${formatSampleTaperAngle(getMorseTaperAngle(row.outerMt))}`,
    ];
  const insideProfile = bodyOnChuckSide
    ? [
      `L${formatSampleNumber(row.taperLengthMm)} D${formatSampleNumber(MORSE_EXTENSION_THROUGH_BORE_DIAMETER_MM)}`,
      `L${formatSampleNumber(socketReliefLength)} D${formatSampleNumber(MORSE_EXTENSION_THROUGH_BORE_DIAMETER_MM)}`,
      `L${formatSampleNumber(socketLength)} DE${formatSampleNumber(innerLargeDiameter)} A${formatSampleTaperAngle(getMorseTaperAngle(row.innerMt))}`,
    ]
    : [
      `L${formatSampleNumber(socketLength)} DS${formatSampleNumber(innerLargeDiameter)} A${formatSampleTaperAngle(-getMorseTaperAngle(row.innerMt))}`,
      `L${formatSampleNumber(socketReliefLength)} D${formatSampleNumber(MORSE_EXTENSION_THROUGH_BORE_DIAMETER_MM)}`,
      `L${formatSampleNumber(row.taperLengthMm)} D${formatSampleNumber(MORSE_EXTENSION_THROUGH_BORE_DIAMETER_MM)}`,
    ];

  return {
    id: `mt${row.outerMt}-to-mt${row.innerMt}-extension`,
    title,
    description: `Morse extension with external MT${row.outerMt}, internal MT${row.innerMt}, table D${formatSampleNumber(row.bodyDiameterMm)}, D1 ${formatSampleNumber(row.taperDiameterMm)}, L ${formatSampleNumber(row.taperLengthMm)}, and L1 ${formatSampleNumber(row.bodyLengthMm)}.`,
    text: `; ${title}

STOCK D${formatSampleNumber(stockDiameter)} ID8
TOOL ANG R0.15 L2.2 A120 NA55
DEPTH CUT${formatSampleNumber(cutDepth)} FINISH0.1
FEED MOVE190 PASS38 PART9

${outsideProfile.join('\n')}

INSIDE
${insideProfile.join('\n')}`,
  };
}

function getMorseTaperAngle(size: MorseTaperSize): number {
  return MORSE_TAPER_ANGLE_DEGREES[size];
}

function formatSampleNumber(value: number): string {
  const rounded = Math.round(value * 1000) / 1000;
  if (Number.isInteger(rounded)) return rounded.toFixed(0);
  return rounded.toFixed(3).replace(/0+$/, '').replace(/\.$/, '');
}

function formatSampleTaperAngle(value: number): string {
  return value.toFixed(4);
}

export const SAMPLE_SECTIONS: readonly SampleSection[] = [
  {
    id: 'start-here-tiny-wins',
    title: 'Start Here: Tiny Wins',
    description: 'Small first parts that demonstrate the core lathecode shapes without needing setup decisions first.',
    samples: [
      {
        id: 'hello-cylinder',
        title: 'Hello Cylinder',
        description: 'The smallest useful part: one clean chamfered cylinder with conservative stock, tool, depth, and feed.',
        text: `; Hello Cylinder

STOCK D16
TOOL ANG R0.2 L7.8 A32.5 NA55
DEPTH CUT0.5 FINISH0.1
FEED MOVE200 PASS45 PART10
MODE TURN

L24 D12 CH0.5`,
      },
      {
        id: 'two-step-shoulder',
        title: 'Two-Step Shoulder',
        description: 'A first shoulder part with a slim nose, eased locating land, and larger chuck-side body.',
        text: `; Two-Step Shoulder

STOCK D22
TOOL ANG R0.2 L7.8 A32.5 NA55
DEPTH CUT0.55 FINISH0.1
FEED MOVE200 PASS45 PART10
MODE TURN

L13 DS12 CH0.4 DE12 FI0.5
L2 D10 FI0.5
L7 D18 FI0.5
L4 D20 CH0.5`,
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
MODE TURN

L3 DS7 CH0.5 DE7 CH0
L18 DS7 DE18
L6 D22 CH0.5`,
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
MODE TURN

L1.5 D5
L4.5 DS5 DE14 CONV
L4.5 DS14 DE5 CONV
L12 DS5 CH0 DE5 CH3
L3 D15
L1.5 D17 CH0.5`,
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
    id: 'spline-profiles',
    title: 'Spline Profiles',
    description: 'Smooth B-spline profiles for useful handles, stoppers, knobs, feet, and nozzle blanks where circular arcs would be too stiff.',
    samples: [
      {
        id: 'b-spline-sampler',
        title: 'B-Spline Sampler',
        description: 'A compact reference shape controlled by interior diameter guide values instead of circular arcs.',
        text: `; B-Spline Sampler

STOCK D32
TOOL ROUND R3
DEPTH CUT0.45 FINISH0.1
FEED MOVE180 PASS36 PART9
MODE TURN

L3 D10
L24 DS10 DE22 BSPLINE D14 D26 D18 D28
L4 D28 CH0.5`,
      },
      {
        id: 'ergonomic-file-handle',
        title: 'Ergonomic File Handle',
        description: 'Smooth handle blank with a narrow tang end, palm swell, and larger chuck-side shoulder.',
        text: `; Ergonomic File Handle

STOCK D36
TOOL ROUND R3
DEPTH CUT0.45 FINISH0.1
FEED MOVE180 PASS36 PART9
MODE TURN

L5 D12
L26 DS12 DE28 BSPLINE D18 D32 D24 D30
L5 D34 CH0.5`,
      },
      {
        id: 'bottle-stopper-spline',
        title: 'Bottle-Stopper Spline',
        description: 'Useful stopper blank with a gentle plug taper and a smooth rounded grip cap.',
        text: `; Bottle-Stopper Spline

STOCK D34
TOOL ROUND R2.5
DEPTH CUT0.45 FINISH0.1
FEED MOVE180 PASS36 PART9
MODE TURN

L8 DS12 DE20 BSPLINE D13 D16 D18 D20
L10 DS20 DE30 BSPLINE D26 D32 D28
L4 D32 CH0.5`,
      },
      {
        id: 'soft-bumper-button-spline',
        title: 'Soft Bumper Button',
        description: 'Domed bumper or foot shape with a small locating neck and broad rounded contact face.',
        text: `; Soft Bumper Button

STOCK D32
TOOL ROUND R2.5
DEPTH CUT0.4 FINISH0.1
FEED MOVE180 PASS36 PART9
MODE TURN

L2 D8
L14 DS8 DE24 BSPLINE D16 D30 D22
L5 D28 CH0.5`,
      },
      {
        id: 'hantel-dumbbell-spline',
        title: 'Hantel / Dumbbell Profile',
        description: 'Long dumbbell-like turning with two rounded end masses, a long waisted grip, and a heavier chuck-side knob.',
        text: `; Hantel / Dumbbell Profile

STOCK D40
TOOL ROUND R3
DEPTH CUT0.45 FINISH0.1
FEED MOVE180 PASS36 PART9
MODE TURN

L5 DS30 CH0.4 DE30 CH0
L10 DS30 DE16 BSPLINE D34 D28 D20
L18 DS16 DE18 BSPLINE D13 D12 D20 D14
L10 DS18 DE34 BSPLINE D22 D30 D36
L5 D36 CH0.5`,
      },
      {
        id: 'cucumber-spline',
        title: 'Cucumber Spline',
        description: 'Long gently uneven cylinder with rounded ends, small organic diameter changes, and a supported chuck-side cap.',
        text: `; Cucumber Spline

STOCK D32
TOOL ROUND R2.5
DEPTH CUT0.4 FINISH0.1
FEED MOVE180 PASS36 PART9
MODE TURN

L5 DS8 DE22 BSPLINE D12 D18 D24
L20 DS22 DE25 BSPLINE D27 D23 D26 D24
L20 DS25 DE23 BSPLINE D22 D28 D24 D27
L8 DS23 DE28 BSPLINE D25 D30 D27
L4 D30 CH0.4`,
      },
      {
        id: 'pear-spline',
        title: 'Pear Spline',
        description: 'Long pear-like silhouette with a small neck, broad lower belly, and a short chuck-side foot.',
        text: `; Pear Spline

STOCK D42
TOOL ROUND R3
DEPTH CUT0.45 FINISH0.1
FEED MOVE180 PASS36 PART9
MODE TURN

L3 D8
L10 DS8 DE18 BSPLINE D9 D12 D16
L18 DS18 DE36 BSPLINE D24 D38 D40 D34
L8 DS36 DE30 BSPLINE D40 D34 D30
L5 D36 CH0.5`,
      },
      {
        id: 'torus-donut-ring-spline',
        title: 'Torus / Donut Ring',
        description: 'Short bored ring with a rounded doughnut-like outside profile and straight through-hole.',
        text: `; Torus / Donut Ring

STOCK D36 ID10
TOOL ANG R0.15 L2.2 A120 NA55
DEPTH CUT0.45 FINISH0.1
FEED MOVE190 PASS38 PART9

L2 D20
L10 DS20 DE20 BSPLINE D28 D34 D28
L2 D22

INSIDE
L14 D12`,
      },
      {
        id: 'spline-nozzle-blank',
        title: 'Spline Nozzle Blank',
        description: 'Outside bell and internal flow passage shaped with splines for a compact nozzle-style blank.',
        text: `; Spline Nozzle Blank

STOCK D34 ID8
TOOL ANG R0.15 L2.2 A120 NA55
DEPTH CUT0.45 FINISH0.1
FEED MOVE190 PASS38 PART9

L4 D16
L18 DS16 DE28 BSPLINE D18 D24 D30 D26
L8 D30

INSIDE
L6 D12
L20 DS12 DE20 BSPLINE D14 D18 D22 D18
L4 D20`,
      },
      {
        id: 'bellmouth-bushing-spline',
        title: 'Bellmouth Bushing',
        description: 'Through-bored bushing with a smooth flared entry and a heavier chuck-side flange.',
        text: `; Bellmouth Bushing

STOCK D36 ID10
TOOL ANG R0.15 L2.2 A120 NA55
DEPTH CUT0.45 FINISH0.1
FEED MOVE190 PASS38 PART9

L6 D22
L18 DS22 DE30 BSPLINE D24 D34 D28 D32
L6 D34

INSIDE
L8 D20
L12 DS20 DE12 BSPLINE D18 D14 D12
L10 D12`,
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
    id: 'morse-taper-arbor-adapters',
    title: 'Morse Taper Adapter Sleeves',
    description: 'Reducer drill sleeves matching the MT1-MT2 through MT4-MT5 adapter set, using the table dimensions for total length, outer taper diameter, and inner taper diameter.',
    samples: [
      {
        id: 'mt1-mt2-adapter-sleeve',
        title: 'MT1-MT2 Adapter Sleeve',
        description: 'Reducer drill sleeve with MT2-size outside, MT1-size bore, L92, D17.78, d12.065.',
        text: `; MT1-MT2 Adapter Sleeve

STOCK D22 ID5
TOOL ANG R0.15 L2.2 A120 NA55
DEPTH CUT0.45 FINISH0.1
FEED MOVE190 PASS38 PART9

L8 D13.64
L84 DE17.78 A${formatSampleTaperAngle(getMorseTaperAngle(2))}

INSIDE
L8 D9.765
L84 DE12.065 A${formatSampleTaperAngle(getMorseTaperAngle(1))}`,
      },
      {
        id: 'mt1-mt3-adapter-sleeve',
        title: 'MT1-MT3 Adapter Sleeve',
        description: 'Reducer drill sleeve with MT3-size outside, MT1-size bore, L99, D23.825, d12.065.',
        text: `; MT1-MT3 Adapter Sleeve

STOCK D28 ID5
TOOL ANG R0.15 L2.2 A120 NA55
DEPTH CUT0.45 FINISH0.1
FEED MOVE190 PASS38 PART9

L8 D19.37
L91 DE23.825 A${formatSampleTaperAngle(getMorseTaperAngle(3))}

INSIDE
L8 D9.59
L91 DE12.065 A${formatSampleTaperAngle(getMorseTaperAngle(1))}`,
      },
      {
        id: 'mt1-mt4-adapter-sleeve',
        title: 'MT1-MT4 Adapter Sleeve',
        description: 'Reducer drill sleeve with MT4-size outside, MT1-size bore, L124, D31.267, d12.065.',
        text: `; MT1-MT4 Adapter Sleeve

STOCK D36 ID5
TOOL ANG R0.15 L2.2 A120 NA55
DEPTH CUT0.45 FINISH0.1
FEED MOVE190 PASS38 PART9

L10 D25.687
L114 DE31.267 A${formatSampleTaperAngle(getMorseTaperAngle(4))}

INSIDE
L10 D8.965
L114 DE12.065 A${formatSampleTaperAngle(getMorseTaperAngle(1))}`,
      },
      {
        id: 'mt2-mt3-adapter-sleeve',
        title: 'MT2-MT3 Adapter Sleeve',
        description: 'Reducer drill sleeve with MT3-size outside, MT2-size bore, L112, D23.825, d17.78.',
        text: `; MT2-MT3 Adapter Sleeve

STOCK D28 ID5
TOOL ANG R0.15 L2.2 A120 NA55
DEPTH CUT0.45 FINISH0.1
FEED MOVE190 PASS38 PART9

L9 D18.785
L103 DE23.825 A${formatSampleTaperAngle(getMorseTaperAngle(3))}

INSIDE
L9 D14.98
L103 DE17.78 A${formatSampleTaperAngle(getMorseTaperAngle(2))}`,
      },
      {
        id: 'mt2-mt4-adapter-sleeve',
        title: 'MT2-MT4 Adapter Sleeve',
        description: 'Reducer drill sleeve with MT4-size outside, MT2-size bore, L124, D31.267, d17.78.',
        text: `; MT2-MT4 Adapter Sleeve

STOCK D36 ID5
TOOL ANG R0.15 L2.2 A120 NA55
DEPTH CUT0.45 FINISH0.1
FEED MOVE190 PASS38 PART9

L10 D25.687
L114 DE31.267 A${formatSampleTaperAngle(getMorseTaperAngle(4))}

INSIDE
L10 D14.68
L114 DE17.78 A${formatSampleTaperAngle(getMorseTaperAngle(2))}`,
      },
      {
        id: 'mt2-mt5-adapter-sleeve',
        title: 'MT2-MT5 Adapter Sleeve',
        description: 'Reducer drill sleeve with MT5-size outside, MT2-size bore, L156, D44.399, d17.78.',
        text: `; MT2-MT5 Adapter Sleeve

STOCK D50 ID5
TOOL ANG R0.15 L2.2 A120 NA55
DEPTH CUT0.6 FINISH0.1
FEED MOVE190 PASS38 PART9

L12 D37.379
L144 DE44.399 A${formatSampleTaperAngle(getMorseTaperAngle(5))}

INSIDE
L12 D13.88
L144 DE17.78 A${formatSampleTaperAngle(getMorseTaperAngle(2))}`,
      },
      {
        id: 'mt3-mt4-adapter-sleeve',
        title: 'MT3-MT4 Adapter Sleeve',
        description: 'Reducer drill sleeve with MT4-size outside, MT3-size bore, L140, D31.267, d23.825.',
        text: `; MT3-MT4 Adapter Sleeve

STOCK D36 ID5
TOOL ANG R0.15 L2.2 A120 NA55
DEPTH CUT0.45 FINISH0.1
FEED MOVE190 PASS38 PART9

L11 D24.967
L129 DE31.267 A${formatSampleTaperAngle(getMorseTaperAngle(4))}

INSIDE
L11 D20.325
L129 DE23.825 A${formatSampleTaperAngle(getMorseTaperAngle(3))}`,
      },
      {
        id: 'mt3-mt5-adapter-sleeve',
        title: 'MT3-MT5 Adapter Sleeve',
        description: 'Reducer drill sleeve with MT5-size outside, MT3-size bore, L156, D44.399, d23.825.',
        text: `; MT3-MT5 Adapter Sleeve

STOCK D50 ID5
TOOL ANG R0.15 L2.2 A120 NA55
DEPTH CUT0.6 FINISH0.1
FEED MOVE190 PASS38 PART9

L12 D37.379
L144 DE44.399 A${formatSampleTaperAngle(getMorseTaperAngle(5))}

INSIDE
L12 D19.925
L144 DE23.825 A${formatSampleTaperAngle(getMorseTaperAngle(3))}`,
      },
      {
        id: 'mt4-mt5-adapter-sleeve',
        title: 'MT4-MT5 Adapter Sleeve',
        description: 'Reducer drill sleeve with MT5-size outside, MT4-size bore, L171, D44.399, d31.267.',
        text: `; MT4-MT5 Adapter Sleeve

STOCK D50 ID5
TOOL ANG R0.15 L2.2 A120 NA55
DEPTH CUT0.6 FINISH0.1
FEED MOVE190 PASS38 PART9

L13 D36.704
L158 DE44.399 A${formatSampleTaperAngle(getMorseTaperAngle(5))}

INSIDE
L13 D26.992
L158 DE31.267 A${formatSampleTaperAngle(getMorseTaperAngle(4))}`,
      },
    ],
  },
  {
    id: 'morse-taper-extensions',
    title: 'Morse Taper Extensions',
    description: 'Morse taper extension adapters matching the MT1-MT1 through MT6-MT7 table rows, with the listed body diameter, outer taper diameter, taper length, and socket body length.',
    samples: MORSE_TAPER_EXTENSION_ROWS.map(createMorseTaperExtensionSample),
  },
  {
    id: 'f1-boring-head-adapters',
    title: 'F1 Boring Head Adapters',
    description: 'Boring-head adapter blanks for common NT, BT, Morse, C-series, and R8 shanks, with F1-side bosses and drawbar bores.',
    samples: [
      {
        id: 'nt30-f1-m12-adapter',
        title: 'NT30-F1-M12 Adapter',
        description: 'NT30 taper shank adapter with an F1 boss and M12 drawbar bore.',
        text: `; NT30-F1-M12 Adapter

STOCK D54 ID8
TOOL ANG R0.15 L2.2 A120 NA55
DEPTH CUT0.55 FINISH0.1
FEED MOVE190 PASS38 PART9

L10 D30
L24 DE44 A${formatSampleTaperAngle(TAPER_ANGLE_TABLE.steep724.ansiNmtbCatBt.angleFromCenterlineDeg)}
L8 D48
L12 D50
L20 D50

INSIDE
L74 D10`,
      },
      {
        id: 'bt30-f1-m12-adapter',
        title: 'BT30-F1-M12 Adapter',
        description: 'BT30-style adapter blank with a short flange step, F1 boss, and M12 drawbar bore.',
        text: `; BT30-F1-M12 Adapter

STOCK D56 ID8
TOOL ANG R0.15 L2.2 A120 NA55
DEPTH CUT0.55 FINISH0.1
FEED MOVE190 PASS38 PART9

L10 D31
L22 DE42 A${formatSampleTaperAngle(TAPER_ANGLE_TABLE.steep724.ansiNmtbCatBt.angleFromCenterlineDeg)}
L6 D46
L10 D52
L8 D46
L18 D50

INSIDE
L74 D10`,
      },
      {
        id: 'mt2-f1-m10-adapter',
        title: 'MT2-F1-M10 Adapter',
        description: 'MT2 shank adapter with compact F1 head and an M10 drawbar bore.',
        text: `; MT2-F1-M10 Adapter

STOCK D44 ID8
TOOL ANG R0.15 L2.2 A120 NA55
DEPTH CUT0.45 FINISH0.1
FEED MOVE190 PASS38 PART9

L8 D14.7
L56 DE17.78 A${formatSampleTaperAngle(getMorseTaperAngle(2))}
L8 D34
L14 D40

INSIDE
L86 D8.5`,
      },
      {
        id: 'mt3-f1-m12-adapter',
        title: 'MT3-F1-M12 Adapter',
        description: 'MT3 taper shank adapter with a larger F1 head and M12 drawbar bore.',
        text: `; MT3-F1-M12 Adapter

STOCK D50 ID8
TOOL ANG R0.15 L2.2 A120 NA55
DEPTH CUT0.5 FINISH0.1
FEED MOVE190 PASS38 PART9

L8 D19.8
L70 DE23.825 A${formatSampleTaperAngle(getMorseTaperAngle(3))}
L8 D38
L14 D46

INSIDE
L100 D10`,
      },
      {
        id: 'mt4-f1-m16-adapter',
        title: 'MT4-F1-M16 Adapter',
        description: 'MT4 taper shank adapter with a heavy F1 head and M16 drawbar bore.',
        text: `; MT4-F1-M16 Adapter

STOCK D62 ID8
TOOL ANG R0.15 L2.2 A120 NA55
DEPTH CUT0.6 FINISH0.1
FEED MOVE190 PASS38 PART9

L10 D25.9
L88 DE31.267 A${formatSampleTaperAngle(getMorseTaperAngle(4))}
L8 D48
L16 D58

INSIDE
L122 D13`,
      },
      {
        id: 'c25-f1-adapter',
        title: 'C25-F1 Adapter',
        description: 'Straight C25 shank adapter with a stepped F1 boring-head boss.',
        text: `; C25-F1 Adapter

STOCK D48 ID8
TOOL ANG R0.15 L2.2 A120 NA55
DEPTH CUT0.5 FINISH0.1
FEED MOVE190 PASS38 PART9

L44 D25
L8 D36
L18 D44

INSIDE
L70 D10`,
      },
      {
        id: 'c20-f1-adapter',
        title: 'C20-F1 Adapter',
        description: 'Straight C20 shank adapter with a compact F1 boring-head boss.',
        text: `; C20-F1 Adapter

STOCK D44 ID8
TOOL ANG R0.15 L2.2 A120 NA55
DEPTH CUT0.45 FINISH0.1
FEED MOVE190 PASS38 PART9

L40 D20
L8 D32
L18 D40

INSIDE
L66 D8.5`,
      },
      {
        id: 'nt40-f1-m16-adapter',
        title: 'NT40-F1-M16 Adapter',
        description: 'NT40 taper shank adapter with a wide F1 boss and M16 drawbar bore.',
        text: `; NT40-F1-M16 Adapter

STOCK D66 ID8
TOOL ANG R0.15 L2.2 A120 NA55
DEPTH CUT0.65 FINISH0.1
FEED MOVE190 PASS38 PART9

L12 D38
L32 DE56 A${formatSampleTaperAngle(TAPER_ANGLE_TABLE.steep724.ansiNmtbCatBt.angleFromCenterlineDeg)}
L10 D60
L18 D62
L20 D58

INSIDE
L92 D13`,
      },
      {
        id: 'bt40-f1-m16-adapter',
        title: 'BT40-F1-M16 Adapter',
        description: 'BT40-style adapter blank with flange relief, F1 boss, and M16 drawbar bore.',
        text: `; BT40-F1-M16 Adapter

STOCK D68 ID8
TOOL ANG R0.15 L2.2 A120 NA55
DEPTH CUT0.65 FINISH0.1
FEED MOVE190 PASS38 PART9

L12 D39
L30 DE54 A${formatSampleTaperAngle(TAPER_ANGLE_TABLE.steep724.ansiNmtbCatBt.angleFromCenterlineDeg)}
L8 D60
L12 D64
L10 D58
L20 D60

INSIDE
L92 D13`,
      },
      {
        id: 'r8-f1-inch-7-16-adapter',
        title: 'R8-F1 7/16 Adapter',
        description: 'R8 shank adapter with an F1 head and a 7/16-inch drawbar bore approximation.',
        text: `; R8-F1 7/16 Adapter

STOCK D46 ID8
TOOL ANG R0.15 L2.2 A120 NA55
DEPTH CUT0.5 FINISH0.1
FEED MOVE190 PASS38 PART9

L12 D18
L13.5 DE22 A${formatSampleTaperAngle(TAPER_ANGLE_TABLE.r8.standard.angleFromCenterlineDeg)}
L41.5 D22
L8 D32
L18 D42

INSIDE
L93 D8.5`,
      },
      {
        id: 'r8-f1-m12-adapter',
        title: 'R8-F1-M12 Adapter',
        description: 'R8 shank adapter with the same F1 outside profile and an M12 drawbar bore.',
        text: `; R8-F1-M12 Adapter

STOCK D46 ID8
TOOL ANG R0.15 L2.2 A120 NA55
DEPTH CUT0.5 FINISH0.1
FEED MOVE190 PASS38 PART9

L12 D18
L13.5 DE22 A${formatSampleTaperAngle(TAPER_ANGLE_TABLE.r8.standard.angleFromCenterlineDeg)}
L41.5 D22
L8 D32
L18 D42

INSIDE
L93 D10`,
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
MODE TURN

L0.8 DS2.4 DE3
L10.7 D3
L0.5 D2.7
L2 D6.01 CH0.255`,
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
MODE TURN

L1 DS3.2 DE4
L14.4 D4
L0.6 D3.6
L2.8 D7.66 CH0.33`,
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
MODE TURN

L1.2 DS4 DE5
L18.1 D5
L0.7 D4.5
L3.5 D8.79 CH0.395`,
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
MODE TURN

L1.5 DS4.8 DE6
L22.7 D6
L0.8 D5.4
L4 D11.05 CH0.525`,
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
MODE TURN

L2 DS6.4 DE8
L36.8 D8
L1.2 D7.2
L5.3 D14.38 CH0.69`,
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
MODE TURN

L2.5 DS8 DE10
L46 D10
L1.5 D9
L6.4 D18.9 CH0.95`,
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
MODE TURN

L3 DS9.6 DE12
L55.2 D12
L1.8 D10.8
L7.5 D21.1 CH1.05`,
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
MODE TURN

L3.5 DS11.2 DE14
L64.4 D14
L2.1 D12.6
L8.8 D24.49 CH1.245`,
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
MODE TURN

L4 DS12.8 DE16
L73.6 D16
L2.4 D14.4
L10 D26.75 CH1.375`,
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
MODE TURN

L4.5 DS14.4 DE18
L82.8 D18
L2.7 D16.2
L11.5 D30.14 CH1.57`,
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
MODE TURN

L5 DS16 DE20
L92 D20
L3 D18
L12.5 D33.53 CH1.765`,
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
MODE TURN

L5.5 DS17.6 DE22
L101.2 D22
L3.3 D19.8
L14 D35.72 CH1.86`,
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
MODE TURN

L6 DS19.2 DE24
L110.4 D24
L3.6 D21.6
L15 D39.98 CH1.99`,
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
MODE TURN

L6.8 DS21.6 DE27
L129.1 D27
L4.1 D24.3
L17 D45.2 CH2.1`,
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
MODE TURN

L7.5 DS24 DE30
L138 D30
L4.5 D27
L18.7 D50.85 CH2.425`,
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
MODE TURN

L8.3 DS26.4 DE33
L146.7 D33
L5 D29.7
L21 D55.37 CH2.685`,
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
MODE TURN

L9 DS28.8 DE36
L165.6 D36
L5.4 D32.4
L22.5 D60.79 CH2.895`,
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
MODE TURN

L10.5 DS33.6 DE42
L183.2 D42
L6.3 D37.8
L26 D71.3 CH3.15`,
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
MODE TURN

L12 DS38.4 DE48
L220.8 D48
L7.2 D43.2
L30 D82.6 CH3.8`,
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
MODE TURN

L0.1 DS0.4 DE0.499
L1.83 D0.499
L0.07 D0.459
L0.323 D0.866 CH0.058`,
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
MODE TURN

L0.11 DS0.45 DE0.561
L2.06 D0.561
L0.08 D0.516
L0.371 D0.938 CH0.063`,
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
MODE TURN

L0.13 DS0.5 DE0.623
L2.28 D0.623
L0.09 D0.573
L0.403 D1.083 CH0.0725`,
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
MODE TURN

L0.15 DS0.6 DE0.748
L2.74 D0.748
L0.11 D0.688
L0.483 D1.299 CH0.087`,
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
MODE TURN

L0.18 DS0.7 DE0.873
L3.2 D0.873
L0.12 D0.803
L0.563 D1.516 CH0.102`,
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
MODE TURN

L0.2 DS0.8 DE0.998
L3.66 D0.998
L0.14 D0.918
L0.627 D1.732 CH0.116`,
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
MODE TURN

L0.23 DS0.9 DE1.123
L4.11 D1.123
L0.16 D1.033
L0.718 D1.949 CH0.1305`,
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
MODE TURN

L0.25 DS1 DE1.248
L4.57 D1.248
L0.18 D1.148
L0.813 D2.165 CH0.145`,
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
MODE TURN

L0.28 DS1.1 DE1.373
L5.03 D1.373
L0.19 D1.263
L0.878 D2.382 CH0.16`,
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
MODE TURN

L0.3 DS1.2 DE1.498
L5.49 D1.498
L0.21 D1.378
L0.974 D2.598 CH0.174`,
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
MODE TURN

L0.33 DS1.3 DE1.623
L5.94 D1.623
L0.23 D1.493
L1.038 D2.815 CH0.1885`,
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
MODE TURN

L0.35 DS1.4 DE1.748
L6.4 D1.748
L0.25 D1.608
L1.134 D3.031 CH0.203`,
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
MODE TURN

L0.38 DS1.5 DE1.873
L6.86 D1.873
L0.26 D1.723
L1.198 D3.248 CH0.218`,
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
MODE TURN

L0.4 DS1.6 DE1.998
L7.32 D1.998
L0.28 D1.838
L1.263 D3.464 CH0.232`,
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
MODE TURN

L0.45 DS1.8 DE2.248
L8.23 D2.248
L0.32 D2.068
L1.423 D3.897 CH0.261`,
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
MODE TURN

L0.5 DS2 DE2.498
L9.15 D2.498
L0.35 D2.298
L1.583 D4.33 CH0.29`,
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
MODE TURN

L0.55 DS2.2 DE2.748
L10.06 D2.748
L0.39 D2.528
L1.744 D4.763 CH0.319`,
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
MODE TURN

L0.6 DS2.4 DE2.997
L10.98 D2.997
L0.42 D2.757
L1.935 D5.196 CH0.348`,
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
MODE TURN

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
MODE TURN

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
MODE TURN

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
MODE TURN

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
MODE TURN

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
MODE TURN

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
MODE TURN

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
MODE TURN

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
MODE TURN

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
MODE TURN

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
MODE TURN

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
    id: 'v-belt-pulley-groove-standards',
    title: 'V-Belt Pulley Groove Standards',
    description: 'Single and multi-groove pulley samples using table-derived OD, groove opening, root diameter, spacing, and edge distance for metric wedge, classical, and narrow inch-series belts.',
    samples: [
      {
        id: 'spz-80-single-v-pulley',
        title: 'SPZ 80 mm Single V Pulley',
        description: 'Metric SPZ groove at PD 80 mm: OD 84, 34 degree groove, 9.7 mm opening, and 16 mm face width.',
        text: `; SPZ 80 mm Single V Pulley
; PD80 OD84 alpha34 W9.7 D11 X2 E8

STOCK D88 ID16
TOOL RECT R0.15 L1.5 H4
DEPTH CUT0.6 FINISH0.1
FEED MOVE200 PASS42 PART10

L3.15 D84
L3.36 DS84 DE62
L2.97 D62
L3.36 DS62 DE84
L3.15 D84

INSIDE
L15.99 D20`,
      },
      {
        id: 'spz-160-triple-v-pulley',
        title: 'SPZ 160 mm Triple V Pulley',
        description: 'Three SPZ grooves at PD 160 mm with 38 degree flanks, 12 mm groove pitch, and table edge distance.',
        text: `; SPZ 160 mm Triple V Pulley
; PD160 OD164 alpha38 W9.7 D11 X2 S12 E8

STOCK D168 ID28
TOOL RECT R0.15 L1.5 H4
DEPTH CUT0.8 FINISH0.1
FEED MOVE220 PASS45 PART12

L3.15 D164
L3.79 DS164 DE142
L2.12 D142
L3.79 DS142 DE164
L2.3 D164
L3.79 DS164 DE142
L2.12 D142
L3.79 DS142 DE164
L2.3 D164
L3.79 DS164 DE142
L2.12 D142
L3.79 DS142 DE164
L3.15 D164

INSIDE
L39.99 D40`,
      },
      {
        id: 'spa-118-double-v-pulley',
        title: 'SPA 118 mm Double V Pulley',
        description: 'Two SPA grooves at the 34 degree datum-diameter range with 15 mm pitch and 10 mm edge distance.',
        text: `; SPA 118 mm Double V Pulley
; PD118 OD123.5 alpha34 W12.7 D13.8 X2.75 S15 E10

STOCK D128 ID24
TOOL RECT R0.15 L1.5 H4
DEPTH CUT0.7 FINISH0.1
FEED MOVE210 PASS44 PART11

L3.65 D123.5
L4.22 DS123.5 DE95.9
L4.26 D95.9
L4.22 DS95.9 DE123.5
L2.3 D123.5
L4.22 DS123.5 DE95.9
L4.26 D95.9
L4.22 DS95.9 DE123.5
L3.65 D123.5

INSIDE
L34.99 D32`,
      },
      {
        id: 'spb-224-double-v-pulley',
        title: 'SPB 224 mm Double V Pulley',
        description: 'Two SPB grooves above the 190 mm breakpoint: 38 degree groove, 16.2 mm opening, and 17 mm pitch.',
        text: `; SPB 224 mm Double V Pulley
; PD224 OD231 alpha38 W16.2 D17.5 X3.5 S17 E12.5

STOCK D236 ID42
TOOL RECT R0.15 L1.5 H4
DEPTH CUT0.9 FINISH0.1
FEED MOVE220 PASS46 PART12

L4.4 D231
L6.03 DS231 DE196
L4.15 D196
L6.03 DS196 DE231
L0.8 D231
L6.03 DS231 DE196
L4.15 D196
L6.03 DS196 DE231
L4.4 D231

INSIDE
L42.02 D55`,
      },
      {
        id: 'spc-355-single-v-pulley',
        title: 'SPC 355 mm Single V Pulley',
        description: 'Large SPC single groove using OD 364.6 mm, 38 degree flanks, 22 mm opening, and a 34 mm face.',
        text: `; SPC 355 mm Single V Pulley
; PD355 OD364.6 alpha38 W22 D23.8 X4.8 E17

STOCK D372 ID70
TOOL RECT R0.15 L1.5 H4
DEPTH CUT1.2 FINISH0.1
FEED MOVE240 PASS50 PART14

L6 D364.6
L8.19 DS364.6 DE317
L5.61 D317
L8.19 DS317 DE364.6
L6 D364.6

INSIDE
L33.99 D90`,
      },
      {
        id: 'ab-6in-double-v-pulley',
        title: 'A/B 6 in Double V Pulley',
        description: 'Classical A/B section at 6 in PD, converted to mm with 34 degree grooves and 19.05 mm pitch.',
        text: `; A/B 6 in Double V Pulley
; PD152.4 OD161.3 alpha34 W15.54 D15.88 X4.45 S19.05 E12.7

STOCK D166 ID30
TOOL RECT R0.15 L1.5 H4
DEPTH CUT0.8 FINISH0.1
FEED MOVE220 PASS45 PART12

L4.93 D161.3
L4.86 DS161.3 DE129.54
L5.83 D129.54
L4.86 DS129.54 DE161.3
L3.51 D161.3
L4.86 DS161.3 DE129.54
L5.83 D129.54
L4.86 DS129.54 DE161.3
L4.93 D161.3

INSIDE
L44.47 D42`,
      },
      {
        id: 'c-10in-single-v-pulley',
        title: 'C 10 in Single V Pulley',
        description: 'Classical C section in the 8-12 in range, using the 36 degree groove and converted mm dimensions.',
        text: `; C 10 in Single V Pulley
; PD254 OD264.16 alpha36 W22.53 D19.81 X5.08 E17.48

STOCK D270 ID50
TOOL RECT R0.15 L1.5 H4
DEPTH CUT1 FINISH0.1
FEED MOVE230 PASS48 PART13

L6.21 D264.16
L6.44 DS264.16 DE224.54
L9.66 D224.54
L6.44 DS224.54 DE264.16
L6.21 D264.16

INSIDE
L34.96 D64`,
      },
      {
        id: 'd-14in-double-v-pulley',
        title: 'D 14 in Double V Pulley',
        description: 'Classical D section in the 13-17 in range, with 36 degree grooves and a wide two-groove face.',
        text: `; D 14 in Double V Pulley
; PD355.6 OD370.84 alpha36 W32.28 D26.67 X7.62 S36.53 E22.23

STOCK D378 ID70
TOOL RECT R0.15 L1.5 H4
DEPTH CUT1.2 FINISH0.1
FEED MOVE240 PASS50 PART14

L6.09 D370.84
L8.67 DS370.84 DE317.5
L14.95 D317.5
L8.67 DS317.5 DE370.84
L4.25 D370.84
L8.67 DS370.84 DE317.5
L14.95 D317.5
L8.67 DS317.5 DE370.84
L6.09 D370.84

INSIDE
L81.01 D90`,
      },
      {
        id: 'e-24in-single-v-pulley',
        title: 'E 24 in Single V Pulley',
        description: 'Large classical E section at 24 in PD, using the 36 degree groove and converted mm dimensions.',
        text: `; E 24 in Single V Pulley
; PD609.6 OD629.92 alpha36 W38.79 D33.02 X10.16 E31.24

STOCK D640 ID100
TOOL RECT R0.15 L1.5 H4
DEPTH CUT1.6 FINISH0.1
FEED MOVE250 PASS54 PART15

L11.84 D629.92
L10.73 DS629.92 DE563.88
L17.33 D563.88
L10.73 DS563.88 DE629.92
L11.84 D629.92

INSIDE
L62.47 D125`,
      },
      {
        id: '3v-7in-triple-v-pulley',
        title: '3V 7 in Triple V Pulley',
        description: 'Narrow 3V triple pulley in the 40 degree range, using 10.34 mm pitch and 8.74 mm edge distance.',
        text: `; 3V 7 in Triple V Pulley
; PD177.8 OD179.08 alpha40 W8.89 D8.89 X0.64 S10.34 E8.74

STOCK D184 ID30
TOOL RECT R0.15 L1.5 H4
DEPTH CUT0.6 FINISH0.1
FEED MOVE220 PASS45 PART12

L4.29 D179.08
L3.24 DS179.08 DE161.3
L2.42 D161.3
L3.24 DS161.3 DE179.08
L1.45 D179.08
L3.24 DS179.08 DE161.3
L2.42 D161.3
L3.24 DS161.3 DE179.08
L1.45 D179.08
L3.24 DS179.08 DE161.3
L2.42 D161.3
L3.24 DS161.3 DE179.08
L4.29 D179.08

INSIDE
L38.15 D40`,
      },
      {
        id: '5v-12in-double-v-pulley',
        title: '5V 12 in Double V Pulley',
        description: 'Narrow 5V double pulley in the 10-16 in range, modeled with a 40 degree included groove angle.',
        text: `; 5V 12 in Double V Pulley
; PD304.8 OD307.34 alpha40 W15.24 D15.24 X1.27 S17.48 E12.7

STOCK D314 ID50
TOOL RECT R0.15 L1.5 H4
DEPTH CUT1 FINISH0.1
FEED MOVE230 PASS48 PART13

L5.08 D307.34
L5.55 DS307.34 DE276.86
L4.15 D276.86
L5.55 DS276.86 DE307.34
L2.24 D307.34
L5.55 DS307.34 DE276.86
L4.15 D276.86
L5.55 DS276.86 DE307.34
L5.08 D307.34

INSIDE
L42.88 D70`,
      },
      {
        id: '8v-18in-single-v-pulley',
        title: '8V 18 in Single V Pulley',
        description: 'Large narrow-series 8V pulley at 18 in PD with 40 degree groove, 25.4 mm opening, and 38.1 mm face.',
        text: `; 8V 18 in Single V Pulley
; PD457.2 OD462.28 alpha40 W25.4 D25.4 X2.54 E19.05

STOCK D472 ID80
TOOL RECT R0.15 L1.5 H4
DEPTH CUT1.4 FINISH0.1
FEED MOVE240 PASS52 PART14

L6.35 D462.28
L9.24 DS462.28 DE411.48
L6.91 D411.48
L9.24 DS411.48 DE462.28
L6.35 D462.28

INSIDE
L38.09 D105`,
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

] as const;

export const START_SAMPLE_DEFINITIONS: readonly SampleDefinition[] = SAMPLE_SECTIONS.flatMap(section => section.samples);

export function getStartSampleSections(): readonly SampleSection[] {
  return SAMPLE_SECTIONS;
}

export function getStartSampleDefinitions(): SampleDefinition[] {
  return START_SAMPLE_DEFINITIONS.slice();
}
