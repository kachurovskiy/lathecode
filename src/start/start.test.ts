import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LatheCode } from '../common/lathecode';
import { approximateSegments } from '../common/lathegeometry';
import { geometryBounds } from '../common/polygon';
import {
  APP_SETTING_DEFINITIONS,
  APP_SETTING_SECTIONS,
  DEFAULT_OPENROUTER_MODEL,
  DEFAULT_OPENROUTER_VISION_MODEL,
  type PlannerEngine,
} from '../common/settings';
import { createToolFootprintGeometry } from '../common/toolgeometry';
import { createLatheCodePreview } from './preview';
import { SAMPLE_SECTIONS, START_SAMPLE_DEFINITIONS } from './samples';
import { StartLatheCodeEvent, StartPanel } from './start';

describe('StartPanel', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
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
      'Spline Profiles',
      'Curvy Showpieces',
      'Toys, Desk Trinkets & Funny Shapes',
      'Morse Taper Adapter Sleeves',
      'Morse Taper Extensions',
      'F1 Boring Head Adapters',
      'Metric Hex Bolts - DIN 933',
      'Imperial Hex Bolts',
      'Screw & Fastener Blanks',
      'Shafts, Axles & Journals',
      'V-Belt Pulley Groove Standards',
      'Pulleys, Wheels & Rotating Blanks',
    ]);
    const sectionLinks = Array.from(document.querySelectorAll<HTMLAnchorElement>('.sampleDialogNav a'));
    expect(sectionLinks.map(link => link.textContent)).toEqual(SAMPLE_SECTIONS.map(section => section.title));
    expect(sectionLinks[0].getAttribute('href')).toBe(`#sample-section-${SAMPLE_SECTIONS[0].id}`);
    const firstSection = document.querySelector<HTMLElement>('.sampleDialogSection')!;
    expect(firstSection.classList.contains('collapsed')).toBe(true);
    expect(firstSection.querySelector<HTMLButtonElement>('.sampleDialogExpandButton')).toBeNull();
    const firstSectionCards = Array.from(firstSection.querySelectorAll<HTMLButtonElement>('.sampleButton'));
    expect(firstSectionCards.filter(card => !card.hidden).length).toBe(SAMPLE_SECTIONS[0].samples.length);
    expect(firstSection.querySelector<HTMLButtonElement>('.sampleDialogMoreCard')!.hidden).toBe(true);
    const expandableSection = document.querySelectorAll<HTMLElement>('.sampleDialogSection')[1];
    const showMoreCard = expandableSection.querySelector<HTMLButtonElement>('.sampleDialogMoreCard')!;
    expect(showMoreCard.textContent).toBe(`Show ${SAMPLE_SECTIONS[1].samples.length - 7} more`);
    const expandableSectionCards = Array.from(expandableSection.querySelectorAll<HTMLButtonElement>('.sampleButton'));
    expect(expandableSectionCards.filter(card => !card.hidden).length).toBe(7);
    showMoreCard.click();
    expect(expandableSection.classList.contains('expanded')).toBe(true);
    expect(expandableSection.classList.contains('collapsed')).toBe(false);
    expect(showMoreCard.hidden).toBe(true);
    expect(expandableSectionCards.every(card => !card.hidden)).toBe(true);
    const sampleCards = document.querySelectorAll<HTMLButtonElement>('.sampleButton');
    expect(sampleCards.length).toBe(START_SAMPLE_DEFINITIONS.length);
    expect(Array.from(sampleCards).map(card => card.querySelector('strong')?.textContent)).toEqual(
      START_SAMPLE_DEFINITIONS.map(sample => sample.title),
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
    const sampleIds = Array.from(document.querySelectorAll<HTMLButtonElement>('.sampleButton'))
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

  it('uses DIN 933 across-corners diameters for metric hex bolt heads', () => {
    const expectedHeads = [
      {id: 'm3-x-12-hex-bolt', bodyLength: '1.2', chamferLength: '0.4', diameter: '6.01', flatDiameter: '5.5'},
      {id: 'm4-x-16-hex-bolt', bodyLength: '1.8', chamferLength: '0.5', diameter: '7.66', flatDiameter: '7'},
      {id: 'm5-x-20-hex-bolt', bodyLength: '2.3', chamferLength: '0.6', diameter: '8.79', flatDiameter: '8'},
      {id: 'm6-x-25-hex-bolt', bodyLength: '2.6', chamferLength: '0.7', diameter: '11.05', flatDiameter: '10'},
      {id: 'm8-x-40-hex-bolt', bodyLength: '3.5', chamferLength: '0.9', diameter: '14.38', flatDiameter: '13'},
      {id: 'm10-x-50-hex-bolt', bodyLength: '4.4', chamferLength: '1', diameter: '18.9', flatDiameter: '17'},
      {id: 'm12-x-60-hex-bolt', bodyLength: '5.1', chamferLength: '1.2', diameter: '21.1', flatDiameter: '19'},
      {id: 'm14-x-70-hex-bolt', bodyLength: '6', chamferLength: '1.4', diameter: '24.49', flatDiameter: '22'},
      {id: 'm16-x-80-hex-bolt', bodyLength: '6.8', chamferLength: '1.6', diameter: '26.75', flatDiameter: '24'},
      {id: 'm18-x-90-hex-bolt', bodyLength: '7.9', chamferLength: '1.8', diameter: '30.14', flatDiameter: '27'},
      {id: 'm20-x-100-hex-bolt', bodyLength: '8.5', chamferLength: '2', diameter: '33.53', flatDiameter: '30'},
      {id: 'm22-x-110-hex-bolt', bodyLength: '9.6', chamferLength: '2.2', diameter: '35.72', flatDiameter: '32'},
      {id: 'm24-x-120-hex-bolt', bodyLength: '10.2', chamferLength: '2.4', diameter: '39.98', flatDiameter: '36'},
      {id: 'm27-x-140-hex-bolt', bodyLength: '11.6', chamferLength: '2.7', diameter: '45.2', flatDiameter: '41'},
      {id: 'm30-x-150-hex-bolt', bodyLength: '12.7', chamferLength: '3', diameter: '50.85', flatDiameter: '46'},
      {id: 'm33-x-160-hex-bolt', bodyLength: '14.4', chamferLength: '3.3', diameter: '55.37', flatDiameter: '50'},
      {id: 'm36-x-180-hex-bolt', bodyLength: '15.3', chamferLength: '3.6', diameter: '60.79', flatDiameter: '55'},
      {id: 'm42-x-200-hex-bolt', bodyLength: '17.6', chamferLength: '4.2', diameter: '71.3', flatDiameter: '65'},
      {id: 'm48-x-240-hex-bolt', bodyLength: '20.4', chamferLength: '4.8', diameter: '82.6', flatDiameter: '75'},
    ];

    for (const expected of expectedHeads) {
      const sample = START_SAMPLE_DEFINITIONS.find(entry => entry.id === expected.id);
      expect(sample).toBeDefined();
      if (!sample) continue;

      expect(sample.text.split(/\r?\n/)).toContain(`STOCK D${expected.diameter}`);
      const profileLines = sample.text.split(/\r?\n/)
        .map(line => line.trim())
        .filter(line => line.startsWith('L'));
      const headHeight = formatCompactNumber(Number(expected.bodyLength) + Number(expected.chamferLength) * 2);
      const headChamfer = formatCompactNumber((Number(expected.diameter) - Number(expected.flatDiameter)) / 2);
      expect(profileLines.at(-1)).toBe(`L${headHeight} D${expected.diameter} CH${headChamfer}`);
    }
  });

  it('uses ASME B18.2.1 T-6 dimensions for imperial hex bolt heads', () => {
    const expectedHeads = [
      {id: 'half-13-x-2-hex-bolt', bodyDiameter: '0.499', headBodyLength: '0.273', chamferLength: '0.025', headDiameter: '0.866', flatDiameter: '0.75'},
      {id: 'nine-sixteenths-12-x-2-25-hex-bolt', bodyDiameter: '0.561', headBodyLength: '0.321', chamferLength: '0.025', headDiameter: '0.938', flatDiameter: '0.812'},
      {id: 'five-eighths-11-x-2-5-hex-bolt', bodyDiameter: '0.623', headBodyLength: '0.353', chamferLength: '0.025', headDiameter: '1.083', flatDiameter: '0.938'},
      {id: 'three-quarters-10-x-3-hex-bolt', bodyDiameter: '0.748', headBodyLength: '0.433', chamferLength: '0.025', headDiameter: '1.299', flatDiameter: '1.125'},
      {id: 'seven-eighths-9-x-3-5-hex-bolt', bodyDiameter: '0.873', headBodyLength: '0.493', chamferLength: '0.035', headDiameter: '1.516', flatDiameter: '1.312'},
      {id: 'one-8-x-4-hex-bolt', bodyDiameter: '0.998', headBodyLength: '0.557', chamferLength: '0.035', headDiameter: '1.732', flatDiameter: '1.5'},
      {id: 'one-and-one-eighth-8-x-4-5-hex-bolt', bodyDiameter: '1.123', headBodyLength: '0.648', chamferLength: '0.035', headDiameter: '1.949', flatDiameter: '1.688'},
      {id: 'one-and-one-quarter-8-x-5-hex-bolt', bodyDiameter: '1.248', headBodyLength: '0.743', chamferLength: '0.035', headDiameter: '2.165', flatDiameter: '1.875'},
      {id: 'one-and-three-eighths-8-x-5-5-hex-bolt', bodyDiameter: '1.373', headBodyLength: '0.808', chamferLength: '0.035', headDiameter: '2.382', flatDiameter: '2.062'},
      {id: 'one-and-one-half-8-x-6-hex-bolt', bodyDiameter: '1.498', headBodyLength: '0.904', chamferLength: '0.035', headDiameter: '2.598', flatDiameter: '2.25'},
      {id: 'one-and-five-eighths-8-x-6-5-hex-bolt', bodyDiameter: '1.623', headBodyLength: '0.968', chamferLength: '0.035', headDiameter: '2.815', flatDiameter: '2.438'},
      {id: 'one-and-three-quarters-8-x-7-hex-bolt', bodyDiameter: '1.748', headBodyLength: '1.064', chamferLength: '0.035', headDiameter: '3.031', flatDiameter: '2.625'},
      {id: 'one-and-seven-eighths-8-x-7-5-hex-bolt', bodyDiameter: '1.873', headBodyLength: '1.128', chamferLength: '0.035', headDiameter: '3.248', flatDiameter: '2.812'},
      {id: 'two-8-x-8-hex-bolt', bodyDiameter: '1.998', headBodyLength: '1.193', chamferLength: '0.035', headDiameter: '3.464', flatDiameter: '3'},
      {id: 'two-and-one-quarter-8-x-9-hex-bolt', bodyDiameter: '2.248', headBodyLength: '1.353', chamferLength: '0.035', headDiameter: '3.897', flatDiameter: '3.375'},
      {id: 'two-and-one-half-8-x-10-hex-bolt', bodyDiameter: '2.498', headBodyLength: '1.513', chamferLength: '0.035', headDiameter: '4.33', flatDiameter: '3.75'},
      {id: 'two-and-three-quarters-8-x-11-hex-bolt', bodyDiameter: '2.748', headBodyLength: '1.674', chamferLength: '0.035', headDiameter: '4.763', flatDiameter: '4.125'},
      {id: 'three-8-x-12-hex-bolt', bodyDiameter: '2.997', headBodyLength: '1.865', chamferLength: '0.035', headDiameter: '5.196', flatDiameter: '4.5'},
    ];

    for (const expected of expectedHeads) {
      const sample = START_SAMPLE_DEFINITIONS.find(entry => entry.id === expected.id);
      expect(sample).toBeDefined();
      if (!sample) continue;

      expect(sample.text.split(/\r?\n/)).toContain(`STOCK D${expected.headDiameter}`);
      const profileLines = sample.text.split(/\r?\n/)
        .map(line => line.trim())
        .filter(line => line.startsWith('L'));
      expect(profileLines[1]).toMatch(new RegExp(`\\sD${expected.bodyDiameter}$`));
      const headHeight = formatCompactNumber(Number(expected.headBodyLength) + Number(expected.chamferLength) * 2);
      const headChamfer = formatCompactNumber((Number(expected.headDiameter) - Number(expected.flatDiameter)) / 2);
      expect(profileLines.at(-1)).toBe(`L${headHeight} D${expected.headDiameter} CH${headChamfer}`);
    }
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
    expect(menu.querySelector<HTMLElement>('.backupPrivacyDisclosure')!.textContent)
      .toContain('OpenRouter API key');
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
    expectVisibleSettingsSections(['planning', 'pixelPlanner', 'stlImport', 'preview', 'gcodeOutput', 'llm']);
    expect(getVisibleSettingInputCount(dialog)).toBe(expectedVisibleSettingInputCount('pixel'));
    expect(dialog.querySelector<HTMLInputElement>('input[name="pxPerMm"]')!.value).toBe('750');
    expect(dialog.querySelector<HTMLInputElement>('input[name="smoothingEpsilonPx"]')!.value).toBe('1.25');
    expect(dialog.querySelector<HTMLSelectElement>('select[name="plannerEngine"]')!.value).toBe('pixel');
    const h4ControlsInput = dialog.querySelector<HTMLInputElement>('input[name="showNanoElsH4Controls"]')!;
    expect(h4ControlsInput.type).toBe('checkbox');
    expect(h4ControlsInput.checked).toBe(false);

    setInputValue('select[name="plannerEngine"]', 'vector');
    expectVisibleSettingsSections(['planning', 'vectorPlanner', 'geometry', 'stlImport', 'preview', 'gcodeOutput', 'llm']);
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

  it('starts a default lathecode from drawn dimensions', () => {
    const container = createStartContainer();
    const start = new StartPanel(container);
    const started: string[] = [];
    start.addEventListener('start', event => {
      started.push((event as StartLatheCodeEvent).text);
    });
    document.title = 'lathecode editor';

    container.querySelector<HTMLButtonElement>('.startDimensionsButton')!.click();

    expect(document.querySelector('.profileDrawingDialogContainer')).not.toBeNull();
    expect(document.title).toBe('Profile Designer');
    expect(document.querySelector('.profileDrawingDialogContainer > h2')).toBeNull();
    expect(document.querySelector<HTMLInputElement>('input[name="drawingDiameter"]')!.value).toBe('30');
    expect(document.querySelector<HTMLInputElement>('input[name="drawingLength"]')!.value).toBe('50');
    expect(document.querySelector<HTMLInputElement>('input[name="drawingSnap"]')!.value).toBe('1');
    expect(document.querySelector<HTMLInputElement>('input[name="drawingGrid"]')!.value).toBe('5');
    expect(document.querySelector('.profileDrawingWorkspace')).not.toBeNull();
    expect(document.querySelector('.profileDrawingWorkspace.longPart')).not.toBeNull();
    expect(document.querySelector('.profileDrawingWorkspace > .profileDrawingPreview3d')).not.toBeNull();
    expect(document.querySelector('.profileDrawingPreview3d .profileDrawingPreview3dCanvas, .profileDrawingPreview3d .samplePreviewUnavailable')).not.toBeNull();
    expect(document.querySelector('.profileDrawingPreview')).toBeNull();
    expect(document.querySelector('.profileDrawingControls .profileDrawingActions')).not.toBeNull();
    expect(document.querySelector('.profileDrawingHistoryActions.setupSegmented')).not.toBeNull();
    expect(document.querySelector('.profileDrawingDialogActions.setupSegmented')).not.toBeNull();
    expect(document.querySelector('.profileDrawingUndoButton.setupSegmentButton')).not.toBeNull();
    expect(document.querySelector('.profileDrawingDialogActions .dialogCloseButton.setupSegmentButton')).not.toBeNull();
    expect(document.querySelector('.profileDrawingControls .profileDrawingSnapshotField')).toBeNull();
    expect(document.querySelector<HTMLElement>('.profileDrawingSelectionControls > .profileDrawingSnapshotField')!.hidden).toBe(false);
    expect(document.querySelector<HTMLElement>('.profileDrawingSelectionControls')!.hidden).toBe(false);
    expect(document.querySelector('.profileDrawingPoint.selected')).toBeNull();
    expect(document.querySelector('.profileDrawingSelectionControls > .profileDrawingPointEditor')).not.toBeNull();
    expect(document.querySelector<HTMLElement>('.profileDrawingPointEditor')!.hidden).toBe(true);
    expect(document.querySelector('.profileDrawingPointEditor > strong')).toBeNull();

    clickDialogButton('Use lathecode');

    expect(started).toHaveLength(1);
    expect(document.title).toBe('lathecode editor');
    expect(started[0]).toContain('STOCK D30');
    expect(started[0]).toContain('L50 D30');
    const latheCode = new LatheCode(started[0]);
    expect(latheCode.getStock()).toEqual({diameter: 30, length: 50, innerDiameter: 0});
    expect(latheCode.getProfiles().length).toBe(1);
  });

  it('keeps the drawing viewport proportional when dimensions change', () => {
    const container = createStartContainer();
    new StartPanel(container);

    container.querySelector<HTMLButtonElement>('.startDimensionsButton')!.click();
    const frame = document.querySelector<HTMLElement>('.profileDrawingFrame')!;
    const svg = document.querySelector<SVGSVGElement>('.profileDrawingSvg')!;
    const preview = document.querySelector<HTMLElement>('.profileDrawingPreview3d')!;
    const previewTextBeforeResize = preview.dataset.previewText;

    expectStockAspectRatio(50 / 15);
    expect(Number(frame.style.getPropertyValue('--profileDrawingFrameAspect'))).toBeGreaterThan(2);
    expect(getSvgViewBox(svg).height).toBeLessThan(PROFILE_TEST_VIEW_HEIGHT);
    expect(getRenderedSvgPixelValue(svg, '--profileDrawingSizeHintFontSize')).toBeCloseTo(16, 3);
    expect(getRenderedSvgLength(svg, Number(document.querySelector<SVGCircleElement>('.profileDrawingPoint')!.getAttribute('r'))))
      .toBeCloseTo(5, 4);

    setInputValue('input[name="drawingDiameter"]', '60');
    expectStockAspectRatio(50 / 30);
    expect(document.querySelector('.profileDrawingWorkspace.longPart')).toBeNull();
    expect(preview.dataset.previewText).not.toBe(previewTextBeforeResize);
    expect(getRenderedSvgPixelValue(svg, '--profileDrawingSizeHintFontSize')).toBeCloseTo(16, 3);
    expect(getRenderedSvgLength(svg, Number(document.querySelector<SVGCircleElement>('.profileDrawingPoint')!.getAttribute('r'))))
      .toBeCloseTo(5, 4);

    setInputValue('input[name="drawingLength"]', '30');
    expectStockAspectRatio(30 / 30);
    expect(document.querySelector('.profileDrawingWorkspace.longPart')).toBeNull();

    setInputValue('input[name="drawingLength"]', '120');
    expect(document.querySelector('.profileDrawingWorkspace.longPart')).not.toBeNull();
    expect(Number(frame.style.getPropertyValue('--profileDrawingFrameAspect'))).toBeGreaterThan(3);
  });

  it('uses the editable grid spacing for profile designer grid lines', () => {
    const container = createStartContainer();
    new StartPanel(container);

    container.querySelector<HTMLButtonElement>('.startDimensionsButton')!.click();

    expect(document.querySelector<HTMLInputElement>('input[name="drawingGrid"]')!.value).toBe('5');
    expect(document.querySelectorAll('.profileDrawingGridLine')).toHaveLength(11);

    setInputValue('input[name="drawingGrid"]', '10');

    expect(document.querySelectorAll('.profileDrawingGridLine')).toHaveLength(5);
  });

  it('shows snapshots in the selection row when nothing is selected', () => {
    const container = createStartContainer();
    new StartPanel(container);

    container.querySelector<HTMLButtonElement>('.startDimensionsButton')!.click();
    const svg = document.querySelector<SVGSVGElement>('.profileDrawingSvg')!;
    const selectionControls = document.querySelector<HTMLElement>('.profileDrawingSelectionControls')!;

    expect(selectionControls.hidden).toBe(false);
    expect(selectionControls.classList.contains('empty')).toBe(false);
    expect(selectionControls.getAttribute('aria-hidden')).toBe('false');
    expect(document.querySelector<HTMLElement>('.profileDrawingSnapshotField')!.hidden).toBe(false);

    clickDialogButton('Select');
    dispatchProfileMouse(svg, 'mousedown', 50, 30);

    expect(document.querySelector<HTMLElement>('.profileDrawingSnapshotField')!.hidden).toBe(true);
    expect(document.querySelector<HTMLElement>('.profileDrawingPointEditor')!.hidden).toBe(false);

    dispatchProfileMouse(svg, 'mousedown', 25, 15);

    expect(selectionControls.hidden).toBe(false);
    expect(selectionControls.classList.contains('empty')).toBe(false);
    expect(selectionControls.getAttribute('aria-hidden')).toBe('false');
    expect(document.querySelector<HTMLElement>('.profileDrawingSnapshotField')!.hidden).toBe(false);
    expect(document.querySelector<HTMLElement>('.profileDrawingPointEditor')!.hidden).toBe(true);
    expect(document.querySelector<HTMLElement>('.profileDrawingSegmentEditor')!.hidden).toBe(true);
  });

  it('ignores drawing clicks in the profile gutter outside the plotted stock', () => {
    const container = createStartContainer();
    new StartPanel(container);

    container.querySelector<HTMLButtonElement>('.startDimensionsButton')!.click();
    const svg = document.querySelector<SVGSVGElement>('.profileDrawingSvg')!;

    setInputValue('input[name="drawingDiameter"]', '60');
    setInputValue('input[name="drawingLength"]', '30');

    const rightGutterPoint = profileSvgPoint(30, 30, {lengthMm: 30, stockDiameterMm: 60});
    expect(document.querySelectorAll('.profileDrawingPoint.outside')).toHaveLength(2);

    dispatchSvgMouse(svg, 'mousedown', rightGutterPoint.x + 80, rightGutterPoint.y);
    dispatchSvgMouse(window, 'mouseup', rightGutterPoint.x + 80, rightGutterPoint.y);

    expect(document.querySelectorAll('.profileDrawingPoint.outside')).toHaveLength(2);
  });

  it('shows local size hints in the profile designer', () => {
    const container = createStartContainer();
    new StartPanel(container);

    container.querySelector<HTMLButtonElement>('.startDimensionsButton')!.click();
    const svg = document.querySelector<SVGSVGElement>('.profileDrawingSvg')!;

    expect(getProfileSizeHintTexts('horizontal')).toContain('50');

    dispatchProfileMouse(svg, 'mousedown', 25, 20);
    dispatchProfileMouse(window, 'mouseup', 25, 20);

    expect(document.querySelectorAll('.profileDrawingSizeGuide')).toHaveLength(4);
    expect(getProfileSizeHintTexts('horizontal')).toContain('25');
    expect(getProfileSizeHintTexts('vertical')).toContain('5');
    expect(getProfileSizeHintTexts('diagonal')).toContain('25.495');
    expectVerticalSizeHintsNearGuides(7);
  });

  it('shows vertical size hints beside vertical profile segments', () => {
    const container = createStartContainer();
    new StartPanel(container);

    container.querySelector<HTMLButtonElement>('.startDimensionsButton')!.click();
    const svg = document.querySelector<SVGSVGElement>('.profileDrawingSvg')!;

    dispatchProfileMouse(svg, 'mousedown', 25, 30);
    dispatchProfileMouse(window, 'mouseup', 25, 30);
    dispatchProfileMouse(svg, 'mousedown', 25, 20);
    dispatchProfileMouse(window, 'mouseup', 25, 20);

    expect(getProfileSizeHintTexts('vertical')).toContain('5');
    expectVerticalSegmentHintOppositeIcon(25, 25);
  });

  it('omits diagonal length hints for curved and spline profile segments', () => {
    const container = createStartContainer();
    new StartPanel(container);

    container.querySelector<HTMLButtonElement>('.startDimensionsButton')!.click();
    const svg = document.querySelector<SVGSVGElement>('.profileDrawingSvg')!;

    clickDialogButton('Convex');
    dispatchProfileMouse(svg, 'mousedown', 25, 20);
    dispatchProfileMouse(window, 'mouseup', 25, 20);

    expect(getProfileSizeHintTexts('horizontal')).toContain('25');
    expect(getProfileSizeHintTexts('vertical')).toContain('5');
    expect(getProfileSizeHintTexts('diagonal')).toEqual([]);

    clickDialogButton('Reset');
    setInputValue('input[name="drawingPointDiameter"]', '20');
    clickDialogButton('Spline');
    dispatchProfileMouse(svg, 'mousedown', 25, 20);
    dispatchProfileMouse(window, 'mouseup', 25, 20);

    expect(getProfileSizeHintTexts('horizontal')).toContain('50');
    expect(getProfileSizeHintTexts('vertical')).toContain('5');
    expect(getProfileSizeHintTexts('diagonal')).toEqual([]);
  });

  it('flips drawn profiles before sending them to the editor', () => {
    const container = createStartContainer();
    const start = new StartPanel(container);
    const started: string[] = [];
    start.addEventListener('start', event => {
      started.push((event as StartLatheCodeEvent).text);
    });

    container.querySelector<HTMLButtonElement>('.startDimensionsButton')!.click();
    const svg = document.querySelector<SVGSVGElement>('.profileDrawingSvg')!;

    dispatchProfileMouse(svg, 'mousedown', 10, 20);
    dispatchProfileMouse(window, 'mouseup', 10, 20);
    clickDialogButton('Use lathecode');

    expect(started[0]).toContain('L40 DS30 DE20');
    expect(started[0]).toContain('L10 DS20 DE30');
    expect(started[0]).not.toContain('L10 DS30 DE20');
  });

  it('switches to select when clicking an existing point with a drawing tool active', () => {
    const container = createStartContainer();
    const start = new StartPanel(container);
    const started: string[] = [];
    start.addEventListener('start', event => {
      started.push((event as StartLatheCodeEvent).text);
    });

    container.querySelector<HTMLButtonElement>('.startDimensionsButton')!.click();
    const svg = document.querySelector<SVGSVGElement>('.profileDrawingSvg')!;

    expect(document.querySelector<HTMLButtonElement>('.profileDrawingToolButton.selected')!.textContent).toBe('Line');

    dispatchProfileMouse(svg, 'mousedown', 50, 30);
    dispatchProfileMouse(window, 'mouseup', 50, 30);

    expect(document.querySelector<HTMLButtonElement>('.profileDrawingToolButton.selected')!.textContent).toBe('Select');
    clickDialogButton('Use lathecode');

    expect(started[0]).toContain('L50 D30');
    expect(() => new LatheCode(started[0])).not.toThrow();
  });

  it('starts the dimensions drawing from current editor lathecode', () => {
    const container = createStartContainer();
    const start = new StartPanel(container, {
      getCurrentLatheCodeText: () => 'STOCK D44\nL4 D20\nL8 D30\nINSIDE\nL5 D8\nL7 D10',
    });
    const started: string[] = [];
    start.addEventListener('start', event => {
      started.push((event as StartLatheCodeEvent).text);
    });

    container.querySelector<HTMLButtonElement>('.startDimensionsButton')!.click();

    expect(document.querySelector<HTMLInputElement>('input[name="drawingDiameter"]')!.value).toBe('44');
    expect(document.querySelector<HTMLInputElement>('input[name="drawingLength"]')!.value).toBe('12');

    clickDialogButton('Use lathecode');

    expect(started[0]).toContain('STOCK D44');
    expect(started[0]).toContain('L4 D20\nL8 D30');
    expect(started[0]).toContain('INSIDE\nL5 D8\nL7 D10');
    expect(started[0]).not.toMatch(/^L0(?:\s|$)/m);
    const latheCode = new LatheCode(started[0]);
    expect(latheCode.getStock()).toEqual({diameter: 44, length: 12, innerDiameter: 0});
    expect(latheCode.getProfiles().map(profile => profile.side)).toEqual(['outside', 'inside']);
  });

  it('imports the goblet sample into profile designer without inside/outside crossings', () => {
    const sample = START_SAMPLE_DEFINITIONS.find(entry => entry.id === 'goblet-profile');
    expect(sample).toBeDefined();
    if (!sample) return;

    const container = createStartContainer();
    const start = new StartPanel(container, {
      getCurrentLatheCodeText: () => sample.text,
    });
    const started: string[] = [];
    start.addEventListener('start', event => {
      started.push((event as StartLatheCodeEvent).text);
    });

    container.querySelector<HTMLButtonElement>('.startDimensionsButton')!.click();
    clickDialogButton('Use lathecode');

    const insideText = started[0].split(/^INSIDE\b/m)[1] ?? '';
    expect(insideText).not.toMatch(/\b(?:D|DS|DE)34\b/);
    expectInsideProfileClearOfOutside('goblet-profile profile designer import', new LatheCode(started[0]));
  });

  it('preserves current lathecode edge features as editable segment attributes', () => {
    const container = createStartContainer();
    const start = new StartPanel(container, {
      getCurrentLatheCodeText: () => 'STOCK D30\nL50 DS30 FI1 DE30 CH1',
    });
    const started: string[] = [];
    start.addEventListener('start', event => {
      started.push((event as StartLatheCodeEvent).text);
    });

    container.querySelector<HTMLButtonElement>('.startDimensionsButton')!.click();
    const svg = document.querySelector<SVGSVGElement>('.profileDrawingSvg')!;

    expect(document.querySelectorAll('.profileDrawingPoint.outside')).toHaveLength(2);

    clickDialogButton('Select');
    dispatchProfileMouse(svg, 'mousedown', 25, 30);

    expect(document.querySelector<HTMLElement>('.profileDrawingSegmentEditor')!.hidden).toBe(false);
    expect(Array.from(document.querySelectorAll<HTMLButtonElement>('.profileDrawingSegmentFeatureButton.selected'))
      .map(button => `${button.dataset.endpoint}:${button.dataset.feature}`))
      .toEqual(['start:chamfer', 'end:fillet']);
    expect(document.querySelector<HTMLInputElement>('input[name="drawingSegmentStartFeatureSize"]')!.value).toBe('1');
    expect(document.querySelector<HTMLInputElement>('input[name="drawingSegmentEndFeatureSize"]')!.value).toBe('1');

    clickDialogButton('Use lathecode');

    const profileLines = started[0].split('\n').filter(line => line.startsWith('L'));
    expect(profileLines).toEqual(['L50 DS30 FI1 DE30 CH1']);
    expect(() => new LatheCode(started[0])).not.toThrow();
  });

  it('fits edge feature sizes when profile edits make a segment shorter', () => {
    const container = createStartContainer();
    const start = new StartPanel(container, {
      getCurrentLatheCodeText: () => 'STOCK D30\nL50 DS30 FI1 DE30 CH1',
    });
    const started: string[] = [];
    start.addEventListener('start', event => {
      started.push((event as StartLatheCodeEvent).text);
    });

    container.querySelector<HTMLButtonElement>('.startDimensionsButton')!.click();
    setInputValue('input[name="drawingLength"]', '1');
    clickDialogButton('Use lathecode');

    expect(started).toHaveLength(1);
    expect(() => new LatheCode(started[0])).not.toThrow();
    const definition = new LatheCode(started[0]).getOutsidePartProfileSegmentDefinitions()[0];
    const startFeatureSize = definition.startFeature?.value ?? 0;
    const endFeatureSize = definition.endFeature?.value ?? 0;
    expect(startFeatureSize).toBeGreaterThan(0);
    expect(endFeatureSize).toBeGreaterThan(0);
    expect(startFeatureSize + endFeatureSize).toBeLessThanOrEqual(1);
    expect(startFeatureSize).toBeLessThan(1);
    expect(endFeatureSize).toBeLessThan(1);
  });

  it('edits drawn profile points with line, arc, escape, and delete controls', () => {
    const container = createStartContainer();
    const start = new StartPanel(container);
    const started: string[] = [];
    start.addEventListener('start', event => {
      started.push((event as StartLatheCodeEvent).text);
    });

    container.querySelector<HTMLButtonElement>('.startDimensionsButton')!.click();
    const dialog = document.querySelector<HTMLElement>('.fullScreenDialog')!;
    const svg = document.querySelector<SVGSVGElement>('.profileDrawingSvg')!;

    dispatchProfileMouse(svg, 'mousedown', 25, 20);
    dispatchProfileMouse(window, 'mousemove', 25, 20);
    dispatchProfileMouse(window, 'mouseup', 25, 20);

    dialog.dispatchEvent(new KeyboardEvent('keydown', {key: 'Backspace', bubbles: true, cancelable: true}));

    clickDialogButton('Convex');
    dispatchProfileMouse(svg, 'mousedown', 25, 20);
    dispatchProfileMouse(window, 'mouseup', 25, 20);

    dialog.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape', bubbles: true, cancelable: true}));
    expect(document.querySelector('.profileDrawingDialog')).not.toBeNull();
    expect(document.querySelector<HTMLButtonElement>('.profileDrawingToolButton.selected')!.textContent).toBe('Select');

    clickDialogButton('Use lathecode');
    expect(started[0]).toContain('CONV');
    expect(() => new LatheCode(started[0])).not.toThrow();
  });

  it('keeps Escape local to the profile designer', () => {
    const container = createStartContainer();
    new StartPanel(container);

    container.querySelector<HTMLButtonElement>('.startDimensionsButton')!.click();
    const dialog = document.querySelector<HTMLElement>('.fullScreenDialog')!;
    const svg = document.querySelector<SVGSVGElement>('.profileDrawingSvg')!;

    expect(getSelectedProfileTool()).toBe('Line');
    expect(document.querySelector('.profileDrawingPoint.selected')).toBeNull();
    expect(document.querySelector<HTMLElement>('.profileDrawingPointEditor')!.hidden).toBe(true);
    expect(document.querySelector<HTMLElement>('.profileDrawingSnapshotField')!.hidden).toBe(false);

    dispatchKeyboard(dialog, 'keydown', 'Escape');

    expect(document.querySelector('.profileDrawingDialog')).not.toBeNull();
    expect(getSelectedProfileTool()).toBe('Select');
    expect(document.querySelector<HTMLElement>('.profileDrawingPointEditor')!.hidden).toBe(true);
    expect(document.querySelector<HTMLElement>('.profileDrawingSnapshotField')!.hidden).toBe(false);

    dispatchKeyboard(document, 'keydown', 'Escape');

    expect(document.querySelector('.profileDrawingDialog')).not.toBeNull();
    expect(getSelectedProfileTool()).toBe('Select');

    clickDialogButton('Line');
    dispatchProfileMouse(svg, 'mousedown', 25, 20);
    expect(document.querySelectorAll('.profileDrawingPoint.outside')).toHaveLength(3);

    dispatchKeyboard(document, 'keydown', 'Escape');

    expect(document.querySelector('.profileDrawingDialog')).not.toBeNull();
    expect(document.querySelectorAll('.profileDrawingPoint.outside')).toHaveLength(2);
    expect(getSelectedProfileTool()).toBe('Select');

    clickDialogButton('Use lathecode');
  });

  it('closes the profile designer without a dirty-work confirmation', () => {
    const container = createStartContainer();
    new StartPanel(container);

    container.querySelector<HTMLButtonElement>('.startDimensionsButton')!.click();
    const confirmMock = vi.spyOn(window, 'confirm').mockReturnValue(false);

    setInputValue('input[name="drawingLength"]', '60');

    clickDialogButton('Close');

    expect(confirmMock).not.toHaveBeenCalled();
    expect(document.querySelector('.profileDrawingDialog')).toBeNull();
  });

  it('keeps valid profile snapshots for the browser window and restores them', () => {
    const container = createStartContainer();
    const start = new StartPanel(container);
    const started: string[] = [];
    start.addEventListener('start', event => {
      started.push((event as StartLatheCodeEvent).text);
    });

    container.querySelector<HTMLButtonElement>('.startDimensionsButton')!.click();
    const svg = document.querySelector<SVGSVGElement>('.profileDrawingSvg')!;
    const snapshotSelect = document.querySelector<HTMLSelectElement>('.profileDrawingSnapshotSelect')!;
    const initialSnapshotId = snapshotSelect.value;

    expect(snapshotSelect.disabled).toBe(false);
    expect(snapshotSelect.selectedOptions[0].textContent).toContain('Out 1 segment');
    expect(snapshotSelect.selectedOptions[0].textContent).not.toContain('in 0 segments');
    expect(snapshotSelect.selectedOptions[0].textContent).not.toContain('D30 L50');

    setInputValue('input[name="drawingLength"]', '60');

    expect(document.querySelector<HTMLInputElement>('input[name="drawingLength"]')!.value).toBe('60');
    expect(Array.from(snapshotSelect.options).some(option => option.value === initialSnapshotId)).toBe(true);
    expect(snapshotSelect.options[0].value).toBe(snapshotSelect.value);
    expect(snapshotSelect.selectedOptions[0].textContent).toContain('Out 1 segment');
    expect(snapshotSelect.selectedOptions[0].textContent).not.toContain('in 0 segments');
    expect(snapshotSelect.selectedOptions[0].textContent).not.toContain('D30 L60');

    dispatchProfileMouse(svg, 'mousedown', 30, 20, {lengthMm: 60});
    dispatchProfileMouse(window, 'mouseup', 30, 20, {lengthMm: 60});

    expect(snapshotSelect.options[0].value).toBe(snapshotSelect.value);
    expect(snapshotSelect.selectedOptions[0].textContent).toContain('Out 2 segments');
    expect(snapshotSelect.selectedOptions[0].textContent).not.toContain('in 0 segments');

    snapshotSelect.value = initialSnapshotId;
    snapshotSelect.dispatchEvent(new Event('change', {bubbles: true}));

    expect(document.querySelector<HTMLInputElement>('input[name="drawingLength"]')!.value).toBe('50');
    expect(document.querySelector('.profileDrawingPoint.selected')).toBeNull();
    expect(document.querySelector('.profileDrawingSegmentSelection')).toBeNull();
    expect(document.querySelector<HTMLElement>('.profileDrawingSnapshotField')!.hidden).toBe(false);

    clickDialogButton('Use lathecode');

    expect(started[0]).toContain('L50 D30');
    expect(started[0]).not.toContain('L60 D30');
    expect(() => new LatheCode(started[0])).not.toThrow();
  });

  it('supports keyboard undo and redo in the profile designer', () => {
    const container = createStartContainer();
    const start = new StartPanel(container);
    const started: string[] = [];
    start.addEventListener('start', event => {
      started.push((event as StartLatheCodeEvent).text);
    });

    container.querySelector<HTMLButtonElement>('.startDimensionsButton')!.click();
    const dialog = document.querySelector<HTMLElement>('.fullScreenDialog')!;
    const svg = document.querySelector<SVGSVGElement>('.profileDrawingSvg')!;
    const undoButton = document.querySelector<HTMLButtonElement>('.profileDrawingUndoButton')!;
    const redoButton = document.querySelector<HTMLButtonElement>('.profileDrawingRedoButton')!;

    expect(undoButton.hidden).toBe(false);
    expect(redoButton.hidden).toBe(false);
    expect(undoButton.disabled).toBe(true);
    expect(redoButton.disabled).toBe(true);

    dispatchProfileMouse(svg, 'mousedown', 25, 20);
    dispatchProfileMouse(window, 'mouseup', 25, 20);

    expect(undoButton.disabled).toBe(false);
    expect(redoButton.disabled).toBe(true);

    dispatchKeyboard(dialog, 'keydown', 'z', {ctrlKey: true});
    expect(undoButton.disabled).toBe(true);
    expect(redoButton.disabled).toBe(false);

    redoButton.click();
    expect(undoButton.disabled).toBe(false);
    expect(redoButton.disabled).toBe(true);

    undoButton.click();
    expect(undoButton.disabled).toBe(true);
    expect(redoButton.disabled).toBe(false);

    dispatchKeyboard(dialog, 'keydown', 'y', {ctrlKey: true});
    expect(undoButton.disabled).toBe(false);
    expect(redoButton.disabled).toBe(true);

    clickDialogButton('Use lathecode');
    expect(started[0]).toContain('L25 DS30 DE20');
    expect(started[0]).toContain('L25 DS20 DE30');
  });

  it('supports profile designer tool keyboard shortcuts', () => {
    const container = createStartContainer();
    new StartPanel(container);

    container.querySelector<HTMLButtonElement>('.startDimensionsButton')!.click();
    const dialog = document.querySelector<HTMLElement>('.fullScreenDialog')!;

    expect(getSelectedProfileTool()).toBe('Line');

    dispatchKeyboard(dialog, 'keydown', 'a');
    expect(getSelectedProfileTool()).toBe('Select');

    dispatchKeyboard(dialog, 'keydown', 'l');
    expect(getSelectedProfileTool()).toBe('Line');

    dispatchKeyboard(dialog, 'keydown', 'C');
    expect(getSelectedProfileTool()).toBe('Convex');

    dispatchKeyboard(dialog, 'keydown', 'c');
    expect(getSelectedProfileTool()).toBe('Concave');

    dispatchKeyboard(dialog, 'keydown', 's');
    expect(getSelectedProfileTool()).toBe('Spline');

    dispatchKeyboard(dialog, 'keydown', 'f');
    expect(getSelectedProfileTool()).toBe('Free');

    dispatchKeyboard(dialog, 'keydown', 'a');
    dispatchKeyboard(document.querySelector<HTMLInputElement>('input[name="drawingDiameter"]')!, 'keydown', 'l');
    expect(getSelectedProfileTool()).toBe('Select');
  });

  it('allows vertical profile steps without tiny filler lengths', () => {
    const container = createStartContainer();
    const start = new StartPanel(container);
    const started: string[] = [];
    start.addEventListener('start', event => {
      started.push((event as StartLatheCodeEvent).text);
    });

    container.querySelector<HTMLButtonElement>('.startDimensionsButton')!.click();
    const svg = document.querySelector<SVGSVGElement>('.profileDrawingSvg')!;

    dispatchProfileMouse(svg, 'mousedown', 24, 30);
    dispatchProfileMouse(window, 'mouseup', 24, 30);
    dispatchProfileMouse(svg, 'mousedown', 24, 18);
    dispatchProfileMouse(window, 'mouseup', 24, 18);
    dispatchProfileMouse(svg, 'mousedown', 50, 30);
    dispatchProfileMouse(window, 'mouseup', 50, 30);
    setInputValue('input[name="drawingPointDiameter"]', '18');

    expect(document.querySelector('.profileDrawingSegmentIcon.horizontal')).not.toBeNull();
    expect(document.querySelector('.profileDrawingSegmentIcon.vertical')).not.toBeNull();
    clickDialogButton('Use lathecode');

    expect(started[0]).toContain('L26 D18');
    expect(started[0]).toContain('L24 D30');
    expect(started[0]).not.toMatch(/^L0(?:\s|$)/m);
    expect(started[0]).not.toContain('L0.001');
    expect(() => new LatheCode(started[0])).not.toThrow();
  });

  it('resizes an existing drawn profile proportionally', () => {
    const container = createStartContainer();
    const start = new StartPanel(container);
    const started: string[] = [];
    start.addEventListener('start', event => {
      started.push((event as StartLatheCodeEvent).text);
    });

    container.querySelector<HTMLButtonElement>('.startDimensionsButton')!.click();
    const svg = document.querySelector<SVGSVGElement>('.profileDrawingSvg')!;

    dispatchProfileMouse(svg, 'mousedown', 24, 30);
    dispatchProfileMouse(window, 'mouseup', 24, 30);
    dispatchProfileMouse(svg, 'mousedown', 24, 18);
    dispatchProfileMouse(window, 'mouseup', 24, 18);
    dispatchProfileMouse(svg, 'mousedown', 50, 30);
    dispatchProfileMouse(window, 'mouseup', 50, 30);
    setInputValue('input[name="drawingPointDiameter"]', '18');

    setInputValue('input[name="drawingDiameter"]', '40');
    setInputValue('input[name="drawingLength"]', '100');

    clickDialogButton('Use lathecode');

    expect(started[0]).toContain('STOCK D40');
    expect(started[0]).toContain('L52 D24');
    expect(started[0]).toContain('L48 D40');
    expect(started[0]).not.toMatch(/^L0(?:\s|$)/m);
    expect(started[0]).not.toContain('L0.001');
    expect(() => new LatheCode(started[0])).not.toThrow();
  });

  it('creates valid lathecode with a spline drawing tool', () => {
    const container = createStartContainer();
    const start = new StartPanel(container);
    const started: string[] = [];
    start.addEventListener('start', event => {
      started.push((event as StartLatheCodeEvent).text);
    });

    container.querySelector<HTMLButtonElement>('.startDimensionsButton')!.click();
    const svg = document.querySelector<SVGSVGElement>('.profileDrawingSvg')!;

    clickDialogButton('Spline');
    dispatchProfileMouse(svg, 'mousedown', 25, 20);

    const splinePath = document.querySelector<SVGPathElement>('.profileDrawingPath.outside')!.getAttribute('d')!;
    expect((splinePath.match(/L /g) ?? []).length).toBeGreaterThan(3);
    expect(splinePath).not.toContain('374 120.67');
    clickDialogButton('Use lathecode');

    expect(started).toHaveLength(1);
    expect(started[0]).toContain('TOOL ROUND R1.5');
    expect(started[0]).toContain('BSPLINE');
    expect(() => new LatheCode(started[0])).not.toThrow();
  });

  it('keeps spline control Z positions consistent with exported lathecode', () => {
    const container = createStartContainer();
    const start = new StartPanel(container);
    const started: string[] = [];
    start.addEventListener('start', event => {
      started.push((event as StartLatheCodeEvent).text);
    });

    container.querySelector<HTMLButtonElement>('.startDimensionsButton')!.click();
    const svg = document.querySelector<SVGSVGElement>('.profileDrawingSvg')!;

    clickDialogButton('Spline');
    dispatchProfileMouse(svg, 'mousedown', 10, 20);
    dispatchProfileMouse(window, 'mouseup', 10, 20);

    const zInput = document.querySelector<HTMLInputElement>('input[name="drawingPointZ"]')!;
    const diameterInput = document.querySelector<HTMLInputElement>('input[name="drawingPointDiameter"]')!;
    expect(Number(zInput.value)).toBeCloseTo(25, 6);
    expect(zInput.disabled).toBe(true);

    dispatchProfileMouse(svg, 'mousedown', 25, 20);
    dispatchProfileMouse(window, 'mousemove', 40, 10);
    dispatchProfileMouse(window, 'mouseup', 40, 10);

    const selectedPoint = document.querySelector<SVGCircleElement>('.profileDrawingPoint.selected')!;
    const expectedPoint = profileSvgPoint(25, 10);
    expect(Number(selectedPoint.getAttribute('cx'))).toBeCloseTo(expectedPoint.x, 6);
    expect(Number(selectedPoint.getAttribute('cy'))).toBeCloseTo(expectedPoint.y, 6);
    expect(Number(zInput.value)).toBeCloseTo(25, 6);
    expect(Number(diameterInput.value)).toBeCloseTo(10, 6);

    clickDialogButton('Use lathecode');

    expect(started).toHaveLength(1);
    expect(started[0]).toContain('L50 DS30 DE30 BSPLINE D10');
    expect(() => new LatheCode(started[0])).not.toThrow();
  });

  it('selects a drawn segment and changes its type', () => {
    const container = createStartContainer();
    const start = new StartPanel(container);
    const started: string[] = [];
    start.addEventListener('start', event => {
      started.push((event as StartLatheCodeEvent).text);
    });

    container.querySelector<HTMLButtonElement>('.startDimensionsButton')!.click();
    const svg = document.querySelector<SVGSVGElement>('.profileDrawingSvg')!;

    clickDialogButton('Spline');
    dispatchProfileMouse(svg, 'mousedown', 25, 20);
    dispatchProfileMouse(window, 'mouseup', 25, 20);

    clickDialogButton('Select');
    dispatchProfileMouse(svg, 'mousedown', 25, 25);

    expect(document.querySelector('.profileDrawingSegmentSelection')).not.toBeNull();
    expect(document.querySelector<HTMLElement>('.profileDrawingSegmentEditor')!.hidden).toBe(false);
    expect(document.querySelector('.profileDrawingSelectionControls > .profileDrawingSegmentEditor')).not.toBeNull();
    expect(document.querySelector('.profileDrawingSegmentEditor > strong')).toBeNull();
    expect(document.querySelector<HTMLButtonElement>('.profileDrawingSegmentTypeButton[data-tool="spline"]')!
      .classList.contains('selected')).toBe(true);

    document.querySelector<HTMLButtonElement>('.profileDrawingSegmentTypeButton[data-tool="line"]')!.click();

    expect(document.querySelector<HTMLButtonElement>('.profileDrawingSegmentTypeButton[data-tool="line"]')!
      .classList.contains('selected')).toBe(true);
    clickDialogButton('Use lathecode');

    expect(started[0]).not.toContain('BSPLINE');
    expect(started[0]).toContain('L25 DS30 DE20');
    expect(started[0]).toContain('L25 DS20 DE30');
    expect(() => new LatheCode(started[0])).not.toThrow();
  });

  it('shows a hand cursor when hovering a selectable segment', () => {
    const container = createStartContainer();
    new StartPanel(container);

    container.querySelector<HTMLButtonElement>('.startDimensionsButton')!.click();
    const svg = document.querySelector<SVGSVGElement>('.profileDrawingSvg')!;

    dispatchProfileMouse(svg, 'mousemove', 25, 30);
    expect(svg.classList.contains('profileDrawingSegmentHover')).toBe(false);

    clickDialogButton('Select');
    dispatchProfileMouse(svg, 'mousemove', 25, 30);
    expect(svg.classList.contains('profileDrawingSegmentHover')).toBe(true);

    clickDialogButton('Line');
    expect(svg.classList.contains('profileDrawingSegmentHover')).toBe(false);
  });

  it('shows the selected tool icon near the profile cursor', () => {
    const container = createStartContainer();
    new StartPanel(container);

    container.querySelector<HTMLButtonElement>('.startDimensionsButton')!.click();
    const svg = document.querySelector<SVGSVGElement>('.profileDrawingSvg')!;
    const cursor = document.querySelector<HTMLElement>('.profileDrawingToolCursor')!;

    expect(cursor.hidden).toBe(true);

    dispatchProfileMouse(svg, 'mousemove', 25, 30);

    expect(cursor.hidden).toBe(false);
    expect(cursor.dataset.tool).toBe('line');
    expect(cursor.querySelector('.profileDrawingToolCursorIcon')).not.toBeNull();
    expect(cursor.style.left).not.toBe('');
    expect(cursor.style.top).not.toBe('');

    clickDialogButton('Select');

    expect(cursor.hidden).toBe(true);

    dispatchProfileMouse(svg, 'mouseleave', 25, 30);

    expect(cursor.hidden).toBe(true);
  });

  it('adds chamfers and fillets to a selected segment', () => {
    const container = createStartContainer();
    const start = new StartPanel(container);
    const started: string[] = [];
    start.addEventListener('start', event => {
      started.push((event as StartLatheCodeEvent).text);
    });

    container.querySelector<HTMLButtonElement>('.startDimensionsButton')!.click();
    const svg = document.querySelector<SVGSVGElement>('.profileDrawingSvg')!;

    dispatchProfileMouse(svg, 'mousedown', 24, 30);
    dispatchProfileMouse(window, 'mouseup', 24, 30);
    dispatchProfileMouse(svg, 'mousedown', 24, 18);
    dispatchProfileMouse(window, 'mouseup', 24, 18);

    clickDialogButton('Select');
    dispatchProfileMouse(svg, 'mousedown', 37, 24);

    expect(document.querySelector<HTMLElement>('.profileDrawingSegmentEditor')!.hidden).toBe(false);
    const noneButton = document.querySelector<HTMLButtonElement>(
      '.profileDrawingSegmentFeatureButton[data-endpoint="start"][data-feature="none"]',
    )!;
    expect(noneButton.textContent).toBe('');
    expect(noneButton.title).toBe('None');
    expect(noneButton.getAttribute('aria-label')).toBe('None');
    expect(noneButton.querySelector('.profileDrawingSegmentFeatureIcon.none')).not.toBeNull();
    document.querySelector<HTMLButtonElement>(
      '.profileDrawingSegmentFeatureButton[data-endpoint="start"][data-feature="chamfer"]',
    )!.click();
    document.querySelector<HTMLButtonElement>(
      '.profileDrawingSegmentFeatureButton[data-endpoint="end"][data-feature="fillet"]',
    )!.click();
    setInputValue('input[name="drawingSegmentEndFeatureSize"]', '2');

    clickDialogButton('Use lathecode');

    expect(started[0]).toContain('CH1');
    expect(started[0]).toContain('FI2');
    expect(started[0]).toContain('TOOL ROUND R1.5');
    expect(() => new LatheCode(started[0])).not.toThrow();
  });

  it('opens point and segment context menus in the profile designer', () => {
    const container = createStartContainer();
    const start = new StartPanel(container);
    const started: string[] = [];
    start.addEventListener('start', event => {
      started.push((event as StartLatheCodeEvent).text);
    });

    container.querySelector<HTMLButtonElement>('.startDimensionsButton')!.click();
    const svg = document.querySelector<SVGSVGElement>('.profileDrawingSvg')!;

    expect(document.querySelectorAll('.profileDrawingPoint.outside')).toHaveLength(2);

    dispatchProfileMouse(svg, 'contextmenu', 25, 30);
    let menu = document.querySelector<HTMLElement>('.profileDrawingContextMenu')!;
    expect(menu).not.toBeNull();
    expect(menu.querySelector<HTMLElement>('.profileDrawingContextMenuTitle')!.textContent).toBe('Outside segment 1');
    expect(menu.querySelector<HTMLButtonElement>('[data-action="add-point-here"]')!.disabled).toBe(false);
    expect(menu.querySelector('[data-action="segment-tool-line"]')).not.toBeNull();
    menu.querySelector<HTMLButtonElement>('[data-action="add-point-here"]')!.click();

    expect(document.querySelector('.profileDrawingContextMenu')).toBeNull();
    expect(document.querySelectorAll('.profileDrawingPoint.outside')).toHaveLength(3);

    dispatchProfileMouse(svg, 'contextmenu', 25, 30);
    menu = document.querySelector<HTMLElement>('.profileDrawingContextMenu')!;
    expect(menu.querySelector<HTMLElement>('.profileDrawingContextMenuTitle')!.textContent).toBe('Outside point 2');
    menu.querySelector<HTMLButtonElement>('[data-action="delete-point"]')!.click();

    expect(document.querySelectorAll('.profileDrawingPoint.outside')).toHaveLength(2);

    dispatchProfileMouse(svg, 'contextmenu', 25, 30);
    menu = document.querySelector<HTMLElement>('.profileDrawingContextMenu')!;
    menu.querySelector<HTMLButtonElement>('[data-action="segment-start-chamfer"]')!.click();
    clickDialogButton('Use lathecode');

    expect(started[0]).toContain('CH1');
    expect(() => new LatheCode(started[0])).not.toThrow();
  });

  it('snaps drawn points while allowing precise point edits and delete button removal', () => {
    const container = createStartContainer();
    const start = new StartPanel(container);
    const started: string[] = [];
    start.addEventListener('start', event => {
      started.push((event as StartLatheCodeEvent).text);
    });

    container.querySelector<HTMLButtonElement>('.startDimensionsButton')!.click();
    const svg = document.querySelector<SVGSVGElement>('.profileDrawingSvg')!;

    setInputValue('input[name="drawingSnap"]', '0.5');
    dispatchProfileMouse(svg, 'mousedown', 24.4, 20.4);
    dispatchProfileMouse(window, 'mouseup', 24.4, 20.4);

    expect(document.querySelector<HTMLInputElement>('input[name="drawingPointZ"]')!.value).toBe('24.5');
    expect(document.querySelector<HTMLInputElement>('input[name="drawingPointDiameter"]')!.value).toBe('20');

    setInputValue('input[name="drawingPointZ"]', '12.25');
    setInputValue('input[name="drawingPointDiameter"]', '18.75');

    document.querySelector<HTMLButtonElement>('.profileDrawingDeletePointButton')!.click();
    clickDialogButton('Use lathecode');

    expect(started[0]).toContain('L50 D30');
    expect(started[0]).not.toContain('DE18.75');
  });

  it('snaps dragged radial distances from neighboring points when stock diameter is fractional', () => {
    const container = createStartContainer();
    new StartPanel(container);

    container.querySelector<HTMLButtonElement>('.startDimensionsButton')!.click();
    const svg = document.querySelector<SVGSVGElement>('.profileDrawingSvg')!;

    setInputValue('input[name="drawingDiameter"]', '29.6');
    dispatchProfileMouse(svg, 'mousedown', 50, 29.6, {stockDiameterMm: 29.6});
    dispatchProfileMouse(window, 'mousemove', 50, 27.6, {stockDiameterMm: 29.6});
    dispatchProfileMouse(window, 'mouseup', 50, 27.6, {stockDiameterMm: 29.6});

    expect(document.querySelector<HTMLInputElement>('input[name="drawingPointZ"]')!.value).toBe('50');
    expect(document.querySelector<HTMLInputElement>('input[name="drawingPointDiameter"]')!.value).toBe('27.6');
    expect(getProfileSizeHintTexts('vertical')).toContain('1');
    expect(getProfileSizeHintTexts('vertical')).not.toContain('0.8');
  });

  it('adds an inside profile from the drawing dialog', () => {
    const container = createStartContainer();
    const start = new StartPanel(container);
    const started: string[] = [];
    start.addEventListener('start', event => {
      started.push((event as StartLatheCodeEvent).text);
    });

    container.querySelector<HTMLButtonElement>('.startDimensionsButton')!.click();
    const svg = document.querySelector<SVGSVGElement>('.profileDrawingSvg')!;

    clickDialogButton('Inside');
    setInputValue('input[name="drawingPointDiameter"]', '10');
    dispatchProfileMouse(svg, 'mousedown', 0, 0);
    dispatchProfileMouse(window, 'mouseup', 0, 0);
    setInputValue('input[name="drawingPointDiameter"]', '10');

    clickDialogButton('Use lathecode');

    expect(started[0]).toContain('INSIDE\nL50 D10');
    const latheCode = new LatheCode(started[0]);
    expect(latheCode.getProfiles().map(profile => profile.side)).toEqual(['outside', 'inside']);
    expect(latheCode.getStock()).toEqual({diameter: 30, length: 50, innerDiameter: 0});
  });

  it('resets the dimensions drawing dialog to defaults', () => {
    const container = createStartContainer();
    const start = new StartPanel(container);
    const started: string[] = [];
    start.addEventListener('start', event => {
      started.push((event as StartLatheCodeEvent).text);
    });

    container.querySelector<HTMLButtonElement>('.startDimensionsButton')!.click();

    setInputValue('input[name="drawingDiameter"]', '44');
    setInputValue('input[name="drawingLength"]', '60');
    setInputValue('input[name="drawingSnap"]', '0.5');
    setInputValue('input[name="drawingGrid"]', '2.5');
    clickDialogButton('Inside');
    setInputValue('input[name="drawingPointDiameter"]', '10');
    clickDialogButton('Convex');

    expect(document.querySelector<HTMLButtonElement>('.profileDrawingToolButton.selected')!.textContent).toBe('Convex');

    clickDialogButton('Reset');

    expect(document.querySelector<HTMLInputElement>('input[name="drawingDiameter"]')!.value).toBe('30');
    expect(document.querySelector<HTMLInputElement>('input[name="drawingLength"]')!.value).toBe('50');
    expect(document.querySelector<HTMLInputElement>('input[name="drawingSnap"]')!.value).toBe('1');
    expect(document.querySelector<HTMLInputElement>('input[name="drawingGrid"]')!.value).toBe('5');
    expect(document.querySelector<HTMLButtonElement>('.profileDrawingProfileButton.selected')!.textContent).toBe('Outside');
    expect(document.querySelector<HTMLButtonElement>('.profileDrawingToolButton.selected')!.textContent).toBe('Line');
    clickDialogButton('Use lathecode');

    expect(started[0]).toContain('STOCK D30');
    expect(started[0]).toContain('L50 D30');
    expect(started[0]).not.toContain('INSIDE');
  });

  it('offers previewed profile choices from a freehand stroke', () => {
    const container = createStartContainer();
    const start = new StartPanel(container);
    const started: string[] = [];
    start.addEventListener('start', event => {
      started.push((event as StartLatheCodeEvent).text);
    });

    container.querySelector<HTMLButtonElement>('.startDimensionsButton')!.click();
    const svg = document.querySelector<SVGSVGElement>('.profileDrawingSvg')!;

    clickDialogButton('Free');
    dispatchProfileMouse(svg, 'mousedown', 0, 30);
    dispatchProfileMouse(window, 'mousemove', 12.5, 24);
    dispatchProfileMouse(window, 'mousemove', 25, 18);
    dispatchProfileMouse(window, 'mousemove', 37.5, 24);
    dispatchProfileMouse(window, 'mouseup', 50, 30);

    let chooser = document.querySelector<HTMLElement>('.profileDrawingFreehandDialogContainer');
    expect(chooser).not.toBeNull();
    expect(Array.from(chooser!.querySelectorAll<HTMLElement>('.profileDrawingFreehandOption')).map(option => option.dataset.toolset))
      .toEqual(['lines', 'arcs', 'arcs', 'arcs', 'spline', 'spline', 'spline', 'lines']);
    expect(chooser!.querySelectorAll('.profileDrawingFreehandOption[data-candidate^="arc-blend-"]')).toHaveLength(3);
    expect(chooser!.querySelectorAll('.profileDrawingFreehandOption[data-candidate^="smooth-spline-"]')).toHaveLength(3);
    expect(chooser!.querySelectorAll('.profileDrawingFreehandProfilePreview')).toHaveLength(8);
    expect(chooser!.querySelectorAll('.profileDrawingFreehandPartPreview .samplePreview')).toHaveLength(8);
    expect(chooser!.querySelectorAll('button.profileDrawingFreehandOption')).toHaveLength(8);
    expect(chooser!.querySelector('.profileDrawingFreehandSelectButton')).toBeNull();
    expect(document.querySelector('.profileDrawingFreehandStroke')).toBeNull();

    dispatchKeyboard(document, 'keydown', 'Escape');
    expect(document.querySelector('.profileDrawingFreehandDialogContainer')).toBeNull();
    expect(document.querySelector('.profileDrawingDialog')).not.toBeNull();

    dispatchProfileMouse(svg, 'mousedown', 0, 30);
    dispatchProfileMouse(window, 'mousemove', 12.5, 24);
    dispatchProfileMouse(window, 'mousemove', 25, 18);
    dispatchProfileMouse(window, 'mousemove', 37.5, 24);
    dispatchProfileMouse(window, 'mouseup', 50, 30);

    chooser = document.querySelector<HTMLElement>('.profileDrawingFreehandDialogContainer');
    chooser!.querySelector<HTMLButtonElement>(
      '.profileDrawingFreehandOption[data-candidate="arc-blend-balanced"]',
    )!.click();

    expect(document.querySelector('.profileDrawingFreehandDialogContainer')).toBeNull();
    clickDialogButton('Use lathecode');

    expect(started[0]).toContain('STOCK D30');
    expect(started[0]).toMatch(/\bCONV\b|\bCONC\b/);
    expect(() => new LatheCode(started[0])).not.toThrow();
  });

  it('removes redundant same-diameter points from freehand profile choices', () => {
    const container = createStartContainer();
    new StartPanel(container);

    container.querySelector<HTMLButtonElement>('.startDimensionsButton')!.click();
    const svg = document.querySelector<SVGSVGElement>('.profileDrawingSvg')!;

    clickDialogButton('Free');
    dispatchProfileMouse(svg, 'mousedown', 0, 30);
    dispatchProfileMouse(window, 'mousemove', 10, 28);
    dispatchProfileMouse(window, 'mousemove', 20, 30);
    dispatchProfileMouse(window, 'mousemove', 30, 28);
    dispatchProfileMouse(window, 'mousemove', 40, 30);
    dispatchProfileMouse(window, 'mouseup', 50, 20);

    const balancedLinesDetail = document.querySelector<HTMLElement>(
      '.profileDrawingFreehandOption[data-candidate="balanced-lines"] > span',
    );
    expect(balancedLinesDetail?.textContent).toContain('3 points');
  });

  it('creates lathecode from a text prompt through OpenRouter', async () => {
    const container = createStartContainer();
    const start = new StartPanel(container);
    const started: string[] = [];
    const fetchMock = mockOpenRouterLatheCodeResponse('STOCK D10\nTOOL RECT R0.2 L2\nL5 R4');
    vi.stubGlobal('fetch', fetchMock);
    start.addEventListener('start', event => {
      started.push((event as StartLatheCodeEvent).text);
    });

    container.querySelector<HTMLButtonElement>('.startPromptButton')!.click();
    expect(document.querySelector('.openRouterKeyDialog')).not.toBeNull();
    expect(document.querySelector<HTMLElement>('.openRouterKeyDialog')!.textContent)
      .toContain('stored locally in this browser');
    expect(document.querySelector<HTMLElement>('.openRouterKeyDialog')!.textContent)
      .toContain('zero data retention');
    expect(document.querySelector('.llmTextArea')).toBeNull();
    setInputValue('input[name="openRouterApiKey"]', 'sk-or-test');
    clickDialogButton('Save key');
    expect(document.querySelector<HTMLElement>('.llmDialog .privacyDisclosure')!.textContent)
      .toContain('part prompt');

    document.querySelector<HTMLTextAreaElement>('.llmTextArea')!.value = 'a 5 mm long brass knob';
    clickDialogButton('Create lathecode');
    await waitForAsyncWork();

    expect(started).toEqual(['STOCK D10\nTOOL RECT R0.2 L2\nL5 R4']);
    expect(localStorage.getItem('openRouterApiKey')).toBe('sk-or-test');
    const request = getOpenRouterRequest(fetchMock);
    expect(request.model).toBe(DEFAULT_OPENROUTER_MODEL);
    expect(request.messages[1].content).toContain('a 5 mm long brass knob');
  });

  it('asks for an OpenRouter key before showing drawing file inputs', () => {
    const container = createStartContainer();
    new StartPanel(container);

    container.querySelector<HTMLButtonElement>('.startDrawingButton')!.click();

    expect(document.querySelector('.openRouterKeyDialog')).not.toBeNull();
    expect(document.querySelector('input[type="file"]')).toBeNull();

    setInputValue('input[name="openRouterApiKey"]', 'sk-or-test');
    clickDialogButton('Save key');

    expect(document.querySelector('.openRouterKeyDialog')).toBeNull();
    expect(document.querySelector('input[type="file"]')).not.toBeNull();
    expect(document.querySelector<HTMLElement>('.llmDialog .privacyDisclosure')!.textContent)
      .toContain('drawing images and notes');
  });

  it('sends technical drawing uploads to the configured vision model', async () => {
    localStorage.setItem('openRouterApiKey', 'sk-or-test');
    const container = createStartContainer();
    const start = new StartPanel(container);
    const started: string[] = [];
    const fetchMock = mockOpenRouterLatheCodeResponse('STOCK D12\nTOOL RECT R0.2 L2\nL6 R5');
    vi.stubGlobal('fetch', fetchMock);
    start.addEventListener('start', event => {
      started.push((event as StartLatheCodeEvent).text);
    });

    container.querySelector<HTMLButtonElement>('.startDrawingButton')!.click();
    expect(document.querySelector<HTMLElement>('.llmDialog .privacyDisclosure')!.textContent)
      .toContain('drawing images and notes');
    const fileInput = document.querySelector<HTMLInputElement>('input[type="file"]')!;
    Object.defineProperty(fileInput, 'files', {
      value: [new File(['drawing'], 'drawing.png', {type: 'image/png'})],
      configurable: true,
    });
    clickDialogButton('Create lathecode');
    await waitForAsyncWork();

    expect(started).toEqual(['STOCK D12\nTOOL RECT R0.2 L2\nL6 R5']);
    const request = getOpenRouterRequest(fetchMock);
    expect(request.model).toBe(DEFAULT_OPENROUTER_VISION_MODEL);
    expect(request.messages[1].content[0].text).toContain('drawing.png');
    expect(request.messages[1].content[1]).toMatchObject({
      type: 'image_url',
      image_url: {url: expect.stringMatching(/^data:image\/png;base64,/)},
    });
  });

  it('accepts pasted technical drawing images', async () => {
    localStorage.setItem('openRouterApiKey', 'sk-or-test');
    const container = createStartContainer();
    const start = new StartPanel(container);
    const started: string[] = [];
    const fetchMock = mockOpenRouterLatheCodeResponse('STOCK D14\nTOOL RECT R0.2 L2\nL7 R6');
    vi.stubGlobal('fetch', fetchMock);
    start.addEventListener('start', event => {
      started.push((event as StartLatheCodeEvent).text);
    });

    container.querySelector<HTMLButtonElement>('.startDrawingButton')!.click();
    const pastedFile = new File(['drawing'], 'pasted.png', {type: 'image/png'});
    const pasteEvent = new Event('paste', {bubbles: true}) as ClipboardEvent;
    Object.defineProperty(pasteEvent, 'clipboardData', {
      value: {
        items: [{
          kind: 'file',
          type: 'image/png',
          getAsFile: () => pastedFile,
        }],
        files: [],
      },
      configurable: true,
    });
    document.querySelector<HTMLElement>('.llmPasteTarget')!.dispatchEvent(pasteEvent);
    expect(document.querySelector<HTMLElement>('.llmSelectedFiles')!.textContent).toContain('pasted.png');

    clickDialogButton('Create lathecode');
    await waitForAsyncWork();

    expect(started).toEqual(['STOCK D14\nTOOL RECT R0.2 L2\nL7 R6']);
    const request = getOpenRouterRequest(fetchMock);
    expect(request.messages[1].content[0].text).toContain('pasted.png');
    expect(request.messages[1].content[1]).toMatchObject({
      type: 'image_url',
      image_url: {url: expect.stringMatching(/^data:image\/png;base64,/)},
    });
  });
});

function createStartContainer(): HTMLElement {
  const container = document.createElement('div');
  container.innerHTML = `
    <section class="startSection">
      <button class="sampleCatalogButton"></button>
      <button class="startDimensionsButton"></button>
      <button class="startStlButton"></button>
      <button class="startPromptButton"></button>
      <button class="startDrawingButton"></button>
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

const PROFILE_TEST_VIEW_WIDTH = 720;
const PROFILE_TEST_VIEW_HEIGHT = 360;
const PROFILE_TEST_PADDING_LEFT = 46;
const PROFILE_TEST_PADDING_RIGHT = 18;
const PROFILE_TEST_PADDING_TOP = 22;
const PROFILE_TEST_PADDING_BOTTOM = 42;

function expectStockAspectRatio(expected: number) {
  const stock = document.querySelector<SVGRectElement>('.profileDrawingStock');
  if (!stock) throw new Error('Profile drawing stock rect not found');
  const width = Number(stock.getAttribute('width'));
  const height = Number(stock.getAttribute('height'));
  expect(width / height).toBeCloseTo(expected, 4);
}

function getSvgViewBox(svg: SVGSVGElement): {x: number, y: number, width: number, height: number} {
  const values = (svg.getAttribute('viewBox') ?? '').split(/\s+/).map(Number);
  if (values.length !== 4 || values.some(value => !Number.isFinite(value))) {
    throw new Error('SVG viewBox not found');
  }
  return {
    x: values[0],
    y: values[1],
    width: values[2],
    height: values[3],
  };
}

function getStylePixelValue(element: HTMLElement | SVGElement, propertyName: string): number {
  const value = element.style.getPropertyValue(propertyName).trim();
  if (!value.endsWith('px')) throw new Error(`Style property ${propertyName} is not a px value`);
  return Number(value.slice(0, -2));
}

function getRenderedSvgPixelValue(svg: SVGSVGElement, propertyName: string): number {
  return getRenderedSvgLength(svg, getStylePixelValue(svg, propertyName));
}

function getRenderedSvgLength(svg: SVGSVGElement, svgLength: number): number {
  const viewBox = getSvgViewBox(svg);
  const rect = svg.getBoundingClientRect();
  const renderedWidth = rect.width || PROFILE_TEST_VIEW_WIDTH;
  return svgLength * renderedWidth / viewBox.width;
}

function getProfileSizeHintTexts(variant: string): string[] {
  return Array.from(document.querySelectorAll<SVGTextElement>(`.profileDrawingSizeHint.${variant}`))
    .map(label => label.textContent ?? '');
}

function expectVerticalSizeHintsNearGuides(maxDistancePx: number) {
  const guides = Array.from(document.querySelectorAll<SVGLineElement>('.profileDrawingSizeGuide.vertical'));
  const labels = Array.from(document.querySelectorAll<SVGTextElement>('.profileDrawingSizeHint.vertical'));
  expect(labels).toHaveLength(guides.length);
  guides.forEach((guide, index) => {
    const guideX = (Number(guide.getAttribute('x1')) + Number(guide.getAttribute('x2'))) / 2;
    const labelX = Number(labels[index].getAttribute('x'));
    expect(Math.abs(labelX - guideX)).toBeLessThanOrEqual(maxDistancePx);
  });
}

function expectVerticalSegmentHintOppositeIcon(zMm: number, diameterMm: number) {
  const segmentCenterX = profileSvgPoint(zMm, diameterMm).x;
  const icon = document.querySelector<SVGLineElement>('.profileDrawingSegmentIcon.vertical');
  if (!icon) throw new Error('Vertical profile segment icon not found');
  const iconX = (Number(icon.getAttribute('x1')) + Number(icon.getAttribute('x2'))) / 2;
  const labels = Array.from(document.querySelectorAll<SVGTextElement>('.profileDrawingSizeHint.vertical'));
  const label = labels.reduce((nearest, candidate) => {
    const nearestDistance = Math.abs(Number(nearest.getAttribute('x')) - segmentCenterX);
    const candidateDistance = Math.abs(Number(candidate.getAttribute('x')) - segmentCenterX);
    return candidateDistance < nearestDistance ? candidate : nearest;
  });
  const labelX = Number(label.getAttribute('x'));
  expect((labelX - segmentCenterX) * (iconX - segmentCenterX)).toBeLessThan(0);
}

function getSelectedProfileTool(): string {
  const button = document.querySelector<HTMLButtonElement>('.profileDrawingToolButton.selected');
  if (!button) throw new Error('Selected profile tool button not found');
  return button.textContent ?? '';
}

function dispatchProfileMouse(
  target: EventTarget,
  type: string,
  zMm: number,
  diameterMm: number,
  dimensions: {lengthMm?: number, stockDiameterMm?: number} = {},
) {
  const point = profileSvgPoint(zMm, diameterMm, dimensions);
  dispatchSvgMouse(target, type, point.x, point.y);
}

function profileSvgPoint(
  zMm: number,
  diameterMm: number,
  dimensions: {lengthMm?: number, stockDiameterMm?: number} = {},
): { x: number, y: number } {
  const lengthMm = dimensions.lengthMm ?? 50;
  const stockDiameterMm = dimensions.stockDiameterMm ?? 30;
  const plot = getProfileTestPlotBounds(lengthMm, stockDiameterMm);
  return {
    x: plot.left + zMm / lengthMm * plot.width,
    y: plot.axisY - (diameterMm / 2) / (stockDiameterMm / 2) * plot.height,
  };
}

function getProfileTestPlotBounds(lengthMm: number, diameterMm: number) {
  const availableLeft = PROFILE_TEST_PADDING_LEFT;
  const availableTop = PROFILE_TEST_PADDING_TOP;
  const availableWidth = PROFILE_TEST_VIEW_WIDTH - PROFILE_TEST_PADDING_LEFT - PROFILE_TEST_PADDING_RIGHT;
  const availableHeight = PROFILE_TEST_VIEW_HEIGHT - PROFILE_TEST_PADDING_TOP - PROFILE_TEST_PADDING_BOTTOM;
  const radiusMm = diameterMm / 2;
  const scale = Math.min(availableWidth / lengthMm, availableHeight / radiusMm);
  const width = lengthMm * scale;
  const height = radiusMm * scale;
  const left = availableLeft + (availableWidth - width) / 2;
  const top = availableTop + (availableHeight - height) / 2;
  return {
    left,
    axisY: top + height,
    width,
    height,
  };
}

function dispatchSvgMouse(target: EventTarget, type: string, clientX: number, clientY: number) {
  target.dispatchEvent(new MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    clientX,
    clientY,
  }));
}

function dispatchKeyboard(
  target: EventTarget,
  type: string,
  key: string,
  options: Pick<KeyboardEventInit, 'ctrlKey' | 'metaKey' | 'shiftKey' | 'altKey'> = {},
) {
  target.dispatchEvent(new KeyboardEvent(type, {
    bubbles: true,
    cancelable: true,
    key,
    ...options,
  }));
}

type FetchMock = ReturnType<typeof vi.fn>;

function mockOpenRouterLatheCodeResponse(latheCode: string): FetchMock {
  return vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    statusText: 'OK',
    json: async () => ({
      choices: [{message: {content: latheCode}}],
    }),
  });
}

function getOpenRouterRequest(fetchMock: FetchMock): any {
  const init = fetchMock.mock.calls[0][1] as RequestInit;
  return JSON.parse(init.body as string);
}

async function waitForAsyncWork() {
  await new Promise(resolve => setTimeout(resolve, 0));
  await new Promise(resolve => setTimeout(resolve, 0));
  await new Promise(resolve => setTimeout(resolve, 0));
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
    if (insideRange.max > outsideLimit + PROFILE_EPSILON_MM) {
      throw new Error(`${sampleId} inside profile crosses outside profile at Z${formatNumberForMessage(z)}: inside R${formatNumberForMessage(insideRange.max)}, outside R${formatNumberForMessage(outsideLimit)}`);
    }
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

function formatCompactNumber(value: number): string {
  const rounded = Math.round(value * 1_000_000) / 1_000_000;
  if (Number.isInteger(rounded)) return rounded.toFixed(0);
  return rounded.toFixed(6).replace(/0+$/, '').replace(/\.$/, '');
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
  return mids.sort((a, b) => a - b);
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
