import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LatheCode } from '../common/lathecode';
import { approximateSegments } from '../common/lathegeometry';
import { geometryBounds } from '../common/polygon';
import { APP_SETTING_DEFINITIONS, APP_SETTING_SECTIONS, type PlannerEngine } from '../common/settings';
import { createToolFootprintGeometry } from '../common/toolgeometry';
import { createLatheCodePreview } from './preview';
import { SAMPLE_SECTIONS, START_SAMPLE_DEFINITIONS } from './samples';
import { StartLatheCodeEvent, StartPanel } from './start';

describe('StartPanel', () => {
  beforeEach(() => {
    localStorage.clear();
    document.body.innerHTML = '';
  });

  it('emits sectioned sample lathecodes without hiding the start section', () => {
    const container = createStartContainer();
    const start = new StartPanel(container);
    const started: string[] = [];
    start.addEventListener('start', event => {
      started.push((event as StartLatheCodeEvent).text);
    });

    container.querySelector<HTMLButtonElement>('.sampleCatalogButton')!.click();
    expect(document.querySelectorAll<HTMLElement>('.sampleDialogSection').length).toBe(SAMPLE_SECTIONS.length);
    expect(Array.from(document.querySelectorAll<HTMLElement>('.sampleDialogSectionTitle')).map(title => title.textContent)).toEqual([
      'Start Here: Tiny Wins',
      'Standard Shop Parts',
      'Lathe Technique Demonstrators',
      'Machine & Workshop Accessories',
      'Everyday Useful Objects',
      'Curvy Showpieces',
      'Toys, Desk Trinkets & Funny Shapes',
      'Curious / "Can a Lathe Do That?" Designs',
      'Multi-Part Sets',
      'Morse Taper & Arbor Adapters',
      'Bolt, Screw & Fastener Blanks',
      'Shafts, Axles & Journals',
      'Mandrels, Expanding Blanks & Workholding',
      'Bushings, Bearings & Spacers - Practical Set',
      'Plumbing, Fluid & Nozzle Shapes',
      'Measurement, Gauges & Calibration',
      'Pulleys, Wheels & Rotating Blanks',
      'Handles, Knobs & Control Parts',
    ]);
    const sectionLinks = Array.from(document.querySelectorAll<HTMLAnchorElement>('.sampleDialogNav a'));
    expect(sectionLinks.map(link => link.textContent)).toEqual(SAMPLE_SECTIONS.map(section => section.title));
    expect(sectionLinks[0].getAttribute('href')).toBe(`#sample-section-${SAMPLE_SECTIONS[0].id}`);
    const firstSection = document.querySelector<HTMLElement>('.sampleDialogSection')!;
    expect(firstSection.classList.contains('collapsed')).toBe(true);
    const firstExpandButton = firstSection.querySelector<HTMLButtonElement>('.sampleDialogExpandButton')!;
    expect(firstExpandButton.textContent).toBe(`Show all ${SAMPLE_SECTIONS[0].samples.length}`);
    firstExpandButton.click();
    expect(firstSection.classList.contains('expanded')).toBe(true);
    expect(firstSection.classList.contains('collapsed')).toBe(false);
    expect(firstExpandButton.textContent).toBe('Show one row');
    const sampleCards = document.querySelectorAll<HTMLButtonElement>('.sampleDialogCard');
    expect(sampleCards.length).toBe(START_SAMPLE_DEFINITIONS.length);
    expect(Array.from(sampleCards).map(card => card.querySelector('strong')?.textContent)).toEqual(
      expect.arrayContaining([
        'Hello Cylinder',
        'Two-Step Shoulder',
        'Tapered Peg',
        'Ball-on-a-Stick',
        'Lens Button',
        'Three-Part Batch',
        'Plain Spacer Tube',
        'Flanged Bushing',
        'Nozzle Adapter',
        'Small Flywheel Blank',
        'Diameter Ladder',
        'Taper Sampler',
        'Bore Sampler',
        'Units Demo Pair',
        'Mini Test Arbor',
        'Tailstock Ram Stop Collar',
        'Center Protector Cap',
        'Chuck-Backplate Profile Demo',
        'Cabinet Pull Knob',
        'Cable Grommet Insert',
        'Cord Pull Bead',
        'Tiny Handle Knob',
        'Classic Chess Pawn',
        'Goblet Profile',
        'Mini Vase',
        'Trophy Without Handles',
        'Spinning Top',
        'Tiny Rocket',
        'Honey Dipper',
        'Rubber Duck Silhouette, Lathe Edition',
        'Fake Thread Bolt',
        'Morse-Code Bead: SOS',
        'Rocket Nozzle Cross-Section',
        '"Not a Vase" Vase',
        'Washer Assortment',
        'Spacer Assortment',
        'Bead Bracelet Set',
        'Chess Pawns x4',
        'Stacking Toy Rings',
        'Rocket Fleet',
        'Calibration Rod Set',
        'Desk Totem Kit',
        'MT0 External Taper Plug',
        'MT2 External Taper Plug',
        'MT5 Stub Taper',
        'MT2 Internal Socket Blank',
        'Deep MT2 Test Socket',
        'MT3 Outside to MT2 Inside',
        'MT2 Drill-Chuck Arbor Blank',
        'MT2 Faceplate Arbor Blank',
        'Drawbar MT2 Blank',
        'Taper Gauge Male/Female Pair',
        'Miniature Morse Taper Teaching Set',
        'M3 x 12 Hex Bolt',
        'M4 x 16 Hex Bolt',
        'M5 x 20 Hex Bolt',
        'M6 x 25 Hex Bolt',
        'M8 x 40 Hex Bolt',
        'M10 x 50 Hex Bolt',
        '1/4-20 x 1 in Hex Bolt',
        '5/16-18 x 1.25 in Hex Bolt',
        '3/8-16 x 1.5 in Hex Bolt',
        '1/2-13 x 2 in Hex Bolt',
        'Shoulder Bolt Blank',
        'Fully Threaded Rod Blank',
        'Pan-Head Screw Blank',
        'Thumb-Screw Blank',
        'Threaded Spacer Stud',
        'Solid Rivet Blank',
        'Grooved Pin Blank',
        'Round Nut Blank',
        'Acorn Nut Blank',
        'Decorative Screw Cap',
        'Straight Shaft Blank',
        'Shaft with Center Relief',
        'Shaft with Parting Grooves',
        'Two-Diameter Motor Shaft',
        'Eccentric-Free Cam Blank',
        'Toy Wheel Axle',
        'Miniature Train Axle Blank',
        'Dual Bearing Seat',
        'Retaining-Ring Groove Shaft',
        'End-Capped Journal',
        'Plain Mandrel',
        'Taper Mandrel',
        'Saw Arbor Blank',
        'Faceplate Stub Arbor',
        'Collet Arbor Blank',
        'Expanding Plug Blank',
        'Threaded Workholding Plug Placeholder',
        'Dead Center Blank',
        'Center Adapter Sleeve',
        'Mini Center Set',
        'Inner Race Spacer',
        'Stepped Bearing Spacer',
        'Preload Spacer Pair',
        'Bearing Stack Kit',
        'Press-Fit Bushing',
        'Oilite-Style Bushing Blank',
        'V-Groove Roller',
        'Cable Roller',
        'O-Ring Groove Shaft',
        'Seal Driver Cup',
        'Labyrinth Seal Demo',
        'Single Hose Barb Blank',
        'Double Hose Barb Blank',
        'Reducing Hose Nipple',
        'Beaded Tube End',
        'Hose Barb Pitch Sampler',
        'Converging Nozzle',
        'Rocket Nozzle Demo',
        'Spray Nozzle Blank',
        'Funnel Adapter',
        'Pipe Plug Blank',
        'Blank-Off Button',
        'Compression Ferrule',
        'Olive Ferrule',
        'Flared Tube Seat',
        'Cone Washer Pair',
        'Diameter Step Gauge',
        'Go/No-Go Plug Gauge',
        'Go/No-Go Ring Gauge',
        'Morse Taper Plug Gauge',
        'Morse Taper Ring Gauge',
        '60-Degree Cone Gauge',
        'Pipe-Taper Visual Gauge',
        'Chamfer Angle Sampler',
        'Matched Taper Fit Demo',
        'Thin-Wall Tube Demo',
        'Counterbore Depth Demo',
        'Internal Chamfer Demo',
        'Bore Relief Demo',
        'Sectioned Nozzle Profile',
        'Facing Test Puck',
        'Turning Test Bar',
        'Taper Test Bar',
        'Radius Test Button',
        'Groove Width Test',
        'Parting Test Rod',
        'Finish Comparator Rod',
        'Flat Belt Pulley Blank',
        'V-Belt Pulley Blank',
        'Round-Belt Pulley',
        'Mini Pulley Set',
        'Toy Wheel Blank',
        'Model Train Wheel Blank',
        'Flywheel Blank',
        'Handwheel Blank, Round Only',
        'Wire Spool',
        'Cable Drum',
        'Fishing-Reel Spool Blank',
        'Miniature Winch Drum',
        'Mushroom Knob',
        'Ball Knob',
        'Tapered Control Knob',
        'Pointerless Dial Knob',
        'Thumb Nut Blank',
        'Decorative Bead Knob',
        'File Handle Blank',
        'Tool Handle Ferrule',
        'Screwdriver Handle Blank',
        'Crank Handle Roller',
        'Pull Handle Standoff',
        'Rod End Cap',
        'Furniture Glide Foot',
        'Domed Screw Cover',
        'Rubber-Bumper Shape',
        'Ferrule Cap',
      ]),
    );
    for (const card of sampleCards) {
      expect(card.querySelector('.samplePreview')).not.toBeNull();
      expect(card.querySelector('.samplePreviewFallback')).toBeNull();
    }
    document.querySelector<HTMLButtonElement>('.sampleButton[data-sample="hello-cylinder"]')!.click();

    container.querySelector<HTMLButtonElement>('.sampleCatalogButton')!.click();
    document.querySelector<HTMLButtonElement>('.sampleButton[data-sample="taper"]')!.click();

    expect(container.hidden).toBe(false);
    expect(container.querySelector<HTMLElement>('.startPanel')!.hidden).toBe(true);
    expect(container.querySelector<HTMLButtonElement>('.exportButton')!.hidden).toBe(true);
    expect(started[0]).toContain('Hello Cylinder');
    expect(started[1]).toContain('Tapered Peg');
  });

  it('opens valid sample lathecodes from the sample dialog', () => {
    const container = createStartContainer();
    const start = new StartPanel(container);
    const started: string[] = [];
    start.addEventListener('start', event => {
      started.push((event as StartLatheCodeEvent).text);
    });

    container.querySelector<HTMLButtonElement>('.sampleCatalogButton')!.click();
    const sampleIds = Array.from(document.querySelectorAll<HTMLButtonElement>('.sampleDialogCard'))
      .map(button => button.dataset.sample!);
    document.querySelector<HTMLButtonElement>('.dialogCloseButton')!.click();

    for (const sampleId of sampleIds) {
      container.querySelector<HTMLButtonElement>('.sampleCatalogButton')!.click();
      document.querySelector<HTMLButtonElement>(`.sampleButton[data-sample="${sampleId}"]`)!.click();
      const latheCode = new LatheCode(started.at(-1)!);
      expect(latheCode.getText()).toMatch(/^TOOL\s/m);
      expectProfilesStayWithinStock(sampleId, latheCode);
      expectInsideProfileClearOfOutside(sampleId, latheCode);
      expectChuckSideMass(latheCode);
      expectInsideToolFitsBore(latheCode);
      expectBarePartingLineWidthsMatchTool(latheCode);
      expectFinishAllowanceAtLeast(latheCode, 0.1);
      expectRealisticSampleTool(latheCode);
      expectOutsideConcaveProfilesUseRoundTool(sampleId, latheCode);
      expectRectangularGroovesReachableByTool(sampleId, latheCode);
    }
  });

  it('renders a static preview from lathecode text', () => {
    const preview = createLatheCodePreview('STOCK D10\nL4 R3\nL2 D4');

    expect(preview.tagName.toLowerCase()).toBe('div');
    expect(preview.classList.contains('samplePreview')).toBe(true);
    expect(preview.querySelector('.samplePreviewCanvas, .samplePreviewUnavailable')).not.toBeNull();
    expect(preview.querySelector('.samplePreviewFallback')).toBeNull();
  });

  it('loads and deletes saved lathecodes from browser storage', () => {
    localStorage.setItem('Saved part', 'STOCK D12\nL3 R4');
    const container = createStartContainer();
    const start = new StartPanel(container);
    const started: string[] = [];
    start.addEventListener('start', event => {
      started.push((event as StartLatheCodeEvent).text);
    });

    expect(container.querySelector<HTMLElement>('.startPanel')!.hidden).toBe(false);
    expect(container.querySelector<HTMLButtonElement>('.exportButton')!.hidden).toBe(false);
    container.querySelector<HTMLSelectElement>('.loadSelect')!.value = 'Saved part';
    container.querySelector<HTMLButtonElement>('.loadButton')!.click();
    container.querySelector<HTMLButtonElement>('.deleteButton')!.click();

    expect(started).toEqual(['STOCK D12\nL3 R4']);
    expect(localStorage.getItem('Saved part')).toBeNull();
    expect(container.querySelector<HTMLElement>('.startPanel')!.hidden).toBe(true);
    expect(container.querySelector<HTMLButtonElement>('.exportButton')!.hidden).toBe(true);
    expect(container.querySelector<HTMLButtonElement>('.loadButton')!.disabled).toBe(true);
  });

  it('keeps backup import and export in the overflow menu', () => {
    localStorage.setItem('Saved part', 'STOCK D12\nL3 R4');
    const container = createStartContainer();

    new StartPanel(container);

    const menu = container.querySelector<HTMLElement>('.overflowMenu')!;
    const exportButton = container.querySelector<HTMLButtonElement>('.exportButton')!;
    const importButton = container.querySelector<HTMLLabelElement>('.importButton')!;
    expect(menu.contains(exportButton)).toBe(true);
    expect(menu.contains(importButton)).toBe(true);
    expect(exportButton.textContent).toBe('Export Backup');
    expect(importButton.textContent).toBe('Import Backup');
    expect(menu.hidden).toBe(true);

    container.querySelector<HTMLButtonElement>('.overflowButton')!.click();
    expect(menu.hidden).toBe(false);

    container.querySelector<HTMLButtonElement>('.overflowButton')!.click();
    expect(menu.hidden).toBe(true);
  });

  it('refreshes saved names after another component saves a lathecode', () => {
    const container = createStartContainer();
    const start = new StartPanel(container);

    localStorage.setItem('Later part', 'STOCK D16\nL4 R5');
    start.updateSavedLatheCodes();

    expect(container.querySelector<HTMLSelectElement>('.loadSelect')!.value).toBe('Later part');
    expect(container.querySelector<HTMLElement>('.startPanel')!.hidden).toBe(false);
    expect(container.querySelector<HTMLButtonElement>('.exportButton')!.hidden).toBe(false);
    expect(container.querySelector<HTMLButtonElement>('.loadButton')!.disabled).toBe(false);
  });

  it('shows export for stored settings even without saved lathecodes', () => {
    localStorage.setItem('pxPerMm', '750');
    const container = createStartContainer();

    new StartPanel(container);

    expect(container.querySelector<HTMLElement>('.startPanel')!.hidden).toBe(true);
    expect(container.querySelector<HTMLButtonElement>('.exportButton')!.hidden).toBe(false);
  });

  it('opens settings from start actions and stores changes', () => {
    localStorage.setItem('pxPerMm', '750');
    localStorage.setItem('smoothingEpsilonPx', '1.25');
    const container = createStartContainer();
    const start = new StartPanel(container);
    const changes: Event[] = [];
    start.addEventListener('settingschange', event => changes.push(event));

    container.querySelector<HTMLButtonElement>('.settingsButton')!.click();

    const dialog = document.querySelector<HTMLFormElement>('.settingsDialog')!;
    expect(dialog.textContent).toContain('Reasonable values');
    for (const section of APP_SETTING_SECTIONS) {
      expect(getSettingsSection(section.id).textContent).toContain(section.label);
    }
    expect(dialog.querySelectorAll<HTMLInputElement>('.settingInput').length).toBe(APP_SETTING_DEFINITIONS.length);
    expectVisibleSettingsSections(['planning', 'pixelPlanner', 'stlImport', 'preview', 'gcodeOutput']);
    expect(getVisibleSettingInputCount(dialog)).toBe(expectedVisibleSettingInputCount('pixel'));
    expect(dialog.querySelector<HTMLInputElement>('input[name="pxPerMm"]')!.value).toBe('750');
    expect(dialog.querySelector<HTMLInputElement>('input[name="smoothingEpsilonPx"]')!.value).toBe('1.25');
    expect(dialog.querySelector<HTMLSelectElement>('select[name="plannerEngine"]')!.value).toBe('pixel');
    const h4ControlsInput = dialog.querySelector<HTMLInputElement>('input[name="showNanoElsH4Controls"]')!;
    expect(h4ControlsInput.type).toBe('checkbox');
    expect(h4ControlsInput.checked).toBe(false);

    setInputValue('select[name="plannerEngine"]', 'vector');
    expectVisibleSettingsSections(['planning', 'vectorPlanner', 'geometry', 'stlImport', 'preview', 'gcodeOutput']);
    expect(getVisibleSettingInputCount(dialog)).toBe(expectedVisibleSettingInputCount('vector'));

    setInputValue('input[name="pxPerMm"]', '800');
    h4ControlsInput.checked = true;
    h4ControlsInput.dispatchEvent(new Event('input', {bubbles: true}));
    h4ControlsInput.dispatchEvent(new Event('change', {bubbles: true}));
    clickDialogButton('Save settings');

    expect(localStorage.getItem('pxPerMm')).toBe('800');
    expect(localStorage.getItem('showNanoElsH4Controls')).toBe('true');
    expect(changes.length).toBe(1);
  });

  it('does not export an empty backup', () => {
    const container = createStartContainer();
    new StartPanel(container);
    const createObjectUrl = vi.fn();
    Object.defineProperty(URL, 'createObjectURL', {value: createObjectUrl, configurable: true});

    container.querySelector<HTMLButtonElement>('.exportButton')!.click();

    expect(container.querySelector<HTMLButtonElement>('.exportButton')!.hidden).toBe(true);
    expect(createObjectUrl).not.toHaveBeenCalled();
  });
});

function createStartContainer(): HTMLElement {
  const container = document.createElement('div');
  container.innerHTML = `
    <section class="startSection">
      <button class="sampleCatalogButton"></button>
      <button class="startStlButton"></button>
      <div class="startPanel">
        <select class="loadSelect"></select>
        <button class="loadButton"></button>
        <button class="deleteButton"></button>
      </div>
      <div class="startActions toolbar">
        <button class="settingsButton">Settings</button>
        <div class="overflowContainer">
          <button class="overflowButton" type="button">...</button>
          <div class="overflowMenu" hidden>
            <button class="exportButton" hidden>Export Backup</button>
            <input id="importFile" />
            <label for="importFile" class="importButton button-like">Import Backup</label>
          </div>
        </div>
      </div>
    </section>
  `;
  document.body.appendChild(container);
  return container;
}

function clickDialogButton(text: string) {
  const button = Array.from(document.querySelectorAll('button')).find(button => button.textContent === text);
  if (!button) throw new Error(`Button not found: ${text}`);
  button.click();
}

function setInputValue(selector: string, value: string) {
  const input = document.querySelector<HTMLInputElement | HTMLSelectElement>(selector);
  if (!input) throw new Error(`Input not found: ${selector}`);
  input.value = value;
  input.dispatchEvent(new Event('input', {bubbles: true}));
  input.dispatchEvent(new Event('change', {bubbles: true}));
}

function getSettingsSection(sectionId: string): HTMLElement {
  const section = document.querySelector<HTMLElement>(`.settingsSection[data-setting-section-id="${sectionId}"]`);
  if (!section) throw new Error(`Settings section not found: ${sectionId}`);
  return section;
}

function expectVisibleSettingsSections(visibleSectionIds: string[]) {
  const visible = new Set(visibleSectionIds);
  for (const section of APP_SETTING_SECTIONS) {
    expect(getSettingsSection(section.id).hidden).toBe(!visible.has(section.id));
  }
}

function getVisibleSettingInputCount(dialog: HTMLElement): number {
  return Array.from(dialog.querySelectorAll('.settingInput'))
    .filter(input => !input.closest<HTMLElement>('.settingsSection')!.hidden)
    .length;
}

function expectedVisibleSettingInputCount(plannerEngine: PlannerEngine): number {
  return APP_SETTING_SECTIONS
    .filter(section => !section.plannerEngines || section.plannerEngines.includes(plannerEngine))
    .reduce((count, section) => count + section.definitions.length, 0);
}

function expectChuckSideMass(latheCode: LatheCode) {
  const stock = latheCode.getStock();
  expect(stock).not.toBeNull();
  if (!stock) return;

  const midpoint = stock.length / 2;
  const outsidePoints = getSegmentPoints(latheCode.getOutsideProfileSegments())
    .filter(point => point.x > 0);
  if (outsidePoints.length) {
    const freeSideMax = getMaxRadius(outsidePoints.filter(point => point.z <= midpoint));
    const chuckSideMax = getMaxRadius(outsidePoints.filter(point => point.z >= midpoint));
    expect(chuckSideMax).toBeGreaterThanOrEqual(freeSideMax);
    return;
  }

  const insidePoints = getSegmentPoints(latheCode.getInsideProfileSegments())
    .filter(point => point.x > 0);
  const freeSideMin = getMinRadius(insidePoints.filter(point => point.z <= midpoint));
  const chuckSideMin = getMinRadius(insidePoints.filter(point => point.z >= midpoint));
  expect(chuckSideMin).toBeLessThanOrEqual(freeSideMin);
}

function expectInsideToolFitsBore(latheCode: LatheCode) {
  if (!latheCode.getInsideProfileSegments().length) return;

  const stock = latheCode.getStock();
  expect(stock).not.toBeNull();
  if (!stock) return;

  const tool = latheCode.getTool();
  const bounds = geometryBounds(createToolFootprintGeometry(tool, -1));
  expect(bounds).not.toBeNull();
  if (!bounds) return;

  const radialSpan = bounds.maxY - bounds.minY;
  expect(radialSpan).toBeLessThanOrEqual(stock.innerRadius + 0.001);
  if (tool.type === 'ANG') {
    expect(tool.angleDeg).toBeGreaterThanOrEqual(90);
    expect(tool.angleDeg).toBeLessThanOrEqual(150);
  }
}

function expectBarePartingLineWidthsMatchTool(latheCode: LatheCode) {
  const toolWidth = latheCode.getTool().widthMm;
  const unitMultiplier = getUnitMultiplier(latheCode.getText());
  for (const line of latheCode.getText().split(/\r?\n/)) {
    const match = line.trim().match(/^L([0-9.]+)(?:\s*;.*)?$/);
    if (!match) continue;
    expect(Number(match[1]) * unitMultiplier).toBeCloseTo(toolWidth, 6);
  }
}

function expectFinishAllowanceAtLeast(latheCode: LatheCode, minimumMm: number) {
  expect(latheCode.getDepth().finishMm).toBeGreaterThanOrEqual(minimumMm);
}

function expectRealisticSampleTool(latheCode: LatheCode) {
  const tool = latheCode.getTool();
  if (tool.type === 'ROUND') {
    expect(tool.cornerRadiusMm).toBeGreaterThanOrEqual(1.5);
    expect(tool.cornerRadiusMm).toBeLessThanOrEqual(5);
  }
}

function expectOutsideConcaveProfilesUseRoundTool(sampleId: string, latheCode: LatheCode) {
  const outsideText = latheCode.getText().split(/^INSIDE\b/m)[0];
  if (!/^L[^\n]*\bCONC\b/m.test(outsideText)) return;
  const tool = latheCode.getTool();
  if (tool.type === 'ROUND') return;
  throw new Error(`${sampleId} has an outside concave groove but uses ${tool.type} instead of a round/form tool`);
}

type GrooveProfileLine = {
  lengthMm: number,
  radiusMm: number,
  raw: string,
};

type ProfilePoint = ReturnType<typeof approximateSegments>[number];

type RadiusRange = {
  min: number,
  max: number,
};

const PROFILE_EPSILON_MM = 0.001;
const PROFILE_SAMPLE_CHORD_MM = 0.05;

function expectProfilesStayWithinStock(sampleId: string, latheCode: LatheCode) {
  const stock = latheCode.getStock();
  expect(stock).not.toBeNull();
  if (!stock) return;

  for (const [label, segments] of [
    ['outside', latheCode.getOutsideProfileSegments()],
    ['inside', latheCode.getInsideProfileSegments()],
  ] as const) {
    for (const point of approximateSegments(segments, PROFILE_SAMPLE_CHORD_MM)) {
      if (point.z < -PROFILE_EPSILON_MM || point.z > stock.length + PROFILE_EPSILON_MM) {
        throw new Error(`${sampleId} ${label} profile extends beyond stock length at Z${formatNumberForMessage(point.z)} for stock L${formatNumberForMessage(stock.length)}`);
      }
      if (point.x > stock.radius + PROFILE_EPSILON_MM) {
        throw new Error(`${sampleId} ${label} profile exceeds stock OD at R${formatNumberForMessage(point.x)} for stock R${formatNumberForMessage(stock.radius)}`);
      }
      if (point.x < stock.innerRadius - PROFILE_EPSILON_MM) {
        throw new Error(`${sampleId} ${label} profile crosses stock ID at R${formatNumberForMessage(point.x)} for stock IR${formatNumberForMessage(stock.innerRadius)}`);
      }
    }
  }
}

function expectInsideProfileClearOfOutside(sampleId: string, latheCode: LatheCode) {
  const stock = latheCode.getStock();
  expect(stock).not.toBeNull();
  if (!stock || !latheCode.getInsideProfileSegments().length) return;

  const inside = approximateSegments(latheCode.getInsideProfileSegments(), PROFILE_SAMPLE_CHORD_MM);
  if (!inside.length) return;

  const outside = approximateSegments(latheCode.getOutsideProfileSegments(), PROFILE_SAMPLE_CHORD_MM);
  const minZ = Math.max(getProfileMinZ(inside), outside.length ? getProfileMinZ(outside) : 0);
  const maxZ = Math.min(getProfileMaxZ(inside), outside.length ? getProfileMaxZ(outside) : stock.length);
  if (maxZ < minZ) return;

  for (const z of getProfileCheckZValues(inside, outside, minZ, maxZ)) {
    const insideRange = getRadiusRangeAtZ(inside, z);
    const outsideRange = outside.length ? getRadiusRangeAtZ(outside, z) : {min: stock.radius, max: stock.radius};
    if (!insideRange || !outsideRange) continue;

    const outsideLimit = outsideRange.min;
    if (outsideLimit <= stock.innerRadius + PROFILE_EPSILON_MM) continue;

    const wall = outsideLimit - insideRange.max;
    if (wall <= PROFILE_EPSILON_MM) {
      throw new Error(`${sampleId} inside profile touches or crosses outside profile at Z${formatNumberForMessage(z)}: inside R${formatNumberForMessage(insideRange.max)}, outside R${formatNumberForMessage(outsideLimit)}`);
    }
  }
}

function expectRectangularGroovesReachableByTool(sampleId: string, latheCode: LatheCode) {
  const tool = latheCode.getTool();
  if (tool.type !== 'RECT') return;

  const unitMultiplier = getUnitMultiplier(latheCode.getText());
  const profiles: {inside: boolean, lines: GrooveProfileLine[]}[] = [{inside: false, lines: []}];
  for (const rawLine of latheCode.getText().split(/\r?\n/)) {
    const line = rawLine.replace(/\s*;.*/, '').trim();
    if (!line) continue;
    if (line === 'INSIDE') {
      profiles.push({inside: true, lines: []});
      continue;
    }
    const match = /^L([0-9.]+)\s+([DR])([0-9.]+)(?:\s|$)/.exec(line);
    if (!match) continue;
    profiles.at(-1)!.lines.push({
      lengthMm: Number(match[1]) * unitMultiplier,
      radiusMm: Number(match[3]) * (match[2] === 'D' ? 0.5 : 1) * unitMultiplier,
      raw: rawLine.trim(),
    });
  }

  for (const profile of profiles) {
    for (let i = 1; i < profile.lines.length - 1; i++) {
      const previous = profile.lines[i - 1];
      const current = profile.lines[i];
      const next = profile.lines[i + 1];
      const isOutsideGroove = !profile.inside && current.radiusMm < previous.radiusMm && current.radiusMm < next.radiusMm;
      const isInsideGroove = profile.inside && current.radiusMm > previous.radiusMm && current.radiusMm > next.radiusMm;
      if (!isOutsideGroove && !isInsideGroove) continue;
      if (current.lengthMm + 0.001 >= tool.widthMm) continue;
      throw new Error(`${sampleId} has a ${formatNumberForMessage(current.lengthMm)}mm groove (${current.raw}) narrower than ${formatNumberForMessage(tool.widthMm)}mm tool`);
    }
  }
}

function formatNumberForMessage(value: number): string {
  return String(Math.round(value * 1000) / 1000);
}

function getProfileMinZ(points: ProfilePoint[]): number {
  return Math.min(...points.map(point => point.z));
}

function getProfileMaxZ(points: ProfilePoint[]): number {
  return Math.max(...points.map(point => point.z));
}

function getProfileCheckZValues(inside: ProfilePoint[], outside: ProfilePoint[], minZ: number, maxZ: number): number[] {
  const boundaries = [...inside, ...outside]
    .map(point => point.z)
    .filter(z => z >= minZ - PROFILE_EPSILON_MM && z <= maxZ + PROFILE_EPSILON_MM)
    .map(z => Math.min(maxZ, Math.max(minZ, z)))
    .sort((a, b) => a - b);
  const uniqueBoundaries = boundaries.filter((z, index) => index === 0 || Math.abs(z - boundaries[index - 1]) > PROFILE_EPSILON_MM);
  const mids: number[] = [];
  for (let i = 0; i < uniqueBoundaries.length - 1; i++) {
    mids.push((uniqueBoundaries[i] + uniqueBoundaries[i + 1]) / 2);
  }
  return [...uniqueBoundaries, ...mids].sort((a, b) => a - b);
}

function getRadiusRangeAtZ(points: ProfilePoint[], z: number): RadiusRange | null {
  const radii: number[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    const minZ = Math.min(a.z, b.z);
    const maxZ = Math.max(a.z, b.z);
    if (z < minZ - PROFILE_EPSILON_MM || z > maxZ + PROFILE_EPSILON_MM) continue;

    const zDelta = b.z - a.z;
    if (Math.abs(zDelta) <= PROFILE_EPSILON_MM) {
      if (Math.abs(z - a.z) <= PROFILE_EPSILON_MM) {
        radii.push(a.x, b.x);
      }
      continue;
    }

    const t = (z - a.z) / zDelta;
    if (t < -PROFILE_EPSILON_MM || t > 1 + PROFILE_EPSILON_MM) continue;
    radii.push(a.x + (b.x - a.x) * Math.min(1, Math.max(0, t)));
  }

  if (!radii.length) return null;
  return {
    min: Math.min(...radii),
    max: Math.max(...radii),
  };
}

function getUnitMultiplier(text: string): number {
  const units = text.match(/^UNITS\s+([A-Z]+)/m)?.[1] ?? 'MM';
  if (units === 'IN') return 25.4;
  if (units === 'CM') return 10;
  if (units === 'M') return 1000;
  if (units === 'FT') return 304.8;
  return 1;
}

function getSegmentPoints(segments: ReturnType<LatheCode['getOutsideProfileSegments']>) {
  return segments.flatMap(segment => [segment.start, segment.end]);
}

function getMaxRadius(points: ReturnType<typeof getSegmentPoints>): number {
  return Math.max(...points.map(point => point.x));
}

function getMinRadius(points: ReturnType<typeof getSegmentPoints>): number {
  return Math.min(...points.map(point => point.x));
}
