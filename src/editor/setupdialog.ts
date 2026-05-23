import { createFullScreenDialog } from '../common/dialog.ts';

export type SetupDialogKind = 'units' | 'stock' | 'depth' | 'feed' | 'mode' | 'axes';

type DirectiveName = 'UNITS' | 'STOCK' | 'TOOL' | 'DEPTH' | 'FEED' | 'MODE' | 'AXES';
type UnitOption = 'MM' | 'CM' | 'M' | 'FT' | 'IN';
type ModeOption = 'FACE' | 'TURN';
type ZDirection = 'LEFT' | 'RIGHT';
type XDirection = 'UP' | 'DOWN';
type FeedAnimationRow = {
  input: HTMLInputElement,
  track: HTMLSpanElement,
  marker: HTMLSpanElement,
  value: HTMLSpanElement,
};

const DIRECTIVE_ORDER: readonly DirectiveName[] = ['UNITS', 'STOCK', 'TOOL', 'DEPTH', 'FEED', 'MODE', 'AXES'];
const UNIT_OPTIONS: readonly {value: UnitOption, label: string, guide: string}[] = [
  {value: 'MM', label: 'Millimeters', guide: 'Default for most NanoEls examples and metric drawings.'},
  {value: 'IN', label: 'Inches', guide: 'Use when copying dimensions from inch drawings.'},
  {value: 'CM', label: 'Centimeters', guide: 'Useful for coarse metric sketches.'},
  {value: 'M', label: 'Meters', guide: 'Large-scale inputs; uncommon for small lathe work.'},
  {value: 'FT', label: 'Feet', guide: 'Use only when source dimensions are in feet.'},
];
const UNIT_MULTIPLIERS: Record<UnitOption, number> = {
  MM: 1,
  CM: 10,
  M: 1000,
  FT: 304.8,
  IN: 25.4,
};
const UNIT_FEED_LABELS: Record<UnitOption, string> = {
  MM: 'mm/min',
  CM: 'cm/min',
  M: 'm/min',
  FT: 'ft/min',
  IN: 'in/min',
};
const DEFAULT_FEED_MM_PER_MIN = {
  move: 200,
  pass: 50,
  part: 10,
};
const FEED_RULER_LENGTH_MM = 25.4;
const FEED_TRACK_SIDE_INSET_PX = 8;
const FEED_PREVIEW_FALLBACK_TRACK_PX = 320;
const MIN_FEED_PREVIEW_DURATION_MS = 250;

export function openSetupDialog(
    kind: SetupDialogKind,
    getText: () => string,
    applyText: (text: string) => void) {
  if (kind === 'units') openUnitsDialog(getText, applyText);
  if (kind === 'stock') openStockDialog(getText, applyText);
  if (kind === 'depth') openDepthDialog(getText, applyText);
  if (kind === 'feed') openFeedDialog(getText, applyText);
  if (kind === 'mode') openModeDialog(getText, applyText);
  if (kind === 'axes') openAxesDialog(getText, applyText);
}

function openUnitsDialog(getText: () => string, applyText: (text: string) => void) {
  const form = createSetupForm(
    'setupUnitsDialog',
    'Choose the unit used when lathecode reads dimensions, tool sizes, cut depths, and feed values.');
  const controls = createSetupLayout(form, createUnitsVisual());
  let selectedUnits = parseCurrentUnits(getText());
  const choiceGrid = document.createElement('div');
  choiceGrid.className = 'setupChoiceGrid setupUnitsGrid';
  choiceGrid.setAttribute('role', 'radiogroup');
  choiceGrid.setAttribute('aria-label', 'Units');
  controls.appendChild(choiceGrid);

  const updateSelected = () => {
    for (const button of choiceGrid.querySelectorAll<HTMLButtonElement>('.setupChoiceButton')) {
      const selected = button.dataset.unit === selectedUnits;
      button.classList.toggle('selected', selected);
      button.setAttribute('aria-checked', String(selected));
    }
  };

  for (const option of UNIT_OPTIONS) {
    const button = createChoiceButton(`${option.label} (${option.value})`, option.guide);
    button.setAttribute('role', 'radio');
    button.dataset.unit = option.value;
    button.addEventListener('click', () => {
      selectedUnits = option.value;
      updateSelected();
    });
    choiceGrid.appendChild(button);
  }
  updateSelected();

  showSetupDialog('Units', form, 'Use units', applyText, () => {
    return upsertDirectiveLine(getText(), 'UNITS', `UNITS ${selectedUnits}`);
  }, choiceGrid.querySelector<HTMLButtonElement>(`.setupChoiceButton[data-unit="${selectedUnits}"]`) || undefined);
}

function openStockDialog(getText: () => string, applyText: (text: string) => void) {
  const form = createSetupForm(
    'setupStockDialog',
    'Describe the raw round stock before cutting. The part length comes from the profile coordinates.');
  const controls = createSetupLayout(form, createStockVisual());
  const stock = parseCurrentStock(getText());
  const diameterInput = createNumberInput('stockDiameter', stock.diameter);
  const innerDiameterInput = createNumberInput('stockInnerDiameter', stock.innerDiameter);

  const diameterFields = document.createElement('div');
  diameterFields.className = 'setupFieldGroup stockDiameterFields';
  diameterFields.appendChild(createSetupField(
    'Outer diameter',
    diameterInput,
    'The starting bar or tube outside diameter.'));
  diameterFields.appendChild(createSetupField(
    'Inner diameter',
    innerDiameterInput,
    'Optional existing through-hole for tube stock or pre-drilled blanks.'));
  controls.appendChild(diameterFields);

  showSetupDialog('Stock', form, 'Use stock', applyText, () => {
    const diameter = readPositiveNumber(diameterInput, 'Outer diameter');
    const innerDiameter = readOptionalNonNegativeNumber(innerDiameterInput, 'Inner diameter');
    if (innerDiameter !== null && innerDiameter >= diameter) {
      throw new Error('Inner diameter must be smaller than outer diameter');
    }

    const parts = [`STOCK D${formatNumber(diameter)}`];
    if (innerDiameter !== null && innerDiameter > 0) parts.push(`ID${formatNumber(innerDiameter)}`);
    return upsertDirectiveLine(getText(), 'STOCK', parts.join(' '));
  }, diameterInput);
}

function openDepthDialog(getText: () => string, applyText: (text: string) => void) {
  const form = createSetupForm(
    'setupDepthDialog',
    'Set how much material each roughing pass removes and how much is left for the finishing pass.');
  const controls = createSetupControls(form);
  const depth = parseCurrentDepth(getText());
  const cutInput = createNumberInput('depthCut', depth.cut);
  const finishInput = createNumberInput('depthFinish', depth.finish);

  controls.appendChild(createSetupField(
    'Rough cut depth',
    cutInput,
    'Maximum radial material removed per roughing pass.'));
  controls.appendChild(createSetupField(
    'Finish allowance',
    finishInput,
    'Small amount left for the final cleanup pass. Use 0 only when no finish allowance is needed.'));

  showSetupDialog('Depth', form, 'Use depth', applyText, () => {
    const cut = readPositiveNumber(cutInput, 'Rough cut depth');
    const finish = readNonNegativeNumber(finishInput, 'Finish allowance');
    return upsertDirectiveLine(getText(), 'DEPTH', `DEPTH CUT${formatNumber(cut)} FINISH${formatNumber(finish)}`);
  }, cutInput);
}

function openFeedDialog(getText: () => string, applyText: (text: string) => void) {
  const form = createSetupForm(
    'setupFeedDialog',
    'Set feed rates for positioning moves, normal cutting passes, and parting or cutoff moves.');
  const controls = createSetupControls(form);
  const units = parseCurrentUnits(getText());
  const feedUnit = UNIT_FEED_LABELS[units];
  const feed = parseCurrentFeed(getText());
  const moveInput = createNumberInput('feedMove', feed.move);
  const passInput = createNumberInput('feedPass', feed.pass);
  const partInput = createNumberInput('feedPart', feed.part);

  controls.appendChild(createSetupField(
    `Positioning feed (${feedUnit})`,
    moveInput,
    'Used for non-cutting moves.'));
  controls.appendChild(createSetupField(
    `Cutting feed (${feedUnit})`,
    passInput,
    'Used while roughing and finishing along the profile.'));
  controls.appendChild(createSetupField(
    `Parting feed (${feedUnit})`,
    partInput,
    'Used for cutoff or plunge-style parting moves.'));
  controls.appendChild(createFeedAnimationPanel(units, feedUnit, [
    {label: 'Positioning', input: moveInput},
    {label: 'Cutting', input: passInput},
    {label: 'Parting', input: partInput},
  ]));

  showSetupDialog('Feed', form, 'Use feed', applyText, () => {
    const move = readPositiveNumber(moveInput, 'Positioning feed');
    const pass = readPositiveNumber(passInput, 'Cutting feed');
    const part = readPositiveNumber(partInput, 'Parting feed');
    return upsertDirectiveLine(
      getText(),
      'FEED',
      `FEED MOVE${formatNumber(move)} PASS${formatNumber(pass)} PART${formatNumber(part)}`);
  }, moveInput, actions => {
    const resetButton = document.createElement('button');
    resetButton.type = 'button';
    resetButton.textContent = 'Reset defaults';
    resetButton.addEventListener('click', () => {
      const defaults = getDefaultFeedValues(units);
      moveInput.value = defaults.move;
      passInput.value = defaults.pass;
      partInput.value = defaults.part;
      moveInput.dispatchEvent(new Event('input', {bubbles: true}));
    });
    actions.appendChild(resetButton);
  });
}

function openModeDialog(getText: () => string, applyText: (text: string) => void) {
  const form = createSetupForm(
    'setupModeDialog',
    'Choose the roughing strategy used to remove material before finishing the profile.');
  const controls = createSetupControls(form);
  let selectedMode = parseCurrentMode(getText());
  const choiceGrid = document.createElement('div');
  choiceGrid.className = 'setupChoiceGrid';
  controls.appendChild(choiceGrid);

  const updateSelected = () => {
    for (const button of choiceGrid.querySelectorAll<HTMLButtonElement>('.setupChoiceButton')) {
      const selected = button.dataset.mode === selectedMode;
      button.classList.toggle('selected', selected);
      button.setAttribute('aria-pressed', String(selected));
    }
  };

  for (const option of [
    {
      mode: 'FACE' as const,
      title: 'Face-style removal',
      guide: 'Uses broad facing-style passes from the free end toward the chuck.',
    },
    {
      mode: 'TURN' as const,
      title: 'Turn-style removal',
      guide: 'Uses lengthwise passes that feel closer to classic OD turning.',
    },
  ]) {
    const button = createChoiceButton(option.title, option.guide);
    button.dataset.mode = option.mode;
    button.addEventListener('click', () => {
      selectedMode = option.mode;
      updateSelected();
    });
    choiceGrid.appendChild(button);
  }
  updateSelected();

  showSetupDialog('Mode', form, 'Use mode', applyText, () => {
    return upsertDirectiveLine(getText(), 'MODE', `MODE ${selectedMode}`);
  }, choiceGrid.querySelector<HTMLButtonElement>('.setupChoiceButton') || undefined);
}

function openAxesDialog(getText: () => string, applyText: (text: string) => void) {
  const form = createSetupForm(
    'setupAxesDialog',
    'Tell the G-code generator which direction positive Z and positive X point on the controller.');
  const controls = createSetupControls(form);
  let selectedZ = parseCurrentZDirection(getText());
  let selectedX = parseCurrentXDirection(getText());

  const zGroup = createSegmentedGroup('Z+ points', [
    {value: 'LEFT' as const, label: 'Left'},
    {value: 'RIGHT' as const, label: 'Right'},
  ], selectedZ, 'z', value => {
    selectedZ = value;
    updateSelected();
  });
  const xGroup = createSegmentedGroup('X+ points', [
    {value: 'UP' as const, label: 'Up'},
    {value: 'DOWN' as const, label: 'Down'},
  ], selectedX, 'x', value => {
    selectedX = value;
    updateSelected();
  });

  controls.appendChild(zGroup.group);
  controls.appendChild(xGroup.group);

  const updateSelected = () => {
    zGroup.update(selectedZ);
    xGroup.update(selectedX);
  };
  updateSelected();

  showSetupDialog('Axes', form, 'Use axes', applyText, () => {
    return upsertDirectiveLine(getText(), 'AXES', `AXES ${selectedZ} ${selectedX}`);
  }, zGroup.group.querySelector<HTMLButtonElement>('.setupChoiceButton') || undefined, actions => {
    const resetButton = document.createElement('button');
    resetButton.type = 'button';
    resetButton.textContent = 'Reset';
    resetButton.addEventListener('click', () => {
      selectedZ = 'LEFT';
      selectedX = 'UP';
      updateSelected();
    });
    actions.appendChild(resetButton);
  });
}

function createSetupForm(className: string, introText: string): HTMLFormElement {
  const form = document.createElement('form');
  form.className = `settingsDialog setupDialog ${className}`;

  const intro = document.createElement('p');
  intro.className = 'setupIntro';
  intro.textContent = introText;
  form.appendChild(intro);

  return form;
}

function createSetupLayout(form: HTMLFormElement, visual: HTMLElement): HTMLDivElement {
  const layout = document.createElement('div');
  layout.className = 'setupLayout';
  layout.appendChild(visual);

  const controls = document.createElement('div');
  controls.className = 'setupControls';
  layout.appendChild(controls);

  form.appendChild(layout);
  return controls;
}

function createSetupControls(form: HTMLFormElement): HTMLDivElement {
  const controls = document.createElement('div');
  controls.className = 'setupControls';
  form.appendChild(controls);
  return controls;
}

function showSetupDialog(
    title: string,
    form: HTMLFormElement,
    applyLabel: string,
    applyText: (text: string) => void,
    buildText: () => string,
    focusTarget?: HTMLElement,
    configureActions: (actions: HTMLDivElement) => void = () => {}) {
  const error = document.createElement('div');
  error.className = 'toolDialogError';
  form.appendChild(error);

  const actions = document.createElement('div');
  actions.className = 'settingsActions';
  const applyButton = document.createElement('button');
  applyButton.type = 'submit';
  applyButton.textContent = applyLabel;
  actions.appendChild(applyButton);
  configureActions(actions);
  form.appendChild(actions);

  let dialog: HTMLDivElement;
  form.addEventListener('submit', event => {
    event.preventDefault();
    try {
      applyText(buildText());
      dialog.remove();
    } catch (e) {
      error.textContent = e instanceof Error ? e.message : String(e);
    }
  });

  dialog = createFullScreenDialog(form, title);
  focusTarget?.focus();
}

function createSetupField(labelText: string, control: HTMLElement, guideText: string): HTMLLabelElement {
  const field = document.createElement('label');
  field.className = 'settingField setupField';

  const heading = document.createElement('span');
  heading.className = 'settingHeading';
  heading.textContent = labelText;
  field.appendChild(heading);

  field.appendChild(control);

  const guide = document.createElement('span');
  guide.className = 'settingGuide';
  guide.textContent = guideText;
  field.appendChild(guide);

  return field;
}

function createFeedAnimationPanel(
    units: UnitOption,
    feedUnit: string,
    feeds: readonly {label: string, input: HTMLInputElement}[]): HTMLDivElement {
  const panel = document.createElement('div');
  panel.className = 'feedAnimationPanel';
  panel.setAttribute('aria-label', 'Feed speed preview');

  const cssPxPerMm = estimateCssPixelsPerMillimeter();
  panel.appendChild(createFeedScaleRuler(cssPxPerMm));

  const rows: FeedAnimationRow[] = feeds.map(feed => {
    const row = document.createElement('div');
    row.className = 'feedAnimationRow';

    const label = document.createElement('span');
    label.className = 'feedAnimationLabel';
    label.textContent = feed.label;
    row.appendChild(label);

    const track = document.createElement('span');
    track.className = 'feedAnimationTrack';
    const travel = document.createElement('span');
    travel.className = 'feedAnimationTravel';
    track.appendChild(travel);
    const marker = document.createElement('span');
    marker.className = 'feedAnimationMarker';
    track.appendChild(marker);
    row.appendChild(track);

    const value = document.createElement('span');
    value.className = 'feedAnimationValue';
    row.appendChild(value);

    panel.appendChild(row);
    return {input: feed.input, track, marker, value};
  });

  const update = () => {
    for (const row of rows) updateFeedAnimationRow(row, units, feedUnit, cssPxPerMm);
  };
  feeds.forEach(feed => feed.input.addEventListener('input', update));
  update();
  scheduleAfterLayout(update);
  return panel;
}

function createFeedScaleRuler(cssPxPerMm: number): HTMLDivElement {
  const ruler = document.createElement('div');
  ruler.className = 'feedScaleRuler';

  const label = document.createElement('span');
  label.className = 'feedScaleRulerLabel';
  label.textContent = 'Display ruler';
  ruler.appendChild(label);

  const track = document.createElement('span');
  track.className = 'feedScaleRulerTrack';
  track.style.width = `${formatNumber(FEED_RULER_LENGTH_MM * cssPxPerMm)}px`;
  track.setAttribute('aria-label', '25.4 millimeters equals 1 inch');
  for (let mm = 0; mm <= 25; mm += 5) {
    track.appendChild(createFeedScaleTick(mm / FEED_RULER_LENGTH_MM, mm % 10 === 0, `${mm}`));
  }
  track.appendChild(createFeedScaleTick(1, true, '1 in'));
  ruler.appendChild(track);

  const value = document.createElement('span');
  value.className = 'feedScaleRulerValue';
  value.textContent = `${formatNumber(FEED_RULER_LENGTH_MM)} mm / 1 in`;
  ruler.appendChild(value);

  return ruler;
}

function createFeedScaleTick(position: number, major: boolean, labelText: string): HTMLSpanElement {
  const tick = document.createElement('span');
  tick.className = major ? 'feedScaleTick major' : 'feedScaleTick';
  tick.style.left = `${formatNumber(position * 100)}%`;
  if (major) {
    const label = document.createElement('span');
    label.className = 'feedScaleTickLabel';
    label.textContent = labelText;
    tick.appendChild(label);
  }
  return tick;
}

function updateFeedAnimationRow(row: FeedAnimationRow, units: UnitOption, feedUnit: string, cssPxPerMm: number) {
  const feedValue = Number(row.input.value);
  row.marker.classList.remove('running');
  if (!Number.isFinite(feedValue) || feedValue <= 0) {
    row.value.textContent = '';
    return;
  }

  const feedMmPerMinute = feedValue * UNIT_MULTIPLIERS[units];
  const travelPx = getFeedTrackTravelPx(row.track);
  const travelMm = travelPx / cssPxPerMm;
  const durationMs = Math.max(
    travelMm / feedMmPerMinute * 60 * 1000,
    MIN_FEED_PREVIEW_DURATION_MS,
  );
  row.value.textContent = `${formatNumber(feedValue)} ${feedUnit}`;
  row.track.style.setProperty('--feed-preview-travel', `${formatNumber(travelPx)}px`);
  row.track.style.setProperty('--feed-preview-duration', `${formatNumber(durationMs)}ms`);
  restartOneShotAnimation(row.marker);
}

function getFeedTrackTravelPx(track: HTMLElement): number {
  const trackWidth = track.getBoundingClientRect().width || FEED_PREVIEW_FALLBACK_TRACK_PX;
  return Math.max(1, trackWidth - FEED_TRACK_SIDE_INSET_PX * 2);
}

function restartOneShotAnimation(element: HTMLElement) {
  scheduleAfterLayout(() => element.classList.add('running'));
}

function scheduleAfterLayout(callback: () => void) {
  if (typeof requestAnimationFrame === 'function') {
    requestAnimationFrame(() => requestAnimationFrame(callback));
  } else {
    window.setTimeout(callback, 0);
  }
}

function estimateCssPixelsPerMillimeter(): number {
  if (typeof window === 'undefined') return 96 / 25.4;

  const cssWidth = window.screen?.width || window.innerWidth || 0;
  const cssHeight = window.screen?.height || window.innerHeight || 0;
  const devicePixelRatio = window.devicePixelRatio || 1;
  const physicalPixelDiagonal = Math.hypot(cssWidth * devicePixelRatio, cssHeight * devicePixelRatio);
  if (!physicalPixelDiagonal) return 96 / 25.4;

  const estimatedDiagonalInches = estimateScreenDiagonalInches(cssWidth, cssHeight, devicePixelRatio);
  const estimatedCssPixelsPerInch = physicalPixelDiagonal / estimatedDiagonalInches / devicePixelRatio;
  return clamp(estimatedCssPixelsPerInch / 25.4, 2.6, 8);
}

function estimateScreenDiagonalInches(cssWidth: number, cssHeight: number, devicePixelRatio: number): number {
  const maxCssDimension = Math.max(cssWidth, cssHeight);
  const minCssDimension = Math.min(cssWidth, cssHeight);
  const maxPhysicalDimension = maxCssDimension * devicePixelRatio;

  if (maxCssDimension <= 950 && minCssDimension <= 520 && devicePixelRatio >= 2) return 6.3;
  if (maxCssDimension <= 1400 && minCssDimension <= 1000 && devicePixelRatio >= 1.5) return 11;
  if (maxPhysicalDimension >= 3600) return 27;
  if (maxPhysicalDimension >= 2500) return 24;
  if (maxPhysicalDimension <= 1600) return 15.6;
  return 22;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function createNumberInput(name: string, value: string): HTMLInputElement {
  const input = document.createElement('input');
  input.type = 'number';
  input.step = 'any';
  input.min = '0';
  input.name = name;
  input.value = value;
  input.className = 'settingInput setupInput';
  return input;
}

function createChoiceButton(title: string, guide: string): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'setupChoiceButton';

  const strong = document.createElement('strong');
  strong.textContent = title;
  button.appendChild(strong);

  const span = document.createElement('span');
  span.textContent = guide;
  button.appendChild(span);

  return button;
}

function createSegmentedGroup<T extends string>(
    labelText: string,
    options: readonly {value: T, label: string}[],
    selectedValue: T,
    dataName: string,
    onChange: (value: T) => void): {group: HTMLDivElement, update: (value: T) => void} {
  const group = document.createElement('div');
  group.className = 'setupFieldGroup';
  group.setAttribute('role', 'group');
  group.setAttribute('aria-label', labelText);

  const label = document.createElement('span');
  label.className = 'settingHeading';
  label.textContent = labelText;
  group.appendChild(label);

  const segmented = document.createElement('div');
  segmented.className = 'setupSegmented';
  group.appendChild(segmented);

  for (const option of options) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'setupChoiceButton setupSegmentButton';
    button.textContent = option.label;
    button.dataset[dataName] = option.value;
    button.addEventListener('click', () => onChange(option.value));
    segmented.appendChild(button);
  }

  const update = (value: T) => {
    for (const button of segmented.querySelectorAll<HTMLButtonElement>('.setupChoiceButton')) {
      const selected = button.dataset[dataName] === value;
      button.classList.toggle('selected', selected);
      button.setAttribute('aria-pressed', String(selected));
    }
  };
  update(selectedValue);
  return {group, update};
}

function createVisual(className: string, svg: string, caption: string): HTMLDivElement {
  const visual = document.createElement('div');
  visual.className = `setupVisual ${className}`;
  visual.innerHTML = svg;
  const captionElement = document.createElement('p');
  captionElement.className = 'setupVisualCaption';
  captionElement.textContent = caption;
  visual.appendChild(captionElement);
  return visual;
}

function createUnitsVisual(): HTMLDivElement {
  return createVisual('unitsVisual', `
    <svg viewBox="0 0 360 190" role="img" aria-label="Two rulers showing millimeters and inches">
      <rect x="26" y="42" width="320" height="34" rx="4" fill="#f3f6f8" stroke="#9aa7b0" />
      <line x1="46" y1="76" x2="46" y2="46" stroke="#333" />
      <line x1="96" y1="76" x2="96" y2="56" stroke="#333" />
      <line x1="146" y1="76" x2="146" y2="46" stroke="#333" />
      <line x1="196" y1="76" x2="196" y2="56" stroke="#333" />
      <line x1="246" y1="76" x2="246" y2="46" stroke="#333" />
      <line x1="300" y1="80" x2="300" y2="38" stroke="#2c6f95" stroke-width="2" />
      <text x="46" y="32" text-anchor="middle">0 mm</text>
      <text x="146" y="32" text-anchor="middle">10 mm</text>
      <text x="300" y="32" text-anchor="middle">25.4 mm</text>
      <rect x="26" y="112" width="320" height="34" rx="4" fill="#fff8dc" stroke="#9f955e" />
      <line x1="46" y1="146" x2="46" y2="116" stroke="#333" />
      <line x1="173" y1="146" x2="173" y2="126" stroke="#333" />
      <line x1="300" y1="150" x2="300" y2="108" stroke="#2c6f95" stroke-width="2" />
      <line x1="300" y1="38" x2="300" y2="150" stroke="#2c6f95" stroke-dasharray="5 5" />
      <text x="180" y="99" text-anchor="middle">1 in = 25.4 mm</text>
      <text x="46" y="166" text-anchor="middle">0 in</text>
      <text x="173" y="166" text-anchor="middle">0.5 in</text>
      <text x="300" y="166" text-anchor="middle">1 in</text>
    </svg>
  `, 'Pick the drawing unit before entering dimensions from a print.');
}

function createStockVisual(): HTMLDivElement {
  return createVisual('stockVisual', `
    <svg viewBox="0 0 360 220" role="img" aria-label="Round stock with outside and inside diameter">
      <defs>
        <linearGradient id="stockBody" x1="0" x2="1">
          <stop offset="0" stop-color="#a8ca83" stop-opacity="0.42" />
          <stop offset="1" stop-color="#d9ecc0" stop-opacity="0.42" />
        </linearGradient>
      </defs>
      <ellipse cx="94" cy="108" rx="46" ry="72" fill="#c5df9d" fill-opacity="0.34" stroke="#78985f" />
      <rect x="94" y="36" width="176" height="144" fill="url(#stockBody)" stroke="#78985f" />
      <ellipse cx="270" cy="108" rx="46" ry="72" fill="#d9ecc0" fill-opacity="0.44" stroke="#78985f" />
      <ellipse cx="270" cy="108" rx="17" ry="32" fill="#ffffff" stroke="#5b7f8f" />
      <line x1="286" y1="36" x2="334" y2="36" stroke="#333" />
      <line x1="286" y1="180" x2="334" y2="180" stroke="#333" />
      <line x1="322" y1="38" x2="322" y2="178" stroke="#333" />
      <text x="332" y="111">OD</text>
      <line x1="270" y1="76" x2="270" y2="140" stroke="#2c6f95" />
      <text x="214" y="112">ID</text>
      <line x1="94" y1="198" x2="270" y2="198" stroke="#333" />
      <text x="182" y="214" text-anchor="middle">profile length</text>
    </svg>
  `, 'Outer diameter defines stock size; inner diameter is only for existing through-holes.');
}

function parseCurrentUnits(text: string): UnitOption {
  const line = getDirectiveLine(text, 'UNITS');
  const unit = line?.trim().split(/\s+/)[1]?.toUpperCase();
  return isUnit(unit) ? unit : 'MM';
}

function parseCurrentStock(text: string): {diameter: string, innerDiameter: string} {
  const multiplier = UNIT_MULTIPLIERS[parseCurrentUnits(text)];
  const line = getDirectiveLine(text, 'STOCK');
  const diameterParam = line ? parseParam(line, ['D', 'R']) : null;
  const innerDiameterParam = line ? parseParam(line, ['ID', 'IR']) : null;

  return {
    diameter: diameterParam
      ? formatNumber(diameterParam.name === 'R' ? diameterParam.value * 2 : diameterParam.value)
      : formatNumber(10 / multiplier),
    innerDiameter: innerDiameterParam
      ? formatNumber(innerDiameterParam.name === 'IR' ? innerDiameterParam.value * 2 : innerDiameterParam.value)
      : '',
  };
}

function parseCurrentDepth(text: string): {cut: string, finish: string} {
  const multiplier = UNIT_MULTIPLIERS[parseCurrentUnits(text)];
  const line = getDirectiveLine(text, 'DEPTH');
  const cut = line ? parseParam(line, ['CUT']) : null;
  const finish = line ? parseParam(line, ['FINISH']) : null;
  return {
    cut: cut ? formatNumber(cut.value) : formatNumber(0.5 / multiplier),
    finish: finish ? formatNumber(finish.value) : formatNumber(0.1 / multiplier),
  };
}

function parseCurrentFeed(text: string): {move: string, pass: string, part: string} {
  const defaults = getDefaultFeedValues(parseCurrentUnits(text));
  const line = getDirectiveLine(text, 'FEED');
  const move = line ? parseParam(line, ['MOVE']) : null;
  const pass = line ? parseParam(line, ['PASS']) : null;
  const part = line ? parseParam(line, ['PART']) : null;
  return {
    move: move ? formatNumber(move.value) : defaults.move,
    pass: pass ? formatNumber(pass.value) : defaults.pass,
    part: part ? formatNumber(part.value) : defaults.part,
  };
}

function getDefaultFeedValues(units: UnitOption): {move: string, pass: string, part: string} {
  const multiplier = UNIT_MULTIPLIERS[units];
  return {
    move: formatNumber(DEFAULT_FEED_MM_PER_MIN.move / multiplier),
    pass: formatNumber(DEFAULT_FEED_MM_PER_MIN.pass / multiplier),
    part: formatNumber(DEFAULT_FEED_MM_PER_MIN.part / multiplier),
  };
}

function parseCurrentMode(text: string): ModeOption {
  const mode = getDirectiveLine(text, 'MODE')?.trim().split(/\s+/)[1]?.toUpperCase();
  return mode === 'TURN' ? 'TURN' : 'FACE';
}

function parseCurrentZDirection(text: string): ZDirection {
  const zDirection = getDirectiveLine(text, 'AXES')?.trim().split(/\s+/)[1]?.toUpperCase();
  return zDirection === 'RIGHT' ? 'RIGHT' : 'LEFT';
}

function parseCurrentXDirection(text: string): XDirection {
  const xDirection = getDirectiveLine(text, 'AXES')?.trim().split(/\s+/)[2]?.toUpperCase();
  return xDirection === 'DOWN' ? 'DOWN' : 'UP';
}

function parseParam(line: string, names: readonly string[]): {name: string, value: number} | null {
  for (const token of line.trim().split(/\s+/).slice(1)) {
    const match = /^([A-Z]+)([0-9]+(?:\.[0-9]*)?|\.[0-9]+)$/i.exec(token);
    if (!match) continue;
    const name = match[1].toUpperCase();
    if (names.includes(name)) return {name, value: Number(match[2])};
  }
  return null;
}

function getDirectiveLine(text: string, directive: DirectiveName): string | undefined {
  return text
    .replace(/\r\n/g, '\n')
    .split('\n')
    .find(line => getDirectiveName(line) === directive);
}

function upsertDirectiveLine(text: string, directive: DirectiveName, directiveLine: string): string {
  if (!text.trim()) return directiveLine;

  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const existingIndex = lines.findIndex(line => getDirectiveName(line) === directive);
  if (existingIndex >= 0) {
    lines[existingIndex] = directiveLine;
    return lines.join('\n');
  }

  const targetOrder = DIRECTIVE_ORDER.indexOf(directive);
  let insertAfter = -1;
  for (let i = 0; i < lines.length; i++) {
    const order = getDirectiveOrder(lines[i]);
    if (order !== null && order < targetOrder) insertAfter = i;
  }
  if (insertAfter >= 0) {
    lines.splice(insertAfter + 1, 0, directiveLine);
    return lines.join('\n');
  }

  const insertBefore = lines.findIndex(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith(';')) return false;
    const order = getDirectiveOrder(line);
    return order === null || order > targetOrder;
  });
  lines.splice(insertBefore >= 0 ? insertBefore : lines.length, 0, directiveLine);
  return lines.join('\n');
}

function getDirectiveName(line: string): DirectiveName | null {
  const firstToken = line.trimStart().split(/\s+/)[0]?.toUpperCase();
  if (DIRECTIVE_ORDER.includes(firstToken as DirectiveName)) return firstToken as DirectiveName;
  return null;
}

function getDirectiveOrder(line: string): number | null {
  const directive = getDirectiveName(line);
  if (!directive) return null;
  return DIRECTIVE_ORDER.indexOf(directive);
}

function isUnit(value: string | undefined): value is UnitOption {
  return value === 'MM' || value === 'CM' || value === 'M' || value === 'FT' || value === 'IN';
}

function readPositiveNumber(input: HTMLInputElement, label: string): number {
  const value = readNumber(input, label);
  if (value <= 0) throw new Error(`${label} must be a positive number`);
  return value;
}

function readNonNegativeNumber(input: HTMLInputElement, label: string): number {
  const value = readNumber(input, label);
  if (value < 0) throw new Error(`${label} cannot be negative`);
  return value;
}

function readOptionalNonNegativeNumber(input: HTMLInputElement, label: string): number | null {
  if (!input.value.trim()) return null;
  return readNonNegativeNumber(input, label);
}

function readNumber(input: HTMLInputElement, label: string): number {
  const value = Number(input.value.trim());
  if (!Number.isFinite(value)) throw new Error(`${label} must be a number`);
  return value;
}

function formatNumber(value: number): string {
  const rounded = Math.round(value * 1e6) / 1e6;
  if (Number.isInteger(rounded)) return rounded.toFixed(0);
  return rounded.toFixed(6).replace(/0+$/, '').replace(/\.$/, '');
}
